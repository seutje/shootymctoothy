const fs = require('fs');

const aiCode = fs.readFileSync('assets/js/ai.js', 'utf8');

test('findVisibleHealthPack function is defined', () => {
  expect(aiCode).toMatch(/function findVisibleHealthPack\(\)/);
});

