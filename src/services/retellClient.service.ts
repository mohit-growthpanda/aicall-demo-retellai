import axios from "axios";
import { RetellClient as Retell } from "retell-sdk";

// Lazy initialization to ensure dotenv.config() runs first
let retellInstance: Retell | null = null;

const getRetellClient = (): Retell => {
    if (!retellInstance) {
        if (!process.env.RETELL_API_KEY) {
            throw new Error("RETELL_API_KEY missing");
        }
        retellInstance = new Retell({
            apiKey: process.env.RETELL_API_KEY!,
        });
    }
    return retellInstance;
};

// Compatibility wrapper for retell.call.create/retrieve/list
const createCallWrapper = () => {
    return {
        create: async (params: {
            agent_id: string;
            from_number?: string;
            to_number: string;
            metadata?: Record<string, unknown>;
            retell_llm_dynamic_variables?: Record<string, string>;
        }) => {
            const RETELL_BASE_URL = process.env.RETELL_API_BASE_URL || "https://api.retellai.com";
            const RETELL_API_KEY = process.env.RETELL_API_KEY;
            
            if (!RETELL_API_KEY) {
                throw new Error("RETELL_API_KEY is not configured");
            }

            const url = `${RETELL_BASE_URL}/v2/create-phone-call`;
            
            // Normalize phone number helper
            const normalizePhoneNumber = (num: string): string => {
                if (!num) return "";
                // Remove all spaces, dashes, parentheses, and other formatting
                let cleaned = num.replace(/[\s\-()]/g, "");
                // Ensure it starts with +
                if (!cleaned.startsWith("+")) {
                    // If it's a 10-digit US number, add +1
                    if (cleaned.length === 10) {
                        cleaned = `+1${cleaned}`;
                    } else {
                        cleaned = `+${cleaned}`;
                    }
                }
                return cleaned;
            };
            
            // Auto-fetch from_number if not provided
            let fromNumber = params.from_number?.trim() || process.env.RETELL_FROM_NUMBER?.trim();
            
            // Normalize from_number to E.164 format
            if (fromNumber) {
                fromNumber = normalizePhoneNumber(fromNumber);
            }
            
            if (!fromNumber) {
                try {
                    // Try to get from agent
                    const agentUrl = `${RETELL_BASE_URL}/v2/get-agent/${params.agent_id}`;
                    const agentRes = await axios.get(agentUrl, {
                        headers: { Authorization: `Bearer ${RETELL_API_KEY}`, "Content-Type": "application/json" },
                    });
                    const agentData = agentRes.data as Record<string, unknown>;
                    if (agentData.phone_number) {
                        fromNumber = normalizePhoneNumber(agentData.phone_number as string);
                    }
                } catch {
                    // Try to get from phone numbers list
                    try {
                        const phoneNumbersUrl = `${RETELL_BASE_URL}/v2/list-phone-numbers`;
                        const phoneNumbersRes = await axios.get(phoneNumbersUrl, {
                            headers: { Authorization: `Bearer ${RETELL_API_KEY}`, "Content-Type": "application/json" },
                        });
                        const data = phoneNumbersRes.data as Record<string, unknown>;
                        const phoneNumbers = (Array.isArray(data) ? data : (data.phone_numbers as Array<{ phone_number?: string; number?: string }>)) || [];
                        if (phoneNumbers.length > 0) {
                            const fetchedNumber = phoneNumbers[0].phone_number || phoneNumbers[0].number;
                            if (fetchedNumber) {
                                fromNumber = normalizePhoneNumber(fetchedNumber);
                            }
                        }
                    } catch {
                        // Auto-fetch failed
                    }
                }
            }
            
            // from_number is now required by Retell API
            if (!fromNumber) {
                throw new Error("from_number is required. Please provide it in params, set RETELL_FROM_NUMBER environment variable, or ensure your agent has a phone_number configured.");
            }
            
            // Normalize to_number to E.164 format
            const normalizedToNumber = normalizePhoneNumber(params.to_number);
            
            const payload: Record<string, unknown> = {
                agent_id: params.agent_id,
                from_number: fromNumber,
                to_number: normalizedToNumber,
            };
            if (params.metadata) {
                payload.metadata = params.metadata;
            }
            if (params.retell_llm_dynamic_variables) {
                payload.retell_llm_dynamic_variables = params.retell_llm_dynamic_variables;
            }

            try {
                const res = await axios.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${RETELL_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000, // 30 second timeout
                });
                return res.data;
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    // Check for network/DNS errors
                    if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                        throw new Error(
                            `Network error connecting to Retell API: ${error.message}\n\n` +
                            `Possible causes:\n` +
                            `1. No internet connection\n` +
                            `2. DNS resolution failure (cannot resolve api.retellai.com)\n` +
                            `3. Firewall or proxy blocking the connection\n` +
                            `4. Retell API might be temporarily unavailable\n\n` +
                            `Solutions:\n` +
                            `- Check your internet connection\n` +
                            `- Verify DNS settings\n` +
                            `- Check firewall/proxy settings\n` +
                            `- Try again in a few moments\n` +
                            `- Verify RETELL_API_BASE_URL environment variable if using a custom endpoint`
                        );
                    }
                    
                    const errorData = error.response?.data;
                    const errorMessage = typeof errorData === 'string' 
                        ? errorData 
                        : errorData?.message || errorData?.error || JSON.stringify(errorData);
                    
                    // Provide helpful error message for common issues
                    if (errorMessage && typeof errorMessage === 'string' && errorMessage.includes('No outbound agent id set up for phone number')) {
                        throw new Error(
                            `Retell API error: ${errorMessage}\n\n` +
                            `SOLUTION: Link your phone number to your agent in Retell Dashboard:\n` +
                            `1. Go to https://retellai.com → Phone Numbers\n` +
                            `2. Click on your phone number: ${fromNumber}\n` +
                            `3. Set "Outbound Agent" to: ${params.agent_id}\n` +
                            `4. Save and try again.\n\n` +
                            `Alternatively, you can link it via API using:\n` +
                            `PATCH /v2/update-phone-number/${encodeURIComponent(fromNumber)}\n` +
                            `Body: { "outbound_agent_id": "${params.agent_id}" }`
                        );
                    }
                    
                    throw new Error(`Retell API error: ${errorMessage || error.message}`);
                }
                throw error;
            }
        },
        retrieve: async (callId: string) => {
            const RETELL_BASE_URL = process.env.RETELL_API_BASE_URL || "https://api.retellai.com";
            const RETELL_API_KEY = process.env.RETELL_API_KEY;
            if (!RETELL_API_KEY) throw new Error("RETELL_API_KEY is not configured");
            const res = await axios.get(`${RETELL_BASE_URL}/v2/get-call/${callId}`, {
                headers: { Authorization: `Bearer ${RETELL_API_KEY}`, "Content-Type": "application/json" },
            });
            return res.data;
        },
        list: async (params?: {
            limit?: number;
            sort_order?: string;
            filter_criteria?: { call_status?: string[] };
        }) => {
            const RETELL_BASE_URL = process.env.RETELL_API_BASE_URL || "https://api.retellai.com";
            const RETELL_API_KEY = process.env.RETELL_API_KEY;
            if (!RETELL_API_KEY) throw new Error("RETELL_API_KEY is not configured");
            const requestParams: Record<string, unknown> = {};
            if (params?.limit !== undefined) requestParams.limit = params.limit;
            if (params?.sort_order) requestParams.sort_order = params.sort_order;
            if (params?.filter_criteria?.call_status) {
                requestParams.filter_criteria = { call_status: params.filter_criteria.call_status };
            }
            const res = await axios.get(`${RETELL_BASE_URL}/v2/list-calls`, {
                params: requestParams,
                headers: { Authorization: `Bearer ${RETELL_API_KEY}`, "Content-Type": "application/json" },
            });
            return res.data;
        },
    };
};

