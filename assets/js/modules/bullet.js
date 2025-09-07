// Export an initializer to load and prepare the pistol bullet model template.
export async function initBullet({ THREE, path, file, scale, highQuality }) { // Define a function to load the bullet model.
  // Create a new GLTFLoader instance for loading the bullet asset.
  const loader = new THREE.GLTFLoader(); // Instantiate the loader for glTF files.
  // Set the base path for resolving the bullet model resources.
  loader.setPath(path); // Configure the base URL for the loader.
  // Load the bullet glTF file and await the result.
  const gltf = await new Promise((resolve, reject) => { // Wrap the load in a Promise for async/await style.
    // Start loading the specified glTF file.
    loader.load(file, resolve, undefined, reject); // Resolve on success; reject on error.
  }); // End of Promise wrapper around GLTFLoader.load.
  // Access the root scene node from the loaded glTF.
  const root = gltf.scene; // Retrieve the scene graph representing the bullet.
  // Apply the requested uniform scale to the model.
  root.scale.setScalar(scale); // Scale the bullet model to the desired size.
  // Configure mesh shadow flags based on the quality setting.
  root.traverse(o => { if (o.isMesh) { o.castShadow = !!highQuality; o.receiveShadow = !!highQuality; } }); // Set mesh flags.
  // Return the prepared bullet template for cloning at runtime.
  return { template: root }; // Provide the template object back to the caller.
} // End of initBullet export.

