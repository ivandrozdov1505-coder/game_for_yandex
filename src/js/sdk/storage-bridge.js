export function createStorageBridge({ localStorageService, ysdk, playerProfile }) {
  async function load() {
    const local = localStorageService.load();

    if (!ysdk?.getPlayer || !playerProfile?.isAuthorized) {
      return local;
    }

    try {
      const player = playerProfile.player;
      const cloudRaw = await player.getData(['surviveLessonSave']);
      const cloudSave = cloudRaw?.surviveLessonSave;
      if (!cloudSave || typeof cloudSave !== 'object') {
        return local;
      }

      const merged = localStorageService.merge(local, cloudSave);
      localStorageService.save(merged);
      return merged;
    } catch (error) {
      console.warn('[storage-bridge] cloud load failed', error);
      return local;
    }
  }

  async function save(nextState) {
    localStorageService.save(nextState);

    if (!ysdk?.getPlayer || !playerProfile?.isAuthorized) {
      return;
    }

    try {
      await playerProfile.player.setData({ surviveLessonSave: nextState }, true);
    } catch (error) {
      console.warn('[storage-bridge] cloud save failed', error);
    }
  }

  return { load, save };
}
