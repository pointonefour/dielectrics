import { loadModel, fitCameraToModel } from './loader.js';
import { scene, camera, controls } from './scene.js';
import * as Background from './background.js';
import { convertToDielectric, updateMaterialInstance } from './engine.js'; 
import * as Primitives from './primitives.js';

/**
 * THE READER: Syncs the side panel sliders to match the selected model's material.
 */
export function syncMaterialSliders(model) {
    if (!model) return;

    let mat = null;
    model.traverse(child => { if (child.isMesh && !mat) mat = child.material; });

    const matMenu = document.getElementById('matMenu');
    if (mat && mat.isMeshPhysicalMaterial) {
        
        // Helper function to update elements safely
        const safeSet = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        safeSet('matIOR', mat.ior);
        safeSet('matTransmission', mat.transmission);
        safeSet('matOpacity', mat.opacity); 
        safeSet('matRoughness', mat.roughness);
        safeSet('matThickness', mat.thickness);
        
        const colorEl = document.getElementById('matColor');
        if (colorEl) colorEl.value = `#${mat.color.getHexString()}`;

        matMenu.style.opacity = "1";
        matMenu.style.pointerEvents = "auto";
    } else {
        if (matMenu) {
            matMenu.style.opacity = "0.5";
            matMenu.style.pointerEvents = "none";
        }
    }
}

/**
 * Shared Menu Positioning Logic
 */
function positionMenu(btn, menu) {
    if (window.innerWidth > 500) {
        const rect = btn.getBoundingClientRect();
        let left = rect.left;
        if (left + 240 > window.innerWidth - 20) left = window.innerWidth - 260;
        let top = rect.bottom + 10;
        if (top + 350 > window.innerHeight - 20) top = rect.top - 360;
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    } else {
        menu.style.left = ''; menu.style.top = '';
    }
}

