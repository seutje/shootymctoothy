// Create a new Three.js scene.
const scene = new THREE.Scene();
// Set the background color of the scene to blue.
scene.background = new THREE.Color(0x87ceeb);

// Create a new perspective camera.
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Create a new WebGL renderer.
const renderer = new THREE.WebGLRenderer();
// Set the size of the renderer to the window size.
renderer.setSize(window.innerWidth, window.innerHeight);
// Append the renderer to the document body.
document.body.appendChild(renderer.domElement);

// Create a blue ambient light with an intensity of 0.5.
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
// Add the ambient light to the scene.
scene.add(ambientLight);

// Create a white directional light with an intensity of 0.5.
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
// Set the position of the directional light.
directionalLight.position.set(1, 1, 1);
// Add the directional light to the scene.
scene.add(directionalLight);

// Create a large green plane for the ground.
const groundGeometry = new THREE.PlaneGeometry(500, 500);
// Create a green material for the ground.
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
// Create a mesh from the ground geometry and material.
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// Rotate the ground to be horizontal.
ground.rotation.x = -Math.PI / 2;
// Add the ground to the scene.
scene.add(ground);

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

// Create an array to store enemy objects.
const enemies = [];
// Create an array to store projectile objects.
const projectiles = [];
// Create an array to store enemy projectile objects.
const enemyProjectiles = [];

// Initialize the score.
let score = 0;
// Get the score element.
const scoreElement = document.getElementById('score');

// Initialize player health.
let health = 100;
// Get the health element.
const healthElement = document.getElementById('health');

// Variable to track if the game is paused.
let gamePaused = false;
// Variable to store the animation frame ID.
let animationFrameId;

// Define the player's movement speed.
const moveSpeed = 0.1;
// Define the player's mouse sensitivity.
const mouseSpeed = 0.002;

// Create a new vector to store the player's velocity.
const velocity = new THREE.Vector3();

// Add an event listener for mouse movement to control the camera.
document.addEventListener('mousemove', onMouseMove, false);
// Add an event listener for mouse clicks to fire projectiles.
document.addEventListener('mousedown', onMouseDown, false);
// Add an event listener for keydown events to control player movement.
document.addEventListener('keydown', onKeyDown, false);
// Add an event listener for keyup events to control player movement.
document.addEventListener('keyup', onKeyUp, false);
// Add an event listener for window resize events.
window.addEventListener('resize', onWindowResize, false);

// A map to store the state of the keys.
const keys = {};

// The function to handle keydown events.
function onKeyDown(event) {
    // Set the key state to true.
    keys[event.key.toLowerCase()] = true;
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
    }
}

// The function to handle mouse down events.
function onMouseDown(event) {
    // Lock the pointer to the document body.
    document.body.requestPointerLock();
    // Check if the left mouse button was clicked.
    if (event.button === 0) {
        // Create a projectile.
        createProjectile();
    }
}

