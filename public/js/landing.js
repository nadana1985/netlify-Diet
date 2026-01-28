import { Store } from './store/store.js';
import { PlanView } from './components/PlanView.js';
import { EvaluationFacade } from './facades/EvaluationFacade.js';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('landing-root');

    // 1. Initialize Store (for Plan Data)
    const store = new Store();

    // 2. Initialize Plan View
    // 2. Initialize Facade & Plan View
    const facade = new EvaluationFacade(store);
    const planView = new PlanView(facade);

    // 3. Mount
    // Clear loading text
    root.innerHTML = '';

    planView.mount(root);
});
