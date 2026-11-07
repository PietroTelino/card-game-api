import { CardDef, CreatureDef, EventDef, HeroDef } from './types';

const ch = (n: string) => `characters/${n}`;

export const HEROES: HeroDef[] = [
  { id: 'necromante', name: 'Necromante', level: 2, attack: 3, armor: 2, hp: 8, ability: 'necromancer', active: true, abilityName: 'Manipulação dos mortos',
    text: 'Uma vez por turno, remova do jogo uma de suas criaturas mortas e invoque um esqueleto 1/1/3 (máximo 3 esqueletos).', art: ch('necromante') },
  { id: 'naisha', name: 'Naisha', level: 1, attack: 1, armor: 1, hp: 10, ability: 'rage', active: false, abilityName: 'Fúria',
    text: 'Para cada ponto de vida a menos, Naisha ganha +1 de ataque.', art: ch('barbaro') },
  { id: 'paladino', name: 'Paladino', level: 1, attack: 2, armor: 2, hp: 10, ability: 'heal', active: true, abilityName: 'Prece',
    text: 'Uma vez por turno, cure 2 de vida.', art: ch('paladino') },
  { id: 'arqueiro', name: 'Arqueiro', level: 1, attack: 2, armor: 1, hp: 8, ability: 'pierce', active: false, abilityName: 'Tiro certeiro',
    text: 'Seus ataques ignoram 2 de armadura.', art: ch('arqueiro') },
  { id: 'piromante', name: 'Piromante', level: 2, attack: 1, armor: 1, hp: 7, ability: 'pyro', active: false, abilityName: 'Chama interior',
    text: 'Suas magias de dano causam +1 de dano.', art: ch('piromante') },
  { id: 'guardiao', name: 'Guardião', level: 1, attack: 1, armor: 3, hp: 10, ability: 'guard', active: true, abilityName: 'Muralha',
    text: 'Uma vez por turno, ganhe +2 de armadura até a próxima rodada.', art: ch('guardiao') },
];

const ART: Record<string, string> = Object.fromEntries(["faisca", "raio", "tempestade", "martelo-trovao", "cajado-xama", "cura", "cura-maior", "julgamento", "maca", "escudo", "chuva-de-gelo", "nevasca", "barreira-gelo", "dardo-arcano", "drenar-vida", "convocar-mortos", "visao", "cajado-aprendiz", "inspiracao", "reflexos", "sabedoria", "postura", "golpe-duplo", "espada-curta", "espada-longa", "funda", "arco-elfico", "adaga", "machado", "lanca-runica", "lamina-vampirica", "toque-vampirico", "bola-de-fogo", "meteoro"].map((id) => [id, `cards/${id}`]));

const W = (id: string, name: string, level: number, attack: number, uses: number, text: string, onAttack?: CardDef['onAttack']): CardDef =>
  ({ id, name, kind: 'arma', level, attack, uses, text, art: ART[id] ?? 'cards/arma', ...(onAttack ? { onAttack } : {}) });
const M = (id: string, name: string, level: number, text: string, effect: CardDef['effect']): CardDef =>
  ({ id, name, kind: 'magia', level, text, art: ART[id] ?? 'cards/magia', effect });

