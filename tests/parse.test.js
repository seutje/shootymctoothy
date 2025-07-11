const fs = require('fs');

test('main.js parses without errors', () => {
  const code = fs.readFileSync('assets/js/main.js', 'utf8');
  expect(() => new Function(code)).not.toThrow();
});
