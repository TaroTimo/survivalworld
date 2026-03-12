// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-skills.js  v2
// Character Level (1–99), Skill Points, Skill Level (0–10),
// Milestone/Signature tracking, Status Effects, Panic
// Dependencies: deadworld-data.js (DW_SKILLS, SKILL_UNLOCK_EFFECTS)
// ══════════════════════════════════════════════════════

// ── CHARACTER LEVEL CURVE ─────────────────────────────
// Công thức: XP(n) = floor(120 × n^2.2)
// Kết quả:
//   Lv1→2   : 120 XP   (10–15 phút chơi đầu tiên)
//   Lv10→11 : ~1,900 XP (vài ngày sinh tồn)
//   Lv20→21 : ~6,300 XP (mid-game bắt đầu rõ identity)
//   Lv50→51 : ~27,000 XP (late-game, mỗi level là thành tựu)
//   Lv99    : ~230,000 XP (chỉ người chơi dài hơi mới đạt)
// Curve 3 pha: fast early → stable mid → grind late.
const CHAR_LEVEL_CAP = 99;

// Tính XP cần để đạt level n (tuyệt đối, không phải incremental).
function DW_xpForLevel(n) {
  if (n <= 1) return 0;
  if (n > CHAR_LEVEL_CAP) return Infinity;
  return Math.floor(120 * Math.pow(n, 2.2));
}

// ── SKILL LEVEL CAP & POINT ECONOMY ──────────────────
// Skill level: 0–10, mỗi level tốn 1 Skill Point.
// Tổng SP đến lv99 = 49 (lv2 đến lv99 mỗi lv cho 1 SP, trừ mốc 10,20,30... cho 2 SP).
// 49 SP không đủ để max tất cả skill (8 skill × 10 = 80 cần) → buộc phải chọn identity.
// Milestone levels (10,20,30,40,50,60,70,80,90,99) cho 2 SP thay vì 1 — reward dài hơi.
const SKILL_LEVEL_CAP = 10;

function DW_spAtLevelUp(newLevel) {
  // Milestone levels cho 2 SP, còn lại cho 1 SP
  const milestones = new Set([10,20,30,40,50,60,70,80,90,99]);
  return milestones.has(newLevel) ? 2 : 1;
}

// ── XP SOURCE DIVERSITY CAP ───────────────────────────
// Ngăn spam một hành động duy nhất để farm XP.
// Mỗi action_type không đóng góp quá MAX_XP_SHARE (30%) tổng XP cần cho level hiện tại.
// state.xpSources[actionType] = tổng XP đã nhận từ action đó trong level này.
const MAX_XP_SHARE = 0.30;

// ── CHARACTER XP SOURCES ─────────────────────────────
// Tất cả action đóng góp vào character XP chung.
// XP scaling theo ngày: actualXP = base × (1 + floor(day/10) × 0.25)
// Ví dụ: kill zombie ngày 30 = 8 × 1.75 = 14 XP thay vì 8.
const CHAR_XP_TABLE = {
  kill_zombie:    8,   // giết zombie thường
  kill_zombie_special: 20, // runner, brute, special
  kill_boss:      150, // boss
  explore_tile:   5,   // đến tile chưa từng đến
  scavenge:       3,   // lục đồ thành công
  craft:          4,   // craft 1 item
  barricade:      4,   // xây barricade
  sleep_survived: 6,   // sống qua 1 đêm
  complete_rumor: 20,  // hoàn thành rumor event
  heal_npc:       15,  // cứu/chữa NPC
  rescue_survivor:25,  // giải cứu survivor
  day_survived:   10,  // sống sót 1 ngày (gọi khi advance day)
};

