import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "node:child_process";

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri("asterix_dev");

const env = {
  ...process.env,
  PORT: "4000",
  NODE_ENV: "development",
  FRONTEND_URL: "http://localhost:5173",
  MONGODB_URI: uri,
  JWT_SECRET: "dev-smoke-test-secret",
  JWT_EXPIRES_IN: "7d",
  GEMINI_API_KEY: "",
  SEED_TREASURER_USERNAME: "treasurer",
  SEED_TREASURER_PASSWORD: "treasurer123",
  SEED_MEMBER_USERNAME: "member",
  SEED_MEMBER_PASSWORD: "member123",
};

console.log("Mongo URI:", uri);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env, shell: true, stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

await run("npx", ["tsx", "src/scripts/seed.ts"]);

spawn("npx", ["tsx", "src/server.ts"], { env, shell: true, stdio: "inherit" });
