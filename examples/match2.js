// matchManager.js

const { v4: uuidv4 } = require("uuid"); // Ensure you have installed uuid using npm install uuid

class CricketMatch {
  constructor(teamA, teamB, totalOvers = 2, ballsPerOver = 6, maxWickets = 10, updateInterval = 15000) {
    this.teamA = teamA;
    this.teamB = teamB;
    this.totalOvers = totalOvers;
    this.ballsPerOver = ballsPerOver;
    this.maxWickets = maxWickets;
    this.updateInterval = updateInterval; // in milliseconds

    this.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    this.getRandomRun = () => {
      const runs = [0, 1, 2, 3, 4, 6, "W"];
      return runs[Math.floor(Math.random() * runs.length)];
    };

    this.calculateStrikeRate = (runs, balls) => {
      if (balls === 0) return "0.00";
      return ((runs / balls) * 100).toFixed(2);
    };

    this.calculateEconomy = (runsConceded, ballsBowled) => {
      if (ballsBowled === 0) return "0.00";
      return (runsConceded / (ballsBowled / 6)).toFixed(2);
    };

    this.Team = class {
      constructor(name, players, bowlers) {
        this.name = name;
        this.players = players;
        this.bowlers = bowlers; // Array of bowler names
        this.bowlerIndex = 0;
      }

      getNextBowler() {
        if (this.bowlers.length === 0) return null;
        const bowler = this.bowlers[this.bowlerIndex % this.bowlers.length];
        this.bowlerIndex += 1;
        return bowler;
      }
    };

    // Initialize unique match ID
    this.matchId = uuidv4();

    // Initialize match title
    this.matchTitle = `${this.teamA.name} vs ${this.teamB.name}`;

    // Initialize time and place (for simplicity, using fixed values; can be randomized or parameterized)
    this.timeAndPlace = {
      date: "Today",
      time: "-",
      place: "at Kanpur, Green Park",
    };

    // Initialize liveMatchDetails and liveMatchStats
    this.liveMatchDetails = {
      liveMatchDetails: [
        {
          id: this.matchId,
          title: this.matchTitle,
          teams: [
            { team: this.teamA.name, run: "0" },
            { team: this.teamB.name, run: "0" },
          ],
          timeAndPlace: this.timeAndPlace,
          overview: `${this.teamA.name} 0/0`,
        },
      ],
      liveMatchStats: {
        title: `${this.matchTitle}, Live Cricket Score`,
        update: "",
        liveScore: `${this.teamA.name} 0/0`,
        runRate: "0.00",
        batsmanOne: this.teamA.players[0],
        batsmanOneRun: 0,
        batsmanOneBall: 0,
        batsmanOneSR: "0.00",
        batsmanTwo: this.teamA.players[1],
        batsmanTwoRun: 0,
        batsmanTwoBall: 0,
        batsmanTwoSR: "0.00",
        bowlerOne: null,
        bowlerOneOver: null,
        bowlerOneRun: null,
        bowlerOneWickets: null,
        bowlerOneEconomy: null,
        bowlerTwo: null,
        bowlerTwoOver: null,
        bowlerTwoRun: null,
        bowlerTwoWickets: null,
        bowlerTwoEconomy: null,
      },
    };
  }

  initializeInnings(battingTeam, bowlingTeam) {
    return {
      battingTeam: battingTeam,
      bowlingTeam: bowlingTeam,
      totalRuns: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      striker: battingTeam.players[0],
      nonStriker: battingTeam.players[1],
      nextBatsmanIndex: 2,
      bowlerOne: bowlingTeam.getNextBowler(),
      bowlerTwo: null,
      bowlerStats: {},
      batsmenStats: {},
      usedBowlers: new Set(), // To track used bowlers and enforce 5-bowler limit
      matchEnded: false, // To indicate if the innings has ended
    };
  }

  // Helper function to format overs correctly
  formatOvers(balls) {
    const overs = Math.floor(balls / this.ballsPerOver);
    const ballsInOver = balls % this.ballsPerOver;
    return `${overs}.${ballsInOver}`;
  }

  // Function to swap striker and non-striker
  swapBatsmen(currentInnings) {
    [currentInnings.striker, currentInnings.nonStriker] = [currentInnings.nonStriker, currentInnings.striker];
  }

  // Function to update liveMatchDetails
  updateLiveMatchDetails() {
    // Update team runs
    this.liveMatchDetails.liveMatchDetails[0].teams[0].run = `${this.firstInnings.totalRuns}`;
    this.liveMatchDetails.liveMatchDetails[0].teams[1].run = `${this.secondInnings.totalRuns}`;

    // Update overview
    this.liveMatchDetails.liveMatchDetails[0].overview = `${this.firstInnings.battingTeam.name} ${this.firstInnings.totalRuns}/${this.firstInnings.wickets}`;
  }