/**
 * Utility function to link a phone number to an agent for outbound calls
 * This can be used to programmatically fix the "No outbound agent id set up" error
 */
export const linkPhoneNumberToAgent = async (
    phoneNumber: string,
    agentId: string
): Promise<void> => {
    const RETELL_BASE_URL = process.env.RETELL_API_BASE_URL || "https://api.retellai.com";
    const RETELL_API_KEY = process.env.RETELL_API_KEY;
    
    if (!RETELL_API_KEY) {
        throw new Error("RETELL_API_KEY is not configured");
    }

    // Normalize phone number
    const normalizePhoneNumber = (num: string): string => {
        if (!num) return "";
        let cleaned = num.replace(/[\s\-()]/g, "");
        if (!cleaned.startsWith("+")) {
            if (cleaned.length === 10) {
                cleaned = `+1${cleaned}`;
            } else {
                cleaned = `+${cleaned}`;
            }
        }
        return cleaned;
    };

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const url = `${RETELL_BASE_URL}/v2/update-phone-number/${encodeURIComponent(normalizedPhone)}`;

    try {
        await axios.patch(
            url,
            { outbound_agent_id: agentId },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(`✅ Successfully linked phone number ${normalizedPhone} to agent ${agentId}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorData = error.response?.data;
            const errorMessage = typeof errorData === 'string' 
                ? errorData 
                : errorData?.message || errorData?.error || JSON.stringify(errorData);
            throw new Error(`Failed to link phone number: ${errorMessage || error.message}`);
        }
        throw error;
    }
};

/**
 * Hang up an active call
 * @param callId - The call ID to hang up
 */
export const hangupCall = async (callId: string): Promise<void> => {
    const RETELL_BASE_URL = process.env.RETELL_API_BASE_URL || "https://api.retellai.com";
    const RETELL_API_KEY = process.env.RETELL_API_KEY;
    
    if (!RETELL_API_KEY) {
        throw new Error("RETELL_API_KEY is not configured");
    }

    const url = `${RETELL_BASE_URL}/v2/update-call/${callId}`;

    try {
        await axios.patch(
            url,
            { end_call: true },
            {
                headers: {
                    Authorization: `Bearer ${RETELL_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(`✅ Successfully hung up call: ${callId}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorData = error.response?.data;
            const errorMessage = typeof errorData === 'string' 
                ? errorData 
                : errorData?.message || errorData?.error || JSON.stringify(errorData);
            throw new Error(`Failed to hang up call: ${errorMessage || error.message}`);
        }
        throw error;
    }
};

// Export with lazy initialization and call wrapper for backward compatibility
export const retell = new Proxy({} as Retell & { call: ReturnType<typeof createCallWrapper> }, {
    get(_target, prop) {
        const client = getRetellClient();
        if (prop === "call") {
            return createCallWrapper();
        }
        const value = (client as unknown as Record<string, unknown>)[prop as string];
        if (value === undefined) return undefined;
        return typeof value === "function" ? value.bind(client) : value;
    },
}) as Retell & { call: ReturnType<typeof createCallWrapper> };
