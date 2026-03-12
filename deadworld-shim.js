// ═════════════════════════════════════════════════════
// DEAD WORLD — deadworld-shim.js
// Shim v3: adapts pure-function engine → stateful gs API


// Mọi engine function: (state, ...args) → { ok, state, msg }
// UI gọi: DW_fight(idx, mode) không có state
//
// Shim làm 3 việc:
//   1. Định nghĩa gs — global state manager
//   2. Wrap engine functions để tự inject gs._state
//   3. Tự động gọi gs.setState(result.state) sau mỗi call
//
// QUAN TRỌNG: Load CUỐI CÙNG — sau tất cả engine files
// ══════════════════════════════════════════════════════

// ── LƯU ENGINE FUNCTIONS TRƯỚC KHI WRAP ──────────────
// Phải đặt TRƯỚC tất cả override
const _raw = {
  DW_fight:          DW_fight,
  DW_flee:           DW_flee,
  DW_move:           DW_move,
  DW_enterApproached: DW_enterApproached,
  DW_retreatApproach: DW_retreatApproach,
  DW_useItem:        DW_useItem,
  DW_equipItem:      DW_equipItem,
  DW_unequipSlot:    DW_unequipSlot,
  DW_dropItem:       DW_dropItem,
  DW_repair:         DW_repair,
  DW_searchObject:   DW_searchObject,
  DW_craft:          DW_craft,
  DW_rest:           DW_rest,
  DW_sleep:          DW_sleep,
  DW_barricade:      DW_barricade,
  DW_upgradeBase:    DW_upgradeBase,
  DW_spendSkillPoint: DW_spendSkillPoint,
};

// ── GLOBAL STATE MANAGER ──────────────────────────────
var gs = (function () {
  var _state = null;
  var _saveTimer = null;

  function _scheduleSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function () {
      if (_state && typeof DW_save === 'function') DW_save(_state);
    }, 2000);
  }

  return {
    get _state() { return _state; },

    // gs.player — proxy để đọc stats nhanh
    get player() { return _state || {}; },

    // gs.time — proxy: day, hour, minute, lightLabel cho UI
    get time() {
      if (!_state) return { day:1, hour:8, minute:0, lightLabel:'NGÀY' };
      const h = _state.hour || 8;
      return {
        day:        _state.day || 1,
        hour:       h,
        minute:     0,
        lightLabel: (h>=6&&h<12)?'SÁNG':(h>=12&&h<18)?'CHIỀU':(h>=18&&h<21)?'TỐI':'ĐÊM',
      };
    },

    // gs.stats — kills + tilesExplored để UI_gameOver dùng
    get stats() {
      if (!_state) return { kills:0, tilesExplored:0 };
      return {
        kills:         _state.kills || 0,
        tilesExplored: (_state.exploredTiles || []).length,
      };
    },

    // gs.activeBosses — convert {tileKey: bossData} → array
    // UI dùng index (bossEntryIdx) để lookup
    get activeBosses() {
      if (!_state || !_state.activeBosses) return [];
      return Object.entries(_state.activeBosses).map(function ([tileKey, b], i) {
        return Object.assign({}, b, {
          tileKey:    tileKey,
          bossId:     b.id,
          entryIdx:   i,
        });
      });
    },

    setState: function (newState) {
      if (!newState) return;
      _state = newState;
      _scheduleSave();
    },

    init: function (state) {
      _state = state;
      _scheduleSave();
    },

    clear: function () { _state = null; },
  };
})();

// ── HELPERS ───────────────────────────────────────────
function _S(fnName) {
  if (!gs._state) {
    console.error('[DW Shim] ' + fnName + ': state chưa init.');
    return null;
  }
  return gs._state;
}

function _apply(result) {
  if (result && result.state) gs.setState(result.state);
  return result;
}

// ══════════════════════════════════════════════════════
// MOVEMENT
// ══════════════════════════════════════════════════════
const _DIRS = { n:[0,-1], s:[0,1], e:[1,0], w:[-1,0] };

