const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
let js = fs.readFileSync('app.js', 'utf8');
const channels = fs.readFileSync('channels.json', 'utf8');

// Inline CSS
html = html.replace('<link rel="stylesheet" href="style.css" />', '<style>\n' + css + '\n</style>');

// Preload channels directly into JS so no external fetch is needed anywhere!
js = js.replace("const res = await fetch('channels.json');", "/* inlined */");
js = js.replace("allChannels = await res.json();", "allChannels = window.EMBEDDED_CHANNELS;");

const inlinedScript = `
<script>
window.EMBEDDED_CHANNELS = ${channels};
${js}
</script>
`;

html = html.replace('<script src="app.js"></script>', inlinedScript);

fs.writeFileSync('standalone.html', html, 'utf8');
console.log('standalone.html created successfully!');
