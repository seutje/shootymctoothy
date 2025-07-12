const fs = require('fs');

const audioCode = fs.readFileSync('assets/js/audio.js', 'utf8');

test('playShootSound function is defined', () => {
  expect(audioCode).toMatch(/function playShootSound\(\)/);
});

test('playJumpSound function is defined', () => {
  expect(audioCode).toMatch(/function playJumpSound\(\)/);
});

test('playHealthPackSound function is defined', () => {
  expect(audioCode).toMatch(/function playHealthPackSound\(\)/);
});

test('playDamageSound function is defined', () => {
  expect(audioCode).toMatch(/function playDamageSound\(\)/);
});

test('startSoundtrack function is defined', () => {
  expect(audioCode).toMatch(/function startSoundtrack\(\)/);
});

test('stopSoundtrack function is defined', () => {
  expect(audioCode).toMatch(/function stopSoundtrack\(\)/);
});

