# Guide de développement

## Structure

```
.claude-plugin/
  plugin.json        manifeste du plugin (nom, version, contrat de types)
  marketplace.json   rend le dépôt installable avec /plugin install
  types/             généré par Claude Code au chargement, ignoré par git
hooks/
  hooks.json         nomme le module de hooks
  register.tsx       tout le mod
types/index.d.ts     contrat de l'état de session (PluginState) et types partagés
tests/buddy.test.tsx tests lancés par `claude plugin test`
tsconfig.json        étend .claude-plugin/types/tsconfig.json
```

Le mod est un plugin de *function hooks* : `register(on)` branche des hooks `($, e, next)` sur les événements du
moteur. Le module tourne dans un environnement isolé, sans DOM ni Node : tout passe par `$`. L'API est en accès
anticipé et bouge entre les versions ; la référence est `.claude-plugin/types/claude-code/index.d.ts`.

## Lancer le mod depuis le dépôt

```
claude --plugin-dir ~/claude-buddy
```

Le dossier est surveillé : chaque sauvegarde recharge le module (`register` repart, `session.start` refire). L'état de
session (`$.state`) et le stockage (`$.store`) survivent au rechargement ; les variables du module repartent de zéro.

## Vérifications

```
claude plugin validate .   # manifeste, marketplace, ce que le module branche et appelle
claude plugin test .       # tests/*.test.tsx
npx -p typescript@5 tsc -p .   # type-check (après un premier chargement, qui génère .claude-plugin/types/)
```

## Fonctionnement

### Hooks

| Événement                      | Rôle |
| ------------------------------ | ---- |
| `session.start`                | Charge le compagnon (ou en fait éclore un au premier lancement), le mute, salue, enregistre `/buddy`, démarre le ticker. |
| `command.run` `{command: buddy}` | Toutes les sous-commandes. |
| `prompt.submit`                | Note l'activité ; met le prompt en attente de réponse s'il contient le nom ; bavardage. |
| `tool.call`                    | Réagit aux échecs d'outils et aux `Edit`/`Write` après `next(e)`. |
| `turn.complete`                | Note l'activité ; réagit aux tours interrompus, longs ou terminés. |
| `ui.render` `{component: AbovePrompt}` | Dessine le compagnon, l'œuf ou l'éclosion ; `next(e)` quand il est caché, sans compagnon ou qu'un sondage occupe la bande. |

### Ticker

`$.clock.every(500 ms)` lancé dans `session.start` appelle `onTick` : il incrémente `tick` (ce qui redessine la
bande), déclenche la relance d'inactivité et traite la réponse en attente. Toutes les durées sont en ticks
(`BUBBLE_TICKS`, `HEART_TICKS`, `HATCH_TICKS`, `CHATTER_COOLDOWN_TICKS`, `IDLE_TICKS`), ce qui garde le rendu pur :
il compare `tick` à des échéances stockées. Caché, le ticker se fige.

### Réponses du modèle

`prompt.submit` ne fait pas l'appel au modèle : il écrit le prompt dans l'atome `ask` et rend la main. Le ticker,
qui tourne hors de tout dispatch, le lit, appelle `reply` (`$.model.complete` sur `haiku`) et affiche la réponse.
Cela évite de retarder l'envoi du prompt et de lancer du travail qui survivrait au dispatch du hook.
`/buddy <message>` appelle `reply` directement : la commande peut attendre.

### Parole et mute

`say($, text, mode)` est le seul point d'écriture de la bulle :

- `chatter` : bavardage aléatoire, soumis au cooldown de 20 s ;
- `event` : réaction à un événement de session ;
- `direct` : réponse à une demande explicite.

Le mute bloque `chatter` et `event`, jamais `direct`.

### État

| Clé                        | Où           | Contenu |
| -------------------------- | ------------ | ------- |
| `pet`                      | state + store | le compagnon ; `null` dans le store = libéré, un œuf attend ; absent = premier lancement |
| `released`                 | store        | les 20 derniers compagnons libérés |
| `muted` / `isMuted`        | store + state | le mute |
| `isEgg`, `hatchingUntil`   | state        | œuf affiché, fin de l'animation d'éclosion (en ticks) |
| `tick`, `bubble`, `heartsUntil`, `isHidden`, `ask` | state | animation, bulle, cœurs, `hide`, message en attente de réponse |

Chaque clé de `$.state` est déclarée dans `types/index.d.ts` ; `claude plugin validate` vérifie que le module n'en
utilise pas d'autres.

## Pièges de l'API

- `$` ne se passe qu'à des fonctions déclarées au niveau du module : une closure définie dans `register` qui reçoit
  `$` fait échouer la validation.
- Un hook `ui.render` n'écrit jamais dans `$.state` ; on écrit depuis un handler (`onPress`) ou un autre événement.
- `update($, atom, fn)` relit, applique et réécrit avec contrôle de version : deux clics rapides comptent tous les deux.
- `$.model.complete` peut rejeter (modèle bloqué) : `reply` attrape le rejet et retombe sur une phrase toute faite.
- Les éléments d'interface viennent de `$.ui.resolve(e)`, jamais de globals.

## Tests

Dans un test, les hooks enregistrés par `on` jouent le rôle du moteur, sous le plugin. Il faut donc fournir ce que le
mod appelle :

- `mock.clock(on)` et `mock.store(on)` pour l'horloge et le stockage ;
- `on('session.start', () => ({ cwd: '/tmp' }))` ;
- les appels sur `$` répondent `{ value }` : `on('command.register', () => ({ value: undefined }))`,
  `on('model.complete', () => ({ value: { isAnswered: true, text, usage } }))` ;
- `on('ui.render', …)` pour dessiner à la place du moteur quand le mod passe la main ;
- tous ces `on(...)` avant le premier appel à `$`.

Les tests de rendu montent la bande sur `terminal` et `desktop` pour vérifier que le mod ne dépend pas d'une surface.

## Ajouter une espèce

Ajouter une entrée à `SPECIES` dans `hooks/register.tsx` : deux frames de 4 lignes, la seconde pour gigoter, `E` à la
place de chaque œil (pas d'autre `E` majuscule dans le dessin). Mettre à jour la liste du test `dex` et le compte
`n/8` qu'il attend.

## Ajouter une réaction

Ajouter des phrases dans `QUIPS`, puis appeler `say` depuis le hook concerné avec le bon mode. Garder les phrases
courtes : la bulle s'enroule mais la bande est limitée en hauteur.

## Publier une version

Monter `version` dans `.claude-plugin/plugin.json`, committer, pousser. Les utilisateurs récupèrent la mise à jour avec
`claude plugin update buddy` puis `/reload-plugins`.
