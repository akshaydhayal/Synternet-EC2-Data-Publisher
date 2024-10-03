// publisher.ts

import dotenv from "dotenv";
import { NatsService } from "../pubsub/nats";
import { createAppJwt } from "../pubsub/userJwt";

dotenv.config();

const natsUrl = "nats://europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:4222";
const subject = "stark.sports.data";
const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN ?? "";

// Enhanced NatsService with Publish Count Tracking
class EnhancedNatsService extends NatsService {
  private publishCount: number = 0;

  public incrementPublishCount(): void {
    this.publishCount += 1;
  }

  public getPublishCount(): number {
    return this.publishCount;
  }
}

async function publishServiceFn(publishService: EnhancedNatsService) {
  try {
    const fetchAndPublishScores = async () => {
      try {
        // Fetch live matches
        const liveMatchesResponse = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
          method: "GET",
        });
        if (!liveMatchesResponse.ok) {
          throw new Error(`Failed to fetch live matches: ${liveMatchesResponse.statusText}`);
        }

        const liveMatchesData = await liveMatchesResponse.json();
        const liveMatchesId = liveMatchesData.data.matches.map((match: any) => match.id);
        console.log(`Live Match IDs: ${liveMatchesId}`);

        // Fetch match scores concurrently
        const scorePromises = liveMatchesId.map((id: string) =>
          fetch(`https://cricbuzz-live.vercel.app/v1/score/${id}`).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch score for match ID ${id}: ${res.statusText}`);
            }
            return res.json();
          })
        );

        const matchScores = await Promise.all(scorePromises);

        // Aggregate the scores
        const liveMatchStats: Record<string, any>[] = matchScores.map((matchData: any, index: number) => ({
          [liveMatchesId[index]]: { ...matchData.data, update: matchData.data.update + Math.random() },
        }));

        const toPublishData = {
          liveMatchDetails: liveMatchesData.data.matches,
          liveMatchStats,
        };

        console.log(`Publishing message #${publishService.getPublishCount() + 1}: ${JSON.stringify(toPublishData)}`);

        // Publish to NATS
        await publishWithRetry(subject, toPublishData, publishService);
        publishService.incrementPublishCount();
      } catch (error) {
        console.error("Failed to fetch and publish match scores:", error);
      }
    };

    // Initial publish
    await fetchAndPublishScores();

    // Schedule subsequent publishes every 10 seconds
    const scoreInterval = setInterval(fetchAndPublishScores, 2500);

    // Handle process termination for graceful shutdown
    const cleanUp = async () => {
      clearInterval(scoreInterval);
      await publishService.close();
      console.log("Publisher shut down gracefully.");
      process.exit(0);
    };

    process.on("SIGINT", cleanUp);
    process.on("SIGTERM", cleanUp);
  } catch (error) {
    console.error("Error in publishServiceFn:", error);
  }
}

async function publishWithRetry(subject: string, data: any, publishService: EnhancedNatsService, retries = 3): Promise<void> {
  const retryDelay = 5000; // 5 seconds
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await publishService.publishJSON(subject, data);
      console.log(`Successfully published message #${publishService.getPublishCount()}: Attempt ${attempt}`);
      return;
    } catch (error) {
      console.error(`Failed to publish message (Attempt ${attempt}):`, error);
      if (attempt < retries) {
        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.error("Max publish attempts reached. Skipping this publish.");
      }
    }
  }
}

async function main() {
  try {
    // Initialize EnhancedNatsService
    const service = new EnhancedNatsService({
      url: natsUrl,
      natsCredsFile: createAppJwt(publisherAccessToken),
    });

    console.log("Connecting to NATS server...");
    await service.waitForConnection();
    console.log("Connected to NATS server.");

    // Start publishing service
    await publishServiceFn(service);
  } catch (error) {
    console.error("Failed to initialize publisher:", error);
    process.exit(1);
  }
}

main();




// import dotenv from "dotenv";
// import { connect, NatsConnection, ConnectionOptions } from "nats";
// import { createAppJwt } from "../pubsub/userJwt";

// dotenv.config();

// const natsUrl = "europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:4222";
// const subject = "stark.sports.data";
// const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN ?? "";

