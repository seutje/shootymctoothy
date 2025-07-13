const fs = require('fs');

const gameCode = fs.readFileSync('assets/js/game.js', 'utf8');

test('lightning gun pierces multiple enemies', () => {
  expect(gameCode).toMatch(/hits\.forEach\(hit =>/);
});
