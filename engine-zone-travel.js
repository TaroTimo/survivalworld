// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-zone-travel.js
// Zone Travel System v1
// Nhóm tiles thành zones, cho phép di chuyển theo zone
// thay vì từng ô một → giảm click tax 70%.
//
// KHÔNG thay thế DW_move — bổ sung thêm layer trên cùng.
// Dependencies: deadworld-data.js, engine-world.js
// Load AFTER engine-world.js, BEFORE deadworld-ui.js
// ══════════════════════════════════════════════════════

// ── ZONE DEFINITIONS ─────────────────────────────────
// Mỗi zone = cluster tiles có cùng tính chất
// Zone radius = 2 tiles (5x5 area)
var DW_ZONE_RADIUS = 2;

// Zone threat levels
var ZONE_THREAT = {
  CLEAR:    'clear',    // 0-1 zombie
  LOW:      'low',      // 2-3 zombie
  MEDIUM:   'medium',   // 4-6 zombie
  HIGH:     'high',     // 7-9 zombie
  EXTREME:  'extreme',  // 10+ zombie hoặc có boss
};

// AP cost multiplier theo terrain zone
var ZONE_TERRAIN_MULTIPLIER = {
  road:     0.8,   // Đường: nhanh hơn
  street:   1.0,   // Phố: bình thường
  alley:    1.2,   // Hẻm: chậm hơn chút
  forest:   1.5,   // Rừng: phải băng qua
  field:    1.2,   // Cánh đồng: trống, có thể bị nhìn thấy
  hospital: 1.5,   // Bệnh viện: nguy hiểm cao
  mall:     1.5,   // Mall: mê cung
  school:   1.3,   // Trường: bình thường+
  factory:  1.4,   // Nhà máy: địa hình phức tạp
  park:     1.0,   // Công viên: thoáng
  swamp:    2.5,   // Đầm: cực chậm
  river:    null,  // Sông: không thể đi (impassable)
  plain:    1.0,
  hill:     1.6,
  tunnel:   2.0,
  default:  1.0,
};

// ── DW_getZoneId — tính zone ID từ tọa độ ──────────────
// Zone được grid bởi ZONE_RADIUS*2+1 tiles
// Zone (0,0) = tiles 0..4, Zone (1,0) = tiles 5..9 v.v.
function DW_getZoneId(x, y) {
  const zx = Math.floor(x / (DW_ZONE_RADIUS * 2 + 1));
  const zy = Math.floor(y / (DW_ZONE_RADIUS * 2 + 1));
  return `${zx},${zy}`;
}

// ── DW_getZoneCenter — tọa độ trung tâm của zone ───────
function DW_getZoneCenter(zoneId) {
  const [zx, zy] = zoneId.split(',').map(Number);
  const step = DW_ZONE_RADIUS * 2 + 1;
  return {
    x: zx * step + DW_ZONE_RADIUS,
    y: zy * step + DW_ZONE_RADIUS,
  };
}