// ── DW_grantCharacterXp ───────────────────────────────
// Hàm chính để cấp character XP. Tất cả engine subsystem gọi hàm này.
// actionType: key trong CHAR_XP_TABLE
// Tự động áp dụng: day scaling, diversity cap, teacher bonus, level up logic.
// Trả về state mới với charXp, charLevel, skillPoints cập nhật.
function DW_grantCharacterXp(state, actionType, overrideAmount) {
  const base = overrideAmount ?? (CHAR_XP_TABLE[actionType] || 0);
  if (base <= 0) return state;

  // Day scaling: ngày càng cao XP càng nhiều — khuyến khích chơi lâu dài
  const day    = state.day || 1;
  const scaled = Math.floor(base * (1 + Math.floor(day / 10) * 0.25));

  // Teacher bonus: XP x1.5 (giảm từ x2 vì character XP mạnh hơn skill XP cũ)
  const teacherMul = state.job === 'teacher' ? 1.5 : 1;
  let   amount     = Math.floor(scaled * teacherMul);

  // Diversity cap: không action nào > 30% XP cần cho level hiện tại
  const curLvl     = state.charLevel || 1;
  const xpToNext   = DW_xpForLevel(curLvl + 1) - DW_xpForLevel(curLvl);
  const capAmount  = Math.floor(xpToNext * MAX_XP_SHARE);
  const sources    = state.xpSources || {};
  const usedFromSource = sources[actionType] || 0;
  const remaining  = Math.max(0, capAmount - usedFromSource);
  amount = Math.min(amount, remaining); // bị cap nếu đã spam action này

  if (amount <= 0) return state; // đã đạt diversity cap — không cấp thêm

  // Cập nhật xpSources tracking
  const newSources = { ...sources, [actionType]: usedFromSource + amount };
  const newCharXp  = (state.charXp || 0) + amount;

  let s = { ...state, charXp: newCharXp, xpSources: newSources };

  // Kiểm tra level up (có thể lên nhiều level liên tiếp nếu XP lớn)
  s = _DW_checkCharLevelUp(s);

  return s;
}

// ── _DW_checkCharLevelUp (internal) ──────────────────
// Kiểm tra và xử lý level up. Gọi đệ quy để handle multi-level up.
function _DW_checkCharLevelUp(state) {
  const curLvl = state.charLevel || 1;
  if (curLvl >= CHAR_LEVEL_CAP) return state;

  const xpNeeded = DW_xpForLevel(curLvl + 1);
  if ((state.charXp || 0) < xpNeeded) return state; // chưa đủ

  const newLvl = curLvl + 1;
  const sp     = DW_spAtLevelUp(newLvl);
  const isMilestone = (sp === 2);

  let s = {
    ...state,
    charLevel:   newLvl,
    skillPoints: (state.skillPoints || 0) + sp,
    // Reset xpSources khi lên level — diversity cap tính lại cho level mới
    xpSources:   {},
    log: [
      isMilestone
        ? `🌟 MILESTONE! Level ${newLvl} — nhận ${sp} Skill Points! Mở milestone ability!`
        : `⭐ Level ${newLvl}! +${sp} Skill Point (tổng: ${(state.skillPoints||0)+sp})`,
      ...(state.log||[])
    ],
  };

  // Gọi đệ quy để xử lý trường hợp XP đủ lên nhiều level
  return _DW_checkCharLevelUp(s);
}

// ── DW_spendSkillPoint ────────────────────────────────
// Player chủ động đầu tư SP vào một skill.
// Kiểm tra: đủ SP, skill tồn tại, chưa max, đáp ứng prerequisite.
// Prerequisite check: một số skill yêu cầu skill khác đạt level nhất định.
// (SKILL_PREREQUISITES được định nghĩa trong deadworld-data.js cùng với skill tree)
function DW_spendSkillPoint(state, skillKey) {
  if ((state.skillPoints || 0) <= 0)
    return { state, ok: false, msg: 'Không đủ Skill Points.' };

  if (!DW_SKILLS[skillKey])
    return { state, ok: false, msg: 'Skill không tồn tại.' };

  const curLvl = state.skills?.[skillKey] || 0;
  if (curLvl >= SKILL_LEVEL_CAP)
    return { state, ok: false, msg: `${DW_SKILLS[skillKey].name} đã đạt max (${SKILL_LEVEL_CAP}).` };

  // Kiểm tra prerequisite nếu có
  const prereqs = (typeof SKILL_PREREQUISITES !== 'undefined' && SKILL_PREREQUISITES)
    ? (SKILL_PREREQUISITES[skillKey] || [])
    : [];
  const newLvl = curLvl + 1;
  for (const req of prereqs) {
    // fromLevel: prerequisite chỉ áp dụng khi skill đang cố lên lv >= fromLevel
    if (req.fromLevel && newLvl < req.fromLevel) continue;
    const playerLvl = state.skills?.[req.skill] || 0;
    if (playerLvl < req.level) {
      const reqName = DW_SKILLS[req.skill]?.name || req.skill;
      return { state, ok: false, msg: `Cần ${reqName} lv${req.level} trước (để nâng lên lv${newLvl}).` };
    }
  }
  // Lấy effect text để hiển thị (nếu có trong SKILL_UNLOCK_EFFECTS)
  const effectText = _DW_getSkillEffectLabel(skillKey, newLvl);

  let s = {
    ...state,
    skillPoints: state.skillPoints - 1,
    skills: { ...(state.skills||{}), [skillKey]: newLvl },
  };

  // Khi fitness tăng → cập nhật maxHp ngay lập tức (hp_bonus thay đổi)
  if (skillKey === 'fitness' && typeof DW_calcMaxHp === 'function') {
    const newMaxHp = DW_calcMaxHp(s.job, s.skills);
    const hpGain   = newMaxHp - (state.maxHp || 15);
    s.maxHp = newMaxHp;
    // HP hiện tại tăng theo nếu đang full HP — nếu không thì chỉ tăng cap
    if (state.hp >= (state.maxHp || 15)) s.hp = newMaxHp;
    if (hpGain > 0) {
      s.log = [`❤️ Max HP tăng lên ${newMaxHp} (+${hpGain})`, ...(s.log||[])];
    }
  }

  // Kiểm tra cross-branch synergy unlock khi đầu tư đủ vào 2 nhánh
  s = _DW_checkSynergyUnlock(s);

  s.log = [
    `🔷 ${DW_SKILLS[skillKey].name} lên lv${newLvl}${effectText ? ` — ${effectText}` : ''}`,
    ...(s.log||[])
  ];

  return { state: s, ok: true, msg: `${DW_SKILLS[skillKey].name} → lv${newLvl}` };
}

