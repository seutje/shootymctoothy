const fs = require('fs');

const gameCode = fs.readFileSync('assets/js/game.js', 'utf8');

test('startGame function is defined', () => {
  expect(gameCode).toMatch(/function startGame\(\)/);
});

