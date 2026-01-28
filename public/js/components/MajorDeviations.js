import { Component } from './Component.js';

export class MajorDeviations extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['dailyLogs', 'meta']);
    }

    onMount() {
        const { meta } = this.facade.getSanitizedState();
        if (meta.isReadOnly) return;

        // Deviation Toggles
        this.element.querySelectorAll('.md-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const type = e.target.dataset.type;
                const detailPanel = this.element.querySelector(`#md-detail-${type}`);
                if (e.target.checked) {
                    detailPanel.classList.remove('hidden');
                } else {
                    detailPanel.classList.add('hidden');
                }
            });
        });

        // Save Button
        const btnSave = this.element.querySelector('#btn-save-deviations');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const deviations = [];

                this.element.querySelectorAll('.md-item').forEach(item => {
                    const chk = item.querySelector('.md-checkbox');
                    if (chk && chk.checked) {
                        const type = chk.dataset.type;
                        const qtyInput = item.querySelector('.md-qty');
                        const timeInput = item.querySelector('.md-time');
                        const noteInput = item.querySelector('.md-note');

                        deviations.push({
                            type: type,
                            quantity: qtyInput ? qtyInput.value : null,
                            time: timeInput ? timeInput.value : null,
                            notes: noteInput ? noteInput.value : null
                        });
                    }
                });

                this.facade.logMajorDeviations(deviations);

                // Feedback
                const originalText = btnSave.innerText;
                btnSave.innerText = "Recorded";
                setTimeout(() => {
                    btnSave.innerText = originalText;
                }, 1000);
            });
        }
    }

    render() {
        const { dailyLogs, meta } = this.facade.getSanitizedState();
        const { isReadOnly } = meta;
        const recordedDeviations = dailyLogs.majorDeviations || [];
        const disabledStr = isReadOnly ? 'disabled' : '';

        const deviationTypes = [
            { id: 'alcohol', label: 'Alcohol Intake', hasQty: true, hasTime: true },
            { id: 'sweets', label: 'Sweets / Dessert', hasQty: true },
            { id: 'outside_food', label: 'Outside Food / Restaurant', hasQty: true },
            { id: 'all_nighter', label: 'All-nighter (Previous Night)', hasTime: false }, // Explicit flag
            { id: 'travel', label: 'Travel Day', hasTime: false },
            { id: 'illness', label: 'Illness / Medication', hasTime: false },
            { id: 'social', label: 'Social Obligation', hasTime: true },
            { id: 'stress', label: 'High Stress Event', hasTime: false },
            { id: 'other', label: 'Other', hasQty: false }
        ];

        // Helper to check if type is logged
        const getLog = (id) => recordedDeviations.find(d => d.type === id);

        return `
            <div class="section-content">
                <div class="md-list">
                    ${deviationTypes.map(type => {
            const log = getLog(type.id);
            const isChecked = !!log;
            const showDetail = isChecked ? '' : 'hidden';

            return `
                            <div class="md-item">
                                <label class="md-label">
                                    <input type="checkbox" class="md-checkbox" data-type="${type.id}" ${isChecked ? 'checked' : ''} ${disabledStr}>
                                    ${type.label}
                                </label>
                                <div id="md-detail-${type.id}" class="md-details ${showDetail}">
                                    ${type.hasQty ? `<input type="text" class="md-input md-qty" placeholder="Quantity/Amount" value="${log?.quantity || ''}" ${disabledStr}>` : ''}
                                    ${type.hasTime ? `<input type="time" class="md-input md-time" value="${log?.time || ''}" ${disabledStr}>` : ''}
                                    <input type="text" class="md-input md-note" placeholder="Reason / Notes" value="${log?.notes || ''}" ${disabledStr}>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>

                ${!isReadOnly ? `
                    <div style="margin-top:20px; text-align:right;">
                        <button id="btn-save-deviations" class="action-btn-primary">Record Deviations</button>
                    </div>
                ` : ''}

                <style>
                    .md-list { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 10px; 
                    }
                    @media (max-width: 600px) { .md-list { grid-template-columns: 1fr; } }
                    
                    .md-item { border: 1px solid #eee; padding: 10px; border-radius: 6px; background: #fff; }
                    .md-label { font-weight: 600; color: #34495e; display: flex; align-items: center; cursor: pointer; font-size: 0.9rem; }
                    .md-checkbox { margin-right: 10px; accent-color: var(--accent-color); transform: scale(1.1); }
                    
                    .md-details { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee; display: flex; gap: 5px; flex-wrap: wrap; }
                    .md-input { padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; flex: 1; min-width: 120px; }
                    .hidden { display: none; }
                    
                    .action-btn-primary { 
                        background: var(--accent-color); color: white; border: none; 
                        padding: 8px 20px; border-radius: 4px; font-weight: 700; cursor: pointer; 
                    }
                </style>
            </div>
        `;
    }
}
