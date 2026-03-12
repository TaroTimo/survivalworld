// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-inventory.js  v3
// Item usage, equip/unequip, drop, loot search,
// crafting, repair, ammo loading
// v2: DW_grantXp → DW_grantCharacterXp với đúng action type
//     + SKILL_UNLOCK_EFFECTS integration (heal bonus, triage, craft save)
//     + milestone tracking (scavenge, craft, repair, books)
// v3: LOOT RARITY SYSTEM
//     + state.itemRarity[] — parallel array với state.inventory[]
//     + state.equipRarity{} — rarity của equipped items theo slot
//     + DW_normalizeRarityArray — đảm bảo sync sau legacy operations
//     + DW_getItemRarity(state, invIdx) — đọc rarity an toàn
//     + DW_rollRarity(poolKey) — roll rarity từ RARITY_POOLS
//     + DW_rollLootFromTable(table, poolKey, count) — single loot source
//     + DW_resolveEnemyLoot(enemyType) — loot khi zombie chết
//     + DW_addRarityItem(state, itemId, rarityId, itemName) — thêm item có rarity
//     + DW_getRarityStatMul(rarityId) — stat multiplier
//     + DW_getItemBaseDmg / DW_getItemArmorBonus / DW_getItemDurMax — stat với rarity
//     Backward compat: code cũ dùng inventory string[] vẫn hoạt động 100%
// Dependencies: deadworld-data.js (RARITY_TIERS, RARITY_POOLS, ENEMY_LOOT), engine-skills.js
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// RARITY SYSTEM v3
// ══════════════════════════════════════════════════════

// ── RARITY ARRAY SYNC ─────────────────────────────────
// Đảm bảo itemRarity[] luôn cùng độ dài với inventory[].
// Gọi ở đầu mọi hàm đọc/ghi rarity để tự heal nếu legacy
// code đã thêm item mà không update itemRarity.
function DW_normalizeRarityArray(state) {
  const inv = state.inventory || [];
  const rar = state.itemRarity || [];
  if (rar.length === inv.length) return state;
  return { ...state, itemRarity: inv.map((_, i) => rar[i] || 'common') };
}

// ── RARITY READ ───────────────────────────────────────
// Đọc rarity của item tại invIdx, fallback về 'common'.
function DW_getItemRarity(state, invIdx) {
  return (state.itemRarity || [])[invIdx] || 'common';
}

// Trả về RARITY_TIERS object cho rarityId, fallback về common.
function DW_getRarityTier(rarityId) {
  if (typeof RARITY_TIERS === 'undefined') return { id: 'common', name: 'Thường', color: '#aaaaaa', statMul: 1.0 };
  return RARITY_TIERS[rarityId] || RARITY_TIERS['common'];
}

// Label dạng "[Cực Hiếm] " cho rarityId — rỗng nếu là common.
function DW_getRarityLabel(rarityId) {
  if (!rarityId || rarityId === 'common') return '';
  const tier = DW_getRarityTier(rarityId);
  return `[${tier.name}] `;
}

// ── STAT RESOLUTION WITH RARITY ───────────────────────
// Stat được tính on-the-fly từ ITEM_DB def × statMul.
// Chỉ nhân: baseDmg, armorBonus, durMax.
// Không nhân: hitBonus, stealthMul, ammoCount, useEffect.

function DW_getRarityStatMul(rarityId) {
  return DW_getRarityTier(rarityId).statMul || 1.0;
}

// Damage vũ khí sau rarity (dùng trong combat).
// Tự động đọc equipRarity của slot weapon.
function DW_getWeaponDmgWithRarity(state) {
  const weapId  = state.equip?.weapon;
  if (!weapId) return 0;
  if (typeof ITEM_DB === 'undefined' || !ITEM_DB[weapId]) return 0;
  const base    = ITEM_DB[weapId].baseDmg || 0;
  const rarityId = state.equipRarity?.weapon || 'common';
  return Math.floor(base * DW_getRarityStatMul(rarityId));
}

// Armor bonus tổng từ tất cả slot sau rarity.
function DW_getArmorBonusWithRarity(state) {
  if (typeof EQUIP_DEFS === 'undefined') return 0;
  let total = 0;
  for (const slot of ['body', 'head']) {
    const id     = state.equip?.[slot];
    if (!id) continue;
    const base   = EQUIP_DEFS[id]?.armorBonus || 0;
    const rarity = state.equipRarity?.[slot] || 'common';
    total += Math.floor(base * DW_getRarityStatMul(rarity));
  }
  return total;
}

// durMax của equipped item với rarity scaling.
function DW_getEquipDurMaxWithRarity(state, slot) {
  const id = state.equip?.[slot];
  if (!id) return 0;
  const def = (typeof EQUIP_DEFS !== 'undefined') ? (EQUIP_DEFS[id] || {}) : {};
  const base = def.durMax || 100;
  const rarity = state.equipRarity?.[slot] || 'common';
  return Math.floor(base * DW_getRarityStatMul(rarity));
}

