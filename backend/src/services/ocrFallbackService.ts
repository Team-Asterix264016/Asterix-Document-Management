import { createWorker } from "tesseract.js";
import type { AiExtractionResult } from "./geminiService.js";

const SUBSYSTEM_KEYWORDS: Record<string, string[]> = {
  braking: ["brake", "caliper", "rotor", "disc", "master cylinder", "pedal", "dot 4", "fluid", "hose", "bleeder", "pad"],
  steering: ["steering", "rack", "pinion", "tie rod", "knuckle", "column", "universal joint", "ball joint"],
  suspension: ["suspension", "shock", "damper", "spring", "a-arm", "wishbone", "bushing", "heim", "rod end"],
  chassis: ["chassis", "roll cage", "pipe", "tube", "welding", "frame", "gusset", "sheet metal", "bracket", "mount", "rod"],
  powertrain: ["powertrain", "engine", "gearbox", "cvt", "clutch", "sprocket", "chain", "belt", "oil", "fuel", "differential", "axle", "shaft"],
  electronics: ["electronics", "battery", "kill switch", "wire", "harness", "fuse", "relay", "sensor", "tachometer", "connector", "led", "switch"],
  transmission: ["transmission", "gear", "cvt", "pulley", "belt", "chain", "sprocket", "drive"],
  brakes: ["brake", "rotor", "caliper", "pad", "fluid", "hose"],
  electrical: ["electrical", "wire", "battery", "fuse", "switch", "sensor"],
};

/**
 * Parses raw text extracted from an invoice or receipt into structured bill data.
 */
