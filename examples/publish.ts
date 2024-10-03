import axios from "axios";
import dotenv from "dotenv";
import { NatsService } from "../pubsub/nats";
import { createAppJwt } from "../pubsub/userJwt";

dotenv.config();

const natsUrl = "europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:4222";
const subject = "stark.sports.data";
const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN ?? "";

let publishInterval: NodeJS.Timeout;
let fetchInterval: NodeJS.Timeout;
let isConnected = false;

// async function fetchLiveMatches() {
//   try {
//     const response = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
//       method: "GET",
//     });
//     const data = await response.json();
//     console.log("API Response:", JSON.stringify(data, null, 2));
    
//     if (!data || !data.data || !Array.isArray(data.data.matches)) {
//       console.error("Unexpected API response structure");
//       return [];
//     }
    
//     return data.data.matches.map((match: any) => match.id);
//   } catch (error) {
//     console.error("Error fetching live matches:", error);
//     return [];
//   }
// }


async function fetchLiveMatches() {
  try {
    const response = await axios.get("https://cricbuzz-live.vercel.app/v1/matches/live", {
      timeout: 10000,
      validateStatus: function (status) {
        return status >= 200 && status < 300; // default
      },
    });

    console.log("API Response:", JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.data || !Array.isArray(response.data.data.matches)) {
      console.error("Unexpected API response structure");
      return [];
    }

    return response.data.data.matches.map((match: any) => match.id);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:");
      console.error("  Message:", error.message);
      console.error("  Code:", error.code);
      console.error("  Config:", JSON.stringify(error.config, null, 2));
      if (error.response) {
        console.error("  Response status:", error.response.status);
        console.error("  Response headers:", error.response.headers);
        console.error("  Response data:", error.response.data);
      } else if (error.request) {
        console.error("  No response received. Request details:", error.request);
      }
    } else {
      console.error("Non-Axios error:", error);
    }
    return [];
  }
}


async function fetchMatchScores(matchIds: string[]) {
  try {
    const responses = await Promise.all(matchIds.map((id) => fetch(`https://cricbuzz-live.vercel.app/v1/score/${id}`)));
    const matchData = await Promise.all(responses.map((res) => res.json()));
    return matchData.map((data, index) => ({
      [matchIds[index]]: { ...data.data, update: data.data.update + Math.random() },
    }));
  } catch (error) {
    console.error("Error fetching match scores:", error);
    return [];
  }
}

async function publishServiceFn(publishService: NatsService) {
  let count = 1;

  const fetchAndPublish = async () => {
    try {
      if (!isConnected) {
        console.log("Not connected to NATS. Skipping publish.");
        return;
      }

      const liveMatchesId = await fetchLiveMatches();
      console.log("Live Matches:", liveMatchesId);

      if (liveMatchesId.length === 0) {
        console.log("No live matches found. Skipping publish.");
        return;
      }

      const liveMatchStats = await fetchMatchScores(liveMatchesId);

      const toPublishData = {
        liveMatchDetails: liveMatchesId,
        liveMatchStats,
      };

      console.log(`Publishing message count: ${count} ${JSON.stringify(toPublishData)}`);
      await publishService.publishJSON(subject, toPublishData);
      count++;
    } catch (error) {
      console.error("Failed to fetch or publish data:", error);
      isConnected = false;
      clearIntervals();
      await reconnect(publishService);
    }
  };

  // Initial publish
  await fetchAndPublish();

  // Set up intervals for fetching and publishing
  publishInterval = setInterval(fetchAndPublish, 20000); // Every 1.5 seconds
  fetchInterval = setInterval(async () => {
    const liveMatchesId = await fetchLiveMatches();
    console.log("Updated live matches:", liveMatchesId);
  }, 3600000); // Every hour

}
function clearIntervals() {
  if (publishInterval) clearInterval(publishInterval);
  if (fetchInterval) clearInterval(fetchInterval);
}

