// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-world.js
// World generation, tile management, movement, day/night cycle
// + Rumor System v1: generate, trigger, outcome roll
// + Noise tick: noiseLvl → zombie migration
// Dependencies: deadworld-data.js, engine-skills.js
// ══════════════════════════════════════════════════════

// ── AP SYSTEM ─────────────────────────────────────────
var AP_MAX_BASE    = 40;          // tăng từ 20→40: world map travel cần nhiều AP hơn
var AP_REGEN_MS    = 2 * 60 * 1000; // 1 AP mỗi 2 phút thực (nhanh hơn để bù pool lớn)
var AP_MAX_STAMINA = 60;
var AP_EXHAUSTION_FLOOR = 8;

// ── DW_apMax — Multi-factor ───────────────────────────
// AP max phản ánh toàn bộ trạng thái thể chất + tâm lý nhân vật.
// Thiếu ăn uống, stress cao, bị thương đều làm giảm AP max ngay lập tức.
// Đây là "live snapshot" — không cần extra state fields.
function DW_apMax(state) {
  let max = AP_MAX_BASE;

  // ── Skill & job bonuses ──────────────────────────────
  // fitness: +1/level nhưng cap tại 4 (không phải 5).
  // Lý do: fitness 5 + farmer 3 = 28 AP — gần ceiling 30, phá tension.
  // Cap tại 4 → farmer max = 20+4+2 = 26, vẫn cao nhất nhưng không trivial.
  max += Math.min(4, state.skills?.fitness || 0);
  if (state.job === 'farmer')  max += 2;  // v2: giảm từ 3→2; farmer vẫn cao nhất
  if (state.job === 'soldier') max += 1;

  // ── Hunger penalty ───────────────────────────────────
  // Đói làm chậm mọi hành động — feedback ngay, không phải chỉ qua HP
  const hunger = state.hunger ?? 5;
  if (hunger < 1)  max -= 4;       // sắp chết đói: kiệt sức nặng
  else if (hunger < 3) max -= 2;   // đói: chậm rõ rệt

  // ── Thirst penalty ───────────────────────────────────
  // Mất nước nguy hiểm hơn đói — penalty nặng hơn
  const thirst = state.thirst ?? 5;
  if (thirst < 0.5) max -= 5;      // sắp chết khát: cực kỳ kiệt sức
  else if (thirst < 2) max -= 2;   // khát: mất tập trung, yếu đi

  // ── Stress penalty ───────────────────────────────────
  const stress = state.stress ?? 0;
  if (stress >= 70) max -= 2;      // distressed: cơ thể căng thẳng
  else if (stress >= 50) max -= 1; // anxious: khó tập trung

  // ── Depression penalty ───────────────────────────────
  const dep = state.depression ?? 0;
  if (dep >= 75) max -= 2;         // trầm cảm nặng: thiếu động lực nghiêm trọng
  else if (dep >= 50) max -= 1;    // trầm cảm vừa: chậm chạp, uể oải

  // ── Wound/status penalties ───────────────────────────
  if ((state.statuses||[]).includes('bleed'))    max -= 1;
  if ((state.statuses||[]).includes('infected')) max -= 2;
  if ((state.statuses||[]).includes('groggy'))   max -= 1; // sau khi ngủ không đủ giấc

  // ── Encumbrance penalty ──────────────────────────────
  if (DW_overEncumbered(state)) max -= 2;

  // ── Farmer: ap_max_absolute_bonus (nguoi_chay_marathon) ──
  // Cộng trực tiếp vào max AP — bypass base cap thông thường
  const apBonus = DW_getSkillEffect(state, 'nguoi_chay_marathon', 'ap_max_absolute_bonus');
  if (apBonus > 0) max += apBonus;

  // ── Farmer: hunger/thirst penalty reduction (suc_ben_vo_tan) ──
  // Áp dụng ngược lại: nếu đã trừ penalty ở trên thì hoàn lại một phần
  const htReduce = DW_getSkillEffect(state, 'suc_ben_vo_tan', 'hunger_thirst_ap_penalty_reduce');
  if (htReduce > 0) {
    // Tính lại phần penalty đã trừ và hoàn một phần theo tỉ lệ skill
    const h = state.hunger ?? 5;
    const t = state.thirst ?? 5;
    let penaltyAlreadyApplied = 0;
    if (h < 1)       penaltyAlreadyApplied += 4;
    else if (h < 3)  penaltyAlreadyApplied += 2;
    if (t < 0.5)     penaltyAlreadyApplied += 5;
    else if (t < 2)  penaltyAlreadyApplied += 2;
    max += Math.floor(penaltyAlreadyApplied * htReduce);
  }

  // ── Farmer: carry weight bonus (nguoi_chay_marathon) ──
  const carryBonus = DW_getSkillEffect(state, 'nguoi_chay_marathon', 'carry_weight_bonus');
  if (carryBonus > 0) {
    // Không tăng AP max — nhưng tăng carry limit để remove encumbrance penalty
    // Handled trong DW_overEncumbered via state.carryBonusCache (set ở đây)
    // Note: side effect nhỏ — dùng cached value để không phải truyền state vào DW_CARRY_MAX
    state._carryBonusCache = carryBonus; // UI hint only, không mutate state thật
  }

  return Math.min(AP_MAX_STAMINA + apBonus, Math.max(AP_EXHAUSTION_FLOOR, max));
}

function DW_apRegen(state, nowMs) {
  if (!state.lastRegenMs) return state;
  const elapsed = nowMs - state.lastRegenMs;

  // ── Farmer: ap_regen_flat — thêm AP regen tuyệt đối mỗi chu kỳ ──
  const regenFlat  = DW_getSkillEffect(state, 'nguoi_chay_marathon', 'ap_regen_flat');
  // ap_regen_flat = số AP thêm mỗi 2 phút (1 chu kỳ cơ bản)
  // Tính: nếu có bonus, regen rate = (1 + regenFlat) AP/chu kỳ
  const totalPerCycle = 1 + (regenFlat || 0);
  const gained = Math.floor(elapsed / AP_REGEN_MS * totalPerCycle);
  if (gained <= 0) return state;

  const maxAp = DW_apMax(state);

  // ── Farmer: morning bonus (buoc_chan_thu_hai) ──
  // state.morningBonusUntilHour: set khi ngủ dậy nếu có skill này
  // Trong thời gian bonus: AP regen nhanh hơn (morningBonusMul)
  let ap = state.ap;
  if (state.morningBonusUntilHour != null) {
    const bonusMul = 1 + DW_getSkillEffect(state, 'buoc_chan_thu_hai', 'morning_ap_regen_bonus');
    // Kiểm tra còn trong window không (giờ game tăng theo AP spent, không theo realtime)
    // Đơn giản hóa: bonus active cho đến khi flag được clear bởi DW_advanceDay
    const bonusGained = Math.floor(elapsed / AP_REGEN_MS * bonusMul);
    ap = Math.min(maxAp, state.ap + bonusGained);
  } else {
    ap = Math.min(maxAp, state.ap + gained);
  }

  return {
    ...state,
    ap,
    lastRegenMs: state.lastRegenMs + Math.floor(elapsed / AP_REGEN_MS) * AP_REGEN_MS,
  };
}