// ── RARITY ROLL ───────────────────────────────────────
// Roll một rarityId từ pool key (định nghĩa trong RARITY_POOLS).
function DW_rollRarity(poolKey) {
  if (typeof RARITY_POOLS === 'undefined') return 'common';
  const pool = RARITY_POOLS[poolKey] || RARITY_POOLS['zombie_normal'] || ['common'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── LOOT ROLL ─────────────────────────────────────────
// SINGLE SOURCE OF TRUTH cho toàn bộ loot logic.
// table = [{ id: 'bandage', w: 30 }, ...]
// Trả về array [{ id, rarity }]
function DW_rollLootFromTable(table, poolKey, count = 1) {
  if (!table || table.length === 0) return [];
  const results = [];
  const totalW  = table.reduce((s, e) => s + (e.w || 1), 0);
  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalW;
    for (const entry of table) {
      roll -= (entry.w || 1);
      if (roll <= 0) {
        results.push({ id: entry.id, rarity: DW_rollRarity(poolKey) });
        break;
      }
    }
  }
  return results;
}

// ── ENEMY LOOT RESOLUTION ─────────────────────────────
// Gọi từ engine-combat.js sau khi enemy chết.
// Trả về array [{ id, rarity }] — caller add vào state qua DW_addRarityItem.
function DW_resolveEnemyLoot(enemyType) {
  if (typeof ENEMY_LOOT === 'undefined' || !ENEMY_LOOT[enemyType]) return [];
  const def   = ENEMY_LOOT[enemyType];
  const [min, max] = def.dropCount || [0, 1];
  const count = min + Math.floor(Math.random() * (max - min + 1));
  if (count <= 0) return [];
  return DW_rollLootFromTable(def.table, def.poolKey, count);
}

// ── ADD ITEM WITH RARITY ───────────────────────────────
// Thêm item vào inventory kèm rarity.
// Backward compat: DW_addRarityItem(state, 'bandage') → rarity='common'.
// Khi gọi: normalize trước để heal misalignment từ legacy code.
function DW_addRarityItem(state, itemId, rarityId = 'common', itemNameOverride = null) {
  const s0      = DW_normalizeRarityArray(state);
  const itemDef = (typeof DW_item === 'function') ? DW_item(itemId) : null;
  const name    = itemNameOverride || itemDef?.name || itemId;
  const label   = DW_getRarityLabel(rarityId);
  const msg     = `Nhặt được: ${label}${name}.`;

  const s = {
    ...s0,
    inventory:  [...s0.inventory, itemId],
    itemRarity: [...s0.itemRarity, rarityId],
    log: [msg, ...(s0.log || [])]
  };
  return { ok: true, state: s, msg };
}

// ── EQUIP ITEM WITH RARITY (rarity-aware override) ────
// Dùng thay DW_equipItem khi cần giữ rarity qua equip/unequip.
// Legacy DW_equipItem vẫn hoạt động — chỉ mất rarity info.
function DW_equipRarityItem(state, invIdx, slot) {
  const s0      = DW_normalizeRarityArray(state);
  const itemId  = s0.inventory[invIdx];
  if (!itemId) return { ok: false, state, msg: 'Không tìm thấy vật phẩm.' };

  const itemDef = (typeof ITEM_DB !== 'undefined') ? (ITEM_DB[itemId] || {}) : {};
  if (itemDef.slot && itemDef.slot !== slot)
    return { ok: false, state, msg: `${itemDef.name || itemId} không vào được ô ${slot}.` };

  const rarity  = s0.itemRarity[invIdx] || 'common';
  const prevId  = s0.equip?.[slot];
  const prevRar = s0.equipRarity?.[slot] || 'common';

  let newInv = s0.inventory.filter((_, i) => i !== invIdx);
  let newRar = s0.itemRarity.filter((_, i) => i !== invIdx);
  if (prevId) { newInv = [...newInv, prevId]; newRar = [...newRar, prevRar]; }

  // Mechanic perk: durMax +25%
  const baseDurMax = (typeof EQUIP_DEFS !== 'undefined') ? (EQUIP_DEFS[itemId]?.durMax || 100) : 100;
  const scaledDur  = Math.floor(DW_getEquipDurMaxWithRarity({ equip: { [slot]: itemId }, equipRarity: { [slot]: rarity } }, slot));
  const mechDur    = (state.job === 'mechanic') ? Math.floor(scaledDur * 1.25) : scaledDur;

  const label = DW_getRarityLabel(rarity);
  const msg   = `Trang bị ${label}${itemDef.name || itemId} → [${slot}].`;

  const s = {
    ...s0,
    inventory:   newInv,
    itemRarity:  newRar,
    equip:       { ...(s0.equip || {}), [slot]: itemId },
    equipDur:    { ...(s0.equipDur || {}), [slot]: mechDur },
    equipRarity: { ...(s0.equipRarity || {}), [slot]: rarity },
    log: [msg, ...(s0.log || [])]
  };
  return { ok: true, state: s, msg };
}

// ── UNEQUIP WITH RARITY ───────────────────────────────
function DW_unequipRaritySlot(state, slot) {
  const s0     = DW_normalizeRarityArray(state);
  const itemId = s0.equip?.[slot];
  if (!itemId) return { ok: false, state, msg: 'Slot này trống.' };

  const rarity = s0.equipRarity?.[slot] || 'common';
  const newER  = { ...(s0.equipRarity || {}) };
  delete newER[slot];
  const newED  = { ...(s0.equipDur || {}) };
  delete newED[slot];

  const itemDef = (typeof ITEM_DB !== 'undefined') ? (ITEM_DB[itemId] || {}) : {};
  const label   = DW_getRarityLabel(rarity);
  const msg     = `Tháo ${label}${itemDef.name || itemId}.`;

  const s = {
    ...s0,
    inventory:   [...s0.inventory, itemId],
    itemRarity:  [...s0.itemRarity, rarity],
    equip:       { ...(s0.equip || {}), [slot]: null },
    equipDur:    newED,
    equipRarity: newER,
    log: [msg, ...(s0.log || [])]
  };
  return { ok: true, state: s, msg };
}

// ── UPGRADE WEAPON (rarity-aware) ────────────────────
// Thêm delta stat lên equipped weapon — rarity KHÔNG thay đổi.
// Dùng thay vì ghi trực tiếp vào weaponOverrides khi cần log rarity.
function DW_logUpgradeWithRarity(state, slot) {
  const id     = state.equip?.[slot];
  if (!id) return state;
  const rarity = state.equipRarity?.[slot] || 'common';
  const label  = DW_getRarityLabel(rarity);
  const def    = (typeof ITEM_DB !== 'undefined') ? (ITEM_DB[id] || {}) : {};
  const msg    = `🔨 [${label || 'Thường'}${def.name || id}] được nâng cấp. Rarity giữ nguyên.`;
  return { ...state, log: [msg, ...(state.log || [])] };
}

// ── USE ITEM ──────────────────────────────────────────
function DW_useItem(state, itemId) {
  const itemDef = DW_item(itemId);
  if (!itemDef)        return { state, msg: `Item không tồn tại: ${itemId}`, ok: false };
  if (!itemDef.usable) return { state, msg: `${itemDef.name} không thể dùng trực tiếp.`, ok: false };

  const idx = DW_invFindId(state.inventory, itemId);
  if (idx === -1) return { state, msg: `Bạn không có ${itemDef.name}.`, ok: false };

  // triage_mode (firstaid lv7): dùng item y tế không tốn AP khi HP < 30%
  const isMedical   = itemDef.type === 'medical';
  const triageMode  = isMedical && DW_getSkillEffect(state, 'firstaid', 'triage_mode');
  const lowHp       = state.hp < state.maxHp * 0.3;
  const apCost      = (triageMode && lowHp) ? 0 : 0; // medical items hiện không tốn AP — giữ nguyên

  // heal_free_when_hidden synergy (medic_runner): dùng y tế miễn phí khi ẩn mình
  // (flag state.isHidden được set bởi engine-world khi player ở tile stealth)

  let s  = { ...state, inventory: state.inventory.filter((_,i) => i !== idx) };
  const fx   = itemDef.useEffect || {};
  const msgs = [];

  if (fx.hp) {
    let heal = fx.hp;

    // firstaid skill: heal_bonus tăng theo % số HP nhận được
    const healBonus = DW_getSkillEffect(s, 'firstaid', 'heal_bonus');
    heal = Math.floor(heal * (1 + healBonus));

    // skillScale: firstaid level cộng thêm HP (vẫn giữ mechanic cũ, additive)
    if (fx.skillScale === 'firstaid') heal += (s.skills?.firstaid || 0);

    // Nurse job perk: thêm 50% (stacks với skill bonus)
    if (s.job === 'nurse') heal = Math.ceil(heal * 1.5);

    // bandage_efficiency (firstaid lv4+): băng gạc hiệu quả hơn
    const bandageEff = DW_getSkillEffect(s, 'firstaid', 'bandage_efficiency');
    if (itemDef.tags?.includes('heal') && bandageEff > 1) {
      heal = Math.ceil(heal * (bandageEff / 1)); // áp dụng multiplier nếu > 1
    }

    // over_heal (firstaid lv10 mastery): HP có thể vượt maxHP +5
    const overHeal = DW_getSkillEffect(s, 'firstaid', 'over_heal');
    const hpCap    = overHeal ? s.maxHp + 5 : s.maxHp;
    s.hp = Math.min(hpCap, s.hp + heal);
    msgs.push(`HP +${heal}`);
  }

  if (fx.hunger) { s.hunger = Math.min(10, s.hunger + fx.hunger); msgs.push(`Hunger +${fx.hunger}`); }
  if (fx.thirst) { s.thirst = Math.min(10, s.thirst + fx.thirst); msgs.push(`Thirst +${fx.thirst}`); }

  if (fx.stress) {
    // morale_meal signature skill (cook): bữa ăn nấu chín giảm stress thêm
    const moraleMeal = DW_hasSignatureSkill(s, 'morale_meal');
    const stressFx   = (moraleMeal && fx.stress < 0) ? fx.stress * 2 : fx.stress;
    s.stress = Math.max(0, Math.min(100, s.stress + stressFx));
    msgs.push(`Stress ${stressFx}`);
  }

  if (fx.depression) s.depression = Math.max(0, s.depression + fx.depression);
  if (fx.removesStatus) { s = DW_removeStatus(s, fx.removesStatus); msgs.push(`Hết ${fx.removesStatus}`); }

  // status_cure_bonus (firstaid lv3+): xóa thêm 1 debuff ngẫu nhiên khi dùng medkit
  const cureBonusActive = isMedical && DW_getSkillEffect(s, 'firstaid', 'status_cure_bonus');
  if (cureBonusActive && itemId === 'medkit' && (s.statuses||[]).length > 0) {
    const randomStatus = s.statuses[Math.floor(Math.random() * s.statuses.length)];
    s = DW_removeStatus(s, randomStatus);
    msgs.push(`🩹 Bonus cure: ${randomStatus} bị xóa`);
  }

  // Legacy: skillXP field trong item (giữ tương thích — hiếm dùng)
  if (fx.skillXP) {
    for (const [sk, xp] of Object.entries(fx.skillXP)) {
      s = DW_grantCharacterXp(s, 'scavenge', xp);
    }
  }

  // Milestone tracking: đọc sách (teacher milestone)
  if (itemId === 'survival_book' || itemDef.tags?.includes('book')) {
    s = { ...s, milestones: { ...(s.milestones||{}), read_survival_book: true } };
    s = DW_checkMilestone(s, 'teacher_first_lesson');
    s = DW_trackMilestoneCounter(s, 'books_collected', 1);
    s = DW_checkMilestone(s, 'teacher_knowledge_hub');
  }

  // Milestone: cook first meal (khi dùng item food đã nấu)
  if (itemDef.tags?.includes('cooked_food')) {
    s = { ...s, milestones: { ...(s.milestones||{}), cooked_first_meal: true } };
    s = DW_checkMilestone(s, 'cook_first_meal');
  }

  // Reveal side-effects
  const revealFx = {};
  if (fx.revealRadius)  revealFx.revealRadius  = fx.revealRadius;
  if (fx.revealTunnel)  revealFx.revealTunnel  = true;
  if (fx.revealKeyLocs) revealFx.revealKeyLocs = true;
  if (fx.revealStats)   revealFx.revealStats   = true;
  if (fx.attractZombies)revealFx.attractZombies = true;

  return { state: s, msg: `Dùng ${itemDef.name}. ${msgs.join(', ')}`, ok: true, revealFx };
}

// ── EQUIP ──────────────────────────────────────────────
function DW_equipItem(state, itemId) {
  const itemDef = DW_item(itemId);
  if (!itemDef?.equippable) return { state, msg: `${DW_itemName(itemId)} không thể trang bị.`, ok: false };

  const slot = itemDef.slot;
  const idx  = DW_invFindId(state.inventory, itemId);
  if (idx === -1) return { state, msg: `Không có ${itemDef.name} trong túi.`, ok: false };

  // Đọc rarity trước khi xóa item khỏi inventory
  const s0       = DW_normalizeRarityArray(state);
  const rarity   = s0.itemRarity[idx] || 'common';

  let inv    = s0.inventory.filter((_,i) => i !== idx);
  let invRar = s0.itemRarity.filter((_,i) => i !== idx);

  const equip      = { ...(s0.equip||{}) };
  const equipDur   = { ...(s0.equipDur||{}) };
  const equipRarity = { ...(s0.equipRarity||{}) };

  // Trả item đang mặc về inventory (kèm rarity cũ)
  if (equip[slot]) {
    inv    = [...inv, equip[slot]];
    invRar = [...invRar, equipRarity[slot] || 'common'];
  }

  // Mechanic perk: durMax +25% — nhân trên base rarity-scaled durMax
  let durMax = EQUIP_DEFS[itemId]?.durMax || 100;
  durMax = Math.floor(durMax * DW_getRarityStatMul(rarity));
  if (state.job === 'mechanic') durMax = Math.floor(durMax * 1.25);

  equip[slot]       = itemId;
  equipDur[slot]    = durMax;
  equipRarity[slot] = rarity;

  const label = DW_getRarityLabel(rarity);
  return {
    state: { ...s0, inventory: inv, itemRarity: invRar, equip, equipDur, equipRarity },
    msg: `Trang bị ${label}${itemDef.name} → [${EQUIP_SLOTS[slot]?.label || slot}].`,
    ok: true,
  };
}

function DW_unequipSlot(state, slot) {
  const itemId = state.equip?.[slot];
  if (!itemId) return { state, msg: 'Slot này trống.', ok: false };

  const s0       = DW_normalizeRarityArray(state);
  const rarity   = s0.equipRarity?.[slot] || 'common';
  const equip    = { ...(s0.equip||{}), [slot]: null };
  const equipDur = { ...(s0.equipDur||{}) };
  const equipRarity = { ...(s0.equipRarity||{}) };
  delete equipDur[slot];
  delete equipRarity[slot];

  return {
    state: {
      ...s0, equip, equipDur, equipRarity,
      inventory:  [...s0.inventory, itemId],
      itemRarity: [...s0.itemRarity, rarity],
    },
    msg: `Tháo ${DW_getRarityLabel(rarity)}${DW_itemName(itemId)}.`, ok: true,
  };
}

// ── DROP ───────────────────────────────────────────────
function DW_dropItem(state, itemId) {
  const idx = DW_invFindId(state.inventory, itemId);
  if (idx === -1) return { state, msg: 'Không tìm thấy item.', ok: false };
  const s0 = DW_normalizeRarityArray(state);
  return {
    state: {
      ...s0,
      inventory:  s0.inventory.filter((_,i) => i !== idx),
      itemRarity: s0.itemRarity.filter((_,i) => i !== idx),
    },
    msg: `Bỏ ${DW_itemName(itemId)}.`, ok: true,
  };
}


// ── SEARCH OBJECT ──────────────────────────────────────
function DW_searchObject(state, objId) {
  const tileKey = `${state.x},${state.y}`;
  const tile    = state.tiles[tileKey];
  if (!tile) return { state, msg: 'Không có tile.', ok: false };

  const objIdx = tile.objects.findIndex(o => o.id === objId);
  if (objIdx === -1) return { state, msg: 'Không tìm thấy vật thể.', ok: false };

  const obj    = tile.objects[objIdx];
  const objDef = OBJECT_DEFS[obj.type];
  if (!objDef || objDef.type !== 'container')
    return { state, msg: `${objDef?.label||obj.type} không phải container.`, ok: false };

  // ── Farmer: abundance — tile tự nhiên không cạn nhưng có daily cap ──
  // QUAN TRỌNG: check daily cap TRƯỚC obj.searched, vì abundance không mark searched=true
  // nên obj.searched luôn là false → lần 6 sẽ bypass nếu check sau.
  const NATURE_TILE_TYPES = new Set(['forest','field','plain','hill','beach']);
  const isNatureTile  = NATURE_TILE_TYPES.has(tile.type);
  const hasAbundance  = state.job === 'farmer' &&
    DW_getSkillEffect(state, 'tim_kiem_ban_nang', 'abundance');
  const abundanceCap  = hasAbundance
    ? (DW_getSkillEffect(state, 'tim_kiem_ban_nang', 'abundance_daily_cap') || 5)
    : 0;
  const abundanceUsed = state.tileAbundanceCount?.[tileKey] || 0;
  const isAbundanceSearch = hasAbundance && isNatureTile;

  if (isAbundanceSearch && abundanceUsed >= abundanceCap) {
    return { state, msg: `Đã khai thác tối đa ${abundanceCap} lần hôm nay. Trở lại ngày mai.`, ok: false };
  }

  if (obj.searched && !isAbundanceSearch) {
    return { state, msg: 'Đã lục soát rồi.', ok: false };
  }

  let apCost = objDef.searchAp || 2;

  // ── Farmer: revisit_search_bonus (lanh_tho_quen_thuoc lv3) — search tile quen -1 AP ──
  if (state.job === 'farmer') {
    const visits = state.tileVisits?.[tileKey] || 0;
    if (visits > 0 && DW_getSkillEffect(state, 'lanh_tho_quen_thuoc', 'revisit_search_bonus')) {
      apCost = Math.max(1, apCost - 1);
    }
  }

  // ── Farmer: all_noncombat_ap_reduce (tram_hay_khong_bang_tay_quen) ──
  if (state.job === 'farmer') {
    const noncombatReduce = DW_getSkillEffect(state, 'tram_hay_khong_bang_tay_quen', 'all_noncombat_ap_reduce');
    if (noncombatReduce > 0) apCost = Math.max(1, apCost - noncombatReduce);
  }

  // ── Farmer: free_action check ──
  const { canUseFree } = _DW_tryFreeAction(state, 'loot');
  const effectiveApCost = canUseFree ? 0 : apCost;

  if (state.ap < effectiveApCost)
    return { state, msg: `Cần ${effectiveApCost} ĐHĐ.`, ok: false };

  // ── Noise ──────────────────────────────────────────────
  const noiseReduction  = DW_getSkillEffect(state, 'sneak', 'noise_reduction');
  const stealthSearch   = DW_getSkillEffect(state, 'sneak', 'stealth_search');
  const isSmallObj      = objDef.searchAp <= 2;
  const noiseAdded      = stealthSearch && isSmallObj ? 0 : Math.max(0, 3 - noiseReduction);

  // ── Roll loot ──────────────────────────────────────────
  const lootTable = LOOT_TABLES[tile.type] || LOOT_TABLES.default;
  const rng       = mulberry32(hashCoord(state.gameId, state.x + objIdx * 1000, state.y + objIdx * 999 + (state.tileAbundanceCount?.[tileKey]||0) * 7));
  let   numLoot   = 1 + Math.floor(rng() * 3);

  // ── Farmer: nature_loot_bonus (tim_kiem_ban_nang lv2+) ──
  if (state.job === 'farmer' && isNatureTile) {
    const natureLootBonus = DW_getSkillEffect(state, 'tim_kiem_ban_nang', 'nature_loot_bonus');
    if (natureLootBonus > 0) numLoot += natureLootBonus;
  }

  // Xác định poolKey cho rarity dựa trên loại tile.
  // Tile giàu tài nguyên dùng pool tốt hơn.
  const RICH_TILE_TYPES = new Set(['hospital', 'armory', 'warehouse', 'lab']);
  const searchPoolKey = RICH_TILE_TYPES.has(tile.type) ? 'scavenge_rich' : 'scavenge_normal';

  const found     = [];  // string[] — item ids cho backward compat
  const foundRar  = [];  // parallel rarity array
  for (let i = 0; i < numLoot; i++) {
    const itemId  = weightedPick(lootTable, rng).id;
    const rarity  = DW_rollRarity(searchPoolKey);
    found.push(itemId);
    foundRar.push(rarity);
  }

  // ── Mechanic: scrap_bonus_chance (tai_che_ban_nang) ──────
  if (state.job === 'mechanic') {
    const scrapChance = DW_getSkillEffect(state, 'tai_che_ban_nang', 'scrap_bonus_chance');
    if (scrapChance > 0 && Math.random() < scrapChance) {
      const scrapPool = ['metal_scrap', 'wood_scrap', 'cloth_scrap'];
      found.push(scrapPool[Math.floor(Math.random() * scrapPool.length)]);
      foundRar.push('common'); // bonus scrap luôn common
    }
  }

  // ── Farmer: nature_tile_guaranteed_food (tim_kiem_ban_nang lv1) ──
  if (state.job === 'farmer' && isNatureTile &&
      DW_getSkillEffect(state, 'tim_kiem_ban_nang', 'nature_tile_guaranteed_food')) {
    const hasFood = found.some(id => {
      const def = DW_item(id);
      return def?.tags?.includes('food') || def?.tags?.includes('herb');
    });
    if (!hasFood) {
      const foodCandidates = (LOOT_TABLES[tile.type] || LOOT_TABLES.default)
        .filter(e => { const d = DW_item(e.id); return d?.tags?.includes('food'); });
      if (foodCandidates.length > 0) {
        found.push(weightedPick(foodCandidates, rng).id);
        foundRar.push('common');
      }
    }
  }

  // ── Farmer: rare_herb (tim_kiem_ban_nang lv7) ──────────
  if (state.job === 'farmer' && isNatureTile) {
    const herbChance = DW_getSkillEffect(state, 'tim_kiem_ban_nang', 'rare_herb');
    if (herbChance > 0 && Math.random() < herbChance) {
      found.push('herb_medicinal');
      foundRar.push('uncommon'); // rare herb tối thiểu uncommon
    }
  }

  // ── Farmer: daily_forage (tim_kiem_ban_nang lv5) ───────
  if (state.job === 'farmer' && isNatureTile &&
      DW_getSkillEffect(state, 'tim_kiem_ban_nang', 'daily_forage') &&
      !state.dailyForageUsed) {
    found.push('water_bottle');
    foundRar.push('common');
  }

  // ── Build new state ────────────────────────────────────
  const newObjs = isAbundanceSearch
    ? tile.objects
    : tile.objects.map((o,i) => i === objIdx ? {...o, searched:true} : o);

  // Merge found items + rarity vào state (normalize trước để tránh misalignment)
  const s0norm = DW_normalizeRarityArray(state);
  let s = {
    ...s0norm,
    ap:        Math.max(0, s0norm.ap - effectiveApCost),
    inventory: [...s0norm.inventory, ...found],
    itemRarity:[...s0norm.itemRarity, ...foundRar],
    noise:     Math.min(10, s0norm.noise + noiseAdded),
    tiles:     { ...s0norm.tiles, [tileKey]: { ...tile, objects: newObjs } },
    dailyForageUsed: (s0norm.dailyForageUsed || found.includes('water_bottle')),
  };

  // Track abundance daily count
  if (isAbundanceSearch) {
    s.tileAbundanceCount = {
      ...(state.tileAbundanceCount || {}),
      [tileKey]: (state.tileAbundanceCount?.[tileKey] || 0) + 1,
    };
  }

  // Track free action used
  if (canUseFree) {
    s.freeActionsUsed = (s.freeActionsUsed || 0) + 1;
    s.log = [`[Free] Lục soát miễn phí (${s.freeActionsUsed}).`, ...(s.log||[])];
  }

  s = DW_grantCharacterXp(s, 'scavenge');

  // Farmer: nature_xp_bonus (mot_voi_thien_nhien) — XP bonus khi explore tile tự nhiên
  if (state.job === 'farmer' && isNatureTile) {
    const natXpBonus = DW_getSkillEffect(s, 'mot_voi_thien_nhien', 'nature_xp_bonus');
    if (natXpBonus > 0) s = DW_grantCharacterXp(s, 'explore_tile', Math.ceil(3 * natXpBonus));
  }

  // zero_waste signature skill (cook)
  if (DW_hasSignatureSkill(s, 'zero_waste')) {
    const canItems = found.filter(id => id?.startsWith('canned_'));
    if (canItems.length > 0 && Math.random() < 0.30) {
      s.inventory = [...s.inventory, 'metal_scrap'];
      s.log = [`♻️ Zero Waste: hộp vỏ → kim loại phế liệu!`, ...(s.log||[])];
    }
  }

  // Milestone counters
  if (tile.type === 'street' && noiseAdded === 0)
    s = DW_trackMilestoneCounter(s, 'street_tiles_silent', 1);
  if (state.job === 'farmer' && isNatureTile)
    s = DW_trackMilestoneCounter(s, 'nature_tiles_searched', 1);

  const foundNames = found.map(DW_itemName).join(', ');
  return { state: s, msg: `${objDef.label}: ${foundNames || 'không có gì'}.`, found, ok: true };
}

// ── CRAFT ──────────────────────────────────────────────
function DW_craft(state, recipeId) {
  const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return { state, msg: `Không có công thức: ${recipeId}`, ok: false };

  for (const [sk, lvl] of Object.entries(recipe.skillReq || {})) {
    if ((state.skills?.[sk] || 0) < lvl)
      return { state, msg: `Cần ${DW_SKILLS[sk]?.name||sk} cấp ${lvl}.`, ok: false };
  }

  // ── Mechanic: nha_may_di_dong — field_craft_all (craft mọi nơi) ──
  const mechFieldCraftTier = state.job === 'mechanic'
    ? (DW_getSkillEffect(state, 'nha_may_di_dong', 'field_craft_tier') || 0)
    : 0;
  const mechToolbelt = state.job === 'mechanic' &&
    DW_getSkillEffect(state, 'nha_may_di_dong', 'toolbelt');

  // Mechanic: toolbelt — bypass toolbox requirement
  if (recipe.requiresTool && mechToolbelt) {
    // toolbelt = luôn được tính như có toolbox → không check
  } else if (recipe.requiresTool) {
    const hasTool = state.inventory?.some(id => ITEM_DB[id]?.tags?.includes('tool'));
    if (!hasTool) return { state, msg: 'Cần công cụ (toolbox).', ok: false };
  }

  // ── Farmer/Mechanic: field_craft — bypass requiresBase ──
  if (recipe.requiresBase && state.job === 'farmer') {
    const fieldCraft = DW_getSkillEffect(state, 'tay_quen_viec', 'field_craft');
    if (!fieldCraft && !state.base)
      return { state, msg: 'Cần base để craft item này.', ok: false };
  } else if (recipe.requiresBase && state.job === 'mechanic') {
    const recTier = recipe.tier || 1;
    if (mechFieldCraftTier >= recTier) {
      // field_craft_all + tier đủ cao → bypass requiresBase
    } else if (!state.base) {
      return { state, msg: `Cần base (tier ${recTier}) để craft item này.`, ok: false };
    }
  } else if (recipe.requiresBase && !state.base) {
    return { state, msg: 'Cần base để craft item này.', ok: false };
  }

  // ── Blueprint check (Farmer / Mechanic bypass) ───────
  if (recipe.requiresBlueprint) {
    if (state.job === 'farmer') {
      const masterGen = DW_getSkillEffect(state, 'tay_quen_viec', 'master_generalist');
      const recTier   = recipe.tier || 1;
      if (!masterGen && !(state.base?.blueprints||[]).includes(recipeId) && recTier <= 2)
        return { state, msg: `Cần blueprint để craft ${recipe.name || recipeId}.`, ok: false };
      if (!masterGen && recTier > 2)
        return { state, msg: `Cần blueprint để craft ${recipe.name || recipeId}.`, ok: false };
    } else if (state.job === 'mechanic') {
      const mechSchematic = DW_getSkillEffect(state, 'nha_may_di_dong', 'schematic_memory');
      const improviseAll  = DW_getSkillEffect(state, 'cong_thuc_bi_mat', 'improvise_anything');
      const recTier = recipe.tier || 1;
      // schematic_memory: nhớ tất cả công thức đã craft (state.craftedRecipes)
      const alreadyCrafted = (state.craftedRecipes || []).includes(recipeId);
      if (!mechSchematic && !improviseAll && !alreadyCrafted &&
          !(state.base?.blueprints||[]).includes(recipeId))
        return { state, msg: `Cần blueprint để craft ${recipe.name || recipeId}.`, ok: false };
    } else {
      if (!(state.base?.blueprints||[]).includes(recipeId))
        return { state, msg: `Cần blueprint để craft ${recipe.name || recipeId}.`, ok: false };
    }
  }

  let apCost = recipe.apCost || 2;

  // ── AP reduction: Farmer ─────────────────────────────
  if (state.job === 'farmer') {
    const basicReduce    = DW_getSkillEffect(state, 'tay_quen_viec', 'basic_craft_ap_reduce');
    const craftReduce    = DW_getSkillEffect(state, 'tay_quen_viec', 'craft_ap_reduce');
    const noncombReduce  = DW_getSkillEffect(state, 'tram_hay_khong_bang_tay_quen', 'all_noncombat_ap_reduce');
    const totalReduce    = Math.max(basicReduce || 0, craftReduce || 0) + (noncombReduce || 0);
    apCost = Math.max(1, apCost - totalReduce);
  }

  // ── AP reduction: Mechanic (cong_thuc_bi_mat) ────────
  if (state.job === 'mechanic') {
    const mechCraftReduce = DW_getSkillEffect(state, 'cong_thuc_bi_mat', 'craft_ap_reduce') || 0;
    apCost = Math.max(1, apCost - mechCraftReduce);
  }

  // ── Farmer: free_action check ──
  const { canUseFree } = _DW_tryFreeAction(state, 'craft');
  const effectiveApCost = canUseFree ? 0 : apCost;

  if (state.ap < effectiveApCost)
    return { state, msg: `Cần ${effectiveApCost} ĐHĐ.`, ok: false };

  // ── Farmer: batch_craft (tay_quen_viec lv7) ──────────
  // Craft 2 item cùng lúc với AP = 1.5× thay vì 2×
  const batchCraft = state.job === 'farmer' &&
    DW_getSkillEffect(state, 'tay_quen_viec', 'batch_craft');

  // ── Mechanic: batch_craft_discount (day_chuyen_san_xuat) ─
  // Giảm AP và nguyên liệu khi craft cùng loại recipe liên tiếp
  const mechBatchDiscount = state.job === 'mechanic'
    ? (DW_getSkillEffect(state, 'day_chuyen_san_xuat', 'batch_craft_discount') || 0)
    : 0;
  const mechBatchApReduce = state.job === 'mechanic'
    ? (DW_getSkillEffect(state, 'day_chuyen_san_xuat', 'batch_ap_reduce') || 0)
    : 0;
  const mechBatchMax = state.job === 'mechanic'
    ? (DW_getSkillEffect(state, 'day_chuyen_san_xuat', 'batch_max') || 1)
    : 1;

  // Material save (carpentry)
  const matSaveChance = DW_getSkillEffect(state, 'carpentry', 'craft_material_save');
  // Farmer: basic_craft_mat_save (tay_quen_viec)
  const farmerMatSave = state.job === 'farmer'
    ? DW_getSkillEffect(state, 'tay_quen_viec', 'basic_craft_mat_save')
    : 0;
  // Mechanic: zero_waste_craft (tai_che_ban_nang lv10) — 70% chance không tiêu nguyên liệu
  const mechZeroWaste = state.job === 'mechanic' &&
    DW_getSkillEffect(state, 'tai_che_ban_nang', 'zero_waste_craft');
  const mechZeroWasteChance = mechZeroWaste
    ? (DW_getSkillEffect(state, 'tai_che_ban_nang', 'zero_waste_chance') || 0.70)
    : 0;
  // Mechanic: batch_craft_discount — giảm nguyên liệu nếu đang trong batch cùng loại
  const isMechBatch = mechBatchDiscount > 0 &&
    state.lastCraftRecipe === recipeId &&
    (state.batchCount || 0) < mechBatchMax;
  const mechMatSave = isMechBatch ? mechBatchDiscount : 0;

  const totalMatSave = Math.max(matSaveChance || 0, farmerMatSave || 0, mechMatSave || 0,
    mechZeroWasteChance || 0);
  const savedMats = [];

  let inv = [...state.inventory];
  for (const ingId of recipe.ingredients) {
    const idx = inv.indexOf(ingId);
    if (idx === -1)
      return { state, msg: `Thiếu: ${DW_itemName(ingId)}.`, ok: false, missingItem: ingId };
    if (totalMatSave > 0 && Math.random() < totalMatSave) {
      savedMats.push(ingId);
    } else {
      inv.splice(idx, 1);
    }
  }
  inv.push(recipe.result);

  let s = {
    ...state,
    inventory: inv,
    ap:        Math.max(0, state.ap - effectiveApCost),
  };

  if (canUseFree) {
    s.freeActionsUsed = (s.freeActionsUsed || 0) + 1;
    s.log = [`[Free] Craft miễn phí (${s.freeActionsUsed}).`, ...(s.log||[])];
  }

  // ── Mechanic: batch tracking (day_chuyen_san_xuat) ───
  if (state.job === 'mechanic') {
    if (isMechBatch) {
      s.batchCount = (state.batchCount || 0) + 1;
    } else {
      s.batchCount = 0;
    }
    s.lastCraftRecipe = recipeId;
    // Mechanic: AP reduction cho batch craft liên tiếp
    if (isMechBatch && mechBatchApReduce > 0) {
      s.ap = Math.max(0, s.ap + mechBatchApReduce); // hoàn lại AP cho lần batch
    }
    // Mechanic: schematic_memory — nhớ công thức đã craft
    const hasSchematic = DW_getSkillEffect(state, 'nha_may_di_dong', 'schematic_memory');
    if (hasSchematic) {
      const crafted = [...(state.craftedRecipes || [])];
      if (!crafted.includes(recipeId)) crafted.push(recipeId);
      s.craftedRecipes = crafted;
    }
    // Mechanic: craft_xp_bonus (nha_may_di_dong)
    const xpBonus = DW_getSkillEffect(state, 'nha_may_di_dong', 'craft_xp_bonus') || 0;
    if (xpBonus > 0) s = DW_grantCharacterXp(s, 'craft', Math.ceil(4 * xpBonus));

    // Mechanic: supply_cache (day_chuyen_san_xuat lv7) — craft thêm 1 item cùng loại miễn phí mỗi batch
    const hasSupplyCache = DW_getSkillEffect(state, 'day_chuyen_san_xuat', 'supply_cache');
    if (hasSupplyCache && isMechBatch && Math.random() < 0.50) {
      // 50% chance nhận 1 item ngẫu nhiên cùng loại miễn phí
      const bonus = DW_createItem(recipe.result);
      if (bonus) {
        s.inventory = [...(s.inventory || []), bonus];
        s.log = [`📦 Supply Cache: nhận thêm 1x ${DW_itemName(recipe.result)} miễn phí!`, ...(s.log||[])];
      }
    }
  }

  s = DW_grantCharacterXp(s, 'craft');

  // Farmer: versatile_bonus (tram_hay_khong_bang_tay_quen) — XP mọi hoạt động
  if (state.job === 'farmer') {
    const verBonus = DW_getSkillEffect(s, 'tram_hay_khong_bang_tay_quen', 'versatile_bonus');
    if (verBonus > 0) s = DW_grantCharacterXp(s, 'craft', Math.ceil(4 * verBonus));
  }

  if (recipe.skillReq?.carpentry) {
    s = DW_trackMilestoneCounter(s, 'items_repaired', 1);
    s = DW_checkMilestone(s, 'mechanic_salvage_king');
  }

  const resultDef = DW_item(recipe.result);
  if (resultDef?.tags?.includes('cooked_food')) {
    s = { ...s, milestones: { ...(s.milestones||{}), cooked_first_meal: true } };
    s = DW_checkMilestone(s, 'cook_first_meal');
  }

  // Farmer milestones
  if (state.job === 'farmer')
    s = DW_trackMilestoneCounter(s, 'farmer_items_crafted', 1);

  const savedMsg = savedMats.length > 0
    ? ` (Tiết kiệm: ${savedMats.map(DW_itemName).join(', ')})`
    : '';

  // batch_craft: báo hiệu UI có thể craft thêm 1 lần cùng recipe với AP giảm 50%
  const batchMsg = batchCraft ? ' [Batch: craft thêm 1 lần với nửa AP?]' : '';

  return {
    state: s,
    msg: `Chế tạo: ${DW_itemName(recipe.result)}!${savedMsg}${batchMsg}`,
    result: recipe.result,
    ok: true,
    batchAvailable: batchCraft,
  };
}

// ── REPAIR ─────────────────────────────────────────────
function DW_repair(state, slot) {
  const itemId = state.equip?.[slot];
  if (!itemId) return { state, msg: 'Slot trống.', ok: false };

  const def    = EQUIP_DEFS[itemId];
  if (!def)    return { state, msg: `${DW_itemName(itemId)} không có durability.`, ok: false };

  const curDur = state.equipDur?.[slot] || 0;
  if (curDur >= def.durMax) return { state, msg: 'Durability đã đầy.', ok: false };

  // ── Mechanic skill flags ──────────────────────────────
  const isMechanic = state.job === 'mechanic';

  // toolbelt (nha_may_di_dong lv4) — không cần toolbox
  const hasToolbelt      = isMechanic && !!DW_getSkillEffect(state, 'nha_may_di_dong', 'toolbelt');
  // ghost_repair_passive (tay_nghe_vung lv10) — repair 0 AP
  const ghostRepairPassive = isMechanic && !!DW_getSkillEffect(state, 'tay_nghe_vung', 'ghost_repair_passive');
  // any_material_repair (sua_bang_bat_cu_thu_gi) — dùng bất kỳ item
  const anyMaterialRepair = isMechanic && !!DW_getSkillEffect(state, 'sua_bang_bat_cu_thu_gi', 'any_material_repair');
  // repair_ap_reduce (tay_nghe_vung lv1+)
  const mechApReduce = isMechanic
    ? (DW_getSkillEffect(state, 'tay_nghe_vung', 'repair_ap_reduce') || 0) : 0;
  // full_restore (tay_nghe_vung lv5) — 1 lần/ngày repair về 100%
  const hasFullRestore  = isMechanic && !state.fullRestoreUsed &&
    !!DW_getSkillEffect(state, 'tay_nghe_vung', 'full_restore');
  // repair_material_efficiency (sua_bang_bat_cu_thu_gi)
  const matEfficiency  = isMechanic
    ? (DW_getSkillEffect(state, 'sua_bang_bat_cu_thu_gi', 'repair_material_efficiency') || 1.0) : 1.0;
  // repair_from_nothing (sua_bang_bat_cu_thu_gi lv7) — 1 lần/ngày 5 durability không cần mat
  const repairFromNothing = isMechanic && !state.repairFromNothingUsed &&
    !!DW_getSkillEffect(state, 'sua_bang_bat_cu_thu_gi', 'repair_from_nothing');
  // repair_efficiency_bonus (chan_doan_nhanh lv2+) — stacks với restore_bonus
  const efficiencyBonus = isMechanic
    ? (DW_getSkillEffect(state, 'chan_doan_nhanh', 'repair_efficiency_bonus') || 0) : 0;

  // ── AP cost ──────────────────────────────────────────
  const ghostRepair      = DW_hasSignatureSkill(state, 'ghost_repair');
  const farmerFreeRepair = state.job === 'farmer' && DW_getSkillEffect(state, 'va_viu', 'ap_repair_free');
  let apRequired = (ghostRepair || farmerFreeRepair || ghostRepairPassive) ? 0 : 2;
  if (apRequired > 0 && mechApReduce > 0) apRequired = Math.max(1, apRequired - mechApReduce);

  if (state.ap < apRequired) return { state, msg: `Cần ${apRequired} ĐHĐ.`, ok: false };

  // ── Toolbox check ────────────────────────────────────
  const hasToolbox       = DW_invFindId(state.inventory, 'toolbox') !== -1;
  const effectiveToolbox = hasToolbox || hasToolbelt;

  // ── Farmer: improvised_repair (va_viu lv5) ───────────
  const improvisedRepair = state.job === 'farmer' &&
    DW_getSkillEffect(state, 'va_viu', 'improvised_repair');

  // ── Material search ───────────────────────────────────
  let matIdx = DW_invFindTag(state.inventory, 'repair_mat');

  if (matIdx === -1 && (improvisedRepair || anyMaterialRepair)) {
    matIdx = state.inventory.findIndex(id => {
      const d = DW_item(id) || ITEM_DB[id];
      return d && (d.type === 'material' || d.tags?.includes('craft_mat'));
    });
  }

  // repair_from_nothing: không cần nguyên liệu — vẫn cho phép repair
  const useRepairFromNothing = repairFromNothing && matIdx === -1;

  if (matIdx === -1 && !useRepairFromNothing) {
    const hint = anyMaterialRepair ? 'Cần ít nhất 1 vật liệu (bất kỳ item loại material).'
      : improvisedRepair ? 'Cần ít nhất 1 vật liệu thô (gạch, dây, ống...).'
      : 'Cần nguyên liệu sửa chữa (băng, vải, dây, pin, cồn…)';
    return { state, msg: hint, ok: false };
  }

  // ── Restore amount ────────────────────────────────────
  const repairEff   = Math.max(1, DW_getSkillEffect(state, 'carpentry', 'repair_efficiency'));
  const baseRestore = effectiveToolbox
    ? Math.floor(def.durMax * 0.5)
    : Math.floor(def.durMax * 0.3);
  let restoreAmt = Math.min(def.durMax - curDur, Math.floor(baseRestore * repairEff));

  // Mechanic: repair_restore_bonus (tay_nghe_vung) stacks với chan_doan_nhanh efficiency
  if (isMechanic) {
    const restoreBonus = DW_getSkillEffect(state, 'tay_nghe_vung', 'repair_restore_bonus') || 0;
    const totalBonus   = restoreBonus + efficiencyBonus;
    if (totalBonus > 0)
      restoreAmt = Math.min(def.durMax - curDur, Math.ceil(restoreAmt * (1 + totalBonus)));
    // material efficiency scaling
    if (matEfficiency !== 1.0)
      restoreAmt = Math.min(def.durMax - curDur, Math.ceil(restoreAmt * matEfficiency));
  }

  // Farmer: repair_restore_bonus (va_viu)
  if (state.job === 'farmer') {
    const restoreBonus = DW_getSkillEffect(state, 'va_viu', 'repair_restore_bonus');
    if (restoreBonus > 0)
      restoreAmt = Math.min(def.durMax - curDur, Math.ceil(restoreAmt * (1 + restoreBonus)));
  }

  // full_restore override: repair về 100% durability
  let fullRestoreUsed = false;
  if (hasFullRestore) {
    restoreAmt    = def.durMax - curDur;  // full
    fullRestoreUsed = true;
  }

  // repair_from_nothing override: chỉ 5 durability, không cần mat
  if (useRepairFromNothing) restoreAmt = Math.min(def.durMax - curDur, 5);

  // ── Material save probability ─────────────────────────
  const farmerMatSave = state.job === 'farmer'
    ? (DW_getSkillEffect(state, 'va_viu', 'repair_mat_save') || 0) : 0;
  const mechMatSave   = isMechanic
    ? (DW_getSkillEffect(state, 'tay_nghe_vung', 'repair_mat_save') || 0) : 0;
  const totalMatSave  = Math.max(farmerMatSave, mechMatSave);
  const matConsumed   = !useRepairFromNothing &&
    !(totalMatSave > 0 && Math.random() < totalMatSave);

  const matId  = matIdx !== -1 ? state.inventory[matIdx] : null;
  const newInv = (matIdx !== -1 && matConsumed)
    ? state.inventory.filter((_,i) => i !== matIdx)
    : state.inventory;

  let s = {
    ...state,
    inventory: newInv,
    equipDur:  { ...(state.equipDur||{}), [slot]: Math.min(def.durMax, curDur + restoreAmt) },
    ap:        Math.max(0, state.ap - apRequired),
  };
  if (fullRestoreUsed)   s.fullRestoreUsed      = true;
  if (useRepairFromNothing) s.repairFromNothingUsed = true;

  // ── Mechanic: legendary_item_chance (vinh_cuu lv3) ───
  // Sau repair, có cơ hội item trở thành "legendary" (bonus stat)
  if (isMechanic) {
    const legendChance = DW_getSkillEffect(s, 'vinh_cuu', 'legendary_item_chance') || 0;
    if (legendChance > 0 && Math.random() < legendChance) {
      s.equipTags = { ...(s.equipTags || {}), [slot]: 'legendary' };
      s.log = [`✨ ${DW_itemName(itemId)} trở thành Legendary sau khi được sửa!`, ...(s.log||[])];
    }
  }

  s = DW_grantCharacterXp(s, 'craft', 2);
  s = DW_trackMilestoneCounter(s, 'items_repaired', 1);
  s = DW_checkMilestone(s, 'mechanic_salvage_king');

  const savedMsg      = (!matConsumed && matId) ? ` (Tiết kiệm ${DW_itemName(matId)}!)` : '';
  const nothingMsg    = useRepairFromNothing ? ' [Repair từ không khí!]' : '';
  const fullMsg       = fullRestoreUsed ? ' [Full Restore!]' : '';
  const matDisplay    = matId ? `(${DW_itemName(matId)})` : '(không cần vật liệu)';

  return {
    state: s,
    msg: `Sửa ${DW_itemName(itemId)} +${restoreAmt} durability ${matDisplay}${savedMsg}${nothingMsg}${fullMsg}.`,
    ok: true,
  };
}

// ── AMMO LOAD ──────────────────────────────────────────
// rapid_response signature skill (police): reload không tốn AP
// (AP cost hiện tại = 0 rồi, nhưng future-proof nếu sau này thêm AP cost)
function DW_loadAmmo(state) {
  const idx = DW_invFindAmmo(state.inventory, 'ammo_9mm');
  if (idx === -1) return { state, msg: 'Không có đạn 9mm.', ok: false };

  const id      = state.inventory[idx];
  const count   = DW_item(id)?.ammoCount || 10;
  const newAmmo = { ...state.ammo, ammo_9mm: (state.ammo?.ammo_9mm||0) + count };

  return {
    state: { ...state, inventory: state.inventory.filter((_,i) => i !== idx), ammo: newAmmo },
    msg: `Nạp ${count} viên đạn. Tổng: ${newAmmo.ammo_9mm}.`,
    ok: true,
  };
}

// ══════════════════════════════════════════════════════
// MECHANIC: ADVANCED CRAFTING FUNCTIONS
// DW_automatedCraft  — craft không tốn AP (lv10, max 3/ngày)
// DW_upgradeWeapon   — nâng cấp vũ khí đang mang (+dmg, masterwork, legendary)
// DW_upgradeArmor    — nâng cấp giáp đang mặc (+armorBonus)
// DW_dismantleItem   — phá đồ lấy nguyên liệu (dismantle_unlock lv3)
// DW_setHeirloom     — gán 1 item làm heirloom (không bao giờ hỏng / mất)
// ══════════════════════════════════════════════════════

// ── DW_automatedCraft ─────────────────────────────────
// Automated Craft lv10: craft 1 batch item mà không tốn AP.
// Max 3 lần/ngày (automated_craft_daily_cap).
function DW_automatedCraft(state, recipeId) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới dùng Automated Craft.', ok: false };

  const hasAuto = DW_getSkillEffect(state, 'day_chuyen_san_xuat', 'automated_craft');
  if (!hasAuto)
    return { state, msg: 'Cần kỹ năng Dây Chuyền Sản Xuất lv10 để dùng Automated Craft.', ok: false };

  const dailyCap  = DW_getSkillEffect(state, 'day_chuyen_san_xuat', 'automated_craft_daily_cap') || 3;
  const usedToday = state.automatedCraftUsed || 0;
  if (usedToday >= dailyCap)
    return { state, msg: `Đã dùng Automated Craft ${usedToday}/${dailyCap} lần hôm nay.`, ok: false };

  // Gọi DW_craft với AP = 0 (override)
  const tempState = { ...state, ap: state.ap + 99 }; // đảm bảo đủ AP để craft
  const result = DW_craft(tempState, recipeId);
  if (!result.ok) return { state, msg: result.msg, ok: false };

  let s = { ...result.state, ap: state.ap }; // khôi phục AP thật
  s.automatedCraftUsed = usedToday + 1;
  s.log = [`⚙️ Automated Craft [${s.automatedCraftUsed}/${dailyCap}]: ${DW_itemName(RECIPE_DB[recipeId]?.result || recipeId)} không tốn ĐHĐ.`, ...(s.log||[])];

  return { state: s, msg: `Automated Craft: ${DW_itemName(RECIPE_DB[recipeId]?.result || recipeId)}.`, ok: true };
}

