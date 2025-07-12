const fs = require('fs');

const audioCode = fs.readFileSync('assets/js/audio.js', 'utf8');

test('playShootSound function is defined', () => {
  expect(audioCode).toMatch(/function playShootSound\(\)/);
});

test('startSoundtrack function is defined', () => {
  expect(audioCode).toMatch(/function startSoundtrack\(\)/);
});

test('stopSoundtrack function is defined', () => {
  expect(audioCode).toMatch(/function stopSoundtrack\(\)/);
});

