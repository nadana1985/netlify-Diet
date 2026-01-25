export class TimeEngine {
    constructor() {
        this.customTime = null;
        this.listeners = [];

        // Check for Mock Time in URL (?mockTime=HH:MM)
        const params = new URLSearchParams(window.location.search);
        const mock = params.get('mockTime');
        if (mock) {
            this.setMockTime(mock);
            console.warn(`[TimeEngine] Mocking time to ${mock}`);
        }

        // Start ticking
        setInterval(() => this.tick(), 60000); // Every minute
    }

    subscribe(cb) {
        this.listeners.push(cb);
    }

    setMockTime(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        const now = new Date();
        now.setHours(h, m, 0, 0);
        this.customTime = now;
        this.tick();
    }

    getNow() {
        return this.customTime || new Date();
    }

    // Returns format "18:45"
    getCurrentTimeString() {
        const now = this.getNow();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    // Biological Day: Day ends at 03:00 AM
    // If it's 01:00 AM on the 26th, it's still the 25th biologically.
    getBiologicalDate() {
        const now = this.getNow();
        const hour = now.getHours();

        const bioDate = new Date(now);
        if (hour < 3) {
            bioDate.setDate(bioDate.getDate() - 1);
        }

        // Return YYYY-MM-DD
        const offset = bioDate.getTimezoneOffset();
        const local = new Date(bioDate.getTime() - (offset * 60 * 1000));
        return local.toISOString().split('T')[0];
    }

    // Returns part of day: MORNING (05-12), ACTIVITY (12-20), SHUTDOWN (20-05)
    getCurrentPhase() {
        const now = this.getNow();
        const h = now.getHours();

        if (h >= 5 && h < 12) return 'MORNING';
        if (h >= 12 && h < 20) return 'ACTIVITY';
        return 'SHUTDOWN';
    }

    tick() {
        const payload = {
            time: this.getCurrentTimeString(),
            date: this.getBiologicalDate(),
            phase: this.getCurrentPhase()
        };
        this.listeners.forEach(cb => cb(payload));
    }
}
