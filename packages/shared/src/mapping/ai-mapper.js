/**
 * C4-C5: AI-assisted mapping — LLM registry + suggestion engine.
 * In production, calls external LLM APIs (Claude, GPT, etc).
 * Falls back to heuristic matching when no LLM is available.
 */
/**
 * LLM Provider Registry — register and select LLM providers.
 */
const providers = new Map();
export function registerProvider(provider) {
    providers.set(provider.name, provider);
}
export function getProvider(name) {
    return providers.get(name);
}
export function listProviders() {
    return Array.from(providers.keys());
}
/**
 * Heuristic mapper — fallback when no LLM is available.
 * Uses string similarity (Levenshtein-based) to suggest mappings.
 */
function normalizeFieldName(name) {
    return name
        .toLowerCase()
        .replace(/[-_\s]+/g, '_')
        .replace(/^(src|source|target|tgt|dest)_/, '')
        .replace(/_?(id|num|number|code)$/, '_id');
}
function similarity(a, b) {
    const na = normalizeFieldName(a);
    const nb = normalizeFieldName(b);
    if (na === nb)
        return 1.0;
    if (na.includes(nb) || nb.includes(na))
        return 0.8;
    // Simple token overlap
    const tokensA = new Set(na.split('_'));
    const tokensB = new Set(nb.split('_'));
    const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
    const union = new Set([...tokensA, ...tokensB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
}
export function heuristicMap(sourceFields, targetFields, threshold = 0.5) {
    const suggestions = [];
    const usedTargets = new Set();
    // Sort by best match first
    const candidates = [];
    for (const src of sourceFields) {
        for (const tgt of targetFields) {
            const score = similarity(src, tgt);
            if (score >= threshold) {
                candidates.push({ source: src, target: tgt, score });
            }
        }
    }
    candidates.sort((a, b) => b.score - a.score);
    for (const c of candidates) {
        if (usedTargets.has(c.target))
            continue;
        usedTargets.add(c.target);
        suggestions.push({
            source_path: c.source,
            target_path: c.target,
            confidence: c.score,
            suggested_transform: 'direct',
            reasoning: c.score === 1.0 ? 'Exact match after normalization' : 'Partial token overlap',
        });
    }
    return suggestions;
}
/**
 * Generate mapping suggestions — tries LLM first, falls back to heuristic.
 */
export async function generateMappingSuggestions(sourceFields, targetFields, preferredProvider) {
    if (preferredProvider) {
        const provider = getProvider(preferredProvider);
        if (provider) {
            try {
                return await provider.generateMappingSuggestions(sourceFields, targetFields);
            }
            catch {
                // Fall through to heuristic
            }
        }
    }
    // Try any registered provider
    for (const provider of providers.values()) {
        try {
            return await provider.generateMappingSuggestions(sourceFields, targetFields);
        }
        catch {
            continue;
        }
    }
    // Fallback to heuristic
    return heuristicMap(sourceFields, targetFields);
}
/**
 * Convert suggestions to actual FieldMappings.
 */
export function suggestionsToMappings(suggestions, minConfidence = 0.6) {
    return suggestions
        .filter((s) => s.confidence >= minConfidence)
        .map((s) => ({
        source_path: s.source_path,
        target_path: s.target_path,
        transform_rules: s.suggested_transform ? [{ type: s.suggested_transform }] : undefined,
        is_required: s.confidence >= 0.9,
    }));
}
/**
 * Claude AI Provider — uses Anthropic's Claude model for intelligent mapping.
 * Requires ANTHROPIC_API_KEY environment variable.
 */
export function createClaudeProvider(apiKey) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    return {
        name: 'claude',
        async generateMappingSuggestions(sourceFields, targetFields, _context) {
            if (!key) {
                throw new Error('ANTHROPIC_API_KEY environment variable is not set');
            }
            // This is a placeholder for actual Claude API integration.
            // In production, this would call the Claude API with proper error handling.
            // For now, fall back to heuristic matching.
            return heuristicMap(sourceFields, targetFields, 0.5);
        },
    };
}
/**
 * Simple test provider — returns predetermined mappings.
 * Useful for testing and demos.
 */
export function createTestProvider(mappings) {
    return {
        name: 'test',
        async generateMappingSuggestions(sourceFields, _targetFields) {
            const suggestions = [];
            const usedTargets = new Set();
            for (const src of sourceFields) {
                const target = mappings[src];
                if (target && !usedTargets.has(target)) {
                    usedTargets.add(target);
                    suggestions.push({
                        source_path: src,
                        target_path: target,
                        confidence: 0.95,
                        suggested_transform: 'direct',
                        reasoning: 'Predefined mapping',
                    });
                }
            }
            return suggestions;
        },
    };
}
//# sourceMappingURL=ai-mapper.js.map