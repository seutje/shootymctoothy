const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

test('index includes audio.js script', () => {
  expect(html).toMatch(/<script src="assets\/js\/audio.js\?v=2"><\/script>/);
});

test('index includes ai.js script', () => {
  expect(html).toMatch(/<script src="assets\/js\/ai.js\?v=2"><\/script>/);
});

test('index includes game.js script', () => {
  expect(html).toMatch(/<script src="assets\/js\/game.js\?v=2"><\/script>/);
});

test('index includes ui.js script', () => {
  expect(html).toMatch(/<script src="assets\/js\/ui.js\?v=2"><\/script>/);
});
