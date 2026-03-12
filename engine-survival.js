// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-survival.js  v3
// Barricade, Sleep/rest, + BASE SYSTEM mechanics
// Dependencies: deadworld-data.js, engine-skills.js
// ══════════════════════════════════════════════════════

// ── BARRICADE ─────────────────────────────────────────
// v1: findIndex(i => /cành|gậy|gạch|biển|lưới|búa|xà|thanh|ống/i.test(i))
// v2: DW_invFindTag(inventory, 'barricade_mat')
function DW_barricade(state) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];
  if (!tile) return { state, msg: 'Không có tile.', ok: false };

  const matIdx = DW_invFindTag(state.inventory, 'barricade_mat');
  if (matIdx === -1)
    return { state, msg: 'Cần vật liệu barricade (gạch, dây, gậy, lưới…)', ok: false };

  // AP cost cơ bản = 2; giảm theo skill
  let apCost = 2;
  // Farmer: basic_craft_ap_reduce (tay_quen_viec lv3)
  if (state.job === 'farmer') {
    const craftReduce = DW_getSkillEffect(state, 'tay_quen_viec', 'basic_craft_ap_reduce');
    if (craftReduce > 0) apCost = Math.max(1, apCost - craftReduce);
  }
  // Mechanic: barricade_chuyen_nghiep → barricade_ap_reduce (tối đa -2 AP)
  if (state.job === 'mechanic') {
    const mReduce = DW_getSkillEffect(state, 'barricade_chuyen_nghiep', 'barricade_ap_reduce');
    apCost = Math.max(1, apCost - (mReduce || 1));
  }

  // ── Farmer: free_action check (nguoi_nhieu_viec) ────
  const { canUseFree, s: sAfterFree } = _DW_tryFreeAction(state, 'barricade');
  if (canUseFree) {
    const matId  = sAfterFree.inventory[matIdx];
    const newInv = sAfterFree.inventory.filter((_,i) => i !== matIdx);
    const newLvl = Math.min(5, (tile.barricade||0) + 1);
    let sf = {
      ...sAfterFree,
      inventory: newInv,
      tiles: { ...sAfterFree.tiles, [tileKey]: { ...tile, barricade: newLvl } },
    };
    sf = DW_grantXp(sf, 'carpentry', 3);
    sf.log = [`[Free] Barricade [${DW_itemName(matId)}]: Level ${newLvl}/5.`, ...(sf.log||[])];
    return { state: sf, msg: `Barricade Level ${newLvl}/5 (miễn phí).`, ok: true };
  }

  if (state.ap < apCost) return { state, msg: `Cần ${apCost} ĐHĐ.`, ok: false };

  const matId  = state.inventory[matIdx];

  // ── Mechanic: barricade_mat_save (barricade_chuyen_nghiep lv3+) ──
  const bMatSave = state.job === 'mechanic'
    ? (DW_getSkillEffect(state, 'barricade_chuyen_nghiep', 'barricade_mat_save') || 0)
    : 0;
  const matConsumed = !(bMatSave > 0 && Math.random() < bMatSave);
  const newInv = matConsumed
    ? state.inventory.filter((_,i) => i !== matIdx)
    : [...state.inventory];

  const newLvl = Math.min(5, (tile.barricade||0) + 1);

  // ── Mechanic: barricade_hp_bonus + reinforced_barricade ──
  const bHpBonus = state.job === 'mechanic'
    ? (DW_getSkillEffect(state, 'barricade_chuyen_nghiep', 'barricade_hp_bonus') || 0)
    : 0;
  const bReinforced = state.job === 'mechanic' &&
    DW_getSkillEffect(state, 'barricade_chuyen_nghiep', 'reinforced_barricade');
  const barricadeStrength = bReinforced ? Math.min(7, newLvl + 2) : newLvl;

  let s = {
    ...state,
    inventory: newInv,
    ap: state.ap - apCost,
    tiles: {
      ...state.tiles,
      [tileKey]: {
        ...tile,
        barricade: newLvl,
        ...(bHpBonus > 0 ? { barricadeHpBonus: bHpBonus } : {}),
        ...(bReinforced   ? { barricadeStrength } : {}),
      },
    },
  };
  s = DW_grantXp(s, 'carpentry', 3);

  const matNote      = matConsumed ? '' : ` (Tiết kiệm: ${DW_itemName(matId)})`;
  const reinforceNote = bReinforced ? ` [Reinforced lv${barricadeStrength}]` : '';
  return { state: s, msg: `Barricade [${DW_itemName(matId)}]: Level ${newLvl}/5${reinforceNote}.${matNote}`, ok: true };
}

