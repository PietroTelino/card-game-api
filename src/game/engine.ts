import { randomUUID } from 'crypto';
import { ADVANCED_IDS, CARDS, CREATURES, DEFAULT_DECKS, EVENTS, HEROES, TUTORIAL_DECK, byId, deckLevel, deckProblem } from './data';
import { Action, CardInst, Fx, GameState, Mode, Params, Player, Unit } from './types';

export class GameError extends Error { constructor(key: string, public params: Params = {}) { super(key); } }
const fail = (key: string, params: Params = {}): never => { throw new GameError(key, params); };
const HAND_LIMIT = 10, START_HAND = 4, MAX_SKELETONS = 3;

const shuffle = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};
const uid = (s: GameState) => `u${s.nextUid++}`;
const inst = (s: GameState, defId: string): CardInst => ({ uid: uid(s), defId });
const card = (c: CardInst) => byId(CARDS, c.defId);
const hero = (p: Player) => byId(HEROES, p.heroId!);
const ev = (s: GameState) => (s.event ? byId(EVENTS, s.event) : null);
type NewFx = Omit<Fx, 'id'>;
const pushFx = (s: GameState, f: NewFx) => { s.fx.push({ id: ++s.fxSeq, ...f }); if (s.fx.length > 150) s.fx.shift(); };
const log = (s: GameState, key: string, params: Params = {}, f: NewFx = {}) => { s.log.push({ key, params }); if (s.log.length > 80) s.log.shift(); pushFx(s, { kind: 'info', key, params, ...f }); };
// referência a uma unidade para o app traduzir o nome
const unitTag = (owner: Player, u: Unit) => (owner.allies.includes(u) ? 'unit:esqueleto:ally' : `unit:${u.defId}`);
const hid = (p: Player) => `p${p.index}`;

export interface Seat { userId: string; name: string }
export function createGame(seats: Seat[], mode: Mode = 'solo'): GameState {
  const playerCount = seats.length;
  if (playerCount < 1 || playerCount > 4) fail('game.playerCount');
  const players: Player[] = seats.map((seat, i) => ({
    index: i, userId: seat.userId, name: seat.name, heroId: null, alive: true, hp: 0, maxHp: 0, threat: 0, tempArmor: 0,
    deck: [], hand: [], discard: [], weapon: null, attacked: false, abilityUsed: false, creatures: [], graveyard: [], allies: [],
  }));
  const s: GameState = {
    id: randomUUID(), mode, turnDeadline: null, phase: 'heroDraft', players, active: 0,
    heroPool: HEROES.map((h) => h.id),
    creatureDeck: [], eventDeck: shuffle(EVENTS.map((e) => e.id)), advancedDeck: [],
    event: null, eventsDone: 0, eventsToWin: 5, round: 0, rewardQueue: [], rewardOffer: [], scout: false, log: [], fx: [], fxSeq: 0, version: 0, nextUid: 1,
  };
  for (const id of [...ADVANCED_IDS, ...ADVANCED_IDS]) s.advancedDeck.push(inst(s, id));
  shuffle(s.advancedDeck);
  log(s, 'log.heroDraft', {});
  if (mode === 'tutorial') {
    // partida curta e previsível: 1 evento calmo, uma Harpia e um Esqueleto
    s.eventDeck = ['acampamento']; s.creatureDeck = ['harpia', 'esqueleto']; s.eventsToWin = 1;
    act(s, { type: 'pickHero', heroId: 'paladino', cards: TUTORIAL_DECK });
  }
  return s;
}

const draw = (s: GameState, p: Player, n = 1) => {
  for (let i = 0; i < n; i++) {
    if (!p.deck.length) { p.deck = shuffle(p.discard); p.discard = []; }
    const c = p.deck.pop();
    if (!c) return;
    if (p.hand.length >= HAND_LIMIT) { p.discard.push(c); log(s, 'log.handFull', { player: p.name, card: `card:${c.defId}` }); }
    else p.hand.push(c);
  }
};
const alive = (s: GameState) => s.players.filter((p) => p.alive);
const allCreatures = (s: GameState) => alive(s).flatMap((p) => p.creatures.map((u) => ({ p, u })));
const findCreature = (s: GameState, targetUid?: string) => {
  const f = allCreatures(s).find((x) => x.u.uid === targetUid);
  return f ?? fail('game.invalidTarget');
};
const heroArmor = (s: GameState, p: Player) => Math.max(0, hero(p).armor + p.tempArmor + (ev(s)?.mods.heroArmor ?? 0));
const heroAttack = (p: Player) => hero(p).attack + (hero(p).ability === 'rage' ? p.maxHp - p.hp : 0);

