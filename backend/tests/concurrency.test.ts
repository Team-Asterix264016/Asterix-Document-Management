import "./setup.js";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Subsystem } from "../src/models/Subsystem.js";
import { createUser, createSubsystem } from "./helpers.js";

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

describe("Concurrency safety", () => {
  it("two members proposing the same new subsystem name at the same time never create duplicates, even with different casing", async () => {
    const { password } = await createUser({ username: "member1", password: "pass1234", role: "MEMBER" });
    const token = await loginAs("member1", password);

    const drafts = await Promise.all([
      request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({}),
      request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({}),
      request(app).post("/api/bills").set("Authorization", `Bearer ${token}`).send({}),
    ]);
    const billIds = drafts.map((d) => d.body.bill._id as string);
    const names = ["Avionics", "avionics", "AVIONICS"];

    const updates = await Promise.all(
      billIds.map((id, i) =>
        request(app).put(`/api/bills/${id}`).set("Authorization", `Bearer ${token}`).send({ newSubsystemName: names[i] })
      )
    );

    for (const res of updates) {
      expect(res.status).toBe(200);
    }

    const subsystems = await Subsystem.find({ name: { $regex: "^avionics$", $options: "i" } });
    expect(subsystems).toHaveLength(1);

    // All three bills should have resolved to the same underlying subsystem document.
    const subsystemIds = new Set(updates.map((r) => r.body.bill.subsystem));
    expect(subsystemIds.size).toBe(1);
  });

  it("only one of two simultaneous approve requests for the same bill succeeds", async () => {
    const member = await createUser({ username: "member1", password: "pass1234", role: "MEMBER" });
    const memberToken = await loginAs("member1", member.password);
    const treasurer = await createUser({ username: "treasurer1", password: "pass1234", role: "TREASURER" });
    const treasurerToken = await loginAs("treasurer1", treasurer.password);
    const subsystem = await createSubsystem();

    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
    const billId = create.body.bill._id;
    await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${memberToken}`)
      .attach("files", Buffer.from("%PDF-1.4"), { filename: "bill.pdf", contentType: "application/pdf" });
    await request(app).put(`/api/bills/${billId}`).set("Authorization", `Bearer ${memberToken}`).send({ totalAmount: 500 });
    await request(app).post(`/api/bills/${billId}/submit`).set("Authorization", `Bearer ${memberToken}`).send({ subsystemId: subsystem.id });

    const [first, second] = await Promise.all([
      request(app).post(`/api/bills/${billId}/approve`).set("Authorization", `Bearer ${treasurerToken}`),
      request(app).post(`/api/bills/${billId}/approve`).set("Authorization", `Bearer ${treasurerToken}`),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 400]); // exactly one winner, one "already decided"
  });

  it("an approve and a reject racing for the same bill never both succeed", async () => {
    const member = await createUser({ username: "member1", password: "pass1234", role: "MEMBER" });
    const memberToken = await loginAs("member1", member.password);
    const treasurer = await createUser({ username: "treasurer1", password: "pass1234", role: "TREASURER" });
    const treasurerToken = await loginAs("treasurer1", treasurer.password);
    const subsystem = await createSubsystem();

    const create = await request(app).post("/api/bills").set("Authorization", `Bearer ${memberToken}`).send({});
    const billId = create.body.bill._id;
    await request(app)
      .post(`/api/bills/${billId}/attachments`)
      .set("Authorization", `Bearer ${memberToken}`)
      .attach("files", Buffer.from("%PDF-1.4"), { filename: "bill.pdf", contentType: "application/pdf" });
    await request(app).put(`/api/bills/${billId}`).set("Authorization", `Bearer ${memberToken}`).send({ totalAmount: 500 });
    await request(app).post(`/api/bills/${billId}/submit`).set("Authorization", `Bearer ${memberToken}`).send({ subsystemId: subsystem.id });

    const [approve, reject] = await Promise.all([
      request(app).post(`/api/bills/${billId}/approve`).set("Authorization", `Bearer ${treasurerToken}`),
      request(app).post(`/api/bills/${billId}/reject`).set("Authorization", `Bearer ${treasurerToken}`).send({ reason: "race" }),
    ]);

    const succeeded = [approve, reject].filter((r) => r.status === 200);
    expect(succeeded).toHaveLength(1);
  });
});
