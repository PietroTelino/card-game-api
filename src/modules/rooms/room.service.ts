import { HttpError } from '../../errors';
import { createGame, Seat } from '../../game/engine';
import { saveGame } from '../../game/store';
import { stampTurn } from '../games/game.routes';

export interface Room { code: string; hostId: string; members: Seat[]; status: 'waiting' | 'started'; gameId: string | null; createdAt: string }
const MAX = 4;
const rooms = new Map<string, Room>();
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0, O, 1, I, L

const newCode = () => {
  let c = '';
  do { c = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join(''); } while (rooms.has(c));
  return c;
};
const find = (code: string) => rooms.get(code.toUpperCase()) ?? (() => { throw new HttpError(404, 'room.notFound'); })();
const view = (r: Room, userId: string) => ({ ...r, isHost: r.hostId === userId, isMember: r.members.some((m) => m.userId === userId) });

function leaveAll(userId: string) {
  for (const r of rooms.values()) {
    if (r.status !== 'waiting' || !r.members.some((m) => m.userId === userId)) continue;
    r.members = r.members.filter((m) => m.userId !== userId);
    if (!r.members.length) rooms.delete(r.code);
    else if (r.hostId === userId) r.hostId = r.members[0]!.userId;
  }
}

export const listRooms = (userId: string) =>
  [...rooms.values()].filter((r) => r.status === 'waiting' && r.members.length < MAX).map((r) => view(r, userId));

export function createRoom(user: Seat) {
  leaveAll(user.userId);
  const r: Room = { code: newCode(), hostId: user.userId, members: [user], status: 'waiting', gameId: null, createdAt: new Date().toISOString() };
  rooms.set(r.code, r);
  return view(r, user.userId);
}

export const getRoom = (code: string, userId: string) => view(find(code), userId);

export function joinRoom(code: string, user: Seat) {
  const r = find(code);
  if (r.members.some((m) => m.userId === user.userId)) return view(r, user.userId);
  if (r.status !== 'waiting') throw new HttpError(409, 'room.alreadyStarted');
  if (r.members.length >= MAX) throw new HttpError(409, 'room.full');
  leaveAll(user.userId);
  r.members.push(user);
  return view(r, user.userId);
}

export function leaveRoom(code: string, userId: string) {
  const r = find(code);
  r.members = r.members.filter((m) => m.userId !== userId);
  if (!r.members.length) rooms.delete(r.code);
  else if (r.hostId === userId) r.hostId = r.members[0]!.userId;
}

export async function startRoom(code: string, userId: string) {
  const r = find(code);
  if (r.hostId !== userId) throw new HttpError(403, 'room.onlyHost');
  if (r.status !== 'waiting') throw new HttpError(409, 'room.alreadyStarted');
  const game = await saveGame(stampTurn(null, createGame(r.members, 'multi')));
  r.status = 'started';
  r.gameId = game.id;
  return view(r, userId);
}
