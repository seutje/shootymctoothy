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
    // Create an oscillator for the laser sound.
    const oscillator = audioContext.createOscillator();
    // Set the oscillator type to square for a bright tone.
    oscillator.type = 'square';
    // Create a gain node to control the volume envelope.
    const gainNode = audioContext.createGain();
    // Start the frequency high for the initial pitch.
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    // Sweep the frequency down for a laser effect.
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
    // Set the starting gain so the sound is audible.
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    // Fade the gain quickly to create a short pulse.
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    // Connect the oscillator to the gain node.
    oscillator.connect(gainNode);
    // Connect the gain node to the reverb effect.
    gainNode.connect(reverbNode);
    // Connect the reverb node to the master volume control.
    reverbNode.connect(masterGain);
    // Start the oscillator immediately.
    oscillator.start();
    // Stop the oscillator after 0.2 seconds.
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

// The function to set the master volume.
function setVolume(level) {
    // Clamp the level between zero and one.
    const volume = Math.max(0, Math.min(1, level));
    // Set the gain value on the master node.
    masterGain.gain.value = volume;
}
