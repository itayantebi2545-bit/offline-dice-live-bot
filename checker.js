const admin = require('firebase-admin');
const { TikTokLiveConnection } = require('tiktok-live-connector');

const streamers = [
  'rakannootrades',
  'premanpvpreal1',
  'itamarba23',
  'frozy777',
  'arielzlatanroblox11',
  'fi1nkorb',
  'avg_x1ro',
  'kuragam15',
  'richardsnry_',
  'no1x_zzin0',
  'liamking_4000'
];

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://offline-dice-verify-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

async function checkIsLive(username) {
  try {
    const connection = new TikTokLiveConnection(username);
    const isLive = await connection.fetchIsLive();
    return !!isLive;
  } catch (error) {
    console.log(`Failed to check @${username}: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log("Checking streamer live statuses...");
  const updates = {};

  for (const username of streamers) {
    const isLive = await checkIsLive(username);
    updates[username] = isLive;
    console.log(`@${username} -> ${isLive ? 'LIVE' : 'Offline'}`);
  }

  await db.ref('streamer_live_status').update(updates);
  console.log("Firebase updated successfully!");
  process.exit(0);
}

run();
