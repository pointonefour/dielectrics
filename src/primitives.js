import * as THREE from 'three';
import { modelGroup } from './scene.js';
import { createDielectricInstance } from './engine.js'; 

export function spawnPrimitive(type) {
    let geometry;
    switch (type) {
        case 'sphere': geometry = new THREE.SphereGeometry(1, 64, 64); break;
        case 'torus': geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 128, 32); break;
        case 'box': geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5); break;
        default: return null;
    }

    const mesh = new THREE.Mesh(geometry, createDielectricInstance());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    modelGroup.add(mesh);
    return mesh;
}