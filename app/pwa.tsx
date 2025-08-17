'use client';

import { useEffect, useState } from 'react';
import '@khmyznikov/pwa-install';

export default function PWA() {
  const [swStatus, setSwStatus] = useState<'loading' | 'registered' | 'failed'>('loading');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
        setSwStatus('loading');
        navigator.serviceWorker.register('/sw.js').then(
          function (registration) {
            console.log('Service Worker registration successful with scope: ', registration.scope);
            setSwStatus('registered');

            // Add update checking
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker?.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show a notification if you want
                  if (confirm('Nova versió disponible. Actualitzar ara?')) {
                    window.location.reload();
                  }
                }
              });
            });
          },
          function (err) {
            console.log('Service Worker registration failed: ', err);
            setSwStatus('failed');
          }
        );
      }
    }
  }, []);

  return (
    <>
      {swStatus === 'failed' && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          Error al carregar PWA. Recarrega la pàgina.
        </div>
      )}
      <pwa-install 
        app-name="@bcn"
        app-icon="/icons/icon-512x512.png"
        app-description="Agenda online"
        install-button-text="Instal·lar"
        close-button-text="Tancar"
        install-description-text="Instal·la l'aplicació per accedir-hi més ràpidament"
      ></pwa-install>
    </>
  );
}