/**
 * Send normalized call data to Make.com webhook for spreadsheet storage
 * @param payload - Flat, normalized payload ready for spreadsheet
 */
export const sendToMakeWebhook = async (payload: Record<string, string | number | boolean>): Promise<void> => {
    const hookUrl = process.env.MAKE_HOOK_URL;

    if (!hookUrl) {
        console.log("⚠️ [SPREADSHEET STORAGE] DISABLED - MAKE_HOOK_URL not configured");
        return;
    }

    try {
        console.log("📊 [SPREADSHEET STORAGE] Attempting to store call data in spreadsheet...");
        console.log("📤 Sending data to Make.com webhook:", {
            call_id: payload.call_id,
            webhook_url: hookUrl.substring(0, 50) + "...",
        });
        console.log("📦 [SPREADSHEET STORAGE] Full payload being sent:", JSON.stringify(payload, null, 2));

        const response = await fetch(hookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log("✅ [SPREADSHEET STORAGE] Successfully stored call data in spreadsheet!");
        console.log("✅ Successfully sent data to Make.com webhook:", {
            status: response.status,
            statusText: response.statusText,
        });
    } catch (error) {
        console.error("❌ [SPREADSHEET STORAGE] FAILED - Error storing call data in spreadsheet");
        console.error("❌ Error sending data to Make.com webhook:", {
            error: error instanceof Error ? error.message : String(error),
            call_id: payload.call_id,
        });
    }
};

