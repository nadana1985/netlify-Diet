import { Component } from './Component.js';

export class ForensicScore extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['meta']);
    }

    render() {
        const { meta } = this.facade.getSanitizedState();
        const score = meta.score || { total: 0, breakdown: [] };

        // Analytics (Read-Only)
        // Accessing facade methods directly, which is allowed as it's a Facade consumer
        const sleepStats = this.facade.getSleepDebtStats ? this.facade.getSleepDebtStats() : { streak: 0, last30: 0 };
        const heatmap = this.facade.getMajorDeviationHeatmap ? this.facade.getMajorDeviationHeatmap() : {};

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
            breakdownHtml = `<div style="font-size:0.8rem; color:#aaa; margin-top:5px;">Perfect Adherence to Protocol</div>`;
        }

        // Heatmap Visualization (ASCII-style Block)
        // Frequency map: { alcohol: 2, travel: 1 }
        const heatmapKeys = Object.keys(heatmap);
        let heatmapHtml = '';
        if (heatmapKeys.length > 0) {
            heatmapHtml = `
                <div class="heatmap-section">
                    <div class="mini-label">30-DAY DEVIATION FREQUENCY</div>
                    <div class="heatmap-grid">
                        ${heatmapKeys.map(k => {
                const count = heatmap[k];
                // Visual: 1 block per occurrence, max 10
                const blocks = '█'.repeat(Math.min(count, 10)) + '░'.repeat(Math.max(0, 5 - count));
                const label = k.replace(/_/g, ' ').toUpperCase();
                return `
                                <div class="hm-row">
                                    <span class="hm-label">${label}</span>
                                    <span class="hm-bar">${blocks} <span style="font-size:0.7rem; color:#999;">(${count})</span></span>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        } else {
            heatmapHtml = `<div class="heatmap-section"><div class="mini-label">30-DAY DEVIATIONS</div><div style="font-size:0.75rem; color:#bdc3c7; font-style:italic;">No recorded deviations</div></div>`;
        }

        return `
            <div class="forensic-score-container">
                <div class="fs-row">
                    <!-- 1. SCORE -->
                    <div class="fs-col score-col">
                        <div class="score-circle-sm" style="border-color: ${scoreColor}; color: ${scoreColor}">
                            ${score.total}
                        </div>
                        <div class="score-details-sm">
                            <div class="score-title">DAILY SCORE</div>
                            ${breakdownHtml}
                        </div>
                    </div>

                    <div class="fs-divider"></div>

                    <!-- 2. ANALYTICS -->
                    <div class="fs-col analytics-col">
                         <div class="an-metric">
                            <div class="an-val">${sleepStats.streak} <span class="an-unit">days</span></div>
                            <div class="an-label">SLEEP DEBT STREAK</div>
                         </div>
                         <div class="an-metric">
                            <div class="an-val">${sleepStats.last30} <span class="an-unit">days</span></div>
                            <div class="an-label">30-DAY DEBT</div>
                         </div>
                    </div>

                    <div class="fs-divider"></div>

                    <!-- 3. HEATMAP -->
                    <div class="fs-col heatmap-col">
                        ${heatmapHtml}
                    </div>
                </div>

                <style>
                    .forensic-score-container { 
                        background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 15px; margin-bottom: 15px;
                    }
                    .fs-row { display: flex; align-items: stretch; gap: 15px; }
                    .fs-col { flex: 1; display: flex; align-items: center; justify-content: center; }
                    .score-col { justify-content: flex-start; flex: 1.2; }
                    .analytics-col { flex: 0.8; justify-content: space-around; background: #fafafa; border-radius: 6px; padding: 5px; }
                    .heatmap-col { flex: 1.2; justify-content: flex-start; overflow: hidden; }

                    .fs-divider { width: 1px; background: #eee; margin: 0 5px; }

                    @media (max-width: 900px) {
                        .fs-row { flex-direction: column; align-items: stretch; gap: 10px; }
                        .fs-divider { height: 1px; width: 100%; margin: 5px 0; }
                    }

                    .score-circle-sm { 
                        width: 40px; height: 40px; border-radius: 50%; border: 3px solid #ddd; 
                        display: flex; align-items: center; justify-content: center; 
                        font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem;
                        margin-right: 12px; flex-shrink: 0;
                    }
                    .score-details-sm { flex: 1; min-width: 0; }
                    .score-title { font-size: 0.6rem; font-weight: 700; color: #95a5a6; letter-spacing: 0.5px; margin-bottom: 2px; }
                    .score-breakdown { font-size: 0.7rem; line-height: 1.3; color: #34495e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .score-loss { margin-bottom: 1px; }
                    
                    .an-metric { text-align: center; }
                    .an-val { font-size: 1.0rem; font-weight: 800; color: #2c3e50; }
                    .an-unit { font-size: 0.65rem; font-weight: 400; color: #7f8c8d; }
                    .an-label { font-size: 0.55rem; font-weight: 700; color: #95a5a6; margin-top: 1px; letter-spacing: 0.5px; }

                    .heatmap-section { width: 100%; }
                    .mini-label { font-size: 0.6rem; font-weight: 700; color: #bdc3c7; margin-bottom: 4px; letter-spacing: 0.5px; }
                    .heatmap-grid { display: flex; flex-direction: column; gap: 2px; max-height: 50px; overflow-y: auto; width: 100%; }
                    .hm-row { display: flex; justify-content: space-between; align-items: center; font-family: monospace; font-size: 0.7rem; width: 100%; }
                    .hm-bar { color: #d35400; letter-spacing: -2px; opacity: 0.8; }
                </style>
            </div>
        `;
    }
}