// ── REST (nghỉ ngắn, không cần ngủ) ──────────────────
// Anti-grind: giới hạn 2 lần/ngày. Farmer skills mở rộng giới hạn này
// mà không phá vỡ tension — vì bonus chỉ có giá trị khi AP thấp/zero.
function DW_rest(state) {
  const REST_MAX_PER_DAY = 2;
  const restCount = state.restCount || 0;

  // Farmer: power_nap (buoc_chan_thu_hai lv10) — nghỉ ngắn kích hoạt morning bonus 3h
  // Không tăng REST_MAX — chỉ thêm effect khi nghỉ
  const hasPowerNap = state.job === 'farmer' &&
    DW_getSkillEffect(state, 'buoc_chan_thu_hai', 'power_nap');

  if (restCount >= REST_MAX_PER_DAY)
    return {
      state,
      msg: `Đã nghỉ ${REST_MAX_PER_DAY} lần hôm nay. Cần ngủ thật sự để phục hồi.`,
      ok: false,
    };

  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];

  const hasEnemy = (tile?.objects||[]).some(
    o => OBJECT_DEFS[o.type]?.type === 'enemy' && o.alive !== false
  );
  if (hasEnemy)
    return { state, msg: 'Không thể nghỉ — có kẻ thù trong khu vực!', ok: false };

  const maxAp = DW_apMax(state);
  let recover = Math.max(1, Math.floor(maxAp * 0.20));

  // ── Farmer: exhaustion_heal (nhip_tho_deu lv5) ────────
  // Nghỉ ngắn hiệu quả gấp đôi khi AP < 3
  if (state.job === 'farmer' &&
      DW_getSkillEffect(state, 'nhip_tho_deu', 'exhaustion_heal') &&
      state.ap < 3) {
    recover = recover * 2;
  }

  // ── Farmer: second_wind (nhip_tho_deu lv7) ────────────
  // 1 lần/ngày: khi AP = 0, hồi ngay ap_zero_heal AP
  const apZeroHeal = state.job === 'farmer'
    ? DW_getSkillEffect(state, 'nhip_tho_deu', 'ap_zero_heal')
    : 0;
  const secondWindUsed = state.secondWindUsed || false;
  let secondWindActivated = false;
  if (apZeroHeal > 0 && state.ap === 0 && !secondWindUsed) {
    recover = Math.max(recover, apZeroHeal);
    secondWindActivated = true;
  }

  const newHour = (state.hour + 0.5) % 24;
  let s = {
    ...state,
    ap:             Math.min(maxAp, state.ap + recover),
    hour:           newHour,
    restCount:      restCount + 1,
    secondWindUsed: secondWindActivated ? true : secondWindUsed,
  };

  if (newHour < state.hour) {
    s = DW_advanceDay(s);
    s.restCount = 0;
  }

  s = DW_needsDecay(s, 0.5);

  // ── Farmer: power_nap → kích hoạt morning bonus 3h ───
  if (hasPowerNap && !s.morningBonusUntilHour) {
    s.morningBonusUntilHour = (s.hour + 3) % 24;
    s.log = ['☀️ Power Nap: morning bonus 3h kích hoạt.', ...(s.log||[])];
  }

  const remaining = REST_MAX_PER_DAY - (s.restCount || 0);
  const extras = [
    secondWindActivated ? ` ⚡ Second Wind: +${apZeroHeal} AP!` : '',
    hasPowerNap ? ' ☀️ Morning bonus 3h.' : '',
  ].filter(Boolean).join('');

  s.log = [
    `😮‍💨 Nghỉ ngắn — hồi ${recover} ĐHĐ.${extras} (còn ${remaining} lần hôm nay)`,
    ...(s.log||[]),
  ];
  return { state: s, msg: `Nghỉ ngắn: +${recover} ĐHĐ.`, ok: true };
}