// ── DW_analyzeZone — phân tích zone từ state ───────────
// Trả về thông tin tổng hợp của zone: threat, terrain, loot hint
function DW_analyzeZone(state, zoneId) {
  const step = DW_ZONE_RADIUS * 2 + 1;
  const [zx, zy] = zoneId.split(',').map(Number);

  let totalZombies  = 0;
  let dominantType  = 'street';
  let typeCount     = {};
  let hasLoot       = false;
  let hasSearched   = false;
  let explored      = 0;
  let totalTiles    = 0;
  let hasBoss       = false;
  let hasBase       = false;
  let hasSpecial    = null;

  for (let dx = 0; dx < step; dx++) {
    for (let dy = 0; dy < step; dy++) {
      const tx = zx * step + dx;
      const ty = zy * step + dy;
      const key = `${tx},${ty}`;
      const tile = state.tiles?.[key];
      if (!tile) continue;

      totalTiles++;
      if (state.exploredTiles?.includes(key)) explored++;

      typeCount[tile.type] = (typeCount[tile.type] || 0) + 1;

      const zombiesHere = (tile.objects || []).filter(
        o => OBJECT_DEFS?.[o.type]?.type === 'enemy' && o.alive !== false
      ).length;
      totalZombies += zombiesHere;

      // Check boss
      if (state.activeBosses?.[key]) hasBoss = true;

      // Check base
      if (state.base?.tileKey === key) hasBase = true;

      // Check special
      if (tile.special && !hasSpecial) hasSpecial = tile.special;

      // Loot hint: có objects chưa search
      const unSearched = (tile.objects || []).some(
        o => !o.searched && OBJECT_DEFS?.[o.type]?.type !== 'enemy'
      );
      if (unSearched) hasLoot = true;
      const searched = (tile.objects || []).some(o => o.searched);
      if (searched) hasSearched = true;
    }
  }

  // Dominant terrain
  let maxCount = 0;
  for (const [type, count] of Object.entries(typeCount)) {
    if (count > maxCount) { maxCount = count; dominantType = type; }
  }

  // Threat level
  let threat = ZONE_THREAT.CLEAR;
  if (hasBoss)            threat = ZONE_THREAT.EXTREME;
  else if (totalZombies >= 10) threat = ZONE_THREAT.EXTREME;
  else if (totalZombies >= 7)  threat = ZONE_THREAT.HIGH;
  else if (totalZombies >= 4)  threat = ZONE_THREAT.MEDIUM;
  else if (totalZombies >= 2)  threat = ZONE_THREAT.LOW;

  const exploredPct = totalTiles > 0 ? Math.round(explored / totalTiles * 100) : 0;
  const mul = ZONE_TERRAIN_MULTIPLIER[dominantType] ?? ZONE_TERRAIN_MULTIPLIER.default;

  return {
    zoneId,
    dominantType,
    totalZombies,
    hasBoss,
    hasBase,
    hasSpecial,
    hasLoot,
    hasSearched,
    explored,
    totalTiles,
    exploredPct,
    threat,
    terrainMul: mul,
    impassable: mul === null,
  };
}

// ── DW_getAdjacentZones — zones tiếp giáp hiện tại ─────
// Trả về 4 zones (N/S/E/W) + thông tin của mỗi zone
function DW_getAdjacentZones(state) {
  const curZone = DW_getZoneId(state.x, state.y);
  const [czx, czy] = curZone.split(',').map(Number);

  const dirs = [
    { dir: 'n', label: '⬆ BẮC', dzx: 0,  dzy: -1, arrow: '↑' },
    { dir: 's', label: '⬇ NAM', dzx: 0,  dzy:  1, arrow: '↓' },
    { dir: 'e', label: '⮕ ĐÔNG', dzx: 1, dzy:  0, arrow: '→' },
    { dir: 'w', label: '⬅ TÂY', dzx: -1, dzy:  0, arrow: '←' },
  ];

  return dirs.map(d => {
    const nzx = czx + d.dzx;
    const nzy = czy + d.dzy;
    const targetZoneId = `${nzx},${nzy}`;
    const center = DW_getZoneCenter(targetZoneId);

    // Bounds check
    if (center.x < 0 || center.y < 0 ||
        center.x >= DW_WORLD_SIZE || center.y >= DW_WORLD_SIZE) {
      return { ...d, zoneId: targetZoneId, outOfBounds: true, info: null };
    }

    const info = DW_analyzeZone(state, targetZoneId);
    return { ...d, zoneId: targetZoneId, outOfBounds: false, info, center };
  });
}

// ── DW_calcZoneTravelAP — tính AP di chuyển sang zone ──
// Base AP = 4 (bù cho việc nhảy nhiều tile)
// + modifier theo terrain, thời gian, job, trạng thái
function DW_calcZoneTravelAP(state, zoneInfo) {
  if (!zoneInfo || zoneInfo.impassable) return Infinity;

  const BASE = 4; // Mỗi zone travel = 4 AP base (thay vì 8 clicks × 1 AP)
  let cost = BASE * (zoneInfo.terrainMul ?? 1.0);

  // Night penalty
  const isNight = state.hour >= 20 || state.hour < 6;
  if (isNight) {
    const hasLight = state.equip?.tool &&
      (EQUIP_DEFS?.[state.equip.tool]?.visBonus > 0);
    cost += hasLight ? 1 : 2;
  }

  // Threat penalty — zones nguy hiểm tốn thêm AP (thêm thời gian cẩn thận)
  if (zoneInfo.threat === ZONE_THREAT.EXTREME) cost += 3;
  else if (zoneInfo.threat === ZONE_THREAT.HIGH) cost += 2;
  else if (zoneInfo.threat === ZONE_THREAT.MEDIUM) cost += 1;

  // Job bonuses
  if (state.job === 'driver') cost = Math.max(2, cost - 1);
  if (state.job === 'farmer' && ['field','forest','plain','road'].includes(zoneInfo.dominantType)) {
    cost = Math.max(2, cost - 1);
  }

  // Skill: fitness bonus
  const fitness = state.skills?.fitness || 0;
  if (fitness >= 3) cost = Math.max(2, cost - 1);

  // Encumbrance
  if (typeof DW_overEncumbered === 'function' && DW_overEncumbered(state)) {
    cost += 2;
  }

  return Math.ceil(Math.max(2, cost));
}

