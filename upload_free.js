const fs = require('fs');
const https = require('https');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const html = fs.readFileSync('standalone.html');

let header = '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n' +
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="fileToUpload"; filename="tv_app.html"\r\n' +
  'Content-Type: text/html\r\n\r\n';

let footer = '\r\n--' + boundary + '--\r\n';

const fullBody = Buffer.concat([
  Buffer.from(header, 'utf8'),
  html,
  Buffer.from(footer, 'utf8')
]);

const req = https.request({
  hostname: 'catbox.moe',
  path: '/user/api.php',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': fullBody.length,
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  let result = '';
  res.on('data', chunk => result += chunk);
  res.on('end', () => {
    console.log('UPLOAD_RESULT:', result.trim());
  });
});

req.on('error', (err) => {
  console.error('Upload Error:', err.message);
});

req.write(fullBody);
req.end();
