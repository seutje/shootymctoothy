// Create a new AudioContext for the soundtrack.
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
// Create a gain node to control overall volume.
const masterGain = audioContext.createGain();
// Connect the master gain to the audio destination.
masterGain.connect(audioContext.destination);
// Set the initial master volume to full volume.
masterGain.gain.value = 1;
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
// Set the Three.js audio context to the same context.
THREE.AudioContext.setContext(audioContext);
// Create a new audio listener for positional audio.
const listener = new THREE.AudioListener();
// Function to attach the listener to the camera.
function attachAudioListener(cam) {
    // Add the listener object to the provided camera.
    cam.add(listener);
}
// Create a buffer filled with a rocket engine sound.
const humBufferLength = audioContext.sampleRate;
// Create the buffer with one channel lasting one second.
const humBuffer = audioContext.createBuffer(1, humBufferLength, audioContext.sampleRate);
// Get the data array from the engine buffer.
const humData = humBuffer.getChannelData(0);
// Fill the buffer with a layered engine tone.
for (let i = 0; i < humBufferLength; i++) {
    // Calculate the time for this sample.
    const time = i / audioContext.sampleRate;
    // Create the base sawtooth-like waveform using two sine waves.
    const base = Math.sin(2 * Math.PI * 110 * time) + 0.5 * Math.sin(2 * Math.PI * 220 * time);
    // Add a small amount of random noise for texture.
    const noise = (Math.random() * 2 - 1) * 0.2;
    // Combine the base tone and noise scaled down for a subtle effect.
    humData[i] = (base / 1.5 + noise) * 0.5;
}
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
    // Connect the gain node to the master volume control.
    gainNode.connect(masterGain);
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
    // Connect the gain node to the master volume control.
    gainNode.connect(masterGain);
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
    // Connect the gain node to the master volume control.
    gainNode.connect(masterGain);
    // Start the noise source.
    noiseSource.start();
    // Stop the noise source after a short time.
    noiseSource.stop(audioContext.currentTime + 0.05);
}

// The function to play the shooting sound effect.
function playShootSound() {
    // Create an oscillator for the weapon blip.
    const oscillator = audioContext.createOscillator();
    // Use a square wave for a sharp tone.
    oscillator.type = 'square';
    // Create a gain node to shape the volume envelope.
    const gainNode = audioContext.createGain();
    // Set the oscillator frequency to a lower pitch for a deeper sound.
    oscillator.frequency.setValueAtTime(375, audioContext.currentTime);
    // Start the gain at a noticeable volume level.
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    // Fade the gain rapidly for a short sound.
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    // Connect the oscillator to the gain node.
    oscillator.connect(gainNode);
    // Connect the gain node directly to the master volume control.
    gainNode.connect(masterGain);
    // Start the oscillator immediately.
    oscillator.start();
    // Stop the oscillator after a brief moment.
    oscillator.stop(audioContext.currentTime + 0.05);
}

// The function to play the jump sound effect.
function playJumpSound() {
    // Create an oscillator for the jump blip.
    const oscillator = audioContext.createOscillator();
    // Create a gain node to shape the volume envelope.
    const gainNode = audioContext.createGain();
    // Use a sine wave for a soft tone.
    oscillator.type = 'sine';
    // Start the frequency high for a quick chirp.
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    // Sweep the frequency downward rapidly.
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
    // Set the initial gain level.
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    // Fade the gain out quickly.
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    // Connect the oscillator to the gain node.
    oscillator.connect(gainNode);
    // Connect the gain node to the master volume control.
    gainNode.connect(masterGain);
    // Start the oscillator immediately.
    oscillator.start();
    // Stop the oscillator after the short ramp.
    oscillator.stop(audioContext.currentTime + 0.2);
}

// The function to play the health pack pickup sound.
function playHealthPackSound() {
    // Create an oscillator for the pickup chirp.
    const oscillator = audioContext.createOscillator();
    // Create a gain node for volume control.
    const gainNode = audioContext.createGain();
    // Use a triangle wave for a mellow tone.
    oscillator.type = 'triangle';
    // Start the frequency at middle A.
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    // Sweep the frequency upward for effect.
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
    // Set the initial volume of the sound.
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    // Fade the volume out quickly.
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    // Connect the oscillator to the gain node.
    oscillator.connect(gainNode);
    // Connect the gain node to the master volume control.
    gainNode.connect(masterGain);
    // Start the oscillator immediately.
    oscillator.start();
    // Stop the oscillator after the ramp.
    oscillator.stop(audioContext.currentTime + 0.2);
}

