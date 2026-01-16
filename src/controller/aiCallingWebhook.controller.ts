import { Request, Response } from "express";
import aw from "../middlewares/asyncWrapper.middleware";
import { handleCallStatusUpdate, handleRealTimeVerification } from "../services/demoCall.service";
import { sendToMakeWebhook } from "../services/makeWebhook.service";

/**
 * @desc Webhook to receive Retell AI call results
 * @route POST /api/call/retell/ai-wbh
 */
export const handleRetellWebhook = aw(async (req: Request, res: Response) => {
    try {
        const payload = req.body || {};
        const data =
            payload?.data ||
            payload?.call ||
            payload;
        const event =
            payload?.event ||
            payload?.type ||
            payload?.status ||
            data?.event ||
            data?.type ||
            data?.status;
        const callStatus =
            data?.call_status ||
            data?.status ||
            payload?.call_status ||
            payload?.status;
        const callId =
            data?.call_id ||
            payload?.call_id;
        const transcript =
            data?.transcript ||
            payload?.transcript;
        const callAnalysis =
            data?.call_analysis ||
            payload?.call_analysis ||
            payload?.analysis;
        const metadata =
            data?.metadata ||
            payload?.metadata;
        const conversationState =
            data?.conversation_state ||
            payload?.conversation_state;
        const functionCall =
            data?.function_call ||
            payload?.function_call;
        const dynamicVars =
            data?.retell_llm_dynamic_variables ||
            payload?.retell_llm_dynamic_variables;

        if (process.env.DEBUG_WEBHOOK === "1") {
            console.log("🧾 Retell webhook raw payload:", JSON.stringify(payload, null, 2));
        }

        if (!callId) {
            res.status(400).json({ message: "Invalid webhook payload" });
            return;
        }

        console.log("📞 Retell webhook received:", event || "unknown_event", callId);
        console.log("📋 Webhook data:", JSON.stringify({
            event: event || "unknown_event",
            call_id: callId,
            call_status: callStatus,
            has_transcript: !!transcript,
            transcript_length: transcript?.length || 0,
            has_conversation_state: !!conversationState,
            has_function_call: !!functionCall,
            has_metadata: !!metadata,
            has_dynamic_vars: !!dynamicVars,
            has_call_analysis: !!callAnalysis,
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
            if (transcript) {
                const recentTranscript = transcript.length > 200 
                    ? transcript.substring(transcript.length - 200)
                    : transcript;
                console.log("💬 Recent transcript:", recentTranscript);
            }
            
            const wasHungUp = await handleRealTimeVerification({
                call_id: callId,
                transcript: transcript,
                conversation_state: conversationState,
                function_call: functionCall,
                metadata: metadata,
                retell_llm_dynamic_variables: dynamicVars,
            });
            
            // If call was hung up, still return OK but log it
            if (wasHungUp) {
                console.log("✅ Call hung up due to verification failure");
                
                // Send data to Make.com webhook even for hung up calls
                await sendToMakeWebhook({
                    call_id: callId,
                    event: event,
                    call_status: callStatus || "hung_up",
                    from_number: data.from_number || payload?.from_number,
                    to_number: data.to_number || payload?.to_number,
                    duration_ms: data.duration_ms || payload?.duration_ms,
                    transcript: transcript,
                    metadata: metadata,
                    conversation_state: conversationState,
                    verification_status: false,
                    verified: false,
                    timestamp: new Date().toISOString(),
                });
                
                res.status(200).json({ msg: "OK", action: "call_hung_up" });
                return;
            }
        }

        // Handle call status updates for verification
        // Check for call completion events - Retell may use different event names
        const isCallComplete = event === "call_ended" || 
                              event === "call_analysis" ||
                              event === "ended" ||
                              (callStatus && (callStatus === "ended" || callStatus === "completed"));

        if (isCallComplete) {
            console.log("✅ Call completed - processing final data for Make.com");
            
            await handleCallStatusUpdate({
                call_id: callId,
                call_status: callStatus,
                transcript: transcript,
                call_analysis: callAnalysis,
            });

            // Send data to Make.com webhook for spreadsheet storage
            await sendToMakeWebhook({
                call_id: callId,
                event: event,
                call_status: callStatus,
                from_number: data.from_number || payload?.from_number,
                to_number: data.to_number || payload?.to_number,
                duration_ms: data.duration_ms || payload?.duration_ms,
                transcript: transcript,
                call_analysis: callAnalysis,
                metadata: metadata,
                conversation_state: conversationState,
                verification_status: callAnalysis?.verification_status || 
                                   callAnalysis?.verified,
                verified: callAnalysis?.verified || 
                         callAnalysis?.verification_status === "verified",
                timestamp: new Date().toISOString(),
            });
        } else {
            // Log events that don't trigger Make.com storage for debugging
            console.log("ℹ️ Event received but not a completion event:", event, "Call status:", callStatus);
            
            // Fallback: If we have complete call data (duration and status), send it anyway
            // This catches cases where Retell uses different event names
            if ((data.duration_ms || payload?.duration_ms) && callStatus && (callStatus === "ended" || callStatus === "completed")) {
                console.log("⚠️ Fallback: Sending data to Make.com even though event is not 'call_ended'");
                await sendToMakeWebhook({
                    call_id: callId,
                    event: event,
                    call_status: callStatus,
                    from_number: data.from_number || payload?.from_number,
                    to_number: data.to_number || payload?.to_number,
                    duration_ms: data.duration_ms || payload?.duration_ms,
                    transcript: transcript,
                    call_analysis: callAnalysis,
                    metadata: metadata,
                    conversation_state: conversationState,
                    verification_status: callAnalysis?.verification_status || 
                                       callAnalysis?.verified,
                    verified: callAnalysis?.verified || 
                             callAnalysis?.verification_status === "verified",
                    timestamp: new Date().toISOString(),
                });
            }
        }

        // Log call details
        console.log("📊 Call Details:", {
            status: callStatus,
            from: data.from_number || payload?.from_number,
            to: data.to_number || payload?.to_number,
            duration: data.duration_ms || payload?.duration_ms,
            transcript: transcript ? transcript.substring(0, 100) + "..." : undefined,
        });

        res.status(200).json({ msg: "OK" });
    } catch (err) {
        console.error("❌ Retell Webhook Error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
