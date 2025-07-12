// Import the Express framework.
const express = require('express');
// Create a new Express application instance.
const app = express();
// Define the port where the server will listen.
const port = 3000;
// Serve static files from the project directory.
app.use(express.static(__dirname));
// Start the server and listen on the specified port.
app.listen(port, () => {
  // Log a message indicating the server is running.
  console.log(`Server running at http://localhost:${port}`);
});

