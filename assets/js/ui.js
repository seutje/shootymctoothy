// Start the animation loop.
animate();
// The function to draw the crosshair.
function drawCrosshair() {
    // Set the stroke color to white.
    uiContext.strokeStyle = 'white';
    // Set the line width to two pixels.
    uiContext.lineWidth = 2;
    // Begin a new path for the crosshair.
    uiContext.beginPath();
    // Move to the start of the horizontal line.
    uiContext.moveTo(uiCanvas.width / 2 - 10, uiCanvas.height / 2);
    // Draw to the end of the horizontal line.
    uiContext.lineTo(uiCanvas.width / 2 + 10, uiCanvas.height / 2);
    // Move to the start of the vertical line.
    uiContext.moveTo(uiCanvas.width / 2, uiCanvas.height / 2 - 10);
    // Draw to the end of the vertical line.
    uiContext.lineTo(uiCanvas.width / 2, uiCanvas.height / 2 + 10);
    // Render the lines on the canvas.
    uiContext.stroke();
}

// Function to draw the user interface.
function drawUI() {
    // Clear the entire UI canvas.
    uiContext.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    // Set the text color.
    uiContext.fillStyle = 'black';
    // Set the font style.
    uiContext.font = '20px sans-serif';
    // Draw the score text.
    uiContext.fillText('Score: ' + score, 10, 30);
    // Draw the health text.
    uiContext.fillText('Health: ' + health, 10, 60);
    // Draw the FPS text.
    uiContext.fillText('FPS: ' + fps, uiCanvas.width - 100, 30);
    // Check if the game is active.
    if (gameStarted && !gameOver && !gamePaused) {
        // Draw the crosshair when the player is in control.
        drawCrosshair();
    }
    // Check if the game is paused during play.
    if (gamePaused && gameStarted && !gameOver) {
        // Set a translucent background color.
        uiContext.fillStyle = 'rgba(0,0,0,0.5)';
        // Draw the background rectangle for the pause menu.
        uiContext.fillRect(uiCanvas.width / 2 - 150, uiCanvas.height / 2 - 100, 300, 200);
        // Set the text color for the pause message.
        uiContext.fillStyle = 'white';
        // Set the large font for the pause header.
        uiContext.font = '30px sans-serif';
        // Draw the pause header.
        uiContext.fillText('Paused', uiCanvas.width / 2 - 50, uiCanvas.height / 2 - 60);
        // Set the font for the resume prompt.
        uiContext.font = '20px sans-serif';
        // Draw the resume prompt.
        uiContext.fillText('Press P or Esc to resume', uiCanvas.width / 2 - 120, uiCanvas.height / 2 - 30);
        // Update the restart button x coordinate.
        restartButtonArea.x = uiCanvas.width / 2 - 70;
        // Update the restart button y coordinate.
        restartButtonArea.y = uiCanvas.height / 2;
        // Set a gray color for the button background.
        uiContext.fillStyle = 'gray';
        // Draw the restart button rectangle.
        uiContext.fillRect(restartButtonArea.x, restartButtonArea.y, restartButtonArea.width, restartButtonArea.height);
        // Set the text color for the button label.
        uiContext.fillStyle = 'white';
        // Draw the restart button label.
        uiContext.fillText('Restart', restartButtonArea.x + 20, restartButtonArea.y + 20);
        // Update the slider x coordinate.
        volumeSliderArea.x = uiCanvas.width / 2 - volumeSliderArea.width / 2;
        // Update the slider y coordinate.
        volumeSliderArea.y = uiCanvas.height / 2 + 70;
        // Set the text color for the volume label.
        uiContext.fillStyle = 'white';
        // Draw the volume label next to the slider.
        uiContext.fillText('Volume', volumeSliderArea.x - 70, volumeSliderArea.y + 5);
        // Set the color for the slider track.
        uiContext.fillStyle = 'gray';
        // Draw the slider track.
        uiContext.fillRect(volumeSliderArea.x, volumeSliderArea.y - 2, volumeSliderArea.width, 4);
        // Set the color for the slider handle.
        uiContext.fillStyle = 'white';
        // Draw the slider handle at the current volume level.
        uiContext.fillRect(volumeSliderArea.x + volumeSliderArea.width * volumeLevel - 5, volumeSliderArea.y - 5, 10, 10);
    }
    // Check if the game has not started.
    if (!gameStarted && !gameOver) {
        // Set a translucent background color.
        uiContext.fillStyle = 'rgba(0,0,0,0.8)';
        // Draw the background rectangle.
        uiContext.fillRect(uiCanvas.width / 2 - 150, uiCanvas.height / 2 - 100, 300, 200);
        // Set the text color for the title.
        uiContext.fillStyle = 'white';
        // Set the large font for the title.
        uiContext.font = '30px sans-serif';
        // Draw the game title.
        uiContext.fillText('ShootyMcToothy', uiCanvas.width / 2 - 120, uiCanvas.height / 2 - 40);
        // Set the font for the prompt.
        uiContext.font = '20px sans-serif';
        // Draw the start prompt.
        uiContext.fillText('Click to start', uiCanvas.width / 2 - 70, uiCanvas.height / 2 + 20);
    }
    // Check if the game is over.
    if (gameOver) {
        // Set a translucent background color.
        uiContext.fillStyle = 'rgba(0,0,0,0.8)';
        // Draw the background rectangle with extra height.
        uiContext.fillRect(uiCanvas.width / 2 - 150, uiCanvas.height / 2 - 200, 300, 400);
        // Set the text color for the game over text.
        uiContext.fillStyle = 'white';
        // Center the text horizontally.
        uiContext.textAlign = 'center';
        // Set the large font for the header.
        uiContext.font = '30px sans-serif';
        // Draw the game over header.
        uiContext.fillText('Game Over!', uiCanvas.width / 2, uiCanvas.height / 2 - 60);
        // Set the font for the score.
        uiContext.font = '20px sans-serif';
        // Draw the final score text.
        uiContext.fillText('Final Score: ' + score, uiCanvas.width / 2, uiCanvas.height / 2 - 20);
        // Get the list of high scores.
        const scores = displayHighScores();
        // Iterate over each high score.
        for (let i = 0; i < scores.length; i++) {
            // Draw the current high score line.
            uiContext.fillText(scores[i], uiCanvas.width / 2, uiCanvas.height / 2 + 20 + i * 20);
        }
        // Draw the restart prompt.
        uiContext.fillText('Click to restart', uiCanvas.width / 2, uiCanvas.height / 2 + 20 + scores.length * 20 + 20);
        // Reset text alignment to default.
        uiContext.textAlign = 'left';
    }
    // Inform Three.js that the texture has changed.
    uiTexture.needsUpdate = true;
}