// ── DW_checkExhaustion ───────────────────────────────
// Gọi sau mỗi action để xử lý trạng thái AP = 0.
// Nếu hết AP mà vẫn phải hành động (combat, di chuyển khẩn cấp),
// nhân vật "push through" bằng cách tiêu HP thay cho AP.
// Đây là safety valve — không khóa player, nhưng có chi phí thật.
function DW_checkExhaustion(state) {
  if (state.ap > 0) return state;

  // ── Farmer: legendary_stamina — AP không về 0 từ hành động thường ──
  // Exception: combat và boss attack vẫn trigger exhaustion
  // Iron Stamina signature skill cũng có exhaustion_immune cho non-combat
  const hasLegendaryStamina = DW_getSkillEffect(state, 'nguoi_chay_marathon', 'legendary_stamina');
  const hasIronStamina = DW_hasSignatureSkill(state, 'iron_stamina');
  const isNonCombatExhaustion = !state._combatExhaustionFlag; // flag set bởi engine-combat khi combat
  if ((hasLegendaryStamina || hasIronStamina) && isNonCombatExhaustion) {
    // Không trigger exhaustion penalty cho non-combat — nhưng vẫn log
    return { ...state,
      log: ['💪 Kiệt sức — nhưng cơ thể vẫn tiếp tục.', ...(state.log||[])] };
  }

  let s = { ...state, stress: Math.min(100, (state.stress||0) + 3) };

  const tileKey = `${s.x},${s.y}`;
  const tile    = s.tiles?.[tileKey];
  const hasZombie = (tile?.objects||[]).some(
    o => OBJECT_DEFS[o.type]?.type === 'enemy' && o.alive !== false
  );

  if (hasZombie && (tile?.barricade || 0) === 0) {
    const dmg  = 1;
    s.hp       = Math.max(0, s.hp - dmg);
    s.log      = ['😮‍💨 Kiệt sức! Zombie đánh vào lúc bạn không phòng bị — mất 1 HP.', ...(s.log||[])];
    if (s.hp <= 0) s.gameOver = true;
  }

  return s;
}

// ── CARRY WEIGHT ──────────────────────────────────────
var DW_CARRY_MAX = 20;
function DW_overEncumbered(state) {
  return DW_invWeight(state.inventory) > DW_CARRY_MAX;
}

// ── WORLD GENERATION (Biome-Based) ────────────────────
// Layer 1: place biome regions using Voronoi-like seeded points
// Layer 2: place rivers as horizontal/vertical bands
// Layer 3: place roads connecting regions
// Layer 4: stamp key locations
function DW_generateWorld(gameId) {
  const rng   = mulberry32(gameId);
  const size  = DW_WORLD_SIZE;
  const tiles = {};

  // ── Layer 1: Biome regions (Voronoi seeds) ──
  // Create ~8 biome seeds scattered around the map
  const seeds = [];
  for (let i = 0; i < 8; i++) {
    seeds.push({
      x: Math.floor(rng() * size),
      y: Math.floor(rng() * size),
      biome: BIOME_DEFS[Math.floor(rng() * BIOME_DEFS.length)],
    });
  }
  // Ensure city biome exists (one random seed overridden near center)
  seeds[0] = { x: DW_SPAWN_X + Math.floor((rng()-.5)*6), y: DW_SPAWN_Y + Math.floor((rng()-.5)*6), biome: BIOME_DEFS[2] }; // city near spawn
  seeds[1] = { x: Math.floor(rng() * 8),                  y: Math.floor(rng() * 8),                  biome: BIOME_DEFS[0] }; // forest corner
  seeds[2] = { x: size - Math.floor(rng() * 8) - 1,       y: size - Math.floor(rng() * 8) - 1,       biome: BIOME_DEFS[0] }; // forest opposite

  // ── Layer 2: River bands ──
  const riverX = Math.floor(rng() * (size - 10)) + 5;
  const riverY = Math.floor(rng() * (size - 10)) + 5;
  const riverDir = rng() > 0.5 ? 'h' : 'v'; // horizontal or vertical
  const riverWidth = 1 + Math.floor(rng() * 2);

  // ── Layer 3: Road bands ──
  const road1Y = Math.floor(rng() * (size - 6)) + 3;
  const road1X = Math.floor(rng() * (size - 6)) + 3;

  // ── Fill tiles ──
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const key = `${x},${y}`;

      // River takes priority
      if (riverDir === 'h' && Math.abs(y - riverY) < riverWidth) {
        tiles[key] = DW_makeTile(gameId, x, y, 'river', null, null);
        continue;
      }
      if (riverDir === 'v' && Math.abs(x - riverX) < riverWidth) {
        tiles[key] = DW_makeTile(gameId, x, y, 'river', null, null);
        continue;
      }

      // Road bands
      if (Math.abs(y - road1Y) === 0 || Math.abs(x - road1X) === 0) {
        tiles[key] = DW_makeTile(gameId, x, y, 'road', null, null);
        continue;
      }

      // Find nearest biome seed (Voronoi)
      let nearestSeed = seeds[0];
      let minDist = Infinity;
      for (const s of seeds) {
        const d = (s.x - x) ** 2 + (s.y - y) ** 2;
        if (d < minDist) { minDist = d; nearestSeed = s; }
      }
      const biome = nearestSeed.biome;

      // Pick terrain from biome pool
      const r2 = mulberry32(hashCoord(gameId, x * 7 + 3, y * 13 + 5));
      const pool = biome.tiles;
      let tileType = pool[Math.floor(r2() * pool.length)];

      // Scatter landmarks inside biome (~5% chance)
      if (r2() < 0.05 && biome.landmarks.length > 0) {
        tileType = biome.landmarks[Math.floor(r2() * biome.landmarks.length)];
      }

      tiles[key] = DW_makeTile(gameId, x, y, tileType, null, null);
    }
  }

  // ── Layer 4: Key locations (overwrite) ──
  for (const kl of KEY_LOCATIONS) {
    const x = DW_SPAWN_X + kl.dx;
    const y = DW_SPAWN_Y + kl.dy;
    if (x >= 0 && y >= 0 && x < size && y < size) {
      tiles[`${x},${y}`] = DW_makeTile(gameId, x, y, kl.type, kl.name, kl.special);
    }
  }

  return tiles;
}

function DW_makeTile(gameId, x, y, type, nameOverride, special) {
  const rng    = mulberry32(hashCoord(gameId, x, y));
  const pool   = TILE_OBJECT_POOLS[type] || TILE_OBJECT_POOLS['street'];
  const n      = 2 + Math.floor(rng() * 3);
  const objects = [];
  for (let i = 0; i < n; i++) {
    objects.push({
      type: pool[Math.floor(rng() * pool.length)],
      id: `${x}_${y}_${i}`,
      searched: false,
    });
  }
  return {
    x, y, type,
    name: nameOverride || TILE_TYPES[type]?.name || type,
    special: special || null,
    objects, explored: false, barricade: 0, noiseLvl: 0,
  };
}

// ── WIN CONDITION ─────────────────────────────────────
// v1 BUG: checked tile type but never set gameWon = true
// v2 FIX: correctly sets gameWon and requires antidote_blueprint
function DW_checkWinCondition(state) {
  const ex = DW_SPAWN_X + 9, ey = DW_SPAWN_Y + 9;
  if (state.x !== ex || state.y !== ey) return state;

  const tile = state.tiles[`${ex},${ey}`];
  if (tile?.type !== 'tunnel') return state;

  const hasBlueprint = DW_invFindId(state.inventory, 'antidote_blueprint') !== -1;
  if (!hasBlueprint) {
    const alreadyLogged = (state.log||[]).some(l => l.includes('Antidote Blueprint'));
    if (!alreadyLogged) {
      return {
        ...state,
        log: ['⛏ Cửa hầm thoát! Cần Antidote Blueprint — tiêu diệt Dr. Zero trước.', ...(state.log||[])],
      };
    }
    return state;
  }

  return { ...state, gameWon: true };   // ← WIN
}

