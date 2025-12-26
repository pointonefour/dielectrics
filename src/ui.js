import { loadModel, fitCameraToModel } from './loader.js';
import { scene, camera, controls } from './scene.js';

export function setupUI(callbacks) {
    const contextMenu = document.getElementById('contextMenu');
    const dropOverlay = document.getElementById('dropOverlay'); // The glow layer
    const fileInput = document.getElementById('meshUpload');
    const dropZone = document.getElementById('dropZone'); // The button
    
    // --- FULL WINDOW DRAG EVENTS (The Glow) ---
    
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropOverlay.classList.add('active'); // Show purple glow
    });

    window.addEventListener('dragleave', (e) => {
        // Only hide if the mouse actually leaves the browser window
        if (e.relatedTarget === null) {
            dropOverlay.classList.remove('active');
        }
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dropOverlay.classList.remove('active'); // Hide glow

        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0], callbacks);
        }
    });

    // --- BUTTON CLICK UPLOAD ---
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0], callbacks);
    });

    // --- OTHER UI BUTTONS (Grid, Snap, Undo, Redo) ---
    const gridBtn = document.getElementById('gridToggleBtn');
    if (gridBtn) {
        gridBtn.classList.add('active');
        gridBtn.addEventListener('click', (e) => {
            const isVisible = callbacks.onToggleGrid();
            gridBtn.classList.toggle('active', isVisible);
        });
    }

    const snapBtn = document.getElementById('snapToggleBtn');
    let snapActive = false;
    if (snapBtn) {
        snapBtn.addEventListener('click', () => {
            snapActive = !snapActive;
            callbacks.onToggleSnap(snapActive);
            snapBtn.classList.toggle('active', snapActive);
        });
    }

    // Undo/Redo/Context Menu Bindings (Keep your existing code for these)
    setupActionButtons(callbacks, contextMenu);
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
        console.log("HDR system coming soon...");
    } else {
        alert("Unsupported format: ." + extension);
    }
}

// Helper to keep setupUI clean
function setupActionButtons(callbacks, contextMenu) {
    document.getElementById('undoBtn')?.addEventListener('click', (e) => { e.preventDefault(); callbacks.onUndo(); });
    document.getElementById('redoBtn')?.addEventListener('click', (e) => { e.preventDefault(); callbacks.onRedo(); });

    const bindBtn = (id, mode) => {
        document.getElementById(id)?.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            callbacks.onSetMode(mode);
            contextMenu.style.display = 'none';
        });
    };
    bindBtn('menuTranslate', 'translate');
    bindBtn('menuRotate', 'rotate');
    bindBtn('menuScale', 'scale');
    document.getElementById('menuDelete')?.addEventListener('mousedown', (e) => {
        e.stopPropagation(); callbacks.onDelete();
        contextMenu.style.display = 'none';
    });
}