import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { NetworkFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // HTML pages - Network first strategy for dynamic content
    {
      matcher: ({ request, url }) => 
        request.destination === 'document' || 
        url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
      }),
    },
    // Static assets - Revalidate in the background to avoid serving stale chunks
    {
      matcher: ({ request }) =>
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font',
      handler: new StaleWhileRevalidate({
        cacheName: 'static-assets-v2',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },
    // Images - Stale while revalidate for balance of performance and freshness
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new StaleWhileRevalidate({
        cacheName: 'images-cache',
      }),
    },
    // Fallback to default cache for everything else
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();