export const CARDS: CardDef[] = [
  W('adaga', 'Adaga', 1, 1, 3, 'Arma leve e rápida.'),
  W('espada-curta', 'Espada Curta', 1, 2, 2, 'Confiável em qualquer batalha.'),
  W('machado', 'Machado de Guerra', 2, 3, 2, 'Pesado, mas devastador.'),
  W('cajado-xama', 'Cajado do Xamã', 2, 1, 3, 'Cada vez que atacar, o jogador compra uma carta.', { draw: 1 }),
  M('faisca', 'Faísca', 1, 'Cause 2 de dano a uma criatura.', { type: 'damage', amount: 2, area: false }),
  M('cura', 'Cura', 1, 'Cure 3 de vida.', { type: 'heal', amount: 3 }),
  M('escudo', 'Escudo Arcano', 1, 'Ganhe +2 de armadura até a próxima rodada.', { type: 'armor', amount: 2 }),
  M('bola-de-fogo', 'Bola de Fogo', 2, 'Cause 4 de dano a uma criatura.', { type: 'damage', amount: 4, area: false }),
  M('chuva-de-gelo', 'Chuva de Gelo', 2, 'Cause 1 de dano a todas as suas criaturas.', { type: 'damage', amount: 1, area: true }),
  M('conhecimento', 'Adquirindo Conhecimento', 2, 'Descarte uma carta e compre um número de cartas igual ao nível da carta descartada.', { type: 'knowledge' }),
  W('maca', 'Maça', 1, 2, 3, 'Simples e resistente.'),
  M('visao', 'Visão do Destino', 1, 'Veja as 5 primeiras cartas do deck avançado e escolha uma para adicionar ao seu deck principal.', { type: 'scout', amount: 5 }),
  M('toque-vampirico', 'Toque Vampírico', 1, 'Cause 2 de dano a uma criatura e cure 2 de vida.', { type: 'drain', amount: 2 }),
  W('lanca-runica', 'Lança Rúnica', 2, 3, 3, 'Runas antigas mantêm a ponta afiada.'),
  M('raio', 'Raio', 2, 'Cause 5 de dano a uma criatura.', { type: 'damage', amount: 5, area: false }),
  M('inspiracao', 'Inspiração', 2, 'Compre 2 cartas.', { type: 'draw', amount: 2 }),
  M('reflexos', 'Reflexos Rápidos', 1, 'Compre 1 carta.', { type: 'draw', amount: 1 }),
  M('golpe-duplo', 'Golpe Duplo', 1, 'Ataque um alvo duas vezes. Se tiver arma equipada, gasta 2 usos.', { type: 'doubleStrike' }),
  M('dardo-arcano', 'Dardo Arcano', 1, 'Cause 3 de dano a uma criatura.', { type: 'damage', amount: 3, area: false }),
  M('postura', 'Postura Defensiva', 1, 'Ganhe +3 de armadura até a próxima rodada.', { type: 'armor', amount: 3 }),
  W('cajado-aprendiz', 'Cajado do Aprendiz', 1, 1, 2, 'Cada vez que atacar, o jogador compra uma carta.', { draw: 1 }),
  W('funda', 'Funda', 1, 1, 5, 'Munição nunca falta.'),
  // deck avançado
  W('espada-longa', 'Espada Longa', 3, 4, 3, 'Forjada para heróis.'),
  W('lamina-vampirica', 'Lâmina Vampírica', 3, 3, 3, 'Cada vez que atacar, cure 1 de vida.', { lifesteal: 1 }),
  M('meteoro', 'Meteoro', 4, 'Cause 6 de dano a uma criatura.', { type: 'damage', amount: 6, area: false }),
  M('cura-maior', 'Cura Maior', 3, 'Cure 6 de vida.', { type: 'heal', amount: 6 }),
  M('tempestade', 'Tempestade', 4, 'Cause 2 de dano a todas as suas criaturas.', { type: 'damage', amount: 2, area: true }),
  W('martelo-trovao', 'Martelo do Trovão', 4, 5, 3, 'Cada golpe ecoa como trovão.'),
  W('arco-elfico', 'Arco Élfico', 3, 3, 5, 'Cada vez que atacar, o jogador compra uma carta.', { draw: 1 }),
  W('lamina-dragao', 'Lâmina do Dragão', 5, 6, 3, 'Cada vez que atacar, cure 2 de vida.', { lifesteal: 2 }),
  M('drenar-vida', 'Drenar Vida', 3, 'Cause 5 de dano a uma criatura e cure 5 de vida.', { type: 'drain', amount: 5 }),
  M('nevasca', 'Nevasca', 5, 'Cause 3 de dano a todas as suas criaturas.', { type: 'damage', amount: 3, area: true }),
  M('sabedoria', 'Sabedoria Ancestral', 3, 'Compre 3 cartas.', { type: 'draw', amount: 3 }),
  M('barreira-gelo', 'Barreira de Gelo', 3, 'Ganhe +5 de armadura até a próxima rodada.', { type: 'armor', amount: 5 }),
  M('julgamento', 'Julgamento', 5, 'Cause 9 de dano a uma criatura.', { type: 'damage', amount: 9, area: false }),
  M('convocar-mortos', 'Convocar Mortos', 3, 'Remova do jogo até 3 de suas criaturas mortas e invoque um esqueleto para cada uma.', { type: 'raiseDead' }),
];
export const STARTER_IDS = ['adaga', 'espada-curta', 'machado', 'cajado-xama', 'faisca', 'cura', 'escudo', 'bola-de-fogo', 'chuva-de-gelo', 'conhecimento', 'maca', 'visao', 'toque-vampirico', 'lanca-runica', 'raio', 'inspiracao', 'reflexos', 'golpe-duplo', 'dardo-arcano', 'postura', 'cajado-aprendiz', 'funda'];
export const ADVANCED_IDS = ['espada-longa', 'lamina-vampirica', 'meteoro', 'cura-maior', 'tempestade', 'convocar-mortos', 'martelo-trovao', 'arco-elfico', 'lamina-dragao', 'drenar-vida', 'nevasca', 'sabedoria', 'barreira-gelo', 'julgamento', 'raio', 'lanca-runica'];

