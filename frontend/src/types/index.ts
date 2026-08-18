export type Role = "MEMBER" | "TREASURER" | "ADMIN";

export type BillStatus = "DRAFT" | "PROCESSING" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface Subsystem {
  _id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface BillItem {
  name: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  tax?: number;
  total?: number;
}

export interface Attachment {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  driveUrl: string | null;
  order: number;
}

export interface AiExtraction {
  processed: boolean;
  confidence: Record<string, "HIGH" | "MEDIUM" | "LOW">;
  suggestedSubsystem: string | null;
  suggestedNewSubsystem: string | null;
  warnings: string[];
  processedAt: string | null;
  error: string | null;
}

export interface DuplicateCheck {
  possibleDuplicate: boolean;
  matches: Array<{ billId: string; reason: string }>;
}

export interface Bill {
  _id: string;
  project: string;
  invoiceNumber: string | null;
  vendor: string | null;
  billDate: string | null;
  description: string;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  additionalCharges: number | null;
  totalAmount: number | null;
  items: BillItem[];
  subsystem: { _id: string; name: string } | string | null;
  subsystemNameAtSubmission: string | null;
  attachments: Attachment[];
  uploadedBy: { _id: string; displayName: string; username: string } | string;
  status: BillStatus;
  aiExtraction: AiExtraction;
  duplicateCheck: DuplicateCheck;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedBills {
  items: Bill[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AnalyticsSummary {
  approvedExpenditure: number;
  approvedCount: number;
  pendingExpenditure: number;
  pendingCount: number;
  rejectedExpenditure: number;
  rejectedCount: number;
  totalBills: number;
  averageApprovedBillValue: number;
}

export interface Report {
  _id: string;
  type: "SUBSYSTEM" | "MONTHLY";
  key: string;
  label: string;
  driveUrl: string | null;
  generatedAt: string;
  totals: { total?: number; count?: number };
}