export function parseInvoiceRawText(text: string, existingSubsystems: string[]): AiExtractionResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. DATE EXTRACTION
  let billDate: string | null = null;
  const dateRegexes = [
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    /\b(0?[1-9]|[12][0-9]|3[01])[/\-.](0?[1-9]|1[012])[/\-.](20\d\d)\b/,
    // YYYY-MM-DD or YYYY/MM/DD
    /\b(20\d\d)[/\-.](0?[1-9]|1[012])[/\-.](0?[1-9]|[12][0-9]|3[01])\b/,
    // DD Month YYYY (e.g. 15 Jan 2027 or 15 January 2027)
    /\b(0?[1-9]|[12][0-9]|3[01])\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+(20\d\d)\b/i,
  ];

  for (const regex of dateRegexes) {
    const match = text.match(regex);
    if (match) {
      if (match[2] && isNaN(Number(match[2]))) {
        // Month name format
        const day = match[1].padStart(2, "0");
        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthNum = monthNames.findIndex((m) => match[2].toLowerCase().startsWith(m)) + 1;
        const monthStr = String(monthNum).padStart(2, "0");
        const year = match[3];
        billDate = `${year}-${monthStr}-${day}`;
      } else if (match[3].length === 4) {
        // DD/MM/YYYY
        const day = match[1].padStart(2, "0");
        const month = match[2].padStart(2, "0");
        const year = match[3];
        billDate = `${year}-${month}-${day}`;
      } else if (match[1].length === 4) {
        // YYYY/MM/DD
        const year = match[1];
        const month = match[2].padStart(2, "0");
        const day = match[3].padStart(2, "0");
        billDate = `${year}-${month}-${day}`;
      }
      break;
    }
  }

  // 2. INVOICE / BILL NUMBER
  let invoiceNumber: string | null = null;
  const invoiceRegexes = [
    /(?:invoice|inv|bill|receipt|cash memo|memo|tax invoice)\s*(?:no\.?|num(?:ber)?|#)\s*[:.]?\s*([A-Za-z0-9\-_/]+)/i,
    /(?:invoice|inv|bill)\s*#\s*([A-Za-z0-9\-_/]+)/i,
  ];
  for (const regex of invoiceRegexes) {
    const match = text.match(regex);
    if (match && match[1] && match[1].length >= 2) {
      invoiceNumber = match[1].trim();
      break;
    }
  }

  // 3. AMOUNTS (Total, Subtotal, Tax)
  function parseAmount(valStr: string): number | null {
    if (!valStr) return null;
    const clean = valStr.replace(/,/g, "").trim();
    const num = parseFloat(clean);
    return isNaN(num) ? null : Math.round(num * 100) / 100;
  }

  let totalAmount: number | null = null;
  const totalKeywords = [
    /(?:grand\s*total|net\s*payable|total\s*amount|final\s*amount|invoice\s*total|net\s*amount|balance\s*due|amount\s*payable)\s*[:.]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:total)\s*[:.]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const regex of totalKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseAmount(match[1]);
      if (parsed !== null && parsed > 0) {
        totalAmount = parsed;
        break;
      }
    }
  }

  // Subtotal
  let subtotal: number | null = null;
  const subtotalMatch = text.match(/(?:sub\s*total|taxable\s*value|taxable\s*amount)\s*[:.]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (subtotalMatch && subtotalMatch[1]) {
    subtotal = parseAmount(subtotalMatch[1]);
  }

  // Tax
  let tax: number | null = null;
  const cgstMatch = text.match(/cgst\s*(?:@\s*[\d.]+\s*%)?\s*[:.]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const sgstMatch = text.match(/sgst\s*(?:@\s*[\d.]+\s*%)?\s*[:.]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const igstMatch = text.match(/igst\s*(?:@\s*[\d.]+\s*%)?\s*[:.]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const totalTaxMatch = text.match(/(?:total\s*tax|gst\s*amount|tax\s*amount)\s*[:.]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i);

  if (cgstMatch && sgstMatch) {
    const c = parseAmount(cgstMatch[1]) ?? 0;
    const s = parseAmount(sgstMatch[1]) ?? 0;
    tax = Math.round((c + s) * 100) / 100;
  } else if (igstMatch) {
    tax = parseAmount(igstMatch[1]);
  } else if (totalTaxMatch) {
    tax = parseAmount(totalTaxMatch[1]);
  }

  if (subtotal === null && totalAmount !== null && tax !== null && totalAmount >= tax) {
    subtotal = Math.round((totalAmount - tax) * 100) / 100;
  } else if (subtotal === null && totalAmount !== null) {
    subtotal = totalAmount;
  }

  // 4. VENDOR NAME EXTRACTION
  let vendor: string | null = null;
  const skipWords = [
    "tax invoice",
    "invoice",
    "cash memo",
    "retail invoice",
    "bill of supply",
    "original for recipient",
    "duplicate",
    "triplicate",
    "gstin",
    "gst in",
    "pan:",
    "phone:",
    "tel:",
    "mobile:",
    "email:",
    "address:",
    "date:",
    "bill to",
    "ship to",
  ];

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const isSkip = skipWords.some((sw) => lower.startsWith(sw) || lower === sw);
    if (!isSkip && line.length >= 3 && !/^\d+$/.test(line) && !line.includes("@") && !line.startsWith("http")) {
      vendor = line.replace(/^[#*|\-_: ]+/, "").trim();
      break;
    }
  }

  // 5. SUBSYSTEM INFERENCE
  let suggestedSubsystem: string | null = null;
  const lowerText = text.toLowerCase();

  for (const sub of existingSubsystems) {
    const lowerSub = sub.toLowerCase();
    if (lowerText.includes(lowerSub)) {
      suggestedSubsystem = sub;
      break;
    }
    const keywords = SUBSYSTEM_KEYWORDS[lowerSub] || [];
    if (keywords.some((kw) => lowerText.includes(kw))) {
      suggestedSubsystem = sub;
      break;
    }
  }

  // 6. ITEMS ESTIMATION
  const items: Array<{
    name: string;
    description: string | null;
    quantity: number | null;
    unitPrice: number | null;
    tax: number | null;
    total: number | null;
  }> = [];

  if (totalAmount) {
    items.push({
      name: vendor ? `Supplies from ${vendor}` : "Bill Items",
      description: "Extracted via local OCR fallback",
      quantity: 1,
      unitPrice: subtotal ?? totalAmount,
      tax: tax ?? 0,
      total: totalAmount,
    });
  }

  return {
    vendor,
    invoiceNumber,
    billDate,
    description: vendor ? `Purchase from ${vendor}` : null,
    currency: "INR",
    subtotal,
    tax,
    discount: null,
    additionalCharges: null,
    totalAmount,
    items,
    suggestedSubsystem,
    suggestedNewSubsystem: null,
    confidence: {
      vendor: vendor ? "MEDIUM" : "LOW",
      totalAmount: totalAmount ? "MEDIUM" : "LOW",
      billDate: billDate ? "MEDIUM" : "LOW",
      subsystem: suggestedSubsystem ? "MEDIUM" : "LOW",
    },
    warnings: ["Extracted using Local OCR fallback. Please verify detected values."],
  };
}

/**
 * Extracts raw text from an image or PDF buffer using Tesseract.js / pdf-parse.
 */
export async function extractBillDataWithOcr(
  files: Array<{ buffer: Buffer; mimeType: string }>,
  existingSubsystems: string[]
): Promise<AiExtractionResult> {
  let combinedText = "";

  for (const file of files) {
    if (file.mimeType === "application/pdf") {
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: file.buffer });
        const textResult = await parser.getText();
        await parser.destroy();
        if (textResult && textResult.text && textResult.text.trim().length > 10) {
          combinedText += `\n${textResult.text}`;
          continue;
        }
      } catch (pdfErr) {
        console.warn("Digital PDF text extraction error:", (pdfErr as Error).message);
      }
    } else if (file.mimeType.startsWith("image/")) {
      // Process image with Tesseract.js
      let worker;
      try {
        worker = await createWorker("eng");
        const { data } = await worker.recognize(file.buffer);
        if (data && data.text) {
          combinedText += `\n${data.text}`;
        }
      } catch (ocrErr) {
        console.warn("Tesseract worker error on attachment:", (ocrErr as Error).message);
      } finally {
        if (worker) {
          await worker.terminate().catch(() => {});
        }
      }
    }
  }

  if (!combinedText.trim()) {
    throw new Error("Local OCR could not extract any readable text from the document");
  }

  return parseInvoiceRawText(combinedText, existingSubsystems);
}
