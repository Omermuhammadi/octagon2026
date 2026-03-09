const https = require('https');

const topics = [
  { key: 'stance', query: 'wrestling+stance+basics+tutorial' },
  { key: 'penetration_step', query: 'wrestling+penetration+step+drill' },
  { key: 'sprawl', query: 'wrestling+sprawl+technique+drill' },
  { key: 'double_leg', query: 'wrestling+double+leg+takedown+tutorial' },
  { key: 'single_leg', query: 'wrestling+single+leg+takedown+tutorial' },
  { key: 'snap_down', query: 'wrestling+snap+down+front+headlock+technique' },
  { key: 'cradle', query: 'wrestling+cradle+pin+tutorial+cross+face' },
  { key: 'half_nelson', query: 'wrestling+half+nelson+pin+technique+tutorial' },
  { key: 'standup_escape', query: 'wrestling+stand+up+escape+bottom+position' },
  { key: 'chain_wrestling', query: 'wrestling+chain+wrestling+drill+tutorial' },
  { key: 'hand_fighting', query: 'wrestling+hand+fighting+tie+ups+tutorial' },
  { key: 'high_crotch', query: 'wrestling+high+crotch+takedown+series' },
  { key: 'ankle_pick', query: 'wrestling+ankle+pick+technique+tutorial' },
  { key: 'gut_wrench', query: 'wrestling+tight+waist+gut+wrench+tutorial' },
  { key: 'leg_riding', query: 'wrestling+leg+riding+tutorial' },
  { key: 'sit_out', query: 'wrestling+sit+out+escape+technique' },
  { key: 'body_lock', query: 'wrestling+body+lock+takedown+tutorial' },
  { key: 'arm_drag', query: 'wrestling+arm+drag+technique+tutorial' },
  { key: 'over_under', query: 'wrestling+clinch+over+under+position' },
  { key: 'conditioning', query: 'wrestling+conditioning+drills+circuit' },
];

function searchYouTube(topic) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/results?search_query=${topic.query}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = data.match(/"videoId":"([^"]+)"/g);
        if (matches) {
          const unique = [...new Set(matches.map(m => m.match(/"videoId":"([^"]+)"/)[1]))];
          resolve({ key: topic.key, ids: unique.slice(0, 5) });
        } else {
          resolve({ key: topic.key, ids: [] });
        }
      });
    }).on('error', (err) => {
      resolve({ key: topic.key, ids: [], error: err.message });
    });
  });
}

async function main() {
  const results = [];
  // Process in batches of 5
  for (let i = 0; i < topics.length; i += 5) {
    const batch = topics.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(searchYouTube));
    results.push(...batchResults);
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
