import "@fontsource/fredoka/latin-600.css";
import "@fontsource/fredoka/latin-700.css";
import "./style.css";
import { LEVELS, bestStorageKey, createRound, revealCell } from "./logic.js";
import { createAudio } from "./audio.js";
import { burst, flash, floatScore, startConfetti } from "./fx.js";

const DIFF_KEY = "pop-blocks-bombs";
const MUTE_KEY = "pop-blocks-muted";
const RESTART_MS = 7000;
const TREASURE_BITS = ["✨", "⭐", "💛", "💖"];
const BOOM_BITS = ["✨", "⭐", "💛", "🧡", "💗", "💫"];

const audio = createAudio();
const app = document.querySelector("#app");
const board = document.querySelector("#board");
const overlay = document.querySelector("#overlay");
const art = document.querySelector("#overlay-art");
const message = document.querySelector("#overlay-msg");
const sub = document.querySelector("#overlay-sub");
const again = document.querySelector("#again");
const timerBar = document.querySelector(".timer");
const canvas = document.querySelector("#confetti");
const fx = document.querySelector("#fx");
const flashEl = document.querySelector("#flash");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const bombsEl = document.querySelector("#bombs");
const foundEl = document.querySelector("#found");
const scoreChip = document.querySelector("#score-chip");
const bestChip = document.querySelector("#best-chip");
const bombsChip = document.querySelector("#bombs-chip");
const basket = document.querySelector("#basket");
const loot = document.querySelector("#loot");
const muteBtn = document.querySelector("#mute");
const levelButtons = [...document.querySelectorAll(".levels button")];

const state = {
  bombCount: 8,
  best: 0,
  round: null,
};

let restartTimer = 0;
let stopConfetti = null;

function readNumber(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function readFlag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Private mode and full storage still leave the round playable. */
  }
}

