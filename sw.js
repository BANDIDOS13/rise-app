const CACHE_NAME = 'rise-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/rise-landing.html',
  'https://fonts.googleapis.com/css2?family=Clash+Display:wght@500;600;700&family=Satoshi:wght@400;500;700&display=swap'
];

const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RISE — Hors ligne</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#07080a;color:#f0ece4;font-family:'Satoshi',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center}
.container{max-width:400px}
.logo{font-family:'Clash Display',sans-serif;font-size:36px;font-weight:700;letter-spacing:3px;background:linear-gradient(135deg,#d4aa4a,#e8c86a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px}
.icon{font-size:64px;margin-bottom:20px}
h1{font-size:20px;margin-bottom:12px;color:#f0ece4}
p{color:#8a9099;font-size:14px;line-height:1.6;margin-bottom:24px}
button{padding:12px 32px;background:linear-gradient(135deg,#d4aa4a,#e8c86a);color:#07080a;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:transform .2s}
button:hover{transform:scale(1.05)}
</style>
</head>
<body>
<div class="container">
<div class="icon">📡</div>
<div class="logo">RISE</div>
<h1>Tu es hors ligne</h1>
<p>Pas de connexion internet détectée. Vérifie ta connexion et réessaie. Tes données locales sont sauvegardées.</p>
<button onclick="location.reload()">Réessayer</button>
</div>
</body>
</html>`;

// Install: cache core assets + offline page
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      cache.put(new Request('/_offline'), new Response(OFFLINE_PAGE, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }));
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache, then offline page
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Skip API calls from caching
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/_offline');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
