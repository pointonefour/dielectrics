import { loadModel, fitCameraToModel } from './loader.js';
import { scene, camera, controls } from './scene.js';

export function setupUI(callbacks) {
    const contextMenu = document.getElementById('contextMenu');
    const dropOverlay = document.getElementById('dropOverlay');
    const fileInput = document.getElementById('meshUpload');
    const dropZone = document.getElementById('dropZone');

    const uiEvent = 'mousedown'; // Matches 3D scene timing

    /**
     * Helper to bind buttons safely and stop event "bleeding"
     * Passing 'el' (the button) into the callback function 'fn'
     */
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(uiEvent, (e) => {
                e.preventDefault();
                e.stopPropagation();
                // We pass e.currentTarget (the button) so 'fn' can use it
                fn(e.currentTarget); 
            });
        }
    };

    // --- GRID TOGGLE ---
    bind('gridToggleBtn', (btn) => {
        const isVisible = callbacks.onToggleGrid();
        if (isVisible) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // --- SNAP TOGGLE ---
    let snapActive = false;
    bind('snapToggleBtn', (btn) => {
        snapActive = !snapActive;
        callbacks.onToggleSnap(snapActive);
        if (snapActive) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // --- HISTORY ---
    bind('undoBtn', () => callbacks.onUndo());
    bind('redoBtn', () => callbacks.onRedo());

    // --- CONTEXT MENU MODES ---
    bind('menuTranslate', () => callbacks.onSetMode('translate'));
    bind('menuRotate', () => callbacks.onSetMode('rotate'));
    bind('menuScale', () => callbacks.onSetMode('scale'));
    bind('menuDelete', () => callbacks.onDelete());

    // --- FILE UPLOAD ---
    if (dropZone) {
        dropZone.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0], callbacks);
    });

    // --- FULL SCREEN DRAG & DROP GLOW ---
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null) dropOverlay.classList.remove('active');
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dropOverlay.classList.remove('active');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0], callbacks);
        }
    });
}

function handleFile(file, callbacks) {
    const extension = file.name.split('.').pop().toLowerCase();
    const modelFormats = ['glb', 'gltf', 'obj', 'stl', 'ply', 'dae'];
    const envFormats = ['hdr', 'exr'];

    if (modelFormats.includes(extension)) {
        loadModel(file, scene, (model) => {
            fitCameraToModel(model, camera, controls);
            callbacks.onLoad(model);
        });
    } else if (envFormats.includes(extension)) {
        console.log("HDR detected:", file.name);
        // This will be handled in background.js later
    } else {
        alert("Unsupported format: ." + extension);
    }
}