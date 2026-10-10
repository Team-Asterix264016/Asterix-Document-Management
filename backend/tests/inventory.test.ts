import "./setup.js";
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createUser, createSubsystem } from "./helpers.js";

const app = createApp();

async function loginAs(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token as string;
}

describe("Inventory Management API", () => {
  it("requires authentication for inventory endpoints", async () => {
    const res = await request(app).get("/api/inventory");
    expect(res.status).toBe(401);
  });

  it("creates a new inventory component assigned to all by default", async () => {
    const { password } = await createUser({ username: "inv_user1", password: "password123" });
    const token = await loginAs("inv_user1", password);
    const sub = await createSubsystem("Brakes & Chassis");

    const res = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Wilwood Master Cylinder",
        partNumber: "260-6764",
        subsystem: sub.id,
        category: "Brakes & Hydraulics",
        quantity: 2,
        unit: "pcs",
        location: "Bay 2 - Bin 4A",
        description: "0.75 inch bore master cylinder",
      });

    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe("Wilwood Master Cylinder");
    expect(res.body.item.assignedToAll).toBe(true);
    expect(res.body.item.assignedTo).toBeNull();
    expect(res.body.item.history).toHaveLength(1);
    expect(res.body.item.history[0].action).toBe("CREATED");
  });

  it("creates a component assigned to a specific individual and updates assignment", async () => {
    const { password: p1 } = await createUser({ username: "custodian_lead", password: "password123" });
    const { user: member2 } = await createUser({ username: "driver_member", password: "password123" });
    const token = await loginAs("custodian_lead", p1);

    // Create item assigned to member2 directly
    const created = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "AIM Solo 2 GPS Lap Timer",
        location: "Electronics Cabinet 1",
        assignedTo: member2.id,
      });

    expect(created.status).toBe(201);
    expect(created.body.item.assignedToAll).toBe(false);
    expect(created.body.item.assignedTo._id).toBe(member2.id);

    const itemId = created.body.item._id;

    // Update assignment to ALL (shared)
    const updateRes = await request(app)
      .put(`/api/inventory/${itemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        assignedTo: "ALL",
        location: "Workshop Bay 1",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.assignedToAll).toBe(true);
    expect(updateRes.body.item.assignedTo).toBeNull();
    expect(updateRes.body.item.location).toBe("Workshop Bay 1");
  });

  it("flags a component as missing and restores it when found", async () => {
    const { password } = await createUser({ username: "workshop_mgr", password: "password123" });
    const token = await loginAs("workshop_mgr", password);

    const created = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Torque Wrench 3/8-inch",
        location: "Tool Chest Drawer 3",
      });

    const itemId = created.body.item._id;

    // Mark missing
    const missingRes = await request(app)
      .patch(`/api/inventory/${itemId}/missing`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        isMissing: true,
        lastKnownLocation: "Engine assembly bay",
        notes: "Not returned after Wednesday engine build session",
      });

    expect(missingRes.status).toBe(200);
    expect(missingRes.body.item.status).toBe("MISSING");
    expect(missingRes.body.item.missingDetails.isMissing).toBe(true);
    expect(missingRes.body.item.missingDetails.notes).toContain("Not returned");

    // Mark found
    const foundRes = await request(app)
      .patch(`/api/inventory/${itemId}/missing`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        isMissing: false,
        lastKnownLocation: "Tool Chest Drawer 3",
        notes: "Located behind fabrication table",
      });

    expect(foundRes.status).toBe(200);
    expect(foundRes.body.item.status).toBe("AVAILABLE");
    expect(foundRes.body.item.missingDetails.isMissing).toBe(false);
  });

  it("creates and manages a procurement to-buy item", async () => {
    const { password } = await createUser({ username: "buyer1", password: "password123" });
    const token = await loginAs("buyer1", password);

    const res = await request(app)
      .post("/api/to-buy")
      .set("Authorization", `Bearer ${token}`)
      .send({
        itemName: "MoTeC M130 ECU Wiring Harness Pins",
        quantity: 20,
        unit: "pcs",
        estimatedCost: 1500,
        priority: "HIGH",
        suggestedVendor: "WireCare",
        notes: "Spares for telemetry harness",
      });

    expect(res.status).toBe(201);
    expect(res.body.item.itemName).toBe("MoTeC M130 ECU Wiring Harness Pins");
    expect(res.body.item.status).toBe("PENDING");

    const toBuyId = res.body.item._id;

    // Update status to APPROVED then ORDERED
    const approveRes = await request(app)
      .patch(`/api/to-buy/${toBuyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "APPROVED" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.item.status).toBe("APPROVED");

    // List to-buy items
    const listRes = await request(app)
      .get("/api/to-buy?status=APPROVED")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("returns aggregated inventory KPIs", async () => {
    const { password } = await createUser({ username: "stats_user", password: "password123" });
    const token = await loginAs("stats_user", password);

    const statsRes = await request(app)
      .get("/api/inventory/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.stats).toHaveProperty("total");
    expect(statsRes.body.stats).toHaveProperty("assignedAll");
    expect(statsRes.body.stats).toHaveProperty("assignedIndividual");
    expect(statsRes.body.stats).toHaveProperty("missing");
    expect(statsRes.body.stats).toHaveProperty("toBuyPending");
  });
});