  // Function to update liveMatchStats
  updateLiveMatchStats(currentInnings) {
    // Update liveScore
    this.liveMatchDetails.liveMatchStats.liveScore = `${currentInnings.battingTeam.name} ${currentInnings.totalRuns}/${currentInnings.wickets}`;

    // Calculate run rate
    const totalOvers = currentInnings.balls / this.ballsPerOver;
    const runRate = totalOvers > 0 ? (currentInnings.totalRuns / totalOvers).toFixed(2) : "0.00";
    this.liveMatchDetails.liveMatchStats.runRate = runRate;

    // Update batsmanOne details
    const batsmanOneStats = currentInnings.batsmenStats[currentInnings.striker];
    this.liveMatchDetails.liveMatchStats.batsmanOne = currentInnings.striker;
    this.liveMatchDetails.liveMatchStats.batsmanOneRun = batsmanOneStats.runs;
    this.liveMatchDetails.liveMatchStats.batsmanOneBall = batsmanOneStats.ballsFaced;
    this.liveMatchDetails.liveMatchStats.batsmanOneSR = this.calculateStrikeRate(batsmanOneStats.runs, batsmanOneStats.ballsFaced);

    // Update batsmanTwo details
    const batsmanTwoStats = currentInnings.batsmenStats[currentInnings.nonStriker];
    this.liveMatchDetails.liveMatchStats.batsmanTwo = currentInnings.nonStriker;
    this.liveMatchDetails.liveMatchStats.batsmanTwoRun = batsmanTwoStats.runs;
    this.liveMatchDetails.liveMatchStats.batsmanTwoBall = batsmanTwoStats.ballsFaced;
    this.liveMatchDetails.liveMatchStats.batsmanTwoSR = this.calculateStrikeRate(batsmanTwoStats.runs, batsmanTwoStats.ballsFaced);

    // Update bowlerOne details
    const bowlerOne = currentInnings.bowlerOne;
    if (bowlerOne) {
      const bowlerOneStats = currentInnings.bowlerStats[bowlerOne];

      // Ensure bowlerOneStats is defined
      if (bowlerOneStats) {
        this.liveMatchDetails.liveMatchStats.bowlerOne = bowlerOne;
        this.liveMatchDetails.liveMatchStats.bowlerOneOver = this.formatOvers(bowlerOneStats.ballsBowled);
        this.liveMatchDetails.liveMatchStats.bowlerOneRun = bowlerOneStats.runsConceded;
        this.liveMatchDetails.liveMatchStats.bowlerOneWickets = bowlerOneStats.wicketsTaken;
        this.liveMatchDetails.liveMatchStats.bowlerOneEconomy = this.calculateEconomy(bowlerOneStats.runsConceded, bowlerOneStats.ballsBowled);
      } else {
        // Initialize if not present
        currentInnings.bowlerStats[bowlerOne] = {
          runsConceded: 0,
          wicketsTaken: 0,
          ballsBowled: 0,
        };
        this.liveMatchDetails.liveMatchStats.bowlerOneOver = "0.0";
        this.liveMatchDetails.liveMatchStats.bowlerOneRun = 0;
        this.liveMatchDetails.liveMatchStats.bowlerOneWickets = 0;
        this.liveMatchDetails.liveMatchStats.bowlerOneEconomy = "0.00";
      }
    }

    // Update bowlerTwo details
    const bowlerTwo = currentInnings.bowlerTwo;
    if (bowlerTwo) {
      const bowlerTwoStats = currentInnings.bowlerStats[bowlerTwo];

      // Ensure bowlerTwoStats is defined
      if (bowlerTwoStats) {
        this.liveMatchDetails.liveMatchStats.bowlerTwo = bowlerTwo;
        this.liveMatchDetails.liveMatchStats.bowlerTwoOver = this.formatOvers(bowlerTwoStats.ballsBowled);
        this.liveMatchDetails.liveMatchStats.bowlerTwoRun = bowlerTwoStats.runsConceded;
        this.liveMatchDetails.liveMatchStats.bowlerTwoWickets = bowlerTwoStats.wicketsTaken;
        this.liveMatchDetails.liveMatchStats.bowlerTwoEconomy = this.calculateEconomy(bowlerTwoStats.runsConceded, bowlerTwoStats.ballsBowled);
      } else {
        // Initialize if not present
        currentInnings.bowlerStats[bowlerTwo] = {
          runsConceded: 0,
          wicketsTaken: 0,
          ballsBowled: 0,
        };
        this.liveMatchDetails.liveMatchStats.bowlerTwoOver = "0.0";
        this.liveMatchDetails.liveMatchStats.bowlerTwoRun = 0;
        this.liveMatchDetails.liveMatchStats.bowlerTwoWickets = 0;
        this.liveMatchDetails.liveMatchStats.bowlerTwoEconomy = "0.00";
      }
    } else {
      // If bowlerTwo is null, set all related fields to null
      this.liveMatchDetails.liveMatchStats.bowlerTwo = null;
      this.liveMatchDetails.liveMatchStats.bowlerTwoOver = null;
      this.liveMatchDetails.liveMatchStats.bowlerTwoRun = null;
      this.liveMatchDetails.liveMatchStats.bowlerTwoWickets = null;
      this.liveMatchDetails.liveMatchStats.bowlerTwoEconomy = null;
    }
  }

