// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-combat.js
// Combat system: fight, flee, throw items, stealth attack,
// weapon/armor helpers, dice rolls
// Dependencies: deadworld-data.js, engine-skills.js
// ══════════════════════════════════════════════════════

// ── COMBAT HELPERS ────────────────────────────────────
function DW_rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function DW_getWeaponDef(state) {
  const id = state.equip?.weapon;
  return id ? (EQUIP_DEFS[id] || null) : null;
}

function DW_getArmorBonus(state) {
  let total = 0;
  for (const slot of ['body','head']) {
    const id = state.equip?.[slot];
    if (id) total += EQUIP_DEFS[id]?.armorBonus || 0;
  }
  return total;
}

function DW_combatDC(boss, enemy) {
  if (boss) {
    const bd = BOSS_DEFS[boss.id];
    if (!bd) return 10;
    if (boss.hp <= bd.phase3Hp) return bd.dcPhase3;
    if (boss.hp <= bd.phase2Hp) return bd.dcPhase2;
    return bd.dc;
  }
  return enemy?.fightAp ? 8 + enemy.fightAp : 10;
}

function DW_getWeaponSkill(state, weapDef) {
  if (!weapDef) return 0;
  if (weapDef.type === 'blade')   return state.skills?.blade   || 0;
  if (weapDef.type === 'blunt')   return state.skills?.blunt   || 0;
  if (weapDef.type === 'firearm') return state.skills?.firearm || 0;
  return 0;
}

