// Create a new Three.js scene.
const scene = new THREE.Scene(); // Create a new Three.js scene instance.
// Set a blue color as the fallback background.
scene.background = new THREE.Color(0x87ceeb);
// Create a texture loader for loading textures.
const textureLoader = new THREE.TextureLoader(); // Create a loader for basic textures.
// Load the equirectangular sky texture.
const skyTexture = textureLoader.load('assets/images/texture-sky.png'); // Load the sky texture from assets.
// Set the texture mapping mode for reflections.
skyTexture.mapping = THREE.EquirectangularReflectionMapping; // Enable equirectangular environment mapping.
// Use the texture as the background of the scene.
scene.background = skyTexture; // Set the scene background to the loaded sky.
// Use the same texture for environment reflections.
// Note: enable reflections only in high quality mode to save performance.
// Flag to enable higher quality rendering and effects.
const HIGH_QUALITY = true; // Set to true for higher quality at the cost of performance.
// Apply the environment texture only when high quality is enabled.
if (HIGH_QUALITY) { scene.environment = skyTexture; } // Use the sky as the environment map for PBR materials.

// Flag to indicate that we use the GLTF city scene for the level geometry.
const USE_GLTF_SCENE = true; // Toggle to switch from procedural ground/obstacles to GLTF scene.
// Scalar used to uniformly scale the loaded city model.
const CITY_SCALE = 15; // Adjust this scale to make the city larger or smaller.
// Vector used to offset the city model in world space.
const CITY_OFFSET = new THREE.Vector3(0, 0, 0); // Adjust this offset to reposition the city.
// Flag to track whether assets are still loading to control rendering.
let assetsLoading = USE_GLTF_SCENE ? true : false; // Start in loading state when using the GLTF scene.
// Store the world width for obstacle placement calculations and tiling.
const worldWidth = 500; // Define the approximate world width for bounds.
// Store the world depth for obstacle placement calculations and tiling.
const worldDepth = 500; // Define the approximate world depth for bounds.

// Arrays used for collision detection against the loaded GLTF scene.
const collisionMeshes = []; // Store all mesh objects from the GLTF for raycasting.
const collisionBoxes = []; // Store world-space axis-aligned bounding boxes for broad-phase checks.
// Shared raycaster to reduce allocations during frequent collision and height queries.
const sharedRaycaster = new THREE.Raycaster(); // Create a reusable raycaster instance.
// Temporary vectors reused to avoid per-frame garbage collection pressure.
const tmpVec3A = new THREE.Vector3(); // Allocate a temporary vector for positions and directions.
const tmpVec3B = new THREE.Vector3(); // Allocate another temporary vector for intermediate math.
// Spatial grid cell size used to index collision boxes.
const collisionGridCellSize = 10; // Define the size of each grid cell in world units.
// Spatial hash map from cell key to a list of box indices.
const collisionGrid = new Map(); // Create a map to store which boxes occupy which cells.
// Minimum thickness below which geometry is treated as pass-through.
const THIN_OBJECT_MIN_THICKNESS = 1.5; // Increase threshold so slightly thicker objects are pass-through.

// Enemy model configuration and loading state.
const ENEMY_MODEL_PATH = 'assets/models/monster/'; // Define the base path where the enemy model assets reside.
const ENEMY_MODEL_FILE = 'scene.gltf'; // Define the filename of the enemy model to load.
const ENEMY_MODEL_SCALE = 1; // Define a uniform scale factor to apply to the enemy model (1/20th size).
let enemyModelTemplate = null; // Store the loaded enemy model that will be cloned for each enemy.
let enemyModelReady = false; // Track whether the enemy model has finished loading.
let enemySpawnQueue = 0; // Count how many enemies should be spawned once the model is ready.

// Helper to compute a grid cell index from a coordinate.
function gridIndex(v) { // Define a function that converts a coordinate to a grid index.
    // Divide by cell size and floor to get the integer index.
    return Math.floor(v / collisionGridCellSize); // Return the integer cell index along one axis.
}

// Helper to build a string key for a grid cell.
function gridKey(ix, iy, iz) { // Define a function that builds a key for the grid map.
    // Concatenate the indices with commas for a unique key.
    return ix + ',' + iy + ',' + iz; // Return the composite string key.
}

// Helper to add a world-space Box3 to the spatial grid.
function addBoxToCollisionGrid(box, boxIndex) { // Define a function to index a box into the grid.
    // Compute the min cell indices by converting the min corner to grid space.
    const minIx = gridIndex(box.min.x); // Calculate the minimum x cell index.
    const minIy = gridIndex(box.min.y); // Calculate the minimum y cell index.
    const minIz = gridIndex(box.min.z); // Calculate the minimum z cell index.
    // Compute the max cell indices by converting the max corner to grid space.
    const maxIx = gridIndex(box.max.x); // Calculate the maximum x cell index.
    const maxIy = gridIndex(box.max.y); // Calculate the maximum y cell index.
    const maxIz = gridIndex(box.max.z); // Calculate the maximum z cell index.
    // Loop over all cells touched by this box.
    for (let ix = minIx; ix <= maxIx; ix++) { // Iterate over x axis cells.
        for (let iy = minIy; iy <= maxIy; iy++) { // Iterate over y axis cells.
            for (let iz = minIz; iz <= maxIz; iz++) { // Iterate over z axis cells.
                // Build the grid cell key string.
                const key = gridKey(ix, iy, iz); // Construct the cell key.
                // Retrieve the existing list or create a new one.
                let list = collisionGrid.get(key); // Look up the array of indices for this cell.
                // Initialize the list when missing.
                if (!list) { list = []; collisionGrid.set(key, list); } // Create the array and store it into the map.
                // Add this box index to the list for this cell.
                list.push(boxIndex); // Record that this cell contains this box.
            }
        }
    }
} // End of addBoxToCollisionGrid helper.

// Helper to query nearby boxes for a sphere via the spatial grid.
function queryBoxesNearSphere(position, radius) { // Define a function to find candidate boxes near a sphere.
    // Compute the min and max corners of the sphere's AABB.
    const minX = position.x - radius; // Calculate the minimum x bound.
    const minY = position.y - radius; // Calculate the minimum y bound.
    const minZ = position.z - radius; // Calculate the minimum z bound.
    const maxX = position.x + radius; // Calculate the maximum x bound.
    const maxY = position.y + radius; // Calculate the maximum y bound.
    const maxZ = position.z + radius; // Calculate the maximum z bound.
    // Convert the AABB corners to grid indices.
    const minIx = gridIndex(minX); // Convert the minimum x to a grid index.
    const minIy = gridIndex(minY); // Convert the minimum y to a grid index.
    const minIz = gridIndex(minZ); // Convert the minimum z to a grid index.
    const maxIx = gridIndex(maxX); // Convert the maximum x to a grid index.
    const maxIy = gridIndex(maxY); // Convert the maximum y to a grid index.
    const maxIz = gridIndex(maxZ); // Convert the maximum z to a grid index.
    // Use a set to deduplicate box indices gathered from multiple cells.
    const candidate = new Set(); // Create a set to hold unique box indices.
    // Loop over overlapped cells to collect box indices.
    for (let ix = minIx; ix <= maxIx; ix++) { // Iterate over x axis cells.
        for (let iy = minIy; iy <= maxIy; iy++) { // Iterate over y axis cells.
            for (let iz = minIz; iz <= maxIz; iz++) { // Iterate over z axis cells.
                // Build the key for this cell.
                const key = gridKey(ix, iy, iz); // Construct the cell key string.
                // Look up any boxes registered to this cell.
                const list = collisionGrid.get(key); // Retrieve the array of indices for this cell.
                // Add each box index from this cell to the candidate set.
                if (list) { list.forEach(idx => candidate.add(idx)); } // Insert indices if present.
            }
        }
    }
    // Convert the set of indices into an array of boxes.
    return Array.from(candidate).map(idx => collisionBoxes[idx]); // Map indices back to Box3 objects.
} // End of queryBoxesNearSphere helper.

// Helper to build collider data from a loaded GLTF scene node.
function buildCollidersFromModel(root) { // Define a function that extracts colliders from the GLTF scene.
    // Update world matrices to ensure bounding boxes are accurate.
    root.updateMatrixWorld(true); // Force world matrices to update for all descendants.
    // Traverse each child of the root scene.
    root.traverse((obj) => { // Walk through the node hierarchy.
        // Only process mesh objects for collision.
        if (obj.isMesh) { // Check if this object is a mesh.
            // Enable shadow casting and receiving to integrate with lighting.
            obj.castShadow = true; // Allow this mesh to cast shadows.
            obj.receiveShadow = true; // Allow this mesh to receive shadows.
            // Freeze transforms for static geometry to skip per-frame matrix updates.
            obj.matrixAutoUpdate = false; // Disable automatic world matrix updates for static meshes.
            // Add the mesh to the list used for raycasting.
            collisionMeshes.push(obj); // Store the mesh for precise ray intersections.
            // Ensure the geometry has a bounding box.
            if (!obj.geometry.boundingBox) { // Check if the geometry lacks a bounding box.
                obj.geometry.computeBoundingBox(); // Compute the geometry's local-space bounding box.
            }
            // Clone the local bounding box to transform it to world space.
            const worldBox = obj.geometry.boundingBox.clone(); // Clone the local bounding box.
            // Apply the world matrix to move the box into world coordinates.
            worldBox.applyMatrix4(obj.matrixWorld); // Transform the bounding box into world space.
            // Compute the world-space size of this mesh's bounds.
            const worldSize = new THREE.Vector3(); // Prepare a vector to hold the box size.
            // Measure the size along x, y, and z axes.
            worldBox.getSize(worldSize); // Calculate dimensions of the transformed box.
            // Decide if the object should count as thin for collision purposes.
            const isThin = Math.min(worldSize.x, worldSize.y, worldSize.z) < THIN_OBJECT_MIN_THICKNESS; // Check the smallest extent.
            // Record the thinness on the mesh for later ray-based filtering.
            obj.userData.isThin = isThin; // Store a flag indicating thin geometry.
            // Store the transformed world-space bounding box.
            collisionBoxes.push(worldBox); // Save the world-space box for simple collision checks.
            // Index this box into the spatial grid for fast queries.
            addBoxToCollisionGrid(worldBox, collisionBoxes.length - 1); // Register the box into the grid structure.
        }
    });
} // End of buildCollidersFromModel helper.

// Helper to determine if a raycast object belongs to thin geometry.
function isThinHitObject(obj) { // Define a function to detect thin meshes in a hierarchy.
    // Start from the provided object.
    let cur = obj; // Initialize the traversal pointer.
    // Traverse upward until a flag is found or the root is reached.
    while (cur) { // Continue while there is a valid object.
        // Return the stored thin flag when present.
        if (cur.userData && typeof cur.userData.isThin === 'boolean') { return cur.userData.isThin; } // Use the mesh flag if available.
        // Move to the parent node in the hierarchy.
        cur = cur.parent; // Ascend to the parent object.
    }
    // Default to solid when no information is available.
    return false; // Assume not thin if unknown.
} // End of isThinHitObject helper.

// Helper to replace heavy PBR materials with cheaper ones in low quality mode.
function convertCityMaterialsLowQuality(root) { // Define a function to downgrade city materials for performance.
    // Traverse the scene graph to find mesh materials.
    root.traverse((obj) => { // Visit every descendant of the root node.
        // Only process mesh objects that have a material.
        if (obj.isMesh && obj.material) { // Ensure the object is a mesh with a material.
            // Normalize to an array to handle multi-material meshes.
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material]; // Create an array of materials.
            // Build a list of replacement materials.
            const replaced = materials.map((mat) => { // Map each original material to a new one.
                // Create a cheaper lambert material to replace PBR shading.
                const m = new THREE.MeshLambertMaterial(); // Allocate a lambert material which is faster to render.
                // Copy the color property if defined.
                if (mat.color) { m.color.copy(mat.color); } // Preserve base color when present.
                // Copy the base color texture if present.
                if (mat.map) { m.map = mat.map; } // Preserve the diffuse texture map when available.
                // Lower anisotropy to reduce texture sampling cost.
                if (m.map && m.map.anisotropy !== undefined) { m.map.anisotropy = 1; } // Force minimal anisotropy for performance.
                // Copy transparency flags so alpha surfaces still work.
                m.transparent = !!mat.transparent; // Keep transparency behavior of the original material.
                // Copy opacity value if set.
                if (typeof mat.opacity === 'number') { m.opacity = mat.opacity; } // Preserve opacity when provided.
                // Copy double sided flag if used by the original.
                if (mat.side !== undefined) { m.side = mat.side; } // Preserve face culling mode.
                // Return the replacement material.
                return m; // Provide the new, cheaper material to use.
            });
            // Apply the correct material type back to the mesh.
            obj.material = Array.isArray(obj.material) ? replaced : replaced[0]; // Assign either array or single material.
        }
    });
} // End of convertCityMaterialsLowQuality helper.

// Helper to merge static meshes by material to reduce draw calls.
function mergeCityMeshesByMaterial(root) { // Define a function to merge meshes that share the same material.
    // Ensure world matrices are current before extracting geometry.
    root.updateMatrixWorld(true); // Update world transforms for accurate merging.
    // Create a map from material UUID to an array of world-space geometries to merge.
    const groups = new Map(); // Initialize a map to group geometries by material.
    // Create an array to track original meshes to remove after merging.
    const toRemove = []; // Keep a list of meshes scheduled for removal.
    // Traverse the node hierarchy to collect meshes.
    root.traverse((obj) => { // Visit every descendant under the root.
        // Process only standard meshes with a geometry and material.
        if (obj.isMesh && obj.geometry && obj.material) { // Check object type and data presence.
            // Normalize to an array to handle multi-material meshes.
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material]; // Ensure we can iterate materials.
            // Skip meshes with multiple materials to avoid index buffer complexity.
            if (materials.length !== 1) { return; } // Abort for multi-material meshes to keep merging simple.
            // Retrieve the single material used by this mesh.
            const material = materials[0]; // Access the mesh material.
            // Compute a unique key for this material instance.
            const key = material.uuid; // Use the UUID to group identical materials.
            // Clone the geometry so we can bake the world transform into it.
            const geom = obj.geometry.clone(); // Duplicate the buffer geometry for transformation.
            // Apply the mesh's world transform to the cloned geometry.
            geom.applyMatrix4(obj.matrixWorld); // Bake the world transform into the geometry.
            // Retrieve or create the array for this material group.
            const arr = groups.get(key) || []; // Get the list of geometries for this material.
            // Append the transformed geometry to the group array.
            arr.push(geom); // Collect the geometry for merging.
            // Store back the array to the map in case it was newly created.
            groups.set(key, arr); // Update the group map with the new list.
            // Track this mesh so we can remove it after merging.
            toRemove.push(obj); // Schedule the original mesh for removal.
        }
    });
    // Remove all original meshes that have been scheduled for merging.
    toRemove.forEach(m => { if (m.parent) { m.parent.remove(m); } }); // Detach merged meshes from the scene graph.
    // If there are no groups, exit early.
    if (groups.size === 0) { return; } // Nothing to merge when no groups were collected.
    // Iterate over each material group to create merged meshes.
    groups.forEach((geometries, key) => { // Loop over all grouped geometries.
        // Merge the geometries using the utility function.
        const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries, false); // Merge into a single geometry.
        // Find a representative material to reuse.
        let materialRef = null; // Initialize the material reference.
        // Attempt to find a material from any removed mesh that matches the UUID.
        for (let i = 0; i < toRemove.length; i++) { // Iterate over removed meshes.
            // Check if this mesh's material has the same UUID as the group key.
            const mat = Array.isArray(toRemove[i].material) ? toRemove[i].material[0] : toRemove[i].material; // Access the mesh material.
            // Compare UUIDs to find a match.
            if (mat && mat.uuid === key) { materialRef = mat; break; } // Select this material as the representative.
        }
        // Fallback to a basic lambert material when no reference was found.
        if (!materialRef) { materialRef = new THREE.MeshLambertMaterial({ color: 0x808080 }); } // Provide a default material.
        // Create a new mesh with the merged geometry and selected material.
        const mergedMesh = new THREE.Mesh(merged, materialRef); // Instantiate the merged mesh.
        // Freeze transforms as the geometry is already in world space.
        mergedMesh.matrixAutoUpdate = false; // Disable automatic transform updates.
        // Add the merged mesh directly to the scene so world-space geometry renders correctly.
        scene.add(mergedMesh); // Insert the merged mesh into the scene.
    });
} // End of mergeCityMeshesByMaterial helper.

