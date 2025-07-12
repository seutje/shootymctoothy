// Create a new Three.js scene.
const scene = new THREE.Scene();
// Set a blue color as the fallback background.
scene.background = new THREE.Color(0x87ceeb);
// Create a texture loader for loading textures.
const textureLoader = new THREE.TextureLoader();
// Load the equirectangular sky texture.
const skyTexture = textureLoader.load('assets/images/texture-sky.png');
// Set the texture mapping mode for reflections.
skyTexture.mapping = THREE.EquirectangularReflectionMapping;
// Use the texture as the background of the scene.
scene.background = skyTexture;
// Use the same texture for environment reflections.
scene.environment = skyTexture;

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

// Create a plane geometry for the ground.
const groundGeometry = new THREE.PlaneGeometry(500, 500);
// Create a texture object to hold the ground image.
const groundTexture = new THREE.Texture();
// Create an image element for the ground texture.
const groundImage = new Image();
// Update the texture settings once the image loads.
groundImage.onload = function () {
    // Assign the loaded image to the texture.
    groundTexture.image = groundImage;
    // Inform Three.js that the texture needs an update.
    groundTexture.needsUpdate = true;
    // Set the texture to repeat horizontally.
    groundTexture.wrapS = THREE.RepeatWrapping;
    // Set the texture to repeat vertically.
    groundTexture.wrapT = THREE.RepeatWrapping;
    // Set how many times the texture repeats.
    groundTexture.repeat.set(50, 50);
};
// Start loading the ground texture from the assets folder.
groundImage.src = 'assets/images/texture-ground.png';
// Create a material for the ground using the texture.
const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
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