// ── FIGHT ─────────────────────────────────────────────
function DW_fight(state, objId, opts={}) {
  const tileKey  = `${state.x},${state.y}`;
  const tile     = state.tiles[tileKey];
  if (!tile) return { state, msg: 'Không có tile.', ok: false };

  const boss  = state.activeBosses?.[tileKey];
  let obj = null;
  if (!boss) {
    obj = tile.objects.find(o => o.id === objId && OBJECT_DEFS[o.type]?.type === 'enemy');
    if (!obj) return { state, msg: 'Không tìm thấy kẻ thù.', ok: false };
  }

  const weapDef   = DW_getWeaponDef(state);
  const weapId    = state.equip?.weapon;
  const weapSkill = DW_getWeaponSkill(state, weapDef);

  // Firearm: check ammo
  if (weapDef?.type === 'firearm' && weapDef?.ammoType) {
    const avail = state.ammo?.[weapDef.ammoType] || 0;
    if (avail <= 0 && weapId !== 'homemade_bow') {
      return { state, msg: `Hết đạn!`, ok: false };
    }
  }

  let apCost = boss
    ? (BOSS_DEFS[boss.id]?.fightAp || 4)
    : (OBJECT_DEFS[obj.type]?.fightAp || 3);
  const extraAp = opts.heavy ? 1 : 0;

  // Police perk: súng -1 AP, nhưng floor = 2 để tránh bắn gần như miễn phí.
  // Không áp dụng cho vũ khí cận chiến (chỉ firearm).
  if (state.job === 'police' && weapDef?.type === 'firearm') {
    apCost = Math.max(2, apCost - 1);
  }

  // Police: xa_thu_canh_sat — elite_shooter firearm_ap_reduction (stacks với perk, floor 1)
  if (state.job === 'police' && weapDef?.type === 'firearm') {
    const eliteReduce = DW_getSkillEffect(state, 'xa_thu_canh_sat', 'firearm_ap_reduction') || 0;
    if (eliteReduce > 0) apCost = Math.max(1, apCost - eliteReduce);
  }

  // Police: ban_tu_yem_the — cover_ap_reduce khi tile có barricade
  if (state.job === 'police' && weapDef?.type === 'firearm') {
    const tileKey0 = `${state.x},${state.y}`;
    const tile0    = state.tiles?.[tileKey0];
    const bLvl0    = tile0?.barricade || 0;
    if (bLvl0 >= 1) {
      const coverAp = DW_getSkillEffect(state, 'ban_tu_yem_the', 'cover_ap_reduce') || 0;
      if (coverAp > 0) apCost = Math.max(1, apCost - coverAp);
    }
  }

  if (state.ap < apCost + extraAp)
    return { state, msg: `Cần ${apCost+extraAp} ĐHĐ. Bạn còn ${state.ap}.`, ok: false };

  const roll  = DW_rollD20();
  const enemy = boss ? BOSS_DEFS[boss.id] : OBJECT_DEFS[obj.type];
  const dc    = DW_combatDC(boss, enemy);

  let hitBonus = weapSkill + (weapDef?.hitBonus || 0)
               + (state.job === 'soldier' ? 1 : 0)
               - ((state.statuses||[]).includes('fear') ? 2 : 0)
               + (opts.stealth ? (state.skills?.sneak || 0) : 0);

  // Police: doc_nguoi — bandit_dc_bonus (advantage vs bandit)
  if (state.job === 'police' && !boss) {
    const dcBonus = DW_getSkillEffect(state, 'doc_nguoi', 'bandit_dc_bonus') || 0;
    if (dcBonus > 0) hitBonus += dcBonus;
  }
  // Police: doc_nguoi — advantage_vs_bandit (chiến đấu với bandit trong DW_fight nếu có bandit flag)
  if (state.job === 'police' && opts._isBandit &&
      DW_getSkillEffect(state, 'doc_nguoi', 'advantage_vs_bandit')) {
    hitBonus += 3;
  }

  const total = roll + hitBonus;
  const hit   = total >= dc;

  let s = { ...state, ap: state.ap - apCost - extraAp };

  // Mechanic: pre_combat_check (bao_tri_dinh_ky lv7) — boost +5 durability lần đầu mỗi ngày
  if (state.job === 'mechanic' && !state.preCombatCheckDone &&
      DW_getSkillEffect(state, 'bao_tri_dinh_ky', 'pre_combat_check')) {
    const boostedDur = { ...(s.equipDur || {}) };
    for (const [slot, id] of Object.entries(s.equip || {})) {
      if (id && boostedDur[slot] != null) {
        const def = ITEM_DB[id];
        const maxDur = def?.durability || 30;
        boostedDur[slot] = Math.min(maxDur, boostedDur[slot] + 5);
      }
    }
    s.equipDur = boostedDur;
    s.preCombatCheckDone = true;
    s.log = ['⚙️ Pre-Combat Check: trang bị +5 độ bền.', ...(s.log||[])];
  }

  // Mechanic: immortal_gear boss exception — boss attacks có 30% chance phá equipment
  if (state.job === 'mechanic' && boss &&
      DW_getSkillEffect(state, 'vinh_cuu', 'immortal_gear') &&
      DW_getSkillEffect(state, 'vinh_cuu', 'immortal_gear_boss_exception')) {
    s._bossCanBreakGear = Math.random() < 0.30;
  }

  // Consume ammo
  if (weapDef?.type === 'firearm' && weapDef?.ammoType && weapId !== 'homemade_bow') {
    s.ammo = { ...s.ammo, [weapDef.ammoType]: Math.max(0, (s.ammo?.[weapDef.ammoType]||0) - 1) };
  }

  // Noise
  s.noise = Math.min(10, s.noise + (weapDef?.noise || 3));
  if (weapDef?.special === 'gunshot_alert') {
    s.log = ['⚠ Tiếng súng! Zombie cách 3 tile bị kéo lại!', ...(s.log||[])];
  }

  // Police: kiem_soat_am_thanh — gun_noise_reduce khi bắn súng
  if (s.job === 'police' && weapDef?.type === 'firearm') {
    const noiseReduce = DW_getSkillEffect(s, 'kiem_soat_am_thanh', 'gun_noise_reduce') || 0;
    if (noiseReduce > 0) s.noise = Math.max(0, s.noise - noiseReduce);
  }

  // Miss
  if (!hit) {
    const dmgIn  = (boss ? BOSS_DEFS[boss.id]?.damage : enemy?.damage) || 1;
    let netDmg = Math.max(0, dmgIn - DW_getArmorBonus(s));

    // Mechanic: reactive_armor (lop_giap_tuy_chinh lv7) — giảm 2 damage khi nhận >= threshold
    if (s.job === 'mechanic' && DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'reactive_armor')) {
      const threshold = DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'reactive_armor_threshold') || 5;
      const reduce    = DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'reactive_armor_reduce')    || 2;
      if (netDmg >= threshold) netDmg = Math.max(0, netDmg - reduce);
    }
    // Mechanic: fortress_body (lop_giap_tuy_chinh lv10) — -3 damage (không áp dụng boss AoE)
    if (s.job === 'mechanic' && !boss && DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'fortress_body')) {
      netDmg = Math.max(0, netDmg - 3);
    }
    // Mechanic: fortify_bonus (ky_su_chien_truong) — giảm damage % khi đang ở trong defended zone
    if (s.job === 'mechanic') {
      const zone = typeof DW_getDefendedZone === 'function' ? DW_getDefendedZone(s) : null;
      if (zone?.active) {
        const fortify = DW_getSkillEffect(s, 'ky_su_chien_truong', 'fortify_bonus') || 0;
        if (fortify > 0) netDmg = Math.max(0, Math.ceil(netDmg * (1 - fortify)));
      }
    }

    // Nurse: chuyen_gia_cap_cuu — emergency_defense khi HP < 20%
    if (s.job === 'nurse') {
      const hpRatio = s.hp / (s.maxHp || 20);
      if (hpRatio < 0.20) {
        const eDef = DW_getSkillEffect(s, 'chuyen_gia_cap_cuu', 'emergency_defense') || 0;
        if (eDef > 0) netDmg = Math.max(0, Math.ceil(netDmg * (1 - eDef)));
      }
    }

    // Police: che_chan_dong_doi — protect_incoming khi tile có barricade lv2+
    if (s.job === 'police') {
      const tileKeyP = `${s.x},${s.y}`;
      const tileP    = s.tiles?.[tileKeyP];
      const bLvlP    = tileP?.barricade || 0;
      if (bLvlP >= 2) {
        const shieldBonus = DW_getSkillEffect(s, 'che_chan_dong_doi', 'protect_incoming') || 0;
        if (shieldBonus > 0) netDmg = Math.max(0, Math.ceil(netDmg * (1 - shieldBonus)));
      }
      // Police: che_chan_dong_doi — last_stand_defense khi HP < 30%
      const hpRatioP = s.hp / (s.maxHp || 15);
      if (hpRatioP < 0.30 && DW_getSkillEffect(s, 'che_chan_dong_doi', 'last_stand_defense')) {
        netDmg = Math.max(0, Math.ceil(netDmg * 0.80));
      }
      // Police: ban_tu_yem_the — cover_damage_reduce khi tile có barricade
      if (bLvlP >= 1) {
        const coverDef = DW_getSkillEffect(s, 'ban_tu_yem_the', 'cover_damage_reduce') || 0;
        if (coverDef > 0) netDmg = Math.max(0, Math.ceil(netDmg * (1 - coverDef)));
      }
      // Police: bat_khuat — endure khi HP < 15%
      if (hpRatioP < 0.15 && DW_getSkillEffect(s, 'bat_khuat', 'endure')) {
        netDmg = Math.max(0, Math.ceil(netDmg * 0.50));
      }
    }

    s.hp = Math.max(0, s.hp - netDmg);

    // Nurse: chuyen_gia_cap_cuu — emergency_heal sau khi nhận đòn (HP < 20%, 1 lần/ngày)
    if (s.job === 'nurse' && !state.emergencyHealUsed) {
      const hpRatioAfter = s.hp / (s.maxHp || 20);
      if (hpRatioAfter < 0.20) {
        const eHeal = DW_getSkillEffect(s, 'chuyen_gia_cap_cuu', 'emergency_heal') || 0;
        if (eHeal > 0) {
          s.hp = Math.min(s.maxHp, s.hp + eHeal);
          s.emergencyHealUsed = true;
          s.log = [`🚑 Cấp cứu! +${eHeal} HP`, ...(s.log||[])];
        }
      }
    }

    // Nurse: never_die (chuyen_gia_cap_cuu lv10) — HP về 0 → 1 HP (1 lần/ngày)
    if (s.job === 'nurse' && s.hp <= 0 && !state.neverDieUsed &&
        DW_getSkillEffect(s, 'chuyen_gia_cap_cuu', 'never_die')) {
      s.hp = 1;
      s.neverDieUsed = true;
      s.gameOver     = false;
      s.log = [`💀 Không Bao Giờ Chết — trụ lại 1 HP!`, ...(s.log||[])];
    }

    // Nurse: miracle_hands (signature) — 1 lần/game self-revive từ 0 HP
    if (s.job === 'nurse' && s.hp <= 0 && !state.miracleHandsUsed &&
        DW_hasSignatureSkill(s, 'miracle_hands') &&
        DW_getSkillEffect(s, 'miracle_hands', 'self_revive_once')) {
      const reviveHp = DW_getSkillEffect(s, 'miracle_hands', 'self_revive_hp') || 1;
      s.hp           = reviveHp;
      s.miracleHandsUsed = true;
      s.gameOver         = false;
      s.log = [`🖐️ Đôi Tay Kỳ Diệu — hồi sinh ${reviveHp} HP!`, ...(s.log||[])];
    }

    // Police: bat_khuat — cop_never_dies (1 lần/ngày, HP về 0 → 3 HP + bắn miễn phí)
    if (s.job === 'police' && s.hp <= 0 && !state.copNeverDiesUsed &&
        DW_getSkillEffect(s, 'bat_khuat', 'cop_never_dies')) {
      s.hp = 3;
      s.copNeverDiesUsed = true;
      s.gameOver = false;
      // Phát bắn cuối cùng miễn phí — flag để engine-core / UI xử lý
      s._copLastShot = true;
      s.log = [`🚔 Cảnh Sát Không Bao Giờ Ngã — đứng lên với 3 HP!`, ...(s.log||[])];
    }

    // Police: phan_xa_chien_dau — last_stand_shot (khi HP = 0 lần đầu nếu còn đạn)
    if (s.job === 'police' && s.hp <= 0 && !s.copNeverDiesUsed && !state.lastStandShotUsed &&
        DW_getSkillEffect(s, 'phan_xa_chien_dau', 'last_stand_shot') &&
        weapDef?.type === 'firearm' &&
        (s.ammo?.[weapDef.ammoType] || 0) > 0) {
      // Bắn 1 phát chí mạng trước khi ngã — không thay đổi hp, chỉ gây sát thương
      s.lastStandShotUsed = true;
      s._lastStandShot = true; // UI/engine-core đọc flag này để xử lý damage
      s.log = [`🎯 Đứng Vững — phát cuối trước khi ngã!`, ...(s.log||[])];
    }

    if (s.hp <= 0) s.gameOver = true;
    s = DW_grantXp(s, weapDef?.type === 'blade' ? 'blade'
                    : weapDef?.type === 'blunt'  ? 'blunt' : 'fitness', 1);
    return {
      state: s,
      msg: `🎲 ${roll}+${hitBonus}=${total} vs DC${dc} — Trượt! Nhận ${netDmg} sát thương.`,
      roll, dc, hit: false, dmgTaken: netDmg, ok: true,
    };
  }

  // Hit — damage calculation
  let dmgOut = (weapDef?.baseDmg || 1) + weapSkill * 0.5 + (state.job === 'soldier' ? 1 : 0);
  if (opts.heavy)   dmgOut *= 1.5;
  if (opts.stealth) dmgOut *= (weapDef?.stealthMul || 1.5);
  if (weapDef?.special === 'penetrate') dmgOut += 1;

  // Mechanic: weapon upgrade override (cai_tien_vu_khi) — baseDmgBoost từ DW_upgradeWeapon
  if (state.job === 'mechanic' && weapId && state.weaponOverrides?.[weapId]) {
    const ov = state.weaponOverrides[weapId];
    dmgOut += (ov.baseDmgBoost || 0);
    if (ov.legendary) dmgOut = Math.ceil(dmgOut * 1.5); // legendary +50% total
  }

  // Mechanic: eternal_bond (vinh_cuu lv7) — heirloom weapon +10%/ngày mang (max +50%)
  if (state.job === 'mechanic' && weapId && state.heirloom?.id === weapId &&
      state.heirloom?.slot === 'weapon' &&
      DW_getSkillEffect(state, 'vinh_cuu', 'eternal_bond')) {
    const bondBonus = Math.min(0.50, (state.heirloomBondDays || 0) * 0.10);
    if (bondBonus > 0) dmgOut = Math.ceil(dmgOut * (1 + bondBonus));
  }

  // Mechanic: kill_zone (phao_dai_song lv5) — +2 damage khi chiến đấu trong defended zone
  if (state.job === 'mechanic' && !boss) {
    const zone = typeof DW_getDefendedZone === 'function' ? DW_getDefendedZone(state) : null;
    if (zone?.active && zone.killZone) dmgOut += 2;
  }

  // Police: ban_tu_yem_the — cover_damage_bonus khi tile có barricade
  if (state.job === 'police' && weapDef?.type === 'firearm') {
    const tileKeyDmg = `${state.x},${state.y}`;
    const tileDmg    = state.tiles?.[tileKeyDmg];
    const bLvlDmg    = tileDmg?.barricade || 0;
    if (bLvlDmg >= 1) {
      const coverDmgBonus = DW_getSkillEffect(state, 'ban_tu_yem_the', 'cover_damage_bonus') || 0;
      if (coverDmgBonus > 0) dmgOut = Math.ceil(dmgOut * (1 + coverDmgBonus));
    }
    // Police: xa_thu_canh_sat — firearm_damage_bonus
    const eliteDmg = DW_getSkillEffect(state, 'xa_thu_canh_sat', 'firearm_damage_bonus') || 0;
    if (eliteDmg > 0) dmgOut = Math.ceil(dmgOut * (1 + eliteDmg));
    // Police: tiet_kiem_dan — one_tap (% chance kill instantly)
    const oneTapChance = DW_getSkillEffect(state, 'tiet_kiem_dan', 'one_tap_chance') || 0;
    if (oneTapChance > 0 && !boss && Math.random() < oneTapChance) {
      dmgOut = 9999; // instant kill
      s.log = [`💥 One Tap!`, ...(s.log||[])];
    }
    // Police: ban_tu_yem_the — execution_zone: barricade lv3+ 30% instakill
    const exZone = DW_getSkillEffect(state, 'ban_tu_yem_the', 'execution_zone');
    const bLvlEx = (state.tiles?.[`${state.x},${state.y}`]?.barricade) || 0;
    if (exZone && !boss && bLvlEx >= 3 && Math.random() < 0.30) {
      dmgOut = 9999;
      s.log = [`🎯 Vùng Xử Lý — hạ gục tức thì!`, ...(s.log||[])];
    }
  }

  dmgOut = Math.ceil(dmgOut);

  // Weapon durability
  const wSlot = 'weapon';
  if (weapId && s.equipDur?.[wSlot] != null) {
    // Mechanic: arsenal (cai_tien_vu_khi lv10) — dual_durability_split: cả 2 vũ khí chia đều
    const dualSplit = s.job === 'mechanic' && DW_getSkillEffect(s, 'cai_tien_vu_khi', 'dual_durability_split');
    const durFloorW = s.job === 'mechanic' ? (DW_getSkillEffect(s, 'vinh_cuu', 'durability_floor') || 0) : 0;
    const eternalW  = s.job === 'mechanic' && DW_getSkillEffect(s, 'bao_tri_dinh_ky', 'eternal_maintenance');
    // Mechanic: heirloom weapon không bao giờ về 0 durability
    const isHeirloomWeapon = s.job === 'mechanic' && s.heirloom?.id === weapId && s.heirloom?.slot === 'weapon';
    const masterworkWeapon = s.job === 'mechanic' && s.weaponOverrides?.[weapId]?.masterwork;
    const floorW    = (isHeirloomWeapon || masterworkWeapon) ? 1 : (eternalW ? 10 : durFloorW);

    // Immortal gear boss exception
    const bossBreak = s._bossCanBreakGear && boss;
    const nd = bossBreak ? Math.max(0, s.equipDur[wSlot] - 1)
                         : Math.max(floorW, s.equipDur[wSlot] - 1);
    s.equipDur = { ...s.equipDur, [wSlot]: nd };
    if (nd <= 0 && floorW <= 0) {
      s.log  = [`${DW_itemName(weapId)} đã hỏng!`, ...(s.log||[])];
      s.equip = { ...s.equip, weapon: null };
    }
    // Dual split: weapon2 slot cũng mất durability nửa lần
    if (dualSplit && s.equip?.weapon2 && s.equipDur?.weapon2 != null) {
      const nd2 = Math.max(floorW, s.equipDur.weapon2 - 1);
      s.equipDur = { ...s.equipDur, weapon2: nd2 };
    }
  }

  // Poison blade trigger
  if (weapDef?.poisonChance && Math.random() * 100 < weapDef.poisonChance) {
    s.log = ['☠ Đòn độc! Kẻ thù bị nhiễm độc.', ...(s.log||[])];
  }

  s = DW_grantXp(s, weapDef?.type === 'blade' ? 'blade'
                  : weapDef?.type === 'blunt'  ? 'blunt'
                  : weapDef?.type === 'firearm' ? 'firearm' : 'fitness', 5);

  // Boss hit
  if (boss) {
    const bd     = BOSS_DEFS[boss.id];
    const newHp  = Math.max(0, boss.hp - dmgOut);
    if (newHp <= 0) {
      const { state: ls } = DW_grantBossLoot(s, boss.id);
      s = {
        ...ls,
        activeBosses: Object.fromEntries(
          Object.entries(ls.activeBosses||{}).filter(([k]) => k !== tileKey)
        ),
        killedBosses: [...(ls.killedBosses||[]), boss.id],
      };
      s = DW_grantXp(s, weapDef?.type || 'fitness', bd?.xpReward || 50);
      s = DW_grantCharacterXp(s, 'kill_boss');
      s.stats = { ...(s.stats||{}), kills: (s.stats?.kills||0) + 1 };
      return {
        state: s,
        msg: `🎲 ${roll}+${hitBonus}=${total} vs DC${dc} — Trúng ${dmgOut}! ${bd?.name} đã chết! Nhận loot.`,
        roll, dc, hit: true, bossKilled: boss.id, dmg: dmgOut, ok: true,
      };
    }
    const phaseMsg = newHp <= bd?.phase3Hp ? bd?.phase3Msg
                   : newHp <= bd?.phase2Hp ? bd?.phase2Msg : null;
    s.activeBosses = { ...s.activeBosses, [tileKey]: { ...boss, hp: newHp } };
    return {
      state: s,
      msg: `🎲 ${roll}+${hitBonus}=${total} vs DC${dc} — Trúng ${dmgOut}! Boss còn ${newHp} HP.${phaseMsg?' '+phaseMsg:''}`,
      roll, dc, hit: true, phaseMsg, ok: true,
    };
  }

  // Regular enemy: apply damage → partial HP hoặc kill
  // maxHp lấy từ OBJECT_DEFS để tính % còn lại
  const objDef    = OBJECT_DEFS[obj.type] || {};
  const objMaxHp  = objDef.maxHp || objDef.hp || 5;
  const objCurHp  = obj.hp != null ? obj.hp : objMaxHp;
  const newEnemyHp = objCurHp - dmgOut;

  if (newEnemyHp <= 0) {
    // ── Zombie bị tiêu diệt ──
    const newObjs = tile.objects.filter(o => o.id !== objId);
    s.tiles = { ...s.tiles, [tileKey]: { ...tile, objects: newObjs } };
    s.stress = Math.min(100, (s.stress||0) + 5);

  // Police: kiem_soat_am_thanh — silent_kill (mastery: noise về 0 khi giết bằng súng)
  if (s.job === 'police' && weapDef?.type === 'firearm' &&
      DW_getSkillEffect(s, 'kiem_soat_am_thanh', 'silent_kill')) {
    s.noise = 0;
    s.log = [`🔇 Tiêu Diệt Im Lặng — noise về 0.`, ...(s.log||[])];
  }

  // Police: tiet_kiem_dan — ammo_save_chance (không tốn đạn khi bắn trúng)
  if (s.job === 'police' && weapDef?.type === 'firearm' && weapDef?.ammoType) {
    const saveChance = DW_getSkillEffect(s, 'tiet_kiem_dan', 'ammo_save_chance') || 0;
    if (saveChance > 0 && Math.random() < saveChance) {
      // Hoàn lại đạn đã tốn
      s.ammo = { ...s.ammo, [weapDef.ammoType]: (s.ammo?.[weapDef.ammoType] || 0) + 1 };
      s.log = [`🎯 Tiết Kiệm — đạn hoàn lại!`, ...(s.log||[])];
    }
    // Police: tiet_kiem_dan — reclaim_ammo (20-30% nhặt thêm 1 đạn)
    const reclaimChance = DW_getSkillEffect(s, 'tiet_kiem_dan', 'reclaim_ammo') || 0;
    if (reclaimChance > 0 && Math.random() < reclaimChance) {
      s.ammo = { ...s.ammo, [weapDef.ammoType]: (s.ammo?.[weapDef.ammoType] || 0) + 1 };
      s.log = [`🔍 Thu hồi đạn +1`, ...(s.log||[])];
    }
  }

  // Police: xa_thu_canh_sat — rapid_clear: 30% hồi 1 AP sau khi giết bằng súng
  if (s.job === 'police' && weapDef?.type === 'firearm' &&
      DW_getSkillEffect(s, 'xa_thu_canh_sat', 'rapid_clear') &&
      Math.random() < 0.30) {
    s.ap = Math.min(DW_apMax(s), s.ap + 1);
    s.log = [`⚡ Rapid Clear: +1 AP`, ...(s.log||[])];
  }

  // Police: synergy police_deterrence — kill_stress_recover: giảm 2 stress mỗi kill
  if (s.job === 'police' && DW_hasSynergy(s, 'police_deterrence')) {
    const killStress = 2;
    s.stress = Math.max(0, (s.stress||0) - killStress);
  }

  // Police: nen_tang_tinh_than — stress_decay_combat: hồi stress sau win
  if (s.job === 'police') {
    const combatStressRecover = DW_getSkillEffect(s, 'nen_tang_tinh_than', 'stress_decay_combat') || 0;
    if (combatStressRecover > 0) {
      s.stress = Math.max(0, (s.stress||0) - combatStressRecover);
    }
  }

  // Milestone tracking: police_five_kills
  if (s.job === 'police') {
    s = DW_trackMilestoneCounter(s, 'police_kills', 1);
    s = DW_checkMilestone(s, 'police_five_kills');
  }

  // Character XP khi kill zombie
  const isSpecialEnemy = objDef.special || objDef.isHorde || objDef.isBrute;
  s = DW_grantCharacterXp(s, isSpecialEnemy ? 'kill_zombie_special' : 'kill_zombie');

  s.stats = { ...(s.stats||{}), kills: (s.stats?.kills||0) + 1 };

  return {
    state: s,
    msg: `🎲 ${roll}+${hitBonus}=${total} vs DC${dc} — Trúng ${dmgOut}! Zombie bị tiêu diệt.`,
    roll, dc, hit: true, enemyDead: true, dmg: dmgOut, ok: true,
  };

  } else {
    // ── Zombie bị thương nhưng chưa chết — cập nhật HP trong tile ──
    const updatedObjs = tile.objects.map(o =>
      o.id === objId ? { ...o, hp: newEnemyHp, maxHp: o.maxHp ?? objMaxHp } : o
    );
    s.tiles = { ...s.tiles, [tileKey]: { ...tile, objects: updatedObjs } };

    return {
      state: s,
      msg: `🎲 ${roll}+${hitBonus}=${total} vs DC${dc} — Trúng ${dmgOut}! Zombie còn ${newEnemyHp}/${objMaxHp} HP.`,
      roll, dc, hit: true, enemyDead: false, dmg: dmgOut,
      enemyHp: newEnemyHp, enemyMaxHp: objMaxHp,
      ok: true,
    };
  }
}

