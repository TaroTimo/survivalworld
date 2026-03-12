// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-boss.js
// Boss spawning logic and boss loot rewards
// Dependencies: deadworld-data.js
// ══════════════════════════════════════════════════════

// ── BOSS SPAWN ────────────────────────────────────────
function DW_checkBossSpawn(state, x, y) {
  const tileKey = `${x},${y}`;
  const tile    = state.tiles[tileKey];
  if (!tile || state.activeBosses?.[tileKey]) return state;

  let s = { ...state };
  for (const [bossId, bd] of Object.entries(BOSS_DEFS)) {
    if ((s.killedBosses||[]).includes(bossId)) continue;
    if (s.day < bd.spawnDay) continue;
    if (!bd.spawnTypes.includes(tile.type)) continue;
    const rng = mulberry32(hashCoord(s.gameId, x*7 + s.day, y*11 + s.day));
    if (rng() < 0.15) {
      s.activeBosses = { ...s.activeBosses, [tileKey]: { id: bossId, hp: bd.maxHp } };
      s.log = [`⚠ ${bd.name} xuất hiện!`, ...(s.log||[])];
      break;
    }
  }
  return s;
}

// ── BOSS LOOT ─────────────────────────────────────────
function DW_grantBossLoot(state, bossId) {
  const bd = BOSS_DEFS[bossId];
  if (!bd) return { state };
  return {
    state: { ...state, inventory: [...state.inventory, ...(bd.loot||[])] },
    loot: bd.loot,
  };
}
