import { describe, it, expect, vi, beforeEach } from "vitest";

const filesList = vi.fn();
const filesCreate = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: { JWT: vi.fn().mockImplementation(() => ({})) },
    drive: vi.fn().mockImplementation(() => ({
      files: { list: filesList, create: filesCreate },
    })),
  },
}));

vi.mock("../src/config/env.js", async () => {
  const actual = await vi.importActual<typeof import("../src/config/env.js")>("../src/config/env.js");
  return {
    ...actual,
    env: {
      ...actual.env,
      googleServiceAccountEmail: "svc@example.com",
      googleServiceAccountPrivateKey: "fake-key",
      googleDriveRootFolderId: "root-folder-id",
    },
  };
});

const driveService = await import("../src/services/driveService.js");

describe("Drive folder + upload behavior", () => {
  beforeEach(() => {
    filesList.mockReset();
    filesCreate.mockReset();
  });

  it("reuses an existing folder instead of creating a duplicate", async () => {
    filesList.mockResolvedValue({ data: { files: [{ id: "existing-id", name: "Mechanical" }] } });

    const id = await driveService.ensureFolder("Mechanical-Reused", "parent-1");

    expect(id).toBe("existing-id");
    expect(filesCreate).not.toHaveBeenCalled();
  });

  it("creates a folder when none exists", async () => {
    filesList.mockResolvedValue({ data: { files: [] } });
    filesCreate.mockResolvedValue({ data: { id: "new-id" } });

    const id = await driveService.ensureFolder("Brand-New-Folder", "parent-2");

    expect(id).toBe("new-id");
    expect(filesCreate).toHaveBeenCalledOnce();
  });

  it("surfaces upload failures to the caller instead of swallowing them", async () => {
    filesCreate.mockRejectedValue(new Error("Drive API unavailable"));

    await expect(
      driveService.uploadFile({ name: "bill.pdf", mimeType: "application/pdf", buffer: Buffer.from("x"), parentId: "parent-3" })
    ).rejects.toThrow("Drive API unavailable");
  });
});
