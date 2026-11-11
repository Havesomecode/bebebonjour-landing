# Candidat Cloudflare de la vitrine Bébé Bonjour

## État et périmètre

Préparation locale uniquement, carte `t_2153ddf1`. Aucun déploiement distant, changement DNS, envoi, paiement, nouveau secret ou modification du backend. Les WIP du dépôt canonique restent intacts. Le contenu public, y compris les textes et les annonces synthétiques, n'a pas été retouché pendant la reprise.

La référence est `dpl_73az3x1osxdxkTASWRrPPZqPvswa`, projet `prj_MJTHJrEVehZIRHuQBiZ1CgAG7MuB`, équipe `team_lpN3ikyEWpXFfrV53eNYNWQd`. Le 11 novembre 2026, l'API officielle confirme READY et les alias apex/www. Le connecteur MCP refuse le scope (403) ; la CLI native authentifiée permet les mêmes lectures dans le scope explicite, sans nouvelle authentification ni copie de secret.

`deployment-source-manifest.json` contient l'inventaire exact des 30 fichiers non secrets et leurs SHA-256. La relecture de chaque fichier par son UID opaque confirme ces empreintes et l'égalité avec le candidat. Aucun fichier d'environnement n'est lu. Les métadonnées donnent `sourceHead=af76b80e6fa6a3dedc292966e128bf80baba683f` et `sourceDirty=true` : ce HEAD seul n'est donc pas une preuve de source. Le manifeste et les octets relus sont la frontière retenue, pas une conversion des UID Vercel en objets Git.

## Contrat de routage

| Entrée | Comportement conservé |
| --- | --- |
| `bebebonjour.com/*` | 307 vers le même chemin/query sur `https://www.bebebonjour.com` |
| `/`, `/index.html` | Racine publique, sans redirection supplémentaire |
| `/demo`, `/demo.html` | Démo synthétique ; `/demo/` conserve le fallback racine publié |
| `/demo/announcements/{amal,bayane}/{fr,ar}` | Annonces et ressources publiées ; variantes slash et `index.html` servies sans nouvelle redirection |
| `/delivery` | 307 vers `https://tacit-antelope-577.convex.site/delivery`, query conservée |
| Chemin absent, dont `/delivery/` | Fallback racine publié |

Les quatre CTA continuent de naviguer vers `/delivery`. Le client dormant `https://bebebonjour-fulfillment.vercel.app/api/customer-flow` reste exclu de l'entrée publique ; TEST-A, ses accès et ses données restent distincts. Aucune dépendance au candidat Railway `t_62526e43`, au mail ou à un nouveau service n'est introduite.

Le Worker conserve CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options et HSTS `max-age=63072000`. Il reproduit les types MIME JS/JSON, le cache public avec revalidation et le CORS statique existants. Les redirections conservent statut, destination, corps texte, cache et HSTS. `Content-Disposition` reste `inline` ; les noms suggérés par Vercel ne sont pas reproduits. Les identifiants/cache internes, ETag et dates des CDN ne sont pas promis identiques. TLS et compression au bord Cloudflare ne sont pas exercés localement.

## Rejouer les vérifications

Depuis ce worktree, utiliser Node compatible avec `package.json`, la CLI Wrangler **4.159.0**, Playwright **1.64.0** et Brave installé. Wrangler et Playwright sont des outils de vérification externes au bundle public ; les dépendances du déploiement restent inchangées. Les versions effectivement utilisées figurent dans les preuves.

1. Installer et construire : `npm ci && npm test && npm run build`. Il n'existe pas de commande lint/typecheck dédiée ; contrôler aussi `node --check worker.js`, `node --check verify-browser.cjs`, la syntaxe des deux scripts Python et `git diff --check`.
2. Démarrer `wrangler dev --local --ip 127.0.0.1 --port 8794 --show-interactive-dev-session=false` dans un processus suivi. Vérifier sa disponibilité puis exécuter `python3 verify-cloudflare.py`.
3. Exécuter `node verify-browser.cjs /chemin/vers/node_modules/playwright`. Seules l'origine locale et les annonces publiques synthétiques sont autorisées ; aucune redirection vers l'intake n'est suivie. Les deux profils, la réinitialisation, la FAQ et la largeur mobile sont vérifiés.
4. Avec la CLI Vercel native déjà autorisée : `python3 verify-deployment-source.py /chemin/vers/vercel/dist/vc.js`. Le script ne lit que l'inventaire autorisé, les fichiers de ce manifeste et une sélection de métadonnées non secrètes.
5. Produire uniquement le bundle local avec `wrangler deploy --dry-run --outdir .evidence/worker-bundle`. Examiner `npm audit --json` et `npm audit --omit=dev --json` séparément ; ne pas annoncer `npm run verify` vert si l'audit complet échoue.