// ── DAY ADVANCE ───────────────────────────────────────
// v2: KHÔNG decay hunger/thirst ở đây nữa.
// Decay đã được tính liên tục qua DW_needsDecay(apSpent) trong _DW_worldTick.
// advanceDay chỉ xử lý: consequence check (đói/khát gây HP loss),
// stress build, status tick, và equip durability decay.
function DW_advanceDay(state) {
  let s = { ...state, day: state.day + 1 };

  // ── Reset daily skill counters ──────────────────────
  // free_actions (nguoi_nhieu_viec), no_idle (nguoi_nhieu_viec mastery),
  // ghost_exit (thoat_hiem_chuyen_nghiep lv7), abundance tile search counts
  s.freeActionsUsed    = 0;
  s.noIdleCount        = 0;
  s.ghostExitUsedToday = 0;
  s.secondWindUsed     = false;   // ap_zero_heal (nhip_tho_deu lv7)
  s.natureHealUsed     = false;   // nature_heal (mot_voi_thien_nhien lv5)
  s.dailyForageUsed    = false;   // daily_forage (tim_kiem_ban_nang lv5)
  s.wildFoodUsed       = false;   // forager_instinct daily_wild_food
  s.oracleUsed         = s.oracleUsed || false; // oracle 1 lần/game — không reset
  s.autoFleeUsed       = false;   // auto_flee_once (phan_xa_lai_xe lv3)
  // Mechanic daily counters
  s.fullRestoreUsed      = false; // full_restore (tay_nghe_vung lv5) — 1 lần/ngày
  s.automatedCraftUsed   = 0;     // automated_craft (day_chuyen_san_xuat lv10) — tối đa 3
  s.repairFromNothingUsed= false; // repair_from_nothing (sua_bang_bat_cu_thu_gi lv7)
  s.triageRepairUsed     = false; // triage_repair (chan_doan_nhanh lv3) — 1 lần/ngày
  s.preCombatCheckDone   = false; // pre_combat_check (bao_tri_dinh_ky lv7) — 1 lần/ngày

  // Reset abundance daily search count trên tất cả tile
  if (s.tileAbundanceCount) s.tileAbundanceCount = {};

  // ── Mechanic: trap cooldown reset (bay_co_hoc lv2+ trap_reset) ──
  // Mỗi ngày mới, giảm cooldown bẫy và reactivate nếu cooldown = 0
  if (s.job === 'mechanic' && s.tileTrap) {
    const newTraps = { ...s.tileTrap };
    for (const [tk, trap] of Object.entries(newTraps)) {
      if (!trap.active && trap.reset && trap.cooldown > 0) {
        const newCooldown = trap.cooldown - 1;
        newTraps[tk] = { ...trap, cooldown: newCooldown, active: newCooldown <= 0 };
      }
    }
    s.tileTrap = newTraps;
  }

  // ── Morning bonus từ buoc_chan_thu_hai ──────────────
  // Nếu player vừa ngủ (set bởi DW_sleep), morningBonusUntilHour sẽ được set
  // advanceDay không clear morning bonus — DW_tick kiểm tra hour để clear

  // Stress tích lũy mỗi ngày
  const mentalSkill = s.skills?.mental || 0;
  const stressBuild = Math.max(0, 5 - mentalSkill * 2);
  const stressRate  = s.job === 'teacher' ? 0.6 : 1.0;

  // Farmer: stress_from_hunger_immune (suc_ben_vo_tan lv5) — không cộng stress khi đói
  const hungerStressImmune = s.job === 'farmer' &&
    DW_getSkillEffect(s, 'suc_ben_vo_tan', 'stress_from_hunger_immune');
  if (!(hungerStressImmune && (s.hunger < 3 || s.thirst < 3))) {
    s.stress = Math.min(100, s.stress + stressBuild * stressRate);
  }

  s = DW_tickStatuses(s);

  // Consequence: đói/khát cực độ
  if (s.hunger <= 0 || s.thirst <= 0) {
    // Farmer: famine_mode — không mất HP khi hunger = 0
    const famineMode = s.job === 'farmer' &&
      DW_getSkillEffect(s, 'suc_ben_vo_tan', 'famine_mode');
    if (!famineMode) {
      s.hp  = Math.max(0, s.hp - 2);
      s.log = [`Ngày ${s.day}: ${s.hunger<=0?'Chết đói':'Khát nước'} — mất 2 HP!`, ...(s.log||[])];
    } else {
      s.log = [`Ngày ${s.day}: Đói nhưng cơ thể vẫn hoạt động. (Famine Mode)`, ...(s.log||[])];
    }
  }
  if (s.hp <= 0) s.gameOver = true;

  // Equip durability decay
  const newDur   = { ...(s.equipDur || {}) };
  const newEquip = { ...(s.equip || {}) };

  // Mechanic: barricade_repair_passive (barricade_chuyen_nghiep lv7)
  // Barricade của tile hiện tại tự hồi 1 level mỗi sáng nếu còn > 0
  if (s.job === 'mechanic') {
    const passiveRepair = DW_getSkillEffect(s, 'barricade_chuyen_nghiep', 'barricade_repair_passive');
    if (passiveRepair) {
      const tk = `${s.x},${s.y}`;
      const tileNow = s.tiles?.[tk];
      if (tileNow && tileNow.barricade > 0 && tileNow.barricade < 5) {
        s = { ...s, tiles: { ...s.tiles, [tk]: { ...tileNow, barricade: tileNow.barricade + 1 } } };
        s.log = ['🔧 Barricade Passive Repair: tự hồi +1 level.', ...(s.log||[])];
      }
    }
  }

  // Mechanic: equipment_decay_slow (bao_tri_dinh_ky lv5)
  const decaySlow = s.job === 'mechanic'
    ? DW_getSkillEffect(s, 'bao_tri_dinh_ky', 'equipment_decay_slow')
    : 0;
  // Mechanic: durability_floor (vinh_cuu lv1+)
  const durFloor = s.job === 'mechanic'
    ? DW_getSkillEffect(s, 'vinh_cuu', 'durability_floor')
    : 0;
  // Mechanic: eternal_maintenance lv10 — floor 10
  const eternalMaint = s.job === 'mechanic' &&
    DW_getSkillEffect(s, 'bao_tri_dinh_ky', 'eternal_maintenance');

  for (const [slot, id] of Object.entries(newEquip)) {
    if (id && newDur[slot] != null) {
      // Farmer: indestructible_tool — công cụ không về 0 durability
      const isToolSlot = slot === 'tool';
      const indestructible = isToolSlot && s.job === 'farmer' &&
        DW_getSkillEffect(s, 'va_viu', 'indestructible_tool');

      // Mechanic: decay_slow giảm lượng durability mất hàng ngày
      let decayAmt = 1;
      if (decaySlow > 0) {
        // 30% slow = 70% of base decay, tinh toán bằng xác suất
        decayAmt = Math.random() > decaySlow ? 1 : 0;
      }

      const floor = eternalMaint ? 10 : (indestructible && isToolSlot ? 1 : (durFloor || 0));
      newDur[slot] = Math.max(floor, newDur[slot] - decayAmt);
      if (newDur[slot] <= 0 && floor <= 0) {
        s.log = [`[Trang bị] ${DW_itemName(id)} đã hỏng!`, ...(s.log||[])];
        newEquip[slot] = null;
        delete newDur[slot];
      }
    }
  }
  s.equip    = newEquip;
  s.equipDur = newDur;

  // ── Mechanic: eternal_bond (vinh_cuu lv7) ─────────────
  // Vũ khí heirloom tăng 10% damage thêm mỗi ngày mang theo.
  // Cap: +50% tổng (5 ngày). Lưu vào state.heirloomBondDays.
  if (s.job === 'mechanic' && s.heirloom?.slot === 'weapon' &&
      DW_getSkillEffect(s, 'vinh_cuu', 'eternal_bond')) {
    const heirloomId = s.equip?.weapon;
    const isEquipped = heirloomId && heirloomId === s.heirloom?.id;
    if (isEquipped) {
      const prevDays = s.heirloomBondDays || 0;
      s.heirloomBondDays = Math.min(5, prevDays + 1); // cap 5 ngày = +50%
      if (s.heirloomBondDays > prevDays) {
        s.log = [`🔗 Eternal Bond: ${DW_itemName(heirloomId)} +${s.heirloomBondDays * 10}% damage (ngày ${s.heirloomBondDays}/5).`, ...(s.log||[])];
      }
    }
  }

  // ── Mechanic: indestructible_base (barricade_chuyen_nghiep lv10) ──
  // Tile hiện tại nếu là tile có barricade lv5 → sàn 1 (không thể về 0 từ threat events).
  if (s.job === 'mechanic' && DW_getSkillEffect(s, 'barricade_chuyen_nghiep', 'indestructible_base')) {
    const tk = `${s.x},${s.y}`;
    const tileNow = s.tiles?.[tk];
    if (tileNow && tileNow.barricade > 0 && tileNow.barricade < 1) {
      s = { ...s, tiles: { ...s.tiles, [tk]: { ...tileNow, barricade: 1 } } };
    }
  }

  if (typeof DW_directorScore === 'function') {
    const dir = DW_directorScore(s);
    s.directorScore = dir.score;
    s.directorTier  = dir.tier;
  }

  // Police: danh_tieng_canh_sat / perimeter_alert — rep_warning: biết trước base attack
  if (s.job === 'police') {
    const hasWarning = DW_getSkillEffect(s, 'danh_tieng_canh_sat', 'rep_warning') ||
                       (DW_hasSignatureSkill(s, 'perimeter_alert') &&
                        DW_getSkillEffect(s, 'perimeter_alert', 'base_attack_warning'));
    if (hasWarning && s.pendingBaseEvent && !s.baseAttackWarned) {
      s.baseAttackWarned = true;
      s.log = [`🚨 Cảnh Báo Vùng — base sắp bị tấn công ngày mai!`, ...(s.log||[])];
    }
  }

  return s;
}

