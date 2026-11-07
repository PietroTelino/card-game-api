import { Router } from 'express';
import { GameState } from '../../game/types';
import { prisma } from '../../prisma';
import { authMiddleware } from '../auth/auth.middleware';

export const statsRouter = Router();
statsRouter.use(authMiddleware);

// resumo do jogador: tutorial, placar, herói favorito, partidas em andamento e histórico
statsRouter.get('/me', async (req, res) => {
  const userId = req.user!.id;
  const [user, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { tutorialCompletedAt: true } }),
    prisma.gameParticipant.findMany({ where: { userId }, include: { game: true }, orderBy: { game: { updatedAt: 'desc' } }, take: 30 }),
  ]);
  const all = await prisma.gameParticipant.groupBy({ by: ['won'], where: { userId, won: { not: null }, game: { mode: { not: 'tutorial' } } }, _count: true });
  const fav = await prisma.gameParticipant.groupBy({ by: ['heroId'], where: { userId, heroId: { not: null } }, _count: true, orderBy: { _count: { heroId: 'desc' } }, take: 1 });
  // limpa partidas solo abandonadas antes de escolher o herói
  const stale = rows.filter((r) => !r.game.finishedAt && r.game.phase === 'heroDraft' && r.game.mode !== 'multi');
  if (stale.length) await prisma.game.deleteMany({ where: { id: { in: stale.map((r) => r.gameId) } } });
  const games = rows.filter((r) => !stale.includes(r)).map((r) => {
    const g = r.game.state as unknown as GameState;
    return {
      gameId: r.gameId, mode: r.game.mode, phase: r.game.phase, won: r.won, heroId: r.heroId ?? g.players.find((p) => p.userId === userId)?.heroId ?? null,
      eventsDone: g.eventsDone, eventsToWin: g.eventsToWin, players: g.players.map((p) => p.name), updatedAt: r.game.updatedAt, finishedAt: r.game.finishedAt,
    };
  });
  res.json({
    tutorialDone: !!user?.tutorialCompletedAt,
    wins: all.find((x) => x.won === true)?._count ?? 0,
    losses: all.find((x) => x.won === false)?._count ?? 0,
    favoriteHero: fav[0]?.heroId ?? null,
    active: games.filter((x) => !x.finishedAt),
    history: games.filter((x) => x.finishedAt),
  });
});
