const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5177);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'x-content-type-options': 'nosniff',
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
}

function safePublicPath(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const decoded = decodeURIComponent(requested);
  const resolved = path.normalize(path.join(PUBLIC_DIR, decoded));
  return resolved.startsWith(PUBLIC_DIR) ? resolved : null;
}

function normalizeYouTubeTarget(raw) {
  const value = raw.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return { kind: 'video', value };
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(value)) return { kind: 'channelPath', value: `channel/${value}` };
  if (/^@[a-zA-Z0-9_.%-]{3,270}$/.test(value)) return { kind: 'channelPath', value };
  if (/^[a-zA-Z0-9_-]{1,100}$/.test(value)) return { kind: 'channelPath', value: `c/${value}` };

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return { kind: 'video', value: id };
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const watchId = url.searchParams.get('v');
      if (/^[a-zA-Z0-9_-]{11}$/.test(watchId || '')) return { kind: 'video', value: watchId };
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'channel' && /^UC[a-zA-Z0-9_-]{22}$/.test(parts[1] || '')) {
        return { kind: 'channelPath', value: `channel/${parts[1]}` };
      }
      if ((parts[0] || '').startsWith('@')) return { kind: 'channelPath', value: parts[0] };
      if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) {
        return { kind: 'channelPath', value: `${parts[0]}/${parts[1]}` };
      }
    }
  } catch {}

  return null;
}

async function resolveYouTubeLive(raw) {
  const target = normalizeYouTubeTarget(raw);
  if (!target) return { ok: false, error: '?좏뒠釉??곸긽 ID, 梨꾨꼸 ID, ?몃뱾, 留욎땄 URL???몄떇?섏? 紐삵뻽?듬땲??' };
  if (target.kind === 'video') return { ok: true, id: target.value };

  const response = await fetch(`https://www.youtube.com/${target.value}/live`, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 stream-wall local resolver'
    }
  });

  if (!response.ok) return { ok: false, error: '?좏뒠釉??쇱씠釉??섏씠吏瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??' };

  const html = await response.text();
  const patterns = [
    /"videoId":"([a-zA-Z0-9_-]{11})"/,
    /watch\?v=([a-zA-Z0-9_-]{11})/,
    /"url":"\/watch\?v=([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return { ok: true, id: match[1] };
  }

  return { ok: false, error: '?꾩옱 吏꾪뻾 以묒씤 ?좏뒠釉??쇱씠釉??곸긽??李얠? 紐삵뻽?듬땲??' };
}

async function handleApi(req, res, url) {
  if (url.pathname !== '/api/youtube-live') return false;
  const target = url.searchParams.get('target') || '';
  if (!target.trim()) {
    sendJson(res, 400, { ok: false, error: 'target 媛믪씠 ?꾩슂?⑸땲??' });
    return true;
  }

  try {
    sendJson(res, 200, await resolveYouTubeLive(target));
  } catch (error) {
    sendJson(res, 502, { ok: false, error: '?좏뒠釉??쇱씠釉??뺤씤 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' });
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    send(res, 405, 'Method Not Allowed', { allow: 'GET, HEAD' });
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`);
  if (await handleApi(req, res, url)) return;

  const filePath = safePublicPath(url.pathname);
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, 'Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, req.method === 'HEAD' ? '' : data, {
      'content-type': MIME_TYPES[ext] || 'application/octet-stream'
    });
  });
});

server.listen(PORT, () => {
  console.log(`Stream Wall is running at http://localhost:${PORT}`);
});
