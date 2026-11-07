import { Router } from 'express';
import { HttpError } from '../../errors';
import { DECK_RULES, deckLevel, deckProblem } from '../../game/data';
import { prisma } from '../../prisma';
import { authMiddleware } from '../auth/auth.middleware';

export const deckRouter = Router();
deckRouter.use(authMiddleware);

type DbDeck = { id: string; name: string; cards: string[]; updatedAt: Date };
const view = (d: DbDeck) => ({ id: d.id, name: d.name, cards: d.cards, level: deckLevel(d.cards), updatedAt: d.updatedAt });

function validate(body: { name?: unknown; cards?: unknown }) {
  const name = String(body?.name ?? '').trim();
  if (name.length < 1 || name.length > 30) throw new HttpError(400, 'deck.nameLength');
  const problem = deckProblem(body?.cards);
  if (problem) throw new HttpError(400, problem.key, problem.params);
  return { name, cards: body.cards as string[] };
}
export async function findUserDeck(id: string, userId: string) {
  const d = await prisma.deck.findFirst({ where: { id, userId } });
  if (!d) throw new HttpError(404, 'deck.notFound');
  return d;
}

deckRouter.get('/', async (req, res) => {
  const decks = await prisma.deck.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'asc' } });
  res.json(decks.map(view));
});
deckRouter.post('/', async (req, res) => {
  const data = validate(req.body);
  if ((await prisma.deck.count({ where: { userId: req.user!.id } })) >= DECK_RULES.maxDecks)
    throw new HttpError(409, 'deck.maxDecks', { max: DECK_RULES.maxDecks });
  res.status(201).json(view(await prisma.deck.create({ data: { ...data, userId: req.user!.id } })));
});
deckRouter.put('/:id', async (req, res) => {
  const data = validate(req.body);
  await findUserDeck(req.params.id, req.user!.id);
  res.json(view(await prisma.deck.update({ where: { id: req.params.id }, data })));
});
deckRouter.delete('/:id', async (req, res) => {
  await findUserDeck(req.params.id, req.user!.id);
  await prisma.deck.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