// ── _DW_getSkillEffectLabel (internal) ───────────────
// Lấy mô tả ngắn của effect tại skill level cụ thể.
// Dùng SKILL_UNLOCK_EFFECTS từ deadworld-data.js (sẽ thêm ở bước 2).
function _DW_getSkillEffectLabel(skillKey, level) {
  if (typeof SKILL_UNLOCK_EFFECTS === 'undefined') return '';
  const effects = SKILL_UNLOCK_EFFECTS[skillKey];
  if (!effects) return '';
  return effects[level] || '';
}

// ── DW_getSkillEffect ─────────────────────────────────
// Lấy giá trị effect hiện tại của một skill.
// Tra cứu theo thứ tự ưu tiên:
//   1. DW_ROLE_TREES[state.job]  — role-specific skills (Driver, Farmer, ...)
//   2. SKILL_UNLOCK_EFFECTS      — base skills (blade, sneak, fitness, ...)
//
// Thêm role mới: chỉ cần tạo file role và đăng ký vào DW_ROLE_TREES.
// Engine này KHÔNG cần sửa.
//
// Trả về 0 nếu skill chưa đủ level hoặc effect không tồn tại.
function DW_getSkillEffect(state, skillKey, effectId) {
  const curLvl = (state.skills?.[skillKey] || 0);
  if (curLvl <= 0) return 0;

  // ── 1. Role-specific tree (DW_ROLE_TREES) ────────────
  // Đây là lookup chính cho mọi skill của các role có file riêng.
  if (typeof DW_ROLE_TREES !== 'undefined') {
    const jobTree = DW_ROLE_TREES[state.job];
    if (jobTree) {
      const skillDef = jobTree[skillKey];
      if (skillDef?.effects) {
        let result = 0;
        for (let lv = 1; lv <= curLvl; lv++) {
          const entry = skillDef.effects[lv];
          if (entry && typeof entry === 'object' && entry[effectId] !== undefined) {
            result = entry[effectId];
          }
        }
        // Trả về kể cả khi result = false (boolean effect)
        if (result !== 0) return result;
        // Nếu result = 0 nhưng key tồn tại ở level nào đó → vẫn trả về 0 đúng
        const keyExistsInTree = Object.values(skillDef.effects).some(
          e => e && typeof e === 'object' && effectId in e
        );
        if (keyExistsInTree) return 0;
      }
    }
  }

  // ── 2. Base skills (SKILL_UNLOCK_EFFECTS) ────────────
  // Dùng cho các skill không thuộc role tree: blade, sneak, fitness, mental...
  if (typeof SKILL_UNLOCK_EFFECTS !== 'undefined') {
    const table = SKILL_UNLOCK_EFFECTS[skillKey];
    if (table) {
      let result = 0;
      for (let lv = 1; lv <= curLvl; lv++) {
        const entry = table[lv];
        if (entry && typeof entry === 'object' && entry[effectId] !== undefined) {
          result = entry[effectId];
        }
      }
      return result;
    }
  }

  return 0;
}

