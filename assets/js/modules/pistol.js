// Export an initializer to load and set up the pistol model and animations.
export async function initPistol({ THREE, camera, offset, scale, highQuality, path, file, yawOffset }) {
  // Create and configure a GLTFLoader using the global THREE namespace.
  const loader = new THREE.GLTFLoader();
  loader.setPath(path);
  // Wrap the load in a Promise for async/await usage.
  const gltf = await new Promise((resolve, reject) => {
    loader.load(file, resolve, undefined, reject);
  });
  // Clone the scene so the caller can manage the instance freely.
  const object = gltf.scene.clone(true);
  // Apply scale, offset and yaw rotation.
  object.scale.setScalar(scale);
  object.position.copy(offset);
  object.rotation.y += yawOffset || 0;
  // Configure mesh flags for lighting and shadows.
  object.traverse(o => { if (o.isMesh) { o.castShadow = !!highQuality; o.receiveShadow = !!highQuality; } });
  // Attach to the camera for first-person rendering.
  camera.add(object);
  // Build an animation mixer and subclips from the first clip.
  const mixer = new THREE.AnimationMixer(object);
  const actions = {};
  if (gltf.animations && gltf.animations.length > 0) {
    const source = gltf.animations[0];
    actions.fire = mixer.clipAction(THREE.AnimationUtils.subclip(source, 'fire', 0, 11, 30));
    actions.reloadA = mixer.clipAction(THREE.AnimationUtils.subclip(source, 'reloadA', 12, 82, 30));
    actions.firelast = mixer.clipAction(THREE.AnimationUtils.subclip(source, 'firelast', 83, 94, 30));
    actions.reloadB = mixer.clipAction(THREE.AnimationUtils.subclip(source, 'reloadB', 95, 175, 30));
    actions.hide = mixer.clipAction(THREE.AnimationUtils.subclip(source, 'hide', 176, 187, 30));
    actions.ready = mixer.clipAction(THREE.AnimationUtils.subclip(source, 'ready', 187, 233, 30));
    actions.ambient = mixer.clipAction(THREE.AnimationUtils.subclip(source, 'ambient', 234, 264, 30));
  }
  // Return the pistol API to the caller.
  return { object, mixer, actions };
}

