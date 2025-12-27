import { loadModel, fitCameraToModel } from './loader.js';
import { scene, camera, controls } from './scene.js';
import * as Background from './background.js';

/**
 * Updates the visual state of the menu (greying out sliders)
 */
function updateBackgroundUI() {
    const mode = Background.getMode();
    const colorSection = document.getElementById('colorControls');
    const removeBtn = document.getElementById('removeHDRBtn');
    const isHDR = (mode === 'HDR');

    if (colorSection) {
        const inputs = colorSection.querySelectorAll('input');
        inputs.forEach(i => {
            i.disabled = isHDR;
            i.parentElement.style.opacity = isHDR ? "0.3" : "1";
            i.style.pointerEvents = isHDR ? "none" : "auto";
        });
    }

    if (removeBtn) {
        removeBtn.style.display = isHDR ? "block" : "none";
    }
}

export function setupUI(callbacks) {
    const dropOverlay = document.getElementById('dropOverlay');
    const fileInput = document.getElementById('meshUpload');
    const dropZone = document.getElementById('dropZone');
    const bgMenu = document.getElementById('bgMenu');

    const uiEvent = 'mousedown'; 

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(uiEvent, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fn(e.currentTarget);
                e.currentTarget.blur();
            });
        }
    };

    // --- BACKGROUND MENU TOGGLE ---
    // --- BACKGROUND MENU TOGGLE ---
    bind('bgSettingsBtn', (btn) => {
        const isActive = bgMenu.classList.contains('active');
        
        if (isActive) {
            // Trigger Slide-Out Animation
            bgMenu.classList.remove('active');
        } else {
            // Only apply coordinate positioning if the screen is wider than mobile
            if (window.innerWidth > 500) {
                const rect = btn.getBoundingClientRect();
                const menuWidth = 240; // Matches CSS width
                const padding = 20;

                // 1. Calculate horizontal position (Clamp to right edge)
                let left = rect.left;
                if (left + menuWidth > window.innerWidth - padding) {
                    left = window.innerWidth - menuWidth - padding;
                }

                // 2. Calculate vertical position (Clamp to bottom edge)
                // Using a fallback height of 350 if the menu isn't currently visible to measure
                let top = rect.bottom + 10;
                const menuHeight = bgMenu.offsetHeight || 350; 
                
                if (top + menuHeight > window.innerHeight - padding) {
                    top = rect.top - menuHeight - 10; // Flip to above the button if no room below
                }

                bgMenu.style.left = `${left}px`;
                bgMenu.style.top = `${top}px`;
            } else {
                // On Mobile: Clear the JS styles so the CSS @media rule takes over (Bottom Sheet)
                bgMenu.style.left = '';
                bgMenu.style.top = '';
            }

            // Trigger Slide-In Animation
            bgMenu.classList.add('active');
        }
    });

    // --- REMOVE HDR BUTTON ---
    const removeBtn = document.getElementById('removeHDRBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const color = document.getElementById('bgColorPicker').value;
            Background.setSolidBackground(color);
            updateBackgroundUI();
        });
    }

    // --- SOLID COLOR CONTROL ---
    document.getElementById('bgColorPicker').addEventListener('input', (e) => {
        Background.setSolidBackground(e.target.value);
    });

    // --- GRADIENT CONTROLS ---
    const onGradientInput = () => {
        if (Background.getMode() === 'HDR') return;
        const c1 = document.getElementById('gradColor1').value;
        const c2 = document.getElementById('gradColor2').value;
        const rot = document.getElementById('gradRotation').value;
        Background.setGradientBackground(c1, c2, rot);
    };

    ['gradColor1', 'gradColor2', 'gradRotation'].forEach(id => {
        document.getElementById(id).addEventListener('input', onGradientInput);
    });

    // --- HDR PARAMETERS ---
    const onHDRParamInput = () => {
        const intensity = parseFloat(document.getElementById('bgIntensity').value);
        const blur = parseFloat(document.getElementById('bgBlur').value);
        Background.updateParams(intensity, blur);
    };

    ['bgIntensity', 'bgBlur'].forEach(id => {
        document.getElementById(id).addEventListener('input', onHDRParamInput);
    });

    // --- GRID/SNAP/HISTORY ---
    bind('gridToggleBtn', (btn) => {
        const isVisible = callbacks.onToggleGrid();
        isVisible ? btn.classList.add('active') : btn.classList.remove('active');
    });

    let snapActive = false;
    bind('snapToggleBtn', (btn) => {
        snapActive = !snapActive;
        callbacks.onToggleSnap(snapActive);
        snapActive ? btn.classList.add('active') : btn.classList.remove('active');
    });

    bind('undoBtn', () => callbacks.onUndo());
    bind('redoBtn', () => callbacks.onRedo());
    bind('menuTranslate', () => callbacks.onSetMode('translate'));
    bind('menuRotate', () => callbacks.onSetMode('rotate'));
    bind('menuScale', () => callbacks.onSetMode('scale'));
    bind('menuDelete', () => callbacks.onDelete());

    // --- FILE HANDLING ---
    if (dropZone) dropZone.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0], callbacks); });

    window.addEventListener('dragover', (e) => { e.preventDefault(); dropOverlay.classList.add('active'); });
    window.addEventListener('dragleave', (e) => { if (e.relatedTarget === null) dropOverlay.classList.remove('active'); });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dropOverlay.classList.remove('active');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], callbacks);
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
        Background.setHDRBackground(file, () => {
            updateBackgroundUI(); 
        });
    } else {
        alert("Unsupported format: ." + extension);
    }
}