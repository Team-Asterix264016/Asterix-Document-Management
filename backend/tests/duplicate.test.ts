import "./setup.js";
import { describe, it, expect } from "vitest";
import { Bill } from "../src/models/Bill.js";
import { User } from "../src/models/User.js";
import { findPossibleDuplicates } from "../src/services/duplicateService.js";

async function makeUploader() {
  return User.create({ username: "u1", passwordHash: "x", displayName: "U1", role: "MEMBER" });
}

describe("Duplicate detection", () => {
  it("flags a bill with the same invoice number", async () => {
    const user = await makeUploader();
    await Bill.create({
      uploadedBy: user.id,
      status: "PENDING_APPROVAL",
      invoiceNumber: "INV-29481",
      vendor: "ABC Hardware",
      vendorNormalized: "ABC HARDWARE",
      totalAmount: 2460,
      billDate: new Date("2027-08-17"),
    });

    const matches = await findPossibleDuplicates({
      vendor: "ABC Hardware",
      invoiceNumber: "INV-29481",
      billDate: new Date("2027-08-18"),
      totalAmount: 999,
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].reason).toMatch(/invoice/i);
  });

  it("flags a bill with the same vendor, amount, and nearby date", async () => {
    const user = await makeUploader();
    await Bill.create({
      uploadedBy: user.id,
      status: "APPROVED",
      vendor: "ABC Hardware",
      vendorNormalized: "ABC HARDWARE",
      totalAmount: 2460,
      billDate: new Date("2027-08-17"),
    });

    const matches = await findPossibleDuplicates({
      vendor: "abc hardware", // same vendor, different casing — normalization should still match
      invoiceNumber: null,
      billDate: new Date("2027-08-18"),
      totalAmount: 2460,
    });

    expect(matches.length).toBeGreaterThan(0);
  });

  it("reports no match for genuinely different bills", async () => {
    const user = await makeUploader();
    await Bill.create({
      uploadedBy: user.id,
      status: "APPROVED",
      vendor: "ABC Hardware",
      vendorNormalized: "ABC HARDWARE",
      totalAmount: 2460,
      billDate: new Date("2027-08-17"),
    });

    const matches = await findPossibleDuplicates({
      vendor: "Totally Different Vendor",
      invoiceNumber: null,
      billDate: new Date("2027-08-17"),
      totalAmount: 500,
    });

    expect(matches).toHaveLength(0);
  });

  it("does not treat draft bills as duplicate candidates", async () => {
    const user = await makeUploader();
    await Bill.create({
      uploadedBy: user.id,
      status: "DRAFT",
      vendor: "ABC Hardware",
      vendorNormalized: "ABC HARDWARE",
      totalAmount: 2460,
      billDate: new Date("2027-08-17"),
    });

    const matches = await findPossibleDuplicates({
      vendor: "ABC Hardware",
      invoiceNumber: null,
      billDate: new Date("2027-08-17"),
      totalAmount: 2460,
    });

    expect(matches).toHaveLength(0);
  });
});
