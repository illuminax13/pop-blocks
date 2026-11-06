import assert from "node:assert/strict";
import { LEVELS, REWARDS, TOTAL, createRound, revealCell } from "../src/logic.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rewardPoints = new Map(REWARDS.map((reward) => [reward.emoji, reward.points]));

function bombIndexes(round) {
  return round.cells.flatMap((cell, index) => (cell.bomb ? [index] : []));
}

assert.equal(TOTAL, 64);
assert.deepEqual(
  LEVELS.map((level) => level.bombs),
  [4, 8, 12],
);

for (const bad of [0, 64, -1, 1.5, Number.NaN, 100, 8.2]) {
  assert.throws(() => createRound(bad, mulberry32(1)), String(bad));
}

for (const level of LEVELS) {
  for (let seed = 1; seed <= 25; seed += 1) {
    const round = createRound(level.bombs, mulberry32(seed));
    const bombs = round.cells.filter((cell) => cell.bomb);
    assert.equal(bombs.length, level.bombs);
    assert.equal(round.safeTotal, TOTAL - level.bombs);
    assert.equal(round.phase, "play");
    assert.equal(round.score, 0);
    assert.ok(bombs.every((cell) => cell.reward === null && cell.open === false));
    for (const cell of round.cells) {
      if (cell.bomb) continue;
      assert.equal(rewardPoints.get(cell.reward.emoji), cell.reward.points);
    }
    const replay = createRound(level.bombs, mulberry32(seed));
    assert.deepEqual(bombIndexes(replay), bombIndexes(round));
    assert.deepEqual(
      replay.cells.map((cell) => (cell.bomb ? "B" : `${cell.reward.emoji}${cell.reward.points}`)),
      round.cells.map((cell) => (cell.bomb ? "B" : `${cell.reward.emoji}${cell.reward.points}`)),
    );
  }
}

const spread = createRound(8, mulberry32(1));
assert.notDeepEqual(bombIndexes(spread), [0, 1, 2, 3, 4, 5, 6, 7]);

const round = createRound(4, mulberry32(9));
const safeIndex = round.cells.findIndex((cell) => !cell.bomb);
const first = revealCell(round, safeIndex);
assert.equal(first.type, "reward");
assert.equal(first.won, false);
assert.equal(round.found, 1);
assert.equal(round.score, round.cells[safeIndex].reward.points);
assert.equal(revealCell(round, safeIndex).type, "ignore");
assert.equal(round.found, 1);
assert.equal(revealCell(round, -1).type, "ignore");
assert.equal(revealCell(round, 64).type, "ignore");
assert.equal(revealCell(round, 99).type, "ignore");

const winRound = createRound(12, mulberry32(4));
let guard = 0;
while (winRound.phase === "play" && guard < 80) {
  const next = winRound.cells.findIndex((cell) => !cell.open && !cell.bomb);
  const result = revealCell(winRound, next);
  assert.equal(result.type, "reward");
  guard += 1;
}
assert.equal(winRound.phase, "win");
assert.equal(winRound.found, TOTAL - 12);
assert.equal(
  winRound.score,
  winRound.cells.filter((cell) => !cell.bomb).reduce((sum, cell) => sum + cell.reward.points, 0),
);
assert.ok(winRound.cells.some((cell) => cell.bomb && !cell.open));
assert.equal(revealCell(winRound, bombIndexes(winRound)[0]).type, "ignore");

const boomRound = createRound(8, mulberry32(11));
const early = boomRound.cells.findIndex((cell) => !cell.bomb);
revealCell(boomRound, early);
const scoreBefore = boomRound.score;
const boom = revealCell(boomRound, bombIndexes(boomRound)[0]);
assert.equal(boom.type, "bomb");
assert.equal(boomRound.phase, "boom");
assert.equal(boomRound.score, scoreBefore);
const anotherSafe = boomRound.cells.findIndex((cell) => !cell.bomb && !cell.open);
assert.equal(revealCell(boomRound, anotherSafe).type, "ignore");
assert.equal(boomRound.cells[anotherSafe].open, false);

console.log("logic tests passed");
