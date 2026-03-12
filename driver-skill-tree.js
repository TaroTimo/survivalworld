// ══════════════════════════════════════════════════════
// DEAD WORLD — driver-skill-tree.js
// Role: Tài Xế (driver)
// Fantasy: "Không thể bị bắt"
//
// 3 nhánh × 5 skill = 15 skill + 3 signature = 18 total
// Nhánh 1: ĐƯỜNG PHỐ  — movement, AP economy đô thị
// Nhánh 2: BÓNG TỐI   — stealth, noise, flee
// Nhánh 3: PHẢN XẠ    — crisis management, surprise
//
// Tự đăng ký vào DW_ROLE_TREES['driver'] khi load.
// Load sau deadworld-data-addon.js, trước engine-skills.js.
//
// Balance: v1.2 (tháng 3/2026)
// ══════════════════════════════════════════════════════

// 3 nhánh × 5 skill = 15 skill
//
// Nhánh 1: ĐƯỜNG PHỐ  — thống trị địa hình đô thị, movement
// Nhánh 2: BÓNG TỐI   — stealth chủ động, thoát hiểm, noise control
// Nhánh 3: PHẢN XẠ    — crisis management, tình huống bất ngờ
// ══════════════════════════════════════════════════════

var DRIVER_SKILL_TREE = {

  // ── NHÁNH 1: ĐƯỜNG PHỐ ───────────────────────────────
  // Fantasy: thành phố là nhà, đường là thứ anh đọc được như ngôn ngữ
  // Cơ chế độc: zero-cost movement, pre-mapped streets, drift mechanic

  ban_do_trong_dau: {
    id: 'ban_do_trong_dau',
    name: 'Bản Đồ Trong Đầu',
    branch: 'duong_pho',
    branchLabel: '🏙 Đường Phố',
    jobFilter: 'driver',
    icon: '🗺',
    prereq: [],
    maxLevel: 10,
    desc: 'Tile đường phố đã đến được nhớ chi tiết — số zombie, container nào còn loot, exit nào.',
    effects: {
      1:  { street_tile_memory: true,
            label: '⚡ Tile đường phố đã đến: hiện chi tiết zombie & loot khi xem lại' },
      2:  { street_tile_memory: true, memory_radius: 1 },
      3:  { street_tile_memory: true, memory_radius: 1, adjacent_preview: true,
            label: '⚡ Thấy trước thông tin tile đường phố kế cận trước khi bước vào' },
      4:  { street_tile_memory: true, memory_radius: 2, adjacent_preview: true },
      5:  { street_tile_memory: true, memory_radius: 2, adjacent_preview: true,
            route_plan: true,
            label: '⚡ Route Plan: chọn trước lộ trình 3 tile, tự động chọn đường ít noise nhất' },
      6:  { street_tile_memory: true, memory_radius: 2, adjacent_preview: true,
            route_plan: true },
      7:  { street_tile_memory: true, memory_radius: 3, adjacent_preview: true,
            route_plan: true, danger_highlight: true,
            label: '⚡ Tile nguy hiểm bất thường tự động highlight trên minimap' },
      8:  { street_tile_memory: true, memory_radius: 3, adjacent_preview: true,
            route_plan: true, danger_highlight: true },
      9:  { street_tile_memory: true, memory_radius: 4, adjacent_preview: true,
            route_plan: true, danger_highlight: true },
      10: { street_tile_memory: true, memory_radius: 5, adjacent_preview: true,
            route_plan: true, danger_highlight: true, city_known: true,
            label: '🏆 MASTERY: Chủ Nhân Đường Phố — toàn bộ tile đường phố trong radius 5 hiện ngay từ đầu game' },
    },
  },

  lach_qua_ke_ho: {
    id: 'lach_qua_ke_ho',
    name: 'Lách Qua Kẽ Hở',
    branch: 'duong_pho',
    branchLabel: '🏙 Đường Phố',
    jobFilter: 'driver',
    icon: '🌀',
    prereq: [{ skill: 'ban_do_trong_dau', level: 3 }],
    maxLevel: 10,
    desc: 'Di chuyển qua tile đang có zombie mà không kích hoạt chúng nếu noise đủ thấp.',
    effects: {
      1:  { pass_through_noise_threshold: 4,
            label: '⚡ Đi qua tile có zombie không trigger nếu noise ≤ 4' },
      2:  { pass_through_noise_threshold: 5 },
      3:  { pass_through_noise_threshold: 6, pass_through_ap_reduce: 1,
            label: '⚡ Pass-through -1 AP; threshold ≤ 6' },
      4:  { pass_through_noise_threshold: 7, pass_through_ap_reduce: 1 },
      5:  { pass_through_noise_threshold: 8, pass_through_ap_reduce: 1,
            silent_pass: true,
            label: '⚡ Silent Pass: đi qua mà không tăng noise của tile đó' },
      6:  { pass_through_noise_threshold: 8, pass_through_ap_reduce: 1,
            silent_pass: true },
      7:  { pass_through_noise_threshold: 9, pass_through_ap_reduce: 2,
            silent_pass: true, multi_pass: true,
            label: '⚡ Multi-Pass: đi qua 2 tile liên tiếp trong 1 action (tốn 2 AP)' },
      8:  { pass_through_noise_threshold: 9, pass_through_ap_reduce: 2,
            silent_pass: true, multi_pass: true },
      9:  { pass_through_noise_threshold: 10, pass_through_ap_reduce: 2,
            silent_pass: true, multi_pass: true },
      // BALANCE FIX: ghost_pass chỉ áp dụng zombie thường.
      // Special infected: noise check threshold = 8 (không immune).
      // Boss: luôn có noise check, không bị bỏ qua.
      10: { pass_through_noise_threshold: 10, pass_through_ap_reduce: 2,
            silent_pass: true, multi_pass: true, ghost_pass: true,
            ghost_pass_special_threshold: 8,
            ghost_pass_boss_immune: false,
            label: '🏆 MASTERY: Ghost Pass — zombie thường không bao giờ trigger khi đi qua. Special infected vẫn check noise ≥ 8. Boss không bị ảnh hưởng.' },
    },
  },

  toc_do_do_thi: {
    id: 'toc_do_do_thi',
    name: 'Tốc Độ Đô Thị',
    branch: 'duong_pho',
    branchLabel: '🏙 Đường Phố',
    jobFilter: 'driver',
    icon: '⚡',
    prereq: [{ skill: 'lach_qua_ke_ho', level: 3 }],
    maxLevel: 10,
    desc: 'Di chuyển trên đường phố ngày càng rẻ hơn. Tài Xế sinh ra để di chuyển.',
    effects: {
      1:  { street_ap_reduction: 1, label: 'Đường phố -1 AP' },
      2:  { street_ap_reduction: 1, alley_ap_reduction: 1,
            label: 'Hẻm nhỏ cũng -1 AP' },
      3:  { street_ap_reduction: 1, alley_ap_reduction: 1,
            night_street_free: true,
            label: '⚡ Ban đêm: đường phố không có zombie = 0 AP' },
      4:  { street_ap_reduction: 2, alley_ap_reduction: 1, night_street_free: true },
      5:  { street_ap_reduction: 2, alley_ap_reduction: 1, night_street_free: true,
            day_street_free: true,
            label: '⚡ Cả ban ngày: đường phố không có zombie = 0 AP' },
      6:  { street_ap_reduction: 2, alley_ap_reduction: 2, night_street_free: true,
            day_street_free: true },
      7:  { street_ap_reduction: 2, alley_ap_reduction: 2, night_street_free: true,
            day_street_free: true, sprint_street: true,
            label: '⚡ Street Sprint: di chuyển 3 tile đường phố bằng 2 AP' },
      8:  { street_ap_reduction: 2, alley_ap_reduction: 2, night_street_free: true,
            day_street_free: true, sprint_street: true },
      9:  { street_ap_reduction: 3, alley_ap_reduction: 2, night_street_free: true,
            day_street_free: true, sprint_street: true },
      10: { street_ap_reduction: 3, alley_ap_reduction: 3, night_street_free: true,
            day_street_free: true, sprint_street: true, city_runner: true,
            label: '🏆 MASTERY: City Runner — không bao giờ tốn quá 1 AP cho bất kỳ di chuyển đô thị nào' },
    },
  },

  phan_xa_lai_xe: {
    id: 'phan_xa_lai_xe',
    name: 'Phản Xạ Lái Xe',
    branch: 'duong_pho',
    branchLabel: '🏙 Đường Phố',
    jobFilter: 'driver',
    icon: '🚗',
    prereq: [{ skill: 'toc_do_do_thi', level: 3 }],
    maxLevel: 10,
    desc: 'Khi bị tấn công bất ngờ, phản xạ tự động kích hoạt. Cơ thể quen với tình huống nguy hiểm.',
    effects: {
      1:  { surprise_dodge_chance: 0.20,
            label: '20% né tránh đòn surprise attack' },
      2:  { surprise_dodge_chance: 0.28 },
      3:  { surprise_dodge_chance: 0.35, auto_flee_once: true,
            label: '⚡ 1 lần/ngày: tự động flee không tốn AP khi bị surprise attack' },
      4:  { surprise_dodge_chance: 0.40, auto_flee_once: true },
      5:  { surprise_dodge_chance: 0.45, auto_flee_once: true,
            counter_reflex: true,
            label: '⚡ Counter Reflex: sau khi dodge, phản đòn ngay với +25% damage (1 lần/encounter)' },
      6:  { surprise_dodge_chance: 0.50, auto_flee_once: true, counter_reflex: true },
      7:  { surprise_dodge_chance: 0.55, auto_flee_once: true, counter_reflex: true,
            danger_sense: true,
            label: '⚡ Danger Sense: không bao giờ bị surprise attack từ zombie thường' },
      8:  { surprise_dodge_chance: 0.60, auto_flee_once: true, counter_reflex: true,
            danger_sense: true },
      9:  { surprise_dodge_chance: 0.65, auto_flee_once: true, counter_reflex: true,
            danger_sense: true },
      // BALANCE FIX: "bất kỳ kẻ nào" thay bằng exception rõ ràng.
      // Special infected: surprise check threshold = 7 (vẫn có cơ hội bị surprise).
      // Boss: luôn giữ 30% surprise chance dù có Perfect Reflex.
      10: { surprise_dodge_chance: 0.70, auto_flee_once: true, counter_reflex: true,
            danger_sense: true, perfect_reflex: true,
            perfect_reflex_special_threshold: 7,
            perfect_reflex_boss_surprise_chance: 0.30,
            label: '🏆 MASTERY: Perfect Reflex — không bao giờ bị surprise attack từ zombie thường hay bandit. Special infected còn 30% surprise. Boss không bị ảnh hưởng (luôn 30% surprise).' },
    },
  },

  chu_nhan_duong_pho: {
    id: 'chu_nhan_duong_pho',
    name: 'Chủ Nhân Đường Phố',
    branch: 'duong_pho',
    branchLabel: '🏙 Đường Phố',
    jobFilter: 'driver',
    icon: '🏆',
    prereq: [{ skill: 'phan_xa_lai_xe', level: 5 }],
    maxLevel: 10,
    desc: 'Skill cuối nhánh Đường Phố. Tài Xế trở thành vua của địa hình đô thị.',
    effects: {
      1:  { urban_xp_bonus: 0.20, label: 'XP từ mọi hoạt động trong đô thị +20%' },
      2:  { urban_xp_bonus: 0.25 },
      3:  { urban_xp_bonus: 0.30, urban_loot_bonus: 1,
            label: '⚡ Loot thêm +1 item khi search tile đô thị' },
      4:  { urban_xp_bonus: 0.35, urban_loot_bonus: 1 },
      5:  { urban_xp_bonus: 0.40, urban_loot_bonus: 2, urban_safe_zone: true,
            label: '⚡ Tile đường phố đã đến 5+ lần: zombie không vào ban ngày' },
      6:  { urban_xp_bonus: 0.45, urban_loot_bonus: 2, urban_safe_zone: true },
      7:  { urban_xp_bonus: 0.50, urban_loot_bonus: 2, urban_safe_zone: true,
            phantom_teleport: true,
            label: '⚡ Phantom: 1 lần/ngày teleport đến tile đường phố đã biết trong radius 3' },
      8:  { urban_xp_bonus: 0.55, urban_loot_bonus: 3, urban_safe_zone: true,
            phantom_teleport: true },
      9:  { urban_xp_bonus: 0.60, urban_loot_bonus: 3, urban_safe_zone: true,
            phantom_teleport: true },
      10: { urban_xp_bonus: 0.70, urban_loot_bonus: 3, urban_safe_zone: true,
            phantom_teleport: true, city_lord: true,
            label: '🏆 MASTERY: City Lord — toàn bộ tile đô thị trong bản đồ hiện ngay từ đầu game' },
    },
  },

  // ── NHÁNH 2: BÓNG TỐI ────────────────────────────────
  // Fantasy: vô hình không phải phép thuật, là kỷ luật
  // Cơ chế độc: noise reset sau flee, ban đêm zero-noise, shadow stand

  buoc_nhe: {
    id: 'buoc_nhe',
    name: 'Bước Nhẹ',
    branch: 'bong_toi',
    branchLabel: '🌑 Bóng Tối',
    jobFilter: 'driver',
    icon: '🦶',
    prereq: [],
    maxLevel: 10,
    desc: 'Noise khi di chuyển ban đêm giảm đáng kể. Giờ vàng của Tài Xế là khi người khác đã ngủ.',
    effects: {
      1:  { night_move_noise_reduce: 1, label: 'Di chuyển ban đêm: noise -1' },
      2:  { night_move_noise_reduce: 2 },
      3:  { night_move_noise_reduce: 2, day_move_noise_reduce: 1,
            label: '⚡ Ban ngày cũng nhẹ hơn: noise -1 khi di chuyển' },
      4:  { night_move_noise_reduce: 3, day_move_noise_reduce: 1 },
      5:  { night_move_noise_reduce: 3, day_move_noise_reduce: 2,
            silent_search: true,
            label: '⚡ Silent Search: lục soát ban đêm không tạo noise' },
      6:  { night_move_noise_reduce: 4, day_move_noise_reduce: 2,
            silent_search: true },
      7:  { night_move_noise_reduce: 4, day_move_noise_reduce: 3,
            silent_search: true, featherweight: true,
            label: '⚡ Featherweight: noise không bao giờ vượt 3 dù làm gì (trừ dùng súng)' },
      8:  { night_move_noise_reduce: 5, day_move_noise_reduce: 3,
            silent_search: true, featherweight: true },
      9:  { night_move_noise_reduce: 5, day_move_noise_reduce: 4,
            silent_search: true, featherweight: true },
      10: { night_move_noise_reduce: 6, day_move_noise_reduce: 4,
            silent_search: true, featherweight: true, absolute_silence: true,
            label: '🏆 MASTERY: Absolute Silence — ban đêm, mọi action của Tài Xế đều có noise = 0 (trừ súng)' },
    },
  },

  tan_vao_bong: {
    id: 'tan_vao_bong',
    name: 'Tan Vào Bóng',
    branch: 'bong_toi',
    branchLabel: '🌑 Bóng Tối',
    jobFilter: 'driver',
    icon: '🌑',
    prereq: [{ skill: 'buoc_nhe', level: 3 }],
    maxLevel: 10,
    desc: 'Đứng yên trong bóng tối thực sự vô hình. Zombie đi qua mà không nhìn thấy.',
    effects: {
      1:  { standstill_detection_reduce: 0.30,
            label: 'Đứng yên: zombie detection -30%' },
      2:  { standstill_detection_reduce: 0.40 },
      3:  { standstill_detection_reduce: 0.50, shadow_stand_night: true,
            label: '⚡ Shadow Stand: đứng yên ban đêm = zombie không phát hiện (trừ khi chúng đang bị aggro)' },
      4:  { standstill_detection_reduce: 0.60, shadow_stand_night: true },
      5:  { standstill_detection_reduce: 0.70, shadow_stand_night: true,
            shadow_stand_day: true,
            label: '⚡ Shadow Stand mở rộng sang ban ngày (giảm 70% detection khi đứng yên)' },
      6:  { standstill_detection_reduce: 0.75, shadow_stand_night: true,
            shadow_stand_day: true },
      7:  { standstill_detection_reduce: 0.80, shadow_stand_night: true,
            shadow_stand_day: true, shadow_action: true,
            label: '⚡ Shadow Action: lục soát khi đứng yên không phá vỡ trạng thái ẩn mình' },
      8:  { standstill_detection_reduce: 0.85, shadow_stand_night: true,
            shadow_stand_day: true, shadow_action: true },
      9:  { standstill_detection_reduce: 0.90, shadow_stand_night: true,
            shadow_stand_day: true, shadow_action: true },
      // BALANCE FIX: perfect_shadow không áp dụng cho boss (boss có vision riêng).
      // Boss luôn phát hiện nếu trong radius 2, bất kể trạng thái đứng yên.
      10: { standstill_detection_reduce: 1.00, shadow_stand_night: true,
            shadow_stand_day: true, shadow_action: true, perfect_shadow: true,
            perfect_shadow_boss_immune: false,
            label: '🏆 MASTERY: Perfect Shadow — đứng yên = hoàn toàn vô hình với zombie thường và NPC. Boss không bị ảnh hưởng (vision radius bình thường).' },
    },
  },

  thoat_hiem_chuyen_nghiep: {
    id: 'thoat_hiem_chuyen_nghiep',
    name: 'Thoát Hiểm Chuyên Nghiệp',
    branch: 'bong_toi',
    branchLabel: '🌑 Bóng Tối',
    jobFilter: 'driver',
    icon: '🚪',
    prereq: [{ skill: 'tan_vao_bong', level: 3 }],
    maxLevel: 10,
    desc: 'Flee thành công reset noise về 0. Zombie không đuổi theo vì không còn dấu vết.',
    effects: {
      1:  { flee_noise_reset: 0.50, label: 'Flee thành công: noise giảm 50%' },
      2:  { flee_noise_reset: 0.70 },
      3:  { flee_noise_reset: 1.00,
            label: '⚡ Flee thành công: noise về 0 hoàn toàn' },
      4:  { flee_noise_reset: 1.00, flee_ap_reduce: 1,
            label: 'Flee -1 AP' },
      5:  { flee_noise_reset: 1.00, flee_ap_reduce: 1, flee_heal: 1,
            label: '⚡ Flee thành công: hồi 1 HP (adrenaline rush)' },
      6:  { flee_noise_reset: 1.00, flee_ap_reduce: 1, flee_heal: 2 },
      // BALANCE FIX: ghost_exit giới hạn 3 lần/ngày để tránh abuse survival combo.
      7:  { flee_noise_reset: 1.00, flee_ap_reduce: 2, flee_heal: 2,
            ghost_exit: true, ghost_exit_daily_limit: 3,
            label: '⚡ Ghost Exit: sau flee thành công, invisible 1 lượt tiếp theo (tối đa 3 lần/ngày)' },
      8:  { flee_noise_reset: 1.00, flee_ap_reduce: 2, flee_heal: 3,
            ghost_exit: true, ghost_exit_daily_limit: 3 },
      9:  { flee_noise_reset: 1.00, flee_ap_reduce: 2, flee_heal: 3,
            ghost_exit: true, ghost_exit_daily_limit: 3 },
      10: { flee_noise_reset: 1.00, flee_ap_reduce: 2, flee_heal: 3,
            ghost_exit: true, ghost_exit_daily_limit: 3, perfect_escape: true,
            label: '🏆 MASTERY: Perfect Escape — flee thành công không tốn AP, reset noise, hồi 3 HP. Ghost Exit lên 3 lần/ngày.' },
    },
  },

  ma_do_thi: {
    id: 'ma_do_thi',
    name: 'Ma Đô Thị',
    branch: 'bong_toi',
    branchLabel: '🌑 Bóng Tối',
    jobFilter: 'driver',
    icon: '👻',
    prereq: [{ skill: 'thoat_hiem_chuyen_nghiep', level: 3 }],
    maxLevel: 10,
    desc: 'Ban đêm trong tile đường phố: mọi action đều không tạo noise. Bóng tối là áo giáp.',
    effects: {
      1:  { urban_night_noise_reduce: 0.50,
            label: 'Tile đường phố ban đêm: noise từ mọi action -50%' },
      2:  { urban_night_noise_reduce: 0.65 },
      3:  { urban_night_noise_reduce: 0.80,
            label: '⚡ Noise -80% ban đêm trong đô thị' },
      4:  { urban_night_noise_reduce: 0.90 },
      5:  { urban_night_noise_reduce: 1.00, urban_night_zero_noise: true,
            label: '⚡ Zero Noise: ban đêm trong đô thị, noise = 0 cho mọi action trừ súng' },
      6:  { urban_night_noise_reduce: 1.00, urban_night_zero_noise: true,
            combat_first_strike_silent: true,
            label: '⚡ Đòn đầu tiên trong bóng tối không tạo noise' },
      7:  { urban_night_noise_reduce: 1.00, urban_night_zero_noise: true,
            combat_first_strike_silent: true, night_hunter: true,
            label: '⚡ Night Hunter: ban đêm trong đô thị, hit chance +20%' },
      8:  { urban_night_noise_reduce: 1.00, urban_night_zero_noise: true,
            combat_first_strike_silent: true, night_hunter: true },
      9:  { urban_night_noise_reduce: 1.00, urban_night_zero_noise: true,
            combat_first_strike_silent: true, night_hunter: true },
      10: { urban_night_noise_reduce: 1.00, urban_night_zero_noise: true,
            combat_first_strike_silent: true, night_hunter: true,
            phantom_of_city: true,
            label: '🏆 MASTERY: Phantom of the City — ban đêm trong đô thị, Tài Xế không thể bị phát hiện bởi zombie thường dù đang di chuyển' },
    },
  },

  bong_ma_that_su: {
    id: 'bong_ma_that_su',
    name: 'Bóng Ma Thật Sự',
    branch: 'bong_toi',
    branchLabel: '🌑 Bóng Tối',
    jobFilter: 'driver',
    icon: '🌫',
    prereq: [{ skill: 'ma_do_thi', level: 5 }],
    maxLevel: 10,
    desc: 'Skill cuối nhánh Bóng Tối. Sự hiện diện của Tài Xế trở thành huyền thoại — hay không tồn tại.',
    effects: {
      1:  { detection_global_reduce: 0.10, label: 'Tất cả zombie: detection -10%' },
      2:  { detection_global_reduce: 0.15 },
      3:  { detection_global_reduce: 0.20, npc_no_detect: true,
            label: '⚡ NPC trung lập không phát hiện Tài Xế khi đang ẩn mình' },
      4:  { detection_global_reduce: 0.25, npc_no_detect: true },
      5:  { detection_global_reduce: 0.30, npc_no_detect: true,
            reputation_ghost: true,
            label: '⚡ Bandit không biết bạn đang ở tile nào trước khi bạn hành động' },
      6:  { detection_global_reduce: 0.35, npc_no_detect: true,
            reputation_ghost: true },
      7:  { detection_global_reduce: 0.40, npc_no_detect: true,
            reputation_ghost: true, shadow_clone: true,
            label: '⚡ Shadow Clone: 1 lần/ngày tạo "tiếng ồn giả" ở tile khác để dụ zombie' },
      8:  { detection_global_reduce: 0.45, npc_no_detect: true,
            reputation_ghost: true, shadow_clone: true },
      9:  { detection_global_reduce: 0.50, npc_no_detect: true,
            reputation_ghost: true, shadow_clone: true },
      10: { detection_global_reduce: 0.60, npc_no_detect: true,
            reputation_ghost: true, shadow_clone: true, true_ghost: true,
            label: '🏆 MASTERY: True Ghost — Tài Xế có thể chọn không xuất hiện trong narrative AI khi không muốn bị biết đến' },
    },
  },

  // ── NHÁNH 3: PHẢN XẠ ─────────────────────────────────
  // Fantasy: khi mọi thứ sai kế hoạch, Tài Xế vẫn sống
  // Cơ chế độc: crisis response, near-death power, uncatchable flee

  dau_oc_lanh: {
    id: 'dau_oc_lanh',
    name: 'Đầu Óc Lạnh',
    branch: 'phan_xa',
    branchLabel: '⚡ Phản Xạ',
    jobFilter: 'driver',
    icon: '🧊',
    prereq: [],
    maxLevel: 10,
    desc: 'Stress tăng chậm hơn khi gặp encounter bất ngờ. Tài Xế đã thấy đủ thứ để không còn sợ.',
    effects: {
      1:  { surprise_stress_reduce: 0.20, label: 'Stress từ encounter bất ngờ -20%' },
      2:  { surprise_stress_reduce: 0.30 },
      3:  { surprise_stress_reduce: 0.40, panic_recovery: true,
            label: '⚡ Panic Recovery: thoát Panic Mode nhanh hơn 50%' },
      4:  { surprise_stress_reduce: 0.50, panic_recovery: true },
      5:  { surprise_stress_reduce: 0.60, panic_recovery: true, cold_blood: true,
            label: '⚡ Cold Blood: khi Panic Mode, damage tăng 15% thay vì giảm' },
      6:  { surprise_stress_reduce: 0.65, panic_recovery: true, cold_blood: true },
      7:  { surprise_stress_reduce: 0.70, panic_recovery: true, cold_blood: true,
            stress_immunity_low_hp: true,
            label: '⚡ Khi HP < 30%: stress không tăng từ bất kỳ nguồn nào' },
      8:  { surprise_stress_reduce: 0.75, panic_recovery: true, cold_blood: true,
            stress_immunity_low_hp: true },
      9:  { surprise_stress_reduce: 0.80, panic_recovery: true, cold_blood: true,
            stress_immunity_low_hp: true },
      10: { surprise_stress_reduce: 0.90, panic_recovery: true, cold_blood: true,
            stress_immunity_low_hp: true, unshakeable: true,
            label: '🏆 MASTERY: Unshakeable — Panic Mode không thể kích hoạt với Tài Xế' },
    },
  },

  doc_tinh_huong: {
    id: 'doc_tinh_huong',
    name: 'Đọc Tình Huống',
    branch: 'phan_xa',
    branchLabel: '⚡ Phản Xạ',
    jobFilter: 'driver',
    icon: '🔍',
    prereq: [{ skill: 'dau_oc_lanh', level: 3 }],
    maxLevel: 10,
    desc: 'Khi vào tile mới, thấy ngay thông tin quan trọng trước khi bước vào hoàn toàn.',
    effects: {
      1:  { entry_preview_zombie_count: true,
            label: '⚡ Thấy số zombie trong tile trước khi vào' },
      2:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            label: 'Thấy loại nguy hiểm (thường/đặc biệt/boss)' },
      3:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true,
            label: '⚡ Thấy trước có loot không trong tile' },
      4:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true, entry_preview_exits: true },
      5:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true, entry_preview_exits: true,
            tactical_entry: true,
            label: '⚡ Tactical Entry: chọn vào từ hướng nào để có lợi thế combat (hit bonus +15%)' },
      6:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true, entry_preview_exits: true,
            tactical_entry: true },
      7:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true, entry_preview_exits: true,
            tactical_entry: true, read_npc: true,
            label: '⚡ Read NPC: thấy được thái độ và ý định của NPC trước khi nói chuyện' },
      8:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true, entry_preview_exits: true,
            tactical_entry: true, read_npc: true },
      9:  { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true, entry_preview_exits: true,
            tactical_entry: true, read_npc: true },
      10: { entry_preview_zombie_count: true, entry_preview_danger_type: true,
            entry_preview_loot: true, entry_preview_exits: true,
            tactical_entry: true, read_npc: true, full_scan: true,
            label: '🏆 MASTERY: Full Scan — thấy toàn bộ thông tin của tile kế cận mà không cần bước vào' },
    },
  },

  ngan_can_soi_toc: {
    id: 'ngan_can_soi_toc',
    name: 'Ngàn Cân Treo Sợi Tóc',
    branch: 'phan_xa',
    branchLabel: '⚡ Phản Xạ',
    jobFilter: 'driver',
    icon: '💀',
    prereq: [{ skill: 'doc_tinh_huong', level: 3 }],
    maxLevel: 10,
    desc: 'Càng gần chết, Tài Xế càng khó bắt hơn. Tuyệt vọng tạo ra tốc độ.',
    effects: {
      1:  { low_hp_flee_bonus: 0.15, label: 'HP < 30%: flee chance +15%' },
      2:  { low_hp_flee_bonus: 0.25 },
      3:  { low_hp_flee_bonus: 0.35, low_hp_speed_bonus: true,
            label: '⚡ HP < 30%: di chuyển -1 AP (desperation speed)' },
      4:  { low_hp_flee_bonus: 0.45, low_hp_speed_bonus: true },
      5:  { low_hp_flee_bonus: 0.55, low_hp_speed_bonus: true,
            low_hp_damage_bonus: 0.20,
            label: '⚡ HP < 20%: damage +20% (desperate strike)' },
      6:  { low_hp_flee_bonus: 0.65, low_hp_speed_bonus: true,
            low_hp_damage_bonus: 0.25 },
      7:  { low_hp_flee_bonus: 0.75, low_hp_speed_bonus: true,
            low_hp_damage_bonus: 0.30, last_stand_flee: true,
            label: '⚡ Last Stand: khi HP = 1, flee luôn thành công' },
      8:  { low_hp_flee_bonus: 0.80, low_hp_speed_bonus: true,
            low_hp_damage_bonus: 0.35, last_stand_flee: true },
      9:  { low_hp_flee_bonus: 0.85, low_hp_speed_bonus: true,
            low_hp_damage_bonus: 0.38, last_stand_flee: true },
      // BALANCE FIX: low_hp_damage_bonus lv10 giảm từ 0.50 → 0.40 (cap cứng +40%).
      // Lý do: 0.50 vi phạm design guide mục 4. Thêm desperate_speed_boost để bù
      // cảm giác "tuyệt vọng" mà không vi phạm damage cap.
      10: { low_hp_flee_bonus: 1.00, low_hp_speed_bonus: true,
            low_hp_damage_bonus: 0.40, last_stand_flee: true,
            death_cheat: true, desperate_speed_boost: true,
            label: '🏆 MASTERY: Death Cheat — 1 lần/game, khi HP về 0, tự động flee với 1 HP còn lại. Khi HP < 20%: di chuyển -2 AP thay vì -1.' },
    },
  },

  khong_the_bat: {
    id: 'khong_the_bat',
    name: 'Không Thể Bắt',
    branch: 'phan_xa',
    branchLabel: '⚡ Phản Xạ',
    jobFilter: 'driver',
    icon: '🌪',
    prereq: [{ skill: 'ngan_can_soi_toc', level: 3 }],
    maxLevel: 10,
    desc: 'Flee ngày càng tiến đến chắc chắn thành công. Thế giới không thể giữ Tài Xế lại.',
    effects: {
      1:  { flee_success_bonus: 0.10, label: 'Flee chance +10%' },
      2:  { flee_success_bonus: 0.20 },
      3:  { flee_success_bonus: 0.30, flee_no_damage: true,
            label: '⚡ Flee thất bại không gây damage (chỉ tốn AP)' },
      4:  { flee_success_bonus: 0.40, flee_no_damage: true },
      5:  { flee_success_bonus: 0.50, flee_no_damage: true,
            multi_flee: true,
            label: '⚡ Multi-Flee: có thể flee 2 lần trong cùng 1 lượt nếu lần đầu thất bại (tốn 1 AP thêm)' },
      6:  { flee_success_bonus: 0.60, flee_no_damage: true, multi_flee: true },
      7:  { flee_success_bonus: 0.70, flee_no_damage: true, multi_flee: true,
            pursue_immune: true,
            label: '⚡ Pursue Immune: sau khi flee, kẻ địch không di chuyển theo Tài Xế sang tile kế cận' },
      8:  { flee_success_bonus: 0.80, flee_no_damage: true, multi_flee: true,
            pursue_immune: true },
      9:  { flee_success_bonus: 0.90, flee_no_damage: true, multi_flee: true,
            pursue_immune: true },
      // BALANCE FIX: uncatchable không "không bao giờ thất bại" với boss.
      // vs zombie thường: flee 100% — đúng ý tưởng "không thể bắt".
      // vs boss: flee chance giữ nguyên 70% (cap an toàn), pursue_immune vẫn giữ.
      // last_stand_flee (HP=1) không áp dụng cho boss encounter.
      10: { flee_success_bonus: 1.00, flee_no_damage: true, multi_flee: true,
            pursue_immune: true, uncatchable: true,
            uncatchable_boss_flee_cap: 0.70,
            label: '🏆 MASTERY: Uncatchable — flee không bao giờ thất bại với zombie thường và bandit. vs Boss: flee chance tối đa 70%.' },
    },
  },

  ban_nang_sinh_ton: {
    id: 'ban_nang_sinh_ton',
    name: 'Bản Năng Sinh Tồn',
    branch: 'phan_xa',
    branchLabel: '⚡ Phản Xạ',
    jobFilter: 'driver',
    icon: '🔥',
    prereq: [{ skill: 'khong_the_bat', level: 5 }],
    maxLevel: 10,
    desc: 'Skill cuối nhánh Phản Xạ. Cơ thể Tài Xế đã học được cách sống sót ở cấp độ bản năng.',
    effects: {
      1:  { survival_instinct_xp: 0.15, label: 'XP từ thoát hiểm thành công +15%' },
      2:  { survival_instinct_xp: 0.20 },
      3:  { survival_instinct_xp: 0.25, close_call_heal: 1,
            label: '⚡ Close Call: mỗi lần HP xuống < 20% rồi sống sót, hồi 1 HP thưởng' },
      4:  { survival_instinct_xp: 0.30, close_call_heal: 1 },
      5:  { survival_instinct_xp: 0.35, close_call_heal: 2, danger_adaptation: true,
            label: '⚡ Danger Adaptation: mỗi loại kẻ địch đã đối mặt 3+ lần, giảm 10% damage nhận từ chúng' },
      6:  { survival_instinct_xp: 0.40, close_call_heal: 2, danger_adaptation: true },
      7:  { survival_instinct_xp: 0.45, close_call_heal: 3, danger_adaptation: true,
            survivor_aura: true,
            label: '⚡ Survivor Aura: NPC tự nguyện chia sẻ thông tin khi thấy Tài Xế (họ biết anh sẽ sống)' },
      8:  { survival_instinct_xp: 0.50, close_call_heal: 3, danger_adaptation: true,
            survivor_aura: true },
      9:  { survival_instinct_xp: 0.55, close_call_heal: 3, danger_adaptation: true,
            survivor_aura: true },
      10: { survival_instinct_xp: 0.60, close_call_heal: 4, danger_adaptation: true,
            survivor_aura: true, legend_of_survival: true,
            legend_sp_per_days: 3, legend_sp_cap: 20,
            label: '🏆 MASTERY: Legend of Survival — mỗi 3 ngày sống sót liên tiếp, nhận +1 SP (tối đa 20 SP tổng từ skill này)' },
    },
  },

  // ── SIGNATURE SKILLS — không mua bằng SP ─────────────
  // Unlock qua milestone. Chỉ có maxLevel: 1, prereq: [].
  // Ba skill này map trực tiếp với driver_city_ghost,
  // driver_getaway, driver_route_master trong MILESTONE_DEFS.

  city_navigation: {
    id: 'city_navigation',
    name: 'Điều Hướng Đô Thị',
    branch: 'signature',
    branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'driver',
    icon: '🗺',
    prereq: [],
    maxLevel: 1,
    isSignature: true,
    desc: 'Đường phố luôn hiển thị trên bản đồ dù chưa đến. Thành phố không còn bí mật với anh.',
    effects: {
      1: { street_tiles_revealed: true,
           label: '🏅 Điều Hướng Đô Thị: toàn bộ tile đường phố trong map hiện ngay, dù chưa đến' },
    },
  },

  adrenaline_escape: {
    id: 'adrenaline_escape',
    name: 'Thoát Trong Adrenaline',
    branch: 'signature',
    branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'driver',
    icon: '💉',
    prereq: [],
    maxLevel: 1,
    isSignature: true,
    desc: 'Sau khi flee thành công, cơ thể phản ứng ngược lại với sự nguy hiểm. Mỗi lần thoát là một lần mạnh hơn.',
    effects: {
      1: { flee_success_ap_bonus: 3,
           label: '🏅 Thoát Trong Adrenaline: sau flee thành công, +3 AP ngay lập tức' },
    },
  },

  shortcut_sense: {
    id: 'shortcut_sense',
    name: 'Cảm Giác Đường Tắt',
    branch: 'signature',
    branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'driver',
    icon: '⚠',
    prereq: [],
    maxLevel: 1,
    isSignature: true,
    desc: 'Anh không cần bản đồ. Anh cảm được tile nào nguy hiểm trước khi bước vào.',
    effects: {
      1: { adjacent_danger_icon: true,
           label: '🏅 Cảm Giác Đường Tắt: tile kế cận có zombie đặc biệt hoặc boss hiển thị icon cảnh báo' },
    },
  },

};

