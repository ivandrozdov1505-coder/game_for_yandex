export function createSoundService() {
  let muted = true;
  let suspendedBySystem = false;

  return {
    applySettings(settings) {
      muted = Boolean(settings.musicMuted && settings.sfxMuted);
    },
    pauseForSystem() {
      suspendedBySystem = true;
    },
    resumeFromSystem() {
      suspendedBySystem = false;
    },
    pauseForAd() {
      suspendedBySystem = true;
    },
    resumeAfterAd() {
      suspendedBySystem = false;
    },
    isMuted() {
      return muted;
    },
    isSuspended() {
      return suspendedBySystem;
    },
  };
}
