// ══════════════════════════════════════════════════════
// DEAD WORLD — Rarity & Enemy Loot Data Block
// Load sau deadworld-data-addon.js
//
// Chứa:
//   - Mở rộng OBJECT_DEFS: zombie_walker, zombie_runner,
//     zombie_brute, zombie_bloated, zombie_boss
//   - Mở rộng TILE_OBJECT_POOLS: thêm enemy types mới
//   - RARITY_TIERS: định nghĩa độ hiếm
//   - RARITY_POOLS: bảng tỷ lệ rarity theo nguồn
//   - ENEMY_LOOT: bảng loot drop từng loại zombie
//
// engine-combat.js đọc ENEMY_LOOT và RARITY_POOLS.
// Không sửa bất kỳ dòng nào cũ trong deadworld-data.js.
// ══════════════════════════════════════════════════════

// ── MỞ RỘNG OBJECT_DEFS ──────────────────────────────
// Thêm enemy types mới vào OBJECT_DEFS đã có.
// Không override các key cũ (zombie, zombie_fast, zombie_horde).
// xpKey: key trong CHAR_XP_TABLE để gọi DW_grantCharacterXp().
(function _registerEnemyDefs() {
  const newEnemies = {
    // zombie_walker — zombie thường thế hệ mới (thay thế vai trò zombie cũ)
    // Giữ lại 'zombie' cũ để không break save cũ
    zombie_walker: {
      icon: '🧟',
      label: 'Zombie đi lảo đảo',
      type: 'enemy',
      fightAp: 3,
      damage: 1,
      hp: 6,
      flee_ap: 2,
      xpKey: 'kill_zombie',       // 8 XP — zombie thường
      lootPoolKey: 'zombie_normal',
    },
    // zombie_runner — nhanh, ít HP nhưng nguy hiểm khi phát hiện sớm
    // v3.2 balance: minDay=2 — không xuất hiện ngay ngày 1
    zombie_runner: {
      icon: '💨',
      label: 'Zombie chạy nhanh',
      type: 'enemy',
      fightAp: 4,
      damage: 2,
      hp: 4,
      flee_ap: 3,
      minDay: 2,                    // day-gate: chỉ spawn từ ngày 2+
      xpKey: 'kill_zombie_special', // 20 XP
      lootPoolKey: 'zombie_normal',
      tags: ['fast'],
    },
    // zombie_brute — to, nhiều HP, giáp tự nhiên
    // v3.2 balance: minDay=3, damage 3→2, hp 12→10 — vẫn tank nhưng không insta-kill
    zombie_brute: {
      icon: '💪',
      label: 'Zombie to xác',
      type: 'enemy',
      fightAp: 4,
      damage: 2,                    // nerf: 3→2 (giảm burst, vẫn nguy hiểm theo số đòn)
      hp: 10,                       // nerf: 12→10 (giảm grind, chết trong ~7 hits bare hands)
      armor: 1,
      flee_ap: 2,
      minDay: 3,                    // day-gate: chỉ spawn từ ngày 3+
      xpKey: 'kill_zombie_special', // 20 XP
      lootPoolKey: 'zombie_elite',
    },
    // zombie_bloated — phình to, độc, drop máu biến thể
    // v3.2 balance: minDay=4, damage 2→1, hp 8→5
    // Poison vẫn giữ nguyên — đây là identity nguy hiểm của nó (dài hạn)
    // Ngày 1 player không có antibiotic → nerf stat để có thời gian xử lý
    zombie_bloated: {
      icon: '🤢',
      label: 'Zombie phình độc',
      type: 'enemy',
      fightAp: 3,
      damage: 1,                    // nerf: 2→1 (poison là punishment đủ rồi)
      hp: 5,                        // nerf: 8→5 (chết trong 5 hits bare hands)
      flee_ap: 2,
      minDay: 4,                    // day-gate: chỉ spawn từ ngày 4+
      poisonOnHit: true,            // vẫn giữ — mechanic cốt lõi
      xpKey: 'kill_zombie_special', // 20 XP
      lootPoolKey: 'zombie_elite',
    },
    // zombie_boss_grunt — mini-boss zombie (khác với BOSS_DEFS)
    // Dùng cho encounter cuối ngày hoặc ổ zombie đặc biệt
    // v3.2 balance: minDay=5 — không xuất hiện sớm
    zombie_boss: {
      icon: '🧟‍♂️',
      label: 'Zombie đầu đàn',
      type: 'enemy',
      fightAp: 5,
      damage: 3,
      hp: 20,
      flee_ap: 2,
      isHorde: false,
      minDay: 5,                    // day-gate: chỉ spawn từ ngày 5+
      xpKey: 'kill_boss',          // 150 XP — mini-boss
      lootPoolKey: 'zombie_boss',
    },
  };

  // Merge vào OBJECT_DEFS toàn cục — không override nếu key đã tồn tại
  if (typeof OBJECT_DEFS !== 'undefined') {
    for (const [k, v] of Object.entries(newEnemies)) {
      if (!OBJECT_DEFS[k]) OBJECT_DEFS[k] = v;
    }
  }
})();

