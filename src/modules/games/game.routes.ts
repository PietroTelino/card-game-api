import { Router } from 'express';
import { HttpError } from '../../errors';
import { apply, autoPlay, createGame } from '../../game/engine';
import { discardGame, getGame, saveGame } from '../../game/store';
import { Action, CardInst, GameState } from '../../game/types';
import { authMiddleware } from '../auth/auth.middleware';
import { requireTutorial } from '../auth/tutorial.guard';
import { findUserDeck } from '../decks/deck.routes';

export const gameRouter = Router();

// cada jogador só recebe o que pode ver: a própria mão e o próprio deck, nada do futuro
const hide = (cards: CardInst[], tag: string) => cards.map((_, i) => ({ uid: `${tag}${i}`, defId: 'oculta' }));
const viewFor = (g: GameState, userId: string): GameState => ({
  ...g,
  players: g.players.map((p) => (p.userId === userId ? p : { ...p, hand: hide(p.hand, `${p.index}h`), deck: hide(p.deck, `${p.index}d`) })),
  advancedDeck: hide(g.advancedDeck, 'a'),
  creatureDeck: g.creatureDeck.map(() => 'oculta'),
  eventDeck: g.eventDeck.map(() => 'oculta'),
  rewardOffer: g.players[g.active]?.userId === userId ? g.rewardOffer : [],
  turnRemainingMs: g.turnDeadline ? Math.max(0, g.turnDeadline - Date.now()) : null,
});

// multiplayer: 90 s por turno; o relógio reinicia sempre que muda quem deve agir
export const TURN_MS = 90_000;
const turnKey = (g: GameState) => `${g.phase}|${g.active}|${g.round}|${g.eventsDone}|${g.rewardQueue.length}|${g.scout}`;
export function stampTurn(prev: GameState | null, next: GameState) {
  const over = next.phase === 'victory' || next.phase === 'defeat';
  if (next.mode !== 'multi' || over) next.turnDeadline = null;
  else if (!prev || turnKey(prev) !== turnKey(next)) next.turnDeadline = Date.now() + TURN_MS;
  return next;
}
async function enforceTimer(g: GameState) {
  let cur = g;
  for (let i = 0; i < 3 && cur.mode === 'multi' && cur.turnDeadline && Date.now() > cur.turnDeadline; i++) {
    try { cur = stampTurn(cur, autoPlay(cur)); } catch { break; }
    if (cur.turnDeadline && Date.now() > cur.turnDeadline) cur.turnDeadline = Date.now() + TURN_MS;
  }
  if (cur !== g) await saveGame(cur);
  return cur;
}
gameRouter.use(authMiddleware);

const load = async (id: string, userId: string) => {
  const g = await getGame(id);
  if (!g) throw new HttpError(404, 'game.notFound');
  if (!g.players.some((p) => p.userId === userId)) throw new HttpError(403, 'game.notInGame');
  return enforceTimer(g);
};

// PVE solo
gameRouter.post('/', async (req, res) => {
  const mode = req.body?.mode === 'tutorial' ? 'tutorial' : 'solo';
  if (mode === 'solo') await requireTutorial(req.user!.id);
  res.status(201).json(viewFor(await saveGame(createGame([{ userId: req.user!.id, name: req.user!.name }], mode)), req.user!.id));
});
gameRouter.delete('/:id', async (req, res) => {
  await load(req.params.id, req.user!.id);
  await discardGame(req.params.id);
  res.status(204).end();
});
gameRouter.get('/:id', async (req, res) => { res.json(viewFor(await load(req.params.id, req.user!.id), req.user!.id)); });
gameRouter.post('/:id/actions', async (req, res) => {
  const g = await load(req.params.id, req.user!.id);
  if (g.players[g.active]!.userId !== req.user!.id) throw new HttpError(403, 'game.notYourTurn', { player: g.players[g.active]!.name });
  // o deck vem da coleção do jogador (ou o padrão, se não mandar deckId)
  const { cards: _ignored, ...action } = req.body ?? {};
  if (action.type === 'pickHero' && action.deckId) action.cards = (await findUserDeck(String(action.deckId), req.user!.id)).cards;
  req.body = action;
  res.json(viewFor(await saveGame(stampTurn(g, apply(g, req.body as Action))), req.user!.id));
});
