# buddy

Un compagnon ASCII pour Claude Code : il vit au-dessus du prompt, gigote, réagit à la session
(erreurs, tours longs, modifications), te répond quand tu l'appelles par son nom, et peut être
libéré pour faire éclore un nouvel œuf. 8 espèces, 5 raretés, 1 % de shiny.

## Installation

Dans une session Claude Code (terminal) :

```
/plugin install buddy --marketplace <owner>/claude-buddy
```

Réponds `y` pour ajouter le marketplace, puis choisis la portée (user par défaut).

## Commandes

```
/buddy                  sa carte et ses stats
/buddy <message>        lui parler (ou écris son nom dans un prompt)
/buddy pet              le caresser (ou ♥ / ctrl+x tab puis p)
/buddy mute | unmute    couper / rendre ses bulles spontanées
/buddy hide | show      le cacher / le faire revenir
/buddy rename <nom>     le renommer
/buddy release <nom>    le libérer pour de bon (laisse un œuf)
/buddy hatch            faire éclore l'œuf
/buddy dex              les espèces possibles et les raretés
/buddy help             l'aide
```

Les réponses quand on lui parle passent par Haiku ; ses autres réactions sont des phrases toutes faites.
