import { atom, read, update } from 'claude-code'
import type { Color, EngineInterface, Register } from 'claude-code'

import type { Pet, Rarity, Released, StatName } from '../types'

const pet = atom({ plugin: 'buddy', key: 'pet' } as const, null)
const tick = atom({ plugin: 'buddy', key: 'tick' } as const, 0)
const bubble = atom({ plugin: 'buddy', key: 'bubble' } as const, null)
const heartsUntil = atom({ plugin: 'buddy', key: 'heartsUntil' } as const, 0)
const isHidden = atom({ plugin: 'buddy', key: 'isHidden' } as const, false)
const isEgg = atom({ plugin: 'buddy', key: 'isEgg' } as const, false)
const hatchingUntil = atom({ plugin: 'buddy', key: 'hatchingUntil' } as const, 0)
const isMuted = atom({ plugin: 'buddy', key: 'isMuted' } as const, false)
// Message à qui il doit répondre ; traité par la boucle du ticker, qui survit aux dispatchs.
const ask = atom({ plugin: 'buddy', key: 'ask' } as const, null)

const TICK_MS = 500
const BUBBLE_TICKS = 14
const HEART_TICKS = 6
const CHATTER_COOLDOWN_TICKS = 40
const HATCH_TICKS = 8
const IDLE_TICKS = 1200
const SUBCOMMANDS = ['help', 'dex', 'card', 'pet', 'hide', 'show', 'mute', 'unmute', 'rename', 'release', 'hatch', 'talk']

const HELP = [
  '/buddy                  sa carte et ses stats',
  '/buddy <message>        lui parler (ou écris son nom dans un prompt)',
  '/buddy pet              le caresser (ou ♥ / ctrl+x tab puis p)',
  '/buddy mute | unmute    couper / rendre ses bulles spontanées',
  '/buddy hide | show      le cacher / le faire revenir',
  '/buddy rename <nom>     le renommer',
  '/buddy release <nom>    le libérer pour de bon (laisse un œuf)',
  '/buddy hatch            faire éclore l’œuf',
  '/buddy dex              les espèces possibles et les raretés',
  '/buddy help             cette aide',
].join('\n')

const EGG = {
  idle: ['   .--.   ', '  /    \  ', ' |      | ', '  \____/  '],
  wobble: ['  .--.    ', ' /    \   ', '|      |  ', ' \____/   '],
  // L'œuf se fissure sur HATCH_TICKS ticks, une frame par quart.
  cracks: [
    ['   .--.   ', '  /    \  ', ' |  /\  | ', '  \____/  '],
    ['   .--.   ', '  / /  \  ', ' |  \/\ | ', '  \____/  '],
    ['   .,-.   ', '  /\/\/\  ', ' | \/  \| ', '  \____/  '],
    ['  _    _  ', '  /\/\/\  ', ' |      | ', '  \____/  '],
  ],
}

// E = l'œil, remplacé au rendu ; deux frames par espèce, la seconde sert à gigoter.
const SPECIES: Record<string, [string[], string[]]> = {
  canard: [
    ['   __    ', ' <(E )___', '  (  ._> ', '   `--´  '],
    ['   __    ', ' <(E )___', '  (  ._> ', '   `--´~ '],
  ],
  chat: [
    [' /\\_/\\  ', '( E.E ) ', ' > ^ <  ', ' (_ _)  '],
    [' /\\_/\\  ', '( E.E ) ', ' > ^ <  ', ' (_ _)~ '],
  ],
  blob: [
    ['  .--.   ', ' ( E E )  ', ' (  ‿  )  ', '  `--´   '],
    [' .----.  ', '( E  E ) ', '(   ‿  ) ', ' `----´  '],
  ],
  hibou: [
    ['  ,___,  ', '  {E,E}  ', '  /)__)  ', '  -"-"-  '],
    ['  ,___,  ', '  {E.E}  ', '  /)__)  ', '  -"-"-  '],
  ],
  fantôme: [
    ['  .-.   ', ' (E E)  ', ' | O |  ', " '~~~'  "],
    ['  .-.   ', ' (E E)  ', ' | o |  ', " '~'~'  "],
  ],
  axolotl: [
    ['}\\(E‿E)/{', '  (    )  ', '   U  U   ', '          '],
    ['}/(E‿E)\\{', '  (    )  ', '   U  U   ', '          '],
  ],
  robot: [
    ['  [###]  ', '  [E_E]  ', '  /|=|\\  ', '   d b   '],
    ['  [#*#]  ', '  [E_E]  ', '  \\|=|/  ', '   b d   '],
  ],
  dragon: [
    ['  /\\_/\\_  ', ' ( E  E )>', ' /  vv  \\ ', ' ~(____)  '],
    ['  /\\_/\\_  ', ' ( E  E )>', ' /  ^^  \\ ', '  (____)~ '],
  ],
}

