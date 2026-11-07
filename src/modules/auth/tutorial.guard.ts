import { HttpError } from '../../errors';
import { prisma } from '../../prisma';

// enquanto o tutorial não for concluído, só o tutorial pode ser jogado
export async function requireTutorial(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { tutorialCompletedAt: true } });
  if (!u?.tutorialCompletedAt) throw new HttpError(403, 'tutorial.required');
}
