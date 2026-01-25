import { Component } from '../Component.js';

export class ShutdownSection extends Component {
    constructor(store) {
        super(store);
        this.subscribe(['supportLogs', 'currentTime']);
    }

    onMount() {
        // Psyllium
        const btnPsy = this.element.querySelector('#btn-log-psy');
        if (btnPsy) {
            btnPsy.addEventListener('click', () => {
                this.store.dispatch('LOG_SUPPORT', {
                    date: this.store.state.biologicalDate,
                    id: 'psyllium',
                    data: { status: 'TAKEN', timestamp: new Date().toISOString() }
                });
            });
        }

        // Sleep
        const btnSleep = this.element.querySelector('#btn-log-sleep');
        if (btnSleep) {
            btnSleep.addEventListener('click', () => {
                const val = this.element.querySelector('#input-bed').value;
                if (val) {
                    this.store.dispatch('LOG_SUPPORT', {
                        date: this.store.state.biologicalDate, // This ensures it counts for "Today" even if logged at 1AM (which is "Today" biologically)
                        id: 'sleep',
                        data: { bed_time: val }
                    });
                }
            });
        }
    }

    render() {
        const protos = this.store.state.supportLogs.protocols || {};

        // 1. Psyllium
        const psy = protos['psyllium'] || {};
        let psyHtml = '';
        if (psy.status === 'TAKEN') {
            psyHtml = `<div class="status-badge success">✓ Consumed</div>`;
        } else {
            psyHtml = `<button id="btn-log-psy" class="action-btn" style="background:#8e44ad;">Log Psyllium Husk</button>`;
        }

        // 2. Sleep
        const sleep = protos['sleep'] || {};
        let sleepHtml = '';
        if (sleep.bed_time) {
            sleepHtml = `<div class="status-badge success">Bed @ ${sleep.bed_time}</div>`;
        } else {
            sleepHtml = `
                <div class="flex-row">
                    <input type="time" id="input-bed" value="22:30" class="time-input">
                    <button id="btn-log-sleep" class="sm-btn">Log Sleep</button>
                </div>
            `;
        }

        return `
            <div class="section-content">
                <style>
                    /* Reusing styles from previous sections implicitly via styles.css or duplicating for isolation if scoped */
                    /* For safety, minimal dup: */
                    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { font-weight: 600; color: var(--secondary-color); font-size: 0.9rem; }
                    .action-btn { color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: 500; cursor: pointer; }
                    .status-badge { font-size: 0.85rem; font-weight: 700; padding: 5px 10px; border-radius: 15px; display:inline-block;}
                    .status-badge.success { color: #8e44ad; background: #f4ecf7; }
                    .time-input { padding: 5px; border: 1px solid #ddd; border-radius: 4px; margin-right: 5px; }
                    .sm-btn { padding: 5px 10px; background: #ecf0f1; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; }
                    .flex-row { display: flex; align-items: center; }
                </style>

                <!-- Psyllium -->
                <div class="row">
                    <div class="label">Psyllium Husk</div>
                    <div>${psyHtml}</div>
                </div>

                <!-- Sleep -->
                <div class="row">
                    <div class="label">Bed Time</div>
                    <div>${sleepHtml}</div>
                </div>
                
                <div style="margin-top:20px; font-size:0.8rem; color:#95a5a6; text-align:center;">
                    Biological day ends at 3:00 AM.
                </div>
            </div>
        `;
    }
}