// Load the GLTF city scene and add it to the world.
if (USE_GLTF_SCENE) { // Only load the GLTF when the feature flag is enabled.
    // Create a new GLTFLoader using the global THREE namespace.
    const gltfLoader = new THREE.GLTFLoader(); // Instantiate the loader provided by the examples script.
    // Set the base path for related model resources as recommended by the docs.
    gltfLoader.setPath('assets/models/city/'); // Ensure relative resource URIs resolve correctly.
    // Begin loading the city model from the configured base path with progress and error callbacks.
    // Create DOM references for the loading UI.
    const loadingEl = document.getElementById('loading'); // Get the loading container element.
    const loadingBarEl = document.getElementById('loading-bar'); // Get the inner bar element to reflect progress.
    // Helper to show the loading bar.
    function showLoading() { if (loadingEl) { loadingEl.style.display = 'block'; } } // Display the loading UI when present.
    // Helper to hide the loading bar.
    function hideLoading() { if (loadingEl) { loadingEl.style.display = 'none'; } } // Hide the loading UI when loading completes.
    // Helper to update the loading bar progress percentage.
    function setLoadingProgress(pct) { if (loadingBarEl) { loadingBarEl.style.width = pct + '%'; } } // Set the current width based on percentage.
    // Show the loading UI before starting to load assets.
    showLoading(); // Make the loading bar visible at the start of loading.
    // Start loading the GLTF scene.
    gltfLoader.load('scene.gltf', (gltf) => { // Load the GLTF scene asynchronously.
        // Access the root scene object from the GLTF result.
        const city = gltf.scene; // Grab the scene graph contained in the model.
        // Apply a uniform scale to the city using the configured constant.
        city.scale.setScalar(CITY_SCALE); // Scale the city uniformly on all axes.
        // Apply a world-space offset to position the city where desired.
        city.position.copy(CITY_OFFSET); // Move the city to the configured offset.
        // Add the city scene to the main Three.js scene.
        scene.add(city); // Insert the loaded city into the active scene.
        // Update matrices before computing bounds.
        city.updateMatrixWorld(true); // Ensure transforms are current for accurate bounds.
        // Compute a bounding box for the model to align it with the ground plane.
        const bboxAlign = new THREE.Box3().setFromObject(city); // Calculate bounds for alignment purposes.
        // Compute how far the bottom of the model is from y = 0.
        const bottomOffset = -bboxAlign.min.y; // Determine the delta needed to place the bottom at y = 0.
        // Shift the city so its bottom sits exactly on the ground plane level.
        city.position.y += bottomOffset; // Apply the vertical offset to align with the ground plane.
        // Update matrices after changing the position.
        city.updateMatrixWorld(true); // Recompute matrices to reflect the new alignment.
        // Replace heavy materials with cheaper ones when not in high quality mode.
        if (!HIGH_QUALITY) { convertCityMaterialsLowQuality(city); } // Downgrade city materials for better performance.
        // Build collision data by traversing the aligned scene.
        buildCollidersFromModel(city); // Extract meshes and bounding boxes for collision queries.
        // Compute a bounding box to position the player safely relative to the city.
        const bbox = new THREE.Box3().setFromObject(city); // Calculate the world-space bounds of the aligned city.
        // Calculate the width of a single city tile along the x axis.
        const tileWidth = bbox.max.x - bbox.min.x; // Compute the tile size horizontally.
        // Calculate the depth of a single city tile along the z axis.
        const tileDepth = bbox.max.z - bbox.min.z; // Compute the tile size in depth.
        // Determine how many tiles are needed to cover the play area on x.
        const tilesX = Math.ceil((worldWidth / 2) / Math.max(1, tileWidth)); // Compute tile count to the positive side on x.
        // Determine how many tiles are needed to cover the play area on z.
        const tilesZ = Math.ceil((worldDepth / 2) / Math.max(1, tileDepth)); // Compute tile count to the positive side on z.
        // Loop over the grid positions to place city clones.
        for (let ix = -tilesX; ix <= tilesX; ix++) { // Iterate across the x tiles from negative to positive.
            // Iterate across the z tiles for each x tile.
            for (let iz = -tilesZ; iz <= tilesZ; iz++) { // Iterate across the z tiles from negative to positive.
                // Skip the origin tile where the original city is already placed.
                if (ix === 0 && iz === 0) { // Check if this tile is the original location.
                    // Continue to the next tile without cloning.
                    continue; // Avoid creating a duplicate at the origin.
                }
                // Create a deep clone of the city scene graph for this tile.
                const clone = city.clone(true); // Clone the entire city hierarchy including materials.
                // Set the clone position based on the tile indices.
                clone.position.set(city.position.x + ix * tileWidth, city.position.y, city.position.z + iz * tileDepth); // Offset the clone by tile size.
                // Add the clone to the scene graph.
                scene.add(clone); // Insert the cloned city tile into the scene.
                // Update matrices so bounds and colliders are correct.
                clone.updateMatrixWorld(true); // Ensure the clone's transforms are up to date.
                // Do not re-convert materials for clones to avoid duplicating textures/materials.
                // Build collision data for this clone as well.
                buildCollidersFromModel(clone); // Extract colliders from the cloned tile.
            }
        }
        // Create a vector to store the center of the bounding box.
        const center = bbox.getCenter(new THREE.Vector3()); // Find the center point for reference.
        // Read the maximum y height of the model for reference (not used for spawn).
        const maxY = bbox.max.y; // Access the top of the city in world coordinates.
        // Adjust the player's spawn position if the game has not started.
        if (!gameStarted) { // Only adjust the spawn before gameplay begins.
            // Place the player near the center of the city horizontally.
            yawObject.position.x = center.x; // Align the player x to the model center.
            // Place the player a few units forward to avoid clipping.
            yawObject.position.z = center.z + 5; // Offset z to be just in front of the center.
            // Sample the ground height at the intended spawn x,z and rest the player on the surface.
            const spawnSurfaceY = getGroundHeight(yawObject.position.x, yawObject.position.z); // Compute terrain height under the spawn.
            // Place the player on the ground rather than in mid-air.
            yawObject.position.y = spawnSurfaceY + groundLevel; // Align the camera to stand on the surface.
            // Log the chosen spawn position for visibility.
            console.log('Adjusted spawn near city:', yawObject.position); // Print the spawn position.
        }
        // Update the loading bar to complete.
        setLoadingProgress(100); // Fill the bar to indicate completion.
        // Hide the loading UI after finishing setup.
        hideLoading(); // Remove the loading overlay from view.
        // Mark assets as finished loading so rendering may begin.
        assetsLoading = false; // Clear the loading flag to enable drawing.
        // Reveal the renderer canvas now that loading is complete.
        if (renderer && renderer.domElement) { renderer.domElement.style.display = 'block'; } // Show the 3D canvas.
    }, (event) => { // Define a progress callback.
        // Compute the percentage of the model that has loaded, if known.
        const percent = event.total ? Math.round(event.loaded / event.total * 100) : 50; // Compute percent or fallback to midpoint.
        // Log loading progress for debugging.
        console.log(`Loading city model: ${percent}%`); // Print progress to the console.
        // Update the loading bar width based on progress.
        setLoadingProgress(percent); // Reflect current progress in the UI.
    }, (error) => { // Define an error callback to catch loading issues.
        // Log the error so problems can be diagnosed.
        console.error('Failed to load city model:', error); // Print the error object to the console.
        // Hide the loading UI if an error occurs.
        const loadingEl2 = document.getElementById('loading'); // Reacquire the loading element in case of scope issues.
        if (loadingEl2) { loadingEl2.style.display = 'none'; } // Hide the loading bar on error.
        // Allow rendering to proceed even if loading failed.
        assetsLoading = false; // Clear the flag to avoid blocking rendering permanently.
        // Reveal the renderer canvas so the fallback scene is visible.
        if (renderer && renderer.domElement) { renderer.domElement.style.display = 'block'; } // Show the 3D canvas despite the error.
    });
} // End of GLTF scene loading block.

// Load the enemy model used for all enemy instances.
(function loadEnemyModel() { // Define an IIFE to start loading the enemy model immediately.
    // Create a loader dedicated to the enemy model.
    const loader = new THREE.GLTFLoader(); // Instantiate the GLTFLoader for enemy assets.
    // Set the base path for resolving the enemy model resources.
    loader.setPath(ENEMY_MODEL_PATH); // Configure the loader to read files from the monster folder.
    // Start loading the enemy model file.
    loader.load(ENEMY_MODEL_FILE, (gltf) => { // Begin asynchronous loading of the enemy glTF.
        // Extract the scene graph that represents the enemy.
        const root = gltf.scene; // Access the enemy model's root object.
        // Apply the configured scale to the enemy model.
        root.scale.setScalar(ENEMY_MODEL_SCALE); // Uniformly scale the enemy model.
        // Ensure the enemy meshes interact with lights.
        root.traverse(o => { if (o.isMesh) { o.castShadow = HIGH_QUALITY; o.receiveShadow = HIGH_QUALITY; } }); // Configure mesh shadow flags.
        // Replace heavy materials when high quality is disabled.
        if (!HIGH_QUALITY) { convertCityMaterialsLowQuality(root); } // Downgrade materials for performance parity.
        // Store the loaded model as the template for future clones.
        enemyModelTemplate = root; // Save the root for cloning per enemy.
        // Mark the enemy model as ready.
        enemyModelReady = true; // Indicate that enemies can now be spawned.
        // Spawn any queued enemies that were requested before the model was available.
        for (let i = 0; i < enemySpawnQueue; i++) { createEnemy(); } // Create the pending enemies.
        // Reset the spawn queue after processing.
        enemySpawnQueue = 0; // Clear the count of queued spawns.
    }, undefined, (err) => { // Provide an error callback for troubleshooting.
        // Log an error if the enemy model fails to load.
        console.error('Failed to load enemy model:', err); // Print the error to the console for debugging.
        // Fallback to allow enemies to spawn using simple boxes when the model fails.
        enemyModelReady = false; // Keep the ready flag false to trigger box fallback.
    });
})(); // End of enemy model loading IIFE.

// Create a new perspective camera.
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Create a perspective camera.
// Attach the audio listener to the camera.
attachAudioListener(camera); // Hook the audio system to the active camera.
// Create a canvas element that will host the WebGL context.
const canvas = document.createElement('canvas'); // Allocate a canvas for the renderer.
// Try to acquire a WebGL2 context with a high-performance preference.
let gl = canvas.getContext('webgl2', { powerPreference: 'high-performance', antialias: HIGH_QUALITY, alpha: false, depth: true, stencil: false, desynchronized: true, failIfMajorPerformanceCaveat: true }); // Request a high-performance WebGL2 context.
// Fallback to a more permissive WebGL2 context if the first attempt fails.
if (!gl) { gl = canvas.getContext('webgl2', { powerPreference: 'high-performance', antialias: HIGH_QUALITY, alpha: false, depth: true, stencil: false, desynchronized: true, failIfMajorPerformanceCaveat: false }); } // Retry without the strict caveat flag.
// Fallback to WebGL1 if WebGL2 is not available.
if (!gl) { gl = canvas.getContext('webgl', { powerPreference: 'high-performance', antialias: HIGH_QUALITY, alpha: false, depth: true, stencil: false, desynchronized: true }); } // Retry with a WebGL1 context.
// Create a Three.js renderer from the acquired context.
const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl }); // Initialize the renderer using the explicit WebGL context.
// Set the size of the renderer to the window size.
renderer.setSize(window.innerWidth, window.innerHeight); // Match the renderer size to the browser window.
// Set the pixel ratio to reduce fill-rate on high DPI screens.
renderer.setPixelRatio(HIGH_QUALITY ? Math.min(2, window.devicePixelRatio) : Math.min(1.25, window.devicePixelRatio)); // Cap device pixel ratio for performance.
// Use sRGB output encoding so glTF colors look correct as per docs.
renderer.outputEncoding = THREE.sRGBEncoding; // Enable sRGB encoding recommended for glTF rendering.
// Enable the shadow system only when running in high quality mode.
renderer.shadowMap.enabled = HIGH_QUALITY; // Toggle shadow rendering based on the quality mode.
// Select an appropriate shadow filter when enabled.
if (HIGH_QUALITY) { renderer.shadowMap.type = THREE.PCFSoftShadowMap; } // Use soft shadows for better visuals.
// Append the renderer to the document body.
document.body.appendChild(renderer.domElement); // Insert the renderer's canvas into the DOM.
// Hide the 3D canvas while assets are loading so only the loading bar is visible.
renderer.domElement.style.display = assetsLoading ? 'none' : 'block'; // Toggle canvas visibility based on loading flag.
// Log renderer and GPU information to verify hardware acceleration.
(function logRendererInfo() { // Define an IIFE to print GPU diagnostics.
    // Print whether WebGL2 is active.
    console.log('WebGL2 active:', renderer.capabilities.isWebGL2); // Report the WebGL version in use.
    // Attempt to query unmasked renderer and vendor strings when available.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info'); // Request the debug renderer info extension.
    // Log the vendor and renderer details if the extension is present.
    if (dbg) { console.log('GPU Vendor:', gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)); console.log('GPU Renderer:', gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)); } // Print GPU vendor and renderer names.
    // Log draw call and triangle counters to aid performance profiling.
    console.log('Renderer caps:', renderer.capabilities); // Output general renderer capabilities.
})(); // Execute the logging function immediately.

// Create a white ambient light with an intensity of 0.6.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
// Add the ambient light to the scene.
scene.add(ambientLight);

// Create a dimmer point light that represents the sun and give it a long range.
const sunLight = new THREE.PointLight(0xffffff, 1, 1000);
// Position the sun light.
sunLight.position.set(110, 125, -500);
// Allow the sun light to cast shadows.
sunLight.castShadow = HIGH_QUALITY; // Enable light shadows only in high quality mode.
// Configure the shadow map size when shadows are enabled.
if (HIGH_QUALITY) { sunLight.shadow.mapSize.set(1024, 1024); } // Increase resolution for cleaner shadows.
// Add the sun light to the scene.
scene.add(sunLight);

// Create a plane geometry for the fallback ground.
const groundGeometry = new THREE.PlaneGeometry(500, 500); // Define a large plane for a simple ground.
// Create a texture object to hold the ground image.
const groundTexture = new THREE.Texture(); // Allocate a texture object for the fallback ground.
// Create an image element for the ground texture.
const groundImage = new Image(); // Create an image to load the ground texture file.
// Update the texture settings once the image loads.
groundImage.onload = function () { // Define the onload handler for the ground texture.
    // Assign the loaded image to the texture.
    groundTexture.image = groundImage; // Set the texture image after it loads.
    // Inform Three.js that the texture needs an update.
    groundTexture.needsUpdate = true; // Flag the texture for upload to the GPU.
    // Set the texture to repeat horizontally.
    groundTexture.wrapS = THREE.RepeatWrapping; // Configure wrapping for the S axis.
    // Set the texture to repeat vertically.
    groundTexture.wrapT = THREE.RepeatWrapping; // Configure wrapping for the T axis.
    // Set how many times the texture repeats.
    groundTexture.repeat.set(50, 50); // Repeat the texture many times for tiling.
}; // End of onload handler for the ground texture.
// Start loading the ground texture from the assets folder.
groundImage.src = 'assets/images/texture-ground.png'; // Begin loading the fallback ground texture.
// Create a material for the ground using the texture.
const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture }); // Build a standard material for the ground.
// Create a mesh from the ground geometry and material.
const ground = new THREE.Mesh(groundGeometry, groundMaterial); // Create the fallback ground mesh.
// Rotate the ground to be horizontal.
ground.rotation.x = -Math.PI / 2; // Rotate the plane to lie flat.
// Allow the ground to receive shadows.
ground.receiveShadow = true; // Enable shadow reception on the ground.
// Add the ground to the scene unless we will use the GLTF.
scene.add(ground); // Add the ground so the game can run before the GLTF loads.

// Create a yaw object to control horizontal rotation.
const yawObject = new THREE.Object3D();
// Set the initial position of the yaw object.
yawObject.position.y = 2;
// Set the initial z position of the yaw object.
yawObject.position.z = 5;
// Add the yaw object to the scene.
scene.add(yawObject);

// Add the camera to the yaw object.
yawObject.add(camera);