DW_move = function (dir) {
  const s = _S('DW_move');
  if (!s) return { ok:false, msg:'Không có state.' };
  const [dx, dy] = _DIRS[dir] || [0,0];
  return _apply(_raw.DW_move(s, dx, dy));
};

DW_enterApproached = function () {
  const s = _S('DW_enterApproached');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_enterApproached(s));
};

DW_retreatApproach = function () {
  const s = _S('DW_retreatApproach');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_retreatApproach(s));
};

// Đọc tile hiện tại — không mutate
DW_currentTile = function () {
  const s = gs._state;
  if (!s) return null;
  return s.tiles ? (s.tiles[s.x + ',' + s.y] || null) : null;
};

// Trả về mảng directions có thể đi
DW_getExits = function () {
  const s = gs._state;
  if (!s) return [];
  const dirs = [
    { id:'n', dx:0,  dy:-1, label:'Bắc' },
    { id:'s', dx:0,  dy:1,  label:'Nam'  },
    { id:'e', dx:1,  dy:0,  label:'Đông' },
    { id:'w', dx:-1, dy:0,  label:'Tây'  },
  ];
  return dirs.filter(function (d) {
    const nx = s.x + d.dx;
    const ny = s.y + d.dy;
    if (nx < 0 || ny < 0 || nx >= DW_WORLD_SIZE || ny >= DW_WORLD_SIZE) return false;
    const tile = s.tiles ? s.tiles[nx + ',' + ny] : null;
    if (!tile) return true;
    return (MOVE_COST[tile.type] || 1) < 99;
  });
};

// ══════════════════════════════════════════════════════
// COMBAT
// ══════════════════════════════════════════════════════

// DW_fight(idx, mode?, throwIdx?)
// idx  = index trong tile.objects[]
// mode = 'normal'|'heavy'|'stealth'|'item'
DW_fight = function (idx, mode, throwIdx) {
  const s = _S('DW_fight');
  if (!s) return { ok:false, msg:'Không có state.' };

  const tileKey = s.x + ',' + s.y;
  const tile    = s.tiles ? s.tiles[tileKey] : null;
  if (!tile) return { ok:false, msg:'Không có tile.', state:s };

  const obj = tile.objects ? tile.objects[idx] : null;
  if (!obj) return { ok:false, msg:'Không tìm thấy đối tượng.', state:s };

  const opts = {};
  if (mode === 'heavy')   opts.heavy   = true;
  if (mode === 'stealth') opts.stealth = true;
  if (mode === 'item' && throwIdx !== undefined) opts.throwIdx = throwIdx;

  return _apply(_raw.DW_fight(s, obj.id, opts));
};

// DW_fightBoss(bossEntryIdx, mode)
// Dùng engine DW_fight với objId=null — engine detect boss qua activeBosses[tileKey]
DW_fightBoss = function (bossEntryIdx, mode) {
  const s = _S('DW_fightBoss');
  if (!s) return { ok:false, msg:'Không có state.' };

  const tileKey  = s.x + ',' + s.y;
  const bossData = s.activeBosses ? s.activeBosses[tileKey] : null;
  if (!bossData) return { ok:false, msg:'Không có boss tại tile này.', state:s };

  const opts = mode === 'heavy' ? { heavy:true } : {};
  // objId = null → engine skip obj lookup và fight boss trực tiếp
  return _apply(_raw.DW_fight(s, null, opts));
};

// DW_flee(dir?) — dir không dùng, flee enemy đầu tiên trong tile hiện tại
DW_flee = function (dir) {
  const s = _S('DW_flee');
  if (!s) return { ok:false, msg:'Không có state.' };

  const tileKey = s.x + ',' + s.y;
  const tile    = s.tiles ? s.tiles[tileKey] : null;
  const enemy   = (tile ? tile.objects || [] : []).find(function (o) {
    return o.alive !== false && OBJECT_DEFS && OBJECT_DEFS[o.type] && OBJECT_DEFS[o.type].type === 'enemy';
  });

  return _apply(_raw.DW_flee(s, enemy ? enemy.id : null));
};