function pulse(el) {
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

function clearRoundTimers() {
  clearTimeout(restartTimer);
  restartTimer = 0;
  if (stopConfetti) {
    stopConfetti();
    stopConfetti = null;
  }
}

function hideOverlay() {
  overlay.hidden = true;
  overlay.classList.remove("boom", "win");
  delete overlay.dataset.phase;
  app.inert = false;
}

function renderHud() {
  scoreEl.textContent = String(state.round.score);
  bestEl.textContent = String(state.best);
  bombsEl.textContent = String(state.bombCount);
  foundEl.textContent = String(state.round.found);
  scoreChip.setAttribute("aria-label", `Score ${state.round.score}`);
  bestChip.setAttribute("aria-label", `Best ${state.best}`);
  bombsChip.setAttribute("aria-label", `Bombs hidden ${state.bombCount}`);
  basket.setAttribute("aria-label", `Treasures found ${state.round.found}`);
  const muted = audio.isMuted();
  muteBtn.setAttribute("aria-pressed", String(muted));
  muteBtn.setAttribute("aria-label", muted ? "Sound off" : "Sound on");
  muteBtn.textContent = muted ? "🔇" : "🔊";
  for (const btn of levelButtons) {
    const on = Number(btn.dataset.bombs) === state.bombCount;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
  }
}

function renderLoot() {
  const recent = state.round.loot.slice(-8);
  loot.replaceChildren();
  recent.forEach((emoji, index) => {
    const span = document.createElement("span");
    span.textContent = emoji;
    if (index === recent.length - 1) span.className = "in";
    loot.appendChild(span);
  });
}

function setPrize(btn, emoji) {
  btn.replaceChildren();
  const span = document.createElement("span");
  span.className = "prize";
  span.textContent = emoji;
  btn.appendChild(span);
}

function renderBoard() {
  board.classList.remove("shake");
  board.replaceChildren();
  state.round.cells.forEach((cell, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cell";
    btn.dataset.i = String(index);
    btn.style.setProperty("--hi", cell.color[0]);
    btn.style.setProperty("--mid", cell.color[1]);
    btn.style.setProperty("--shade", cell.color[2]);
    btn.setAttribute("aria-label", "Block");
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = "✦";
    mark.setAttribute("aria-hidden", "true");
    btn.appendChild(mark);
    board.appendChild(btn);
  });
  const safe = [];
  state.round.cells.forEach((cell, index) => {
    if (!cell.bomb) safe.push(index);
  });
  const hintIndex = safe[Math.floor(Math.random() * safe.length)];
  board.children[hintIndex]?.classList.add("hint");
}

function fillArt(kind) {
  art.replaceChildren();
  if (kind === "boom") {
    const puff = document.createElement("div");
    puff.className = "puff";
    puff.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    art.append(puff);
  }
  const emoji = document.createElement("div");
  emoji.className = "art-emoji";
  emoji.textContent = kind === "boom" ? "💥" : "🎉";
  art.append(emoji);
}

function fillSub(kind) {
  sub.replaceChildren();
  const score = document.createElement("span");
  score.className = "pill";
  score.textContent = `⭐ ${state.round.score}`;
  sub.append(score);
  if (kind === "win") {
    const found = document.createElement("span");
    found.className = "pill";
    found.textContent = `🧺 ${state.round.found}`;
    sub.append(found);
  }
}

function armTimer() {
  timerBar.replaceChildren();
  const fill = document.createElement("span");
  fill.style.animationDuration = `${RESTART_MS}ms`;
  timerBar.appendChild(fill);
  restartTimer = window.setTimeout(() => {
    playAgain();
  }, RESTART_MS);
}

function showOverlay(kind) {
  fillArt(kind);
  message.textContent = kind === "boom" ? "Boom! Try again!" : "Yay!";
  fillSub(kind);
  overlay.classList.remove("boom", "win");
  overlay.classList.add(kind);
  overlay.dataset.phase = kind;
  overlay.hidden = false;
  app.inert = true;
  armTimer();
  again.focus({ preventScroll: true });
}

function endRound(kind) {
  if (state.round.score > state.best) {
    state.best = state.round.score;
    writeStorage(bestStorageKey(state.bombCount), state.best);
    pulse(bestEl);
  }
  renderHud();
  if (kind === "win") audio.win();
  else audio.boom();
  showOverlay(kind);
  if (kind === "win") stopConfetti = startConfetti(canvas);
}

function cellButton(index) {
  return board.querySelector(`[data-i="${index}"]`);
}

function openCell(index, quiet = false) {
  const result = revealCell(state.round, index);
  if (result.type === "ignore") return result;
  const btn = cellButton(index);
  if (!btn) return result;
  for (const hint of board.querySelectorAll(".hint")) hint.classList.remove("hint");
  btn.setAttribute("aria-disabled", "true");
  btn.tabIndex = -1;

  if (result.type === "bomb") {
    btn.classList.add("open", "boom");
    setPrize(btn, "💥");
    btn.setAttribute("aria-label", "Bomb");
    if (!quiet) {
      const rect = btn.getBoundingClientRect();
      burst(fx, rect.left + rect.width / 2, rect.top + rect.height / 2, 14, BOOM_BITS);
      flash(flashEl);
      board.classList.add("shake");
      window.setTimeout(() => board.classList.remove("shake"), 450);
    }
    endRound("boom");
    return result;
  }

  btn.classList.add("open", "pop");
  setPrize(btn, result.reward.emoji);
  btn.setAttribute("aria-label", result.reward.emoji);
  const beat = state.round.score > state.best;
  if (beat) {
    state.best = state.round.score;
    writeStorage(bestStorageKey(state.bombCount), state.best);
  }
  renderHud();
  renderLoot();
  if (!quiet) {
    pulse(scoreEl);
    if (beat) pulse(bestEl);
    const rect = btn.getBoundingClientRect();
    floatScore(fx, rect, result.reward.points);
    burst(fx, rect.left + rect.width / 2, rect.top + rect.height / 2, result.reward.points >= 30 ? 10 : 6, TREASURE_BITS);
    if (!result.won) audio.reward(result.reward.points);
  }
  if (result.won) endRound("win");
  return result;
}

function startRound(bombCount) {
  clearRoundTimers();
  hideOverlay();
  state.bombCount = bombCount;
  state.best = readNumber(bestStorageKey(bombCount));
  state.round = createRound(bombCount);
  writeStorage(DIFF_KEY, bombCount);
  renderBoard();
  renderHud();
  renderLoot();
}

function playAgain() {
  if (state.round.phase === "play" && overlay.hidden) return;
  startRound(state.bombCount);
}

function storedLevel() {
  const stored = readNumber(DIFF_KEY);
  return LEVELS.some((level) => level.bombs === stored) ? stored : 8;
}

board.addEventListener("click", (event) => {
  const btn = event.target.closest("button.cell");
  if (!btn || btn.getAttribute("aria-disabled") === "true") return;
  if (state.round.phase !== "play") return;
  audio.unlock();
  openCell(Number(btn.dataset.i));
});

board.addEventListener("contextmenu", (event) => event.preventDefault());

overlay.addEventListener("click", () => {
  playAgain();
});

muteBtn.addEventListener("click", () => {
  const next = !audio.isMuted();
  audio.setMuted(next);
  writeStorage(MUTE_KEY, next ? "1" : "0");
  renderHud();
  if (!next) {
    audio.unlock();
    audio.tap();
  }
});

for (const btn of levelButtons) {
  btn.addEventListener("click", () => {
    const bombs = Number(btn.dataset.bombs);
    if (bombs === state.bombCount) return;
    audio.unlock();
    audio.tap();
    startRound(bombs);
  });
}

document.addEventListener("keydown", (event) => {
  if (overlay.hidden) return;
  if (event.key === "Escape" || event.key === "Enter") {
    event.preventDefault();
    playAgain();
  }
});

audio.setMuted(readFlag(MUTE_KEY));
startRound(storedLevel());

if (import.meta.env.DEV) {
  window.__pop = {
    get phase() {
      return state.round.phase;
    },
    get score() {
      return state.round.score;
    },
    get bombs() {
      return state.bombCount;
    },
    get found() {
      return state.round.found;
    },
    get best() {
      return state.best;
    },
    bombIndexes() {
      return state.round.cells.flatMap((cell, index) => (cell.bomb ? [index] : []));
    },
    openIndex(index) {
      return openCell(index);
    },
    almostWin() {
      const safe = [];
      state.round.cells.forEach((cell, index) => {
        if (!cell.bomb && !cell.open) safe.push(index);
      });
      const leave = safe.pop();
      for (const index of safe) openCell(index, true);
      return leave;
    },
    hold() {
      clearTimeout(restartTimer);
      restartTimer = 0;
      const fill = timerBar.querySelector("span");
      if (fill) fill.style.animationPlayState = "paused";
    },
    setLevel(bombs) {
      startRound(bombs);
    },
  };
}
