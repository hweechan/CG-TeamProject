import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION, ADDITION } from 'three-bvh-csg';

let cachedEvaluator: Evaluator | null = null;

export function getCSGEvaluator(): Evaluator {
  if (!cachedEvaluator) {
    cachedEvaluator = new Evaluator();
    // Cache settings for extreme speeds
    cachedEvaluator.useGroups = false; 
  }
  return cachedEvaluator;
}

/**
 * Operates CSG Subtract: targets - cutter
 */
export function subtractGeometry(
  targetMesh: THREE.Mesh,
  cutterMesh: THREE.Mesh
): THREE.BufferGeometry {
  const evaluator = getCSGEvaluator();
  
  // Create brushes
  const targetBrush = new Brush(targetMesh.geometry, targetMesh.material as THREE.Material);
  // Ensure we copy the exact world matrix
  targetBrush.position.copy(targetMesh.position);
  targetBrush.quaternion.copy(targetMesh.quaternion);
  targetBrush.scale.copy(targetMesh.scale);
  targetBrush.updateMatrixWorld(true);

  const cutterBrush = new Brush(cutterMesh.geometry, cutterMesh.material as THREE.Material);
  cutterBrush.position.copy(cutterMesh.position);
  cutterBrush.quaternion.copy(cutterMesh.quaternion);
  cutterBrush.scale.copy(cutterMesh.scale);
  cutterBrush.updateMatrixWorld(true);

  // Perform operational subtraction
  const resultBrush = evaluator.evaluate(targetBrush, cutterBrush, SUBTRACTION);
  
  // resultBrush has local scale/rotation reflecting the target brush.
  // We want to return its local geometry cloned
  return resultBrush.geometry.clone();
}

/**
 * Operates CSG Add: target + model
 */
export function addGeometry(
  targetMesh: THREE.Mesh,
  additionMesh: THREE.Mesh
): THREE.BufferGeometry {
  const evaluator = getCSGEvaluator();

  const targetBrush = new Brush(targetMesh.geometry, targetMesh.material as THREE.Material);
  targetBrush.position.copy(targetMesh.position);
  targetBrush.quaternion.copy(targetMesh.quaternion);
  targetBrush.scale.copy(targetMesh.scale);
  targetBrush.updateMatrixWorld(true);

  const additionBrush = new Brush(additionMesh.geometry, additionMesh.material as THREE.Material);
  additionBrush.position.copy(additionMesh.position);
  additionBrush.quaternion.copy(additionMesh.quaternion);
  additionBrush.scale.copy(additionMesh.scale);
  additionBrush.updateMatrixWorld(true);

  const resultBrush = evaluator.evaluate(targetBrush, additionBrush, ADDITION);
  return resultBrush.geometry.clone();
}

/**
 * Generates procedural bridge geometry
 */
export function createBridgeGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  // Let's make a beautiful bridge with horizontal steps, rails, and visual details
  const group = new THREE.Group();
  
  // Main deck
  const deckGeom = new THREE.BoxGeometry(width, height * 0.4, depth);
  const deck = new THREE.Mesh(deckGeom);
  deck.position.set(0, 0, 0);
  group.add(deck);

  // Safety railings on sides
  const railGeom = new THREE.BoxGeometry(0.15, 1.2, depth);
  const leftRail = new THREE.Mesh(railGeom);
  leftRail.position.set(-width / 2 + 0.1, 0.6, 0);
  
  const rightRail = new THREE.Mesh(railGeom);
  rightRail.position.set(width / 2 - 0.1, 0.6, 0);
  
  group.add(leftRail, rightRail);

  // Merge group geometries into a single BufferGeometry for clean physics/rendering
  const geometries: THREE.BufferGeometry[] = [];
  
  group.updateMatrix();
  deck.updateMatrix();
  leftRail.updateMatrix();
  rightRail.updateMatrix();

  geometries.push(deck.geometry.clone().applyMatrix4(deck.matrix));
  geometries.push(leftRail.geometry.clone().applyMatrix4(leftRail.matrix));
  geometries.push(rightRail.geometry.clone().applyMatrix4(rightRail.matrix));

  // Custom merge helper
  const merged = mergeBufferGeometries(geometries);
  return merged;
}