  async simulateBall(currentInnings, target = null) {
    if (currentInnings.wickets >= this.maxWickets || currentInnings.overs >= this.totalOvers) return;
    const run = this.getRandomRun();
    currentInnings.balls += 1;
    currentInnings.overs = this.formatOvers(currentInnings.balls);

    const bowlerOne = currentInnings.bowlerOne;

    // Initialize bowler stats if not present
    if (!currentInnings.bowlerStats[bowlerOne]) {
      currentInnings.bowlerStats[bowlerOne] = {
        runsConceded: 0,
        wicketsTaken: 0,
        ballsBowled: 0,
      };
    }

    // Initialize batsmen stats if not present
    if (!currentInnings.batsmenStats[currentInnings.striker]) {
      currentInnings.batsmenStats[currentInnings.striker] = {
        runs: 0,
        ballsFaced: 0,
      };
    }

    if (!currentInnings.batsmenStats[currentInnings.nonStriker]) {
      currentInnings.batsmenStats[currentInnings.nonStriker] = {
        runs: 0,
        ballsFaced: 0,
      };
    }

    let update = null;

    if (run === "W") {
      currentInnings.wickets += 1;
      currentInnings.bowlerStats[bowlerOne].wicketsTaken += 1;
      currentInnings.bowlerStats[bowlerOne].ballsBowled += 1;
      currentInnings.batsmenStats[currentInnings.striker].ballsFaced += 1;

      update = {
        event: "Wicket",
        details: `${currentInnings.striker} is OUT!`,
        strikerOut: currentInnings.striker,
      };

      if (currentInnings.nextBatsmanIndex < currentInnings.battingTeam.players.length) {
        currentInnings.striker = currentInnings.battingTeam.players[currentInnings.nextBatsmanIndex];
        currentInnings.batsmenStats[currentInnings.striker] = {
          runs: 0,
          ballsFaced: 0,
        };
        currentInnings.nextBatsmanIndex += 1;
      }
    } else {
      const runValue = typeof run === "string" ? 0 : run;
      currentInnings.totalRuns += runValue;
      currentInnings.bowlerStats[bowlerOne].runsConceded += runValue;
      currentInnings.bowlerStats[bowlerOne].ballsBowled += 1;
      currentInnings.batsmenStats[currentInnings.striker].runs += runValue;
      currentInnings.batsmenStats[currentInnings.striker].ballsFaced += 1;

      // Swap batsmen if 1 or 3 runs are scored
      if (run === 1 || run === 3) {
        this.swapBatsmen(currentInnings);
      }

      update = {
        event: "Run",
        details: `${currentInnings.striker} scores ${runValue} run(s)`,
        runs: runValue,
      };
    }

    // Update liveMatchStats after each ball
    this.updateLiveMatchStats(currentInnings);

    // Switch bowlers after each over
    if (currentInnings.balls % this.ballsPerOver === 0) {
      currentInnings.bowlerTwo = currentInnings.bowlerOne; // The bowler who just finished
      currentInnings.bowlerOne = currentInnings.bowlingTeam.getNextBowler(); // The new bowler

      // Ensure the new bowler's stats are initialized
      if (currentInnings.bowlerOne && !currentInnings.bowlerStats[currentInnings.bowlerOne]) {
        currentInnings.bowlerStats[currentInnings.bowlerOne] = {
          runsConceded: 0,
          wicketsTaken: 0,
          ballsBowled: 0,
        };
      }

      // Swap batsmen at the end of the over
      this.swapBatsmen(currentInnings);
    }

    // Check if target is reached
    if (target && currentInnings.totalRuns >= target) {
      return {
        event: "Target Reached",
        details: `${currentInnings.battingTeam.name} wins by ${this.maxWickets - currentInnings.wickets} wicket(s)!`,
      };
    }

    // Enforce maximum of 5 bowlers per innings
    currentInnings.usedBowlers.add(currentInnings.bowlerOne);
    if (currentInnings.usedBowlers.size > 5) {
      return {
        event: "Match Ended",
        details: `${currentInnings.bowlingTeam.name} cannot use more than 5 bowlers. Match cannot continue.`,
      };
    }

    await this.sleep(this.updateInterval);
    return update;
  }

  async simulateInnings(currentInnings, target = null) {
    while (
      !currentInnings.matchEnded &&
      currentInnings.balls < this.totalOvers * this.ballsPerOver &&
      currentInnings.wickets < this.maxWickets &&
      (target === null || currentInnings.totalRuns < target)
    ) {
      const update = await this.simulateBall(currentInnings, target);
      if (update) {
        if (update.event === "Target Reached" || update.event === "Match Ended") {
          currentInnings.matchEnded = true;
          // Update liveMatchDetails after innings end
          this.updateLiveMatchDetails();
          return update.details;
        } else {
          // Update liveMatchDetails for each ball event
          this.updateLiveMatchDetails();

          // Update liveMatchStats with the latest event
          this.liveMatchDetails.liveMatchStats.update = update.details;
        }
      }
    }

    // Determine result after innings completion
    if (currentInnings === this.firstInnings) {
      // Update liveMatchDetails after first innings
      this.updateLiveMatchDetails();
      return `${currentInnings.battingTeam.name} scored ${currentInnings.totalRuns}/${currentInnings.wickets} in ${currentInnings.overs} overs.`;
    } else {
      if (currentInnings.totalRuns >= target) {
        return `${currentInnings.battingTeam.name} wins by ${this.maxWickets - currentInnings.wickets} wicket(s)!`;
      } else {
        return `${this.firstInnings.battingTeam.name} wins by ${target - this.secondInnings.totalRuns - 1} run(s)!`;
      }
    }
  }

