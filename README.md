# ShootyMcToothy

ShootyMcToothy is a browser-based 3D shooter built with Three.js. The game runs without any build step and all JavaScript files are heavily commented to describe every line.

## Features

- Simple first-person controls using the mouse and the WASD keys.
- Touch controls enable play on mobile devices.
- Enemies spawn around the map, move randomly and fire projectiles at the player.
- Obstacles block movement and projectiles, requiring you to maneuver carefully.
- Projectiles and enemy projectiles can collide with each other.
- Health packs occasionally drop from defeated enemies and restore health when picked up.
- Player score increases for each enemy defeated and high scores are stored in `localStorage`.
- Game over screen lists the high scores and allows a quick restart.
- Pause the game with **P** or **Esc** to access a restart button and a volume slider that saves its level.
- User interface shows score, health and frames per second and includes a crosshair when the game is active.
- Retro styled soundtrack and sound effects generated with the Web Audio API.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open <http://localhost:3000> in your browser to play.

You can also open `index.html` directly in a modern browser without running the server.

## How to Play

- **Click** to lock the pointer and fire your weapon.
- **WASD** to move and **Space** to jump.
- Defeat enemies to raise your score. Pick up health packs to stay alive.
- **P** or **Esc** pauses the game. Use the restart button or the volume slider in the pause menu.
- The game ends when your health reaches zero. Click the screen to restart and try to beat your high score.

## Running Tests

Run the unit tests with:
```bash
npm test
```

