const fs = require('fs');

const serverCode = fs.readFileSync('server.js', 'utf8');

test('express module is required', () => {
  expect(serverCode).toMatch(/require\(['\"]express['\"]\)/);
});

test('static middleware is configured', () => {
  expect(serverCode).toMatch(/app.use\(express.static\(__dirname\)\)/);
});

test('server listens on port 3000', () => {
  expect(serverCode).toMatch(/app.listen\(port/);
});
