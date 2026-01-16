/**
 * Normalizes Retell AI call data into a flat, consistent structure for spreadsheet storage
 */

interface CallAnalysis {
    call_summary?: string;
    call_successful?: boolean;
    verified?: boolean;
    verification_status?: string | boolean;
    custom_data?: Record<string, unknown>;
    [key: string]: unknown;
}

interface Metadata {
    name?: string;
    phone?: string;
    [key: string]: unknown;
}

interface NormalizeInput {
    callId: string;
    callStatus?: string;
    callAnalysis?: CallAnalysis;
    metadata?: Metadata;
    durationMs?: number;
    fromNumber?: string;
    toNumber?: string;
}

/**
 * Safely converts a value to string, number, or boolean
 */
const safeValue = (value: unknown): string | number | boolean => {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
};

export const normalizeRetellCallData = ({
    callId,
    callStatus,
    callAnalysis,
    metadata,
    durationMs,
    fromNumber,
    toNumber,
}: NormalizeInput): Record<string, string | number | boolean> => {
    const analysis = callAnalysis || {};
    const custom = (analysis.custom_data as Record<string, unknown>) || {};

    return {
        call_id: callId,
        call_status: callStatus || "unknown",

        name: safeValue(metadata?.name) as string,
        phone: safeValue(metadata?.phone) as string,

        from_number: fromNumber || "",
        to_number: toNumber || "",
        duration_seconds: durationMs ? Math.round(durationMs / 1000) : 0,

        call_summary: safeValue(analysis.call_summary) as string,
        call_successful: analysis.call_successful ?? false,

        primary_clinical_role: safeValue(custom.primary_clinical_role) as string,
        years_of_experience: safeValue(custom.years_of_experience) as string,
        licensed_in_state: safeValue(custom.currently_licensed_in_state) as string,

        work_type: safeValue(custom.work_type) as string,
        available_shifts: safeValue(custom.available_shifts) as string,
        open_to_multiple_locations: safeValue(custom.open_to_multiple_locations) as string,

        orientation_ready: safeValue(custom.can_complete_orientations) as string,
        reliable_transportation: safeValue(custom.reliable_transportation) as string,

        research_interest: safeValue(custom.research_interest) as string,
        diagnosed_conditions: safeValue(custom.diagnosed_or_cared_for_conditions) as string,
        comfortable_participating: safeValue(custom.comfortable_participating) as string,

        contact_consent: safeValue(custom.contact_consent) as string,

        verified:
            analysis.verified ||
            analysis.verification_status === "verified" ||
            false,

        timestamp: new Date().toISOString(),
    };
};

