import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

async function main() {
  console.log("Starting Asterix A-BAJA backend server...");
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Asterix A-BAJA 2027 backend listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
