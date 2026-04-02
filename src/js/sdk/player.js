export async function getPlayerProfile(ysdk) {
  if (!ysdk?.getPlayer) {
    return { isAuthorized: false, player: null, name: 'Гость' };
  }

  try {
    const player = await ysdk.getPlayer({ scopes: false });
    const name = player?.getName?.() || 'Игрок';
    return { isAuthorized: Boolean(player), player, name };
  } catch {
    return { isAuthorized: false, player: null, name: 'Гость' };
  }
}