// ── _DW_checkSynergyUnlock (internal) ────────────────
// Cross-branch synergy: khi player đầu tư vào 2 nhánh khác nhau đủ threshold,
// tự động unlock một synergy passive.
// SKILL_SYNERGIES được định nghĩa trong deadworld-data.js (bước 2).
// Mỗi synergy chỉ unlock 1 lần — track trong state.unlockedSynergies.
function _DW_checkSynergyUnlock(state) {
  if (typeof SKILL_SYNERGIES === 'undefined') return state;

  let s = { ...state };
  const unlocked = new Set(s.unlockedSynergies || []);

  for (const syn of SKILL_SYNERGIES) {
    if (unlocked.has(syn.id)) continue; // đã có rồi

    // Kiểm tra tất cả điều kiện của synergy này
    const met = syn.requires.every(req => (s.skills?.[req.skill] || 0) >= req.level);
    if (!met) continue;

    // Unlock synergy — chỉ áp dụng cho role đúng nếu synergy có jobFilter
    if (syn.jobFilter && syn.jobFilter !== s.job) continue;

    unlocked.add(syn.id);
    s = {
      ...s,
      unlockedSynergies: [...unlocked],
      log: [
        `✨ SYNERGY UNLOCK: ${syn.name} — ${syn.desc}`,
        ...(s.log||[])
      ],
    };
  }

  return s;
}

// ── MILESTONE / SIGNATURE SKILL TRACKING ─────────────
// Milestone events là những khoảnh khắc narrative unlock skill đặc biệt.
// state.milestones: { [milestoneId]: true } — ghi lại những gì đã xảy ra.
// state.signatureSkills: { [skillId]: true } — Signature Skills đã unlock.
// Hàm này được gọi từ engine-combat, engine-world, engine-inventory
// mỗi khi một điều kiện có thể trigger milestone.

function DW_checkMilestone(state, milestoneId) {
  // Đã có rồi thì không check lại
  if (state.milestones?.[milestoneId]) return state;

  if (typeof MILESTONE_DEFS === 'undefined') return state;
  const def = MILESTONE_DEFS[milestoneId];
  if (!def) return state;

  // Kiểm tra điều kiện
  const met = def.condition(state);
  if (!met) return state;

  // Kiểm tra role filter nếu có
  if (def.jobFilter && def.jobFilter !== state.job) return state;

  // Unlock milestone
  let s = {
    ...state,
    milestones: { ...(state.milestones||{}), [milestoneId]: true },
  };

  // Nếu milestone tặng Signature Skill
  if (def.grantSkill) {
    s = {
      ...s,
      signatureSkills: { ...(s.signatureSkills||{}), [def.grantSkill]: true },
      log: [
        `🏅 ${def.name}: ${def.desc}`,
        `✦ Signature Skill mở khóa: ${def.grantSkill}!`,
        ...(s.log||[])
      ],
    };
  } else {
    s.log = [`🏅 ${def.name}: ${def.desc}`, ...(s.log||[])];
  }

  // Nếu milestone tặng thêm Skill Point thưởng
  if (def.bonusSP) {
    s = { ...s, skillPoints: (s.skillPoints||0) + def.bonusSP };
    s.log = [`+${def.bonusSP} Skill Point thưởng từ milestone!`, ...(s.log||[])];
  }

  return s;
}

// ── DW_trackMilestoneCounter ──────────────────────────
// Helper để track bộ đếm tiến trình milestone dạng "làm X lần".
// Ví dụ: y tá cứu NPC lần thứ 5 → counter tăng → trigger check milestone.
// state.milestoneCounters: { [counterId]: number }
function DW_trackMilestoneCounter(state, counterId, increment = 1) {
  const current = (state.milestoneCounters?.[counterId] || 0) + increment;
  let s = {
    ...state,
    milestoneCounters: { ...(state.milestoneCounters||{}), [counterId]: current },
  };

  // Tự động check các milestone liên quan đến counter này
  if (typeof MILESTONE_DEFS !== 'undefined') {
    for (const [id, def] of Object.entries(MILESTONE_DEFS)) {
      if (def.trackedCounter === counterId) {
        s = DW_checkMilestone(s, id);
      }
    }
  }

  return s;
}

// ── DW_hasSignatureSkill ──────────────────────────────
function DW_hasSignatureSkill(state, skillId) {
  return !!(state.signatureSkills?.[skillId]);
}

// ── DW_hasSynergy ─────────────────────────────────────
// Kiểm tra synergy đã unlock chưa (dùng trong engine-world để check living_off_land)
function DW_hasSynergy(state, synergyId) {
  return (state.unlockedSynergies || []).includes(synergyId);
}