// ══════════════════════════════════════════════════════
// INVENTORY
// ══════════════════════════════════════════════════════

// DW_search(idx, deep?) — idx là index trong tile.objects[]
DW_search = function (idx, deep) {
  const s = _S('DW_search');
  if (!s) return { ok:false, msg:'Không có state.' };

  const tile = s.tiles ? s.tiles[s.x + ',' + s.y] : null;
  const obj  = tile ? (tile.objects ? tile.objects[idx] : null) : null;
  if (!obj) return { ok:false, msg:'Không tìm thấy đối tượng.', state:s };

  return _apply(_raw.DW_searchObject(s, obj.id));
};

// DW_useItem(i) — i là index trong inventory hoặc itemId string
DW_useItem = function (i) {
  const s = _S('DW_useItem');
  if (!s) return { ok:false, msg:'Không có state.' };

  const itemId = (typeof i === 'number') ? (s.inventory ? s.inventory[i] : null) : i;
  if (!itemId) return { ok:false, msg:'Item không tồn tại.', state:s };

  return _apply(_raw.DW_useItem(s, itemId));
};

DW_equipItem = function (itemId) {
  const s = _S('DW_equipItem');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_equipItem(s, itemId));
};

DW_unequipSlot = function (slot) {
  const s = _S('DW_unequipSlot');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_unequipSlot(s, slot));
};

DW_dropItem = function (itemId) {
  const s = _S('DW_dropItem');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_dropItem(s, itemId));
};

// DW_repairEquip(slot) — UI gọi, engine là DW_repair(state, slot)
DW_repairEquip = function (slot) {
  const s = _S('DW_repairEquip');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_repair(s, slot));
};

DW_craft = function (recipeId) {
  const s = _S('DW_craft');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_craft(s, recipeId));
};

// DW_maxCarry() — đọc, không mutate
DW_maxCarry = function () {
  const s = gs._state;
  if (!s) return 20;
  const fitnessBonus = (s.skills ? s.skills.fitness || 0 : 0);
  const cartBonus    = (s.inventory || []).includes('supply_cart') ? 25 : 0;
  return 20 + fitnessBonus + cartBonus;
};

// ══════════════════════════════════════════════════════
// SURVIVAL
// ══════════════════════════════════════════════════════

DW_rest = function () {
  const s = _S('DW_rest');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_rest(s));
};

DW_sleep = function () {
  const s = _S('DW_sleep');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_sleep(s));
};

DW_barricade = function () {
  const s = _S('DW_barricade');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_barricade(s));
};

DW_upgradeBase = function () {
  const s = _S('DW_upgradeBase');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_upgradeBase(s));
};

// ══════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════

// DW_spendSP(skillKey) — UI gọi, engine là DW_spendSkillPoint(state, skillKey)
DW_spendSP = function (skillKey) {
  const s = _S('DW_spendSP');
  if (!s) return { ok:false, msg:'Không có state.' };
  return _apply(_raw.DW_spendSkillPoint(s, skillKey));
};

// ══════════════════════════════════════════════════════
// GAME LIFECYCLE
// ══════════════════════════════════════════════════════

DW_startNewGame = function (jobId, seed) {
  if (typeof DW_newGame !== 'function') {
    console.error('[DW Shim] DW_newGame chưa được load.');
    return null;
  }
  const state = DW_newGame(jobId, seed);
  gs.init(state);
  return state;
};

DW_loadGame = function () {
  if (typeof DW_load !== 'function') return null;
  const state = DW_load();
  if (state) { gs.init(state); return state; }
  return null;
};

DW_saveGame = function () {
  if (!gs._state || typeof DW_save !== 'function') return false;
  DW_save(gs._state);
  return true;
};

// Tick — gọi mỗi frame từ UI game loop
DW_tickShim = function (nowMs) {
  if (!gs._state || typeof DW_tick !== 'function') return;
  const next = DW_tick(gs._state, nowMs);
  if (next && next !== gs._state) gs._state = next; // silent — không trigger save
};

