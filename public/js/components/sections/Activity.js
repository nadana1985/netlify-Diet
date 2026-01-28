import { Component } from '../Component.js';

export class ActivitySection extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['supportLogs', 'currentTime', 'meta']);
    }

    onMount() {
        const { meta } = this.facade.getSanitizedState();
        if (meta.isReadOnly) return;

        // Toggle Time Inputs based on Status
        this.element.querySelectorAll('input[name="gym-status"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const timeRow = this.element.querySelector('#gym-time-row');
                if (e.target.value === 'COMPLETED') {
                    timeRow.style.opacity = '1';
                    timeRow.style.pointerEvents = 'auto';
                } else {
                    timeRow.style.opacity = '0.4';
                    timeRow.style.pointerEvents = 'none';
                }
            });
        });

        // SINGLE SAVE ACTIONS
        const btnSave = this.element.querySelector('#btn-save-activity');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                // 1. Capture State
                const updates = [];

                // Gym
                const gymChoice = this.element.querySelector('input[name="gym-status"]:checked');
                if (gymChoice) {
                    const status = gymChoice.value;
                    const s = this.element.querySelector('#gym-start').value;
                    const e = this.element.querySelector('#gym-end').value;

                    const metadata = {};
                    if (status === 'COMPLETED' && (s < "09:00" || e > "10:00")) {
                        metadata.note = "outside_protocol_window";
                    }

                    updates.push({
                        type: 'gym',
                        data: {
                            status: status,
                            start_time: status === 'COMPLETED' ? s : null,
                            end_time: status === 'COMPLETED' ? e : null,
                            timestamp: new Date().toISOString()
                        },
                        meta: metadata
                    });
                }

                // Walks
                ['lunch', 'dinner'].forEach(id => {
                    const choice = this.element.querySelector(`input[name="walk-${id}-status"]:checked`);
                    if (choice) {
                        const status = choice.value;
                        updates.push({
                            type: `walking_${id}`,
                            data: {
                                status: status,
                                duration_minutes: status === 'COMPLETED' ? (id === 'lunch' ? 15 : 10) : 0,
                                timestamp: new Date().toISOString()
                            }
                        });
                    }
                });

                // 2. Dispatch
                if (updates.length > 0) {
                    updates.forEach(u => this.facade.logSupport(u.type, u.data, u.meta));

                    btnSave.innerText = "Saved";
                    setTimeout(() => btnSave.innerText = "Update Activity Record", 1500);
                } else {
                    alert("Nothing selected to log.");
                }
            });
        }
    }

    render() {
        const { supportLogs, meta } = this.facade.getSanitizedState();
        const protos = supportLogs.protocols || {};
        const { isReadOnly } = meta;
        const disabledStr = isReadOnly ? 'disabled style="opacity:0.5; pointer-events:none;"' : '';

        // 1. Gym
        const gym = protos['gym'] || {};
        const gymStatus = gym.status || ''; // COMPLETED, MISSED, or empty
        const chkGym = (val) => gymStatus === val ? 'checked' : '';

        // 2. Walks
        const wLunch = protos['walking_lunch'] || {};
        const wDinner = protos['walking_dinner'] || {};
        const chkWalk = (w, val) => w.status === val ? 'checked' : '';

        // Render Helpers
        const renderWalkInputs = (w, label, id) => `
            <div class="walk-card">
                <div class="w-label">${label}</div>
                <div class="toggle-group">
                    <label class="tg-btn"><input type="radio" name="walk-${id}-status" value="COMPLETED" ${chkWalk(w, 'COMPLETED')} ${disabledStr}> Done</label>
                    <label class="tg-btn"><input type="radio" name="walk-${id}-status" value="MISSED" ${chkWalk(w, 'MISSED')} ${disabledStr}> Missed</label>
                </div>
            </div>
        `;

        // If ReadOnly, we just show state... actually for forensic simplicity, let's keep inputs disabled if read-only, 
        // but maybe just hide the Save button.

        return `
            <div class="section-content">
                <style>
                    .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { font-weight: 600; color: var(--secondary-color); font-size: 0.9rem; margin-top:5px; flex:0 0 80px;}
                    
                    .action-bar { margin-top: 15px; text-align: right; }
                    .pro-btn { 
                        background: #34495e; color: white; border: none; padding: 8px 20px; 
                        border-radius: 4px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: background 0.2s;
                    }
                    .pro-btn:hover { background: #2c3e50; }

                    .time-input { padding: 5px; border: 1px solid #ddd; border-radius: 4px; width: 70px; }
                    .flex-row { display: flex; align-items: center; }
                    .flex-column { display: flex; flex-direction: column; }
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }

                    .toggle-group { display: flex; gap: 5px; }
                    .tg-btn { 
                        font-size: 0.8rem; border: 1px solid #ddd; padding: 4px 8px; border-radius: 4px; cursor: pointer; background: #fff; color: #555;
                        display: flex; align-items: center; gap: 4px; flex:1; justify-content:center;
                    }
                    .tg-btn:hover { background: #f9f9f9; }
                    .tg-btn input { margin:0; margin-right:4px; }

                    .walk-card { border: 1px solid #eee; padding: 8px; border-radius: 6px; background: #fafafa; }
                    .w-label { font-size: 0.85rem; font-weight: 600; color: #2c3e50; margin-bottom: 5px; }
                </style>

                <!-- Gym -->
                <div class="row">
                    <div class="label">Gym</div>
                    <div style="flex:1;">
                         <div class="flex-column">
                            <div style="font-size:0.8rem; color:#95a5a6; margin-bottom:5px;">Protocol: 09:00 - 10:00</div>
                            <div class="toggle-group" style="margin-bottom:8px;">
                                <label class="tg-btn"><input type="radio" name="gym-status" value="COMPLETED" ${chkGym('COMPLETED')} ${disabledStr}> Done</label>
                                <label class="tg-btn"><input type="radio" name="gym-status" value="MISSED" ${chkGym('MISSED')} ${disabledStr}> Missed</label>
                            </div>
                            <div class="flex-row" id="gym-time-row" style="transition:0.2s; ${gymStatus === 'MISSED' ? 'opacity:0.4; pointer-events:none;' : ''}">
                                <input type="time" id="gym-start" value="${gym.start_time || '09:00'}" class="time-input" ${disabledStr}>
                                <span style="font-size:0.8rem; margin:0 5px;">to</span>
                                <input type="time" id="gym-end" value="${gym.end_time || '10:00'}" class="time-input" ${disabledStr}>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Walks -->
                <div class="row">
                    <div class="label">Walks</div>
                    <div class="grid-2">
                        ${renderWalkInputs(wLunch, "Post-Lunch (15m)", "lunch")}
                        ${renderWalkInputs(wDinner, "Post-Dinner (10m)", "dinner")}
                    </div>
                </div>

                <!-- Section Save -->
                ${!isReadOnly ? `
                    <div class="action-bar">
                        <button id="btn-save-activity" class="pro-btn">Update Activity Record</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
}
