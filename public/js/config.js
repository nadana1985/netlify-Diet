const getEnv = () => (typeof window !== 'undefined' && window.env) ? window.env : {};

export const Config = {
    // Prioritize run-time injection (Netlify), fallback to placeholders or hardcoded dev values
    supabaseUrl: getEnv().SUPABASE_URL || 'https://jltlfayvqjybapppkydb.supabase.co',
    supabaseKey: getEnv().SUPABASE_KEY || 'sb_publishable_K9auFFoZEmeScVlBkFtTfA_MnFYoUWp'
};
