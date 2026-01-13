import { Request, Response } from "express";
import aw from "../middlewares/asyncWrapper.middleware";
import { handleCallStatusUpdate, handleRealTimeVerification } from "../services/demoCall.service";

/**
 * @desc Webhook to receive Retell AI call results
 * @route POST /api/call/retell/ai-wbh
 */
export const handleRetellWebhook = aw(async (req: Request, res: Response) => {
    try {
        const event = req.body?.event;
        const data = req.body?.data;

        if (!event || !data?.call_id) {
            res.status(400).json({ message: "Invalid webhook payload" });
            return;
        }

        const callId = data.call_id;

        console.log("📞 Retell webhook received:", event, callId);
        console.log("📋 Webhook data:", JSON.stringify({
            event,
            call_id: callId,
            has_transcript: !!data.transcript,
            transcript_length: data.transcript?.length || 0,
            has_conversation_state: !!data.conversation_state,
            has_function_call: !!data.function_call,
            has_metadata: !!data.metadata,
            has_dynamic_vars: !!data.retell_llm_dynamic_variables,
        }, null, 2));

        // Handle real-time verification during the call
        // Check for events that occur during the call (not just at the end)
        if (event === "function_call" || 
            event === "response_audio" || 
            event === "conversation_state" ||
            event === "update" ||
            event === "transcription" ||
            event === "status_update") {
            
            // Log transcript snippet for debugging
            if (data.transcript) {
                const recentTranscript = data.transcript.length > 200 
                    ? data.transcript.substring(data.transcript.length - 200)
                    : data.transcript;
                console.log("💬 Recent transcript:", recentTranscript);
            }
            
            const wasHungUp = await handleRealTimeVerification({
                call_id: callId,
                transcript: data.transcript,
                conversation_state: data.conversation_state,
                function_call: data.function_call,
                metadata: data.metadata,
                retell_llm_dynamic_variables: data.retell_llm_dynamic_variables,
            });
            
            // If call was hung up, still return OK but log it
            if (wasHungUp) {
                console.log("✅ Call hung up due to verification failure");
                res.status(200).json({ msg: "OK", action: "call_hung_up" });
                return;
            }
        }

        // Handle call status updates for verification
        if (event === "call_ended" || event === "call_analysis") {
            await handleCallStatusUpdate({
                call_id: callId,
                call_status: data.call_status,
                transcript: data.transcript,
                call_analysis: data.call_analysis,
            });
        }

        // Log call details
        console.log("📊 Call Details:", {
            status: data.call_status,
            from: data.from_number,
            to: data.to_number,
            duration: data.duration_ms,
            transcript: data.transcript?.substring(0, 100) + "...",
        });

        res.status(200).json({ msg: "OK" });
    } catch (err) {
        console.error("❌ Retell Webhook Error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
