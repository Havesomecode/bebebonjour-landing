# Préparation Cloudflare de la vitrine

Référence : déploiement Vercel `dpl_73az3x1osxdxkTASWRrPPZqPvswa`. Les sources non secrètes ont été récupérées via l’API des fichiers de ce déploiement ; leurs empreintes figurent dans `deployment-source-manifest.json`. Les UID Vercel sont des identifiants opaques, pas des hashes Git. Ce déploiement ne fournit pas de commit Git vérifiable. Les sources correspondent aux fichiers du dépôt canonique observés, mais les modifications locales de ce dépôt n’ont pas été touchées.

Le futur runtime doit conserver la redirection temporaire de l’apex vers `https://www.bebebonjour.com`, `/demo`, les annonces statiques, le fallback racine, les en-têtes de sécurité et la redirection temporaire `/delivery` vers `https://tacit-antelope-577.convex.site/delivery`. Le service TEST-A `https://bebebonjour-fulfillment.vercel.app/api/customer-flow` reste distinct et inchangé ; son client est absent de l’entrée publique, aucun appel n’est effectué. Ne pas déplacer ses données ou ses protections.

## Vérifications du 10 novembre 2026

Les 30 fichiers de source extraits correspondent aux fichiers observés dans le worktree canonique ; les 28 fichiers du build correspondent octet pour octet aux réponses publiques en suivant les chemins publics de chaque ressource. Les tests et README non fournis par Vercel sont adaptés depuis le WIP canonique en lecture seule, pas présentés comme des sources du déploiement. Le runtime Wrangler local reproduit `/`, `/demo`, les annonces, le fallback, les en-têtes CSP et la redirection `/delivery` ; le texte du corps de redirection diffère. Brave headless a chargé ces trois pages sans erreur JavaScript ni requête externe et le scénario synthétique avance puis se réinitialise. Aucun parcours client réel n’a été exécuté. L’apex est couvert par un test de Worker ; les routes Cloudflare et l’émission TLS ne sont pas encore provisionnées ni vérifiées.

Pour la release, construire avec `npm ci && npm run build`, fournir `dist` et `worker.js` à Workers, router les deux hôtes vers le même Worker après revue et autorisation explicites, puis vérifier les deux hôtes, `/delivery` sans soumettre de données et le retour arrière. `wrangler.jsonc` ne configure volontairement ni route distante ni secret.

`npm run verify` passe les 20 tests et le build mais échoue sur `npm audit` : deux alertes élevées concernent Vite et source-map-js, dépendances de développement. Elles sont maintenues ici pour préserver les sources et le build publiés ; leur exposition effective et une éventuelle mise à niveau doivent être examinées avant la release, sans supposer que l’outil de développement est exposé en production.

Cette préparation n’autorise ni déploiement, ni DNS, ni paiement, ni appel client réel. Avant une bascule, comparer les réponses publiques et les parcours au candidat exact, y compris l’apex, et vérifier les dépendances backend, le retour arrière et les autorisations de release.
