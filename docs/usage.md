# Guide d'utilisation

## Le compagnon

Au premier lancement de Claude Code avec le mod, un œuf éclot et donne un compagnon tiré au hasard :

- **Espèce** : canard, chat, blob, hibou, fantôme, axolotl, robot ou dragon (`/buddy dex` les montre toutes).
- **Rareté** : elle fixe le plancher de ses stats et sa couleur.

  | Rareté     | Chance | Stats minimales | Couleur          |
  | ---------- | ------ | --------------- | ---------------- |
  | commun     | 60 %   | 1               | grisée           |
  | peu commun | 25 %   | 15              | verte            |
  | rare       | 10 %   | 30              | couleur suggestion |
  | épique     | 4 %    | 45              | couleur permission |
  | légendaire | 1 %    | 60              | jaune            |

- **Shiny** : 1 % de chance, indépendamment de la rareté ; affiché en jaune avec ✨ devant le nom.
- **Yeux** : un glyphe parmi `· o ° ^ ✦ @ •`.
- **Stats** (1 à 100) : DEBUG, PATIENCE, CHAOS, SAGESSE, SARCASME. Elles colorent ses réponses quand on lui parle.
- **Nom** : tiré d'une liste, modifiable avec `/buddy rename`.

Il est conservé d'une session à l'autre et d'un projet à l'autre.

## Où il s'affiche

Dans la bande juste au-dessus du prompt, aligné à droite, sa bulle à sa gauche. Il cède la bande quand un sondage
l'occupe. Sa bulle disparaît quand la bande fait moins de 40 colonnes.

Il cligne des yeux et gigote lentement au repos, plus vite pendant que Claude travaille.

La bande se réduit avec `ctrl+x ctrl+a` (ou le `[-]` à sa droite) et prend le focus avec `ctrl+x tab` ou un clic.

## Commandes

| Commande                | Effet |
| ----------------------- | ----- |
| `/buddy`                | Sa carte : sprite, espèce, rareté, date d'éclosion, stats, anciens compagnons. |
| `/buddy <message>`      | Lui parler ; la réponse s'affiche dans sa bulle et dans la sortie de la commande. |
| `/buddy pet`            | Le caresser : des cœurs flottent au-dessus de lui. |
| `/buddy mute`           | Couper ses bulles spontanées. |
| `/buddy unmute`         | Lui rendre la parole. |
| `/buddy hide`           | Le cacher (pour la session en cours). |
| `/buddy show`           | Le faire revenir. |
| `/buddy rename <nom>`   | Le renommer (20 caractères au plus). |
| `/buddy release <nom>`  | Le libérer pour de bon ; le nom sert de confirmation. |
| `/buddy hatch`          | Faire éclore l'œuf laissé par un compagnon libéré. |
| `/buddy dex`            | Les 8 espèces, celles déjà rencontrées cochées, et les chances par rareté. |
| `/buddy help`           | L'aide. |

Tout texte après `/buddy` qui n'est pas une sous-commande est un message pour lui.

Le bouton ♥ à côté de son nom le caresse aussi : un clic, ou `ctrl+x tab` puis `p`.

## Ce qui le fait réagir

| Événement                                  | Réaction | Fréquence |
| ------------------------------------------ | -------- | --------- |
| Début de session                           | Salut selon l'heure (nuit, matin, après-midi, soir) | toujours |
| Ton prompt contient son nom                | Il te répond (via Haiku), sans bloquer ton prompt | toujours |
| Un outil échoue                            | « Aïe. Ça a planté. »… | toujours |
| Un tour est interrompu                     | « Interrompu… »… | toujours |
| Un tour dure plus de 2 minutes             | « Ouf, c'était long. »… | toujours |
| Tu envoies un prompt                       | « C'est parti ! »… | 30 % |
| Claude modifie ou écrit un fichier         | « Joli diff. »… | 25 % |
| Un tour se termine normalement             | « Et voilà. »… | 30 % |
| 10 minutes sans activité                   | « Tu es toujours là ? »… | une fois par pause |

Les réactions marquées d'une fréquence sont du bavardage : au plus une toutes les 20 secondes. Les événements des
sous-agents sont ignorés. Une bulle reste affichée 7 secondes.

## Lui parler

Deux façons : `/buddy <message>`, ou écrire son nom dans un prompt normal (le prompt part quand même vers Claude ;
le compagnon répond à côté). Il répond en une phrase, en français, dans le ton que lui donnent ses stats.

Les réponses passent par le modèle `haiku` de ta session (80 tokens au plus, 8 secondes de délai). C'est la seule
chose du mod qui consomme des tokens : toutes les autres réactions sont des phrases toutes faites. Si le modèle ne
répond pas ou est refusé, il pioche une phrase toute faite.

## Mute

`/buddy mute` coupe tout ce qui est spontané : salut, réactions, relances d'inactivité et réponses quand tu écris son
nom dans un prompt. Il reste affiché et animé, avec 🔇 à côté de son nom. Il répond toujours aux demandes explicites
(`/buddy <message>`, `pet`, `rename`…). Le réglage est conservé entre les sessions.

`hide` est différent : il le retire de l'écran pour la session en cours seulement.

## Le libérer et faire éclore un œuf

1. `/buddy release` rappelle que c'est définitif et demande `/buddy release <son nom>` (casse ignorée).
2. Il dit adieu dans sa bulle ; un œuf prend sa place et oscille de temps en temps.
3. `/buddy hatch` : l'œuf se fissure pendant 4 secondes, puis un nouveau compagnon tiré au hasard apparaît.

Les 20 derniers compagnons libérés sont gardés ; la carte affiche les 5 derniers, et `/buddy dex` coche leurs espèces.
Un œuf non éclos le reste d'une session à l'autre.

## Données conservées

Le mod garde dans le stockage de plugin de Claude Code : le compagnon actuel (ou l'œuf), la liste des compagnons
libérés et le réglage mute. Le reste (bulle, animation, `hide`) ne vit que le temps de la session.
