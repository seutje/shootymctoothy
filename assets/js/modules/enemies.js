// Export an initializer to load and prepare the enemy model template.
export async function initEnemies({ THREE, HIGH_QUALITY, path, file, scale }) {
  // Create a GLTFLoader instance for enemy assets.
  const loader = new THREE.GLTFLoader(); // Instantiate the GLTF loader for enemy models.
  // Configure the loader to the provided base path.
  loader.setPath(path); // Set the base path for resolving enemy model resources.
  // Load the enemy glTF asynchronously and return the parsed result.
  const gltf = await new Promise((resolve, reject) => { // Wrap the loader in a promise.
    // Start loading the specified enemy file.
    loader.load(file, resolve, undefined, reject); // Load the model and resolve on success.
  }); // End of promise wrapper for loader.
  // Access the root scene object from the glTF.
  const root = gltf.scene; // Retrieve the enemy model root object.
  // Apply a uniform scale to the enemy root.
  root.scale.setScalar(scale); // Scale the enemy model to the configured size.
  // Configure mesh shadow flags based on quality.
  root.traverse(o => { if (o.isMesh) { o.castShadow = !!HIGH_QUALITY; o.receiveShadow = !!HIGH_QUALITY; } }); // Set mesh properties.
  // Return the template for cloning to create enemy instances.
  return { template: root }; // Provide the prepared root to the caller.
}

