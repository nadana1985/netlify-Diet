import { Component } from '../Component.js';

export class MorningSection extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['supportLogs', 'meta']);
    }

    onMount() {
        const { meta } = this.facade.getSanitizedState();
        if (meta.isReadOnly) return;

        const btnSave = this.element.querySelector('#btn-save-morning');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                // 1. Capture State
                const updates = [];

                // Sleep
                const hours = this.element.querySelector('#input-sleep-hours').value;
                const window = this.element.querySelector('#input-sleep-window').value;
                const reason = this.element.querySelector('#input-sleep-reason').value;
                if (hours) {
                    updates.push({ type: 'sleep', data: { hours, window, reason } });
                }

                // Water
                const waterChoice = this.element.querySelector('input[name="water-status"]:checked');
                if (waterChoice) {
                    updates.push({ type: 'water', data: { status: waterChoice.value, timestamp: new Date().toISOString() } });
                }

                // Coffee
                const coffeeChoice = this.element.querySelector('input[name="coffee-status"]:checked');
                if (coffeeChoice) {
                    updates.push({ type: 'black_coffee', data: { status: coffeeChoice.value, timestamp: new Date().toISOString() } });
                }

                // 2. Dispatch
                if (updates.length > 0) {
                    updates.forEach(u => {
                        if (u.type === 'sleep') this.facade.logSleep(u.data);
                        else this.facade.logSupport(u.type, u.data);
                    });

                    btnSave.innerText = "Saved";
                    setTimeout(() => btnSave.innerText = "Update Morning Record", 1500);
                } else {
                    alert("Nothing entered to record.");
                }
            });
        }
    }

    render() {
        const { supportLogs, meta } = this.facade.getSanitizedState();
        const protos = supportLogs.protocols || {};
        const { isReadOnly } = meta;
        const disabledStr = isReadOnly ? 'disabled style="opacity:0.5; pointer-events:none;"' : '';

        // 1. Water
        const water = protos['water'] || {};
        const chkWater = (val) => water.status === val ? 'checked' : '';

        // 2. Sleep
        const sleep = protos['sleep'] || {};
        const sleepHours = sleep.hours || '';
        const sleepWindow = sleep.window || '';
        const sleepReason = sleep.reason || '';

        // 3. Coffee
        const coffee = protos['black_coffee'] || {};
        const chkCoffee = (val) => coffee.status === val ? 'checked' : '';

        return `
            <div class="section-content">
                <style>
                    .compact-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; }
                    .compact-row:last-child { border-bottom: none; }
                    .c-label { font-weight: 700; color: #2c3e50; font-size: 0.9rem; flex: 0 0 120px; }
                    .c-meta { font-size: 0.75rem; color: #95a5a6; margin-right: 10px; }
                    
                    .toggle-group { display: flex; gap: 4px; }
                    .tg-btn { 
                        font-size: 0.75rem; border: 1px solid #ddd; padding: 3px 6px; border-radius: 4px; cursor: pointer; background: #fff; color: #555;
                        display: flex; align-items: center; gap: 4px;
                    }
                    .tg-btn:hover { background: #f9f9f9; }
                    .tg-btn input { margin: 0; margin-right:4px; }
                    
                    .sleep-form.horizontal-form { 
                        display: flex; gap: 10px; align-items: flex-end; 
                        background: #fafafa; padding: 10px; border-radius: 6px; border: 1px solid #eee; margin-bottom: 10px;
                    }
                    .h-field { display: flex; flex-direction: column; gap: 4px; }
                    .h-field.grow { flex: 1; }
                    .h-field label { font-size: 0.7rem; font-weight: 600; color: #7f8c8d; }
                    .f-input { padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; width: 100%; min-width: 80px; }
                    
                    .action-bar { margin-top: 15px; text-align: right; }
                    .pro-btn { 
                        background: #34495e; color: white; border: none; padding: 8px 20px; 
                        border-radius: 4px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: background 0.2s;
                    }
                    .pro-btn:hover { background: #2c3e50; }

                    @media (max-width: 600px) {
                        .sleep-form.horizontal-form { flex-direction: column; align-items: stretch; }
                        .compact-row { flex-direction: column; align-items: flex-start; gap: 5px; }
                    }
                </style>

                <!-- Sleep Deficit (Horizontal) -->
                <div style="margin-bottom:10px;">
                    <div style="font-size:0.7em; color:#ccc; float:right;">View: ${meta.viewDate || 'Today'}</div>
                    <div style="font-size:0.8rem; font-weight:700; color:#2c3e50; margin-bottom:4px;">Sleep Data (Previous Night)</div>
                    <div class="sleep-form horizontal-form">
                        <div class="h-field">
                            <label>Total Hours</label>
                            <input type="number" id="input-sleep-hours" class="f-input" step="0.5" placeholder="e.g. 6.5" value="${sleepHours}" ${disabledStr}>
                        </div>
                        <div class="h-field">
                            <label>Window</label>
                            <input type="text" id="input-sleep-window" class="f-input" placeholder="e.g. 23:00 - 06:00" value="${sleepWindow}" ${disabledStr}>
                        </div>
                        <div class="h-field grow">
                            <label>Primary Reason (< 6h)</label>
                            <input type="text" id="input-sleep-reason" class="f-input" placeholder="Reason..." value="${sleepReason}" ${disabledStr}>
                        </div>
                    </div>
                </div>

                <!-- Hydration -->
                <div class="compact-row">
                    <div class="c-label">Morning Hydration <span class="c-meta">(500ml)</span></div>
                    <div class="toggle-group">
                        <label class="tg-btn"><input type="radio" name="water-status" value="TAKEN" ${chkWater('TAKEN')} ${disabledStr}> 500ml</label>
                        <label class="tg-btn"><input type="radio" name="water-status" value="PARTIAL" ${chkWater('PARTIAL')} ${disabledStr}> Partial</label>
                        <label class="tg-btn"><input type="radio" name="water-status" value="SKIPPED" ${chkWater('SKIPPED')} ${disabledStr}> None</label>
                    </div>
                </div>
                
                <!-- Coffee -->
                <div class="compact-row">
                    <div class="c-label">Black Coffee <span class="c-meta">(Optional)</span></div>
                    <div class="toggle-group">
                        <label class="tg-btn"><input type="radio" name="coffee-status" value="TAKEN" ${chkCoffee('TAKEN')} ${disabledStr}> Had Coffee</label>
                        <label class="tg-btn"><input type="radio" name="coffee-status" value="SKIPPED" ${chkCoffee('SKIPPED')} ${disabledStr}> None</label>
                    </div>
                </div>

                <!-- Section Save -->
                 ${!isReadOnly ? `
                    <div class="action-bar">
                        <button id="btn-save-morning" class="pro-btn">Update Morning Record</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
}
