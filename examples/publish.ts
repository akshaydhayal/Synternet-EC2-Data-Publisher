import dotenv from "dotenv";
import { NatsService } from "../pubsub/nats";
import { createAppJwt } from "../pubsub/userJwt";

dotenv.config();

const natsUrl = "europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:4222";
// const subject = "stark.energytrade.UEI";
const subject = "stark.sports.data";
const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN??"";



async function publishServiceFn(publishService) {
  try {
    if (publishService) {
      const subject = "stark.sports.data";
      let count = 1;

      const fetchAndPublish = async () => {
        try {
          let liveMatchesResponse = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
            method: "GET",
          });
          let liveMatchesData = await liveMatchesResponse.json();
          let liveMatchesId = liveMatchesData.data.matches.map((match) => match.id);
          console.log(liveMatchesId);

          let toPublishData = {
            liveMatchDetails: liveMatchesData.data.matches,
            liveMatchStats: [],
          };
          const fetchAndPublishScores = async () => {
            try {
              // let toPublishData = [];
              toPublishData.liveMatchStats = [];
              const responses = await Promise.all(liveMatchesId.map((id) => fetch(`https://cricbuzz-live.vercel.app/v1/score/${id}`)));
              for (let i = 0; i < responses.length; i++) {
                const matchData = await responses[i].json();
                // toPublishData.push({ [liveMatchesId[i]]: { ...matchData.data, rand: Math.random() } });
                // toPublishData.liveMatchStats.push({ [liveMatchesId[i]]: matchData.data });
                toPublishData.liveMatchStats.push({ [liveMatchesId[i]]: { ...matchData.data, update: matchData.data.update + Math.random() } });
              }
              console.log(`Publishing message count : ${count} ${JSON.stringify(toPublishData)}`);
              // console.log(`Publishing message count : ${count} `);
              await publishService?.publishJSON(subject, toPublishData);
              count++;
            } catch (error) {
              console.error("Failed to fetch match scores:", error);
            }
          };

          await fetchAndPublishScores();
          setInterval(fetchAndPublishScores, 10000); // Every minute
        } catch (e) {
          console.error("Failed to fetch live matches:", e);
        }
      };

      await fetchAndPublish();
      setInterval(fetchAndPublish, 3600000); // Every hour
    }
  } catch (e) {
    console.error("Error publishing to NATS:", e);
  }
}

async function main() {
  // Connect to the NATS server with credentials
  const service = new NatsService({
    url: natsUrl,
    natsCredsFile: createAppJwt(publisherAccessToken),
  });

  console.log("Connecting to NATS server...");
  await service.waitForConnection();
  console.log("Connected to NATS server.");

  publishServiceFn(service);

  // let count = 1;
  // setInterval(async () => {
  //   try {
  //     const response = await fetch("https://cricbuzz-live.vercel.app/v1/score/100229", {
  //       method: "GET",
  //     });
  //     const data = await response.json();
  //     console.log(`Publishing message : ${count} ${JSON.stringify(data.data)} to subject: ${subject}`);
  //     await service.publishJSON(subject, data.data);
  //     count++;
  //   } catch (error) {
  //     console.error("Failed to fetch data after multiple attempts:", error);
  //   }
  // }, 10000);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
