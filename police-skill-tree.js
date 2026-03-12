// ══════════════════════════════════════════════════════
// DEAD WORLD — police-skill-tree.js  v3.0
// Role: Cảnh Sát (police)
// Fantasy: "Giữ trật tự giữa hỗn loạn — bằng súng hoặc bằng uy quyền"
//
// TRIẾT LÝ THIẾT KẾ (Art of Game Design lenses):
//   Lens #2  (Essential Experience): "Người bảo vệ trật tự" — vừa có
//     sức mạnh tiêu diệt (súng) vừa có trách nhiệm với cộng đồng.
//   Lens #11 (Unification): Mọi skill hướng về "kiểm soát chiến trường" —
//     kiểm soát tiếng ồn, kiểm soát kẻ địch, kiểm soát không gian.
//   Lens #39 (Meaningful Choices): Ba nhánh không trùng lặp, mỗi nhánh
//     tạo lối chơi khác biệt thật sự. Không có "nhánh mạnh nhất".
//   Project Zomboid lesson: súng mạnh nhưng tiếng ồn là cái giá phải trả.
//
// THIẾT KẾ LẠI TỪ v2 (fix các lỗi sau review):
//   1. Xóa toàn bộ engine patches (monkey-patching) — dùng hook pattern
//   2. Nhánh Súng Ống: không duplicate firearm base skill, thay vào đó
//      tập trung vào NOISE MANAGEMENT + TACTICAL POSITIONING
//      (cái mà firearm base skill không có)
//   3. Nhánh Thẩm Vấn: thu hẹn về những gì engine đang hỗ trợ thực sự
//      (stress, banditRep, milestones) — không có effect orphan
//   4. Nhánh Người Bảo Vệ: bỏ stationary (xung đột với combat fantasy),
//      thay bằng COVER SYSTEM gắn với barricade đã có sẵn
//   5. bat_khuat_bat_diet: redesign khác nurse để có bản sắc riêng
//
// BALANCE TARGET:
//   Combat      : Mạnh   (AP giảm firearm, headshot, noise management)
//   Survival    : Yếu    (không tự cung cấp thức ăn/nước)
//   Exploration : TB     (có thể do thám nhưng không bằng driver)
//   Utility     : TB     (thẩm vấn giảm stress/banditRep, bảo vệ đồng đội)
//
// ĐIỂM YẾU CỐ Ý:
//   - Súng gây noise, noise kéo zombie — mâu thuẫn nội tại thật sự
//   - Thẩm vấn/đàm phán chỉ có giá trị khi gặp NPC/bandit
//   - Cover bonus yêu cầu barricade — phải chuẩn bị trước
//
// Load order: sau deadworld-data-addon.js, trước engine-skills.js
// ══════════════════════════════════════════════════════

