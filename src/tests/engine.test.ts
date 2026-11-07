import assert from 'assert';
import { CARDS, byId, DEFAULT_DECKS } from '../game/data';
import { act, createGame } from '../game/engine';
import { GameState } from '../game/types';

// joga partidas inteiras com um "robô" simples para garantir que o fluxo sempre termina
function bot(s: GameState) {
  const p = s.players[s.active]!;
  if (s.phase === 'heroDraft') return act(s, { type: 'pickHero', heroId: s.heroPool[0]! });
  if (s.phase === 'reward') return act(s, s.rewardOffer[0] ? { type: 'pickReward', uid: s.rewardOffer[0].uid } : { type: 'pickReward' });
  const target = p.creatures[0] ?? s.players.flatMap((q) => (q.alive ? q.creatures : []))[0];
  const w = p.hand.find((c) => byId(CARDS, c.defId).kind === 'arma');
  if (w && !p.weapon) return act(s, { type: 'playCard', uid: w.uid });
  const f = p.hand.find((c) => { const e = byId(CARDS, c.defId).effect; return e?.type === 'damage' && !e.area; });
  if (f && target) return act(s, { type: 'playCard', uid: f.uid, targetUid: target.uid });
  if (!p.attacked && target) return act(s, { type: 'attack', targetUid: target.uid });
  return act(s, { type: 'endTurn' });
}

const seats = (n: number) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `Jogador ${i + 1}` }));
const results = { victory: 0, defeat: 0 };
for (let n = 1; n <= 4; n++) {
  for (let g = 0; g < 50; g++) {
    const s = createGame(seats(n));
    let steps = 0;
    while (s.phase !== 'victory' && s.phase !== 'defeat') { bot(s); assert(++steps < 5000, 'partida não terminou'); }
    for (const p of s.players) assert(p.hand.length <= 10, 'mão acima do limite');
    results[s.phase]++;
  }
}
assert.throws(() => createGame(seats(5)));
const s = createGame(seats(1));
assert.throws(() => act(s, { type: 'pickHero', heroId: 'naisha', cards: DEFAULT_DECKS[2]! }), /deckLevelTooHigh/);
assert.throws(() => act(s, { type: 'pickHero', heroId: 'naisha', cards: ['adaga', 'adaga', 'adaga', ...DEFAULT_DECKS[1]!.slice(3)] }), /deck.maxCopies/);
assert.throws(() => act(s, { type: 'pickHero', heroId: 'naisha', cards: ['meteoro', ...DEFAULT_DECKS[1]!.slice(1)] }), /deck.rewardOnly/);
const v = createGame(seats(1));
act(v, { type: 'pickHero', heroId: 'paladino' });
const pl = v.players[0]!;
const visao = { uid: 'teste', defId: 'visao' };
pl.hand.push(visao);
const antes = pl.deck.length;
act(v, { type: 'playCard', uid: 'teste' });
assert.equal(v.rewardOffer.length, 5);
assert.throws(() => act(v, { type: 'endTurn' }), /chooseAdvancedFirst/);
act(v, { type: 'pickReward', uid: v.rewardOffer[0]!.uid });
assert.equal(pl.deck.length, antes + 1);
assert.equal(v.scout, false);
// Golpe Duplo gasta 2 usos da arma
const gd = createGame(seats(1));
act(gd, { type: 'pickHero', heroId: 'guardiao' });
const gp = gd.players[0]!;
gp.weapon = { card: { uid: 'w', defId: 'funda' }, usesLeft: 5 };
const alvo = gp.creatures[0]!;
alvo.hp = 99; alvo.maxHp = 99;
gp.hand.push({ uid: 'gd', defId: 'golpe-duplo' });
act(gd, { type: 'playCard', uid: 'gd', targetUid: alvo.uid });
assert.equal(gp.weapon!.usesLeft, 3);
assert.equal(gp.attacked, false);
// tutorial: Paladino escolhido sozinho, 1 evento, mão inicial previsível
const tu = createGame(seats(1), 'tutorial');
assert.equal(tu.phase, 'combat');
assert.equal(tu.players[0]!.heroId, 'paladino');
assert.deepEqual(tu.players[0]!.hand.slice(0, 4).map((c) => c.defId), ['espada-curta', 'faisca', 'cura', 'escudo']);
assert.equal(tu.eventsToWin, 1);
const tp = tu.players[0]!;
assert.throws(() => act(tu, { type: 'endTurn' }), /tutorial.step0/);
act(tu, { type: 'playCard', uid: tp.hand.find((c) => c.defId === 'espada-curta')!.uid });
act(tu, { type: 'attack', targetUid: tp.creatures[0]!.uid });
act(tu, { type: 'playCard', uid: tp.hand.find((c) => c.defId === 'faisca')!.uid, targetUid: tp.creatures[0]!.uid });
act(tu, { type: 'endTurn' });
act(tu, { type: 'playCard', uid: tp.hand.find((c) => c.defId === 'cura')!.uid });
act(tu, { type: 'ability' });
while (tu.phase === 'combat') { const c = tp.creatures[0]; act(tu, c && !tp.attacked ? { type: 'attack', targetUid: c.uid } : { type: 'endTurn' }); }
assert.equal(tu.phase, 'reward');
assert.throws(() => act(tu, { type: 'pickReward' }), /tutorial.pickReward/);
act(tu, { type: 'pickReward', uid: tu.rewardOffer[0]!.uid });
assert.equal(tu.phase, 'victory');
console.log('Testes ok. Resultado das partidas do robô:', results);