  async startMatch() {
    // Initialize Innings
    this.firstInnings = this.initializeInnings(this.teamA, this.teamB);
    this.secondInnings = this.initializeInnings(this.teamB, this.teamA);
    this.firstInnings.matchEnded = false;
    this.secondInnings.matchEnded = false;
    this.result = "";

    // Simulate First Innings
    let firstInningsResult = await this.simulateInnings(this.firstInnings);
    this.firstInningsResult = firstInningsResult;

    if (this.firstInnings.matchEnded && firstInningsResult.includes("wins")) {
      this.result = firstInningsResult;
      // Update liveMatchDetails and liveMatchStats
      this.updateLiveMatchDetails();
      this.updateLiveMatchStats(this.firstInnings);
      return;
    }

    // Set target for Second Innings
    const target = this.firstInnings.totalRuns + 1;

    // Simulate Second Innings
    let secondInningsResult = await this.simulateInnings(this.secondInnings, target);

    if (secondInningsResult.includes("wins")) {
      this.result = secondInningsResult;
    } else {
      // Determine winner based on runs
      if (this.secondInnings.totalRuns >= target) {
        this.result = `${this.secondInnings.battingTeam.name} wins by ${this.maxWickets - this.secondInnings.wickets} wicket(s)!`;
      } else {
        this.result = `${this.firstInnings.battingTeam.name} wins by ${target - this.secondInnings.totalRuns - 1} run(s)!`;
      }
    }

    // Update liveMatchDetails and liveMatchStats after match end
    this.updateLiveMatchDetails();
    this.updateLiveMatchStats(this.secondInnings);

    return;
  }

  getCurrentMatchState() {
    // Determine which innings is currently active
    let currentInnings = this.firstInnings;
    if (this.secondInnings.matchEnded || this.firstInnings.matchEnded) {
      currentInnings = this.secondInnings;
    }

    // Prepare the JSON structure as per the desired format
    const matchState = {
      liveMatchDetails: [
        {
          id: this.matchId,
          title: this.matchTitle,
          teams: [
            { team: this.teamA.name, run: `${this.firstInnings.totalRuns}` },
            { team: this.teamB.name, run: `${this.secondInnings.totalRuns}` },
          ],
          timeAndPlace: this.timeAndPlace,
          overview: `${this.firstInnings.battingTeam.name} ${this.firstInnings.totalRuns}/${this.firstInnings.wickets}`,
        },
      ],
      liveMatchStats: {
        title: `${this.matchTitle}, Live Cricket Score`,
        update: this.liveMatchDetails.liveMatchStats.update,
        liveScore: this.liveMatchDetails.liveMatchStats.liveScore,
        runRate: this.liveMatchDetails.liveMatchStats.runRate,
        batsmanOne: this.liveMatchDetails.liveMatchStats.batsmanOne,
        batsmanOneRun: this.liveMatchDetails.liveMatchStats.batsmanOneRun,
        batsmanOneBall: this.liveMatchDetails.liveMatchStats.batsmanOneBall,
        batsmanOneSR: this.liveMatchDetails.liveMatchStats.batsmanOneSR,
        batsmanTwo: this.liveMatchDetails.liveMatchStats.batsmanTwo,
        batsmanTwoRun: this.liveMatchDetails.liveMatchStats.batsmanTwoRun,
        batsmanTwoBall: this.liveMatchDetails.liveMatchStats.batsmanTwoBall,
        batsmanTwoSR: this.liveMatchDetails.liveMatchStats.batsmanTwoSR,
        bowlerOne: this.liveMatchDetails.liveMatchStats.bowlerOne,
        bowlerOneOver: this.liveMatchDetails.liveMatchStats.bowlerOneOver,
        bowlerOneRun: this.liveMatchDetails.liveMatchStats.bowlerOneRun,
        bowlerOneWickets: this.liveMatchDetails.liveMatchStats.bowlerOneWickets,
        bowlerOneEconomy: this.liveMatchDetails.liveMatchStats.bowlerOneEconomy,
        bowlerTwo: this.liveMatchDetails.liveMatchStats.bowlerTwo,
        bowlerTwoOver: this.liveMatchDetails.liveMatchStats.bowlerTwoOver,
        bowlerTwoRun: this.liveMatchDetails.liveMatchStats.bowlerTwoRun,
        bowlerTwoWickets: this.liveMatchDetails.liveMatchStats.bowlerTwoWickets,
        bowlerTwoEconomy: this.liveMatchDetails.liveMatchStats.bowlerTwoEconomy,
      },
      result: this.result,
      matchEnded: this.result !== "",
    };

    return matchState;
  }
}

class MatchManager {
  constructor() {
    this.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Define Teams
    this.Team = class {
      constructor(name, players, bowlers) {
        this.name = name;
        this.players = players;
        this.bowlers = bowlers; // Array of bowler names
        this.bowlerIndex = 0;
      }

      getNextBowler() {
        if (this.bowlers.length === 0) return null;
        const bowler = this.bowlers[this.bowlerIndex % this.bowlers.length];
        this.bowlerIndex += 1;
        return bowler;
      }
    };

    // Define Teams with Players and Bowlers
    this.defineTeams();

    // Initialize variables
    this.currentMatch = null;
    this.matchHistory = [];
    this.isRunning = false;
  }

