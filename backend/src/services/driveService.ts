import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import { env } from "../config/env.js";

let driveClient: drive_v3.Drive | null = null;

function getDrive(): drive_v3.Drive {
  if (!driveClient) {
    if (!env.googleClientId || !env.googleClientSecret || !env.googleRefreshToken) {
      throw new Error("Google Drive OAuth2 credentials are not configured");
    }
    const auth = new google.auth.OAuth2(
      env.googleClientId,
      env.googleClientSecret
    );
    auth.setCredentials({ refresh_token: env.googleRefreshToken });
    driveClient = google.drive({ version: "v3", auth });
  }
  return driveClient;
}

const folderCache = new Map<string, string>();

/** Find a child folder by name under `parentId`, creating it if absent. Results are cached in-process. */
export async function ensureFolder(name: string, parentId: string): Promise<string> {
  const cacheKey = `${parentId}/${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  const drive = getDrive();
  const escapedName = name.replace(/'/g, "\\'");
  const listRes = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = listRes.data.files?.[0];
  if (existing?.id) {
    folderCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const id = createRes.data.id;
  if (!id) throw new Error(`Failed to create Drive folder: ${name}`);
  folderCache.set(cacheKey, id);
  return id;
}

export async function uploadFile(params: {
  name: string;
  mimeType: string;
  buffer: Buffer;
  parentId: string;
}): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name: params.name,
      parents: [params.parentId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  if (!res.data.id) throw new Error(`Drive upload failed for ${params.name}`);
  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}

/** Move a file from one parent folder to another (used when a bill moves DRAFT evidence -> approved/rejected). */
export async function moveFile(fileId: string, fromParentId: string, toParentId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.update({
    fileId,
    addParents: toParentId,
    removeParents: fromParentId,
    supportsAllDrives: true,
  });
}

export async function getOrCreateRootFolder(): Promise<string> {
  if (env.googleDriveRootFolderId) return env.googleDriveRootFolderId;
  throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured. Create the root folder in Drive and set its ID.");
}

export const DRIVE_STRUCTURE = {
  BILL_EVIDENCE: "Bill Evidence",
  APPROVED: "Approved",
  REJECTED: "Rejected Bills",
  SUBSYSTEM_REPORTS: "Subsystem Reports",
  MONTHLY_REPORTS: "Monthly Reports",
};

export async function getPendingEvidenceFolder(): Promise<string> {
  const root = await getOrCreateRootFolder();
  const evidence = await ensureFolder(DRIVE_STRUCTURE.BILL_EVIDENCE, root);
  return ensureFolder("Pending", evidence);
}

export async function getApprovedFolderForSubsystem(subsystemName: string): Promise<string> {
  const root = await getOrCreateRootFolder();
  const evidence = await ensureFolder(DRIVE_STRUCTURE.BILL_EVIDENCE, root);
  const approved = await ensureFolder(DRIVE_STRUCTURE.APPROVED, evidence);
  return ensureFolder(subsystemName, approved);
}

export async function getRejectedFolder(): Promise<string> {
  const root = await getOrCreateRootFolder();
  const evidence = await ensureFolder(DRIVE_STRUCTURE.BILL_EVIDENCE, root);
  return ensureFolder(DRIVE_STRUCTURE.REJECTED, evidence);
}

export async function getSubsystemReportFolder(subsystemName: string): Promise<string> {
  const root = await getOrCreateRootFolder();
  const reports = await ensureFolder(DRIVE_STRUCTURE.SUBSYSTEM_REPORTS, root);
  return ensureFolder(subsystemName, reports);
}

export async function getMonthlyReportFolder(monthLabel: string): Promise<string> {
  const root = await getOrCreateRootFolder();
  const reports = await ensureFolder(DRIVE_STRUCTURE.MONTHLY_REPORTS, root);
  return ensureFolder(monthLabel, reports);
}
