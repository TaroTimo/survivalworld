// ══════════════════════════════════════════════════════
// DEAD WORLD — farmer-skill-tree.js
// Role: Nông Dân (farmer)
// Fantasy: "Không biết mệt là gì"
//
// 3 nhánh × 5 skill = 15 skill + 3 signature = 18 total
// Nhánh 1: SỨC BỀN       — AP economy, hunger/thirst resistance
// Nhánh 2: THẤU HIỂU ĐẤT — nature survival, passive stealth, info
// Nhánh 3: TAY NGANG      — craft, repair, utility, generalist
//
// Tự đăng ký vào DW_ROLE_TREES['farmer'] khi load.
// Load sau deadworld-data-addon.js, trước engine-skills.js.
//
// Balance: v1.1 (tháng 3/2026)
// ══════════════════════════════════════════════════════

var FARMER_SKILL_TREE = {

  // ── NHÁNH 1: SỨC BỀN ─────────────────────────────────
  // Fantasy: cơ thể nông dân không biết mệt là gì
  // Điểm yếu cố ý: combat yếu, chỉ improvised_weapon khi dồn hết nhánh 3

  chan_quen_duong: {
    id: 'chan_quen_duong',
    name: 'Chân Quen Đường',
    branch: 'suc_ben',
    branchLabel: '🏃 Sức Bền',
    jobFilter: 'farmer',
    icon: '👣',
    prereq: [],
    maxLevel: 10,
    desc: 'Di chuyển ngoài trời tốn ít AP hơn. Cơ thể nhớ con đường dù mắt chưa thấy.',
    effects: {
      1:  { outdoor_ap_reduction: 1, label: 'Di chuyển ngoài trời -1 AP' },
      2:  { outdoor_ap_reduction: 1 },
      3:  { outdoor_ap_reduction: 1, road_ap_reduction: 1,
            label: '⚡ Đường trải nhựa cũng -1 AP thêm' },
      4:  { outdoor_ap_reduction: 1, road_ap_reduction: 1 },
      5:  { outdoor_ap_reduction: 1, road_ap_reduction: 1, night_penalty_immune: true,
            label: '⚡ Ban đêm không bị penalty AP di chuyển ngoài trời' },
      6:  { outdoor_ap_reduction: 1, road_ap_reduction: 1, night_penalty_immune: true },
      7:  { outdoor_ap_reduction: 1, road_ap_reduction: 1, night_penalty_immune: true,
            sprint_unlock: true,
            label: '⚡ Sprint mở khóa: tốn 2 AP, di chuyển 2 tile cùng lúc' },
      8:  { outdoor_ap_reduction: 1, road_ap_reduction: 1, night_penalty_immune: true,
            sprint_unlock: true },
      9:  { outdoor_ap_reduction: 1, road_ap_reduction: 1, night_penalty_immune: true,
            sprint_unlock: true },
      10: { outdoor_ap_reduction: 1, road_ap_reduction: 1, night_penalty_immune: true,
            sprint_unlock: true, pathfinder: true,
            label: '🏆 MASTERY: Pathfinder — thấy con đường tắt giữa 2 tile (bỏ qua 1 tile ở giữa, tốn 3 AP thay vì 4)' },
    },
  },

  nhip_tho_deu: {
    id: 'nhip_tho_deu',
    name: 'Nhịp Thở Đều',
    branch: 'suc_ben',
    branchLabel: '🏃 Sức Bền',
    jobFilter: 'farmer',
    icon: '🫁',
    prereq: [{ skill: 'chan_quen_duong', level: 3 }],
    maxLevel: 10,
    desc: 'Khi AP thấp, không bị penalty hiệu suất. Người nông dân biết cách làm việc khi kiệt sức.',
    effects: {
      1:  { low_ap_penalty_reduce: 0.20, label: 'Penalty khi AP thấp -20%' },
      2:  { low_ap_penalty_reduce: 0.30 },
      3:  { low_ap_penalty_reduce: 0.40,
            label: '⚡ Khi AP < 5: combat hit chance không bị giảm' },
      4:  { low_ap_penalty_reduce: 0.50 },
      5:  { low_ap_penalty_reduce: 0.60, exhaustion_heal: true,
            label: '⚡ Nghỉ ngắn hiệu quả gấp đôi khi AP < 3' },
      6:  { low_ap_penalty_reduce: 0.65, exhaustion_heal: true },
      7:  { low_ap_penalty_reduce: 0.70, exhaustion_heal: true, ap_zero_heal: 3,
            label: '⚡ Second Wind: 1 lần/ngày khi AP = 0, hồi ngay 3 AP' },
      8:  { low_ap_penalty_reduce: 0.75, exhaustion_heal: true, ap_zero_heal: 3 },
      9:  { low_ap_penalty_reduce: 0.80, exhaustion_heal: true, ap_zero_heal: 4 },
      10: { low_ap_penalty_reduce: 1.00, exhaustion_heal: true, ap_zero_heal: 5,
            label: '🏆 MASTERY: Hoàn toàn miễn dịch penalty AP thấp. AP = 0 hồi 5 AP (1 lần/ngày)' },
    },
  },

  suc_ben_vo_tan: {
    id: 'suc_ben_vo_tan',
    name: 'Sức Bền Vô Tận',
    branch: 'suc_ben',
    branchLabel: '🏃 Sức Bền',
    jobFilter: 'farmer',
    icon: '🦴',
    // [FIX-4] level: 5 → 3 (đúng chuẩn Design Guide: skill C yêu cầu B lv3, không lv5)
    prereq: [{ skill: 'nhip_tho_deu', level: 3 }],
    maxLevel: 10,
    desc: 'Penalty AP từ đói và khát giảm mạnh. Cơ thể đã quen với thiếu thốn.',
    effects: {
      1:  { hunger_thirst_ap_penalty_reduce: 0.20, label: 'Penalty đói/khát -20%' },
      2:  { hunger_thirst_ap_penalty_reduce: 0.30 },
      3:  { hunger_thirst_ap_penalty_reduce: 0.35,
            label: '⚡ Khi đói: không bị Groggy khi thức dậy' },
      4:  { hunger_thirst_ap_penalty_reduce: 0.40 },
      5:  { hunger_thirst_ap_penalty_reduce: 0.50, stress_from_hunger_immune: true,
            label: '⚡ Đói/khát không gây stress tăng thêm' },
      6:  { hunger_thirst_ap_penalty_reduce: 0.55, stress_from_hunger_immune: true },
      7:  { hunger_thirst_ap_penalty_reduce: 0.60, stress_from_hunger_immune: true,
            slow_decay: true,
            label: '⚡ Đói và khát decay chậm hơn 25%' },
      8:  { hunger_thirst_ap_penalty_reduce: 0.65, stress_from_hunger_immune: true,
            slow_decay: true },
      9:  { hunger_thirst_ap_penalty_reduce: 0.70, stress_from_hunger_immune: true,
            slow_decay: true },
      10: { hunger_thirst_ap_penalty_reduce: 0.80, stress_from_hunger_immune: true,
            slow_decay: true, famine_mode: true,
            label: '🏆 MASTERY: Famine Mode — hoạt động bình thường kể cả khi hunger = 0' },
    },
  },

  buoc_chan_thu_hai: {
    id: 'buoc_chan_thu_hai',
    name: 'Bước Chân Thứ Hai',
    branch: 'suc_ben',
    branchLabel: '🏃 Sức Bền',
    jobFilter: 'farmer',
    icon: '🌅',
    prereq: [{ skill: 'suc_ben_vo_tan', level: 3 }],
    maxLevel: 10,
    desc: 'Sau một đêm ngủ, AP hồi nhanh hơn trong 24 giờ đầu. Buổi sáng là thời điểm mạnh nhất.',
    effects: {
      1:  { morning_ap_regen_bonus: 0.25, label: 'AP regen +25% trong 6h đầu sau ngủ' },
      2:  { morning_ap_regen_bonus: 0.35 },
      3:  { morning_ap_regen_bonus: 0.50,
            label: '⚡ Thức dậy với đầy AP bất kể barricade level' },
      4:  { morning_ap_regen_bonus: 0.60 },
      5:  { morning_ap_regen_bonus: 0.75, morning_bonus_duration_h: 12,
            label: '⚡ Bonus kéo dài 12h thay vì 6h' },
      6:  { morning_ap_regen_bonus: 0.85, morning_bonus_duration_h: 12 },
      7:  { morning_ap_regen_bonus: 1.00, morning_bonus_duration_h: 24,
            label: '⚡ AP regen x2 suốt cả ngày sau khi ngủ đủ giấc' },
      8:  { morning_ap_regen_bonus: 1.10, morning_bonus_duration_h: 24 },
      9:  { morning_ap_regen_bonus: 1.25, morning_bonus_duration_h: 24 },
      10: { morning_ap_regen_bonus: 1.50, morning_bonus_duration_h: 24, power_nap: true,
            label: '🏆 MASTERY: Power Nap — nghỉ ngắn cũng kích hoạt morning bonus (3h)' },
    },
  },

  nguoi_chay_marathon: {
    id: 'nguoi_chay_marathon',
    name: 'Người Chạy Marathon',
    branch: 'suc_ben',
    branchLabel: '🏃 Sức Bền',
    jobFilter: 'farmer',
    icon: '🏆',
    prereq: [{ skill: 'buoc_chan_thu_hai', level: 5 }],
    maxLevel: 10,
    desc: 'Skill cuối nhánh Sức Bền. AP max tăng vượt giới hạn thông thường.',
    effects: {
      1:  { ap_max_absolute_bonus: 2, label: 'AP max +2 (vượt cap thông thường)' },
      2:  { ap_max_absolute_bonus: 3 },
      3:  { ap_max_absolute_bonus: 3, carry_weight_bonus: 5,
            label: '⚡ Carry weight +5 — bước chân vững hơn khi mang nặng' },
      4:  { ap_max_absolute_bonus: 4, carry_weight_bonus: 5 },
      5:  { ap_max_absolute_bonus: 4, carry_weight_bonus: 8, ap_regen_flat: 1,
            label: '⚡ AP regen +1 (thực sự nhanh hơn theo thời gian thực)' },
      6:  { ap_max_absolute_bonus: 5, carry_weight_bonus: 8, ap_regen_flat: 1 },
      7:  { ap_max_absolute_bonus: 5, carry_weight_bonus: 10, ap_regen_flat: 1,
            unstoppable: true,
            label: '⚡ Unstoppable: stun và slow không tác dụng lên Nông Dân' },
      8:  { ap_max_absolute_bonus: 6, carry_weight_bonus: 10, ap_regen_flat: 2,
            unstoppable: true },
      9:  { ap_max_absolute_bonus: 6, carry_weight_bonus: 12, ap_regen_flat: 2,
            unstoppable: true },
      // [FIX-1] legendary_stamina: thêm exception — AP = 0 vẫn có thể xảy ra trong combat
      // và khi bị boss tấn công. Chỉ áp dụng cho "hanh dong thuong" (non-combat).
      10: { ap_max_absolute_bonus: 8, carry_weight_bonus: 15, ap_regen_flat: 2,
            unstoppable: true, legendary_stamina: true,
            legendary_stamina_exception: ['combat', 'boss_attack'],
            // Engine đọc: nếu action_type là combat/boss_attack → không áp dụng legendary_stamina
            // DW_checkExhaustion vẫn chạy bình thường khi có zombie trong tile
            label: '🏆 MASTERY: Legendary Stamina — AP không bao giờ về 0 từ hanh dong thuong. Exception: combat và boss attack vẫn áp dụng exhaustion.' },
    },
  },

  // ── NHÁNH 2: THẤU HIỂU ĐẤT ──────────────────────────
  // Fantasy: thiên nhiên là ngôn ngữ mẹ đẻ của Nông Dân

  tim_kiem_ban_nang: {
    id: 'tim_kiem_ban_nang',
    name: 'Tìm Kiếm Bản Năng',
    branch: 'thau_hieu_dat',
    branchLabel: '🌿 Thấu Hiểu Đất',
    jobFilter: 'farmer',
    icon: '🌱',
    prereq: [],
    maxLevel: 10,
    desc: 'Khi search tile có cây cối hoặc đất trống, luôn tìm được ít nhất 1 thức ăn.',
    effects: {
      1:  { nature_tile_guaranteed_food: true,
            label: '⚡ Tile tự nhiên luôn có ít nhất 1 thức ăn khi lục soát' },
      2:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 1 },
      3:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 1, water_sense: true,
            label: '⚡ Cảm nhận nước: biết tile nào có nguồn nước trước khi đến' },
      4:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 2, water_sense: true },
      5:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 2,
            water_sense: true, daily_forage: true,
            label: '⚡ 1 lần/ngày tìm được nước từ thiên nhiên không cần container' },
      6:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 2,
            water_sense: true, daily_forage: true },
      7:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 3,
            water_sense: true, daily_forage: true, rare_herb: 0.15,
            label: '⚡ Thảo dược hiếm: 15% chance tìm thấy herb y tế khi search tự nhiên' },
      8:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 3,
            water_sense: true, daily_forage: true, rare_herb: 0.20 },
      9:  { nature_tile_guaranteed_food: true, nature_loot_bonus: 3,
            water_sense: true, daily_forage: true, rare_herb: 0.25 },
      // [FIX-2] abundance: thêm daily cap — không thể search vô hạn
      // Design Guide: không có passive loot generation không có daily cap
      10: { nature_tile_guaranteed_food: true, nature_loot_bonus: 4,
            water_sense: true, daily_forage: true, rare_herb: 0.30,
            abundance: true, abundance_daily_cap: 5,
            // Engine đọc: tile.dailyForageCount track số lần search mỗi ngày
            // Reset khi DW_advanceDay. Sau 5 lần/ngày, tile cần nghỉ dưỡng.
            label: '🏆 MASTERY: Abundance — tile tự nhiên tối đa 5 lần search/ngày mà không cạn loot. Sau đó reset vào ngày hôm sau.' },
    },
  },

  doc_thoi_tiet: {
    id: 'doc_thoi_tiet',
    name: 'Đọc Thời Tiết',
    branch: 'thau_hieu_dat',
    branchLabel: '🌿 Thấu Hiểu Đất',
    jobFilter: 'farmer',
    icon: '🌤️',
    prereq: [{ skill: 'tim_kiem_ban_nang', level: 3 }],
    maxLevel: 10,
    desc: 'Nhận được cảnh báo sớm về các sự kiện nguy hiểm trên map. Không phải sức mạnh — là thông tin.',
    effects: {
      1:  { danger_warning_hours: 6, label: 'Cảnh báo sự kiện nguy hiểm trước 6h' },
      2:  { danger_warning_hours: 8 },
      3:  { danger_warning_hours: 12, horde_direction: true,
            label: '⚡ Biết hướng zombie herd đang di chuyển tới' },
      4:  { danger_warning_hours: 16, horde_direction: true },
      5:  { danger_warning_hours: 24, horde_direction: true, weather_read: true,
            label: '⚡ Đọc thời tiết: mưa/sương mù hiện trước 1 ngày trên bản đồ' },
      6:  { danger_warning_hours: 24, horde_direction: true, weather_read: true },
      7:  { danger_warning_hours: 36, horde_direction: true, weather_read: true,
            event_hint: true,
            label: '⚡ AI gợi ý xác suất outcome trước khi quyết định' },
      8:  { danger_warning_hours: 36, horde_direction: true, weather_read: true,
            event_hint: true },
      9:  { danger_warning_hours: 48, horde_direction: true, weather_read: true,
            event_hint: true },
      10: { danger_warning_hours: 48, horde_direction: true, weather_read: true,
            event_hint: true, oracle: true,
            // Oracle: "linh cảm sau nhiều năm" — đổi tên nội bộ cho lore nhất quán
            oracle_name: 'Linh Cảm Sau Nhiều Năm',
            label: '🏆 MASTERY: Linh Cảm Sau Nhiều Năm — 1 lần/game, thấy trước kết quả của một quyết định lớn (engine-ai.js serve hint)' },
    },
  },

  lanh_tho_quen_thuoc: {
    id: 'lanh_tho_quen_thuoc',
    name: 'Lãnh Thổ Quen Thuộc',
    branch: 'thau_hieu_dat',
    branchLabel: '🌿 Thấu Hiểu Đất',
    jobFilter: 'farmer',
    icon: '🗺️',
    prereq: [{ skill: 'doc_thoi_tiet', level: 3 }],
    maxLevel: 10,
    desc: 'Zombie trong tile đã từng đến có detection thấp hơn. Bạn biết bước chỗ nào.',
    effects: {
      1:  { revisit_noise_reduction: 1, label: 'Tile đã đến: noise -1 khi di chuyển' },
      2:  { revisit_noise_reduction: 2 },
      3:  { revisit_noise_reduction: 2, revisit_search_bonus: true,
            label: '⚡ Tile đã đến: search nhanh hơn (giảm 1 AP)' },
      4:  { revisit_noise_reduction: 3, revisit_search_bonus: true },
      5:  { revisit_noise_reduction: 3, revisit_search_bonus: true, home_ground: true,
            label: '⚡ Home Ground: tile đã đến 3+ lần → zombie không spawn thêm ban ngày' },
      6:  { revisit_noise_reduction: 4, revisit_search_bonus: true, home_ground: true },
      7:  { revisit_noise_reduction: 4, revisit_search_bonus: true,
            home_ground: true, ambush_immune: true,
            label: '⚡ Không bị phục kích ở tile đã biết rõ' },
      8:  { revisit_noise_reduction: 5, revisit_search_bonus: true,
            home_ground: true, ambush_immune: true },
      9:  { revisit_noise_reduction: 5, revisit_search_bonus: true,
            home_ground: true, ambush_immune: true },
      10: { revisit_noise_reduction: 6, revisit_search_bonus: true,
            home_ground: true, ambush_immune: true, ghost_nature: true,
            label: '🏆 MASTERY: Hòa Làm Một — đứng yên trong tile rừng/ruộng, zombie không phát hiện (trừ boss)' },
    },
  },

  ngu_rung: {
    id: 'ngu_rung',
    name: 'Ngủ Rừng',
    branch: 'thau_hieu_dat',
    branchLabel: '🌿 Thấu Hiểu Đất',
    jobFilter: 'farmer',
    icon: '🌙',
    prereq: [{ skill: 'lanh_tho_quen_thuoc', level: 3 }],
    maxLevel: 10,
    desc: 'Ngủ ở tile tự nhiên không cần barricade. Đất là giường, cây là tường.',
    effects: {
      1:  { sleep_without_barricade: true,
            label: '⚡ Có thể ngủ ở tile tự nhiên không cần barricade (vẫn có risk nhỏ)' },
      2:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.30 },
      3:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.50,
            label: '⚡ Risk khi ngủ rừng giảm 50%' },
      4:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.60 },
      5:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.70,
            nature_sleep_bonus_hp: 1,
            label: '⚡ Ngủ trong tự nhiên hồi thêm +1 HP' },
      6:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.75,
            nature_sleep_bonus_hp: 1 },
      7:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.80,
            nature_sleep_bonus_hp: 2, nature_sleep_stress: 5,
            label: '⚡ Ngủ ngoài trời: Stress -5 thêm' },
      8:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.85,
            nature_sleep_bonus_hp: 2, nature_sleep_stress: 5 },
      9:  { sleep_without_barricade: true, nature_sleep_risk_reduce: 0.90,
            nature_sleep_bonus_hp: 2, nature_sleep_stress: 8 },
      10: { sleep_without_barricade: true, nature_sleep_risk_reduce: 1.00,
            nature_sleep_bonus_hp: 3, nature_sleep_stress: 10,
            label: '🏆 MASTERY: Hoàn toàn an toàn khi ngủ ngoài trời. +3 HP, Stress -10 mỗi đêm.' },
    },
  },

  mot_voi_thien_nhien: {
    id: 'mot_voi_thien_nhien',
    name: 'Một Với Thiên Nhiên',
    branch: 'thau_hieu_dat',
    branchLabel: '🌿 Thấu Hiểu Đất',
    jobFilter: 'farmer',
    icon: '🌳',
    prereq: [{ skill: 'ngu_rung', level: 5 }],
    maxLevel: 10,
    desc: 'Skill cuối nhánh Thấu Hiểu Đất. Thiên nhiên nhận ra bạn.',
    effects: {
      1:  { animal_passive: true, label: '⚡ Động vật hoang dã không bỏ chạy khi bạn đến gần' },
      2:  { animal_passive: true, nature_xp_bonus: 0.20 },
      3:  { animal_passive: true, nature_xp_bonus: 0.25,
            label: '⚡ XP từ explore tile tự nhiên +25%' },
      4:  { animal_passive: true, nature_xp_bonus: 0.30 },
      5:  { animal_passive: true, nature_xp_bonus: 0.35, nature_heal: true,
            label: '⚡ Nature Heal: 1 lần/ngày khi ở tile rừng, hồi 2 HP miễn phí' },
      6:  { animal_passive: true, nature_xp_bonus: 0.40, nature_heal: true },
      7:  { animal_passive: true, nature_xp_bonus: 0.45, nature_heal: true,
            call_of_wild: true,
            label: '⚡ Tiếng chim báo động: nhận cảnh báo khi zombie tiến vào tile kế cận' },
      8:  { animal_passive: true, nature_xp_bonus: 0.50, nature_heal: true,
            call_of_wild: true },
      9:  { animal_passive: true, nature_xp_bonus: 0.55, nature_heal: true,
            call_of_wild: true },
      10: { animal_passive: true, nature_xp_bonus: 0.60, nature_heal: true,
            call_of_wild: true, nature_guardian: true,
            label: '🏆 MASTERY: Nature Guardian — zombie không chủ động vào tile rừng khi bạn đang ở đó (trừ boss)' },
    },
  },

  // ── NHÁNH 3: TAY NGANG ───────────────────────────────
  // Fantasy: người biết đủ thứ để sống sót

  va_viu: {
    id: 'va_viu',
    name: 'Vá Víu',
    branch: 'tay_ngang',
    branchLabel: '🔧 Tay Ngang',
    jobFilter: 'farmer',
    icon: '🔩',
    prereq: [],
    maxLevel: 10,
    desc: 'Repair đồ tốn ít vật liệu hơn. Đôi tay quen với việc sửa chữa từ những thứ có sẵn.',
    effects: {
      1:  { repair_mat_save: 0.15, label: 'Sửa đồ tiết kiệm 15% vật liệu' },
      2:  { repair_mat_save: 0.20 },
      3:  { repair_mat_save: 0.25, repair_restore_bonus: 0.10,
            label: '⚡ Sửa đồ phục hồi thêm 10% durability' },
      4:  { repair_mat_save: 0.28, repair_restore_bonus: 0.15 },
      5:  { repair_mat_save: 0.30, repair_restore_bonus: 0.20, improvised_repair: true,
            label: '⚡ Improvised Repair: sửa đồ được dù không có toolbox' },
      6:  { repair_mat_save: 0.33, repair_restore_bonus: 0.25, improvised_repair: true },
      7:  { repair_mat_save: 0.35, repair_restore_bonus: 0.30, improvised_repair: true,
            ap_repair_free: true,
            label: '⚡ Sửa đồ không tốn AP (chỉ tốn vật liệu)' },
      8:  { repair_mat_save: 0.38, repair_restore_bonus: 0.35, improvised_repair: true,
            ap_repair_free: true },
      9:  { repair_mat_save: 0.40, repair_restore_bonus: 0.40, improvised_repair: true,
            ap_repair_free: true },
      10: { repair_mat_save: 0.50, repair_restore_bonus: 0.50, improvised_repair: true,
            ap_repair_free: true, indestructible_tool: true,
            label: '🏆 MASTERY: Công cụ tự chế không bao giờ hỏng hoàn toàn (floor 1% durability)' },
    },
  },

  tay_quen_viec: {
    id: 'tay_quen_viec',
    name: 'Tay Quen Việc',
    branch: 'tay_ngang',
    branchLabel: '🔧 Tay Ngang',
    jobFilter: 'farmer',
    icon: '🪓',
    prereq: [{ skill: 'va_viu', level: 3 }],
    maxLevel: 10,
    desc: 'Craft những item cơ bản nhanh hơn và rẻ hơn.',
    effects: {
      1:  { basic_craft_ap_reduce: 1, label: 'Craft item cơ bản -1 AP' },
      2:  { basic_craft_ap_reduce: 1, basic_craft_mat_save: 0.10 },
      3:  { basic_craft_ap_reduce: 1, basic_craft_mat_save: 0.15,
            label: '⚡ Craft barricade -1 AP thêm' },
      4:  { basic_craft_ap_reduce: 1, basic_craft_mat_save: 0.20, craft_ap_reduce: 1 },
      5:  { basic_craft_ap_reduce: 1, basic_craft_mat_save: 0.25,
            craft_ap_reduce: 1, field_craft: true,
            label: '⚡ Field Craft: craft được một số item ngay ngoài trời không cần base' },
      6:  { basic_craft_ap_reduce: 1, basic_craft_mat_save: 0.28,
            craft_ap_reduce: 1, field_craft: true },
      7:  { basic_craft_ap_reduce: 2, basic_craft_mat_save: 0.30,
            craft_ap_reduce: 1, field_craft: true, batch_craft: true,
            label: '⚡ Batch Craft: craft 2 item cùng lúc chỉ tốn 1.5× AP' },
      8:  { basic_craft_ap_reduce: 2, basic_craft_mat_save: 0.33,
            craft_ap_reduce: 1, field_craft: true, batch_craft: true },
      9:  { basic_craft_ap_reduce: 2, basic_craft_mat_save: 0.35,
            craft_ap_reduce: 2, field_craft: true, batch_craft: true },
      10: { basic_craft_ap_reduce: 2, basic_craft_mat_save: 0.40,
            craft_ap_reduce: 2, field_craft: true, batch_craft: true,
            master_generalist: true,
            label: '🏆 MASTERY: Biết tất cả công thức craft tier 1 & 2 mà không cần sách' },
    },
  },

  nguoi_nhieu_viec: {
    id: 'nguoi_nhieu_viec',
    name: 'Người Nhiều Việc',
    branch: 'tay_ngang',
    branchLabel: '🔧 Tay Ngang',
    jobFilter: 'farmer',
    icon: '📋',
    prereq: [{ skill: 'tay_quen_viec', level: 3 }],
    maxLevel: 10,
    desc: 'Mỗi ngày có thêm một số action không tốn AP. Người nông dân luôn bận tay.',
    effects: {
      1:  { free_actions_per_day: 1,
            label: '⚡ +1 free action/ngày (dọn dẹp tile, nhặt đồ, v.v)' },
      2:  { free_actions_per_day: 1,
            free_action_types: ['loot','cleanup'] },
      3:  { free_actions_per_day: 2,
            free_action_types: ['loot','cleanup','barricade'],
            label: '⚡ +2 free actions; thêm barricade vào danh sách' },
      4:  { free_actions_per_day: 2,
            free_action_types: ['loot','cleanup','barricade','repair'] },
      5:  { free_actions_per_day: 3,
            free_action_types: ['loot','cleanup','barricade','repair','craft'],
            improvised_weapon: true,
            label: '⚡ +3 free actions. Vũ Khí Tùy Tiện: cuốc/xẻng = 1 đòn/ngày miễn phí' },
      6:  { free_actions_per_day: 3,
            free_action_types: ['loot','cleanup','barricade','repair','craft'] },
      7:  { free_actions_per_day: 3, efficiency_mode: true,
            label: '⚡ Efficiency Mode: cùng loại action liên tiếp, action thứ 2 -1 AP' },
      8:  { free_actions_per_day: 3, efficiency_mode: true },
      9:  { free_actions_per_day: 4, efficiency_mode: true },
      // [FIX-3] no_idle: thêm daily cap và require safe — tránh AFK abuse
      10: { free_actions_per_day: 4, efficiency_mode: true,
            no_idle: true, no_idle_daily_cap: 4, no_idle_requires_safe: true,
            // Engine: track state.noIdleCount reset mỗi ngày
            // Chỉ auto-action khi barricade >= 2 (đang ở nơi an toàn)
            // AFK 8 tiếng → tối đa 4 auto-action (không phải 8)
            label: '🏆 MASTERY: No Idle — mỗi giờ trong base an toàn (barricade ≥ 2), tự động 1 action tối đa 4 lần/ngày.' },
    },
  },

  kinh_nghiem_song: {
    id: 'kinh_nghiem_song',
    name: 'Kinh Nghiệm Sống',
    branch: 'tay_ngang',
    branchLabel: '🔧 Tay Ngang',
    jobFilter: 'farmer',
    icon: '📖',
    prereq: [{ skill: 'nguoi_nhieu_viec', level: 3 }],
    maxLevel: 10,
    desc: 'Lần đầu tiên vào một loại tile mới, nhận cảnh báo bản năng về nguy hiểm đặc trưng.',
    effects: {
      1:  { first_entry_warning: true,
            label: '⚡ First Entry: lần đầu vào tile type mới, nhận 1 hint về nguy hiểm' },
      2:  { first_entry_warning: true, danger_sense_radius: 1 },
      3:  { first_entry_warning: true, danger_sense_radius: 1,
            label: '⚡ Cảm nhận nguy hiểm trong tile kế cận' },
      4:  { first_entry_warning: true, danger_sense_radius: 1, loot_memory: true },
      5:  { first_entry_warning: true, danger_sense_radius: 2, loot_memory: true,
            label: '⚡ Loot Memory: nhớ tile nào đã lục sạch, hiện trên bản đồ' },
      6:  { first_entry_warning: true, danger_sense_radius: 2, loot_memory: true },
      7:  { first_entry_warning: true, danger_sense_radius: 2,
            loot_memory: true, veteran_instinct: true,
            label: '⚡ Veteran Instinct: khi HP < 30%, nhận gợi ý hành động tốt nhất (AI hint)' },
      8:  { first_entry_warning: true, danger_sense_radius: 3,
            loot_memory: true, veteran_instinct: true },
      9:  { first_entry_warning: true, danger_sense_radius: 3,
            loot_memory: true, veteran_instinct: true },
      10: { first_entry_warning: true, danger_sense_radius: 3,
            loot_memory: true, veteran_instinct: true, sixth_sense: true,
            label: '🏆 MASTERY: Sixth Sense — nhận cảnh báo trước khi bước vào tile có phục kích' },
    },
  },

  tram_hay_khong_bang_tay_quen: {
    id: 'tram_hay_khong_bang_tay_quen',
    name: 'Trăm Hay Không Bằng Tay Quen',
    branch: 'tay_ngang',
    branchLabel: '🔧 Tay Ngang',
    jobFilter: 'farmer',
    icon: '🏅',
    prereq: [{ skill: 'kinh_nghiem_song', level: 5 }],
    maxLevel: 10,
    desc: 'Skill cuối nhánh Tay Ngang. Tất cả non-combat action giảm AP.',
    effects: {
      1:  { all_noncombat_ap_reduce: 1, label: 'Mọi action không phải combat -1 AP (floor 1)' },
      2:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.10 },
      3:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.15,
            label: '⚡ XP từ mọi hoạt động +15%' },
      4:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.20 },
      5:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.25,
            jack_of_all: true, jack_sp_multiplier: 1.5,
            label: '⚡ Jack of All: SP cost thêm ×1.5 nhưng có thể đầu tư vào skill của role khác đến lv3' },
      6:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.30, jack_of_all: true },
      7:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.35, jack_of_all: true,
            synergy_seeker: true,
            label: '⚡ Synergy Seeker: threshold unlock synergy giảm 1 mỗi nhánh' },
      8:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.40, jack_of_all: true,
            synergy_seeker: true },
      9:  { all_noncombat_ap_reduce: 1, versatile_bonus: 0.45, jack_of_all: true,
            synergy_seeker: true },
      // Note: true_generalist (lv10) được thiết kế có chủ đích là "endgame power" —
      // chỉ đạt được sau rất nhiều SP investment. Không vi phạm game design vì đây là
      // terminal state của 1 trong 3 nhánh.
      10: { all_noncombat_ap_reduce: 2, versatile_bonus: 0.50, jack_of_all: true,
            synergy_seeker: true, true_generalist: true,
            label: '🏆 MASTERY: True Generalist — prereq level requirement giảm 2 với mọi skill (không xóa prereq hoàn toàn)' },
    },
  },

  // ── [FIX-5] SIGNATURE SKILL DATA OBJECTS ─────────────
  // Ba skill unlock qua Milestone, không mua bằng SP.
  // Phải có data object để engine không crash khi grantSkill được gọi.

  forager_instinct: {
    id: 'forager_instinct',
    name: 'Forager Instinct',
    branch: 'signature',
    branchLabel: '🏅 Signature',
    jobFilter: 'farmer',
    icon: '🌾',
    prereq: [],
    maxLevel: 1,
    isSignature: true,
    desc: 'Bản năng tìm kiếm thức ăn. Unlock qua milestone farmer_first_harvest.',
    effects: {
      1: {
        forager_instinct_active: true,
        nature_tile_memory: true,          // nhớ tile tự nhiên nào đã có food
        forager_food_quality: true,        // food tìm được từ tự nhiên +1 hunger value
        daily_wild_food: 1,                // 1 lần/ngày tự tìm food mà không cần search action
        label: '🏅 Forager Instinct: tile tự nhiên đã search được nhớ; food tự nhiên +1 giá trị; 1 lần/ngày tự tìm food không cần action',
      },
    },
  },

  terrain_reader: {
    id: 'terrain_reader',
    name: 'Terrain Reader',
    branch: 'signature',
    branchLabel: '🏅 Signature',
    jobFilter: 'farmer',
    icon: '🦶',
    prereq: [],
    maxLevel: 1,
    isSignature: true,
    desc: 'Bản năng đọc địa hình. Unlock qua milestone farmer_long_road.',
    effects: {
      1: {
        terrain_reader_active: true,
        outdoor_ap_flat: true,             // mọi tile ngoài trời tốn đúng 1 AP (ngày lẫn đêm)
        terrain_preview: true,             // thấy AP cost của tile trước khi di chuyển vào
        label: '🏅 Terrain Reader: mọi di chuyển ngoài trời = 1 AP cố định (ngày & đêm); thấy trước AP cost của tile lân cận',
      },
    },
  },

  iron_stamina: {
    id: 'iron_stamina',
    name: 'Iron Stamina',
    branch: 'signature',
    branchLabel: '🏅 Signature',
    jobFilter: 'farmer',
    icon: '⚙️',
    prereq: [],
    maxLevel: 1,
    isSignature: true,
    desc: 'Sức bền bằng thép. Unlock qua milestone farmer_endurance.',
    effects: {
      1: {
        iron_stamina_active: true,
        ap_regen_double_post_sleep: true,  // AP regen x2 trong 12h đầu sau ngủ
        exhaustion_immune: true,           // DW_checkExhaustion không trigger (chỉ non-combat)
        label: '🏅 Iron Stamina: AP regen x2 trong 12h sau khi ngủ; không bị exhaustion damage từ non-combat actions',
      },
    },
  },

};