// ── DRIVER PREREQUISITE (merge vào SKILL_PREREQUISITES) ─
(function () {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;
  // Nhánh Đường Phố
  SKILL_PREREQUISITES.lach_qua_ke_ho      = [{ skill: 'ban_do_trong_dau', level: 3 }];
  SKILL_PREREQUISITES.toc_do_do_thi       = [{ skill: 'lach_qua_ke_ho',   level: 3 }];
  SKILL_PREREQUISITES.phan_xa_lai_xe      = [{ skill: 'toc_do_do_thi',    level: 3 }];
  SKILL_PREREQUISITES.chu_nhan_duong_pho  = [{ skill: 'phan_xa_lai_xe',   level: 5 }];
  // Nhánh Bóng Tối
  SKILL_PREREQUISITES.tan_vao_bong             = [{ skill: 'buoc_nhe',                  level: 3 }];
  SKILL_PREREQUISITES.thoat_hiem_chuyen_nghiep = [{ skill: 'tan_vao_bong',              level: 3 }];
  SKILL_PREREQUISITES.ma_do_thi                = [{ skill: 'thoat_hiem_chuyen_nghiep',  level: 3 }];
  SKILL_PREREQUISITES.bong_ma_that_su          = [{ skill: 'ma_do_thi',                 level: 5 }];
  // Nhánh Phản Xạ
  SKILL_PREREQUISITES.doc_tinh_huong   = [{ skill: 'dau_oc_lanh',      level: 3 }];
  SKILL_PREREQUISITES.ngan_can_soi_toc = [{ skill: 'doc_tinh_huong',   level: 3 }];
  SKILL_PREREQUISITES.khong_the_bat    = [{ skill: 'ngan_can_soi_toc', level: 3 }];
  SKILL_PREREQUISITES.ban_nang_sinh_ton = [{ skill: 'khong_the_bat',   level: 5 }];
  // Signature skills không có prereq — unlock qua milestone
})();