// ── SLEEP ─────────────────────────────────────────────
// v2: Sleep phản ánh multi-factor AP max. Phục hồi đầy đủ
// nhưng chất lượng ngủ (HP recovery, stress recovery) phụ thuộc
// vào hunger, thirst, và barricade level hiện tại.
//
// v3 (base): nếu đang ngủ trong base (tile.base === true),
// barricade risk giảm 50% và bonus HP/stress recovery theo base level.
function DW_sleep(state) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];

  const inBase  = !!(tile?.base && state.base?.tileKey === tileKey);
  const baseLvl = inBase ? (state.base?.level || 1) : 0;
  const bLvl    = inBase
    ? Math.max(baseLvl, tile?.barricade || 0)
    : (tile?.barricade || 0);

  // ── Farmer: sleep_without_barricade (ngu_rung) ────
  const NATURE_TILE_TYPES = new Set(['forest','field','plain','hill','beach']);
  const isNatureTile = NATURE_TILE_TYPES.has(tile?.type);
  const sleepWithoutBarricade = state.job === 'farmer' &&
    DW_getSkillEffect(state, 'ngu_rung', 'sleep_without_barricade') &&
    isNatureTile;

  if (bLvl < 1 && !sleepWithoutBarricade)
    return { state, msg: 'Quá nguy hiểm. Cần barricade ≥ 1 hoặc có base để ngủ.', ok: false };

  const hunger = state.hunger ?? 5;
  const thirst = state.thirst ?? 5;
  const msgs   = [];

  // ── HP recovery ───────────────────────────────────
  let hpRecover = 0;
  if (hunger >= 3 && thirst >= 3)      { hpRecover = 3; msgs.push('HP +3'); }
  else if (hunger >= 1 || thirst >= 1) { hpRecover = 1; msgs.push('HP +1 (đói/khát)'); }
  else                                 { msgs.push('Quá đói/khát — không hồi HP!'); }

  if (inBase && baseLvl >= 3) { hpRecover += 1; msgs.push(`Base bếp +1 HP`); }

  // ── Farmer: nature sleep HP bonus (ngu_rung lv5) ──
  if (sleepWithoutBarricade) {
    const natureBonusHp = DW_getSkillEffect(state, 'ngu_rung', 'nature_sleep_bonus_hp');
    if (natureBonusHp > 0) { hpRecover += natureBonusHp; msgs.push(`Ngủ rừng +${natureBonusHp} HP`); }
  }

  // ── Stress recovery ───────────────────────────────
  let stressRecover = 15;
  const dep = state.depression ?? 0;
  if (dep >= 75)      { stressRecover = 3;  msgs.push('Stress -3 (trầm cảm nặng)'); }
  else if (dep >= 50) { stressRecover = 8;  msgs.push('Stress -8 (trầm cảm)'); }
  else if (dep >= 25) { stressRecover = 12; msgs.push('Stress -12'); }
  else                { msgs.push('Stress -15'); }

  if (inBase) { stressRecover += baseLvl * 2; msgs.push(`Base +${baseLvl*2} stress`); }

  // ── Farmer: nature sleep stress bonus (ngu_rung lv7) ──
  if (sleepWithoutBarricade) {
    const natureBonusStress = DW_getSkillEffect(state, 'ngu_rung', 'nature_sleep_stress');
    if (natureBonusStress > 0) {
      stressRecover += natureBonusStress;
      msgs.push(`Tĩnh lặng rừng -${natureBonusStress} stress thêm`);
    }
  }

  // ── Nurse: lang_nghe_thau_cam — stress_decay_bonus khi ngủ ──
  if (state.job === 'nurse') {
    const decayBonus = DW_getSkillEffect(state, 'lang_nghe_thau_cam', 'stress_decay_bonus') || 0;
    if (decayBonus > 0) {
      const bonus = Math.ceil(stressRecover * decayBonus);
      stressRecover += bonus;
      msgs.push(`Tĩnh tâm +${bonus} stress`);
    }
    // peace_aura (lv10): stress không vượt 70
    if (DW_getSkillEffect(state, 'lang_nghe_thau_cam', 'peace_aura')) {
      // Cap sẽ được apply sau khi tính toán xong
    }
  }

  // ── Barricade risk roll ────────────────────────────
  const riskTable  = [0, 0.30, 0.15, 0.07, 0.02, 0];
  const baseRisk   = riskTable[Math.min(bLvl, 5)] || 0;
  const finalRisk  = inBase ? baseRisk * 0.5 : baseRisk;

  // Farmer: nature_sleep_risk_reduce (ngu_rung lv2+) giảm risk khi ngủ rừng
  let effectiveRisk = finalRisk;
  if (sleepWithoutBarricade) {
    const riskReduce = DW_getSkillEffect(state, 'ngu_rung', 'nature_sleep_risk_reduce');
    // Ngủ rừng base risk = 20% (nguy hiểm hơn barricade lv1 một chút)
    const natureBaseRisk = 0.20;
    effectiveRisk = natureBaseRisk * (1 - (riskReduce || 0));
  }

  let interrupted = false;
  if (Math.random() < effectiveRisk) {
    interrupted = true;
    const dmg = (bLvl === 1 || sleepWithoutBarricade) ? 3 : 1;
    hpRecover  = Math.max(0, hpRecover - dmg);
    stressRecover = Math.max(0, stressRecover - 10);
    msgs.push(`⚠️ ${sleepWithoutBarricade ? 'Bị quấy rầy khi ngủ rừng' : 'Zombie đột nhập khi ngủ'}! Mất ${dmg} HP.`);
  }

  const newMaxAp = DW_apMax(state);
  let s = {
    ...state,
    ap:          newMaxAp,
    hp:          Math.min(state.maxHp, state.hp + hpRecover),
    stress:      Math.max(0, state.stress - stressRecover),
    hour:        6,
    lastRegenMs: Date.now(),
    restCount:   0,
    baseTokens:  inBase ? BASE_DAILY_TOKENS : (state.baseTokens || 0),
  };

  // ── Nurse: peace_aura (lang_nghe_thau_cam lv10) — stress cap 70 ──
  if (state.job === 'nurse' && DW_getSkillEffect(state, 'lang_nghe_thau_cam', 'peace_aura')) {
    if (s.stress > 70) s.stress = 70;
  }

  // ── Nurse: depression_decay (khang_chien_tram_cam) — giảm thêm depression khi ngủ ──
  if (state.job === 'nurse') {
    const depDecay = DW_getSkillEffect(state, 'khang_chien_tram_cam', 'depression_decay') || 0;
    if (depDecay > 0 && (s.depression || 0) > 0) {
      const depReduce = Math.ceil((s.depression || 0) * depDecay);
      s.depression = Math.max(0, (s.depression || 0) - depReduce);
      msgs.push(`Tâm lý bình ổn: Depression -${depReduce}`);
    }
    // mental_fortress (lv10): depression cap 50
    if (DW_getSkillEffect(state, 'khang_chien_tram_cam', 'mental_fortress')) {
      if ((s.depression || 0) > 50) s.depression = 50;
    }
    // Reset daily nurse trackers
    s = {
      ...s,
      emergencyHealUsed:  false,
      panicCureUsed:      false,
      mobilClinicUsed:    false,
      secondChanceUsed:   false,
      miracleHandsUsed:   false,
      autoRescueUsed:     false,
      traumaHealUsedToday: false,
    };
  }

  // ── Police: daily tracker reset ─────────────────────
  if (state.job === 'police') {
    s = {
      ...s,
      copNeverDiesUsed:  false,
      lastStandShotUsed: false,
      lastMagUsed:       false,
      adrenalineSurgeUsed: false,
    };
    // Police: danh_tieng_canh_sat — rep_stress_aura: hồi stress mỗi sáng
    const auraStress = DW_getSkillEffect(state, 'danh_tieng_canh_sat', 'rep_stress_aura') || 0;
    if (auraStress > 0) {
      s.stress = Math.max(0, (s.stress || 0) - auraStress);
      msgs.push(`🌅 Tinh thần lãnh đạo: -${auraStress} stress`);
    }
    // Police: nen_tang_tinh_than — panic_resistance: tăng ngưỡng hoảng loạn
    // (được đọc bởi DW_updatePanic — không cần thêm gì ở đây)
  }

  // ── Farmer: morning bonus (buoc_chan_thu_hai) ──────
  // Set flag để DW_apRegen dùng bonus multiplier trong ngày mới
  const morningBonusHours = DW_getSkillEffect(state, 'buoc_chan_thu_hai', 'morning_bonus_duration_h');
  if (morningBonusHours > 0) {
    s.morningBonusUntilHour = (6 + morningBonusHours) % 24;
    msgs.push(`☀️ Morning Bonus: AP regen x${1 + DW_getSkillEffect(state,'buoc_chan_thu_hai','morning_ap_regen_bonus').toFixed(1)} trong ${morningBonusHours}h`);
  }
  // Iron Stamina signature: luôn có morning bonus x2 / 12h
  if (DW_hasSignatureSkill(state, 'iron_stamina') &&
      DW_getSkillEffect(state, 'iron_stamina', 'ap_regen_double_post_sleep')) {
    s.morningBonusUntilHour = (6 + 12) % 24;
    if (!morningBonusHours) msgs.push('🔩 Iron Stamina: AP regen x2 trong 12h đầu.');
  }

  s = DW_advanceDay(s);

  // ── Mechanic: nightly_repair (bao_tri_dinh_ky) ────────
  // Sau advanceDay để tránh conflict với equip decay
  if (state.job === 'mechanic') {
    const nightlyAmt = DW_getSkillEffect(state, 'bao_tri_dinh_ky', 'nightly_repair');
    const nightlyFree = DW_getSkillEffect(state, 'bao_tri_dinh_ky', 'nightly_repair_free');
    const eternalMaint = DW_getSkillEffect(state, 'bao_tri_dinh_ky', 'eternal_maintenance');
    const durabilityFloor = DW_getSkillEffect(state, 'vinh_cuu', 'durability_floor');
    if (nightlyAmt > 0) {
      const newDur2 = { ...(s.equipDur || {}) };
      let repaired = 0;
      for (const [slot, id] of Object.entries(s.equip || {})) {
        if (id && newDur2[slot] != null) {
          const def = ITEM_DB[id];
          const maxDur = def?.durability || 30;
          // Heirloom: không bao giờ về 0
          const isHeirloomSlot = s.heirloom?.slot === slot && s.heirloom?.id === id;
          const floor = isHeirloomSlot ? 1 : (eternalMaint ? 10 : (durabilityFloor || 0));
          const newVal = Math.min(maxDur, Math.max(floor, newDur2[slot] + nightlyAmt));
          if (newVal !== newDur2[slot]) { newDur2[slot] = newVal; repaired++; }
        }
      }
      if (repaired > 0) {
        s.equipDur = newDur2;
        const matNote = nightlyFree ? '' : ' (tốn 1 nguyên liệu)';
        msgs.push(`🔧 Bảo trì đêm: trang bị hồi +${nightlyAmt} độ bền${matNote}.`);
      }
    }
  }

  // Đói/khát khi ngủ → groggy
  // Farmer: suc_ben_vo_tan lv3 "không bị Groggy khi đói" nếu có skill đủ level
  const groggyImmune = state.job === 'farmer' &&
    DW_getSkillEffect(state, 'suc_ben_vo_tan', 'hunger_thirst_ap_penalty_reduce') >= 0.35;
  if ((hunger < 2 || thirst < 2) && !groggyImmune) {
    s = DW_addStatus(s, 'groggy');
    msgs.push('Thức dậy lơ mơ vì đói/khát (Groggy).');
  }

  if (inBase) s = _DW_baseTickThreat(s);

  const summary = msgs.join(' | ');
  return {
    state: s,
    msg:   `💤 Ngủ đến sáng. ${summary} Ngày ${s.day}.`,
    ok:    true,
    interrupted,
    inBase,
  };
}

