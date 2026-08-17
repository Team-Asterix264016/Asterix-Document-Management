import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.js";

export interface AiExtractionResult {
  vendor: string | null;
  invoiceNumber: string | null;
  billDate: string | null; // ISO date string
  description: string | null;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  additionalCharges: number | null;
  totalAmount: number | null;
  items: Array<{
    name: string;
    description: string | null;
    quantity: number | null;
    unitPrice: number | null;
    tax: number | null;
    total: number | null;
  }>;
  suggestedSubsystem: string | null;
  suggestedNewSubsystem: string | null;
  confidence: Record<string, "HIGH" | "MEDIUM" | "LOW">;
  warnings: string[];
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    vendor: { type: Type.STRING, nullable: true },
    invoiceNumber: { type: Type.STRING, nullable: true },
    billDate: { type: Type.STRING, nullable: true, description: "ISO 8601 date, e.g. 2027-08-17" },
    description: { type: Type.STRING, nullable: true },
    currency: { type: Type.STRING },
    subtotal: { type: Type.NUMBER, nullable: true },
    tax: { type: Type.NUMBER, nullable: true },
    discount: { type: Type.NUMBER, nullable: true },
    additionalCharges: { type: Type.NUMBER, nullable: true },
    totalAmount: { type: Type.NUMBER, nullable: true },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING, nullable: true },
          quantity: { type: Type.NUMBER, nullable: true },
          unitPrice: { type: Type.NUMBER, nullable: true },
          tax: { type: Type.NUMBER, nullable: true },
          total: { type: Type.NUMBER, nullable: true },
        },
        required: ["name"],
      },
    },
    suggestedSubsystem: { type: Type.STRING, nullable: true },
    suggestedNewSubsystem: { type: Type.STRING, nullable: true },
    confidence: {
      type: Type.OBJECT,
      properties: {
        vendor: { type: Type.STRING },
        totalAmount: { type: Type.STRING },
        billDate: { type: Type.STRING },
        subsystem: { type: Type.STRING },
      },
    },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["currency", "items", "confidence", "warnings"],
};

function buildPrompt(existingSubsystems: string[]): string {
  return `You are a bill/invoice reading assistant for the Asterix A-BAJA 2027 student project team.

Read the attached bill evidence (image or PDF) and extract structured information.

Rules you MUST follow:
- Never invent or guess values. If information cannot be reliably determined from the evidence, use null.
- Use INR as the default currency only if no other currency is clearly indicated on the bill.
- Preserve numeric values exactly as they appear; do not round or reformat.
- suggestedSubsystem must be chosen from this existing list when one clearly fits: ${existingSubsystems.join(", ")}.
- If no existing subsystem fits well, leave suggestedSubsystem null and instead propose a short, sensible new subsystem name in suggestedNewSubsystem.
- Do not set both suggestedSubsystem and suggestedNewSubsystem.
- Add a warning string for any field that is ambiguous, low-quality, handwritten, or partially illegible.
- confidence should rate vendor, totalAmount, billDate, and subsystem as HIGH, MEDIUM, or LOW.
- You are only an assistant. You never approve, reject, or finalize a bill. A human always reviews and confirms your output.

Return only the structured JSON described by the response schema.`;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    if (!env.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return client;
}

export async function extractBillData(
  files: Array<{ buffer: Buffer; mimeType: string }>,
  existingSubsystems: string[]
): Promise<AiExtractionResult> {
  const ai = getClient();

  const parts = [
    { text: buildPrompt(existingSubsystems) },
    ...files.map((f) => ({
      inlineData: {
        mimeType: f.mimeType,
        data: f.buffer.toString("base64"),
      },
    })),
  ];

  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.1,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = JSON.parse(text) as Partial<AiExtractionResult>;

  // Defensive normalization: never trust the model to perfectly match our shape.
  return {
    vendor: parsed.vendor ?? null,
    invoiceNumber: parsed.invoiceNumber ?? null,
    billDate: parsed.billDate ?? null,
    description: parsed.description ?? null,
    currency: parsed.currency ?? "INR",
    subtotal: parsed.subtotal ?? null,
    tax: parsed.tax ?? null,
    discount: parsed.discount ?? null,
    additionalCharges: parsed.additionalCharges ?? null,
    totalAmount: parsed.totalAmount ?? null,
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item) => ({
          name: item.name ?? "Item",
          description: item.description ?? null,
          quantity: item.quantity ?? null,
          unitPrice: item.unitPrice ?? null,
          tax: item.tax ?? null,
          total: item.total ?? null,
        }))
      : [],
    suggestedSubsystem: parsed.suggestedSubsystem ?? null,
    suggestedNewSubsystem: parsed.suggestedNewSubsystem ?? null,
    confidence: parsed.confidence ?? {},
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  };
}

export async function queryBillsWithAi(
  userQuery: string,
  billsSummary: Array<{
    billNumber: string;
    vendorName: string;
    subsystem: string;
    amount: number;
    date: string;
    status: string;
    createdBy?: string;
    rejectionReason?: string;
  }>
): Promise<{ answer: string; matchingBillNumbers: string[] }> {
  // Simple deterministic fallback matching if Gemini API key is missing
  if (!env.geminiApiKey) {
    const q = userQuery.toLowerCase();
    const matches = billsSummary.filter(
      (b) =>
        b.vendorName.toLowerCase().includes(q) ||
        b.subsystem.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q) ||
        b.billNumber.toLowerCase().includes(q)
    );
    const total = matches.reduce((sum, b) => sum + b.amount, 0);
    return {
      answer: `Found ${matches.length} matching bill(s) totaling ₹${total.toLocaleString("en-IN")}. ${
        matches.length > 0
          ? `Top matching vendors: ${Array.from(new Set(matches.map((m) => m.vendorName))).join(", ")}.`
          : ""
      }`,
      matchingBillNumbers: matches.map((m) => m.billNumber),
    };
  }

  const ai = getClient();
  const prompt = `You are the AI Financial & Expense Assistant for the Asterix A-BAJA 2027 team.
You have access to the following current bills dataset (${billsSummary.length} bills):

${JSON.stringify(billsSummary, null, 2)}

User Question: "${userQuery}"

Instructions:
1. Answer the user's question directly, clearly, and concisely. Use Indian Rupee (₹) formatting for monetary amounts.
2. If appropriate, summarize key totals, subsystem breakdowns, or status counts.
3. List the bill numbers of the specific bills that match the query in a JSON property called "matchingBillNumbers".

Return a JSON object with:
- "answer": Markdown formatted response string answering the query.
- "matchingBillNumbers": Array of string bill numbers relevant to the answer.`;

  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return {
        answer: parsed.answer ?? "I analyzed your bills query.",
        matchingBillNumbers: Array.isArray(parsed.matchingBillNumbers) ? parsed.matchingBillNumbers : [],
      };
    }
  } catch (err) {
    console.error("Gemini AI Query error:", err);
  }

  // Fallback if AI call fails
  const q = userQuery.toLowerCase();
  const matches = billsSummary.filter(
    (b) =>
      b.vendorName.toLowerCase().includes(q) ||
      b.subsystem.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q)
  );
  return {
    answer: `Analyzed ${billsSummary.length} bill records. Found ${matches.length} relevant entries.`,
    matchingBillNumbers: matches.map((m) => m.billNumber),
  };
}
