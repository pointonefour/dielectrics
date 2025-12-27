import * as THREE from 'three';
// 1. FIX: RGBELoader is now HDRLoader in the latest Three.js versions
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'; 
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { scene } from './scene.js';

const hdrLoader = new HDRLoader(); // Renamed from rgbeLoader
const exrLoader = new EXRLoader();

// 2. FIX: Value out of range (toHalfFloat)
// By default, EXRLoader tries to compress data to 16-bit (HalfFloat).
// If your GIMP file has values > 65504, it crashes. 
// We set it to FloatType (32-bit) to handle the full range of your EXR.
exrLoader.setDataType(THREE.FloatType); 

let gradientTexture = null;
let currentMode = 'COLOR';

export function setSolidBackground(color) {
    currentMode = 'COLOR';
    scene.background = new THREE.Color(color);
    scene.environment = null;
}

export function setGradientBackground(color1, color2, rotation) {
    if (currentMode === 'HDR') return; 
    currentMode = 'GRADIENT';
    
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const angle = (rotation * Math.PI) / 180;
    
    const x1 = 256 - Math.cos(angle) * 256;
    const y1 = 256 - Math.sin(angle) * 256;
    const x2 = 256 + Math.cos(angle) * 256;
    const y2 = 256 + Math.sin(angle) * 256;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    if (gradientTexture) gradientTexture.dispose();
    gradientTexture = new THREE.CanvasTexture(canvas);
    scene.background = gradientTexture;
    scene.environment = null;
}

export function setHDRBackground(file, onComplete) {
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop().toLowerCase();

    const applyTexture = (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        currentMode = 'HDR';
        URL.revokeObjectURL(url);
        if (onComplete) onComplete();
    };

    if (extension === 'exr') {
        exrLoader.load(url, applyTexture, undefined, (err) => {
            console.error("EXR Load Error:", err);
            URL.revokeObjectURL(url);
        });
    } else {
        // Use the new hdrLoader name
        hdrLoader.load(url, applyTexture, undefined, (err) => {
            console.error("HDR Load Error:", err);
            URL.revokeObjectURL(url);
        });
    }
}

export function updateParams(intensity, blur) {
    scene.backgroundIntensity = intensity;
    scene.backgroundBlurriness = blur;
    if (scene.environment) scene.environmentIntensity = intensity;
}

export function getMode() { return currentMode; }