// ── DW_zoneTravel — di chuyển đến zone lân cận ─────────
// (state, dir: 'n'|'s'|'e'|'w') → { ok, state, msg, zoneInfo }
//
// Thay vì di chuyển từng ô, teleport player đến CENTER của zone đích.
// Trừ AP một lần, trigger _DW_worldTick ở tile trung tâm.
// Tất cả tiles trong zone được mark explored.
function DW_zoneTravel(state, dir) {
  const zones = DW_getAdjacentZones(state);
  const target = zones.find(z => z.dir === dir);

  if (!target) return { state, msg: 'Hướng không hợp lệ.', ok: false };
  if (target.outOfBounds) return { state, msg: 'Không thể đi ra ngoài bản đồ.', ok: false };
  if (!target.info) return { state, msg: 'Không thể di chuyển đến đây.', ok: false };
  if (target.info.impassable) {
    const terrain = TILE_TYPES?.[target.info.dominantType]?.name || target.info.dominantType;
    return { state, msg: `Không thể vượt qua ${terrain}.`, ok: false };
  }

  const apCost = DW_calcZoneTravelAP(state, target.info);
  if (state.ap < apCost) {
    return {
      state,
      msg: `Di chuyển đến khu vực này cần ${apCost} ĐHĐ. Bạn còn ${state.ap} ĐHĐ.`,
      ok: false,
    };
  }

  const { x: nx, y: ny } = target.center;

  // Mark all tiles in zone as explored
  const step = DW_ZONE_RADIUS * 2 + 1;
  const [nzx, nzy] = target.zoneId.split(',').map(Number);
  const newExplored = [...(state.exploredTiles || [])];

  for (let dx = 0; dx < step; dx++) {
    for (let dy = 0; dy < step; dy++) {
      const key = `${nzx * step + dx},${nzy * step + dy}`;
      if (!newExplored.includes(key)) newExplored.push(key);
    }
  }

  // Compose travel narrative
  const terrainName = TILE_TYPES?.[target.info.dominantType]?.name || target.info.dominantType;
  const threatEmoji = {
    [ZONE_THREAT.CLEAR]:   '🟢',
    [ZONE_THREAT.LOW]:     '🟡',
    [ZONE_THREAT.MEDIUM]:  '🟠',
    [ZONE_THREAT.HIGH]:    '🔴',
    [ZONE_THREAT.EXTREME]: '☠️',
  }[target.info.threat] || '⬜';

  const isNight = state.hour >= 20 || state.hour < 6;
  const timeTag = isNight ? ' [ĐI ĐÊM]' : '';

  let travelMsg = `${target.arrow} Di chuyển sang khu ${terrainName}${timeTag}. `;
  if (target.info.totalZombies > 0) {
    travelMsg += `${threatEmoji} ${target.info.totalZombies} zombie trong khu vực.`;
  } else {
    travelMsg += `${threatEmoji} Khu vực yên tĩnh.`;
  }
  if (target.info.hasBoss) travelMsg += ' ⚠️ CÓ BOSS!';
  if (target.info.hasBase) travelMsg += ' 🏕 Có base của bạn.';

  // Move player + run world tick
  let s = {
    ...state,
    x: nx,
    y: ny,
    exploredTiles: newExplored,
    log: [travelMsg, ...(state.log || [])],
  };

  // Use existing world tick system
  if (typeof _DW_worldTick === 'function') {
    s = _DW_worldTick(s, nx, ny, apCost);
  } else {
    s.ap = s.ap - apCost;
    // Manual hour advance
    s.hour = (s.hour || 8) + Math.floor(apCost / 4);
    if (s.hour >= 24) { s.hour -= 24; }
  }

  // Noise: di chuyển qua zone tạo noise nhất định
  const noiseMod = target.info.threat === ZONE_THREAT.EXTREME ? 2 : 1;
  s.noise = Math.min(10, (s.noise || 0) + noiseMod);

  return {
    state: s,
    msg: travelMsg,
    ok: true,
    zoneInfo: target.info,
    apCost,
    firstVisit: target.info.exploredPct < 20,
    isNewZone: !state.exploredTiles?.includes(`${nx},${ny}`),
  };
}