// ── DW_needsDecay ────────────────────────────────────
// v3: pool 40 AP/ngày → decay rate giảm một nửa so với v2
// 1 ngày ~40 AP → hungerDecay/AP = 0.05, thirstDecay/AP = 0.063
function DW_needsDecay(state, apSpent) {
  if (!apSpent || apSpent <= 0) return state;
  const cookMul    = state.job === 'cook' ? 0.65 : 1.0;
  const hungerRate = 0.05  * cookMul;
  const thirstRate = 0.063 * cookMul;
  return {
    ...state,
    hunger: Math.max(0, state.hunger - hungerRate * apSpent),
    thirst: Math.max(0, state.thirst - thirstRate * apSpent),
  };
}

// Alias giữ backward-compat nếu bất kỳ chỗ nào còn gọi DW_applyDecay
function DW_applyDecay(state) { return DW_needsDecay(state, 1); }

// ── BUILDING TILE CHECK ───────────────────────────────
var BUILDING_TILE_TYPES = new Set([
  'hospital','apartment','school','police','market',
  'pharmacy','factory','church','bunker','lab','tunnel',
  'mall','gas_station','radio_tower','zombie_nest','radiation','warehouse','supermarket',
]);
function _DW_isBuilding(tileType) {
  return BUILDING_TILE_TYPES.has(tileType);
}

// Impassable terrain
var IMPASSABLE_TILES = new Set(['river','mountain']);

// ── WORLD TICK (extracted from DW_move) ───────────────
function _DW_worldTick(state, targetX, targetY, apSpent) {
  // 1 AP = 15 phút game time (với pool 40 AP: ~10h/ngày hoạt động tự nhiên)
  const hoursAdvanced = apSpent * 0.25;
  const newHour = (state.hour + hoursAdvanced) % 24;

  let s = {
    ...state,
    ap:    state.ap - apSpent,
    hour:  newHour,
    noise: Math.max(0, state.noise - 1),
  };

  if (newHour < state.hour && apSpent > 0) s = DW_advanceDay(s);

  const key  = `${targetX},${targetY}`;
  const tile = state.tiles[key];
  if (!s.exploredTiles.includes(key)) s.exploredTiles = [...s.exploredTiles, key];
  if (tile) s.tiles = { ...s.tiles, [key]: { ...tile, explored: true } };

  s = DW_needsDecay(s, apSpent);
  s = DW_checkBossSpawn(s, targetX, targetY);
  s = DW_checkWinCondition(s);
  s = DW_tickNoise(s);
  s = DW_checkExhaustion(s);

  return s;
}