// ── ATTACK WRAPPERS ───────────────────────────────────
function DW_heavyAttack(state, objId)  { return DW_fight(state, objId, { heavy: true }); }

function DW_stealthAttack(state, objId) {
  const sk   = state.skills?.sneak || 0;
  const roll = DW_rollD20();
  const dc   = Math.max(4, 12 - sk * 2);
  if (roll + sk < dc)
    return { state, msg: `Thất bại tàng hình (${roll}+${sk} vs DC${dc}).`, ok: false };
  return {
    ...DW_fight(state, objId, { stealth: true }),
    msg: '🥷 Ám sát! ' + DW_fight(state, objId, { stealth: true }).msg,
  };
}

// ── THROW ─────────────────────────────────────────────
// v1: /molotov|lựu đạn|bình chữa cháy/i.test(item) for throwable check
// v2: DW_itemHasTag(itemId, 'throwable')
function DW_throwItem(state, itemId) {
  if (!DW_itemHasTag(itemId, 'throwable'))
    return { state, msg: `${DW_itemName(itemId)} không thể ném.`, ok: false };

  const idx = DW_invFindId(state.inventory, itemId);
  if (idx === -1) return { state, msg: `Không có ${DW_itemName(itemId)}.`, ok: false };
  if (state.ap < 2) return { state, msg: 'Cần 2 ĐHĐ.', ok: false };

  const tileKey = `${state.x},${state.y}`;
  let s = { ...state, inventory: state.inventory.filter((_,i) => i !== idx), ap: state.ap - 2 };
  let msg = '';

  if (itemId === 'molotov') {
    s.noise = Math.min(10, s.noise + 8);
    msg = '🔥 Molotov! Tất cả zombie tile này bị burn!';
    const tile = s.tiles[tileKey];
    if (tile) {
      const newObjs = tile.objects.map(o =>
        OBJECT_DEFS[o.type]?.type === 'enemy' ? {...o, burned:true} : o
      );
      s.tiles = { ...s.tiles, [tileKey]: { ...tile, objects: newObjs } };
    }
  } else if (itemId === 'smoke_grenade' || itemId === 'smoke_grenade_craft') {
    msg = '💨 Màn khói! Escape không tốn AP thêm.';
    s._smokeActive = true;
  } else if (itemId === 'fire_extinguisher') {
    s.noise = Math.min(10, s.noise + 8);
    msg = '🧯 AoE! Zombie hoảng loạn!';
  } else if (itemId === 'pebble') {
    s.noise = Math.min(10, s.noise + 4);
    msg = '🪨 Ném đá — tạo tiếng ồn dụ zombie!';
  }

  return { state: s, msg, ok: true };
}