// ── DW_upgradeWeapon ──────────────────────────────────
// Nâng cấp vũ khí đang mang: +1 baseDmg và +10 durMax.
// Yêu cầu: 1 scrap + 1 AP. Mechanic: upgrade_mat_save giảm xác suất tốn scrap.
// Sau 3+ lần nâng cấp: nhận tag 'masterwork' → không bao giờ bị phá trong combat.
// legendary_forge: 1 lần duy nhất trong game, vũ khí lên legendary (+50% dmg, durMax x2).
function DW_upgradeWeapon(state) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới nâng cấp vũ khí được.', ok: false };

  const hasUpgrade = DW_getSkillEffect(state, 'cai_tien_vu_khi', 'weapon_upgrade_unlock');
  if (!hasUpgrade)
    return { state, msg: 'Cần kỹ năng Cải Tiến Vũ Khí để nâng cấp.', ok: false };

  const weapId = state.equip?.weapon;
  if (!weapId)
    return { state, msg: 'Không có vũ khí đang trang bị.', ok: false };

  const def = ITEM_DB[weapId];
  if (!def || def.type !== 'weapon' || (def.tags || []).includes('firearm'))
    return { state, msg: 'Vũ khí này không thể nâng cấp (chỉ vũ khí cận chiến).', ok: false };

  const AP_COST = 1;
  if (state.ap < AP_COST)
    return { state, msg: `Cần ${AP_COST} ĐHĐ để nâng cấp vũ khí.`, ok: false };

  // Kiểm tra scrap (cần 1 vật liệu — type=material hoặc tag craft_mat)
  const matSave = DW_getSkillEffect(state, 'cai_tien_vu_khi', 'upgrade_mat_save') || 0;
  const needScrap = Math.random() > matSave;
  const scrapIdx = (state.inventory || []).findIndex(id => {
    const d = ITEM_DB[id];
    return d?.type === 'material' || (d?.tags || []).includes('craft_mat');
  });
  if (needScrap && scrapIdx === -1)
    return { state, msg: 'Cần 1 vật liệu (dây, ống nước, gạch...) để nâng cấp.', ok: false };

  const upgradeCount = (state.weaponUpgradeCount || 0) + 1;
  const hasMasterwork = DW_getSkillEffect(state, 'cai_tien_vu_khi', 'masterwork') && upgradeCount >= 3;
  const hasLegendaryForge = DW_getSkillEffect(state, 'cai_tien_vu_khi', 'legendary_forge') && !state.legendaryForgeUsed;

  let inv = [...(state.inventory || [])];
  if (needScrap) inv = inv.filter((_, i) => i !== scrapIdx);

  // Nâng cấp stats — lưu override vào state.weaponOverrides
  const prevOverride = state.weaponOverrides?.[weapId] || {};
  const baseDmgBoost = (prevOverride.baseDmgBoost || 0) + 1;
  const durMaxBoost  = (prevOverride.durMaxBoost  || 0) + 10;

  let s = {
    ...state,
    ap: state.ap - AP_COST,
    inventory: inv,
    weaponUpgradeCount: upgradeCount,
    weaponOverrides: {
      ...(state.weaponOverrides || {}),
      [weapId]: { baseDmgBoost, durMaxBoost, masterwork: hasMasterwork },
    },
  };

  // Legendary Forge: 1 lần duy nhất — boost đặc biệt
  let legendaryMsg = '';
  if (hasLegendaryForge && upgradeCount >= 3) {
    s.weaponOverrides = {
      ...s.weaponOverrides,
      [weapId]: { ...s.weaponOverrides[weapId], legendary: true, baseDmgBoost: baseDmgBoost + 3, durMaxBoost: durMaxBoost + 30 },
    };
    s.legendaryForgeUsed = true;
    legendaryMsg = ' ⚡ LEGENDARY FORGE! Vũ khí đạt tầm huyền thoại.';
  }

  const masterworkMsg = hasMasterwork ? ' ✨ Masterwork! Không bao giờ vỡ trong chiến đấu.' : '';

  s.log = [`🔨 Nâng cấp ${DW_itemName(weapId)}: +1 dmg, +10 durMax (lần ${upgradeCount}).${masterworkMsg}${legendaryMsg}`, ...(s.log||[])];
  s = DW_checkMilestone(s, 'mechanic_first_invention');

  return {
    state: s,
    msg: `Nâng cấp thành công! +1 dmg, +10 durMax.${masterworkMsg}${legendaryMsg}`,
    ok: true,
    upgradeCount,
    isMasterwork: hasMasterwork,
    isLegendary: !!legendaryMsg,
  };
}

