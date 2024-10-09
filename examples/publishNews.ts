import { subscribe, publish, natsConnect } from "../pubsub2";
import { Message } from "../pubsub2";
import { createAppJwt } from "../pubsub2/userJwt";
import { getRSSFeeds } from "./rssFeeds";
import dotenv from "dotenv";
dotenv.config();

const examplePublishSubject = "stark.news.live";
const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN ?? "";

const natsWsUrl = "wss://europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:443";

let count = 1;
async function publishData(message: Message) {
  const config = { url: natsWsUrl };
  const { userSeed: seed, jwt } = createAppJwt(publisherAccessToken);
  const connection = await natsConnect(config, jwt, seed);
  const r = await connection.publish(examplePublishSubject, message.data);

  console.log("Published message", count, " on", examplePublishSubject, "subject");
  count++;
}

setInterval(async () => {
  const newsData = await getRSSFeeds();
  console.log(newsData[0]);
  console.log("recieved msg from rssFeeds of len : ", newsData.length);
  publishData({ subject: examplePublishSubject, data: JSON.stringify(newsData[0]) });
  // publishData({subject:examplePublishSubject,data:"abc"});
}, 20000);
