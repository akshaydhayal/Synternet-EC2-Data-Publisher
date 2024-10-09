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

async function fetchLiveMatches() {
  try {
    const response = await fetch("https://cricbuzz-live.vercel.app/v1/matches/live", {
      method: "GET",
    });
    const data = await response.json();
    console.log("API Response:", JSON.stringify(data, null, 2));

    if (!data || !data.data || !Array.isArray(data.data.matches)) {
      console.error("Unexpected API response structure");
      return [];
    }

    return data.data.matches.map((match: any) => match.id);
  } catch (error) {
    console.error("Error fetching live matches:", error);
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

async function fetchGeneratedMatch() {
  try {
    const response = await fetch('http://ec2-13-60-248-140.eu-north-1.compute.amazonaws.com:3004/currentMatch');
    // const response = await fetch("http://localhost:3004/currentMatch");
    const matchData = await response.json();
    return matchData;
  } catch (error) {
    console.error("Error fetching Genrated match scores:", error);
    return {};
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
        // return;
      }

      const liveMatchStats = await fetchMatchScores(liveMatchesId);
      const generatedMatch=await fetchGeneratedMatch();
      const toPublishData = {
        liveMatchDetails: liveMatchesId,
        liveMatchStats,
        generatedMatch
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
  publishInterval = setInterval(fetchAndPublish, 40000); // Every 1.5 seconds
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