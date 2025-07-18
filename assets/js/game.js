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
// Attach the audio listener to the camera.
attachAudioListener(camera);
// Create a new WebGL renderer.
const renderer = new THREE.WebGLRenderer();
// Set the size of the renderer to the window size.
renderer.setSize(window.innerWidth, window.innerHeight);
// Enable shadows in the renderer.
renderer.shadowMap.enabled = true;
// Append the renderer to the document body.
document.body.appendChild(renderer.domElement);

// Create a white ambient light with an intensity of 0.6.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
// Add the ambient light to the scene.
scene.add(ambientLight);

// Create a dimmer point light that represents the sun and give it a long range.
const sunLight = new THREE.PointLight(0xffffff, 1, 1000);
// Position the sun light.
sunLight.position.set(110, 125, -500);
// Allow the sun light to cast shadows.
sunLight.castShadow = true;
// Add the sun light to the scene.
scene.add(sunLight);

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
// Allow the ground to receive shadows.
ground.receiveShadow = true;
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
        const halfSize = 2.5; // Define half size of the obstacle for bounds checking.
        // Calculate the absolute x distance from the obstacle center.
        const dx = Math.abs(position.x - obstacle.position.x);
        // Calculate the absolute z distance from the obstacle center.
        const dz = Math.abs(position.z - obstacle.position.z);
        // Check for horizontal overlap before checking vertical position.
        if (dx < halfSize + radius && dz < halfSize + radius) {
            // Calculate the bottom of the player sphere.
            const playerBottom = position.y - radius;
            // Calculate the top of the obstacle cube.
            const obstacleTop = obstacle.position.y + halfSize;
            // Allow overlap when the player is above the obstacle.
            if (playerBottom >= obstacleTop) {
                // Skip this obstacle because the player is standing on top.
                continue;
            }
            // Calculate the bottom of the obstacle cube.
            const obstacleBottom = obstacle.position.y - halfSize;
            // Check if the player is inside the vertical bounds.
            if (playerBottom < obstacleTop && position.y + radius > obstacleBottom) {
                // Return true because a collision occurs.
                return true;
            }
        }
    }
    // Return false if no collisions were detected.
    return false;
}

// Function to get the ground height at a specific x and z position.
function getGroundHeight(x, z) {
    // Start with the base ground height of zero.
    let height = 0;
    // Loop over each obstacle in the array.
    for (let i = 0; i < obstacles.length; i++) {
        // Get the current obstacle from the array.
        const obstacle = obstacles[i];
        // Define half the obstacle size for bounds checking.
        const halfSize = 2.5;
        // Calculate the absolute x distance to the obstacle center.
        const dx = Math.abs(x - obstacle.position.x);
        // Calculate the absolute z distance to the obstacle center.
        const dz = Math.abs(z - obstacle.position.z);
        // Check if the position is within the obstacle bounds.
        if (dx < halfSize && dz < halfSize) {
            // Determine the top height of this obstacle.
            const top = obstacle.position.y + halfSize;
            // Keep the highest obstacle top found so far.
            if (top > height) {
                // Store the top height for later comparison.
                height = top;
            }
        }
    }
    // Return the highest obstacle top or zero if none.
    return height;
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

// Function to set the active weapon.
function setWeapon(index) {
    // Assign the index to the current weapon variable.
    currentWeapon = index;
    // Check if the pistol is selected.
    if (currentWeapon === 0) {
        // Use the pistol fire rate for the shot interval.
        playerShotInterval = gunShotInterval;
    } else if (currentWeapon === 1) {
        // Use the rocket fire rate when the rocket launcher is selected.
        playerShotInterval = rocketShotInterval;
    } else {
        // Use the lightning fire rate when the lightning gun is selected.
        playerShotInterval = lightningShotInterval;
    }
    // Set the visibility of the pistol model.
    gunGroup.visible = currentWeapon === 0;
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
        // Create a projectile immediately.
        createProjectile();
        // Record the time of this shot using the high-resolution timer.
        lastPlayerShotTime = performance.now();
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
        const hits = raycaster.intersectObjects(enemies, false);
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
    // Create a material for the enemy using the loaded texture that reacts to light.
    const enemyMaterial = new THREE.MeshLambertMaterial({ map: enemyTexture });
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
    // Allow the enemy to cast shadows.
    enemy.castShadow = true;
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

    // Update the AI controller when autoplay is active and the tab is visible.
    if (autoplay && tabVisible) {
        // Call the AI update function with the current time.
        updateAutoplayAI(currentTime);
    }

    // Increase the number of enemies gradually over time.
    updateEnemySpawn();

    // Fire repeatedly when the mouse is held down.
    if (isMouseDown && currentTime - lastPlayerShotTime >= playerShotInterval) {
        // Create another projectile.
        createProjectile();
        // Update the time of the last shot.
        lastPlayerShotTime = currentTime;
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

    // Get the surface height directly below the player.
    const surfaceY = getGroundHeight(yawObject.position.x, yawObject.position.z);
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
            // Explode when the rocket touches the ground.
            if (projectile.position.y <= 0) {
                // Mark the rocket for explosion.
                explode = true;
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
