// Load and place the city glTF into the scene, align it to ground, tile it, and build colliders.
export async function loadCity({ THREE, scene, path, file, scale, offset, worldWidth, worldDepth, highQuality, onProgress, buildColliders, convertMaterialsLowQuality }) {
  const loader = new THREE.GLTFLoader(); // Create the loader instance.
  loader.setPath(path); // Set the base path for asset URLs.
  // Wrap GLTFLoader.load in a promise so we can await.
  const gltf = await new Promise((resolve, reject) => {
    loader.load(file, resolve, (evt) => { if (onProgress) onProgress(evt); }, reject);
  });
  // Access the root scene of the glTF.
  const city = gltf.scene; // Get the loaded scene graph.
  // Apply scale and offset.
  city.scale.setScalar(scale); // Apply uniform scale.
  city.position.copy(offset); // Apply world offset.
  // Add to the scene before computing bounds.
  scene.add(city); // Insert the city into the active scene.
  // Update matrices and compute bounds to align with ground.
  city.updateMatrixWorld(true); // Ensure world transforms are current.
  const bboxAlign = new THREE.Box3().setFromObject(city); // Compute bounds.
  const bottomOffset = -bboxAlign.min.y; // Calculate offset to place bottom at y=0.
  city.position.y += bottomOffset; // Align to ground plane.
  city.updateMatrixWorld(true); // Update transforms after move.
  // Convert materials for low quality if provided.
  if (!highQuality && typeof convertMaterialsLowQuality === 'function') { convertMaterialsLowQuality(city); }
  // Build colliders for the base city if provided.
  if (typeof buildColliders === 'function') { buildColliders(city); }
  // Compute tiling dimensions.
  const bbox = new THREE.Box3().setFromObject(city); // Bounds after alignment.
  const tileWidth = bbox.max.x - bbox.min.x; // Tile size X.
  const tileDepth = bbox.max.z - bbox.min.z; // Tile size Z.
  const tilesX = Math.ceil((worldWidth / 2) / Math.max(1, tileWidth)); // Number of tiles in +X.
  const tilesZ = Math.ceil((worldDepth / 2) / Math.max(1, tileDepth)); // Number of tiles in +Z.
  // Place clones to fill the play area.
  for (let ix = -tilesX; ix <= tilesX; ix++) {
    for (let iz = -tilesZ; iz <= tilesZ; iz++) {
      if (ix === 0 && iz === 0) continue; // Skip the origin tile.
      const clone = city.clone(true); // Deep clone the city graph.
      clone.position.set(city.position.x + ix * tileWidth, city.position.y, city.position.z + iz * tileDepth); // Place clone.
      scene.add(clone); // Add to scene.
      clone.updateMatrixWorld(true); // Update transforms.
      if (!highQuality && typeof convertMaterialsLowQuality === 'function') { convertMaterialsLowQuality(clone); }
      if (typeof buildColliders === 'function') { buildColliders(clone); }
    }
  }
  // Return some metadata if needed by caller.
  const center = bbox.getCenter(new THREE.Vector3()); // Compute center for reference.
  return { bbox, center, tileWidth, tileDepth }; // Provide placement info.
}