// ══════════════════════════════════════════════════════
// BASE SYSTEM — Core Mechanics
// Single Mobile Base: player chỉ có 1 base tại 1 thời điểm.
// Contract: (state, ...args) → { ok, state, msg, ...extras }
// Không mutate state input — luôn shallow clone.
// ══════════════════════════════════════════════════════

// ── HELPER: tile có sạch zombie không? ───────────────
// Điều kiện tiên quyết trước khi xây hoặc nâng cấp base.
function _DW_tileIsClear(tile) {
  if (!tile) return false;
  return !(tile.objects || []).some(
    o => OBJECT_DEFS[o.type]?.type === 'enemy' && o.alive !== false
  );
}

// ── HELPER: tính salvage rate thực tế ────────────────
// salvageRate cơ bản lấy từ BASE_UPGRADE_DEFS[level].
// Xe kéo (hasCart) cộng thêm 20% — đây là reward để craft cart.
// forceFlee: bỏ chạy khẩn cấp → cắt xuống còn 20–30%.
function _DW_salvageRate(state, forceFlee = false) {
  const lvl  = state.base?.level || 1;
  const def  = BASE_UPGRADE_DEFS[Math.min(lvl, 5)];
  let rate   = def?.salvageRate ?? 0.5;
  if (state.hasCart)  rate = Math.min(0.9, rate + 0.20);
  if (forceFlee)      rate = state.hasCart ? 0.30 : 0.20;
  return rate;
}

// ── DW_buildBase ──────────────────────────────────────
// Xây base mới tại tile hiện tại (bắt đầu L1).
// Nếu đã có base cũ ở nơi khác → phải dùng DW_moveBase trước.
// Thiết kế này ngăn exploit "giữ 2 base cùng lúc".
function DW_buildBase(state) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];

  if (tile?.base && state.base?.tileKey === tileKey)
    return { state, msg: 'Tile này đã là base của bạn rồi.', ok: false };

  // Đã có base ở chỗ khác — yêu cầu move trước
  if (state.base?.tileKey && state.base.tileKey !== tileKey)
    return {
      state,
      msg: `Bạn đang có base tại ${state.base.tileKey}. Dùng "Chuyển Base" để di chuyển trước.`,
      ok: false,
    };

  if (!_DW_tileIsClear(tile))
    return { state, msg: 'Cần tiêu diệt hết zombie trong khu vực trước khi xây base.', ok: false };

  // Kiểm tra và tiêu vật liệu L1
  const costList = BASE_UPGRADE_DEFS[1].cost;
  let inv = [...state.inventory];
  for (const matId of costList) {
    const idx = inv.indexOf(matId);
    if (idx === -1)
      return { state, msg: `Thiếu: ${DW_itemName(matId)} để xây base.`, ok: false };
    inv.splice(idx, 1);
  }

  const newBase = {
    level:              1,
    tileKey,
    builtDay:           state.day,
    threatAccum:        0,             // threat tích lũy mỗi ngày dựa trên level
    tokens:             BASE_DAILY_TOKENS,
    storage:            [],            // kho đồ riêng, hard-capped theo BASE_STORAGE_CAP
    blueprints:         [],            // giữ khi chuyển base
    soundproofUntilDay: 0,             // cách âm hết hạn ngày nào
    scheduledEvent:     null,          // event đã báo trước (từ scout)
  };

  let s = {
    ...state,
    inventory:  inv,
    base:       newBase,
    baseTokens: BASE_DAILY_TOKENS,
    tiles: {
      ...state.tiles,
      [tileKey]: { ...tile, base: true },
    },
    log: [
      `🏕️ Xây base tạm tại đây. Bạt nhựa che mưa, gạch chặn cửa. Ngày ${state.day}.`,
      ...(state.log||[]),
    ],
  };
  s = DW_grantXp(s, 'carpentry', 10);

  return {
    state:     s,
    msg:       'Base L1 xây xong. Giờ có thể ngủ an toàn hơn.',
    ok:        true,
    baseLevel: 1,
  };
}

