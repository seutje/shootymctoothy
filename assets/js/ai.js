// Variable to indicate autoplay mode is active.
let autoplay = true;
// Track when the AI should change direction.
let aiDirectionChangeTime = 0;
// Track when the AI should fire the next shot.
let aiShootTime = 0;
// Store the current AI movement direction.
let currentAIDirection = null;

// Function to update the autoplay AI each frame.
function updateAutoplayAI(currentTime) {
    // Change the movement direction periodically.
    if (currentTime > aiDirectionChangeTime) {
        // Possible movement choices for the AI.
        const dirs = ['w', 'a', 's', 'd', null];
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
        // Subtract the player position from the target position.
        dir.subVectors(target.position, yawObject.position);
        // Rotate the player to face the target.
        yawObject.rotation.y = Math.atan2(-dir.x, -dir.z);
        // Fire a shot periodically when there is a clear path.
        if (currentTime > aiShootTime) {
            // Check if the player can see the target without obstacles.
            if (hasLineOfSight(yawObject.position, target.position)) {
                // Create a projectile towards the target.
                createProjectile();
            }
            // Schedule the next shot after half a second.
            aiShootTime = currentTime + 500;
        }
    }
    // Randomly jump if on the ground.
    if (Math.random() < 0.01 && isGrounded) {
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