async function reconnect(service: NatsService) {
  console.log("Attempting to reconnect...");
  try {
    await service.waitForConnection();
    console.log("Reconnected to NATS server.");
    isConnected = true;
    publishServiceFn(service);
  } catch (error) {
    console.error("Failed to reconnect:", error);
    setTimeout(() => reconnect(service), 5000); // Try to reconnect every 5 seconds
  }
}

async function main() {
  const service = new NatsService({
    url: natsUrl,
    natsCredsFile: createAppJwt(publisherAccessToken),
  });

  console.log("Connecting to NATS server...");
  try {
    await service.waitForConnection();
    console.log("Connected to NATS server.");
    isConnected = true;

    // Start publishing after successful connection
    publishServiceFn(service);
  } catch (error) {
    console.error("Failed to connect:", error);
    await reconnect(service);
  }

  // Handle process termination
  process.on("SIGINT", async () => {
    console.log("Shutting down...");
    clearIntervals();
    if (service) await service.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});







// import dotenv from "dotenv";
// import { NatsService } from "../pubsub/nats";
// import { createAppJwt } from "../pubsub/userJwt";

// dotenv.config();

// const natsUrl = "europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:4222";
// // const subject = "stark.energytrade.UEI";
// const subject = "stark.sports.data";
// const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN??"";

// async function publishServiceFn(publishService) {
//   try {
//     if (publishService) {
//       const subject = "stark.sports.data";
//       let count = 1;

//       const fetchAndPublish = async () => {
//         try {
//           let liveMatchesResponse = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
//             method: "GET",
//           });
//           let liveMatchesData = await liveMatchesResponse.json();
//           let liveMatchesId = liveMatchesData.data.matches.map((match) => match.id);
//           console.log(liveMatchesId);

//           let toPublishData = {
//             liveMatchDetails: liveMatchesData.data.matches,
//             liveMatchStats: [],
//           };
//           const fetchAndPublishScores = async () => {
//             try {
//               // let toPublishData = [];
//               toPublishData.liveMatchStats = [];
//               const responses = await Promise.all(liveMatchesId.map((id) => fetch(`https://cricbuzz-live.vercel.app/v1/score/${id}`)));
//               for (let i = 0; i < responses.length; i++) {
//                 const matchData = await responses[i].json();
//                 // toPublishData.push({ [liveMatchesId[i]]: { ...matchData.data, rand: Math.random() } });
//                 // toPublishData.liveMatchStats.push({ [liveMatchesId[i]]: matchData.data });
//                 toPublishData.liveMatchStats.push({ [liveMatchesId[i]]: { ...matchData.data, update: matchData.data.update + Math.random() } });
//               }
//               console.log(`Publishing message count : ${count} ${JSON.stringify(toPublishData)}`);
//               // console.log(`Publishing message count : ${count} `);
//               await publishService?.publishJSON(subject, toPublishData);
//               count++;
//             } catch (error) {
//               console.error("Failed to fetch match scores:", error);
//             }
//           };

//           await fetchAndPublishScores();
//           setInterval(fetchAndPublishScores, 10000); // Every minute
//         } catch (e) {
//           console.error("Failed to fetch live matches:", e);
//         }
//       };

//       await fetchAndPublish();
//       setInterval(fetchAndPublish, 3600000); // Every hour
//     }
//   } catch (e) {
//     console.error("Error publishing to NATS:", e);
//   }
// }

// async function main() {
//   // Connect to the NATS server with credentials
//   const service = new NatsService({
//     url: natsUrl,
//     natsCredsFile: createAppJwt(publisherAccessToken),
//   });

//   console.log("Connecting to NATS server...");
//   await service.waitForConnection();
//   console.log("Connected to NATS server.");

//   publishServiceFn(service);
// }

// main().catch((err) => {
//   console.error("Error:", err);
//   process.exit(1);
// });

// // publisher.ts

// import dotenv from "dotenv";
// import { NatsService } from "../pubsub/nats";
// import { createAppJwt } from "../pubsub/userJwt";

// dotenv.config();

// const natsUrl = "nats://europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:4222";
// const subject = "stark.sports.data";
// const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN ?? "";

// // Enhanced NatsService with Publish Count Tracking
// class EnhancedNatsService extends NatsService {
//   private publishCount: number = 0;

//   public incrementPublishCount(): void {
//     this.publishCount += 1;
//   }

//   public getPublishCount(): number {
//     return this.publishCount;
//   }
// }

// async function publishServiceFn(publishService: EnhancedNatsService) {
//   try {
//     const fetchAndPublishScores = async () => {
//       try {
//         // Fetch live matches
//         const liveMatchesResponse = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
//           method: "GET",
//         });
//         if (!liveMatchesResponse.ok) {
//           throw new Error(`Failed to fetch live matches: ${liveMatchesResponse.statusText}`);
//         }

//         const liveMatchesData = await liveMatchesResponse.json();
//         const liveMatchesId = liveMatchesData.data.matches.map((match: any) => match.id);
//         console.log(`Live Match IDs: ${liveMatchesId}`);

//         // Fetch match scores concurrently
//         const scorePromises = liveMatchesId.map((id: string) =>
//           fetch(`https://cricbuzz-live.vercel.app/v1/score/${id}`).then((res) => {
//             if (!res.ok) {
//               throw new Error(`Failed to fetch score for match ID ${id}: ${res.statusText}`);
//             }
//             return res.json();
//           })
//         );

//         const matchScores = await Promise.all(scorePromises);

//         // Aggregate the scores
//         const liveMatchStats: Record<string, any>[] = matchScores.map((matchData: any, index: number) => ({
//           [liveMatchesId[index]]: { ...matchData.data, update: matchData.data.update + Math.random() },
//         }));

//         const toPublishData = {
//           liveMatchDetails: liveMatchesData.data.matches,
//           liveMatchStats,
//         };

//         console.log(`Publishing message #${publishService.getPublishCount() + 1}: ${JSON.stringify(toPublishData)}`);

//         // Publish to NATS
//         await publishWithRetry(subject, toPublishData, publishService);
//         publishService.incrementPublishCount();
//       } catch (error) {
//         console.error("Failed to fetch and publish match scores:", error);
//       }
//     };

//     // Initial publish
//     await fetchAndPublishScores();

//     // Schedule subsequent publishes every 10 seconds
//     const scoreInterval = setInterval(fetchAndPublishScores, 2500);

//     // Handle process termination for graceful shutdown
//     const cleanUp = async () => {
//       clearInterval(scoreInterval);
//       await publishService.close();
//       console.log("Publisher shut down gracefully.");
//       process.exit(0);
//     };

//     process.on("SIGINT", cleanUp);
//     process.on("SIGTERM", cleanUp);
//   } catch (error) {
//     console.error("Error in publishServiceFn:", error);
//   }
// }

// async function publishWithRetry(subject: string, data: any, publishService: EnhancedNatsService, retries = 3): Promise<void> {
//   const retryDelay = 5000; // 5 seconds
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       await publishService.publishJSON(subject, data);
//       console.log(`Successfully published message #${publishService.getPublishCount()}: Attempt ${attempt}`);
//       return;
//     } catch (error) {
//       console.error(`Failed to publish message (Attempt ${attempt}):`, error);
//       if (attempt < retries) {
//         console.log(`Retrying in ${retryDelay / 1000} seconds...`);
//         await new Promise((resolve) => setTimeout(resolve, retryDelay));
//       } else {
//         console.error("Max publish attempts reached. Skipping this publish.");
//       }
//     }
//   }
// }

// async function main() {
//   try {
//     // Initialize EnhancedNatsService
//     const service = new EnhancedNatsService({
//       url: natsUrl,
//       natsCredsFile: createAppJwt(publisherAccessToken),
//     });

//     console.log("Connecting to NATS server...");
//     await service.waitForConnection();
//     console.log("Connected to NATS server.");

//     // Start publishing service
//     await publishServiceFn(service);
//   } catch (error) {
//     console.error("Failed to initialize publisher:", error);
//     process.exit(1);
//   }
// }

// main();