// Store the world width for obstacle placement calculations.
const worldWidth = 500;
// Store the world depth for obstacle placement calculations.
const worldDepth = 500;
// Define the size of each obstacle for coverage checks.
const obstacleSize = 5;
// Define the maximum fraction of the world that obstacles may occupy.
const maxObstacleCoverage = 0.4;
// Set the initial number of obstacles to spawn.
const initialObstacleCount = 100;

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
    // Create a material for the obstacle using the loaded texture.
    const obstacleMaterial = new THREE.MeshBasicMaterial({ map: obstacleTexture });
    // Create a mesh from the obstacle geometry and material.
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    // Set the obstacle position.
    obstacle.position.set(x, 2.5, z);
    // Add the obstacle to the scene.
    scene.add(obstacle);
    // Add the obstacle to the obstacles array.
    obstacles.push(obstacle);
}
// Function to spawn multiple obstacles at random positions.
function spawnRandomObstacles(desiredCount) {
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
spawnRandomObstacles(initialObstacleCount);

// Function to check if a position collides with obstacles.
function collidesWithObstacles(position, radius) {
    // Iterate over every obstacle.
    for (let i = 0; i < obstacles.length; i++) {
        // Get the current obstacle.
        const obstacle = obstacles[i];
        // Define half size of the obstacle for bounds checking.
        const halfSize = 2.5;
        // Check for overlap on the x and z axes.
        if (Math.abs(position.x - obstacle.position.x) < halfSize + radius &&
            Math.abs(position.z - obstacle.position.z) < halfSize + radius) {
            // Return true if there is a collision.
            return true;
        }
    }
    // Return false if no collisions were detected.
    return false;
}

// Function to check if there is a clear path between two points.
function hasLineOfSight(start, end) {
    // Create a vector from start to end.
    const direction = new THREE.Vector3();
    // Subtract the start position from the end position.
    direction.subVectors(end, start);
    // Store the distance between the two points.
    const distance = direction.length();
    // Normalize the direction for ray casting.
    direction.normalize();
    // Create a raycaster from the start toward the end point.
    const raycaster = new THREE.Raycaster(start.clone(), direction, 0, distance);
    // Collect intersections with all obstacle meshes.
    const intersections = raycaster.intersectObjects(obstacles, false);
    // Check if the ray hit any obstacle before reaching the end.
    if (intersections.length > 0) {
        // Return false if an obstacle blocks the line of sight.
        return false;
    }
    // Return true when no obstacles are in the path.
    return true;
}

// Create an array to store enemy objects.
const enemies = [];
// Create an array to store projectile objects.
const projectiles = [];
// Create an array to store enemy projectile objects.
const enemyProjectiles = [];

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
const healthPackPickupRadius = 1.5;
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
const groundFriction = 0.8;
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

// Function to toggle the paused state.
function togglePause() {
    // Invert the paused flag.
    gamePaused = !gamePaused;
    // Check if the game is now paused.
    if (gamePaused) {
        // Stop the soundtrack loop.
        stopSoundtrack();
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
    // Update the offscreen canvas width.
    uiCanvas.width = window.innerWidth;
    // Update the offscreen canvas height.
    uiCanvas.height = window.innerHeight;
    // Update the UI sprite scale for the new aspect ratio.
    updateUIScale();
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

// Function to create a health pack at a given position.
function createHealthPack(position) {
    // Create a sphere geometry for the health pack.
    const packGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    // Create a red material for the health pack.
    const packMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // Create a mesh from the geometry and material.
    const pack = new THREE.Mesh(packGeometry, packMaterial);
    // Store the base y position for bobbing.
    pack.baseY = position.y;
    // Copy the provided position to the mesh.
    pack.position.copy(position);
    // Save the spawn time for expiration checks.
    pack.spawnTime = Date.now();
    // Add the health pack mesh to the scene.
    scene.add(pack);
    // Add the health pack to the health packs array.
    healthPacks.push(pack);
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
        const position = new THREE.Vector3(x, 1, z);
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
    // Create a box geometry for the enemy.
    const enemyGeometry = new THREE.BoxGeometry(2, 2, 2);
    // Create a material for the enemy using the loaded texture.
    const enemyMaterial = new THREE.MeshBasicMaterial({ map: enemyTexture });
    // Create a mesh from the enemy geometry and material.
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    // Find a valid spawn position for the enemy.
    const spawn = findEnemySpawnPosition();
    // Set the enemy's x position.
    enemy.position.x = spawn.x;
    // Set the enemy's z position.
    enemy.position.z = spawn.z;
    // Set the enemy's y position.
    enemy.position.y = spawn.y;
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
    animationFrameId = requestAnimationFrame(animate);

    // Calculate FPS.
    frameCount++;
    // Check if one second has passed.
    if (currentTime > lastFrameTime + 1000) {
        // Calculate FPS.
        fps = Math.round(frameCount * 1000 / (currentTime - lastFrameTime));
        // Reset last frame time.
        lastFrameTime = currentTime;
        // Reset frame count.
        frameCount = 0;
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

    // Update the AI controller during autoplay mode.
    if (autoplay) {
        // Call the AI update function with the current time.
        updateAutoplayAI(currentTime);
    }

    // Increase the number of enemies gradually over time.
    updateEnemySpawn();

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

    // Apply gravity to the vertical velocity.
    verticalVelocity += gravity;
    // Add the vertical velocity to the player's y position.
    yawObject.position.y += verticalVelocity;
    // Check if the player has landed on the ground.
    if (yawObject.position.y <= groundLevel) {
        // Reset the player's y position to ground level.
        yawObject.position.y = groundLevel;
        // Reset the vertical velocity when on the ground.
        verticalVelocity = 0;
        // Mark the player as grounded.
        isGrounded = true;
    }

    // Update the position of each projectile.
    for (let i = projectiles.length - 1; i >= 0; i--) {
        // Get the current projectile.
        const projectile = projectiles[i];
        // Update the projectile's position based on its velocity.
        projectile.position.add(projectile.velocity);
        // Remove the projectile if it hits an obstacle.
        if (collidesWithObstacles(projectile.position, 0.5)) {
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the projectiles array.
            projectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }

        // Remove the projectile if it leaves the ground plane.
        if (Math.abs(projectile.position.x) > 250 || Math.abs(projectile.position.z) > 250) {
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the projectiles array.
            projectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }

        // Check for collisions with enemy projectiles.
        for (let k = enemyProjectiles.length - 1; k >= 0; k--) {
            // Get the current enemy projectile.
            const enemyProjectile = enemyProjectiles[k];
            // Check if the projectile is close to the enemy projectile.
            if (projectile.position.distanceTo(enemyProjectile.position) < 0.5) {
                // Remove the player projectile from the scene.
                scene.remove(projectile);
                // Remove the player projectile from the array.
                projectiles.splice(i, 1);
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
        // Remove the projectile if it hits an obstacle.
        if (collidesWithObstacles(projectile.position, 0.5)) {
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the enemy projectiles array.
            enemyProjectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }

        // Remove the enemy projectile if it leaves the ground plane.
        if (Math.abs(projectile.position.x) > 250 || Math.abs(projectile.position.z) > 250) {
            // Remove the projectile mesh from the scene.
            scene.remove(projectile);
            // Remove the projectile from the enemy projectiles array.
            enemyProjectiles.splice(i, 1);
            // Continue to the next projectile.
            continue;
        }

        // Check for collision with the player.
        if (projectile.position.distanceTo(yawObject.position) < 1) {
            // Remove the projectile from the scene.
            scene.remove(projectile);
            // Remove the projectile from the array.
            enemyProjectiles.splice(i, 1);
            // Decrease player health.
            health -= 10;
            // Play the damage sound effect only after player interaction.
            if (!autoplay) {
                // Call the function to play the damage sound.
                playDamageSound();
            }
            // Check if player is dead.
            if (health <= 0) {
                // Only record high scores when not in autoplay mode.
                if (!autoplay) {
                    // Determine if the current score qualifies for the high score list.
                    const qualifies = highScores.length < MAX_HIGH_SCORES || score > Math.min(...highScores.map(entry => entry.score));
                    // Check if the score qualifies for the top five.
                    if (qualifies) {
                        // Prompt the player for their name or use a default value.
                        const playerName = prompt('Enter your name:', DEFAULT_PLAYER_NAME) || DEFAULT_PLAYER_NAME;
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
                    // Release the mouse pointer.
                    document.exitPointerLock();
                }
            }
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
    // Remove all existing health packs from the scene.
    healthPacks.forEach(pack => {
        // Remove this health pack from the scene graph.
        scene.remove(pack);
    });
    // Clear the health packs array.
    healthPacks.length = 0;
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
    if (typeof keys !== 'undefined') {
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
    enemies.forEach(enemy => {
        // Set the last shot time for the enemy to the current time.
        enemy.lastShotTime = Date.now();
    });
}
