const fs = require("fs");
const fetch = require("node-fetch");
const signale = require("signale");
const config = require("./config.json");

let itemValues = {};

async function fetchItemValues() {
  try {
    const res = await fetch("https://www.rolimons.com/itemapi/itemdetails");
    const data = await res.json();
    itemValues = data.items;
    signale.success("Fetched Rolimons item values");
  } catch (err) {
    signale.error("Error fetching Rolimons item values", err);
  }
}

async function getInventory(userId) {
  try {
    const res = await fetch(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100`);
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    signale.error(`Error fetching inventory for user ${userId}`, err);
    return [];
  }
}

async function postTradeAd(account, ad) {
  try {
    const res = await fetch("https://www.rolimons.com/tradeads/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `verification=${account.token}`
      },
      body: JSON.stringify(ad)
    });
    if (res.ok) {
      signale.success(`Posted ad for ${account.robloxId}`);
    } else {
      signale.warn(`Failed to post ad for ${account.robloxId}: ${res.status}`);
    }
  } catch (err) {
    signale.error(`Error posting ad for ${account.robloxId}`, err);
  }
}

async function buildAd(account) {
  const inventory = await getInventory(account.robloxId);
  if (config.smartAlgo.enabled) {
    const sending = inventory.slice(0, config.smartAlgo.maxSendItems).map(i => i.assetId);
    const receiving = inventory.slice(0, config.smartAlgo.maxReceiveItems).map(i => i.assetId);
    return { sending, receiving, tags: config.smartAlgo.tags };
  } else if (config.specificItems.enabled) {
    return {
      sending: config.specificItems.sendingItems,
      receiving: config.specificItems.receivingItems,
      tags: config.specificItems.tags
    };
  }
  return null;
}

async function run() {
  await fetchItemValues();
  for (const account of config.accounts) {
    const ad = await buildAd(account);
    if (ad) await postTradeAd(account, ad);
  }
}

setInterval(run, 25 * 60 * 1000); // every 25 minutes
run();