// Create a group to hold the gun parts.
const gunGroup = new THREE.Group();
// Store the base position of the gun for bobbing calculations.
const gunBasePosition = new THREE.Vector3(0, 0, -0.3);
// Move the entire gun slightly forward so it is in view.
gunGroup.position.copy(gunBasePosition);
// Create a box geometry for the gun barrel.
const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.6);
// Create a yellow material for the gun meshes that reacts to light.
const gunMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
// Create a mesh for the barrel using the geometry and material.
const barrelMesh = new THREE.Mesh(barrelGeometry, gunMaterial);
// Position the barrel mesh in front of the camera.
barrelMesh.position.set(0.2, -0.2, -0.5);
// Add the barrel mesh to the gun group.
gunGroup.add(barrelMesh);
// Create a box geometry for the gun handle.
const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
// Create a mesh for the handle using the same material.
const handleMesh = new THREE.Mesh(handleGeometry, gunMaterial);
// Position the handle below the barrel to form an upside down L and shift it slightly right.
handleMesh.position.set(0.25, -0.45, -0.35);
// Add the handle mesh to the gun group.
gunGroup.add(handleMesh);
// Attach the gun group to the camera so it follows the view.
camera.add(gunGroup);

// Create a group to hold the rocket launcher parts.
const rocketGroup = new THREE.Group();
// Move the rocket launcher slightly forward using the same base position.
rocketGroup.position.copy(gunBasePosition);
// Create a cylinder geometry for the launcher barrel.
const rocketBarrelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
// Create a red material for the launcher meshes that reacts to light.
const rocketMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
// Create a mesh for the launcher barrel.
const rocketBarrelMesh = new THREE.Mesh(rocketBarrelGeometry, rocketMaterial);
// Rotate the barrel so it points forward along the z axis.
rocketBarrelMesh.rotation.x = Math.PI / 2;
// Position the rocket barrel in front of the camera.
rocketBarrelMesh.position.set(0.2, -0.2, -0.5);
// Add the barrel mesh to the rocket launcher group.
rocketGroup.add(rocketBarrelMesh);
// Hide the rocket launcher until selected.
rocketGroup.visible = false;
// Attach the rocket launcher group to the camera.
camera.add(rocketGroup);

// Create a group to hold the lightning gun parts.
const lightningGroup = new THREE.Group();
// Position the lightning gun using the same base offset.
lightningGroup.position.copy(gunBasePosition);
// Create a cylinder geometry for the lightning barrel.
const lightningBarrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 16);
// Create a blue material for the lightning gun meshes that reacts to light.
const lightningMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });
// Create a mesh for the lightning barrel.
const lightningBarrelMesh = new THREE.Mesh(lightningBarrelGeometry, lightningMaterial);
// Rotate the barrel so it points forward.
lightningBarrelMesh.rotation.x = Math.PI / 2;
// Position the lightning barrel in front of the camera.
lightningBarrelMesh.position.set(0.2, -0.2, -0.5);
// Add the barrel mesh to the lightning gun group.
lightningGroup.add(lightningBarrelMesh);
// Hide the lightning gun until selected.
lightningGroup.visible = false;
// Attach the lightning gun group to the camera.
camera.add(lightningGroup);

// Load the pistol GLTF model and attach it to the camera.
function loadPistolModel() { // Define a function to asynchronously load the pistol model.
    // Create a loader for the pistol model.
    const loader = new THREE.GLTFLoader(); // Instantiate a GLTFLoader for the pistol asset.
    // Set the base path for the pistol resources.
    loader.setPath(PISTOL_MODEL_PATH); // Configure the loader to resolve relative URIs from the pistol folder.
    // Begin loading the pistol scene file.
    loader.load(PISTOL_MODEL_FILE, (gltf) => { // Load the pistol model asynchronously.
        // Store the template scene for future cloning if needed.
        pistolTemplate = gltf.scene; // Save the loaded pistol scene graph as a template.
        // Create the instance to attach to the camera.
        pistolObject = pistolTemplate.clone(true); // Clone the pistol so we can freely modify it.
        // Apply the configured scale to the pistol instance.
        pistolObject.scale.setScalar(PISTOL_MODEL_SCALE); // Scale the pistol uniformly.
        // Position the pistol near the prior simple gun placement.
        pistolObject.position.copy(PISTOL_MODEL_OFFSET); // Use the configured first person pistol offset.
        // Flip the pistol to face forward (180 degrees yaw).
        pistolObject.rotation.y += PISTOL_YAW_OFFSET; // Rotate the pistol around y by pi radians.
        // Ensure the pistol meshes respect lighting and quality settings.
        pistolObject.traverse(o => { if (o.isMesh) { o.castShadow = HIGH_QUALITY; o.receiveShadow = HIGH_QUALITY; } }); // Configure mesh flags.
        // Attach the pistol model to the camera so it moves with the view.
        camera.add(pistolObject); // Parent the pistol to the camera.
        // Prepare an animation mixer for the pistol.
        pistolMixer = new THREE.AnimationMixer(pistolObject); // Create a mixer to drive the pistol animations.
        // Create animation clips from the source animations.
        if (gltf.animations && gltf.animations.length > 0) { // Check if any animations are present.
            // Use the first animation track as the source timeline.
            const source = gltf.animations[0]; // Select the first clip from the model.
            // Extract subclips for the required actions using frame ranges.
            const fireClip = THREE.AnimationUtils.subclip(source, 'fire', 0, 11, 30); // Create a subclip for firing.
            const reloadAClip = THREE.AnimationUtils.subclip(source, 'reloadA', 12, 82, 30); // Create a subclip for the first reload segment.
            const fireLastClip = THREE.AnimationUtils.subclip(source, 'firelast', 83, 94, 30); // Create a subclip for the last-shot fire.
            const reloadBClip = THREE.AnimationUtils.subclip(source, 'reloadB', 95, 175, 30); // Create a subclip for the second reload segment.
            const hideClip = THREE.AnimationUtils.subclip(source, 'hide', 176, 187, 30); // Create a subclip for hide.
            const readyClip = THREE.AnimationUtils.subclip(source, 'ready', 187, 233, 30); // Create a subclip for ready.
            const ambientClip = THREE.AnimationUtils.subclip(source, 'ambient', 234, 264, 30); // Create a subclip for ambient idle.
            // Create actions for each subclip and store them.
            pistolActions.fire = pistolMixer.clipAction(fireClip); // Build an action for the fire animation.
            pistolActions.reloadA = pistolMixer.clipAction(reloadAClip); // Build an action for the first reload segment.
            pistolActions.firelast = pistolMixer.clipAction(fireLastClip); // Build an action for the last-shot fire animation.
            pistolActions.reloadB = pistolMixer.clipAction(reloadBClip); // Build an action for the second reload segment.
            pistolActions.hide = pistolMixer.clipAction(hideClip); // Build an action for the hide animation.
            pistolActions.ready = pistolMixer.clipAction(readyClip); // Build an action for the ready animation.
            pistolActions.ambient = pistolMixer.clipAction(ambientClip); // Build an action for the ambient idle animation.
        }
        // Resume ambient after any one-shot action completes if the pistol is selected.
        pistolMixer.addEventListener('finished', () => { // Listen for animation completion events.
            // Check that the pistol is still the active weapon and visible.
            if (currentWeapon === 0 && pistolObject && pistolObject.visible) { // Ensure the pistol is selected and shown.
                // Complete the reload when either reload animation finishes.
                if (pistolActiveActionName === 'reloadA' || pistolActiveActionName === 'reloadB') { // Check if a reload just finished.
                    // Restore the pistol ammunition to full magazine.
                    pistolAmmo = PISTOL_MAG_SIZE; // Refill the pistol ammo after reload completes.
                    // Clear the reloading state so firing is allowed again.
                    pistolReloading = false; // Mark that reloading has ended.
                    // Start the ambient idle loop after reloading.
                    playPistolAction('ambient', false); // Switch to looping ambient animation.
                    return; // Stop here after handling reload completion.
                }
                // For other one-shot actions, resume ambient when appropriate.
                playPistolAction('ambient', false); // Keep the pistol idling when not reloading.
            }
        }); // End of finished event listener.
        // Hide the simple placeholder pistol so only the model is shown when selected.
        gunGroup.visible = false; // Disable the placeholder pistol group.
        // Hide the pistol by default when another weapon is selected.
        pistolObject.visible = currentWeapon === 0; // Only show the pistol when it is selected.
        // Mark the pistol as ready for use.
        pistolReady = true; // Indicate the pistol model and animations can be used.
    }, undefined, (err) => { // Provide an error callback for troubleshooting.
        // Log an error when the pistol model fails to load.
        console.error('Failed to load pistol model:', err); // Print an error to the console.
        // Keep using the placeholder pistol if the model cannot be loaded.
        pistolReady = false; // Leave the ready flag false to avoid animation calls.
    });
} // End of pistol model loading function.

// Define the size of each obstacle for coverage checks.
const obstacleSize = 5; // Size used only for procedural obstacles (unused with GLTF).
// Define the maximum fraction of the world that obstacles may occupy.
const maxObstacleCoverage = 0.4; // Max density for procedural obstacles (unused with GLTF).
// Set the initial number of obstacles to spawn.
const initialObstacleCount = 100; // Default obstacle count when using procedural world.

// Create a texture object that will hold the obstacle texture.
const obstacleTexture = new THREE.Texture();
// Create an image element to load the obstacle texture.
const obstacleImage = new Image();
// Set up a handler to update the texture once the image loads.
obstacleImage.onload = function () {
    // Assign the loaded image to the texture.
    obstacleTexture.image = obstacleImage;
    // Inform Three.js that the texture needs an update.
    obstacleTexture.needsUpdate = true;
};
// Start loading the obstacle texture from the assets folder.
obstacleImage.src = 'assets/images/texture-obstacle.png';

// Create an array to store obstacle objects.
const obstacles = [];
// Create a buffer distance used when spawning enemies.
const obstacleSpawnBuffer = 1;
// Function to create an obstacle at a given position.
function createObstacle(x, z) {
    // Create a box geometry for the obstacle.
    const obstacleGeometry = new THREE.BoxGeometry(5, 5, 5);
    // Create a material for the obstacle using the loaded texture that reacts to light.
    const obstacleMaterial = new THREE.MeshLambertMaterial({ map: obstacleTexture });
    // Create a mesh from the obstacle geometry and material.
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    // Set the obstacle position.
    obstacle.position.set(x, 2.5, z);
    // Allow the obstacle to cast shadows.
    obstacle.castShadow = true;
    // Add the obstacle to the scene.
    scene.add(obstacle);
    // Add the obstacle to the obstacles array.
    obstacles.push(obstacle);
}
// Function to spawn multiple obstacles at random positions.
function spawnRandomObstacles(desiredCount) {
    // Early exit when using the GLTF scene instead of procedural obstacles.
    if (USE_GLTF_SCENE) { // Check if the game is configured to use the GLTF scene.
        return; // Skip creating procedural obstacles when the GLTF scene is active.
    }
    // Calculate the total area of the world.
    const worldArea = worldWidth * worldDepth;
    // Calculate the area of a single obstacle.
    const singleArea = obstacleSize * obstacleSize;
    // Determine the maximum obstacle count allowed by the coverage limit.
    const maxCount = Math.floor(worldArea * maxObstacleCoverage / singleArea);
    // Determine how many obstacles will actually be created.
    const targetCount = Math.min(desiredCount, maxCount);
    // Track how many placement attempts have been made.
    let attempts = 0;
    // Continue until the obstacle array reaches the target count.
    while (obstacles.length < targetCount && attempts < targetCount * 10) {
        // Generate a random x position within the world bounds.
        const x = (Math.random() - 0.5) * worldWidth;
        // Generate a random z position within the world bounds.
        const z = (Math.random() - 0.5) * worldDepth;
        // Check for collisions with existing obstacles.
        if (collidesWithObstacles(new THREE.Vector3(x, 0, z), obstacleSize / 2)) {
            // Increase the attempt counter when the spot is invalid.
            attempts++;
            // Skip to the next iteration to try another location.
            continue;
        }
        // Create the obstacle at the chosen position.
        createObstacle(x, z);
        // Increase the attempt counter after successful placement.
        attempts++;
    }
}

// Spawn one hundred obstacles at random positions.
spawnRandomObstacles(initialObstacleCount); // Attempt to spawn obstacles unless disabled by the GLTF flag.

// Function to check if a position collides with obstacles.
function collidesWithObstacles(position, radius) { // Define a function to test sphere collisions against the world.
    // First, check against any existing procedural obstacles.
    for (let i = 0; i < obstacles.length; i++) { // Iterate over legacy obstacle cubes.
        // Get the current obstacle.
        const obstacle = obstacles[i]; // Access the current obstacle mesh.
        // Define half size of the obstacle for bounds checking.
        const halfSize = 2.5; // Half size of the 5x5x5 cube.
        // Calculate the absolute x distance from the obstacle center.
        const dx = Math.abs(position.x - obstacle.position.x); // Horizontal distance on x.
        // Calculate the absolute z distance from the obstacle center.
        const dz = Math.abs(position.z - obstacle.position.z); // Horizontal distance on z.
        // Check for horizontal overlap before checking vertical position.
        if (dx < halfSize + radius && dz < halfSize + radius) { // Broad-phase overlap test on xz plane.
            // Calculate the bottom of the player sphere.
            const playerBottom = position.y - radius; // Compute the y of the sphere bottom.
            // Calculate the top of the obstacle cube.
            const obstacleTop = obstacle.position.y + halfSize; // Compute the obstacle top y.
            // Allow overlap when the player is above the obstacle.
            if (playerBottom >= obstacleTop) { // Allow standing above without blocking.
                // Skip this obstacle because the player is standing on top.
                continue; // Continue to next obstacle without reporting a collision.
            }
            // Calculate the bottom of the obstacle cube.
            const obstacleBottom = obstacle.position.y - halfSize; // Compute the obstacle bottom y.
            // Check if the player is inside the vertical bounds.
            if (playerBottom < obstacleTop && position.y + radius > obstacleBottom) { // Full overlap test including y.
                // Return true because a collision occurs.
                return true; // Report collision against the procedural obstacle.
            }
        }
    }
    // If we have model-based collision boxes, test against them as well.
    if (collisionBoxes.length > 0) { // Only run when GLTF collision data exists.
        // Calculate the local ground height at this x,z to ignore the floor.
        const floorY = getGroundHeight(position.x, position.z); // Sample the surface height under the sphere.
        // Query only nearby boxes using the spatial grid when available.
        const nearby = collisionGrid.size > 0 ? queryBoxesNearSphere(position, radius + collisionGridCellSize) : collisionBoxes; // Select candidate boxes.
        // Iterate over each candidate world-space bounding box.
        for (let i = 0; i < nearby.length; i++) { // Loop through each collision AABB in the candidate set.
            // Access the current world-space bounding box.
            const box = nearby[i]; // Get the current bounding box.
            // Compute the size of this box to detect thin geometry.
            const sizeVec = new THREE.Vector3(); // Create a vector to store the box size.
            // Measure the extents of the box.
            box.getSize(sizeVec); // Compute x, y, and z extents for the box.
            // Skip collisions for very thin objects.
            if (Math.min(sizeVec.x, sizeVec.y, sizeVec.z) < THIN_OBJECT_MIN_THICKNESS) { continue; } // Allow passing through thin obstacles.
            // Ignore boxes that lie entirely below the floor surface at this point.
            if (box.max.y <= floorY + 0.05) { // Skip ground-like surfaces to allow walking.
                // Continue to the next box without testing.
                continue; // Skip low boxes to avoid blocking by the floor.
            }
            // Compute the distance from the box to the sphere center.
            const distance = box.distanceToPoint(position); // Measure point-to-box distance in world space.
            // If the distance is smaller than the radius, there is an overlap.
            if (distance < radius) { // Check for a penetrating overlap.
                // Report a collision when the sphere intersects the box volume.
                return true; // Indicate that movement should be blocked.
            }
        }
    }
    // Return false if no collisions were detected.
    return false; // No collision found against obstacles or model boxes.
} // End of collidesWithObstacles.

