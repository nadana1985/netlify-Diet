/**
 * Execution Facade (DWCS Architecture)
 * 
 * BOUNDARY: EXECUTION LAYER
 * Responsibility: Allow components to log events (Execution) without accessing Evaluation logic.
 * 
 * Restrictions:
 * - NO access to Scoring.calculate
 * - NO access to weights or multipliers
 * - NO validation logic (Protocol is read-only expectation)
 */

export class ExecutionFacade {
    constructor(store) {
        this.store = store;
    }

    /**
     * Subscribe to state changes (Restricted)
     */
    subscribe(keys, callback) {
        // We allow subscription, but the state passed to the callback 
        // should ideally be wrapped/sanitized too. 
        // For performance, we rely on the component using the facade's getters 
        // rather than inspecting the raw state object passed in the callback which is the Store's state.
        return this.store.subscribe((state, changes) => {
            callback(this.getSanitizedState(state), changes);
        });
    }

    getSanitizedState(rawState = this.store.state) {
        return {
            dailyLogs: rawState.dailyLogs,
            supportLogs: rawState.supportLogs,
            // Expose a processed version of the protocol
            dailyProtocol: this.getDisplayProtocol(rawState.dailyProtocol),
            meta: {
                isReadOnly: rawState.meta.isReadOnly,
                sealedDaysCount: rawState.meta.sealedDaysCount || 0
                // viewDate removed from meta, handled at root
            },
            biologicalDate: rawState.biologicalDate,
            viewDate: rawState.viewDate, // Exposed at root level
            currentTime: rawState.currentTime,
            // Expose UI state for Layout/Accordion
            ui: rawState.ui
        };
    }

    /**
     * UI Actions
     */
    setSection(sectionId) {
        this.store.dispatch('SET_SECTION', sectionId);
    }

    /**
     * Get Display-Safe Protocol (No Logic/Weights)
     */
    getDisplayProtocol(rawProtocol) {
        if (!rawProtocol) return null;

        const sanitizeItems = (items) => items.map(i => ({
            id: i.id,
            label: i.label,
            items: i.items,
            type: i.type
            // WEIGHT REMOVED - UI cannot compute importance
        }));

        return {
            date: rawProtocol.date,
            dayIndex: rawProtocol.dayIndex,
            type: rawProtocol.type,
            meals: sanitizeItems(rawProtocol.meals || []),
            support: sanitizeItems(rawProtocol.support || [])
        };
    }

    /**
     * Log Execution Event (Append Only)
     */
    logExecution(slotId, data) {
        this.store.dispatch('LOG_EXECUTION', {
            date: this.store.state.viewDate,
            slot: slotId,
            data: data
        });
    }

    /**
     * Log Support Event
     */
    logSupport(id, data, metadata = {}) {
        // Metadata (like "outside_window") is strictly informational
        this.store.dispatch('LOG_SUPPORT', {
            date: this.store.state.viewDate,
            id: id,
            data: { ...data, ...metadata } // Attach metadata
        });
    }

    /**
     * Log Forensic (For Input Component)
     */
    logForensic(slotId, status, actualConsumed) {
        this.store.dispatch('LOG_FORENSIC', {
            date: this.store.state.viewDate,
            slot: slotId,
            data: {
                status: status,
                actual_consumed: actualConsumed
            }
        });
    }

    /**
     * Log Major Deviations (Full List Sync for Day)
     * @param {Array} deviations - Array of deviation objects { type, quantity, time, notes }
     */
    logMajorDeviations(deviations) {
        this.store.dispatch('LOG_MAJOR_DEVIATION', {
            date: this.store.state.viewDate,
            deviations: deviations
        });
    }

    /**
     * Log Sleep Data (Explicit)
     * @param {Object} sleepData - { hours: Number, window: String, reason: String }
     */
    logSleep(sleepData) {
        // Enforce data contract
        const payload = {
            hours: Number(sleepData.hours),
            window: sleepData.window || '',
            reason: sleepData.reason || '',
            status: 'TAKEN' // Implicitly taken if logged
        };

        this.store.dispatch('LOG_SLEEP', {
            date: this.store.state.viewDate,
            data: payload
        });
    }

    logContext(context) {
        this.store.dispatch('LOG_CONTEXT', {
            date: this.store.state.viewDate,
            context: context
        });
        // Actually, let's stick to biologicalDate for safety unless we explicitly mean "Edit History"
        // But context edit?
        // Let's use viewDate for display and edit if not read-only.
        // Wait, all other log methods in this Facade use `this.store.state.biologicalDate`.
        // If I implement History View, `log...` should probably error if viewDate != biologicalDate?
        // Or should I use `viewDate` which effectively allows editing past days if they are not sealed?
        // Logic: "Append-only" log.
        // Let's keep `biologicalDate` for now to be safe (can only log to TODAY).
        // Exceptions: `finishDay`.

    }

    /**
     * Finish/Seal the current day
     */
    finishDay() {
        this.store.dispatch('SEAL_DAY', {
            date: this.store.state.viewDate
        });
    }

    unsealDay() {
        this.store.dispatch('UNSEAL_DAY', {
            date: this.store.state.viewDate
        });
    }

    resetApp() {
        this.store.dispatch('RESET_ALL');
    }

    /**
     * Change View Date (History)
     */
    setViewDate(dateStr) {
        this.store.dispatch('SET_VIEW_DATE', dateStr);
    }
}