// ── FLEE ──────────────────────────────────────────────
function DW_flee(state, objId) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];
  const boss    = state.activeBosses?.[tileKey];
  const obj     = tile?.objects.find(o => o.id === objId);
  if (!boss && !obj) return { state, msg: 'Không có gì để thoát.', ok: false };

  // ── AP cost ────────────────────────────────────────
  let fleeAp = boss ? (BOSS_DEFS[boss.id]?.fleeAp || 3) : (OBJECT_DEFS[obj?.type]?.flee_ap || 2);

  // Driver: flee_ap_reduce (thoat_hiem_chuyen_nghiep)
  if (state.job === 'driver') {
    const fleeReduce = DW_getSkillEffect(state, 'thoat_hiem_chuyen_nghiep', 'flee_ap_reduce');
    if (fleeReduce > 0) fleeAp = Math.max(0, fleeAp - fleeReduce);
  }

  // Police: khong_ai_bi_bo_lai — flee_ap_reduce
  if (state.job === 'police') {
    const pfReduce = DW_getSkillEffect(state, 'khong_ai_bi_bo_lai', 'flee_ap_reduce') || 0;
    if (pfReduce > 0) fleeAp = Math.max(0, fleeAp - pfReduce);
    // cover_escape: từ barricade tile = 100% success handled sau
  }

  // Soldier: rút lui luôn thành công, tốn đúng fleeAp
  if (state.job === 'soldier') {
    if (state.ap < fleeAp)
      return { state, msg: `Cần ${fleeAp} ĐHĐ để rút lui.`, ok: false };
    return {
      state: { ...state, ap: Math.max(0, state.ap - fleeAp) },
      msg: `⚔ Quân nhân rút lui khỏi ${boss ? 'boss' : 'zombie'}! (${fleeAp} ĐHĐ)`,
      ok: true,
    };
  }

  if (state.ap < fleeAp) return { state, msg: `Cần ${fleeAp} ĐHĐ.`, ok: false };

  // ── Tính DC và bonus ──────────────────────────────
  const roll   = DW_rollD20();
  const sk     = state.skills?.sneak || 0;
  const smoke  = state._smokeActive ? 6 : 0;
  let bonus    = 0;

  // Driver: flee_success_bonus (khong_the_bat)
  if (state.job === 'driver') {
    const fleeBonus = DW_getSkillEffect(state, 'khong_the_bat', 'flee_success_bonus');
    if (fleeBonus > 0) bonus += Math.round(fleeBonus * 20); // convert 0-1 → 0-20 DC offset
    // Driver: low_hp_flee_bonus (ngan_can_soi_toc) — kích hoạt khi HP < 30%
    const hpRatio = state.hp / (state.maxHp || 15);
    if (hpRatio < 0.30) {
      const lowHpBonus = DW_getSkillEffect(state, 'ngan_can_soi_toc', 'low_hp_flee_bonus');
      if (lowHpBonus > 0) bonus += Math.round(lowHpBonus * 20);
    }
  }

  const total  = roll + sk + smoke + bonus;
  const dc     = 8;

  let s = { ...state, ap: Math.max(0, state.ap - fleeAp), _smokeActive: false };

  // ── Set combat exhaustion flag để DW_checkExhaustion biết đây là combat ──
  s._combatExhaustionFlag = true;

  // ── Xác định flee thành công hay không ───────────
  let fleeSuccess = total >= dc;

  // Driver: uncatchable (khong_the_bat lv10) — zombie thường không bao giờ thất bại
  // Exception: boss flee cap 70%
  if (state.job === 'driver' && DW_getSkillEffect(state, 'khong_the_bat', 'uncatchable')) {
    if (boss) {
      // Boss: tối đa 70% chance flee (uncatchable_boss_cap)
      const bossCap = DW_getSkillEffect(state, 'khong_the_bat', 'uncatchable_boss_cap') || 0.70;
      fleeSuccess = Math.random() < bossCap;
    } else {
      fleeSuccess = true; // zombie thường: 100%
    }
  }

  // Driver: last_stand_flee (ngan_can_soi_toc lv7) — HP = 1 luôn thoát (trừ boss)
  if (state.job === 'driver' && !boss && s.hp <= 1 &&
      DW_getSkillEffect(state, 'ngan_can_soi_toc', 'last_stand_flee')) {
    fleeSuccess = true;
  }

  // Police: khong_ai_bi_bo_lai — cover_escape (mastery: từ barricade tile = 100% success)
  if (state.job === 'police' && !boss) {
    const tileKeyFlee = `${state.x},${state.y}`;
    const tileFlee    = state.tiles?.[tileKeyFlee];
    if ((tileFlee?.barricade || 0) >= 1 &&
        DW_getSkillEffect(state, 'khong_ai_bi_bo_lai', 'cover_escape')) {
      fleeSuccess = true;
    }
  }

  // ── Flee thất bại ────────────────────────────────
  if (!fleeSuccess) {
    // Driver: flee_no_damage (khong_the_bat lv3) — thất bại không gây sát thương
    const fleeNoDmgDriver = state.job === 'driver' &&
      DW_getSkillEffect(state, 'khong_the_bat', 'flee_no_damage');
    // Police: khong_ai_bi_bo_lai — flee_no_damage
    const fleeNoDmgPolice = state.job === 'police' &&
      DW_getSkillEffect(state, 'khong_ai_bi_bo_lai', 'flee_no_damage');
    const fleeNoDmg = fleeNoDmgDriver || fleeNoDmgPolice;
    if (!fleeNoDmg) {
      const dmg = ((boss ? BOSS_DEFS[boss.id]?.damage : OBJECT_DEFS[obj?.type]?.damage) || 1);
      let net = Math.max(0, dmg - DW_getArmorBonus(s));
      // Mechanic: reactive_armor + fortress_body on flee failure damage
      if (s.job === 'mechanic' && DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'reactive_armor')) {
        const threshold = DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'reactive_armor_threshold') || 5;
        const reduce    = DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'reactive_armor_reduce')    || 2;
        if (net >= threshold) net = Math.max(0, net - reduce);
      }
      if (s.job === 'mechanic' && !boss && DW_getSkillEffect(s, 'lop_giap_tuy_chinh', 'fortress_body')) {
        net = Math.max(0, net - 3);
      }
      s.hp = Math.max(0, s.hp - net);
      if (s.hp <= 0) s.gameOver = true;
      s.log = [`🎲 ${roll}+${sk}+${bonus}=${total} vs DC${dc} — Thoát thất bại! Nhận ${net} sát thương.`, ...(s.log||[])];
    } else {
      s.log = [`🎲 ${roll}+${sk}+${bonus}=${total} vs DC${dc} — Thoát thất bại, nhưng không bị đánh.`, ...(s.log||[])];
    }
    s._combatExhaustionFlag = false;
    return { state: s, msg: `Thoát thất bại.`, ok: false, dmgTaken: fleeNoDmg ? 0 : net };
  }

  // ── Flee thành công ───────────────────────────────
  s.log = [`🎲 ${roll}+${sk}+${bonus}=${total} vs DC${dc} — Thoát thành công!`, ...(s.log||[])];

  // Driver: flee_noise_reset (thoat_hiem_chuyen_nghiep)
  if (state.job === 'driver') {
    const noiseReset = DW_getSkillEffect(state, 'thoat_hiem_chuyen_nghiep', 'flee_noise_reset');
    if (noiseReset >= 1.0) {
      s.noise = 0;
      s.log = ['💨 Noise về 0 sau khi thoát.', ...(s.log||[])];
    } else if (noiseReset > 0) {
      s.noise = Math.floor((s.noise || 0) * (1 - noiseReset));
    }
  }

  // Driver: flee_heal (thoat_hiem_chuyen_nghiep lv5)
  if (state.job === 'driver') {
    const fleeHeal = DW_getSkillEffect(state, 'thoat_hiem_chuyen_nghiep', 'flee_heal');
    if (fleeHeal > 0) {
      s.hp = Math.min(state.maxHp || 15, s.hp + fleeHeal);
      s.log = [`❤️ Adrenaline: +${fleeHeal} HP sau khi thoát.`, ...(s.log||[])];
    }
  }

  // Driver: ghost_exit (thoat_hiem_chuyen_nghiep lv7) — invisible 1 lượt, cap 3/ngày
  if (state.job === 'driver' && DW_getSkillEffect(state, 'thoat_hiem_chuyen_nghiep', 'ghost_exit')) {
    const usedToday = s.ghostExitUsedToday || 0;
    const cap = DW_getSkillEffect(state, 'thoat_hiem_chuyen_nghiep', 'ghost_exit_daily_limit') || 3;
    if (usedToday < cap) {
      s.invisibleTurns  = (s.invisibleTurns || 0) + 1;
      s.ghostExitUsedToday = usedToday + 1;
      s.log = [`👻 Ghost Exit: vô hình 1 lượt (${usedToday+1}/${cap} hôm nay).`, ...(s.log||[])];
    }
  }

  // Driver: adrenaline_escape signature (post_flee_ap_bonus, post_flee_stress_clear)
  if (DW_hasSignatureSkill(state, 'adrenaline_escape')) {
    const apBonus = DW_getSkillEffect(state, 'adrenaline_escape', 'post_flee_ap_bonus') || 2;
    const stressClear = DW_getSkillEffect(state, 'adrenaline_escape', 'post_flee_stress_clear') || 10;
    s.ap = Math.min(DW_apMax(s), s.ap + apBonus);
    s.stress = Math.max(0, s.stress - stressClear);
    s.adrenalineDamageBonusNextTurn = DW_getSkillEffect(state, 'adrenaline_escape', 'post_flee_damage_bonus') || 0;
    s.log = [`⚡ Adrenaline Escape: +${apBonus} AP, -${stressClear} stress.`, ...(s.log||[])];
  }

  // Police: khong_ai_bi_bo_lai — flee_noise_reduce khi rút lui thành công
  if (state.job === 'police') {
    const pfNoiseReduce = DW_getSkillEffect(state, 'khong_ai_bi_bo_lai', 'flee_noise_reduce') || 0;
    if (pfNoiseReduce > 0) s.noise = Math.max(0, (s.noise || 0) - pfNoiseReduce);
    // cover_escape: từ barricade → noise về 0
    const tileKeyFC  = `${state.x},${state.y}`;
    const tileFCover = state.tiles?.[tileKeyFC];
    if ((tileFCover?.barricade || 0) >= 1 &&
        DW_getSkillEffect(state, 'khong_ai_bi_bo_lai', 'cover_escape')) {
      s.noise = 0;
      s.log = [`🚔 Che Chắn Rút Lui — noise về 0, hồi 5 AP.`, ...(s.log||[])];
      s.ap = Math.min(DW_apMax(s), (s.ap || 0) + 5);
    } else if (DW_getSkillEffect(state, 'khong_ai_bi_bo_lai', 'tactical_withdraw')) {
      // tactical_withdraw: thoát thành công → +3 AP (khi không phải cover_escape)
      s.ap = Math.min(DW_apMax(s), (s.ap || 0) + 3);
      s.log = [`🚔 Rút Lui Chiến Thuật: +3 AP`, ...(s.log||[])];
    }
  }

  s._combatExhaustionFlag = false;
  return { state: s, msg: `Thoát thành công!`, ok: true };
}

