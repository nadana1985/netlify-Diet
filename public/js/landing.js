import { Store } from './store/store.js';
import { PlanView } from './components/PlanView.js';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('landing-root');

    // 1. Initialize Store (for Plan Data)
    const store = new Store();

    // 2. Initialize Plan View
    const planView = new PlanView(store);

    // 3. Mount
    // Clear loading text
    root.innerHTML = '';

    planView.mount(root);
});
