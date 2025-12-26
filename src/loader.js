import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { modelGroup } from './scene.js'; // MUST import this

const loader = new GLTFLoader();

export function loadModel(file, scene, callback) {
    const url = URL.createObjectURL(file);
    loader.load(url, (gltf) => {
        const model = gltf.scene;
        
        // CRITICAL: Add to modelGroup, not the scene directly
        modelGroup.add(model); 
        
        URL.revokeObjectURL(url);
        if (callback) callback(model);
    });
}

export function fitCameraToModel(model, camera, controls) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
    controls.target.copy(center);
    camera.lookAt(center);
    controls.update();
}