// ── MOVE ──────────────────────────────────────────────
function DW_move(state, dx, dy) {
  const nx = state.x + dx, ny = state.y + dy;
  if (nx < 0 || ny < 0 || nx >= DW_WORLD_SIZE || ny >= DW_WORLD_SIZE)
    return { state, msg: 'Không thể đi ra ngoài bản đồ.', ok: false };

  const tile     = state.tiles[`${nx},${ny}`];
  const tileType = tile?.type || 'street';

  if (IMPASSABLE_TILES && IMPASSABLE_TILES.has(tileType))
    return { state, msg: `Không thể vượt qua ${TILE_TYPES[tileType]?.name||tileType}.`, ok: false };

  if (_DW_isBuilding(tileType)) {
    return DW_approach(state, dx, dy);
  }

  let apCost = MOVE_COST[tileType] || 1;

  // ── Driver: street_ap_reduction / city_runner ──────
  const isStreetOrRoad = tileType === 'road' || tileType === 'street';
  const isAlley        = tileType === 'alley';
  if (state.job === 'driver') {
    if (isStreetOrRoad) {
      const dReduce = DW_getSkillEffect(state, 'toc_do_do_thi', 'street_ap_reduction');
      apCost = Math.max(1, apCost - (dReduce || 1));
    }
    if (isAlley) {
      const aReduce = DW_getSkillEffect(state, 'toc_do_do_thi', 'alley_ap_reduction');
      apCost = Math.max(1, apCost - (aReduce || 0));
    }
    // city_runner mastery: không bao giờ > 1 AP trong đô thị
    if (DW_getSkillEffect(state, 'toc_do_do_thi', 'city_runner') && isStreetOrRoad) {
      apCost = 1;
    }
    // terrain_reader signature: mọi outdoor = 1 AP
    if (DW_hasSignatureSkill(state, 'terrain_reader') &&
        DW_getSkillEffect(state, 'terrain_reader', 'outdoor_ap_flat')) {
      apCost = 1;
    }
  }

  // ── Farmer: outdoor_ap_reduction (chan_quen_duong) ──
  const OUTDOOR_TILE_TYPES = new Set(['field','forest','road','plain','swamp','beach','hill']);
  if (state.job === 'farmer' && OUTDOOR_TILE_TYPES.has(tileType)) {
    const fReduce = DW_getSkillEffect(state, 'chan_quen_duong', 'outdoor_ap_reduction');
    if (fReduce > 0) apCost = Math.max(1, apCost - fReduce);
    const roadReduce = DW_getSkillEffect(state, 'chan_quen_duong', 'road_ap_reduction');
    if (roadReduce > 0 && tileType === 'road') apCost = Math.max(1, apCost - roadReduce);
    // terrain_reader signature: override to flat 1
    if (DW_hasSignatureSkill(state, 'terrain_reader') &&
        DW_getSkillEffect(state, 'terrain_reader', 'outdoor_ap_flat')) {
      apCost = 1;
    }
  }

  // ── Night penalty ─────────────────────────────────
  const isNight = state.hour >= 20 || state.hour < 6;
  if (isNight) {
    // Farmer: night_penalty_immune (chan_quen_duong lv5)
    const nightImmune = state.job === 'farmer' &&
      DW_getSkillEffect(state, 'chan_quen_duong', 'night_penalty_immune');
    // Police: canh_giac_cao_do — night_awareness (penalty giảm 50%)
    const policeNightReduce = state.job === 'police' &&
      DW_getSkillEffect(state, 'canh_giac_cao_do', 'night_awareness');
    if (!nightImmune) {
      const toolId = state.equip?.tool;
      let visPen = toolId ? Math.max(0, 1 - (EQUIP_DEFS[toolId]?.visBonus || 0)) : 1;
      if (policeNightReduce) visPen = Math.ceil(visPen * 0.5);
      apCost += visPen;
    }
    // Driver: night_street_free / day_street_free
    if (state.job === 'driver' && isStreetOrRoad &&
        DW_getSkillEffect(state, 'toc_do_do_thi', 'night_street_free')) {
      const hasZombieInTile = (tile?.objects||[]).some(
        o => OBJECT_DEFS[o.type]?.type === 'enemy' && o.alive !== false);
      if (!hasZombieInTile) apCost = 0;
    }
  } else {
    // Day: driver day_street_free
    if (state.job === 'driver' && isStreetOrRoad &&
        DW_getSkillEffect(state, 'toc_do_do_thi', 'day_street_free')) {
      const hasZombieInTile = (tile?.objects||[]).some(
        o => OBJECT_DEFS[o.type]?.type === 'enemy' && o.alive !== false);
      if (!hasZombieInTile) apCost = 0;
    }
  }

  apCost = Math.max(1, apCost);
  if (state.ap < apCost)
    return { state, msg: `Cần ${apCost} ĐHĐ. Bạn còn ${state.ap}.`, ok: false };

  // ── Driver: noise reduction khi di chuyển ─────────
  let s = { ...state, x: nx, y: ny };
  if (state.job === 'driver') {
    const noiseKey = isNight ? 'night_move_noise_reduce' : 'day_move_noise_reduce';
    // Ưu tiên skill có noise reduce cao nhất
    const nReduce = Math.max(
      DW_getSkillEffect(state, 'buoc_nhe', noiseKey) || 0,
      DW_getSkillEffect(state, 'buoc_nhe', 'day_move_noise_reduce') || 0,
    );
    if (nReduce > 0) s.noise = Math.max(0, (s.noise || 0) - nReduce);
  }

  // ── Farmer: noise reduction ở tile quen thuộc ─────
  if (state.job === 'farmer') {
    const tileKey = `${nx},${ny}`;
    const visitCount = (state.tileVisits?.[tileKey] || 0);
    if (visitCount > 0) {
      const rNoise = DW_getSkillEffect(state, 'lanh_tho_quen_thuoc', 'revisit_noise_reduction');
      if (rNoise > 0) s.noise = Math.max(0, (s.noise || 0) - rNoise);
    }
  }

  // ── Track tile visit count (dùng cho Farmer home_ground) ──
  const visitKey = `${nx},${ny}`;
  const prevVisits = state.tileVisits?.[visitKey] || 0;
  s.tileVisits = { ...(state.tileVisits || {}), [visitKey]: prevVisits + 1 };

  // ── Driver: entry preview (doc_tinh_huong) ────────
  let previewMsg = '';
  if (state.job === 'driver' && DW_getSkillEffect(state, 'doc_tinh_huong', 'entry_preview_zombie_count')) {
    const zombieCount = (tile?.objects||[]).filter(
      o => OBJECT_DEFS[o.type]?.type === 'enemy' && o.alive !== false).length;
    if (zombieCount > 0) previewMsg = ` [Trinh sát: ${zombieCount} zombie trong tile]`;
    else previewMsg = ' [Trinh sát: tile sạch]';
  }

  s = _DW_worldTick(s, nx, ny, apCost);

  return { state: s, msg: `Di chuyển đến ${tile?.name || tileType}.${previewMsg}`, ok: true };
}

// ── APPROACH (bước 1 vào building) ───────────────────
// Player chọn hướng building → bắt đầu tiếp cận.
// Tốn 1 AP, noise +1, lưu state.approaching.
// Chưa teleport player — player vẫn đứng chỗ cũ.
function DW_approach(state, dx, dy) {
  const nx = state.x + dx, ny = state.y + dy;
  if (nx < 0 || ny < 0 || nx >= DW_WORLD_SIZE || ny >= DW_WORLD_SIZE)
    return { state, msg: 'Không thể đi ra ngoài bản đồ.', ok: false };

  // Không thể approach nếu đang có approach khác chưa xong
  if (state.approaching)
    return { state, msg: 'Bạn đang ở trước cửa rồi. Vào hoặc quay lại.', ok: false };

  const AP_APPROACH = 1;
  if (state.ap < AP_APPROACH)
    return { state, msg: `Cần ${AP_APPROACH} ĐHĐ để tiếp cận.`, ok: false };

  const tile     = state.tiles[`${nx},${ny}`];
  const tileName = tile?.name || 'tòa nhà';

  // Roll encounter nhẹ trên đường tiếp cận (zombie chặn, xe đổ, xác chết)
  const encounterRoll = Math.random();
  let encounterMsg = '';
  if (encounterRoll < 0.15) {
    encounterMsg = ' 🧟 Có tiếng động phía trước — cẩn thận khi vào.';
  } else if (encounterRoll < 0.25) {
    encounterMsg = ' 🚗 Xe đổ chắn lối — mất thêm thời gian.';
  } else if (encounterRoll < 0.35) {
    encounterMsg = ' ☠️ Xác chết trên đường — đừng gây ồn.';
  }

  const s = {
    ...state,
    ap:    state.ap - AP_APPROACH,
    noise: Math.min(10, (state.noise || 0) + 1), // tiếp cận gây noise
    approaching: { targetX: nx, targetY: ny },
    log: [
      `🚶 Tiếp cận ${tileName}... Bạn đang băng qua con đường.${encounterMsg}`,
      ...(state.log || []),
    ],
  };

  return {
    state: s,
    msg:        `Đang tiếp cận ${tileName}.`,
    ok:         true,
    approaching: true,  // UI dùng flag này để render menu Enter / Quan sát / Quay lại
  };
}