/**
 * Generates custom corridor stair/ramp geometry
 */
export function createCorridorRampGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const group = new THREE.Group();

  // Create an open corridor with side walls + flat center platform or a ramp
  const floorGeom = new THREE.BoxGeometry(width, 0.4, depth);
  const floor = new THREE.Mesh(floorGeom);
  floor.position.set(0, 0, 0);
  group.add(floor);

  // High side walls
  const wallH = height;
  const wallGeom = new THREE.BoxGeometry(0.4, wallH, depth);
  
  const leftWall = new THREE.Mesh(wallGeom);
  leftWall.position.set(-width / 2 + 0.2, wallH / 2, 0);

  const rightWall = new THREE.Mesh(wallGeom);
  rightWall.position.set(width / 2 - 0.2, wallH / 2, 0);

  // Roof (to make it distinct from a bridge!)
  const roofGeom = new THREE.BoxGeometry(width, 0.4, depth);
  const roof = new THREE.Mesh(roofGeom);
  roof.position.set(0, wallH, 0);

  group.add(leftWall, rightWall, roof);

  // Add 3 physical step rungs on the floor to make it a ramp-stair
  for (let i = 0; i < 4; i++) {
    const stepGeom = new THREE.BoxGeometry(width - 0.5, 0.5, 1.2);
    const step = new THREE.Mesh(stepGeom);
    // Stagger along depth z
    const zPos = -depth / 2 + (depth / 5) * (i + 1);
    const yPos = 0.2 + i * 0.4;
    step.position.set(0, yPos, zPos);
    group.add(step);
  }

  // Update matrices & merge
  const geometries: THREE.BufferGeometry[] = [];
  group.children.forEach((child) => {
    const mesh = child as THREE.Mesh;
    mesh.updateMatrix();
    geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));
  });

  return mergeBufferGeometries(geometries);
}

/**
 * Simple utility to combine buffer geometries manually without adding external dependencies
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVertices = 0;
  let totalIndices = 0;
  let hasUv = true;

  for (const geom of geometries) {
    const pos = geom.getAttribute('position');
    totalVertices += pos.count;
    if (geom.index) {
      totalIndices += geom.index.count;
    } else {
      totalIndices += pos.count;
    }
    if (!geom.getAttribute('uv')) {
      hasUv = false;
    }
  }

  const mergedPos = new Float32Array(totalVertices * 3);
  const mergedIndices = new Uint32Array(totalIndices);
  const mergedUv = hasUv ? new Float32Array(totalVertices * 2) : null;

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const geom of geometries) {
    const pos = geom.getAttribute('position');
    const verticesCount = pos.count;
    
    // Copy positions
    mergedPos.set(pos.array as Float32Array, vertexOffset * 3);

    // Copy UVs
    if (hasUv && mergedUv) {
      const uv = geom.getAttribute('uv');
      mergedUv.set(uv.array as Float32Array, vertexOffset * 2);
    }

    // Copy indices
    if (geom.index) {
      const idxArray = geom.index.array;
      for (let i = 0; i < geom.index.count; i++) {
        mergedIndices[indexOffset + i] = idxArray[i] + vertexOffset;
      }
      indexOffset += geom.index.count;
    } else {
      for (let i = 0; i < verticesCount; i++) {
        mergedIndices[indexOffset + i] = i + vertexOffset;
      }
      indexOffset += verticesCount;
    }

    vertexOffset += verticesCount;
  }

  const mergedGeometry = new THREE.BufferGeometry();
  mergedGeometry.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  if (hasUv && mergedUv) {
    mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));
  }
  mergedGeometry.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  mergedGeometry.computeVertexNormals();

  return mergedGeometry;
}
