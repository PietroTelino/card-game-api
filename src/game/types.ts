export type Effect =
  | { type: 'damage'; amount: number; area: boolean }
  | { type: 'heal'; amount: number }
  | { type: 'armor'; amount: number }
  | { type: 'knowledge' }
  | { type: 'raiseDead' }
  | { type: 'drain'; amount: number }
  | { type: 'draw'; amount: number }
  | { type: 'scout'; amount: number }
  | { type: 'doubleStrike' };

export interface CardDef {
  id: string; name: string; kind: 'arma' | 'magia'; level: number; text: string; art: string;
  attack?: number; uses?: number; onAttack?: { draw?: number; lifesteal?: number };
  effect?: Effect;
}
export type Ability = 'necromancer' | 'rage' | 'heal' | 'pierce' | 'pyro' | 'guard';
export interface HeroDef {
  id: string; name: string; level: number; attack: number; armor: number; hp: number;
  ability: Ability; abilityName: string; text: string; art: string; active: boolean;
}
export interface CreatureDef {
  id: string; name: string; level: number; attack: number; armor: number; hp: number;
  text?: string; onEnterDamage?: number; lifesteal?: number; art: string;
}
export interface EventDef {
  id: string; name: string; art: string;
  text: { evento: string; recompensa: string; conclusao: string };
  mods: { creatureAttack?: number; creatureArmor?: number; creatureHp?: number; heroArmor?: number; spellBonus?: number };
  reward: { reveal: number; heal?: number };
  conclusion: { threat: number };
}

export type Params = Record<string, string | number>;
export interface LogEntry { key: string; params?: Params }
export interface Fx { id: number; key?: string; params?: Params; kind?: 'damage' | 'heal' | 'death' | 'info' | 'phase'; target?: string; source?: string; amount?: number; art?: string }
export interface CardInst { uid: string; defId: string }
export interface Unit { uid: string; defId: string; name: string; attack: number; armor: number; hp: number; maxHp: number }
export interface Player {
  index: number; userId: string; name: string; heroId: string | null; alive: boolean;
  hp: number; maxHp: number; threat: number; tempArmor: number;
  deck: CardInst[]; hand: CardInst[]; discard: CardInst[];
  weapon: { card: CardInst; usesLeft: number } | null;
  attacked: boolean; abilityUsed: boolean;
  creatures: Unit[]; graveyard: Unit[]; allies: Unit[];
}
export type Phase = 'heroDraft' | 'combat' | 'reward' | 'victory' | 'defeat';
export type Mode = 'solo' | 'multi' | 'tutorial';
export interface GameState {
  id: string; mode: Mode; tutorialStep?: number; turnDeadline: number | null; turnRemainingMs?: number | null; phase: Phase; players: Player[]; active: number;
  heroPool: string[];
  creatureDeck: string[]; eventDeck: string[]; advancedDeck: CardInst[];
  event: string | null; eventsDone: number; eventsToWin: number; round: number;
  rewardQueue: number[]; rewardOffer: CardInst[]; scout: boolean;
  log: LogEntry[]; fx: Fx[]; fxSeq: number; version: number; nextUid: number;
}
export type Action =
  | { type: 'pickHero'; heroId: string; deckId?: string; cards?: string[] }
  | { type: 'playCard'; uid: string; targetUid?: string; discardUid?: string }
  | { type: 'attack'; targetUid: string }
  | { type: 'ability'; targetUid?: string }
  | { type: 'endTurn' }
  | { type: 'pickReward'; uid?: string };
