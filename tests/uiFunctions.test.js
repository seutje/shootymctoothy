const fs = require('fs');

const uiCode = fs.readFileSync('assets/js/ui.js', 'utf8');

test('drawUI function is defined', () => {
  expect(uiCode).toMatch(/function drawUI\(\)/);
});

test('drawCrosshair function is defined', () => {
  expect(uiCode).toMatch(/function drawCrosshair\(\)/);
});

