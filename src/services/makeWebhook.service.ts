import axios from "axios";

interface CallData {
    call_id: string;
    event?: string;
    call_status?: string;
    from_number?: string;
    to_number?: string;
    duration_ms?: number;
    transcript?: string;
    call_analysis?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    conversation_state?: Record<string, unknown>;
    verification_status?: string | boolean;
    verified?: boolean;
    timestamp?: string;
}

/**
 * Send call data to Make.com webhook for spreadsheet storage
 * @param callData - The call data to send
 */
export const sendToMakeWebhook = async (callData: CallData): Promise<void> => {
    const makeHookUrl = process.env.MAKE_HOOK_URL;

    if (!makeHookUrl) {
        console.log("⚠️ [SPREADSHEET STORAGE] DISABLED - MAKE_HOOK_URL not configured, skipping Make.com webhook");
        console.log("⚠️ [SPREADSHEET STORAGE] Call data will NOT be stored in spreadsheet");
        return;
    }

    try {
        // Normalize verification_status to always be a string for Make.com/spreadsheet compatibility
        let verificationStatus: string = "unknown";
        if (callData.verification_status !== undefined) {
            verificationStatus = typeof callData.verification_status === "boolean" 
                ? (callData.verification_status ? "verified" : "not_verified")
                : String(callData.verification_status);
        } else if (callData.call_analysis?.verification_status !== undefined) {
            const status = callData.call_analysis.verification_status;
            verificationStatus = typeof status === "boolean" 
                ? (status ? "verified" : "not_verified")
                : String(status);
        } else if (callData.call_analysis?.verified !== undefined) {
            verificationStatus = callData.call_analysis.verified ? "verified" : "not_verified";
        }

        // Prepare data for spreadsheet - all fields properly typed for Make.com
        const spreadsheetData = {
            call_id: String(callData.call_id),
            event: String(callData.event || "unknown"),
            call_status: String(callData.call_status || "unknown"),
            from_number: String(callData.from_number || ""),
            to_number: String(callData.to_number || ""),
            duration_ms: Number(callData.duration_ms || 0),
            duration_seconds: callData.duration_ms ? Math.round(callData.duration_ms / 1000) : 0,
            transcript: String(callData.transcript || ""),
            transcript_length: Number(callData.transcript?.length || 0),
            verification_status: verificationStatus,
            verified: Boolean(callData.verified || 
                     callData.call_analysis?.verified || 
                     callData.call_analysis?.verification_status === "verified" || 
                     false),
            name: String(callData.metadata?.name || ""),
            phone: String(callData.metadata?.phone || ""),
            timestamp: String(callData.timestamp || new Date().toISOString()),
            // Include analysis summary if available
            analysis_summary: callData.call_analysis ? JSON.stringify(callData.call_analysis) : "",
        };

        console.log("📊 [SPREADSHEET STORAGE] Attempting to store call data in spreadsheet...");
        console.log("📤 Sending data to Make.com webhook:", {
            call_id: spreadsheetData.call_id,
            event: spreadsheetData.event,
            status: spreadsheetData.call_status,
            webhook_url: makeHookUrl.substring(0, 50) + "...", // Log partial URL for debugging
        });
        console.log("📦 Full payload being sent:", JSON.stringify(spreadsheetData, null, 2));

        const response = await axios.post(makeHookUrl, spreadsheetData, {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: 10000, // 10 second timeout
        });

        console.log("✅ [SPREADSHEET STORAGE] Successfully stored call data in spreadsheet!");
        console.log("✅ Successfully sent data to Make.com webhook:", {
            status: response.status,
            statusText: response.statusText,
            call_id: spreadsheetData.call_id,
        });
    } catch (error) {
        // Log error but don't throw - we don't want to break the webhook handler
        console.error("❌ [SPREADSHEET STORAGE] FAILED - Error storing call data in spreadsheet");
        if (axios.isAxiosError(error)) {
            console.error("❌ Error sending data to Make.com webhook:", {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                call_id: callData.call_id,
            });
        } else {
            console.error("❌ Error sending data to Make.com webhook:", {
                error: error,
                call_id: callData.call_id,
            });
        }
    }
};

