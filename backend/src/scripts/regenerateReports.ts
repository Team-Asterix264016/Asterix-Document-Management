import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import { regenerateAllReports, listReports } from "../services/reportService.js";

async function main() {
  await connectDB();
  console.log("Regenerating all reports...");
  const result = await regenerateAllReports();
  console.log("Regenerated counts:", result);
  const reports = await listReports();
  console.log("Updated reports:", JSON.stringify(reports.map(r => ({
    type: r.type,
    label: r.label,
    driveFileId: r.driveFileId,
    driveUrl: r.driveUrl,
    generatedAt: r.generatedAt
  })), null, 2));
  await disconnectDB();
}

main().catch(console.error);
