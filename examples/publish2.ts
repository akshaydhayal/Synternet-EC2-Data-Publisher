import { subscribe, Message, NatsConfig, createAppJwt, publish, natsConnect } from "pubsub-ws";
import { getRSSFeeds } from "./rssFeeds";

const natsWsUrl = "wss://europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:443";

const userCredsJWT = "USER_JWT";
const userCredsSeed = "CREDS_SEED";
const exampleSubscribeSubject = "synternet.price.all";
const examplePublishSubject = "stark.news.live";
const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN ?? "";
const subsciberAccessToken = process.env.SUBSCRIBE_ACCESS_TOKEN ?? "";

var config: NatsConfig;

// async function republishData(message: Message) {
async function republishData() {
  console.log("Received message on", exampleSubscribeSubject, "subject");
  const message=await getRSSFeeds();
//   publish(examplePublishSubject, message.data, config);
  await publish(examplePublishSubject, message, config);
  console.log("Published message on", examplePublishSubject, "subject", message);
}

const onMessages = async (messages: Message[]) => {
  messages.filter((message) => message.subject === exampleSubscribeSubject).forEach((message) => republishData(message));
};

const onError = (text: string, error: Error) => {
  console.error(text, error);
};

async function main() {
  config = { url: natsWsUrl };
  const { userSeed: seed, jwt } = createAppJwt(subsciberAccessToken);

  await subscribe({
    onMessages,
    onError,
    jwt: jwt,
    nkey: seed,
    config: config,
    subject: exampleSubscribeSubject,
  });
  console.log("Connected to NATS server.");
}

main();
