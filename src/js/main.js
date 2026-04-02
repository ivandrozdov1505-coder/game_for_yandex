import { MODES } from './config.js';
import { GAME_STATES } from './core/game-states.js';
import { applySecondChance, performAction, stepTime } from './logic.js';
import { createSoundService } from './sound.js';
import { createInitialState } from './state.js';
import { createLocalStorageService } from './storage.js';
import { createAdsService } from './sdk/ads.js';
import { bindPlatformLifecycle } from './sdk/events.js';
import { syncGameplayApi } from './sdk/gameplay.js';
import { initSdk } from './sdk/init.js';
import { getPlayerProfile } from './sdk/player.js';
import { createStorageBridge } from './sdk/storage-bridge.js';
import { getTutorialStep, TUTORIAL_STEPS } from './tutorial.js';
import {
  bindStaticHandlers,
  hideTutorial,
  renderActions,
  renderGame,
  renderPause,
  renderResult,
  renderSdkStatus,
  renderStart,
  renderTutorial,
  resetUiRuntime,
  switchScreen,
} from './ui.js';

const storageService = createLocalStorageService();
const soundService = createSoundService();

let appState = GAME_STATES.BOOT;
let runState = createInitialState();
let selectedMode = 'normal';
let timer = null;
let unbindLifecycle = () => {};

let save = storageService.load();
let sdk = null;
let playerProfile = { isAuthorized: false, name: 'Гость', player: null };
let storageBridge = createStorageBridge({ localStorageService: storageService, ysdk: null, playerProfile });
let adsService = createAdsService(null);

const tutorialSession = {
  active: false,
  source: null,
  stepIndex: 0,
  preview: false,
  pendingAutoContinuation: false,
};

function setAppState(nextState) {
  if (appState === nextState) return;
  appState = nextState;
  syncGameplayApi(sdk, nextState);
}

function persistSave() {
  void storageBridge.save(save);
}

function markTutorialShown() {
  if (save.tutorialShown) return;
  save.tutorialShown = true;
  persistSave();
}

function clearTutorialSession() {
  tutorialSession.active = false;
  tutorialSession.source = null;
  tutorialSession.stepIndex = 0;
  tutorialSession.preview = false;
}

function unlockModes() {
  Object.values(MODES).forEach((mode) => {
    if (runState.stats.score >= mode.unlockScore && !save.unlockedModes.includes(mode.id)) {
      save.unlockedModes.push(mode.id);
      runState.log.unshift(`Открыт режим: ${mode.title}`);
    }
  });
}

function stopLoop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

function startLoop() {
  stopLoop();
  const mode = MODES[runState.modeId];
  timer = setInterval(() => {
    stepTime(runState);
    renderGame(runState);
    if (runState.ended) {
      finishRun();
    }
  }, mode.tickMs);
}

function prepareRun(modeId) {
  stopLoop();
  resetUiRuntime();
  runState = createInitialState(modeId);
  renderActions(handleAction);
  renderGame(runState);
  switchScreen('game');
}

function startLiveRun() {
  runState.running = true;
  save.stats.runs += 1;
  persistSave();
  setAppState(GAME_STATES.PLAYING);
  startLoop();
}

function tutorialNextLabel() {
  const isLast = tutorialSession.stepIndex >= TUTORIAL_STEPS.length - 1;
  if (isLast) {
    return tutorialSession.source === 'manual' ? 'Вернуться в меню' : 'Играть';
  }

  if (tutorialSession.stepIndex === 0 && tutorialSession.source === 'manual') {
    return 'Показать интерфейс';
  }

  return 'Далее';
}

function showCurrentTutorialStep() {
  const step = getTutorialStep(tutorialSession.stepIndex);
  if (!step) return;

  tutorialSession.active = true;
  setAppState(GAME_STATES.TUTORIAL);
  renderTutorial(step, {
    stepIndex: tutorialSession.stepIndex,
    nextLabel: tutorialNextLabel(),
  });
}

function openMenuTutorial(source) {
  stopLoop();
  tutorialSession.source = source;
  tutorialSession.preview = false;
  tutorialSession.stepIndex = 0;
  switchScreen('start');
  showCurrentTutorialStep();
}

function openRunTutorial({ source, preview }) {
  tutorialSession.source = source;
  tutorialSession.preview = preview;
  tutorialSession.stepIndex = 1;
  showCurrentTutorialStep();
}

function beginTutorialPreviewRun() {
  prepareRun('normal');
  openRunTutorial({ source: 'manual', preview: true });
}

function completeTutorial() {
  const shouldStartLiveRun = tutorialSession.source === 'auto' && !tutorialSession.preview && tutorialSession.stepIndex > 0;

  hideTutorial();
  markTutorialShown();
  tutorialSession.pendingAutoContinuation = false;
  clearTutorialSession();

  if (shouldStartLiveRun) {
    startLiveRun();
    return;
  }

  renderMenu();
}

function skipTutorial() {
  const shouldStartLiveRun = tutorialSession.source === 'auto' && !tutorialSession.preview && tutorialSession.stepIndex > 0;

  hideTutorial();
  markTutorialShown();
  tutorialSession.pendingAutoContinuation = false;
  clearTutorialSession();

  if (shouldStartLiveRun) {
    startLiveRun();
    return;
  }

  renderMenu();
}