// ── MỞ RỘNG TILE_OBJECT_POOLS ─────────────────────────
// Thêm enemy types mới vào pools đã có.
// Dùng IIFE để không ghi đè pool cũ mà chỉ mở rộng.
(function _extendTilePools() {
  if (typeof TILE_OBJECT_POOLS === 'undefined') return;

  // Các pool cần bổ sung enemy types mới
  // Chỉ push — không override pool cũ hoàn toàn
  //
  // v3.2 balance philosophy:
  //   - Early tiles (apartment, hospital): chỉ zombie_walker (minDay=1, dmg=1)
  //   - Mid tiles (police, mall, street): runner/brute có minDay-gate tự filter
  //   - Deep tiles (warehouse, zombie_nest, tunnel): giữ nguyên elite enemies
  //   - DW_makeTile sẽ filter thêm theo minDay tại runtime
  const extensions = {
    street:      ['zombie_walker', 'zombie_runner', 'zombie_brute'],
    hospital:    ['zombie_walker'],               // v3.2: bỏ bloated — gần spawn, quá sớm
    police:      ['zombie_runner', 'zombie_brute'],
    warehouse:   ['zombie_brute', 'zombie_boss'],
    mall:        ['zombie_walker', 'zombie_runner', 'zombie_brute'],
    supermarket: ['zombie_walker', 'zombie_runner'],
    zombie_nest: ['zombie_brute', 'zombie_boss', 'zombie_bloated'],
    rubble:      ['zombie_walker', 'zombie_brute'],
    alley:       ['zombie_runner', 'zombie_walker'],
    apartment:   ['zombie_walker'],               // v3.2: bỏ bloated — gần spawn, quá sớm
    tunnel:      ['zombie_runner', 'zombie_bloated'],
  };

  for (const [tileType, extras] of Object.entries(extensions)) {
    if (TILE_OBJECT_POOLS[tileType]) {
      TILE_OBJECT_POOLS[tileType] = [...TILE_OBJECT_POOLS[tileType], ...extras];
    }
  }
})();

// ── RARITY TIERS ──────────────────────────────────────
// statMul nhân lên: baseDmg, armorBonus, durMax.
// Không nhân: hitBonus, stealthMul, ammoCount, useEffect.
var RARITY_TIERS = {
  common: {
    id:      'common',
    name:    'Thường',
    color:   '#aaaaaa',
    weight:  70,
    statMul: 1.0,
  },
  uncommon: {
    id:      'uncommon',
    name:    'Khá Hiếm',
    color:   '#2ecc71',
    weight:  20,
    statMul: 1.25,
  },
  rare: {
    id:      'rare',
    name:    'Cực Hiếm',
    color:   '#3498db',
    weight:  8,
    statMul: 1.6,
  },
  epic: {
    id:      'epic',
    name:    'Huyền Thoại',
    color:   '#9b59b6',
    weight:  2,
    statMul: 2.1,
  },
};

// ── RARITY POOLS ──────────────────────────────────────
// Mảng slot: mỗi phần tử = 1 slot cân bằng.
// Phần tử xuất hiện nhiều hơn = tỷ lệ cao hơn.
//
// zombie_normal:  [common×3, uncommon×1]  → 75% / 25% / 0%  / 0%
// zombie_elite:   [common×2, uncommon×2, rare×1] → 40%/40%/20%/0%
// zombie_boss:    [uncommon×1, rare×2, epic×1] → 0%/25%/50%/25%
// scavenge_normal:[common×4, uncommon×1]  → 80% / 20% / 0%  / 0%
// scavenge_rich:  [common×2, uncommon×2, rare×1] → 40%/40%/20%/0%
// chest_normal:   [common×1, uncommon×2, rare×1] → 25%/50%/25%/0%
// chest_golden:   [uncommon×1, rare×2, epic×1]   → 0%/25%/50%/25%
var RARITY_POOLS = {
  scavenge_normal: ['common', 'common', 'common', 'common', 'uncommon'],
  scavenge_rich:   ['common', 'common', 'uncommon', 'uncommon', 'rare'],
  zombie_normal:   ['common', 'common', 'common', 'uncommon'],
  zombie_elite:    ['common', 'common', 'uncommon', 'uncommon', 'rare'],
  zombie_boss:     ['uncommon', 'rare', 'rare', 'epic'],
  chest_normal:    ['common', 'uncommon', 'uncommon', 'rare'],
  chest_golden:    ['uncommon', 'rare', 'rare', 'epic'],
};