// Function to get the ground height at a specific x and z position.
function getGroundHeight(x, z) { // Define a function to sample the surface height beneath a point.
    // If we have a detailed scene, use raycasting to find the top surface.
    if (collisionMeshes.length > 0) { // Check if GLTF meshes are available for ray tests.
        // Create a ray origin far above the possible scene height.
        tmpVec3A.set(x, 1000, z); // Place the ray high above the target x,z using the shared vector.
        // Define a downward pointing direction vector.
        tmpVec3B.set(0, -1, 0); // Use the shared vector pointing down along y.
        // Configure the shared raycaster for a downward ray.
        sharedRaycaster.set(tmpVec3A, tmpVec3B); // Set origin and direction on the shared raycaster.
        // Set the near plane for the ray.
        sharedRaycaster.near = 0; // Start detecting intersections immediately from the origin.
        // Set the far plane to a large value to reach the ground.
        sharedRaycaster.far = 2000; // Allow the ray to travel a long distance downwards.
        // Intersect the ray with all collision meshes in the scene.
        const hits = sharedRaycaster.intersectObjects(collisionMeshes, true); // Collect all intersections along the ray.
        // If any intersections were found, use the nearest non-thin hit.
        if (hits.length > 0) { // Check if the ray hit any surface.
            // Iterate through the intersections in nearest-first order.
            for (let i = 0; i < hits.length; i++) { // Loop over each intersection.
                // Get the intersection entry.
                const h = hits[i]; // Access the hit data.
                // Ignore hits on thin geometry to allow passing through.
                if (isThinHitObject(h.object)) { continue; } // Skip thin surfaces for ground height.
                // Return the y coordinate for the first solid surface.
                return h.point.y; // Provide the ground height at this x,z.
            }
        }
    }
    // Fallback: use the procedural obstacles to determine a surface.
    let height = 0; // Initialize the fallback height to the base ground level.
    // Loop over each obstacle in the array.
    for (let i = 0; i < obstacles.length; i++) { // Check each legacy obstacle cube.
        // Get the current obstacle from the array.
        const obstacle = obstacles[i]; // Access the obstacle being tested.
        // Define half the obstacle size for bounds checking.
        const halfSize = 2.5; // Half the cubic obstacle dimension.
        // Calculate the absolute x distance to the obstacle center.
        const dx = Math.abs(x - obstacle.position.x); // Compute x offset to the obstacle.
        // Calculate the absolute z distance to the obstacle center.
        const dz = Math.abs(z - obstacle.position.z); // Compute z offset to the obstacle.
        // Check if the position is within the obstacle bounds.
        if (dx < halfSize && dz < halfSize) { // Check if x,z lies within the cube footprint.
            // Determine the top height of this obstacle.
            const top = obstacle.position.y + halfSize; // Calculate the obstacle's top face y.
            // Keep the highest obstacle top found so far.
            if (top > height) { // Compare against the current best height.
                // Store the top height for later comparison.
                height = top; // Update the surface height estimate.
            }
        }
    }
    // Return the highest obstacle top or zero if none.
    return height; // Provide a surface height even without GLTF meshes.
} // End of getGroundHeight.

// Function to check if there is a clear path between two points.
function hasLineOfSight(start, end) { // Define a function to test clear path between two points.
    // Create a vector from start to end.
    const direction = new THREE.Vector3(); // Allocate a direction vector.
    // Subtract the start position from the end position.
    direction.subVectors(end, start); // Compute the vector from start to end.
    // Store the distance between the two points.
    const distance = direction.length(); // Measure the straight-line distance.
    // Normalize the direction for ray casting.
    direction.normalize(); // Convert the direction to a unit vector.
    // Create a raycaster from the start toward the end point.
    sharedRaycaster.set(start.clone(), direction); // Configure the shared raycaster with the start and direction.
    // Set the near plane for the ray.
    sharedRaycaster.near = 0; // Begin intersection testing from the origin point.
    // Set the far plane to the distance between the points.
    sharedRaycaster.far = distance; // Limit the ray to the segment between start and end.
    // Collect intersections with either GLTF meshes or legacy obstacles.
    const targets = collisionMeshes.length > 0 ? collisionMeshes : obstacles; // Choose the correct target set.
    // Perform intersection tests against the chosen target meshes.
    const intersections = sharedRaycaster.intersectObjects(targets, true); // Compute ray hits along the path.
    // Check if the ray hit any obstacle before reaching the end.
    if (intersections.length > 0) { // Determine if something blocks the line between the points.
        // Return false if an obstacle blocks the line of sight.
        return false; // Report that the path is obstructed.
    }
    // Return true when no obstacles are in the path.
    return true; // Indicate a clear line of sight between the two points.
} // End of hasLineOfSight.

// Create an array to store enemy objects.
const enemies = [];
// Create an array to store projectile objects.
const projectiles = [];
// Create an array to store enemy projectile objects.
const enemyProjectiles = [];
// Create an array to store explosion meshes.
const explosions = [];
// Create an array to store lights for rocket explosions.
const explosionLights = [];
// Create an array to store lightning beam meshes.
const lightningBeams = [];

// Function to reset enemy shot timers for all enemies.
function resetEnemyShotTimers() {
    // Loop over each enemy in the array.
    enemies.forEach(enemy => {
        // Set the last shot time for this enemy to the current time.
        enemy.lastShotTime = Date.now();
    });
}

// Function to clear all movement key states.
function resetMovementKeys() {
    // Clear the forward key state.
    keys['w'] = false;
    // Clear the left key state.
    keys['a'] = false;
    // Clear the backward key state.
    keys['s'] = false;
    // Clear the right key state.
    keys['d'] = false;
}

// Create a texture object that will hold the enemy texture.
const enemyTexture = new THREE.Texture();
// Create an image element to load the enemy texture.
const enemyImage = new Image();
// Set up a handler to update the texture once the image loads.
enemyImage.onload = function () {
    // Assign the loaded image to the texture.
    enemyTexture.image = enemyImage;
    // Inform Three.js that the texture needs an update.
    enemyTexture.needsUpdate = true;
};
// Start loading the enemy texture from the assets folder.
enemyImage.src = 'assets/images/texture-enemy.png';

// Array to store high scores.
let highScores = [];
// Maximum number of high scores to keep.
const MAX_HIGH_SCORES = 5;
// Default player name for high scores.
const DEFAULT_PLAYER_NAME = "ShootyMcToothy";

// Function to load high scores from local storage.
function loadHighScores() {
    // Get high scores from local storage.
    const storedScores = localStorage.getItem('shootyHighScores');
    // Parse the stored scores or return an empty array if none.
    let parsedScores = storedScores ? JSON.parse(storedScores) : [];
    // Filter out any invalid entries and ensure score is a number.
    highScores = parsedScores.filter(entry =>
        typeof entry === 'object' && entry !== null &&
        typeof entry.name === 'string' &&
        typeof entry.score === 'number'
    );
}

// Function to save high scores to local storage.
function saveHighScores() {
    // Save high scores to local storage.
    localStorage.setItem('shootyHighScores', JSON.stringify(highScores));
}

// Function to display high scores.
function displayHighScores() {
    // The UI canvas will display the high scores.
    return highScores.map(scoreEntry => `${scoreEntry.name}: ${scoreEntry.score}`);
}

// Initialize the score.
let score = 0;
// Initialize player health.
let health = 100;
// Track how many enemies have been killed.
let killCount = 0;
// Define the starting number of enemies.
const initialEnemyCount = 10;
// Record the time when the game begins.
let gameStartTime = Date.now();
// Store the last time enemy spawns were checked.
let lastSpawnCheck = Date.now();
// Create an array to store health pack objects.
const healthPacks = [];
// Duration before a health pack disappears in milliseconds.
const healthPackDuration = 30000;
// Distance within which a health pack can be collected.
const healthPackPickupRadius = 3;
// Create an offscreen canvas for rendering UI textures.
const uiCanvas = document.createElement('canvas');
// Set the width of the offscreen canvas.
uiCanvas.width = window.innerWidth;
// Set the height of the offscreen canvas.
uiCanvas.height = window.innerHeight;
// Get the 2D context from the offscreen canvas.
const uiContext = uiCanvas.getContext('2d');
// Create a texture from the offscreen canvas.
const uiTexture = new THREE.CanvasTexture(uiCanvas);
// Create a sprite material using the texture.
const uiMaterial = new THREE.SpriteMaterial({ map: uiTexture, depthTest: false });
// Create a sprite to display the UI.
const uiSprite = new THREE.Sprite(uiMaterial);
// Position the sprite slightly in front of the camera.
uiSprite.position.set(0, 0, -1);
// Add the sprite to the camera so it stays fixed on screen.
camera.add(uiSprite);
// Function to update the sprite scale on resize.
function updateUIScale() {
    // Calculate the visible height at a depth of one unit.
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Set the sprite scale to cover the view.
    uiSprite.scale.set(height * camera.aspect, height, 1);
}
// Call the scale update once at startup.
updateUIScale();

// Create an object to store the restart button bounds.
const restartButtonArea = { x: 0, y: 0, width: 140, height: 30 };
// Create an object to store the volume slider bounds.
const volumeSliderArea = { x: 0, y: 0, width: 120, height: 10 };
// Load the stored volume value from local storage if available.
const storedVolume = localStorage.getItem('shootyVolume');
// Track the current volume level as a number between zero and one.
let volumeLevel = storedVolume !== null ? parseFloat(storedVolume) : 1;
// Set the starting volume level using the setter function.
setVolume(volumeLevel);

// Variables for FPS calculation.
let lastFrameTime = 0;
let frameCount = 0;
let fps = 0;
// Variable to store the last time the UI was updated.
let lastUIUpdate = -200;

// Variable to track if the game is paused.
let gamePaused = false;
// Variable to track if the game has ended.
let gameOver = false;
// Variable to track if the game has started.
let gameStarted = false;
// Variable to store the animation frame ID.
let animationFrameId;
// Variable to track if the browser tab is visible.
let tabVisible = true;
// Variable to store when the tab became hidden.
let hiddenStartTime = 0;

// Define the player's movement speed, increased for faster running.
const moveSpeed = 0.15;
// Define the player's mouse sensitivity.
const mouseSpeed = 0.002;

// Create a new vector to store the player's input direction.
const inputVelocity = new THREE.Vector3();
// Create a new vector to store the player's horizontal velocity.
const horizontalVelocity = new THREE.Vector3();
// Define how quickly the player accelerates while on the ground.
const groundAcceleration = 0.02;
// Define how quickly the player accelerates while in the air.
const airAcceleration = 0.01;
// Define the friction applied when the player is on the ground.
const groundFriction = 0.9;
// Define the friction applied when the player is in the air.
const airFriction = 0.99;
// Define the maximum speed the player can reach.
const maxSpeed = 0.5;

// Define the gravity force applied each frame.
const gravity = -0.01;
// Store the player's vertical velocity for jumping.
let verticalVelocity = 0;
// Set the upward speed when the player jumps.
const jumpSpeed = 0.2;
// Store the y position representing the ground level.
const groundLevel = 2;
// Track whether the player is currently on the ground.
let isGrounded = true;

// Cache parameters for player ground sampling to reduce raycasts.
const PLAYER_GROUND_CACHE_MS = 60; // Define how long to reuse a cached ground height in milliseconds.
// Store the last time the ground height was computed.
let playerGroundCacheTime = 0; // Track the timestamp of the last ground height update.
// Store the last sampled x position for ground height.
let playerGroundCacheX = 0; // Keep the x coordinate used for the last ground height raycast.
// Store the last sampled z position for ground height.
let playerGroundCacheZ = 0; // Keep the z coordinate used for the last ground height raycast.
// Store the last computed ground height value.
let playerGroundCacheY = 0; // Cache the resulting ground height under the player.
// Helper to get the player's ground height with caching.
function getPlayerSurfaceY() { // Define a function that returns the cached or freshly computed ground height.
    // Read the current time for cache invalidation checks.
    const now = performance.now(); // Capture the high-resolution time stamp.
    // Check if the cache is still valid and the player has not moved far.
    const moved = Math.abs(yawObject.position.x - playerGroundCacheX) + Math.abs(yawObject.position.z - playerGroundCacheZ); // Compute manhattan movement since last sample.
    // Recompute when cache expired or movement exceeded a small threshold.
    if (now - playerGroundCacheTime > PLAYER_GROUND_CACHE_MS || moved > 0.5) { // Decide whether to update the cache.
        // Compute a fresh ground height using the generic function.
        playerGroundCacheY = getGroundHeight(yawObject.position.x, yawObject.position.z); // Update the cached ground height.
        // Record the time of this update.
        playerGroundCacheTime = now; // Update the timestamp for the cache.
        // Record the position used for this sample.
        playerGroundCacheX = yawObject.position.x; // Store the x coordinate sampled.
        playerGroundCacheZ = yawObject.position.z; // Store the z coordinate sampled.
    }
    // Return the cached or updated ground height value.
    return playerGroundCacheY; // Provide the surface height beneath the player.
} // End of getPlayerSurfaceY helper.

// Step size used when nudging the player via debug keys.
const DEBUG_NUDGE_STEP = 0.02; // Set a finer base increment for pistol offset nudging.
// Multiplier applied when holding Shift during a nudge.
const DEBUG_NUDGE_MULTIPLIER = 10; // Increase the nudge distance when Shift is held.
// Helper to print the pistol's current local position to the console.
function debugLogPistolPosition() { // Define a function to log the pistol offset.
    // Choose the pistol object when available, otherwise fall back to the placeholder group.
    const obj = pistolObject ? pistolObject : gunGroup; // Select the object whose offset is edited.
    // Log the current local position with two decimal places for readability.
    console.log(`Pistol offset -> x: ${obj.position.x.toFixed(2)}, y: ${obj.position.y.toFixed(2)}, z: ${obj.position.z.toFixed(2)}`); // Output the pistol's local coordinates.
}

// Track whether the left mouse button is held down.
let isMouseDown = false;
// Store the previous x coordinate of the active touch.
let lastTouchX = 0;
// Store the previous y coordinate of the active touch.
let lastTouchY = 0;
// Store the high-resolution time of the last shot.
let lastPlayerShotTime = 0;
// Variable storing the current interval between shots.
let playerShotInterval = 100;
// Constant interval for the basic gun.
const gunShotInterval = 100;
// Constant interval for the rocket launcher.
const rocketShotInterval = 800;
// Constant interval for the lightning gun.
const lightningShotInterval = 300;
// Define the maximum range of the lightning gun.
const lightningRange = 100;
// Duration in milliseconds for the lightning beam to fade out.
const lightningFadeDuration = 300;
// Define how far the gun moves up and down when bobbing.
const gunBobAmplitude = 0.05;
// Define how quickly the bobbing motion slows down.
const gunBobDamping = 0.9;
// Track the current vertical bobbing offset.
let gunBobOffset = 0;
// Track the gun tilt around the x axis when moving the mouse.
let gunTiltX = 0;
// Track the gun tilt around the y axis when moving the mouse.
let gunTiltY = 0;
// Track the index of the current weapon.
let currentWeapon = 0;

// Configuration for the pistol model path and scale.
const PISTOL_MODEL_PATH = 'assets/models/pistol/'; // Define the base path for the pistol model assets.
const PISTOL_MODEL_FILE = 'scene.gltf'; // Define the filename for the pistol model file.
const PISTOL_MODEL_SCALE = 1.0; // Define the uniform scale to apply to the pistol model.
const PISTOL_YAW_OFFSET = Math.PI; // Rotate the pistol by 180 degrees around the y axis.
const PISTOL_MODEL_OFFSET = new THREE.Vector3(0.04, -0.20, -0.08); // Set the default pistol offset relative to the camera.
// References used to manage the pistol model instance and animation.
let pistolTemplate = null; // Store the loaded pistol template scene for cloning.
let pistolObject = null; // Store the pistol instance attached to the camera.
let pistolMixer = null; // Store the AnimationMixer for controlling pistol animations.
let pistolActions = {}; // Store a map from action name to AnimationAction for easy control.
let pistolActiveActionName = null; // Track which pistol action is currently active.
let pistolReady = false; // Track whether the pistol model has finished loading and is ready.
// Define the pistol magazine capacity in bullets.
const PISTOL_MAG_SIZE = 20; // Set the pistol magazine size to twenty rounds.
// Track how many bullets remain in the current magazine.
let pistolAmmo = PISTOL_MAG_SIZE; // Initialize the pistol ammunition count to a full magazine.
// Track whether the pistol is currently reloading.
let pistolReloading = false; // Set a flag indicating if the pistol is in a reload sequence.
// Helper to play a specific pistol action by name.
function playPistolAction(name, loopOnce = true) { // Define a function to play a pistol animation action.
    // Guard when the pistol is not ready or action missing.
    if (!pistolReady || !pistolMixer || !pistolActions[name]) { return; } // Exit when action cannot be played.
    // Loop over all actions to stop them before starting a new one.
    Object.keys(pistolActions).forEach(k => { pistolActions[k].stop(); }); // Stop all previously running actions.
    // Retrieve the requested action by name.
    const action = pistolActions[name]; // Access the target animation action.
    // Set clamping and looping based on whether this is a one-shot or looping action.
    action.clampWhenFinished = loopOnce; // Clamp only for one-shot actions.
    // Select a loop mode based on the provided parameter.
    action.setLoop(loopOnce ? THREE.LoopOnce : THREE.LoopRepeat, 1); // Use LoopRepeat for ambient idles.
    // Reset the action time to the beginning.
    action.reset(); // Prepare the action to start from frame zero.
    // Start the action playback.
    action.play(); // Begin playing the pistol animation.
    // Remember which action is currently active for idle handling.
    pistolActiveActionName = name; // Store the active action name.
} // End of playPistolAction helper.