Les reçus `.evidence/source-readback.json`, `parity.json`, `browser.json` et `candidate.json`, les journaux et captures sont joints à la carte lors du handoff. Les sorties reproductibles restent ignorées par Git.

## Résultats et limites constatés le 11 novembre 2026

- 30 sources relues et identiques ; 28 fichiers du build identiques au public ; 93 comparaisons GET/HEAD passent, avec apex exercé dans workerd via Host et publiquement sans suivre la redirection. `/index.html` a été corrigé après un RED réel : Workers Assets le redirigeait auparavant.
- 21 tests passent. Le build et le bundle Wrangler local passent. Brave termine les deux profils en six avances chacun, réinitialise la démo, ouvre/referme les cinq FAQ et ne présente pas de débordement à 390 px. Aucun appel hors des origines explicitement autorisées, aucun POST.
- Les annonces déclenchent déjà sur Vercel un refus du script de configuration inline par `script-src 'self'`. Il est reproduit à l'identique, pas effacé : cinq navigations locales/public donnent les mêmes messages et les mêmes projections rendues. Racine/démo n'ont pas d'erreur navigateur. La preuve antérieure « sans erreur JavaScript » ne doit pas être étendue aux annonces. Narration et parcours client réel ne sont pas qualifiés.
- L'audit complet conserve deux alertes élevées, Vite et source-map-js, dans la chaîne de développement. L'audit hors dev retourne zéro vulnérabilité. Le runtime déployable est le Worker plus `dist`, pas Vite ; la preuve n'autorise pas à exposer son serveur de développement. Aucun changement de dépendance ne remplace silencieusement la source publiée. La revue doit juger cette frontière explicitement.

Aucun fichier source supprimé. Les modifications de reprise portent uniquement sur l'adaptateur Worker, ses tests, cette documentation, les exclusions des preuves et les trois scripts de vérification.

## Handoff de release — à exécuter seulement après revue et autorisation spécifique

1. Reprendre le commit signé nommé dans le handoff, vérifier sa signature et les empreintes jointes ; refaire la lecture des alias/sources et les tests pour refuser une production ayant changé. Conserver le déploiement Vercel actuel comme retour arrière : `bebebonjour-landing-q67p6j71d-zacaria-chtatars-projects.vercel.app`, à revalider dans l'API avant effet. Aucun push n'est effectué ici, faute de preuve qu'il ne déclencherait pas un déploiement interdit.
2. Lire l'état réel du compte/zone Cloudflare et du DNS autoritatif ; exporter les enregistrements, TTL, protections et routages existants avant toute écriture. La carte ne présume ni zone déjà prête, ni certificat émis, ni abonnement autorisé. Le registrar n'a pas à être transféré par hypothèse. Préparer explicitement les deux hôtes et le retour aux enregistrements exportés ; ne pas toucher aux autres services.
3. Après l'autorisation de l'effet exact, utiliser le même Worker et `dist` sur les deux hôtes. Aucun secret/binding backend n'est nécessaire : `ASSETS` seul. `wrangler.jsonc` ne contient volontairement ni compte cible, ni route distante. Ne pas déployer avec des valeurs implicites de compte ou de domaine.
4. Vérifier publiquement TLS, apex→www, pages, démo, ressources, CSP/HSTS et `/delivery` sans soumettre de demande ni suivre le parcours client. En cas de divergence, restaurer le routage sauvegardé vers Vercel, puis relire les deux hôtes. Ne pas supprimer le déploiement de retour arrière.

Une revue locale n'est ni une bascule ni la sortie de tous les services Bébé Bonjour de Vercel. Cette carte prépare seulement la vitrine publique.
