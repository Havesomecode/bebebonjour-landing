# Bébé Bonjour landing

First-party Vite landing for bebebonjour.com. `index.html` and `src/main.js` are the public entry; `demo.html`, `src/demo*.js`, `src/demo.css`, and `public/demo/` provide a synthetic workflow demo. `src/fulfillment-client.js` is a dormant compatibility client. Styles are in `src/styles.css`; tests are in `test/`. `vite.config.js` builds both HTML entries; `vercel.json` defines headers, redirects and rewrites. `openspec/` contains change documentation.

## Development and verification

Use Node 20.19+ or 22.12+. `npm ci` installs dependencies; `npm run dev` serves on loopback; `npm test` runs Node tests; `npm run build` builds; `npm run verify` runs tests, build and npm audit. The README documents `npm run dev:local` with the sibling `bebebonjour-app` memory-only API and its synthetic demo export. Use invented details and `.test` emails for local flow testing.

## Boundaries

- All public CTAs go through `/delivery` to the owned intake. It requires consent and the complimentary offer password; it creates a payment waiver, not a charge. Do not add checkout or payment controls to the landing.
- First publication and first customer email are automatic; owner approval gates the final email after correction. Announcements are non-indexed shareable capabilities. Keep customer links, review URLs, email addresses and private Operations URLs out of public assets.
- Preserve the existing CSP and `/demo` and SPA rewrites. The demo uses fictional profiles and must not contact providers or analytics. Keep the hosted compatibility client out of the public entrypoint; never put its access token in URLs, build variables, storage, logs or assets.
- Hosted verification, deployment, DNS, live payment, email, TTS and publication require separate authorization. Consult the current README before changing the customer flow.

## Shared building rules

Read the shared file below before changing this project. Its development rules apply only if the project has no real users yet; confirm that status before applying them. Existing project-specific security, data-preservation, and release requirements still apply.

@/home/hermes/repos/prompts-lib/AGENTS_BUILDING.md

Record project-specific corrections in this project's `## Lessons` section, not in the shared file.

## Lessons