// Helper to begin a pistol reload sequence.
function startPistolReload() { // Define a function to initiate the pistol reload.
    // Only start reloading when the pistol is ready, not already reloading, and the mag is not full.
    if (!pistolReady || pistolReloading || pistolAmmo >= PISTOL_MAG_SIZE) { return; } // Exit if reload should not start.
    // Mark the reload state as active to block firing.
    pistolReloading = true; // Set reloading to true to prevent other actions.
    // Play the first half of the reload animation.
    playPistolAction('reloadA', true); // Trigger the initial reload animation segment.
} // End of startPistolReload helper.

// Helper to update the pistol mixer every frame when available.
function updatePistolMixer(delta) { // Define a function to advance the pistol animation by delta time.
    // Guard against missing mixer or model not ready.
    if (!pistolReady || !pistolMixer) { return; } // Exit when no animation needs updating.
    // Advance the animation timeline for the pistol.
    pistolMixer.update(delta); // Step the animation by the elapsed time.
} // End of updatePistolMixer helper.

// Initialize the pistol model after constants and helpers are defined.
loadPistolModel(); // Start loading the pistol model now that configuration exists.

// Function to set the active weapon.
function setWeapon(index) {
    // Assign the index to the current weapon variable.
    currentWeapon = index;
    // Check if the pistol is selected.
    if (currentWeapon === 0) {
        // Use the pistol fire rate for the shot interval.
        playerShotInterval = gunShotInterval;
        // Show the pistol model when it is ready.
        if (pistolObject) { pistolObject.visible = true; } // Display the pistol model when selected.
        // Hide the placeholder pistol group when the model is shown.
        gunGroup.visible = pistolObject ? false : true; // Use placeholder only if model unavailable.
        // Play the ready animation when switching to the pistol.
        playPistolAction('ready', true); // Trigger the pistol ready animation.
    } else if (currentWeapon === 1) {
        // Use the rocket fire rate when the rocket launcher is selected.
        playerShotInterval = rocketShotInterval;
        // Hide the pistol when switching away to rockets.
        if (pistolObject) { playPistolAction('hide', true); pistolObject.visible = false; } // Hide the pistol with animation.
    } else {
        // Use the lightning fire rate when the lightning gun is selected.
        playerShotInterval = lightningShotInterval;
        // Hide the pistol when switching away to lightning.
        if (pistolObject) { playPistolAction('hide', true); pistolObject.visible = false; } // Hide the pistol with animation.
    }
    // Set the visibility of the pistol model.
    gunGroup.visible = pistolObject ? false : currentWeapon === 0; // Show placeholder only if no model.
    // Set the visibility of the rocket launcher model.
    rocketGroup.visible = currentWeapon === 1;
    // Set the visibility of the lightning gun model.
    lightningGroup.visible = currentWeapon === 2;
}

// Add an event listener for mouse movement to control the camera.
document.addEventListener('mousemove', onMouseMove, false);
// Add an event listener for mouse clicks to fire projectiles.
document.addEventListener('mousedown', onMouseDown, false);
// Add an event listener for mouse release to stop firing.
document.addEventListener('mouseup', onMouseUp, false);
// Add an event listener for touch start to mimic mouse down.
document.addEventListener('touchstart', onTouchStart, false);
// Add an event listener for touch move to mimic mouse movement.
document.addEventListener('touchmove', onTouchMove, false);
// Add an event listener for touch end to mimic mouse up.
document.addEventListener('touchend', onTouchEnd, false);
// Add an event listener for keydown events to control player movement.
document.addEventListener('keydown', onKeyDown, false);
// Add an event listener for keyup events to control player movement.
document.addEventListener('keyup', onKeyUp, false);
// Add an event listener for window resize events.
window.addEventListener('resize', onWindowResize, false);
// Add an event listener for tab visibility changes.
document.addEventListener('visibilitychange', () => {
    // Check if the document has become hidden.
    if (document.hidden) {
        // Record the time when the tab was hidden.
        hiddenStartTime = Date.now();
        // Mark the tab as not visible.
        tabVisible = false;
    } else {
        // Calculate how long the tab was hidden.
        const hiddenDuration = Date.now() - hiddenStartTime;
        // Offset the game start time by the hidden duration.
        gameStartTime += hiddenDuration;
        // Offset the last spawn check time by the hidden duration.
        lastSpawnCheck += hiddenDuration;
        // Mark the tab as visible again.
        tabVisible = true;
    }
}, false);
// Add an event listener for the mouse wheel to switch weapons.
document.addEventListener('wheel', onMouseWheel, false);

// A map to store the state of the keys.
const keys = {};

// Function to toggle the paused state.
function togglePause() {
    // Invert the paused flag.
    gamePaused = !gamePaused;
    // Check if the game is now paused.
    if (gamePaused) {
        // Stop the soundtrack loop.
        stopSoundtrack();
        // Stop all projectile hums so they do not continue while paused.
        if (typeof stopAllProjectileHums === 'function') {
            // Call the function when it exists.
            stopAllProjectileHums();
        }
        // Release pointer lock to free the mouse.
        document.exitPointerLock();
    }
    else {
        // Restart the soundtrack.
        startSoundtrack();
        // Request pointer lock again.
        document.body.requestPointerLock();
    }
}

// The function to handle keydown events.
function onKeyDown(event) {
    // Set the key state to true.
    keys[event.key.toLowerCase()] = true;
    // Calculate the nudge step based on whether Shift is held.
    const nudgeStep = (event.shiftKey ? DEBUG_NUDGE_STEP * DEBUG_NUDGE_MULTIPLIER : DEBUG_NUDGE_STEP); // Determine how far to move per key press.
    // Select the object to edit (pistol model or placeholder) when arrow/page keys are pressed.
    const editObj = (event.code.startsWith('Arrow') || event.code === 'PageUp' || event.code === 'PageDown') ? (pistolObject ? pistolObject : gunGroup) : null; // Choose the pistol object for editing.
    // Handle debug nudging keys to reposition the pistol relative to the camera.
    if (editObj && event.code === 'ArrowUp') { // Check for the up arrow key.
        // Move the pistol forward along the local z axis (toward the center of the screen).
        editObj.position.z -= nudgeStep; // Decrease z to move the pistol forward.
        // Log the updated pistol offset to the console.
        debugLogPistolPosition(); // Print the new pistol coordinates for reference.
        // Prevent the browser from scrolling the page.
        event.preventDefault(); // Disable default arrow key behavior.
    } else if (editObj && event.code === 'ArrowDown') { // Check for the down arrow key.
        // Move the pistol backward along the local z axis (away from the screen).
        editObj.position.z += nudgeStep; // Increase z to move the pistol backward.
        // Log the updated pistol offset to the console.
        debugLogPistolPosition(); // Print the new pistol coordinates for reference.
        // Prevent the browser from scrolling the page.
        event.preventDefault(); // Disable default arrow key behavior.
    } else if (editObj && event.code === 'ArrowLeft') { // Check for the left arrow key.
        // Move the pistol left along the local x axis.
        editObj.position.x -= nudgeStep; // Decrease x to nudge the pistol left.
        // Log the updated pistol offset to the console.
        debugLogPistolPosition(); // Print the new pistol coordinates for reference.
        // Prevent the browser from scrolling the page.
        event.preventDefault(); // Disable default arrow key behavior.
    } else if (editObj && event.code === 'ArrowRight') { // Check for the right arrow key.
        // Move the pistol right along the local x axis.
        editObj.position.x += nudgeStep; // Increase x to nudge the pistol right.
        // Log the updated pistol offset to the console.
        debugLogPistolPosition(); // Print the new pistol coordinates for reference.
        // Prevent the browser from scrolling the page.
        event.preventDefault(); // Disable default arrow key behavior.
    } else if (editObj && event.code === 'PageUp') { // Check for the PageUp key.
        // Move the pistol upward along the local y axis.
        editObj.position.y += nudgeStep; // Increase y to raise the pistol.
        // Log the updated pistol offset to the console.
        debugLogPistolPosition(); // Print the new pistol coordinates for reference.
        // Prevent the browser from scrolling the page.
        event.preventDefault(); // Disable default page navigation behavior.
    } else if (editObj && event.code === 'PageDown') { // Check for the PageDown key.
        // Move the pistol downward along the local y axis.
        editObj.position.y -= nudgeStep; // Decrease y to lower the pistol.
        // Log the updated pistol offset to the console.
        debugLogPistolPosition(); // Print the new pistol coordinates for reference.
        // Prevent the browser from scrolling the page.
        event.preventDefault(); // Disable default page navigation behavior.
    }
    // Check if the spacebar was pressed.
    if (event.code === 'Space') {
        // Verify the player is on the ground.
        if (isGrounded) {
            // Set the vertical velocity to start the jump.
            verticalVelocity = jumpSpeed;
            // Mark that the player is no longer on the ground.
            isGrounded = false;
            // Play the jump sound effect only after player interaction.
            if (!autoplay) {
                // Call the function to play the jump sound.
                playJumpSound();
            }
        }
    }
    // Check if the "p" key was pressed.
    if (event.key.toLowerCase() === 'p') {
        // Ensure the game is in progress before toggling pause.
        if (gameStarted && !gameOver) {
            // Call the pause toggle function.
            togglePause();
        }
    }
    // Check if the escape key was pressed.
    if (event.key === 'Escape') {
        // Ensure the game is in progress before toggling pause.
        if (gameStarted && !gameOver) {
            // Call the pause toggle function.
            togglePause();
        }
    }
    // Check if the number keys or azerty symbols were pressed.
    if (event.key === '1' || event.key === '&') {
        // Switch to the pistol when pressing one or ampersand.
        setWeapon(0);
    }
    if (event.key === '2' || event.key === 'é') {
        // Switch to the rocket launcher when pressing two or é.
        setWeapon(1);
    }
    if (event.key === '3' || event.key === '"') {
        // Switch to the lightning gun when pressing three or double quote.
        setWeapon(2);
    }
    // Check if the reload key was pressed.
    if (event.key.toLowerCase() === 'r') {
        // Initiate a pistol reload when the pistol is selected.
        if (currentWeapon === 0) { startPistolReload(); }
    }
}

// The function to handle keyup events.
function onKeyUp(event) {
    // Set the key state to false.
    keys[event.key.toLowerCase()] = false;
}

// The function to handle mouse movement.
function onMouseMove(event) {
    // Check if the pointer is locked.
    if (document.pointerLockElement === document.body) {
        // Rotate the yaw object for horizontal movement.
        yawObject.rotation.y -= event.movementX * mouseSpeed;
        // Rotate the camera for vertical movement.
        camera.rotation.x -= event.movementY * mouseSpeed;
        // Clamp the camera's x rotation to prevent flipping.
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        // Tilt the gun group horizontally in response to mouse movement.
        gunTiltY -= event.movementX * mouseSpeed * 0.5;
        // Tilt the gun group vertically in response to mouse movement.
        gunTiltX -= event.movementY * mouseSpeed * 0.5;
    }
}

// The function to handle mouse down events.
function onMouseDown(event) {
    // Restart the game if it is over.
    if (gameOver) {
        // Reload the page to reset the state.
        location.reload();
        // Exit because the click triggered a restart.
        return;
    }
    // Start the game if it has not begun.
    if (!gameStarted) {
        // Call the startGame function.
        startGame();
        // Exit because the click was used to start the game.
        return;
    }
    // Do nothing if the game is paused.
    if (gamePaused) {
        // Check for clicks on the restart button.
        if (event.clientX >= restartButtonArea.x && event.clientX <= restartButtonArea.x + restartButtonArea.width && event.clientY >= restartButtonArea.y && event.clientY <= restartButtonArea.y + restartButtonArea.height) {
            // Reload the page to restart the game.
            location.reload();
            // Exit after handling the click.
            return;
        }
        // Check for clicks on the volume slider.
        if (event.clientX >= volumeSliderArea.x && event.clientX <= volumeSliderArea.x + volumeSliderArea.width && event.clientY >= volumeSliderArea.y - volumeSliderArea.height / 2 && event.clientY <= volumeSliderArea.y + volumeSliderArea.height / 2) {
            // Calculate the new volume level from the click position.
            volumeLevel = (event.clientX - volumeSliderArea.x) / volumeSliderArea.width;
            // Apply the new volume level.
            setVolume(volumeLevel);
            // Store the new volume level in local storage.
            localStorage.setItem('shootyVolume', volumeLevel);
            // Exit after handling the click.
            return;
        }
        // Exit early because other input should be ignored.
        return;
    }
    // Lock the pointer to the document body.
    document.body.requestPointerLock();
    // Check if the left mouse button was clicked.
    if (event.button === 0) {
        // Mark that the mouse button is held down.
        isMouseDown = true;
        // Handle pistol-specific firing logic.
        if (currentWeapon === 0) { // Check if the pistol is the active weapon.
            // Block firing when the pistol is reloading.
            if (pistolReloading) { return; } // Exit early during a reload.
            // Start a reload when the magazine is empty.
            if (pistolAmmo <= 0) { startPistolReload(); return; } // Trigger reload when out of ammo.
            // Determine if this shot is the last in the magazine.
            const isLastShot = pistolAmmo === 1; // Check whether the magazine will become empty after this shot.
            // Play the correct firing animation for this shot.
            playPistolAction(isLastShot ? 'firelast' : 'fire', true); // Use the last-shot animation when appropriate.
            // Create a projectile immediately for the pistol.
            createProjectile(); // Spawn the pistol bullet now that we fired.
            // Decrease the pistol ammunition by one.
            pistolAmmo -= 1; // Deduct a round from the magazine.
        } else { // Handle non-pistol weapons.
            // Create a projectile immediately for other weapons.
            createProjectile(); // Spawn the projectile for the selected weapon.
        }
        // Record the time of this shot using the high-resolution timer.
        lastPlayerShotTime = performance.now(); // Update the last shot timestamp.
    }
}

// The function to handle mouse up events.
function onMouseUp(event) {
    // Check if the left mouse button was released.
    if (event.button === 0) {
        // Clear the mouse button flag.
        isMouseDown = false;
    }
}

// The function to handle touch start events.
function onTouchStart(event) {
    // Prevent default browser behavior.
    event.preventDefault();
    // Get the first touch point from the event.
    const touch = event.touches[0];
    // Store the x coordinate of this touch.
    lastTouchX = touch.clientX;
    // Store the y coordinate of this touch.
    lastTouchY = touch.clientY;
    // Create an object mimicking a mouse event.
    const mouseEvent = { button: 0, clientX: lastTouchX, clientY: lastTouchY };
    // Forward the event to the mouse down handler.
    onMouseDown(mouseEvent);
}

// The function to handle touch move events.
function onTouchMove(event) {
    // Prevent default browser behavior.
    event.preventDefault();
    // Get the first touch point from the event.
    const touch = event.touches[0];
    // Calculate the change in x since the last touch.
    const movementX = touch.clientX - lastTouchX;
    // Calculate the change in y since the last touch.
    const movementY = touch.clientY - lastTouchY;
    // Update the stored x coordinate.
    lastTouchX = touch.clientX;
    // Update the stored y coordinate.
    lastTouchY = touch.clientY;
    // Create an object mimicking a mouse move event.
    const moveEvent = { movementX: movementX, movementY: movementY };
    // Forward the event to the mouse move handler.
    onMouseMove(moveEvent);
}

// The function to handle touch end events.
function onTouchEnd(event) {
    // Prevent default browser behavior.
    event.preventDefault();
    // Create an object mimicking a mouse up event.
    const mouseEvent = { button: 0 };
    // Forward the event to the mouse up handler.
    onMouseUp(mouseEvent);
}

