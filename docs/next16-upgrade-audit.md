# Auditoría de migración a Next.js 16 y plan de contingencia

- **Fecha:** 2026-11-19
- **Estado:** solo auditoría; **no ejecutada**
- **Repo:** `atbcn2` (`C:\Users\misse\Desktop\atbcn_info\atbcn2`)
- **Referencia:** `main` en `de490e6`; auditoría realizada sobre la rama local `feat/filters`

## Versiones observadas

| Elemento | Valor |
|---|---|
| `package.json` → `next` | `14.2.35` |
| `node_modules` → `next` | `14.2.3` (`invalid: "14.2.35" from the root project`) |
| React / React DOM | `18.3.1` |
| Node instalado | `v24.19.0` |
| `engines.node` | `22.x` |
| `@supabase/ssr` | `0.0.10` |
| `@serwist/next` | `9.2.3` |

> Antes de cualquier migración conviene alinear `node_modules` con el lockfile (`npm ci`).

## Veredicto

La migración a Next.js 16 es **viable pero no es un bump de versión**: implica cambios de código, de dependencias y de herramientas. El riesgo se gestiona con fases, gates de verificación y rollback; no se puede garantizar "cero incidencias" sin ejecutarla y probarla.

## Bloqueadores de código

| Archivo | Problema | Acción prevista |
|---|---|---|
| `lib/supabase/index.ts:7,15` | `cookies()` se usa de forma síncrona | Pasar a `await cookies()` y adaptar el cliente a `@supabase/ssr` moderno |
| `middleware.ts:4,19` | Usa helper con `next/headers` desde middleware | Renombrar a `proxy.ts`, exportar `proxy`, runtime Node y leer cookies de `req.cookies` |
| `app/layout.tsx:12,15` | `dynamic(..., { ssr: false })` en Server Component | Quitar `ssr: false` (`pwa.tsx` ya es `'use client'`) |
| `app/offline.tsx:13` | `onClick` sin directiva cliente | Añadir `'use client'` |
| `package.json:9,67` | `next lint` desaparece; `eslint-config-next` es 14.0.4 | Migrar a ESLint CLI y `eslint-config-next` 16 |
| React 18.3.1 | Next 16 requiere React 19.x | Actualizar `react`, `react-dom` y `@types/react*` |

No se encontraron usos de `headers()`, `params`, `searchParams` ni `draftMode()` que requieran el codemod asíncrono, pero se pasará el codemod correspondiente por si acaso.

## Dependencias críticas

| Paquete | Actual | Objetivo | Riesgo / nota |
|---|---|---|---|
| `next` | 14.2.35 (instalado 14.2.3) | `16.4.x` | Alto |
| `react`, `react-dom` | 18.3.1 | 19.x | Alto |
| `@types/react`, `@types/react-dom` | 18.3.x | 19.x | Medio |
| `@types/node` | 22.19.1 | 24.x | Bajo; revisar `engines.node` |
| `next-cloudinary` | 5.18.0 | 7.x (`7.1.1`) | Alto: peers `next ^16`, `react ^18.2 \|\| ^19`, Node ≥22; revisar callbacks (`onUpload` → `onSuccess`) |
| `framer-motion` | 10.18.0 | 11+ / 12.x | Alto: peer `react ^18` |
| `@supabase/ssr` | 0.0.10 | 0.6+ | Alto: cambia la API de cookies |
| `@testing-library/react` | 14.3.1 | 16.x | Alto: soporte React 19 |
| `react-datepicker` | 4.25.0 | 8/9 | Medio-alto: cambios de API |
| `react-day-picker` | 8.10.0 | 9/10 | Medio-alto: cambios de API |
| `next-themes` | 0.2.1 | 0.4.x | Medio: imports de tipos |
| `@serwist/next`, `@serwist/sw`, `@serwist/precaching` | 9.2.3 | 9.5.x | Medio; ver decisión más abajo |
| `eslint`, `eslint-config-next` | 8.57.1 / 14.0.4 | ESLint 9+ / config-next 16 | Medio-alto |
| `@hookform/resolvers` + `zod` | 3.10.0 / 3.22.4 | revisar | Media: resolvers recientes exigen `zod ^3.25 \|\| 4` |

