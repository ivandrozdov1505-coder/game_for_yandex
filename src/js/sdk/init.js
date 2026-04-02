let initPromise = null;
let sdkContext = {
  ysdk: null,
  isRealSdk: false,
};

function hasYaGames() {
  return typeof window !== 'undefined' && typeof window.YaGames?.init === 'function';
}

export function getSdkContext() {
  return sdkContext;
}

export async function initSdk() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!hasYaGames()) {
      sdkContext = { ysdk: null, isRealSdk: false };
      return sdkContext;
    }

    try {
      const ysdk = await window.YaGames.init();
      sdkContext = { ysdk, isRealSdk: true };
      return sdkContext;
    } catch (error) {
      console.warn('[sdk] YaGames.init failed, fallback to local mode', error);
      sdkContext = { ysdk: null, isRealSdk: false };
      return sdkContext;
    }
  })();

  return initPromise;
}
