// ══════════════════════════════════════════════════════
// DEAD WORLD — teacher-skill-tree.js  v1.0
// Role: Giáo Viên (teacher)
// Fantasy: "Người duy nhất trong thành phố biết chuyện gì đang xảy ra."
//
// TRIẾT LÝ THIẾT KẾ (Schell Lens #35 — Meaningful Choices):
//   Mỗi nhánh tạo playstyle khác nhau, không chồng chéo.
//   Không có ambient stat buff — mọi sức mạnh cần "điều kiện".
//   Solo play kém Farmer/Driver; mạnh nhất khi có NPC đồng hành.
//
// BALANCE TARGET:
//   Combat      : Yếu       (điểm yếu cố ý, không có combat skill)
//   Survival    : TB        (không tự lo tốt bằng Farmer/Chef)
//   Exploration : Mạnh      (đọc bản đồ, tile insight, dự đoán)
//   Utility     : Rất Mạnh  (XP growth qua engine, dạy NPC, rumor)
//
// ĐIỂM YẾU CỐ Ý:
//   - Không combat skill, không AP economy skill
//   - Mọi sức mạnh cần điều kiện (đã ghi chép, có NPC, đã đọc sách)
//   - Nhánh TRUYỀN ĐẠT gần như vô dụng khi solo
//
// Engine đã xử lý XP x1.5 cho teacher (engine-skills.js line 78).
// Skill tree KHÔNG thêm xp_gain_bonus — tránh double-stack.
//
// Cấu trúc file (1 file duy nhất, pattern chef/driver/soldier):
//   1. TEACHER_SKILL_TREE  — 15 skill + 3 signature
//   2. PREREQUISITES
//   3. MILESTONE HINTS
//   4. SYNERGIES
//   5. ENGINE PATCHES      — DW_move, DW_fight, DW_sleep, DW_searchObject
//   6. SELF-REGISTRATION
//
// Load order: sau deadworld-data-addon.js, trước engine-skills.js.
// ══════════════════════════════════════════════════════

