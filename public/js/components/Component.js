export class Component {
    constructor(store, props = {}) {
        this.store = store;
        this.props = props;
        this.element = null;

        // Subscription handling
        this.unsubscribe = null;
    }

    // Subscribe to specific store keys
    subscribe(keys) {
        if (!this.store) return;
        this.unsubscribe = this.store.subscribe((state, changes) => {
            // If any changed key is in our interest list, re-render
            if (keys.some(k => changes.includes(k)) || keys.includes('*')) {
                this.update();
            }
        });
    }

    // Abstract method: Return HTML string
    render() {
        return `<div>Base Component</div>`;
    }

    // Events after render (attaching listeners)
    onMount() { }

    // Initial Mount
    mount(parent) {
        this.element = document.createElement('div');
        // If the component wants to be a specific generic container, handle that, 
        // but for now we replace the innerHTML of a wrapper or just append.
        // Better pattern for this lightweight system:
        // Render returns string, we inject.

        parent.innerHTML = this.render();
        // Since we replaced innerHTML, we might lose reference if we aren't careful.
        // A better approach for "mount" in vanilla:
        // 1. Create a container for this component? Or render into existing?
        // Let's assume parent IS the container.

        this.element = parent.firstElementChild;
        this.onMount();
    }

    // Re-render
    update() {
        if (!this.element || !this.element.parentElement) return;

        // Simple VDOM-less re-render: replace content
        // We use a temp container to preserve the element wrapper if possible, 
        // OR we just re-render content. 
        // For 'Accordion', we need to be careful not to kill open/close state logic if it was local 
        // but our strict logic says "State is in Store", so full re-render is safe!

        const parent = this.element.parentElement;
        parent.innerHTML = this.render();
        this.element = parent.firstElementChild;
        this.onMount();
    }

    onDestroy() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