// ── DW_getCurrentZoneInfo — thông tin zone hiện tại ────
function DW_getCurrentZoneInfo(state) {
  const zoneId = DW_getZoneId(state.x, state.y);
  return DW_analyzeZone(state, zoneId);
}

// ── DW_getZoneName — tên mô tả zone ────────────────────
function DW_getZoneName(state, zoneId) {
  const info = DW_analyzeZone(state, zoneId);
  const terrainName = TILE_TYPES?.[info.dominantType]?.name || info.dominantType;

  // Check for special locations
  if (info.hasSpecial) return info.hasSpecial;
  if (info.hasBase) return '🏕 Base của bạn';

  const prefixes = {
    [ZONE_THREAT.CLEAR]:   '',
    [ZONE_THREAT.LOW]:     'Khu ',
    [ZONE_THREAT.MEDIUM]:  'Khu Nguy Hiểm ',
    [ZONE_THREAT.HIGH]:    'Vùng Đỏ ',
    [ZONE_THREAT.EXTREME]: '☠ Tử Địa ',
  };

  return (prefixes[info.threat] || '') + terrainName;
}

// ── DW_worldExpansionCheck — mở rộng thế giới theo milestone ──
// Gọi sau mỗi DW_advanceDay
// Trả về { state, newZonesUnlocked: [] }
function DW_worldExpansionCheck(state) {
  const day = state.day || 1;
  const unlocked = state._unlockedExpansions || [];
  const newUnlocks = [];

  // Milestone 1: Ngày 3 — mở radio tower zone
  if (day >= 3 && !unlocked.includes('radio_zone')) {
    newUnlocks.push({
      id: 'radio_zone',
      msg: '📻 Tín hiệu radio mới phát hiện — có thể có điểm phát sóng gần đây.',
    });
  }

  // Milestone 2: Ngày 5 — mở vùng phía bắc (industrial)
  if (day >= 5 && !unlocked.includes('industrial_north')) {
    newUnlocks.push({
      id: 'industrial_north',
      msg: '🏭 Khói từ phía bắc — khu công nghiệp vẫn còn hoạt động một phần.',
    });
  }

  // Milestone 3: Boss đầu tiên bị giết
  const killedCount = (state.killedBosses || []).length;
  if (killedCount >= 1 && !unlocked.includes('deep_zone')) {
    newUnlocks.push({
      id: 'deep_zone',
      msg: '🗺 Một bản đồ rơi từ xác boss — có thêm khu vực để khám phá.',
    });
  }

  // Milestone 4: Ngày 8 — vùng cuối map bắt đầu reveal
  if (day >= 8 && !unlocked.includes('endgame_hint')) {
    newUnlocks.push({
      id: 'endgame_hint',
      msg: '🔭 Từ xa bạn thấy ánh đèn điện — còn ai đó vẫn sống sót được ở đó.',
    });
  }

  if (newUnlocks.length === 0) return { state, newZonesUnlocked: [] };

  const newUnlockIds = newUnlocks.map(u => u.id);
  const allUnlocked = [...unlocked, ...newUnlockIds];

  const logMsgs = newUnlocks.map(u => `🌍 ${u.msg}`);

  let s = {
    ...state,
    _unlockedExpansions: allUnlocked,
    log: [...logMsgs, ...(state.log || [])],
  };

  return { state: s, newZonesUnlocked: newUnlocks };
}