// ── DW_upgradeBase ────────────────────────────────────
// Nâng cấp base lên level tiếp theo.
// Tốn 2 base token + vật liệu theo BASE_UPGRADE_DEFS[nextLevel].cost.
// Không tốn AP — đây là lý do token quan trọng: giới hạn "capacity hoạt động/ngày".
//
// Sau mỗi upgrade: noise và threatPerDay tăng lên — đây là core trade-off
// "base mạnh hơn → thế giới chú ý hơn".
function DW_upgradeBase(state) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];

  if (!tile?.base || state.base?.tileKey !== tileKey)
    return { state, msg: 'Bạn không đang ở trong base.', ok: false };

  const curLvl  = state.base?.level || 1;
  const nextLvl = curLvl + 1;
  if (nextLvl > 5)
    return { state, msg: 'Base đã ở cấp tối đa (L5 — Pháo đài tạm).', ok: false };

  if (!_DW_tileIsClear(tile))
    return { state, msg: 'Cần tiêu diệt hết zombie trước khi nâng cấp.', ok: false };

  const UPGRADE_TOKEN_COST = 2;
  const tokens = state.baseTokens ?? 0;
  if (tokens < UPGRADE_TOKEN_COST)
    return {
      state,
      msg: `Cần ${UPGRADE_TOKEN_COST} hoạt động điểm để nâng cấp. Còn ${tokens}. Ngủ để hồi phục.`,
      ok: false,
    };

  const costList = BASE_UPGRADE_DEFS[nextLvl].cost;
  let inv = [...state.inventory];
  for (const matId of costList) {
    const idx = inv.indexOf(matId);
    if (idx === -1)
      return { state, msg: `Thiếu: ${DW_itemName(matId)} để nâng lên L${nextLvl}.`, ok: false };
    inv.splice(idx, 1);
  }

  const upgDef = BASE_UPGRADE_DEFS[nextLvl];
  // Lưu blueprint — khi chuyển base player giữ lại "kiến thức" này
  const blueprints = [...(state.base?.blueprints||[]), `base_l${nextLvl}`];

  // Tiếng ồn khi xây dựng: dùng noiseUpgrade riêng (mạnh hơn noisePerAction)
  // Sau upgrade, giờ game tăng thêm upgradeTimeH (mặc định 2h)
  const upgradeNoise = upgDef.noiseUpgrade ?? upgDef.noisePerAction * 2;
  const upgradeTimeH = upgDef.upgradeTimeH ?? 2;
  const newHour = (state.hour + upgradeTimeH) % 24;

  let s = {
    ...state,
    inventory:  inv,
    base:       { ...state.base, level: nextLvl, blueprints },
    baseTokens: tokens - UPGRADE_TOKEN_COST,
    noise:      Math.min(10, (state.noise||0) + upgradeNoise),
    hour:       newHour,
    log: [
      `${upgDef.icon} Base nâng lên L${nextLvl}: ${upgDef.name}. ${upgDef.desc}`,
      ...(state.log||[]),
    ],
  };
  // Qua nửa đêm khi xây → advance ngày
  if (newHour < state.hour) s = DW_advanceDay(s);
  s = DW_grantXp(s, 'carpentry', nextLvl * 5);

  return {
    state:      s,
    msg:        `Base L${nextLvl}: ${upgDef.name}.`,
    ok:         true,
    baseLevel:  nextLvl,
    newActions: upgDef.actions,
  };
}

// ── DW_baseCraft ──────────────────────────────────────
// Craft từ BASE_CRAFT_RECIPES — chỉ hoạt động khi đứng trong base.
// Không tốn AP, chỉ tốn baseToken — giải quyết AP economy issue.
// Noise vẫn được tạo ra: base level cao → craft ồn hơn.
// Soundproofing (canvas_cloth) giảm noise đi 1 khi đang hiệu lực.
function DW_baseCraft(state, recipeId) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];

  if (!tile?.base || state.base?.tileKey !== tileKey)
    return { state, msg: 'Chỉ có thể dùng base recipe khi đứng trong base.', ok: false };

  const recipe = BASE_CRAFT_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return { state, msg: `Không tìm thấy công thức: ${recipeId}`, ok: false };

  const curLvl = state.base?.level || 1;
  if (curLvl < recipe.baseLevel)
    return { state, msg: `Cần base L${recipe.baseLevel}. (Hiện tại L${curLvl})`, ok: false };

  for (const [sk, lv] of Object.entries(recipe.skillReq || {})) {
    if ((state.skills?.[sk] || 0) < lv)
      return { state, msg: `Cần ${DW_SKILLS[sk]?.name||sk} cấp ${lv}.`, ok: false };
  }

  // Guard: unique recipe (xe kéo — chỉ 1 lần)
  if (recipe.unique && state.hasCart)
    return { state, msg: 'Bạn đã có xe kéo rồi.', ok: false };

  // Guard: camouflage net stacking (Điểm 3 fix)
  // maxActive:1 — engine kiểm tra activeNets trước khi cho craft thêm
  if (recipe.isCamouflage) {
    const activeNets = state.base?.activeNets || 0;
    if (activeNets >= (recipe.maxActive || 1))
      return {
        state,
        msg: 'Lưới ngụy trang đã active. Đặt thêm không có tác dụng — extra nets chỉ là cosmetic.',
        ok: false,
      };
  }

  const tokens = state.baseTokens ?? 0;
  if (tokens < recipe.baseToken)
    return {
      state,
      msg: `Cần ${recipe.baseToken} hoạt động điểm. Còn ${tokens}. Ngủ để hồi phục.`,
      ok: false,
    };

  let inv = [...state.inventory];
  for (const ingId of recipe.ingredients) {
    const idx = inv.indexOf(ingId);
    if (idx === -1) return { state, msg: `Thiếu: ${DW_itemName(ingId)}.`, ok: false };
    inv.splice(idx, 1);
  }

  // returnIngredient: trả lại tool (crowbar trong salvage_concrete) vào inventory
  if (recipe.returnIngredient) inv.push(recipe.returnIngredient);

  // Noise: noisePerAction cơ bản + extraNoise riêng của recipe (bếp lửa, vv)
  const def          = BASE_UPGRADE_DEFS[Math.min(curLvl, 5)];
  const soundproofed = (state.base?.soundproofUntilDay||0) > state.day;
  const baseNoise    = soundproofed ? Math.max(0, def.noisePerAction - 1) : def.noisePerAction;
  const craftNoise   = baseNoise + (recipe.extraNoise || 0);

  // gameTimeCostH: advance giờ game (ví dụ 0.5h cho nấu ăn)
  const timeCost = recipe.gameTimeCostH || 0;
  const newHour  = timeCost > 0 ? (state.hour + timeCost) % 24 : state.hour;

  let s = {
    ...state,
    inventory:  inv,
    baseTokens: tokens - recipe.baseToken,
    noise:      Math.min(10, (state.noise||0) + craftNoise),
    hour:       newHour,
  };
  // Qua nửa đêm khi craft lâu → advance ngày
  if (timeCost > 0 && newHour < state.hour) s = DW_advanceDay(s);

  // ── Xử lý flag đặc biệt ──────────────────────────────

  // Barricade boost: tăng barricade tile ngay lập tức
  if (recipe.isBarricadeBoost) {
    const bonus   = recipe.barricadeBonus || 1;
    const curBari = tile.barricade || 0;
    const newBari = Math.min(5, curBari + bonus);
    s.tiles = { ...s.tiles, [tileKey]: { ...s.tiles[tileKey], barricade: newBari } };
  }

  // Soundproofing: đặt ngày hết hạn cách âm
  if (recipe.isSoundproofing) {
    s.base = { ...s.base, soundproofUntilDay: state.day + (recipe.soundproofDays || 3) };
  }

  // Camouflage net (Điểm 3): tăng activeNets, áp dụng signatureReduce
  // signatureReduce được _DW_baseTickThreat đọc để nhân hệ số threat/day
  if (recipe.isCamouflage) {
    s.base = {
      ...s.base,
      activeNets:      (s.base?.activeNets || 0) + 1,
      signatureReduce: ITEM_DB['camouflage_net']?.signatureReduce || 0.30,
    };
  }

  // Xe kéo: không vào inventory — đặt flag hasCart, apply carryBonus
  // carryBonus được engine-inventory.js đọc khi tính carry capacity
  if (recipe.unique && recipe.result === 'supply_cart') {
    s.hasCart    = true;
    s.carryBonus = ITEM_DB['supply_cart']?.carryBonus || 25;
  } else if (recipe.result && !recipe.isBarricadeBoost && !recipe.isSoundproofing && !recipe.isCamouflage) {
    // Recipe thông thường: push result vào inventory (hỗ trợ resultCount > 1)
    const count = recipe.resultCount || 1;
    for (let i = 0; i < count; i++) s.inventory = [...s.inventory, recipe.result];
  }

  s.log = [recipe.craftMsg || `✅ ${recipe.name} hoàn thành.`, ...(s.log||[])];

  // XP cho skill liên quan
  const xpSk = Object.keys(recipe.skillReq || {})[0];
  if (xpSk) s = DW_grantXp(s, xpSk, 3);

  return {
    state:      s,
    msg:        `${recipe.icon} ${recipe.name} xong. Còn ${s.baseTokens} hoạt động điểm hôm nay.`,
    ok:         true,
    result:     recipe.result,
    tokensLeft: s.baseTokens,
  };
}

