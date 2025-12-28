import * as THREE from 'three';

let undoStack = [];
let redoStack = [];

/**
 * Captures the complete state (TRS + Material)
 */
export function getModelState(model) {
    if (!model) return null;

    // Find material instance
    let mat = null;
    model.traverse(c => { if (c.isMesh && !mat) mat = c.material; });

    return {
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone(),
        // Capture material if it exists
        material: mat ? {
            ior: mat.ior,
            transmission: mat.transmission,
            thickness: mat.thickness,
            roughness: mat.roughness,
            color: mat.color.clone()
        } : null
    };
}

/**
 * Saves an action ONLY if something actually changed
 */
export function saveAction(model, oldState, newState) {
    // Basic change detection for TRS
    const posChanged = !oldState.position.equals(newState.position);
    const rotChanged = !oldState.rotation.equals(newState.rotation);
    const scaChanged = !oldState.scale.equals(newState.scale);
    
    // Detection for Material
    let matChanged = false;
    if (oldState.material && newState.material) {
        matChanged = oldState.material.ior !== newState.material.ior || 
                     oldState.material.thickness !== newState.material.thickness ||
                     !oldState.material.color.equals(newState.material.color);
    }

    if (posChanged || rotChanged || scaChanged || matChanged) {
        undoStack.push({ model, oldState, newState });
        redoStack = []; // Clear redo on new action
        if (undoStack.length > 100) undoStack.shift();
    }
}

function applyState(action, state, transformControls) {
    const { model } = action;
    if (!model) return;

    // Apply TRS
    model.position.copy(state.position);
    model.rotation.copy(state.rotation);
    model.scale.copy(state.scale);
    model.updateMatrixWorld(true);

    // Apply Material if saved
    if (state.material) {
        model.traverse(c => {
            if (c.isMesh && c.material) {
                c.material.ior = state.material.ior;
                c.material.transmission = state.material.transmission;
                c.material.thickness = state.material.thickness;
                c.material.roughness = state.material.roughness;
                c.material.color.copy(state.material.color);
                c.material.needsUpdate = true;
            }
        });
    }

    // Crucial: Update the Gizmo visually
    if (transformControls && transformControls.object === model) {
        transformControls.updateMatrixWorld();
    }
}

export function undo(transformControls) {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    redoStack.push(action);
    applyState(action, action.oldState, transformControls);
}

export function redo(transformControls) {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    undoStack.push(action);
    applyState(action, action.newState, transformControls);
}