// ── DW_upgradeArmor ───────────────────────────────────
// Nâng cấp giáp đang mặc: +1 armorBonus, +15 durMax.
// custom_fit lv5: giáp không bị penalty carry weight.
function DW_upgradeArmor(state) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới nâng cấp giáp được.', ok: false };

  const hasUpgrade = DW_getSkillEffect(state, 'lop_giap_tuy_chinh', 'armor_upgrade_unlock');
  if (!hasUpgrade)
    return { state, msg: 'Cần kỹ năng Lớp Giáp Tùy Chỉnh để nâng cấp.', ok: false };

  const armorId = state.equip?.armor;
  if (!armorId)
    return { state, msg: 'Không có giáp đang mặc.', ok: false };

  const AP_COST = 1;
  if (state.ap < AP_COST)
    return { state, msg: `Cần ${AP_COST} ĐHĐ.`, ok: false };

  const matSave = DW_getSkillEffect(state, 'lop_giap_tuy_chinh', 'armor_upgrade_mat_save') || 0;
  const needScrap = Math.random() > matSave;
  const scrapIdx = (state.inventory || []).findIndex(id => {
    const d = ITEM_DB[id];
    return d?.type === 'material' || (d?.tags || []).includes('craft_mat');
  });
  if (needScrap && scrapIdx === -1)
    return { state, msg: 'Cần 1 vật liệu để nâng cấp giáp.', ok: false };

  let inv = [...(state.inventory || [])];
  if (needScrap) inv = inv.filter((_, i) => i !== scrapIdx);

  const prevOverride = state.armorOverrides?.[armorId] || {};
  const armorBoostAdd = (prevOverride.armorBoostAdd || 0) + 1;
  const durMaxBoost   = (prevOverride.durMaxBoost   || 0) + 15;
  const customFit     = !!DW_getSkillEffect(state, 'lop_giap_tuy_chinh', 'custom_fit');

  let s = {
    ...state,
    ap: state.ap - AP_COST,
    inventory: inv,
    armorOverrides: {
      ...(state.armorOverrides || {}),
      [armorId]: { armorBoostAdd, durMaxBoost, customFit },
    },
  };

  const customMsg = customFit ? ' (Custom Fit: không bị penalty carry weight)' : '';
  s.log = [`🛡️ Nâng cấp ${DW_itemName(armorId)}: +1 armor, +15 durMax.${customMsg}`, ...(s.log||[])];

  return { state: s, msg: `Giáp nâng cấp thành công.${customMsg}`, ok: true };
}

