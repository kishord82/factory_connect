/**
 * PII Redaction for FactoryConnect logs.
 * Correction C3: All log output passes through PII patterns.
 * Matches: GSTIN, PAN, Phone (India), Email, Aadhaar, Bank Account.
 * Replacement: "[REDACTED:GSTIN]", "[REDACTED:PAN]", etc.
 */
/**
 * PII patterns from Architecture Decisions History C3.
 * Bank regex is intentionally broad — matches 9-18 digit numbers.
 * Order matters: more specific patterns first to avoid partial matches.
 */
export const PII_PATTERNS = [
    // GSTIN: 2 digits + 5 uppercase + 4 digits + 1 uppercase + 1 alphanumeric + Z + 1 alphanumeric
    { name: 'GSTIN', regex: /\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]/g },
    // PAN: 5 uppercase + 4 digits + 1 uppercase
    { name: 'PAN', regex: /[A-Z]{5}\d{4}[A-Z]/g },
    // Indian phone: optional +91 or 0, then 6-9 followed by 9 digits
    { name: 'Phone', regex: /(\+91|0)?[6-9]\d{9}/g },
    // Email
    { name: 'Email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    // Aadhaar: 4 digits (optional space) 4 digits (optional space) 4 digits
    { name: 'Aadhaar', regex: /\d{4}\s?\d{4}\s?\d{4}/g },
    // Bank account: 9-18 consecutive digits (broad, applied last)
    { name: 'Bank', regex: /\d{9,18}/g },
];
/**
 * Redact PII from a string value.
 */
export function redactString(value) {
    let result = value;
    for (const pattern of PII_PATTERNS) {
        // Create a new regex each time since we use /g flag
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        result = result.replace(regex, `[REDACTED:${pattern.name}]`);
    }
    return result;
}
/**
 * Deep-redact PII from any value (string, object, array).
 * Returns a new value with all PII replaced.
 */
export function redactValue(value) {
    if (typeof value === 'string') {
        return redactString(value);
    }
    if (Array.isArray(value)) {
        return value.map(redactValue);
    }
    if (value !== null && typeof value === 'object') {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            result[key] = redactValue(val);
        }
        return result;
    }
    return value;
}
/**
 * Pino serializer hook that redacts PII from log objects.
 * Used as a Pino hook to intercept all log entries.
 */
export function createPiiRedactorHook() {
    return function redactorHook(args, method, _level, _logger) {
        // Redact the message if it's a string
        if (typeof args[0] === 'string') {
            args[0] = redactString(args[0]);
        }
        // Redact object arguments (the merge object in pino)
        if (typeof args[0] === 'object' && args[0] !== null) {
            args[0] = redactValue(args[0]);
        }
        // Also redact second argument if it's a string message
        if (typeof args[1] === 'string') {
            args[1] = redactString(args[1]);
        }
        void method; // consumed by pino hook signature
    };
}
//# sourceMappingURL=pii-redactor.js.map