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
import {
  bindStaticHandlers,
  renderActions,
  renderGame,
  renderPause,
  renderResult,
  renderSdkStatus,
  renderStart,
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

function setAppState(nextState) {
  if (appState === nextState) return;
  appState = nextState;
  syncGameplayApi(sdk, nextState);
}

function persistSave() {
  storageBridge.save(save);
}

function unlockModes() {
  Object.values(MODES).forEach((mode) => {
    if (runState.stats.score >= mode.unlockScore && !save.unlockedModes.includes(mode.id)) {
      save.unlockedModes.push(mode.id);
      runState.log.unshift(`Открыт режим: ${mode.title}`);
    }
  });
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

function stopLoop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

function beginRun() {
  runState = createInitialState(selectedMode);
  runState.running = true;
  save.stats.runs += 1;
  persistSave();

  switchScreen('game');
  renderActions(handleAction);
  renderGame(runState);

  setAppState(GAME_STATES.PLAYING);
  startLoop();
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

  if (sdk?.features?.LoadingAPI?.ready) {
    await sdk.features.LoadingAPI.ready();
  }
}

bindStaticHandlers({
  onStart: beginRun,
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
