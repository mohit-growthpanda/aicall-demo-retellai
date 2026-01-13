import axios from "axios";
import { retell, hangupCall } from "./retellClient.service";

interface VerificationCallResult {
    callId: string;
    name: string;
    phone: string;
}

export const triggerVerificationCall = async (
    name: string,
    phone: string
): Promise<VerificationCallResult> => {
    if (!process.env.RETELL_API_KEY) {
        throw new Error("RETELL_API_KEY is not configured");
    }

    // Normalize phone number
    const normalizePhone = (num: string): string => {
        if (!num) return "";
        // Remove all spaces, dashes, and parentheses
        let cleaned = num.replace(/[\s\-()]/g, "");
        // Add + if not present and doesn't start with country code
        if (!cleaned.startsWith("+")) {
            // Assume US number if 10 digits, otherwise add +
            if (cleaned.length === 10) {
                cleaned = `+1${cleaned}`;
            } else {
                cleaned = `+${cleaned}`;
            }
        }
        return cleaned;
    };

    const normalizedPhone = normalizePhone(phone);

    const agentId = process.env.RETELL_AGENT_ID;

    if (!agentId) {
        throw new Error("RETELL_AGENT_ID is not configured");
    }

    try {
        // Create call with Retell SDK
        const call = await retell.call.create({
            agent_id: agentId,
            // from_number is optional - only include if RETELL_FROM_NUMBER is set
            ...(process.env.RETELL_FROM_NUMBER && { from_number: process.env.RETELL_FROM_NUMBER }),
            to_number: normalizedPhone,
            metadata: {
                name: name,
                phone: normalizedPhone,
                verificationRequired: true,
            },
            // Dynamic variables that the AI agent can use in the prompt
            // These match the {full_name} and {phone_number} variables in the agent prompt
            retell_llm_dynamic_variables: {
                full_name: name,
                phone_number: normalizedPhone,
                // Also include expected_* for backward compatibility with verification logic
                expected_name: name,
                expected_phone: normalizedPhone,
            },
        });

        console.log("✅ Call created:", call.call_id);
        console.log("📞 Calling:", normalizedPhone);
        console.log("👤 Verifying name:", name);

        return {
            callId: call.call_id as string,
            name: name,
            phone: normalizedPhone,
        };
    } catch (error) {
        console.error("❌ Error creating Retell call:", error);
        
        // If it's already a formatted error message, re-throw it
        if (error instanceof Error && (error.message.includes('Network error') || error.message.includes('SOLUTION:'))) {
            throw error;
        }
        
        if (axios.isAxiosError(error)) {
            // Check for network errors
            if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                throw new Error(
                    `Network error: Cannot connect to Retell API. ${error.message}\n` +
                    `Please check your internet connection and try again.`
                );
            }
            throw new Error(
                `Retell API error: ${error.response?.data?.message || error.message}`
            );
        }
        
        // Re-throw as Error if it's not already
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Unknown error: ${String(error)}`);
    }
};


const extractCandidateResponse = (transcript: string, questionType: 'name' | 'phone'): string | null => {
    // Look for patterns after the verification question
    if (questionType === 'name') {
        // Patterns like "my name is X", "it's X", "X", "I'm X"
        const patterns = [
            /(?:my name is|i'm|it's|this is|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
            /(?:confirm|verify).*your.*(?:name|full name).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        ];
        for (const pattern of patterns) {
            const match = transcript.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    } else if (questionType === 'phone') {
        // Patterns for phone numbers
        const patterns = [
            /(?:it's|it is|the number is|my number is|phone is)\s*([+\d\s\-()]+)/i,
            /(?:confirm|verify).*phone.*number.*?([+\d\s\-()]+)/i,
        ];
        for (const pattern of patterns) {
            const match = transcript.match(pattern);
            if (match && match[1]) {
                return match[1].trim().replace(/[\s\-()]/g, '');
            }
        }
    }
    return null;
};

const normalizeForComparison = (str: string): string => {
    return str.toLowerCase().replace(/[\s\-()]/g, '');
};


const checkVerificationFailure = (
    transcript?: string,
    conversationState?: Record<string, unknown>,
    expectedName?: string,
    expectedPhone?: string
): boolean => {
    console.log("🔍 Checking verification failure:", {
        hasTranscript: !!transcript,
        transcriptLength: transcript?.length || 0,
        hasConversationState: !!conversationState,
        expectedName,
        expectedPhone,
    });

    if (conversationState) {
        console.log("📊 Conversation state:", JSON.stringify(conversationState, null, 2));
        const verificationStatus = conversationState.verification_status || 
                                  conversationState.verified;
        if (verificationStatus === false || verificationStatus === "failed") {
            console.log("❌ Verification failed in conversation state");
            return true;
        }
        
        if (conversationState.name_mismatch === true || 
            conversationState.phone_mismatch === true ||
            conversationState.identity_mismatch === true) {
            console.log("❌ Mismatch detected in conversation state");
            return true;
        }
    }

    if (!transcript) {
        console.log("⚠️ No transcript available for verification check");
        return false;
    }

    const lowerTranscript = transcript.toLowerCase();
    
    const failureKeywords = [
        "verification failed",
        "not verified",
        "wrong name",
        "wrong phone",
        "incorrect name",
        "incorrect phone",
        "name doesn't match",
        "phone doesn't match",
        "verification unsuccessful",
        "cannot verify",
        "unable to verify",
        "doesn't match",
        "not matching",
        "sorry, that's not correct",
        "that's incorrect",
        "i cannot proceed",
        "i need to end this call",
        "i'll have to hang up",
        "ending the call",
        "that's not the name",
        "that's not the phone number",
        "the name provided doesn't match",
        "the phone number doesn't match",
        "mismatch",
        "identity confirmation failed",
        "that doesn't match",
        "that is not correct",
        "that's not right",
        "i'm sorry, that's not",
    ];

    const hasFailureKeyword = failureKeywords.some(keyword => {
        const found = lowerTranscript.includes(keyword);
        if (found) {
            console.log(`✅ Found failure keyword: "${keyword}"`);
        }
        return found;
    });

    const explicitFailurePatterns = [
        /sorry.*(can't|cannot).*verify/i,
        /unable.*to.*verify/i,
        /verification.*(failed|unsuccessful)/i,
        /(name|phone).*(doesn't|does not|do not).*match/i,
        /(name|phone).*provided.*(doesn't|does not|do not).*match/i,
        /identity.*(confirmation|verification).*(failed|unsuccessful)/i,
        /(that's|that is).*not.*(correct|right|the).*(name|phone)/i,
        /(that|this).*(doesn't|does not|do not).*match/i,
        /(that|this).*is.*not.*(correct|right)/i,
    ];

    const hasExplicitFailure = explicitFailurePatterns.some(pattern => {
        const found = pattern.test(transcript);
        if (found) {
            console.log(`✅ Found explicit failure pattern: ${pattern}`);
        }
        return found;
    });

    if (expectedName || expectedPhone) {
        const nameQuestionPattern = /(?:may i|can you|please).*(?:confirm|verify).*your.*(?:name|full name)/i;
        const phoneQuestionPattern = /(?:can you|please).*(?:confirm|verify).*phone.*number/i;
        
        const nameQuestionAsked = nameQuestionPattern.test(transcript);
        const phoneQuestionAsked = phoneQuestionPattern.test(transcript);
        
        console.log("❓ Verification questions asked:", { nameQuestionAsked, phoneQuestionAsked });
        
        if (nameQuestionAsked || phoneQuestionAsked) {
            if (nameQuestionAsked && expectedName) {
                const candidateName = extractCandidateResponse(transcript, 'name');
                if (candidateName) {
                    const normalizedExpected = normalizeForComparison(expectedName);
                    const normalizedCandidate = normalizeForComparison(candidateName);
                    console.log("👤 Name comparison:", { expected: normalizedExpected, candidate: normalizedCandidate });
                    
                    if (normalizedCandidate !== normalizedExpected && normalizedCandidate.length > 2) {
                        console.log("❌ Name mismatch detected!");
                        return true;
                    }
                }
            }
            
            if (phoneQuestionAsked && expectedPhone) {
                const candidatePhone = extractCandidateResponse(transcript, 'phone');
                if (candidatePhone) {
                    const normalizedExpected = normalizeForComparison(expectedPhone);
                    const normalizedCandidate = normalizeForComparison(candidatePhone);
                    console.log("📞 Phone comparison:", { expected: normalizedExpected, candidate: normalizedCandidate });
                    
                    if (normalizedCandidate !== normalizedExpected && normalizedCandidate.length > 5) {
                        console.log("❌ Phone mismatch detected!");
                        return true;
                    }
                }
            }
            
            const mismatchAcknowledgment = /(?:acknowledge|noted|i see|i understand).*(?:that|the).*(?:name|phone).*(?:doesn't|does not|is different|is not|not match)/i;
            if (mismatchAcknowledgment.test(transcript)) {
                console.log("❌ Mismatch acknowledgment detected in transcript");
                return true;
            }
        }
    }

    const result = hasFailureKeyword || hasExplicitFailure;
    console.log("🔍 Verification check result:", result);
    return result;
};

export const handleCallStatusUpdate = async (callData: {
    call_id: string;
    call_status: string;
    transcript?: string;
    call_analysis?: Record<string, unknown>;
}) => {
    console.log(
        "📞 Call status update:",
        callData.call_id,
        callData.call_status
    );

    if (callData.call_analysis) {
        const analysis = callData.call_analysis;
        const verified =
            analysis.verification_status === "verified" ||
            analysis.verified === true;

        if (verified) {
            console.log("✅ Verification successful - Call proceeded");
        } else {
            console.log("❌ Verification failed - Call hung up");
        }
    }
};

export const handleRealTimeVerification = async (callData: {
    call_id: string;
    transcript?: string;
    conversation_state?: Record<string, unknown>;
    function_call?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    retell_llm_dynamic_variables?: Record<string, unknown>;
}): Promise<boolean> => {
    let expectedName: string | undefined;
    let expectedPhone: string | undefined;
    
    if (callData.metadata) {
        expectedName = callData.metadata.name as string | undefined;
        expectedPhone = callData.metadata.phone as string | undefined;
    }
    
    if (callData.retell_llm_dynamic_variables) {
        expectedName = expectedName || (callData.retell_llm_dynamic_variables.full_name as string | undefined);
        expectedPhone = expectedPhone || (callData.retell_llm_dynamic_variables.phone_number as string | undefined);
        
        expectedName = expectedName || (callData.retell_llm_dynamic_variables.expected_name as string | undefined);
        expectedPhone = expectedPhone || (callData.retell_llm_dynamic_variables.expected_phone as string | undefined);
    }

    let verificationFailed = checkVerificationFailure(
        callData.transcript,
        callData.conversation_state,
        expectedName,
        expectedPhone
    );

    if (callData.function_call) {
        const funcCall = callData.function_call;
        if (funcCall.name === "verification_failed" || 
            funcCall.name === "hangup_call" ||
            funcCall.name === "end_call" ||
            (funcCall.parameters && 
             typeof funcCall.parameters === 'object' &&
             ('verification_status' in funcCall.parameters &&
              funcCall.parameters.verification_status === false))) {
            verificationFailed = true;
        }
    }

    if (verificationFailed) {
        console.log("❌ Verification failed detected - Hanging up call:", callData.call_id);
        console.log("📝 Expected name:", expectedName, "Expected phone:", expectedPhone);
        try {
            await hangupCall(callData.call_id);
            return true; 
        } catch (error) {
            console.error("❌ Error hanging up call:", error);
            return false;
        }
    }

    return false; 
};
