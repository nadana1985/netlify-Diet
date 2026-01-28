import { Component } from '../Component.js';

export class ShutdownSection extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['supportLogs', 'currentTime', 'meta']);
    }

    onMount() {
        const { meta } = this.facade.getSanitizedState();
        if (meta.isReadOnly) return;

        const btnSave = this.element.querySelector('#btn-save-shutdown');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                // 1. Capture State
                const updates = [];

                // Psyllium
                const psyChoice = this.element.querySelector('input[name="psy-status"]:checked');
                if (psyChoice) {
                    updates.push({
                        type: 'psyllium',
                        data: { status: psyChoice.value, timestamp: new Date().toISOString() }
                    });
                }

                // Sleep
                const bedTime = this.element.querySelector('#input-bed').value;
                if (bedTime) {
                    updates.push({
                        type: 'sleep',
                        data: { bed_time: bedTime }
                    });
                }

                // 2. Dispatch
                if (updates.length > 0) {
                    updates.forEach(u => this.facade.logSupport(u.type, u.data));

                    btnSave.innerText = "Saved";
                    setTimeout(() => btnSave.innerText = "Update Shutdown Record", 1500);
                } else {
                    alert("Nothing entered.");
                }
            });
        }
    }

    render() {
        const { supportLogs, meta } = this.facade.getSanitizedState();
        const protos = supportLogs.protocols || {};
        const { isReadOnly } = meta;
        const disabledStr = isReadOnly ? 'disabled style="opacity:0.5; pointer-events:none;"' : '';

        // 1. Psyllium
        const psy = protos['psyllium'] || {};
        const chkPsy = (val) => psy.status === val ? 'checked' : '';

        // 2. Sleep
        const sleep = protos['sleep'] || {};
        const bedTime = sleep.bed_time || '22:30';

        return `
            <div class="section-content">
                <style>
                    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { font-weight: 600; color: var(--secondary-color); font-size: 0.9rem; }
                    
                    .toggle-group { display: flex; gap: 4px; }
                    .tg-btn { 
                        font-size: 0.75rem; border: 1px solid #ddd; padding: 3px 6px; border-radius: 4px; cursor: pointer; background: #fff; color: #555;
                        display: flex; align-items: center; gap: 4px;
                    }
                    .tg-btn:hover { background: #f9f9f9; }
                    .tg-btn input { margin: 0; margin-right:4px; }
                    
                    .time-input { padding: 5px; border: 1px solid #ddd; border-radius: 4px; width: 80px; text-align:center; }

                    .action-bar { margin-top: 15px; text-align: right; }
                    .pro-btn { 
                        background: #8e44ad; color: white; border: none; padding: 8px 20px; 
                        border-radius: 4px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: background 0.2s;
                    }
                    .pro-btn:hover { background: #732d91; }
                </style>

                <!-- Psyllium -->
                <div class="row">
                    <div class="label">Psyllium Husk</div>
                    <div class="toggle-group">
                        <label class="tg-btn"><input type="radio" name="psy-status" value="TAKEN" ${chkPsy('TAKEN')} ${disabledStr}> Taken</label>
                        <label class="tg-btn"><input type="radio" name="psy-status" value="MISSED" ${chkPsy('MISSED')} ${disabledStr}> Missed</label>
                    </div>
                </div>

                <!-- Sleep -->
                <div class="row">
                    <div class="label">Bed Time</div>
                    <div>
                        <input type="time" id="input-bed" value="${bedTime}" class="time-input" ${disabledStr}>
                    </div>
                </div>
                
                <div style="margin-top:20px; font-size:0.8rem; color:#95a5a6; text-align:center;">
                    Biological day ends at 3:00 AM.
                </div>

                <!-- Section Save -->
                 ${!isReadOnly ? `
                    <div class="action-bar">
                        <button id="btn-save-shutdown" class="pro-btn">Update Shutdown Record</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
}
