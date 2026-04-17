/**
 * PII Redaction for FactoryConnect logs.
 * Correction C3: All log output passes through PII patterns.
 * Matches: GSTIN, PAN, Phone (India), Email, Aadhaar, Bank Account.
 * Replacement: "[REDACTED:GSTIN]", "[REDACTED:PAN]", etc.
 */
export interface PiiPattern {
    name: string;
    regex: RegExp;
}
/**
 * PII patterns from Architecture Decisions History C3.
 * Bank regex is intentionally broad — matches 9-18 digit numbers.
 * Order matters: more specific patterns first to avoid partial matches.
 */
export declare const PII_PATTERNS: PiiPattern[];
/**
 * Redact PII from a string value.
 */
export declare function redactString(value: string): string;
/**
 * Deep-redact PII from any value (string, object, array).
 * Returns a new value with all PII replaced.
 */
export declare function redactValue(value: unknown): unknown;
/**
 * Pino serializer hook that redacts PII from log objects.
 * Used as a Pino hook to intercept all log entries.
 */
export declare function createPiiRedactorHook(): (args: Record<string, unknown>, method: string, _level: number, _logger: unknown) => void;
//# sourceMappingURL=pii-redactor.d.ts.map