// The function to play the damage sound.
function playDamageSound() {
    // Create an oscillator for the hurt tone.
    const oscillator = audioContext.createOscillator();
    // Create a gain node for volume control.
    const gainNode = audioContext.createGain();
    // Use a sawtooth wave for a harsh sound.
    oscillator.type = 'sawtooth';
    // Start the frequency high to grab attention.
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    // Sweep the frequency downward quickly.
    oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.2);
    // Set the initial volume of the sound.
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    // Fade the volume out rapidly.
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    // Connect the oscillator to the gain node.
    oscillator.connect(gainNode);
    // Connect the gain node to the master volume control.
    gainNode.connect(masterGain);
    // Start the oscillator immediately.
    oscillator.start();
    // Stop the oscillator after the ramp.
    oscillator.stop(audioContext.currentTime + 0.2);
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

// Function to stop all projectile hums at once.
function stopAllProjectileHums() {
    // Loop over each friendly projectile.
    projectiles.forEach(p => {
        // Stop and remove the hum from this projectile.
        removeHumFromProjectile(p);
    });
    // Loop over each enemy projectile.
    enemyProjectiles.forEach(p => {
        // Stop and remove the hum from this projectile.
        removeHumFromProjectile(p);
    });
}

// Function to attach a spatial hum to a projectile.
function addHumToProjectile(projectile) {
    // Skip creating the hum when autoplay mode is active.
    if (autoplay) {
        // Exit the function early to avoid playing sound.
        return;
    }
    // Create a positional audio object using the global listener.
    const sound = new THREE.PositionalAudio(listener);
    // Set the hum buffer as the sound source.
    sound.setBuffer(humBuffer);
    // Enable looping so the hum plays continuously.
    sound.setLoop(true);
    // Keep the hum volume subtle at five percent.
    sound.setVolume(0.05);
    // Set the reference distance so the volume fades with range.
    sound.setRefDistance(1);
    // Start playing the hum sound.
    sound.play();
    // Attach the sound object to the projectile mesh.
    projectile.add(sound);
    // Store the sound on the projectile for removal later.
    projectile.hum = sound;
}

// Function to stop and remove a projectile's hum.
function removeHumFromProjectile(projectile) {
    // Ensure the projectile has a hum before attempting to remove it.
    if (projectile.hum) {
        // Stop the hum sound immediately.
        projectile.hum.stop();
        // Disconnect the hum from the audio graph.
        projectile.hum.disconnect();
        // Remove the sound object from the projectile.
        projectile.remove(projectile.hum);
        // Clear the hum reference on the projectile.
        projectile.hum = null;
    }
}

// Function to play a spatial rocket explosion sound.
function playExplosionSound(position) {
    // Create a buffer lasting one second for the explosion noise.
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    // Get the data array from the buffer for modification.
    const data = buffer.getChannelData(0);
    // Fill the buffer with decaying random noise values.
    for (let i = 0; i < data.length; i++) {
        // Calculate a linear decay factor over the sample range.
        const decay = 1 - i / data.length;
        // Store a random value scaled by the decay factor.
        data[i] = (Math.random() * 2 - 1) * decay;
    }
    // Create a positional audio object using the global listener.
    const sound = new THREE.PositionalAudio(listener);
    // Assign the generated buffer to the audio object.
    sound.setBuffer(buffer);
    // Set the explosion volume to a moderate level.
    sound.setVolume(0.3);
    // Set the reference distance for the positional effect.
    sound.setRefDistance(2);
    // Create a temporary object to hold the sound at the position.
    const holder = new THREE.Object3D();
    // Copy the explosion position to the holder object.
    holder.position.copy(position);
    // Attach the sound to the holder.
    holder.add(sound);
    // Add the holder to the scene so the sound plays in space.
    scene.add(holder);
    // Start the explosion sound immediately.
    sound.play();
    // Remove the sound and holder after one second.
    setTimeout(() => {
        // Stop the sound playback.
        sound.stop();
        // Disconnect the sound from the audio graph.
        sound.disconnect();
        // Remove the sound from its holder.
        holder.remove(sound);
        // Remove the holder from the scene.
        scene.remove(holder);
    }, 1000);
}


// The function to set the master volume.
function setVolume(level) {
    // Clamp the level between zero and one.
    const volume = Math.max(0, Math.min(1, level));
    // Set the gain value on the master node.
    masterGain.gain.value = volume;
}