function damageCreature(s: GameState, owner: Player, u: Unit, dmg: number, source: string, sourceId?: string) {
    u.hp -= dmg;
  log(s, 'log.damage', { source, dmg, unit: unitTag(owner, u) }, { kind: 'damage', target: u.uid, amount: dmg, ...(sourceId ? { source: sourceId } : {}) });
  if (u.hp <= 0) {
    owner.creatures = owner.creatures.filter((x) => x !== u);
    owner.graveyard.push(u);
    log(s, 'log.died', { unit: unitTag(owner, u) }, { kind: 'death', target: u.uid, art: byId(CREATURES, u.defId).art });
  }
}
const summonSkeleton = (s: GameState, p: Player) =>
  p.allies.push({ uid: uid(s), defId: 'esqueleto', name: 'Esqueleto aliado', attack: 1, armor: 1, hp: 3, maxHp: 3 });

// um golpe do herói (com a arma, se tiver)
function strike(s: GameState, p: Player, t: { p: Player; u: Unit }) {
  const pierce = hero(p).ability === 'pierce' ? 2 : 0;
  const w = p.weapon ? card(p.weapon.card) : null;
  const dmg = Math.max(1, heroAttack(p) + (w?.attack ?? 0) - Math.max(0, t.u.armor - pierce));
  damageCreature(s, t.p, t.u, dmg, `hero:${p.heroId}`, hid(p));
  if (p.weapon && w) {
    if (w.onAttack?.draw) draw(s, p, w.onAttack.draw);
    if (w.onAttack?.lifesteal) p.hp = Math.min(p.maxHp, p.hp + w.onAttack.lifesteal);
    if (--p.weapon.usesLeft <= 0) { p.discard.push(p.weapon.card); log(s, 'log.broke', { card: `card:${w.id}` }); p.weapon = null; }
  }
}

function startEvent(s: GameState) {
  if (s.eventsDone >= s.eventsToWin) { s.phase = 'victory'; s.event = null; log(s, 'log.victory', {}); return; }
  if (!s.eventDeck.length) s.eventDeck = shuffle(EVENTS.map((e) => e.id));
  s.event = s.eventDeck.pop()!;
  const e = ev(s)!;
  log(s, 'log.eventRevealed', { event: `event:${e.id}`, text: `eventText:${e.id}` });
  const total = alive(s).reduce((t, p) => t + p.threat, 0);
  log(s, 'log.threat', { n: total });
  const entering: { id: string; art: string; onEnterDamage?: number }[] = [];
  for (const p of alive(s)) {
    for (let i = 0; i < p.threat; i++) {
      if (!s.creatureDeck.length) s.creatureDeck = shuffle(CREATURES.map((c) => c.id).flatMap((id) => [id, id, id]));
      const d = byId(CREATURES, s.creatureDeck.pop()!);
      const hp = d.hp + (e.mods.creatureHp ?? 0);
      p.creatures.push({ uid: uid(s), defId: d.id, name: d.name, attack: d.attack + (e.mods.creatureAttack ?? 0), armor: d.armor + (e.mods.creatureArmor ?? 0), hp, maxHp: hp });
      if (d.onEnterDamage) entering.push(d);
    }
  }
  s.phase = 'combat';
  // marca para a tela: a partir daqui ela já mostra o tabuleiro do evento
  pushFx(s, { kind: 'phase' });
  for (const d of entering) {
    log(s, 'log.onEnter', { unit: `unit:${d.id}`, dmg: d.onEnterDamage! }, { art: d.art });
    for (const q of alive(s)) { q.hp -= d.onEnterDamage!; pushFx(s, { kind: 'damage', target: hid(q), amount: d.onEnterDamage! }); }
  }
  checkDeaths(s);
  if (s.phase === 'combat') startRound(s);
}

function startRound(s: GameState) {
  s.round++;
  for (const p of alive(s)) { p.tempArmor = 0; p.attacked = false; p.abilityUsed = false; draw(s, p); }
  s.active = alive(s)[0]!.index;
  log(s, 'log.round', { n: s.round, player: s.players[s.active]!.name });
}

