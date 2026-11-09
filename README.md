# HyperLine OTT Web

Standalone source export of `apps/web` from `/opt/hyperline-ott` (2026-11-10). Next.js 15 / React 19 OTT frontend with HLS.js.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the separate API's `/api/v1` endpoint. Use local/test services for development. `npm run typecheck` checks TypeScript; `npm run build` builds production assets. The Dockerfile builds from this repository root and accepts `--build-arg NEXT_PUBLIC_API_URL=...`.

Features: homepage, catalog/search/filtering, movie details, in-memory authentication, watchlist and authenticated HLS player. Protected production playback intentionally remains unavailable until separately configured CDN signing is verified. Do not enable unsigned playback as a workaround.

## Integration test sources

`tests/e2e` contains the original isolated integration scenarios, with package imports and the Playwright test directory adjusted for this standalone repository. They require disposable fixture services already running on loopback ports 18081 (API), 18082 (web), 18083 (CMS), and 18084 (test media). They use fixture-only accounts and mutations: never point them at production. No production credentials or fixture database is included. `npm run test:e2e` runs these tests after that isolated stack is provisioned; it does not provision the fixture services.

Companions: [API](https://github.com/AungMyoNyein/hyperline-api), [CMS](https://github.com/AungMyoNyein/hyperline-cms), [mobile](https://github.com/AungMyoNyein/hyperline-mobile).