var POLICE_SKILL_TREE = {

  // ══════════════════════════════════════════════════════
  // NHÁNH 1: KIỂM SOÁT TIẾNG SÚNG 🔫
  // Fantasy: "Bắn giỏi không phải bắn nhiều — bắn đúng lúc, đúng chỗ"
  // Core loop: bắn → tiêu diệt nhanh → giảm noise hậu quả → ít bị kéo thêm zombie
  // Điểm mạnh: khuếch đại tác dụng súng, triệt tiêu nhược điểm noise
  // Điểm yếu: vẫn phụ thuộc đạn, skill vô dụng khi hết đạn
  //
  // THIẾT KẾ: KHÔNG copy firearm base skill (accuracy, headshot đã có sẵn).
  // Tập trung vào:
  //   - Noise suppression (cái firearm skill không làm)
  //   - Ammo conservation (tiết kiệm đạn — phù hợp điểm yếu của role)
  //   - Tactical shot (chỉ khi đứng ở tile có barricade = "cover")
  // ══════════════════════════════════════════════════════

  kiem_soat_am_thanh: {
    id: 'kiem_soat_am_thanh', name: 'Kiểm Soát Âm Thanh',
    branch: 'kiem_soat_tieng_sung', branchLabel: '🔫 Kiểm Soát Tiếng Súng',
    jobFilter: 'police', icon: '🔇', prereq: [], maxLevel: 10,
    desc: 'Bắn súng có chủ đích hơn — giảm noise phát sinh sau mỗi phát bắn.',
    effects: {
      1:  { gun_noise_reduce: 1,  label: 'Tiếng súng -1 noise mỗi phát' },
      2:  { gun_noise_reduce: 1  },
      3:  { gun_noise_reduce: 2,  suppress_reload: true,
            label: '⚡ Nạp đạn êm: reload không gây noise' },
      4:  { gun_noise_reduce: 2  },
      5:  { gun_noise_reduce: 3,  noise_dissipate: true,
            label: '⚡ Tiêu tán âm: noise giảm thêm 1 mỗi lượt sau bắn (trong 3 lượt)' },
      6:  { gun_noise_reduce: 3  },
      7:  { gun_noise_reduce: 4,  cover_shot: true,
            label: '⚡ Cover Shot: bắn từ sau barricade không tạo noise nếu giết một phát' },
      8:  { gun_noise_reduce: 4  },
      9:  { gun_noise_reduce: 5  },
      10: { gun_noise_reduce: 6,  silent_kill: true,
            label: '🏆 MASTERY: Tiêu Diệt Im Lặng — giết zombie bằng súng: noise giảm về 0 thay vì tăng lên' },
    },
  },

  tiet_kiem_dan: {
    id: 'tiet_kiem_dan', name: 'Tiết Kiệm Đạn',
    branch: 'kiem_soat_tieng_sung', branchLabel: '🔫 Kiểm Soát Tiếng Súng',
    jobFilter: 'police', icon: '🎯',
    prereq: [{ skill: 'kiem_soat_am_thanh', level: 3 }], maxLevel: 10,
    desc: 'Bắn chính xác hơn — có cơ hội không tốn đạn khi trúng.',
    effects: {
      1:  { ammo_save_chance: 0.08, label: '8% không tốn đạn khi bắn trúng' },
      2:  { ammo_save_chance: 0.10 },
      3:  { ammo_save_chance: 0.13, one_tap: true,
            label: '⚡ One Tap: 15% cơ hội tiêu diệt zombie một phát (không kể HP còn lại)' },
      4:  { ammo_save_chance: 0.15, one_tap: true, one_tap_chance: 0.15 },
      5:  { ammo_save_chance: 0.18, one_tap: true, one_tap_chance: 0.18,
            label: '⚡ One Tap: tăng lên 18%' },
      6:  { ammo_save_chance: 0.20, one_tap: true, one_tap_chance: 0.20 },
      7:  { ammo_save_chance: 0.23, one_tap: true, one_tap_chance: 0.23,
            reclaim_ammo: true,
            label: '⚡ Thu hồi đạn: 20% cơ hội nhặt lại 1 đạn sau khi giết' },
      8:  { ammo_save_chance: 0.25, one_tap: true, one_tap_chance: 0.25, reclaim_ammo: 0.20 },
      9:  { ammo_save_chance: 0.28, one_tap: true, one_tap_chance: 0.28, reclaim_ammo: 0.25 },
      10: { ammo_save_chance: 0.30, one_tap: true, one_tap_chance: 0.30, reclaim_ammo: 0.30,
            last_mag: true,
            label: '🏆 MASTERY: Viên Đạn Cuối — khi hết đạn (ammo = 0), bắn 1 phát chí mạng miễn phí (1 lần/ngày)' },
    },
  },

  ban_tu_yem_the: {
    id: 'ban_tu_yem_the', name: 'Bắn Từ Yểm Thể',
    branch: 'kiem_soat_tieng_sung', branchLabel: '🔫 Kiểm Soát Tiếng Súng',
    jobFilter: 'police', icon: '🧱',
    prereq: [{ skill: 'tiet_kiem_dan', level: 3 }], maxLevel: 10,
    desc: 'Khi đứng sau barricade, cảnh sát chiến đấu như trên thao trường.',
    effects: {
      1:  { cover_damage_bonus: 0.10, label: 'Đứng sau barricade: +10% sát thương súng' },
      2:  { cover_damage_bonus: 0.15 },
      3:  { cover_damage_bonus: 0.20, cover_ap_reduce: 1,
            label: '⚡ Barricade: bắn -1 AP' },
      4:  { cover_damage_bonus: 0.25, cover_ap_reduce: 1 },
      5:  { cover_damage_bonus: 0.30, cover_ap_reduce: 1, cover_damage_reduce: 0.20,
            label: '⚡ Barricade: nhận -20% sát thương vào (kể cả khi trượt)' },
      6:  { cover_damage_bonus: 0.33, cover_ap_reduce: 1, cover_damage_reduce: 0.25 },
      7:  { cover_damage_bonus: 0.36, cover_ap_reduce: 2, cover_damage_reduce: 0.30,
            cover_fortify: true,
            label: '⚡ Củng cố yểm thể: barricade của tile giảm 50% tốc độ xuống cấp hôm nay' },
      8:  { cover_damage_bonus: 0.40, cover_ap_reduce: 2, cover_damage_reduce: 0.33, cover_fortify: true },
      9:  { cover_damage_bonus: 0.45, cover_ap_reduce: 2, cover_damage_reduce: 0.37, cover_fortify: true },
      10: { cover_damage_bonus: 0.50, cover_ap_reduce: 2, cover_damage_reduce: 0.40, cover_fortify: true,
            execution_zone: true,
            label: '🏆 MASTERY: Vùng Xử Lý — khi bắn từ barricade lv3+, 30% cơ hội zombie chết ngay lập tức' },
    },
  },

  phan_xa_chien_dau: {
    id: 'phan_xa_chien_dau', name: 'Phản Xạ Chiến Đấu',
    branch: 'kiem_soat_tieng_sung', branchLabel: '🔫 Kiểm Soát Tiếng Súng',
    jobFilter: 'police', icon: '⚡',
    prereq: [{ skill: 'ban_tu_yem_the', level: 3 }], maxLevel: 10,
    desc: 'Phản xạ chiến đấu được rèn giũa qua huấn luyện — né đòn và phản công nhanh hơn.',
    effects: {
      1:  { dodge_chance: 0.05, label: '+5% né tránh' },
      2:  { dodge_chance: 0.08 },
      3:  { dodge_chance: 0.12, surprise_dodge: 0.20,
            label: '⚡ Khi bị surprise attack: +20% né tránh thêm' },
      4:  { dodge_chance: 0.15, surprise_dodge: 0.25 },
      5:  { dodge_chance: 0.18, surprise_dodge: 0.30, counter_shot: true,
            label: '⚡ Phản đòn: khi né thành công, tự động bắn 1 phát (tốn 1 đạn, miễn AP)' },
      6:  { dodge_chance: 0.20, surprise_dodge: 0.35, counter_shot: true },
      7:  { dodge_chance: 0.22, surprise_dodge: 0.40, counter_shot: true,
            no_surprise: true,
            label: '⚡ Không bao giờ bị surprise attack' },
      8:  { dodge_chance: 0.24, surprise_dodge: 0.45, counter_shot: true, no_surprise: true },
      9:  { dodge_chance: 0.26, surprise_dodge: 0.50, counter_shot: true, no_surprise: true },
      10: { dodge_chance: 0.30, surprise_dodge: 0.60, counter_shot: true, no_surprise: true,
            last_stand_shot: true,
            label: '🏆 MASTERY: Đứng Vững — khi HP về 0, bắn 1 phát cuối cùng trước khi ngã (nếu còn đạn); phát này luôn trúng' },
    },
  },

  xa_thu_canh_sat: {
    id: 'xa_thu_canh_sat', name: 'Xạ Thủ Cảnh Sát',
    branch: 'kiem_soat_tieng_sung', branchLabel: '🔫 Kiểm Soát Tiếng Súng',
    jobFilter: 'police', icon: '🏅',
    prereq: [{ skill: 'phan_xa_chien_dau', level: 5 }], maxLevel: 10,
    desc: 'Skill cuối nhánh Súng Ống. Tổng hợp mọi kỹ năng — cảnh sát đạt đỉnh cao kỹ thuật bắn súng.',
    effects: {
      1:  { elite_shooter: true, firearm_ap_reduction: 1,
            label: 'Tất cả súng: -1 AP (tổng hợp từ huấn luyện)' },
      2:  { elite_shooter: true, firearm_ap_reduction: 1 },
      3:  { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true,
            label: '⚡ Kiểm soát vùng: zombie trong tile bị -2 hit bonus khi tấn công bạn' },
      4:  { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true },
      5:  { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true,
            firearm_damage_bonus: 0.15,
            label: '⚡ +15% sát thương súng (tổng hợp từ kinh nghiệm)' },
      6:  { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true, firearm_damage_bonus: 0.18 },
      7:  { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true, firearm_damage_bonus: 0.21,
            rapid_clear: true,
            label: '⚡ Rapid Clear: khi giết zombie bằng súng, 30% cơ hội hồi 1 AP' },
      8:  { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true, firearm_damage_bonus: 0.24, rapid_clear: true },
      9:  { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true, firearm_damage_bonus: 0.27, rapid_clear: true },
      10: { elite_shooter: true, firearm_ap_reduction: 1, zone_control: true, firearm_damage_bonus: 0.30, rapid_clear: true,
            legendary_cop: true,
            label: '🏆 MASTERY: Cảnh Sát Huyền Thoại — khi hạ boss bằng súng: +30 AP và -20 stress ngay lập tức' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 2: UY QUYỀN 🗣️
  // Fantasy: "Lời cảnh sát là luật — ngay cả trong tận thế"
  // Core loop: gặp bandit/NPC → dùng uy quyền → giảm stress + nhận lợi ích
  // Điểm mạnh: giảm stress cho cả đội, tránh chiến đấu, cải thiện banditRep
  // Điểm yếu: vô dụng khi không có NPC, không giúp ích chống zombie
  //
  // THIẾT KẾ: tập trung vào stress/depression mechanics đã có trong engine,
  //   banditRep tracking đã có trong DW_fightBandit,
  //   milestone triggers có thể implement thật.
  // ══════════════════════════════════════════════════════

  ap_dao_uy_quyen: {
    id: 'ap_dao_uy_quyen', name: 'Áp Đảo Uy Quyền',
    branch: 'uy_quyen', branchLabel: '🗣️ Uy Quyền',
    jobFilter: 'police', icon: '😨', prereq: [], maxLevel: 10,
    desc: 'Khi đối đầu với bandit, uy quyền cảnh sát giảm thiệt hại tinh thần cho cả nhóm.',
    effects: {
      1:  { confront_stress_reduce: 3,  label: 'Đối đầu bandit: giảm 3 stress nhận vào' },
      2:  { confront_stress_reduce: 4  },
      3:  { confront_stress_reduce: 5,  authority_damage_reduce: 0.10,
            label: '⚡ Uy quyền tạo sợ hãi: bandit giảm 10% sát thương' },
      4:  { confront_stress_reduce: 6,  authority_damage_reduce: 0.12 },
      5:  { confront_stress_reduce: 8,  authority_damage_reduce: 0.15,
            intimidate_flee: 0.15,
            label: '⚡ 15% cơ hội bandit non-cannibal bỏ chạy khi gặp mặt' },
      6:  { confront_stress_reduce: 9,  authority_damage_reduce: 0.17, intimidate_flee: 0.18 },
      7:  { confront_stress_reduce: 10, authority_damage_reduce: 0.20, intimidate_flee: 0.22,
            authority_area_stress: true,
            label: '⚡ Uy quyền lan: hạ gục bandit giảm 5 stress ngay lập tức' },
      8:  { confront_stress_reduce: 11, authority_damage_reduce: 0.22, intimidate_flee: 0.25, authority_area_stress: true },
      9:  { confront_stress_reduce: 12, authority_damage_reduce: 0.25, intimidate_flee: 0.28, authority_area_stress: true },
      10: { confront_stress_reduce: 15, authority_damage_reduce: 0.30, intimidate_flee: 0.35, authority_area_stress: true,
            order_restored: true,
            label: '🏆 MASTERY: Trật Tự Lập Lại — mỗi lần hạ gục bandit, cộng thêm 10 AP và hồi 2 HP' },
    },
  },

  doc_nguoi: {
    id: 'doc_nguoi', name: 'Đọc Người',
    branch: 'uy_quyen', branchLabel: '🗣️ Uy Quyền',
    jobFilter: 'police', icon: '👁️',
    prereq: [{ skill: 'ap_dao_uy_quyen', level: 3 }], maxLevel: 10,
    desc: 'Kinh nghiệm phá án giúp đọc được tính cách và ý đồ của kẻ đối diện.',
    effects: {
      1:  { read_personality: true, bandit_dc_bonus: 1,
            label: 'Biết personality của bandit trước khi chiến đấu; +1 hit bonus vs bandit' },
      2:  { read_personality: true, bandit_dc_bonus: 1 },
      3:  { read_personality: true, bandit_dc_bonus: 2, ambush_immune: true,
            label: '⚡ Không bao giờ bị ambush bonus từ bandit ambusher' },
      4:  { read_personality: true, bandit_dc_bonus: 2, ambush_immune: true },
      5:  { read_personality: true, bandit_dc_bonus: 2, ambush_immune: true,
            advantage_vs_bandit: true,
            label: '⚡ Luôn có advantage khi chiến đấu với bandit (như opts.advantage = true)' },
      6:  { read_personality: true, bandit_dc_bonus: 3, ambush_immune: true, advantage_vs_bandit: true },
      7:  { read_personality: true, bandit_dc_bonus: 3, ambush_immune: true, advantage_vs_bandit: true,
            scavenger_trap: true,
            label: '⚡ Nhận ra scavenger trước khi hắn ăn cắp — 100% miễn nhiễm steal' },
      8:  { read_personality: true, bandit_dc_bonus: 3, ambush_immune: true, advantage_vs_bandit: true, scavenger_trap: true },
      9:  { read_personality: true, bandit_dc_bonus: 4, ambush_immune: true, advantage_vs_bandit: true, scavenger_trap: true },
      10: { read_personality: true, bandit_dc_bonus: 4, ambush_immune: true, advantage_vs_bandit: true, scavenger_trap: true,
            perfect_read: true,
            label: '🏆 MASTERY: Đọc Hoàn Hảo — trước khi chiến đấu, biết chính xác HP và loot của bandit' },
    },
  },

  dam_phan_song_con: {
    id: 'dam_phan_song_con', name: 'Đàm Phán Sinh Tồn',
    branch: 'uy_quyen', branchLabel: '🗣️ Uy Quyền',
    jobFilter: 'police', icon: '🤝',
    prereq: [{ skill: 'doc_nguoi', level: 3 }], maxLevel: 10,
    desc: 'Tránh đổ máu không cần thiết — đàm phán với bandit để cả hai cùng sống.',
    effects: {
      1:  { negotiate_unlock: true, negotiate_stress_cost: 5,
            label: '⚡ Mở khóa hành động Đàm Phán: có thể thương lượng với bandit (tốn 5 stress)' },
      2:  { negotiate_unlock: true, negotiate_stress_cost: 4 },
      3:  { negotiate_unlock: true, negotiate_stress_cost: 3, negotiate_loot_keep: 0.30,
            label: '⚡ Đàm phán thành công: giữ lại 30% loot thay vì mất hết' },
      4:  { negotiate_unlock: true, negotiate_stress_cost: 2, negotiate_loot_keep: 0.40 },
      5:  { negotiate_unlock: true, negotiate_stress_cost: 1, negotiate_loot_keep: 0.50,
            negotiate_rep: 1,
            label: '⚡ Đàm phán thành công: +1 banditRep (trả giá công bằng)' },
      6:  { negotiate_unlock: true, negotiate_stress_cost: 0, negotiate_loot_keep: 0.60, negotiate_rep: 1 },
      7:  { negotiate_unlock: true, negotiate_stress_cost: 0, negotiate_loot_keep: 0.70, negotiate_rep: 2,
            negotiate_info: true,
            label: '⚡ Đàm phán cấp cao: nhận được thông tin về khu vực từ bandit' },
      8:  { negotiate_unlock: true, negotiate_stress_cost: 0, negotiate_loot_keep: 0.75, negotiate_rep: 2, negotiate_info: true },
      9:  { negotiate_unlock: true, negotiate_stress_cost: 0, negotiate_loot_keep: 0.80, negotiate_rep: 2, negotiate_info: true },
      10: { negotiate_unlock: true, negotiate_stress_cost: 0, negotiate_loot_keep: 1.00, negotiate_rep: 3, negotiate_info: true,
            master_diplomat: true,
            label: '🏆 MASTERY: Nhà Ngoại Giao — đàm phán thành công: bandit rời đi, giữ nguyên loot, +3 banditRep, nhận thông tin khu vực' },
    },
  },

  nen_tang_tinh_than: {
    id: 'nen_tang_tinh_than', name: 'Nền Tảng Tinh Thần',
    branch: 'uy_quyen', branchLabel: '🗣️ Uy Quyền',
    jobFilter: 'police', icon: '🧠',
    prereq: [{ skill: 'dam_phan_song_con', level: 3 }], maxLevel: 10,
    desc: 'Huấn luyện tâm lý cảnh sát — không để tình huống nguy hiểm làm mất kiểm soát.',
    effects: {
      1:  { stress_decay_combat: 2, label: 'Sau chiến đấu thắng: tự hồi 2 stress' },
      2:  { stress_decay_combat: 3 },
      3:  { stress_decay_combat: 4, panic_resistance: 10,
            label: '⚡ Ngưỡng hoảng loạn tăng +10 (mặc định 70 → 80)' },
      4:  { stress_decay_combat: 5, panic_resistance: 15 },
      5:  { stress_decay_combat: 6, panic_resistance: 20, depression_resist: 0.20,
            label: '⚡ Giảm 20% nguy cơ bị trầm cảm' },
      6:  { stress_decay_combat: 7, panic_resistance: 20, depression_resist: 0.25 },
      7:  { stress_decay_combat: 8, panic_resistance: 25, depression_resist: 0.30,
            calm_under_fire: true,
            label: '⚡ Bình tĩnh dưới lửa: trong combat, stress không tăng' },
      8:  { stress_decay_combat: 9, panic_resistance: 25, depression_resist: 0.33, calm_under_fire: true },
      9:  { stress_decay_combat: 10, panic_resistance: 30, depression_resist: 0.36, calm_under_fire: true },
      10: { stress_decay_combat: 12, panic_resistance: 30, depression_resist: 0.40, calm_under_fire: true,
            iron_will: true,
            label: '🏆 MASTERY: Ý Chí Thép — không bao giờ bị trạng thái fear hay panic' },
    },
  },

  danh_tieng_canh_sat: {
    id: 'danh_tieng_canh_sat', name: 'Danh Tiếng Cảnh Sát',
    branch: 'uy_quyen', branchLabel: '🗣️ Uy Quyền',
    jobFilter: 'police', icon: '⭐',
    prereq: [{ skill: 'nen_tang_tinh_than', level: 5 }], maxLevel: 10,
    desc: 'Skill cuối nhánh Uy Quyền. Danh tiếng lan rộng — cả bạn lẫn thù đều biết tên bạn.',
    effects: {
      1:  { reputation_fear: 0.05, label: 'Bandit giảm thêm 5% sát thương (tổng kể từ ap_dao)' },
      2:  { reputation_fear: 0.08 },
      3:  { reputation_fear: 0.10, reputation_deserter: 0.10,
            label: '⚡ 10% bandit deserter bỏ chạy ngay khi gặp mặt (không cần đánh)' },
      4:  { reputation_fear: 0.12, reputation_deserter: 0.15 },
      5:  { reputation_fear: 0.14, reputation_deserter: 0.20, rep_stress_aura: 5,
            label: '⚡ Tinh thần lãnh đạo: mỗi ngày thức dậy hồi 5 stress' },
      6:  { reputation_fear: 0.16, reputation_deserter: 0.22, rep_stress_aura: 6 },
      7:  { reputation_fear: 0.18, reputation_deserter: 0.25, rep_stress_aura: 7,
            rep_warning: true,
            label: '⚡ Cảnh báo sớm: biết trước 1 ngày khi có base attack sắp đến' },
      8:  { reputation_fear: 0.20, reputation_deserter: 0.28, rep_stress_aura: 8, rep_warning: true },
      9:  { reputation_fear: 0.22, reputation_deserter: 0.30, rep_stress_aura: 9, rep_warning: true },
      10: { reputation_fear: 0.25, reputation_deserter: 0.35, rep_stress_aura: 10, rep_warning: true,
            legend_of_law: true,
            label: '🏆 MASTERY: Huyền Thoại Công Lý — bandit non-cannibal bỏ chạy 35%; mỗi ngày hồi 10 stress; biết trước base attack' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 3: YẾM THỦ 🛡️
  // Fantasy: "Không ai bị bỏ lại — kể cả khi phải lấy thân che đạn"
  // Core loop: barricade → đứng sau → cover protection → phản đòn
  // Điểm mạnh: phòng thủ cao nhất trong game, tốt khi kẹt góc
  // Điểm yếu: cần barricade sẵn, bất lợi khi di chuyển nhiều
  //
  // THIẾT KẾ: gắn chặt với barricade tile đã có. Không phải "đứng yên"
  //   chung chung mà là "đứng sau barricade cụ thể" — khác biệt với stationary.
  //   Mỗi skill của nhánh này đọc tile?.barricade để kích hoạt.
  // ══════════════════════════════════════════════════════

  chien_thuat_yem_the: {
    id: 'chien_thuat_yem_the', name: 'Chiến Thuật Yểm Thể',
    branch: 'yem_thu', branchLabel: '🛡️ Yểm Thủ',
    jobFilter: 'police', icon: '🏗️', prereq: [], maxLevel: 10,
    desc: 'Khai thác barricade tốt hơn — tăng tác dụng phòng thủ khi đứng sau.',
    effects: {
      1:  { barricade_defense_bonus: 0.10, label: 'Barricade cho thêm +10% giảm sát thương' },
      2:  { barricade_defense_bonus: 0.15 },
      3:  { barricade_defense_bonus: 0.20, barricade_hp_regen: 1,
            label: '⚡ Đứng sau barricade: hồi 1 HP mỗi lần chiến đấu thắng' },
      4:  { barricade_defense_bonus: 0.25, barricade_hp_regen: 1 },
      5:  { barricade_defense_bonus: 0.30, barricade_hp_regen: 1, barricade_durability: true,
            label: '⚡ Barricade của tile giảm tốc độ xuống cấp khi bạn đứng bảo vệ' },
      6:  { barricade_defense_bonus: 0.33, barricade_hp_regen: 2, barricade_durability: true },
      7:  { barricade_defense_bonus: 0.36, barricade_hp_regen: 2, barricade_durability: true,
            barricade_counter: true,
            label: '⚡ Phản đòn từ barricade: khi bị miss tại tile có barricade, 25% phản đòn súng miễn AP' },
      8:  { barricade_defense_bonus: 0.40, barricade_hp_regen: 2, barricade_durability: true, barricade_counter: true },
      9:  { barricade_defense_bonus: 0.45, barricade_hp_regen: 3, barricade_durability: true, barricade_counter: true },
      10: { barricade_defense_bonus: 0.50, barricade_hp_regen: 3, barricade_durability: true, barricade_counter: true,
            fortress_stance: true,
            label: '🏆 MASTERY: Thành Lũy Sống — barricade không thể bị phá hủy hoàn toàn; minimum lv1 khi bạn còn đứng bảo vệ' },
    },
  },

  canh_giac_cao_do: {
    id: 'canh_giac_cao_do', name: 'Cảnh Giác Cao Độ',
    branch: 'yem_thu', branchLabel: '🛡️ Yểm Thủ',
    jobFilter: 'police', icon: '👀',
    prereq: [{ skill: 'chien_thuat_yem_the', level: 3 }], maxLevel: 10,
    desc: 'Phát hiện nguy hiểm từ xa — giảm surprise attack và phát hiện bẫy.',
    effects: {
      1:  { detect_threat: true, surprise_reduce: 0.10, label: 'Phát hiện tile nguy hiểm sắp di chuyển vào; -10% surprise' },
      2:  { detect_threat: true, surprise_reduce: 0.15 },
      3:  { detect_threat: true, surprise_reduce: 0.20, detect_trap: true,
            label: '⚡ Phát hiện bẫy trước khi bước vào tile' },
      4:  { detect_threat: true, surprise_reduce: 0.25, detect_trap: true },
      5:  { detect_threat: true, surprise_reduce: 0.30, detect_trap: true,
            night_awareness: true,
            label: '⚡ Penalty ban đêm giảm còn 50% (quan sát tốt trong bóng tối)' },
      6:  { detect_threat: true, surprise_reduce: 0.35, detect_trap: true, night_awareness: true },
      7:  { detect_threat: true, surprise_reduce: 0.40, detect_trap: true, night_awareness: true,
            pre_combat_info: true,
            label: '⚡ Trước combat: biết số lượng và loại zombie trong tile' },
      8:  { detect_threat: true, surprise_reduce: 0.45, detect_trap: true, night_awareness: true, pre_combat_info: true },
      9:  { detect_threat: true, surprise_reduce: 0.50, detect_trap: true, night_awareness: true, pre_combat_info: true },
      10: { detect_threat: true, surprise_reduce: 0.60, detect_trap: true, night_awareness: true, pre_combat_info: true,
            sixth_sense: true,
            label: '🏆 MASTERY: Giác Quan Thứ Sáu — không bao giờ surprise; biết trước nội dung tile trước khi vào' },
    },
  },

  che_chan_dong_doi: {
    id: 'che_chan_dong_doi', name: 'Che Chắn Đồng Đội',
    branch: 'yem_thu', branchLabel: '🛡️ Yểm Thủ',
    jobFilter: 'police', icon: '🛡️',
    prereq: [{ skill: 'canh_giac_cao_do', level: 3 }], maxLevel: 10,
    desc: 'Lấy thân che chắn — giảm sát thương nhận vào khi đứng bảo vệ tile có barricade.',
    effects: {
      1:  { self_defense_bonus: 0.10, label: 'Khi có barricade trong tile: +10% giảm sát thương cá nhân' },
      2:  { self_defense_bonus: 0.15 },
      3:  { self_defense_bonus: 0.20, protect_incoming: 0.15,
            label: '⚡ Khi đứng sau barricade lv2+: -15% sát thương nhận vào từ mọi nguồn' },
      4:  { self_defense_bonus: 0.25, protect_incoming: 0.18 },
      5:  { self_defense_bonus: 0.28, protect_incoming: 0.20, last_stand_defense: true,
            label: '⚡ Khi HP < 30%: tự động nhận thêm +20% giảm sát thương' },
      6:  { self_defense_bonus: 0.31, protect_incoming: 0.22, last_stand_defense: true },
      7:  { self_defense_bonus: 0.34, protect_incoming: 0.25, last_stand_defense: true,
            bleed_resist: true,
            label: '⚡ Kháng trạng thái Bleed — khi đứng bảo vệ' },
      8:  { self_defense_bonus: 0.37, protect_incoming: 0.28, last_stand_defense: true, bleed_resist: true },
      9:  { self_defense_bonus: 0.40, protect_incoming: 0.30, last_stand_defense: true, bleed_resist: true },
      10: { self_defense_bonus: 0.45, protect_incoming: 0.35, last_stand_defense: true, bleed_resist: true,
            unbreakable: true,
            label: '🏆 MASTERY: Bất Bại — khi đứng bảo vệ tile có barricade lv3+, tất cả sát thương nhận vào giảm 50%' },
    },
  },

  khong_ai_bi_bo_lai: {
    id: 'khong_ai_bi_bo_lai', name: 'Không Ai Bị Bỏ Lại',
    branch: 'yem_thu', branchLabel: '🛡️ Yểm Thủ',
    jobFilter: 'police', icon: '🏃',
    prereq: [{ skill: 'che_chan_dong_doi', level: 3 }], maxLevel: 10,
    desc: 'Rút lui và thoát khỏi tình huống nguy hiểm — đưa cả đội ra an toàn.',
    effects: {
      1:  { flee_ap_reduce: 1, label: 'Thoát khỏi combat -1 AP' },
      2:  { flee_ap_reduce: 1 },
      3:  { flee_ap_reduce: 1, flee_no_damage: true,
            label: '⚡ Thoát thất bại không gây sát thương' },
      4:  { flee_ap_reduce: 1, flee_no_damage: true },
      5:  { flee_ap_reduce: 2, flee_no_damage: true, flee_noise_reduce: 2,
            label: '⚡ Thoát thành công: noise giảm 2 (bọc hậu khi rút lui)' },
      6:  { flee_ap_reduce: 2, flee_no_damage: true, flee_noise_reduce: 3 },
      7:  { flee_ap_reduce: 2, flee_no_damage: true, flee_noise_reduce: 3,
            tactical_withdraw: true,
            label: '⚡ Rút lui chiến thuật: thoát thành công và nhận lại 3 AP' },
      8:  { flee_ap_reduce: 2, flee_no_damage: true, flee_noise_reduce: 4, tactical_withdraw: true },
      9:  { flee_ap_reduce: 3, flee_no_damage: true, flee_noise_reduce: 4, tactical_withdraw: true },
      10: { flee_ap_reduce: 3, flee_no_damage: true, flee_noise_reduce: 5, tactical_withdraw: true,
            cover_escape: true,
            label: '🏆 MASTERY: Che Chắn Rút Lui — rút lui từ tile có barricade: 100% thành công + hồi 5 AP + giảm noise về 0' },
    },
  },

  bat_khuat: {
    id: 'bat_khuat', name: 'Bất Khuất',
    branch: 'yem_thu', branchLabel: '🛡️ Yểm Thủ',
    jobFilter: 'police', icon: '💪',
    prereq: [{ skill: 'khong_ai_bi_bo_lai', level: 5 }], maxLevel: 10,
    desc: 'Skill cuối nhánh Yểm Thủ. Cảnh sát không gục ngã — thương tích không làm chậm được.',
    effects: {
      1:  { wound_ap_penalty_reduce: 0.30, label: 'Giảm 30% penalty AP từ trạng thái bleed/groggy' },
      2:  { wound_ap_penalty_reduce: 0.40 },
      3:  { wound_ap_penalty_reduce: 0.50, status_duration_reduce: 0.25,
            label: '⚡ Thời gian bị debuff (bleed, infected, groggy) giảm 25%' },
      4:  { wound_ap_penalty_reduce: 0.55, status_duration_reduce: 0.30 },
      5:  { wound_ap_penalty_reduce: 0.60, status_duration_reduce: 0.35, adrenaline_surge: true,
            label: '⚡ Bùng phát: khi bị thương lần đầu trong chiến đấu, hồi ngay 3 AP' },
      6:  { wound_ap_penalty_reduce: 0.65, status_duration_reduce: 0.40, adrenaline_surge: true },
      7:  { wound_ap_penalty_reduce: 0.70, status_duration_reduce: 0.45, adrenaline_surge: true,
            endure: true,
            label: '⚡ Chịu đựng: khi HP < 15%, giảm 50% sát thương nhận vào' },
      8:  { wound_ap_penalty_reduce: 0.75, status_duration_reduce: 0.50, adrenaline_surge: true, endure: true },
      9:  { wound_ap_penalty_reduce: 0.80, status_duration_reduce: 0.55, adrenaline_surge: true, endure: true },
      10: { wound_ap_penalty_reduce: 1.00, status_duration_reduce: 0.60, adrenaline_surge: true, endure: true,
            cop_never_dies: true,
            label: '🏆 MASTERY: Cảnh Sát Không Bao Giờ Ngã — 1 lần/ngày: khi HP về 0, tự đứng lên với 3 HP và bắn 1 phát miễn phí' },
    },
  },

  // ══════════════════════════════════════════════════════
  // SIGNATURE SKILLS — mở khóa qua Milestone
  // ══════════════════════════════════════════════════════

  authority_presence: {
    id: 'authority_presence', name: 'Uy Quyền Hiện Diện',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'police', icon: '👮',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Danh tiếng cảnh sát đi trước. Unlock qua milestone police_first_arrest (uy hiếp thành công lần đầu).',
    effects: {
      1: {
        authority_presence_active: true,
        intimidate_all_hostile: 0.30,
        label: '🏅 Uy Quyền Hiện Diện: khi đứng trước bandit, 30% cơ hội họ tự mất 1 AP mỗi lượt vì sợ hãi',
      },
    },
  },

  tactical_reload: {
    id: 'tactical_reload', name: 'Nạp Đạn Chiến Thuật',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'police', icon: '🔄',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Nạp đạn trong khi chiến đấu không tốn AP. Unlock qua milestone police_five_kills (hạ 5 bandit).',
    effects: {
      1: {
        tactical_reload_active: true,
        free_reload: true,
        label: '🏅 Nạp Đạn Chiến Thuật: reload súng trong combat không tốn AP (vẫn tốn đạn)',
      },
    },
  },

  perimeter_alert: {
    id: 'perimeter_alert', name: 'Cảnh Báo Vùng',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'police', icon: '🚨',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Biết trước base attack. Unlock qua milestone police_guardian (ngủ 5 đêm liên tiếp không bị tấn công khi có barricade).',
    effects: {
      1: {
        perimeter_alert_active: true,
        base_attack_warning: true,
        label: '🏅 Cảnh Báo Vùng: biết trước 1 ngày khi base sắp bị tấn công; giảm 20% thiệt hại từ base attack',
      },
    },
  },

};

// ══════════════════════════════════════════════════════
// PREREQUISITES
// ══════════════════════════════════════════════════════
(function() {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;

  // Nhánh Kiểm Soát Tiếng Súng
  SKILL_PREREQUISITES.tiet_kiem_dan     = [{ skill: 'kiem_soat_am_thanh', level: 3 }];
  SKILL_PREREQUISITES.ban_tu_yem_the    = [{ skill: 'tiet_kiem_dan',      level: 3 }];
  SKILL_PREREQUISITES.phan_xa_chien_dau = [{ skill: 'ban_tu_yem_the',     level: 3 }];
  SKILL_PREREQUISITES.xa_thu_canh_sat   = [{ skill: 'phan_xa_chien_dau',  level: 5 }];

  // Nhánh Uy Quyền
  SKILL_PREREQUISITES.doc_nguoi           = [{ skill: 'ap_dao_uy_quyen',   level: 3 }];
  SKILL_PREREQUISITES.dam_phan_song_con   = [{ skill: 'doc_nguoi',         level: 3 }];
  SKILL_PREREQUISITES.nen_tang_tinh_than  = [{ skill: 'dam_phan_song_con', level: 3 }];
  SKILL_PREREQUISITES.danh_tieng_canh_sat = [{ skill: 'nen_tang_tinh_than', level: 5 }];

  // Nhánh Yểm Thủ
  SKILL_PREREQUISITES.canh_giac_cao_do = [{ skill: 'chien_thuat_yem_the', level: 3 }];
  SKILL_PREREQUISITES.che_chan_dong_doi = [{ skill: 'canh_giac_cao_do',   level: 3 }];
  SKILL_PREREQUISITES.khong_ai_bi_bo_lai= [{ skill: 'che_chan_dong_doi',  level: 3 }];
  SKILL_PREREQUISITES.bat_khuat        = [{ skill: 'khong_ai_bi_bo_lai',  level: 5 }];

  // Signature không prereq thường
})();

// ══════════════════════════════════════════════════════
// MILESTONE HINTS
// ══════════════════════════════════════════════════════
(function() {
  if (typeof MILESTONE_DEFS === 'undefined') return;

  const hints = {
    police_first_arrest: {
      hint_50:  'Lần đầu bạn chĩa súng vào một người còn sống. Hắn run lên. Bạn không bắn.',
      hint_80:  'Bọn cướp bắt đầu nhận ra bạn. Không còn cười khi thấy bạn nữa.',
      hint_100: 'Một tên quỳ xuống trước khi bạn kịp nói gì. 🏅 Uy Quyền Hiện Diện mở khóa.',
      unlock_skill: 'authority_presence', unlock_label: 'Uy Quyền Hiện Diện',
    },
    police_five_kills: {
      hint_50:  'Kẻ thứ hai. Kẻ thứ ba. Tay bạn không còn run nữa.',
      hint_80:  'Bạn nạp đạn trong khi vẫn đang ngắm. Cơ thể nhớ mọi thứ.',
      hint_100: 'Năm tên cướp. Năm phát quyết định. Bạn không hối hận. 🏅 Nạp Đạn Chiến Thuật mở khóa.',
      unlock_skill: 'tactical_reload', unlock_label: 'Nạp Đạn Chiến Thuật',
    },
    police_guardian: {
      hint_50:  'Đêm thứ nhất sau barricade. Bạn ngủ nhưng tai vẫn lắng nghe.',
      hint_80:  'Bạn bắt đầu đọc được những dấu hiệu — vết chân mới, mùi khói xa.',
      hint_100: 'Ba ngày trước khi bọn chúng đến, bạn đã biết. 🏅 Cảnh Báo Vùng mở khóa.',
      unlock_skill: 'perimeter_alert', unlock_label: 'Cảnh Báo Vùng',
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
      // Súng + barricade = cảnh sát trong chiến hào
      id: 'police_fortified_fire',
      name: 'Chiến Hào Cảnh Sát',
      desc: 'Kiểm Soát Tiếng Súng + Yểm Thủ: khi bắn từ barricade lv2+, noise không tăng thêm.',
      jobFilter: 'police',
      requires: [
        { skill: 'kiem_soat_am_thanh', level: 3 },
        { skill: 'chien_thuat_yem_the', level: 3 },
      ],
      effect: { cover_zero_noise: true },
    },
    {
      // Uy quyền + barricade = kiểm soát tình huống hoàn toàn
      id: 'police_zone_control',
      name: 'Kiểm Soát Tình Huống',
      desc: 'Uy Quyền + Yểm Thủ: khi đứng sau barricade và có bandit, stress không tăng suốt cuộc đối đầu.',
      jobFilter: 'police',
      requires: [
        { skill: 'ap_dao_uy_quyen', level: 3 },
        { skill: 'canh_giac_cao_do', level: 3 },
      ],
      effect: { combat_stress_immune_vs_bandit: true },
    },
    {
      // Súng + uy quyền = kẻ thù nghe tiếng súng mà bỏ chạy
      id: 'police_deterrence',
      name: 'Sức Mạnh Răn Đe',
      desc: 'Kiểm Soát Tiếng Súng lv5 + Uy Quyền lv5: mỗi lần giết zombie bằng súng, giảm 2 stress.',
      jobFilter: 'police',
      requires: [
        { skill: 'tiet_kiem_dan', level: 3 },
        { skill: 'nen_tang_tinh_than', level: 3 },
      ],
      effect: { kill_stress_recover: 2 },
    }
  );
})();

// ══════════════════════════════════════════════════════
// SELF-REGISTRATION
// ══════════════════════════════════════════════════════
(function() {
  if (typeof DW_ROLE_TREES === 'undefined') {
    console.error('[Deadworld] DW_ROLE_TREES chưa khai báo — kiểm tra load order.');
    return;
  }
  DW_ROLE_TREES['police'] = POLICE_SKILL_TREE;

  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(POLICE_SKILL_TREE)) {
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

  console.log('[Deadworld] police-skill-tree v3.0 loaded —', Object.keys(POLICE_SKILL_TREE).length, 'skills.');
})();
