import * as THREE from 'three';

let undoStack = [];
let redoStack = [];

export function getModelState(model) {
    if (!model) return null;
    let mat = null;
    model.traverse(c => { if (c.isMesh && !mat) mat = c.material; });

    return {
        position: model.position.clone(),
        rotation: model.rotation.clone(),
        scale: model.scale.clone(),
        material: mat ? {
            ior: mat.ior,
            transmission: mat.transmission,
            thickness: mat.thickness,
            roughness: mat.roughness,
            color: mat.color.clone()
        } : null
    };
}

export function saveAction(model, oldState, newState) {
    const posChanged = !oldState.position.equals(newState.position);
    const rotChanged = !oldState.rotation.equals(newState.rotation);
    const scaChanged = !oldState.scale.equals(newState.scale);
    
    let matChanged = false;
    if (oldState.material && newState.material) {
        matChanged = oldState.material.ior !== newState.material.ior || 
                     oldState.material.thickness !== newState.material.thickness ||
                     !oldState.material.color.equals(newState.material.color);
    }

    if (posChanged || rotChanged || scaChanged || matChanged) {
        undoStack.push({ model, oldState, newState });
        redoStack = []; 
        if (undoStack.length > 100) undoStack.shift();
    }
}

/**
 * THE FIX: applyState uses .update() for the gizmo
 */
function applyState(action, state, transformControls) {
    const { model } = action;
    if (!model) return;

    // 1. Restore the model's coordinates
    model.position.copy(state.position);
    model.rotation.copy(state.rotation);
    model.scale.copy(state.scale);
    
    // 2. Force the model to recalculate its world position
    model.updateMatrixWorld(true);

    // 3. Restore material properties
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

    // 4. THE FIX FOR THE CONSOLE ERROR: 
    // If the gizmo is currently attached to this model, refresh its position
    if (transformControls && transformControls.object === model) {
        // TransformControls uses .update() to snap the gizmo back to the model
        if (typeof transformControls.update === 'function') {
            transformControls.update();
        }
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