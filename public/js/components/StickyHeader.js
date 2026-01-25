import { Component } from './Component.js';

export class StickyHeader extends Component {
    constructor(store) {
        super(store);
        this.subscribe(['dailyLogs', 'supportLogs', 'currentTime']);
    }

    calculateProgress() {
        const protos = this.store.state.supportLogs.protocols || {};
        const daily = this.store.state.dailyLogs.records || {};

        // Define required daily habits (simplified)
        // 1. Water (taken)
        // 2. Coffee (taken or violation)
        // 3. Gym (completed)
        // 4. Walks (lunch & dinner)
        // 5. Psyllium (taken)
        // 6. Sleep (bed & wake)

        let total = 0;
        let done = 0;

        const check = (bool) => {
            total++;
            if (bool) done++;
        };

        check(protos['water'] && protos['water'].status === 'TAKEN');
        check(protos['black_coffee'] && protos['black_coffee'].status); // Any status counts as "logged"
        check(protos['gym'] && protos['gym'].status);
        check(protos['walking_lunch'] && protos['walking_lunch'].status);
        check(protos['walking_dinner'] && protos['walking_dinner'].status);
        check(protos['psyllium'] && protos['psyllium'].status);
        check(protos['sleep'] && protos['sleep'].bed_time && protos['sleep'].wake_time); // Needs both? Let's say separate

        // For simplicity, just count pending count
        const pending = total - done;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        return { percent, pending };
    }

    render() {
        const { percent, pending } = this.calculateProgress();
        const dateStr = this.store.state.biologicalDate;

        // Color logic
        const barColor = percent === 100 ? 'var(--accent-color)' : '#3498db';
        const pendingText = pending === 0 ? `<span style="color:var(--accent-color)">All Done!</span>` : `<strong>${pending}</strong> Pending`;

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
                    <div style="font-size:0.9rem; font-weight:700; color:var(--primary-color);">
                        ${dateStr}
                    </div>
                    <div style="font-size:0.85rem; color:var(--secondary-color);">
                        <strong>${percent}%</strong> Done · ${pendingText}
                    </div>
                </div>
                
                <!-- Progress Container -->
                <div style="
                    height: 6px; 
                    width: 100%; 
                    background: #ecf0f1; 
                    border-radius: 3px; 
                    overflow: hidden;
                ">
                    <div style="
                        height: 100%; 
                        width: ${percent}%; 
                        background: ${barColor}; 
                        transition: width 0.5s ease;
                    "></div>
                </div>
            </div>
        `;
    }
}
