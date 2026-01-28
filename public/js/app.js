import { Store } from './store/store.js';
import { StickyHeader } from './components/StickyHeader.js';
import { Accordion } from './components/Accordion.js';
import { MorningSection } from './components/sections/Morning.js';
import { ActivitySection } from './components/sections/Activity.js';
import { ShutdownSection } from './components/sections/Shutdown.js';
import { ForensicSection } from './components/ForensicSection.js';

import { MajorDeviations } from './components/MajorDeviations.js';
import { DailyRecordCommit } from './components/DailyRecordCommit.js'; // NEW

import { ExecutionFacade } from './facades/ExecutionFacade.js';
import { EvaluationFacade } from './facades/EvaluationFacade.js';

import { ShadowSync } from './supabase/shadow-sync.js';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app-root');

    // 1. Initialize Store
    const store = new Store();
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.127.0.1') {
        window.__STORE__ = store; // Debug access (Localhost only)
    }

    // 2. Initialize Facades
    // ARCHITECTURE ADHERENCE: Components must NOT access store directly
    const execFacade = new ExecutionFacade(store);
    const evalFacade = new EvaluationFacade(store);

    // 3. Initialize Components with Facades
    const header = new StickyHeader(execFacade); // Needs to Write viewDate

    const morning = new MorningSection(execFacade); // WRITE ONLY
    const activity = new ActivitySection(execFacade); // WRITE ONLY
    const shutdown = new ShutdownSection(execFacade); // WRITE ONLY

    // Major Deviations (Write mostly, Read for checkboxes)
    const majorDeviations = new MajorDeviations(execFacade);

    // Forensic Wrapper (Nutrition Variance)
    const forensic = new ForensicSection(execFacade, evalFacade);

    // Daily Record Commit (Context + Archive)
    const dailyCommit = new DailyRecordCommit(execFacade);

    const accordion = new Accordion(execFacade, [
        // CRITICAL ORDER: Morning -> Activity -> Nutrition -> MDR -> Commit -> Shutdown (or Shutdown -> Commit?)
        // User: "Insert DailyRecordCommit component before Shutdown"
        { id: 'MORNING', title: 'Morning Record', summary: 'Sleep · Hydration', component: morning },
        { id: 'ACTIVITY', title: 'Activity Record', summary: 'Gym · Walks', component: activity },
        { id: 'FORENSIC', title: 'Nutrition Variance', summary: 'Meals · Verification', component: forensic },
        { id: 'DEVIATIONS', title: 'Major Deviations (MDR)', summary: 'Non-routine Events', component: majorDeviations },
        { id: 'COMMIT', title: 'Daily Context & Archive', summary: 'Context · Seal Day', component: dailyCommit },
        { id: 'SHUTDOWN', title: 'Shutdown Routine', summary: 'Psyllium · Bedtime', component: shutdown }
    ]);

    // 4. Mount
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
    root.appendChild(accordionContainer);
    accordion.mount(accordionContainer);

    // 5. Start Shadow Persistence
    ShadowSync.init(store);

    // 6. Default to Morning Record (User Request)
    execFacade.setSection('MORNING');

});
