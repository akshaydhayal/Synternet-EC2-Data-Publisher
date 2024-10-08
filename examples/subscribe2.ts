import { subscribe, publish, natsConnect } from "../pubsub2";
import { Message } from "../pubsub2";
import { NatsConfig } from "../pubsub2/types";
import { createAppJwt } from "../pubsub2/userJwt";


const examplePublishSubject = "stark.news.live";
const publisherAccessToken = process.env.PUBLISH_ACCESS_TOKEN ?? "";

// wss://url.com:443
const natsWsUrl = "wss://europe-west3-gcp-dl-testnet-brokernode-frankfurt01.synternet.com:443";
const exampleSubscribeSubject = "stark.news.live";
// const exampleSubscribeSubject = "synternet.price.all";
const subscribeAccessToken = process.env.SUBSCRIBE_ACCESS_TOKEN ?? "";

var config: NatsConfig;

async function republishData(message: Message) {
  console.log("Received message on", exampleSubscribeSubject, "subject");
  console.log(message);
}

const onMessages = async (messages: Message[]) => {
  messages.filter((message) => message.subject === exampleSubscribeSubject).forEach((message) => republishData(message));
};

const onError = (text: string, error: Error) => {
  console.error(text, error);
};

async function main() {
  config = { url: natsWsUrl };
  const { userSeed: seed, jwt } = createAppJwt(subscribeAccessToken);
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
