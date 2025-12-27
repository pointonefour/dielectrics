import { loadModel, fitCameraToModel } from './loader.js';
import { scene, camera, controls } from './scene.js';
import * as Background from './background.js';
import { convertToDielectric, updateDielectric } from './dielectric.js';
import * as Primitives from './primitives.js';

/**
 * Shared Menu Positioning Logic (For Popups like Background/Primitives)
 */
function positionMenu(btn, menu) {
    if (window.innerWidth > 500) {
        const rect = btn.getBoundingClientRect();
        const menuWidth = 240;
        const padding = 20;

        let left = rect.left;
        if (left + menuWidth > window.innerWidth - padding) {
            left = window.innerWidth - menuWidth - padding;
        }

        let top = rect.bottom + 10;
        const menuHeight = menu.offsetHeight || 300;
        if (top + menuHeight > window.innerHeight - padding) {
            top = rect.top - menuHeight - 10;
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    } else {
        menu.style.left = '';
        menu.style.top = '';
    }
}

/**
 * Grays out color controls when HDR is active
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
    if (removeBtn) removeBtn.style.display = isHDR ? "block" : "none";
}

export function setupUI(callbacks) {
    // 1. Fetch DOM Elements
    const bgMenu = document.getElementById('bgMenu');
    const matMenu = document.getElementById('matMenu');
    const primitiveMenu = document.getElementById('primitiveMenu');
    const dropOverlay = document.getElementById('dropOverlay');
    const fileInput = document.getElementById('meshUpload');
    const dropZone = document.getElementById('dropZone');
    
    const uiEvent = 'mousedown'; 

    // 2. Define bind FIRST to avoid ReferenceErrors
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

    // --- MENU TOGGLES ---

    // Background (Popup)
    bind('bgSettingsBtn', (btn) => {
        const isActive = bgMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!isActive) {
            positionMenu(btn, bgMenu);
            bgMenu.classList.add('active');
        }
    });

    // Material (Side Panel - No positionMenu needed)
    bind('matSettingsBtn', () => {
        const isActive = matMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!isActive) matMenu.classList.add('active');
    });

    // Primitives (Popup)
    bind('primitiveMenuBtn', (btn) => {
        const isActive = primitiveMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!isActive) {
            positionMenu(btn, primitiveMenu);
            primitiveMenu.classList.add('active');
        }
    });

    // --- CONTEXT MENU DIELECTRIC CONVERSION ---
    bind('menuDielectric', () => {
        const success = callbacks.onConvertDielectric();
        if (success) {
            document.getElementById('contextMenu').style.display = 'none';
            // Slide in the side panel immediately after conversion
            matMenu.classList.add('active');
        }
    });

    // --- MATERIAL PROPERTY CONTROLS ---
    const onMaterialInput = () => {
        // Now calling updateDielectric directly without "Material." prefix
        updateDielectric({
            ior: parseFloat(document.getElementById('matIOR').value),
            transmission: parseFloat(document.getElementById('matTransmission').value),
            roughness: parseFloat(document.getElementById('matRoughness').value),
            thickness: parseFloat(document.getElementById('matThickness').value),
            color: document.getElementById('matColor').value
        });
    };
    
    ['matIOR', 'matTransmission', 'matRoughness', 'matThickness', 'matColor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', onMaterialInput);
    });

    // The Apply Button (Internal to side panel)
    // Inside setupUI in ui.js
    const applyMatBtn = document.getElementById('applyMatBtn');
    if (applyMatBtn) {
        applyMatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const current = callbacks.getCurrentModel();
            if (current) {
                convertToDielectric(current); // Call directly
            } else {
                alert("Please select a model first.");
            }
        });
    }

    const menuDielectric = document.getElementById('menuDielectric');
    if (menuDielectric) {
        menuDielectric.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const success = callbacks.onConvertDielectric();
            if (success) {
                document.getElementById('contextMenu').style.display = 'none';
                document.getElementById('matMenu').classList.add('active');
            }
        });
    }


    // --- PRIMITIVE SPAWNING ---
    ['addSphere', 'addTorus', 'addBox'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = id.replace('add', '').toLowerCase();
                const model = Primitives.spawnPrimitive(type);
                primitiveMenu.classList.remove('active');
                callbacks.onLoad(model); 
            });
        }
    });

    // --- DRAG & DROP ---
    window.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (dropOverlay) dropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.relatedTarget === null && dropOverlay) dropOverlay.classList.remove('active');
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (dropOverlay) dropOverlay.classList.remove('active');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0], callbacks);
        }
    });

    // --- FILE INPUT ---
    if (dropZone) dropZone.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0], callbacks);
            e.target.value = ''; 
        }
    });

    // --- BACKGROUND CONTROLS ---
    bind('removeHDRBtn', () => {
        Background.setSolidBackground(document.getElementById('bgColorPicker').value);
        updateBackgroundUI();
    });
    document.getElementById('bgColorPicker').addEventListener('input', (e) => Background.setSolidBackground(e.target.value));

    const onGradInput = () => {
        if (Background.getMode() === 'HDR') return;
        Background.setGradientBackground(
            document.getElementById('gradColor1').value,
            document.getElementById('gradColor2').value,
            document.getElementById('gradRotation').value
        );
    };
    ['gradColor1', 'gradColor2', 'gradRotation'].forEach(id => document.getElementById(id).addEventListener('input', onGradInput));

    const onHDRParamInput = () => {
        Background.updateParams(
            parseFloat(document.getElementById('bgIntensity').value),
            parseFloat(document.getElementById('bgBlur').value)
        );
    };
    ['bgIntensity', 'bgBlur'].forEach(id => document.getElementById(id).addEventListener('input', onHDRParamInput));

    // --- SYSTEM ---
    bind('gridToggleBtn', (btn) => {
        const visible = callbacks.onToggleGrid();
        visible ? btn.classList.add('active') : btn.classList.remove('active');
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
    }
}