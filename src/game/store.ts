import { prisma } from '../prisma';
import { GameState } from './types';

// partidas ficam no banco; o cache só evita ler o banco a cada consulta (1,5 s por jogador)
const cache = new Map<string, GameState>();
const ended = (g: GameState) => g.phase === 'victory' || g.phase === 'defeat';

export async function saveGame(g: GameState) {
  cache.set(g.id, g);
  const state = g as object;
  const finishedAt = ended(g) ? new Date() : null;
  await prisma.game.upsert({
    where: { id: g.id },
    create: { id: g.id, mode: g.mode, phase: g.phase, state, finishedAt, participants: { create: g.players.map((p) => ({ userId: p.userId })) } },
    update: { phase: g.phase, state, finishedAt },
  });
  if (finishedAt) {
    for (const p of g.players) {
      await prisma.gameParticipant.updateMany({ where: { gameId: g.id, userId: p.userId }, data: { heroId: p.heroId, won: g.phase === 'victory' } });
    }
    if (g.mode === 'tutorial' && g.phase === 'victory') {
      await prisma.user.updateMany({ where: { id: g.players[0]!.userId, tutorialCompletedAt: null }, data: { tutorialCompletedAt: new Date() } });
    }
    cache.delete(g.id);
  }
  return g;
}

// partida que nem começou (ainda na escolha de herói) é apagada ao sair
export async function discardGame(id: string) {
  cache.delete(id);
  await prisma.game.deleteMany({ where: { id, phase: 'heroDraft', mode: { not: 'multi' } } });
}

export async function getGame(id: string) {
  const hit = cache.get(id);
  if (hit) return hit;
  const row = await prisma.game.findUnique({ where: { id } }).catch(() => null);
  if (!row) return undefined;
  const g = row.state as unknown as GameState;
  if (!ended(g)) cache.set(id, g);
  return g;
}