// ── _DW_tryFreeAction (internal) ─────────────────────
// Farmer: nguoi_nhieu_viec cho phép một số action mỗi ngày không tốn AP.
// Trả về { canUseFree: bool, s: state } — s không thay đổi nếu !canUseFree.
// Engine subsystems gọi trước khi tính AP cost của action.
//
// Design intent: free action không bypass material cost hay gameplay risk —
// chỉ bypass AP cost. Anti-abuse: daily cap cứng, không tăng quá 4/ngày.
function _DW_tryFreeAction(state, actionType) {
  if (state.job !== 'farmer') return { canUseFree: false, s: state };

  const maxFree = DW_getSkillEffect(state, 'nguoi_nhieu_viec', 'free_actions_per_day');
  if (!maxFree || maxFree <= 0) return { canUseFree: false, s: state };

  const usedToday    = state.freeActionsUsed || 0;
  if (usedToday >= maxFree) return { canUseFree: false, s: state };

  // Kiểm tra loại action có trong whitelist không
  const allowedTypes = DW_getSkillEffect(state, 'nguoi_nhieu_viec', 'free_action_types');
  const allowed = Array.isArray(allowedTypes) ? allowedTypes : ['loot','cleanup'];
  if (!allowed.includes(actionType)) return { canUseFree: false, s: state };

  return { canUseFree: true, s: state };
}

// ── _DW_processNoIdle (internal) ──────────────────────
// Farmer: no_idle (nguoi_nhieu_viec lv10) — auto-action khi offline trong base an toàn.
// Gọi từ DW_tick với nowMs — kiểm tra xem đã qua 1h game time chưa.
// Trả về state với action đã được execute (barricade, repair, cleanup).
// Cap: no_idle_daily_cap (4/ngày), requires barricade >= 2.
function _DW_processNoIdle(state, nowMs) {
  if (state.job !== 'farmer') return state;
  if (!DW_getSkillEffect(state, 'nguoi_nhieu_viec', 'no_idle')) return state;

  const dailyCap     = DW_getSkillEffect(state, 'nguoi_nhieu_viec', 'no_idle_daily_cap') || 4;
  const requireSafe  = DW_getSkillEffect(state, 'nguoi_nhieu_viec', 'no_idle_requires_safe');
  const usedToday    = state.noIdleCount || 0;

  if (usedToday >= dailyCap) return state;

  // Kiểm tra an toàn
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles?.[tileKey];
  if (requireSafe && (tile?.barricade || 0) < 2) return state;

  // Kiểm tra đã qua 1h game kể từ last no-idle action
  const lastNoIdle = state.lastNoIdleMs || 0;
  const ONE_HOUR_REAL = 60 * 60 * 1000; // 1h real time ~ "đứng yên" — intentionally generous
  if (nowMs - lastNoIdle < ONE_HOUR_REAL) return state;

  // Chọn action ưu tiên: repair > barricade > cleanup
  let s = { ...state, noIdleCount: usedToday + 1, lastNoIdleMs: nowMs };

  // Ưu tiên repair nếu có đồ cần sửa và vật liệu
  const needsRepair = Object.entries(s.equip || {}).some(([slot, id]) => {
    if (!id) return false;
    const def = EQUIP_DEFS?.[id];
    return def && (s.equipDur?.[slot] || 0) < def.durMax * 0.5;
  });
  if (needsRepair) {
    s.log = [`[No Idle] Tự động sửa đồ trong lúc nghỉ ngơi. (${usedToday+1}/${dailyCap})`, ...(s.log||[])];
    return s; // UI xử lý thực sự DW_repair — engine chỉ signal
  }

  s.log = [`[No Idle] Dọn dẹp tự động. (${usedToday+1}/${dailyCap})`, ...(s.log||[])];
  return s;
}

// ── BACKWARD COMPATIBILITY: DW_grantXp ───────────────
// Giữ lại hàm cũ để không break các call sites hiện tại trong
// engine-survival.js, engine-combat.js, engine-inventory.js.
// v2: hàm này KHÔNG còn tự tăng skill level nữa — chỉ cấp character XP.
// Sau khi tất cả call sites được migrate sang DW_grantCharacterXp(),
// hàm này sẽ bị xóa ở v3.
// actionType mapping: skillKey → CHAR_XP_TABLE key tương ứng
const _SKILL_TO_ACTION = {
  carpentry: 'barricade',
  blade:     'kill_zombie',
  blunt:     'kill_zombie',
  firearm:   'kill_zombie',
  firstaid:  'heal_npc',
  sneak:     'scavenge',
  fitness:   'day_survived',
  mental:    'day_survived',
};