// ── ENTER APPROACHED (bước 2 — vào building) ─────────
// Gọi sau DW_approach() khi player chọn "Vào".
// Tốn 1 AP, thực sự teleport player vào tile.
function DW_enterApproached(state) {
  if (!state.approaching)
    return { state, msg: 'Không có tòa nhà nào đang tiếp cận.', ok: false };

  const AP_ENTER = 1;
  if (state.ap < AP_ENTER)
    return { state, msg: `Cần ${AP_ENTER} ĐHĐ để vào trong.`, ok: false };

  const { targetX, targetY } = state.approaching;
  const tile     = state.tiles[`${targetX},${targetY}`];
  const tileName = tile?.name || 'tòa nhà';

  // Teleport player + chạy world tick
  let s = { ...state, x: targetX, y: targetY, approaching: null };
  s = _DW_worldTick(s, targetX, targetY, AP_ENTER);
  s = { ...s, log: [`🚪 Bạn đứng trước cửa ${tileName}. Bên trong tối và im lặng.`, ...(s.log || [])] };

  return {
    state: s,
    msg:       `Vào ${tileName}.`,
    ok:        true,
    firstVisit: !state.exploredTiles.includes(`${targetX},${targetY}`),
  };
}

// ── RETREAT FROM APPROACH ─────────────────────────────
// Player chọn "Quay lại" khi đang approaching — không tốn AP.
function DW_retreatApproach(state) {
  if (!state.approaching)
    return { state, msg: 'Không có gì để quay lại.', ok: false };

  const s = {
    ...state,
    approaching: null,
    log: ['↩️ Bạn quyết định không vào.', ...(state.log || [])],
  };
  return { state: s, msg: 'Quay lại.', ok: true };
}

// ══════════════════════════════════════════════════════
// RUMOR SYSTEM
// ══════════════════════════════════════════════════════

// Trả về weight bảng outcome theo ngày — early game ít trap hơn
function DW_getRumorOutcomeWeights(day) {
  if (day <= 3)  return [{id:'loot',w:55},{id:'bandit',w:20},{id:'zombie',w:15},{id:'empty',w:10}];
  if (day <= 7)  return [{id:'loot',w:45},{id:'bandit',w:30},{id:'zombie',w:15},{id:'empty',w:10}];
  return             [{id:'loot',w:35},{id:'bandit',w:40},{id:'zombie',w:15},{id:'empty',w:10}];
}

// Tìm tile đích cho rumor — ưu tiên KEY_LOCATIONS khớp targetSpecial
function DW_findRumorTarget(state, rumor) {
  const keyLocs = KEY_LOCATIONS.filter(kl =>
    rumor.targetSpecial ? kl.special === rumor.targetSpecial : kl.special === null
  );
  if (!keyLocs.length) return null;
  // Pick ngẫu nhiên trong danh sách khớp
  const kl = keyLocs[Math.floor(Math.random() * keyLocs.length)];
  return { x: DW_SPAWN_X + kl.dx, y: DW_SPAWN_Y + kl.dy, name: kl.name, type: kl.type };
}

// Sinh rumor mới — gọi khi ngủ hoặc dùng radio
// Không sinh nếu đã có activeRumor chưa resolve
function DW_generateRumor(state) {
  if (state.activeRumor) return { state, msg: 'Bạn vẫn còn một tin đồn chưa kiểm chứng.', ok: false };

  // Roll rumor từ pool — tránh repeat gần đây
  const history = (state.rumorHistory || []).map(r => r.id);
  const pool    = RUMOR_POOL.filter(r => !history.slice(-3).includes(r.id));
  if (!pool.length) return { state, msg: 'Không có tin tức mới.', ok: false };

  const rumor  = pool[Math.floor(Math.random() * pool.length)];
  const target = DW_findRumorTarget(state, rumor);
  if (!target) return { state, msg: 'Không xác định được địa điểm.', ok: false };

  // Roll outcome ngay lúc generate — ẩn khỏi player, lưu trong state
  const weights = DW_getRumorOutcomeWeights(state.day);
  const outcome = weightedPick(weights, Math.random.bind(Math)).id;

  // Rare twist: 10% chance nếu outcome là trap/bandit → zombie đã xử lý bandit
  const rareTwist = (outcome === 'bandit') && Math.random() < 0.10;

  const activeRumor = {
    id:        rumor.id,
    text:      rumor.text,
    source:    rumor.source,
    targetX:   target.x,
    targetY:   target.y,
    targetName:target.name,
    baitIcon:  rumor.baitIcon,
    lootItems: rumor.lootItems,
    stashDesc: rumor.stashDesc,
    outcome,      // 'loot'|'bandit'|'zombie'|'empty' — ẩn với player
    rareTwist,    // true = bandit đã chết trước khi player đến
    phase: null,  // null → 'warning' → 'decision' → 'resolved'
  };

  const s = {
    ...state,
    activeRumor,
    log: [`${rumor.text}`, ...(state.log||[])],
  };
  return { state: s, msg: rumor.text, ok: true };
}

// Kiểm tra khi player bước vào tile — có trigger rumor không?
// Trả về { state, triggered: bool, encounter?: object }
function DW_checkRumorTrigger(state) {
  const rumor = state.activeRumor;
  if (!rumor || rumor.phase) return { state, triggered: false }; // đã xử lý hoặc không có

  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];

  // Chỉ trigger tại tile đích
  if (state.x !== rumor.targetX || state.y !== rumor.targetY)
    return { state, triggered: false };

  // One-time: tile đã resolved thì bỏ qua
  if (tile?.rumorResolved) {
    const s = { ...state, activeRumor: null };
    return { state: s, triggered: false };
  }

  // Perception check — sneak + mental vs DC tùy outcome
  const roll        = Math.floor(Math.random() * 20) + 1;
  const skillBonus  = (state.skills?.sneak || 0) + (state.skills?.mental || 0);
  const banditCount = DW_getRumorBanditCount(state.day, state.banditRep || 0);
  const dc          = rumor.outcome === 'bandit' ? 10 + banditCount : 10;
  const perceptionPass = (roll + skillBonus) >= dc;

  // Đánh dấu phase warning — bắt đầu encounter flow
  const updatedRumor = { ...rumor, phase: 'warning', perceptionPass, banditCount };
  let s = { ...state, activeRumor: updatedRumor };

  // Build warning message
  let warningMsg = '';
  if (rumor.rareTwist) {
    // Rare twist: reveal ngay trước decision
    warningMsg = `☠️ Bạn bước vào ${tile?.name}. Có mùi máu. Vài tên cướp nằm chết — zombie đã ở đây trước bạn. Loot tự do, nhưng cẩn thận...`;
    s = { ...s, log: [warningMsg, ...(s.log||[])] };
    return { state: s, triggered: true, rareTwist: true, encounter: updatedRumor };
  }

  if (rumor.outcome === 'loot') {
    warningMsg = `📦 Bạn đến ${tile?.name}. Thấy ${rumor.baitIcon} ${rumor.stashDesc}`;
  } else if (rumor.outcome === 'empty') {
    warningMsg = `💨 Bạn đến ${tile?.name}. Nơi đây trống rỗng — ai đó đã lấy đi trước rồi.`;
  } else if (rumor.outcome === 'zombie') {
    warningMsg = `🧟 Bạn đến ${tile?.name}. Thấy ${rumor.baitIcon}... nhưng có tiếng gầm gừ từ trong bóng tối.`;
  } else if (rumor.outcome === 'bandit') {
    if (perceptionPass) {
      warningMsg = `⚠️ Bạn đến ${tile?.name}. Thấy ${rumor.baitIcon} ${rumor.stashDesc} — nhưng bạn ngửi thấy mùi thuốc lá và nghe tiếng thở nhẹ. Đây là bẫy.`;
    } else {
      warningMsg = `📦 Bạn đến ${tile?.name}. Thấy ${rumor.baitIcon} ${rumor.stashDesc}`;
    }
  }

  s = { ...s, log: [warningMsg, ...(s.log||[])] };
  return { state: s, triggered: true, encounter: updatedRumor, warningMsg };
}

