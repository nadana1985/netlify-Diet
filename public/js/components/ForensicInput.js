import { Component } from './Component.js';

export class ForensicInput extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['meta', 'dailyLogs', 'dailyProtocol']);
    }

    onMount() {
        const { meta } = this.facade.getSanitizedState();
        if (meta.isReadOnly) return;

        // 1. Details Toggle (for substituted inputs)
        this.element.querySelectorAll('.f-card').forEach(card => {
            card.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const val = e.target.value;
                    const inputDiv = card.querySelector('.actual-input');
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
                // 1. Capture all DOM state first (Before any dispatch triggers a re-render)
                const updates = [];
                const { dailyProtocol } = this.facade.getSanitizedState();

                if (dailyProtocol && dailyProtocol.meals) {
                    dailyProtocol.meals.forEach(item => {
                        const container = this.element.querySelector(`#forensic-card-${item.id}`);
                        if (!container) return;

                        const statusInput = container.querySelector(`input[name="status-${item.id}"]:checked`);
                        if (statusInput) {
                            const status = statusInput.value;
                            let actual = [];
                            if (status === 'DIFFERENT' || status === 'PARTIAL') {
                                const raw = container.querySelector('textarea').value;
                                if (raw) actual = raw.split(',').map(s => s.trim()).filter(s => s);
                            }
                            updates.push({ id: item.id, status, actual });
                        }
                    });
                }

                // 2. Dispatch updates
                if (updates.length > 0) {
                    updates.forEach(u => this.facade.logForensic(u.id, u.status, u.actual));

                    // Feedback
                    const originalText = btnSave.innerText;
                    btnSave.innerText = "✅ Saved";
                    btnSave.style.background = "#27ae60";

                    setTimeout(() => {
                        btnSave.innerText = originalText;
                        btnSave.style.background = ""; // Revert to CSS default
                    }, 1500);
                } else {
                    alert("No changes to save.");
                }
            });
        }
    }

    render() {
        const { dailyLogs, dailyProtocol, meta } = this.facade.getSanitizedState();
        const { isReadOnly } = meta;
        const records = dailyLogs.records || {};

        if (!dailyProtocol) {
            return `<div style="padding:20px; text-align:center; color:#999;">No Protocol Defined</div>`;
        }

        return `
            <div class="forensic-input-container">
                <!-- MEAL SLOTS GRID -->
                <div class="meals-grid">
                    ${dailyProtocol.meals.map(item => {
            const record = records[item.id];
            const status = record ? record.status : null;
            const actualText = record && record.actual_consumed ? record.actual_consumed.join(', ') : '';

            const chk = (val) => status === val ? 'checked' : '';
            const showInput = (status === 'DIFFERENT' || status === 'PARTIAL') ? '' : 'hidden';
            const disabledStr = isReadOnly ? 'disabled' : '';

            // Menu List HTML
            const menuHtml = item.items.map(dish => `<li>${dish}</li>`).join('');

            return `
                            <div class="f-card" id="forensic-card-${item.id}" data-slot="${item.id}">
                                <div class="f-header">
                                    <div class="f-title">${item.label}</div>
                                    <div class="status-pill ${status || ''}">${status || 'PENDING'}</div>
                                </div>
                                
                                <div class="planned-menu">
                                    <ul>${menuHtml}</ul>
                                </div>

                                <div class="adherence-section">
                                    <div class="q-label">Adherence?</div>
                                    <div class="f-radios">
                                        <label class="r-opt"><input type="radio" name="status-${item.id}" value="FOLLOWED" ${chk('FOLLOWED')} ${disabledStr}> Followed</label>
                                        <label class="r-opt"><input type="radio" name="status-${item.id}" value="PARTIAL" ${chk('PARTIAL')} ${disabledStr}> Partial</label>
                                        <label class="r-opt"><input type="radio" name="status-${item.id}" value="DIFFERENT" ${chk('DIFFERENT')} ${disabledStr}> Diff</label>
                                        <label class="r-opt"><input type="radio" name="status-${item.id}" value="SKIPPED" ${chk('SKIPPED')} ${disabledStr}> Skip</label>
                                    </div>
                                </div>

                                <div class="actual-input ${showInput}">
                                    <textarea placeholder="Notes..." ${disabledStr}>${actualText}</textarea>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>

                <!-- SAVE ACTION -->
                ${!isReadOnly ? `
                    <div class="action-bar">
                        <button id="btn-save-all-forensic">💾 SAVE LOG</button>
                    </div>
                ` : `
                    <div style="text-align:center; padding:10px; color:#95a5a6; font-style:italic; font-size:0.8rem;">
                        <span style="font-size:1rem;">🔒</span> Read-Only
                    </div>
                `}

                <style>
                    .meals-grid {
                        display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 0 5px; margin-bottom: 10px;
                    }
                    @media (max-width: 900px) { .meals-grid { grid-template-columns: 1fr; } }

                    .f-card { 
                        position: relative; padding: 10px; 
                        background: #fff; border: 1px solid #eee; border-radius: 8px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                        display: flex; flex-direction: column;
                    }
                    
                    .f-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                    .f-title { font-weight: 800; color: var(--primary-color); font-size: 0.9rem; }
                    
                    .planned-menu { 
                        background: #f8f9f9; padding: 6px; border-radius: 6px; border: 1px solid #eee; margin-bottom: 8px; 
                        flex-grow: 1; max-height: 80px; overflow-y: auto;
                    }
                    .planned-menu ul { margin: 0; padding-left: 15px; color: #34495e; font-family: 'Inter', sans-serif; font-size: 0.75rem; }
                    .planned-menu li { margin-bottom: 2px; line-height: 1.25; }

                    .adherence-section { margin-bottom: 6px; }
                    .q-label { font-size: 0.65rem; font-weight: 700; color: #95a5a6; margin-bottom: 4px; text-transform: uppercase; }

                    .f-radios { display: flex; flex-direction: column; gap: 3px; }
                    .r-opt { 
                        display: flex; align-items: center; cursor: pointer; font-size: 0.75rem; color: #555; 
                        padding: 3px 6px; border-radius: 4px; transition: background 0.1s;
                    }
                    .r-opt:hover { background: #f4f6f7; }
                    .r-opt input { margin-right: 6px; accent-color: var(--primary-color); transform: scale(0.9); }

                    .actual-input { margin-top: 6px; }
                    .actual-input textarea { width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 0.8rem; height: 40px;}
                    .hidden { display: none; }

                    .status-pill { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 3px; background: #eee; color: #95a5a6; }
                    .status-pill.FOLLOWED { background: #d4efdf; color: #27ae60; }
                    .status-pill.PARTIAL { background: #fbeee6; color: #d35400; }
                    .status-pill.DIFFERENT { background: #fadbd8; color: #c0392b; }
                    .status-pill.SKIPPED { background: #ebf5fb; color: #7f8c8d; }

                    .action-bar { padding: 15px; text-align: center; }
                    #btn-save-all-forensic { 
                        background: #34495e; color: white; border: none; 
                        padding: 10px 30px; border-radius: 4px; font-weight: 700; cursor: pointer; 
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: background 0.2s; font-size: 0.9rem;
                    }
                    #btn-save-all-forensic:hover { background: #2c3e50; }
                </style>
            </div>
        `;
    }
}
