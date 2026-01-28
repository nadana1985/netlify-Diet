import { Component } from './Component.js';
import { ForensicScore } from './ForensicScore.js';
import { ForensicInput } from './ForensicInput.js';

/**
 * ForensicSection (Wrapper)
 * Composes the Score (Evaluation) and Input (Execution) components.
 * acts as a container for the Accordion.
 */
export class ForensicSection extends Component {
    constructor(execFacade, evalFacade) {
        super(null); // No direct facade usage for this container
        this.execFacade = execFacade;
        this.evalFacade = evalFacade;

        this.scoreComponent = new ForensicScore(evalFacade);
        this.inputComponent = new ForensicInput(execFacade);
    }

    render() {
        return `
            <div id="forensic-wrapper">
                <div id="f-score-root"></div>
                <div id="f-input-root"></div>
            </div>
        `;
    }

    onMount() {
        // Mount Children
        const scoreRoot = this.element.querySelector('#f-score-root');
        const inputRoot = this.element.querySelector('#f-input-root');

        if (scoreRoot) this.scoreComponent.mount(scoreRoot);
        if (inputRoot) this.inputComponent.mount(inputRoot);
    }
}
