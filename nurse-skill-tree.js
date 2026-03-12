// ══════════════════════════════════════════════════════
// DEAD WORLD — nurse-skill-tree.js  v2.0
// Role: Y Tá (nurse)
// Fantasy: "Không ai chết dưới tay mình — kể cả khi thế giới đã chết."
//
// KIẾN TRÚC:
//   File này chỉ chứa DATA và tự đăng ký vào DW_ROLE_TREES.
//   KHÔNG monkey-patch engine. Engine đọc effects qua DW_getSkillEffect().
//   Nurse logic được thêm trực tiếp vào:
//     - engine-inventory.js  (DW_useItem: heal_bonus, item_save_chance, heal_mental)
//     - engine-survival.js   (DW_sleep: stress_decay_bonus, emergency_heal)
//     - engine-combat.js     (DW_fight: emergency_defense, emergency_no_stun)
//
// TRIẾT LÝ THIẾT KẾ:
//   Y Tá không mạnh combat, không nhanh di chuyển.
//   Sức mạnh đến từ khả năng kéo dài sự sống — cho mình và đồng đội.
//
// BALANCE TARGET:
//   Combat      : Yếu      (không skill damage, không combat AP bonus)
//   Survival    : Mạnh     (tự hồi phục, kháng bệnh, ít tốn đồ)
//   Exploration : TB       (không movement bonus)
//   Utility     : Mạnh     (heal NPC, cứu người, xa gần đều hiệu quả)
//
// ĐIỂM YẾU CỐ Ý:
//   - Không combat skill, không damage bonus
//   - Không AP economy, không movement speed
//   - Healer bị động: cần người khác bảo vệ
//
// Cấu trúc:
//   1. NURSE_SKILL_TREE   — 15 skill + 3 signature
//   2. Prerequisites đăng ký vào SKILL_PREREQUISITES
//   3. Milestone hints merge vào MILESTONE_DEFS
//   4. Synergies push vào SKILL_SYNERGIES
//   5. Self-registration vào DW_ROLE_TREES + DW_SKILLS
//
// Load order: sau deadworld-data-addon.js, trước engine-skills.js.
// ══════════════════════════════════════════════════════

