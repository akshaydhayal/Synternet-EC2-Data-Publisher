// server.js

const express = require("express");
const MatchManager = require("./match2");

const app = express();
const port = 3004;

// Initialize MatchManager
const matchManager = new MatchManager();

// Start continuous matches
matchManager.startContinuousMatches();

// Middleware to handle JSON responses
app.use(express.json());

// Endpoint to get the current match state
app.get("/currentMatch", (req, res) => {
  const state = matchManager.getCurrentMatchState();
  res.json(state);
});

// Endpoint to get match history
app.get("/matchHistory", (req, res) => {
  const history = matchManager.getMatchHistory();
  res.json(history);
});

// Optional: Endpoint to stop the match manager
app.post("/stop", (req, res) => {
  matchManager.stopContinuousMatches();
  res.json({ message: "Match Manager has been stopped." });
});

// Start the server
app.listen(port, () => {
  console.log(`Cricket Match Simulation Server is running at http://localhost:${port}`);
});