// ── DW_baseStore / DW_baseRetrieve ────────────────────
// Cất/lấy đồ từ kho base.
// Kho hard-capped theo BASE_STORAGE_CAP (60 kg).
// Ngăn infinite warehouse: player phải chọn giữ gì, bỏ gì.
function DW_baseStore(state, itemId) {
  const tileKey = `${state.x},${state.y}`;
  if (!state.tiles[tileKey]?.base || state.base?.tileKey !== tileKey)
    return { state, msg: 'Chỉ có thể cất đồ khi ở trong base.', ok: false };

  const idx = state.inventory.indexOf(itemId);
  if (idx === -1) return { state, msg: `Không có ${DW_itemName(itemId)} trong túi.`, ok: false };

  const storage  = state.base?.storage || [];
  const storageW = storage.reduce((sum, id) => sum + DW_itemWeight(id), 0);
  const itemW    = DW_itemWeight(itemId);

  if (storageW + itemW > BASE_STORAGE_CAP)
    return {
      state,
      msg: `Kho đầy (${storageW.toFixed(1)}/${BASE_STORAGE_CAP} kg). Lấy bớt đồ ra trước.`,
      ok: false,
    };

  const s = {
    ...state,
    inventory: state.inventory.filter((_,i) => i !== idx),
    base:      { ...state.base, storage: [...storage, itemId] },
    log: [`📦 Cất ${DW_itemName(itemId)} vào kho. (${(storageW+itemW).toFixed(1)}/${BASE_STORAGE_CAP} kg)`, ...(state.log||[])],
  };
  return { state: s, msg: `Cất ${DW_itemName(itemId)}.`, ok: true };
}

function DW_baseRetrieve(state, itemId) {
  const tileKey = `${state.x},${state.y}`;
  if (!state.tiles[tileKey]?.base || state.base?.tileKey !== tileKey)
    return { state, msg: 'Chỉ có thể lấy đồ khi ở trong base.', ok: false };

  const storage = state.base?.storage || [];
  const idx     = storage.indexOf(itemId);
  if (idx === -1) return { state, msg: `Không có ${DW_itemName(itemId)} trong kho.`, ok: false };

  const s = {
    ...state,
    inventory: [...state.inventory, itemId],
    base:      { ...state.base, storage: storage.filter((_,i) => i !== idx) },
    log: [`🎒 Lấy ${DW_itemName(itemId)} từ kho base.`, ...(state.log||[])],
  };
  return { state: s, msg: `Lấy ${DW_itemName(itemId)}.`, ok: true };
}

// ── DW_moveBase ───────────────────────────────────────
// Chuyển base đến vị trí hiện tại.
// Base cũ bị xóa — tile.base = false — và vật liệu được salvage một phần.
// Blueprint luôn giữ nguyên 100%: player mang theo "kiến thức", không phải "gạch đá".
// forceFlee: true khi bị event ép chạy → salvage rate xuống 20–30%.
function DW_moveBase(state, forceFlee = false) {
  if (!state.base?.tileKey)
    return { state, msg: 'Bạn chưa có base nào để chuyển.', ok: false };

  const newKey = `${state.x},${state.y}`;
  if (state.base.tileKey === newKey)
    return { state, msg: 'Đây đã là base hiện tại của bạn.', ok: false };

  const newTile = state.tiles[newKey];
  if (!_DW_tileIsClear(newTile))
    return { state, msg: 'Cần tiêu diệt hết zombie tại vị trí mới.', ok: false };

  // Salvage vật liệu từ các level đã xây
  const rate     = _DW_salvageRate(state, forceFlee);
  const oldLvl   = state.base.level || 1;
  const salvaged = [];
  for (let l = 1; l <= oldLvl; l++) {
    for (const matId of BASE_UPGRADE_DEFS[l]?.cost || []) {
      if (Math.random() < rate) salvaged.push(matId);
    }
  }

  const oldKey  = state.base.tileKey;
  const oldTile = state.tiles[oldKey];

  const newBase = {
    level:              1,           // reset về L1 — rebuild tại địa điểm mới
    tileKey:            newKey,
    builtDay:           state.day,
    threatAccum:        0,           // threat reset về 0 — địa điểm mới chưa ai biết
    tokens:             BASE_DAILY_TOKENS,
    storage:            state.base.storage || [],  // kho đồ kéo theo
    blueprints:         state.base.blueprints || [], // giữ blueprint 100%
    soundproofUntilDay: 0,
    scheduledEvent:     null,
  };

  const fleeMsg    = forceFlee ? '🏃 Tháo chạy! ' : '';
  const salvageMsg = `Thu hồi ${Math.round(rate*100)}% vật liệu (${salvaged.length} items).`;

  const s = {
    ...state,
    base:       newBase,
    baseTokens: BASE_DAILY_TOKENS,
    inventory:  [...state.inventory, ...salvaged],
    tiles: {
      ...state.tiles,
      [oldKey]: oldTile ? { ...oldTile, base: false } : oldTile,
      [newKey]: { ...(newTile||{}), base: true },
    },
    log: [
      `${fleeMsg}🏕️ Chuyển base đến vị trí mới. ${salvageMsg} Blueprint giữ nguyên.`,
      ...(state.log||[]),
    ],
  };

  return {
    state: s,
    msg:          `Base chuyển xong. ${salvageMsg}`,
    ok:           true,
    salvagedItems: salvaged,
    forceFlee,
  };
}

