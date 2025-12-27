import * as THREE from 'three'; // Added to support snapping math
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as SceneModule from './scene.js'; 
import { getModelState, saveAction, undo, redo } from './history.js'; 
import { setupKeyboard } from './inputHandler.js';
import { setupUI } from './ui.js';

let transformControls, currentModel = null;
let transformStartData = null;

/**
 * Updates the yellow outline around the selected model
 */
function updateHighlight() {
    SceneModule.outlinePass.selectedObjects = currentModel ? [currentModel] : [];
}

/**
 * Main Initialization
 */
function init() {
    SceneModule.initScene();
    
    // Setup Transform Controls
    transformControls = new TransformControls(SceneModule.camera, SceneModule.renderer.domElement);
    
    // Add Gizmo to sceneUI (Overlay layer) to keep it sharp and avoid glow
    const gizmo = transformControls.getHelper ? transformControls.getHelper() : transformControls;
    SceneModule.sceneUI.add(gizmo);

    // Sync OrbitControls and TransformControls
    transformControls.addEventListener('dragging-changed', (e) => {
        SceneModule.controls.enabled = !e.value;
    });
    
    // History Tracking
    transformControls.addEventListener('mouseDown', () => { 
        if (currentModel) transformStartData = getModelState(currentModel); 
    });
    
    transformControls.addEventListener('mouseUp', () => {
        if (currentModel && transformStartData) {
            saveAction(currentModel, transformStartData, getModelState(currentModel));
        }
    });

    // Global Input Listeners
    window.addEventListener('mousedown', handleSelection);
    window.addEventListener('contextmenu', handleContextMenu);

    // Keyboard Shortcuts
    setupKeyboard(transformControls, () => currentModel, removeModel);

    // UI Callback Logic
    setupUI({
        onLoad: (model) => { 
            currentModel = model; 
            // We detach so it loads "clean", but highlight it so the user sees it's active
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
        }
    });

    SceneModule.startAnimation();
}

/**
 * Handles Left-Click Selection
 */
function handleSelection(e) {
    // 1. IMPROVED UI GUARD: Prevent 3D selection if clicking ANY part of the UI
    // Added .history-controls and 'button' to catch all header/mobile interactions
    if (
        e.target.closest('#contextMenu') || 
        e.target.closest('#dropZone') || 
        e.target.closest('.ui-button') ||
        e.target.closest('.history-controls') || 
        e.target.closest('button')
    ) {
        return; 
    }
    
    // 2. Hide context menu
    document.getElementById('contextMenu').style.display = 'none';

    // 3. If clicking the Gizmo handles, exit (prevents deselecting while moving)
    if (transformControls.axis !== null) return;

    // 4. Handle Left-Click only
    if (e.button !== 0) return;

    const hit = SceneModule.getClickedModel(e);

    if (hit) { 
        // We hit a model: Select it
        currentModel = hit; 
        transformControls.attach(currentModel); 
    } else {
        // We hit empty space: Deselect only if we aren't currently dragging the gizmo
        if (!transformControls.dragging) { 
            currentModel = null; 
            transformControls.detach(); 
        }
    }

    // 5. Update the yellow outline
    updateHighlight();
}

/**
 * Handles Right-Click Context Menu
 */
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

/**
 * Cleanup and Remove selected model
 */
function removeModel() {
    if (currentModel) { 
        transformControls.detach(); 

        // Dispose of GPU resources to prevent memory leaks
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

        // CRITICAL: Remove from modelGroup, not the scene!
        SceneModule.modelGroup.remove(currentModel); 
        
        currentModel = null; 
        updateHighlight();
    }
}

init();