const CACHE_NAME = 'pickem-pro-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic fetch handler to satisfy PWA requirements
  // For a real offline experience, you would cache assets here
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline content');
    })
  );
});
