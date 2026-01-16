import { Router, Request, Response } from "express";
import { handleRetellWebhook } from "../controller/aiCallingWebhook.controller";
import { sendToMakeWebhook } from "../services/makeWebhook.service";
import { normalizeRetellCallData } from "../services/retellNormalizer";

const router: Router = Router();

router.post("/retell/ai-wbh", handleRetellWebhook);

// Test endpoint to manually trigger Make.com webhook
router.post("/test/make-webhook", async (req: Request, res: Response) => {
    try {
        const testCallAnalysis = req.body?.call_analysis || {
            call_summary: "Candidate completed screening",
            call_successful: true,
            custom_data: {
                work_type: "Travel",
                available_shifts: "Days",
                open_to_multiple_locations: "Yes",
                can_complete_orientations: "Yes",
                reliable_transportation: "Yes",
                primary_clinical_role: "Registered Nurse",
                years_of_experience: "5",
                currently_licensed_in_state: "Yes",
                research_interest: "No",
                diagnosed_or_cared_for_conditions: "Diabetes",
                comfortable_participating: "Yes",
                contact_consent: "Yes",
            },
            verification_status: "verified",
            verified: true,
        };

        const testMetadata = req.body?.metadata || {
            name: "Test User",
            phone: "+1234567890",
        };

        const normalizedPayload = normalizeRetellCallData({
            callId: req.body?.call_id || `test-${Date.now()}`,
            callStatus: req.body?.call_status || "ended",
            callAnalysis: testCallAnalysis,
            metadata: testMetadata,
            durationMs: req.body?.duration_ms || 45000,
            fromNumber: req.body?.from_number || "+1234567890",
            toNumber: req.body?.to_number || "+0987654321",
        });

        console.log("🧪 Testing Make.com webhook with normalized data:", normalizedPayload);
        
        await sendToMakeWebhook(normalizedPayload);
        
        res.status(200).json({
            success: true,
            message: "Test data sent to Make.com webhook",
            data: normalizedPayload,
        });
    } catch (error) {
        console.error("❌ Error testing Make.com webhook:", error);
        res.status(500).json({
            success: false,
            message: "Error sending test data to Make.com webhook",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;
