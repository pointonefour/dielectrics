import * as THREE from 'three'; 
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as SceneModule from './scene.js'; 
import { getModelState, saveAction, undo, redo } from './history.js'; 
import { setupKeyboard } from './inputHandler.js';
import { setupUI } from './ui.js';
import { convertToDielectric } from './dielectric.js'; // FIX: Added missing import

let transformControls, currentModel = null;
let transformStartData = null;

function updateHighlight() {
    SceneModule.outlinePass.selectedObjects = currentModel ? [currentModel] : [];
}

function init() {
    SceneModule.initScene();
    
    transformControls = new TransformControls(SceneModule.camera, SceneModule.renderer.domElement);
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
            transformControls.detach(); 
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
        onRedo: () => redo(transformControls),
        onToggleGrid: () => {
            if (SceneModule.grid) {
                SceneModule.grid.visible = !SceneModule.grid.visible;
                 return SceneModule.grid.visible;
            }
             return false;
        },
        onToggleSnap: (enabled) => {
            if (enabled) {
                transformControls.setTranslationSnap(1); 
                transformControls.setRotationSnap(THREE.MathUtils.degToRad(15)); 
            } else {
                transformControls.setTranslationSnap(null);
                transformControls.setRotationSnap(null);
            }
        },
       onConvertDielectric: () => {
    if (currentModel) {
        convertToDielectric(currentModel); // Calling it directly
        return true; 
    }
    return false;
},
        getCurrentModel: () => currentModel
    });

    SceneModule.startAnimation();
}

function handleSelection(e) {
    // 1. UI GUARD
    if (
        e.target.closest('#contextMenu') || 
        e.target.closest('#bgMenu') || 
        e.target.closest('#matMenu') || 
        e.target.closest('#primitiveMenu') || 
        e.target.closest('.history-controls') || 
        e.target.closest('#dropZone') ||
        e.target.closest('button')
    ) {
        return; 
    }
    
    document.getElementById('contextMenu').style.display = 'none';

    // CLOSE ALL MENUS ON CLICK
    document.querySelectorAll('.sleek-menu').forEach(menu => {
        menu.classList.remove('active');
    });

    if (transformControls.axis !== null) return;
    if (e.button !== 0) return;

    const hit = SceneModule.getClickedModel(e);

    if (hit) { 
        currentModel = hit; 
        transformControls.attach(currentModel); 
    } else {
        if (!transformControls.dragging) { 
            currentModel = null; 
            transformControls.detach(); 
        }
    }

    updateHighlight();
}

function handleContextMenu(e) {
    e.preventDefault();
    const hit = SceneModule.getClickedModel(e);
    
    if (hit) {
        currentModel = hit;
        transformControls.attach(currentModel);
        updateHighlight();

        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = `${e.clientX}px`; 
        menu.style.top = `${e.clientY}px`;
    } else {
        document.getElementById('contextMenu').style.display = 'none';
    }
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
        SceneModule.modelGroup.remove(currentModel); 
        currentModel = null; 
        updateHighlight();
    }
}

init();