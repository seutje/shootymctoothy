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

// Create an array to store obstacle objects.
const obstacles = [];
// Function to create an obstacle at a given position.
function createObstacle(x, z) {
    // Create a box geometry for the obstacle.
    const obstacleGeometry = new THREE.BoxGeometry(5, 5, 5);
    // Create a gray material for the obstacle.
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    // Create a mesh from the obstacle geometry and material.
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    // Set the obstacle position.
    obstacle.position.set(x, 2.5, z);
    // Add the obstacle to the scene.
    scene.add(obstacle);
    // Add the obstacle to the obstacles array.
    obstacles.push(obstacle);
}
// Create several obstacles at fixed positions.
createObstacle(10, 10);
createObstacle(-10, -10);
createObstacle(15, -15);
createObstacle(-15, 15);
createObstacle(10, 0);

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

// Create an array to store enemy objects.
const enemies = [];
// Create an array to store projectile objects.
const projectiles = [];
// Create an array to store enemy projectile objects.
const enemyProjectiles = [];

// Array to store high scores.
let highScores = [];
// Maximum number of high scores to keep.
const MAX_HIGH_SCORES = 5;
// Default player name for high scores.
const DEFAULT_PLAYER_NAME = "ShootyMcToothy";

// Function to load high scores from local storage.
function loadHighScores() {
    // Get high scores from local storage.
    const storedScores = localStorage.getItem('highScores');
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
    localStorage.setItem('highScores', JSON.stringify(highScores));
}

// Function to display high scores.
function displayHighScores() {
    // Get the high scores list element.
    const highScoresList = document.getElementById('highScoresList');
    // Clear the current list.
    highScoresList.innerHTML = '';
    // Iterate over high scores and create list items.
    highScores.forEach(scoreEntry => {
        // Create a new list item.
        const listItem = document.createElement('li');
        // Set the text content of the list item.
        listItem.textContent = `${scoreEntry.name}: ${scoreEntry.score}`;
        // Append the list item to the list.
        highScoresList.appendChild(listItem);
    });
}

// Initialize the score.
let score = 0;
// Get the score element.
const scoreElement = document.getElementById('score');

// Initialize player health.
let health = 100;
// Get the health element.
const healthElement = document.getElementById('health');
// Get the FPS counter element.
const fpsCounter = document.getElementById('fpsCounter');

// Variables for FPS calculation.
let lastFrameTime = 0;
let frameCount = 0;
let fps = 0;

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

// Create a new AudioContext for the soundtrack.
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
// Create a noise buffer for the hi-hats.
const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
// Get the data array from the noise buffer.
const noiseData = noiseBuffer.getChannelData(0);
// Fill the noise buffer with random values.
for (let i = 0; i < audioContext.sampleRate; i++) {
    // Generate a random value between -1 and 1.
    noiseData[i] = Math.random() * 2 - 1;
}
// Create a convolver node for reverb effects.
const reverbNode = audioContext.createConvolver();
// Create a buffer for the reverb impulse response.
const reverbBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
// Get the data array for the reverb buffer.
const reverbData = reverbBuffer.getChannelData(0);
// Fill the reverb buffer with decaying noise for a simple impulse response.
for (let i = 0; i < reverbData.length; i++) {
    // Generate noise scaled by the remaining length.
    reverbData[i] = (Math.random() * 2 - 1) * (1 - i / reverbData.length);
}
// Assign the generated buffer to the convolver node.
reverbNode.buffer = reverbBuffer;
// Variable to store the interval ID for the soundtrack loop.
let soundtrackInterval;

// The function to play a single note.
function playNote(frequency, duration) {
    // Create an oscillator node.
    const oscillator = audioContext.createOscillator();
    // Create a gain node for volume control.
    const gainNode = audioContext.createGain();
    // Set the frequency of the oscillator.
    oscillator.frequency.value = frequency;
    // Set the gain value of the note.
    gainNode.gain.value = 0.1;
    // Connect the oscillator to the gain node.
    oscillator.connect(gainNode);
    // Connect the gain node to the destination.
    gainNode.connect(audioContext.destination);
    // Start the oscillator.
    oscillator.start();
    // Stop the oscillator after the given duration.
    oscillator.stop(audioContext.currentTime + duration);
}

