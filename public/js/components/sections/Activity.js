import { Component } from '../Component.js';

export class ActivitySection extends Component {
    constructor(store) {
        super(store);
        this.subscribe(['supportLogs', 'currentTime']);
    }

    validateGymTime(start, end) {
        if (!start || !end) return { valid: false, msg: 'Enter times' };
        if (start < "09:00" || end > "10:00") return { valid: false, msg: 'Review Plan (Window 09:00-10:00)' };
        return { valid: true, msg: 'Perfect' };
    }

    onMount() {
        // Gym Logic
        const btnGym = this.element.querySelector('#btn-log-gym');
        if (btnGym) {
            btnGym.addEventListener('click', () => {
                const s = this.element.querySelector('#gym-start').value;
                const e = this.element.querySelector('#gym-end').value;
                const val = this.validateGymTime(s, e);

                const status = val.valid ? 'COMPLETED' : 'PARTIAL'; // Tag partial if outside window but logged?
                // Spec says: "Outside window... will be flagged".
                // Let's log it as is.

                this.store.dispatch('LOG_SUPPORT', {
                    date: this.store.state.biologicalDate,
                    id: 'gym',
                    data: { status: 'COMPLETED', start_time: s, end_time: e, validity: val.valid ? 'VALID' : 'OUTSIDE_WINDOW' }
                });
            });
        }

        // Walk Logic
        const bindWalk = (id, duration) => {
            const btn = this.element.querySelector(`#btn-log-${id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.store.dispatch('LOG_SUPPORT', {
                        date: this.store.state.biologicalDate,
                        id: `walking_${id}`,
                        data: { status: 'COMPLETED', duration_minutes: duration, timestamp: new Date().toISOString() }
                    });
                });
            }
        };
        bindWalk('lunch', 15);
        bindWalk('dinner', 10);
    }

    render() {
        const protos = this.store.state.supportLogs.protocols || {};

        // 1. Gym
        const gym = protos['gym'] || {};
        let gymHtml = '';
        if (gym.status === 'COMPLETED') {
            const badgeClass = gym.validity === 'VALID' ? 'success' : 'warning';
            gymHtml = `<div class="status-badge ${badgeClass}">Gym: ${gym.start_time}-${gym.end_time}</div>`;
        } else {
            gymHtml = `
                <div class="flex-column">
                    <div style="font-size:0.8rem; color:#95a5a6; margin-bottom:5px;">Window: 09:00 - 10:00</div>
                    <div class="flex-row">
                        <input type="time" id="gym-start" value="09:00" class="time-input">
                        <span style="font-size:0.8rem; margin:0 5px;">to</span>
                        <input type="time" id="gym-end" value="10:00" class="time-input">
                    </div>
                    <button id="btn-log-gym" class="action-btn" style="width:100%; margin-top:5px; background:#27ae60;">Log Session</button>
                </div>
             `;
        }

        // 2. Walks
        const wLunch = protos['walking_lunch'] || {};
        const wDinner = protos['walking_dinner'] || {};

        const renderWalk = (w, label, id) => {
            if (w.status === 'COMPLETED') return `<div class="status-badge success">✓ ${label}</div>`;
            return `<button id="btn-log-${id}" class="sm-btn" style="width:100%; text-align:left;">Log ${label}</button>`;
        };

        return `
            <div class="section-content">
                <style>
                    .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { font-weight: 600; color: var(--secondary-color); font-size: 0.9rem; margin-top:5px; }
                    .action-btn { color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: 500; cursor: pointer; }
                    .status-badge { font-size: 0.85rem; font-weight: 700; padding: 5px 10px; border-radius: 15px; display:inline-block;}
                    .status-badge.success { color: #27ae60; background: #e8f8f5; }
                    .status-badge.warning { color: #d35400; background: #fbeee6; }
                    .time-input { padding: 5px; border: 1px solid #ddd; border-radius: 4px; width: 70px; }
                    .sm-btn { padding: 8px; background: white; border: 1px solid #bdc3c7; border-radius: 4px; cursor: pointer; color: #2c3e50; font-weight:500; }
                    .sm-btn:hover { background: #f4f6f7; }
                    .flex-row { display: flex; align-items: center; }
                    .flex-column { display: flex; flex-direction: column; }
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
                </style>

                <!-- Gym -->
                <div class="row">
                    <div class="label" style="flex:0 0 80px;">Gym</div>
                    <div style="flex:1;">${gymHtml}</div>
                </div>

                <!-- Walks -->
                <div class="row">
                    <div class="label" style="flex:0 0 80px;">Walks</div>
                    <div class="grid-2">
                        ${renderWalk(wLunch, "Post-Lunch (15m)", "lunch")}
                        ${renderWalk(wDinner, "Post-Dinner (10m)", "dinner")}
                    </div>
                </div>
            </div>
        `;
    }
}
