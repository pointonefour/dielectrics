import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as SceneModule from './scene.js'; 
import { getModelState, saveAction, undo, redo } from './history.js'; 
import { setupKeyboard } from './inputHandler.js';
import { setupUI } from './ui.js';

let transformControls, currentModel = null;
let transformStartData = null;

function updateHighlight() {
    if (currentModel) {
        SceneModule.outlinePass.selectedObjects = [currentModel];
    } else {
        SceneModule.outlinePass.selectedObjects = [];
    }
}

function init() {
    SceneModule.initScene();
    
    transformControls = new TransformControls(SceneModule.camera, SceneModule.renderer.domElement);
    
    // Add Gizmo to sceneUI to keep it sharp and avoid the outline glow
    const gizmo = transformControls.getHelper ? transformControls.getHelper() : transformControls;
    SceneModule.sceneUI.add(gizmo);

    transformControls.addEventListener('dragging-changed', (e) => {
        SceneModule.controls.enabled = !e.value;
    });
    
    transformControls.addEventListener('mouseDown', () => { 
        if (currentModel) transformStartData = getModelState(currentModel); 
    });
    
    transformControls.addEventListener('mouseUp', () => {
        if (currentModel && transformStartData) {
            saveAction(currentModel, transformStartData, getModelState(currentModel));
        }
    });

    window.addEventListener('mousedown', handleSelection);
    window.addEventListener('contextmenu', handleContextMenu);

    setupKeyboard(transformControls, () => currentModel, removeModel);

    setupUI({
        onLoad: (model) => { 
            currentModel = model; 
            transformControls.attach(currentModel); 
            updateHighlight();
        },
        onSetMode: (mode) => { 
            if (currentModel) {
                transformControls.attach(currentModel); 
                transformControls.setMode(mode); 
            }
        },
        onDelete: removeModel,
        onUndo: () => undo(transformControls),
        onRedo: () => redo(transformControls)
    });

    SceneModule.startAnimation();
}

function handleSelection(e) {
    if (e.target.closest('#contextMenu') || e.target.closest('#dropZone') || e.target.closest('.ui-button')) return;
    document.getElementById('contextMenu').style.display = 'none';

    // If we are clicking the Transform Gizmo, don't change selection
    if (transformControls.axis !== null) return;

    if (e.button !== 0) return;

    const hit = SceneModule.getClickedModel(e);
    if (hit) { 
        currentModel = hit; 
        transformControls.attach(currentModel); 
    }
    else if (!transformControls.dragging) { 
        currentModel = null; 
        transformControls.detach(); 
    }

    updateHighlight();
}

function handleContextMenu(e) {
    const hit = SceneModule.getClickedModel(e);
    if (!hit) return;
    
    e.preventDefault();
    currentModel = hit;
    transformControls.attach(hit);
    updateHighlight();

    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';
    menu.style.left = `${e.clientX}px`; 
    menu.style.top = `${e.clientY}px`;
}

function removeModel() {
    if (currentModel) { 
        transformControls.detach(); 

        currentModel.traverse((node) => {
            if (node.isMesh) {
                node.geometry.dispose();
                if (Array.isArray(node.material)) {
                    node.material.forEach(m => m.dispose());
                } else {
                    node.material.dispose();
                }
            }
        });

        SceneModule.scene.remove(currentModel); 
        currentModel = null; 
        updateHighlight();
    }
}

init();