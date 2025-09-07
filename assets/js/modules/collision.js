// Provide collision helper factories that operate on externally provided arrays.
export function makeCollisionHelpers({ THREE, collisionMeshes, collisionBoxes, collisionGrid, THIN_OBJECT_MIN_THICKNESS }) {
  // Add a Box3 to a spatial grid map keyed by ix,iy,iz indices.
  function addBoxToGrid(box) {
    const cell = 10; // Mirror the cell size used in game code.
    const gi = (v) => Math.floor(v / cell);
    const kk = (ix, iy, iz) => ix + ',' + iy + ',' + iz;
    const minIx = gi(box.min.x), minIy = gi(box.min.y), minIz = gi(box.min.z);
    const maxIx = gi(box.max.x), maxIy = gi(box.max.y), maxIz = gi(box.max.z);
    for (let ix = minIx; ix <= maxIx; ix++) {
      for (let iy = minIy; iy <= maxIy; iy++) {
        for (let iz = minIz; iz <= maxIz; iz++) {
          const key = kk(ix, iy, iz);
          let list = collisionGrid.get(key);
          if (!list) { list = []; collisionGrid.set(key, list); }
          list.push(collisionBoxes.length - 1);
        }
      }
    }
  }

  function buildCollidersFromModel(root) {
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        collisionMeshes.push(obj);
        if (!obj.geometry.boundingBox) {
          obj.geometry.computeBoundingBox();
        }
        const worldBox = obj.geometry.boundingBox.clone();
        worldBox.applyMatrix4(obj.matrixWorld);
        const worldSize = new THREE.Vector3();
        worldBox.getSize(worldSize);
        const isThin = Math.min(worldSize.x, worldSize.y, worldSize.z) < THIN_OBJECT_MIN_THICKNESS;
        obj.userData.isThin = isThin;
        collisionBoxes.push(worldBox);
        addBoxToGrid(worldBox);
      }
    });
  }

  function convertMaterialsLowQuality(root) {
    root.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const replaced = mats.map((mat) => {
          const m = new THREE.MeshLambertMaterial();
          if (mat.color) m.color.copy(mat.color);
          if (mat.map) m.map = mat.map;
          if (m.map && m.map.anisotropy !== undefined) m.map.anisotropy = 1;
          m.transparent = !!mat.transparent;
          if (typeof mat.opacity === 'number') m.opacity = mat.opacity;
          if (mat.side !== undefined) m.side = mat.side;
          return m;
        });
        obj.material = Array.isArray(obj.material) ? replaced : replaced[0];
      }
    });
  }

  return { buildCollidersFromModel, convertMaterialsLowQuality };
}