export const CREATURES: CreatureDef[] = [
  { id: 'esqueleto', name: 'Esqueleto', level: 1, attack: 2, armor: 1, hp: 3, art: 'characters/esqueleto' },
  { id: 'harpia', name: 'Harpia', level: 1, attack: 2, armor: 0, hp: 4, art: ch('harpia') },
  { id: 'banshee', name: 'Banshee', level: 2, attack: 2, armor: 0, hp: 5, onEnterDamage: 2, text: 'Quando esta carta entra em jogo, todos os jogadores perdem 2 de vida.', art: ch('banshee') },
  { id: 'sucubo', name: 'Súcubo', level: 2, attack: 3, armor: 1, hp: 5, art: ch('sucubo') },
  { id: 'driade', name: 'Dríade Corrompida', level: 2, attack: 2, armor: 1, hp: 6, art: ch('driade') },
  { id: 'vampiro', name: 'Vampiro', level: 3, attack: 3, armor: 2, hp: 7, lifesteal: 1, text: 'Ao atacar, cura 1 de vida.', art: ch('vampiro') },
];

export const EVENTS: EventDef[] = [
  { id: 'caverna', name: 'Caverna Congelada', art: 'scenery/lago-gelado',
    text: { evento: 'Todas as criaturas inimigas têm +2 de armadura.', recompensa: 'Cada jogador revela as 5 primeiras cartas do deck avançado, escolhe uma e embaralha no seu deck; o restante volta ao deck avançado.', conclusao: 'Todos os heróis têm o nível de ameaça aumentado em 1.' },
    mods: { creatureArmor: 2 }, reward: { reveal: 5 }, conclusion: { threat: 1 } },
  { id: 'emboscada', name: 'Emboscada na Floresta', art: 'scenery/floresta',
    text: { evento: 'Todas as criaturas inimigas têm +1 de ataque.', recompensa: 'Cada jogador revela 3 cartas do deck avançado e escolhe uma.', conclusao: 'Todos os heróis têm o nível de ameaça aumentado em 1.' },
    mods: { creatureAttack: 1 }, reward: { reveal: 3 }, conclusion: { threat: 1 } },
  { id: 'muralha', name: 'Cerco à Muralha', art: 'scenery/muralha',
    text: { evento: 'Todas as criaturas inimigas têm +2 de vida.', recompensa: 'Todos os heróis curam 3 de vida. Cada jogador revela 3 cartas do deck avançado e escolhe uma.', conclusao: 'Todos os heróis têm o nível de ameaça aumentado em 1.' },
    mods: { creatureHp: 2 }, reward: { reveal: 3, heal: 3 }, conclusion: { threat: 1 } },
  { id: 'pantano', name: 'Pântano Nebuloso', art: 'cards/ev-pantano',
    text: { evento: 'Todos os heróis têm -1 de armadura.', recompensa: 'Cada jogador revela 4 cartas do deck avançado e escolhe uma.', conclusao: 'Todos os heróis têm o nível de ameaça aumentado em 1.' },
    mods: { heroArmor: -1 }, reward: { reveal: 4 }, conclusion: { threat: 1 } },
  { id: 'torre', name: 'Torre do Feiticeiro', art: 'cards/evento',
    text: { evento: 'Magias de dano causam +1 de dano.', recompensa: 'Cada jogador revela 3 cartas do deck avançado e escolhe uma.', conclusao: 'Todos os heróis têm o nível de ameaça aumentado em 1.' },
    mods: { spellBonus: 1 }, reward: { reveal: 3 }, conclusion: { threat: 1 } },
  { id: 'acampamento', name: 'Acampamento Abandonado', art: 'cards/ev-acampamento',
    text: { evento: 'Sem efeito.', recompensa: 'Todos os heróis curam 5 de vida. Cada jogador revela 3 cartas do deck avançado e escolhe uma.', conclusao: 'Nenhuma.' },
    mods: {}, reward: { reveal: 3, heal: 5 }, conclusion: { threat: 0 } },
];

