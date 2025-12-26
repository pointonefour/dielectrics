import { loadModel, fitCameraToModel } from './loader.js';
import { scene, camera, controls } from './scene.js';

export function setupUI(callbacks) {
    const contextMenu = document.getElementById('contextMenu');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('meshUpload');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    // --- GRID TOGGLE ---
    const gridBtn = document.getElementById('gridToggleBtn');
    if (gridBtn) {
        // Grid starts as VISIBLE, so make button BLUE immediately
        gridBtn.classList.add('active'); 

        gridBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isVisible = callbacks.onToggleGrid();
            gridBtn.classList.toggle('active', isVisible);
        });
    }

    // --- SNAPPING TOGGLE ---
    const snapBtn = document.getElementById('snapToggleBtn');
    let snapEnabled = false;
    if (snapBtn) {
        snapBtn.addEventListener('click', (e) => {
            e.preventDefault();
            snapEnabled = !snapEnabled;
            callbacks.onToggleSnap(snapEnabled);
            // Toggle blue color based on snap state
            snapBtn.classList.toggle('active', snapEnabled);
        });
    }

    // --- UNDO / REDO ---
    if (undoBtn) undoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        callbacks.onUndo();
    });
    
    if (redoBtn) redoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        callbacks.onRedo();
    });

    // --- FILE UPLOAD ---
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0], callbacks);
    });

    ['dragover', 'drop'].forEach(name => dropZone.addEventListener(name, (e) => e.preventDefault()));
    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], callbacks);
    });

    // --- CONTEXT MENU ---
    const bindBtn = (id, mode) => {
        document.getElementById(id)?.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            callbacks.onSetMode(mode);
            contextMenu.style.display = 'none';
        });
    };
    
    bindBtn('menuTranslate', 'translate');
    bindBtn('menuRotate', 'rotate');
    bindBtn('menuScale', 'scale');
    
    document.getElementById('menuDelete')?.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        callbacks.onDelete();
        contextMenu.style.display = 'none';
    });
} // <--- setupUI ends HERE now

function handleFile(file, callbacks) {
    loadModel(file, scene, (model) => {
        fitCameraToModel(model, camera, controls);
        callbacks.onLoad(model);
    });
}