// ── DW_abandonBase ────────────────────────────────────
// Bỏ hẳn base — không chuyển đi đâu.
// Thường dùng khi bị event horde ép, hoặc player muốn reset.
// Salvage rate thấp hơn move vì không có thời gian pack.
function DW_abandonBase(state, forceFlee = false) {
  if (!state.base?.tileKey)
    return { state, msg: 'Không có base để bỏ.', ok: false };

  const oldKey  = state.base.tileKey;
  const oldTile = state.tiles[oldKey];
  const rate    = forceFlee ? 0.15 : _DW_salvageRate(state, false) * 0.6;

  const salvaged = [];
  for (let l = 1; l <= (state.base.level||1); l++) {
    for (const matId of BASE_UPGRADE_DEFS[l]?.cost||[]) {
      if (Math.random() < rate) salvaged.push(matId);
    }
  }

  const s = {
    ...state,
    base:      null,
    baseTokens: 0,
    inventory: [...state.inventory, ...salvaged],
    tiles:     { ...state.tiles, [oldKey]: oldTile ? { ...oldTile, base: false } : oldTile },
    log: [
      `🚨 Base bị bỏ lại. Thu hồi ${salvaged.length} vật liệu (${Math.round(rate*100)}%).`,
      ...(state.log||[]),
    ],
  };
  return { state: s, msg: 'Base đã bỏ.', ok: true, salvaged };
}

// ── _DW_baseTickThreat ────────────────────────────────
// Tích lũy threat mỗi khi player ngủ trong base (= mỗi ngày game).
// threatAccum tăng theo BASE_UPGRADE_DEFS[level].threatPerDay.
// Khi vượt threshold → roll event từ BASE_THREAT_THRESHOLDS.
//
// Quan trọng: threat KHÔNG reset về 0 sau event — chỉ giảm đi threatCost.
// Tức là: ở càng lâu → event ngày càng dày và nguy hiểm hơn.
// Đây là cơ chế ép player phải relocate thay vì ở mãi 1 chỗ.
function _DW_baseTickThreat(state) {
  if (!state.base) return state;

  const lvl       = state.base.level || 1;
  const def       = BASE_UPGRADE_DEFS[Math.min(lvl, 5)];
  let   addThreat = def?.threatPerDay || 0;

  // Camouflage net (Điểm 3): giảm 30% threat tích lũy/ngày khi đang active.
  // state.base.signatureReduce được set khi craft camouflage_net.
  // Capped ở 30% — maxActive:1 đảm bảo không stack.
  const sigReduce = Math.min(0.30, state.base.signatureReduce || 0);
  addThreat = addThreat * (1 - sigReduce);

  let newBase = {
    ...state.base,
    threatAccum: (state.base.threatAccum || 0) + addThreat,
  };

  // Kiểm tra scheduled event (đã báo trước từ scout) đến ngày trigger chưa
  if (newBase.scheduledEvent && state.day >= newBase.scheduledEvent.triggerDay) {
    const sched = newBase.scheduledEvent;
    newBase.scheduledEvent = null;
    return {
      ...state,
      base:             newBase,
      pendingBaseEvent: sched.event,
      log: [`⚠️ Sự kiện đã báo trước xảy ra: ${sched.event.title}`, ...(state.log||[])],
    };
  }

  // Roll event mới nếu threat vượt threshold và chưa có pending event
  const threat = newBase.threatAccum;
  let matchedThreshold = null;
  for (const t of [...BASE_THREAT_THRESHOLDS].reverse()) {
    if (threat >= t.threshold) { matchedThreshold = t; break; }
  }

  let s = { ...state, base: newBase };

  if (matchedThreshold && !state.pendingBaseEvent) {
    // Weighted pick event type
    const totalW = matchedThreshold.weights.reduce((a,b) => a+b, 0);
    let rng      = Math.random() * totalW;
    let pickedType = matchedThreshold.eventTypes[0];
    for (let i = 0; i < matchedThreshold.eventTypes.length; i++) {
      rng -= matchedThreshold.weights[i];
      if (rng <= 0) { pickedType = matchedThreshold.eventTypes[i]; break; }
    }

    // Lọc theo type và base level
    const pool = BASE_EVENTS.filter(e => e.type === pickedType && e.triggerLevel <= lvl);
    if (pool.length > 0) {
      const event = pool[Math.floor(Math.random() * pool.length)];

      // Tiêu bớt threat sau event
      newBase.threatAccum = Math.max(0, newBase.threatAccum - event.threatCost);
      s.base = newBase;

      // Scout events: schedule raid về sau (không trigger ngay)
      if (event.scheduledEvent) {
        const raidEvent = BASE_EVENTS.find(e2 => e2.type === event.scheduledEvent);
        if (raidEvent) {
          s.base = {
            ...s.base,
            scheduledEvent: {
              event:      raidEvent,
              triggerDay: state.day + (event.scheduleDays || 2),
            },
          };
        }
        s.log = [`${event.icon} ${event.title}: ${event.text}`, ...(s.log||[])];
      } else {
        // Warning/refugee: trigger ngay
        s.pendingBaseEvent = event;
        s.log = [`${event.icon} ${event.title}: ${event.text}`, ...(s.log||[])];
      }
    }
  }

  return s;
}

