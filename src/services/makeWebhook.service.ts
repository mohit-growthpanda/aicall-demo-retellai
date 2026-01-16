import axios from "axios";

interface CallAnalysis {
    call_summary?: string;
    call_successful?: boolean;
    custom_data?: Record<string, unknown>;
    custom_call_data?: Record<string, unknown>;
    post_call_data?: Record<string, unknown>;
    data_extraction?: Record<string, unknown>;
    extracted_data?: Record<string, unknown>;
    [key: string]: unknown;
}

interface CallData {
    call_id: string;
    event?: string;
    call_status?: string;
    from_number?: string;
    to_number?: string;
    duration_ms?: number;
    transcript?: string;
    call_analysis?: CallAnalysis;
    metadata?: Record<string, unknown>;
    conversation_state?: Record<string, unknown>;
    verification_status?: string | boolean;
    verified?: boolean;
    timestamp?: string;
}

const toSheetKey = (key: string): string => {
    return key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
};

const flattenObject = (
    obj: Record<string, unknown>,
    prefix: string
): Record<string, string | number | boolean> => {
    const result: Record<string, string | number | boolean> = {};

    const walk = (value: unknown, path: string[]) => {
        if (value === null || value === undefined) {
            return;
        }
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            const key = toSheetKey([prefix, ...path].join("_"));
            result[key] = value;
            return;
        }
        if (Array.isArray(value)) {
            const key = toSheetKey([prefix, ...path].join("_"));
            result[key] = value.join(", ");
            return;
        }
        if (typeof value === "object") {
            Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
                walk(childValue, [...path, childKey]);
            });
        }
    };

    walk(obj, []);
    return result;
};

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
        const extractionSource =
            (callData.call_analysis?.custom_data as Record<string, unknown> | undefined) ??
            (callData.call_analysis?.custom_call_data as Record<string, unknown> | undefined) ??
            (callData.call_analysis?.post_call_data as Record<string, unknown> | undefined) ??
            (callData.call_analysis?.data_extraction as Record<string, unknown> | undefined) ??
            (callData.call_analysis?.extracted_data as Record<string, unknown> | undefined) ??
            undefined;

        const extractedFields =
            extractionSource && typeof extractionSource === "object"
                ? flattenObject(extractionSource, "extracted")
                : {};

        // Prepare data for spreadsheet - required fields + post-call extraction
        const spreadsheetData = {
            to_number: String(callData.to_number || ""),
            duration_seconds: callData.duration_ms ? Math.round(callData.duration_ms / 1000) : 0,
            name: String(callData.metadata?.name || ""),
            phone: String(callData.metadata?.phone || ""),
            call_summary: String((callData.call_analysis as Record<string, unknown> | undefined)?.call_summary || ""),
            call_successful: Boolean((callData.call_analysis as Record<string, unknown> | undefined)?.call_successful || false),
            extracted_data_json: JSON.stringify(extractionSource || {}),
            ...extractedFields,
        };

        console.log("📊 [SPREADSHEET STORAGE] Attempting to store call data in spreadsheet...");
        console.log("📤 Sending data to Make.com webhook:", {
            call_id: callData.call_id,
            to_number: spreadsheetData.to_number,
            duration_seconds: spreadsheetData.duration_seconds,
            name: spreadsheetData.name,
            phone: spreadsheetData.phone,
            extracted_fields_count: Object.keys(extractedFields).length,
            webhook_url: makeHookUrl.substring(0, 50) + "...", // Log partial URL for debugging
        });
        console.log(
            "📦 [SPREADSHEET STORAGE] Full payload being sent:",
            JSON.stringify({ call_id: callData.call_id, ...spreadsheetData }, null, 2)
        );

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

