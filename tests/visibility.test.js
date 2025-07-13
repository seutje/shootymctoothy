const fs = require('fs');

const gameCode = fs.readFileSync('assets/js/game.js', 'utf8');

test('visibility change handler is present', () => {
  expect(gameCode).toMatch(/visibilitychange/);
});