const EYES = ['·', 'o', '°', '^', '✦', '@', '•']
const NAMES = ['Pixel', 'Grumly', 'Biscotte', 'Nougat', 'Kernel', 'Mochi', 'Tofu', 'Segfault', 'Patate', 'Lambda', 'Brioche', 'Zéphyr']
const STATS: StatName[] = ['DEBUG', 'PATIENCE', 'CHAOS', 'SAGESSE', 'SARCASME']
const RARITIES: [Rarity, number, number][] = [
  // [rareté, poids, plancher des stats]
  ['commun', 60, 1],
  ['peu commun', 25, 15],
  ['rare', 10, 30],
  ['épique', 4, 45],
  ['légendaire', 1, 60],
]
const RARITY_COLOR: Record<Rarity, Color> = {
  commun: 'inactive',
  'peu commun': 'success',
  rare: 'suggestion',
  épique: 'permission',
  légendaire: 'warning',
}

const QUIPS = {
  submit: ['Allez, on s’y met !', 'Je t’écoute.', 'Hmm, intéressant…', 'C’est parti !'],
  error: ['Aïe. Ça a planté.', 'Rouge partout…', 'On respire. On relit la stack.', 'Classique.'],
  edit: ['Joli diff.', 'Ça compile ? 👀', 'Propre.', 'Hop, un fichier de plus.'],
  done: ['Fini !', 'Et voilà.', 'Mission accomplie.', 'Pas mal du tout.'],
  long: ['Ouf, c’était long.', 'J’ai failli m’endormir.', 'Ça valait le coup d’attendre ?'],
  aborted: ['Interrompu…', 'On change de plan ?', 'Ok, ok, j’arrête.'],
  called: ['Oui ?', 'Présent !', 'Tu m’as appelé ?', 'Je suis là !'],
  pet: ['♥', 'Rrrr…', 'Encore !', 'Merci ♥'],
  idle: ['Tu es toujours là ?', 'Pause café ?', 'Je m’ennuie un peu…', 'On reprend quand tu veux.'],
  farewell: ['Adieu… 👋', 'Merci pour tout !', 'Je m’envole !', 'Prends soin du code.'],
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T

function hatch(now: number): Pet {
  const roll = Math.random() * 100
  let acc = 0
  let rarity: Rarity = 'commun'
  let floor = 1
  for (const [name, weight, min] of RARITIES) {
    acc += weight
    if (roll < acc) {
      rarity = name
      floor = min
      break
    }
  }
  const stats = Object.fromEntries(
    STATS.map(stat => [stat, floor + Math.floor(Math.random() * (101 - floor))]),
  ) as Record<StatName, number>

  return {
    species: pick(Object.keys(SPECIES)),
    name: pick(NAMES),
    rarity,
    eye: pick(EYES),
    isShiny: Math.random() < 0.01,
    stats,
    hatchedAt: now,
  }
}

// Les espèces en grille de 4, celles déjà rencontrées cochées, puis les chances par rareté.
function dex(seen: Set<string>): string {
  const COL = 14
  const names = Object.keys(SPECIES)
  const rows: string[] = []
  for (let i = 0; i < names.length; i += 4) {
    const group = names.slice(i, i + 4)
    const sprites = group.map(name => SPECIES[name]![0].map(line => line.replaceAll('E', 'o')))
    for (let l = 0; l < 4; l++) rows.push(sprites.map(sp => (sp[l] ?? '').padEnd(COL)).join('').trimEnd())
    rows.push(group.map(name => `${seen.has(name) ? '✓' : '·'} ${name}`.padEnd(COL)).join('').trimEnd(), '')
  }
  const odds = RARITIES.map(([rarity, weight]) => `${rarity} ${weight} %`).join(' · ')

  return [...rows, `Raretés : ${odds} · shiny 1 %`, `${seen.size}/${names.length} espèces rencontrées`].join('\n')
}

function memorial(released: Released[]): string[] {
  if (released.length === 0) return []

  return ['', 'Anciens compagnons :', ...released.slice(-5).map(r => `  ${r.name} — ${r.species} ${r.rarity}`)]
}

function card(p: Pet): string {
  const bar = (n: number) => '█'.repeat(Math.round(n / 10)).padEnd(10, '░')
  const sprite = SPECIES[p.species]?.[0] ?? []

  return [
    ...sprite.map(line => '    ' + line.replaceAll('E', p.eye)),
    '',
    `${p.isShiny ? '✨ ' : ''}${p.name} — ${p.species} ${p.rarity}`,
    `Éclos le ${new Date(p.hatchedAt).toLocaleDateString('fr-FR')}`,
    '',
    ...STATS.map(stat => `${stat.padEnd(9)} ${bar(p.stats[stat])} ${p.stats[stat]}`),
  ].join('\n')
}

let lastChatter = -CHATTER_COOLDOWN_TICKS
let lastActivity = 0
let isReplying = false

// chatter : bavardage limité par le cooldown ; event : réaction à la session ; direct : réponse à une demande explicite.
// Le mute coupe chatter et event, jamais direct.
async function say($: EngineInterface, text: string, mode: 'chatter' | 'event' | 'direct' = 'event') {
  const now = await read($, tick)
  if (mode !== 'direct' && (await read($, isMuted))) return
  if (mode === 'chatter' && now - lastChatter < CHATTER_COOLDOWN_TICKS) return
  lastChatter = now
  await update($, bubble, () => ({ text, until: now + BUBBLE_TICKS }))
}

function greeting(hour: number): string {
  if (hour < 6) return 'Tu codes encore à cette heure ?'
  if (hour < 12) return 'Bonjour ! ☀'
  if (hour < 18) return 'Re ! On s’y remet ?'
  return 'Bonsoir ! Session du soir ?'
}

async function reply($: EngineInterface, p: Pet, message: string): Promise<string> {
  const traits = STATS.map(stat => `${stat} ${p.stats[stat]}/100`).join(', ')
  // Le moteur rejette une requête qu'il refuse d'envoyer (modèle bloqué…) : il répond alors une phrase toute faite.
  const r = await $.model.complete({
    model: 'haiku',
    system:
      `Tu es ${p.name}, un petit ${p.species} en ASCII (${p.rarity}) qui vit au-dessus du prompt ` +
      `du terminal de ton humain, un développeur. Traits : ${traits} ; plus un trait est haut, plus il colore ` +
      `ta réponse. Réponds en français, en une seule phrase de 20 mots maximum, sans guillemets ni markdown.`,
    prompt: message.slice(0, 1000),
    maxTokens: 80,
    timeoutMs: 8000,
  }).catch(() => null)

  return r?.isAnswered ? r.text.trim().split('\n')[0]!.slice(0, 160) : pick(QUIPS.called)
}

// Appelé par le ticker : répond au message en attente, un à la fois.
async function answerPending($: EngineInterface) {
  const message = await read($, ask)
  const current = await read($, pet)
  if (message === null || current === null || isReplying) return
  isReplying = true
  try {
    await update($, ask, () => null)
    if (await read($, isMuted)) return
    await say($, '…', 'direct')
    await say($, await reply($, current, message), 'direct')
  } finally {
    isReplying = false
  }
}

async function onTick($: EngineInterface) {
  if (await read($, isHidden)) return
  const now = await read($, tick)
  await update($, tick, n => n + 1)
  if (now - lastActivity === IDLE_TICKS) await say($, pick(QUIPS.idle), 'chatter')
  await answerPending($)
}

async function caress($: EngineInterface) {
  const now = await read($, tick)
  await update($, heartsUntil, () => now + HEART_TICKS)
  await say($, pick(QUIPS.pet), 'direct')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // undefined : premier lancement, on fait éclore ; null : relâché, un œuf attend.
    let stored = (await $.store.get('pet')) as Pet | null | undefined
    if (stored === undefined) {
      stored = hatch(await $.clock.now())
      await $.store.set('pet', stored)
    }
    const hatched = stored
    await update($, pet, () => hatched)
    await update($, isEgg, () => hatched === null)
    const muted = (await $.store.get('muted')) === true
    await update($, isMuted, () => muted)
    if (hatched !== null) await say($, greeting(new Date(await $.clock.now()).getHours()))
    await $.command.register({
      name: 'buddy',
      description: 'Ton compagnon (/buddy help pour les commandes)',
    })
    $.clock.every(TICK_MS, () => void onTick($))

    return next(e)
  })

  on('command.run', { command: 'buddy' }, async ($, e) => {
    const words = e.args.trim().split(/\s+/).filter(Boolean)
    // /buddy <texte libre> = lui parler.
    const [sub = 'card', ...rest] = words[0] !== undefined && !SUBCOMMANDS.includes(words[0]) ? ['talk', ...words] : words
    if (sub === 'help') return { text: HELP }
    const released = ((await $.store.get('released')) ?? []) as Released[]
    if (sub === 'dex') {
      const owned = await read($, pet)
      const seen = new Set([...released.map(r => r.species), ...(owned === null ? [] : [owned.species])])
      return { text: dex(seen) }
    }

    if (sub === 'hatch') {
      if (!(await read($, isEgg))) return { text: 'Il n’y a pas d’œuf à faire éclore. /buddy release d’abord.' }
      const now = await read($, tick)
      const fresh = hatch(await $.clock.now())
      await $.store.set('pet', fresh)
      await update($, isHidden, () => false)
      await update($, hatchingUntil, () => now + HATCH_TICKS)
      await update($, bubble, () => ({ text: 'Bonjour le monde !', until: now + HATCH_TICKS + BUBBLE_TICKS }))
      await update($, pet, () => fresh)
      await update($, isEgg, () => false)
      return { text: `L’œuf éclot…\n\n${card(fresh)}` }
    }

    const current = await read($, pet)
    if (current === null) {
      const egg = 'Un œuf attend au-dessus du prompt. /buddy hatch pour le faire éclore.'
      return { text: [egg, ...memorial(released)].join('\n') }
    }

    switch (sub) {
      case 'pet':
        await update($, isHidden, () => false)
        await caress($)
        return { text: `Tu caresses ${current.name}. ♥` }
      case 'talk': {
        const message = rest.join(' ')
        if (message === '') return { text: 'Usage : /buddy <message>' }
        const answer = await reply($, current, message)
        await update($, isHidden, () => false)
        await say($, answer, 'direct')
        return { text: `${current.name} : ${answer}` }
      }
      case 'mute':
        await update($, isMuted, () => true)
        await $.store.set('muted', true)
        return { text: `${current.name} se tait. /buddy unmute pour lui rendre la parole.` }
      case 'unmute':
        await update($, isMuted, () => false)
        await $.store.set('muted', false)
        await say($, 'Enfin ! J’avais des choses à dire.', 'direct')
        return { text: `${current.name} peut de nouveau parler.` }
      case 'hide':
        await update($, isHidden, () => true)
        return { text: `${current.name} fait une sieste. /buddy show pour le réveiller.` }
      case 'show':
        await update($, isHidden, () => false)
        await say($, 'Coucou !', 'direct')
        return { text: `${current.name} est de retour.` }
      case 'rename': {
        const name = rest.join(' ').slice(0, 20)
        if (name === '') return { text: 'Usage : /buddy rename <nom>' }
        const renamed = { ...current, name }
        await update($, pet, () => renamed)
        await $.store.set('pet', renamed)
        await say($, `Je m’appelle ${name} maintenant !`, 'direct')
        return { text: `Renommé en ${name}.` }
      }
      case 'release': {
        if (rest.join(' ').toLowerCase() !== current.name.toLowerCase()) {
          return { text: `${current.name} partira pour de bon. Tape /buddy release ${current.name} pour confirmer.` }
        }
        const gone: Released = {
          name: current.name,
          species: current.species,
          rarity: current.rarity,
          releasedAt: await $.clock.now(),
        }
        await $.store.set('released', [...released, gone].slice(-20))
        await $.store.set('pet', null)
        await update($, isHidden, () => false)
        await update($, pet, () => null)
        await update($, isEgg, () => true)
        await say($, `${current.name} : ${pick(QUIPS.farewell)}`, 'direct')
        return { text: `${current.name} s’est envolé. Un œuf est apparu : /buddy hatch pour le faire éclore.` }
      }
      default:
        return { text: [card(current), ...memorial(released)].join('\n') }
    }
  })

  on('prompt.submit', async ($, e, next) => {
    lastActivity = await read($, tick)
    const current = await read($, pet)
    if (current !== null && e.text.toLowerCase().includes(current.name.toLowerCase())) {
      await update($, ask, () => e.text)
    } else if (Math.random() < 0.3) {
      await say($, pick(QUIPS.submit), 'chatter')
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId !== undefined) return ran

    if ('isError' in ran && ran.isError === true) {
      await say($, pick(QUIPS.error))
    } else if ((e.tool === 'Edit' || e.tool === 'Write') && Math.random() < 0.25) {
      await say($, pick(QUIPS.edit), 'chatter')
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      lastActivity = await read($, tick)
      if (e.isAborted) await say($, pick(QUIPS.aborted))
      else if (e.durationMs > 120_000) await say($, pick(QUIPS.long))
      else if (Math.random() < 0.3) await say($, pick(QUIPS.done), 'chatter')
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, pet)
    const egg = await read($, isEgg)
    if (e.props.hasSurvey || (current === null && !egg) || (await read($, isHidden))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const now = await read($, tick)
    const said = await read($, bubble)
    const showBubble = said !== null && said.until > now && e.props.bodyColumns >= 40
    const left = await read($, hatchingUntil)

    if (current === null || left > now) {
      const step = HATCH_TICKS - (left - now)
      const sprite = current === null
        ? (now % 6 === 5 ? EGG.wobble : EGG.idle)
        : (EGG.cracks[Math.min(EGG.cracks.length - 1, Math.floor((step * EGG.cracks.length) / HATCH_TICKS))] ?? EGG.idle)

      return (
        <Box flexDirection="row" justifyContent="flex-end" alignItems="flex-end" width={e.props.bodyColumns}>
          {showBubble && (
            <Box borderStyle="round" borderColor="subtle" paddingX={1} marginRight={1} marginBottom={1}>
              <Text wrap="wrap">{said.text}</Text>
            </Box>
          )}
          <Box flexDirection="column" alignItems="center">
            {sprite.map(line => (
              <Text>{line}</Text>
            ))}
            <Text dimColor>{current === null ? '/buddy hatch' : 'crac…'}</Text>
          </Box>
        </Box>
      )
    }

    const hearts = (await read($, heartsUntil)) > now
    const frames = SPECIES[current.species] ?? SPECIES.blob!
    // Gigote vite pendant un tour, lentement au repos ; cligne de temps en temps.
    const isFidget = e.props.isWorking ? now % 2 === 1 : now % 8 === 7
    const eye = now % 13 === 0 ? '-' : current.eye
    const sprite = frames[isFidget ? 1 : 0].map(line => line.replaceAll('E', eye))
    const color = RARITY_COLOR[current.rarity]
    const muted = await read($, isMuted)

    return (
      <Box flexDirection="row" justifyContent="flex-end" alignItems="flex-end" width={e.props.bodyColumns}>
        {showBubble && (
          <Box borderStyle="round" borderColor={color} paddingX={1} marginRight={1} marginBottom={1}>
            <Text wrap="wrap">{said.text}</Text>
          </Box>
        )}
        <Box flexDirection="column" alignItems="center">
          <Text color="error">{hearts ? (now % 2 ? ' ♥   ♥ ' : '   ♥   ') : ' '}</Text>
          {sprite.map(line => (
            <Text color={current.isShiny ? 'warning' : color}>{line}</Text>
          ))}
          <Box flexDirection="row">
            <Text bold color={color}>
              {current.isShiny ? '✨' : ''}
              {current.name}{' '}
            </Text>
            {muted && <Text dimColor>🔇 </Text>}
            <Button key="pet" label="♥" plain hotkey="p" onPress={() => caress($)} />
          </Box>
        </Box>
      </Box>
    )
  })
}