function DW_grantXp(state, skillKey, amount) {
  // Map sang character XP action type — nếu không có thì dùng amount trực tiếp
  const actionType = _SKILL_TO_ACTION[skillKey] || 'scavenge';
  // Cấp character XP với amount gốc (không qua table để giữ balance cũ tạm thời)
  return DW_grantCharacterXp(state, actionType, Math.ceil(amount * 0.8));
}

// ── STATUS EFFECTS ────────────────────────────────────
function DW_tickStatuses(state) {
  let s = { ...state };
  for (const status of (s.statuses || [])) {
    if (status === 'bleed')  s.hp = Math.max(0, s.hp - 0.3);
    if (status === 'poison') s.hp = Math.max(0, s.hp - 1);
    if (status === 'burn')   s.hp = Math.max(0, s.hp - 2);
  }
  if (s.hp <= 0) s.gameOver = true;
  return s;
}

function DW_addStatus(state, status) {
  if ((state.statuses||[]).includes(status)) return state;
  if (status === 'poison' && state.equip?.head === 'gas_mask') return state;
  return { ...state, statuses: [...(state.statuses||[]), status] };
}

function DW_removeStatus(state, status) {
  return { ...state, statuses: (state.statuses||[]).filter(s => s !== status) };
}

// ── PANIC ─────────────────────────────────────────────
function DW_updatePanic(state) {
  const panic = state.stress >= 80;
  if (panic && !state.panicMode)
    return { ...state, panicMode: true,
      log: ['😱 PANIC! Stress quá cao!', ...(state.log||[])] };
  if (!panic && state.panicMode)
    return { ...state, panicMode: false };
  return state;
}

// ── PSYCHOLOGICAL EVENT ROLL ──────────────────────────
// Giữ nguyên logic cũ — chỉ thêm mental skill check qua DW_getSkillEffect.
function DW_rollPsychEvent(state) {
  const stress  = state.stress     || 0;
  const dep     = state.depression || 0;
  const day     = state.day        || 1;

  // Mental skill giảm xác suất psych event (mỗi level giảm 4%)
  const mentalLvl      = state.skills?.mental || 0;
  const mentalReduction = mentalLvl * 0.04;

  const threshold = 40; // stress/dep tổng phải > 40 để có event
  if (stress + dep < threshold) return { state, psychEventId: null };

  // Cooldown: tối thiểu 1 ngày giữa 2 sự kiện
  if ((state.lastPsychDay || 0) >= day) return { state, psychEventId: null };

  const baseChance = 0.25 - mentalReduction;
  if (Math.random() > baseChance) return { state, psychEventId: null };

  // Chọn event dựa trên severity
  let pool = [];
  if (typeof DW_PSYCH_EVENTS !== 'undefined') {
    pool = DW_PSYCH_EVENTS.filter(e =>
      (e.minStress || 0) <= stress && (e.minDep || 0) <= dep
    );
  }
  if (pool.length === 0) return { state, psychEventId: null };

  const eventId = pool[Math.floor(Math.random() * pool.length)].id;
  const s = { ...state, lastPsychDay: day, psychEvent: eventId };
  return { state: s, psychEventId: eventId };
}

// ── DW_getProgressSummary ─────────────────────────────
// Pure query cho UI — snapshot toàn bộ progression hiện tại.
// Không thay đổi state. UI dùng để render character sheet.
function DW_getProgressSummary(state) {
  const curLvl   = state.charLevel || 1;
  const curXp    = state.charXp    || 0;
  const nextXp   = DW_xpForLevel(curLvl + 1);
  const prevXp   = DW_xpForLevel(curLvl);
  const progress = curLvl >= CHAR_LEVEL_CAP
    ? 1
    : (curXp - prevXp) / (nextXp - prevXp);

  return {
    charLevel:        curLvl,
    charXp:           curXp,
    xpToNext:         Math.max(0, nextXp - curXp),
    xpProgress:       Math.min(1, Math.max(0, progress)), // 0–1 để render progress bar
    skillPoints:      state.skillPoints || 0,
    skills:           state.skills || {},
    signatureSkills:  state.signatureSkills || {},
    unlockedSynergies:state.unlockedSynergies || [],
    milestones:       state.milestones || {},
    levelCap:         CHAR_LEVEL_CAP,
    skillCap:         SKILL_LEVEL_CAP,
  };
}
