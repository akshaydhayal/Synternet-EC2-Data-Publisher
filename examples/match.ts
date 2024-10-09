export function simulateCricketMatch() {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getRandomRun = () => {
    const runs = [0, 1, 2, 3, 4, 6, "W"];
    return runs[Math.floor(Math.random() * runs.length)];
  };

  const calculateStrikeRate = (runs, balls) => {
    if (balls === 0) return "0.00";
    return ((runs / balls) * 100).toFixed(2);
  };

  const calculateEconomy = (runsConceded, ballsBowled) => {
    if (ballsBowled === 0) return "0.00";
    return (runsConceded / (ballsBowled / 6)).toFixed(2);
  };

  class Team {
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
  }

  class Match {
    constructor(teamA, teamB) {
      this.teamA = teamA;
      this.teamB = teamB;
      this.totalOvers = 2; // Increased to 20 overs for meaningful bowler usage
      this.ballsPerOver = 6;
      this.maxWickets = 10;
      this.updateInterval = 10000; // Reduced to 1 second for faster updates

      this.firstInnings = this.initializeInnings(this.teamA, this.teamB);
      this.secondInnings = this.initializeInnings(this.teamB, this.teamA);
      this.matchEnded = false;
      this.result = "";
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
      };
    }

    // Helper function to format overs correctly
    formatOvers(balls) {
      const overs = Math.floor(balls / this.ballsPerOver);
      const ballsInOver = balls % this.ballsPerOver;
      return `${overs}.${ballsInOver}`;
    }

    // New function to swap striker and non-striker
    swapBatsmen(currentInnings) {
      [currentInnings.striker, currentInnings.nonStriker] = [currentInnings.nonStriker, currentInnings.striker];
    }

    async simulateBall(currentInnings, target = null) {
      if (currentInnings.wickets >= this.maxWickets || currentInnings.overs >= this.totalOvers) return;
      const run = getRandomRun();
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

      if (run === "W") {
        currentInnings.wickets += 1;
        currentInnings.bowlerStats[bowlerOne].wicketsTaken += 1;
        currentInnings.bowlerStats[bowlerOne].ballsBowled += 1;
        currentInnings.batsmenStats[currentInnings.striker].ballsFaced += 1;

        const update = {
          liveMatchDetails: [
            {
              id: "100229",
              title: `${this.teamA.name} vs ${this.teamB.name}`,
              teams: [
                {
                  team: `${this.firstInnings.battingTeam.name}`,
                  run: `${this.firstInnings.totalRuns}`,
                },
                {
                  team: `${this.secondInnings.battingTeam.name}`,
                  run: `${this.secondInnings.totalRuns}`,
                },
              ],
              timeAndPlace: {
                date: "Today",
                time: "-",
                place: "at Kanpur, Green Park",
              },
              overview: `${currentInnings.battingTeam.name} ${currentInnings.totalRuns}/${currentInnings.wickets}`,
              //   overview: "India won by 7 wkts",
            },
          ],
          liveMatchStats: {
            title: `${this.teamA.name} vs ${this.teamB.name}, Live Cricket Scoreee`,
            update: `${currentInnings.striker} is OUT!`,
            liveScore: `${currentInnings.battingTeam.name} ${currentInnings.totalRuns}/${currentInnings.wickets}`,
            runRate: (currentInnings.totalRuns / (currentInnings.overs || 1)).toFixed(2),
            batsmanOne: currentInnings.striker,
            batsmanOneRun: currentInnings.batsmenStats[currentInnings.striker].runs,
            batsmanOneBall: currentInnings.batsmenStats[currentInnings.striker].ballsFaced,
            batsmanOneSR: calculateStrikeRate(
              currentInnings.batsmenStats[currentInnings.striker].runs,
              currentInnings.batsmenStats[currentInnings.striker].ballsFaced
            ),
            batsmanTwo: currentInnings.nonStriker,
            batsmanTwoRun: currentInnings.batsmenStats[currentInnings.nonStriker].runs,
            batsmanTwoBall: currentInnings.batsmenStats[currentInnings.nonStriker].ballsFaced,
            batsmanTwoSR: calculateStrikeRate(
              currentInnings.batsmenStats[currentInnings.nonStriker].runs,
              currentInnings.batsmenStats[currentInnings.nonStriker].ballsFaced
            ),
            bowlerOne: bowlerOne,
            bowlerOneOver: this.formatOvers(currentInnings.bowlerStats[bowlerOne].ballsBowled),
            bowlerOneRun: currentInnings.bowlerStats[bowlerOne].runsConceded,
            bowlerOneWickets: currentInnings.bowlerStats[bowlerOne].wicketsTaken,
            bowlerOneEconomy: calculateEconomy(currentInnings.bowlerStats[bowlerOne].runsConceded, currentInnings.bowlerStats[bowlerOne].ballsBowled),
            bowlerTwo: currentInnings.bowlerTwo ? currentInnings.bowlerTwo : null,
            bowlerTwoOver: currentInnings.bowlerTwo ? this.formatOvers(currentInnings.bowlerStats[currentInnings.bowlerTwo].ballsBowled) : null,
            bowlerTwoRun: currentInnings.bowlerTwo ? currentInnings.bowlerStats[currentInnings.bowlerTwo].runsConceded : null,
            bowlerTwoWickets: currentInnings.bowlerTwo ? currentInnings.bowlerStats[currentInnings.bowlerTwo].wicketsTaken : null,
            bowlerTwoEconomy: currentInnings.bowlerTwo
              ? calculateEconomy(
                  currentInnings.bowlerStats[currentInnings.bowlerTwo].runsConceded,
                  currentInnings.bowlerStats[currentInnings.bowlerTwo].ballsBowled
                )
              : null,
          },
        };

        console.log(JSON.stringify(update));

        if (currentInnings.nextBatsmanIndex < currentInnings.battingTeam.players.length) {
          currentInnings.striker = currentInnings.battingTeam.players[currentInnings.nextBatsmanIndex];
          currentInnings.batsmenStats[currentInnings.striker] = {
            runs: 0,
            ballsFaced: 0,
          };
          currentInnings.nextBatsmanIndex += 1;
        }
      } else {
        currentInnings.totalRuns += run;
        currentInnings.bowlerStats[bowlerOne].runsConceded += run;
        currentInnings.bowlerStats[bowlerOne].ballsBowled += 1;
        currentInnings.batsmenStats[currentInnings.striker].runs += run;
        currentInnings.batsmenStats[currentInnings.striker].ballsFaced += 1;

        // Swap batsmen if 1 or 3 runs are scored
        if (run === 1 || run === 3) {
          this.swapBatsmen(currentInnings);
        }

        const update = {
          liveMatchDetails: [
            {
              id: "100229",
              title: `${this.teamA.name} vs ${this.teamB.name}`,
              teams: [
                {
                  team: `${this.firstInnings.battingTeam.name}`,
                  run: `${this.firstInnings.totalRuns}`,
                },
                {
                  team: `${this.secondInnings.battingTeam.name}`,
                  run: `${this.secondInnings.totalRuns}`,
                },
              ],
              timeAndPlace: {
                date: "Today",
                time: "-",
                place: "at Kanpur, Green Park",
              },
              overview: `${currentInnings.battingTeam.name} ${currentInnings.totalRuns}/${currentInnings.wickets}`,
              //   overview: "India won by 7 wkts",
            },
          ],
          liveMatchStats: {
            title: `${this.teamA.name} vs ${this.teamB.name}, Live Cricket Scorex`,
            update: `${currentInnings.striker} scores ${run} run(s)`,
            liveScore: `${currentInnings.battingTeam.name} ${currentInnings.totalRuns}/${currentInnings.wickets}`,
            runRate: (currentInnings.totalRuns / (currentInnings.overs || 1)).toFixed(2),
            batsmanOne: currentInnings.striker,
            batsmanOneRun: currentInnings.batsmenStats[currentInnings.striker].runs,
            batsmanOneBall: currentInnings.batsmenStats[currentInnings.striker].ballsFaced,
            batsmanOneSR: calculateStrikeRate(
              currentInnings.batsmenStats[currentInnings.striker].runs,
              currentInnings.batsmenStats[currentInnings.striker].ballsFaced
            ),
            batsmanTwo: currentInnings.nonStriker,
            batsmanTwoRun: currentInnings.batsmenStats[currentInnings.nonStriker].runs,
            batsmanTwoBall: currentInnings.batsmenStats[currentInnings.nonStriker].ballsFaced,
            batsmanTwoSR: calculateStrikeRate(
              currentInnings.batsmenStats[currentInnings.nonStriker].runs,
              currentInnings.batsmenStats[currentInnings.nonStriker].ballsFaced
            ),
            bowlerOne: bowlerOne,
            bowlerOneOver: this.formatOvers(currentInnings.bowlerStats[bowlerOne].ballsBowled),
            bowlerOneRun: currentInnings.bowlerStats[bowlerOne].runsConceded,
            bowlerOneWickets: currentInnings.bowlerStats[bowlerOne].wicketsTaken,
            bowlerOneEconomy: calculateEconomy(currentInnings.bowlerStats[bowlerOne].runsConceded, currentInnings.bowlerStats[bowlerOne].ballsBowled),
            bowlerTwo: currentInnings.bowlerTwo ? currentInnings.bowlerTwo : null,
            bowlerTwoOver: currentInnings.bowlerTwo ? this.formatOvers(currentInnings.bowlerStats[currentInnings.bowlerTwo].ballsBowled) : null,
            bowlerTwoRun: currentInnings.bowlerTwo ? currentInnings.bowlerStats[currentInnings.bowlerTwo].runsConceded : null,
            bowlerTwoWickets: currentInnings.bowlerTwo ? currentInnings.bowlerStats[currentInnings.bowlerTwo].wicketsTaken : null,
            bowlerTwoEconomy: currentInnings.bowlerTwo
              ? calculateEconomy(
                  currentInnings.bowlerStats[currentInnings.bowlerTwo].runsConceded,
                  currentInnings.bowlerStats[currentInnings.bowlerTwo].ballsBowled
                )
              : null,
          },
        };

        console.log(JSON.stringify(update));
      }

      // Switch bowlers after each over
      if (currentInnings.balls % this.ballsPerOver === 0) {
        currentInnings.bowlerTwo = currentInnings.bowlerOne; // The bowler who just finished
        currentInnings.bowlerOne = currentInnings.bowlingTeam.getNextBowler(); // The new bowler
        // Swap batsmen at the end of the over
        this.swapBatsmen(currentInnings);
      }

      // Check if target is reached
      if (target && currentInnings.totalRuns >= target) {
        this.result = `${currentInnings.battingTeam.name} wins by ${this.maxWickets - currentInnings.wickets} wickets!`;
        console.log(this.result);
        this.matchEnded = true;
      }

      // Enforce maximum of 5 bowlers per innings
      currentInnings.usedBowlers.add(currentInnings.bowlerOne);
      if (currentInnings.usedBowlers.size > 5) {
        this.result = `${currentInnings.bowlingTeam.name} cannot use more than 5 bowlers. Match cannot continue.`;
        console.log(this.result);
        this.matchEnded = true;
      }

      await sleep(this.updateInterval);
    }

    async simulateInnings(currentInnings, target = null) {
      while (!this.matchEnded && currentInnings.overs < this.totalOvers && currentInnings.wickets < this.maxWickets) {
        await this.simulateBall(currentInnings, target);
      }
    }

    async simulateMatch() {
      console.log(`First Innings Begins: ${this.firstInnings.battingTeam.name} is batting.`);
      await this.simulateInnings(this.firstInnings);

      if (this.matchEnded) return; // If match ended in first innings

      const target = this.firstInnings.totalRuns + 1;
      console.log(`Second Innings Begins: ${this.secondInnings.battingTeam.name} needs ${target} runs to win.`);
      await this.simulateInnings(this.secondInnings, target);

      if (!this.matchEnded) {
        if (this.secondInnings.totalRuns >= target) {
          this.result = `${this.secondInnings.battingTeam.name} wins by ${this.maxWickets - this.secondInnings.wickets} wickets!`;
        } else {
          this.result = `${this.firstInnings.battingTeam.name} wins by ${target - this.secondInnings.totalRuns - 1} runs!`;
        }
        console.log(this.result);
      }
    }
  }

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
  const teamIndia = new Team("India", indiaPlayers, indiaBowlers);
  const teamAustralia = new Team("Australia", australiaPlayers, australiaBowlers);
  const teamEngland = new Team("England", englandPlayers, englandBowlers);
  const teamNewZealand = new Team("New Zealand", newZealandPlayers, newZealandBowlers);

  // Select teams for the match (e.g., India vs Australia)
  const teamA = teamIndia;
  const teamB = teamAustralia;

  const match = new Match(teamA, teamB);

  match.simulateMatch();
}

simulateCricketMatch();
