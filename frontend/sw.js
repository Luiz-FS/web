(function () {
    'use strict';

    importScripts('https://www.gstatic.com/firebasejs/5.4.2/firebase-app.js');
    importScripts('https://www.gstatic.com/firebasejs/5.4.2/firebase-messaging.js');
    importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.6.3/workbox-sw.js');
    importScripts('app/firebase-config.js');
    importScripts('app/config.js');
    // if the line number of the code below changes, modify the /ecis script.
    const CACHE_SUFIX = 'master';

    const openedNotifications = {};

    let messaging;

    function setupFirebase() {
        firebase.initializeApp(FIREBASE_CONFIG);
        messaging = firebase.messaging();
    };

    workbox.core.setCacheNameDetails({
        prefix: 'plataforma-cis',
        suffix: CACHE_SUFIX
    });

    const precacheCacheName = workbox.core.cacheNames.precache;
    const runtimeCacheName = workbox.core.cacheNames.runtime;

    async function addToCache(urls) {
        const myCache = await caches.open(precacheCacheName);
        await myCache.addAll(urls);
    }

    /**
     * Clear old version caches.
     */
    function clearOldCache() {
        return caches.keys().then((keys) => {keys.filter((key) => !key.includes(CACHE_SUFIX)).map((key) => caches.delete(key))});
    }

    self.addEventListener('activate', (event) => {
        event.waitUntil(clearOldCache());
    });

    /**
     * Intercepts the incoming PushEvents and
     * personalizes the data setting up a vibration pattern,
     * a badge image and an url to redirect the user when
     * he clicks on the notification.
     */
    self.addEventListener('push', (event) => {
        event.stopImmediatePropagation();

        let options;

        if(event.data) {
            options = event.data.json().notification;
            options.data = {
                url: options.click_action
            };

            const body = JSON.parse(options.body);

            options.tag = body.type;
            options.vibrate = [100, 50, 100];
            options.badge = options.icon;

            if(!openedNotifications[options.tag]) {
              openedNotifications[options.tag] = 1;
            } else {
              openedNotifications[options.tag] +=1
            }

            options.body = `${body.data} (${openedNotifications[options.tag]})`;

            event.waitUntil(self.registration.showNotification(options.title, options));
          }
    });

    /**
     * Handles the notificationclick event.
     * If the action is different of close
     * a new tab is opened with the url contained
     * in the notification.
     */
    self.addEventListener('notificationclick', (event) => {
        const { notification } = event;

        const { action } = event;

        if(action !== 'close') {
            const { url } = notification.data;
            clients.openWindow(url);
        }

        openedNotifications[notification.tag] = 0;
        notification.close();
    });

    workbox.routing.registerRoute(
        ({ event }) => event.request.mode === 'navigate',
        ({ url }) => fetch(url.href).catch(() => caches.match('/'))
    );

    workbox.routing.registerRoute(
        /\.(?:png|gif|jpg|jpeg|svg)$/,
        workbox.strategies.cacheFirst({
        cacheName: 'images',
        plugins: [
            new workbox.expiration.Plugin({
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
        })
    );

    workbox.routing.registerRoute(
        /\.(?:js|css|html)$/,
        workbox.strategies.staleWhileRevalidate({
            cacheName: precacheCacheName,
        })
    );

    workbox.routing.registerRoute(
        new RegExp(Config.BACKEND_URL),
        workbox.strategies.networkFirst({
            cacheName: runtimeCacheName
        })
    );

    (function initSw() {
        self.skipWaiting();
        setupFirebase();
        addToCache(['/']);
    })();
})();
