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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  const url = `https://www.tiktok.com/@${username}/live`;

  const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      const response = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });

      // If TikTok blocks or rate-limits the cloud runner, return null instead of false
      if (response.status === 429 || response.status === 403 || !response.ok) {
        console.log(`@${username} -> Request blocked/rate-limited (${response.status})`);
        return null; 
      }

      const html = await response.text();

      if (html.includes('captcha') || html.includes('verify-page')) {
        console.log(`@${username} -> TikTok CAPTCHA wall detected`);
        return null;
      }

      return html.includes('"status":2') || 
             html.includes('"roomStatus":2') || 
             (html.includes('liveRoom') && html.includes('stream_url'));
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed for @${username}: ${error.message}`);
      await sleep(1000);
    }
  }

  return null;
}

async function run() {
  console.log("Checking daily reset and streamer live statuses...");
  
  await handleDailyReset();

  // Read existing live states from Firebase first
  const snapshot = await db.ref('streamer_live_status').once('value');
  const currentStatuses = snapshot.val() || {};
  const updates = {};

  for (const username of streamers) {
    const isLive = await checkIsLive(username);
    
    if (isLive === null) {
      // Retain existing live status from Firebase if TikTok blocked the request
      updates[username] = currentStatuses[username] ?? false;
      console.log(`@${username} -> Kept Existing Status (${updates[username] ? 'LIVE' : 'Offline'})`);
    } else {
      updates[username] = isLive;
      console.log(`@${username} -> ${isLive ? 'LIVE' : 'Offline'}`);
    }

    // 2-second delay between requests to avoid rate limits
    await sleep(2000);
  }

  await db.ref('streamer_live_status').update(updates);
  console.log("Firebase updated successfully!");
  process.exit(0);
}

run();
