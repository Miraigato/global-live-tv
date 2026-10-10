const https = require('https');
const http = require('http');
const fs = require('fs');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      rejectUnauthorized: false,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentInfo = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const tvgCountryMatch = line.match(/tvg-country="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);

      const commaIdx = line.lastIndexOf(',');
      let rawName = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : 'Channel';

      currentInfo = {
        id: tvgIdMatch ? tvgIdMatch[1] : '',
        name: rawName || (tvgNameMatch ? tvgNameMatch[1] : 'Channel'),
        logo: tvgLogoMatch ? tvgLogoMatch[1] : '',
        country: tvgCountryMatch ? tvgCountryMatch[1].toUpperCase() : '',
        category: groupMatch ? groupMatch[1] : 'General',
        url: ''
      };
    } else if (!line.startsWith('#') && currentInfo) {
      currentInfo.url = line;
      // Only keep streamable formats / urls
      if (currentInfo.url.startsWith('http')) {
        channels.push(currentInfo);
      }
      currentInfo = null;
    }
  }
  return channels;
}

async function buildDatabase() {
  console.log('Downloading iptv-org playlists...');
  try {
    const m3uData = await fetchUrl('https://iptv-org.github.io/iptv/index.country.m3u');
    console.log(`Downloaded ${m3uData.length} bytes of playlist data.`);
    const allChannels = parseM3U(m3uData);
    console.log(`Parsed ${allChannels.length} total channels.`);

    // Also fetch countries list for labels and flags
    let countryMap = {};
    try {
      const countriesRaw = await fetchUrl('https://iptv-org.github.io/api/countries.json');
      const countriesList = JSON.parse(countriesRaw);
      for (const c of countriesList) {
        countryMap[c.code] = { name: c.name, flag: c.flag || '' };
      }
    } catch (e) {
      console.warn('Could not fetch countries metadata, proceeding with basic map.');
    }

    // Enhance channels with country flag / name
    for (const ch of allChannels) {
      if (!ch.country && ch.id) {
        const parts = ch.id.split('.');
        if (parts.length > 1) {
          const code = parts[1].split('@')[0].toUpperCase();
          if (code.length === 2) ch.country = code;
        }
      }
      const cMeta = countryMap[ch.country];
      ch.countryName = cMeta ? cMeta.name : (ch.country || 'International');
      ch.flag = cMeta ? cMeta.flag : '🌐';
    }

    // Filter to top quality / accessible streams: prioritising https, non-empty name, logo
    // Let's filter out obviously broken or adult channels
    const filtered = allChannels.filter(c => {
      const cat = (c.category || '').toLowerCase();
      if (cat.includes('xxx') || cat.includes('adult') || cat.includes('nsfw')) return false;
      return true;
    });

    console.log(`Filtered to ${filtered.length} clean channels.`);

    // Save full data and lightweight version
    fs.writeFileSync('channels.json', JSON.stringify(filtered, null, 2), 'utf8');
    console.log('Saved channels.json successfully!');
  } catch (err) {
    console.error('Error generating channel database:', err);
  }
}

buildDatabase();
