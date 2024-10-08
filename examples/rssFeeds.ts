// const axios = require("axios");
// const fs = require("fs");
// const xml2js = require("xml2js");
import axios from "axios";
import fs from "fs";
import xml2js from "xml2js";

// Function to get RSS feed and convert it to JSON
async function getRSS(url) {
  try {
    const response = await axios.get(url);
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    return result;
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
  }
}

function getRandom10Entries(dataArray){
  // Ensure we don't exceed the array length when picking a random start index
  const maxStartIndex = Math.max(0, dataArray.length - 12);

  // Generate a random start index between 0 and maxStartIndex
  const randomStartIndex = Math.floor(Math.random() * (maxStartIndex + 1));
  console.log(dataArray.length,maxStartIndex,randomStartIndex);

  // Slice the array from randomStartIndex to randomStartIndex + 10
  return dataArray.slice(randomStartIndex, randomStartIndex + 10).map((item) => ({
    title: item.title,
    link: item.link,
    description: item.description,
    creator: item["dc:creator"], // Assuming 'dc:creator' is the creator field
    pubDate: item.pubDate,
    image: item["media:content"] ? item["media:content"].$.url : null, // Extract image URL or set to null if not present
  }));
}

function getFirst10Entries(dataArray) {
  // Map over the first 10 entries, extracting only the required fields
  return dataArray.slice(0, 10).map((item) => ({
    title: item.title,
    link: item.link,
    description: item.description,
    creator: item["dc:creator"], // Assuming 'dc:creator' is the creator field
    pubDate: item.pubDate,
    image: item["media:content"] ? item["media:content"].$.url : null, // Extract image URL or set to null if not present
  }));
}

// Fetch RSS feed, save to file, and read/display news items
export const getRSSFeeds=async () => {
//   const rssData = await getRSS("https://globalnews.ca/calgary/feed");
  const rssData = await getRSS("https://rss.nytimes.com/services/xml/rss/nyt/World.xml");
  
  // console.log(rssData);
  const news=rssData.rss.channel.item;

  // const first10Entries = getFirst10Entries(news);
  const first10Entries = getRandom10Entries(news);
  // console.log(first10Entries);
  // console.log(first10Entries.length)
  return first10Entries;
};

// getRSSFeeds();

