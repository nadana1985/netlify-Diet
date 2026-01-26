import { TimeEngine } from './time-engine.js';

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

            // Meta / Gating
            meta: {
                requiredTasks: [], // IDs of tasks required TODAY to unlock forensic
                progressPercent: 0
            },

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

        // Snapshot Required Tasks for this day
        this.state.meta.requiredTasks = this.determineRequiredTasks(date);

        // Calculate Initial Progress
        this.calculateProgress();

        this.notify(['dailyLogs', 'supportLogs', 'meta']);
    }

    // Ported Logic: Determine what is required today
    determineRequiredTasks(dateStr) {
        // Base Tasks (Daytime)
        // Sleep is EXCLUDED from gating per user rule.
        const tasks = ['water', 'gym', 'walking_lunch', 'walking_dinner', 'psyllium'];

        // Coffee Check (3-Day Rule)
        // Look back d-1, d-2
        if (this.isCoffeeAllowed(dateStr)) {
            tasks.push('black_coffee');
        }

        // Wake logic? Wake is usually required.
        tasks.push('sleep'); // Wait, "sleep" ID maps to wake_time in Morning.js? 
        // In Morning.js: id='sleep', data: { wake_time: ... }
        // In Shutdown.js: id='sleep', data: { bed_time: ... }
        // We need to differentiate WAKE from BED for gating.
        // Actually, they share the same protocol ID 'sleep'.
        // Let's check logic: if 'wake_time' exists, WAKE is done.
        // If 'bed_time' exists, BED is done.
        // Required Task: 'wake'. We need to treat them conceptually separate for progress.
        // Let's use 'wake' as the key for progress tracking, but it checks protocols['sleep'].wake_time.

        // Correcting list:
        const required = ['wake', 'water', 'gym', 'walking_lunch', 'walking_dinner', 'psyllium'];

        if (this.isCoffeeAllowed(dateStr)) {
            required.push('black_coffee');
        }

        return required;
    }

    isCoffeeAllowed(dateStr) {
        // Simple lookback
        const d = new Date(dateStr);
        const d1 = new Date(d); d1.setDate(d.getDate() - 1);
        const d2 = new Date(d); d2.setDate(d.getDate() - 2);

        const k1 = this.getSupportKey(this.getDateKey(d1));
        const k2 = this.getSupportKey(this.getDateKey(d2));

        const raw1 = localStorage.getItem(k1);
        const raw2 = localStorage.getItem(k2);

        const log1 = raw1 ? JSON.parse(raw1).protocols['black_coffee'] : {};
        const log2 = raw2 ? JSON.parse(raw2).protocols['black_coffee'] : {};

        const taken1 = log1 && (log1.status === 'TAKEN' || log1.status === 'VIOLATION');
        const taken2 = log2 && (log2.status === 'TAKEN' || log2.status === 'VIOLATION');

        if (taken1 || taken2) return false;
        return true;
    }

    calculateProgress() {
        const reqs = this.state.meta.requiredTasks;
        const protos = this.state.supportLogs.protocols || {};

        let completed = 0;
        reqs.forEach(task => {
            let isDone = false;

            if (task === 'wake') {
                // Check sleep protocol for wake_time
                if (protos['sleep'] && protos['sleep'].wake_time) isDone = true;
            } else {
                const p = protos[task];
                if (p && (p.status === 'TAKEN' || p.status === 'COMPLETED' || p.status === 'SKIPPED' || p.status === 'VIOLATION')) {
                    isDone = true;
                }
            }

            if (isDone) completed++;
        });

        this.state.meta.progressPercent = reqs.length > 0 ? Math.floor((completed / reqs.length) * 100) : 100;
        // No notify here, caller handles it or we do it efficiently
    }

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

                    this.calculateProgress(); // Re-calc progress
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

                    changes.push('dailyLogs');
                }
                break;
        }

        if (changes.length > 0) this.notify(changes);

        // Notify action listeners (Shadow Persistence hooks here)
        this.notifyAction(action, payload);
    }
}
