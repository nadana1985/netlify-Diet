/**
 * Evaluation Facade (DWCS Architecture)
 * 
 * BOUNDARY: EVALUATION LAYER
 * Responsibility: Expose definitive Scoring results.
 * 
 * Restrictions:
 * - Read-Only
 * - NO ability to log data
 * - NO ability to change state
 */

export class EvaluationFacade {
    constructor(store) {
        this.store = store;
    }

    subscribe(keys, callback) {
        return this.store.subscribe((state, changes) => {
            callback(this.getSanitizedState(state), changes);
        });
    }

    getSanitizedState(rawState = this.store.state) {
        return {
            // Only expose Score and Meta
            meta: {
                score: rawState.meta.score,
                isReadOnly: rawState.meta.isReadOnly
            },
            biologicalDate: rawState.biologicalDate,
            // Helper to get Protocol structure for rendering breakdown context if needed,
            // but primarily we just want the score. 
            // We expose protocol strictly for "What was expected" context in comparison.
            dailyProtocol: rawState.dailyProtocol,
            // Expose Plan for Inspection/Landing Page (Read-Only)
            plan: rawState.plan
        };
    }

    getScore() {
        return this.store.state.meta.score || { total: 0, breakdown: [] };
    }

    /**
     * DERIVED ANALYTICS (Read-Only)
     */

    /**
     * Calculate Sleep Debt Stats (Client-Side Derived)
     * Definition: Sleep < 6h = Debt
     * Metric: Current Streak, 30-day Count
     */
    getSleepDebtStats() {
        // We need access to history. 
        // Since store only keeps ~2 days in historyContext contextually, 
        // we might need to peek at localStorage directly OR rely on what's available.
        // The store loads "plan" and "dataForDate". 
        // For 30-day stats, we need to iterate previous days.
        // This is expensive if we parse all localStorage.
        // Optimization: We only check if specific keys exist in localStorage.

        const today = new Date(this.store.state.biologicalDate);
        let streak = 0;
        let count30 = 0;

        // Scan back 30 days
        for (let i = 1; i <= 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const key = this.store.getSupportKey(dateStr); // Accessing store helper if possible? 
            // Facade has `this.store`.

            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    const sleep = data.protocols ? data.protocols.sleep : null;
                    if (sleep && typeof sleep.hours === 'number') {
                        if (sleep.hours < 6) {
                            count30++;
                            // Streak logic: only if contiguous from yesterday (i=1..N)
                            // If we already broke the streak, don't increment streak
                            // (We need to track if we represent a continuous chain)
                            // Actually simple loop: if (isStreakAlive) streak++; else isStreakAlive=false.
                        }
                    }
                } catch (e) { }
            }
        }

        // Re-calculate streak specifically from d-1 backwards until break
        let currentStreak = 0;
        for (let i = 1; i <= 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const key = this.store.getSupportKey(dateStr);
            const raw = localStorage.getItem(key);
            let isDebt = false;

            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    const sleep = data.protocols?.sleep;
                    if (sleep && typeof sleep.hours === 'number' && sleep.hours < 6) {
                        isDebt = true;
                    }
                } catch (e) { }
            }

            if (isDebt) {
                currentStreak++;
            } else {
                break; // Streak broken
            }
        }

        return { streak: currentStreak, last30: count30 };
    }

    /**
     * Major Deviation Heatmap Data
     * Returns frequency map for last 30 days
     */
    getMajorDeviationHeatmap() {
        const counts = {};
        const today = new Date(this.store.state.biologicalDate);

        for (let i = 0; i < 30; i++) { // Include today? "Last 30 days" usually implies history. Let's include today.
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const key = this.store.getDailyKey(dateStr);

            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    if (data.majorDeviations && Array.isArray(data.majorDeviations)) {
                        data.majorDeviations.forEach(dev => {
                            const type = dev.type || 'Unknown';
                            counts[type] = (counts[type] || 0) + 1;
                        });
                    }
                } catch (e) { }
            }
        }
        return counts;
    }
}
