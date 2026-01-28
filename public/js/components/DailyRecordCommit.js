import { Component } from './Component.js';

export class DailyRecordCommit extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['meta', 'dailyLogs']);
    }

    onMount() {
        const { meta, dailyLogs } = this.facade.getSanitizedState();
        if (meta.isReadOnly) return;

        // Context Logic
        const inputContext = this.element.querySelector('#input-context');
        const btnSaveContext = this.element.querySelector('#btn-save-context');

        if (btnSaveContext && inputContext) {
            btnSaveContext.addEventListener('click', () => {
                const text = inputContext.value;
                this.facade.logDailyContext(text); // Ensure facade has this method or simple logUpdate
                // Visual feedback
                btnSaveContext.innerText = "Saved";
                setTimeout(() => btnSaveContext.innerText = "Save Note", 1500);
            });
        }

        // Archive Logic
        const btnArchive = this.element.querySelector('#btn-archive-day');
        if (btnArchive) {
            btnArchive.addEventListener('click', () => {
                const { dailyLogs, supportLogs, dailyProtocol } = this.facade.getSanitizedState();
                const missing = [];

                // 1. Validate Nutrition (Meals)
                if (dailyProtocol && dailyProtocol.meals) {
                    dailyProtocol.meals.forEach(meal => {
                        const log = dailyLogs.records ? dailyLogs.records[meal.id] : null;
                        if (!log || !log.status) {
                            missing.push(`Meal: ${meal.label}`);
                        }
                    });
                }

                // 2. Validate Support (Hardcoded checks for core protocol)
                const sLog = supportLogs.protocols || {};

                // Morning
                if (!sLog.sleep || !sLog.sleep.hours) missing.push("Morning: Sleep Duration");
                if (!sLog.water || !sLog.water.status) missing.push("Morning: 1L Water");
                if (!sLog.black_coffee || !sLog.black_coffee.status) missing.push("Morning: Black Coffee");

                // Activity
                if (!sLog.gym || !sLog.gym.status) missing.push("Activity: Gym");
                if (!sLog.walking_lunch || !sLog.walking_lunch.status) missing.push("Activity: Walk (Post-Lunch)");
                if (!sLog.walking_dinner || !sLog.walking_dinner.status) missing.push("Activity: Walk (Post-Dinner)");

                // Shutdown
                if (!sLog.psyllium || !sLog.psyllium.status) missing.push("Shutdown: Psyllium Husk");
                if (!sLog.sleep || !sLog.sleep.bed_time) missing.push("Shutdown: Bed Time");

                if (missing.length > 0) {
                    alert("Cannot Archive Record. The following items are missing:\n\n- " + missing.join("\n- "));
                    return;
                }

                if (confirm('Archive this record? This will seal the day.')) {
                    this.facade.finishDay();
                }
            });
        }

        // Unseal Logic
        const btnUnseal = this.element.querySelector('#btn-unseal-day');
        if (btnUnseal) {
            btnUnseal.addEventListener('click', () => {
                if (confirm('Re-open this day for editing?')) {
                    this.facade.unsealDay();
                }
            });
        }

        // Reset All Data Logic (Dev)
        const btnReset = this.element.querySelector('#btn-reset-app');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                const phrase = "DELETE ALL DATA";
                const input = prompt(`TYPE "${phrase}" TO ERASE EVERYTHING AND START FRESH:`);
                if (input === phrase) {
                    this.facade.resetApp();
                } else if (input !== null) {
                    alert("Incorrect phrase. Reset cancelled.");
                }
            });
        }
    }

    render() {
        const { dailyLogs, meta } = this.facade.getSanitizedState();
        const { isReadOnly, sealedDaysCount } = meta;
        const contextText = dailyLogs.context || '';
        const disabledStr = isReadOnly ? 'disabled style="opacity:0.5; pointer-events:none;"' : '';

        return `
            <div class="section-content">
                <style>
                    .context-area { width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-family: inherit; font-size: 0.9rem; resize: vertical; min-height: 80px; box-sizing: border-box; }
                    .context-label { font-weight: 700; color: #2c3e50; font-size: 0.9rem; margin-bottom: 8px; display: block; }
                    .btn-archive {
                        width: 100%; background: #2c3e50; color: #fff; border: none; padding: 12px;
                        font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px;
                        margin-top: 20px; cursor: pointer; transition: background 0.2s;
                    }
                    .btn-archive:hover { background: #34495e; }
                    .btn-unseal {
                        width: 100%; background: #fff; color: #7f8c8d; border: 1px dashed #bdc3c7; padding: 10px;
                        font-weight: 600; text-transform: uppercase; font-size: 0.8rem; border-radius: 4px;
                        margin-top: 20px; cursor: pointer;
                    }
                    .btn-unseal:hover { border-color: #2c3e50; color: #2c3e50; }
                    .btn-save-note {
                        background: #ecf0f1; border: 1px solid #bdc3c7; color: #2c3e50;
                        padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; float: right; margin-top: 5px;
                    }
                </style>

                <!-- Context & Notes -->
                <div style="margin-bottom: 15px;">
                    <label class="context-label">CONTEXT & NOTES <span style="font-weight:400; color:#999; font-size:0.8rem;">(Optional)</span></label>
                    <textarea id="input-context" class="context-area" placeholder="Stress, travel, illness, or general observations..." ${disabledStr}>${contextText}</textarea>
                    ${!isReadOnly ? `<button id="btn-save-context" class="btn-save-note">Save Note</button>` : ''}
                    <div style="clear:both;"></div>
                </div>

                <!-- Archive Button -->
                ${!isReadOnly
                ? `<button id="btn-archive-day" class="btn-archive">Archive Today's Record</button>`
                : `
                        <div style="text-align:center; padding:10px; font-weight:700; color:#2c3e50; border:1px solid #eee; background:#fafafa; border-radius:4px; margin-bottom:10px;">RECORD ARCHIVED</div>
                        <button id="btn-unseal-day" class="btn-unseal">Re-open / Edit Record</button>
                      `
            }

                <div style="text-align:center; margin-top:15px; font-size:0.8rem; color:#95a5a6;">
                    Total Verified Records: <strong>${sealedDaysCount}</strong>
                </div>

                <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                    <button id="btn-reset-app" style="color: red; border: 1px solid red; background: white; padding: 5px 10px; font-size: 0.7rem; border-radius: 4px; cursor: pointer; opacity: 0.6;">
                        ⚠️ ERASE ALL DATA (RESET)
                    </button>
                </div>
            </div>
        `;
    }
}
