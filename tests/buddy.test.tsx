import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 20,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 19 },
  view: {},
}
const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

function engine(on: On) {
  mock.clock(on, { now: 1_760_000_000_000 })
  mock.store(on)
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/tmp' }))
  on('model.complete', () => ({ value: { isAnswered: true, text: 'Hou hou, je veille sur ton code.', usage: USAGE } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>moteur</Text>
  })
}

test('l’œuf éclot, la carte s’affiche et la bande dessine le compagnon', async ($, on) => {
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' })

  const shown = await $.command.run({ command: 'buddy', args: '' })
  expect(shown.text).toContain('DEBUG')

  await $.command.run({ command: 'buddy', args: 'rename Biscuit' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'buddy', surface, component: 'AbovePrompt', props: PROPS })
    expect(await ui.find({ type: 'Text', text: /Biscuit/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Je m’appelle Biscuit/ })).toBeDefined()
    await ui.unmount()
  }
})

test('caché, il laisse la bande au moteur', async ($, on) => {
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' })
  await $.command.run({ command: 'buddy', args: 'hide' })

  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ key: 'pet' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'moteur' })).toBeDefined()
  await ui.unmount()
})

test('le relâcher demande confirmation, laisse un œuf, puis il rééclot', async ($, on) => {
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' })
  await $.command.run({ command: 'buddy', args: 'rename Grumly' })

  const asked = await $.command.run({ command: 'buddy', args: 'release' })
  expect(asked.text).toContain('/buddy release Grumly')
  expect((await $.command.run({ command: 'buddy', args: '' })).text).toContain('Grumly')

  const gone = await $.command.run({ command: 'buddy', args: 'release grumly' })
  expect(gone.text).toContain('envolé')

  const egg = await $.command.run({ command: 'buddy', args: '' })
  expect(egg.text).toContain('/buddy hatch')
  expect(egg.text).toContain('Anciens compagnons')

  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ type: 'Text', text: '/buddy hatch' })).toBeDefined()
  await ui.unmount()

  const born = await $.command.run({ command: 'buddy', args: 'hatch' })
  expect(born.text).toContain('DEBUG')
  expect((await $.command.run({ command: 'buddy', args: 'hatch' })).text).toContain('pas d’œuf')
})

test('on peut lui parler, et le mute coupe ses bulles spontanées', async ($, on) => {
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' })

  const talked = await $.command.run({ command: 'buddy', args: 'tu vas bien ?' })
  expect(talked.text).toContain('je veille sur ton code')

  await $.command.run({ command: 'buddy', args: 'mute' })
  await $.command.run({ command: 'buddy', args: 'rename Muet' })

  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  expect(await ui.find({ type: 'Text', text: /🔇/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Je m’appelle Muet/ })).toBeDefined()
  await ui.unmount()
})

test('help liste les commandes sans parler au compagnon', async ($, on) => {
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' })

  const help = await $.command.run({ command: 'buddy', args: 'help' })
  expect(help.text).toContain('/buddy release <nom>')
  expect(help.text).not.toContain('je veille')
})

test('dex liste toutes les espèces et coche celle qu’on a', async ($, on) => {
  engine(on)
  await $.session.start({ source: 'startup', cwd: '/tmp' })

  const list = await $.command.run({ command: 'buddy', args: 'dex' })
  for (const species of ['canard', 'chat', 'blob', 'hibou', 'fantôme', 'axolotl', 'robot', 'dragon']) {
    expect(list.text).toContain(species)
  }
  expect(list.text).toContain('1/8 espèces rencontrées')
})
