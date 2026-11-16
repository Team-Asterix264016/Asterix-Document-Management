import http from "node:http";
import url from "node:url";
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { env } from "../config/env.js";

const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = ["https://www.googleapis.com/auth/drive"];

async function main() {
  console.log("=== Google Drive OAuth2 Refresh Token Generator ===\n");

  if (!env.googleClientId || !env.googleClientSecret) {
    console.error("ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing.");
    console.error("Please add them to your .env file first.\n");
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    REDIRECT_URI
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("👉 1. Open this URL in your browser:\n");
  console.log(authUrl);
  console.log("\n👉 2. Sign in with the account (asterix.psgitech@gmail.com).");
  console.log("👉 3. Click 'Continue' / 'Allow' to grant Google Drive permissions.");
  console.log(`\n⏳ Listening on ${REDIRECT_URI} for the authorization callback...\n`);

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url || "", true);
      const code = parsedUrl.query.code as string;

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h3>No authorization code found in request.</h3>");
        return;
      }

      console.log("Authorization code received! Exchanging for tokens...");
      const { tokens } = await oAuth2Client.getToken(code);

      if (!tokens.refresh_token) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h3>No refresh token returned. Please re-run and ensure consent is approved.</h3>");
        console.error("ERROR: No refresh token returned by Google.");
        server.close();
        process.exit(1);
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 60px;">
          <h1 style="color: #059669;">Authentication Successful!</h1>
          <p style="color: #374151; font-size: 16px;">Your Google Drive Refresh Token has been acquired and saved to .env.</p>
          <p style="color: #6b7280; font-size: 14px;">You can close this browser tab now.</p>
        </div>
      `);

      console.log("\n✅ Success! Here is your new Refresh Token:\n");
      console.log("===================================================================");
      console.log(tokens.refresh_token);
      console.log("===================================================================\n");

      // Auto-update root .env if it exists
      const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "..", ".env"),
      ];
      for (const envPath of candidates) {
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, "utf-8");
          if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
            envContent = envContent.replace(
              /GOOGLE_REFRESH_TOKEN=["']?[^"'\r\n]*["']?/,
              `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`
            );
          } else {
            envContent += `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n`;
          }
          fs.writeFileSync(envPath, envContent, "utf-8");
          console.log(`Updated GOOGLE_REFRESH_TOKEN in ${envPath} automatically!`);
          break;
        }
      }

      console.log("\nAll set! Restart your backend server with 'npm run dev'.\n");
      server.close();
      process.exit(0);
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h3>Error: ${err?.message || "Token exchange failed"}</h3>`);
      console.error("\nError exchanging code for tokens:", err?.message || err);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT);
}

main().catch(console.error);
