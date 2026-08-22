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

function getESTDateString() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

async function handleDailyReset() {
  const todayEST = getESTDateString();
  const statsRef = db.ref('global_stats');
  
  await statsRef.transaction((data) => {
    if (!data || typeof data !== 'object') {
      return { total_dices: 0, last_reset_date: todayEST };
    }
    if (data.last_reset_date !== todayEST) {
      data.total_dices = 0;
      data.last_reset_date = todayEST;
    }
    return data;
  });
}

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
  console.log("Checking daily reset and streamer live statuses...");
  
  await handleDailyReset();

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
