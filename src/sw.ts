import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "serwist";

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
    // Static assets - Cache first for performance
    {
      matcher: ({ request }) => 
        request.destination === 'style' || 
        request.destination === 'script' || 
        request.destination === 'font',
      handler: new CacheFirst({
        cacheName: 'static-assets',
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