// Resolve encounter sau khi player chọn hành động (decision phase)
// action: 'loot'|'retreat'|'stealth'|'fight'|'throw'
function DW_resolveRumorEncounter(state, action) {
  const rumor = state.activeRumor;
  if (!rumor) return { state, msg: 'Không có encounter.', ok: false };

  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];

  // AP cost theo action
  const apCosts = { retreat:1, stealth:2, fight:2, throw:1, loot:1 };
  const apCost  = apCosts[action] || 1;
  if (state.ap < apCost) return { state, msg: `Cần ${apCost} ĐHĐ.`, ok: false };

  let s    = { ...state, ap: state.ap - apCost };
  let msg  = '';
  let banditEncounter = null; // trả về UI để trigger DW_fightBandit nếu cần

  // ── RARE TWIST: loot cả hai ──────────────────────────
  if (rumor.rareTwist) {
    const gained = rumor.lootItems || [];
    s.inventory  = [...s.inventory, ...gained];
    // Thêm 1-2 zombie vào tile (đã ở đó rồi, không vô lý)
    const newObjs = [
      ...(tile?.objects || []),
      { type:'zombie', id:`rumor_z1_${tileKey}`, searched:false },
    ];
    s.tiles = { ...s.tiles, [tileKey]: { ...(tile||{}), objects: newObjs, rumorResolved: true } };
    msg = `💀 Loot bandit + kho: ${gained.map(DW_itemName).join(', ')}. Nhưng có zombie bên trong!`;
    s = DW_resolveRumorCleanup(s, 'twist');
    return { state: s, msg, ok: true };
  }

  const outcome = rumor.outcome;

  // ── LOOT outcome ─────────────────────────────────────
  if (outcome === 'loot') {
    if (action === 'loot' || action === 'fight' || action === 'stealth') {
      const gained = rumor.lootItems || [];
      s.inventory  = [...s.inventory, ...gained];
      msg = `✅ Tin đồn đúng! Loot: ${gained.map(DW_itemName).join(', ')}.`;
    } else {
      msg = '🏃 Bạn rút lui. Bỏ lỡ loot thật sự.';
    }
    s.tiles = { ...s.tiles, [tileKey]: { ...(tile||{}), rumorResolved: true } };
    s = DW_resolveRumorCleanup(s, outcome);
    return { state: s, msg, ok: true };
  }

  // ── EMPTY outcome ────────────────────────────────────
  if (outcome === 'empty') {
    msg = '💨 Không có gì. Tin đồn sai rồi — hay ai đó đã đến trước.';
    s.tiles = { ...s.tiles, [tileKey]: { ...(tile||{}), rumorResolved: true } };
    s = DW_resolveRumorCleanup(s, outcome);
    return { state: s, msg, ok: true };
  }

  // ── ZOMBIE outcome ────────────────────────────────────
  if (outcome === 'zombie') {
    if (action === 'retreat') {
      msg = '🏃 Bạn rút lui ngay trước khi zombie phát hiện. An toàn.';
      s = DW_resolveRumorCleanup(s, 'retreat');
    } else {
      // Spawn thêm zombie_horde vào tile
      const newObjs = [
        ...(tile?.objects || []),
        { type:'zombie_horde', id:`rumor_horde_${tileKey}`, searched:false },
        { type:'zombie',       id:`rumor_z2_${tileKey}`,    searched:false },
      ];
      s.tiles = { ...s.tiles, [tileKey]: { ...(tile||{}), objects: newObjs, rumorResolved: true } };
      msg = '🧟 Tin đồn là bẫy zombie! Một bầy đang đổ ra!';
      s = DW_resolveRumorCleanup(s, outcome);
    }
    return { state: s, msg, ok: true };
  }

  // ── BANDIT outcome ────────────────────────────────────
  if (outcome === 'bandit') {
    const banditCount = rumor.banditCount || 1;
    const bandits     = DW_spawnBandits(state.day, state.banditRep || 0, banditCount);

    if (action === 'retreat') {
      msg = '🏃 Bạn rút lui. Không loot, không chạm trán.';
      s = DW_resolveRumorCleanup(s, 'retreat');
      s.tiles = { ...s.tiles, [tileKey]: { ...(tile||{}), rumorResolved: true } };
      return { state: s, msg, ok: true };
    }

    if (action === 'throw') {
      // Cần throwable item
      const throwIdx = s.inventory.findIndex(id => DW_itemHasTag(id, 'throwable'));
      if (throwIdx === -1) {
        msg = '❌ Không có vật để ném. Buộc phải chiến đấu!';
        // Fall through → fight
      } else {
        const thrownId = s.inventory[throwIdx];
        s.inventory = s.inventory.filter((_,i) => i !== throwIdx);
        s.noise = Math.min(10, (s.noise||0) + 5);
        msg = `🪨 Ném ${DW_itemName(thrownId)} — bandit mất tập trung 1 lượt! Tấn công ngay.`;
        // Trả về bandit encounter với lợi thế
        s.tiles = { ...s.tiles, [tileKey]: { ...(tile||{}), rumorResolved: true } };
        s = { ...s, activeRumor: { ...rumor, phase: 'resolved', lootItems: rumor.lootItems } };
        return { state: s, msg, ok: true, banditEncounter: { bandits, advantage: true, loot: rumor.lootItems } };
      }
    }

    // fight hoặc stealth → trả encounter về UI
    const advantage = action === 'stealth' && (rumor.perceptionPass);
    s.tiles = { ...s.tiles, [tileKey]: { ...(tile||{}), rumorResolved: true } };
    s = { ...s, activeRumor: { ...rumor, phase: 'resolved', lootItems: rumor.lootItems } };
    msg = advantage
      ? `🥷 Bạn tiếp cận từ phía sau. Lợi thế tấn công! Chạm trán ${bandits.length} tên cướp.`
      : `⚔️ Chạm trán ${bandits.length} tên cướp — ${bandits.map(b=>b.name).join(', ')}!`;
    return { state: s, msg, ok: true, banditEncounter: { bandits, advantage, loot: rumor.lootItems } };
  }

  return { state: s, msg: 'Không xác định outcome.', ok: false };
}

// Helper: dọn dẹp activeRumor sau khi resolve
function DW_resolveRumorCleanup(state, outcome) {
  const rumor   = state.activeRumor;
  const history = [...(state.rumorHistory||[]), { id: rumor?.id, outcome, day: state.day }];
  return { ...state, activeRumor: null, rumorHistory: history };
}

// Helper: tính số bandit theo ngày & rep
function DW_getRumorBanditCount(day, banditRep) {
  if (banditRep >= 6 || day >= 8) return 2 + Math.floor(Math.random() * 2); // 2-3
  if (banditRep >= 3 || day >= 4) return 1 + Math.floor(Math.random() * 2); // 1-2
  return 1;
}

