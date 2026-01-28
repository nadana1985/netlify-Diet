import { Component } from './Component.js';

export class PlanView extends Component {
    constructor(store) {
        super(store);
        this.subscribe(['plan']);
    }

    render() {
        const { plan, biologicalDate } = this.facade.getSanitizedState();
        if (!plan) return `<div style="padding:20px; text-align:center;">Loading Plan...</div>`;

        // Today's Date Calculation for visual highlighting
        const todayBiological = new Date(biologicalDate);
        const start = new Date(plan.plan_start_date);

        // Normalize time
        const t1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const t2 = Date.UTC(todayBiological.getFullYear(), todayBiological.getMonth(), todayBiological.getDate());
        const diffDays = Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
        const currentDayNum = diffDays + 1;

        return `
            <div style="padding: 20px 20px 40px 20px; overflow-y: auto; -webkit-overflow-scrolling: touch;">
                <!-- Header -->
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 0.9rem; font-weight: 700; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px;">30-DAY PLAN REVIEW (READ-ONLY)</div>
                    <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 5px;">For visual verification only</div>
                </div>

                <!-- Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                    ${plan.days.map(d => {
            const isToday = d.day === currentDayNum;

            // Type Badge Colors
            let badgeBg = '#ecf0f1';
            let badgeColor = '#7f8c8d';

            // Heuristic for badges based on screenshot/data
            const type = (d.type || '').toLowerCase();
            if (type.includes('veg')) {
                badgeBg = '#d4efdf'; badgeColor = '#27ae60'; // Green
            } else if (type.includes('fish') || type.includes('chicken')) {
                badgeBg = '#d6eaf8'; badgeColor = '#2980b9'; // Blue-ish for non-veg? Or maybe orange for chicken?
            }

            // Override for Chicken based on common UI patterns or guess (Screenshot had "CHICKEN" in orange/red)
            if (type.includes('chicken')) {
                badgeBg = '#fdebd0'; badgeColor = '#d35400';
            }
            // Override for Veg-Idli/Veg-Chapati to kept green-ish or distinct? Let's stick to Green for all Veg base
            if (type.includes('idli') || type.includes('chapati')) {
                badgeBg = '#f3e5f5'; badgeColor = '#8e44ad'; // Purple for variation? Actually let's keep it simple.
                // Screenshot showed 'Day 5' with 'VEG-IDLI' in purple/pink.
            }

            // Card Border/Highlight for Today
            const borderStyle = isToday ? '2px solid #f1c40f' : '1px solid #e0e0e0';
            const opacity = (d.day < currentDayNum) ? '0.6' : '1';

            return `
                        <div style="
                            background: white; 
                            border: ${borderStyle}; 
                            border-radius: 8px; 
                            padding: 15px; 
                            opacity: ${opacity};
                            display: flex; 
                            flex-direction: column;
                            position: relative;
                        ">
                            ${isToday ? `<div style="
                                position: absolute; top: -10px; left: 10px; 
                                background: #f1c40f; color: #fff; 
                                font-size: 0.6rem; font-weight: 800; padding: 2px 8px; border-radius: 10px;
                            ">TODAY</div>` : ''}

                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                                <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary-color);">Day ${d.day}</div>
                                <div style="
                                    background: ${badgeBg}; color: ${badgeColor}; 
                                    font-size: 0.65rem; font-weight: 700; 
                                    padding: 3px 8px; border-radius: 4px; text-transform: uppercase;
                                ">${d.type}</div>
                            </div>

                            <!-- Juice -->
                            <div style="margin-bottom: 8px; display:flex; gap: 8px;">
                                <span style="font-size:1rem;">🥤</span>
                                <span style="font-size: 0.9rem; color: #34495e;">${d.juice}</span>
                            </div>

                            <!-- Lunch -->
                             <div style="margin-bottom: 8px; display:flex; gap: 8px;">
                                <span style="font-size:1rem;">🍲</span>
                                <span style="font-size: 0.9rem; color: #34495e;">${d.lunch.join(', ')}</span>
                            </div>

                            <!-- Dinner -->
                             <div style="display:flex; gap: 8px;">
                                <span style="font-size:1rem;">🥣</span>
                                <span style="font-size: 0.9rem; color: #34495e;">${d.dinner.join(', ')}</span>
                            </div>

                        </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }
}