/**
 * Greys out background sliders if HDR is active
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
        });
    }
    if (removeBtn) removeBtn.style.display = isHDR ? "block" : "none";
}

export function setupUI(callbacks) {
    const bgMenu = document.getElementById('bgMenu');
    const matMenu = document.getElementById('matMenu');
    const primitiveMenu = document.getElementById('primitiveMenu');
    const dropOverlay = document.getElementById('dropOverlay');
    const fileInput = document.getElementById('meshUpload');
    
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            fn(e.currentTarget);
        });
    };

    // --- 1. DRAG & DROP LISTENERS (FIXED) ---
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop browser from taking over
        if (dropOverlay) dropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.relatedTarget === null && dropOverlay) dropOverlay.classList.remove('active');
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation(); // CRITICAL: Stop browser from opening the file
        if (dropOverlay) dropOverlay.classList.remove('active');
        
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0], callbacks);
        }
    });

    // --- 2. MATERIAL INPUTS ---
    const onMaterialInput = () => {
        const current = callbacks.getCurrentModel();
        if (!current) return;

        let targetMat = null;
        current.traverse(c => { if (c.isMesh && !targetMat) targetMat = c.material; });

        if (targetMat && targetMat.isMeshPhysicalMaterial) {
            // SAFE HELPER
            const val = (id, defaultValue) => {
                const el = document.getElementById(id);
                // If element is missing, return the default (usually 1 for opacity)
                return el ? parseFloat(el.value) : defaultValue;
            };

            const colorEl = document.getElementById('matColor');

            updateMaterialInstance(targetMat, {
                ior: val('matIOR', 1.5),
                transmission: val('matTransmission', 1),
                opacity: val('matOpacity', 1), // FIXED: Defaults to 1 if missing
                roughness: val('matRoughness', 0.05),
                thickness: val('matThickness', 1),
                color: colorEl ? colorEl.value : '#ffffff'
            });
        }
    };
    ['matIOR', 'matTransmission', 'matRoughness', 'matThickness','matOpacity','matColor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', onMaterialInput);
    });

    // --- 3. TOP BUTTONS & CONTEXT MENU ---
    bind('bgSettingsBtn', (btn) => {
        const active = bgMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!active) { positionMenu(btn, bgMenu); bgMenu.classList.add('active'); }
    });
    bind('matSettingsBtn', () => {
        const active = matMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!active) { matMenu.classList.add('active'); syncMaterialSliders(callbacks.getCurrentModel()); }
    });
    bind('primitiveMenuBtn', (btn) => {
        const active = primitiveMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!active) { positionMenu(btn, primitiveMenu); primitiveMenu.classList.add('active'); }
    });

    // Restored Context Menu Bindings
    bind('menuDielectric', () => {
        if (callbacks.onConvertDielectric()) {
            document.getElementById('contextMenu').style.display = 'none';
            matMenu.classList.add('active');
            syncMaterialSliders(callbacks.getCurrentModel());
        }
    });
    bind('menuTranslate', () => { callbacks.onSetMode('translate'); document.getElementById('contextMenu').style.display = 'none'; });
    bind('menuRotate', () => { callbacks.onSetMode('rotate'); document.getElementById('contextMenu').style.display = 'none'; });
    bind('menuScale', () => { callbacks.onSetMode('scale'); document.getElementById('contextMenu').style.display = 'none'; });
    bind('menuDelete', () => { callbacks.onDelete(); document.getElementById('contextMenu').style.display = 'none'; });
    
    bind('applyMatBtn', () => {
        const current = callbacks.getCurrentModel();
        if (current) { convertToDielectric(current); syncMaterialSliders(current); }
    });

    // --- 4. PRIMITIVES ---
    ['addSphere', 'addTorus', 'addBox'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => {
            const model = Primitives.spawnPrimitive(id.replace('add', '').toLowerCase());
            primitiveMenu.classList.remove('active');
            callbacks.onLoad(model);
            syncMaterialSliders(model);
        });
    });

    // --- 5. BACKGROUND & SYSTEM ---
    bind('removeHDRBtn', () => { Background.setSolidBackground(document.getElementById('bgColorPicker').value); updateBackgroundUI(); });
    document.getElementById('bgColorPicker').addEventListener('input', (e) => Background.setSolidBackground(e.target.value));
    
    const onGradInput = () => {
        if (Background.getMode() === 'HDR') return;
        Background.setGradientBackground(document.getElementById('gradColor1').value, document.getElementById('gradColor2').value, document.getElementById('gradRotation').value);
    };
    ['gradColor1', 'gradColor2', 'gradRotation'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', onGradInput);
    });

    const onHDRParamInput = () => Background.updateParams(parseFloat(document.getElementById('bgIntensity').value), parseFloat(document.getElementById('bgBlur').value));
    ['bgIntensity', 'bgBlur'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', onHDRParamInput);
    });

    bind('gridToggleBtn', (btn) => { const v = callbacks.onToggleGrid(); v ? btn.classList.add('active') : btn.classList.remove('active'); });
    let snap = false;
    bind('snapToggleBtn', (btn) => { snap = !snap; callbacks.onToggleSnap(snap); snap ? btn.classList.add('active') : btn.classList.remove('active'); });
    bind('undoBtn', () => callbacks.onUndo());
    bind('redoBtn', () => callbacks.onRedo());

    // --- 6. MANUAL UPLOAD ---
    document.getElementById('dropZone').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0], callbacks);
            e.target.value = ''; // Clear value to allow same file re-upload
        }
    });
}

/**
 * Core File Handler logic
 */
function handleFile(file, callbacks) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['glb', 'gltf', 'obj', 'stl', 'ply', 'dae'].includes(ext)) {
        loadModel(file, scene, (model) => {
            fitCameraToModel(model, camera, controls);
            callbacks.onLoad(model);
        });
    } else if (['hdr', 'exr'].includes(ext)) {
        Background.setHDRBackground(file, () => updateBackgroundUI());
    }
}