// The function to play a kick drum.
function playKick() {
    // Create an oscillator for the kick.
    const oscillator = audioContext.createOscillator();
    // Create a gain node to shape the volume envelope.
    const gainNode = audioContext.createGain();
    // Set the oscillator type to sine for a smooth kick.
    oscillator.type = 'sine';
    // Connect the oscillator to the gain node.
    oscillator.connect(gainNode);
    // Connect the gain node to the destination.
    gainNode.connect(audioContext.destination);
    // Set the initial frequency of the kick.
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    // Ramp the frequency down for the thump effect.
    oscillator.frequency.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    // Set the initial gain value.
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    // Fade out the gain quickly.
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    // Start the oscillator.
    oscillator.start();
    // Stop the oscillator after half a second.
    oscillator.stop(audioContext.currentTime + 0.5);
}

// The function to play a hi-hat sound.
function playHiHat() {
    // Create a buffer source for the noise.
    const noiseSource = audioContext.createBufferSource();
    // Reuse the global noise buffer for the hi-hat.
    noiseSource.buffer = noiseBuffer;
    // Create a high-pass filter to shape the noise.
    const filter = audioContext.createBiquadFilter();
    // Set the filter type to highpass.
    filter.type = 'highpass';
    // Set the cutoff frequency of the filter.
    filter.frequency.value = 5000;
    // Create a gain node for the volume envelope.
    const gainNode = audioContext.createGain();
    // Set the initial gain value.
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    // Fade out the gain quickly for a short tick.
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    // Connect the noise source to the filter.
    noiseSource.connect(filter);
    // Connect the filter to the gain node.
    filter.connect(gainNode);
    // Connect the gain node to the destination.
    gainNode.connect(audioContext.destination);
    // Start the noise source.
    noiseSource.start();
    // Stop the noise source after a short time.
    noiseSource.stop(audioContext.currentTime + 0.05);
}

// The function to play the shooting sound effect.
function playShootSound() {
    // Create a buffer source using the shared noise buffer.
    const noiseSource = audioContext.createBufferSource();
    // Reuse the global noise buffer for the shot.
    noiseSource.buffer = noiseBuffer;
    // Create a bandpass filter to shape the noise.
    const filter = audioContext.createBiquadFilter();
    // Set the filter type to bandpass.
    filter.type = 'bandpass';
    // Center the bandpass filter around 800 Hz.
    filter.frequency.value = 800;
    // Create a gain node to form the volume envelope.
    const gainNode = audioContext.createGain();
    // Set the initial gain value to start louder than the hi-hat.
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    // Fade the gain out over a longer period than the hi-hat.
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    // Connect the noise source to the filter.
    noiseSource.connect(filter);
    // Connect the filter to the gain node.
    filter.connect(gainNode);
    // Connect the gain node to the reverb effect.
    gainNode.connect(reverbNode);
    // Connect the reverb node to the destination.
    reverbNode.connect(audioContext.destination);
    // Start the noise source immediately.
    noiseSource.start();
    // Stop the noise source after 0.3 seconds.
    noiseSource.stop(audioContext.currentTime + 0.3);
}