// ══════════════════════════════════════════════════════
// BANDIT COMBAT
// Bandit khác zombie: có armor, có thể steal, có thể flee
// banditObj: object từ DW_spawnBandits() — phải có .personality
// opts: { heavy, advantage, isFirstRound }
// ══════════════════════════════════════════════════════

// ── PERSONALITY BEHAVIOR DISPATCH TABLE ───────────────
// Mỗi entry là pure function: (state, bandit, context) → { state, msgs[], updatedBandit }
// 'context' chứa: { pHit, dmgOut, weapDef, isFirstRound }
// Chỉ áp dụng MODIFIER — combat core vẫn xử lý roll/DC/armor.
const BANDIT_BEHAVIORS = {

  // scavenger: steal 30% khi trúng player
  scavenger: (s, bandit, ctx) => {
    const msgs = [];
    if (ctx.banditHit && s.inventory.length > 1 && Math.random() < BANDIT_PERSONALITY.scavenger.stealChance) {
      const idx      = Math.floor(Math.random() * s.inventory.length);
      const stolenId = s.inventory[idx];
      s = { ...s, inventory: s.inventory.filter((_,i) => i !== idx) };
      // Item rơi xuống tile — lấy lại nếu thắng
      const tk  = `${s.x},${s.y}`;
      const til = s.tiles[tk];
      if (til) s.tiles = { ...s.tiles, [tk]: { ...til, droppedItems: [...(til.droppedItems||[]), stolenId] } };
      const line = DW_randomPick(BANDIT_PERSONALITY.scavenger.dialogue.steal);
      msgs.push(`⚠️ "${line}" — ${bandit.name} cướp ${DW_itemName(stolenId)}! (Rơi xuống sàn.)`);
    }
    return { state: s, msgs, updatedBandit: bandit };
  },

  // ambusher: +2 hit +1 damage lượt đầu nếu chưa bị detect (advantage = false)
  ambusher: (s, bandit, ctx) => {
    const msgs = [];
    if (ctx.isFirstRound && !ctx.advantage) {
      const line = DW_randomPick(BANDIT_PERSONALITY.ambusher.dialogue.ambush);
      msgs.push(`🥷 "${line}" — ${bandit.name} phục kích! Đòn mạnh hơn lượt này.`);
      // hitBonus và dmg đã được inject vào ctx trước khi gọi — chỉ log ở đây
    }
    return { state: s, msgs, updatedBandit: bandit };
  },

  // deserter: flee sớm ở 50% HP, bỏ lại 50% loot
  deserter: (s, bandit, ctx) => {
    const msgs = [];
    const fleeThr = Math.ceil(bandit.maxHp * BANDIT_PERSONALITY.deserter.fleeThreshold);
    if (bandit.hp <= fleeThr && bandit.hp > (bandit.fleeHp || 2)) {
      // override: trigger flee sớm hơn fleeHp mặc định
      const dropCount = Math.floor((bandit.loot||[]).length * BANDIT_PERSONALITY.deserter.dropOnFlee);
      const dropped   = (bandit.loot||[]).slice(0, dropCount);
      if (dropped.length > 0) {
        s = { ...s, inventory: [...s.inventory, ...dropped] };
        msgs.push(`🎒 ${bandit.name} bỏ lại: ${dropped.map(DW_itemName).join(', ')} khi chạy.`);
      }
      const line = DW_randomPick(BANDIT_PERSONALITY.deserter.dialogue.flee);
      msgs.push(`🏃 "${line}" — ${bandit.name} bỏ chạy sớm!`);
      return { state: s, msgs, updatedBandit: { ...bandit, hp: 0 }, earlyFlee: true };
    }
    return { state: s, msgs, updatedBandit: bandit };
  },

  // cannibal: +2 damage mỗi đòn trúng, khi chết drop strange_meat + stress +8
  cannibal: (s, bandit, ctx) => {
    const msgs = [];
    if (ctx.banditHit) {
      // damage bonus đã inject vào ctx.extraDmgIn trước khi gọi
      const line = DW_randomPick(BANDIT_PERSONALITY.cannibal.dialogue.attack);
      msgs.push(`🩸 "${line}"`);
    }
    return { state: s, msgs, updatedBandit: bandit };
  },
};

