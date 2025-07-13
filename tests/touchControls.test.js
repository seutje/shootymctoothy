const fs = require('fs');

const gameCode = fs.readFileSync('assets/js/game.js', 'utf8');

test('onTouchStart function is defined', () => {
  expect(gameCode).toMatch(/function onTouchStart\(/);
});

test('onTouchMove function is defined', () => {
  expect(gameCode).toMatch(/function onTouchMove\(/);
});

test('onTouchEnd function is defined', () => {
  expect(gameCode).toMatch(/function onTouchEnd\(/);
});

