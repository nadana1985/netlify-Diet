import { Component } from './Component.js';

export class Accordion extends Component {
    constructor(store, sections = []) {
        super(store);
        this.sections = sections; // Array of { id, title, componentInstance }
        this.subscribe(['ui.expandedSection']);
    }

    onMount() {
        // Mount children into their containers
        this.sections.forEach(sec => {
            const container = this.element.querySelector(`#section-body-${sec.id}`);
            if (container && this.store.state.ui.expandedSection === sec.id) {
                // Only mount if expanded to save cycles? 
                // No, better to keep them mounted but hidden? 
                // For "Zero-Scroll", we want DOM to be clean.
                // Let's mount the active one.
                sec.component.mount(container);
            }
        });

        // Attach click listeners to headers
        this.sections.forEach(sec => {
            const header = this.element.querySelector(`#section-header-${sec.id}`);
            if (header) {
                header.addEventListener('click', () => {
                    this.store.dispatch('SET_SECTION', sec.id);
                });
            }
        });
    }

    render() {
        const expandedId = this.store.state.ui.expandedSection;

        return `
            <div id="accordion-container" style="
                flex: 1; 
                display: flex; 
                flex-direction: column; 
                overflow: hidden; /* Constraint */
            ">
                ${this.sections.map(sec => {
            const isExpanded = expandedId === sec.id;
            // FIXED: Added min-height: 0 to allow flex shrinking, overflow: hidden to contain scroll to body
            const flexStyle = isExpanded ? 'flex: 1; min-height: 0; overflow: hidden;' : 'flex: 0 0 auto; height: 50px; overflow: hidden;';
            const icon = isExpanded ? '▼' : '▶';
            const bg = isExpanded ? 'white' : '#f8f9fa';
            const border = isExpanded ? 'none' : '1px solid #eee';

            return `
                        <div class="accordion-section" style="
                            ${flexStyle}
                            display: flex; 
                            flex-direction: column;
                            border-bottom: ${border};
                            background: ${bg};
                            transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
                        ">
                            <!-- Header -->
                            <div id="section-header-${sec.id}" style="
                                height: 50px; 
                                flex: 0 0 50px;
                                display: flex; 
                                align-items: center; 
                                padding: 0 20px;
                                cursor: pointer;
                                user-select: none;
                                font-weight: 600;
                                color: var(--primary-color);
                                border-bottom: ${isExpanded ? '2px solid var(--accent-color)' : 'none'};
                            ">
                                <span style="width: 20px; color: #bdc3c7;">${icon}</span>
                                <span>${sec.title}</span>
                                <span style="margin-left: auto; font-size: 0.8rem; color: #95a5a6; font-weight: normal;">
                                    ${isExpanded ? '<span style="font-size: 0.75rem; background: #f0f3f4; padding: 4px 10px; border-radius: 12px; color: #7f8c8d; border: 1px solid #e0e0e0;">▲ Minimize</span>' : sec.summary || ''}
                                </span>
                            </div>

                            <!-- Body (Content) -->
                            <div id="section-body-${sec.id}" class="accordion-content" style="
                                flex: 1; 
                                overflow-y: auto; 
                                padding: ${isExpanded ? '20px' : '0'};
                                display: ${isExpanded ? 'block' : 'none'};
                            ">
                                <!-- Component injected here -->
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }
}
