export const GRID = 8;
export const TOTAL = GRID * GRID;

export const LEVELS = [
  { id: "easy", bombs: 4, emoji: "🐣", label: "Easy, 4 bombs" },
  { id: "medium", bombs: 8, emoji: "🐱", label: "Medium, 8 bombs" },
  { id: "hard", bombs: 12, emoji: "🐯", label: "Hard, 12 bombs" },
];

export const REWARDS = [
  { emoji: "⭐", points: 10, weight: 8 },
  { emoji: "🌟", points: 15, weight: 5 },
  { emoji: "💎", points: 25, weight: 3 },
  { emoji: "🪙", points: 12, weight: 5 },
  { emoji: "🍎", points: 5, weight: 6 },
  { emoji: "🍓", points: 5, weight: 6 },
  { emoji: "🍊", points: 5, weight: 5 },
  { emoji: "🍇", points: 8, weight: 4 },
  { emoji: "🍌", points: 5, weight: 5 },
  { emoji: "🍉", points: 8, weight: 3 },
  { emoji: "🐱", points: 15, weight: 3 },
  { emoji: "🐶", points: 15, weight: 3 },
  { emoji: "🐰", points: 15, weight: 3 },
  { emoji: "🐸", points: 12, weight: 3 },
  { emoji: "🦄", points: 30, weight: 2 },
  { emoji: "🐼", points: 18, weight: 2 },
  { emoji: "🐧", points: 15, weight: 2 },
  { emoji: "🌸", points: 8, weight: 4 },
  { emoji: "🌈", points: 40, weight: 1 },
  { emoji: "🍩", points: 10, weight: 3 },
  { emoji: "🧁", points: 12, weight: 3 },
  { emoji: "🎈", points: 8, weight: 3 },
  { emoji: "🍪", points: 8, weight: 3 },
  { emoji: "🦋", points: 18, weight: 2 },
];

export const PALETTE = [
  ["#ffe56b", "#ffc107", "#d89a00"],
  ["#ffb3d4", "#ff6fa8", "#e04e86"],
  ["#9cf0d0", "#3dcc9a", "#149a68"],
  ["#b6e2ff", "#4aa8ff", "#2176d4"],
  ["#e0d0ff", "#b388ff", "#7a52e0"],
  ["#ffd0b0", "#ff8a4c", "#e06420"],
  ["#fff0a8", "#ffe14a", "#e6b800"],
  ["#ffc2cf", "#ff6b8a", "#d84568"],
  ["#c8f5a8", "#8ed64a", "#5eaa22"],
  ["#b8f0ff", "#5ad0f0", "#1aa0c8"],
];

function pickReward(random) {
  const total = REWARDS.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = random() * total;
  for (const reward of REWARDS) {
    roll -= reward.weight;
    if (roll <= 0) return { emoji: reward.emoji, points: reward.points };
  }
  const last = REWARDS[REWARDS.length - 1];
  return { emoji: last.emoji, points: last.points };
}

function shuffle(list, random) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function bestStorageKey(bombCount) {
  return `pop-blocks-best-${bombCount}`;
}

export function createRound(bombCount, random = Math.random) {
  if (!Number.isInteger(bombCount) || bombCount < 1 || bombCount >= TOTAL) {
    throw new Error("bombCount must leave at least one safe block");
  }
  const order = shuffle(
    Array.from({ length: TOTAL }, (_, index) => index),
    random,
  );
  const bombs = new Set(order.slice(0, bombCount));
  const salt = Math.floor(random() * PALETTE.length);
  const cells = Array.from({ length: TOTAL }, (_, index) => {
    const bomb = bombs.has(index);
    return {
      bomb,
      reward: bomb ? null : pickReward(random),
      color: PALETTE[(index * 3 + salt) % PALETTE.length].slice(),
      open: false,
    };
  });
  return {
    bombCount,
    safeTotal: TOTAL - bombCount,
    cells,
    score: 0,
    found: 0,
    loot: [],
    phase: "play",
  };
}

export function revealCell(round, index) {
  if (!round || round.phase !== "play") return { type: "ignore" };
  const cell = round.cells[index];
  if (!cell || cell.open) return { type: "ignore" };
  cell.open = true;
  if (cell.bomb) {
    round.phase = "boom";
    return { type: "bomb" };
  }
  round.score += cell.reward.points;
  round.found += 1;
  round.loot.push(cell.reward.emoji);
  const won = round.found === round.safeTotal;
  if (won) round.phase = "win";
  return { type: "reward", reward: cell.reward, won };
}
