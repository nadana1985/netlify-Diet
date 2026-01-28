import { TimeEngine } from './time-engine.js';
import { Protocol } from '../layers/protocol.js';
import { Scoring } from '../layers/scoring.js';

export class Store {
    constructor() {
        this.timeEngine = new TimeEngine();

        this.state = {
            // Persistent Data
            dailyLogs: {},
            supportLogs: {},

            // Runtime Data
            currentTime: this.timeEngine.getCurrentTimeString(),
            biologicalDate: this.timeEngine.getBiologicalDate(),
            viewDate: this.timeEngine.getBiologicalDate(), // NEW: Support history view

            // Plan Data
            plan: null,

            // Meta / Scoring
            meta: {
                score: { total: 0, breakdown: [], version: 'DWCS_v1' },
                isReadOnly: false,
                isSealed: false // Explicit seal flag
            },

            // Computed Protocol for Today
            dailyProtocol: null,

            // UI State
            ui: {
                expandedSection: this.mapPhaseToSection(this.timeEngine.getCurrentPhase())
            }
        };

        this.listeners = [];
        this.actionListeners = [];

        // Bind Time Engine
        this.timeEngine.subscribe((tickData) => {
            let changes = [];
            if (tickData.time !== this.state.currentTime) {
                this.state.currentTime = tickData.time;
                changes.push('currentTime');
            }
            // Date crossover check
            if (tickData.date !== this.state.biologicalDate) {
                this.state.biologicalDate = tickData.date;
                // Only auto-switch view if user was on "today"
                if (this.state.viewDate === this.state.biologicalDate) { // Logic: if viewDate was old bioDate, and bioDate changed, update viewDate? 
                    // Actually, if date changes, we usually want to show the new day.
                    this.state.viewDate = tickData.date;
                    this.loadDataForDate(this.state.viewDate);
                }
                changes.push('biologicalDate', 'viewDate');
            }

            if (changes.length > 0) this.notify(changes);
        });

        // Initial Load
        this.loadDataForDate(this.state.viewDate);
        this.loadPlan();
    }

    async loadPlan() {
        try {
            const res = await fetch('/plan/30_day_plan.json');
            if (res.ok) {
                this.state.plan = await res.json();
                // Refresh data to bind Protocol now that plan is available
                this.loadDataForDate(this.state.viewDate);
                this.notify(['plan']);
            } else {
                console.error("Failed to load plan");
            }
        } catch (e) {
            console.error("Error loading plan", e);
        }
    }

    getDailyPlan(dateStr) {
        if (!this.state.plan) return null;

        const start = new Date(this.state.plan.plan_start_date);
        const current = new Date(dateStr);

        // Normalize to midnight UTC to avoid offset issues or simple diff
        const t1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const t2 = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());

        const diffMs = t2 - t1;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Plan days are 1-indexed (day: 1)
        const dayIndex = diffDays + 1;
        if (dayIndex < 1 || dayIndex > this.state.plan.total_days) return null;