// Helper: pick ngẫu nhiên từ mảng (tránh import lodash)
function DW_randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── MAIN BANDIT FIGHT FUNCTION ────────────────────────
function DW_fightBandit(state, banditObj, opts={}) {
  if (!banditObj) return { state, msg: 'Không có bandit.', ok: false };

  const apCost = banditObj.fightAp || 3;
  const extra  = opts.heavy ? 1 : 0;
  if (state.ap < apCost + extra)
    return { state, msg: `Cần ${apCost + extra} ĐHĐ.`, ok: false };

  const weapDef   = DW_getWeaponDef(state);
  const weapSkill = DW_getWeaponSkill(state, weapDef);
  const personality = banditObj.personality || 'scavenger';
  const behavior    = BANDIT_BEHAVIORS[personality] || BANDIT_BEHAVIORS.scavenger;

  // Firearm: check ammo
  if (weapDef?.type === 'firearm' && weapDef?.ammoType) {
    if ((state.ammo?.[weapDef.ammoType] || 0) <= 0 && state.equip?.weapon !== 'homemade_bow')
      return { state, msg: 'Hết đạn!', ok: false };
  }

  let s = { ...state, ap: state.ap - apCost - extra };

  // Consume ammo
  if (weapDef?.type === 'firearm' && weapDef?.ammoType && s.equip?.weapon !== 'homemade_bow') {
    s.ammo = { ...s.ammo, [weapDef.ammoType]: Math.max(0, (s.ammo?.[weapDef.ammoType]||0) - 1) };
  }

  s.noise = Math.min(10, (s.noise||0) + (weapDef?.noise || 3));

  // ── PLAYER ATTACK ──────────────────────────────────
  const pRoll      = Math.floor(Math.random() * 20) + 1;
  const isFirstRound = !banditObj._hitCount; // chưa bị đánh lần nào = round đầu

  // ambusher: inject +2 hit +1 dmg vào lượt đầu nếu player chưa detect (advantage = false)
  // Police: doc_nguoi — ambush_immune (không bị ambush bonus)
  const policeAmbushImmune = state.job === 'police' &&
    DW_getSkillEffect(state, 'doc_nguoi', 'ambush_immune');
  const ambushBonus = (personality === 'ambusher' && isFirstRound && !opts.advantage && !policeAmbushImmune)
    ? BANDIT_PERSONALITY.ambusher.ambushHitBonus : 0;

  const advantage = opts.advantage ? 3 : 0;
  const hitBonus  = weapSkill + (weapDef?.hitBonus || 0)
                  + (state.job === 'soldier' ? 1 : 0)
                  + advantage
                  - ((state.statuses||[]).includes('fear') ? 2 : 0);

  // Police: doc_nguoi — advantage_vs_bandit (luôn có advantage)
  let policeHitBonus = 0;
  if (state.job === 'police') {
    if (DW_getSkillEffect(state, 'doc_nguoi', 'advantage_vs_bandit')) policeHitBonus += 3;
    const dcBonus = DW_getSkillEffect(state, 'doc_nguoi', 'bandit_dc_bonus') || 0;
    policeHitBonus += dcBonus;
  }
  const pTotal    = pRoll + hitBonus + policeHitBonus;
  const pDC       = banditObj.dc || 10;
  const pHit      = pTotal >= pDC;

  let msgs = [];
  let updatedBandit = { ...banditObj, _hitCount: (banditObj._hitCount || 0) + 1 };

  if (pHit) {
    let dmgOut = (weapDef?.baseDmg || 1) + weapSkill * 0.5 + (state.job === 'soldier' ? 1 : 0);
    if (opts.heavy)     dmgOut *= 1.5;
    if (opts.advantage) dmgOut *= 1.3;
    dmgOut = Math.max(1, Math.ceil(dmgOut) - (banditObj.armor || 0));

    updatedBandit.hp = Math.max(0, updatedBandit.hp - dmgOut);
    msgs.push(`🎲 ${pRoll}+${hitBonus}=${pTotal} vs DC${pDC} — Trúng ${dmgOut} vào ${banditObj.name}! (còn ${updatedBandit.hp} HP)`);

    // Weapon durability
    if (s.equip?.weapon && s.equipDur?.weapon != null) {
      const nd = Math.max(0, s.equipDur.weapon - 1);
      s.equipDur = { ...s.equipDur, weapon: nd };
      if (nd === 0) {
        msgs.push(`${DW_itemName(s.equip.weapon)} đã hỏng!`);
        s.equip = { ...s.equip, weapon: null };
      }
    }
    s = DW_grantXp(s, weapDef?.type || 'fitness', 5);
  } else {
    msgs.push(`🎲 ${pRoll}+${hitBonus}=${pTotal} vs DC${pDC} — Trượt!`);
    s = DW_grantXp(s, weapDef?.type || 'fitness', 1);
  }

  // ── DESERTER EARLY FLEE CHECK (personality hook) ──
  if (personality === 'deserter') {
    const { state: ds, msgs: dm, updatedBandit: db, earlyFlee } =
      behavior(s, updatedBandit, { isFirstRound, advantage: !!opts.advantage, banditHit: false });
    if (earlyFlee) {
      s = ds; msgs = [...msgs, ...dm];
      s = DW_grantXp(s, 'fitness', 3);
      return { state: { ...s, banditRep: s.banditRep || 0 }, msg: msgs.join(' '), banditFled: true, ok: true };
    }
  }

  // ── STANDARD FLEE CHECK ───────────────────────────
  // Police: ap_dao_uy_quyen — intimidate_flee: thêm cơ hội flee
  let fleeThreshold = updatedBandit.fleeHp || 2;
  if (s.job === 'police') {
    const intimidateFlee = DW_getSkillEffect(s, 'ap_dao_uy_quyen', 'intimidate_flee') || 0;
    const repDeserter    = DW_getSkillEffect(s, 'danh_tieng_canh_sat', 'reputation_deserter') || 0;
    // Tăng flee threshold nếu có uy quyền (bandit dễ bỏ chạy hơn)
    if (intimidateFlee > 0 && Math.random() < intimidateFlee) {
      fleeThreshold = Math.ceil((updatedBandit.maxHp || updatedBandit.hp) * 0.50); // flee ở 50%
      msgs.push(`😨 Uy quyền: ${banditObj.name} hoảng sợ!`);
    }
    if (repDeserter > 0 && personality === 'deserter' && Math.random() < repDeserter) {
      fleeThreshold = updatedBandit.hp + 1; // flee ngay
    }
    // Milestone: police_first_arrest (uy hiếp thành công lần đầu)
    if (updatedBandit.hp <= fleeThreshold) {
      s = DW_trackMilestoneCounter(s, 'police_intimidated', 1);
      s = DW_checkMilestone(s, 'police_first_arrest');
    }
  }

  if (updatedBandit.hp <= fleeThreshold) {
    msgs.push(`🏃 ${banditObj.name} bỏ chạy!`);
    s = DW_grantXp(s, 'fitness', 3);
    return { state: { ...s, banditRep: Math.max(0, s.banditRep||0) }, msg: msgs.join(' '), banditFled: true, ok: true };
  }

  // ── BANDIT DEAD ────────────────────────────────────
  if (updatedBandit.hp <= 0) {
    const loot = [...(updatedBandit.loot || [])];

    // cannibal: drop strange_meat + extra stress
    if (personality === 'cannibal') {
      loot.push(BANDIT_PERSONALITY.cannibal.deathDrop);
      s.stress = Math.min(100, (s.stress||0) + BANDIT_PERSONALITY.cannibal.stressOnKill);
      msgs.push(`😱 Thứ rơi ra từ người hắn... tốt hơn không nên nhìn.`);
    } else {
      s.stress = Math.min(100, (s.stress||0) + 8);
    }

    s.inventory = [...s.inventory, ...loot];
    s.banditRep = (s.banditRep || 0) + 1;
    s = DW_grantXp(s, weapDef?.type || 'fitness', updatedBandit.xpReward || 20);
    msgs.push(`💀 ${banditObj.name} bị hạ. Loot: ${loot.map(DW_itemName).join(', ')||'không có gì'}.`);

    // Police: ap_dao_uy_quyen — order_restored: hồi 10 AP + 2 HP khi hạ bandit
    if (s.job === 'police' && DW_getSkillEffect(s, 'ap_dao_uy_quyen', 'order_restored')) {
      s.ap = Math.min(DW_apMax(s), (s.ap || 0) + 10);
      s.hp = Math.min(s.maxHp, (s.hp || 0) + 2);
      msgs.push(`🚔 Trật Tự Lập Lại: +10 AP, +2 HP`);
    }
    // Police: ap_dao_uy_quyen — authority_area_stress: giảm stress khi hạ bandit
    if (s.job === 'police' && DW_getSkillEffect(s, 'ap_dao_uy_quyen', 'authority_area_stress')) {
      s.stress = Math.max(0, (s.stress||0) - 5);
      msgs.push(`Stress -5`);
    }
    // Police: nen_tang_tinh_than — stress_decay_combat
    if (s.job === 'police') {
      const cStress = DW_getSkillEffect(s, 'nen_tang_tinh_than', 'stress_decay_combat') || 0;
      if (cStress > 0) s.stress = Math.max(0, (s.stress||0) - cStress);
    }
    // Police: danh_tieng_canh_sat — legendary_cop: +30 AP, -20 stress khi hạ boss (bandit strong)
    // Police: xa_thu_canh_sat — legendary_cop (boss kill)
    if (s.job === 'police' && weapDef?.type === 'firearm' &&
        DW_getSkillEffect(s, 'xa_thu_canh_sat', 'legendary_cop') &&
        updatedBandit.xpReward >= 30) {
      s.ap = Math.min(DW_apMax(s), (s.ap || 0) + 30);
      s.stress = Math.max(0, (s.stress||0) - 20);
      msgs.push(`🏅 Cảnh Sát Huyền Thoại: +30 AP, -20 stress!`);
    }
    // Police synergy: kill_stress_recover
    if (s.job === 'police' && DW_hasSynergy(s, 'police_deterrence')) {
      s.stress = Math.max(0, (s.stress||0) - 2);
    }
    // Milestone tracking
    if (s.job === 'police') {
      s = DW_trackMilestoneCounter(s, 'police_kills', 1);
      s = DW_checkMilestone(s, 'police_five_kills');
      // police_first_arrest: dùng uy quyền thành công lần đầu — tracked ở bandit flee
    }
    return { state: s, msg: msgs.join(' '), banditKilled: true, ok: true };
  }

  // ── BANDIT COUNTER-ATTACK ──────────────────────────
  const bRoll = Math.floor(Math.random() * 20) + 1;
  const bDC   = 9;
  const bHit  = bRoll >= bDC;

  if (bHit) {
    // cannibal: inject +2 damage bonus
    const extraDmgIn = (personality === 'cannibal') ? BANDIT_PERSONALITY.cannibal.dmgBonus : 0;
    let rawDmg     = (updatedBandit.damage || 2) + extraDmgIn + ambushBonus;

    // Police: ap_dao_uy_quyen — authority_damage_reduce
    if (s.job === 'police') {
      const authReduce = DW_getSkillEffect(s, 'ap_dao_uy_quyen', 'authority_damage_reduce') || 0;
      const repFear    = DW_getSkillEffect(s, 'danh_tieng_canh_sat', 'reputation_fear') || 0;
      const totalFear  = authReduce + repFear;
      if (totalFear > 0) rawDmg = Math.max(0, Math.ceil(rawDmg * (1 - totalFear)));
      // Police: che_chan_dong_doi + barricade protection
      const tileKeyB = `${s.x},${s.y}`;
      const tileB    = s.tiles?.[tileKeyB];
      if ((tileB?.barricade || 0) >= 2) {
        const shieldB = DW_getSkillEffect(s, 'che_chan_dong_doi', 'protect_incoming') || 0;
        if (shieldB > 0) rawDmg = Math.max(0, Math.ceil(rawDmg * (1 - shieldB)));
      }
    }

    const netDmg     = Math.max(0, rawDmg - DW_getArmorBonus(s));
    s.hp = Math.max(0, s.hp - netDmg);
    if (s.hp <= 0) s.gameOver = true;
    msgs.push(`${banditObj.name} phản công — nhận ${netDmg} sát thương!`);

    // ── PERSONALITY BEHAVIOR HOOK (post-hit) ────────
    const ctx = { banditHit: true, isFirstRound, advantage: !!opts.advantage, extraDmgIn };
    // Police: doc_nguoi — scavenger_trap immunity
    if (s.job === 'police' && personality === 'scavenger' &&
        DW_getSkillEffect(s, 'doc_nguoi', 'scavenger_trap')) {
      msgs.push(`👁️ Đọc Người: nhận ra scavenger — ngăn chặn ăn cắp!`);
    } else {
      const { state: bs, msgs: bm } = behavior(s, updatedBandit, ctx);
      s = bs; msgs = [...msgs, ...bm];
    }

  } else {
    msgs.push(`${banditObj.name} phản công — trượt!`);
    // ambusher: hook khi miss (intro text lượt đầu)
    if (personality === 'ambusher') {
      const { msgs: bm } = behavior(s, updatedBandit, { banditHit: false, isFirstRound, advantage: !!opts.advantage });
      msgs = [...msgs, ...bm];
    }
  }

  // Surrender check — player HP < 30%
  const surrenderThreshold = Math.ceil(s.maxHp * 0.3);
  if (s.hp <= surrenderThreshold && !s.gameOver) {
    const surrenderLine = personality === 'cannibal'
      ? `${banditObj.name}: ...ngon đấy.`
      : `${banditObj.name}: Bỏ vũ khí xuống. Bây giờ.`;
    msgs.push(`☠️ "${surrenderLine}"`);
    return {
      state: { ...s, _banditSurrenderPending: true, _banditActive: updatedBandit },
      msg: msgs.join(' '),
      surrenderPending: true,
      banditActive: updatedBandit,
      ok: true,
    };
  }

  return {
    state: { ...s, _banditActive: updatedBandit },
    msg: msgs.join(' '),
    banditActive: updatedBandit,
    ok: true,
  };
}