function handleTutorialNext() {
  if (!tutorialSession.active) return;

  if (tutorialSession.stepIndex === 0) {
    hideTutorial();

    if (tutorialSession.source === 'auto') {
      tutorialSession.active = false;
      tutorialSession.stepIndex = 1;
      tutorialSession.pendingAutoContinuation = true;
      renderMenu();
      return;
    }

    beginTutorialPreviewRun();
    return;
  }

  if (tutorialSession.stepIndex >= TUTORIAL_STEPS.length - 1) {
    completeTutorial();
    return;
  }

  tutorialSession.stepIndex += 1;
  showCurrentTutorialStep();
}

function beginRun() {
  prepareRun(selectedMode);

  if (tutorialSession.pendingAutoContinuation && !save.tutorialShown) {
    tutorialSession.pendingAutoContinuation = false;
    openRunTutorial({ source: 'auto', preview: false });
    return;
  }

  startLiveRun();
}

async function finishRun() {
  stopLoop();

  unlockModes();
  if (runState.win) {
    save.stats.wins += 1;
  } else {
    save.stats.losses += 1;
  }

  if (runState.stats.score > save.bestScore) {
    save.bestScore = Math.round(runState.stats.score);
  }

  if (runState.modeId === 'test' && runState.stats.score > save.bestTestScore) {
    save.bestTestScore = Math.round(runState.stats.score);
  }

  persistSave();
  renderResult(runState, save);
  switchScreen('result');
  setAppState(GAME_STATES.RESULT);

  if (sdk) {
    setAppState(GAME_STATES.AD);
    soundService.pauseForAd();
    await adsService.showInterstitial();
    soundService.resumeAfterAd();
    setAppState(GAME_STATES.RESULT);
  }
}

function handleAction(actionId) {
  performAction(runState, actionId);
  renderGame(runState);
  if (runState.ended) {
    finishRun();
  }
}

function renderMenu() {
  resetUiRuntime();

  if (!save.unlockedModes.includes(selectedMode)) {
    selectedMode = 'normal';
  }

  renderStart(save, selectedMode, (modeId) => {
    selectedMode = modeId;
    renderMenu();
  });

  switchScreen('start');
  setAppState(GAME_STATES.MENU);
}

function pauseRun(reason = 'manual') {
  if (appState !== GAME_STATES.PLAYING) return;
  stopLoop();
  runState.running = false;

  if (reason === 'system') {
    soundService.pauseForSystem();
    renderPause(true);
    switchScreen('pause');
    setAppState(GAME_STATES.SYSTEM_PAUSE);
    return;
  }

  renderPause(false);
  switchScreen('pause');
  setAppState(GAME_STATES.PAUSED);
}

function resumeRun(source = 'manual') {
  if (source === 'system') {
    if (appState !== GAME_STATES.SYSTEM_PAUSE) return;
    soundService.resumeFromSystem();
    runState.running = true;
    switchScreen('game');
    renderGame(runState);
    setAppState(GAME_STATES.PLAYING);
    startLoop();
    return;
  }

  if (appState !== GAME_STATES.PAUSED) return;
  runState.running = true;
  switchScreen('game');
  renderGame(runState);
  setAppState(GAME_STATES.PLAYING);
  startLoop();
}

async function tryRewardedContinue() {
  if (runState.win || runState.continueUsed || appState !== GAME_STATES.RESULT) return;

  setAppState(GAME_STATES.AD);
  soundService.pauseForAd();
  const adResult = await adsService.showRewarded();
  soundService.resumeAfterAd();

  if (adResult.rewarded) {
    applySecondChance(runState);
    switchScreen('game');
    renderGame(runState);
    setAppState(GAME_STATES.PLAYING);
    startLoop();
    return;
  }

  renderResult(runState, save);
  switchScreen('result');
  setAppState(GAME_STATES.RESULT);
}

async function bootstrap() {
  setAppState(GAME_STATES.LOADING);

  const sdkContext = await initSdk();
  sdk = sdkContext.ysdk;
  playerProfile = await getPlayerProfile(sdk);

  storageBridge = createStorageBridge({
    localStorageService: storageService,
    ysdk: sdk,
    playerProfile,
  });

  save = await storageBridge.load();
  soundService.applySettings(save.settings);

  adsService = createAdsService(sdk, {
    onOpen: () => {
      if (appState === GAME_STATES.PLAYING) {
        pauseRun('system');
      }
    },
    onClose: () => {
      if (appState === GAME_STATES.SYSTEM_PAUSE) {
        resumeRun('system');
      }
    },
  });

  unbindLifecycle = bindPlatformLifecycle(sdk, {
    onPause: () => pauseRun('system'),
    onResume: () => resumeRun('system'),
  });

  renderSdkStatus(
    sdk
      ? `SDK: активен • ${playerProfile.isAuthorized ? `игрок ${playerProfile.name}` : 'гостевой режим'}`
      : 'SDK: локальный dev-режим (без платформы)'
  );

  renderMenu();

  if (!save.tutorialShown) {
    openMenuTutorial('auto');
  }

  if (sdk?.features?.LoadingAPI?.ready) {
    await sdk.features.LoadingAPI.ready();
  }
}

bindStaticHandlers({
  onStart: beginRun,
  onTutorialOpen: () => openMenuTutorial('manual'),
  onTutorialNext: handleTutorialNext,
  onTutorialSkip: skipTutorial,
  onReplay: renderMenu,
  onPause: () => pauseRun('manual'),
  onResume: () => resumeRun('manual'),
  onMenu: renderMenu,
  onRewardedContinue: tryRewardedContinue,
});

window.addEventListener('beforeunload', () => {
  stopLoop();
  unbindLifecycle();
});

bootstrap();
