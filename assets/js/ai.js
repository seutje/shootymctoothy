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

// Function to find the closest visible health pack.
function findVisibleHealthPack() {
    // Initialize the closest pack variable.
    let closest = null;
    // Set the minimum distance to a large value.
    let minDist = Infinity;
    // Iterate over each health pack.
    healthPacks.forEach(pack => {
        // Check if the pack is visible to the player.
        if (hasLineOfSight(yawObject.position, pack.position)) {
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

// Function to update the autoplay AI each frame.
function updateAutoplayAI(currentTime) {
    // Look for a health pack when health is below one hundred.
    const pack = health < 100 ? findVisibleHealthPack() : null;
    // Check if a pack was found.
    if (pack) {
        // Calculate the difference on the x axis.
        const dx = pack.position.x - yawObject.position.x;
        // Calculate the difference on the z axis.
        const dz = pack.position.z - yawObject.position.z;
        // Decide whether horizontal or depth movement is greater.
        if (Math.abs(dx) > Math.abs(dz)) {
            // Move right if the pack is to the right.
            currentAIDirection = dx > 0 ? 'd' : 'a';
        } else {
            // Move forward if the pack is ahead.
            currentAIDirection = dz > 0 ? 's' : 'w';
        }
        // Update the time before another direction change.
        aiDirectionChangeTime = currentTime + 500;
    } else if (currentTime > aiDirectionChangeTime) {
        // Possible movement choices for the AI that avoid standing still.
        const dirs = ['w', 'a', 's', 'd'];
        // Select a random direction from the choices.
        currentAIDirection = dirs[Math.floor(Math.random() * dirs.length)];
        // Schedule the next direction change after one second.
        aiDirectionChangeTime = currentTime + 1000;
    }
    // Reset the movement keys before applying the AI direction.
    keys['w'] = false;
    keys['a'] = false;
    keys['s'] = false;
    keys['d'] = false;
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
        // Check if the enemy is visible without obstacles.
        if (hasLineOfSight(yawObject.position, enemy.position)) {
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
        // Smoothly rotate the player toward the desired yaw.
        yawObject.rotation.y += (desiredYaw - yawObject.rotation.y) * rotationSmoothing;
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
            // Check if the player can see the predicted position without obstacles.
            if (hasLineOfSight(yawObject.position, predicted)) {
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
    enemies.forEach(enemy => {
        // Set the last shot time for the enemy to the current time.
        enemy.lastShotTime = Date.now();
    });
}

// Start the autoplay demo when the script loads.
startAutoplay();
