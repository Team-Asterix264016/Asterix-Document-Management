import { Schema, model, type InferSchemaType } from "mongoose";
import { PROJECT_NAME } from "../config/env.js";

export const BILL_STATUSES = ["DRAFT", "PROCESSING", "PENDING_APPROVAL", "APPROVED", "REJECTED"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

const itemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    fileHash: { type: String, required: true },
    driveFileId: { type: String, default: null },
    driveUrl: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const duplicateMatchSchema = new Schema(
  {
    billId: { type: Schema.Types.ObjectId, ref: "Bill" },
    reason: { type: String },
  },
  { _id: false }
);

const billSchema = new Schema(
  {
    project: { type: String, default: PROJECT_NAME, immutable: true },

    invoiceNumber: { type: String, default: null },
    vendor: { type: String, default: null },
    vendorNormalized: { type: String, default: null, index: true },
    billDate: { type: Date, default: null },
    description: { type: String, default: "" },

    currency: { type: String, default: "INR" },
    subtotal: { type: Number, default: null },
    tax: { type: Number, default: null },
    discount: { type: Number, default: null },
    additionalCharges: { type: Number, default: null },
    totalAmount: { type: Number, default: null, index: true },

    items: { type: [itemSchema], default: [] },

    subsystem: { type: Schema.Types.ObjectId, ref: "Subsystem", default: null, index: true },
    subsystemNameAtSubmission: { type: String, default: null },

    attachments: { type: [attachmentSchema], default: [] },

    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: BILL_STATUSES, default: "DRAFT", index: true },
    // Once the user saves a manual edit, AI extraction must never overwrite their values again.
    userEdited: { type: Boolean, default: false },

    aiExtraction: {
      processed: { type: Boolean, default: false },
      confidence: { type: Schema.Types.Mixed, default: {} },
      suggestedSubsystem: { type: String, default: null },
      suggestedNewSubsystem: { type: String, default: null },
      warnings: { type: [String], default: [] },
      processedAt: { type: Date, default: null },
      error: { type: String, default: null },
    },

    duplicateCheck: {
      possibleDuplicate: { type: Boolean, default: false },
      matches: { type: [duplicateMatchSchema], default: [] },
    },

    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    drive: {
      files: { type: [attachmentSchema], default: [] },
      approvedFolderId: { type: String, default: null },
      rejectedFolderId: { type: String, default: null },
      reportReferences: { type: [String], default: [] },
      status: { type: String, enum: ["NOT_APPLICABLE", "PENDING", "SYNCED", "FAILED"], default: "NOT_APPLICABLE" },
    },
  },
  { timestamps: true }
);

billSchema.index({ vendor: "text", description: "text", invoiceNumber: "text" });
billSchema.index({ createdAt: -1 });

export type BillDoc = InferSchemaType<typeof billSchema>;
export const Bill = model("Bill", billSchema);
