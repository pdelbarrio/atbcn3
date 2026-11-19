# PWA Implementation Guide

## Overview

This document describes the Progressive Web App (PWA) implementation in the @bcn project using Serwist (a successor to next-pwa).

## Key Components

### 1. Service Worker (`src/sw.ts`)

The service worker is the core of the PWA functionality, handling:

- **Precaching**: Automatically caches critical assets during installation
- **Runtime caching**: Uses different strategies for different resource types:
  - Network-first for HTML pages and API requests
  - Stale-while-revalidate for static assets (CSS, JS, fonts)
  - Stale-while-revalidate for images
- **Offline fallback**: Redirects to `/offline` page when network requests fail
- **Update management**: Handles service worker updates with skipWaiting and clientsClaim

### 2. PWA Component (`app/pwa.tsx`)

Client-side component that:

- Registers the service worker only in production (`NODE_ENV === 'production'`, via `lib/pwa-registration.ts`), matching the `disable` flag in `next.config.js`
- Removes any previous registration when running outside production, so a stale development build cannot serve cached chunks
- Provides installation prompt using `@khmyznikov/pwa-install`
- Handles service worker status and updates

### 3. Offline Page (`app/offline.tsx`)

Fallback page shown when the user is offline and requests a page that isn't cached.

### 4. Manifest (`public/manifest.json`)

Defines the application metadata for installation:

- App name, description, and icons
- Theme colors and display mode
- Start URL and orientation

### 5. TypeScript Support

Custom type definitions in `types/pwa-install.d.ts` for the web component.

## Caching Strategies

1. **Network First** (for dynamic content)
   - Tries network first with a timeout
   - Falls back to cache if network fails
   - Best for frequently updated content

2. **Stale While Revalidate with expiration** (for static assets)
   - Serves from cache immediately
   - Revalidates in the background and expires entries after 7 days
   - Avoids serving stale JS chunks after a deploy

3. **Stale While Revalidate** (for images)
   - Serves from cache immediately
   - Updates cache in background
   - Balance between performance and freshness

## Update Handling

The PWA implementation includes a mechanism to notify users when a new version is available, prompting them to refresh the page to apply updates.

## Testing PWA Features

1. **Installation**: Test the install prompt on supported browsers
2. **Offline mode**: Test by disabling network in DevTools
3. **Caching**: Verify assets are properly cached using Application tab in DevTools
4. **Updates**: Test the update notification flow

## Troubleshooting

- **Service Worker not registering**: Check console for errors and confirm the build is production. In development the worker is intentionally not registered and any previous registration is removed.
- **Stale chunks after a deploy**: static assets now use stale-while-revalidate with expiration; hard-refresh or clear site data if an old chunk still loads
- **Assets not caching**: Verify cache configuration in service worker
- **Updates not detected**: Check update event listeners

## Future Enhancements

- Push notifications implementation
- Background sync for offline data submission
- Improved asset caching strategies
- Enhanced offline experience with more cached content