// The function to handle window resize events.
function onWindowResize() {
    // Update the camera's aspect ratio.
    camera.aspect = window.innerWidth / window.innerHeight;
    // Update the camera's projection matrix.
    camera.updateProjectionMatrix();
    // Set the size of the renderer to the new window size.
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Update the pixel ratio using the configured quality mode.
    renderer.setPixelRatio(HIGH_QUALITY ? Math.min(2, window.devicePixelRatio) : Math.min(1.25, window.devicePixelRatio)); // Reapply the pixel ratio cap on resize.
    // Update the offscreen canvas width.
    uiCanvas.width = window.innerWidth;
    // Update the offscreen canvas height.
    uiCanvas.height = window.innerHeight;
    // Update the UI sprite scale for the new aspect ratio.
    updateUIScale();
}

// The function to handle mouse wheel events.
function onMouseWheel(event) {
    // Swap weapons when the wheel moves up or down.
    if (event.deltaY !== 0) {
        // Determine the next weapon index from the wheel direction.
        const nextIndex = event.deltaY > 0 ? (currentWeapon + 1) % 3 : (currentWeapon + 2) % 3;
        // Apply the weapon change using the helper function.
        setWeapon(nextIndex);
    }
}

// The function to create a projectile.
function createProjectile() {
    // Check if the current weapon is the rocket launcher.
    if (currentWeapon === 1) {
        // Create a cylinder geometry for the rocket.
        const rocketGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
        // Create a red material for the rocket.
        const rocketMaterialMesh = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        // Create a mesh for the rocket projectile.
        const rocket = new THREE.Mesh(rocketGeometry, rocketMaterialMesh);
        // Set the rocket position to the camera position.
        camera.getWorldPosition(rocket.position);
        // Store the rocket spawn position for distance checks.
        rocket.spawnPosition = rocket.position.clone();
        // Create a vector to store the direction of the rocket.
        const rocketDirection = new THREE.Vector3();
        // Get the forward direction from the camera.
        camera.getWorldDirection(rocketDirection);
        // Create a quaternion for orienting the rocket.
        const rocketQuaternion = new THREE.Quaternion();
        // Calculate the rotation needed so the rocket faces the direction.
        rocketQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rocketDirection.clone().normalize());
        // Apply the rotation to the rocket mesh.
        rocket.quaternion.copy(rocketQuaternion);
        // Set the rocket velocity to move slowly.
        rocket.velocity = rocketDirection.multiplyScalar(0.5);
        // Mark this projectile as a rocket.
        rocket.isRocket = true;
        // Add the rocket to the scene.
        scene.add(rocket);
        // Add the rocket to the projectiles array.
        projectiles.push(rocket);
    } else if (currentWeapon === 2) {
        // Create a vector storing the muzzle position for the ray start.
        const start = new THREE.Vector3();
        // Get the world position of the lightning barrel.
        lightningBarrelMesh.getWorldPosition(start);
        // Create a vector storing the forward direction.
        const dir = new THREE.Vector3();
        // Get the camera's forward direction.
        camera.getWorldDirection(dir);
        // Create a raycaster for the hitscan attack.
        const raycaster = new THREE.Raycaster(start, dir, 0, lightningRange);
        // Find enemy objects intersected by the ray.
        const hits = raycaster.intersectObjects(enemies, true);
        // Check if at least one enemy was hit.
        if (hits.length > 0) {
            // Loop over every hit in the list.
            hits.forEach(hit => {
                // Get the enemy mesh from this hit.
                const enemy = hit.object;
                // Store the enemy position for item drops.
                const dropPos = enemy.position.clone();
                // Respawn the enemy at a new location.
                const respawn = findEnemySpawnPosition();
                // Set the enemy's x position.
                enemy.position.x = respawn.x;
                // Set the enemy's z position.
                enemy.position.z = respawn.z;
                // Set the enemy's y position.
                enemy.position.y = respawn.y;
                // Increase the score for the kill.
                score += 10;
                // Increase the kill count.
                killCount++;
                // Drop a health pack every three kills.
                if (killCount % 3 === 0) {
                    // Create a health pack at the drop position.
                    createHealthPack(dropPos);
                }
            });
        }
        // Create a cylinder geometry for the lightning beam visual.
        const beamGeometry = new THREE.CylinderGeometry(0.05, 0.05, lightningRange, 8);
        // Create a blue material for the beam.
        const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        // Enable transparency so the beam can fade out.
        beamMaterial.transparent = true;
        // Set full opacity initially for a solid beam.
        beamMaterial.opacity = 1;
        // Create the beam mesh from the geometry and material.
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        // Create a quaternion to align the beam with the direction.
        const beamQuaternion = new THREE.Quaternion();
        // Calculate the rotation from the y axis to the firing direction.
        beamQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        // Apply the calculated rotation to the beam mesh.
        beam.quaternion.copy(beamQuaternion);
        // Position the beam half way along its length in front of the player.
        beam.position.copy(start.clone().add(dir.clone().multiplyScalar(lightningRange / 2)));
        // Record the spawn time for removal.
        beam.spawnTime = Date.now();
        // Add the beam to the scene for a brief flash.
        scene.add(beam);
        // Add the beam to the lightning beams array.
        lightningBeams.push(beam);
    } else {
        // Create a small box geometry for the bullet.
        const projectileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        // Create a yellow material for the bullet.
        const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        // Create a mesh for the bullet projectile.
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        // Set the bullet position to the camera position.
        camera.getWorldPosition(projectile.position);
        // Store the bullet spawn position for distance checks.
        projectile.spawnPosition = projectile.position.clone();
        // Get the camera direction.
        const projectileDirection = new THREE.Vector3();
        // Get the forward direction from the camera.
        camera.getWorldDirection(projectileDirection);
        // Set the bullet velocity.
        projectile.velocity = projectileDirection.multiplyScalar(1);
        // Mark this projectile as a bullet.
        projectile.isRocket = false;
        // Add the bullet to the scene.
        scene.add(projectile);
        // Add the bullet to the projectiles array.
        projectiles.push(projectile);
    }
    // Play the shooting sound effect only after player interaction.
    if (!autoplay) {
        // Call the function to play the shooting sound.
        playShootSound();
    }
}

// The function to create an enemy projectile.
function createEnemyProjectile(enemy) {
    // Create a small box geometry for the enemy projectile.
    const projectileGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    // Create a red material for the enemy projectile.
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // Create a mesh from the projectile geometry and material.
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    // Set the projectile's initial position to the enemy's position.
    projectile.position.copy(enemy.position);
    // Store the projectile spawn position for distance checks.
    projectile.spawnPosition = projectile.position.clone();
    // Get the direction from the enemy to the player.
    const directionToPlayer = new THREE.Vector3();
    // Subtract the enemy position from the player position.
    directionToPlayer.subVectors(yawObject.position, enemy.position);
    // Normalize the direction vector.
    directionToPlayer.normalize();
    // Set the projectile's velocity.
    projectile.velocity = directionToPlayer.multiplyScalar(0.5);
    // Add the projectile to the scene.
    scene.add(projectile);
    // Add the projectile to the enemy projectiles array.
    enemyProjectiles.push(projectile);
    // Attach a spatial hum to the enemy projectile.
    addHumToProjectile(projectile);
}

// Function to create a health pack at a given position.
function createHealthPack(position) {
    // Create a group to hold the cross bars.
    const pack = new THREE.Group();
    // Create a green material for the health pack.
    const packMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // Create a box geometry for the x axis bar.
    const barXGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.2);
    // Create a mesh for the x axis bar.
    const barXMesh = new THREE.Mesh(barXGeometry, packMaterial);
    // Add the x axis bar mesh to the group.
    pack.add(barXMesh);
    // Create a box geometry for the y axis bar.
    const barYGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    // Create a mesh for the y axis bar.
    const barYMesh = new THREE.Mesh(barYGeometry, packMaterial);
    // Add the y axis bar mesh to the group.
    pack.add(barYMesh);
    // Create a box geometry for the z axis bar.
    const barZGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.8);
    // Create a mesh for the z axis bar.
    const barZMesh = new THREE.Mesh(barZGeometry, packMaterial);
    // Add the z axis bar mesh to the group.
    pack.add(barZMesh);
    // Store the base y position for bobbing.
    pack.baseY = position.y;
    // Copy the provided position to the group.
    pack.position.copy(position);
    // Save the spawn time for expiration checks.
    pack.spawnTime = Date.now();
    // Add the health pack group to the scene.
    scene.add(pack);
    // Add the health pack to the health packs array.
    healthPacks.push(pack);
}

// Function to handle rocket explosions at a position.
function explodeRocket(position) {
    // Create a larger sphere geometry for the explosion effect.
    const explosionGeometry = new THREE.SphereGeometry(2, 8, 8);
    // Create an orange material for the explosion.
    const explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    // Create a mesh from the geometry and material.
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    // Set the explosion position to the provided coordinates.
    explosion.position.copy(position);
    // Record the spawn time for removal later.
    explosion.spawnTime = Date.now();
    // Add the explosion mesh to the scene.
    scene.add(explosion);
    // Create a point light for the explosion flash.
    const explosionLight = new THREE.PointLight(0xffaa00, 1, 10);
    // Set the light position to match the explosion.
    explosionLight.position.copy(position);
    // Record the spawn time for removal later.
    explosionLight.spawnTime = Date.now();
    // Add the explosion light to the scene.
    scene.add(explosionLight);
    // Add the explosion light to the explosionLights array.
    explosionLights.push(explosionLight);
    // Play a spatial sound effect at the explosion position.
    playExplosionSound(position);
    // Add the explosion to the explosions array.
    explosions.push(explosion);
    // Check each enemy to apply splash damage.
    for (let i = enemies.length - 1; i >= 0; i--) {
        // Get the current enemy.
        const enemy = enemies[i];
        // Check if the enemy is within six units of the explosion.
        if (enemy.position.distanceTo(position) < 6) {
            // Store the enemy position for item drops.
            const dropPos = enemy.position.clone();
            // Respawn the enemy at a new location.
            const respawn = findEnemySpawnPosition();
            // Set the enemy's x position.
            enemy.position.x = respawn.x;
            // Set the enemy's z position.
            enemy.position.z = respawn.z;
            // Set the enemy's y position.
            enemy.position.y = respawn.y;
            // Increment the score for the kill.
            score += 10;
            // Increment the kill count.
            killCount++;
            // Drop a health pack every three kills.
            if (killCount % 3 === 0) {
                // Create a health pack at the drop position.
                createHealthPack(dropPos);
            }
        }
    }
    // Apply splash damage to the player.
    if (yawObject.position.distanceTo(position) < 6) {
        // Reduce the player's health by twenty without going negative.
        health = Math.max(health - 20, 0);
        // Create a vector storing the direction away from the explosion.
        const pushDirection = new THREE.Vector3();
        // Calculate the direction from the explosion to the player.
        pushDirection.subVectors(yawObject.position, position);
        // Normalize the push direction.
        pushDirection.normalize();
        // Add the push force to the horizontal velocity.
        horizontalVelocity.add(pushDirection.multiplyScalar(0.3));
        // Increase the player's upward velocity if needed.
        verticalVelocity = Math.max(verticalVelocity, 0.2);
        // Mark the player as airborne because of the blast.
        isGrounded = false;
        // Check if the player's health has reached zero.
        if (health <= 0) {
            // Set the game over flag.
            gameOver = true;
            // Only record high scores when not in autoplay mode.
            if (!autoplay) {
                // Determine if the current score qualifies for the high score list.
                const qualifies = highScores.length < MAX_HIGH_SCORES || score > Math.min(...highScores.map(entry => entry.score));
                // Check if the score qualifies for the top five.
                if (qualifies) {
                    // Stop all sounds before showing the prompt.
                    stopSoundtrack();
                    if (typeof stopAllProjectileHums === 'function') {
                        stopAllProjectileHums();
                    }
                    // Prompt the player for their name or use a default value.
                    const playerName = prompt('Enter your name:', DEFAULT_PLAYER_NAME) || DEFAULT_PLAYER_NAME;
                    // Stop any hum that may have restarted after the prompt.
                    if (typeof stopAllProjectileHums === 'function') {
                        // Call the function to ensure silence.
                        stopAllProjectileHums();
                    }
                    // Add the new score to the high scores array.
                    highScores.push({ name: playerName, score: score });
                    // Sort high scores in descending order.
                    highScores.sort((a, b) => b.score - a.score);
                    // Keep only the top 5 scores.
                    highScores = highScores.slice(0, MAX_HIGH_SCORES);
                    // Save high scores to local storage.
                    saveHighScores();
                }
            }
            // Check if autoplay mode is active.
            if (autoplay) {
                // Reset the game state for a fresh demo.
                resetGameState();
                // Restart the autoplay demo.
                startAutoplay();
                // Clear the game over flag so the overlay does not show.
                gameOver = false;
            } else {
                // Stop the animation loop when the player dies.
                gamePaused = true;
                // Indicate that the game has ended.
                gameOver = true;
                // Stop the soundtrack when the game ends.
                stopSoundtrack();
                // Stop all projectile hums because gameplay has ended.
                if (typeof stopAllProjectileHums === 'function') {
                    // Call the function when it exists.
                    stopAllProjectileHums();
                }
                // Release the mouse pointer.
                document.exitPointerLock();
            }
        }
    }
}

// The function to find a valid spawn position for an enemy.
function findEnemySpawnPosition() {
    // Track how many attempts have been made.
    let attempts = 0;
    // Try multiple times to find a valid location.
    while (attempts < 100) {
        // Create a random x position within the play area.
        const x = (Math.random() - 0.5) * 50;
        // Create a random z position within the play area.
        const z = (Math.random() - 0.5) * 50;
        // Create a vector for the potential spawn position.
        const position = new THREE.Vector3(x, 1, z); // Initialize with a default y value.
        // Adjust the spawn y to rest on the surface of the scene.
        position.y = getGroundHeight(x, z) + 1; // Place enemies slightly above the ground.
        // Increment the attempt counter.
        attempts++;
        // Skip this position if it collides with any obstacle.
        if (collidesWithObstacles(position, 1 + obstacleSpawnBuffer)) {
            // Continue to the next attempt.
            continue;
        }
        // Skip this position if it is too close to the player.
        if (position.distanceTo(yawObject.position) < 5) {
            // Continue to the next attempt.
            continue;
        }
        // Assume the position does not overlap enemies.
        let overlaps = false;
        // Check against every existing enemy.
        for (let i = 0; i < enemies.length; i++) {
            // Get the current enemy for comparison.
            const other = enemies[i];
            // Check if the position is too close to this enemy.
            if (position.distanceTo(other.position) < 2) {
                // Mark that an overlap was found.
                overlaps = true;
                // Exit the loop early since it overlaps.
                break;
            }
        }
        // Continue searching if the position overlapped an enemy.
        if (overlaps) {
            // Continue to the next attempt.
            continue;
        }
        // Return the valid position if no problems were found.
        return position;
    }
    // Return a default position if all attempts fail.
    return new THREE.Vector3(0, 1, 0);
}

// The function to create an enemy.
function createEnemy() {
    // Find a valid spawn position for the enemy.
    const spawn = findEnemySpawnPosition();
    // Decide whether to use the model or a simple box fallback.
    let enemy; // Declare a variable to hold the enemy object.
    // Check if the enemy model is available.
    if (enemyModelReady && enemyModelTemplate) { // Use the loaded model when ready.
        // Clone the template to create a unique instance for this enemy.
        enemy = enemyModelTemplate.clone(true); // Deep clone the enemy model hierarchy.
        // Ensure the clone scale matches the configured enemy scale.
        enemy.scale.setScalar(ENEMY_MODEL_SCALE); // Apply uniform scaling directly on the clone as a safeguard.
        // Position the enemy at the chosen spawn point.
        enemy.position.set(spawn.x, spawn.y, spawn.z); // Place the enemy at the spawn location.
    } else {
        // Create a simple box geometry as a fallback enemy.
        const enemyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1); // Define a smaller cube (1/20th) to represent the enemy.
        // Create a material using the existing enemy texture.
        const enemyMaterial = new THREE.MeshLambertMaterial({ map: enemyTexture }); // Build a lit material for the enemy.
        // Create a mesh from the fallback geometry and material.
        enemy = new THREE.Mesh(enemyGeometry, enemyMaterial); // Instantiate the fallback enemy mesh.
        // Position the fallback enemy at the spawn point.
        enemy.position.set(spawn.x, spawn.y, spawn.z); // Place the fallback enemy at the spawn location.
        // Enable shadows on the fallback mesh when in high quality mode.
        enemy.castShadow = HIGH_QUALITY; // Allow shadow casting based on quality settings.
    }
    // Set the last shot time for the enemy.
    enemy.lastShotTime = Date.now();
    // Set the shot interval for the enemy (randomized).
    enemy.shotInterval = Math.random() * 2000 + 1000; // 1 to 3 seconds
    // Create a random velocity for the enemy.
    enemy.velocity = new THREE.Vector3(
        // Set a random x velocity.
        (Math.random() - 0.5) * 0.1,
        // Set the y velocity to 0.
        0,
        // Set a random z velocity.
        (Math.random() - 0.5) * 0.1
    );
    // Add the enemy to the scene.
    scene.add(enemy);
    // Add the enemy to the enemies array.
    enemies.push(enemy);
}

