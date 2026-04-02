const listeners = [];

export function bindPlatformLifecycle(ysdk, handlers) {
  if (!ysdk?.on || typeof ysdk.on !== 'function') return () => {};

  const onPause = () => handlers.onPause?.('platform');
  const onResume = () => handlers.onResume?.('platform');

  ysdk.on('game_api_pause', onPause);
  ysdk.on('game_api_resume', onResume);

  listeners.push(() => {
    if (typeof ysdk.off === 'function') {
      ysdk.off('game_api_pause', onPause);
      ysdk.off('game_api_resume', onResume);
    }
  });

  return () => {
    while (listeners.length) {
      const unbind = listeners.pop();
      unbind();
    }
  };
}
