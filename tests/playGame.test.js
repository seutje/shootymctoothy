const fs = require('fs');

const gameCode = fs.readFileSync('assets/js/game.js', 'utf8');

function extractBody(name) {
  const match = gameCode.match(new RegExp(`function ${name}\\(\\) {([\\s\\S]*?)\\n}`));
  return match && match[1];
}

describe('game play simulation', () => {
  test('startGame sets flags and enemy timers', () => {
    const body = extractBody('startGame');
    const startGame = new Function(
      'gameStarted',
      'gamePaused',
      'startSoundtrack',
      'document',
      'enemies',
      'Date',
      body + '\nreturn {gameStarted, gamePaused, enemies};'
    );
    const startSoundtrack = jest.fn();
    const document = { body: { requestPointerLock: jest.fn() } };
    const enemies = [{}, {}];
    const result = startGame(false, true, startSoundtrack, document, enemies, Date);
    expect(result.gameStarted).toBe(true);
    expect(result.gamePaused).toBe(false);
    expect(startSoundtrack).toHaveBeenCalled();
    expect(document.body.requestPointerLock).toHaveBeenCalled();
    result.enemies.forEach(enemy => {
      expect(enemy.lastShotTime).toBeDefined();
    });
  });

  test('togglePause pauses and resumes the game', () => {
    const body = extractBody('togglePause');
    const togglePause = new Function(
      'gamePaused',
      'startSoundtrack',
      'stopSoundtrack',
      'document',
      body + '\nreturn gamePaused;'
    );
    const startSoundtrack = jest.fn();
    const stopSoundtrack = jest.fn();
    const document = {
      body: { requestPointerLock: jest.fn() },
      exitPointerLock: jest.fn()
    };
    let state = togglePause(false, startSoundtrack, stopSoundtrack, document);
    expect(state).toBe(true);
    expect(stopSoundtrack).toHaveBeenCalled();
    expect(document.exitPointerLock).toHaveBeenCalled();
    state = togglePause(state, startSoundtrack, stopSoundtrack, document);
    expect(state).toBe(false);
    expect(startSoundtrack).toHaveBeenCalledTimes(1);
    expect(document.body.requestPointerLock).toHaveBeenCalled();
  });
});