// Create the initial number of enemies.
for (let i = 0; i < initialEnemyCount; i++) {
    // Create an enemy.
    createEnemy();
}

// Function to adjust the number of enemies over time.
function updateEnemySpawn() {
    // Do not spawn enemies when the tab is not visible.
    if (!tabVisible) {
        // Reset the spawn check timer to avoid catch up spawns.
        lastSpawnCheck = Date.now();
        // Exit early because spawning is paused.
        return;
    }
    // Get the current time.
    const now = Date.now();
    // Check if one second has passed since the last update.
    if (now - lastSpawnCheck >= 1000) {
        // Calculate the elapsed time in minutes.
        const minutesElapsed = (now - gameStartTime) / 60000;
        // Determine how many enemies should exist now.
        const targetCount = Math.floor(initialEnemyCount * Math.pow(2, minutesElapsed));
        // Calculate how many new enemies must be created.
        const needed = targetCount - enemies.length;
        // Spawn additional enemies when needed.
        for (let i = 0; i < needed; i++) {
            // Create a new enemy.
            createEnemy();
        }
        // Record the time of this spawn update.
        lastSpawnCheck = now;
    }
}


// The main animation loop.
function animate(currentTime) {
    // Request the next animation frame.
    requestAnimationFrame(animate); // Schedule the next frame without storing the ID to avoid TDZ issues.

    // Do not render or update the 3D scene while assets are loading.
    if (assetsLoading) { // Check if loading is still in progress.
        // Skip all rendering and game logic so only the loading UI is visible.
        return; // Exit early until assets are ready.
    }

    // Calculate FPS.
    frameCount++;
    // Check if one second has passed.
    if (currentTime > lastFrameTime + 1000) { // Check once per second to update FPS and dynamic settings.
        // Calculate FPS.
        fps = Math.round(frameCount * 1000 / (currentTime - lastFrameTime)); // Compute frames per second.
        // Reset last frame time.
        lastFrameTime = currentTime; // Store the time of this sampling window.
        // Reset frame count.
        frameCount = 0; // Zero the frame counter for the next window.
        // Dynamically adjust pixel ratio to balance performance and clarity.
        if (!HIGH_QUALITY) { // Only perform dynamic scaling in low quality mode.
            // Get the current pixel ratio used by the renderer.
            const currentPR = renderer.getPixelRatio(); // Read the current device pixel ratio cap.
            // Define the allowed range for dynamic scaling.
            const minPR = 0.8; // Set the minimum pixel ratio for acceptable clarity.
            const maxPR = 1.25; // Set the maximum pixel ratio for performance mode.
            // Decide on a small step to adjust the pixel ratio.
            const step = 0.1; // Choose a gentle increment to avoid visible jumps.
            // Decrease pixel ratio if FPS drops below target.
            if (fps < 50 && currentPR > minPR) { // Check for low performance.
                // Apply a lower pixel ratio to reduce GPU workload.
                renderer.setPixelRatio(Math.max(minPR, currentPR - step)); // Lower the pixel ratio within bounds.
            }
            // Increase pixel ratio if there is headroom.
            if (fps > 58 && currentPR < maxPR) { // Check if performance allows a higher resolution.
                // Apply a higher pixel ratio to improve clarity.
                renderer.setPixelRatio(Math.min(maxPR, currentPR + step)); // Raise the pixel ratio within bounds.
            }
        }
    }

    // Update the pistol animation mixer using a smoothed delta.
    updatePistolMixer(1 / 60); // Advance the pistol mixer assuming a nominal frame time.
    // Ensure the pistol plays ambient idle when selected and not busy with other actions.
    if (pistolReady && currentWeapon === 0 && pistolObject && pistolObject.visible) { // Confirm pistol state and visibility.
        // Determine if an action is currently active and still running.
        const active = pistolActiveActionName; // Read the currently active pistol action name.
        const isRunning = active && pistolActions[active] ? pistolActions[active].isRunning() : false; // Check if it is playing.
        // Start ambient loop if nothing else is running.
        if (!isRunning && pistolActions.ambient) { // Ensure ambient exists and no one-shot is in progress.
            // Play the looping ambient animation to keep the pistol animated while idling.
            playPistolAction('ambient', false); // Trigger the ambient idle loop.
        }
    }

    // If the game is paused, do not update game logic.
    if (gamePaused) {
        // Rotate the camera slowly during autoplay.
        if (autoplay) {
            // Increase the yaw rotation slightly each frame.
            yawObject.rotation.y += 0.005;
        }
        // Render the scene without updates.
        renderer.render(scene, camera);
        // Check if two hundred milliseconds have passed since the last UI update.
        if (currentTime - lastUIUpdate >= 200) {
            // Record the time of this UI update.
            lastUIUpdate = currentTime;
            // Draw the UI overlay.
            drawUI();
        }
        // Exit early to skip game logic.
        return;
    }

    // Update the AI controller when autoplay is active and the tab is visible.
    if (autoplay && tabVisible) {
        // Call the AI update function with the current time.
        updateAutoplayAI(currentTime);
    }

    // Increase the number of enemies gradually over time.
    updateEnemySpawn();

    // Fire repeatedly when the mouse is held down.
    if (isMouseDown && currentTime - lastPlayerShotTime >= playerShotInterval) { // Check if it is time to auto-fire again.
        // Handle the pistol weapon with magazine and reload logic.
        if (currentWeapon === 0) { // Check if the pistol is currently selected.
            // Do not fire while reloading the pistol.
            if (pistolReloading) { // Verify that a reload is not in progress.
                // Skip firing during reload to prevent shooting through the animation.
                // No action taken here while reloading.
            } else if (pistolAmmo <= 0) { // Check if the magazine is empty.
                // Start the appropriate reload sequence for an empty magazine.
                startPistolReload(); // Initiate the reload since no rounds remain.
            } else { // Proceed to fire a round when ammo is available and not reloading.
                // Determine if this shot will empty the magazine.
                const isLastShotAuto = pistolAmmo === 1; // Check if the current round is the last one.
                // Play the correct firing animation for this auto-fire shot.
                playPistolAction(isLastShotAuto ? 'firelast' : 'fire', true); // Trigger the matching pistol animation.
                // Create the projectile for this pistol shot.
                createProjectile(); // Spawn the pistol bullet mesh into the scene.
                // Decrease the pistol ammo count by one.
                pistolAmmo -= 1; // Deduct a round from the pistol magazine.
                // Record the time of this shot to enforce the fire rate.
                lastPlayerShotTime = currentTime; // Update the last shot timestamp.
            }
        } else { // Handle other weapon types that do not use the pistol magazine.
            // Create another projectile for non-pistol weapons.
            createProjectile(); // Spawn a projectile for the active non-pistol weapon.
            // Update the time of the last shot to throttle the fire rate.
            lastPlayerShotTime = currentTime; // Store the shot time for the next interval check.
        }
    }

    // Reset the input velocity vector.
    inputVelocity.set(0, 0, 0);

    // Check for forward movement.
    if (keys['w'] || keys['z']) {
        // Apply forward input.
        inputVelocity.z -= 1;
    }
    // Check for backward movement.
    if (keys['s']) {
        // Apply backward input.
        inputVelocity.z += 1;
    }
    // Check for left movement.
    if (keys['a'] || keys['q']) {
        // Apply left input.
        inputVelocity.x -= 1;
    }
    // Check for right movement.
    if (keys['d']) {
        // Apply right input.
        inputVelocity.x += 1;
    }

    // Normalize the input direction if needed.
    if (inputVelocity.length() > 0) {
        // Normalize the input direction vector.
        inputVelocity.normalize();
        // Rotate the input by the current yaw.
        inputVelocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawObject.rotation.y);
        // Determine the acceleration based on grounded state.
        const accel = isGrounded ? groundAcceleration : airAcceleration;
        // Scale the input by the acceleration.
        inputVelocity.multiplyScalar(accel);
        // Add the input to the horizontal velocity.
        horizontalVelocity.add(inputVelocity);
    }

    // Apply friction depending on grounded state.
    if (isGrounded) {
        // Apply strong friction on the ground.
        horizontalVelocity.multiplyScalar(groundFriction);
    } else {
        // Apply light friction in the air.
        horizontalVelocity.multiplyScalar(airFriction);
    }

    // Clamp the horizontal velocity to the maximum speed.
    if (horizontalVelocity.length() > maxSpeed) {
        // Normalize the horizontal velocity.
        horizontalVelocity.normalize();
        // Scale it to the maximum speed.
        horizontalVelocity.multiplyScalar(maxSpeed);
    }

    // Create a copy of the player's position for collision testing.
    const potentialPosition = yawObject.position.clone();
    // Add the horizontal velocity to the potential position.
    potentialPosition.add(horizontalVelocity);
    // Check for collisions with obstacles before moving.
    if (!collidesWithObstacles(potentialPosition, 1)) {
        // Update the player's position if no collision occurs.
        yawObject.position.copy(potentialPosition);
    } else {
        // Store the original horizontal speed for later comparison.
        const originalSpeed = horizontalVelocity.length();
        // Create a position that only moves along the x axis.
        const potentialX = yawObject.position.clone();
        // Apply the horizontal x velocity to the potential position.
        potentialX.x += horizontalVelocity.x;
        // Check if moving along the x axis causes a collision.
        if (!collidesWithObstacles(potentialX, 1)) {
            // Copy the allowed x position to the player.
            yawObject.position.x = potentialX.x;
        } else {
            // Remove the x velocity when hitting a wall.
            horizontalVelocity.x = 0;
        }
        // Create a position that only moves along the z axis.
        const potentialZ = yawObject.position.clone();
        // Apply the horizontal z velocity to the potential position.
        potentialZ.z += horizontalVelocity.z;
        // Check if moving along the z axis causes a collision.
        if (!collidesWithObstacles(potentialZ, 1)) {
            // Copy the allowed z position to the player.
            yawObject.position.z = potentialZ.z;
        } else {
            // Remove the z velocity when hitting a wall.
            horizontalVelocity.z = 0;
        }
        // Store the remaining horizontal speed after removing blocked axes.
        const remainingSpeed = horizontalVelocity.length();
        // Reduce speed based on how much was blocked by the obstacle.
        if (originalSpeed > 0) {
            // Scale the velocity proportionally to the remaining speed.
            horizontalVelocity.multiplyScalar(remainingSpeed / originalSpeed);
        }
    }

    // Clamp the player's x position within the ground boundaries.
    yawObject.position.x = Math.max(-250, Math.min(250, yawObject.position.x));
    // Clamp the player's z position within the ground boundaries.
    yawObject.position.z = Math.max(-250, Math.min(250, yawObject.position.z));

    // Get the surface height directly below the player using a small cache.
    const surfaceY = getPlayerSurfaceY(); // Retrieve the ground height with caching for performance.
    // Calculate the y position where the player's camera should rest.
    const targetY = surfaceY + groundLevel;
    // Apply gravity to the vertical velocity.
    verticalVelocity += gravity;
    // Add the vertical velocity to the player's y position.
    yawObject.position.y += verticalVelocity;
    // Check if the player's feet are below the surface height.
    if (yawObject.position.y - groundLevel <= surfaceY) {
        // Snap the player position to the surface height.
        yawObject.position.y = targetY;
        // Reset the vertical velocity when landing.
        verticalVelocity = 0;
        // Mark the player as grounded.
        isGrounded = true;
    } else {
        // Mark the player as airborne when above the surface.
        isGrounded = false;
    }
    // Increase bobbing when the player is airborne.
    if (!isGrounded) {
        // Calculate a bobbing offset using the current time.
        gunBobOffset = Math.sin(Date.now() * 0.02) * gunBobAmplitude;
    } else {
        // Reduce the bobbing offset gradually when grounded.
        gunBobOffset *= gunBobDamping;
    }
    // Apply the vertical bobbing offset to the gun position.
    gunGroup.position.y = gunBasePosition.y + gunBobOffset;
    // Gradually return the gun tilt on the x axis to zero.
    gunTiltX *= 0.9;
    // Gradually return the gun tilt on the y axis to zero.
    gunTiltY *= 0.9;
    // Apply the gun tilt rotations for weaving effect.
    gunGroup.rotation.set(gunTiltX, gunTiltY, 0);

    // Update the position of each projectile.
    for (let i = projectiles.length - 1; i >= 0; i--) {
        // Get the current projectile.
        const projectile = projectiles[i];
        // Update the projectile's position based on its velocity.
        projectile.position.add(projectile.velocity);
        // Remove the projectile if it travels too far from its spawn position.
        if (projectile.position.distanceTo(projectile.spawnPosition) > 100) {
            // Stop the hum sound for this projectile.
            removeHumFromProjectile(projectile);
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the projectiles array.
            projectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }
        // Check if the projectile is a rocket.
        if (projectile.isRocket) {
            // Track whether the rocket should explode.
            let explode = false;
            // Explode when the rocket hits an obstacle.
            if (collidesWithObstacles(projectile.position, 0.5)) {
                // Mark the rocket for explosion.
                explode = true;
            }
            // Explode when the rocket touches the ground surface from the scene.
            if (projectile.position.y <= getGroundHeight(projectile.position.x, projectile.position.z)) { // Compare rocket height to surface height.
                // Mark the rocket for explosion.
                explode = true; // Flag for explosion on ground impact.
            }
            // Explode when leaving the play area.
            if (Math.abs(projectile.position.x) > 250 || Math.abs(projectile.position.z) > 250) {
                // Mark the rocket for explosion.
                explode = true;
            }
            // Check for direct hits on enemies.
            for (let j = enemies.length - 1; j >= 0 && !explode; j--) {
                // Get the current enemy.
                const enemy = enemies[j];
                // Check the distance between the rocket and the enemy.
                if (projectile.position.distanceTo(enemy.position) < 1.5) {
                    // Mark the rocket for explosion.
                    explode = true;
                }
            }
            // Detonate the rocket if needed.
            if (explode) {
                // Stop the hum sound for this projectile.
                removeHumFromProjectile(projectile);
                // Remove the rocket mesh from the scene.
                scene.remove(projectile);
                // Remove the rocket from the projectiles array.
                projectiles.splice(i, 1);
                // Create an explosion at the rocket position.
                explodeRocket(projectile.position);
                // Continue to the next projectile.
                continue;
            }
        } else {
            // Remove the projectile if it hits an obstacle.
            if (collidesWithObstacles(projectile.position, 0.5)) {
                // Stop the hum sound for this projectile.
                removeHumFromProjectile(projectile);
                // Remove the projectile mesh from the scene.
                scene.remove(projectile);
                // Remove the projectile from the projectiles array.
                projectiles.splice(i, 1);
                // Continue to the next projectile.
                continue;
            }
            // Remove the projectile if it leaves the ground plane.
            if (Math.abs(projectile.position.x) > 250 || Math.abs(projectile.position.z) > 250) {
                // Stop the hum sound for this projectile.
                removeHumFromProjectile(projectile);
                // Remove the projectile mesh from the scene.
                scene.remove(projectile);
                // Remove the projectile from the projectiles array.
                projectiles.splice(i, 1);
                // Continue to the next projectile.
                continue;
            }
        }

        // Check for collisions with enemy projectiles.
        for (let k = enemyProjectiles.length - 1; k >= 0; k--) {
            // Get the current enemy projectile.
            const enemyProjectile = enemyProjectiles[k];
            // Check if the projectile is close to the enemy projectile.
            if (projectile.position.distanceTo(enemyProjectile.position) < 0.5) {
                // Stop the hum sound for the player projectile.
                removeHumFromProjectile(projectile);
                // Remove the player projectile from the scene.
                scene.remove(projectile);
                // Remove the player projectile from the array.
                projectiles.splice(i, 1);
                // Stop the hum sound for the enemy projectile.
                removeHumFromProjectile(enemyProjectile);
                // Remove the enemy projectile from the scene.
                scene.remove(enemyProjectile);
                // Remove the enemy projectile from its array.
                enemyProjectiles.splice(k, 1);
                // Stop checking other enemy projectiles since this projectile is gone.
                break;
            }
        }

        // Check for collisions with enemies.
        for (let j = enemies.length - 1; j >= 0; j--) {
            // Get the current enemy.
            const enemy = enemies[j];
            // Check if the projectile is close to the enemy.
            if (projectile.position.distanceTo(enemy.position) < 1.5) {
                // Stop the hum sound for this projectile.
                removeHumFromProjectile(projectile);
                // Remove the projectile from the scene.
                scene.remove(projectile);
                // Remove the projectile from the array.
                projectiles.splice(i, 1);
                // Store the enemy position for item drops.
                const dropPos = enemy.position.clone();
                // Respawn the enemy.
                const respawn = findEnemySpawnPosition();
                // Set the enemy's x position.
                enemy.position.x = respawn.x;
                // Set the enemy's z position.
                enemy.position.z = respawn.z;
                // Set the enemy's y position.
                enemy.position.y = respawn.y;
                // Increment the score.
                score += 10;
                // Increment the kill count.
                killCount++;
                // Check if a health pack should be dropped.
                if (killCount % 3 === 0) {
                    // Create a health pack at the drop position.
                    createHealthPack(dropPos);
                }
                // Break the inner loop since the projectile is gone.
                break;
            }
        }
    }

    // Update the position of each enemy projectile.
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        // Get the current enemy projectile.
        const projectile = enemyProjectiles[i];
        // Update the projectile's position based on its velocity.
        projectile.position.add(projectile.velocity);
        // Remove the projectile if it travels too far from its spawn position.
        if (projectile.position.distanceTo(projectile.spawnPosition) > 100) {
            // Stop the hum sound for this projectile.
            removeHumFromProjectile(projectile);
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the enemy projectiles array.
            enemyProjectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }
        // Remove the projectile if it hits an obstacle.
        if (collidesWithObstacles(projectile.position, 0.5)) {
            // Stop the hum sound for this projectile.
            removeHumFromProjectile(projectile);
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the enemy projectiles array.
            enemyProjectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }

        // Remove the enemy projectile if it leaves the ground plane.
        if (Math.abs(projectile.position.x) > 250 || Math.abs(projectile.position.z) > 250) {
            // Stop the hum sound for this projectile.
            removeHumFromProjectile(projectile);
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the enemy projectiles array.
            enemyProjectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }

        // Check for collision with the player.
        if (projectile.position.distanceTo(yawObject.position) < 1) {
            // Stop the hum sound for this projectile.
            removeHumFromProjectile(projectile);
            // Remove the projectile from the scene.
            scene.remove(projectile);
            // Remove the projectile from the array.
            enemyProjectiles.splice(i, 1);
            // Decrease player health without going below zero.
            health = Math.max(health - 10, 0);
            // Play the damage sound effect only after player interaction.
            if (!autoplay) {
                // Call the function to play the damage sound.
                playDamageSound();
            }
            // Check if player is dead.
            if (health <= 0) {
                gameOver = true;
                // Only record high scores when not in autoplay mode.
                if (!autoplay) {
                    // Determine if the current score qualifies for the high score list.
                    const qualifies = highScores.length < MAX_HIGH_SCORES || score > Math.min(...highScores.map(entry => entry.score));
                    // Check if the score qualifies for the top five.
                    if (qualifies) {
                        // Stop all sounds before showing the prompt.
                        stopSoundtrack();
                        if (typeof stopAllProjectileHums === 'function') {
                            stopAllProjectileHums();
                        }
                        // Prompt the player for their name or use a default value.
                        const playerName = prompt('Enter your name:', DEFAULT_PLAYER_NAME) || DEFAULT_PLAYER_NAME;
                        // Stop any hum that may have restarted after the prompt.
                        if (typeof stopAllProjectileHums === 'function') {
                            // Call the function to ensure silence.
                            stopAllProjectileHums();
                        }
                        // Add the new score to the high scores array.
                        highScores.push({ name: playerName, score: score });
                        // Sort high scores in descending order.
                        highScores.sort((a, b) => b.score - a.score);
                        // Keep only the top 5 scores.
                        highScores = highScores.slice(0, MAX_HIGH_SCORES);
                        // Save high scores to local storage.
                        saveHighScores();
                    }
                }
                // Check if autoplay mode is active.
                if (autoplay) {
                    // Reset the game state for a fresh demo.
                    resetGameState();
                    // Restart the autoplay demo.
                    startAutoplay();
                    // Clear the game over flag so the overlay does not show.
                    gameOver = false;
                } else {
                    // Stop the animation loop when the player dies.
                    gamePaused = true;
                    // Indicate that the game has ended.
                    gameOver = true;
                    // Stop the soundtrack when the game ends.
                    stopSoundtrack();
                    // Stop all projectile hums because gameplay has ended.
                    if (typeof stopAllProjectileHums === 'function') {
                        // Call the function when it exists.
                        stopAllProjectileHums();
                    }
                    // Release the mouse pointer.
                    document.exitPointerLock();
                }
            }
        }
    }

    // Update each explosion and remove old ones.
    for (let i = explosions.length - 1; i >= 0; i--) {
        // Get the current explosion mesh.
        const boom = explosions[i];
        // Remove the explosion after three hundred milliseconds.
        if (Date.now() - boom.spawnTime > 300) {
            // Remove the explosion mesh from the scene.
            scene.remove(boom);
            // Remove the explosion from the array.
            explosions.splice(i, 1);
        }
    }
    // Update each explosion light and remove old ones.
    for (let i = explosionLights.length - 1; i >= 0; i--) {
        // Get the current explosion light.
        const light = explosionLights[i];
        // Remove the light after one hundred milliseconds.
        if (Date.now() - light.spawnTime > 100) {
            // Remove the light from the scene.
            scene.remove(light);
            // Remove the light from the array.
            explosionLights.splice(i, 1);
        }
    }

    // Update each lightning beam and remove old ones.
    for (let i = lightningBeams.length - 1; i >= 0; i--) {
        // Get the current lightning beam.
        const beam = lightningBeams[i];
        // Calculate the time since the beam spawned.
        const elapsed = Date.now() - beam.spawnTime;
        // Reduce the beam opacity based on the elapsed time.
        beam.material.opacity = 1 - (elapsed / lightningFadeDuration);
        // Remove the beam when fully transparent.
        if (elapsed > lightningFadeDuration) {
            // Remove the beam mesh from the scene.
            scene.remove(beam);
            // Remove the beam from the array.
            lightningBeams.splice(i, 1);
        }
    }

    // Update the position of each health pack.
    for (let i = healthPacks.length - 1; i >= 0; i--) {
        // Get the current health pack.
        const pack = healthPacks[i];
        // Bob the pack up and down over time.
        pack.position.y = pack.baseY + Math.sin(Date.now() / 500) * 0.25;
        // Remove the pack if it has been active too long.
        if (Date.now() - pack.spawnTime > healthPackDuration) {
            // Remove the pack from the scene.
            scene.remove(pack);
            // Remove the pack from the array.
            healthPacks.splice(i, 1);
            // Continue to the next pack.
            continue;
        }
        // Check if the player is close enough to pick up the pack.
        if (pack.position.distanceTo(yawObject.position) < healthPackPickupRadius) {
            // Remove the pack from the scene.
            scene.remove(pack);
            // Remove the pack from the array.
            healthPacks.splice(i, 1);
            // Restore the player's health by fifty points.
            health = Math.min(health + 50, 100);
            // Play the health pack pickup sound only after player interaction.
            if (!autoplay) {
                // Call the function to play the health pack sound.
                playHealthPackSound();
            }
            // Continue to the next pack.
            continue;
        }
    }

    // Update the position of each enemy.
    for (let i = 0; i < enemies.length; i++) {
        // Get the current enemy.
        const enemy1 = enemies[i];
        // Create a copy of the enemy position for collision testing.
        const enemyNext = enemy1.position.clone();
        // Add the enemy's velocity to the potential position.
        enemyNext.add(enemy1.velocity);
        // Check for collisions with obstacles before moving.
        if (!collidesWithObstacles(enemyNext, 1)) {
            // Update the enemy's position if no collision occurs.
            enemy1.position.copy(enemyNext);
        } else {
            // Reverse the enemy velocity if a collision occurs.
            enemy1.velocity.x *= -1;
            // Reverse the enemy velocity on the z axis as well.
            enemy1.velocity.z *= -1;
        }

        // Check if the enemy has hit the edge of the play area.
        if (enemy1.position.x < -250 || enemy1.position.x > 250) {
            // Reverse the enemy's x velocity.
            enemy1.velocity.x *= -1;
        }
        // Check if the enemy has hit the edge of the play area.
        if (enemy1.position.z < -250 || enemy1.position.z > 250) {
            // Reverse the enemy's z velocity.
            enemy1.velocity.z *= -1;
        }

        // Make the enemy face toward the player horizontally.
        const toPlayer = new THREE.Vector3(); // Create a vector to store the direction to the player.
        // Calculate the vector from the enemy to the player.
        toPlayer.subVectors(yawObject.position, enemy1.position); // Subtract enemy position from player position.
        // Ignore vertical component to keep the rotation on the ground plane.
        toPlayer.y = 0; // Zero out the y component so we only rotate around the y axis.
        // Check that the direction vector has a valid length to avoid NaN angles.
        if (toPlayer.lengthSq() > 1e-6) { // Ensure the vector is non-zero before computing the angle.
            // Compute the desired yaw angle so the enemy faces the player.
            let desiredYaw = Math.atan2(-toPlayer.x, -toPlayer.z); // Use atan2 to find the heading toward the player.
            // Flip the facing by 180 degrees because models currently point backward relative to forward.
            desiredYaw += Math.PI; // Add pi radians to rotate the model to face the aim direction.
            // Read the enemy's current yaw rotation.
            const currentYaw = enemy1.rotation.y; // Get the current rotation around the y axis.
            // Compute the wrapped difference to rotate along the shortest path.
            let deltaYaw = desiredYaw - currentYaw; // Calculate how far we need to rotate.
            // Wrap the delta to the range [-pi, pi] for smooth interpolation.
            deltaYaw = Math.atan2(Math.sin(deltaYaw), Math.cos(deltaYaw)); // Normalize the angle difference.
            // Choose a smoothing factor to avoid instant snapping.
            const turnSmoothing = 0.2; // Set how quickly the enemy turns toward the target direction.
            // Apply the smoothed rotation update to face the player.
            enemy1.rotation.y = currentYaw + deltaYaw * turnSmoothing; // Increment the yaw toward the desired facing.
        }

        // Check for collisions with other enemies.
        for (let j = i + 1; j < enemies.length; j++) {
            // Get the other enemy.
            const enemy2 = enemies[j];
            // Check if the enemies are colliding.
            if (enemy1.position.distanceTo(enemy2.position) < 2) {
                // Swap the velocities of the two enemies.
                const tempVelocity = enemy1.velocity.clone();
                // Set the first enemy's velocity to the second enemy's velocity.
                enemy1.velocity.copy(enemy2.velocity);
                // Set the second enemy's velocity to the first enemy's original velocity.
                enemy2.velocity.copy(tempVelocity);
            }
        }

        // Make enemies shoot at the player periodically.
        if (!gameOver && Date.now() - enemy1.lastShotTime > enemy1.shotInterval) {
            // Create an enemy projectile.
            createEnemyProjectile(enemy1);
            // Update the last shot time.
            enemy1.lastShotTime = Date.now();
            // Update the shot interval.
            enemy1.shotInterval = Math.random() * 2000 + 1000; // 1 to 3 seconds
        }
    }

    // Render the scene from the camera's perspective.
    renderer.render(scene, camera);
    // Update the UI only once every two hundred milliseconds.
    if (currentTime - lastUIUpdate >= 200) {
        // Record the time of this UI update.
        lastUIUpdate = currentTime;
        // Draw the UI overlay.
        drawUI();
    }
}