  defineTeams() {
    // Define real teams with players and bowlers

    const indiaPlayers = [
      "Rohit Sharma",
      "Shikhar Dhawan",
      "Virat Kohli",
      "KL Rahul",
      "Rishabh Pant",
      "Hardik Pandya",
      "Ravindra Jadeja",
      "Jasprit Bumrah",
      "Mohammed Shami",
      "Kuldeep Yadav",
      "Yuzvendra Chahal",
    ];

    const indiaBowlers = ["Jasprit Bumrah", "Mohammed Shami", "Kuldeep Yadav", "Yuzvendra Chahal", "Hardik Pandya"];

    const australiaPlayers = [
      "David Warner",
      "Aaron Finch",
      "Steve Smith",
      "Marnus Labuschagne",
      "Glenn Maxwell",
      "Marcus Stoinis",
      "Alex Carey",
      "Mitchell Starc",
      "Pat Cummins",
      "Josh Hazlewood",
      "Adam Zampa",
    ];

    const australiaBowlers = ["Mitchell Starc", "Pat Cummins", "Josh Hazlewood", "Adam Zampa", "Glenn Maxwell"];

    const englandPlayers = [
      "Jos Buttler",
      "Jason Roy",
      "Eoin Morgan",
      "Joe Root",
      "Ben Stokes",
      "Jonny Bairstow",
      "Sam Curran",
      "Jofra Archer",
      "Adil Rashid",
      "Mark Wood",
      "Chris Woakes",
    ];

    const englandBowlers = ["Jofra Archer", "Sam Curran", "Adil Rashid", "Mark Wood", "Chris Woakes"];

    const newZealandPlayers = [
      "Kane Williamson",
      "Ross Taylor",
      "Martin Guptill",
      "Tim Southee",
      "Trent Boult",
      "Mitchell Santner",
      "James Neesham",
      "Lockie Ferguson",
      "Ish Sodhi",
      "Glenn Phillips",
      "Tom Latham",
    ];

    const newZealandBowlers = ["Tim Southee", "Trent Boult", "Lockie Ferguson", "Mitchell Santner", "Ish Sodhi"];

    // Instantiate Teams
    this.teamIndia = new this.Team("India", indiaPlayers, indiaBowlers);
    this.teamAustralia = new this.Team("Australia", australiaPlayers, australiaBowlers);
    this.teamEngland = new this.Team("England", englandPlayers, englandBowlers);
    this.teamNewZealand = new this.Team("New Zealand", newZealandPlayers, newZealandBowlers);

    // Store teams in an array for easy selection
    this.teams = [this.teamIndia, this.teamAustralia, this.teamEngland, this.teamNewZealand];
  }

  // Function to randomly select two different teams for a match
  selectRandomTeams() {
    const shuffled = this.teams.sort(() => 0.5 - Math.random());
    const teamA = shuffled[0];
    const teamB = shuffled[1];
    return { teamA, teamB };
  }

  // Function to start the match simulation loop
  async startContinuousMatches() {
    if (this.isRunning) {
      console.log("MatchManager is already running.");
      return;
    }

    this.isRunning = true;

    while (this.isRunning) {
      const { teamA, teamB } = this.selectRandomTeams();
      console.log(`Starting Match: ${teamA.name} vs ${teamB.name}`);

      this.currentMatch = new CricketMatch(teamA, teamB);
      const matchPromise = this.currentMatch.startMatch();

      // Wait for the match to finish
      await matchPromise;

      // Store match result in history
      this.matchHistory.push({
        id: this.currentMatch.matchId,
        title: this.currentMatch.matchTitle,
        teams: [
          { team: this.currentMatch.teamA.name, run: `${this.currentMatch.firstInnings.totalRuns}` },
          { team: this.currentMatch.teamB.name, run: `${this.currentMatch.secondInnings.totalRuns}` },
        ],
        timeAndPlace: this.currentMatch.timeAndPlace,
        overview: `${this.currentMatch.firstInnings.battingTeam.name} ${this.currentMatch.firstInnings.totalRuns}/${this.currentMatch.firstInnings.wickets}`,
        result: this.currentMatch.result,
        firstInnings: {
          battingTeam: this.currentMatch.firstInnings.battingTeam.name,
          runs: this.currentMatch.firstInnings.totalRuns,
          wickets: this.currentMatch.firstInnings.wickets, // Corrected Reference
          overs: this.currentMatch.firstInnings.overs, // Corrected Reference
        },
        secondInnings: {
          battingTeam: this.currentMatch.secondInnings.battingTeam.name,
          runs: this.currentMatch.secondInnings.totalRuns,
          wickets: this.currentMatch.secondInnings.wickets, // Corrected Reference
          overs: this.currentMatch.secondInnings.overs, // Corrected Reference
        },
      });

      console.log(`Match Ended: ${this.currentMatch.result}\n`);

      // Optional: Add a short delay before starting the next match
      await this.sleep(2000); // 2 seconds
    }
  }

  // Function to stop the match simulation loop
  stopContinuousMatches() {
    this.isRunning = false;
    console.log("MatchManager has been stopped.");
  }

  // Function to get the current match state in the desired JSON format
  getCurrentMatchState() {
    if (!this.currentMatch) {
      return { message: "No match is currently running." };
    }

    return this.currentMatch.getCurrentMatchState();
  }

  // Function to get match history
  getMatchHistory() {
    return this.matchHistory;
  }
}

module.exports = MatchManager;

// // matchManager.js

// class CricketMatch {
//   constructor(teamA, teamB, totalOvers = 5, ballsPerOver = 6, maxWickets = 10, updateInterval = 5000) {
//     this.teamA = teamA;
//     this.teamB = teamB;
//     this.totalOvers = totalOvers;
//     this.ballsPerOver = ballsPerOver;
//     this.maxWickets = maxWickets;
//     this.updateInterval = updateInterval; // in milliseconds