function checkDeaths(s: GameState) {
  for (const p of alive(s)) {
    if (p.hp <= 0) {
      p.hp = 0; p.alive = false; p.creatures = [];
      log(s, 'log.heroDied', { hero: `hero:${p.heroId}`, player: p.name }, { kind: 'death', target: hid(p), art: hero(p).art });
    }
  }
  if (!alive(s).length) { s.phase = 'defeat'; log(s, 'log.defeat', {}); return; }
  if (s.phase === 'combat' && !allCreatures(s).length) finishEvent(s);
}

function finishEvent(s: GameState) {
  const e = ev(s)!;
  log(s, 'log.eventDone', { event: `event:${e.id}` });
  if (e.reward.heal) for (const p of alive(s)) p.hp = Math.min(p.maxHp, p.hp + e.reward.heal);
  s.phase = 'reward';
  s.rewardQueue = alive(s).map((p) => p.index);
  offerReward(s);
}
function offerReward(s: GameState) {
  const next = s.rewardQueue[0];
  if (next === undefined) return concludeEvent(s);
  s.active = next;
  s.rewardOffer = s.advancedDeck.splice(0, ev(s)!.reward.reveal);
}
function concludeEvent(s: GameState) {
  const e = ev(s)!;
  for (const p of alive(s)) p.threat += e.conclusion.threat;
  log(s, 'log.conclusion', { text: `eventEnd:${e.id}` });
  s.eventsDone++;
  s.event = null;
  startEvent(s);
}

function endHeroTurn(s: GameState, p: Player) {
  for (const a of p.allies) {
    const t = p.creatures[0];
    if (t) damageCreature(s, p, t, Math.max(1, a.attack - t.armor), 'unit:esqueleto:ally', a.uid);
  }
  checkDeaths(s);
  if (s.phase !== 'combat') return;
  const next = alive(s).find((q) => q.index > p.index);
  if (next) { s.active = next.index; log(s, 'log.turn', { player: next.name }); return; }
  // turno das criaturas
  for (const q of alive(s)) {
    for (const c of q.creatures) {
      const ally = q.allies[0];
      if (ally) {
        const dmg = Math.max(1, c.attack - ally.armor);
        ally.hp -= dmg;
        log(s, 'log.attack', { unit: `unit:${c.defId}`, target: 'unit:esqueleto:ally', dmg }, { kind: 'damage', target: ally.uid, source: c.uid, amount: dmg });
        if (ally.hp <= 0) { q.allies.shift(); log(s, 'log.died', { unit: 'unit:esqueleto:ally' }, { kind: 'death', target: ally.uid, art: 'art/esqueleto' }); }
      } else {
        const dmg = Math.max(1, c.attack - heroArmor(s, q));
        q.hp -= dmg;
        log(s, 'log.attack', { unit: `unit:${c.defId}`, target: `hero:${q.heroId}`, dmg }, { kind: 'damage', target: hid(q), source: c.uid, amount: dmg });
      }
      const d = byId(CREATURES, c.defId);
      if (d.lifesteal) c.hp = Math.min(c.maxHp, c.hp + d.lifesteal);
    }
  }
  checkDeaths(s);
  if (s.phase === 'combat') startRound(s);
}

// aplica a ação numa cópia: se der erro, a partida original não muda
export const apply = (s: GameState, a: Action): GameState => act(structuredClone(s), a);

// tutorial: na 1ª e 2ª rodada só a ação ensinada é permitida
export const TUTORIAL_STEPS: { action: Action['type']; card?: string; msg: string }[] = [
  { action: 'playCard', card: 'espada-curta', msg: 'tutorial.step0' },
  { action: 'attack', msg: 'tutorial.step1' },
  { action: 'playCard', card: 'faisca', msg: 'tutorial.step2' },
  { action: 'endTurn', msg: 'tutorial.step3' },
  { action: 'playCard', card: 'cura', msg: 'tutorial.step4' },
  { action: 'ability', msg: 'tutorial.step5' },
];
function tutorialGuard(s: GameState, a: Action) {
  if (s.mode !== 'tutorial') return;
  if (s.phase === 'reward' && a.type === 'pickReward' && !a.uid) fail('tutorial.pickReward');
  const step = TUTORIAL_STEPS[s.tutorialStep ?? 0];
  if (s.phase !== 'combat' || !step) return;
  const p = s.players[s.active]!;
  const playedCard = a.type === 'playCard' ? p.hand.find((c) => c.uid === a.uid)?.defId : undefined;
  if (a.type !== step.action || (step.card && playedCard !== step.card)) fail(step.msg);
  s.tutorialStep = (s.tutorialStep ?? 0) + 1;
}

