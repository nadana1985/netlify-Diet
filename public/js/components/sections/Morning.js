import { Component } from '../Component.js';

export class MorningSection extends Component {
    constructor(store) {
        super(store);
        this.subscribe(['supportLogs', 'currentTime']);
    }

    onMount() {
        // Hydration Logic
        const btnWater = this.element.querySelector('#btn-log-water');
        if (btnWater) {
            btnWater.addEventListener('click', () => {
                this.store.dispatch('LOG_SUPPORT', {
                    date: this.store.state.biologicalDate,
                    id: 'water',
                    data: { status: 'TAKEN', timestamp: new Date().toISOString() }
                });
            });
        }

        // Wake Time Logic
        const btnWake = this.element.querySelector('#btn-save-wake');
        if (btnWake) {
            btnWake.addEventListener('click', () => {
                const val = this.element.querySelector('#input-wake').value;
                if (val) {
                    this.store.dispatch('LOG_SUPPORT', {
                        date: this.store.state.biologicalDate,
                        id: 'sleep',
                        data: { wake_time: val } // Merges into existing
                    });
                }
            });
        }

        // Coffee Logic
        const btnCoffee = this.element.querySelector('#btn-log-coffee');
        if (btnCoffee) {
            btnCoffee.addEventListener('click', () => {
                this.store.dispatch('LOG_SUPPORT', {
                    date: this.store.state.biologicalDate,
                    id: 'black_coffee',
                    data: { status: 'TAKEN', timestamp: new Date().toISOString() }
                });
            });
        }
    }

    render() {
        const date = this.store.state.biologicalDate;
        const protos = this.store.state.supportLogs.protocols || {};

        // 1. Water Status
        const water = protos['water'] || {};
        let waterHtml = '';
        if (water.status === 'TAKEN') {
            waterHtml = `<div class="status-badge success">✓ Hydrated</div>`;
        } else {
            waterHtml = `<button id="btn-log-water" class="action-btn">Log Water (500ml)</button>`;
        }

        // 2. Wake Status
        const sleep = protos['sleep'] || {};
        let wakeHtml = '';
        if (sleep.wake_time) {
            wakeHtml = `<div class="status-badge success">Awake @ ${sleep.wake_time}</div>`;
        } else {
            wakeHtml = `
                <div class="flex-row">
                    <input type="time" id="input-wake" value="07:00" class="time-input">
                    <button id="btn-save-wake" class="sm-btn">Save</button>
                </div>
            `;
        }

        // 3. Coffee Status
        const coffee = protos['black_coffee'] || {};
        let coffeeHtml = '';
        if (coffee.status === 'TAKEN') {
            coffeeHtml = `<div class="status-badge success">✓ Coffee Logged</div>`;
        } else {
            // Check time window (Simple check for now, can be advanced later with 3-day rule)
            // Just show button for now to prove interaction
            coffeeHtml = `<button id="btn-log-coffee" class="action-btn secondary">Log Black Coffee</button>`;
        }

        return `
            <div class="section-content">
                <style>
                    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { font-weight: 600; color: var(--secondary-color); font-size: 0.9rem; }
                    .action-btn { background: var(--accent-color); color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: 500; cursor: pointer; }
                    .action-btn.secondary { background: var(--primary-color); }
                    .status-badge { font-size: 0.85rem; font-weight: 700; color: var(--accent-color); background: #e8f8f5; padding: 5px 10px; border-radius: 15px; }
                    .time-input { padding: 5px; border: 1px solid #ddd; border-radius: 4px; margin-right: 5px; }
                    .sm-btn { padding: 5px 10px; background: #ecf0f1; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; }
                    .flex-row { display: flex; align-items: center; }
                </style>

                <!-- Wake Up -->
                <div class="row">
                    <div class="label">Wake Up Time</div>
                    <div>${wakeHtml}</div>
                </div>

                <!-- Hydration -->
                <div class="row">
                    <div class="label">Morning Hydration</div>
                    <div>${waterHtml}</div>
                </div>
                
                <!-- Coffee -->
                <div class="row">
                    <div class="label">Black Coffee</div>
                    <div>${coffeeHtml}</div>
                </div>
            </div>
        `;
    }
}
