// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-core.js
// Core orchestration: new game init, game tick
//
// LOAD ORDER (must match HTML script tags):
//   1. deadworld-data.js
//   2. engine-skills.js
//   3. engine-boss.js
//   4. engine-world.js       ← calls DW_checkBossSpawn, DW_tickStatuses
//   5. engine-inventory.js   ← calls DW_removeStatus, DW_grantXp
//   6. engine-combat.js      ← calls DW_grantBossLoot, DW_grantXp
//   7. engine-survival.js    ← calls DW_apMax, DW_advanceDay, DW_grantXp
//   8. engine-saveload.js
//   9. engine-ai.js
//  10. engine-core.js        ← this file
// ══════════════════════════════════════════════════════

// ── INITIAL STATE ─────────────────────────────────────
// DW_calcMaxHp: tính maxHp từ skills (fitness.hp_bonus) + job bonus
// Dùng cả trong newGame lẫn khi DW_spendSkillPoint thay đổi fitness.
function DW_calcMaxHp(job, skills) {
  const BASE_HP = 15;
  const soldierBonus = job === 'soldier' ? 3 : 0;
  const nurseBonus   = job === 'nurse'   ? 2 : 0;
  // Đọc hp_bonus từ SKILL_UNLOCK_EFFECTS nếu đã load
  const fitnessHpBonus = (typeof DW_getSkillEffect === 'function' && skills)
    ? DW_getSkillEffect({ skills }, 'fitness', 'hp_bonus')
    : 0;
  return BASE_HP + soldierBonus + nurseBonus + fitnessHpBonus;
}

function DW_newGame(jobId, seed) {
  const gameId = seed || (Date.now() & 0xFFFFFF);
  const job    = DW_JOBS.find(j => j.id === jobId) || DW_JOBS[0];
  const skills = {};
  for (const sk of Object.keys(DW_SKILLS)) skills[sk] = 0;
  for (const [sk, v] of Object.entries(job.startSkills || {})) skills[sk] = v;

  const maxHp = DW_calcMaxHp(jobId, skills);

  return {
    version: 3,
    gameId,
    job: jobId,
    day: 1, hour: 8,
    ap: DW_apMax({ job: jobId, skills, inventory: [], statuses: [] }),
    lastRegenMs: Date.now(),
    hp: maxHp,
    maxHp,
    hunger: 5.0, thirst: 5.0, stress: 0, depression: 0,
    statuses: [],
    skills,
    skillXp: Object.fromEntries(Object.keys(DW_SKILLS).map(k => [k, 0])),
    // character level system
    charLevel:   1,
    charXp:      0,
    skillPoints: 0,
    xpSources:   {},
    inventory: [...(job.startItems || [])],
    itemRarity: (job.startItems || []).map(() => 'common'), // v3.1: parallel rarity array
    equip:    { weapon:null, body:null, head:null, hands:null, tool:null },
    equipDur: {},
    equipRarity: {}, // v3.1: rarity của equipped items theo slot
    ammo:     {},
    x: DW_SPAWN_X, y: DW_SPAWN_Y,
    tiles: DW_generateWorld(gameId),
    exploredTiles: [`${DW_SPAWN_X},${DW_SPAWN_Y}`],
    activeBosses: {}, killedBosses: [],
    gameOver: false, gameWon: false,
    log: [], noise: 0, panicMode: false,
    restCount: 0,
  };
}

// ── GAME TICK ─────────────────────────────────────────
// Called every UI frame/interval to advance real-time systems
function DW_tick(state, nowMs) {
  let s = DW_apRegen(state, nowMs);
  s = DW_updatePanic(s);
  return s;
}
