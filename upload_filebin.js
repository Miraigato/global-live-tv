const fs = require('fs');
const https = require('https');

const binId = 'globaltv-' + Math.random().toString(36).substring(2, 8);
const content = fs.readFileSync('standalone.html');

const req = https.request('https://filebin.net/' + binId + '/index.html', {
  method: 'POST',
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': content.length,
    'bin': binId,
    'filename': 'index.html'
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('PUBLIC_URL: https://filebin.net/' + binId + '/index.html');
    } else {
      console.log('Response body:', body.slice(0, 200));
    }
  });
});

req.on('error', console.error);
req.write(content);
req.end();