export const byId = <T extends { id: string }>(list: T[], id: string): T => {
  const x = list.find((i) => i.id === id);
  if (!x) throw new Error(`Definição não encontrada: ${id}`);
  return x;
};

// regras dos decks montados na coleção
export const DECK_RULES = { size: 10, maxCopies: 2, maxDecks: 10 };
export const DEFAULT_DECKS: Record<number, string[]> = {
  1: ['adaga', 'espada-curta', 'maca', 'faisca', 'faisca', 'dardo-arcano', 'cura', 'escudo', 'reflexos', 'golpe-duplo'],
  2: ['machado', 'espada-curta', 'faisca', 'bola-de-fogo', 'raio', 'cura', 'escudo', 'inspiracao', 'golpe-duplo', 'toque-vampirico'],
};
export const deckLevel = (cards: string[]) => Math.max(1, ...cards.map((id) => byId(CARDS, id).level));

// devolve o motivo de o deck ser inválido, ou null se estiver ok
export function deckProblem(cards: unknown): { key: string; params?: Record<string, string | number> } | null {
  if (!Array.isArray(cards) || cards.some((c) => typeof c !== 'string')) return { key: 'deck.invalid' };
  if (cards.length !== DECK_RULES.size) return { key: 'deck.size', params: { size: DECK_RULES.size } };
  const count: Record<string, number> = {};
  for (const id of cards as string[]) {
    if (!STARTER_IDS.includes(id)) return { key: 'deck.rewardOnly', params: { card: id } };
    count[id] = (count[id] ?? 0) + 1;
    if (count[id]! > DECK_RULES.maxCopies) return { key: 'deck.maxCopies', params: { max: DECK_RULES.maxCopies, card: byId(CARDS, id).name } };
  }
  return null;
}

// arte de cada carta: src/assets/art/<id>.webp no app
for (const list of [HEROES, CARDS, CREATURES, EVENTS] as { id: string; art: string }[][]) for (const x of list) x.art = `art/${x.id}`;

// tutorial: Paladino com este deck, comprado nesta ordem
export const TUTORIAL_DECK = ['espada-curta', 'faisca', 'cura', 'escudo', 'faisca', 'dardo-arcano', 'adaga', 'reflexos', 'golpe-duplo', 'maca'];
