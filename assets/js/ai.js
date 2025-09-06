// Variable to indicate autoplay mode is active.
let autoplay = true;
// Track when the AI should change direction.
let aiDirectionChangeTime = 0;
// Track when the AI should fire the next shot.
let aiShootTime = 0;
// Store the current AI movement direction.
let currentAIDirection = null;
// Store the projectile speed used for leading targets.
const projectileSpeed = 1;
// Store the smoothing factor for AI mouse movement.
const rotationSmoothing = 0.1;

// Milliseconds to wait between expensive line of sight checks.
const LOS_THROTTLE_MS = 250; // Define how frequently LOS raycasts may run for a given target.
// Helper to throttle line of sight tests and reuse recent results.
function throttledHasLineOfSight(from, to, entity) { // Define a function that caches LOS results briefly.
    // Use the current wall clock time for throttling decisions.
    const now = Date.now(); // Read the current time in milliseconds.
    // If an entity object is provided, store the cache on it; else use a static cache.
    let cacheOwner = entity || throttledHasLineOfSight; // Choose where to store the cache data.
    // Initialize the cache object if missing.
    if (!cacheOwner._losCache) { cacheOwner._losCache = { time: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), result: false }; } // Create the cache container.
    // Read the cache object for convenience.
    const cache = cacheOwner._losCache; // Access the last LOS computation data.
    // Check if the cache is still valid and the endpoints have not changed much.
    const fresh = (now - cache.time) < LOS_THROTTLE_MS; // Determine if the cached result is still recent.
    // Compute endpoint movement distances since the last computation.
    const movedFrom = cache.from.distanceTo(from); // Measure how far the start point moved.
    const movedTo = cache.to.distanceTo(to); // Measure how far the end point moved.
    // Decide whether the cache can be reused based on age and movement thresholds.
    if (fresh && movedFrom < 0.5 && movedTo < 0.5) { // Check if the cached result is acceptable.
        // Return the previously computed visibility result.
        return cache.result; // Provide the cached line of sight boolean.
    }
    // Compute a fresh result using the underlying function.
    const result = hasLineOfSight(from, to); // Perform the expensive raycast check.
    // Update the cache timestamp.
    cache.time = now; // Record when this computation occurred.
    // Store the endpoints used for this computation.
    cache.from.copy(from); // Save the start point used.
    cache.to.copy(to); // Save the end point used.
    // Store the computed result for reuse.
    cache.result = result; // Save the visibility result in the cache.
    // Return the newly computed visibility value.
    return result; // Provide the outcome of the raycast.
} // End of throttledHasLineOfSight helper.

// Function to find the closest visible health pack.
function findVisibleHealthPack() {
    // Initialize the closest pack variable.
    let closest = null;
    // Set the minimum distance to a large value.
    let minDist = Infinity;
    // Iterate over each health pack.
    healthPacks.forEach(pack => {
        // Check if the pack is visible to the player using throttled line of sight.
        if (throttledHasLineOfSight(yawObject.position, pack.position)) {
            // Calculate the distance to this pack.
            const dist = yawObject.position.distanceTo(pack.position);
            // Update the closest pack if this one is nearer.
            if (dist < minDist) {
                // Set the minimum distance to this pack's distance.
                minDist = dist;
                // Store this pack as the closest.
                closest = pack;
            }
        }
    });
    // Return the closest visible pack or null.
    return closest;
}

// Function to check if a movement direction has an obstacle.
function isDirectionClear(dir) {
    // Create a vector to store the movement step.
    const step = new THREE.Vector3();
    // Check for forward movement.
    if (dir === 'w') {
        // Set the step to move one unit forward.
        step.set(0, 0, -1);
    } else if (dir === 's') {
        // Set the step to move one unit backward.
        step.set(0, 0, 1);
    } else if (dir === 'a') {
        // Set the step to move one unit left.
        step.set(-1, 0, 0);
    } else if (dir === 'd') {
        // Set the step to move one unit right.
        step.set(1, 0, 0);
    } else {
        // Return false for an unknown direction.
        return false;
    }
    // Rotate the step based on the player's yaw.
    step.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawObject.rotation.y);
    // Clone the player position for collision checks.
    const pos = yawObject.position.clone();
    // Add the step to the cloned position.
    pos.add(step);
    // Return true when no obstacle blocks the position.
    return !collidesWithObstacles(pos, 1);
}

// Function to list all directions without obstacles.
function getOpenDirections() {
    // Create an array for valid directions.
    const open = [];
    // Define every possible movement key.
    const dirs = ['w', 'a', 's', 'd'];
    // Loop over each direction.
    dirs.forEach(dir => {
        // Add the direction when the path is clear.
        if (isDirectionClear(dir)) {
            // Push the direction into the open array.
            open.push(dir);
        }
    });
    // Return all clear directions.
    return open;
}

