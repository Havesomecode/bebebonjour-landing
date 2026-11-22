# Bébé Bonjour landing

First-party Vite landing for bebebonjour.com. `index.html` and `src/main.js` are the public entry; `demo.html`, `src/demo*.js`, `src/demo.css`, and `public/demo/` provide a synthetic workflow demo. `public/exemple/amal/` is the public example linked from the landing: a static copy of a real generated announcement (bebebonjour-app renderer, fr + ar narration `recit-*.mp3`), with its inline script moved to `announcement.js` and its data: fonts pointed at `/fonts/` to fit the site CSP. The hero player still uses the older `amal-fr.mp3`. `src/fulfillment-client.js` is a dormant compatibility client. Styles are in `src/styles.css`; tests are in `test/`. `vite.config.js` builds both HTML entries; `vercel.json` defines headers, redirects and rewrites. `openspec/` contains change documentation.

## Development and verification

Use Node 20.19+ or 22.12+. `npm ci` installs dependencies; `npm run dev` serves on loopback; `npm test` runs Node tests; `npm run build` builds; `npm run verify` runs tests, build and npm audit. The README documents `npm run dev:local` with the sibling `bebebonjour-app` memory-only API and its synthetic demo export. Use invented details and `.test` emails for local flow testing.

## Boundaries

- No real customers yet (owner, 18/11/2026). The landing sells a €39 announcement, paid once: the customer describes, an operator reads the request, the customer pays through the emailed Stripe Checkout link, then the announcement is generated and delivered. No free preview. The order form, payment and emails belong to `bebebonjour-app`; all public CTAs go through `/delivery`.
- Copy states only what the app does today: no delivery-time promise unless the app guarantees it.
- Announcements are non-indexed shareable capabilities. Keep customer links, review URLs, email addresses and private Operations URLs out of public assets; the public example is a static copy without any Convex URL or token.
- Preserve the existing CSP and `/demo` and SPA rewrites. The demo uses fictional profiles and must not contact providers or analytics. Keep the hosted compatibility client out of the public entrypoint; never put its access token in URLs, build variables, storage, logs or assets.
- Pushing `master` deploys production; check the real URL on desktop and mobile. Payment, secrets and customer-data changes in the app still get one reviewer pass before that effect.

## Shared workspace rules

Read and follow the shared workspace policy for every project, including projects with real users.

@/home/hermes/repos/prompts-lib/AGENTS_WORKSPACE.md

## Shared building rules

Read the shared file below before changing this project. Its development rules apply only if the project has no real users yet; confirm that status before applying them. Existing project-specific security, data-preservation, and release requirements still apply.

@/home/hermes/repos/prompts-lib/AGENTS_BUILDING.md

Record project-specific corrections in this project's `## Lessons` section, not in the shared file.

## Lessons