import * as THREE from 'three';

const dielectricSettings = {
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 1.0,
    ior: 1.5,
    thickness: 1.0,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5
};

export function createDielectricInstance() {
    return new THREE.MeshPhysicalMaterial(dielectricSettings);
}

export function convertToDielectric(model) {
    if (!model) return;
    const newMat = createDielectricInstance();
    model.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry.attributes.color) child.geometry.deleteAttribute('color');
            child.material = newMat;
            child.geometry.computeVertexNormals();
            child.material.needsUpdate = true;
        }
    });
    return newMat;
}

export function updateMaterialInstance(material, params) {
    if (!material) return;
    for (const key in params) {
        if (material[key] !== undefined) {
            if (key === 'color') material.color.set(params[key]);
            else material[key] = params[key];
        }
    }
    material.needsUpdate = true;
}