// ── FARMER PREREQUISITE (merge vào SKILL_PREREQUISITES) ─
(function() {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;
  // Nhánh Sức Bền
  SKILL_PREREQUISITES.nhip_tho_deu         = [{ skill: 'chan_quen_duong',    level: 3 }];
  // [FIX-4] level 5 → 3
  SKILL_PREREQUISITES.suc_ben_vo_tan       = [{ skill: 'nhip_tho_deu',      level: 3 }];
  SKILL_PREREQUISITES.buoc_chan_thu_hai    = [{ skill: 'suc_ben_vo_tan',     level: 3 }];
  SKILL_PREREQUISITES.nguoi_chay_marathon  = [{ skill: 'buoc_chan_thu_hai',  level: 5 }];
  // Nhánh Thấu Hiểu Đất
  SKILL_PREREQUISITES.doc_thoi_tiet          = [{ skill: 'tim_kiem_ban_nang',     level: 3 }];
  SKILL_PREREQUISITES.lanh_tho_quen_thuoc    = [{ skill: 'doc_thoi_tiet',         level: 3 }];
  SKILL_PREREQUISITES.ngu_rung               = [{ skill: 'lanh_tho_quen_thuoc',   level: 3 }];
  SKILL_PREREQUISITES.mot_voi_thien_nhien    = [{ skill: 'ngu_rung',              level: 5 }];
  // Nhánh Tay Ngang
  SKILL_PREREQUISITES.tay_quen_viec                   = [{ skill: 'va_viu',               level: 3 }];
  SKILL_PREREQUISITES.nguoi_nhieu_viec                = [{ skill: 'tay_quen_viec',         level: 3 }];
  SKILL_PREREQUISITES.kinh_nghiem_song                = [{ skill: 'nguoi_nhieu_viec',      level: 3 }];
  SKILL_PREREQUISITES.tram_hay_khong_bang_tay_quen    = [{ skill: 'kinh_nghiem_song',      level: 5 }];
  // Signature: không có prereq
})();

