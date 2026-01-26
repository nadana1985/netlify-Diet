import { Config } from '../config.js';

let supabase = null;
let isInitialized = false;
let userId = null;

export const SupabaseClient = {
    async init() {
        if (isInitialized) return;

        // 1. Check Config
        if (!Config.supabaseUrl || Config.supabaseUrl.includes('YOUR_SUPABASE')) {
            console.warn("Supabase: Missing configuration. Shadow persistence disabled.");
            return;
        }

        try {
            // 2. Load Supabase JS from CDN if not already global
            if (!window.createClient) {
                await this.loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
            }

            // 3. Create Client
            const { createClient } = window.supabase;
            supabase = createClient(Config.supabaseUrl, Config.supabaseKey);

            // 4. Anonymous Auth
            const { data, error } = await supabase.auth.signInAnonymously();

            if (error) {
                console.warn("Supabase: Auth failed", error);
                return;
            }

            userId = data.user.id;
            isInitialized = true;
            console.log("Supabase: Initialized (Shadow Mode)", userId);

        } catch (e) {
            console.warn("Supabase: Initialization failed", e);
        }
    },

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    async uploadLog(date, type, payload) {
        if (!isInitialized || !supabase) return;

        try {
            const { error } = await supabase
                .from('shadow_logs')
                .upsert({
                    user_id: userId,
                    log_date: date, // YYYY-MM-DD
                    log_type: type, // 'daily' | 'support'
                    payload: payload,
                    client_updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, log_date, log_type' });

            if (error) {
                console.warn("Supabase: Upload failed", error);
            } else {
                // Silent success
            }
        } catch (e) {
            console.warn("Supabase: Upload error", e);
        }
    }
};