// ── DW_resolveBaseEvent ───────────────────────────────
// Player đưa ra choice khi có base event (refugee/bandit_raid/horde).
// choiceId: 'accept'|'reject'|'defend'|'flee'|'negotiate'
// Xóa pendingBaseEvent và áp dụng outcome.result.
function DW_resolveBaseEvent(state, choiceId) {
  const event = state.pendingBaseEvent;
  if (!event) return { state, msg: 'Không có sự kiện nào đang chờ.', ok: false };

  // Xóa pending ngay — kể cả choice không hợp lệ
  let s = { ...state, pendingBaseEvent: null };

  const choice = (event.choices || []).find(c => c.id === choiceId);
  if (!choice)
    return { state: s, msg: `Lựa chọn không hợp lệ cho sự kiện này.`, ok: false };

  // Weighted pick outcome
  const outcomes = choice.outcomes || [];
  const totalW   = outcomes.reduce((sum, o) => sum + o.w, 0);
  let rng        = Math.random() * totalW;
  let outcome    = outcomes[outcomes.length - 1];
  for (const o of outcomes) { rng -= o.w; if (rng <= 0) { outcome = o; break; } }

  // Áp dụng outcome.result
  switch (outcome.result) {
    case 'helpful':
      s.stress = Math.max(0, (s.stress||0) - 10);
      s.log = [`✅ ${outcome.msg}`, ...(s.log||[])];
      break;

    case 'neutral':
      s.log = [`📝 ${outcome.msg}`, ...(s.log||[])];
      break;

    case 'betrayal':
      // Mất 1–2 item ngẫu nhiên từ inventory
      { const stealCount = Math.min(2, Math.max(1, Math.floor(s.inventory.length * 0.15)));
        for (let i = 0; i < stealCount; i++) {
          const idx = Math.floor(Math.random() * s.inventory.length);
          s.inventory = s.inventory.filter((_,j) => j !== idx);
        }
        s.stress = Math.min(100, (s.stress||0) + 15);
        s.log = [`🔴 ${outcome.msg}`, ...(s.log||[])]; }
      break;

    case 'guilt':
      s.stress     = Math.min(100, (s.stress||0) + 15);
      s.depression = Math.min(100, (s.depression||0) + 5);
      s.log = [`😔 ${outcome.msg}`, ...(s.log||[])];
      break;

    case 'safe':
      s.stress = Math.min(100, (s.stress||0) + 8);
      s.log = [`📝 ${outcome.msg}`, ...(s.log||[])];
      break;

    case 'burden':
      // Đặt flag refugee tạm thời — hunger decay tăng khi họ ở cùng
      s.refugeePresent = true;
      s.log = [`⚠️ ${outcome.msg}`, ...(s.log||[])];
      break;

    case 'defend':
      // Set flag để engine-combat.js / UI spawn bandit vào tile
      s.baseUnderRaid = true;
      s.raidBandits   = event.banditsSpawned || ['bandit_scout'];
      s.log = [`⚔️ Chiến đấu bảo vệ base!`, ...(s.log||[])];
      break;

    case 'flee': {
      // Chuyển base khẩn cấp nếu có thể, nếu không thì abandon
      const fl = DW_moveBase(s, true);
      if (fl.ok) s = fl.state;
      else { const ab = DW_abandonBase(s, true); if (ab.ok) s = ab.state; }
      s.log = [`🏃 ${outcome.msg || 'Bỏ chạy.'}`, ...(s.log||[])];
      break;
    }

    case 'negotiate': {
      // Mất 20–30% kho base
      const losePct  = event.type === 'bandit_raid' ? 0.30 : 0.20;
      const storage  = s.base?.storage || [];
      const keepN    = Math.ceil(storage.length * (1 - losePct));
      if (s.base) s.base = { ...s.base, storage: storage.slice(0, keepN) };
      s.stress = Math.min(100, (s.stress||0) + 20);
      s.log = [`🤝 ${outcome.msg || 'Thương lượng xong. Mất một phần đồ.'}`, ...(s.log||[])];
      break;
    }

    default:
      s.log = [`📝 ${outcome.msg || 'Xong.'}`, ...(s.log||[])];
  }

  return { state: s, ok: true, msg: outcome.msg || 'Sự kiện kết thúc.', outcome: outcome.result, event };
}

// ── DW_getBaseStatus ──────────────────────────────────
// Pure query — snapshot trạng thái base để UI render.
// Không thay đổi state. An toàn gọi bất cứ lúc nào.
function DW_getBaseStatus(state) {
  if (!state.base) return null;

  const lvl     = state.base.level || 1;
  const def     = BASE_UPGRADE_DEFS[Math.min(lvl, 5)];
  const nextDef = BASE_UPGRADE_DEFS[Math.min(lvl + 1, 5)];
  const threat  = state.base.threatAccum || 0;
  const storage = state.base.storage || [];
  const storageW = storage.reduce((sum, id) => sum + DW_itemWeight(id), 0);

  // Danger label dùng để màu sắc UI threat indicator
  let dangerLabel = 'THẤP', dangerColor = '#55C45A';
  if (threat >= 40)      { dangerLabel = 'NGUY HIỂM'; dangerColor = '#C0392B'; }
  else if (threat >= 18) { dangerLabel = 'CAO';        dangerColor = '#E8B800'; }
  else if (threat >= 10) { dangerLabel = 'TRUNG BÌNH'; dangerColor = '#FF8C00'; }

  return {
    level:         lvl,
    levelName:     def.name,
    levelIcon:     def.icon,
    actions:       def.actions,
    tokens:        state.baseTokens ?? 0,
    maxTokens:     BASE_DAILY_TOKENS,
    threat,
    dangerLabel,
    dangerColor,
    daysHere:      state.day - (state.base.builtDay || state.day),
    storageWeight: storageW,
    storageCap:    BASE_STORAGE_CAP,
    storageItems:  storage,
    hasCart:       state.hasCart || false,
    blueprints:    state.base.blueprints || [],
    soundproofed:  (state.base.soundproofUntilDay || 0) > state.day,
    nextLevelCost: lvl < 5 ? (nextDef?.cost || []) : null,
    scheduledEvent: state.base.scheduledEvent || null,
    pendingEvent:   state.pendingBaseEvent || null,
  };
}