// The function to handle window resize events.
function onWindowResize() {
    // Update the camera's aspect ratio.
    camera.aspect = window.innerWidth / window.innerHeight;
    // Update the camera's projection matrix.
    camera.updateProjectionMatrix();
    // Set the size of the renderer to the new window size.
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// The function to create a projectile.
function createProjectile() {
    // Create a small box geometry for the projectile.
    const projectileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    // Create a yellow material for the projectile.
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    // Create a mesh from the projectile geometry and material.
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    // Set the projectile's initial position to the camera's world position.
    camera.getWorldPosition(projectile.position);
    // Get the camera's direction.
    const projectileDirection = new THREE.Vector3();
    // Get the camera's world direction.
    camera.getWorldDirection(projectileDirection);
    // Set the projectile's velocity.
    projectile.velocity = projectileDirection.multiplyScalar(1);
    // Add the projectile to the scene.
    scene.add(projectile);
    // Add the projectile to the projectiles array.
    projectiles.push(projectile);
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
}

// The function to create an enemy.
function createEnemy() {
    // Create a box geometry for the enemy.
    const enemyGeometry = new THREE.BoxGeometry(2, 2, 2);
    // Create a red material for the enemy.
    const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // Create a mesh from the enemy geometry and material.
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    // Set the enemy's x position to a random value.
    enemy.position.x = (Math.random() - 0.5) * 50;
    // Set the enemy's z position to a random value.
    enemy.position.z = (Math.random() - 0.5) * 50;
    // Set the enemy's y position.
    enemy.position.y = 1;
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

// Create 10 enemies.
for (let i = 0; i < 10; i++) {
    // Create an enemy.
    createEnemy();
}

// The main animation loop.
function animate() {
    // Request the next animation frame.
    animationFrameId = requestAnimationFrame(animate);

    // If the game is paused, do not update game logic.
    if (gamePaused) {
        return;
    }

    // Stop any previous movement.
    velocity.set(0, 0, 0);

    // Get the player's forward/backward movement.
    if (keys['w'] || keys['z']) {
        // Move forward.
        velocity.z -= 1;
    }
    // Get the player's forward/backward movement.
    if (keys['s']) {
        // Move backward.
        velocity.z += 1;
    }
    // Get the player's sideways movement.
    if (keys['a'] || keys['q']) {
        // Move left.
        velocity.x -= 1;
    }
    // Get the player's sideways movement.
    if (keys['d']) {
        // Move right.
        velocity.x += 1;
    }

    // Normalize the velocity vector to ensure consistent speed.
    if (velocity.length() > 0) {
        // Normalize the velocity.
        velocity.normalize();
        // Apply the movement speed.
        velocity.multiplyScalar(moveSpeed);
    }

    // Apply the velocity to the yaw object.
    yawObject.translateX(velocity.x);
    // Apply the velocity to the yaw object.
    yawObject.translateZ(velocity.z);

    // Update the position of each projectile.
    for (let i = projectiles.length - 1; i >= 0; i--) {
        // Get the current projectile.
        const projectile = projectiles[i];
        // Update the projectile's position based on its velocity.
        projectile.position.add(projectile.velocity);

        // Check for collisions with enemies.
        for (let j = enemies.length - 1; j >= 0; j--) {
            // Get the current enemy.
            const enemy = enemies[j];
            // Check if the projectile is close to the enemy.
            if (projectile.position.distanceTo(enemy.position) < 1.5) {
                // Remove the projectile from the scene.
                scene.remove(projectile);
                // Remove the projectile from the array.
                projectiles.splice(i, 1);
                // Respawn the enemy.
                enemy.position.x = (Math.random() - 0.5) * 50;
                // Respawn the enemy.
                enemy.position.z = (Math.random() - 0.5) * 50;
                // Increment the score.
                score += 10;
                // Update the score display.
                scoreElement.textContent = 'Score: ' + score;
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

        // Check for collision with the player.
        if (projectile.position.distanceTo(yawObject.position) < 1) {
            // Remove the projectile from the scene.
            scene.remove(projectile);
            // Remove the projectile from the array.
            enemyProjectiles.splice(i, 1);
            // Decrease player health.
            health -= 10;
            // Update health display.
            healthElement.textContent = 'Health: ' + health;
            // Check if player is dead.
            if (health <= 0) {
                // Get the game over screen element.
                const gameOverScreen = document.getElementById('gameOverScreen');
                // Get the final score element.
                const finalScoreElement = document.getElementById('finalScore');
                // Get the restart button element.
                const restartButton = document.getElementById('restartButton');

                // Display the game over screen.
                gameOverScreen.style.display = 'block';
                // Update the final score display.
                finalScoreElement.textContent = 'Final Score: ' + score;

                // Stop the animation loop.
                gamePaused = true;
                // Release the mouse pointer.
                document.exitPointerLock();

                // Add event listener for restart button.
                restartButton.addEventListener('click', () => {
                    // Reload the page to restart the game.
                    location.reload();
                });
            }
        }
    }

    // Update the position of each enemy.
    for (let i = 0; i < enemies.length; i++) {
        // Get the current enemy.
        const enemy1 = enemies[i];
        // Update the enemy's position based on its velocity.
        enemy1.position.add(enemy1.velocity);

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
        if (Date.now() - enemy1.lastShotTime > enemy1.shotInterval) {
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
}

// Start the animation loop.
animate();