// ── DW_dismantleItem ──────────────────────────────────
// Phá vũ khí / giáp cũ lấy nguyên liệu chất lượng cao.
// dismantle_unlock (tai_che_ban_nang lv3): 2-3 nguyên liệu thô.
// scrap_quality lv5: nguyên liệu nhận được có grade cao hơn.
function DW_dismantleItem(state, slot) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới tháo dỡ được.', ok: false };

  const hasDismantle = DW_getSkillEffect(state, 'tai_che_ban_nang', 'dismantle_unlock');
  if (!hasDismantle)
    return { state, msg: 'Cần kỹ năng Tái Chế Bản Năng lv3 để tháo dỡ.', ok: false };

  const targetSlot = slot || 'weapon';
  const itemId = state.equip?.[targetSlot];
  if (!itemId)
    return { state, msg: `Không có trang bị tại slot ${targetSlot}.`, ok: false };

  const def = ITEM_DB[itemId];
  if (!def || (def.type !== 'weapon' && def.type !== 'armor'))
    return { state, msg: 'Chỉ tháo dỡ được vũ khí hoặc giáp.', ok: false };

  const scrapQuality = !!DW_getSkillEffect(state, 'tai_che_ban_nang', 'scrap_quality');
  // Số nguyên liệu thu hồi dựa trên durability còn lại
  const durPct   = (state.equipDur?.[targetSlot] || 0) / (def.durability || 30);
  const baseYield = Math.max(1, Math.floor(durPct * 3));
  const yieldMat  = scrapQuality ? baseYield + 1 : baseYield;

  // Loại vật liệu phù hợp — dùng items thực sự có trong ITEM_DB
  const matType = def.type === 'weapon' ? 'iron_pipe'   // weapon → ống nước
                : 'rope_5m';                              // armor  → dây thừng

  const newMats = Array(yieldMat).fill(matType);
  const newInv  = [...(state.inventory || []), ...newMats];
  const newEquip = { ...(state.equip || {}), [targetSlot]: null };
  const newDur   = { ...(state.equipDur || {}) };
  delete newDur[targetSlot];

  let s = {
    ...state,
    equip:     newEquip,
    equipDur:  newDur,
    inventory: newInv,
  };

  const qualMsg = scrapQuality ? ' (Scrap Quality: +1 vật liệu chất lượng cao)' : '';
  s.log = [`♻️ Tháo dỡ ${DW_itemName(itemId)}: +${yieldMat}x ${DW_itemName(matType)}.${qualMsg}`, ...(s.log||[])];

  return {
    state: s,
    msg: `Tháo dỡ thành công: thu được ${yieldMat}x vật liệu.`,
    ok: true,
    yieldMat,
  };
}