//     this.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//     this.getRandomRun = () => {
//       const runs = [0, 1, 2, 3, 4, 6, "W"];
//       return runs[Math.floor(Math.random() * runs.length)];
//     };

//     this.calculateStrikeRate = (runs, balls) => {
//       if (balls === 0) return "0.00";
//       return ((runs / balls) * 100).toFixed(2);
//     };

//     this.calculateEconomy = (runsConceded, ballsBowled) => {
//       if (ballsBowled === 0) return "0.00";
//       return (runsConceded / (ballsBowled / 6)).toFixed(2);
//     };

//     this.Team = class {
//       constructor(name, players, bowlers) {
//         this.name = name;
//         this.players = players;
//         this.bowlers = bowlers; // Array of bowler names
//         this.bowlerIndex = 0;
//       }

//       getNextBowler() {
//         if (this.bowlers.length === 0) return null;
//         const bowler = this.bowlers[this.bowlerIndex % this.bowlers.length];
//         this.bowlerIndex += 1;
//         return bowler;
//       }
//     };

//     // Initialize Teams (You can move team definitions here or pass them as parameters)
//     // For flexibility, teams are passed as parameters during instantiation
//   }

//   initializeInnings(battingTeam, bowlingTeam) {
//     return {
//       battingTeam: battingTeam,
//       bowlingTeam: bowlingTeam,
//       totalRuns: 0,
//       wickets: 0,
//       overs: 0,
//       balls: 0,
//       striker: battingTeam.players[0],
//       nonStriker: battingTeam.players[1],
//       nextBatsmanIndex: 2,
//       bowlerOne: bowlingTeam.getNextBowler(),
//       bowlerTwo: null,
//       bowlerStats: {},
//       batsmenStats: {},
//       usedBowlers: new Set(), // To track used bowlers and enforce 5-bowler limit
//     };
//   }

//   // Helper function to format overs correctly
//   formatOvers(balls) {
//     const overs = Math.floor(balls / this.ballsPerOver);
//     const ballsInOver = balls % this.ballsPerOver;
//     return `${overs}.${ballsInOver}`;
//   }

//   // Function to swap striker and non-striker
//   swapBatsmen(currentInnings) {
//     [currentInnings.striker, currentInnings.nonStriker] = [currentInnings.nonStriker, currentInnings.striker];
//   }

//   async simulateBall(currentInnings, target = null) {
//     if (currentInnings.wickets >= this.maxWickets || currentInnings.overs >= this.totalOvers) return;
//     const run = this.getRandomRun();
//     currentInnings.balls += 1;
//     currentInnings.overs = this.formatOvers(currentInnings.balls);

//     const bowlerOne = currentInnings.bowlerOne;

//     // Initialize bowler stats if not present
//     if (!currentInnings.bowlerStats[bowlerOne]) {
//       currentInnings.bowlerStats[bowlerOne] = {
//         runsConceded: 0,
//         wicketsTaken: 0,
//         ballsBowled: 0,
//       };
//     }

//     // Initialize batsmen stats if not present
//     if (!currentInnings.batsmenStats[currentInnings.striker]) {
//       currentInnings.batsmenStats[currentInnings.striker] = {
//         runs: 0,
//         ballsFaced: 0,
//       };
//     }

//     if (!currentInnings.batsmenStats[currentInnings.nonStriker]) {
//       currentInnings.batsmenStats[currentInnings.nonStriker] = {
//         runs: 0,
//         ballsFaced: 0,
//       };
//     }

//     let update = null;

//     if (run === "W") {
//       currentInnings.wickets += 1;
//       currentInnings.bowlerStats[bowlerOne].wicketsTaken += 1;
//       currentInnings.bowlerStats[bowlerOne].ballsBowled += 1;
//       currentInnings.batsmenStats[currentInnings.striker].ballsFaced += 1;

//       update = {
//         event: "Wicket",
//         details: `${currentInnings.striker} is OUT!`,
//         strikerOut: currentInnings.striker,
//       };

//       if (currentInnings.nextBatsmanIndex < currentInnings.battingTeam.players.length) {
//         currentInnings.striker = currentInnings.battingTeam.players[currentInnings.nextBatsmanIndex];
//         currentInnings.batsmenStats[currentInnings.striker] = {
//           runs: 0,
//           ballsFaced: 0,
//         };
//         currentInnings.nextBatsmanIndex += 1;
//       }
//     } else {
//       const runValue = typeof run === "string" ? 0 : run;
//       currentInnings.totalRuns += runValue;
//       currentInnings.bowlerStats[bowlerOne].runsConceded += runValue;
//       currentInnings.bowlerStats[bowlerOne].ballsBowled += 1;
//       currentInnings.batsmenStats[currentInnings.striker].runs += runValue;
//       currentInnings.batsmenStats[currentInnings.striker].ballsFaced += 1;

//       // Swap batsmen if 1 or 3 runs are scored
//       if (run === 1 || run === 3) {
//         this.swapBatsmen(currentInnings);
//       }

//       update = {
//         event: "Run",
//         details: `${currentInnings.striker} scores ${runValue} run(s)`,
//         runs: runValue,
//       };
//     }

//     // Switch bowlers after each over
//     if (currentInnings.balls % this.ballsPerOver === 0) {
//       currentInnings.bowlerTwo = currentInnings.bowlerOne; // The bowler who just finished
//       currentInnings.bowlerOne = currentInnings.bowlingTeam.getNextBowler(); // The new bowler
//       // Swap batsmen at the end of the over
//       this.swapBatsmen(currentInnings);
//     }

