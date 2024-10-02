import dotenv from "dotenv";
import { NatsService } from "../pubsub/nats";
import { createAppJwt } from "../pubsub/userJwt";

dotenv.config();

const natsUrl = "europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:4222";
// const subject = "stark.energytrade.UEI";
const subject = "stark.sports.data";
const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN??"";


async function main() {
  // Connect to the NATS server with credentials
  const service = new NatsService({
    url: natsUrl,
    natsCredsFile: createAppJwt(publisherAccessToken),
    // natsCredsFile: publisherNatsCredsFile,
  });

  console.log("Connecting to NATS server...");
  await service.waitForConnection();
  console.log("Connected to NATS server.");

  // const message = { hello: "world!" };
  let count = 1;
  setInterval(async () => {
    try {
      const response = await fetch("https://cricbuzz-live.vercel.app/v1/score/100229", {
        method: "GET",
      });
      const data = await response.json();
      // const message = { hello: "world! "+count };
      console.log(`Publishing message : ${count} ${JSON.stringify(data.data)} to subject: ${subject}`);
      await service.publishJSON(subject, data.data);
      count++;
    } catch (error) {
      console.error("Failed to fetch data after multiple attempts:", error);
    }
  }, 10000);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
