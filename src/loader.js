import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { modelGroup } from './scene.js';

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const stlLoader = new STLLoader();
const plyLoader = new PLYLoader();
const colladaLoader = new ColladaLoader();

export function loadModel(file, scene, callback) {
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop().toLowerCase();

    // Default material for files without one (STL, PLY)
    const defaultMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

    switch (extension) {
        case 'glb':
        case 'gltf':
            gltfLoader.load(url, (gltf) => finalizeLoad(gltf.scene, url, callback));
            break;
        case 'obj':
            objLoader.load(url, (obj) => finalizeLoad(obj, url, callback));
            break;
        case 'stl':
            stlLoader.load(url, (geo) => finalizeLoad(new THREE.Mesh(geo, defaultMat), url, callback));
            break;
        case 'ply':
            plyLoader.load(url, (geo) => {
                geo.computeVertexNormals();
                finalizeLoad(new THREE.Mesh(geo, defaultMat), url, callback);
            });
            break;
        case 'dae':
            colladaLoader.load(url, (collada) => finalizeLoad(collada.scene, url, callback));
            break;
        default:
            console.error("Format not supported");
            URL.revokeObjectURL(url);
    }
}

function finalizeLoad(model, url, callback) {
    modelGroup.add(model);
    URL.revokeObjectURL(url);
    if (callback) callback(model);
}

// THIS IS THE FUNCTION THAT WAS MISSING
export function fitCameraToModel(model, camera, controls) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Position camera based on model size
    const distance = maxDim * 2;
    camera.position.set(center.x + distance, center.y + distance, center.z + distance);
    
    controls.target.copy(center);
    camera.lookAt(center);
    controls.update();
}