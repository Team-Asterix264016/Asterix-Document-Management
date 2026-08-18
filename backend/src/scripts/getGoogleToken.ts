import { google } from "googleapis";
import { env } from "../config/env.js";

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
    "urn:ietf:wg:oauth:2.0:oob" // This tells Google we are a desktop app and to show the code on screen
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent screen so we always get a refresh token
  });

  const code = process.argv[2];

  if (!code) {
    console.log("1. Open this URL in your browser:");
    console.log(`\n${authUrl}\n`);
    console.log("2. Sign in with the Google Account that will host the files (asterix.psgitech@gmail.com).");
    console.log("3. Click 'Continue' to grant access.");
    console.log("4. Copy the authorization code provided on the final screen.\n");
    console.log("Since interactive prompts can sometimes fail in this terminal, please run this script again with the code as an argument:");
    console.log('\nnpx tsx src/scripts/getGoogleToken.ts "YOUR_CODE_HERE"\n');
    process.exit(0);
  }

  console.log("\nExchanging code for tokens...");
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.error("\nERROR: No refresh token returned. This usually happens if you didn't see the consent screen.");
      console.error("Try running this script again, as 'prompt: consent' is set to force it.");
      process.exit(1);
    }

    console.log("\n✅ Success! Here is your Refresh Token:\n");
    console.log("===================================================================");
    console.log(tokens.refresh_token);
    console.log("===================================================================\n");
    console.log("Copy the token above and paste it into your .env file as:");
    console.log("GOOGLE_REFRESH_TOKEN=...");
    console.log("\nYou are all set!");
  } catch (error) {
    console.error("\nError retrieving access token:", (error as Error).message);
  }
}

main().catch(console.error);
