import { describe, it, expect } from "vitest";
import { parseInvoiceRawText } from "../src/services/ocrFallbackService.js";

describe("OCR Fallback Service - parseInvoiceRawText", () => {
  it("extracts vendor, invoice number, date, amounts, and subsystem correctly from typical invoice text", () => {
    const rawOcrText = `
TAX INVOICE
ORIGINAL FOR RECIPIENT
Apex Auto Engineering Pvt Ltd
Plot 42, MIDC Industrial Area, Pune 411019
GSTIN: 27AABCA1234F1Z5
Phone: +91 9876543210

Invoice No: INV-2027-0842
Date: 15/02/2027

Bill To: Asterix Baja Team

Description                      Qty   Rate      Amount
High Performance Brake Caliper    2    2500.00   5000.00
DOT 4 Brake Fluid                 1     400.00    400.00

Sub Total: 5400.00
CGST @ 9%: 486.00
SGST @ 9%: 486.00
Grand Total: ₹6,372.00

Thank you for your business!
`;

    const existingSubsystems = ["Braking", "Chassis", "Steering", "Powertrain"];
    const result = parseInvoiceRawText(rawOcrText, existingSubsystems);

    expect(result.vendor).toBe("Apex Auto Engineering Pvt Ltd");
    expect(result.invoiceNumber).toBe("INV-2027-0842");
    expect(result.billDate).toBe("2027-02-15");
    expect(result.totalAmount).toBe(6372);
    expect(result.subtotal).toBe(5400);
    expect(result.tax).toBe(972); // 486 + 486
    expect(result.suggestedSubsystem).toBe("Braking");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("Local OCR"))).toBe(true);
  });

  it("handles alternative date formats and totals gracefully", () => {
    const rawOcrText = `
National Tools & Bearings
Receipt #: RCP-9912
Date: 2027-03-22
Total Amount: 1,250.00
Powertrain drive chain sprocket
`;

    const result = parseInvoiceRawText(rawOcrText, ["Powertrain", "Electronics"]);
    expect(result.vendor).toBe("National Tools & Bearings");
    expect(result.invoiceNumber).toBe("RCP-9912");
    expect(result.billDate).toBe("2027-03-22");
    expect(result.totalAmount).toBe(1250);
    expect(result.suggestedSubsystem).toBe("Powertrain");
  });
});
