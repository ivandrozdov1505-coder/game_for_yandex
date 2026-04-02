import { MODES } from './config.js';

const initialStats = () => ({
  sleepiness: 28,
  suspicion: 12,
  stress: 18,
  knowledge: 30,
  score: 0,
});

export function createInitialState(modeId = 'normal') {
  const mode = MODES[modeId] ?? MODES.normal;
  return {
    modeId: mode.id,
    running: false,
    ended: false,
    win: false,
    endReason: '',
    timeLeftSec: mode.durationSec,
    elapsedSec: 0,
    stats: initialStats(),
    activeEvent: null,
    eventHistory: [],
    log: ['Урок начинается. Держись.'],
    nextEventInSec: 5,
    difficulty: 1,
    unlockedModes: ['normal'],
    bestScore: 0,
    bestTestScore: 0,
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