// Helper: build danh sách bandit objects để trả về UI
function DW_spawnBandits(day, banditRep, count) {
  // Chọn tier bandit theo ngày & rep
  let tier = 'bandit_scout';
  if (banditRep >= 6 || day >= 8) tier = Math.random() < 0.5 ? 'bandit_heavy' : 'bandit_leader';
  else if (banditRep >= 3 || day >= 4) tier = 'bandit_raider';

  const def = BANDIT_DEFS[tier];
  return Array.from({ length: count }, (_, i) => ({
    ...def,
    hp: def.maxHp, // fresh HP
    id: `bandit_${tier}_${Date.now()}_${i}`,
    // Gán personality 1 lần khi spawn — engine-combat.js đọc để dispatch behavior
    personality: DW_assignBanditPersonality(tier),
  }));
}

// ══════════════════════════════════════════════════════
// NOISE TICK — zombie migration khi tile quá ồn
// Gọi từ DW_move() sau mỗi lần di chuyển
// ══════════════════════════════════════════════════════
function DW_tickNoise(state) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];
  if (!tile) return state;

  const tileLvl = Math.max(tile.noiseLvl || 0, state.noise || 0);
  let s = { ...state, tiles: { ...state.tiles, [tileKey]: { ...tile, noiseLvl: tileLvl } } };

  if (tileLvl < 5) return s;

  const NATURE_TILE_TYPES = new Set(['forest','field','plain','hill','beach']);
  const isNatureTile = NATURE_TILE_TYPES.has(tile.type);

  // ── Farmer: nature_guardian (mot_voi_thien_nhien lv10) ──
  // Zombie không chủ động vào tile rừng khi player đang ở đó.
  // Chú ý: không chặn hoàn toàn — boss và tile đã có zombie vẫn hoạt động bình thường.
  const hasNatureGuardian = state.job === 'farmer' && isNatureTile &&
    DW_getSkillEffect(state, 'mot_voi_thien_nhien', 'nature_guardian');
  if (hasNatureGuardian) {
    // Không spawn zombie mới vào tile hiện tại, nhưng tiếng ồn vẫn lan ra
    s.tiles = { ...s.tiles, [tileKey]: { ...s.tiles[tileKey], noiseLvl: Math.max(0, tileLvl - 1) } };
    return s;
  }

  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const rng  = Math.random;
  for (const [dx,dy] of dirs) {
    const nx = state.x + dx, ny = state.y + dy;
    if (nx < 0 || ny < 0 || nx >= DW_WORLD_SIZE || ny >= DW_WORLD_SIZE) continue;
    const nk    = `${nx},${ny}`;
    const ntile = s.tiles[nk];
    if (!ntile?.explored) continue;
    if (rng() > 0.35) continue;

    // ── Farmer: home_ground (lanh_tho_quen_thuoc lv5) ──
    // Tile đã đến 3+ lần: zombie không spawn thêm ban ngày
    const visitCount = state.tileVisits?.[nk] || 0;
    const hasHomeGround = state.job === 'farmer' && visitCount >= 3 &&
      DW_getSkillEffect(state, 'lanh_tho_quen_thuoc', 'home_ground');
    const isDay = state.hour >= 6 && state.hour < 20;
    if (hasHomeGround && isDay) continue; // block zombie spawn vào "nhà" ban ngày

    const newObjs = [...(ntile.objects||[]),
      { type:'zombie_fast', id:`noise_z_${nk}_${Date.now()}`, searched:false }];
    s.tiles = { ...s.tiles, [nk]: { ...ntile, objects: newObjs, noiseLvl: Math.max(0, tileLvl - 2) } };
  }

  s.tiles = { ...s.tiles, [tileKey]: { ...s.tiles[tileKey], noiseLvl: Math.max(0, tileLvl - 1) } };
  return s;
}

// ══════════════════════════════════════════════════════
// MECHANIC: DEFENDED ZONE SYSTEM
// defended_zone_unlock (phao_dai_song lv1) → DW_setupDefendedZone
// Defended zone: tile có nhiều lớp barricade, kill zone bonus, alarm.
// state.defendedZones = { 'x,y': { layers, killZone, alarm, active } }
// ══════════════════════════════════════════════════════
function DW_setupDefendedZone(state) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới có thể lập Defended Zone.', ok: false };

  const unlock = DW_getSkillEffect(state, 'phao_dai_song', 'defended_zone_unlock');
  if (!unlock)
    return { state, msg: 'Cần kỹ năng Pháo Đài Sống để lập Defended Zone.', ok: false };

  const tileKey  = `${state.x},${state.y}`;
  const tile     = state.tiles?.[tileKey];
  if (!tile)
    return { state, msg: 'Không có tile hợp lệ.', ok: false };

  // Cần barricade lv2+ để setup defended zone
  if ((tile.barricade || 0) < 2)
    return { state, msg: 'Cần barricade lv2+ để lập Defended Zone.', ok: false };

  const AP_COST = 3;
  if (state.ap < AP_COST)
    return { state, msg: `Cần ${AP_COST} ĐHĐ để lập Defended Zone.`, ok: false };

  const skillLv = state.skills?.['phao_dai_song'] || 0;
  const trapBonus  = DW_getSkillEffect(state, 'phao_dai_song', 'zone_trap_bonus') || 0;
  const hasAlarm   = !!DW_getSkillEffect(state, 'phao_dai_song', 'zone_alarm');
  const hasKillZone= !!DW_getSkillEffect(state, 'phao_dai_song', 'kill_zone');
  const hasChoke   = !!DW_getSkillEffect(state, 'phao_dai_song', 'choke_point');
  const hasBunker  = !!DW_getSkillEffect(state, 'phao_dai_song', 'bunker');

  // Fortify bonus từ ky_su_chien_truong
  const fortifyBonus = DW_getSkillEffect(state, 'ky_su_chien_truong', 'fortify_bonus') || 0;

  const zone = {
    layers:      2,            // 2 lớp barricade thay vì 1 (phao_dai_song lv1)
    trapBonus,                 // trap damage +%
    alarm: hasAlarm,           // cảnh báo khi lớp đầu bị phá
    killZone: hasKillZone,     // zombie nhận +2 damage/lượt
    choke: hasChoke,           // zombie chỉ vào từ 1 hướng
    bunker: hasBunker,         // không thể bị phá hoàn toàn trong 1 đêm
    fortifyBonus,              // % damage reduction khi phòng thủ
    active: true,
    builtDay: state.day,
  };

  let s = {
    ...state,
    ap: state.ap - AP_COST,
    defendedZones: { ...(state.defendedZones || {}), [tileKey]: zone },
  };

  // Synergy: iron_endurance — trong defended zone, equipment không mất durability
  const hasSynergy = DW_hasSynergy(state, 'iron_endurance');

  const msgs = [`🏰 Defended Zone thiết lập! Lớp phòng thủ: ${zone.layers}.`];
  if (hasAlarm)    msgs.push('🚨 Alarm kích hoạt.');
  if (hasKillZone) msgs.push('💀 Kill Zone: zombie nhận +2 damage/lượt.');
  if (hasBunker)   msgs.push('🛡️ Bunker: không thể bị phá hoàn toàn trong 1 đêm.');
  if (hasSynergy)  msgs.push('⚙️ Iron Endurance: trang bị không hao mòn trong zone này.');

  s.log = [msgs.join(' '), ...(s.log||[])];
  s = DW_checkMilestone(s, 'mechanic_homebuilder');

  return { state: s, msg: msgs[0], ok: true, zone };
}

// ── DW_getDefendedZone ────────────────────────────────
// Query helper — UI/combat dùng để check xem tile hiện tại có defended zone không.
function DW_getDefendedZone(state, x, y) {
  const tk = x != null ? `${x},${y}` : `${state.x},${state.y}`;
  return state.defendedZones?.[tk] || null;
}
