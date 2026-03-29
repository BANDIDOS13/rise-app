// FORGE Service Worker — Offline-First PWA + Push Notifications
const CACHE_NAME = 'forge-v10-cache-1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
];

// --- Notification Messages Pool ---
const MORNING_MESSAGES = [
  {title:'FORGE — Nouveau jour, nouveau toi',body:'Ton check-in du matin t\'attend. Chaque jour compte !'},
  {title:'FORGE — C\'est l\'heure !',body:'Commence ta journee en Forgeur. Check-in + quetes du jour'},
  {title:'FORGE — 1% aujourd\'hui',body:'Un petit pas de plus vers ta meilleure version. Go check-in !'},
  {title:'FORGE — Leve-toi et forge',body:'Les champions se construisent le matin. Ton rituel t\'attend.'},
  {title:'FORGE — Pret a progresser ?',body:'Tes quetes du jour sont generees. Viens les decouvrir !'},
];

const EVENING_MESSAGES = [
  {title:'FORGE — Bilan du jour',body:'Comment s\'est passee ta journee ? Prends 2 min pour ton journal.'},
  {title:'FORGE — Avant de dormir...',body:'Note tes victoires du jour. Meme les petites comptent !'},
  {title:'FORGE — Fin de journee',body:'Fais le point : quetes, habitudes, gratitude. Tu l\'as merite.'},
];

const STREAK_MESSAGES = [
  {title:'FORGE — Ta streak est en danger !',body:'Tu n\'as pas encore fait ton check-in. Ne perds pas ta serie !'},
  {title:'FORGE — Attention Forgeur !',body:'Plus que quelques heures pour maintenir ta streak. Go !'},
];

let scheduledTimers = [];

// Install: cache core assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Message handler for notification scheduling
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'FORGE_SCHEDULE_NOTIFS') {
    scheduleNotifications(event.data);
  }
});

function scheduleNotifications(data) {
  scheduledTimers.forEach(function(t) { clearTimeout(t); });
  scheduledTimers = [];
  var prefs = data.prefs;

  if (prefs.checkin) {
    var ms = getTimeUntil(prefs.checkin);
    if (ms > 0) scheduledTimers.push(setTimeout(function() {
      var m = MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)];
      showNotif(m.title, m.body, 'forge-morning');
    }, ms));
  }
  if (prefs.evening) {
    var ms2 = getTimeUntil(prefs.evening);
    if (ms2 > 0) scheduledTimers.push(setTimeout(function() {
      var m = EVENING_MESSAGES[Math.floor(Math.random() * EVENING_MESSAGES.length)];
      showNotif(m.title, m.body, 'forge-evening');
    }, ms2));
  }
  if (prefs.streak && data.streak > 0) {
    var ms3 = getTimeUntil('18:00');
    if (ms3 > 0) scheduledTimers.push(setTimeout(function() {
      var m = STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)];
      showNotif(m.title + ' ' + data.streak + 'j', m.body, 'forge-streak');
    }, ms3));
  }
  if (prefs.quest && data.questsDone < data.questsTotal) {
    var ms4 = getTimeUntil('15:00');
    if (ms4 > 0) scheduledTimers.push(setTimeout(function() {
      var r = data.questsTotal - data.questsDone;
      showNotif('FORGE — Quetes en attente', 'Il te reste ' + r + ' quete' + (r>1?'s':'') + ' a completer !', 'forge-quest');
    }, ms4));
  }
  console.log('[FORGE SW] Scheduled', scheduledTimers.length, 'notifications');
}

function getTimeUntil(t) {
  var p = t.split(':');
  var d = new Date();
  d.setHours(parseInt(p[0]), parseInt(p[1]), 0, 0);
  return d.getTime() - Date.now();
}

function showNotif(title, body, tag) {
  self.registration.showNotification(title, {
    body: body,
    icon: '/manifest-icon-192.png',
    badge: '/manifest-icon-192.png',
    tag: tag,
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true,
    actions: [{action:'open',title:'Ouvrir FORGE'},{action:'dismiss',title:'Plus tard'}],
    data: {url:'/'}
  });
}

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cl) {
      for (var i=0; i<cl.length; i++) {
        if (cl[i].url.includes(self.location.origin) && 'focus' in cl[i]) return cl[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url || '/');
    })
  );
});

// Push event (for future server-side push)
self.addEventListener('push', function(event) {
  var data = {title:'FORGE',body:'Nouvelle notification',tag:'forge-push'};
  if (event.data) { try{data=event.data.json();}catch(e){data.body=event.data.text();} }
  event.waitUntil(self.registration.showNotification(data.title, {
    body:data.body, icon:'/manifest-icon-192.png', badge:'/manifest-icon-192.png',
    tag:data.tag||'forge-push', vibrate:[200,100,200], data:{url:data.url||'/'}
  }));
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({reply:null,fallback:true,error:'Mode hors-ligne. JARVIS local prend le relais.'}),
          {status:200,headers:{'Content-Type':'application/json'}});
      })
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var fp = fetch(event.request).then(function(r) {
          if (r.ok) { var c=r.clone(); caches.open(CACHE_NAME).then(function(ch){ch.put(event.request,c);}); }
          return r;
        }).catch(function(){return cached;});
        return cached || fp;
      })
    );
    return;
  }

  // HTML pages: NETWORK-FIRST (always get fresh version, cache as fallback)
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).then(function(r) {
        if (r.ok) { var c=r.clone(); caches.open(CACHE_NAME).then(function(ch){ch.put(event.request,c);}); }
        return r;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Static assets: cache-first (CSS, JS, images)
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(r) {
        if (r.ok && event.request.method==='GET') { var c=r.clone(); caches.open(CACHE_NAME).then(function(ch){ch.put(event.request,c);}); }
        return r;
      }).catch(function() {
        return new Response('',{status:408});
      });
    })
  );
});