export function act(s: GameState, a: Action): GameState {
  s.version++;
  tutorialGuard(s, a);
  if (s.scout && a.type !== 'pickReward') fail('game.chooseAdvancedFirst');
  const p = s.players[s.active]!;
  switch (a.type) {
    case 'pickHero': {
      if (s.phase !== 'heroDraft') fail('game.notHeroDraft');
      if (!s.heroPool.includes(a.heroId)) fail('game.heroUnavailable');
      const h = byId(HEROES, a.heroId);
      const ids = a.cards ?? DEFAULT_DECKS[h.level] ?? DEFAULT_DECKS[1]!;
      const problem = deckProblem(ids);
      if (problem) fail(problem.key, problem.params);
      if (deckLevel(ids) > h.level) fail('game.deckLevelTooHigh', { deckLevel: deckLevel(ids), heroLevel: h.level });
      Object.assign(p, { heroId: h.id, hp: h.hp, maxHp: h.hp, threat: h.level + 1 });
      p.deck = s.mode === 'tutorial' ? ids.map((id) => inst(s, id)).reverse() : shuffle(ids.map((id) => inst(s, id)));
      s.heroPool = s.heroPool.filter((id) => id !== h.id);
      log(s, 'log.pickedHero', { player: p.name, hero: `hero:${h.id}` });
      if (s.active + 1 < s.players.length) s.active++;
      else {
        for (const q of s.players) draw(s, q, START_HAND);
        log(s, 'log.heroesChosen', {});
        startEvent(s);
      }
      break;
    }
    case 'playCard': {
      if (s.phase !== 'combat') fail('game.playOnlyCombat');
      const c = p.hand.find((x) => x.uid === a.uid) ?? fail('game.cardNotInHand');
      const d = card(c);
      pushFx(s, { kind: 'info', key: 'log.played', params: { player: p.name, card: `card:${d.id}` }, art: d.art });
      const fromHand = () => { p.hand = p.hand.filter((x) => x !== c); };
      if (d.kind === 'arma') {
        fromHand();
        if (p.weapon) p.discard.push(p.weapon.card);
        p.weapon = { card: c, usesLeft: d.uses! };
        log(s, 'log.equipped', { player: p.name, card: `card:${d.id}` });
        break;
      }
      const eff = d.effect!;
      if (eff.type === 'drain') {
        const t = findCreature(s, a.targetUid);
        fromHand();
        damageCreature(s, t.p, t.u, eff.amount + (ev(s)?.mods.spellBonus ?? 0), `card:${d.id}`);
        p.hp = Math.min(p.maxHp, p.hp + eff.amount);
        log(s, 'log.healed', { player: p.name, n: eff.amount }, { kind: 'heal', target: hid(p), amount: eff.amount });
      } else if (eff.type === 'draw') {
        fromHand(); draw(s, p, eff.amount); log(s, 'log.drew', { player: p.name, n: eff.amount });
      } else if (eff.type === 'doubleStrike') {
        const t = findCreature(s, a.targetUid);
        fromHand();
        for (let i = 0; i < 2 && t.p.creatures.includes(t.u); i++) strike(s, p, t);
      } else if (eff.type === 'scout') {
        if (!s.advancedDeck.length) fail('game.advancedEmpty');
        fromHand();
        s.rewardOffer = s.advancedDeck.splice(0, eff.amount);
        s.scout = true;
        log(s, 'log.scout', { player: p.name });
      } else if (eff.type === 'damage') {
        const dmg = eff.amount + (hero(p).ability === 'pyro' ? 1 : 0) + (ev(s)?.mods.spellBonus ?? 0);
        if (eff.area) { if (!p.creatures.length) fail('game.noCreatures'); }
        else findCreature(s, a.targetUid);
        fromHand();
        if (eff.area) for (const u of [...p.creatures]) damageCreature(s, p, u, dmg, `card:${d.id}`);
        else { const t = findCreature(s, a.targetUid); damageCreature(s, t.p, t.u, dmg, `card:${d.id}`); }
      } else if (eff.type === 'heal') {
        fromHand(); p.hp = Math.min(p.maxHp, p.hp + eff.amount); log(s, 'log.healed', { player: p.name, n: eff.amount }, { kind: 'heal', target: hid(p), amount: eff.amount });
      } else if (eff.type === 'armor') {
        fromHand(); p.tempArmor += eff.amount; log(s, 'log.armor', { player: p.name, n: eff.amount });
      } else if (eff.type === 'knowledge') {
        const disc = p.hand.find((x) => x.uid === a.discardUid && x !== c) ?? fail('game.chooseDiscard');
        fromHand();
        p.hand = p.hand.filter((x) => x !== disc);
        p.discard.push(disc);
        draw(s, p, card(disc).level);
        log(s, 'log.discardDraw', { player: p.name, card: `card:${disc.defId}`, n: card(disc).level });
      } else {
        if (!p.graveyard.length) fail('game.noDeadCreatures');
        fromHand();
        let n = 0;
        while (n < 3 && p.graveyard.length && p.allies.length < MAX_SKELETONS) { p.graveyard.pop(); summonSkeleton(s, p); n++; }
        log(s, 'log.summoned', { player: p.name, n });
      }
      p.discard.push(c);
      checkDeaths(s);
      break;
    }
    case 'attack': {
      if (s.phase !== 'combat') fail('game.attackOnlyCombat');
      if (p.attacked) fail('game.alreadyAttacked');
      const t = findCreature(s, a.targetUid);
      p.attacked = true;
      strike(s, p, t);
      checkDeaths(s);
      break;
    }
    case 'ability': {
      if (s.phase !== 'combat') fail('game.abilityOnlyCombat');
      const h = hero(p);
      if (!h.active) fail('game.abilityPassive');
      if (p.abilityUsed) fail('game.abilityUsed');
      if (h.ability === 'necromancer') {
        if (!p.graveyard.length) fail('game.noDeadCreatures');
        if (p.allies.length >= MAX_SKELETONS) fail('game.maxSkeletons');
        p.graveyard.pop(); summonSkeleton(s, p); log(s, 'log.summoned', { player: p.name, n: 1 });
      } else if (h.ability === 'heal') { p.hp = Math.min(p.maxHp, p.hp + 2); log(s, 'log.healed', { player: p.name, n: 2 }, { kind: 'heal', target: hid(p), amount: 2 }); }
      else if (h.ability === 'guard') { p.tempArmor += 2; log(s, 'log.armor', { player: p.name, n: 2 }); }
      p.abilityUsed = true;
      break;
    }
    case 'endTurn':
      if (s.phase !== 'combat') fail('game.noTurnToEnd');
      endHeroTurn(s, p);
      break;
    case 'pickReward': {
      if (s.phase !== 'reward' && !s.scout) fail('game.noCardToPick');
      if (a.uid) {
        const c = s.rewardOffer.find((x) => x.uid === a.uid) ?? fail('game.cardNotRevealed');
        p.deck.push(c); shuffle(p.deck);
        s.rewardOffer = s.rewardOffer.filter((x) => x !== c);
        log(s, 'log.tookReward', { player: p.name, card: `card:${c.defId}` });
      }
      s.advancedDeck.push(...s.rewardOffer); shuffle(s.advancedDeck);
      s.rewardOffer = [];
      if (s.scout) { s.scout = false; break; }
      s.rewardQueue.shift();
      offerReward(s);
      break;
    }
    default: fail('game.unknownAction');
  }
  return s;
}


// tempo do turno esgotado (multiplayer): o jogo joga pelo jogador da vez
export function autoPlay(g: GameState): GameState {
  const s = structuredClone(g);
  const p = s.players[s.active]!;
  log(s, 'log.timeout', { player: p.name });
  if (s.phase === 'heroDraft') act(s, { type: 'pickHero', heroId: s.heroPool[Math.floor(Math.random() * s.heroPool.length)]! });
  else if (s.phase === 'reward') act(s, { type: 'pickReward' });
  else if (s.phase === 'combat') { if (s.scout) act(s, { type: 'pickReward' }); act(s, { type: 'endTurn' }); }
  return s;
}
