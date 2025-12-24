import * as THREE from 'three';

let undoStack = [];
let redoStack = [];

export function getModelState(model) {
    return {
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone()
    };
}

export function applyState(model, state, transformControls) {
    if (!model || !state) return;
    model.position.copy(state.position);
    model.rotation.copy(state.rotation);
    model.scale.copy(state.scale);
    if (transformControls) transformControls.updateMatrixWorld();
}

export function saveAction(model, oldState, newState) {
    undoStack.push({ model, oldState: { ...oldState }, newState: { ...newState } });
    redoStack = []; // Clear redo on new action
    if (undoStack.length > 100) undoStack.shift();
}

export function undo(transformControls) {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    redoStack.push(action);
    applyState(action.model, action.oldState, transformControls);
}

export function redo(transformControls) {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    undoStack.push(action);
    applyState(action.model, action.newState, transformControls);
}