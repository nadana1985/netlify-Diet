import { Component } from './Component.js';

export class ForensicSection extends Component {
    constructor(store) {
        super(store);
        this.subscribe(['meta', 'dailyLogs', 'supportLogs']);
    }

    onMount() {
        const date = this.store.state.biologicalDate;
        const slots = ['juice', 'lunch', 'dinner'];

        // 1. Bind Radio Changes (for Textarea visibility)
        slots.forEach(slot => {
            const container = this.element.querySelector(`#forensic-card-${slot}`);
            if (!container) return;

            container.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const val = e.target.value;
                    const inputDiv = container.querySelector('.actual-input');
                    if (val === 'DIFFERENT' || val === 'PARTIAL') {
                        inputDiv.classList.remove('hidden');
                    } else {
                        inputDiv.classList.add('hidden');
                    }
                });
            });
        });

        // 2. Global Save
        const btnSave = this.element.querySelector('#btn-save-all-forensic');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                let savedCount = 0;
                slots.forEach(slot => {
                    const container = this.element.querySelector(`#forensic-card-${slot}`);
                    const status = container.querySelector(`input[name="status-${slot}"]:checked`)?.value;

                    if (status) {
                        let actual = [];
                        if (status === 'DIFFERENT' || status === 'PARTIAL') {
                            const raw = container.querySelector('textarea').value;
                            if (raw) actual = raw.split(',').map(s => s.trim()).filter(s => s);
                        }

                        this.store.dispatch('LOG_FORENSIC', {
                            date: date,
                            slot: slot,
                            data: {
                                status: status,
                                actual_consumed: actual,
                            }
                        });
                        savedCount++;
                    }
                });

                if (savedCount === 0) {
                    const btn = this.element.querySelector('#btn-save-all-forensic');
                    const originalText = btn.innerText;
                    btn.innerText = "⚠️ Mark at least one item";
                    btn.style.background = "var(--status-warning-text)";
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.background = "";
                    }, 2000);
                } else {
                    const btn = this.element.querySelector('#btn-save-all-forensic');
                    const originalText = btn.innerText;
                    btn.innerText = "✅ Saved";
                    btn.style.background = "var(--status-success-text)";
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.background = "";
                    }, 1500);
                }
            });
        }
    }

    render() {
        const { progressPercent } = this.store.state.meta;
        const dailyLogs = this.store.state.dailyLogs.records || {};
        const date = this.store.state.biologicalDate;

        // 1. Gating Check
        if (progressPercent < 100) {
            return `
                <div class="forensic-locked">
                    <div class="lock-icon">🔒</div>
                    <h3>Forensic Mode Locked</h3>
                    <p>Complete all daily execution tasks to unlock.</p>
                    <div class="progress-bar">
                        <div class="fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">${progressPercent}% Complete</div>
                </div>
            `;
        }

        // 2. Unlocked Content - Dynamic Protocol
        const plan = this.store.getDailyPlan(date);

        // Helper to normalize
        const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);

        const slots = [
            { id: 'juice', label: 'Morning Juice', rec: plan ? toArr(plan.juice) : ['Loading Protocol...'] },
            { id: 'lunch', label: 'Lunch', rec: plan ? toArr(plan.lunch) : ['Loading Protocol...'] },
            { id: 'dinner', label: 'Dinner', rec: plan ? toArr(plan.dinner) : ['Loading Protocol...'] }
        ];

        return `
            <div class="forensic-container">
                <div style="text-align:center; padding: 8px 0 12px 0;">
                    <div style="font-size: 0.9rem; font-weight: 800; color: var(--primary-color); letter-spacing: 0.5px; text-transform: uppercase;">
                        PROTOCOL FOR ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    ${plan ? `
                        <div style="display:inline-block; margin-top:4px; background: var(--status-success-bg); color: var(--status-success-text); font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; font-weight: 700; border: 1px solid #a9dfbf;">
                            DAY ${plan.day} • ${plan.type.toUpperCase()}
                        </div>
                    ` : ''}
                </div>

                <style>
                    /* COMPACT FORENSIC LAYOUT */
                    .forensic-locked { text-align: center; padding: 30px 20px; color: #7f8c8d; }
                    .lock-icon { font-size: 2.5rem; margin-bottom: 10px; opacity: 0.5; }
                    .progress-bar { height: 6px; background: #eee; border-radius: 3px; margin: 15px 0; overflow: hidden; }
                    .fill { height: 100%; background: var(--accent-color); transition: width 0.3s ease; }

                    .f-card { 
                        position: relative;
                        padding: 10px 0;
                        border-bottom: 1px dashed #e0e0e0;
                    }
                    .f-card:last-child { border-bottom: none; }
                    
                    .f-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                    
                    /* Label with arrow */
                    .f-label { 
                        font-weight: 700; color: var(--primary-color); font-size: 0.9rem; 
                        display: flex; align-items: center; 
                    }
                    .f-arrow { color: var(--accent-color); margin-right: 6px; font-size: 0.8rem; }
                    
                    .status-pill { 
                        font-size: 0.7rem; font-weight: 700; text-transform: uppercase; 
                        padding: 2px 6px; border-radius: 4px; background: #eee; color: #95a5a6;
                    }
                    .status-pill.FOLLOWED { background: #d4efdf; color: #27ae60; }
                    .status-pill.PARTIAL { background: #fbeee6; color: #d35400; }
                    .status-pill.DIFFERENT { background: #fadbd8; color: #c0392b; }
                    .status-pill.SKIPPED { background: #ebf5fb; color: #7f8c8d; }

                    /* Protocol Text */
                    .f-proto { 
                        font-family: Consolas, Monaco, "Andale Mono", monospace; 
                        font-size: 0.85rem; 
                        color: #2c3e50; 
                        background: #f8f9f9; 
                        padding: 8px 12px; 
                        border-radius: 4px; 
                        border: 1px solid #e0e0e0;
                        margin-bottom: 10px; 
                        margin-left: 20px; 
                        line-height: 1.5;
                        box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
                    }
                    
                    /* Radio Visuals */
                    .f-radios { display: flex; gap: 12px; padding-left: 18px; flex-wrap: wrap; margin-bottom: 5px; }
                    .r-opt { display: flex; align-items: center; cursor: pointer; font-size: 0.8rem; color: #666; }
                    .r-opt input { margin-right: 4px; accent-color: var(--primary-color); }
                    .r-opt:hover { color: var(--primary-color); }
                    
                    /* Input Area */
                    .actual-input { margin-top: 8px; padding-left: 18px; }
                    .actual-input textarea { 
                        width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; 
                        font-family: inherit; font-size: 0.85rem; resize: vertical; min-height: 50px;
                    }
                    .hidden { display: none; }

                    /* Action Bar */
                    .action-bar { margin-top: 20px; padding-top: 15px; border-top: 2px solid #eee; text-align: center; }
                    #btn-save-all-forensic { 
                        background: var(--primary-color); color: white; border: none; 
                        padding: 12px 30px; border-radius: 6px; font-weight: 600; cursor: pointer; 
                        font-size: 0.95rem; width: 100%; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        transition: background 0.2s;
                    }
                    #btn-save-all-forensic:hover { background: var(--secondary-color); }
                </style>

                ${slots.map(slot => {
            const record = dailyLogs[slot.id];
            const status = record ? record.status : null;
            const actualText = record && record.actual_consumed ? record.actual_consumed.join(', ') : '';

            const chk = (val) => status === val ? 'checked' : '';
            const showInput = (status === 'DIFFERENT' || status === 'PARTIAL') ? '' : 'hidden';

            return `
                        <div class="f-card" id="forensic-card-${slot.id}">
                            <div class="f-row">
                                <div class="f-label"><span class="f-arrow">▸</span> ${slot.label}</div>
                                <div class="status-pill ${status || ''}">${status || 'PENDING'}</div>
                            </div>
                            
                            <div class="f-proto">${slot.rec.join(', ')}</div>

                            <div class="f-radios">
                                <label class="r-opt"><input type="radio" name="status-${slot.id}" value="FOLLOWED" ${chk('FOLLOWED')}> Followed</label>
                                <label class="r-opt"><input type="radio" name="status-${slot.id}" value="PARTIAL" ${chk('PARTIAL')}> Partial</label>
                                <label class="r-opt"><input type="radio" name="status-${slot.id}" value="DIFFERENT" ${chk('DIFFERENT')}> Different</label>
                                <label class="r-opt"><input type="radio" name="status-${slot.id}" value="SKIPPED" ${chk('SKIPPED')}> Skipped</label>
                            </div>

                            <div class="actual-input ${showInput}">
                                <textarea placeholder="Describe intake...">${actualText}</textarea>
                            </div>
                        </div>
                    `;
        }).join('')}

                <div class="action-bar">
                    <button id="btn-save-all-forensic">💾 Save Forensic Log</button>
                </div>
            </div>
        `;
    }
}
