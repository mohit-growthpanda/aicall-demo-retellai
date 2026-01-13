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
        const result = await triggerVerificationCall(name, phone);

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