// ══════════════════════════════════════════════════════
// MECHANIC: TRAP SYSTEM
// DW_placeTrap  — đặt bẫy tại tile hiện tại
// DW_triggerTrap — gọi khi zombie vào tile có bẫy
// state.tileTrap[tileKey] = { damage, type, reset, cooldown }
// ══════════════════════════════════════════════════════

function DW_placeTrap(state, trapType) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới đặt bẫy được.', ok: false };

  const trapUnlock = DW_getSkillEffect(state, 'bay_co_hoc', 'trap_unlock');
  if (!trapUnlock)
    return { state, msg: 'Cần kỹ năng Bẫy Cơ Học để đặt bẫy.', ok: false };

  const trapDamage = DW_getSkillEffect(state, 'bay_co_hoc', 'trap_damage') || 3;
  const trapReset  = DW_getSkillEffect(state, 'bay_co_hoc', 'trap_reset')  || false;
  const trapChain  = DW_getSkillEffect(state, 'bay_co_hoc', 'trap_chain')  || false;
  const trapArea   = DW_getSkillEffect(state, 'bay_co_hoc', 'trap_area')   || false;

  // Synergy: fortress_maker — trap damage +25%
  const synergyBonus = DW_hasSynergy(state, 'fortress_maker') ? 0.25 : 0;
  const finalDamage  = Math.ceil(trapDamage * (1 + synergyBonus));

  const tileKey  = `${state.x},${state.y}`;
  const apCost   = 1;

  if (state.ap < apCost)
    return { state, msg: `Cần ${apCost} ĐHĐ để đặt bẫy.`, ok: false };

  const trap = {
    type:    trapType || 'spike_trap',
    damage:  finalDamage,
    reset:   trapReset,
    chain:   trapChain,
    area:    trapArea,
    active:  true,
    cooldown: 0,
  };

  let s = {
    ...state,
    ap: state.ap - apCost,
    tileTrap: {
      ...(state.tileTrap || {}),
      [tileKey]: trap,
    },
  };
  s.log = [`🪤 Đặt bẫy ${trap.type} (+${finalDamage} dmg).`, ...(s.log||[])];
  return { state: s, msg: `Đặt bẫy thành công tại tile hiện tại.`, ok: true };
}

