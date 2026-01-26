import { Store } from './store/store.js';
import { StickyHeader } from './components/StickyHeader.js';
import { Accordion } from './components/Accordion.js';
import { MorningSection } from './components/sections/Morning.js';
import { ActivitySection } from './components/sections/Activity.js';
import { ShutdownSection } from './components/sections/Shutdown.js';
import { ForensicSection } from './components/ForensicSection.js';

import { ShadowSync } from './supabase/shadow-sync.js';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app-root');

    // 1. Initialize Store
    const store = new Store();
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.__STORE__ = store; // Debug access (Localhost only)
    }

    // 2. Initialize Components
    const header = new StickyHeader(store);

    const morning = new MorningSection(store);
    const activity = new ActivitySection(store);
    const shutdown = new ShutdownSection(store);
    const forensic = new ForensicSection(store);

    const accordion = new Accordion(store, [
        { id: 'MORNING', title: 'Morning Routine', summary: 'Hydration · Wake', component: morning },
        { id: 'ACTIVITY', title: 'Physical Activity', summary: 'Gym · Walks', component: activity },
        { id: 'FORENSIC', title: 'Forensic Adherence', summary: 'Meals · Verification', component: forensic },
        { id: 'SHUTDOWN', title: 'Shutdown Routine', summary: 'Sleep · Psyllium', component: shutdown }
    ]);

    // 3. Mount
    root.innerHTML = '';

    // Create Header Container
    const headerContainer = document.createElement('div');
    root.appendChild(headerContainer);
    header.mount(headerContainer);

    // Create Accordion Container
    const accordionContainer = document.createElement('div');
    accordionContainer.style.flex = "1";
    accordionContainer.style.display = "flex";
    accordionContainer.style.flexDirection = "column";
    // accordionContainer.style.overflow = "hidden"; // Handled by Accordion itself? No, by styles.css mostly
    root.appendChild(accordionContainer);
    accordion.mount(accordionContainer);


    // 4. Start Shadow Persistence
    ShadowSync.init(store);

});
