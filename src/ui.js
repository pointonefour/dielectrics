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
        document.getElementById('matIOR').value = mat.ior;
        document.getElementById('matTransmission').value = mat.transmission;
        document.getElementById('matRoughness').value = mat.roughness;
        document.getElementById('matThickness').value = mat.thickness;
        document.getElementById('matColor').value = `#${mat.color.getHexString()}`;
        matMenu.style.opacity = "1";
        matMenu.style.pointerEvents = "auto";
    } else {
        matMenu.style.opacity = "0.5";
        matMenu.style.pointerEvents = "none";
    }
}

function positionMenu(btn, menu) {
    if (window.innerWidth > 500) {
        const rect = btn.getBoundingClientRect();
        let left = rect.left;
        if (left + 240 > window.innerWidth - 20) left = window.innerWidth - 260;
        let top = rect.bottom + 10;
        if (top + 300 > window.innerHeight - 20) top = rect.top - 310;
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    } else {
        menu.style.left = ''; menu.style.top = '';
    }
}

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
            e.currentTarget.blur();
        });
    };

    // Material Inputs
    const onMaterialInput = () => {
        const current = callbacks.getCurrentModel();
        if (!current) return;
        let targetMat = null;
        current.traverse(child => { if (child.isMesh && !targetMat) targetMat = child.material; });
        if (targetMat) {
            updateMaterialInstance(targetMat, {
                ior: parseFloat(document.getElementById('matIOR').value),
                transmission: parseFloat(document.getElementById('matTransmission').value),
                roughness: parseFloat(document.getElementById('matRoughness').value),
                thickness: parseFloat(document.getElementById('matThickness').value),
                color: document.getElementById('matColor').value
            });
        }
    };
    ['matIOR', 'matTransmission', 'matRoughness', 'matThickness', 'matColor'].forEach(id => {
        document.getElementById(id).addEventListener('input', onMaterialInput);
    });

    // Toggles
    bind('bgSettingsBtn', (btn) => {
        const isActive = bgMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!isActive) { positionMenu(btn, bgMenu); bgMenu.classList.add('active'); }
    });
    bind('matSettingsBtn', () => {
        const isActive = matMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!isActive) { matMenu.classList.add('active'); syncMaterialSliders(callbacks.getCurrentModel()); }
    });
    bind('primitiveMenuBtn', (btn) => {
        const isActive = primitiveMenu.classList.contains('active');
        document.querySelectorAll('.sleek-menu').forEach(m => m.classList.remove('active'));
        if (!isActive) { positionMenu(btn, primitiveMenu); primitiveMenu.classList.add('active'); }
    });

    // Conversion
    bind('menuDielectric', () => {
        const success = callbacks.onConvertDielectric();
        if (success) {
            document.getElementById('contextMenu').style.display = 'none';
            matMenu.classList.add('active');
            syncMaterialSliders(callbacks.getCurrentModel());
        }
    });
    document.getElementById('applyMatBtn').addEventListener('click', () => {
        const current = callbacks.getCurrentModel();
        if (current) { convertToDielectric(current); syncMaterialSliders(current); }
    });

    // Primitives
    ['addSphere', 'addTorus', 'addBox'].forEach(id => {
        document.getElementById(id).addEventListener('click', () => {
            const type = id.replace('add', '').toLowerCase();
            const model = Primitives.spawnPrimitive(type);
            primitiveMenu.classList.remove('active');
            callbacks.onLoad(model);
            syncMaterialSliders(model);
        });
    });

    // Background & System
    bind('removeHDRBtn', () => { Background.setSolidBackground(document.getElementById('bgColorPicker').value); updateBackgroundUI(); });
    document.getElementById('bgColorPicker').addEventListener('input', (e) => Background.setSolidBackground(e.target.value));
    
    const onGradInput = () => {
        if (Background.getMode() === 'HDR') return;
        Background.setGradientBackground(document.getElementById('gradColor1').value, document.getElementById('gradColor2').value, document.getElementById('gradRotation').value);
    };
    ['gradColor1', 'gradColor2', 'gradRotation'].forEach(id => document.getElementById(id).addEventListener('input', onGradInput));

    const onHDRParamInput = () => Background.updateParams(parseFloat(document.getElementById('bgIntensity').value), parseFloat(document.getElementById('bgBlur').value));
    ['bgIntensity', 'bgBlur'].forEach(id => document.getElementById(id).addEventListener('input', onHDRParamInput));

    bind('gridToggleBtn', (btn) => { const v = callbacks.onToggleGrid(); v ? btn.classList.add('active') : btn.classList.remove('active'); });
    let snap = false;
    bind('snapToggleBtn', (btn) => { snap = !snap; callbacks.onToggleSnap(snap); snap ? btn.classList.add('active') : btn.classList.remove('active'); });
    bind('undoBtn', () => callbacks.onUndo());
    bind('redoBtn', () => callbacks.onRedo());
    bind('menuTranslate', () => callbacks.onSetMode('translate'));
    bind('menuRotate', () => callbacks.onSetMode('rotate'));
    bind('menuScale', () => callbacks.onSetMode('scale'));
    bind('menuDelete', () => callbacks.onDelete());

    // Files
    window.addEventListener('dragover', (e) => { e.preventDefault(); dropOverlay.classList.add('active'); });
    window.addEventListener('dragleave', (e) => { if (e.relatedTarget === null) dropOverlay.classList.remove('active'); });
    window.addEventListener('drop', (e) => {
        e.preventDefault(); dropOverlay.classList.remove('active');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], callbacks);
    });
    document.getElementById('dropZone').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) { handleFile(e.target.files[0], callbacks); e.target.value = ''; } });
}

function handleFile(file, callbacks) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['glb', 'gltf', 'obj', 'stl', 'ply', 'dae'].includes(ext)) {
        loadModel(file, scene, (model) => { fitCameraToModel(model, camera, controls); callbacks.onLoad(model); });
    } else if (['hdr', 'exr'].includes(ext)) {
        Background.setHDRBackground(file, () => updateBackgroundUI());
    }
}