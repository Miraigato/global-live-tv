async function scanMcQuack() {
  const working = [];
  const ids = [];
  for (let i = 1; i <= 100; i++) ids.push(i);
  for (let i = 280; i <= 400; i++) ids.push(i);

  for (const id of ids) {
    const url = 'http://stream.mcquack.net/' + id + '/index.m3u8';
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(1500) });
      if (res.status === 200) {
        working.push(id);
      }
    } catch(e) {}
  }
  console.log('Working mcquack IDs:', JSON.stringify(working));
}
scanMcQuack();
