import { SupabaseClient } from './supabase-client.js';

export const ShadowSync = {
    async init(store) {
        // Initialize Supabase Client
        await SupabaseClient.init();

        // 1. Initial Sync (Rehydration snapshot)
        // We do this blindly for the current day to ensure we have a baseline
        const date = store.state.biologicalDate;
        this.syncAll(store, date);


        // 2. Subscribe to Semantic Actions
        store.subscribeAction((action, payload, state) => {
            // Filter strict semantic events
            if (action === 'LOG_EXECUTION' || action === 'LOG_SUPPORT') {
                // Payload has { date, id, data }
                // We sync the ENTIRE support log for that date
                const logDate = payload.date;
                const fullLog = state.supportLogs; // This is the IN-MEMORY state, which might be cleaner
                // WARNING: store.state.supportLogs is the current loaded one. 
                // If payload.date != state.biologicalDate, we might be logging for a different day?
                // The Store loads *current* day. If we log for *another* day, Store probably loaded it temporarily?
                // Actually Store only holds ONE day in memory: this.state.dailyLogs/supportLogs.
                // So if we log, it must be for the loaded day.

                // However, let's be safe. If the store dispatch updated persistence, it means state matches.
                this.syncSupport(logDate, state.supportLogs);
            }

            if (action === 'LOG_FORENSIC' || action === 'LOG_DAILY') {
                const logDate = payload.date;
                const fullLog = state.dailyLogs;
                this.syncDaily(logDate, fullLog);
            }
        });

        console.log("ShadowSync: Active");
    },

    syncAll(store, date) {
        this.syncDaily(date, store.state.dailyLogs);
        this.syncSupport(date, store.state.supportLogs);
    },

    syncDaily(date, data) {
        // Debounce could be here if needed, but 'upsert' cost is low enough for human-speed interactions
        SupabaseClient.uploadLog(date, 'daily', data);
    },

    syncSupport(date, data) {
        SupabaseClient.uploadLog(date, 'support', data);
    }
};