// ── DW_setHeirloom ────────────────────────────────────
// Gán 1 item slot là Heirloom: không bao giờ hỏng và không bao giờ mất.
// heirloom (vinh_cuu lv5). Eternal Bond: weapon heirloom +10% dmg/ngày (max 5 ngày).
function DW_setHeirloom(state, slot) {
  if (state.job !== 'mechanic')
    return { state, msg: 'Chỉ Thợ Máy mới có thể gán Heirloom.', ok: false };

  const hasHeirloom = DW_getSkillEffect(state, 'vinh_cuu', 'heirloom');
  if (!hasHeirloom)
    return { state, msg: 'Cần kỹ năng Vĩnh Cửu lv5 để gán Heirloom.', ok: false };

  const targetSlot = slot || 'weapon';
  const itemId = state.equip?.[targetSlot];
  if (!itemId)
    return { state, msg: `Không có trang bị tại slot ${targetSlot} để gán Heirloom.`, ok: false };

  // Chỉ 1 heirloom tại 1 thời điểm
  if (state.heirloom)
    return { state, msg: `Đã có Heirloom: ${DW_itemName(state.heirloom.id)}. Hủy trước khi gán mới.`, ok: false };

  let s = {
    ...state,
    heirloom: { slot: targetSlot, id: itemId },
    heirloomBondDays: 0,
  };

  s.log = [`💎 Heirloom: ${DW_itemName(itemId)} được gán. Không bao giờ hỏng, không bao giờ mất.`, ...(s.log||[])];

  return { state: s, msg: `${DW_itemName(itemId)} trở thành Heirloom.`, ok: true };
}