// ── FARMER SIGNATURE NARRATIVE HINTS ─────────────────
var FARMER_SIGNATURE_HINTS = {

  farmer_first_harvest: {
    hint_50: 'Miếng rau dại trong miệng có vị quen thuộc lạ lùng. Như thể cơ thể anh nhớ ra thứ mà não anh đã quên từ lâu.',
    hint_80: 'Anh không còn nhìn cánh đồng hoang như một chướng ngại vật nữa. Có gì đó đang dẫn tay anh đến đúng chỗ.',
    hint_100: 'Năm ngày không có một hộp đồ ăn nào. Bàn tay anh tự đưa đến đúng chỗ, mắt anh thấy thứ người khác đi qua mà không nhìn. 🏅 Forager Instinct mở khóa.',
    unlock_skill: 'forager_instinct',
    unlock_label: 'Forager Instinct',
  },

  farmer_long_road: {
    hint_50: 'Chân anh bắt đầu tự chọn đường. Không phải suy nghĩ — chỉ là bước, và con đường tự hiện ra.',
    hint_80: 'Anh nhận ra mình không còn mệt theo cách cũ nữa. Nắng hay mưa, đôi chân vẫn tiến.',
    hint_100: 'Năm mươi bước, một trăm bước, không ai đếm nữa. Đôi chân này đã đi qua quá nhiều để dừng lại. 🏅 Terrain Reader mở khóa.',
    unlock_skill: 'terrain_reader',
    unlock_label: 'Terrain Reader',
  },

  farmer_endurance: {
    hint_50: 'Anh dừng lại một giây, nhìn tay mình. Không run. Lạ thật — đã bao nhiêu ngày rồi không run.',
    hint_80: 'Những người khác nói về sự kiệt sức như một điều tất yếu. Anh bắt đầu tự hỏi liệu với mình có không.',
    hint_100: 'Ba mươi ngày. Anh chưa một lần ngã xuống và không đứng dậy được. Không phải may mắn — có thứ gì đó trong cơ thể này đã quyết định chưa xong. 🏅 Iron Stamina mở khóa.',
    unlock_skill: 'iron_stamina',
    unlock_label: 'Iron Stamina',
  },

};

