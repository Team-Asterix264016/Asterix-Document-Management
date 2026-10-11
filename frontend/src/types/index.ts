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

export type InventoryStatus = "AVAILABLE" | "CHECKED_OUT" | "INSTALLED" | "MISSING" | "DAMAGED";
export type CustodyAction =
  | "CREATED"
  | "CHECKOUT"
  | "CHECKIN"
  | "TRANSFER"
  | "RELOCATED"
  | "MARKED_MISSING"
  | "MARKED_FOUND"
  | "UPDATED";

export interface CustodyHistoryEntry {
  _id?: string;
  action: CustodyAction;
  user?: { _id: string; displayName: string; username: string } | null;
  performedBy: { _id: string; displayName: string; username: string };
  timestamp: string;
  location?: string;
  notes?: string;
}

export interface MissingDetails {
  isMissing: boolean;
  reportedBy?: { _id: string; displayName: string; username: string } | null;
  reportedAt?: string | null;
  lastKnownLocation?: string;
  lastKnownHolder?: { _id: string; displayName: string; username: string } | null;
  notes?: string;
}

export interface InventoryItem {
  _id: string;
  name: string;
  partNumber: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  location: string;
  status: InventoryStatus;
  assignedTo?: { _id: string; displayName: string; username: string } | null;
  assignedToAll?: boolean;
  assignedAt?: string | null;
  expectedReturnDate?: string | null;
  missingDetails: MissingDetails;
  history: CustodyHistoryEntry[];
  createdByUser?: { _id: string; displayName: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStats {
  total: number;
  assignedAll?: number;
  assignedIndividual?: number;
  available?: number;
  checkedOut?: number;
  missing: number;
  installed: number;
  toBuyPending: number;
}

export type ToBuyPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ToBuyStatus = "PENDING" | "APPROVED" | "ORDERED" | "PURCHASED" | "CANCELLED";

export interface ToBuyItem {
  _id: string;
  itemName: string;
  subsystem?: { _id: string; name: string } | null;
  category: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  priority: ToBuyPriority;
  status: ToBuyStatus;
  supplierUrl?: string;
  suggestedVendor?: string;
  notes?: string;
  requestedBy: { _id: string; displayName: string; username: string };
  approvedBy?: { _id: string; displayName: string; username: string } | null;
  sourceInventoryItem?: { _id: string; name: string; partNumber?: string; location?: string } | null;
  linkedBillId?: { _id: string; invoiceNumber?: string; totalAmount?: number; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

