import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function loadModel(file, scene, callback) {
    const url = URL.createObjectURL(file);
    loader.load(url, (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        URL.revokeObjectURL(url);
        if (callback) callback(model);
    });
}

export function fitCameraToModel(model, camera, controls) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    model.position.sub(center); // Center the model
    
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}