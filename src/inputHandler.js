import { undo, redo } from './history.js';
import { getClickedModel } from './scene.js';

export function setupKeyboard(transformControls, currentModelProvider, removeCallback) {
    window.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            e.shiftKey ? redo(transformControls) : undo(transformControls);
            return;
        }

        const model = currentModelProvider();
        if (!model) return;

        switch (e.key.toLowerCase()) {
            case 'w': transformControls.setMode('translate'); break;
            case 'e': transformControls.setMode('rotate'); break;
            case 'r': transformControls.setMode('scale'); break;
            case 'delete': removeCallback(); break;
            case 'escape': transformControls.detach(); break;
        }
    });
}