// Function to update the autoplay AI each frame.
function updateAutoplayAI(currentTime) {
    // Look for a health pack when health is below one hundred.
    const pack = health < 100 ? findVisibleHealthPack() : null;
    // Determine which directions are free of obstacles.
    const openDirs = getOpenDirections();
    // Check if a pack was found.
    if (pack) {
        // Create a vector that points from the player to the pack.
        const toPack = pack.position.clone().sub(yawObject.position);
        // Rotate the vector into the player's local space.
        toPack.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yawObject.rotation.y);
        // Store the horizontal distance in local space.
        const localX = toPack.x;
        // Store the depth distance in local space.
        const localZ = toPack.z;
        // Choose a desired direction toward the pack.
        let desired;
        // Decide whether horizontal or depth movement is greater.
        if (Math.abs(localX) > Math.abs(localZ)) {
            // Move right if the pack is to the right.
            desired = localX > 0 ? 'd' : 'a';
        } else {
            // Move forward if the pack is ahead.
            desired = localZ < 0 ? 'w' : 's';
        }
        // Use the desired direction if it is clear.
        if (openDirs.includes(desired)) {
            // Set the AI direction to the desired direction.
            currentAIDirection = desired;
        } else if (openDirs.length > 0) {
            // Choose a random clear direction when blocked.
            currentAIDirection = openDirs[Math.floor(Math.random() * openDirs.length)];
        } else {
            // Clear the direction when no path is open.
            currentAIDirection = null;
        }
        // Update the time before another direction change.
        aiDirectionChangeTime = currentTime + 500;
    } else if (currentTime > aiDirectionChangeTime) {
        // Choose a random clear direction for wandering.
        if (openDirs.length > 0) {
            // Select a random direction from the open list.
            currentAIDirection = openDirs[Math.floor(Math.random() * openDirs.length)];
        } else {
            // Clear the direction when no path is available.
            currentAIDirection = null;
        }
        // Schedule the next direction change after one second.
        aiDirectionChangeTime = currentTime + 1000;
    }
    // Verify that the current direction is still clear.
    if (currentAIDirection && !isDirectionClear(currentAIDirection)) {
        // Stop moving when the path becomes blocked.
        currentAIDirection = null;
    }
    // Reset the movement keys before applying the AI direction.
    if (typeof resetMovementKeys === 'function') {
        // Call the helper function when available.
        resetMovementKeys();
    }
    // Apply the current AI movement direction if any.
    if (currentAIDirection) {
        // Set the chosen direction key to true.
        keys[currentAIDirection] = true;
    }
    // Find the nearest enemy to target.
    let target = null;
    // Set the minimum distance to a large value.
    let minDist = Infinity;
    // Store the nearest enemy even if out of sight.
    let fallback = null;
    // Store the distance to the fallback enemy.
    let fallbackDist = Infinity;
    // Iterate over every enemy.
    enemies.forEach(enemy => {
        // Calculate the distance to this enemy.
        const dist = yawObject.position.distanceTo(enemy.position);
        // Update the fallback if this enemy is the closest so far.
        if (dist < fallbackDist) {
            // Set the fallback distance to this enemy's distance.
            fallbackDist = dist;
            // Set this enemy as the new fallback.
            fallback = enemy;
        }
        // Check if the enemy is visible without obstacles using throttled checks.
        if (throttledHasLineOfSight(yawObject.position, enemy.position)) {
            // Check if this enemy is closer than the current target.
            if (dist < minDist) {
                // Set the minimum distance to this enemy's distance.
                minDist = dist;
                // Set this enemy as the new target.
                target = enemy;
            }
        }
    });
    // Use the fallback when no enemy is visible.
    if (!target) {
        // Assign the fallback enemy as the target.
        target = fallback;
    }
    // Aim at the target if one exists.
    if (target) {
        // Create a vector from the player to the target.
        const dir = new THREE.Vector3();
        // Calculate the distance from the player to the target.
        const distance = yawObject.position.distanceTo(target.position);
        // Determine the travel time based on projectile speed.
        const travelTime = distance / projectileSpeed;
        // Predict the target position after the travel time.
        const predicted = target.position.clone().add(target.velocity.clone().multiplyScalar(travelTime));
        // Subtract the player position from the predicted position.
        dir.subVectors(predicted, yawObject.position);
        // Calculate the desired yaw to face the predicted position.
        const desiredYaw = Math.atan2(-dir.x, -dir.z);
        // Calculate the yaw difference between the current rotation and the desired rotation.
        let deltaYaw = desiredYaw - yawObject.rotation.y;
        // Wrap the yaw difference to the range negative pi to positive pi.
        deltaYaw = Math.atan2(Math.sin(deltaYaw), Math.cos(deltaYaw));
        // Smoothly rotate the player toward the desired yaw using the wrapped difference.
        yawObject.rotation.y += deltaYaw * rotationSmoothing;
        // Calculate the horizontal distance to the predicted position.
        const horiz = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
        // Calculate the desired pitch toward the predicted position.
        const desiredPitch = Math.atan2(predicted.y - yawObject.position.y, horiz);
        // Smoothly rotate the camera toward the desired pitch.
        camera.rotation.x += (desiredPitch - camera.rotation.x) * rotationSmoothing;
        // Clamp the camera pitch to prevent flipping.
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        // Fire a shot periodically when there is a clear path.
        if (currentTime > aiShootTime) {
            // Check if the player can see the predicted position without obstacles using the last enemy LOS result when recent.
            if (throttledHasLineOfSight(yawObject.position, predicted, target)) {
                // Create a projectile towards the target.
                createProjectile();
            }
            // Schedule the next shot after half a second.
            aiShootTime = currentTime + 500;
        }
    }
    // Randomly jump if on the ground with higher frequency.
    if (Math.random() < 0.05 && isGrounded) {
        // Set the vertical velocity for a jump.
        verticalVelocity = jumpSpeed;
        // Mark the player as not grounded.
        isGrounded = false;
    }
}

// Function to start the autoplay demo.
function startAutoplay() {
    // Keep the start screen visible by leaving the started flag false.
    gameStarted = false;
    // Ensure the game is not paused so the AI can run.
    gamePaused = false;
    // Keep autoplay mode enabled for the demo.
    autoplay = true;
    // Reset enemy shot timers.
    if (typeof resetEnemyShotTimers === 'function') {
        // Call the helper function when available.
        resetEnemyShotTimers();
    }
}

// Start the autoplay demo when the script loads.
startAutoplay();
