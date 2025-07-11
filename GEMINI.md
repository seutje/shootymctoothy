# ShootyMcToothy Development Guide

This document outlines the development guidelines for the browser-based 3D shooter game, "ShootyMcToothy".

## Project Structure

The project follows a simple, no-build-step structure:

-   **`index.html`**: The main entry point of the game, located at the project root.
-   **`assets/js/`**: Contains all JavaScript files.
-   **`assets/css/`**: Contains all CSS files for styling.
-   **`assets/images/`**: Contains all image assets for the game.

## Technology Stack

-   **Core Engine**: [Three.js](https://threejs.org/) will be used for 3D rendering.
-   **Loading**: Three.js will be loaded directly from a CDN in `index.html`. No npm/yarn or other package managers are to be used.

## Development Workflow

-   **No Build Step**: The game is designed to run directly in the browser without any compilation or bundling steps.
-   **Execution**: Open the `index.html` file in a web browser to run the game.

## Coding Style

-   **JavaScript Commenting**: Every single line of JavaScript code must have a corresponding comment explaining its purpose. HTML and CSS files should not be commented.
-   **Newline at End of File**: All files must end with a single newline character.