// class NatsService {
//   private nc: NatsConnection | null = null;
//   private options: ConnectionOptions;
//   private reconnectAttempts = 0;
//   private maxReconnectAttempts = 5;
//   private reconnectDelay = 5000; // 5 seconds

//   constructor(options: ConnectionOptions) {
//     this.options = options;
//   }

//   async connect(): Promise<void> {
//     try {
//       this.nc = await connect(this.options);
//       console.log("Connected to NATS server");
//       this.reconnectAttempts = 0;

//       // Set up disconnect handler
//       this.nc.closed().then(() => this.handleDisconnect());
//     } catch (error) {
//       console.error("Failed to connect to NATS:", error);
//       await this.handleDisconnect();
//     }
//   }

//   private async handleDisconnect(): Promise<void> {
//     console.log("Disconnected from NATS server");
//     if (this.reconnectAttempts < this.maxReconnectAttempts) {
//       this.reconnectAttempts++;
//       console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
//       setTimeout(() => this.connect(), this.reconnectDelay);
//     } else {
//       console.error("Max reconnection attempts reached. Giving up.");
//     }
//   }

//   async waitForConnection(): Promise<void> {
//     if (!this.nc) {
//       await this.connect();
//     }
//   }

//   async publishJSON(subject: string, data: any): Promise<void> {
//     if (!this.nc) {
//       throw new Error("Not connected to NATS");
//     }
//     await this.nc.publish(subject, JSON.stringify(data));
//   }
// }

// async function publishServiceFn(publishService: NatsService) {
//   const maxRetries = 3;
//   const retryDelay = 5000; // 5 seconds

//   const publishWithRetry = async (subject: string, data: any, retries = 0) => {
//     try {
//       await publishService.publishJSON(subject, data);
//     } catch (error) {
//       console.error(`Failed to publish (attempt ${retries + 1}):`, error);
//       if (retries < maxRetries) {
//         console.log(`Retrying in ${retryDelay / 1000} seconds...`);
//         await new Promise((resolve) => setTimeout(resolve, retryDelay));
//         await publishWithRetry(subject, data, retries + 1);
//       } else {
//         console.error("Max retries reached. Skipping this publish.");
//       }
//     }
//   };

//   try {
//     let count = 1;

//     const fetchAndPublish = async () => {
//       try {
//         let liveMatchesResponse = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
//           method: "GET",
//         });
//         let liveMatchesData = await liveMatchesResponse.json();
//         let liveMatchesId = liveMatchesData.data.matches.map((match) => match.id);
//         console.log(liveMatchesId);

//         let toPublishData = {
//           liveMatchDetails: liveMatchesData.data.matches,
//           liveMatchStats: [],
//         };

//         const fetchAndPublishScores = async () => {
//           try {
//             toPublishData.liveMatchStats = [];
//             const responses = await Promise.all(liveMatchesId.map((id) => fetch(`https://cricbuzz-live.vercel.app/v1/score/${id}`)));
//             for (let i = 0; i < responses.length; i++) {
//               const matchData = await responses[i].json();
//               toPublishData.liveMatchStats.push({
//                 [liveMatchesId[i]]: {
//                   ...matchData.data,
//                   update: matchData.data.update + Math.random(),
//                 },
//               });
//             }
//             console.log(`Publishing message count: ${count} ${JSON.stringify(toPublishData)}`);
//             await publishWithRetry(subject, toPublishData);
//             count++;
//           } catch (error) {
//             console.error("Failed to fetch match scores:", error);
//           }
//         };

//         await fetchAndPublishScores();
//         setInterval(fetchAndPublishScores, 10000); // Every 10 seconds
//       } catch (e) {
//         console.error("Failed to fetch live matches:", e);
//       }
//     };

//     await fetchAndPublish();
//     setInterval(fetchAndPublish, 3600000); // Every hour
//   } catch (e) {
//     console.error("Error in publish service:", e);
//   }
// }

// async function main() {
//   const service = new NatsService({
//     servers: natsUrl,
//     token: createAppJwt(publisherAccessToken),
//     timeout: 30000, // 30 seconds
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