Las versiones objetivo son orientativas; confirmar con `npm view <paquete> peerDependencies` en el momento de la ejecución.

## Decisión Serwist / Turbopack

**Mantener webpack.** Next.js 16 activa Turbopack por defecto y el wrapper actual `withSerwist` está basado en webpack. Para minimizar cambios:

- El script de build pasará a `"build": "next build --webpack"`.
- No se migrará al *config mode* de Serwist 9.3+ ni a Turbopack en esta fase.
- `next.config.js` conserva `swSrc: 'src/sw.ts'`, `swDest: 'public/sw.js'` y `disable: NODE_ENV === 'development'`.

## Comandos y fuentes

- `npx next@canary upgrade --agent=latest`
- `npx @next/codemod@canary upgrade latest`
- `npx @next/codemod@canary next-async-request-api .`
- Migración de `next lint` a ESLint CLI según la guía oficial.
- Fuentes:
  - https://nextjs.org/docs/app/guides/upgrading/version-16
  - https://www.npmjs.com/package/next-cloudinary
  - https://cloudinary.com/documentation/nextjs_integration

## Plan por fases

| Fase | Contenido | Gate de salida |
|---|---|---|
| 0 | Rama `chore/next16-upgrade` desde `origin/main`, tag `backup/pre-next16`, baseline de `npm test`, `npm run lint`, `npm run build` y smoke Cypress | Baseline guardado |
| 1 | Dependencias + `next.config.js` + script `--webpack` | `npm run build` verde |
| 2 | Codemods + arreglos manuales de bloqueadores | Build + tests verdes |
| 3 | Testing Library 16, arreglo de `PreviewModal.test.tsx`, estabilización de Cypress | Suite completa verde |
| 4 | Regenerar `public/sw.js` y QA manual PWA | Instalación/offline/update OK |
| 5 | Preview deployment con env vars, smoke manual, monitoring 24-48 h, merge | Deploy estable |

## Contingencia y rollback

- Cada fase termina en un commit: revert local con `git revert <sha>` o vuelta al tag `backup/pre-next16`.
- Los filtros de `feat/filters` ya están integrados en la rama de trabajo; la migración debe arrancar de una `main` que los incluya, nunca de una rama de filtros aislada.
- En Vercel: *Instant Rollback* al deployment anterior; es más rápido que revertir y redeployar.
- Restaurar también el `public/sw.js` anterior: los clientes con el SW nuevo pueden seguir sirviendo chunks cacheados y necesitar limpiar datos del sitio (caso ya visto en Chrome con `ChunkLoadError`).
- Criterios de aborto: build rojo tras dos intentos, tests nuevos fallidos, fallo en login/alta de evento/PWA o errores sostenidos en el preview deployment.
- No hay CI ni feature flags: la validación es manual y debe seguir el checklist siguiente.

## Checklist de QA manual

- Home sin loader bloqueado; navegación semanal y scroll al cambiar de semana.
- Filtros globales por día, sala y estilos desde el modal `Filtres`: `Aplica` muestra resultados de todas las semanas futuras y `Treu filtres` vuelve a la semana anterior.
- Modal de detalle, copiar evento y enlace de calendario.
- Login (email y Gmail) y alta de evento en 4 pasos con autocompletado de sala.
- Panel de moderación y endpoint de limpieza de eventos.
- PWA: instalación, offline, actualización y caché de chunks.
- Tema oscuro y analítica.

## Estado actual

Documentación de apoyo para la versión `2.7`, con filtros y arreglo del service worker ya integrados en la rama de trabajo. La migración a Next 16 **no se ha ejecutado**; cuando se aborde, se seguirá este documento y se actualizará con los resultados reales.