var NURSE_SKILL_TREE = {

  // ══════════════════════════════════════════════════════
  // NHÁNH 1: BÀN TAY DỊU DÀNG
  // Fantasy: "chạm vào là thấy đỡ đau"
  // Core loop: heal hiệu quả hơn, ít tốn tài nguyên
  // Effect IDs đọc bởi engine-inventory.js DW_useItem:
  //   heal_bonus, item_save_chance, heal_mental, field_med_bonus, field_ap_reduce
  // ══════════════════════════════════════════════════════

  ban_tay_diu_dang: {
    id: 'ban_tay_diu_dang', name: 'Bàn Tay Dịu Dàng',
    branch: 'ban_tay', branchLabel: '🩺 Bàn Tay',
    jobFilter: 'nurse', icon: '🤲', prereq: [], maxLevel: 10,
    desc: 'Item y tế hiệu quả hơn. 15% không tiêu hao khi dùng (lv3+).',
    effects: {
      1:  { heal_bonus: 0.10,
            label: 'Item y tế +10% HP hồi' },
      2:  { heal_bonus: 0.15 },
      3:  { heal_bonus: 0.20, item_save_chance: 0.15,
            label: '⚡ 15% không tiêu hao item khi dùng' },
      4:  { heal_bonus: 0.25, item_save_chance: 0.18 },
      5:  { heal_bonus: 0.30, item_save_chance: 0.20,
            label: '⚡ Kỹ thuật băng bó nâng cao: item_save_chance 20%' },
      6:  { heal_bonus: 0.33, item_save_chance: 0.22 },
      7:  { heal_bonus: 0.36, item_save_chance: 0.24 },
      8:  { heal_bonus: 0.38, item_save_chance: 0.26 },
      9:  { heal_bonus: 0.40, item_save_chance: 0.28 },
      10: { heal_bonus: 0.45, item_save_chance: 0.30, miracle_touch: true,
            label: '🏆 MASTERY: Chạm Kỳ Diệu — 30% item y tế hồi gấp đôi' },
    },
  },

  tiet_kiem_thuoc_men: {
    id: 'tiet_kiem_thuoc_men', name: 'Tiết Kiệm Thuốc Men',
    branch: 'ban_tay', branchLabel: '🩺 Bàn Tay',
    jobFilter: 'nurse', icon: '💊',
    prereq: [{ skill: 'ban_tay_diu_dang', level: 3 }], maxLevel: 10,
    desc: 'Dùng ít thuốc hơn. Khi dùng cho người khác, hiệu quả tăng thêm.',
    effects: {
      1:  { med_usage_reduce: 0.10,
            label: 'Item y tế tiêu hao chậm hơn 10% (item_save_chance +10%)' },
      2:  { med_usage_reduce: 0.15 },
      3:  { med_usage_reduce: 0.20, reuse_bandage: true,
            label: '⚡ Băng gạc có thể dùng lại 1 lần (30% hiệu quả)' },
      4:  { med_usage_reduce: 0.25, reuse_bandage: true },
      5:  { med_usage_reduce: 0.30, reuse_bandage: true, salvage_med: true,
            label: '⚡ 20% nhận lại nguyên liệu khi dùng item y tế' },
      6:  { med_usage_reduce: 0.33, reuse_bandage: true, salvage_med: true },
      7:  { med_usage_reduce: 0.36, reuse_bandage: true, salvage_med: true,
            med_efficiency_other: 0.50,
            label: '⚡ Heal người khác +50% hiệu quả' },
      8:  { med_usage_reduce: 0.38, reuse_bandage: true, salvage_med: true,
            med_efficiency_other: 0.60 },
      9:  { med_usage_reduce: 0.40, reuse_bandage: true, salvage_med: true,
            med_efficiency_other: 0.70 },
      10: { med_usage_reduce: 0.45, reuse_bandage: true, salvage_med: true,
            med_efficiency_other: 0.80, zero_waste_heal: true,
            label: '🏆 MASTERY: Không Lãng Phí — item y tế không bao giờ mất khi dùng cho người khác' },
    },
  },

  benh_vien_di_dong: {
    id: 'benh_vien_di_dong', name: 'Bệnh Viện Di Động',
    branch: 'ban_tay', branchLabel: '🩺 Bàn Tay',
    jobFilter: 'nurse', icon: '🚑',
    prereq: [{ skill: 'tiet_kiem_thuoc_men', level: 3 }], maxLevel: 10,
    desc: 'Chữa trị hiệu quả hơn khi ở ngoài trời. Giảm AP dùng thuốc ngoài base.',
    effects: {
      1:  { field_med_bonus: 0.10,
            label: 'Ngoài base: item y tế +10% hiệu quả' },
      2:  { field_med_bonus: 0.15 },
      3:  { field_med_bonus: 0.20, field_ap_reduce: 1,
            label: '⚡ Dùng item y tế ngoài base -1 AP' },
      4:  { field_med_bonus: 0.25, field_ap_reduce: 1 },
      5:  { field_med_bonus: 0.30, field_ap_reduce: 1, mobile_clinic: true,
            label: '⚡ Trạm y tế lưu động: 1 lần/ngày, hồi 3 HP không cần item' },
      6:  { field_med_bonus: 0.33, field_ap_reduce: 1, mobile_clinic: true,
            mobile_clinic_hp: 3 },
      7:  { field_med_bonus: 0.36, field_ap_reduce: 2, mobile_clinic: true,
            mobile_clinic_hp: 4, field_status_cure: true,
            label: '⚡ 30% xóa 1 status xấu khi dùng item y tế ngoài base' },
      8:  { field_med_bonus: 0.38, field_ap_reduce: 2, mobile_clinic: true,
            mobile_clinic_hp: 4, field_status_cure: true },
      9:  { field_med_bonus: 0.40, field_ap_reduce: 2, mobile_clinic: true,
            mobile_clinic_hp: 5, field_status_cure: true },
      10: { field_med_bonus: 0.45, field_ap_reduce: 2, mobile_clinic: true,
            mobile_clinic_hp: 5, field_status_cure: true,
            label: '🏆 MASTERY: field_med_bonus +45%, -2 AP ngoài base, mobile_clinic +5 HP, luôn xóa 1 status' },
    },
  },

  hoi_suc_tich_cuc: {
    id: 'hoi_suc_tich_cuc', name: 'Hồi Sức Tích Cực',
    branch: 'ban_tay', branchLabel: '🩺 Bàn Tay',
    jobFilter: 'nurse', icon: '⚡',
    prereq: [{ skill: 'benh_vien_di_dong', level: 3 }], maxLevel: 10,
    desc: 'Tăng HP hồi khi cứu người từ nguy kịch. Cứu người nhanh hơn.',
    effects: {
      1:  { heal_on_revive: 2,
            label: 'Khi cứu người (HP ≤ 1), người được cứu hồi +2 HP thêm' },
      2:  { heal_on_revive: 3 },
      3:  { heal_on_revive: 4, revive_ap_reduce: 1,
            label: '⚡ Cứu người -1 AP' },
      4:  { heal_on_revive: 5, revive_ap_reduce: 1 },
      5:  { heal_on_revive: 6, revive_ap_reduce: 1, revive_stress_reduce: 10,
            label: '⚡ Người được cứu giảm -10 stress' },
      6:  { heal_on_revive: 6, revive_ap_reduce: 1, revive_stress_reduce: 12 },
      7:  { heal_on_revive: 7, revive_ap_reduce: 1, revive_stress_reduce: 14,
            revive_buff: true,
            label: '⚡ Người được cứu nhận buff Phục Hồi: +2 HP mỗi ngày (3 ngày)' },
      8:  { heal_on_revive: 8, revive_ap_reduce: 1, revive_stress_reduce: 16, revive_buff: true },
      9:  { heal_on_revive: 9, revive_ap_reduce: 1, revive_stress_reduce: 18, revive_buff: true },
      10: { heal_on_revive: 10, revive_ap_reduce: 1, revive_stress_reduce: 20,
            revive_buff: true, second_chance: true,
            label: '🏆 MASTERY: Cơ Hội Thứ Hai — 1 lần/ngày, đồng đội chết được hồi 5 HP tự động (trong tile)' },
    },
  },

  chuyen_gia_cap_cuu: {
    id: 'chuyen_gia_cap_cuu', name: 'Chuyên Gia Cấp Cứu',
    branch: 'ban_tay', branchLabel: '🩺 Bàn Tay',
    jobFilter: 'nurse', icon: '🏥',
    prereq: [{ skill: 'hoi_suc_tich_cuc', level: 5 }], maxLevel: 10,
    desc: 'Khi HP < 20%, tự động hồi phục. Giảm sát thương nhận khi nguy kịch.',
    effects: {
      // Đọc bởi engine-combat.js và engine-survival.js khi hp < 20%
      1:  { emergency_heal: 2,
            label: 'Khi HP < 20%: tự hồi +2 HP sau mỗi lượt (1 lần/ngày)' },
      2:  { emergency_heal: 3 },
      3:  { emergency_heal: 3, emergency_defense: 0.10,
            label: '⚡ Khi HP < 20%: giảm 10% sát thương nhận' },
      4:  { emergency_heal: 4, emergency_defense: 0.15 },
      5:  { emergency_heal: 4, emergency_defense: 0.20, emergency_no_stun: true,
            label: '⚡ Khi HP < 20%: miễn nhiễm stun' },
      6:  { emergency_heal: 5, emergency_defense: 0.22, emergency_no_stun: true },
      7:  { emergency_heal: 5, emergency_defense: 0.24, emergency_no_stun: true },
      8:  { emergency_heal: 6, emergency_defense: 0.26, emergency_no_stun: true },
      9:  { emergency_heal: 7, emergency_defense: 0.28, emergency_no_stun: true },
      10: { emergency_heal: 8, emergency_defense: 0.30, emergency_no_stun: true,
            never_die: true,
            label: '🏆 MASTERY: Không Bao Giờ Chết — khi HP về 0, ở lại 1 HP (1 lần/ngày)' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 2: TÂM LÝ
  // Fantasy: "bệnh nhân cần an ủi không kém gì thuốc"
  // Core loop: giảm stress, ngăn panic, tâm lý ổn định
  // Effect IDs đọc bởi engine-survival.js DW_sleep và DW_tickStatuses:
  //   stress_decay_bonus, panic_threshold, panic_cure, depression_resist
  // ══════════════════════════════════════════════════════

  lang_nghe_thau_cam: {
    id: 'lang_nghe_thau_cam', name: 'Lắng Nghe Thấu Cảm',
    branch: 'tam_ly', branchLabel: '🧠 Tâm Lý',
    jobFilter: 'nurse', icon: '👂', prereq: [], maxLevel: 10,
    desc: 'Stress giảm nhanh hơn khi ngủ/nghỉ. Ngưỡng panic cao hơn.',
    effects: {
      // stress_decay_bonus: nhân thêm vào stressRecover trong DW_sleep
      1:  { stress_decay_bonus: 0.10,
            label: 'Stress giảm nhanh hơn +10% khi ngủ/nghỉ' },
      2:  { stress_decay_bonus: 0.15 },
      3:  { stress_decay_bonus: 0.20, panic_threshold: 5,
            label: '⚡ Ngưỡng panic +5 (85 thay vì 80)' },
      4:  { stress_decay_bonus: 0.25, panic_threshold: 8 },
      5:  { stress_decay_bonus: 0.30, panic_threshold: 10,
            label: '⚡ Panic ngưỡng 90 — rất khó hoảng loạn' },
      6:  { stress_decay_bonus: 0.33, panic_threshold: 12 },
      7:  { stress_decay_bonus: 0.36, panic_threshold: 14, panic_cure: true,
            label: '⚡ 1 lần/ngày: xóa panic cho bản thân' },
      8:  { stress_decay_bonus: 0.38, panic_threshold: 16, panic_cure: true },
      9:  { stress_decay_bonus: 0.40, panic_threshold: 18, panic_cure: true },
      10: { stress_decay_bonus: 0.45, panic_threshold: 20, panic_cure: true,
            peace_aura: true,
            label: '🏆 MASTERY: Hào Quang Bình Yên — stress bản thân không vượt 70; panic ngưỡng 100' },
    },
  },

  tu_van_tam_ly: {
    id: 'tu_van_tam_ly', name: 'Tư Vấn Tâm Lý',
    branch: 'tam_ly', branchLabel: '🧠 Tâm Lý',
    jobFilter: 'nurse', icon: '💬',
    prereq: [{ skill: 'lang_nghe_thau_cam', level: 3 }], maxLevel: 10,
    desc: 'Mở khóa action Trò Chuyện (1 AP): giảm stress NPC, tăng trust.',
    effects: {
      // talk_action_unlock: engine-core.js đọc để hiện action trong menu
      1:  { talk_action_unlock: true, talk_stress_reduce: 5,
            label: '⚡ Mở khóa Trò Chuyện (1 AP): -5 stress NPC' },
      2:  { talk_action_unlock: true, talk_stress_reduce: 6 },
      3:  { talk_action_unlock: true, talk_stress_reduce: 7, talk_trust_bonus: 0.15,
            label: '⚡ Trò chuyện tăng +15% trust với NPC' },
      4:  { talk_action_unlock: true, talk_stress_reduce: 8, talk_trust_bonus: 0.18 },
      5:  { talk_action_unlock: true, talk_stress_reduce: 10, talk_trust_bonus: 0.20,
            label: '⚡ Stress NPC -10 khi trò chuyện' },
      6:  { talk_action_unlock: true, talk_stress_reduce: 11, talk_trust_bonus: 0.22 },
      7:  { talk_action_unlock: true, talk_stress_reduce: 12, talk_trust_bonus: 0.24 },
      8:  { talk_action_unlock: true, talk_stress_reduce: 13, talk_trust_bonus: 0.26 },
      9:  { talk_action_unlock: true, talk_stress_reduce: 14, talk_trust_bonus: 0.28 },
      10: { talk_action_unlock: true, talk_stress_reduce: 16, talk_trust_bonus: 0.30,
            talk_free: true,
            label: '🏆 MASTERY: Nhà Tâm Lý Học — Trò chuyện không tốn AP' },
    },
  },

  tri_lieu_tam_ly: {
    id: 'tri_lieu_tam_ly', name: 'Trị Liệu Tâm Lý',
    branch: 'tam_ly', branchLabel: '🧠 Tâm Lý',
    jobFilter: 'nurse', icon: '📋',
    prereq: [{ skill: 'tu_van_tam_ly', level: 3 }], maxLevel: 10,
    desc: 'Dùng item y tế giảm thêm stress và depression. Chữa lành tâm lý.',
    effects: {
      // heal_mental: đọc bởi engine-inventory.js DW_useItem sau khi dùng item medical
      1:  { heal_mental: 2,
            label: 'Dùng item y tế: -2 stress thêm' },
      2:  { heal_mental: 3 },
      3:  { heal_mental: 3, heal_depression: 3,
            label: '⚡ Dùng item y tế: -3 stress, -3 depression thêm' },
      4:  { heal_mental: 4, heal_depression: 4 },
      5:  { heal_mental: 5, heal_depression: 5,
            label: '⚡ Stress và depression giảm đáng kể khi chữa trị' },
      6:  { heal_mental: 5, heal_depression: 6 },
      7:  { heal_mental: 6, heal_depression: 7, trauma_heal: true,
            label: '⚡ 1 lần/ngày: xóa 1 trauma (PTSD) khỏi người được chữa' },
      8:  { heal_mental: 7, heal_depression: 8, trauma_heal: true },
      9:  { heal_mental: 8, heal_depression: 9, trauma_heal: true },
      10: { heal_mental: 10, heal_depression: 10, trauma_heal: true, aura_calm: true,
            label: '🏆 MASTERY: Chữa Lành Tâm Hồn — khi ở base, mọi người giảm -3 stress/ngày' },
    },
  },

  khang_chien_tram_cam: {
    id: 'khang_chien_tram_cam', name: 'Kháng Chiến Trầm Cảm',
    branch: 'tam_ly', branchLabel: '🧠 Tâm Lý',
    jobFilter: 'nurse', icon: '🛡️',
    prereq: [{ skill: 'tri_lieu_tam_ly', level: 3 }], maxLevel: 10,
    desc: 'Depression tăng chậm hơn. Tự phục hồi tâm lý khi ngủ.',
    effects: {
      // depression_resist: đọc bởi engine-survival.js khi depression tăng
      1:  { depression_resist: 0.10,
            label: 'Depression tăng chậm 10%' },
      2:  { depression_resist: 0.15 },
      3:  { depression_resist: 0.20, depression_decay: 0.10,
            label: '⚡ Depression tự giảm +10% khi ngủ' },
      4:  { depression_resist: 0.25, depression_decay: 0.12 },
      5:  { depression_resist: 0.30, depression_decay: 0.14,
            label: '⚡ Depression giảm thêm khi chữa trị cho người khác' },
      6:  { depression_resist: 0.33, depression_decay: 0.16 },
      7:  { depression_resist: 0.36, depression_decay: 0.18,
            immune_depression_low: true,
            label: '⚡ Khi stress < 40: miễn nhiễm depression' },
      8:  { depression_resist: 0.38, depression_decay: 0.20,
            immune_depression_low: true },
      9:  { depression_resist: 0.40, depression_decay: 0.22,
            immune_depression_low: true },
      10: { depression_resist: 0.45, depression_decay: 0.25,
            immune_depression_low: true, mental_fortress: true,
            label: '🏆 MASTERY: Pháo Đài Tinh Thần — depression không bao giờ vượt 50' },
    },
  },

  bac_si_tam_than: {
    id: 'bac_si_tam_than', name: 'Bác Sĩ Tâm Thần',
    branch: 'tam_ly', branchLabel: '🧠 Tâm Lý',
    jobFilter: 'nurse', icon: '🧠',
    prereq: [{ skill: 'khang_chien_tram_cam', level: 5 }], maxLevel: 10,
    desc: 'Skill cuối nhánh Tâm Lý. Miễn nhiễm stress sau chữa trị. Xóa trauma NPC.',
    effects: {
      1:  { mental_immunity_hours: 4,
            label: 'Sau khi được chữa tâm lý: miễn nhiễm stress tăng thêm 4h' },
      2:  { mental_immunity_hours: 5 },
      3:  { mental_immunity_hours: 6, therapy_xp_bonus: 0.15,
            label: '⚡ Heal NPC: nhận thêm 15% character XP' },
      4:  { mental_immunity_hours: 6, therapy_xp_bonus: 0.20 },
      5:  { mental_immunity_hours: 6, therapy_xp_bonus: 0.25,
            label: '⚡ Chữa NPC: họ nhận +10 max stress trước panic' },
      6:  { mental_immunity_hours: 8, therapy_xp_bonus: 0.30 },
      7:  { mental_immunity_hours: 8, therapy_xp_bonus: 0.35,
            deep_heal: true,
            label: '⚡ Mỗi lần heal NPC: họ tự giảm -1 stress/ngày trong 3 ngày' },
      8:  { mental_immunity_hours: 10, therapy_xp_bonus: 0.40, deep_heal: true },
      9:  { mental_immunity_hours: 10, therapy_xp_bonus: 0.45, deep_heal: true },
      10: { mental_immunity_hours: 12, therapy_xp_bonus: 0.50, deep_heal: true,
            mind_healer: true,
            label: '🏆 MASTERY: Chữa Lành Tâm Hồn — NPC được heal vĩnh viễn tăng panic threshold +20' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 3: CỨU THƯƠNG
  // Fantasy: "không bỏ ai lại phía sau"
  // Core loop: cứu người nhanh hơn, hiệu quả hơn, bảo vệ bản thân khi cứu
  // ĐIỂM YẾU CỐ Ý: nếu không có ai cần cứu, nhánh này kém hiệu quả
  // ══════════════════════════════════════════════════════

  phan_xa_cuu_nguoi: {
    id: 'phan_xa_cuu_nguoi', name: 'Phản Xạ Cứu Người',
    branch: 'cuu_thuong', branchLabel: '🚑 Cứu Thương',
    jobFilter: 'nurse', icon: '⚡', prereq: [], maxLevel: 10,
    desc: 'Kháng stun khi cứu người. Cứu người tốn ít AP hơn.',
    effects: {
      // rescue_ap_reduce: đọc bởi engine-core.js action "cứu người"
      1:  { rescue_ap_reduce: 1, stun_resist: 0.15,
            label: 'Cứu người -1 AP. Kháng stun 15%' },
      2:  { rescue_ap_reduce: 1, stun_resist: 0.25 },
      3:  { rescue_ap_reduce: 1, stun_resist: 0.35, rescue_no_counter: true,
            label: '⚡ Khi cứu người, không bị phản đòn từ zombie' },
      4:  { rescue_ap_reduce: 2, stun_resist: 0.45, rescue_no_counter: true },
      5:  { rescue_ap_reduce: 2, stun_resist: 0.55, rescue_no_counter: true,
            rescue_heal: 2,
            label: '⚡ Người được cứu hồi +2 HP ngay lúc đó' },
      6:  { rescue_ap_reduce: 2, stun_resist: 0.65, rescue_no_counter: true,
            rescue_heal: 2 },
      7:  { rescue_ap_reduce: 2, stun_resist: 0.75, rescue_no_counter: true,
            rescue_heal: 3 },
      8:  { rescue_ap_reduce: 2, stun_resist: 0.85, rescue_no_counter: true,
            rescue_heal: 3 },
      9:  { rescue_ap_reduce: 2, stun_resist: 0.95, rescue_no_counter: true,
            rescue_heal: 4 },
      10: { rescue_ap_reduce: 2, stun_resist: 1.00, rescue_no_counter: true,
            rescue_heal: 5, auto_rescue: true,
            label: '🏆 MASTERY: Cứu Tự Động — 1 lần/ngày, tự cứu đồng đội nguy kịch trong tile không tốn AP' },
    },
  },

  ke_hoach_so_tan: {
    id: 'ke_hoach_so_tan', name: 'Kế Hoạch Sơ Tán',
    branch: 'cuu_thuong', branchLabel: '🚑 Cứu Thương',
    jobFilter: 'nurse', icon: '📋',
    prereq: [{ skill: 'phan_xa_cuu_nguoi', level: 3 }], maxLevel: 10,
    desc: 'Tàng hình tốt hơn khi đang cứu người. Giảm noise khi di chuyển cùng NPC.',
    effects: {
      // rescue_sneak: giảm noise khi có NPC đi cùng — đọc bởi engine-world.js DW_move
      1:  { rescue_sneak: 1,
            label: 'Di chuyển cùng NPC: noise -1' },
      2:  { rescue_sneak: 1, escort_ap_reduce: 0 },
      3:  { rescue_sneak: 2,
            label: '⚡ Noise -2 khi di chuyển cùng NPC bị thương' },
      4:  { rescue_sneak: 2, escort_ap_reduce: 1,
            label: '⚡ Hộ tống NPC -1 AP' },
      5:  { rescue_sneak: 2, escort_ap_reduce: 1, escort_safe_path: true,
            label: '⚡ Dẫn NPC đến tile an toàn (không zombie đã biết)' },
      6:  { rescue_sneak: 3, escort_ap_reduce: 1, escort_safe_path: true },
      7:  { rescue_sneak: 3, escort_ap_reduce: 1, escort_safe_path: true,
            escort_group: true,
            label: '⚡ Hộ tống nhóm: di chuyển đồng thời cùng 2 NPC' },
      8:  { rescue_sneak: 3, escort_ap_reduce: 1, escort_safe_path: true,
            escort_group: true },
      9:  { rescue_sneak: 4, escort_ap_reduce: 1, escort_safe_path: true,
            escort_group: true },
      10: { rescue_sneak: 4, escort_ap_reduce: 1, escort_safe_path: true,
            escort_group: true, ghost_escort: true,
            label: '🏆 MASTERY: Di Chuyển Ma — khi hộ tống NPC, bạn và họ 0 noise' },
    },
  },

  tinh_te_boi_thuong: {
    id: 'tinh_te_boi_thuong', name: 'Tỉnh Táo Bội Thường',
    branch: 'cuu_thuong', branchLabel: '🚑 Cứu Thương',
    jobFilter: 'nurse', icon: '🫀',
    prereq: [{ skill: 'ke_hoach_so_tan', level: 3 }], maxLevel: 10,
    desc: 'Miễn nhiễm knockback. Không nhận sát thương khi đang cứu người.',
    effects: {
      // rescue_no_damage: đọc bởi engine-combat.js khi player đang rescue
      1:  { knockback_resist: true,
            label: 'Miễn nhiễm knockback' },
      2:  { knockback_resist: true },
      3:  { knockback_resist: true, rescue_dmg_reduce: 0.20,
            label: '⚡ Khi đang cứu người: giảm 20% sát thương nhận' },
      4:  { knockback_resist: true, rescue_dmg_reduce: 0.30 },
      5:  { knockback_resist: true, rescue_dmg_reduce: 0.40, rescue_no_stun: true,
            label: '⚡ Khi đang cứu người: không thể bị stun' },
      6:  { knockback_resist: true, rescue_dmg_reduce: 0.50, rescue_no_stun: true },
      7:  { knockback_resist: true, rescue_dmg_reduce: 0.60, rescue_no_stun: true },
      8:  { knockback_resist: true, rescue_dmg_reduce: 0.70, rescue_no_stun: true,
            rescue_no_damage: true,
            label: '⚡ Khi đang cứu người: không nhận sát thương' },
      9:  { knockback_resist: true, rescue_dmg_reduce: 0.80, rescue_no_stun: true,
            rescue_no_damage: true },
      10: { knockback_resist: true, rescue_dmg_reduce: 1.00, rescue_no_stun: true,
            rescue_no_damage: true, immortal_rescuer: true,
            label: '🏆 MASTERY: Người Cứu Bất Tử — khi cứu người, miễn nhiễm mọi sát thương và hiệu ứng xấu' },
    },
  },

  vung_dung_y_te: {
    id: 'vung_dung_y_te', name: 'Vùng Dụng Y Tế',
    branch: 'cuu_thuong', branchLabel: '🚑 Cứu Thương',
    jobFilter: 'nurse', icon: '🎯',
    prereq: [{ skill: 'tinh_te_boi_thuong', level: 3 }], maxLevel: 10,
    desc: 'Đặt vật tư y tế trong tile — người trong tile tự hồi phục theo giờ.',
    effects: {
      // med_supply_drop: engine-core.js thêm action "Đặt Vật Tư" nếu true
      1:  { med_supply_drop: true, med_supply_heal: 1, med_supply_duration: 6,
            label: '⚡ Đặt vật tư (2 AP): +1 HP/giờ cho người trong tile trong 6h' },
      2:  { med_supply_drop: true, med_supply_heal: 1, med_supply_duration: 8 },
      3:  { med_supply_drop: true, med_supply_heal: 2, med_supply_duration: 12,
            label: '⚡ +2 HP/giờ, kéo dài 12h' },
      4:  { med_supply_drop: true, med_supply_heal: 2, med_supply_duration: 12 },
      5:  { med_supply_drop: true, med_supply_heal: 2, med_supply_duration: 18,
            med_supply_stress: 1,
            label: '⚡ Giảm -1 stress/giờ cho người trong tile' },
      6:  { med_supply_drop: true, med_supply_heal: 3, med_supply_duration: 18,
            med_supply_stress: 1 },
      7:  { med_supply_drop: true, med_supply_heal: 3, med_supply_duration: 24,
            med_supply_stress: 1, med_supply_auto: true,
            label: '⚡ Tự động đặt lại mỗi ngày (không tốn AP)' },
      8:  { med_supply_drop: true, med_supply_heal: 3, med_supply_duration: 24,
            med_supply_stress: 1, med_supply_auto: true },
      9:  { med_supply_drop: true, med_supply_heal: 4, med_supply_duration: 24,
            med_supply_stress: 2, med_supply_auto: true },
      10: { med_supply_drop: true, med_supply_heal: 5, med_supply_duration: 24,
            med_supply_stress: 2, med_supply_auto: true, mobile_hospital: true,
            label: '🏆 MASTERY: Bệnh Viện Lưu Động — +5 HP/giờ, -2 stress/giờ, tự duy trì' },
    },
  },

  niem_tin_song_con: {
    id: 'niem_tin_song_con', name: 'Niềm Tin Sống Còn',
    branch: 'cuu_thuong', branchLabel: '🚑 Cứu Thương',
    jobFilter: 'nurse', icon: '✨',
    prereq: [{ skill: 'vung_dung_y_te', level: 5 }], maxLevel: 10,
    desc: 'Skill cuối Cứu Thương. Khi có y tá trong tile, mọi người hồi HP và bớt stress.',
    effects: {
      // hope_aura: đọc bởi DW_tick mỗi giờ — áp dụng cho tất cả trong tile
      1:  { hope_aura: true, hope_heal: 1, hope_stress: 0,
            label: 'Khi y tá ở cùng tile: đồng đội +1 HP/giờ' },
      2:  { hope_aura: true, hope_heal: 1, hope_stress: 1 },
      3:  { hope_aura: true, hope_heal: 2, hope_stress: 1,
            label: '⚡ +2 HP/giờ, -1 stress/giờ' },
      4:  { hope_aura: true, hope_heal: 2, hope_stress: 1 },
      5:  { hope_aura: true, hope_heal: 2, hope_stress: 2, hope_revive: true,
            label: '⚡ 1 lần/ngày: hồi sinh đồng đội chết trong tile với 3 HP' },
      6:  { hope_aura: true, hope_heal: 2, hope_stress: 2, hope_revive: true },
      7:  { hope_aura: true, hope_heal: 3, hope_stress: 2, hope_revive: true },
      8:  { hope_aura: true, hope_heal: 3, hope_stress: 2, hope_revive: true },
      9:  { hope_aura: true, hope_heal: 3, hope_stress: 3, hope_revive: true },
      10: { hope_aura: true, hope_heal: 4, hope_stress: 3, hope_revive: true,
            miracle_worker: true,
            label: '🏆 MASTERY: Người Làm Phép Màu — không ai trong tile của y tá chết (HP tối thiểu 1); 1 lần/game hồi tất cả đồng đội về 5 HP' },
    },
  },

  // ══════════════════════════════════════════════════════
  // SIGNATURE SKILLS
  // Chỉ data — unlock qua DW_checkMilestone trong MILESTONE_DEFS
  // ══════════════════════════════════════════════════════

  healing_touch: {
    id: 'healing_touch', name: 'Chạm Chữa Lành',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'nurse', icon: '✨',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Dùng item y tế cho NPC: họ hồi thêm +2 HP. Unlock: cứu NPC lần đầu.',
    effects: {
      1: {
        healing_touch_active: true,
        heal_other_bonus: 2,
        label: '🏅 Chạm Chữa Lành: dùng item y tế cho NPC, họ hồi thêm +2 HP',
      },
    },
  },

  field_triage: {
    id: 'field_triage', name: 'Phân Loại Thương Binh',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'nurse', icon: '🚑',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Biết chính xác HP của NPC nguy kịch. Unlock: cứu 5 NPC.',
    effects: {
      1: {
        field_triage_active: true,
        triage_info: true,
        label: '🏅 Phân Loại Thương Binh: biết chính xác HP của mọi NPC; đánh dấu nguy kịch (HP < 30%)',
      },
    },
  },

  miracle_hands: {
    id: 'miracle_hands', name: 'Đôi Tay Kỳ Diệu',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'nurse', icon: '🖐️',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: '1 lần/game: khi HP về 0, tự hồi sinh về 1 HP. Unlock: hồi sinh NPC sắp chết.',
    effects: {
      1: {
        miracle_hands_active: true,
        self_revive_once: true,
        self_revive_hp: 1,
        label: '🏅 Đôi Tay Kỳ Diệu: 1 lần/game, HP về 0 → tự hồi sinh với 1 HP',
      },
    },
  },

};

// ══════════════════════════════════════════════════════
// PREREQUISITES — đăng ký vào SKILL_PREREQUISITES
// ══════════════════════════════════════════════════════
(function () {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;

  // Nhánh Bàn Tay
  SKILL_PREREQUISITES.tiet_kiem_thuoc_men  = [{ skill: 'ban_tay_diu_dang',   level: 3 }];
  SKILL_PREREQUISITES.benh_vien_di_dong    = [{ skill: 'tiet_kiem_thuoc_men', level: 3 }];
  SKILL_PREREQUISITES.hoi_suc_tich_cuc     = [{ skill: 'benh_vien_di_dong',  level: 3 }];
  SKILL_PREREQUISITES.chuyen_gia_cap_cuu   = [{ skill: 'hoi_suc_tich_cuc',   level: 5 }];

  // Nhánh Tâm Lý
  SKILL_PREREQUISITES.tu_van_tam_ly        = [{ skill: 'lang_nghe_thau_cam', level: 3 }];
  SKILL_PREREQUISITES.tri_lieu_tam_ly      = [{ skill: 'tu_van_tam_ly',      level: 3 }];
  SKILL_PREREQUISITES.khang_chien_tram_cam = [{ skill: 'tri_lieu_tam_ly',    level: 3 }];
  SKILL_PREREQUISITES.bac_si_tam_than      = [{ skill: 'khang_chien_tram_cam', level: 5 }];

  // Nhánh Cứu Thương
  SKILL_PREREQUISITES.ke_hoach_so_tan      = [{ skill: 'phan_xa_cuu_nguoi',  level: 3 }];
  SKILL_PREREQUISITES.tinh_te_boi_thuong   = [{ skill: 'ke_hoach_so_tan',    level: 3 }];
  SKILL_PREREQUISITES.vung_dung_y_te       = [{ skill: 'tinh_te_boi_thuong', level: 3 }];
  SKILL_PREREQUISITES.niem_tin_song_con    = [{ skill: 'vung_dung_y_te',     level: 5 }];
})();

// ══════════════════════════════════════════════════════
// MILESTONE HINTS — merge vào MILESTONE_DEFS
// ══════════════════════════════════════════════════════
(function () {
  if (typeof MILESTONE_DEFS === 'undefined') return;

  const hints = {
    nurse_first_save: {
      hint_50:  'Lần đầu tay anh chạm vào người sống sót. Máu ấm. Mạch còn đập.',
      hint_80:  'Anh băng bó mà không cần nhìn. Tay tự làm, mắt nhìn ra xa.',
      hint_100: 'Hôm nay anh cứu một người. Không phải đồng đội. Chỉ là người lạ. 🏅 Chạm Chữa Lành mở khóa.',
      unlock_skill: 'healing_touch', unlock_label: 'Chạm Chữa Lành',
    },
    nurse_five_lives: {
      hint_50:  'Ba người. Họ gật đầu cảm ơn rồi đi. Anh không nhớ mặt.',
      hint_80:  'Năm người. Một trong số họ quay lại, cho anh nửa ổ bánh mì.',
      hint_100: 'Họ gọi anh là "bác sĩ". Anh không cải chính. 🏅 Phân Loại Thương Binh mở khóa.',
      unlock_skill: 'field_triage', unlock_label: 'Phân Loại Thương Binh',
    },
    nurse_miracle: {
      hint_50:  'Lần đầu anh thấy người chết sống lại. Không phải zombie. Là đồng đội.',
      hint_80:  'Hai lần. Ba lần. Anh bắt đầu tin có thứ gì đó lớn hơn thuốc men.',
      hint_100: 'Hôm nay anh ngã xuống. Rồi đứng dậy. Không hiểu tại sao. 🏅 Đôi Tay Kỳ Diệu mở khóa.',
      unlock_skill: 'miracle_hands', unlock_label: 'Đôi Tay Kỳ Diệu',
    },
  };

  for (const [id, h] of Object.entries(hints)) {
    if (MILESTONE_DEFS[id]) MILESTONE_DEFS[id].hints = h;
  }
})();

// ══════════════════════════════════════════════════════
// SYNERGIES — push vào SKILL_SYNERGIES
// ══════════════════════════════════════════════════════
(function () {
  if (typeof SKILL_SYNERGIES === 'undefined') return;

  SKILL_SYNERGIES.push(

    // Bàn Tay + Tâm Lý: mỗi lần dùng item y tế, giảm thêm stress cho người nhận
    {
      id: 'tam_than_the_xac',
      name: 'Tâm Thần & Thể Xác',
      desc: 'Bàn Tay + Tâm Lý lv3: dùng item y tế giảm thêm -5 stress cho người nhận.',
      jobFilter: 'nurse',
      requires: [
        { skill: 'ban_tay_diu_dang',   level: 3 },
        { skill: 'lang_nghe_thau_cam', level: 3 },
      ],
      effect: { heal_reduce_stress: 5 },
    },

    // Tâm Lý + Cứu Thương: khi cứu người, họ giảm thêm stress
    {
      id: 'cuu_thuong_tinh_than',
      name: 'Cứu Thương Tinh Thần',
      desc: 'Tâm Lý + Cứu Thương lv3: khi cứu NPC khỏi nguy kịch, họ giảm -10 stress.',
      jobFilter: 'nurse',
      requires: [
        { skill: 'tu_van_tam_ly',     level: 3 },
        { skill: 'phan_xa_cuu_nguoi', level: 3 },
      ],
      effect: { rescue_reduce_stress: 10 },
    },

    // Bàn Tay + Cứu Thương: vùng dụng y tế cũng giảm stress trong tile
    {
      id: 'y_te_truyen_thong',
      name: 'Y Tế Truyền Thống',
      desc: 'Bàn Tay lv5 + Cứu Thương lv3: vùng dụng y tế hồi cả stress và HP.',
      jobFilter: 'nurse',
      requires: [
        { skill: 'ban_tay_diu_dang', level: 5 },
        { skill: 'vung_dung_y_te',   level: 3 },
      ],
      effect: { med_supply_synergy_stress: true },
    },

  );
})();

// ══════════════════════════════════════════════════════
// SELF-REGISTRATION
// ══════════════════════════════════════════════════════
(function () {
  if (typeof DW_ROLE_TREES === 'undefined') {
    console.error('[Deadworld] DW_ROLE_TREES chưa khai báo — kiểm tra load order.');
    return;
  }

  // 1. Đăng ký tree
  DW_ROLE_TREES['nurse'] = NURSE_SKILL_TREE;

  // 2. Đăng ký từng skill vào DW_SKILLS
  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(NURSE_SKILL_TREE)) {
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

console.log('[Deadworld] nurse-skill-tree v2.0 loaded.');
