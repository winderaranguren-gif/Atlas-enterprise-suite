const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const root = path.resolve(__dirname);
const types = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.ico':'image/x-icon'
};

function networkUrls() {
  const urls = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const info of entries || []) {
      if (info.family === 'IPv4' && !info.internal) urls.push(`http://${info.address}:${port}`);
    }
  }
  return [...new Set(urls)];
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
    return res.end(JSON.stringify({ ok:true, app:'ATLAS Enterprise Suite', port }));
  }

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403, { 'Content-Type':'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) filePath = path.join(root, 'index.html');
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type':'text/plain; charset=utf-8' });
        return res.end('Server error');
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control':'no-store'
      });
      res.end(data);
    });
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Close the other ATLAS server or run with PORT=4174 npm start.`);
  } else if (err.code === 'EACCES') {
    console.error(`Permission denied while opening port ${port}. Try a different port.`);
  } else {
    console.error('ATLAS server error:', err.message);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log('\nATLAS Enterprise Suite is running.');
  console.log(`Local:   http://127.0.0.1:${port}`);
  for (const url of networkUrls()) console.log(`Network: ${url}`);
  console.log(`Health:  http://127.0.0.1:${port}/healthz`);
  console.log('\nKeep this terminal open while using ATLAS.');
  console.log('For a phone/tablet, use a Network address above and keep both devices on the same Wi-Fi.\n');
});
