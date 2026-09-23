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

1. NEVER invent or guess values. If information cannot be reliably determined from the evidence, use null.
2. Use INR as the default currency only if no other currency is clearly indicated on the bill.
3. Preserve numeric values exactly as they appear; do not round or reformat.

TAX RULES:
- The "tax" field must be the TOTAL of all tax components. If the bill shows CGST + SGST, sum them. If it shows IGST alone, use that. If it shows VAT, use that. Never report only one component of a split tax.
- If the bill lists tax as a percentage, compute the absolute amount and report that.

DATE RULES:
- For Indian bills, assume DD/MM/YYYY format unless the bill explicitly uses a different format (e.g. "Jan 15, 2027"). Never swap day and month.
- Output dates in ISO 8601 format (YYYY-MM-DD).

VENDOR / PAYER RULES:
- The "vendor" is the SELLER — the business that issued the bill. It is NOT the buyer or payer.
- Look for the company name, letterhead, or "Sold by" / "From" fields.

INVOICE NUMBER RULES:
- Prefer the printed invoice number, bill number, or receipt number.
- Ignore UPI transaction references, payment gateway IDs, or bank reference numbers unless no invoice number exists at all.

HANDWRITTEN OVERRIDES:
- If a handwritten total, correction, or annotation is visible on the bill, prefer the handwritten value over the printed one. Add a warning noting the handwritten override.

SUBSYSTEM CLASSIFICATION:
- suggestedSubsystem must be chosen ONLY from this existing list: ${existingSubsystems.join(", ")}.
- If no existing subsystem is a clear fit, leave suggestedSubsystem as null and instead propose a short, descriptive name in suggestedNewSubsystem.
- NEVER set both suggestedSubsystem and suggestedNewSubsystem. Only one may be non-null.

GENERAL:
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

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (msg.includes("fetch failed") || msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("network")) return true;
  const statusMatch = msg.match(/(\d{3})/);
  if (statusMatch) {
    const code = Number(statusMatch[1]);
    if (code === 429 || (code >= 500 && code < 600)) return true;
  }
  return false;
}

async function withRetries<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isTransientError(err)) {
        const base = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 500;
        await new Promise((r) => setTimeout(r, base + jitter));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function getOcrModel(): string {
  return env.geminiOcrModel || env.geminiModel;
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

  const response = await withRetries(() =>
    ai.models.generateContent({
      model: getOcrModel(),
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    })
  );

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = JSON.parse(text) as Partial<AiExtractionResult>;

  let suggestedSubsystem = parsed.suggestedSubsystem ?? null;
  let suggestedNewSubsystem = parsed.suggestedNewSubsystem ?? null;

  if (suggestedSubsystem && suggestedNewSubsystem) {
    const lowerList = existingSubsystems.map((s) => s.toLowerCase());
    if (lowerList.includes(suggestedSubsystem.toLowerCase())) {
      suggestedNewSubsystem = null;
    } else {
      suggestedNewSubsystem = suggestedSubsystem;
      suggestedSubsystem = null;
    }
  }

  if (suggestedSubsystem) {
    const lowerList = existingSubsystems.map((s) => s.toLowerCase());
    if (!lowerList.includes(suggestedSubsystem.toLowerCase())) {
      suggestedNewSubsystem = suggestedSubsystem;
      suggestedSubsystem = null;
    }
  }

  const warnings = Array.isArray(parsed.warnings) ? [...parsed.warnings] : [];

  const subtotal = parsed.subtotal ?? null;
  const tax = parsed.tax ?? null;
  const discount = parsed.discount ?? null;
  const additionalCharges = parsed.additionalCharges ?? null;
  const totalAmount = parsed.totalAmount ?? null;

  if (subtotal != null && totalAmount != null) {
    const expected = subtotal + (tax ?? 0) - (discount ?? 0) + (additionalCharges ?? 0);
    const tolerance = Math.max(1, totalAmount * 0.02);
    if (Math.abs(expected - totalAmount) > tolerance) {
      warnings.push(
        `Numeric reconciliation: subtotal(${subtotal}) + tax(${tax ?? 0}) - discount(${discount ?? 0}) + charges(${additionalCharges ?? 0}) = ${expected}, but totalAmount is ${totalAmount}.`
      );
    }
  }

  return {
    vendor: parsed.vendor ?? null,
    invoiceNumber: parsed.invoiceNumber ?? null,
    billDate: parsed.billDate ?? null,
    description: parsed.description ?? null,
    currency: parsed.currency ?? "INR",
    subtotal,
    tax,
    discount,
    additionalCharges,
    totalAmount,
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
    suggestedSubsystem,
    suggestedNewSubsystem,
    confidence: parsed.confidence ?? {},
    warnings,
  };
}

export interface AiQueryBillSummary {
  billNumber: string;
  vendorName: string;
  subsystem: string;
  amount: number;
  date: string;
  status: string;
  rejectionReason?: string;
}

const AI_QUERY_MAX_BILLS = 300;

function deterministicMatch(userQuery: string, billsSummary: AiQueryBillSummary[]) {
  const q = userQuery.toLowerCase();
  return billsSummary.filter(
    (b) =>
      b.vendorName.toLowerCase().includes(q) ||
      b.subsystem.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q) ||
      b.billNumber.toLowerCase().includes(q)
  );
}

export async function queryBillsWithAi(
  userQuery: string,
  billsSummary: AiQueryBillSummary[],
  totalCount = billsSummary.length
): Promise<{ answer: string; matchingBillNumbers: string[] }> {
  const bounded = billsSummary.slice(0, AI_QUERY_MAX_BILLS);

  if (!env.geminiApiKey) {
    const matches = deterministicMatch(userQuery, bounded);
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
  const scopeNote =
    totalCount > bounded.length
      ? `Note: this dataset shows only the ${bounded.length} most recent bills out of ${totalCount} total — mention this if the question needs the full history.`
      : "";
  const prompt = `You are the AI Financial & Expense Assistant for the Asterix A-BAJA 2027 team.
You have access to the following bills dataset (${bounded.length} bills). ${scopeNote}

${JSON.stringify(bounded, null, 2)}

User Question: "${userQuery}"

Instructions:
1. Answer the user's question directly, clearly, and concisely. Use Indian Rupee (₹) formatting for monetary amounts.
2. If appropriate, summarize key totals, subsystem breakdowns, or status counts.
3. Never invent bills, amounts, or vendors that are not in the dataset above.
4. List the bill numbers of the specific bills that match the query in a JSON property called "matchingBillNumbers".

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
        answer: typeof parsed.answer === "string" ? parsed.answer : "I analyzed your bills query.",
        matchingBillNumbers: Array.isArray(parsed.matchingBillNumbers) ? parsed.matchingBillNumbers.filter((v: unknown) => typeof v === "string") : [],
      };
    }
  } catch (err) {
    console.error("Gemini AI Query error:", err);
  }

  const matches = deterministicMatch(userQuery, bounded);
  return {
    answer: `Analyzed ${bounded.length} bill records. Found ${matches.length} relevant entries.`,
    matchingBillNumbers: matches.map((m) => m.billNumber),
  };
}
