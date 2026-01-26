const getEnv = () => (typeof window !== 'undefined' && window.env) ? window.env : {};

export const Config = {
    // Prioritize run-time injection (Netlify), fallback to placeholders or hardcoded dev values
    supabaseUrl: getEnv().SUPABASE_URL || 'YOUR_SUPABASE_URL',
    supabaseKey: getEnv().SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY'
};
