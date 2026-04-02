export function createAdsService(ysdk, hooks = {}) {
  async function showInterstitial() {
    if (!ysdk?.adv?.showFullscreenAdv) {
      return { status: 'unavailable' };
    }

    hooks.onOpen?.();

    return new Promise((resolve) => {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => hooks.onOpen?.(),
          onClose: (wasShown) => {
            hooks.onClose?.();
            resolve({ status: wasShown ? 'shown' : 'skipped', wasShown });
          },
          onError: (error) => {
            hooks.onError?.(error);
            resolve({ status: 'error', error });
          },
        },
      });
    });
  }

  async function showRewarded() {
    if (!ysdk?.adv?.showRewardedVideo) {
      return { status: 'unavailable', rewarded: false };
    }

    hooks.onOpen?.();

    return new Promise((resolve) => {
      let rewarded = false;

      ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => hooks.onOpen?.(),
          onRewarded: () => {
            rewarded = true;
            hooks.onRewarded?.();
          },
          onClose: () => {
            hooks.onClose?.();
            resolve({ status: 'closed', rewarded });
          },
          onError: (error) => {
            hooks.onError?.(error);
            resolve({ status: 'error', error, rewarded: false });
          },
        },
      });
    });
  }

  return {
    showInterstitial,
    showRewarded,
  };
}