// ── ENEMY LOOT TABLES ─────────────────────────────────
// poolKey: key trong RARITY_POOLS — quyết định tỷ lệ rarity
// dropCount: [min, max] số item rơi ra khi zombie chết
// table: weighted item list (w = weight tương đối)
//
// Chỉ dùng item id đã có trong ITEM_DB.
// Thêm enemy mới: thêm entry với key = type của enemy trong OBJECT_DEFS.
var ENEMY_LOOT = {

  // ── Zombie thường (cũ) — backward compatible ─────────
  // 'zombie' là key trong OBJECT_DEFS cũ, cần giữ lại
  zombie: {
    poolKey:   'zombie_normal',
    dropCount: [0, 1],
    table: [
      { id: 'cloth_bandage',  w: 50 },
      { id: 'bandage',        w: 30 },
      { id: 'wooden_stick',   w: 20 },  // gậy gỗ — đúng item id trong ITEM_DB
    ],
  },

  // ── Zombie fast (cũ) — backward compatible ────────────
  zombie_fast: {
    poolKey:   'zombie_normal',
    dropCount: [0, 1],
    table: [
      { id: 'bandage',        w: 45 },
      { id: 'cloth_bandage',  w: 35 },
      { id: 'electric_wire',  w: 20 },
    ],
  },

  // ── Zombie horde (cũ) — backward compatible ───────────
  zombie_horde: {
    poolKey:   'zombie_elite',
    dropCount: [1, 3],
    table: [
      { id: 'bandage',        w: 25 },
      { id: 'canned_food',    w: 25 },
      { id: 'cloth_bandage',  w: 20 },
      { id: 'iron_pipe',      w: 15 },
      { id: 'rope_5m',        w: 15 },
    ],
  },

  // ── Zombie walker — zombie cơ bản mới ─────────────────
  zombie_walker: {
    poolKey:   'zombie_normal',
    dropCount: [0, 2],          // 33% drop nothing
    table: [
      { id: 'cloth_bandage',  w: 50 },
      { id: 'bandage',        w: 30 },
      { id: 'branch',         w: 20 },
    ],
  },

  // ── Zombie runner — nhanh, drop ít nhưng hữu dụng ────
  zombie_runner: {
    poolKey:   'zombie_normal',
    dropCount: [0, 1],          // 50% drop nothing
    table: [
      { id: 'bandage',        w: 40 },
      { id: 'cloth_bandage',  w: 35 },
      { id: 'electric_wire',  w: 25 },
    ],
  },

  // ── Zombie brute — elite, drop tốt hơn ───────────────
  zombie_brute: {
    poolKey:   'zombie_elite',
    dropCount: [1, 3],          // luôn drop ít nhất 1
    table: [
      { id: 'cloth_bandage',    w: 30 },
      { id: 'iron_pipe',        w: 25 },
      { id: 'canned_food',      w: 20 },
      { id: 'reinforced_bat',   w: 15 },
      { id: 'light_vest',       w:  7 },
      { id: 'mutant_blood',     w:  3 },
    ],
  },

  // ── Zombie bloated — drop máu biến thể + y tế ─────────
  zombie_bloated: {
    poolKey:   'zombie_elite',
    dropCount: [1, 2],
    table: [
      { id: 'mutant_blood',   w: 40 },
      { id: 'bandage',        w: 30 },
      { id: 'canned_food',    w: 20 },
      { id: 'antibiotic',     w: 10 },
    ],
  },

  // ── Zombie boss grunt — rare loot pool ───────────────
  zombie_boss: {
    poolKey:   'zombie_boss',
    dropCount: [2, 4],
    table: [
      { id: 'spiked_bat',     w: 25 },
      { id: 'light_vest',     w: 25 },
      { id: 'medkit',         w: 25 },
      { id: 'mutant_blood',   w: 25 },
    ],
  },
};
