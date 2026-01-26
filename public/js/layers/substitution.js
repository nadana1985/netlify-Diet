/**
 * Substitution & Equivalence Layer
 * Maps discrete UI statuses to semantic adherence levels and scoring multipliers.
 */

export const Substitution = {
    /**
     * Resolve the semantic meaning of a log entry.
     * @param {string} uiStatus - "FOLLOWED", "PARTIAL", "DIFFERENT", "SKIPPED"
     * @param {string} actualText - User input text (optional detailed context)
     */
    resolve(uiStatus, actualText = "") {
        const statusMap = {
            'FOLLOWED': { status: 'followed', equivalence: 'full', multiplier: 1.0 },
            'PARTIAL': { status: 'substituted', equivalence: 'partial', multiplier: 0.5 },
            'DIFFERENT': { status: 'substituted', equivalence: 'low', multiplier: 0.1 }, // Strict penalty
            'SKIPPED': { status: 'skipped', equivalence: 'none', multiplier: 0.0 },

            // Legacy / Fallback
            'TAKEN': { status: 'followed', equivalence: 'full', multiplier: 1.0 },
            'COMPLETED': { status: 'followed', equivalence: 'full', multiplier: 1.0 },
            'VIOLATION': { status: 'substituted', equivalence: 'low', multiplier: 0.0 } // Explicit violation (e.g. coffee)
        };

        const def = statusMap[uiStatus] || { status: 'unknown', equivalence: 'none', multiplier: 0.0 };

        // Advanced Logic: parsing `actualText` could refine "DIFFERENT" -> "substituted_good" vs "bad"
        // For v1, we adhere to the strict mapping.

        return def;
    },

    /**
     * Helper to get multiplier directly
     */
    getMultiplier(uiStatus) {
        return this.resolve(uiStatus).multiplier;
    }
};