var TEACHER_SKILL_TREE = {

  // ══════════════════════════════════════════════════════
  // NHÁNH 1: SỔ TAY
  // Fantasy: "đầu giáo viên là cuốn sổ tay sinh tồn"
  // Core loop: quan sát → ghi chép → insight → hành động hiệu quả hơn
  // Điểm yếu: cần đến tile trước mới có thông tin — không có passive radar
  // ══════════════════════════════════════════════════════

  quan_sat_moi_truong: {
    id: 'quan_sat_moi_truong', name: 'Quan Sát Môi Trường',
    branch: 'so_tay', branchLabel: '📓 Sổ Tay',
    jobFilter: 'teacher', icon: '🔍', prereq: [], maxLevel: 10,
    desc: 'Tile đã đến cho nhiều thông tin hơn — lượng loot còn, loại zombie, exit nào an toàn.',
    effects: {
      1:  { tile_detail_level: 1,
            label: 'Tile đã đến: hiện rõ loot còn/hết' },
      2:  { tile_detail_level: 1, scavenge_info: true },
      3:  { tile_detail_level: 2, scavenge_info: true,
            label: '⚡ Thấy số lượng và loại zombie trong tile đã khám phá' },
      4:  { tile_detail_level: 2, scavenge_info: true, exit_info: true },
      5:  { tile_detail_level: 3, scavenge_info: true, exit_info: true,
            safe_exit_highlight: true,
            label: '⚡ Highlight exit an toàn nhất khi vào tile đã biết' },
      6:  { tile_detail_level: 3, scavenge_info: true, exit_info: true,
            safe_exit_highlight: true },
      7:  { tile_detail_level: 3, scavenge_info: true, exit_info: true,
            safe_exit_highlight: true, hidden_container_chance: 0.25,
            label: '⚡ 25% phát hiện container ẩn khi vào tile lần đầu' },
      8:  { tile_detail_level: 3, scavenge_info: true, exit_info: true,
            safe_exit_highlight: true, hidden_container_chance: 0.30 },
      9:  { tile_detail_level: 3, scavenge_info: true, exit_info: true,
            safe_exit_highlight: true, hidden_container_chance: 0.35 },
      10: { tile_detail_level: 4, scavenge_info: true, exit_info: true,
            safe_exit_highlight: true, hidden_container_chance: 0.40,
            full_tile_scan: true,
            label: '🏆 MASTERY: Quét Toàn Diện — vào tile mới: tự động reveal toàn bộ thông tin ngay lập tức' },
    },
  },

  ghi_chep_thuc_dia: {
    id: 'ghi_chep_thuc_dia', name: 'Ghi Chép Thực Địa',
    branch: 'so_tay', branchLabel: '📓 Sổ Tay',
    jobFilter: 'teacher', icon: '📝',
    prereq: [{ skill: 'quan_sat_moi_truong', level: 3 }], maxLevel: 10,
    desc: 'Action "Ghi Chép" (1 AP): đánh dấu tile hiện tại → vào lại tốn ít AP hơn, lục soát hiệu quả hơn.',
    effects: {
      1:  { note_action_unlock: true,
            label: '⚡ Mở khóa action Ghi Chép (1 AP): tile được nhớ sâu' },
      2:  { note_action_unlock: true, noted_tile_ap_reduce: 1,
            label: 'Tile đã ghi chép: vào lại -1 AP' },
      3:  { note_action_unlock: true, noted_tile_ap_reduce: 1,
            noted_tile_scavenge_bonus: 0.20,
            label: '⚡ Lục soát tile đã ghi chép: +20% cơ hội tìm thêm đồ' },
      4:  { note_action_unlock: true, noted_tile_ap_reduce: 1,
            noted_tile_scavenge_bonus: 0.25 },
      5:  { note_action_unlock: true, noted_tile_ap_reduce: 1,
            noted_tile_scavenge_bonus: 0.30, note_ap_free: true,
            label: '⚡ Ghi Chép không còn tốn AP' },
      6:  { note_action_unlock: true, noted_tile_ap_reduce: 1,
            noted_tile_scavenge_bonus: 0.33, note_ap_free: true },
      7:  { note_action_unlock: true, noted_tile_ap_reduce: 2,
            noted_tile_scavenge_bonus: 0.36, note_ap_free: true,
            note_route_efficiency: true,
            label: '⚡ Di chuyển giữa 2 tile đã ghi chép: -1 AP thêm' },
      8:  { note_action_unlock: true, noted_tile_ap_reduce: 2,
            noted_tile_scavenge_bonus: 0.38, note_ap_free: true,
            note_route_efficiency: true },
      9:  { note_action_unlock: true, noted_tile_ap_reduce: 2,
            noted_tile_scavenge_bonus: 0.40, note_ap_free: true,
            note_route_efficiency: true },
      10: { note_action_unlock: true, noted_tile_ap_reduce: 2,
            noted_tile_scavenge_bonus: 0.45, note_ap_free: true,
            note_route_efficiency: true, field_notes_mastery: true,
            label: '🏆 MASTERY: Bản Đồ Sống — tất cả tile đã đến tự động ghi chép; lục soát tile quen không tốn AP' },
    },
  },

  nhan_ra_quy_luat: {
    id: 'nhan_ra_quy_luat', name: 'Nhận Ra Quy Luật',
    branch: 'so_tay', branchLabel: '📓 Sổ Tay',
    jobFilter: 'teacher', icon: '🧩',
    prereq: [{ skill: 'ghi_chep_thuc_dia', level: 3 }], maxLevel: 10,
    desc: 'Lần đầu gặp loại zombie mới → tự nhận ra điểm yếu. Học từ thất bại — bị thương càng nhiều, hiểu càng sâu.',
    effects: {
      1:  { first_encounter_insight: true,
            label: '⚡ Gặp loại zombie lần đầu: auto-reveal điểm yếu (bleed/noise/fear)' },
      2:  { first_encounter_insight: true, damage_taken_xp: true },
      3:  { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.20,
            label: '⚡ Patrol pattern: thấy lộ trình zombie sau khi cùng tile 2 lượt' },
      4:  { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.25 },
      5:  { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.30, exploit_damage_bonus: 0.15,
            label: '⚡ Khai thác điểm yếu đã biết: +15% damage lên loại zombie đó' },
      6:  { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.35, exploit_damage_bonus: 0.18 },
      7:  { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.40, exploit_damage_bonus: 0.20,
            boss_weakness_sense: true,
            label: '⚡ Boss: khi gặp lần đầu, auto-reveal 1 điểm yếu của boss đó' },
      8:  { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.45, exploit_damage_bonus: 0.22,
            boss_weakness_sense: true },
      9:  { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.50, exploit_damage_bonus: 0.24,
            boss_weakness_sense: true },
      10: { first_encounter_insight: true, damage_taken_xp: true,
            pattern_recognition: 0.55, exploit_damage_bonus: 0.25,
            boss_weakness_sense: true, perfect_recall: true,
            label: '🏆 MASTERY: Trí Nhớ Hoàn Hảo — exploit_damage +25%; boss lv2+ tự reveal thêm 1 điểm yếu; không bao giờ quên điểm yếu đã học' },
    },
  },

  doc_sach_cu: {
    id: 'doc_sach_cu', name: 'Đọc Sách Cũ',
    branch: 'so_tay', branchLabel: '📓 Sổ Tay',
    jobFilter: 'teacher', icon: '📚',
    prereq: [{ skill: 'nhan_ra_quy_luat', level: 3 }], maxLevel: 10,
    desc: 'Sách bỏ hoang là vũ khí của giáo viên. Tìm sách dễ hơn — đọc sách cho skill XP, blueprint, rumor hint.',
    effects: {
      1:  { book_loot_bonus: 0.15,
            label: '+15% cơ hội tìm sách khi lục soát nhà dân/trường học' },
      2:  { book_loot_bonus: 0.20 },
      3:  { book_loot_bonus: 0.25, book_skill_xp: true,
            label: '⚡ Đọc sách: nhận +8 XP skill liên quan đến chủ đề' },
      4:  { book_loot_bonus: 0.30, book_skill_xp: true },
      5:  { book_loot_bonus: 0.35, book_skill_xp: true, book_blueprint_chance: 0.25,
            label: '⚡ Sách kỹ thuật: 25% chứa blueprint ngẫu nhiên khi đọc' },
      6:  { book_loot_bonus: 0.40, book_skill_xp: true, book_blueprint_chance: 0.30 },
      7:  { book_loot_bonus: 0.45, book_skill_xp: true, book_blueprint_chance: 0.35,
            book_rumor_insight: true,
            label: '⚡ Sách địa phương: 30% hint về rumor event gần đó' },
      8:  { book_loot_bonus: 0.50, book_skill_xp: true, book_blueprint_chance: 0.38,
            book_rumor_insight: true },
      9:  { book_loot_bonus: 0.55, book_skill_xp: true, book_blueprint_chance: 0.40,
            book_rumor_insight: true },
      10: { book_loot_bonus: 0.60, book_skill_xp: true, book_blueprint_chance: 0.45,
            book_rumor_insight: true, library_mind: true,
            label: '🏆 MASTERY: Thư Viện Sống — đọc sách không tốn AP; Blueprint từ sách luôn có 1 bonus effect' },
    },
  },

  bai_hoc_xuong_mau: {
    id: 'bai_hoc_xuong_mau', name: 'Bài Học Xương Máu',
    branch: 'so_tay', branchLabel: '📓 Sổ Tay',
    jobFilter: 'teacher', icon: '🩸',
    prereq: [{ skill: 'doc_sach_cu', level: 5 }], maxLevel: 10,
    desc: 'Thất bại là người thầy tốt nhất. Khi HP thấp — XP tăng, stress không tăng từ combat, học nhanh hơn.',
    effects: {
      1:  { near_death_xp_mult: 1.30,
            label: 'Khi HP < 30%: XP nhận được x1.3' },
      2:  { near_death_xp_mult: 1.40 },
      3:  { near_death_xp_mult: 1.50, failure_insight: true,
            label: '⚡ Bị đòn nặng: tự học điểm yếu của loại zombie đó' },
      4:  { near_death_xp_mult: 1.55, failure_insight: true },
      5:  { near_death_xp_mult: 1.60, failure_insight: true, stress_xp_convert: true,
            label: '⚡ Mỗi 10 stress tích lũy → +5 XP khi ngủ (stress = trải nghiệm)' },
      6:  { near_death_xp_mult: 1.65, failure_insight: true, stress_xp_convert: true },
      7:  { near_death_xp_mult: 1.70, failure_insight: true, stress_xp_convert: true,
            resilience_recovery: true,
            label: '⚡ Vượt ngưỡng nguy hiểm (HP trở lại > 30%): stress -10 ngay lập tức' },
      8:  { near_death_xp_mult: 1.75, failure_insight: true, stress_xp_convert: true,
            resilience_recovery: true },
      9:  { near_death_xp_mult: 1.80, failure_insight: true, stress_xp_convert: true,
            resilience_recovery: true },
      10: { near_death_xp_mult: 2.00, failure_insight: true, stress_xp_convert: true,
            resilience_recovery: true, survivor_mentality: true,
            label: '🏆 MASTERY: Tinh Thần Sống Sót — HP < 30%: XP x2, combat không tăng stress, mỗi đòn trúng tự học loại zombie đó' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 2: CẢNH BÁO
  // Fantasy: "giáo viên không chiến đấu được — nhưng không bao giờ bị bất ngờ"
  // Core loop: đọc dấu hiệu → cảnh báo sớm → né tránh/chuẩn bị → tồn tại
  // Điểm yếu: cảnh báo không có giá trị nếu không đủ AP để phản ứng
  // ══════════════════════════════════════════════════════

  dong_ho_sinh_hoc: {
    id: 'dong_ho_sinh_hoc', name: 'Đồng Hồ Sinh Học',
    branch: 'canh_bao', branchLabel: '⚠️ Cảnh Báo',
    jobFilter: 'teacher', icon: '⏰', prereq: [], maxLevel: 10,
    desc: 'Biết giờ nào zombie hoạt động mạnh — chọn thời điểm lục soát và di chuyển tối ưu.',
    effects: {
      1:  { zombie_activity_info: true,
            label: '⚡ Hiển thị mức độ zombie activity theo giờ trong ngày' },
      2:  { zombie_activity_info: true, optimal_time_hint: true },
      3:  { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true,
            label: '⚡ Thấy lộ trình patrol zombie trong tile đã ghi chép' },
      4:  { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true },
      5:  { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true, window_of_opportunity: true,
            label: '⚡ Cửa Sổ Cơ Hội: highlight 2h an toàn nhất để di chuyển mỗi ngày' },
      6:  { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true, window_of_opportunity: true },
      7:  { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true, window_of_opportunity: true,
            noise_decay_rate: 0.30,
            label: '⚡ Hiểu hành vi: noise decay nhanh hơn 30%' },
      8:  { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true, window_of_opportunity: true,
            noise_decay_rate: 0.33 },
      9:  { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true, window_of_opportunity: true,
            noise_decay_rate: 0.36 },
      10: { zombie_activity_info: true, optimal_time_hint: true,
            patrol_predict: true, window_of_opportunity: true,
            noise_decay_rate: 0.40, day_rhythm_master: true,
            label: '🏆 MASTERY: Nhịp Điệu Thành Phố — không bao giờ gặp zombie khi di chuyển trong Cửa Sổ Cơ Hội' },
    },
  },

  doc_dau_hieu: {
    id: 'doc_dau_hieu', name: 'Đọc Dấu Hiệu',
    branch: 'canh_bao', branchLabel: '⚠️ Cảnh Báo',
    jobFilter: 'teacher', icon: '🚨',
    prereq: [{ skill: 'dong_ho_sinh_hoc', level: 3 }], maxLevel: 10,
    desc: 'Cảnh báo sớm: horde sắp đến, boss sắp xuất hiện, tile đang bị "nhiễm".',
    effects: {
      1:  { horde_warning: 1,
            label: 'Cảnh báo trước 1 ngày khi horde di chuyển về phía bạn' },
      2:  { horde_warning: 1, danger_tile_sense: true },
      3:  { horde_warning: 2, danger_tile_sense: true,
            label: '⚡ Cảnh báo 2 ngày; "Tile Nguy Hiểm" có icon trước khi bước vào' },
      4:  { horde_warning: 2, danger_tile_sense: true, infected_tile_detect: true },
      5:  { horde_warning: 2, danger_tile_sense: true, infected_tile_detect: true,
            rumor_danger_flag: true,
            label: '⚡ Rumor nguy hiểm: 50% có flag cảnh báo trước khi quyết định' },
      6:  { horde_warning: 2, danger_tile_sense: true, infected_tile_detect: true,
            rumor_danger_accuracy: 0.55 },
      7:  { horde_warning: 3, danger_tile_sense: true, infected_tile_detect: true,
            rumor_danger_accuracy: 0.60, trap_sense: true,
            label: '⚡ Cảm nhận bẫy: thấy bẫy của kẻ thù trước khi bước vào' },
      8:  { horde_warning: 3, danger_tile_sense: true, infected_tile_detect: true,
            rumor_danger_accuracy: 0.65, trap_sense: true },
      9:  { horde_warning: 3, danger_tile_sense: true, infected_tile_detect: true,
            rumor_danger_accuracy: 0.68, trap_sense: true },
      10: { horde_warning: 3, danger_tile_sense: true, infected_tile_detect: true,
            rumor_danger_accuracy: 0.70, trap_sense: true,
            no_ambush: true,
            label: '🏆 MASTERY: Hệ Thống Cảnh Báo Sớm — rumor 70% chính xác; không bao giờ bị ambush' },
    },
  },

  ly_thuyet_am_muu: {
    id: 'ly_thuyet_am_muu', name: 'Lý Thuyết Âm Mưu',
    branch: 'canh_bao', branchLabel: '⚠️ Cảnh Báo',
    jobFilter: 'teacher', icon: '🗺️',
    prereq: [{ skill: 'doc_dau_hieu', level: 3 }], maxLevel: 10,
    desc: 'Ghép thông tin từ nhiều nguồn — tìm ra nơi ẩn đồ, nơi trú ẩn, nơi tuyệt đối không nên đến.',
    effects: {
      1:  { rumor_outcome_preview: 0.30,
            label: '30% rumor event có preview kết quả trước khi chọn' },
      2:  { rumor_outcome_preview: 0.35 },
      3:  { rumor_outcome_preview: 0.40, safe_house_chance: 0.35,
            label: '⚡ 35% phát hiện saferoom ẩn trong tile đã vào' },
      4:  { rumor_outcome_preview: 0.44, safe_house_chance: 0.38 },
      5:  { rumor_outcome_preview: 0.48, safe_house_chance: 0.40,
            conspiracy_map: true,
            label: '⚡ Bản Đồ Âm Mưu: 1 lần/ngày reveal 1 tile đặc biệt gần đó (cache, bunker, trader)' },
      6:  { rumor_outcome_preview: 0.50, safe_house_chance: 0.42,
            conspiracy_map: true },
      7:  { rumor_outcome_preview: 0.52, safe_house_chance: 0.44,
            conspiracy_map: true, npc_motive_read: true,
            label: '⚡ Đọc Ý Đồ: biết NPC có đang nói thật không' },
      8:  { rumor_outcome_preview: 0.54, safe_house_chance: 0.46,
            conspiracy_map: true, npc_motive_read: true },
      9:  { rumor_outcome_preview: 0.56, safe_house_chance: 0.48,
            conspiracy_map: true, npc_motive_read: true },
      10: { rumor_outcome_preview: 0.60, safe_house_chance: 0.50,
            conspiracy_map: true, npc_motive_read: true, grand_theory: true,
            label: '🏆 MASTERY: Lý Thuyết Lớn — NPC không lừa được Teacher; 1 lần/game reveal toàn bộ tile đặc biệt trên bản đồ' },
    },
  },

  tinh_huong_gio: {
    id: 'tinh_huong_gio', name: 'Tính Hướng Gió',
    branch: 'canh_bao', branchLabel: '⚠️ Cảnh Báo',
    jobFilter: 'teacher', icon: '🌬️',
    prereq: [{ skill: 'ly_thuyet_am_muu', level: 3 }], maxLevel: 10,
    desc: 'Dự đoán hướng zombie migration — biết trước vùng nào sắp nguy hiểm, chọn hành lang an toàn.',
    effects: {
      1:  { migration_arrow: true,
            label: '⚡ Hiển thị hướng migration zombie trên bản đồ (mũi tên)' },
      2:  { migration_arrow: true, spread_predict: 1 },
      3:  { migration_arrow: true, spread_predict: 1,
            label: '⚡ Thấy trước 1 ngày tile nào sẽ bị zombie tràn vào' },
      4:  { migration_arrow: true, spread_predict: 1, safe_corridor_sense: true },
      5:  { migration_arrow: true, spread_predict: 2, safe_corridor_sense: true,
            label: '⚡ Hành Lang An Toàn: highlight con đường ít zombie nhất trong 24h tới' },
      6:  { migration_arrow: true, spread_predict: 2, safe_corridor_sense: true },
      7:  { migration_arrow: true, spread_predict: 2, safe_corridor_sense: true,
            distraction_plan: true,
            label: '⚡ Kế Hoạch Đánh Lạc Hướng: 2 AP → dẫn horde đi hướng khác (1 lần/ngày)' },
      8:  { migration_arrow: true, spread_predict: 2, safe_corridor_sense: true,
            distraction_plan: true },
      9:  { migration_arrow: true, spread_predict: 3, safe_corridor_sense: true,
            distraction_plan: true },
      10: { migration_arrow: true, spread_predict: 3, safe_corridor_sense: true,
            distraction_plan: true, weather_read: true,
            label: '🏆 MASTERY: Đọc Thế Giới — Hành Lang An Toàn đảm bảo 0 encounter; thấy trước 3 ngày mọi nguy hiểm lớn' },
    },
  },

  ket_qua_tat_yeu: {
    id: 'ket_qua_tat_yeu', name: 'Kết Quả Tất Yếu',
    branch: 'canh_bao', branchLabel: '⚠️ Cảnh Báo',
    jobFilter: 'teacher', icon: '🔮',
    prereq: [{ skill: 'tinh_huong_gio', level: 5 }], maxLevel: 10,
    desc: 'Đủ thông tin để đọc được outcome. Boss sắp đến → chuẩn bị. Tile sắp trống → vào đúng lúc.',
    effects: {
      1:  { boss_spawn_warning: 1,
            label: 'Cảnh báo trước 1 ngày khi boss sắp spawn gần bạn' },
      2:  { boss_spawn_warning: 1, boss_weak_phase_sense: true },
      3:  { boss_spawn_warning: 2, boss_weak_phase_sense: true,
            label: '⚡ Cảnh báo 2 ngày; thấy khi boss đang ở giai đoạn yếu (HP < 50%)' },
      4:  { boss_spawn_warning: 2, boss_weak_phase_sense: true,
            loot_cycle_predict: true },
      5:  { boss_spawn_warning: 2, boss_weak_phase_sense: true,
            loot_cycle_predict: true, event_outcome_preview: true,
            label: '⚡ Preview Kết Quả: event/rumor — thấy 2 trong 3 possible outcomes trước khi chọn' },
      6:  { boss_spawn_warning: 2, boss_weak_phase_sense: true,
            loot_cycle_predict: true, event_outcome_preview: true },
      7:  { boss_spawn_warning: 3, boss_weak_phase_sense: true,
            loot_cycle_predict: true, event_outcome_preview: true,
            inevitable_read: true,
            label: '⚡ Đọc Tất Yếu: 1 lần/ngày "đọc" 1 tile bất kỳ → biết mọi thứ mà không cần đến' },
      8:  { boss_spawn_warning: 3, boss_weak_phase_sense: true,
            loot_cycle_predict: true, event_outcome_preview: true,
            inevitable_read: true },
      9:  { boss_spawn_warning: 3, boss_weak_phase_sense: true,
            loot_cycle_predict: true, event_outcome_preview: true,
            inevitable_read: true },
      10: { boss_spawn_warning: 3, boss_weak_phase_sense: true,
            loot_cycle_predict: true, event_outcome_preview: true,
            inevitable_read: true, perfect_foresight: true,
            label: '🏆 MASTERY: Nhãn Quan Hoàn Hảo — 1 lần/game: nhìn thấy diễn biến 7 ngày tới (boss, horde, loot, NPC). Hiện toàn bộ trên log.' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 3: TRUYỀN ĐẠT
  // Fantasy: "sức mạnh nhân đôi qua người khác"
  // Core loop: gặp NPC → dạy → NPC giỏi hơn → NPC giúp lại → survival tốt hơn
  // ĐIỂM YẾU CỐ Ý: gần như vô dụng khi solo — buộc phải tìm đồng hành
  // ══════════════════════════════════════════════════════

  truyen_cam_hung: {
    id: 'truyen_cam_hung', name: 'Truyền Cảm Hứng',
    branch: 'truyen_dat', branchLabel: '🤝 Truyền Đạt',
    jobFilter: 'teacher', icon: '✨', prereq: [], maxLevel: 10,
    desc: 'Lời nói của giáo viên có trọng lượng. NPC ban đầu ít thù địch hơn, tin tưởng nhanh hơn.',
    effects: {
      1:  { npc_initial_trust_bonus: 0.10,
            label: 'Survivor encounter: NPC bắt đầu với trust +10%' },
      2:  { npc_initial_trust_bonus: 0.15 },
      3:  { npc_initial_trust_bonus: 0.20, hostile_calm_chance: 0.20,
            label: '⚡ 20% NPC thù địch dừng lại khi tiếp cận (tránh combat)' },
      4:  { npc_initial_trust_bonus: 0.25, hostile_calm_chance: 0.25 },
      5:  { npc_initial_trust_bonus: 0.30, hostile_calm_chance: 0.30,
            trade_bonus: 0.15,
            label: '⚡ NPC trade giá tốt hơn 15%' },
      6:  { npc_initial_trust_bonus: 0.33, hostile_calm_chance: 0.33,
            trade_bonus: 0.18 },
      7:  { npc_initial_trust_bonus: 0.36, hostile_calm_chance: 0.36,
            trade_bonus: 0.20, group_morale_aura: true,
            label: '⚡ Teacher ở cùng tile: NPC trong nhóm stress -3/ngày' },
      8:  { npc_initial_trust_bonus: 0.38, hostile_calm_chance: 0.38,
            trade_bonus: 0.22, group_morale_aura: true },
      9:  { npc_initial_trust_bonus: 0.40, hostile_calm_chance: 0.40,
            trade_bonus: 0.24, group_morale_aura: true },
      10: { npc_initial_trust_bonus: 0.45, hostile_calm_chance: 0.45,
            trade_bonus: 0.25, group_morale_aura: true,
            legendary_reputation: true,
            label: '🏆 MASTERY: Danh Tiếng Huyền Thoại — 50% survivor nghe tiếng đến với trust cao; NPC thù địch 50% ngừng chiến khi nhìn thấy Teacher' },
    },
  },

  day_co_ban: {
    id: 'day_co_ban', name: 'Dạy Cơ Bản',
    branch: 'truyen_dat', branchLabel: '🤝 Truyền Đạt',
    jobFilter: 'teacher', icon: '📖',
    prereq: [{ skill: 'truyen_cam_hung', level: 3 }], maxLevel: 10,
    desc: 'Action "Dạy" (2 AP): dạy NPC 1 kỹ năng → NPC thực hiện action liên quan hiệu quả hơn vĩnh viễn.',
    effects: {
      1:  { teach_action_unlock: true,
            label: '⚡ Mở khóa action Dạy (2 AP): NPC nhận +1 skill level trong lĩnh vực được dạy' },
      2:  { teach_action_unlock: true },
      3:  { teach_action_unlock: true, npc_skill_retention: true,
            label: '⚡ NPC được dạy nhớ kỹ năng vĩnh viễn (không mất khi rời tile)' },
      4:  { teach_action_unlock: true, npc_skill_retention: true },
      5:  { teach_action_unlock: true, npc_skill_retention: true, teach_ap_cost: 1,
            label: '⚡ Dạy giảm xuống còn 1 AP' },
      6:  { teach_action_unlock: true, npc_skill_retention: true, teach_ap_cost: 1,
            teach_xp_gain: true },
      7:  { teach_action_unlock: true, npc_skill_retention: true, teach_ap_cost: 1,
            teach_xp_gain: true, teach_two_skills: true,
            label: '⚡ Dạy được 2 kỹ năng cùng lúc (vẫn 1 AP)' },
      8:  { teach_action_unlock: true, npc_skill_retention: true, teach_ap_cost: 1,
            teach_xp_gain: true, teach_two_skills: true },
      9:  { teach_action_unlock: true, npc_skill_retention: true, teach_ap_cost: 1,
            teach_xp_gain: true, teach_two_skills: true },
      10: { teach_action_unlock: true, npc_skill_retention: true, teach_ap_cost: 0,
            teach_xp_gain: true, teach_two_skills: true, master_teacher: true,
            label: '🏆 MASTERY: Thầy Giỏi — Dạy không tốn AP; NPC nhận 3 skill levels; Teacher nhận XP mỗi khi dạy' },
    },
  },

  niem_tin_tap_the: {
    id: 'niem_tin_tap_the', name: 'Niềm Tin Tập Thể',
    branch: 'truyen_dat', branchLabel: '🤝 Truyền Đạt',
    jobFilter: 'teacher', icon: '👥',
    prereq: [{ skill: 'day_co_ban', level: 3 }], maxLevel: 10,
    desc: 'Nhóm có Teacher: mọi người làm việc nhịp nhàng hơn. Buff hiệu quả khi có ≥ 2 người cùng tile.',
    effects: {
      1:  { group_action_bonus: 0.08,
            label: 'Khi có ≥ 2 người cùng tile: mọi action +8% hiệu quả' },
      2:  { group_action_bonus: 0.10 },
      3:  { group_action_bonus: 0.12, group_xp_share_rate: 0.30,
            label: '⚡ Chia sẻ XP: NPC trong nhóm làm action → Teacher nhận 30% XP đó' },
      4:  { group_action_bonus: 0.14, group_xp_share_rate: 0.33 },
      5:  { group_action_bonus: 0.16, group_xp_share_rate: 0.35,
            coordinated_action: true,
            label: '⚡ Hành Động Phối Hợp: 1 AP → cả nhóm làm cùng 1 action (lục soát, barricade)' },
      6:  { group_action_bonus: 0.18, group_xp_share_rate: 0.37,
            coordinated_action: true },
      7:  { group_action_bonus: 0.20, group_xp_share_rate: 0.38,
            coordinated_action: true, group_defense_bonus: 0.15,
            label: '⚡ Phòng thủ tập thể: nhóm ≥ 2 → cả nhóm nhận -15% damage' },
      8:  { group_action_bonus: 0.22, group_xp_share_rate: 0.39,
            coordinated_action: true, group_defense_bonus: 0.18 },
      9:  { group_action_bonus: 0.24, group_xp_share_rate: 0.40,
            coordinated_action: true, group_defense_bonus: 0.20 },
      10: { group_action_bonus: 0.25, group_xp_share_rate: 0.40,
            coordinated_action: true, group_defense_bonus: 0.22, hive_mind: true,
            label: '🏆 MASTERY: Đồng Tâm — nhóm ≥ 3 người: shared skill pool; hành động phối hợp tốn 0 AP' },
    },
  },

  ke_hoach_chung: {
    id: 'ke_hoach_chung', name: 'Kế Hoạch Chung',
    branch: 'truyen_dat', branchLabel: '🤝 Truyền Đạt',
    jobFilter: 'teacher', icon: '📋',
    prereq: [{ skill: 'niem_tin_tap_the', level: 3 }], maxLevel: 10,
    desc: 'Action "Briefing" (1 AP): phổ biến kế hoạch → NPC trong tile hành động hiệu quả hơn cả ngày.',
    effects: {
      1:  { brief_action_unlock: true, brief_duration_h: 12,
            label: '⚡ Mở khóa Briefing (1 AP): NPC +20% hiệu quả trong 12h' },
      2:  { brief_action_unlock: true, brief_duration_h: 14 },
      3:  { brief_action_unlock: true, brief_duration_h: 16,
            brief_surprise_immune: true,
            label: '⚡ 16h; NPC được brief không bị surprise attack' },
      4:  { brief_action_unlock: true, brief_duration_h: 18,
            brief_surprise_immune: true },
      5:  { brief_action_unlock: true, brief_duration_h: 20,
            brief_surprise_immune: true, brief_combat_bonus: 0.10,
            label: '⚡ Brief thêm +10% combat cho NPC' },
      6:  { brief_action_unlock: true, brief_duration_h: 22,
            brief_surprise_immune: true, brief_combat_bonus: 0.12 },
      7:  { brief_action_unlock: true, brief_duration_h: 24,
            brief_surprise_immune: true, brief_combat_bonus: 0.14,
            brief_free: true,
            label: '⚡ Briefing không tốn AP; kéo dài cả ngày' },
      8:  { brief_action_unlock: true, brief_duration_h: 24,
            brief_surprise_immune: true, brief_combat_bonus: 0.16, brief_free: true },
      9:  { brief_action_unlock: true, brief_duration_h: 24,
            brief_surprise_immune: true, brief_combat_bonus: 0.18, brief_free: true },
      10: { brief_action_unlock: true, brief_duration_h: 24,
            brief_surprise_immune: true, brief_combat_bonus: 0.20, brief_free: true,
            tactical_genius: true,
            label: '🏆 MASTERY: Thiên Tài Chiến Thuật — Brief 0 AP, 24h, NPC biết và tự khai thác điểm yếu zombie Teacher đã học' },
    },
  },

  truyen_thu_kien_thuc: {
    id: 'truyen_thu_kien_thuc', name: 'Truyền Thụ Kiến Thức',
    branch: 'truyen_dat', branchLabel: '🤝 Truyền Đạt',
    jobFilter: 'teacher', icon: '🎓',
    prereq: [{ skill: 'ke_hoach_chung', level: 5 }], maxLevel: 10,
    desc: 'Kiến thức không chết theo người. NPC được dạy truyền lại cho người khác — di sản tồn tại dù Teacher mất.',
    effects: {
      1:  { npc_teach_forward: true,
            label: '⚡ NPC được Teacher dạy có thể dạy lại NPC khác (50% hiệu quả)' },
      2:  { npc_teach_forward: true },
      3:  { npc_teach_forward: true, rescue_skill_bonus: true,
            label: '⚡ Survivor được giải cứu đến với 1 skill point đã có sẵn' },
      4:  { npc_teach_forward: true, rescue_skill_bonus: true,
            rescue_trust_bonus: 0.20 },
      5:  { npc_teach_forward: true, rescue_skill_bonus: true,
            rescue_trust_bonus: 0.25, knowledge_base_passive: 0.20,
            label: '⚡ Ở base: mỗi ngày NPC có 20% tự nâng 1 skill Teacher đã dạy' },
      6:  { npc_teach_forward: true, rescue_skill_bonus: true,
            rescue_trust_bonus: 0.28, knowledge_base_passive: 0.22 },
      7:  { npc_teach_forward: true, rescue_skill_bonus: true,
            rescue_trust_bonus: 0.30, knowledge_base_passive: 0.25,
            living_library: true,
            label: '⚡ Thư Viện Sống: mọi người có thể "hỏi" Teacher để nhận hint về tile chưa đến' },
      8:  { npc_teach_forward: true, rescue_skill_bonus: true,
            rescue_trust_bonus: 0.32, knowledge_base_passive: 0.28,
            living_library: true },
      9:  { npc_teach_forward: true, rescue_skill_bonus: true,
            rescue_trust_bonus: 0.34, knowledge_base_passive: 0.30,
            living_library: true },
      10: { npc_teach_forward: true, rescue_skill_bonus: true,
            rescue_trust_bonus: 0.35, knowledge_base_passive: 0.30,
            living_library: true, immortal_knowledge: true,
            label: '🏆 MASTERY: Kiến Thức Bất Diệt — khi Teacher chết: NPC giữ lại kỹ năng; 1 NPC được chỉ định thừa kế toàn bộ Sổ Tay' },
    },
  },

  // ══════════════════════════════════════════════════════
  // SIGNATURE SKILLS — khớp với MILESTONE_DEFS trong deadworld-data-addon.js:
  //   teacher_first_lesson  → rapid_learner
  //   teacher_knowledge_hub → tactical_mind
  //   teacher_mentor        → legacy_knowledge
  // ══════════════════════════════════════════════════════

  rapid_learner: {
    id: 'rapid_learner', name: 'Học Siêu Tốc',
    branch: 'signature', branchLabel: '🏅 Signature',
    jobFilter: 'teacher', icon: '⚡',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Đọc sách không tốn ngày — chỉ tốn 2 AP. Unlock qua milestone teacher_first_lesson.',
    effects: {
      1: {
        rapid_learner_active: true,
        book_read_ap_cost: 2,     // đọc sách = 2 AP thay vì cả ngày
        book_per_day_limit: 3,    // có thể đọc 3 sách/ngày
        label: '🏅 Học Siêu Tốc: đọc sách chỉ tốn 2 AP; tối đa 3 cuốn/ngày',
      },
    },
  },

  tactical_mind: {
    id: 'tactical_mind', name: 'Đầu Óc Chiến Thuật',
    branch: 'signature', branchLabel: '🏅 Signature',
    jobFilter: 'teacher', icon: '🧠',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Thấy trước outcome của rumor 70% chính xác. Unlock qua milestone teacher_knowledge_hub.',
    effects: {
      1: {
        tactical_mind_active: true,
        rumor_preview_accuracy: 0.70,
        info_tile_bonus: true,        // library/school cho nhiều thông tin hơn
        label: '🏅 Đầu Óc Chiến Thuật: rumor outcome preview 70% chính xác; tile thông tin cho hint đặc biệt',
      },
    },
  },

  legacy_knowledge: {
    id: 'legacy_knowledge', name: 'Di Sản Tri Thức',
    branch: 'signature', branchLabel: '🏅 Signature',
    jobFilter: 'teacher', icon: '📜',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Khi Teacher chết, NPC được dạy giữ lại blueprint. Unlock qua milestone teacher_mentor.',
    effects: {
      1: {
        legacy_active: true,
        npc_blueprint_retention: true,
        death_knowledge_transfer: true,
        label: '🏅 Di Sản Tri Thức: khi Teacher chết → NPC giữ blueprint; 1 NPC thừa kế Sổ Tay',
      },
    },
  },

};

// ══════════════════════════════════════════════════════
// PREREQUISITES
// ══════════════════════════════════════════════════════
(function() {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;
  // Sổ Tay
  SKILL_PREREQUISITES.ghi_chep_thuc_dia    = [{ skill: 'quan_sat_moi_truong', level: 3 }];
  SKILL_PREREQUISITES.nhan_ra_quy_luat     = [{ skill: 'ghi_chep_thuc_dia',   level: 3 }];
  SKILL_PREREQUISITES.doc_sach_cu          = [{ skill: 'nhan_ra_quy_luat',    level: 3 }];
  SKILL_PREREQUISITES.bai_hoc_xuong_mau    = [{ skill: 'doc_sach_cu',         level: 5 }];
  // Cảnh Báo
  SKILL_PREREQUISITES.doc_dau_hieu         = [{ skill: 'dong_ho_sinh_hoc',    level: 3 }];
  SKILL_PREREQUISITES.ly_thuyet_am_muu     = [{ skill: 'doc_dau_hieu',        level: 3 }];
  SKILL_PREREQUISITES.tinh_huong_gio       = [{ skill: 'ly_thuyet_am_muu',    level: 3 }];
  SKILL_PREREQUISITES.ket_qua_tat_yeu      = [{ skill: 'tinh_huong_gio',      level: 5 }];
  // Truyền Đạt
  SKILL_PREREQUISITES.day_co_ban           = [{ skill: 'truyen_cam_hung',     level: 3 }];
  SKILL_PREREQUISITES.niem_tin_tap_the     = [{ skill: 'day_co_ban',          level: 3 }];
  SKILL_PREREQUISITES.ke_hoach_chung       = [{ skill: 'niem_tin_tap_the',    level: 3 }];
  SKILL_PREREQUISITES.truyen_thu_kien_thuc = [{ skill: 'ke_hoach_chung',      level: 5 }];
})();

// ══════════════════════════════════════════════════════
// MILESTONE HINTS
// ══════════════════════════════════════════════════════
(function() {
  if (typeof MILESTONE_DEFS === 'undefined') return;
  const hints = {
    teacher_first_lesson: {
      hint_50:  'Anh lật trang đầu tiên. Chữ đã nhòa — nhưng vẫn đọc được.',
      hint_80:  'Sách sinh tồn. Ai đó đã ghi chú bằng bút chì bên lề. Họ đã sống được không?',
      hint_100: 'Tay không run khi đọc nữa. Chữ và ý nghĩa sáng lên. 🏅 Học Siêu Tốc mở khóa.',
      unlock_skill: 'rapid_learner', unlock_label: 'Học Siêu Tốc',
    },
    teacher_knowledge_hub: {
      hint_50:  'Ba cuốn sách, ba thứ khác nhau. Nhưng trong đầu chúng bắt đầu kết nối.',
      hint_80:  'Năm cuốn. Anh xếp chúng lại — không theo chủ đề mà theo thứ tự quan trọng.',
      hint_100: 'Không phải người thu thập sách. Anh là người hiểu chúng. 🏅 Đầu Óc Chiến Thuật mở khóa.',
      unlock_skill: 'tactical_mind', unlock_label: 'Đầu Óc Chiến Thuật',
    },
    teacher_mentor: {
      hint_50:  'Cô gái trẻ hỏi anh tại sao không bỏ chạy. Anh giải thích. Cô ta gật đầu.',
      hint_80:  'Ba người. Anh nhìn họ làm lại thứ anh đã dạy. Không hoàn hảo — nhưng đúng.',
      hint_100: 'Họ sẽ không nhớ tên anh. Nhưng họ sẽ nhớ cách sống sót. 🏅 Di Sản Tri Thức mở khóa.',
      unlock_skill: 'legacy_knowledge', unlock_label: 'Di Sản Tri Thức',
    },
  };
  for (const [k, v] of Object.entries(hints)) {
    if (MILESTONE_DEFS[k]) MILESTONE_DEFS[k].hints = v;
  }
})();

// ══════════════════════════════════════════════════════
// SYNERGIES
// ══════════════════════════════════════════════════════
(function() {
  if (typeof SKILL_SYNERGIES === 'undefined') return;
  SKILL_SYNERGIES.push(
    {
      id: 'tri_tue_chien_truong',
      name: 'Trí Tuệ Chiến Trường',
      desc: 'Sổ Tay + Cảnh Báo: tile đã ghi chép luôn hiển thị cảnh báo nguy hiểm (zombie sắp vào, horde gần).',
      jobFilter: 'teacher',
      requires: [
        { skill: 'ghi_chep_thuc_dia', level: 5 },
        { skill: 'doc_dau_hieu',      level: 3 },
      ],
      effect: { noted_tile_danger_alert: true },
    },
    {
      id: 'lop_hoc_sinh_ton',
      name: 'Lớp Học Sinh Tồn',
      desc: 'Sổ Tay + Truyền Đạt: khi dạy NPC, tự động truyền luôn điểm yếu zombie Teacher đã học.',
      jobFilter: 'teacher',
      requires: [
        { skill: 'nhan_ra_quy_luat', level: 5 },
        { skill: 'day_co_ban',       level: 3 },
      ],
      effect: { teach_transfers_weakness: true },
    }
  );
})();

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — MOVEMENT
// noted_tile_ap_reduce, note_route_efficiency, hidden_container_sense
// ══════════════════════════════════════════════════════
(function() {
  if (typeof DW_move !== 'function') return;
  const _origMove = DW_move;

  DW_move = function(state, dx, dy) {
    const result = _origMove(state, dx, dy);
    if (!result.ok || state.job !== 'teacher') return result;

    let s       = result.state;
    const tileKey  = `${s.x},${s.y}`;
    const prevKey  = `${state.x},${state.y}`;
    const notes    = s.fieldNotes || {};
    const msgs     = [];

    // field_notes_mastery: tự động ghi chép mọi tile đã đến
    if (DW_getSkillEffect(state, 'ghi_chep_thuc_dia', 'field_notes_mastery') && !notes[tileKey]) {
      s = { ...s, fieldNotes: { ...notes, [tileKey]: true } };
    }

    // noted_tile_ap_reduce: vào tile đã ghi chép → hoàn AP
    const apReduce = DW_getSkillEffect(state, 'ghi_chep_thuc_dia', 'noted_tile_ap_reduce') || 0;
    if (apReduce > 0 && notes[tileKey]) {
      const maxAp = typeof DW_apMax === 'function' ? DW_apMax(s) : (s.apMax || 40);
      s = { ...s, ap: Math.min(maxAp, s.ap + apReduce) };
    }

    // note_route_efficiency: di chuyển giữa 2 tile đã ghi chép → hoàn 1 AP thêm
    if (DW_getSkillEffect(state, 'ghi_chep_thuc_dia', 'note_route_efficiency')
        && notes[prevKey] && notes[tileKey]) {
      const maxAp = typeof DW_apMax === 'function' ? DW_apMax(s) : (s.apMax || 40);
      s = { ...s, ap: Math.min(maxAp, s.ap + 1) };
      msgs.push('📝 Lộ trình quen: hoàn 1 ĐHĐ');
    }

    // hidden_container_chance: tile mới → roll container ẩn
    const isNewTile     = !(state.exploredTiles || []).includes(tileKey);
    const hiddenChance  = DW_getSkillEffect(state, 'quan_sat_moi_truong', 'hidden_container_chance') || 0;
    if (hiddenChance > 0 && isNewTile && Math.random() < hiddenChance) {
      s = { ...s, hiddenContainerRevealed: tileKey };
      msgs.push('🔍 Quan Sát Môi Trường: phát hiện container ẩn trong tile này!');
    }

    // Grant explore XP cho tile mới
    if (isNewTile && typeof DW_grantCharacterXp === 'function') {
      s = DW_grantCharacterXp(s, 'explore_tile');
    }

    if (msgs.length > 0) s.log = [...msgs, ...(s.log || [])];
    return { ...result, state: s };
  };
})();

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — COMBAT
// exploit_weakness, first_encounter_insight, near_death_xp_mult,
// survivor_mentality, resilience_recovery
// ══════════════════════════════════════════════════════
(function() {
  if (typeof DW_fight !== 'function') return;
  const _origFight = DW_fight;

  DW_fight = function(state, objId, opts) {
    const result = _origFight(state, objId, opts);
    if (!result.ok || state.job !== 'teacher') return result;

    let s = result.state;
    const tileKey = `${state.x},${state.y}`;
    const tileRef = state.tiles?.[tileKey];
    const objType = (tileRef?.objects || []).find(o => o.id === objId)?.type || '';

    // first_encounter_insight: lần đầu gặp loại zombie → auto-reveal điểm yếu
    if (DW_getSkillEffect(state, 'nhan_ra_quy_luat', 'first_encounter_insight')) {
      const known = s.knownWeaknesses || {};
      if (objType && !known[objType]) {
        const opts_w  = ['bleed', 'noise_sensitive', 'fear'];
        const picked  = opts_w[Math.floor(Math.random() * opts_w.length)];
        s = { ...s, knownWeaknesses: { ...known, [objType]: picked } };
        s.log = [`🧬 Nhận Ra Quy Luật: loại zombie này yếu trước ${picked}!`, ...(s.log || [])];
      }
    }

    // failure_insight: bị trúng đòn nặng → học điểm yếu dù không có insight
    // Điều kiện: player trượt (!result.hit) VÀ thực sự nhận damage (hp giảm)
    if (!result.hit && result.state.hp < state.hp
        && DW_getSkillEffect(state, 'bai_hoc_xuong_mau', 'failure_insight')) {
      const known = s.knownWeaknesses || {};
      if (objType && !known[objType]) {
        const opts_w  = ['bleed', 'noise_sensitive', 'fear'];
        const picked  = opts_w[Math.floor(Math.random() * opts_w.length)];
        s = { ...s, knownWeaknesses: { ...known, [objType]: picked } };
        s.log = [`📖 Bài Học Xương Máu: đòn đau dạy điểm yếu của ${objType}!`, ...(s.log || [])];
      }
    }

    // exploit_damage_bonus: khai thác điểm yếu đã biết → bonus damage vào boss còn sống
    // Với zombie thường (chết 1 đòn): không cần thêm; chỉ meaningful với boss có HP tracking.
    const exploitBonus = DW_getSkillEffect(state, 'nhan_ra_quy_luat', 'exploit_damage_bonus') || 0;
    if (result.hit && exploitBonus > 0 && objType && state.knownWeaknesses?.[objType]) {
      const tileKeyB   = `${state.x},${state.y}`;
      const bossTarget = s.activeBosses?.[tileKeyB];
      if (bossTarget && bossTarget.hp > 0) {
        const weapDef2  = state.equip?.weapon
          ? (typeof EQUIP_DEFS !== 'undefined' ? EQUIP_DEFS[state.equip.weapon] : null)
          : null;
        const refDmg   = weapDef2?.baseDmg || 2;
        const bonusDmg = Math.max(1, Math.ceil(refDmg * exploitBonus));
        const newHpB   = Math.max(0, bossTarget.hp - bonusDmg);
        s = { ...s, activeBosses: { ...s.activeBosses, [tileKeyB]: { ...bossTarget, hp: newHpB } } };
        s.log = [
          `🧬 Khai thác điểm yếu (${state.knownWeaknesses[objType]}): +${bonusDmg} sát thương bonus lên boss!`,
          ...(s.log || [])
        ];
      }
    }

    // near_death_xp_mult: khi HP < 30% → grant bonus XP trực tiếp ngay trong combat
    // BUG FIX: trước đây set flag teacherNearDeathMult nhưng không engine nào đọc nó.
    const mult = DW_getSkillEffect(state, 'bai_hoc_xuong_mau', 'near_death_xp_mult') || 1;
    if (mult > 1 && s.hp < (s.maxHp || 20) * 0.30 && typeof DW_grantCharacterXp === 'function') {
      const bonusXp = Math.ceil(3 * (mult - 1)); // base combat XP = ~3; bonus = 3 × (mult - 1)
      s = DW_grantCharacterXp(s, 'combat', bonusXp);
      s.log = [`🎓 Tinh Thần Sống Sót: HP nguy hiểm — +${bonusXp} XP bonus`, ...(s.log || [])];
    }

    // resilience_recovery: KHÔNG ở đây — DW_fight không heal, điều kiện không bao giờ true.
    // Đã move sang DW_useItem patch bên dưới.

    // survivor_mentality: HP thấp → combat không tăng stress
    if (DW_getSkillEffect(state, 'bai_hoc_xuong_mau', 'survivor_mentality')
        && s.hp < (s.maxHp || 20) * 0.30
        && s.stress > state.stress) {
      s = { ...s, stress: state.stress };
    }

    return { ...result, state: s };
  };
})();

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — SLEEP
// stress_xp_convert, reset daily trackers
// ══════════════════════════════════════════════════════
(function() {
  if (typeof DW_sleep !== 'function') return;
  const _origSleep = DW_sleep;

  DW_sleep = function(state) {
    const result = _origSleep(state);
    if (!result.ok || state.job !== 'teacher') return result;

    let s = result.state;

    // stress → XP conversion: mỗi 10 stress tích lũy → +5 XP
    if (DW_getSkillEffect(state, 'bai_hoc_xuong_mau', 'stress_xp_convert')) {
      const stress   = state.stress || 0;
      const xpBonus  = Math.floor(stress / 10) * 5;
      if (xpBonus > 0 && typeof DW_grantCharacterXp === 'function') {
        s = DW_grantCharacterXp(s, 'day_survived', xpBonus);
        s.log = [`📚 Bài Học Xương Máu: ${stress} stress → +${xpBonus} XP`, ...(s.log || [])];
      }
    }

    // Reset daily trackers
    s = {
      ...s,
      conspiracyMapUsedToday:  false,
      inevitableReadUsedToday: false,
      distractionUsedToday:    false,
    };

    return { ...result, state: s };
  };
})();

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — SEARCH OBJECT
// noted_tile_scavenge_bonus, book_loot_bonus + milestone tracking
// ══════════════════════════════════════════════════════
(function() {
  if (typeof DW_searchObject !== 'function') return;
  const _origSearch = DW_searchObject;

  DW_searchObject = function(state, objId) {
    const result = _origSearch(state, objId);
    if (!result.ok || state.job !== 'teacher') return result;

    let s = result.state;
    const tileKey = `${state.x},${state.y}`;

    // noted_tile_scavenge_bonus
    const scavBonus = DW_getSkillEffect(state, 'ghi_chep_thuc_dia', 'noted_tile_scavenge_bonus') || 0;
    if (scavBonus > 0 && (state.fieldNotes || {})[tileKey] && Math.random() < scavBonus) {
      const pool  = ['wild_fruit', 'mushroom', 'rag', 'tape'];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      if ((s.inventory || []).length < 20 && ITEM_DB?.[picked]) {
        s = { ...s, inventory: [...(s.inventory || []), picked] };
        s.log = [
          `📝 Ghi Chép Thực Địa: tìm thêm ${DW_itemName ? DW_itemName(picked) : picked}!`,
          ...(s.log || [])
        ];
      }
    }

    // book_loot_bonus: cơ hội tìm thêm sách
    const bookBonus = DW_getSkillEffect(state, 'doc_sach_cu', 'book_loot_bonus') || 0;
    if (bookBonus > 0 && Math.random() < bookBonus) {
      const books = ['survival_book', 'medical_book', 'engineering_book']
        .filter(b => ITEM_DB?.[b]);
      if (books.length > 0 && (s.inventory || []).length < 20) {
        const picked = books[Math.floor(Math.random() * books.length)];
        s = { ...s,
          inventory: [...(s.inventory || []), picked],
          milestoneCounters: {
            ...(s.milestoneCounters || {}),
            books_collected: ((s.milestoneCounters?.books_collected || 0) + 1),
          },
        };
        if (typeof DW_checkMilestone === 'function')
          s = DW_checkMilestone(s, 'teacher_knowledge_hub');
        s.log = [
          `📚 Đọc Sách Cũ: tìm thấy ${DW_itemName ? DW_itemName(picked) : picked}!`,
          ...(s.log || [])
        ];
      }
    }

    return { ...result, state: s };
  };
})();

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — USE ITEM
// resilience_recovery: HP cross back above 30% threshold after healing → stress -10
// BUG FIX: điều kiện này không thể đúng trong DW_fight (fight không heal HP).
//          Đặt đúng chỗ: DW_useItem — khi dùng item hồi máu và vượt ngưỡng 30%.
// ══════════════════════════════════════════════════════
(function() {
  if (typeof DW_useItem !== 'function') return;
  const _origUseItem = DW_useItem;

  DW_useItem = function(state, itemId) {
    const result = _origUseItem(state, itemId);
    if (!result.ok || state.job !== 'teacher') return result;

    let s = result.state;

    // resilience_recovery: HP < 30% trước khi dùng item → HP ≥ 30% sau → stress -10
    if (DW_getSkillEffect(state, 'bai_hoc_xuong_mau', 'resilience_recovery')
        && state.hp < (state.maxHp || 20) * 0.30
        && s.hp   >= (s.maxHp    || 20) * 0.30) {
      s = { ...s, stress: Math.max(0, (s.stress || 0) - 10) };
      s.log = [`💪 Phục Hồi: vượt ngưỡng nguy hiểm — Stress -10`, ...(s.log || [])];
    }

    return { ...result, state: s };
  };
})();

// ══════════════════════════════════════════════════════
// SELF-REGISTRATION
// ══════════════════════════════════════════════════════
(function() {
  if (typeof DW_ROLE_TREES === 'undefined') {
    console.error('[Deadworld] DW_ROLE_TREES chưa khai báo — kiểm tra load order.');
    return;
  }
  DW_ROLE_TREES['teacher'] = TEACHER_SKILL_TREE;

  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(TEACHER_SKILL_TREE)) {
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

console.log('[Deadworld] teacher-skill-tree v1.0 loaded.');
