import { GAME_STATES } from '../core/game-states.js';

let gameplayStarted = false;

function isGameplayState(state) {
  return state === GAME_STATES.PLAYING;
}

export async function syncGameplayApi(ysdk, nextState) {
  if (!ysdk?.features?.GameplayAPI) return;

  const shouldBeStarted = isGameplayState(nextState);
  if (shouldBeStarted && !gameplayStarted) {
    await ysdk.features.GameplayAPI.start();
    gameplayStarted = true;
    return;
  }

  if (!shouldBeStarted && gameplayStarted) {
    await ysdk.features.GameplayAPI.stop();
    gameplayStarted = false;
  }
}

export async function forceStopGameplayApi(ysdk) {
  if (!ysdk?.features?.GameplayAPI || !gameplayStarted) return;
  await ysdk.features.GameplayAPI.stop();
  gameplayStarted = false;
}
