const admin = require('firebase-admin');

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
    const url = `https://www.tiktok.com/@${username}/live`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) return false;

    const html = await response.text();

    return html.includes('"status":2') || 
           html.includes('"roomStatus":2') || 
           (html.includes('liveRoom') && html.includes('stream_url'));
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