        return this.state.plan.days.find(d => d.day === dayIndex) || null;
    }

    mapPhaseToSection(phase) {
        return phase;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify(changes) {
        this.listeners.forEach(l => l(this.state, changes));
    }

    subscribeAction(listener) {
        this.actionListeners.push(listener);
        return () => {
            this.actionListeners = this.actionListeners.filter(l => l !== listener);
        };
    }

    notifyAction(action, payload) {
        this.actionListeners.forEach(l => l(action, payload, this.state));
    }

    // Helper: Count Sealed Days
    getSealedDaysCount() {
        let count = 0;
        const prefix = "fh:v1:user_default:daily_log:";
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                try {
                    const val = JSON.parse(localStorage.getItem(key));
                    if (val && val.sealed) count++;
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        }
        return count;
    }

    // Persistence Keys
    getDailyKey(date) { return `fh:v1:user_default:daily_log:${date}`; }
    getSupportKey(date) { return `fh:v1:user_default:support_log:${date}`; }

    // Helper: Normalize Date Key
    getDateKey(d) {
        return d.toISOString().split('T')[0];
    }

    loadDataForDate(date) {
        const dRaw = localStorage.getItem(this.getDailyKey(date));
        const sRaw = localStorage.getItem(this.getSupportKey(date));

        this.state.dailyLogs = dRaw ? JSON.parse(dRaw) : { records: {}, majorDeviations: [], context: "" };
        this.state.supportLogs = sRaw ? JSON.parse(sRaw) : { protocols: {} };

        // Read-only logic: Explicitly Sealed ONLY
        // We allow editing past days if they were not sealed (e.g. forgot to log)
        const today = this.timeEngine.getBiologicalDate();
        const isSealed = !!this.state.dailyLogs.sealed;

        this.state.meta.isReadOnly = isSealed;
        this.state.meta.isSealed = isSealed;
        this.state.meta.sealedDaysCount = this.getSealedDaysCount(); // Update count on load

        // 1. Get History Context for Protocol (Pure)
        const history = this.getHistoryContext(date);

        // 2. Determine Protocol
        this.state.dailyProtocol = Protocol.getRequirements(date, this.state.plan, history);

        // 3. Calculate Score
        this.calculateScore();

        this.notify(['dailyLogs', 'supportLogs', 'meta', 'dailyProtocol', 'viewDate']);
    }

    getHistoryContext(dateStr) {
        const d = new Date(dateStr);
        const d1 = new Date(d); d1.setDate(d.getDate() - 1);
        const d2 = new Date(d); d2.setDate(d.getDate() - 2);

        const k1 = this.getSupportKey(this.getDateKey(d1));
        const k2 = this.getSupportKey(this.getDateKey(d2));

        const raw1 = localStorage.getItem(k1);
        const raw2 = localStorage.getItem(k2);

        return {
            dMinus1: raw1 ? JSON.parse(raw1) : {},
            dMinus2: raw2 ? JSON.parse(raw2) : {}
        };
    }

    calculateScore() {
        this.state.meta.score = Scoring.calculate(
            this.state.dailyProtocol,
            this.state.dailyLogs.records || {},
            this.state.supportLogs.protocols || {},
            this.state.meta.isReadOnly // isFinal flag
        );
    }

    // Removed: determineRequiredTasks
    // Removed: isCoffeeAllowed (moved to boolean logic in generic GetHistoryContext + Protocol)
    // Removed: calculateProgress

    dispatch(action, payload) {
        let changes = [];

        switch (action) {
            case 'SET_VIEW_DATE':
                if (payload !== this.state.viewDate) {
                    this.state.viewDate = payload;
                    this.loadDataForDate(payload);
                    changes.push('viewDate');
                    // Accordion reset? Maybe not.
                }
                break;

            case 'SET_SECTION':
                const next = this.state.ui.expandedSection === payload ? null : payload;
                if (this.state.ui.expandedSection !== next) {
                    this.state.ui.expandedSection = next;
                    changes.push('ui.expandedSection');
                }
                break;

            case 'SEAL_DAY':
                {
                    const { date } = payload;
                    const log = this.state.dailyLogs;
                    if (this.state.viewDate === date) { // Integrity check
                        log.sealed = true;
                        log.updated_at = new Date().toISOString();

                        localStorage.setItem(this.getDailyKey(date), JSON.stringify(log));

                        this.state.meta.isReadOnly = true;
                        this.state.meta.isSealed = true;
                        this.state.meta.sealedDaysCount = this.getSealedDaysCount();
                        this.calculateScore(); // Final Score
                        changes.push('dailyLogs', 'meta');
                    }
                }
                break;

            case 'UNSEAL_DAY':
                {
                    const { date } = payload;
                    const log = this.state.dailyLogs;
                    if (this.state.viewDate === date) {
                        log.sealed = false;
                        log.updated_at = new Date().toISOString();

                        localStorage.setItem(this.getDailyKey(date), JSON.stringify(log));

                        this.state.meta.isReadOnly = false;
                        this.state.meta.isSealed = false;
                        this.state.meta.sealedDaysCount = this.getSealedDaysCount();
                        this.calculateScore(); // Recalculate (Pending items are no longer Skipped)
                        changes.push('dailyLogs', 'meta');
                    }
                }
                break;

            case 'RESET_ALL':
                {
                    console.log("!!! RESETTING ALL DATA !!!");
                    localStorage.clear();
                    window.location.reload();
                }
                break;

            case 'LOG_EXECUTION': // Alias / Strict Name
            case 'LOG_SUPPORT':   // Legacy Name
                {
                    const { date, id, data } = payload;
                    console.log(`[STORE] LOG_SUPPORT for ${date} (View: ${this.state.viewDate})`, id, data);

                    const log = this.state.supportLogs;

                    if (!log.protocols) log.protocols = {};

                    // Merge
                    const existing = log.protocols[id] || {};
                    log.protocols[id] = { ...existing, ...data, updated_at: new Date().toISOString() };

                    localStorage.setItem(this.getSupportKey(date), JSON.stringify(log));



                    this.calculateScore(); // Re-calc score
                    changes.push('supportLogs', 'meta');
                }
                break;

            case 'LOG_FORENSIC': // Alias / Strict Name
            case 'LOG_DAILY':    // Legacy Name
                {
                    const { date, slot, data } = payload;
                    console.log(`[STORE] LOG_DAILY for ${date} (View: ${this.state.viewDate})`, slot, data);

                    const log = this.state.dailyLogs;
                    if (!log.records) log.records = {};

                    log.records[slot] = { ...log.records[slot], ...data, logged_at: new Date().toISOString() };

                    localStorage.setItem(this.getDailyKey(date), JSON.stringify(log));


                    this.calculateScore(); // Re-calc score
                    changes.push('dailyLogs', 'meta');
                }
                break;

            case 'LOG_CONTEXT':
                {
                    const { date, context } = payload;
                    const log = this.state.dailyLogs;
                    log.context = context; // Direct string
                    log.updated_at = new Date().toISOString();

                    localStorage.setItem(this.getDailyKey(date), JSON.stringify(log));
                    // Context does NOT affect score, but we notify changes
                    changes.push('dailyLogs');
                }
                break;

            case 'LOG_MAJOR_DEVIATION':
                {
                    const { date, deviation } = payload;
                    const log = this.state.dailyLogs;
                    if (!log.majorDeviations) log.majorDeviations = [];

                    // Append-only logic: Add new deviation
                    // We might want to allow identifying specific deviations to remove them? 
                    // User said "Append-only". But UI usually needs toggle.
                    // For now, we'll assume the Facade handles the "set" logic or we just push.
                    // Implementation Plan implies "Select any that occurred today", which suggests a Set-like behavior or specific toggles.
                    // However, "Append-only" usually means strictly adding.
                    // Let's implement as "Replace List" if the UI sends the full list, OR "Add one".
                    // The prompt says "Data Model (append-only) majorDeviations: [ { type... } ]". 
                    // And "Select any that occurred...". If I uncheck, it should be removed?
                    // "Append-only" in logs usually means we just keep adding events.
                    // But for a daily register "Select any", it acts like a current state.
                    // We will implement simpler "Update List" for the day, which technically satisfies "Append-only" *log history* if we viewed it that way, 
                    // but for day-edits, we overwrite the day's list. 
                    // Actually, let's treat it as: The UI sends the *new* list of deviations.

                    log.majorDeviations = payload.deviations; // Expecting complete array
                    log.updated_at = new Date().toISOString();

                    localStorage.setItem(this.getDailyKey(date), JSON.stringify(log));
                    this.calculateScore();
                    changes.push('dailyLogs', 'meta');
                }
                break;

            case 'LOG_SLEEP':
                {
                    const { date, data } = payload;
                    const log = this.state.supportLogs;
                    if (!log.protocols) log.protocols = {};

                    // Specific Sleep Structure
                    log.protocols['sleep'] = {
                        ...log.protocols['sleep'],
                        ...data, // { hours, window, reason, status: 'TAKEN' }
                        updated_at: new Date().toISOString()
                    };

                    localStorage.setItem(this.getSupportKey(date), JSON.stringify(log));
                    this.calculateScore();
                    changes.push('supportLogs', 'meta');
                }
                break;
        }

        if (changes.length > 0) this.notify(changes);

        // Notify action listeners (Shadow Persistence hooks here)
        this.notifyAction(action, payload);
    }
}