// The function to start the soundtrack.
function startSoundtrack() {
    // Resume the audio context if it is suspended.
    if (audioContext.state === 'suspended') {
        // Resume the audio context.
        audioContext.resume();
    }
    // Frequencies for a 64-note E1M1-inspired riff with variation.
    const riff = [
        // Measure 1.
        329.63, 392.0, 415.3, 392.0,
        // Measure 2.
        329.63, 392.0, 392.0, 415.3,
        // Measure 3.
        329.63, 392.0, 415.3, 392.0,
        // Measure 4.
        246.94, 293.66, 311.13, 293.66,
        // Measure 5.
        261.63, 311.13, 329.63, 311.13,
        // Measure 6.
        261.63, 311.13, 329.63, 261.63,
        // Measure 7.
        261.63, 311.13, 329.63, 311.13,
        // Measure 8.
        196.0, 233.08, 246.94, 233.08,
        // Measure 9.
        220.0, 261.63, 277.18, 261.63,
        // Measure 10.
        220.0, 261.63, 277.18, 220.0,
        // Measure 11.
        220.0, 261.63, 277.18, 261.63,
        // Measure 12.
        174.61, 196.0, 207.65, 196.0,
        // Measure 13.
        174.61, 220.0, 246.94, 220.0,
        // Measure 14.
        174.61, 220.0, 246.94, 174.61,
        // Measure 15.
        174.61, 220.0, 246.94, 220.0,
        // Measure 16.
        196.0, 246.94, 261.63, 246.94
    ];
    // Set the current note index.
    let index = 0;
    // Clear any existing interval.
    clearInterval(soundtrackInterval);
    // Start a new interval to play the riff.
    soundtrackInterval = setInterval(() => {
        // Play the current note.
        playNote(riff[index], 0.25);
        // Play a kick on the first beat of each measure.
        if (index % 4 === 0) {
            // Call the kick drum function.
            playKick();
        }
        // Play a hi-hat on every beat.
        playHiHat();
        // Advance to the next note.
        index = (index + 1) % riff.length;
    }, 250);
}

// The function to stop the soundtrack.
function stopSoundtrack() {
    // Clear the interval to stop the riff.
    clearInterval(soundtrackInterval);
}

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
    // Do nothing if the game is paused.
    if (gamePaused) {
        // Exit early to allow UI clicks.
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
    // Play the shooting sound effect.
    playShootSound();
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
function animate(currentTime) {
    // Request the next animation frame.
    animationFrameId = requestAnimationFrame(animate);

    // Calculate FPS.
    frameCount++;
    // Check if one second has passed.
    if (currentTime > lastFrameTime + 1000) {
        // Calculate FPS.
        fps = Math.round(frameCount * 1000 / (currentTime - lastFrameTime));
        // Update FPS counter.
        fpsCounter.textContent = 'FPS: ' + fps;
        // Reset last frame time.
        lastFrameTime = currentTime;
        // Reset frame count.
        frameCount = 0;
    }

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

    // Create a copy of the player's position for collision testing.
    const potentialPosition = yawObject.position.clone();
    // Create a vector for movement in local space.
    const moveVector = new THREE.Vector3(velocity.x, 0, velocity.z);
    // Rotate the movement vector by the player's yaw rotation.
    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawObject.rotation.y);
    // Add the movement vector to the potential position.
    potentialPosition.add(moveVector);
    // Check for collisions with obstacles before moving.
    if (!collidesWithObstacles(potentialPosition, 1)) {
        // Update the player's position if no collision occurs.
        yawObject.position.copy(potentialPosition);
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
        // Remove the projectile if it hits an obstacle.
        if (collidesWithObstacles(projectile.position, 0.5)) {
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
                // Display high scores.
                displayHighScores();

                // Stop the animation loop.
                gamePaused = true;
                // Stop the soundtrack when the game ends.
                stopSoundtrack();
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
}

// Start the animation loop.
animate();

// Load high scores when the script starts.
loadHighScores();

// Get the start screen element.
const startScreen = document.getElementById('startScreen');
// Get the start button element.
const startButton = document.getElementById('startButton');

// Initially pause the game.
gamePaused = true;

// Add event listener for the start button.
startButton.addEventListener('click', () => {
    // Hide the start screen.
    startScreen.style.display = 'none';
    // Unpause the game.
    gamePaused = false;
    // Start the soundtrack.
    startSoundtrack();
    // Request pointer lock.
    document.body.requestPointerLock();

    // Reset enemy shot timers.
    enemies.forEach(enemy => {
        // Set the last shot time for the enemy to the current time.
        enemy.lastShotTime = Date.now();
    });
});