// ── Trigger trap khi zombie vào tile ──────────────────
// Gọi từ DW_tickNoise hoặc DW_fight khi combat bắt đầu tại tile có bẫy
function DW_triggerTrap(state, objId) {
  const tileKey = `${state.x},${state.y}`;
  const trap    = state.tileTrap?.[tileKey];
  if (!trap || !trap.active) return { triggered: false, state, dmg: 0 };

  const tile    = state.tiles?.[tileKey];
  const objs    = tile?.objects || [];
  const objIdx  = objs.findIndex(o => o.id === objId);
  const enemy   = objIdx >= 0 ? objs[objIdx] : null;

  let dmg = trap.damage;

  // chain: kích hoạt bẫy kế cận (lát sau thêm AoE)
  // area: damage toàn tile — tăng dmg thêm 50%
  if (trap.area) dmg = Math.ceil(dmg * 1.5);

  // Cập nhật trap state
  const newTrap = trap.reset
    ? { ...trap, active: false, cooldown: 2 } // reset sau 2 lượt
    : { ...trap, active: false };              // hủy sau 1 lần

  let s = {
    ...state,
    tileTrap: { ...(state.tileTrap || {}), [tileKey]: newTrap },
  };

  // Apply damage lên enemy nếu có
  if (enemy) {
    const updatedObjs = [...objs];
    const enemyHp = (enemy.hp || 5) - dmg;
    if (enemyHp <= 0) {
      updatedObjs.splice(objIdx, 1); // loại bỏ zombie đã chết
      s = {
        ...s,
        tiles: { ...s.tiles, [tileKey]: { ...tile, objects: updatedObjs } },
      };
      s.log = [`🪤 Bẫy ${trap.type} kích hoạt! ${enemy.name || 'Zombie'} nhận ${dmg} dmg → chết.`, ...(s.log||[])];
    } else {
      updatedObjs[objIdx] = { ...enemy, hp: enemyHp };
      s = {
        ...s,
        tiles: { ...s.tiles, [tileKey]: { ...tile, objects: updatedObjs } },
      };
      s.log = [`🪤 Bẫy ${trap.type} kích hoạt! ${enemy.name || 'Zombie'} nhận ${dmg} dmg (còn ${enemyHp} HP).`, ...(s.log||[])];
    }
  } else {
    s.log = [`🪤 Bẫy ${trap.type} kích hoạt! (${dmg} dmg).`, ...(s.log||[])];
  }

  return { triggered: true, state: s, dmg };
}

// ── Trap Network extension ────────────────────────────
// trap_network (bay_co_hoc lv10): bẫy trong radius 2 kết nối.
// Khi 1 bẫy trigger, các bẫy kề cận cũng auto-trigger.
// Gọi sau DW_triggerTrap khi cần chain.
function DW_triggerTrapNetwork(state, fromTileKey) {
  if (!DW_getSkillEffect(state, 'bay_co_hoc', 'trap_network')) return { state, triggered: false };

  let s = { ...state };
  let chainCount = 0;

  // Radius 2: kiểm tra các tile kề (simplify: 8 tile xung quanh + radius 2)
  const [fx, fy] = fromTileKey.split(',').map(Number);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nk = `${fx+dx},${fy+dy}`;
      const nTrap = s.tileTrap?.[nk];
      if (!nTrap?.active) continue;

      // Chain trigger — không áp dụng lại trap_network để tránh vòng lặp vô hạn
      const chainResult = DW_triggerTrap(s, null); // trigger không có enemy cụ thể
      if (chainResult.triggered) {
        s = chainResult.state;
        chainCount++;
      }
    }
  }

  if (chainCount > 0) s.log = [`🕸️ Trap Network: ${chainCount} bẫy liên kết kích hoạt!`, ...(s.log||[])];
  return { state: s, triggered: chainCount > 0, chainCount };
}

// ══════════════════════════════════════════════════════
// MECHANIC: ADVANCED COMBAT FUNCTIONS
// DW_mobileCover   — dựng barricade tạm thời 1 AP (mobile_defense)
// DW_siegebreaker  — kích hoạt tất cả bẫy xung quanh khi base bị tấn công
// DW_engineerAura  — NPC đồng hành nhận lợi ích từ defended zone
// ══════════════════════════════════════════════════════

// ── DW_mobileCover ────────────────────────────────────
// Mobile Defense (ky_su_chien_truong lv3): dựng barricade tạm thời trong combat.
// 1 AP, block 1 đòn tấn công. Biến mất sau khi bị đánh hoặc hết ngày.
function DW_mobileCover(state) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới dùng Mobile Defense được.', ok: false };

  const hasMobile = DW_getSkillEffect(state, 'ky_su_chien_truong', 'mobile_defense');
  if (!hasMobile)
    return { state, msg: 'Cần kỹ năng Kỹ Sư Chiến Trường lv3.', ok: false };

  if (state.mobileCoverActive)
    return { state, msg: 'Mobile Cover đã đang hoạt động.', ok: false };

  const AP_COST = 1;
  if (state.ap < AP_COST)
    return { state, msg: `Cần ${AP_COST} ĐHĐ để dựng Mobile Cover.`, ok: false };

  let s = {
    ...state,
    ap: state.ap - AP_COST,
    mobileCoverActive: true,
    mobileCoverHp: 1, // block 1 đòn
  };
  s.log = ['🧱 Mobile Cover: barricade tạm thời dựng lên! Block 1 đòn kế tiếp.', ...(s.log||[])];
  return { state: s, msg: 'Mobile Cover hoạt động — block đòn kế tiếp.', ok: true };
}

// ── DW_siegebreaker ───────────────────────────────────
// Siegebreaker (ky_su_chien_truong lv5): khi base bị tấn công (baseUnderRaid),
// tự động kích hoạt tất cả bẫy trong tile base.
function DW_siegebreaker(state) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới dùng Siegebreaker.', ok: false };

  const hasSiege = DW_getSkillEffect(state, 'ky_su_chien_truong', 'siegebreaker');
  if (!hasSiege)
    return { state, msg: 'Cần Kỹ Sư Chiến Trường lv5 để dùng Siegebreaker.', ok: false };

  if (!state.baseUnderRaid && !state.pendingBaseEvent)
    return { state, msg: 'Không có sự kiện tấn công base.', ok: false };

  const tileKey = `${state.x},${state.y}`;
  const traps = state.tileTrap || {};
  const activeTrapKeys = Object.keys(traps).filter(k => traps[k].active);

  if (activeTrapKeys.length === 0)
    return { state, msg: 'Không có bẫy đang hoạt động trong tile.', ok: false };

  let s = { ...state };
  let totalDmg = 0;
  for (const tk of activeTrapKeys) {
    const tr = DW_triggerTrap(s, null);
    if (tr.triggered) { s = tr.state; totalDmg += tr.dmg; }
  }

  // Synergy: fortress_maker adds fortify bonus to trap damage
  if (DW_hasSynergy(state, 'fortress_maker')) {
    totalDmg = Math.ceil(totalDmg * 1.25);
  }

  s.log = [`⚡ Siegebreaker! Kích hoạt ${activeTrapKeys.length} bẫy: ${totalDmg} tổng damage.`, ...(s.log||[])];
  return { state: s, msg: `Siegebreaker: ${totalDmg} damage tổng cộng.`, ok: true, totalDmg };
}

// ── DW_engineerAura ───────────────────────────────────
// Engineer Aura (ky_su_chien_truong lv7): NPC đồng hành trong defended zone
// nhận giảm 30% damage. Đây là state-flag — UI/NPC combat đọc để áp dụng.
// Returns aura bonus info, không thay đổi state.
function DW_engineerAura(state) {
  if (state.job !== 'mechanic') return { active: false };

  const hasAura = DW_getSkillEffect(state, 'ky_su_chien_truong', 'engineer_aura');
  if (!hasAura) return { active: false };

  const zone = typeof DW_getDefendedZone === 'function' ? DW_getDefendedZone(state) : null;
  if (!zone?.active) return { active: false };

  return {
    active: true,
    damageReduction: 0.30,     // NPC nhận -30% damage
    fortifyBonus: zone.fortifyBonus || 0,
  };
}
