// Only the static offline page is cached. Never cache authenticated API responses or private journeys.
self.addEventListener('install',e=>{e.waitUntil(caches.open('yatra-static-v3').then(c=>c.addAll(['/offline.html','/icon.svg'])));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.delete('yatri-static-v1'),caches.delete('yatra-static-v2'),self.clients.claim()])));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>caches.match('/offline.html')));});
