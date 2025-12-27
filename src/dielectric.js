import * as THREE from 'three';

const dielectricMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 1.0,
    ior: 1.5,
    thickness: 1.0,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
});

const convertToDielectric = (model) => {
    if (!model) return;
    model.traverse((child) => {
        if (child.isMesh) {
            if (child.geometry.attributes.color) child.geometry.deleteAttribute('color');
            child.material = dielectricMaterial;
            child.geometry.computeVertexNormals();
            child.material.needsUpdate = true;
        }
    });
    console.log("Dielectric conversion triggered!");
};

const updateDielectric = (params) => {
    for (const key in params) {
        if (dielectricMaterial[key] !== undefined) {
            if (key === 'color') dielectricMaterial.color.set(params[key]);
            else dielectricMaterial[key] = params[key];
        }
    }
    dielectricMaterial.needsUpdate = true;
};

// Exporting at the bottom is often more stable for hot-reloading
export { dielectricMaterial, convertToDielectric, updateDielectric };