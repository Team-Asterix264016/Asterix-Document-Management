import "./setup.js";
import { describe, it, expect } from "vitest";
import { Bill } from "../src/models/Bill.js";
import { Subsystem } from "../src/models/Subsystem.js";
import { User } from "../src/models/User.js";
import { generateMonthlyReportBuffer, generateSubsystemReportBuffer } from "../src/services/reportService.js";
import ExcelJS from "exceljs";

async function seedBills() {
  const user = await User.create({ username: "u1", passwordHash: "x", displayName: "U1", role: "MEMBER" });
  const mech = await Subsystem.create({ name: "Mechanical" });
  const elec = await Subsystem.create({ name: "Electrical" });

  await Bill.create([
    {
      uploadedBy: user.id,
      status: "APPROVED",
      subsystem: mech.id,
      subsystemNameAtSubmission: "Mechanical",
      vendor: "ABC Hardware",
      totalAmount: 1000,
      billDate: new Date("2027-08-05"),
    },
    {
      uploadedBy: user.id,
      status: "APPROVED",
      subsystem: mech.id,
      subsystemNameAtSubmission: "Mechanical",
      vendor: "ABC Hardware",
      totalAmount: 500,
      billDate: new Date("2027-08-20"),
    },
    {
      uploadedBy: user.id,
      status: "REJECTED",
      subsystem: mech.id,
      subsystemNameAtSubmission: "Mechanical",
      vendor: "Should Not Count",
      totalAmount: 9999,
      billDate: new Date("2027-08-10"),
    },
    {
      uploadedBy: user.id,
      status: "APPROVED",
      subsystem: elec.id,
      subsystemNameAtSubmission: "Electrical",
      vendor: "XYZ Traders",
      totalAmount: 300,
      billDate: new Date("2027-09-01"),
    },
  ]);

  return { mech, elec };
}

async function totalsFromWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  return workbook.worksheets[0];
}

describe("Report generation", () => {
  it("includes only approved bills in the subsystem report and computes correct totals", async () => {
    const { mech } = await seedBills();

    const { total, bills } = await generateSubsystemReportBuffer(String(mech._id));

    expect(bills).toHaveLength(2);
    expect(total).toBe(1500);
    expect(bills.every((b) => b.status === "APPROVED")).toBe(true);
  });

  it("groups bills into the correct month and excludes other months", async () => {
    await seedBills();

    const { total, bills } = await generateMonthlyReportBuffer("2027-08");

    expect(bills).toHaveLength(2); // the two August Mechanical approved bills
    expect(total).toBe(1500);
  });

  it("produces a readable xlsx workbook", async () => {
    const { mech } = await seedBills();
    const { buffer } = await generateSubsystemReportBuffer(String(mech._id));

    const sheet = await totalsFromWorkbook(buffer);
    expect(sheet.rowCount).toBeGreaterThan(3);
  });

  it("handles a large volume of bills without errors or dropped rows", async () => {
    const user = await User.create({ username: "bulk-user", passwordHash: "x", displayName: "Bulk", role: "MEMBER" });
    const subsystem = await Subsystem.create({ name: "Bulk Subsystem" });

    const bills = Array.from({ length: 250 }, (_, i) => ({
      uploadedBy: user.id,
      status: "APPROVED" as const,
      subsystem: subsystem.id,
      subsystemNameAtSubmission: "Bulk Subsystem",
      vendor: `Vendor ${i % 30}`,
      totalAmount: (i + 1) * 10,
      billDate: new Date(2027, i % 12, 1 + (i % 27)),
    }));
    await Bill.insertMany(bills);

    const { total, bills: reportBills, buffer } = await generateSubsystemReportBuffer(String(subsystem.id));
    const expectedTotal = bills.reduce((sum, b) => sum + b.totalAmount, 0);

    expect(reportBills).toHaveLength(250);
    expect(total).toBe(expectedTotal);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    // header/title block rows + 250 data rows
    expect(workbook.worksheets[0].rowCount).toBeGreaterThanOrEqual(250);
  });
});
