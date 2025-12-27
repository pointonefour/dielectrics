import * as THREE from 'three';
import { modelGroup } from './scene.js';
import { dielectricMaterial } from './dielectric.js';

/**
 * Spawns a high-quality primitive mesh with the dielectric material pre-attached
 */
export function spawnPrimitive(type) {
    let geometry;

    switch (type) {
        case 'sphere':
            // High segments (64) are essential for smooth glass refraction
            geometry = new THREE.SphereGeometry(1, 64, 64);
            break;
            
        case 'torus':
            // Torus Knot creates beautiful complex refractions
            geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 128, 32);
            break;
            
        case 'box':
            // Standard Box (approx 1.5 units)
            geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            break;
            
        default:
            console.error("Unknown primitive type:", type);
            return null;
    }

    const mesh = new THREE.Mesh(geometry, dielectricMaterial);
    
    // Enable shadows for the mesh
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add it to the global model group
    modelGroup.add(mesh);

    console.log(`Spawned primitive: ${type}`);
    return mesh;
}