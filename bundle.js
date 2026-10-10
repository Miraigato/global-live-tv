const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
let js = fs.readFileSync('app.js', 'utf8');
const channels = fs.readFileSync('channels.json', 'utf8');
const vod = fs.existsSync('vod.json') ? fs.readFileSync('vod.json', 'utf8') : '[]';

// Inline CSS
html = html.replace('<link rel="stylesheet" href="style.css" />', '<style>\n' + css + '\n</style>');

const inlinedScript = `
<script>
window.EMBEDDED_CHANNELS = ${channels};
window.EMBEDDED_VOD = ${vod};
${js}
</script>
`;

html = html.replace('<script src="app.js"></script>', inlinedScript);

fs.writeFileSync('standalone.html', html, 'utf8');
console.log('standalone.html created successfully with embedded Live channels and VOD library!');
