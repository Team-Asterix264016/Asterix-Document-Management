import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
  Type: { OBJECT: "OBJECT", STRING: "STRING", NUMBER: "NUMBER", ARRAY: "ARRAY" },
}));

const { extractBillData } = await import("../src/services/geminiService.js");

describe("Gemini extraction service", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("normalizes a well-formed structured response", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        vendor: "ABC Hardware",
        invoiceNumber: "INV-1",
        billDate: "2027-08-17",
        currency: "INR",
        totalAmount: 2460,
        items: [{ name: "Bolts" }],
        suggestedSubsystem: "Mechanical",
        suggestedNewSubsystem: null,
        confidence: { vendor: "HIGH" },
        warnings: [],
      }),
    });

    const result = await extractBillData([{ buffer: Buffer.from("x"), mimeType: "image/jpeg" }], ["Mechanical"]);

    expect(result.vendor).toBe("ABC Hardware");
    expect(result.totalAmount).toBe(2460);
    expect(result.items).toHaveLength(1);
  });

  it("fills missing fields with null instead of fabricating data", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({ currency: "INR", items: [], confidence: {}, warnings: ["Illegible amount"] }),
    });

    const result = await extractBillData([{ buffer: Buffer.from("x"), mimeType: "image/png" }], []);

    expect(result.vendor).toBeNull();
    expect(result.totalAmount).toBeNull();
    expect(result.warnings).toContain("Illegible amount");
  });

  it("throws on an empty model response so the caller can fall back to manual entry", async () => {
    generateContentMock.mockResolvedValue({ text: "" });

    await expect(extractBillData([{ buffer: Buffer.from("x"), mimeType: "image/png" }], [])).rejects.toThrow();
  });

  it("propagates API errors so the caller can fall back to manual entry", async () => {
    generateContentMock.mockRejectedValue(new Error("quota exceeded"));

    await expect(extractBillData([{ buffer: Buffer.from("x"), mimeType: "image/png" }], [])).rejects.toThrow("quota exceeded");
  });
});