// Load high scores when the script starts.
loadHighScores();

// Start with the game running for the autoplay demo.
gamePaused = false;

// Function to reset the core game state.
function resetGameState() {
    // Reset player health to one hundred.
    health = 100;
    // Reset the score to zero.
    score = 0;
    // Reset the kill count to zero.
    killCount = 0;
    // Reset the vertical velocity.
    verticalVelocity = 0;
    // Set the player as grounded.
    isGrounded = true;
    // Stop hum sounds for all existing projectiles.
    if (typeof stopAllProjectileHums === 'function') {
        // Call the function when it exists.
        stopAllProjectileHums();
    }
    // Reset the player position on the x axis.
    yawObject.position.x = 0;
    // Reset the player position on the y axis.
    yawObject.position.y = 2;
    // Reset the player position on the z axis.
    yawObject.position.z = 5;
    // Reset the player rotation horizontally.
    yawObject.rotation.y = 0;
    // Reset the camera pitch.
    camera.rotation.x = 0;
    // Remove all existing enemies from the scene.
    enemies.forEach(enemy => {
        // Remove this enemy from the scene graph.
        scene.remove(enemy);
    });
    // Clear the enemies array.
    enemies.length = 0;
    // Remove all friendly projectiles from the scene.
    projectiles.forEach(p => {
        // Remove the projectile mesh.
        scene.remove(p);
    });
    // Clear the friendly projectiles array.
    projectiles.length = 0;
    // Remove all enemy projectiles from the scene.
    enemyProjectiles.forEach(p => {
        // Remove the projectile mesh.
        scene.remove(p);
    });
    // Clear the enemy projectiles array.
    enemyProjectiles.length = 0;
    // Remove all existing explosion meshes from the scene.
    explosions.forEach(explosion => {
        // Remove this explosion from the scene graph.
        scene.remove(explosion);
    });
    // Clear the explosions array.
    explosions.length = 0;
    // Remove all existing explosion lights from the scene.
    explosionLights.forEach(light => {
        // Remove this light from the scene graph.
        scene.remove(light);
    });
    // Clear the explosion lights array.
    explosionLights.length = 0;
    // Remove all existing health packs from the scene.
    healthPacks.forEach(pack => {
        // Remove this health pack from the scene graph.
        scene.remove(pack);
    });
    // Clear the health packs array.
    healthPacks.length = 0;
    // Remove any lightning beams from the scene.
    lightningBeams.forEach(beam => {
        // Remove the beam mesh from the scene graph.
        scene.remove(beam);
    });
    // Clear the lightning beams array.
    lightningBeams.length = 0;
    // Reset to the basic gun weapon.
    setWeapon(0);
    // Reset the game start time for spawn scaling.
    gameStartTime = Date.now();
    // Reset the spawn check timer.
    lastSpawnCheck = gameStartTime;
    // Create the starting number of enemies.
    for (let i = 0; i < initialEnemyCount; i++) {
        // Create a new enemy.
        createEnemy();
    }
}

// Function to start the game.
function startGame() {
    // Hide the start screen by setting the started flag.
    gameStarted = true;
    // Unpause the game.
    gamePaused = false;
    // Reset the core game state.
    if (typeof resetGameState !== 'undefined') {
        // Call the resetGameState function when available.
        resetGameState();
    }
    // Disable autoplay mode when the player starts.
    autoplay = false;
    // Start the soundtrack.
    startSoundtrack();
    // Request pointer lock.
    document.body.requestPointerLock();
    // Reset movement keys to avoid AI input persisting.
    if (typeof resetMovementKeys === 'function') {
        // Call the helper function when available.
        resetMovementKeys();
    } else if (typeof keys !== 'undefined') {
        // Clear the forward key state.
        keys['w'] = false;
        // Clear the left key state.
        keys['a'] = false;
        // Clear the backward key state.
        keys['s'] = false;
        // Clear the right key state.
        keys['d'] = false;
    }

    // Reset enemy shot timers.
    if (typeof resetEnemyShotTimers === 'function') {
        // Call the helper function when available.
        resetEnemyShotTimers();
    } else {
        // Loop over each enemy in the array.
        enemies.forEach(enemy => {
            // Set the last shot time for this enemy to the current time.
            enemy.lastShotTime = Date.now();
        });
    }
}