//     // Check if target is reached
//     if (target && currentInnings.totalRuns >= target) {
//       return {
//         event: "Target Reached",
//         details: `${currentInnings.battingTeam.name} wins by ${this.maxWickets - currentInnings.wickets} wickets!`,
//       };
//     }

//     // Enforce maximum of 5 bowlers per innings
//     currentInnings.usedBowlers.add(currentInnings.bowlerOne);
//     if (currentInnings.usedBowlers.size > 5) {
//       return {
//         event: "Match Ended",
//         details: `${currentInnings.bowlingTeam.name} cannot use more than 5 bowlers. Match cannot continue.`,
//       };
//     }

//     await this.sleep(this.updateInterval);
//     return update;
//   }

//   async simulateInnings(currentInnings, target = null) {
//     while (
//       !currentInnings.matchEnded &&
//       currentInnings.balls < this.totalOvers * this.ballsPerOver &&
//       currentInnings.wickets < this.maxWickets &&
//       (target === null || currentInnings.totalRuns < target)
//     ) {
//       const update = await this.simulateBall(currentInnings, target);
//       if (update) {
//         if (update.event === "Target Reached" || update.event === "Match Ended") {
//           currentInnings.matchEnded = true;
//           return update.details;
//         }
//       }
//     }

//     // Determine result after innings completion
//     if (currentInnings === this.firstInnings) {
//       return `${currentInnings.battingTeam.name} scored ${currentInnings.totalRuns}/${currentInnings.wickets} in ${currentInnings.overs} overs.`;
//     } else {
//       if (currentInnings.totalRuns >= target) {
//         return `${currentInnings.battingTeam.name} wins by ${this.maxWickets - currentInnings.wickets} wickets!`;
//       } else {
//         return `${this.firstInnings.battingTeam.name} wins by ${target - currentInnings.totalRuns - 1} runs!`;
//       }
//     }
//   }

//   async startMatch() {
//     // Initialize Innings
//     this.firstInnings = this.initializeInnings(this.teamA, this.teamB);
//     this.secondInnings = this.initializeInnings(this.teamB, this.teamA);
//     this.firstInnings.matchEnded = false;
//     this.secondInnings.matchEnded = false;
//     this.result = "";

//     // Simulate First Innings
//     let firstInningsResult = await this.simulateInnings(this.firstInnings);
//     this.firstInningsResult = firstInningsResult;

//     if (this.firstInnings.matchEnded && firstInningsResult.includes("wins")) {
//       this.result = firstInningsResult;
//       return;
//     }

//     // Set target for Second Innings
//     const target = this.firstInnings.totalRuns + 1;

//     // Simulate Second Innings
//     let secondInningsResult = await this.simulateInnings(this.secondInnings, target);

//     if (secondInningsResult.includes("wins")) {
//       this.result = secondInningsResult;
//     } else {
//       // Determine winner based on runs
//       if (this.secondInnings.totalRuns >= target) {
//         this.result = `${this.secondInnings.battingTeam.name} wins by ${this.maxWickets - this.secondInnings.wickets} wickets!`;
//       } else {
//         this.result = `${this.firstInnings.battingTeam.name} wins by ${target - this.secondInnings.totalRuns - 1} runs!`;
//       }
//     }

//     return;
//   }

//   getCurrentMatchState() {
//     // Determine which innings is currently active
//     let currentInnings = this.firstInnings;
//     if (this.secondInnings.matchEnded || this.firstInnings.matchEnded) {
//       currentInnings = this.secondInnings;
//     }

//     return {
//       teamA: this.teamA.name,
//       teamB: this.teamB.name,
//       firstInnings: {
//         battingTeam: this.firstInnings.battingTeam.name,
//         runs: this.firstInnings.totalRuns,
//         wickets: this.firstInnings.wickets,
//         overs: this.firstInnings.overs,
//       },
//       secondInnings: {
//         battingTeam: this.secondInnings.battingTeam.name,
//         runs: this.secondInnings.totalRuns,
//         wickets: this.secondInnings.wickets,
//         overs: this.secondInnings.overs,
//       },
//       currentInnings: {
//         battingTeam: currentInnings.battingTeam.name,
//         runs: currentInnings.totalRuns,
//         wickets: currentInnings.wickets,
//         overs: currentInnings.overs,
//         striker: currentInnings.striker,
//         nonStriker: currentInnings.nonStriker,
//         bowlerOne: currentInnings.bowlerOne,
//         bowlerTwo: currentInnings.bowlerTwo,
//         batsmenStats: currentInnings.batsmenStats,
//         bowlerStats: currentInnings.bowlerStats,
//       },
//       result: this.result,
//       matchEnded: this.result !== "",
//     };
//   }
// }

// class MatchManager {
//   constructor() {
//     this.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//     // Define Teams
//     this.Team = class {
//       constructor(name, players, bowlers) {
//         this.name = name;
//         this.players = players;
//         this.bowlers = bowlers; // Array of bowler names
//         this.bowlerIndex = 0;
//       }

//       getNextBowler() {
//         if (this.bowlers.length === 0) return null;
//         const bowler = this.bowlers[this.bowlerIndex % this.bowlers.length];
//         this.bowlerIndex += 1;
//         return bowler;
//       }
//     };

