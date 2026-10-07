# claude-buddy

Mod Claude Code (plugin de function hooks) : un compagnon ASCII dans la bande au-dessus du prompt.
Tout le code est dans `hooks/register.tsx` ; l'état de session est déclaré dans `types/index.d.ts`.

- Fonctionnement et pièges de l'API : `docs/development.md`. Comportement visible : `docs/usage.md`.
- Référence de l'API : `.claude-plugin/types/claude-code/index.d.ts` (généré au chargement, ~14 000 lignes : grep le
  nom cherché, ne pas le lire en entier). Ne jamais l'éditer.

## Règles

- Textes visibles (bulles, sorties de commande, doc) en français.
- `$` ne se passe qu'à des fonctions déclarées au niveau du module, jamais à une closure dans `register`.
- Toute nouvelle clé de `$.state` se déclare dans `types/index.d.ts` ; ce qui doit survivre à la session va aussi
  dans `$.store`.
- Un rendu (`ui.render`) ne fait que lire ; les durées sont en ticks, comparées à `tick`.
- Toute bulle passe par `say` avec le bon mode (`chatter` / `event` / `direct`) pour que le mute s'applique.
- Seul `reply` appelle le modèle (`haiku`) ; ne pas ajouter d'appel au modèle sans le signaler, ça coûte des tokens.
- Une nouvelle sous-commande va dans `SUBCOMMANDS`, `HELP`, `docs/usage.md` et le README.

## Avant de committer

```
claude plugin validate .
claude plugin test .
npx -p typescript@5 tsc -p .
```

Les trois doivent passer. Ajouter ou adapter un test dans `tests/buddy.test.tsx` pour chaque comportement modifié.
