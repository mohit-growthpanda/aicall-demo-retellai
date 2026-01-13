import dotenv from "dotenv";
import { linkPhoneNumberToAgent } from "../src/services/retellClient.service";

// Load environment variables
dotenv.config();

async function setup() {
    const phoneNumber = process.env.RETELL_FROM_NUMBER;
    const agentId = process.env.RETELL_AGENT_ID;

    if (!phoneNumber) {
        console.error("❌ RETELL_FROM_NUMBER is not set in .env file");
        console.log("   Please add: RETELL_FROM_NUMBER=+13137662804");
        process.exit(1);
    }

    if (!agentId) {
        console.error("❌ RETELL_AGENT_ID is not set in .env file");
        console.log("   Please add: RETELL_AGENT_ID=agent_3c308b0ebbb20df7f191063ec5");
        process.exit(1);
    }

    console.log("🔗 Linking phone number to agent...");
    console.log(`   Phone Number: ${phoneNumber}`);
    console.log(`   Agent ID: ${agentId}`);

    try {
        await linkPhoneNumberToAgent(phoneNumber, agentId);
        console.log("\n✅ Success! Phone number is now linked to agent for outbound calls.");
        console.log("   You can now make calls without the error.");
    } catch (error) {
        console.error("\n❌ Error linking phone number to agent:");
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
        } else {
            console.error("   Unknown error:", error);
        }
        console.log("\n💡 Alternative: Link them manually in Retell Dashboard:");
        console.log("   1. Go to https://retellai.com → Phone Numbers");
        console.log(`   2. Click on phone number: ${phoneNumber}`);
        console.log("   3. Set 'Outbound Agent' to your agent");
        console.log("   4. Save");
        process.exit(1);
    }
}

setup();

