/**
 * Scoring & Evaluation Layer (DWCS)
 * Computes the 0-100 Deviation-Weighted Daily Compliance Score.
 */

import { Substitution } from './substitution.js';

export const Scoring = {
    /**
     * Calculate DWCS for a given day.
     * @param {object} protocol - Result from Protocol.getRequirements()
     * @param {object} dailyLogs - Store.state.dailyLogs.records
     * @param {object} supportLogs - Store.state.supportLogs.protocols
     * @param {boolean} isFinal - If true (past day), treat Pending as Skipped. If false (today), ignore Pending.
     */
    calculate(protocol, dailyLogs, supportLogs, isFinal = false) {
        // GOVERNANCE: Runtime Access Check
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            try { throw new Error(); } catch (e) {
                // If caller is NOT Store.js, warn. (Browser stack traces vary, this is a heuristic)
                if (e.stack && !e.stack.includes('Store.js') && !e.stack.includes('scoring.js')) {
                    console.warn('%cDWCS ARCHITECTURE VIOLATION: Scoring.calculate called from unauthorized source.', 'color: red; font-weight: bold;', e.stack);
                }
            }
        }

        if (!protocol) return { total: 0, breakdown: [], version: "DWCS_v1" };

        console.log("--- SCORING DEBUG ---");
        console.log("Logs:", JSON.stringify(supportLogs));
        console.log("Protocol Support:", protocol.support.map(i => i.id));

        let totalPoints = 0;
        let earnedPoints = 0;
        let breakdown = [];

        // 1. Process Core Meals
        protocol.meals.forEach(item => {
            const record = dailyLogs[item.id];
            const uiStatus = record ? record.status : null; // null = PENDING

            // PENDING Handling
            if (!uiStatus) {
                if (isFinal) {
                    // Past day: Pending treated as SKIPPED (Penalty)
                    totalPoints += item.weight;
                    breakdown.push({ label: item.label, loss: -item.weight, reason: 'UNLOGGED' });
                } else {
                    // Today: Pending is ignored (No score impact yet)
                    // Do nothing
                }
                return;
            }

            const multiplier = Substitution.getMultiplier(uiStatus);
            const points = item.weight * multiplier;

            totalPoints += item.weight;
            earnedPoints += points;

            if (multiplier < 1.0) {
                breakdown.push({
                    label: item.label,
                    loss: points - item.weight,
                    reason: uiStatus
                });
            }
        });

        // 2. Process Support Protocols
        protocol.support.forEach(item => {
            let success = false;
            let status = 'PENDING';

            // Lookup Logic
            if (item.id === 'wake') {
                const sleepLog = supportLogs['sleep'];
                if (sleepLog && sleepLog.wake_time) { success = true; status = 'COMPLETED'; }
            } else if (item.id === 'sleep') {
                const sleepLog = supportLogs['sleep'];
                if (sleepLog && sleepLog.bed_time) { success = true; status = 'COMPLETED'; }
            } else {
                const log = supportLogs[item.id];
                if (log) {
                    status = log.status; // TAKEN, COMPLETED, SKIPPED, VIOLATION
                    if (status === 'TAKEN' || status === 'COMPLETED') success = true;
                    if (status === 'VIOLATION') success = false;
                }
            }

            // PENDING Logic
            if (status === 'PENDING') {
                if (isFinal) {
                    totalPoints += item.weight;
                    breakdown.push({ label: item.label, loss: -item.weight, reason: 'UNLOGGED' });
                }
                return;
            }

            // Treat SKIPPED explicitly
            if (status === 'SKIPPED') success = false;

            const multiplier = success ? 1.0 : 0.0;
            const points = item.weight * multiplier;

            totalPoints += item.weight;
            earnedPoints += points;

            if (!success) {
                breakdown.push({
                    label: item.label,
                    loss: -item.weight,
                    reason: status === 'VIOLATION' ? 'VIOLATION' : 'MISSED'
                });
            }
        });

        // 3. Normalize to 100
        // If totalPoints is 0 (start of day), start with 100 (Optimistic) or 0?
        // "PENDING must NOT immediately penalize".
        // If I show 0, it feels like a penalty.
        // If I show 100, it feels good.
        // Let's return 100 if no finalized items yet, unless explicitly 0?
        // Actually, if totalPoints is 0, we simply haven't started.
        // Let's return 0 but maybe UI handles "No Data"?
        // Or return 100 to represent "Current Adherence Potential"?
        // User said: "Avoid instant '0 score' shock". 100 seems appropriate for "So far so good".
        // Use 100 if totalPoints is 0 (and !isFinal).

        let score = 0;
        if (totalPoints === 0) {
            score = 100; // Optimistic Start (User Request)
        } else {
            score = Math.round((earnedPoints / totalPoints) * 100);
        }

        // Sort breakdown by biggest loss
        breakdown.sort((a, b) => a.loss - b.loss); // Ascending (negative numbers)

        return {
            total: score,
            breakdown: breakdown,
            version: "DWCS_v1"
        };
    }
};
