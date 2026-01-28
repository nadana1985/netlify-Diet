import { Component } from './Component.js';

export class StickyHeader extends Component {
    constructor(facade) {
        super(facade);
        this.subscribe(['meta', 'currentTime', 'biologicalDate', 'viewDate']);
    }

    onMount() {
        // Event Delegation for robustness against re-renders
        if (this.element) {
            this.element.addEventListener('click', (e) => {
                if (e.target.closest('#nav-prev')) {
                    this.changeDate(-1);
                } else if (e.target.closest('#nav-next')) {
                    this.changeDate(1);
                }
            });
        }
    }

    changeDate(delta) {
        const { biologicalDate, viewDate } = this.facade.getSanitizedState();

        // Robust Date Math (Avoid Timezone Offsets)
        // 1. Parse YYYY-MM-DD
        const base = viewDate || biologicalDate;
        const parts = base.split('-').map(Number);

        // 2. Create UTC Date (Month is 0-indexed)
        const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

        // 3. Add Delta Days
        date.setUTCDate(date.getUTCDate() + delta);

        // 4. Format back to YYYY-MM-DD
        const newDate = date.toISOString().split('T')[0];

        // Prevent future navigation beyond biologicalDate
        if (newDate > biologicalDate && delta > 0) return;

        console.log(`[Nav] ${base} -> ${newDate} (limit: ${biologicalDate})`);

        // Dispatch via Facade
        if (this.facade.setViewDate) {
            this.facade.setViewDate(newDate);
        } else {
            console.error("Facade missing setViewDate");
        }
    }

    render() {
        const { meta, biologicalDate, viewDate } = this.facade.getSanitizedState();
        const score = meta.score || { total: 0 };
        const dateStr = viewDate || biologicalDate;

        // Color logic based on Score (Authoritative)
        let barColor = '#3498db';
        if (score.total >= 80) barColor = 'var(--accent-color)'; // Green
        else if (score.total >= 50) barColor = '#f1c40f'; // Yellow
        else barColor = '#e74c3c'; // Red

        const scoreText = `<strong>${score.total}</strong> DWCS`;
        const isFuture = dateStr >= biologicalDate;

        return `
            <div id="sticky-header" style="
                flex: 0 0 var(--header-height);
                background: white;
                border-bottom: 2px solid #ecf0f1;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 0 15px;
                z-index: 100;
            ">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 5px;">
                    <div style="font-size:0.9rem; font-weight:700; color:var(--primary-color); display:flex; align-items:center; gap:10px;">
                        <button id="nav-prev" style="border:none; background:none; cursor:pointer; font-weight:bold; color:#bdc3c7; padding:5px 10px;">&lt;</button>
                        <span>${dateStr}</span>
                        <button id="nav-next" style="border:none; background:none; cursor:pointer; font-weight:bold; color:${isFuture ? '#eee' : '#bdc3c7'}; padding:5px 10px;" ${isFuture ? 'disabled' : ''}>&gt;</button>
                        ${meta.isReadOnly ? '<span style="font-size:0.7rem; background:#ecf0f1; padding:2px 5px; border-radius:4px; color:#7f8c8d; margin-left:5px;">ARCHIVED</span>' : ''}
                    </div>
                    <div style="font-size:0.85rem; color:var(--secondary-color);">
                        Current Score: ${scoreText}
                    </div>
                </div>
                
                <!-- Score Bar -->
                <div style="
                    height: 6px; 
                    width: 100%; 
                    background: #ecf0f1; 
                    border-radius: 3px; 
                    overflow: hidden;
                ">
                    <div style="
                        height: 100%; 
                        width: ${score.total}%; 
                        background: ${barColor}; 
                        transition: width 0.5s ease;
                    "></div>
                </div>
            </div>
        `;
    }
}
