
// Create a new Three.js scene.
const scene = new THREE.Scene();
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

// Set the initial camera position.
camera.position.z = 5;
// Set the initial camera y position.
camera.position.y = 2;

// Create an array to store enemy objects.
const enemies = [];
// Create an array to store projectile objects.
const projectiles = [];

// Define the player's movement speed.
const moveSpeed = 0.1;
// Define the player's mouse sensitivity.
const mouseSpeed = 0.002;

// Create a new vector to store the player's velocity.
const velocity = new THREE.Vector3();
// Create a new vector to store the player's direction.
const direction = new THREE.Vector3();

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
    keys[event.key] = true;
}

// The function to handle keyup events.
function onKeyUp(event) {
    // Set the key state to false.
    keys[event.key] = false;
}

// The function to handle mouse movement.
function onMouseMove(event) {
    // Check if the pointer is locked.
    if (document.pointerLockElement === document.body) {
        // Rotate the camera based on mouse movement.
        camera.rotation.y -= event.movementX * mouseSpeed;
        // Rotate the camera based on mouse movement.
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
    // Set the projectile's initial position to the camera's position.
    projectile.position.copy(camera.position);
    // Get the camera's direction.
    const projectileDirection = new THREE.Vector3();
    // Get the camera's direction.
    camera.getWorldDirection(projectileDirection);
    // Set the projectile's velocity.
    projectile.velocity = projectileDirection.multiplyScalar(1);
    // Add the projectile to the scene.
    scene.add(projectile);
    // Add the projectile to the projectiles array.
    projectiles.push(projectile);
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
    requestAnimationFrame(animate);

    // Reset the player's velocity.
    velocity.x = 0;
    // Reset the player's velocity.
    velocity.z = 0;

    // Get the player's forward direction.
    direction.z = Number(keys['w'] || keys['W']) - Number(keys['s'] || keys['S']);
    // Get the player's sideways direction.
    direction.x = Number(keys['a'] || keys['A']) - Number(keys['d'] || keys['D']);
    // Normalize the direction vector.
    direction.normalize();

    // Check if the player is moving forward or backward.
    if (keys['w'] || keys['s']) {
        // Set the player's velocity based on the direction and move speed.
        velocity.z = direction.z * moveSpeed;
    }
    // Check if the player is moving left or right.
    if (keys['a'] || keys['d']) {
        // Set the player's velocity based on the direction and move speed.
        velocity.x = direction.x * moveSpeed;
    }

    // Move the player forward/backward based on the camera's direction.
    camera.position.z += Math.cos(camera.rotation.y) * velocity.z;
    // Move the player sideways based on the camera's direction.
    camera.position.x += Math.sin(camera.rotation.y) * velocity.z;
    // Move the player sideways based on the camera's direction.
    camera.position.z -= Math.sin(camera.rotation.y) * velocity.x;
    // Move the player forward/backward based on the camera's direction.
    camera.position.x += Math.cos(camera.rotation.y) * velocity.x;


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
                // Remove the enemy from the scene.
                scene.remove(enemy);
                // Remove the enemy from the array.
                enemies.splice(j, 1);
                // Break the inner loop since the projectile is gone.
                break;
            }
        }
    }

    // Render the scene from the camera's perspective.
    renderer.render(scene, camera);
}

// Start the animation loop.
animate();