// ── Merge hints vào MILESTONE_DEFS ────────────────────
(function() {
  if (typeof MILESTONE_DEFS === 'undefined') return;
  if (MILESTONE_DEFS.farmer_first_harvest)
    MILESTONE_DEFS.farmer_first_harvest.hints = FARMER_SIGNATURE_HINTS.farmer_first_harvest;
  if (MILESTONE_DEFS.farmer_long_road)
    MILESTONE_DEFS.farmer_long_road.hints = FARMER_SIGNATURE_HINTS.farmer_long_road;
  if (MILESTONE_DEFS.farmer_endurance)
    MILESTONE_DEFS.farmer_endurance.hints = FARMER_SIGNATURE_HINTS.farmer_endurance;
})();

// ── FARMER SYNERGIES ──────────────────────────────────
(function() {
  if (typeof SKILL_SYNERGIES === 'undefined') return;
  SKILL_SYNERGIES.push(
    {
      id: 'living_off_land',
      name: 'Sống Nhờ Đất',
      desc: 'Sức Bền + Thấu Hiểu Đất: không bị debuff từ đói khi đang ở tile tự nhiên.',
      jobFilter: 'farmer',
      requires: [
        { skill: 'suc_ben_vo_tan',     level: 3 },
        { skill: 'tim_kiem_ban_nang',  level: 5 },
      ],
      effect: { hunger_debuff_immune_in_nature: true },
    },
    {
      id: 'endless_journey',
      name: 'Hành Trình Bất Tận',
      desc: 'Sức Bền + Tay Ngang: mỗi ngày đi được 10+ tile ngoài trời, nhận thêm 1 free action.',
      jobFilter: 'farmer',
      requires: [
        { skill: 'chan_quen_duong',     level: 5 },
        { skill: 'nguoi_nhieu_viec',   level: 3 },
      ],
      effect: { long_travel_bonus_action: true },
    }
  );
})();



// ══════════════════════════════════════════════════════
// SELF-REGISTRATION — chạy sau khi file load xong
// ══════════════════════════════════════════════════════
(function () {
  if (typeof DW_ROLE_TREES === 'undefined') {
    console.error('[Deadworld] DW_ROLE_TREES chưa khai báo — kiểm tra load order.');
    return;
  }

  // 1. Đăng ký tree
  DW_ROLE_TREES['farmer'] = FARMER_SKILL_TREE;

  // 2. Đăng ký từng skill vào DW_SKILLS
  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(FARMER_SKILL_TREE)) {
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
