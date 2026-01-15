import { Request, Response } from "express";
import aw from "../middlewares/asyncWrapper.middleware";
import { triggerVerificationCall } from "../services/demoCall.service";
import { errorResponse, successResponse } from "../utils/apiResponse.utils";

/**
 * @desc Trigger AI call for verification demo
 * @route POST /api/demo/trigger-call
 */
export const triggerDemoCall = aw(async (req: Request, res: Response) => {
    const { name, phone } = req.body;

    // Validation
    if (!name || !phone) {
        errorResponse(res, {
            message: "Name and phone are required",
            statusCode: 400,
        });
        return;
    }

    // Validate phone format (basic validation)
    const phoneRegex =
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
        errorResponse(res, {
            message: "Invalid phone number format",
            statusCode: 400,
        });
        return;
    }

    try {
        // Check if spreadsheet storage is configured
        const makeHookUrl = process.env.MAKE_HOOK_URL;
        if (makeHookUrl) {
            console.log("📊 Spreadsheet storage: ENABLED - Data will be stored in spreadsheet when call completes");
            console.log("🔗 Make.com webhook URL configured:", makeHookUrl.substring(0, 50) + "...");
        } else {
            console.log("⚠️ Spreadsheet storage: DISABLED - MAKE_HOOK_URL not configured");
            console.log("⚠️ Call data will NOT be stored in spreadsheet");
        }

        console.log("🚀 Triggering verification call:", { name, phone });
        const result = await triggerVerificationCall(name, phone);

        console.log("✅ Call initiated successfully:", {
            callId: result.callId,
            name: result.name,
            phone: result.phone,
            spreadsheetStorage: makeHookUrl ? "ENABLED" : "DISABLED",
        });

        if (makeHookUrl) {
            console.log("📋 Note: Call data will be automatically stored in spreadsheet when call completes via webhook");
        }

        successResponse(res, {
            message:
                "Call initiated successfully. AI agent will verify name and phone number.",
            data: {
                callId: result.callId,
                name: result.name,
                phone: result.phone,
                status: "initiated",
            },
        });
    } catch (error) {
        console.error("❌ Error triggering demo call:", error);
        errorResponse(res, {
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to initiate call",
            statusCode: 500,
        });
    }
});
