// Check if the current device supports touch input.
const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// Exit early if touch is not supported.
if (!touchSupported) { /* no-op for non-touch */ }
// Continue only when touch is supported.
else {
  // Mark that the touch UI is active so global handlers can ignore if needed.
  window.__touchUIActive = true;
  // Create a container for all touch controls.
  const controls = document.createElement('div');
  // Assign a class for layout and layering.
  controls.className = 'touch-controls';
  // Append the controls container to the document body.
  document.body.appendChild(controls);

  // Create the joystick base element.
  const joystick = document.createElement('div');
  // Assign the joystick base class.
  joystick.className = 'joystick';
  // Append the joystick base to the controls container.
  controls.appendChild(joystick);
  // Create the joystick knob element.
  const knob = document.createElement('div');
  // Assign the knob class for styling.
  knob.className = 'joystick-knob';
  // Append the knob into the joystick base.
  joystick.appendChild(knob);

  // Create the buttons column container.
  const buttons = document.createElement('div');
  // Assign the container class for button layout.
  buttons.className = 'touch-buttons';
  // Append the buttons container to the controls.
  controls.appendChild(buttons);

  // Create the fire button.
  const fireBtn = document.createElement('div');
  // Assign the button classes for size and style.
  fireBtn.className = 'btn btn-fire';
  // Set the button label.
  fireBtn.textContent = 'FIRE';
  // Append the fire button to the buttons container.
  buttons.appendChild(fireBtn);

  // Create the jump button.
  const jumpBtn = document.createElement('div');
  // Assign the button classes for size and style.
  jumpBtn.className = 'btn btn-jump';
  // Set the button label.
  jumpBtn.textContent = 'JUMP';
  // Append the jump button below the fire button.
  buttons.appendChild(jumpBtn);

  // Create the small buttons row container.
  const smallRow = document.createElement('div');
  // Assign the row class for horizontal layout.
  smallRow.className = 'btn-row';
  // Append the small buttons row to the buttons column.
  buttons.appendChild(smallRow);

  // Create the weapon cycle button.
  const weaponBtn = document.createElement('div');
  // Assign size and style for the small button.
  weaponBtn.className = 'btn btn-small';
  // Set the label for the weapon button.
  weaponBtn.textContent = 'WEAP';
  // Append the weapon button to the row.
  smallRow.appendChild(weaponBtn);

  // Create the pause button.
  const pauseBtn = document.createElement('div');
  // Assign size and style for the small button.
  pauseBtn.className = 'btn btn-small';
  // Set the label for the pause button.
  pauseBtn.textContent = 'PAUSE';
  // Append the pause button to the row.
  smallRow.appendChild(pauseBtn);

  // Create the look pad area for camera control.
  const lookPad = document.createElement('div');
  // Assign the class to style and position the look pad.
  lookPad.className = 'lookpad';
  // Append the look pad to the controls container.
  controls.appendChild(lookPad);

  // Store the active touch identifier for the joystick.
  let joyId = null;
  // Store the joystick base center x coordinate.
  let joyCx = 0;
  // Store the joystick base center y coordinate.
  let joyCy = 0;
  // Store the joystick base radius in pixels.
  let joyR = 0;

  // Store the active touch identifier for the look pad.
  let lookId = null;
  // Store the previous x coordinate for look pad movement.
  let lastLookX = 0;
  // Store the previous y coordinate for look pad movement.
  let lastLookY = 0;

  // Function to update WASD keys based on joystick delta.
  function updateKeysFromJoystick(dx, dy) {
    // Define a deadzone to avoid accidental input.
    const dead = 0.3;
    // Normalize the deltas to unit circle magnitude.
    const mag = Math.hypot(dx, dy) || 1;
    // Calculate the normalized x component.
    const nx = dx / mag;
    // Calculate the normalized y component (screen y grows down).
    const ny = dy / mag;
    // Decide forward based on negative y beyond the deadzone.
    keys['w'] = (-ny) > dead;
    // Decide backward based on positive y beyond the deadzone.
    keys['s'] = (ny) > dead;
    // Decide left based on negative x beyond the deadzone.
    keys['a'] = (-nx) > dead;
    // Decide right based on positive x beyond the deadzone.
    keys['d'] = (nx) > dead;
  }

  // Function to reset movement keys and knob position.
  function resetJoystick() {
    // Clear forward key.
    keys['w'] = false;
    // Clear backward key.
    keys['s'] = false;
    // Clear left key.
    keys['a'] = false;
    // Clear right key.
    keys['d'] = false;
    // Reset the knob to the center.
    knob.style.left = '50%';
    // Keep the knob centered horizontally.
    knob.style.top = '50%';
  }

  // Initialize the joystick knob position.
  resetJoystick();

  // Handle joystick touch start events.
  joystick.addEventListener('touchstart', (e) => {
    // Prevent default scrolling and gestures.
    e.preventDefault();
    // Stop propagation so the game-wide handler does not fire.
    e.stopPropagation();
    // Get the first changed touch in this event.
    const t = e.changedTouches[0];
    // Record the touch identifier as the active joystick touch.
    joyId = t.identifier;
    // Read the bounding box of the joystick base.
    const rect = joystick.getBoundingClientRect();
    // Calculate the center x of the joystick base.
    joyCx = rect.left + rect.width / 2;
    // Calculate the center y of the joystick base.
    joyCy = rect.top + rect.height / 2;
    // Calculate the joystick radius based on the base size.
    joyR = rect.width / 2;
  }, { passive: false });

  // Handle joystick touch move events.
  joystick.addEventListener('touchmove', (e) => {
    // Prevent default scrolling and gestures.
    e.preventDefault();
    // Stop propagation so global handlers do not rotate the camera.
    e.stopPropagation();
    // Find the touch point with the active joystick identifier.
    const t = Array.from(e.changedTouches).find(x => x.identifier === joyId);
    // Exit if the move is from a different touch.
    if (!t) return;
    // Calculate the raw delta x from the base center.
    const dx = t.clientX - joyCx;
    // Calculate the raw delta y from the base center.
    const dy = t.clientY - joyCy;
    // Compute the distance from the center.
    const dist = Math.hypot(dx, dy);
    // Limit the knob movement to the base radius.
    const limit = Math.min(dist, joyR);
    // Calculate the clamped x offset for the knob.
    const kx = (dist === 0 ? 0 : dx / dist) * limit;
    // Calculate the clamped y offset for the knob.
    const ky = (dist === 0 ? 0 : dy / dist) * limit;
    // Position the knob relative to the base center.
    knob.style.left = `${50 + (kx / joyR) * 50}%`;
    // Position the knob vertically relative to the base center.
    knob.style.top = `${50 + (ky / joyR) * 50}%`;
    // Update key states based on the unclamped deltas.
    updateKeysFromJoystick(dx, dy);
  }, { passive: false });

  // Handle joystick touch end events.
  joystick.addEventListener('touchend', (e) => {
    // Prevent default to suppress gestures.
    e.preventDefault();
    // Stop propagation to avoid global handling.
    e.stopPropagation();
    // Find whether our active touch ended.
    const ended = Array.from(e.changedTouches).some(x => x.identifier === joyId);
    // Reset only if the active joystick touch ended.
    if (ended) {
      // Clear the active identifier.
      joyId = null;
      // Reset keys and knob position.
      resetJoystick();
    }
  }, { passive: false });

  // Handle look pad touch start events to begin camera control.
  lookPad.addEventListener('touchstart', (e) => {
    // Prevent default to avoid gestures.
    e.preventDefault();
    // Stop propagation so the document handler does not fire.
    e.stopPropagation();
    // Start the game if not started yet.
    if (!gameStarted) { startGame(); }
    // Ignore input while paused or game over.
    if (gamePaused || gameOver) return;
    // Use the first changed touch as the active look touch.
    const t = e.changedTouches[0];
    // Record the identifier for subsequent move events.
    lookId = t.identifier;
    // Store the starting x coordinate for delta calculation.
    lastLookX = t.clientX;
    // Store the starting y coordinate for delta calculation.
    lastLookY = t.clientY;
  }, { passive: false });

  // Handle look pad touch move events to rotate the camera.
  lookPad.addEventListener('touchmove', (e) => {
    // Prevent default to suppress browser gestures.
    e.preventDefault();
    // Stop propagation so global handlers do not process this move.
    e.stopPropagation();
    // Find the touch with our active identifier.
    const t = Array.from(e.changedTouches).find(x => x.identifier === lookId);
    // Exit if the event is for a different touch.
    if (!t) return;
    // Compute movement delta along the x axis.
    const dx = t.clientX - lastLookX;
    // Compute movement delta along the y axis.
    const dy = t.clientY - lastLookY;
    // Update the last look coordinates.
    lastLookX = t.clientX;
    // Update the last look coordinates.
    lastLookY = t.clientY;
    // Rotate the yaw object horizontally using the delta and mouse speed.
    yawObject.rotation.y -= dx * mouseSpeed;
    // Rotate the camera vertically using the delta and mouse speed.
    camera.rotation.x -= dy * mouseSpeed;
    // Clamp the vertical rotation to avoid flipping.
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    // Apply subtle gun tilt from the look movement.
    gunTiltY -= dx * mouseSpeed * 0.5;
    // Apply subtle gun tilt from the look movement.
    gunTiltX -= dy * mouseSpeed * 0.5;
  }, { passive: false });

  // Handle look pad touch end events to stop camera control.
  lookPad.addEventListener('touchend', (e) => {
    // Prevent default to suppress gestures.
    e.preventDefault();
    // Stop propagation so it does not bubble to the document.
    e.stopPropagation();
    // Determine whether our active look touch ended.
    const ended = Array.from(e.changedTouches).some(x => x.identifier === lookId);
    // Clear the active identifier if the touch ended.
    if (ended) { lookId = null; }
  }, { passive: false });

  // Handle fire button touch start to begin firing.
  fireBtn.addEventListener('touchstart', (e) => {
    // Prevent default behaviors on touch.
    e.preventDefault();
    // Stop propagation so the document handler does not trigger.
    e.stopPropagation();
    // Start the game when not yet started.
    if (!gameStarted) { startGame(); }
    // Ignore when paused or over.
    if (gamePaused || gameOver) return;
    // Set the continuous fire flag.
    isMouseDown = true;
    // Fire immediately once.
    createProjectile();
    // Record the time of this shot for cadence.
    lastPlayerShotTime = performance.now();
  }, { passive: false });

  // Handle fire button touch end to stop firing.
  fireBtn.addEventListener('touchend', (e) => {
    // Prevent default behaviors on touch.
    e.preventDefault();
    // Stop propagation to avoid global handling.
    e.stopPropagation();
    // Clear the continuous fire flag.
    isMouseDown = false;
  }, { passive: false });

  // Handle jump button touch start to jump.
  jumpBtn.addEventListener('touchstart', (e) => {
    // Prevent default behavior for touch.
    e.preventDefault();
    // Stop propagation so it does not bubble.
    e.stopPropagation();
    // Start the game if not started yet.
    if (!gameStarted) { startGame(); }
    // Ignore when paused or over.
    if (gamePaused || gameOver) return;
    // Perform a jump only when grounded.
    if (isGrounded) {
      // Set vertical velocity to the jump speed.
      verticalVelocity = jumpSpeed;
      // Mark the player as airborne.
      isGrounded = false;
      // Play the jump sound only after user interaction and not in autoplay.
      if (!autoplay) { playJumpSound(); }
    }
  }, { passive: false });

  // Handle weapon cycle button touch start to switch weapons.
  weaponBtn.addEventListener('touchstart', (e) => {
    // Prevent default behavior.
    e.preventDefault();
    // Stop propagation to avoid side effects.
    e.stopPropagation();
    // Start the game if necessary.
    if (!gameStarted) { startGame(); }
    // Ignore when paused or over.
    if (gamePaused || gameOver) return;
    // Cycle to the next weapon.
    setWeapon((currentWeapon + 1) % 3);
  }, { passive: false });

  // Handle pause button touch start to toggle pause.
  pauseBtn.addEventListener('touchstart', (e) => {
    // Prevent default behavior.
    e.preventDefault();
    // Stop propagation to avoid global handlers.
    e.stopPropagation();
    // Only toggle when a game has started and not over.
    if (gameStarted && !gameOver) { togglePause(); }
  }, { passive: false });
}
