import { loadModel, fitCameraToModel } from './loader.js';
import { scene, camera, controls } from './scene.js';

export function setupUI(callbacks) {
    const contextMenu = document.getElementById('contextMenu');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('meshUpload');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    // Undo / Redo Buttons
    if (undoBtn) undoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        callbacks.onUndo();
    });
    
    if (redoBtn) redoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        callbacks.onRedo();
    });

    // File Upload
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0], callbacks);
    });

    ['dragover', 'drop'].forEach(name => dropZone.addEventListener(name, (e) => e.preventDefault()));
    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], callbacks);
    });

    // Context Menu Buttons
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
}

function handleFile(file, callbacks) {
    loadModel(file, scene, (model) => {
        fitCameraToModel(model, camera, controls);
        callbacks.onLoad(model);
    });
}