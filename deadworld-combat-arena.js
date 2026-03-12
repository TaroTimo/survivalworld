// ══════════════════════════════════════════════════════
// DEAD WORLD — deadworld-combat-arena.js
// Canvas Pixel Art Combat Arena
//
// ĐÂY LÀ UI LAYER THUẦN TÚY.
// Không chứa game logic. Không modify state.
// Chỉ visualize kết quả từ engine-combat.js.
//
// Load SAU deadworld-shim.js (cuối danh sách script).
// Gọi DWArena.show(state) để mở arena.
// Gọi DWArena.hide() để đóng.
//
// Kiến trúc:
//   engine-combat.js  ← xử lý tất cả logic
//   deadworld-combat-arena.js ← render pixel art lên Canvas
//
// KHÔNG modify:
//   - gs (global state)
//   - DW_fight / DW_flee / bất kỳ engine function nào
//
// ══════════════════════════════════════════════════════

var DWArena = (function () {
  'use strict';

  // ── CONSTANTS ──────────────────────────────────────
  var TILE_W  = 32;
  var TILE_H  = 28;
  var COLS    = 12;
  var ROWS    = 7;
  var CANVAS_W = TILE_W * COLS;
  var CANVAS_H = TILE_H * ROWS;

  // Pixel color palette — post-apocalyptic
  var PAL = {
    bg:          '#0a0808',
    ground:      '#1a1510',
    ground2:     '#1e1812',
    wall:        '#2a2018',
    wall2:       '#352818',
    crack:       '#110d08',
    fire:        ['#ff6600','#ff4400','#ff8800','#ffaa00'],
    smoke:       'rgba(40,30,20,0.4)',
    player:      '#e8d090',
    playerShirt: '#4a6080',
    playerShirt2:'#3a5070',
    zombie:      '#607050',
    zombie2:     '#4a5840',
    zombieEye:   '#cc2200',
    zombieDark:  '#384530',
    blood:       '#7a1515',
    blood2:      '#5a0d0d',
    hit:         '#ff3300',
    miss:        '#445566',
    laser:       '#4488ff',
    laser2:      '#88bbff',
    beam_red:    '#ff2200',
    beam_red2:   '#ff6644',
    slash:       '#ffffaa',
    slash2:      '#ffcc44',
    bullet:      '#ffdd44',
    ui_bg:       '#0c0a08',
    ui_border:   '#2a2018',
    ui_amber:    '#f0c000',
    ui_red:      '#cc2200',
    ui_green:    '#44aa44',
    ui_blue:     '#4488cc',
    ui_dim:      '#554433',
    hp_full:     '#cc2200',
    hp_low:      '#ff4400',
    boss_glow:   'rgba(200,50,0,0.15)',
  };

  // ── STATE ──────────────────────────────────────────
  var _canvas   = null;
  var _ctx      = null;
  var _overlay  = null;
  var _raf      = null;
  var _tick     = 0;
  var _visible  = false;

  // Arena internal state (KHÔNG phải gs._state)
  var _arena = {
    enemies:    [],   // { id, type, hp, maxHp, x, y, px, py, dead, flash, flashTimer }
    player:     { px: 0, py: 0, flashTimer: 0, flashColor: '' },
    effects:    [],   // { type, x, y, life, maxLife, ... }
    log:        [],   // { text, color, alpha }
    lastMsg:    '',
    phase:      'idle', // 'idle' | 'player_attack' | 'enemy_attack' | 'result'
    boss:       null,   // boss data nếu có
    pendingCombat: null,
  };

  // ── DOM SETUP ──────────────────────────────────────
  function _createDOM() {
    if (document.getElementById('dwa-overlay')) return;

    // Inject styles
    var style = document.createElement('style');
    style.id = 'dwa-styles';
    style.textContent = [
      '#dwa-overlay{',
        'position:fixed;inset:0;z-index:9000;',
        'background:#000;display:none;flex-direction:column;',
        'font-family:"Rajdhani",sans-serif;',
        'user-select:none;-webkit-user-select:none;',
      '}',
      '#dwa-overlay.active{display:flex;}',

      // Top HUD — resource bar kiểu hình tham khảo
      '#dwa-hud{',
        'flex-shrink:0;height:52px;background:#0c0a08;',
        'border-bottom:2px solid #2a1a08;',
        'display:flex;align-items:center;gap:0;overflow:hidden;',
      '}',
      '.dwa-hud-block{',
        'display:flex;flex-direction:column;align-items:center;',
        'justify-content:center;padding:4px 14px;',
        'border-right:1px solid #2a1a08;min-width:64px;',
      '}',
      '.dwa-hud-icon{font-size:22px;line-height:1;}',
      '.dwa-hud-val{',
        'font-family:"Bebas Neue",sans-serif;font-size:18px;',
        'color:#f0c000;line-height:1;letter-spacing:1px;',
      '}',
      '.dwa-hud-lbl{',
        'font-family:"Share Tech Mono",monospace;font-size:8px;',
        'color:#554433;letter-spacing:2px;text-transform:uppercase;',
      '}',
      '#dwa-hud-title{',
        'flex:1;text-align:center;',
        'font-family:"Bebas Neue",sans-serif;font-size:22px;',
        'letter-spacing:4px;color:#cc2200;',
      '}',
      '#dwa-close-btn{',
        'margin-right:12px;padding:6px 14px;',
        'background:#1a0a0a;border:1px solid #7a1515;',
        'color:#cc4444;font-family:"Share Tech Mono",monospace;',
        'font-size:11px;letter-spacing:2px;cursor:pointer;',
        'transition:background .15s,color .15s;',
      '}',
      '#dwa-close-btn:hover{background:#7a1515;color:#fff;}',

      // Canvas area
      '#dwa-canvas-wrap{',
        'flex:1;display:flex;align-items:center;justify-content:center;',
        'background:#080604;position:relative;overflow:hidden;',
        'min-height:0;',
      '}',
      '#dwa-canvas{',
        'image-rendering:pixelated;image-rendering:crisp-edges;',
        'max-width:100%;max-height:100%;',
      '}',

      // Scanline CRT effect
      '#dwa-canvas-wrap::after{',
        'content:"";position:absolute;inset:0;pointer-events:none;',
        'background:repeating-linear-gradient(',
          '0deg,transparent,transparent 2px,',
          'rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 3px',
        ');',
      '}',

      // Bottom action panel
      '#dwa-actions{',
        'flex-shrink:0;background:#0c0a08;',
        'border-top:2px solid #2a1a08;',
        'display:flex;flex-direction:column;gap:0;',
      '}',
      '#dwa-log{',
        'padding:6px 14px;min-height:36px;max-height:52px;',
        'overflow:hidden;',
        'font-family:"Share Tech Mono",monospace;font-size:11px;',
        'color:#a09080;line-height:1.4;',
        'border-bottom:1px solid #1a1208;',
      '}',
      '#dwa-btn-row{',
        'display:flex;gap:0;padding:8px 10px;',
      '}',
      '.dwa-btn{',
        'flex:1;padding:10px 6px;margin:0 4px;',
        'background:#110e08;border:1px solid #2a1a08;',
        'color:#a09060;font-family:"Rajdhani",sans-serif;',
        'font-size:14px;font-weight:700;letter-spacing:1px;',
        'cursor:pointer;text-align:center;position:relative;',
        'transition:all .15s;',
      '}',
      '.dwa-btn:hover:not(:disabled){',
        'background:#1e160a;border-color:#f0c000;color:#f0c000;',
      '}',
      '.dwa-btn:disabled{opacity:0.4;cursor:not-allowed;}',
      '.dwa-btn .dwa-ap{',
        'display:block;font-size:9px;color:#554433;',
        'font-family:"Share Tech Mono",monospace;margin-top:2px;',
      '}',
      '.dwa-btn-attack{border-color:#7a1515;}',
      '.dwa-btn-attack:hover:not(:disabled){',
        'background:#2a0808;border-color:#cc2200;color:#ff4444;',
      '}',
      '.dwa-btn-flee{border-color:#1a3050;}',
      '.dwa-btn-rest{border-color:#1a3a1a;color:#7aaa7a;}',
      '.dwa-btn-rest:hover:not(:disabled){background:#0a1a0a;border-color:#44cc44;color:#88ff88;}',
      '.dwa-btn-rest.threat-warning{border-color:#aa6600;color:#ffaa44;animation:pulse-warning 1s infinite;}',
      '@keyframes pulse-warning{0%,100%{opacity:1}50%{opacity:0.6}}',

      // Enemy cards
      '#dwa-enemy-list{',
        'display:flex;gap:8px;padding:6px 10px;',
        'overflow-x:auto;border-bottom:1px solid #1a1208;',
        'flex-shrink:0;',
      '}',
      '.dwa-enemy-card{',
        'min-width:80px;padding:6px 8px;',
        'background:#0f0c08;border:1px solid #2a1a08;',
        'cursor:pointer;transition:all .15s;flex-shrink:0;',
      '}',
      '.dwa-enemy-card.selected{border-color:#f0c000;background:#1a1400;}',
      '.dwa-enemy-card.dead{opacity:0.3;cursor:not-allowed;border-color:#111;}',
      '.dwa-enemy-card .ec-icon{font-size:18px;line-height:1;}',
      '.dwa-enemy-card .ec-name{',
        'font-size:10px;color:#887766;margin-top:2px;',
        'font-family:"Share Tech Mono",monospace;',
      '}',
      '.dwa-enemy-card .ec-hp{',
        'font-size:9px;color:#cc2200;margin-top:1px;',
        'font-family:"Share Tech Mono",monospace;',
      '}',
      '.ec-hpbar{height:3px;background:#1a0a0a;margin-top:3px;border-radius:1px;}',
      '.ec-hpfill{height:100%;background:#cc2200;border-radius:1px;transition:width .3s;}',
    ].join('');
    document.head.appendChild(style);

    // Overlay container
    _overlay = document.createElement('div');
    _overlay.id = 'dwa-overlay';
    _overlay.innerHTML = [
      '<div id="dwa-hud">',
        '<div class="dwa-hud-block">',
          '<div class="dwa-hud-icon">❤️</div>',
          '<div class="dwa-hud-val" id="dwa-hp">--</div>',
          '<div class="dwa-hud-lbl">HP</div>',
        '</div>',
        '<div class="dwa-hud-block">',
          '<div class="dwa-hud-icon">⚡</div>',
          '<div class="dwa-hud-val" id="dwa-ap">--</div>',
          '<div class="dwa-hud-lbl">AP</div>',
        '</div>',
        '<div class="dwa-hud-block">',
          '<div class="dwa-hud-icon">🔫</div>',
          '<div class="dwa-hud-val" id="dwa-ammo">--</div>',
          '<div class="dwa-hud-lbl">ĐẠN</div>',
        '</div>',
        '<div id="dwa-hud-title">⚔ CHIẾN ĐẤU</div>',
        '<button id="dwa-close-btn">✕ THOÁT</button>',
      '</div>',

      '<div id="dwa-canvas-wrap">',
        '<canvas id="dwa-canvas"></canvas>',
      '</div>',

      '<div id="dwa-actions">',
        '<div id="dwa-enemy-list"></div>',
        '<div id="dwa-log">Chọn kẻ thù để tấn công.</div>',
        '<div id="dwa-btn-row">',
          '<button class="dwa-btn dwa-btn-attack" id="dwa-btn-fight" disabled>',
            '⚔ TẤN CÔNG',
            '<span class="dwa-ap" id="dwa-btn-fight-ap">-3 SB</span>',
          '</button>',
          '<button class="dwa-btn dwa-btn-attack" id="dwa-btn-heavy" disabled>',
            '💥 ĐÒN MẠNH',
            '<span class="dwa-ap">-4 SB +1 ĐHĐ</span>',
          '</button>',
          '<button class="dwa-btn dwa-btn-attack" id="dwa-btn-stealth" disabled>',
            '🗡 ÁM SÁT',
            '<span class="dwa-ap">-3 SB</span>',
          '</button>',
          '<button class="dwa-btn dwa-btn-rest" id="dwa-btn-rest">',
            '😮‍💨 NGHỈ',
            '<span class="dwa-ap" id="dwa-btn-rest-lbl">Zombie phản công</span>',
          '</button>',
          '<button class="dwa-btn dwa-btn-flee" id="dwa-btn-flee">',
            '🏃 BỎ CHẠY',
            '<span class="dwa-ap">-2 ĐHĐ</span>',
          '</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(_overlay);

    // Canvas
    _canvas = document.getElementById('dwa-canvas');
    _canvas.width  = CANVAS_W;
    _canvas.height = CANVAS_H;
    _ctx = _canvas.getContext('2d');
    _ctx.imageSmoothingEnabled = false;

    // Events
    document.getElementById('dwa-close-btn').addEventListener('click', hide);
    document.getElementById('dwa-btn-fight').addEventListener('click', function () {
      _doAttack('normal');
    });
    document.getElementById('dwa-btn-heavy').addEventListener('click', function () {
      _doAttack('heavy');
    });
    document.getElementById('dwa-btn-stealth').addEventListener('click', function () {
      _doAttack('stealth');
    });
    document.getElementById('dwa-btn-rest').addEventListener('click', _doThreatRound);
    document.getElementById('dwa-btn-flee').addEventListener('click', _doFlee);
  }

  // ── PIXEL ART RENDERER ────────────────────────────
  // Mỗi "pixel block" là TILE_W x TILE_H trên Canvas

  // Vẽ 1 ô đất (ground tile)
  function _drawGround(x, y) {
    var cx = x * TILE_W;
    var cy = y * TILE_H;
    var alt = (x + y) % 2 === 0;

    _ctx.fillStyle = alt ? PAL.ground : PAL.ground2;
    _ctx.fillRect(cx, cy, TILE_W, TILE_H);

    // Vết nứt ngẫu nhiên dựa vào tọa độ (deterministic)
    var seed = (x * 31 + y * 17) % 7;
    if (seed < 2) {
      _ctx.fillStyle = PAL.crack;
      _ctx.fillRect(cx + seed * 4 + 6, cy + 8, 1, 6);
      _ctx.fillRect(cx + seed * 4 + 7, cy + 12, 2, 1);
    }
  }

  // Vẽ tường phía sau (row 0 và 1)
  function _drawWall(x, y) {
    var cx = x * TILE_W;
    var cy = y * TILE_H;

    _ctx.fillStyle = (x % 3 === 0) ? PAL.wall2 : PAL.wall;
    _ctx.fillRect(cx, cy, TILE_W, TILE_H);

    // Gạch pattern
    var brickRow = Math.floor(cy / 8);
    var offsetX  = (brickRow % 2 === 0) ? 0 : 12;
    _ctx.fillStyle = PAL.crack;
    for (var bx = offsetX; bx < TILE_W; bx += 16) {
      _ctx.fillRect(cx + bx, cy, 1, TILE_H);
    }
    _ctx.fillRect(cx, cy, TILE_W, 1);
  }

  // Lửa / debris (background decoration)
  function _drawFire(cx, cy, t) {
    var phases = PAL.fire;
    var fi = Math.floor(t / 4) % phases.length;
    // Thân lửa
    _ctx.fillStyle = phases[fi];
    _ctx.fillRect(cx + 10, cy + 14, 4, 8);
    _ctx.fillRect(cx + 8,  cy + 18, 8, 5);
    // Lõi trắng
    _ctx.fillStyle = '#ffeeaa';
    _ctx.fillRect(cx + 11, cy + 17, 2, 4);
    // Khói
    var alpha = 0.2 + 0.15 * Math.sin(t * 0.1);
    _ctx.fillStyle = 'rgba(60,50,40,' + alpha + ')';
    _ctx.fillRect(cx + 8, cy + 6, 8, 8);
  }

  // Vẽ player character (pixel art 16x22)
  function _drawPlayer(px, py, flashColor) {
    var cx = Math.round(px);
    var cy = Math.round(py);

    if (flashColor) {
      _ctx.fillStyle = flashColor;
      _ctx.fillRect(cx - 2, cy - 2, 22, 28);
    }

    // Đầu
    _ctx.fillStyle = PAL.player;
    _ctx.fillRect(cx + 4, cy, 10, 10);
    // Mắt
    _ctx.fillStyle = '#222';
    _ctx.fillRect(cx + 6, cy + 3, 2, 2);
    _ctx.fillRect(cx + 10, cy + 3, 2, 2);
    // Tóc
    _ctx.fillStyle = '#443322';
    _ctx.fillRect(cx + 4, cy, 10, 2);
    _ctx.fillRect(cx + 4, cy + 2, 2, 2);
    // Thân
    _ctx.fillStyle = PAL.playerShirt;
    _ctx.fillRect(cx + 2, cy + 10, 14, 10);
    // Bóng tối áo
    _ctx.fillStyle = PAL.playerShirt2;
    _ctx.fillRect(cx + 2, cy + 18, 14, 2);
    // Tay trái
    _ctx.fillStyle = PAL.player;
    _ctx.fillRect(cx, cy + 10, 2, 8);
    // Tay phải
    _ctx.fillRect(cx + 16, cy + 10, 2, 8);
    // Chân
    _ctx.fillStyle = '#2a2030';
    _ctx.fillRect(cx + 3, cy + 20, 5, 6);
    _ctx.fillRect(cx + 10, cy + 20, 5, 6);
    // Giày
    _ctx.fillStyle = '#1a1015';
    _ctx.fillRect(cx + 2, cy + 24, 6, 2);
    _ctx.fillRect(cx + 10, cy + 24, 6, 2);
  }

  // Vẽ zombie (pixel art 14x22, màu xanh xám)
  function _drawZombie(px, py, type, t, flash) {
    var cx = Math.round(px);
    var cy = Math.round(py);

    if (flash) {
      _ctx.fillStyle = '#ff4400';
      _ctx.fillRect(cx - 2, cy - 2, 20, 28);
    }

    var bodyCol  = type === 'zombie_fast' ? '#506845' : PAL.zombie;
    var bodyCol2 = type === 'zombie_fast' ? '#3d5034' : PAL.zombie2;
    var darkCol  = PAL.zombieDark;

    // Đầu zombie — lớn hơn, méo
    _ctx.fillStyle = bodyCol;
    _ctx.fillRect(cx + 2, cy, 12, 11);
    // Vết thương trên đầu
    _ctx.fillStyle = PAL.blood;
    _ctx.fillRect(cx + 5, cy, 4, 2);
    // Mắt đỏ phát sáng
    _ctx.fillStyle = PAL.zombieEye;
    _ctx.fillRect(cx + 4, cy + 3, 2, 2);
    _ctx.fillRect(cx + 10, cy + 3, 2, 2);
    // Pupil trắng nhỏ (flicker)
    if (Math.floor(t / 15) % 3 !== 0) {
      _ctx.fillStyle = '#ffcccc';
      _ctx.fillRect(cx + 4, cy + 3, 1, 1);
      _ctx.fillRect(cx + 10, cy + 3, 1, 1);
    }
    // Miệng há
    _ctx.fillStyle = '#1a0808';
    _ctx.fillRect(cx + 5, cy + 7, 6, 2);
    _ctx.fillStyle = '#cc1100';
    _ctx.fillRect(cx + 6, cy + 8, 4, 1);

    // Thân — rách
    _ctx.fillStyle = bodyCol2;
    _ctx.fillRect(cx + 1, cy + 11, 14, 10);
    _ctx.fillStyle = darkCol;
    _ctx.fillRect(cx + 1, cy + 19, 14, 2);
    // Rách áo
    _ctx.fillStyle = bodyCol;
    _ctx.fillRect(cx + 7, cy + 13, 2, 5);
    _ctx.fillRect(cx + 4, cy + 15, 2, 3);

    // Tay vươn ra (animation)
    var armSwing = Math.sin(t * 0.08) * 2;
    _ctx.fillStyle = bodyCol;
    _ctx.fillRect(cx - 2, cy + 11 + Math.round(armSwing), 3, 9);
    _ctx.fillRect(cx + 15, cy + 11 - Math.round(armSwing), 3, 9);

    // Chân
    _ctx.fillStyle = darkCol;
    var legL = Math.sin(t * 0.08) > 0 ? 1 : 0;
    _ctx.fillRect(cx + 2, cy + 21, 4, 5 + legL);
    _ctx.fillRect(cx + 10, cy + 21, 4, 5 - legL + 1);
    // Vết máu dưới chân
    _ctx.fillStyle = PAL.blood2;
    _ctx.fillRect(cx + 2, cy + 25, 4, 1);
    _ctx.fillRect(cx + 10, cy + 25, 4, 1);
  }

  // Vẽ boss (to hơn, màu đậm hơn)
  function _drawBoss(px, py, bossId, t) {
    var cx = Math.round(px);
    var cy = Math.round(py);
    var scale = 1.6;

    // Glow hào quang đỏ
    var gAlpha = 0.1 + 0.08 * Math.sin(t * 0.05);
    _ctx.fillStyle = 'rgba(200,30,0,' + gAlpha + ')';
    _ctx.fillRect(cx - 8, cy - 4, Math.round(20 * scale) + 16, Math.round(26 * scale) + 8);

    // Thân boss (to hơn zombie thường)
    _ctx.fillStyle = '#3a2820';
    _ctx.fillRect(cx, cy, Math.round(20 * scale), Math.round(26 * scale));

    // Đầu
    _ctx.fillStyle = '#4a3828';
    _ctx.fillRect(cx + 4, cy, Math.round(14 * scale), Math.round(12 * scale));

    // Mắt boss — 3 mắt
    _ctx.fillStyle = '#ff2200';
    _ctx.fillRect(cx + 6,  cy + 4, 3, 3);
    _ctx.fillRect(cx + 13, cy + 4, 3, 3);
    _ctx.fillRect(cx + 10, cy + 2, 2, 2); // mắt thứ ba
    // Flicker
    if (Math.floor(t / 10) % 2 === 0) {
      _ctx.fillStyle = '#ff8866';
      _ctx.fillRect(cx + 6, cy + 4, 1, 1);
      _ctx.fillRect(cx + 13, cy + 4, 1, 1);
    }

    // Nanh
    _ctx.fillStyle = '#ffe0a0';
    _ctx.fillRect(cx + 8,  cy + 10, 2, 4);
    _ctx.fillRect(cx + 14, cy + 10, 2, 4);

    // Thân to
    _ctx.fillStyle = '#382018';
    _ctx.fillRect(cx + 2, cy + 18, Math.round(18 * scale), 16);

    // Tay khổng lồ
    var swing = Math.round(Math.sin(t * 0.06) * 3);
    _ctx.fillStyle = '#2a1810';
    _ctx.fillRect(cx - 4, cy + 16 + swing, 6, 14);
    _ctx.fillRect(cx + Math.round(16 * scale), cy + 16 - swing, 6, 14);

    // Nhãn boss
    _ctx.fillStyle = '#ff4400';
    _ctx.font = 'bold 7px "Share Tech Mono",monospace';
    _ctx.textAlign = 'center';
    _ctx.fillText('BOSS', cx + Math.round(10 * scale), cy - 4);
  }

  // ── EFFECTS RENDERER ──────────────────────────────

  // Thêm hiệu ứng vào queue
  function _addEffect(type, x, y, opts) {
    _arena.effects.push(Object.assign({ type: type, x: x, y: y, life: 0, maxLife: opts.maxLife || 20 }, opts));
  }

  // Vẽ tất cả hiệu ứng
  function _drawEffects(t) {
    var survivors = [];
    for (var i = 0; i < _arena.effects.length; i++) {
      var e = _arena.effects[i];
      e.life++;
      var progress = e.life / e.maxLife; // 0 → 1
      var alpha    = 1 - progress;

      if (e.type === 'slash') {
        // Đường chém — màu vàng/trắng
        _ctx.save();
        _ctx.globalAlpha = alpha;
        _ctx.strokeStyle = progress < 0.3 ? PAL.slash : PAL.slash2;
        _ctx.lineWidth   = 3 - progress * 2;
        _ctx.beginPath();
        _ctx.moveTo(e.x,          e.y + e.len * 0.5);
        _ctx.lineTo(e.x + e.len,  e.y - e.len * 0.3);
        _ctx.stroke();
        // Đường chém thứ hai (echo)
        _ctx.globalAlpha = alpha * 0.5;
        _ctx.strokeStyle = '#ffffff';
        _ctx.lineWidth = 1;
        _ctx.beginPath();
        _ctx.moveTo(e.x + 2,       e.y + e.len * 0.5 - 2);
        _ctx.lineTo(e.x + e.len - 2, e.y - e.len * 0.3 - 2);
        _ctx.stroke();
        _ctx.restore();

      } else if (e.type === 'bullet') {
        // Viên đạn bay
        var bx = e.x + (e.tx - e.x) * progress;
        var by = e.y + (e.ty - e.y) * progress;
        _ctx.save();
        _ctx.globalAlpha = alpha;
        _ctx.fillStyle = PAL.bullet;
        _ctx.fillRect(bx - 3, by - 1, 6, 2);
        // Đuôi đạn
        _ctx.fillStyle = '#ffaa00';
        _ctx.fillRect(bx - 7, by - 1, 5, 2);
        _ctx.restore();

      } else if (e.type === 'laser') {
        // Tia laser xanh (firearm high-level)
        _ctx.save();
        _ctx.globalAlpha = alpha * 0.9;
        _ctx.strokeStyle = PAL.laser2;
        _ctx.lineWidth   = 4;
        _ctx.beginPath();
        _ctx.moveTo(e.x, e.y);
        _ctx.lineTo(e.tx, e.ty);
        _ctx.stroke();
        _ctx.strokeStyle = PAL.laser;
        _ctx.lineWidth = 2;
        _ctx.beginPath();
        _ctx.moveTo(e.x, e.y);
        _ctx.lineTo(e.tx, e.ty);
        _ctx.stroke();
        // Đầu laser sáng
        _ctx.globalAlpha = alpha;
        _ctx.fillStyle = '#ffffff';
        _ctx.fillRect(e.tx - 3, e.ty - 3, 6, 6);
        _ctx.restore();

      } else if (e.type === 'beam_red') {
        // Tia đỏ boss
        _ctx.save();
        _ctx.globalAlpha = alpha * 0.85;
        _ctx.strokeStyle = PAL.beam_red2;
        _ctx.lineWidth   = 6;
        _ctx.beginPath();
        _ctx.moveTo(e.x, e.y);
        _ctx.lineTo(e.tx, e.ty);
        _ctx.stroke();
        _ctx.strokeStyle = PAL.beam_red;
        _ctx.lineWidth = 2;
        _ctx.beginPath();
        _ctx.moveTo(e.x, e.y);
        _ctx.lineTo(e.tx, e.ty);
        _ctx.stroke();
        _ctx.restore();

      } else if (e.type === 'hit_number') {
        // Số sát thương nổi lên
        var ny = e.y - progress * 30;
        _ctx.save();
        _ctx.globalAlpha = alpha;
        _ctx.fillStyle   = e.color || '#ff4400';
        _ctx.font        = 'bold ' + (e.big ? '14px' : '11px') + ' "Bebas Neue",sans-serif';
        _ctx.textAlign   = 'center';
        _ctx.fillText(e.text, e.x, ny);
        _ctx.restore();

      } else if (e.type === 'explosion') {
        // Vụ nổ nhỏ — vòng tròn mở rộng
        var radius = progress * e.maxR;
        _ctx.save();
        _ctx.globalAlpha = alpha * 0.7;
        _ctx.strokeStyle = '#ff6600';
        _ctx.lineWidth   = 3;
        _ctx.beginPath();
        _ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        _ctx.stroke();
        _ctx.globalAlpha = alpha * 0.3;
        _ctx.fillStyle   = '#ff3300';
        _ctx.fill();
        _ctx.restore();

      } else if (e.type === 'blood_splat') {
        // Máu bắn
        _ctx.save();
        _ctx.globalAlpha = alpha * 0.8;
        for (var bi = 0; bi < e.drops.length; bi++) {
          var d = e.drops[bi];
          _ctx.fillStyle = d.dark ? PAL.blood2 : PAL.blood;
          _ctx.fillRect(
            e.x + d.dx * progress * e.maxLen,
            e.y + d.dy * progress * e.maxLen,
            d.size, d.size
          );
        }
        _ctx.restore();

      } else if (e.type === 'miss_text') {
        var my = e.y - progress * 20;
        _ctx.save();
        _ctx.globalAlpha = alpha;
        _ctx.fillStyle   = PAL.miss;
        _ctx.font        = '10px "Share Tech Mono",monospace';
        _ctx.textAlign   = 'center';
        _ctx.fillText('MISS', e.x, my);
        _ctx.restore();

      } else if (e.type === 'player_dmg_text') {
        // Số sát thương player nhận — màu đỏ bay lên
        var py2 = e.y - progress * 24;
        _ctx.save();
        _ctx.globalAlpha = alpha;
        _ctx.fillStyle   = '#ff3333';
        _ctx.font        = 'bold 12px "Share Tech Mono",monospace';
        _ctx.textAlign   = 'center';
        _ctx.fillText('-' + (e.dmg || '?'), e.x, py2);
        _ctx.restore();
      }

      if (e.life < e.maxLife) survivors.push(e);
    }
    _arena.effects = survivors;
  }

  // ── MAIN RENDER LOOP ──────────────────────────────
  function _render() {
    if (!_visible) return;
    _tick++;
    _ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1) Background — tường + sàn
    for (var gy = 0; gy < ROWS; gy++) {
      for (var gx = 0; gx < COLS; gx++) {
        if (gy < 2) _drawWall(gx, gy);
        else        _drawGround(gx, gy);
      }
    }

    // 2) Decoration — xe cháy, lửa background
    _ctx.save();
    // Xe phế liệu bên trái
    _ctx.fillStyle = '#2a2018';
    _ctx.fillRect(0, TILE_H * 2, TILE_W * 2, TILE_H * 1.5);
    _ctx.fillStyle = '#1a1410';
    _ctx.fillRect(2, TILE_H * 2 + 4, TILE_W * 2 - 4, TILE_H * 1.5 - 8);
    // Bánh xe
    _ctx.fillStyle = '#111';
    _ctx.fillRect(2,          TILE_H * 3 + 4, 8, 8);
    _ctx.fillRect(TILE_W * 2 - 10, TILE_H * 3 + 4, 8, 8);
    // Lửa trên xe
    _drawFire(TILE_W - 4, TILE_H * 2, _tick);
    _ctx.restore();

    // Thùng phuy bên phải
    _ctx.fillStyle = '#2a2020';
    _ctx.fillRect(CANVAS_W - TILE_W - 4, TILE_H * 2 + 4, TILE_W - 4, TILE_H * 1.5);
    _ctx.fillStyle = '#1a1414';
    _ctx.fillRect(CANVAS_W - TILE_W,     TILE_H * 2 + 8, TILE_W - 10, 4);
    _drawFire(CANVAS_W - TILE_W * 2 + 4, TILE_H * 2 + 4, _tick + 8);

    // Barricade / pallets background
    _ctx.fillStyle = '#2a1a0a';
    _ctx.fillRect(TILE_W * 4, TILE_H * 2, TILE_W * 4, 8);
    _ctx.fillStyle = '#1e1206';
    for (var pi = 0; pi < 4; pi++) {
      _ctx.fillRect(TILE_W * 4 + pi * TILE_W + 2, TILE_H * 2 + 2, TILE_W - 6, 3);
    }

    // 3) Enemies
    for (var ei = 0; ei < _arena.enemies.length; ei++) {
      var enemy = _arena.enemies[ei];
      if (enemy.dead) continue;

      // HP bar trên đầu
      var hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      var barW = TILE_W - 4;
      _ctx.fillStyle = '#1a0808';
      _ctx.fillRect(enemy.px + 2, enemy.py - 6, barW, 3);
      var hpColor = hpRatio > 0.5 ? PAL.hp_full : PAL.hp_low;
      _ctx.fillStyle = hpColor;
      _ctx.fillRect(enemy.px + 2, enemy.py - 6, Math.round(barW * hpRatio), 3);

      // Vẽ enemy sprite
      var flashColor = (enemy.flashTimer > 0) ? PAL.hit : null;
      if (enemy.flashTimer > 0) enemy.flashTimer--;

      if (enemy.isBoss) {
        _drawBoss(enemy.px, enemy.py, enemy.type, _tick);
      } else {
        _drawZombie(enemy.px, enemy.py, enemy.type, _tick + ei * 7, flashColor !== null);
      }

      // Số thứ tự nhỏ
      _ctx.fillStyle = enemy.selected ? PAL.ui_amber : PAL.ui_dim;
      _ctx.font = '8px "Share Tech Mono",monospace';
      _ctx.textAlign = 'center';
      _ctx.fillText(String(ei + 1), enemy.px + 9, enemy.py + 30);
    }

    // 4) Player
    var pFlash = (_arena.player.flashTimer > 0) ? _arena.player.flashColor : null;
    if (_arena.player.flashTimer > 0) _arena.player.flashTimer--;
    _drawPlayer(_arena.player.px, _arena.player.py, pFlash);

    // 5) Effects (trên mọi thứ)
    _drawEffects(_tick);

    // 6) Vignette overlay
    var vGrad = _ctx.createRadialGradient(
      CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_H * 0.2,
      CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_H * 0.9
    );
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
    _ctx.fillStyle = vGrad;
    _ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    _raf = requestAnimationFrame(_render);
  }

  // ── LAYOUT HELPERS ────────────────────────────────

  // Tính vị trí pixel của mỗi enemy theo layout
  function _enemyPixelPos(index, total) {
    // Dàn enemy phía trên, player ở dưới giữa
    var spread = Math.min(total, 6);
    var startX = Math.floor((COLS - spread) / 2);
    var col    = startX + (index % spread);
    var row    = 2 + Math.floor(index / spread);
    return {
      px: col * TILE_W + 4,
      py: row * TILE_H + 2,
    };
  }

  function _playerPixelPos() {
    return {
      px: Math.floor(COLS / 2) * TILE_W - 8,
      py: (ROWS - 2) * TILE_H,
    };
  }

  // ── COMBAT HELPERS ────────────────────────────────

  // Spawn blood effect
  function _spawnBlood(targetPx, targetPy, dmg) {
    var drops = [];
    for (var i = 0; i < 8; i++) {
      drops.push({
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        size: Math.random() < 0.3 ? 3 : 2,
        dark: Math.random() < 0.4,
      });
    }
    _addEffect('blood_splat', targetPx + 8, targetPy + 12, {
      maxLife: 35, drops: drops, maxLen: 20,
    });
    _addEffect('explosion', targetPx + 8, targetPy + 12, {
      maxLife: 12, maxR: 14,
    });
    _addEffect('hit_number', targetPx + 8, targetPy, {
      maxLife: 30, text: '-' + dmg, color: '#ff4400',
      big: dmg >= 5,
    });
  }

  // Spawn projectile effect: player → target enemy
  function _spawnProjectile(type, fromPx, fromPy, toPx, toPy) {
    var sx = fromPx + 8;
    var sy = fromPy + 10;
    var tx = toPx + 8;
    var ty = toPy + 12;

    if (type === 'slash') {
      _addEffect('slash', sx, sy, { maxLife: 18, len: 28 });
    } else if (type === 'laser') {
      _addEffect('laser', sx, sy, { maxLife: 15, tx: tx, ty: ty });
    } else if (type === 'beam_red') {
      _addEffect('beam_red', toPx + 8, toPy + 6, {
        maxLife: 18, tx: fromPx + 8, ty: fromPy + 8,
      });
    } else {
      _addEffect('bullet', sx, sy, { maxLife: 12, tx: tx, ty: ty });
    }
  }

  // Xác định loại projectile dựa vào weapon
  function _getProjectileType(state) {
    var wid = state.equip && state.equip.weapon;
    if (!wid) return 'slash';
    if (typeof ITEM_DB !== 'undefined' && ITEM_DB[wid]) {
      var def = ITEM_DB[wid];
      if (def.tags && def.tags.indexOf('blade') >= 0) return 'slash';
      if (def.tags && def.tags.indexOf('firearm') >= 0) {
        // skill cao → laser visual
        var skillLv = (state.skills && state.skills.firearm) || 0;
        return skillLv >= 3 ? 'laser' : 'bullet';
      }
      if (def.tags && def.tags.indexOf('blunt') >= 0) return 'slash';
    }
    return 'slash';
  }

  // ── PUBLIC API ────────────────────────────────────

  // Cập nhật HUD từ state
  function _updateHUD(state) {
    var hp   = document.getElementById('dwa-hp');
    var ap   = document.getElementById('dwa-ap');
    var ammo = document.getElementById('dwa-ammo');
    if (hp)   hp.textContent   = (state.hp || 0) + '/' + (state.maxHp || 0);
    // Hiển thị STAMINA thay AP trong arena (AP vẫn hiển thị nhỏ hơn)
    var maxStmHud = (typeof DW_staminaMax === 'function') ? DW_staminaMax(state) : (state.maxStamina || 10);
    var curStmHud = state.stamina != null ? state.stamina : maxStmHud;
    if (ap) ap.textContent = curStmHud + '/' + maxStmHud + ' SB';

    // Đạn
    var wid  = state.equip && state.equip.weapon;
    var ammoStr = '∞';
    if (wid && typeof ITEM_DB !== 'undefined' && ITEM_DB[wid]) {
      var wdef = ITEM_DB[wid];
      if (wdef.ammoType && state.ammo) {
        ammoStr = (state.ammo[wdef.ammoType] || 0) + '';
      }
    }
    if (ammo) ammo.textContent = ammoStr;
  }

  // Render danh sách enemy cards + chọn target
  var _selectedEnemyObjId = null;

  function _renderEnemyList(enemies) {
    var list = document.getElementById('dwa-enemy-list');
    if (!list) return;
    list.innerHTML = '';

    for (var i = 0; i < enemies.length; i++) {
      (function (idx, en) {
        var typeDef = (typeof OBJECT_DEFS !== 'undefined') ? (OBJECT_DEFS[en.type] || {}) : {};
        var icon    = en.isBoss ? '☠️' : (typeDef.icon || '🧟');
        var name    = en.isBoss ? (en.bossName || 'BOSS') : (typeDef.label || en.type);
        var hp      = en.hp;
        var maxHp   = en.maxHp;
        var hpPct   = Math.max(0, Math.round(hp / maxHp * 100));

        var card = document.createElement('div');
        card.className = 'dwa-enemy-card' +
          (en.id === _selectedEnemyObjId ? ' selected' : '') +
          (hp <= 0 ? ' dead' : '');
        card.innerHTML =
          '<div class="ec-icon">' + icon + '</div>' +
          '<div class="ec-name">' + name + '</div>' +
          '<div class="ec-hp">' + hp + '/' + maxHp + '</div>' +
          '<div class="ec-hpbar"><div class="ec-hpfill" style="width:' + hpPct + '%"></div></div>';

        if (hp > 0) {
          card.addEventListener('click', function () {
            _selectedEnemyObjId = en.id;
            _renderEnemyList(_arena.enemies);
            _arena.enemies.forEach(function (e) { e.selected = (e.id === en.id); });
            _updateButtons();
          });
        }
        list.appendChild(card);
      })(i, _arena.enemies[i]);
    }
  }

  // Helper: select enemy by id and update UI
  function _selectEnemy(id) {
    _selectedEnemyObjId = id;
    _arena.enemies.forEach(function (e) { e.selected = (e.id === id); });
    _renderEnemyList(_arena.enemies);
    _updateButtons();
  }

  function _updateButtons() {
    var state  = gs && gs._state;
    var ap     = state ? (state.ap || 0) : 0;
    var maxStm = (state && typeof DW_staminaMax === 'function') ? DW_staminaMax(state) : (state?.maxStamina || 10);
    var stm    = state ? (state.stamina ?? maxStm) : 0;
    var pressure = state ? (state.threatPressure || 0) : 0;

    // Kiểm tra target hợp lệ
    var hasTarget = false;
    if (_selectedEnemyObjId) {
      for (var i = 0; i < _arena.enemies.length; i++) {
        var en = _arena.enemies[i];
        if (en.id === _selectedEnemyObjId && !en.dead && en.hp > 0) {
          hasTarget = true;
          break;
        }
      }
      if (!hasTarget) _selectedEnemyObjId = null;
    }

    var hasLiveEnemy = _arena.enemies.some(function(e) { return !e.dead && e.hp > 0; });

    var btnFight   = document.getElementById('dwa-btn-fight');
    var btnHeavy   = document.getElementById('dwa-btn-heavy');
    var btnStealth = document.getElementById('dwa-btn-stealth');
    var btnRest    = document.getElementById('dwa-btn-rest');
    var btnFlee    = document.getElementById('dwa-btn-flee');

    if (btnFight)   btnFight.disabled   = !hasTarget || stm < 3;
    if (btnHeavy)   btnHeavy.disabled   = !hasTarget || stm < 4 || ap < 1;
    if (btnStealth) btnStealth.disabled = !hasTarget || stm < 3;
    if (btnFlee)    btnFlee.disabled    = ap < 2;

    // Nút Nghỉ: luôn available khi còn enemy (đây là mục đích cốt lõi)
    // Khi không có enemy → vẫn available để hồi STM an toàn
    if (btnRest) {
      btnRest.disabled = false; // luôn bấm được
      var restLbl = document.getElementById('dwa-btn-rest-lbl');
      if (hasLiveEnemy) {
        // Hiển thị warning pulsing khi có nhiều miss (threatPressure cao)
        if (pressure >= 3) {
          btnRest.className = 'dwa-btn dwa-btn-rest threat-warning';
          if (restLbl) restLbl.textContent = '⚠ ' + _arena.enemies.filter(function(e){return !e.dead&&e.hp>0;}).length + ' zombie phản công!';
        } else {
          btnRest.className = 'dwa-btn dwa-btn-rest';
          if (restLbl) restLbl.textContent = 'Zombie phản công';
        }
      } else {
        btnRest.className = 'dwa-btn dwa-btn-rest';
        if (restLbl) restLbl.textContent = 'Hồi SB an toàn';
      }
    }

    // AP label cho fight
    var fightApLbl = document.getElementById('dwa-btn-fight-ap');
    if (fightApLbl) fightApLbl.textContent = stm < 3 ? 'Hết SB' : '-3 SB';
  }

  // Hiển thị log message
  function _showLog(msg, color) {
    var logEl = document.getElementById('dwa-log');
    if (logEl) {
      logEl.style.color = color || '#a09080';
      logEl.textContent = msg;
    }
    _arena.lastMsg = msg;
  }

  // Xử lý tấn công — gọi engine, lấy kết quả, play animation
  function _doAttack(mode) {
    var state = gs && gs._state;
    if (!state || !_selectedEnemyObjId) return;
    if (_arena.phase !== 'idle') return;

    _arena.phase = 'player_attack';

    // Tìm enemy trong arena để lấy vị trí pixel
    var targetArena = null;
    for (var i = 0; i < _arena.enemies.length; i++) {
      if (_arena.enemies[i].id === _selectedEnemyObjId) {
        targetArena = _arena.enemies[i];
        break;
      }
    }

    // ── GỌI ENGINE ────────────────────────────────────
    var opts = {};
    if (mode === 'heavy')   opts.heavy   = true;
    if (mode === 'stealth') opts.stealth = true;

    var rawFn = (typeof _raw !== 'undefined' && _raw.DW_fight) ? _raw.DW_fight
              : (typeof window.DW_fightRaw === 'function') ? window.DW_fightRaw
              : null;
    if (!rawFn) { _showLog('⚠ Engine combat unavailable', '#cc2200'); _arena.phase='idle'; return; }

    var result = rawFn(state, _selectedEnemyObjId, opts);

    // Engine trả về: { ok, hit, enemyDead, dmg, enemyHp, enemyMaxHp, dmgTaken, state }
    // Nếu không đủ STM/AP: ok=false — gợi ý nút Nghỉ
    if (!result.ok) {
      var exhaustMsg = result.staminaExhausted
        ? '😮‍💨 Hết sức bền! Nhấn [NGHỈ] để hồi SB — zombie sẽ phản công.'
        : (result.msg || 'Không đủ ĐHĐ!');
      _showLog(exhaustMsg, '#cc8800');
      _arena.phase = 'idle';
      _updateButtons();
      return;
    }

    // Cập nhật global state ngay lập tức
    if (result.state) gs.setState(result.state);

    // ── ĐỌC KẾT QUẢ TRỰC TIẾP TỪ ENGINE ─────────────
    // KHÔNG parse log text — dùng structured fields từ engine
    var isHit      = result.hit === true;       // engine set rõ ràng
    var enemyDead  = result.enemyDead === true;
    var dmgOut     = result.dmg      || 0;      // sát thương gây cho zombie
    var dmgTaken   = result.dmgTaken || 0;      // sát thương player nhận (khi miss)
    var newEnemyHp = result.enemyHp;            // HP zombie sau khi bị thương (undefined nếu chết)
    var newLog     = (result.state && result.state.log && result.state.log[0]) || result.msg || '';

    // ── ANIMATION PLAYER → ENEMY ──────────────────────
    var projType = _getProjectileType(state);
    var pPos     = _playerPixelPos();
    if (targetArena) {
      _spawnProjectile(projType, pPos.px, pPos.py, targetArena.px, targetArena.py);
    }

    setTimeout(function () {

      if (isHit && targetArena) {
        // ── HIT: zombie bị trúng ───────────────────────
        _spawnBlood(targetArena.px, targetArena.py, Math.max(1, Math.round(dmgOut)));
        targetArena.flashTimer  = 14;
        targetArena.flashColor  = '#cc2200';

        if (enemyDead) {
          // Zombie chết
          targetArena.hp   = 0;
          targetArena.dead = true;
          _addEffect('explosion', targetArena.px + 8, targetArena.py + 12, {
            maxLife: 20, maxR: 22,
          });
        } else {
          // Zombie bị thương — dùng result.enemyHp trực tiếp, KHÔNG tìm trong tile
          // result.enemyHp là giá trị chính xác engine vừa tính
          targetArena.hp    = (newEnemyHp !== undefined) ? newEnemyHp : Math.max(0, targetArena.hp - dmgOut);
          targetArena.maxHp = result.enemyMaxHp || targetArena.maxHp;

          // Zombie phản công nhỏ (animation lunge về phía player) nhưng MISS (player tránh được)
          setTimeout(function () {
            _arena.player.flashTimer = 5;
            _arena.player.flashColor = 'rgba(192,57,43,0.25)'; // nhạt — zombie gần trúng
          }, 200);
        }

      } else {
        // ── MISS: player trượt — zombie áp sát (không mất HP ngay) ──
        // HP chỉ mất khi bấm NGHỈ (Threat Round). Miss chỉ tốn STM.
        _addEffect('miss_text', targetArena ? targetArena.px + 8 : pPos.px, targetArena ? targetArena.py : pPos.py, { maxLife: 25 });

        // Flash nhẹ trên zombie (đang áp sát player) — KHÔNG flash player
        if (targetArena) {
          targetArena.flashTimer = 8;
          targetArena.flashColor = '#ff9900'; // cam — zombie đang tăng áp lực
        }

        // Không show dmg từ player (dmgTaken=0 theo thiết kế mới)
      }

      // ── CẬP NHẬT UI ───────────────────────────────
      _renderEnemyList(_arena.enemies);
      _updateHUD(result.state || state);

      // Màu log: vàng=hit, xanh=miss (player bị tổn thương)
      var logColor = isHit ? (enemyDead ? '#44aa44' : '#ff8844') : '#cc6644';
      _showLog(newLog, logColor);

      // ── KIỂM TRA KẾT THÚC ─────────────────────────
      if (result.state && result.state.gameOver) {
        _showLog('💀 BẠN ĐÃ CHẾT. GAME OVER.', '#cc2200');
        setTimeout(hide, 2000);
        return;
      }

      // Tất cả enemy chết
      var allDead = _arena.enemies.every(function (e) { return e.dead || e.hp <= 0; });
      if (allDead) {
        _showLog('✅ Kẻ thù đã bị tiêu diệt!', '#44aa44');
        setTimeout(hide, 1600);
        _arena.phase = 'idle';
        return;
      }

      _arena.phase = 'idle';
      _updateButtons();

    }, 180);
  }

  // Xử lý flee
  function _doFlee() {
    var state = gs && gs._state;
    if (!state) return;
    if (_arena.phase !== 'idle') return;

    _arena.phase = 'enemy_attack';

    var fleeRawFn = (typeof _raw !== 'undefined' && _raw.DW_flee) ? _raw.DW_flee
                : (typeof window.DW_fleeRaw === 'function') ? window.DW_fleeRaw
                : null;
    if (!fleeRawFn) { _showLog('⚠ Engine flee unavailable', '#cc2200'); _arena.phase='idle'; return; }

    var result = fleeRawFn(state, {});
    if (result.state) gs.setState(result.state);

    var msg = (result.state && result.state.log && result.state.log[0]) || result.msg || 'Bỏ chạy...';

    if (result.ok) {
      // Thoát thành công — player lùi xanh
      _arena.player.flashTimer = 10;
      _arena.player.flashColor  = '#2255aa';
      _showLog('🏃 ' + msg, '#4488cc');
      setTimeout(hide, 900);
    } else {
      // Flee thất bại — bị zombie đánh
      var dmgTaken = result.dmgTaken || 0;
      _arena.player.flashTimer = 16;
      _arena.player.flashColor  = '#cc2200';

      if (dmgTaken > 0) {
        var pPos = _playerPixelPos();
        _addEffect('player_dmg_text', pPos.px, pPos.py - 10, {
          maxLife: 35, dmg: dmgTaken,
        });
      }

      _updateHUD(result.state || state);

      // Kiểm tra game over sau flee thất bại
      if (result.state && result.state.gameOver) {
        _showLog('💀 BỎ CHẠY THẤT BẠI — ' + msg, '#cc2200');
        setTimeout(hide, 2000);
        return;
      }

      _showLog('⚠ ' + msg, '#cc6644');
      _arena.phase = 'idle';  // reset phase để player có thể hành động tiếp
      _updateButtons();
    }
  }

  // ── THREAT ROUND (nút Nghỉ trong arena) ───────────────────────────
  // Gọi DW_threatRound() từ engine-combat — tất cả zombie phản công 1 lần,
  // player hồi 60% STM. Animation: flash đỏ player + hiển thị dmg từng zombie.
  function _doThreatRound() {
    var state = gs && gs._state;
    if (!state) return;
    if (_arena.phase !== 'idle') return;

    _arena.phase = 'enemy_attack';

    // Gọi engine
    var threatFn = (typeof DW_threatRound === 'function') ? DW_threatRound : null;
    if (!threatFn) {
      // Fallback: không có engine function → chỉ hồi STM, không mất HP
      var maxStm = (typeof DW_staminaMax === 'function') ? DW_staminaMax(state) : 10;
      var newStm = Math.min(maxStm, Math.ceil(maxStm * 0.60));
      var fallbackState = Object.assign({}, state, { stamina: newStm, maxStamina: maxStm, threatPressure: 0 });
      gs.setState(fallbackState);
      _showLog('😮‍💨 Nghỉ — SB hồi một phần.', '#7aaa7a');
      _arena.phase = 'idle';
      _updateButtons();
      return;
    }

    var result = threatFn(state);
    if (result.state) gs.setState(result.state);

    var dmgTaken  = result.totalDmg || 0;
    var zCount    = result.zombieCount || 0;
    var pPos      = _playerPixelPos();

    if (dmgTaken > 0) {
      // Animation: flash đỏ player + số dmg
      _arena.player.flashTimer = 25;
      _arena.player.flashColor = '#cc2200';
      _addEffect('player_dmg_text', pPos.px, pPos.py - 10, {
        maxLife: 40,
        dmg: dmgTaken,
      });

      // Tất cả zombie sống chớp sáng (đang tấn công)
      for (var i = 0; i < _arena.enemies.length; i++) {
        if (!_arena.enemies[i].dead && _arena.enemies[i].hp > 0) {
          _arena.enemies[i].flashTimer = 12;
          _arena.enemies[i].flashColor = '#ff6600';
        }
      }
    }

    setTimeout(function () {
      var newState = result.state || state;

      _updateHUD(newState);
      _renderEnemyList(_arena.enemies);

      if (dmgTaken > 0) {
        var logColor = newState.gameOver ? '#cc2200' : '#ff8844';
        _showLog(
          zCount > 0
            ? ('💥 ' + zCount + ' zombie phản công — mất ' + dmgTaken + ' HP. SB hồi lại!')
            : '😮‍💨 Nghỉ an toàn — SB hồi đầy.',
          logColor
        );
      } else {
        _showLog('😮‍💨 Nghỉ an toàn — SB hồi đầy.', '#7aaa7a');
      }

      if (newState.gameOver) {
        _showLog('💀 BẠN ĐÃ CHẾT. GAME OVER.', '#cc2200');
        setTimeout(hide, 2000);
        return;
      }

      _arena.phase = 'idle';
      _updateButtons();
    }, 300);
  }

  // ── SHOW / HIDE ───────────────────────────────────

  var _onHideCallback = null;

  function show(state, hintObjIdx) {
    _createDOM();
    if (!state) return;
    _visible = true;

    // Lấy enemies từ tile hiện tại
    var tileKey = state.x + ',' + state.y;
    var tile    = state.tiles && state.tiles[tileKey];
    var rawEnemies = [];

    if (tile && tile.objects) {
      rawEnemies = tile.objects.filter(function (o) {
        // Look up def by type
        var def = (typeof OBJECT_DEFS !== 'undefined') ? OBJECT_DEFS[o.type] : null;
        if (def && def.type === 'enemy') return true;
        // Fallback: check obj.type starts with zombie/enemy
        if (o.type && (o.type.indexOf('zombie') >= 0 || o.type.indexOf('enemy') >= 0)) return true;
        return false;
      }).filter(function(o) {
        return o.alive !== false; // chỉ enemy còn sống
      });
    }

    // Pre-select hint enemy if provided
    var hintObjId = null;
    if (typeof hintObjIdx === 'number' && tile && tile.objects) {
      var hintObj = tile.objects[hintObjIdx];
      if (hintObj) hintObjId = hintObj.id;
    }

    // Boss
    var boss = state.activeBosses && state.activeBosses[tileKey];

    // Xây dựng arena enemies
    _arena.enemies = [];
    var totalCount = rawEnemies.length + (boss ? 1 : 0);

    if (boss) {
      var bDef = (typeof BOSS_DEFS !== 'undefined') ? (BOSS_DEFS[boss.id] || {}) : {};
      var bPos = _enemyPixelPos(0, totalCount);
      _arena.enemies.push({
        id:      'boss_' + boss.id,
        type:    boss.id,
        hp:      boss.hp    || bDef.hp    || 30,
        maxHp:   bDef.maxHp || bDef.hp    || 30,
        px:      bPos.px,
        py:      bPos.py,
        dead:    false,
        flashTimer: 0,
        selected:   false,
        isBoss:     true,
        bossName:   bDef.name || 'BOSS',
      });
    }

    for (var i = 0; i < rawEnemies.length; i++) {
      var re    = rawEnemies[i];
      var reDef = (typeof OBJECT_DEFS !== 'undefined') ? (OBJECT_DEFS[re.type] || {}) : {};
      var offset = boss ? i + 1 : i;
      var rPos  = _enemyPixelPos(offset, totalCount);
      _arena.enemies.push({
        id:      re.id,
        type:    re.type,
        // Khớp với engine-combat: objMaxHp = objDef.maxHp || objDef.hp || 5
        hp:      re.hp    != null ? re.hp    : (reDef.maxHp || reDef.hp || 5),
        maxHp:   re.maxHp != null ? re.maxHp : (reDef.maxHp || reDef.hp || 5),
        px:      rPos.px,
        py:      rPos.py,
        dead:    false,
        flashTimer: 0,
        selected:   false,
        isBoss:     false,
      });
    }

    // Player position
    var pPos = _playerPixelPos();
    _arena.player.px         = pPos.px;
    _arena.player.py         = pPos.py;
    _arena.player.flashTimer = 0;

    // Reset
    _arena.effects  = [];
    _arena.phase    = 'idle';
    _selectedEnemyObjId = null;

    // UI
    _overlay.classList.add('active');
    _updateHUD(state);
    _renderEnemyList(_arena.enemies);
    _updateButtons();

    // Auto-select hint enemy or first available
    if (hintObjId) {
      _selectEnemy(hintObjId);
    } else if (_arena.enemies.length > 0) {
      _selectEnemy(_arena.enemies[0].id);
    }
    _showLog('⚠ Chọn mục tiêu và tấn công!');

    // Start render loop
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(_render);
  }

  function hide() {
    _visible = false;
    if (_raf) {
      cancelAnimationFrame(_raf);
      _raf = null;
    }
    if (_overlay) _overlay.classList.remove('active');
    _selectedEnemyObjId = null;
    // Sync game world UI after combat
    if (typeof UI_renderAll === 'function') {
      setTimeout(UI_renderAll, 50);
    }
  }

  // Hook tích hợp: ghi đè gs.fight để tự mở arena
  function installHook() {
    // Gọi sau khi gs đã khởi tạo
    // Thêm DWArena.openForCurrentTile() vào UI trigger
    // (UI gọi DWArena.openForCurrentTile() thay vì gọi trực tiếp DW_fight)
  }

  // Mở arena cho tile hiện tại
  function openForCurrentTile() {
    var state = gs && gs._state;
    if (!state) return;
    var tileKey = state.x + ',' + state.y;
    var tile = state.tiles && state.tiles[tileKey];
    var hasEnemy = tile && tile.objects && tile.objects.some(function (o) {
      var def = (typeof OBJECT_DEFS !== 'undefined') ? OBJECT_DEFS[o.type] : null;
      return def && def.type === 'enemy';
    });
    var hasBoss = state.activeBosses && state.activeBosses[tileKey];

    if (hasEnemy || hasBoss) {
      show(state);
    }
  }

  // ── PUBLIC ────────────────────────────────────────
  return {
    show:               show,
    hide:               hide,
    openForCurrentTile: openForCurrentTile,
    installHook:        installHook,
  };

})();
