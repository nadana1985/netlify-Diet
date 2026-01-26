/**
 * Protocol Layer (Pure)
 * Defines the strict requirements for a given day.
 * 
 * Responsibilities:
 * - Map Date -> Plan Day (Day 1..30)
 * - Define Core Meal Requirements (Lunch, Dinner)
 * - Define Support Protocol Requirements (Water, Gym, Sleep, etc.)
 * - Handle conditional logic (e.g. Coffee eligibility) purely via arguments
 */

export const Protocol = {
    /**
     * Get the full requirements for a specific date
     * @param {string} dateStr - YYYY-MM-DD
     * @param {object} plan - The full 30-day plan JSON
     * @param {object} historyContext - { dMinus1: logObj, dMinus2: logObj } for conditional checks
     * @returns {object} { dayIndex, type, meals: [...], support: [...] } or null if invalid
     */
    getRequirements(dateStr, plan, historyContext = {}) {
        if (!plan || !plan.plan_start_date) return null;

        const dayConfig = this.getPlanDay(dateStr, plan);
        if (!dayConfig) return null; // Pre-plan or Post-plan (or off-plan)

        // 1. Core Meals (From JSON)
        const meals = [
            { id: 'juice', label: 'Morning Juice', items: this.normalizeList(dayConfig.juice), weight: 10 },
            { id: 'lunch', label: 'Lunch', items: this.normalizeList(dayConfig.lunch), weight: 30 },
            { id: 'dinner', label: 'Dinner', items: this.normalizeList(dayConfig.dinner), weight: 20 }
        ];

        // 2. Support Protocols (Static Rules)
        const support = [
            // "wake" is derived from sleep log but logically a "morning" task.
            // We'll track it as 'wake' because that's how the Morning UI presents it.
            // Store maps it to { id: 'sleep', wake_time: ... }
            { id: 'wake', label: 'Wake Up', type: 'boolean', weight: 5 },
            { id: 'water', label: 'Hydration', type: 'boolean', weight: 5 },
            { id: 'gym', label: 'Gym / Activity', type: 'boolean', weight: 10 },
            { id: 'walking_lunch', label: 'Post-Lunch Walk', type: 'boolean', weight: 5 },
            { id: 'walking_dinner', label: 'Post-Dinner Walk', type: 'boolean', weight: 5 },
            { id: 'psyllium', label: 'Psyllium Husk', type: 'boolean', weight: 5 },
            { id: 'sleep', label: 'Shutdown / Sleep', type: 'boolean', weight: 5 } // Bedtime
        ];

        // 3. Conditional Protocols (Coffee)
        if (this.isCoffeeAllowed(historyContext.dMinus1, historyContext.dMinus2)) {
            support.push({ id: 'black_coffee', label: 'Black Coffee', type: 'boolean', weight: 5 }); // Bonus/Allowed?
            // User rules say: "Black Coffee (If allowed)"
            // If it's *allowed*, is it *required*?
            // "Required Layers to Integrate... Contextual Deviation... Scoring".
            // If I take it when allowed -> Good.
            // If I don't take it when allowed -> Neutral?
            // Store behavior: "Required Tasks... push black_coffee".
            // So previously it WAS required to "Unlock".
            // We'll keep it as a requirement if eligible.
        }

        return {
            date: dateStr,
            dayIndex: dayConfig.day,
            type: dayConfig.type, // veg, fish, chicken, etc.
            meals,
            support
        };
    },

    /**
     * Map Date to Plan Day Object
     */
    getPlanDay(dateStr, plan) {
        const start = new Date(plan.plan_start_date);
        const current = new Date(dateStr);

        // Normalize to UTC midnight to avoid timezone drift
        const t1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const t2 = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());

        const diffMs = t2 - t1;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const dayIndex = diffDays + 1;

        if (dayIndex < 1 || dayIndex > plan.total_days) return null;

        return plan.days.find(d => d.day === dayIndex) || null;
    },

    /**
     * Coffee Eligibility Logic (Pure)
     * Rule: Max once every 3 days. (Day T is allowed if T-1 and T-2 were NOT taken)
     */
    isCoffeeAllowed(logD1, logD2) {
        const taken1 = this.wasCoffeeTaken(logD1);
        const taken2 = this.wasCoffeeTaken(logD2);
        return !(taken1 || taken2);
    },

    wasCoffeeTaken(supportLog) {
        if (!supportLog || !supportLog.protocols) return false;
        const p = supportLog.protocols['black_coffee'];
        // Status 'VIOLATION' counts as taken (it was consumed)
        return p && (p.status === 'TAKEN' || p.status === 'VIOLATION');
    },

    normalizeList(val) {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return [val];
        return [];
    }
};
