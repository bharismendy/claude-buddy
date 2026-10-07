export type Rarity = 'commun' | 'peu commun' | 'rare' | 'épique' | 'légendaire'
export type StatName = 'DEBUG' | 'PATIENCE' | 'CHAOS' | 'SAGESSE' | 'SARCASME'

export type Pet = {
  species: string
  name: string
  rarity: Rarity
  eye: string
  isShiny: boolean
  stats: Record<StatName, number>
  hatchedAt: number
}

export type Released = { name: string; species: string; rarity: Rarity; releasedAt: number }

export type Bubble = { text: string; until: number }

declare module 'claude-code' {
  interface PluginState {
    buddy: {
      pet: Pet | null
      tick: number
      bubble: Bubble | null
      heartsUntil: number
      isHidden: boolean
      isEgg: boolean
      hatchingUntil: number
      isMuted: boolean
      ask: string | null
    }
  }
}
