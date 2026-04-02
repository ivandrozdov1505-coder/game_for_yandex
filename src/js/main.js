import { MODES } from './config.js';
import { performAction, stepTime } from './logic.js';
import { createInitialState } from './state.js';
import { loadSave, saveProgress } from './storage.js';
import {
  bindStaticHandlers,
  renderActions,
  renderGame,
  renderResult,
  renderStart,
  switchScreen,
} from './ui.js';

let state = createInitialState();
let selectedMode = 'normal';
let timer = null;

function mergeSave() {
  const save = loadSave();
  state.bestScore = save.bestScore;
  state.bestTestScore = save.bestTestScore;
  state.unlockedModes = save.unlockedModes;
}

function syncSave() {
  saveProgress({
    bestScore: state.bestScore,
    bestTestScore: state.bestTestScore,
    unlockedModes: state.unlockedModes,
  });
}

function unlockModes() {
  Object.values(MODES).forEach((mode) => {
    if (state.stats.score >= mode.unlockScore && !state.unlockedModes.includes(mode.id)) {
      state.unlockedModes.push(mode.id);
      state.log.unshift(`Открыт режим: ${mode.title}`);
    }
  });
}

function startLoop() {
  if (timer) clearInterval(timer);
  const mode = MODES[state.modeId];
  timer = setInterval(() => {
    stepTime(state);
    renderGame(state);
    if (state.ended) {
      finishRun();
    }
  }, mode.tickMs);
}

function startRun() {
  state = createInitialState(selectedMode);
  mergeSave();
  state.running = true;
  switchScreen('game');
  renderActions(handleAction);
  renderGame(state);
  startLoop();
}

function finishRun() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  unlockModes();

  if (state.stats.score > state.bestScore) {
    state.bestScore = Math.round(state.stats.score);
  }

  if (state.modeId === 'test' && state.stats.score > state.bestTestScore) {
    state.bestTestScore = Math.round(state.stats.score);
  }

  syncSave();
  renderResult(state);
  switchScreen('result');
}

function handleAction(actionId) {
  performAction(state, actionId);
  renderGame(state);
  if (state.ended) {
    finishRun();
  }
}

function renderMenu() {
  mergeSave();
  if (!state.unlockedModes.includes(selectedMode)) {
    selectedMode = 'normal';
  }
  renderStart(state, selectedMode, (modeId) => {
    selectedMode = modeId;
    renderMenu();
  });
  switchScreen('start');
}

bindStaticHandlers({
  onStart: startRun,
  onReplay: renderMenu,
});

renderMenu();