// ── DRIVER SIGNATURE SKILL NARRATIVE HINTS ───────────
var DRIVER_SIGNATURE_HINTS = {

  driver_city_ghost: {
    hint_50:  'Anh bắt đầu nghe thấy nhịp của thành phố này. Không phải tiếng xe hay tiếng người — một thứ khác, âm thầm hơn.',
    hint_80:  'Anh không cần nhìn bảng đường nữa. Chân anh tự biết rẽ trái ở ngã tư này, tự dừng trước căn nhà kia.',
    hint_100: 'Mười con phố, không một tiếng động. Anh nhận ra mình không đang đi qua thành phố — anh đang đi qua ký ức của chính mình.\n🏅 Điều Hướng Đô Thị mở khóa.',
    unlock_skill: 'city_navigation',
    unlock_label: 'Điều Hướng Đô Thị',
  },

  driver_getaway: {
    hint_50:  'Tim anh vẫn đập nhanh vài giây sau khi thoát ra. Rồi dừng lại. Rồi anh đã sẵn sàng lại.',
    hint_80:  'Adrenaline không còn làm anh run nữa. Nó chỉ làm mọi thứ trở nên rõ hơn — cửa nào mở, ngách nào trống.',
    hint_100: 'Lần thứ mười. Anh đếm không phải vì tự hào — mà vì anh nhận ra mỗi lần thoát ra, cơ thể anh không cần lệnh nữa. Nó đã tự biết đường về.\n🏅 Thoát Trong Adrenaline mở khóa.',
    unlock_skill: 'adrenaline_escape',
    unlock_label: 'Thoát Trong Adrenaline',
  },

  driver_route_master: {
    hint_50:  'Anh bắt đầu thấy những thứ không có trên bản đồ nào. Không phải địa danh — mà là cái cách ánh sáng rơi khác đi ở đầu ngõ đó.',
    hint_80:  'Anh không còn khám phá nữa. Anh đang xác nhận những thứ mình đã biết từ trước. Thành phố này đã nằm trong đầu anh trước khi anh bước vào.',
    hint_100: 'Sáu mươi phần trăm. Đủ để biết đường về nhà từ bất kỳ góc nào. Đủ để sống thêm một ngày nữa.\n🏅 Cảm Giác Đường Tắt mở khóa.',
    unlock_skill: 'shortcut_sense',
    unlock_label: 'Cảm Giác Đường Tắt',
  },

};

