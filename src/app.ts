import cors from 'cors';
import express, { NextFunction, Request, Response, Router } from 'express';
import { env } from './config/env';
import { HttpError } from './errors';
import { langOf, tr } from './i18n';
import { ADVANCED_IDS, CARDS, CREATURES, DECK_RULES, DEFAULT_DECKS, EVENTS, HEROES, STARTER_IDS } from './game/data';
import { GameError } from './game/engine';
import { authRouter } from './modules/auth/auth.routes';
import { deckRouter } from './modules/decks/deck.routes';
import { gameRouter } from './modules/games/game.routes';
import { roomRouter } from './modules/rooms/room.routes';
import { statsRouter } from './modules/stats/stats.routes';

export const app = express();
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());

const api = Router();
api.get('/catalog', (_req, res) => { res.json({ heroes: HEROES, cards: CARDS, creatures: CREATURES, events: EVENTS, starterIds: STARTER_IDS, advancedIds: ADVANCED_IDS, deckRules: DECK_RULES, defaultDecks: DEFAULT_DECKS }); });
api.use('/auth', authRouter);
api.use('/rooms', roomRouter);
api.use('/games', gameRouter);
api.use('/decks', deckRouter);
api.use('/stats', statsRouter);
app.use('/api', api);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const lang = langOf(req);
  if (err instanceof HttpError) { res.status(err.status).json({ error: tr(lang, err.message, err.params) }); return; }
  if (err instanceof GameError) { res.status(400).json({ error: tr(lang, err.message, err.params) }); return; }
  console.error(err);
  // fora de produção, mostra o motivo real para facilitar a depuração
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? tr(lang, 'server.internal') : `${tr(lang, 'server.internal')} ${err.message}` });
});