//     // Define Teams with Players and Bowlers
//     this.defineTeams();

//     // Initialize variables
//     this.currentMatch = null;
//     this.matchHistory = [];
//     this.isRunning = false;
//   }

//   defineTeams() {
//     // Define real teams with players and bowlers

//     const indiaPlayers = [
//       "Rohit Sharma",
//       "Shikhar Dhawan",
//       "Virat Kohli",
//       "KL Rahul",
//       "Rishabh Pant",
//       "Hardik Pandya",
//       "Ravindra Jadeja",
//       "Jasprit Bumrah",
//       "Mohammed Shami",
//       "Kuldeep Yadav",
//       "Yuzvendra Chahal",
//     ];

//     const indiaBowlers = ["Jasprit Bumrah", "Mohammed Shami", "Kuldeep Yadav", "Yuzvendra Chahal", "Hardik Pandya"];

//     const australiaPlayers = [
//       "David Warner",
//       "Aaron Finch",
//       "Steve Smith",
//       "Marnus Labuschagne",
//       "Glenn Maxwell",
//       "Marcus Stoinis",
//       "Alex Carey",
//       "Mitchell Starc",
//       "Pat Cummins",
//       "Josh Hazlewood",
//       "Adam Zampa",
//     ];

//     const australiaBowlers = ["Mitchell Starc", "Pat Cummins", "Josh Hazlewood", "Adam Zampa", "Glenn Maxwell"];

//     const englandPlayers = [
//       "Jos Buttler",
//       "Jason Roy",
//       "Eoin Morgan",
//       "Joe Root",
//       "Ben Stokes",
//       "Jonny Bairstow",
//       "Sam Curran",
//       "Jofra Archer",
//       "Adil Rashid",
//       "Mark Wood",
//       "Chris Woakes",
//     ];

//     const englandBowlers = ["Jofra Archer", "Sam Curran", "Adil Rashid", "Mark Wood", "Chris Woakes"];

//     const newZealandPlayers = [
//       "Kane Williamson",
//       "Ross Taylor",
//       "Martin Guptill",
//       "Tim Southee",
//       "Trent Boult",
//       "Mitchell Santner",
//       "James Neesham",
//       "Lockie Ferguson",
//       "Ish Sodhi",
//       "Glenn Phillips",
//       "Tom Latham",
//     ];

//     const newZealandBowlers = ["Tim Southee", "Trent Boult", "Lockie Ferguson", "Mitchell Santner", "Ish Sodhi"];

//     // Instantiate Teams
//     this.teamIndia = new this.Team("India", indiaPlayers, indiaBowlers);
//     this.teamAustralia = new this.Team("Australia", australiaPlayers, australiaBowlers);
//     this.teamEngland = new this.Team("England", englandPlayers, englandBowlers);
//     this.teamNewZealand = new this.Team("New Zealand", newZealandPlayers, newZealandBowlers);

//     // Store teams in an array for easy selection
//     this.teams = [this.teamIndia, this.teamAustralia, this.teamEngland, this.teamNewZealand];
//   }

//   // Function to randomly select two different teams for a match
//   selectRandomTeams() {
//     const shuffled = this.teams.sort(() => 0.5 - Math.random());
//     const teamA = shuffled[0];
//     const teamB = shuffled[1];
//     return { teamA, teamB };
//   }

//   // Function to start the match simulation loop
//   async startContinuousMatches() {
//     if (this.isRunning) {
//       console.log("MatchManager is already running.");
//       return;
//     }

//     this.isRunning = true;

//     while (this.isRunning) {
//       const { teamA, teamB } = this.selectRandomTeams();
//       console.log(`Starting Match: ${teamA.name} vs ${teamB.name}`);

//       this.currentMatch = new CricketMatch(teamA, teamB);
//       const matchPromise = this.currentMatch.startMatch();

//       // Wait for the match to finish
//       await matchPromise;

//       // Store match result in history
//       this.matchHistory.push({
//         teams: `${teamA.name} vs ${teamB.name}`,
//         result: this.currentMatch.result,
//         firstInnings: {
//           battingTeam: this.currentMatch.firstInnings.battingTeam.name,
//           runs: this.currentMatch.firstInnings.totalRuns,
//           wickets: this.currentMatch.firstInnings.wickets,
//           overs: this.currentMatch.firstInnings.overs,
//         },
//         secondInnings: {
//           battingTeam: this.currentMatch.secondInnings.battingTeam.name,
//           runs: this.currentMatch.secondInnings.totalRuns,
//           wickets: this.currentMatch.secondInnings.wickets,
//           overs: this.currentMatch.secondInnings.overs,
//         },
//       });

//       console.log(`Match Ended: ${this.currentMatch.result}\n`);

//       // Optional: Add a short delay before starting the next match
//       await this.sleep(2000); // 2 seconds
//     }
//   }

//   // Function to stop the match simulation loop
//   stopContinuousMatches() {
//     this.isRunning = false;
//     console.log("MatchManager has been stopped.");
//   }

//   // Function to get the current match state
//   getCurrentMatchState() {
//     if (!this.currentMatch) {
//       return { message: "No match is currently running." };
//     }

//     return this.currentMatch.getCurrentMatchState();
//   }

//   // Function to get match history
//   getMatchHistory() {
//     return this.matchHistory;
//   }
// }

// module.exports = MatchManager;