// ── Merge hints vào MILESTONE_DEFS ────────────────────
(function () {
  if (typeof MILESTONE_DEFS === 'undefined') return;
  if (MILESTONE_DEFS.driver_city_ghost)
    MILESTONE_DEFS.driver_city_ghost.hints = DRIVER_SIGNATURE_HINTS.driver_city_ghost;
  if (MILESTONE_DEFS.driver_getaway)
    MILESTONE_DEFS.driver_getaway.hints = DRIVER_SIGNATURE_HINTS.driver_getaway;
  if (MILESTONE_DEFS.driver_route_master)
    MILESTONE_DEFS.driver_route_master.hints = DRIVER_SIGNATURE_HINTS.driver_route_master;
})();

// ── DRIVER SYNERGIES ──────────────────────────────────
(function () {
  if (typeof SKILL_SYNERGIES === 'undefined') return;
  SKILL_SYNERGIES.push(

    {
      id: 'night_phantom',
      name: 'Bóng Đêm Thành Phố',
      desc: 'Đường Phố + Bóng Tối: ban đêm trong đô thị, di chuyển 0 AP VÀ 0 noise cùng lúc.',
      jobFilter: 'driver',
      requires: [
        { skill: 'toc_do_do_thi', level: 5 },
        { skill: 'ma_do_thi',     level: 3 },
      ],
      effect: { night_urban_free_silent_move: true },
      // BALANCE FIX: nếu player đã có ghost_pass Mastery, synergy chuyển sang
      // buff tile kế cận thay vì stack thêm "vô hình hoàn toàn mọi lúc".
      // Engine đọc requires_not_mastery để quyết định dùng effect hay alt_effect.
      requires_not_mastery: 'ghost_pass',
      alt_effect: {
        night_urban_free_silent_move: true,
        night_phantom_adjacent_no_noise: true,   // tile kế cận không nhận noise lan truyền
      },
      alt_desc: 'Khi đã có Ghost Pass Mastery: thêm hiệu ứng tile kế cận không nhận noise lan truyền ban đêm.',
    },

    {
      id: 'ghost_runner',
      name: 'Người Chạy Bóng Ma',
      desc: 'Bóng Tối + Phản Xạ: sau khi flee thành công ban đêm, nhận 3 AP và invisible 2 lượt.',
      jobFilter: 'driver',
      requires: [
        { skill: 'thoat_hiem_chuyen_nghiep', level: 5 },
        { skill: 'ngan_can_soi_toc',         level: 3 },
      ],
      // BALANCE NOTE: ghost_runner AP bonus là cộng thêm vào adrenaline_escape
      // signature skill (+3 AP). Cộng dồn tối đa là +6 AP sau flee ban đêm.
      // Đây là intentional power spike cho night build — được thiết kế có chủ đích.
      effect: {
        night_flee_ap_bonus:         3,
        night_flee_invisible_turns:  2,
      },
    }

  );
})();


// ══════════════════════════════════════════════════════
// SELF-REGISTRATION — chạy sau khi file load xong
// 1. Đăng ký tree vào DW_ROLE_TREES['driver']
// 2. Đăng ký từng skill vào DW_SKILLS (để DW_spendSkillPoint validate)
// Pattern này giống nhau cho mọi role — thêm role mới chỉ cần copy pattern.
// ══════════════════════════════════════════════════════
(function () {
  // Guard: deadworld-data-addon.js phải load trước
  if (typeof DW_ROLE_TREES === 'undefined') {
    console.error('[Deadworld] DW_ROLE_TREES chưa khai báo — kiểm tra load order.');
    return;
  }

  // 1. Đăng ký tree
  DW_ROLE_TREES['driver'] = DRIVER_SKILL_TREE;

  // 2. Đăng ký từng skill vào DW_SKILLS
  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(DRIVER_SKILL_TREE)) {
    if (!DW_SKILLS[key]) {
      DW_SKILLS[key] = {
        id:          def.id,
        name:        def.name,
        branch:      def.branch,
        jobFilter:   def.jobFilter,
        isSignature: def.isSignature || false,
        maxLevel:    def.maxLevel || 10,
      };
    }
  }
})();