// ══════════════════════════════════════════════════════
// FIX BUG 2: Loot popup tự động sau setState
// Combat overlay đóng rồi mới gọi gs.setState — 
// Hook setState để auto-trigger ZUI_checkAndShowLootPopup
// ══════════════════════════════════════════════════════
;(function () {
  const _origSetState = gs.setState.bind(gs);

  gs.setState = function (newState) {
    _origSetState(newState);

    // Nếu có loot pending và chưa có modal → show sau delay
    if (!newState || !newState.pendingZombieLoot) return;
    if (!newState.pendingZombieLoot.items || newState.pendingZombieLoot.items.length === 0) return;

    const existingModal = document.getElementById('zui-loot-modal');
    if (existingModal) return;

    // Delay đủ để combat overlay đóng xong
    const combatOverlay = document.getElementById('combat-overlay');
    const delay = (combatOverlay && combatOverlay.classList.contains('show')) ? 800 : 150;

    setTimeout(function () {
      if (typeof ZUI_checkAndShowLootPopup === 'function') {
        ZUI_checkAndShowLootPopup(gs._state);
      }
    }, delay);
  };
})();

// ══════════════════════════════════════════════════════
// MISSING HELPERS — được index.html gọi trực tiếp
// ══════════════════════════════════════════════════════

// DW_hasSave() — kiểm tra có save trong localStorage không
// index.html gọi ở DOMContentLoaded để hiện nút Load
DW_hasSave = function () {
  try { return !!localStorage.getItem(DW_SAVE_KEY); }
  catch(e) { return false; }
};

// DW_getViewState() — trả về snapshot UI-friendly từ state hiện tại
// UI_renderHeader gọi để lấy time.lightLabel và các giá trị display
DW_getViewState = function () {
  const s = gs._state;
  if (!s) return { time: { lightLabel:'—', hour:8, day:1 }, ap:{ max:40 } };
  const h = s.hour || 8;
  const lightLabel = (h>=6&&h<12)?'SÁNG':(h>=12&&h<18)?'CHIỀU':(h>=18&&h<21)?'TỐI':'ĐÊM';
  return {
    time: {
      day:        s.day  || 1,
      hour:       h,
      lightLabel,
    },
    ap: {
      current: s.ap || 0,
      max:     typeof DW_apMax === 'function' ? DW_apMax(s) : (s.maxAp || 40),
    },
  };
};

// DW_newGame wrapper — index.html gọi DW_newGame(name, jobId, attrs)
// nhưng engine nhận (jobId, seed) — shim normalize lại
;(function () {
  const _rawNewGame = typeof DW_newGame === 'function' ? DW_newGame : null;
  DW_newGame = function (nameOrJobId, jobIdOrSeed, attrs) {
    // Nếu gọi 3 tham số: (name, jobId, attrs) → chỉ cần jobId
    // Nếu gọi 2 tham số: (jobId, seed) → pass-through
    const jobId = (typeof jobIdOrSeed === 'string') ? jobIdOrSeed : nameOrJobId;
    const seed  = (typeof jobIdOrSeed === 'string') ? undefined    : jobIdOrSeed;
    if (!_rawNewGame) { console.error('[DW Shim] DW_newGame chưa load.'); return null; }
    const state = _rawNewGame(jobId, seed);
    if (state) gs.init(state);
    return state;
  };
})();

// DW_load wrapper ở index.html gọi trực tiếp (không qua DW_loadGame)
// Wrap lại để auto-init gs khi load thành công
;(function () {
  const _rawLoad = typeof DW_load === 'function' ? DW_load : null;
  DW_load = function () {
    if (!_rawLoad) return null;
    const result = _rawLoad(); // trả về { state, offlineHours } hoặc null
    if (result && result.state) {
      gs.init(result.state);
      return result; // UI có thể check .state hoặc truthy check
    }
    return null;
  };
})();

// ══════════════════════════════════════════════════════
console.log('[DW Shim v3] Loaded. gs API ready.');
