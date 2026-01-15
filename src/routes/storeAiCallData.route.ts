import { Router, Request, Response } from "express";
import { handleRetellWebhook } from "../controller/aiCallingWebhook.controller";
import { sendToMakeWebhook } from "../services/makeWebhook.service";

const router: Router = Router();

router.post("/retell/ai-wbh", handleRetellWebhook);

// Test endpoint to manually trigger Make.com webhook
router.post("/test/make-webhook", async (req: Request, res: Response) => {
    try {
        const testData = {
            call_id: req.body?.call_id || `test-${Date.now()}`,
            event: req.body?.event || "call_ended",
            call_status: req.body?.call_status || "ended",
            from_number: req.body?.from_number || "+1234567890",
            to_number: req.body?.to_number || "+0987654321",
            duration_ms: req.body?.duration_ms || 45000,
            transcript: req.body?.transcript || "This is a test transcript for Make.com webhook.",
            call_analysis: req.body?.call_analysis || {
                verification_status: "verified",
                verified: true,
            },
            metadata: req.body?.metadata || {
                name: "Test User",
                phone: "+1234567890",
            },
            verification_status: req.body?.verification_status || "verified",
            verified: req.body?.verified !== undefined ? req.body.verified : true,
            timestamp: new Date().toISOString(),
        };

        console.log("🧪 Testing Make.com webhook with data:", testData);
        
        await sendToMakeWebhook(testData);
        
        res.status(200).json({
            success: true,
            message: "Test data sent to Make.com webhook",
            data: testData,
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
