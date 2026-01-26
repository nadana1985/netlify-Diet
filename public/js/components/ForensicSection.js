import { Component } from './Component.js';

export class ForensicSection extends Component {
    constructor(store) {
        super(store);
        this.subscribe(['meta', 'dailyLogs', 'supportLogs', 'dailyProtocol']);
    }

    onMount() {
        const { isReadOnly } = this.store.state.meta;
        if (isReadOnly) return; // No listeners needed

        // 1. Details Toggle (for substituted inputs)
        this.element.querySelectorAll('.f-card').forEach(card => {
            const slot = card.dataset.slot;
            if (!slot) return;

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
                const date = this.store.state.biologicalDate;

                // Save Context
                const contextVal = this.element.querySelector('#input-context').value;
                this.store.dispatch('LOG_CONTEXT', { date, context: contextVal });

                // Save Slots
                const protocol = this.store.state.dailyProtocol;
                if (protocol && protocol.meals) {
                    protocol.meals.forEach(item => {
                        const container = this.element.querySelector(`#forensic-card-${item.id}`);
                        if (!container) return;

                        const status = container.querySelector(`input[name="status-${item.id}"]:checked`)?.value;

                        // We strictly only save if status is selected. 
                        // If user hasn't touched it, we leave it as pending (or whatever it was).
                        if (status) {
                            let actual = [];
                            if (status === 'DIFFERENT' || status === 'PARTIAL') {
                                const raw = container.querySelector('textarea').value;
                                if (raw) actual = raw.split(',').map(s => s.trim()).filter(s => s);
                            }

                            this.store.dispatch('LOG_FORENSIC', {
                                date: date,
                                slot: item.id,
                                data: {
                                    status: status,
                                    actual_consumed: actual,
                                }
                            });
                        }
                    });
                }

                // Feedback
                const originalText = btnSave.innerText;
                btnSave.innerText = "✅ Saved";
                btnSave.style.background = "var(--status-success-text)"; // Green
                setTimeout(() => {
                    btnSave.innerText = originalText;
                    btnSave.style.background = "";
                }, 1500);
            });
        }
    }

    render() {
        const { score, isReadOnly } = this.store.state.meta;
        const dailyLogs = this.store.state.dailyLogs; // .records, .context
        const records = dailyLogs.records || {};
        const context = dailyLogs.context || "";

        const protocol = this.store.state.dailyProtocol;

        // If no protocol (e.g. Day 31 or before Day 1), show message
        if (!protocol) {
            return `<div style="padding:40px; text-align:center; color:#999;">No Protocol Defined for this Date</div>`;
        }

        // Score Color
        let scoreColor = '#27ae60'; // Green
        if (score.total < 80) scoreColor = '#f1c40f'; // Yellow
        if (score.total < 50) scoreColor = '#e74c3c'; // Red

        // Breakdown HTML
        let breakdownHtml = '';
        if (score.breakdown && score.breakdown.length > 0) {
            breakdownHtml = `
                <div class="score-breakdown">
                    ${score.breakdown.map(b => `
                        <div class="score-loss">
                            <span class="loss-badge">${b.loss}</span> ${b.label} <span style="opacity:0.6">(${b.reason})</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            breakdownHtml = `<div style="font-size:0.8rem; color:#aaa; margin-top:5px;">Perfect Adherence</div>`;
        }

        return `
            <div class="forensic-container">
                
                <!-- COMPACT HEADER GRID -->
                <div class="header-grid">
                    <!-- SCORE COMPONENT -->
                    <div class="compact-score">
                         <div class="score-circle-sm" style="border-color: ${scoreColor}; color: ${scoreColor}">
                            ${score.total}
                        </div>
                        <div class="score-details-sm">
                            <div class="score-title">DAILY SCORE</div>
                            ${breakdownHtml}
                        </div>
                    </div>

                    <!-- CONTEXT COMPONENT (Inline) -->
                     <div class="compact-context">
                        <textarea id="input-context" class="context-input-sm" placeholder="Daily Notes / Context..." ${isReadOnly ? 'disabled' : ''}>${context}</textarea>
                    </div>
                </div>

                <!-- MEAL SLOTS GRID -->
                <div class="meals-grid">
                    ${protocol.meals.map(item => {
            const record = records[item.id];
            const status = record ? record.status : null;
            const actualText = record && record.actual_consumed ? record.actual_consumed.join(', ') : '';

            const chk = (val) => status === val ? 'checked' : '';
            const showInput = (status === 'DIFFERENT' || status === 'PARTIAL') ? '' : 'hidden';
            const disabledStr = isReadOnly ? 'disabled' : '';

            // Menu List HTML (Condensed)
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
                        <button id="btn-save-all-forensic">💾 SAVE</button>
                    </div>
                ` : `
                    <div style="text-align:center; padding:10px; color:#95a5a6; font-style:italic; font-size:0.8rem;">
                        <span style="font-size:1rem;">🔒</span> Read-Only
                    </div>
                `}

                <style>
                    /* GENERIC */
                    .forensic-container { padding-bottom: 20px; }
                    
                    /* COMPACT HEADER */
                    .header-grid { 
                        display: grid; grid-template-columns: 200px 1fr; gap: 15px; 
                        padding: 0 20px; margin-bottom: 15px; align-items: stretch;
                    }
                    @media (max-width: 600px) { .header-grid { grid-template-columns: 1fr; } }

                    .compact-score { 
                        display: flex; align-items: center; background: #fff; 
                        padding: 10px; border-radius: 8px; border: 1px solid #eee; 
                    }
                    .score-circle-sm { 
                        width: 40px; height: 40px; border-radius: 50%; border: 3px solid #ddd; 
                        display: flex; align-items: center; justify-content: center; 
                        font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem;
                        margin-right: 10px;
                    }
                    .score-details-sm { flex: 1; }
                    .score-title { font-size: 0.65rem; font-weight: 700; color: #95a5a6; letter-spacing: 0.5px; }
                    .score-breakdown { font-size: 0.7rem; line-height: 1.2; }
                    
                    .compact-context { display: flex; }
                    .context-input-sm { 
                        flex: 1; border: 1px solid #eee; border-radius: 8px; padding: 10px; 
                        font-family: inherit; font-size: 0.85rem; resize: none;
                        background: #fdfdfd; 
                    }
                    .context-input-sm:focus { background: #fff; border-color: var(--primary-color); outline: none; }

                    /* MEALS GRID */
                    .meals-grid {
                        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 20px;
                    }
                    @media (max-width: 900px) { .meals-grid { grid-template-columns: 1fr; } }

                    /* COMPACT CARDS */
                    .f-card { 
                        position: relative; padding: 12px; 
                        background: #fff; border: 1px solid #eee; border-radius: 8px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                        display: flex; flex-direction: column;
                    }
                    
                    .f-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                    .f-title { font-weight: 800; color: var(--primary-color); font-size: 0.95rem; }
                    
                    /* PLANNED MENU COMPACT */
                    .planned-menu { 
                        background: #f8f9f9; padding: 8px; border-radius: 6px; border: 1px solid #eee; margin-bottom: 10px; 
                        flex-grow: 1; /* Match heights */
                    }
                    .planned-menu ul { margin: 0; padding-left: 15px; color: #34495e; font-family: 'Inter', sans-serif; font-size: 0.8rem; }
                    .planned-menu li { margin-bottom: 2px; line-height: 1.3; }

                    /* ADHERENCE COMPACT */
                    .adherence-section { margin-bottom: 8px; }
                    .q-label { font-size: 0.7rem; font-weight: 700; color: #95a5a6; margin-bottom: 5px; text-transform: uppercase; }

                    .f-radios { display: flex; flex-direction: column; gap: 4px; }
                    .r-opt { 
                        display: flex; align-items: center; cursor: pointer; font-size: 0.8rem; color: #555; 
                        padding: 4px 6px; border-radius: 4px; transition: background 0.1s;
                    }
                    .r-opt:hover { background: #f4f6f7; }
                    .r-opt input { margin-right: 6px; accent-color: var(--primary-color); transform: scale(1.0); }

                    .actual-input { margin-top: 8px; }
                    .actual-input textarea { width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 0.8rem; height: 50px;}
                    .hidden { display: none; }

                    /* PILLS */
                    .status-pill { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; padding: 2px 5px; border-radius: 3px; background: #eee; color: #95a5a6; }
                    .status-pill.FOLLOWED { background: #d4efdf; color: #27ae60; }
                    .status-pill.PARTIAL { background: #fbeee6; color: #d35400; }
                    .status-pill.DIFFERENT { background: #fadbd8; color: #c0392b; }
                    .status-pill.SKIPPED { background: #ebf5fb; color: #7f8c8d; }

                    .action-bar { padding: 15px; text-align: center; }
                    #btn-save-all-forensic { 
                        background: var(--primary-color); color: white; border: none; 
                        padding: 10px 30px; border-radius: 20px; font-weight: 700; cursor: pointer; 
                        box-shadow: 0 2px 8px rgba(39, 174, 96, 0.2); transition: transform 0.2s; font-size: 0.9rem;
                    }
                    #btn-save-all-forensic:hover { transform: translateY(-1px); }
                </style>
            </div>
        `;
    }
}
