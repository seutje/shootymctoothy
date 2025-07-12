const fs = require('fs');

test('game.js parses without errors', () => {
  const code = fs.readFileSync('assets/js/game.js', 'utf8');
  expect(() => new Function(code)).not.toThrow();
});

test('ui.js parses without errors', () => {
  const code = fs.readFileSync('assets/js/ui.js', 'utf8');
  expect(() => new Function(code)).not.toThrow();
});

test('audio.js parses without errors', () => {
  const code = fs.readFileSync('assets/js/audio.js', 'utf8');
  expect(() => new Function(code)).not.toThrow();
});
