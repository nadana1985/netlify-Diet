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

            // Plan Data
            plan: null,

            // Meta / Scoring
            meta: {
                score: { total: 0, breakdown: [], version: 'DWCS_v1' },
                isReadOnly: false
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
                // Reload data for new day
                this.loadDataForDate(tickData.date);
                changes.push('biologicalDate');
            }

            if (changes.length > 0) this.notify(changes);
        });

        // Initial Load
        this.loadDataForDate(this.state.biologicalDate);
        this.loadPlan();
    }

    async loadPlan() {
        try {
            const res = await fetch('/plan/30_day_plan.json');
            if (res.ok) {
                this.state.plan = await res.json();
                // Refresh data to bind Protocol now that plan is available
                this.loadDataForDate(this.state.biologicalDate);
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

        this.state.dailyLogs = dRaw ? JSON.parse(dRaw) : { records: {} };
        this.state.supportLogs = sRaw ? JSON.parse(sRaw) : { protocols: {} };

        const today = this.timeEngine.getBiologicalDate();
        this.state.meta.isReadOnly = date < today;

        // 1. Get History Context for Protocol (Pure)
        const history = this.getHistoryContext(date);

        // 2. Determine Protocol
        this.state.dailyProtocol = Protocol.getRequirements(date, this.state.plan, history);

        // 3. Calculate Score
        this.calculateScore();

        this.notify(['dailyLogs', 'supportLogs', 'meta', 'dailyProtocol']);
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
            case 'SET_SECTION':
                const next = this.state.ui.expandedSection === payload ? null : payload;
                if (this.state.ui.expandedSection !== next) {
                    this.state.ui.expandedSection = next;
                    changes.push('ui.expandedSection');
                }
                break;

            case 'LOG_EXECUTION': // Alias / Strict Name
            case 'LOG_SUPPORT':   // Legacy Name
                {
                    const { date, id, data } = payload;
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
                    // Store context in dailyLogs.meta or similar?
                    // Proposal: dailyLogs.context = "..."
                    const log = this.state.dailyLogs;
                    log.context = context; // Direct string
                    log.updated_at = new Date().toISOString();

                    localStorage.setItem(this.getDailyKey(date), JSON.stringify(log));
                    // Context does NOT affect score, but we notify changes
                    changes.push('dailyLogs');
                }
                break;
        }

        if (changes.length > 0) this.notify(changes);

        // Notify action listeners (Shadow Persistence hooks here)
        this.notifyAction(action, payload);
    }
}
