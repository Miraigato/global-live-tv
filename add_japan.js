const fs = require('fs');

async function addJapanChannels() {
  try {
    let channels = JSON.parse(fs.readFileSync('channels.json', 'utf8'));
    const res = await fetch('https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_japan.m3u8');
    const text = await res.text();
    const lines = text.split('\n');

    let current = null;
    let added = 0;

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('#EXTINF:')) {
        const nameMatch = line.match(/tvg-name="([^"]*)"/);
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        const commaIdx = line.lastIndexOf(',');
        const rawName = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : (nameMatch ? nameMatch[1] : 'Japan Channel');
        current = {
          name: rawName || (nameMatch ? nameMatch[1] : 'Japan TV'),
          logo: logoMatch ? logoMatch[1] : '',
          country: 'JP',
          countryName: 'יפן',
          flag: '🇯🇵',
          category: 'Japan TV',
          url: ''
        };
      } else if (line.startsWith('http') && current) {
        current.url = line;
        if (!channels.some(c => c.url === current.url)) {
          channels.push(current);
          added++;
        }
        current = null;
      }
    }

    console.log('Successfully added new Japanese channels:', added);
    console.log('Total JP channels now:', channels.filter(c => c.country === 'JP').length);
    fs.writeFileSync('channels.json', JSON.stringify(channels, null, 2), 'utf8');
  } catch (err) {
    console.error('Error adding Japan channels:', err);
  }
}

addJapanChannels();
