// ══════════════════════════════════════════════════════
// DEAD WORLD — chef-skill-tree.js  v1.1
// Role: Đầu Bếp (chef)
// Fantasy: "Cả thế giới có thể tàn — cơm vẫn phải nóng"
//
// Cấu trúc file (giống driver/farmer/mechanic):
//  1. CHEF_SKILL_TREE       — 15 skill + 3 signature
//  2. ITEM_DB registration  — chef_knife, đồ ăn Việt, gia vị
//  3. CRAFT_RECIPES         — 14 công thức nấu ăn
//  4. SKILL_PREREQUISITES   — prereq chain 3 nhánh
//  5. MILESTONE_DEFS hints  — 3 signature milestone
//  6. SKILL_SYNERGIES       — 2 synergy
//  7. ENGINE PATCHES        — wrap DW_fight, DW_sleep, DW_useItem,
//                             DW_searchObject, DW_apMax, DW_craft
//  8. SELF-REGISTRATION     — DW_ROLE_TREES['chef']
//
// Load order: sau deadworld-data-addon.js, trước engine-skills.js.
// ══════════════════════════════════════════════════════

var CHEF_SKILL_TREE = {

  // ══════════════════════════════════════════════════════
  // NHÁNH 1: GIA VỊ
  // Core loop: tìm nguyên liệu → nấu → ăn → buff hunger/stress
  // Cap: daily_cook_stress_cap = 20 (tổng stress giảm từ bữa ăn/ngày)
  // ══════════════════════════════════════════════════════

  ngu_vi_giac: {
    id: 'ngu_vi_giac', name: 'Ngũ Vị Giác',
    branch: 'gia_vi', branchLabel: '🌿 Gia Vị',
    jobFilter: 'chef', icon: '👃',
    prereq: [], maxLevel: 10,
    desc: 'Mũi đầu bếp nhận ra nguyên liệu nấu ăn còn dùng được. Tìm kiếm food hiệu quả hơn khi lục soát.',
    effects: {
      1:  { food_find_bonus: 0.15, label: '+15% cơ hội tìm thấy food khi lục soát' },
      2:  { food_find_bonus: 0.22 },
      3:  { food_find_bonus: 0.30, spoiled_food_detect: true,
            label: '⚡ Ngửi biết đồ ăn thiu — không vô tình ăn food gây debuff' },
      4:  { food_find_bonus: 0.36, spoiled_food_detect: true },
      5:  { food_find_bonus: 0.42, spoiled_food_detect: true, rare_ingredient_sense: true,
            label: '⚡ Hiếm giác: tìm thêm gia vị hiếm (nước mắm, ớt khô) khi lục nhà dân' },
      6:  { food_find_bonus: 0.46, spoiled_food_detect: true, rare_ingredient_sense: true },
      7:  { food_find_bonus: 0.50, spoiled_food_detect: true, rare_ingredient_sense: true,
            herb_tile_vision: true,
            label: '⚡ Thấy rau thơm/thảo mộc trên bản đồ dù chưa đến tile đó' },
      8:  { food_find_bonus: 0.54, spoiled_food_detect: true, rare_ingredient_sense: true,
            herb_tile_vision: true },
      9:  { food_find_bonus: 0.58, spoiled_food_detect: true, rare_ingredient_sense: true,
            herb_tile_vision: true },
      10: { food_find_bonus: 0.65, spoiled_food_detect: true, rare_ingredient_sense: true,
            herb_tile_vision: true, master_forager: true,
            label: '🏆 MASTERY: Đầu Bếp Đất — lục soát tile tự nhiên luôn tìm được ít nhất 1 nguyên liệu nấu ăn' },
    },
  },

  com_nong_tinh_than: {
    id: 'com_nong_tinh_than', name: 'Cơm Nóng Tinh Thần',
    branch: 'gia_vi', branchLabel: '🌿 Gia Vị',
    jobFilter: 'chef', icon: '🍚',
    prereq: [{ skill: 'ngu_vi_giac', level: 3 }], maxLevel: 10,
    // B1: daily_cook_stress_cap = 20 — tổng stress giảm từ bữa ăn/ngày bị giới hạn
    // Điều này không ảnh hưởng stress từ nguồn khác (ngủ, item y tế, v.v.)
    desc: 'Bữa ăn do tay đầu bếp nấu hồi phục tinh thần. Giới hạn: tổng stress từ bữa ăn giảm tối đa 20/ngày.',
    effects: {
      1:  { cooked_stress_bonus: 3, daily_cook_stress_cap: 20,
            label: 'Đồ ăn nấu chín giảm thêm -3 stress (tổng cap 20/ngày)' },
      2:  { cooked_stress_bonus: 5, daily_cook_stress_cap: 20 },
      3:  { cooked_stress_bonus: 7, daily_cook_stress_cap: 20, depression_resist: 0.15,
            label: '⚡ Kháng trầm cảm: ăn đồ nấu giảm 15% tốc độ tăng depression' },
      4:  { cooked_stress_bonus: 8, daily_cook_stress_cap: 20, depression_resist: 0.20 },
      5:  { cooked_stress_bonus: 10, daily_cook_stress_cap: 22, depression_resist: 0.25,
            groggy_cure_on_eat: true,
            label: '⚡ Bát cơm buổi sáng: ăn đồ nấu sau ngủ dậy → hết Groggy ngay' },
      6:  { cooked_stress_bonus: 11, daily_cook_stress_cap: 22, depression_resist: 0.30,
            groggy_cure_on_eat: true },
      7:  { cooked_stress_bonus: 13, daily_cook_stress_cap: 25, depression_resist: 0.35,
            groggy_cure_on_eat: true, morale_aura: true,
            label: '⚡ Lan tỏa: NPC trong tile giảm stress -5 khi bạn ăn đồ nấu chín' },
      8:  { cooked_stress_bonus: 14, daily_cook_stress_cap: 25, depression_resist: 0.40,
            groggy_cure_on_eat: true, morale_aura: true },
      9:  { cooked_stress_bonus: 16, daily_cook_stress_cap: 28, depression_resist: 0.45,
            groggy_cure_on_eat: true, morale_aura: true },
      10: { cooked_stress_bonus: 18, daily_cook_stress_cap: 30, depression_resist: 0.50,
            groggy_cure_on_eat: true, morale_aura: true, feast_mode: true,
            label: '🏆 MASTERY: Bữa Tiệc — khi stress > 60 và ăn đồ nấu: hồi thêm 3 HP và xóa 1 debuff (1 lần/ngày)' },
    },
  },

  bun_pho_cuu_nguoi: {
    id: 'bun_pho_cuu_nguoi', name: 'Bún Phở Cứu Người',
    branch: 'gia_vi', branchLabel: '🌿 Gia Vị',
    jobFilter: 'chef', icon: '🍜',
    prereq: [{ skill: 'com_nong_tinh_than', level: 3 }], maxLevel: 10,
    desc: 'Món ăn nấu đúng cách hồi sức như thuốc. HP recovery từ bữa ăn nấu chín.',
    effects: {
      1:  { cooked_heal_bonus: 1, label: 'Đồ ăn nấu chín hồi thêm +1 HP' },
      2:  { cooked_heal_bonus: 1 },
      3:  { cooked_heal_bonus: 2, bleed_cure_chance: 0.30,
            label: '⚡ Súp nóng: đồ ăn nấu chín 30% cơ hội cầm máu (hết bleed)' },
      4:  { cooked_heal_bonus: 2, bleed_cure_chance: 0.40 },
      5:  { cooked_heal_bonus: 3, bleed_cure_chance: 0.50, poison_reduce_on_eat: true,
            label: '⚡ Nước dùng giải độc: đồ ăn nấu giảm thời gian nhiễm độc -1 ngày' },
      6:  { cooked_heal_bonus: 3, bleed_cure_chance: 0.55, poison_reduce_on_eat: true },
      7:  { cooked_heal_bonus: 3, bleed_cure_chance: 0.60, poison_reduce_on_eat: true,
            overnight_cook_heal: true,
            label: '⚡ Cháo đêm: ngủ ở base sau khi ăn đồ nấu → +2 HP hồi thêm khi dậy' },
      8:  { cooked_heal_bonus: 4, bleed_cure_chance: 0.65, poison_reduce_on_eat: true,
            overnight_cook_heal: true },
      9:  { cooked_heal_bonus: 4, bleed_cure_chance: 0.70, poison_reduce_on_eat: true,
            overnight_cook_heal: true },
      10: { cooked_heal_bonus: 5, bleed_cure_chance: 0.75, poison_reduce_on_eat: true,
            overnight_cook_heal: true, miracle_soup: true,
            label: '🏆 MASTERY: Súp Kỳ Diệu — 1 lần/ngày: nấu bữa đặc biệt (2 AP) hồi 6 HP + xóa mọi debuff' },
    },
  },

  huong_vi_que_huong: {
    id: 'huong_vi_que_huong', name: 'Hương Vị Quê Hương',
    branch: 'gia_vi', branchLabel: '🌿 Gia Vị',
    jobFilter: 'chef', icon: '🌾',
    prereq: [{ skill: 'bun_pho_cuu_nguoi', level: 3 }], maxLevel: 10,
    desc: 'Món ăn Việt làm người ăn nhớ lại cuộc sống trước kia và tìm lại ý chí. Buff AP regen sau bữa ăn.',
    effects: {
      1:  { comfort_food_ap_regen: 0.08, label: 'AP regen +8% trong 4h sau khi ăn đồ nấu Việt' },
      2:  { comfort_food_ap_regen: 0.12 },
      3:  { comfort_food_ap_regen: 0.16, trust_meal_unlock: true,
            label: '⚡ Bữa Tin Tưởng: nấu ăn cho NPC có thể tăng trust thay vì item exchange' },
      4:  { comfort_food_ap_regen: 0.20, trust_meal_unlock: true },
      5:  { comfort_food_ap_regen: 0.25, trust_meal_unlock: true, share_meal_unlock: true,
            label: '⚡ Ăn Chung: chia sẻ bữa ăn nấu chín với NPC → cả 2 nhận buff đầy đủ' },
      6:  { comfort_food_ap_regen: 0.28, trust_meal_unlock: true, share_meal_unlock: true },
      7:  { comfort_food_ap_regen: 0.32, trust_meal_unlock: true, share_meal_unlock: true,
            ap_temp_bonus: true,
            label: '⚡ Ký ức sức mạnh: sau khi ăn món Việt đặc biệt, AP max tạm +1 trong 6h' },
      8:  { comfort_food_ap_regen: 0.35, trust_meal_unlock: true, share_meal_unlock: true,
            ap_temp_bonus: true },
      9:  { comfort_food_ap_regen: 0.38, trust_meal_unlock: true, share_meal_unlock: true,
            ap_temp_bonus: true },
      10: { comfort_food_ap_regen: 0.42, trust_meal_unlock: true, share_meal_unlock: true,
            ap_temp_bonus: true, legend_cook: true,
            label: '🏆 MASTERY: Đầu Bếp Huyền Thoại — 50% survivor ban đầu có thái độ thân thiện với Chef' },
    },
  },

  mam_muoi_du_song: {
    id: 'mam_muoi_du_song', name: 'Mắm Muối Đủ Sống',
    branch: 'gia_vi', branchLabel: '🌿 Gia Vị',
    jobFilter: 'chef', icon: '🫙',
    prereq: [{ skill: 'huong_vi_que_huong', level: 5 }], maxLevel: 10,
    // B3 fix: never_starve chỉ hoạt động khi inBase
    // B3 fix: raw_eat_safe dời sang lv9
    // food_preserve_extra_days: cosmetic/future-use, không có engine hook hiện tại
    desc: 'Kỹ thuật muối ủ kéo dài thực phẩm. Không bao giờ chết đói khi ở base có nguyên liệu thô.',
    effects: {
      1:  { food_preserve_extra_days: 1, label: 'Đồ ăn trong túi hư chậm hơn (cosmetic, future system)' },
      2:  { food_preserve_extra_days: 2 },
      3:  { food_preserve_extra_days: 3, pickle_craft_unlock: true,
            label: '⚡ Muối dưa: craft dưa cải từ rau dại — Hunger +3, không hư 5 ngày' },
      4:  { food_preserve_extra_days: 4, pickle_craft_unlock: true },
      5:  { food_preserve_extra_days: 5, pickle_craft_unlock: true, mam_craft_unlock: true,
            label: '⚡ Làm mắm: nước mắm tự chế — Hunger +2, Stress -8, dùng 10 lần' },
      6:  { food_preserve_extra_days: 6, pickle_craft_unlock: true, mam_craft_unlock: true },
      7:  { food_preserve_extra_days: 7, pickle_craft_unlock: true, mam_craft_unlock: true,
            hunger_slow: 0.15,
            label: '⚡ Cơ thể quen thiếu: hunger decay chậm hơn 15%' },
      8:  { food_preserve_extra_days: 8, pickle_craft_unlock: true, mam_craft_unlock: true,
            hunger_slow: 0.20 },
      9:  { food_preserve_extra_days: 9, pickle_craft_unlock: true, mam_craft_unlock: true,
            hunger_slow: 0.25, raw_eat_safe: true,
            label: '⚡ Quen mùi: ăn đồ ăn thô không gây debuff cho Chef' },
      10: { food_preserve_extra_days: 10, pickle_craft_unlock: true, mam_craft_unlock: true,
            hunger_slow: 0.30, raw_eat_safe: true, never_starve: true,
            label: '🏆 MASTERY: Không Bao Giờ Chết Đói — KHI Ở BASE: hunger về 0 → tự nấu khẩn cấp từ nguyên liệu thô (1 lần/ngày)' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 2: DAO BẾP
  // B9 fix: cơ chế sớm hơn — lv2 có hiệu ứng rõ ràng
  // B6 fix: battle_calm = hit trúng không tăng stress (không còn stress -1)
  // ══════════════════════════════════════════════════════

  ban_tay_toc_do: {
    id: 'ban_tay_toc_do', name: 'Bàn Tay Tốc Độ',
    branch: 'dao_bep', branchLabel: '🔪 Dao Bếp',
    jobFilter: 'chef', icon: '✋',
    prereq: [], maxLevel: 10,
    desc: 'Quen cầm dao từ nhỏ. Tấn công blade nhanh hơn, chính xác hơn. Giảm AP combat khi dùng dao.',
    effects: {
      1:  { blade_hit_bonus: 1, label: 'Dao +1 hit bonus' },
      // B9: lv2 có cơ chế thực sự — không chờ đến lv5
      2:  { blade_hit_bonus: 2, first_strike_bonus: 1,
            label: '⚡ Đòn mở đầu: đòn tấn công đầu tiên mỗi combat +1 damage thêm' },
      3:  { blade_hit_bonus: 2, first_strike_bonus: 1, blade_ap_reduce: 1,
            label: '⚡ Dao bếp -1 AP combat' },
      4:  { blade_hit_bonus: 3, first_strike_bonus: 1, blade_ap_reduce: 1 },
      5:  { blade_hit_bonus: 3, first_strike_bonus: 2, blade_ap_reduce: 1,
            kitchen_knife_mastery: true,
            label: '⚡ Tinh thông dao bếp: kitchen_knife +3 sát thương, không trượt khi đứng yên' },
      6:  { blade_hit_bonus: 4, first_strike_bonus: 2, blade_ap_reduce: 1,
            kitchen_knife_mastery: true },
      7:  { blade_hit_bonus: 4, first_strike_bonus: 2, blade_ap_reduce: 2,
            kitchen_knife_mastery: true, quick_draw_blade: true,
            label: '⚡ Rút dao phản xạ: kẻ thù tấn công khi ngủ → tự động phản đòn trước (1 lần/ngày)' },
      8:  { blade_hit_bonus: 5, first_strike_bonus: 2, blade_ap_reduce: 2,
            kitchen_knife_mastery: true, quick_draw_blade: true },
      9:  { blade_hit_bonus: 5, first_strike_bonus: 3, blade_ap_reduce: 2,
            kitchen_knife_mastery: true, quick_draw_blade: true },
      10: { blade_hit_bonus: 6, first_strike_bonus: 3, blade_ap_reduce: 2,
            kitchen_knife_mastery: true, quick_draw_blade: true, butcher_efficiency: true,
            label: '🏆 MASTERY: Kỹ thuật mổ — khi giết zombie, 35% cơ hội thu được wild_fruit hoặc mushroom từ xác' },
    },
  },

  xu_ly_nguyen_lieu: {
    id: 'xu_ly_nguyen_lieu', name: 'Xử Lý Nguyên Liệu',
    branch: 'dao_bep', branchLabel: '🔪 Dao Bếp',
    jobFilter: 'chef', icon: '🥩',
    prereq: [{ skill: 'ban_tay_toc_do', level: 3 }], maxLevel: 10,
    desc: 'Kỹ năng pha lóc, chặt chém áp dụng vào dọn dẹp sau chiến đấu và tìm kiếm sau combat.',
    effects: {
      1:  { post_kill_loot_bonus: 0.10, label: '+10% cơ hội tìm đồ từ zombie đã giết' },
      2:  { post_kill_loot_bonus: 0.15 },
      3:  { post_kill_loot_bonus: 0.20, boss_loot_bonus: 0.20,
            label: '⚡ Pha lóc boss: loot từ boss +20%' },
      4:  { post_kill_loot_bonus: 0.25, boss_loot_bonus: 0.25 },
      5:  { post_kill_loot_bonus: 0.30, boss_loot_bonus: 0.30, chop_barricade_mat: true,
            label: '⚡ Phá gỗ nhanh: dao chặt cành/ván → tạo wood_fuel (không cần rìu)' },
      6:  { post_kill_loot_bonus: 0.33, boss_loot_bonus: 0.33, chop_barricade_mat: true },
      7:  { post_kill_loot_bonus: 0.36, boss_loot_bonus: 0.36, chop_barricade_mat: true,
            chop_noise_reduce: true,
            label: '⚡ Tay nhẹ: chặt/phá gỗ -50% noise' },
      8:  { post_kill_loot_bonus: 0.40, boss_loot_bonus: 0.40, chop_barricade_mat: true,
            chop_noise_reduce: true },
      9:  { post_kill_loot_bonus: 0.45, boss_loot_bonus: 0.45, chop_barricade_mat: true,
            chop_noise_reduce: true },
      10: { post_kill_loot_bonus: 0.50, boss_loot_bonus: 0.50, chop_barricade_mat: true,
            chop_noise_reduce: true, scavenge_ap_reduce: 1,
            label: '🏆 MASTERY: Đôi Tay Vàng — lục soát -1 AP, bất kỳ tile nào' },
    },
  },

  the_tran_bep_truong: {
    id: 'the_tran_bep_truong', name: 'Thế Trận Bếp Trưởng',
    branch: 'dao_bep', branchLabel: '🔪 Dao Bếp',
    jobFilter: 'chef', icon: '⚔️',
    prereq: [{ skill: 'xu_ly_nguyen_lieu', level: 3 }], maxLevel: 10,
    desc: 'Không gian nhỏ, kẻ thù áp sát — đó là sân nhà của đầu bếp. Phòng thủ tốt hơn trong tile indoor.',
    effects: {
      1:  { indoor_defense_bonus: 0.05, label: 'Phòng thủ trong nhà/phòng +5% giảm damage' },
      2:  { indoor_defense_bonus: 0.10 },
      3:  { indoor_defense_bonus: 0.15, counter_attack_chance: 0.15,
            label: '⚡ Phản đòn: 15% cơ hội khi bị trúng đòn → tự động phản công (không tốn AP)' },
      4:  { indoor_defense_bonus: 0.18, counter_attack_chance: 0.18 },
      5:  { indoor_defense_bonus: 0.20, counter_attack_chance: 0.20, chokepoint_mastery: true,
            label: '⚡ Nút thắt: tile chỉ có 1 zombie → hit chance +20% (lợi thế 1v1)' },
      6:  { indoor_defense_bonus: 0.22, counter_attack_chance: 0.22, chokepoint_mastery: true },
      7:  { indoor_defense_bonus: 0.25, counter_attack_chance: 0.25, chokepoint_mastery: true,
            bleed_on_counter: true,
            label: '⚡ Phản đòn gây Chảy Máu (bleed status)' },
      8:  { indoor_defense_bonus: 0.27, counter_attack_chance: 0.27, chokepoint_mastery: true,
            bleed_on_counter: true },
      9:  { indoor_defense_bonus: 0.30, counter_attack_chance: 0.30, chokepoint_mastery: true,
            bleed_on_counter: true },
      10: { indoor_defense_bonus: 0.33, counter_attack_chance: 0.33, chokepoint_mastery: true,
            bleed_on_counter: true, kitchen_fortress: true,
            label: '🏆 MASTERY: Bếp Pháo Đài — ở base lv≥2: mọi đòn đánh giảm thêm 2 damage' },
    },
  },

  mui_mut_kinh_nghiem: {
    id: 'mui_mut_kinh_nghiem', name: 'Mùi Mực Kinh Nghiệm',
    branch: 'dao_bep', branchLabel: '🔪 Dao Bếp',
    jobFilter: 'chef', icon: '🔥',
    prereq: [{ skill: 'the_tran_bep_truong', level: 3 }], maxLevel: 10,
    // B6 fix: battle_calm = đánh trúng không tăng stress (không phải giảm stress)
    desc: 'Bếp lửa, khói, mùi sốc — đầu bếp quen với áp lực. Kháng fear và giảm stress từ combat.',
    effects: {
      1:  { fear_resist: 0.20, label: 'Kháng fear status 20%' },
      2:  { fear_resist: 0.30 },
      3:  { fear_resist: 0.40, horde_penalty_reduce: 0.20,
            label: '⚡ Không sợ đám đông: penalty chiến zombie_horde giảm 20%' },
      4:  { fear_resist: 0.50, horde_penalty_reduce: 0.25 },
      5:  { fear_resist: 0.60, horde_penalty_reduce: 0.30, smoke_immune: true,
            label: '⚡ Miễn nhiễm khói: smoke grenade không tác dụng với Chef' },
      6:  { fear_resist: 0.65, horde_penalty_reduce: 0.35, smoke_immune: true },
      7:  { fear_resist: 0.70, horde_penalty_reduce: 0.40, smoke_immune: true,
            stress_combat_cap: 6,
            label: '⚡ Bình tĩnh chiến đấu: tối đa +6 stress/ngày từ combat' },
      8:  { fear_resist: 0.75, horde_penalty_reduce: 0.45, smoke_immune: true,
            stress_combat_cap: 5 },
      9:  { fear_resist: 0.80, horde_penalty_reduce: 0.50, smoke_immune: true,
            stress_combat_cap: 4 },
      10: { fear_resist: 1.00, horde_penalty_reduce: 0.55, smoke_immune: true,
            stress_combat_cap: 3, battle_calm: true,
            label: '🏆 MASTERY: Bình Tĩnh Chiến Trường — miễn dịch fear; đánh trúng không tăng stress (thay vì +2/đòn)' },
    },
  },

  dao_tu_ren: {
    id: 'dao_tu_ren', name: 'Dao Tự Rèn',
    branch: 'dao_bep', branchLabel: '🔪 Dao Bếp',
    jobFilter: 'chef', icon: '🗡️',
    prereq: [{ skill: 'mui_mut_kinh_nghiem', level: 5 }], maxLevel: 10,
    desc: 'Đầu bếp tự mài dao — vũ khí không bao giờ cùn. Tự chế dao tier 3 từ phế liệu.',
    effects: {
      1:  { blade_durability_save: 0.15, label: 'Dao mất durability chậm hơn 15%' },
      2:  { blade_durability_save: 0.22 },
      3:  { blade_durability_save: 0.28, sharpen_action_unlock: true,
            label: '⚡ Mài dao: 1 AP + 1 rough_stone → blade weapon hồi +12 durability' },
      4:  { blade_durability_save: 0.34, sharpen_action_unlock: true },
      5:  { blade_durability_save: 0.40, sharpen_action_unlock: true, chef_knife_craft: true,
            label: '⚡ Dao bếp tự chế: craft chef_knife từ metal_scrap + rough_stone + rope_5m' },
      6:  { blade_durability_save: 0.45, sharpen_action_unlock: true, chef_knife_craft: true },
      7:  { blade_durability_save: 0.50, sharpen_action_unlock: true, chef_knife_craft: true,
            blade_never_break: true,
            label: '⚡ Dao không bao giờ hỏng hoàn toàn — khi durability về 1, tự phục hồi về 4 (1 lần/ngày)' },
      8:  { blade_durability_save: 0.55, sharpen_action_unlock: true, chef_knife_craft: true,
            blade_never_break: true },
      9:  { blade_durability_save: 0.60, sharpen_action_unlock: true, chef_knife_craft: true,
            blade_never_break: true },
      10: { blade_durability_save: 0.65, sharpen_action_unlock: true, chef_knife_craft: true,
            blade_never_break: true, heirloom_knife: true,
            label: '🏆 MASTERY: Dao Gia Truyền — chef_knife do Chef tự tạo không bao giờ về 0 durability' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 3: BẾP DÃ CHIẾN
  // B2 fix: cook_mat_save max 0.50, wood_fuel_save max 0.60
  // B7 fix: perfect_nutrition = buff kéo dài x2 (bỏ "cộng dồn x3")
  // B8 fix: ingredient_substitute chỉ cho nguyên liệu cuối thiếu
  // ══════════════════════════════════════════════════════

  bep_lo_da_chien: {
    id: 'bep_lo_da_chien', name: 'Bếp Lò Dã Chiến',
    branch: 'bep_da_chien', branchLabel: '🔥 Bếp Dã Chiến',
    jobFilter: 'chef', icon: '🏕️',
    prereq: [], maxLevel: 10,
    desc: 'Nấu ăn không cần base — chỉ cần củi và nước. Đầu bếp dựng bếp ngay ngoài đường.',
    effects: {
      1:  { field_cook_unlock: true,
            label: 'Mở khóa DW_fieldCook: nấu cơ bản ngoài base (cần wood_fuel + rainwater, 2 AP)' },
      2:  { field_cook_unlock: true, field_cook_ap_reduce: 1, label: 'Nấu dã chiến -1 AP' },
      3:  { field_cook_unlock: true, field_cook_ap_reduce: 1, field_cook_tier: 2,
            label: '⚡ Tier 2: nấu canh chua, cháo cá ngoài trời' },
      4:  { field_cook_unlock: true, field_cook_ap_reduce: 1, field_cook_tier: 2 },
      5:  { field_cook_unlock: true, field_cook_ap_reduce: 2, field_cook_tier: 3,
            smokeless_cook: true,
            label: '⚡ Nấu không khói: bếp dã chiến không tăng noise' },
      6:  { field_cook_unlock: true, field_cook_ap_reduce: 2, field_cook_tier: 3,
            smokeless_cook: true },
      7:  { field_cook_unlock: true, field_cook_ap_reduce: 2, field_cook_tier: 3,
            smokeless_cook: true, rain_cook_ok: true,
            label: '⚡ Nấu được khi trời mưa' },
      8:  { field_cook_unlock: true, field_cook_ap_reduce: 2, field_cook_tier: 3,
            smokeless_cook: true, rain_cook_ok: true },
      9:  { field_cook_unlock: true, field_cook_ap_reduce: 2, field_cook_tier: 3,
            smokeless_cook: true, rain_cook_ok: true },
      10: { field_cook_unlock: true, field_cook_ap_reduce: 3, field_cook_tier: 4,
            smokeless_cook: true, rain_cook_ok: true, any_terrain_cook: true,
            label: '🏆 MASTERY: Bếp Không Bờ — nấu mọi tile mọi thời tiết, không cần wood_fuel' },
    },
  },

  tiet_kiem_nguyen_lieu: {
    id: 'tiet_kiem_nguyen_lieu', name: 'Tiết Kiệm Nguyên Liệu',
    branch: 'bep_da_chien', branchLabel: '🔥 Bếp Dã Chiến',
    jobFilter: 'chef', icon: '♻️',
    prereq: [{ skill: 'bep_lo_da_chien', level: 3 }], maxLevel: 10,
    // B2 fix: max cook_mat_save = 0.50, max wood_fuel_save = 0.60
    // B8 fix: ingredient_substitute chỉ cho 1 nguyên liệu cuối thiếu
    desc: 'Đầu bếp dùng tất cả — không bỏ gì cả. Giữ lại nguyên liệu khi nấu.',
    effects: {
      1:  { cook_mat_save: 0.10, label: '10% cơ hội giữ lại 1 nguyên liệu sau nấu ăn' },
      2:  { cook_mat_save: 0.15 },
      3:  { cook_mat_save: 0.20, wood_fuel_save: 0.25,
            label: '⚡ Tiết kiệm củi: 25% không tốn wood_fuel khi nấu' },
      4:  { cook_mat_save: 0.25, wood_fuel_save: 0.30 },
      5:  { cook_mat_save: 0.30, wood_fuel_save: 0.35, ingredient_substitute: true,
            label: '⚡ Thay thế: nếu thiếu đúng 1 nguyên liệu cuối, có thể thay bằng wild_fruit hoặc mushroom' },
      6:  { cook_mat_save: 0.34, wood_fuel_save: 0.40, ingredient_substitute: true },
      7:  { cook_mat_save: 0.38, wood_fuel_save: 0.44, ingredient_substitute: true,
            cook_byproduct: true,
            label: '⚡ Phụ phẩm: sau mỗi lần nấu, 25% nhận thêm wood_ash hoặc bone_broth' },
      8:  { cook_mat_save: 0.42, wood_fuel_save: 0.48, ingredient_substitute: true,
            cook_byproduct: true },
      9:  { cook_mat_save: 0.46, wood_fuel_save: 0.52, ingredient_substitute: true,
            cook_byproduct: true },
      10: { cook_mat_save: 0.50, wood_fuel_save: 0.60, ingredient_substitute: true,
            cook_byproduct: true, zero_waste_cook: true,
            label: '🏆 MASTERY: Không Bỏ Gì — 50% nấu không tốn nguyên liệu chính; 60% không tốn wood_fuel' },
    },
  },

  cong_thuc_gia_truyen: {
    id: 'cong_thuc_gia_truyen', name: 'Công Thức Gia Truyền',
    branch: 'bep_da_chien', branchLabel: '🔥 Bếp Dã Chiến',
    jobFilter: 'chef', icon: '📜',
    prereq: [{ skill: 'tiet_kiem_nguyen_lieu', level: 3 }], maxLevel: 10,
    desc: 'Mở khóa công thức nấu ăn đặc biệt của người Việt — phở, canh chua, bún bò, chè.',
    effects: {
      1:  { recipe_tier: 1, label: 'Tier 1: cháo cá, rau xào đặc biệt' },
      2:  { recipe_tier: 1, cook_quality_bonus: 0.08 },
      3:  { recipe_tier: 2, cook_quality_bonus: 0.12,
            label: '⚡ Tier 2: canh chua, bún riêu — thêm hiệu ứng HP' },
      4:  { recipe_tier: 2, cook_quality_bonus: 0.16 },
      5:  { recipe_tier: 3, cook_quality_bonus: 0.20, double_portion_unlock: true,
            label: '⚡ Tier 3: phở bò, bún bò Huế + nấu 2 phần 1 lần (AP x1.5)' },
      6:  { recipe_tier: 3, cook_quality_bonus: 0.24, double_portion_unlock: true },
      7:  { recipe_tier: 4, cook_quality_bonus: 0.28, double_portion_unlock: true,
            secret_ingredient_unlock: true,
            label: '⚡ Tier 4 + Gia vị bí mật: tìm gia vị khi lục nhà dân → tăng hiệu quả món ăn' },
      8:  { recipe_tier: 4, cook_quality_bonus: 0.30, double_portion_unlock: true,
            secret_ingredient_unlock: true },
      9:  { recipe_tier: 4, cook_quality_bonus: 0.33, double_portion_unlock: true,
            secret_ingredient_unlock: true },
      10: { recipe_tier: 4, cook_quality_bonus: 0.36, double_portion_unlock: true,
            secret_ingredient_unlock: true, master_recipe: true,
            label: '🏆 MASTERY: Bí Kíp Tối Thượng — mở khóa com_tam và che_ba_mau (2 món độc nhất)' },
    },
  },

  dinh_duong_chien_luoc: {
    id: 'dinh_duong_chien_luoc', name: 'Dinh Dưỡng Chiến Lược',
    branch: 'bep_da_chien', branchLabel: '🔥 Bếp Dã Chiến',
    jobFilter: 'chef', icon: '📊',
    prereq: [{ skill: 'cong_thuc_gia_truyen', level: 3 }], maxLevel: 10,
    // B7 fix: perfect_nutrition = buff kéo dài x2 (không phải cộng dồn x3)
    // Ba loại buff (pre-combat, sleep, recovery) vẫn có nhưng không stack cùng lúc
    desc: 'Nấu đúng loại cho đúng tình huống. Buff có mục tiêu: trước combat, trước ngủ, sau chấn thương.',
    effects: {
      1:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 1,
            label: 'Pre-combat meal: ăn đồ nấu trước combat → +1 hit bonus cho 3 đòn đầu' },
      2:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 2 },
      3:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 2, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 2,
            label: '⚡ Bữa tối: ăn đồ nấu trước ngủ → +2 HP khi dậy' },
      4:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 2, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 3 },
      5:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 3, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 3, recovery_meal_unlock: true, recovery_meal_hp: 3,
            label: '⚡ Bữa phục hồi: ăn đồ nấu khi HP < 40% → bonus +3 HP đặc biệt' },
      6:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 3, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 3, recovery_meal_unlock: true, recovery_meal_hp: 4 },
      7:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 3, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 4, recovery_meal_unlock: true, recovery_meal_hp: 4,
            meal_timing_master: true,
            label: '⚡ Bậc thầy thời điểm: buff bữa ăn kéo dài gấp đôi' },
      8:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 4, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 4, recovery_meal_unlock: true, recovery_meal_hp: 5,
            meal_timing_master: true },
      9:  { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 4, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 5, recovery_meal_unlock: true, recovery_meal_hp: 5,
            meal_timing_master: true },
      10: { pre_combat_meal_unlock: true, pre_combat_meal_bonus: 5, sleep_meal_unlock: true,
            sleep_meal_hp_bonus: 5, recovery_meal_unlock: true, recovery_meal_hp: 6,
            meal_timing_master: true, perfect_nutrition: true,
            label: '🏆 MASTERY: Dinh Dưỡng Hoàn Hảo — mọi buff bữa ăn kéo dài x2; không bị giảm hiệu quả khi ăn liên tiếp' },
    },
  },

  nuoc_mam_huyen_thoai: {
    id: 'nuoc_mam_huyen_thoai', name: 'Nước Mắm Huyền Thoại',
    branch: 'bep_da_chien', branchLabel: '🔥 Bếp Dã Chiến',
    jobFilter: 'chef', icon: '🫙',
    prereq: [{ skill: 'dinh_duong_chien_luoc', level: 5 }], maxLevel: 10,
    desc: 'Kỹ nghệ ủ nước mắm. Không chỉ để ăn — dùng làm mồi nhử, vũ khí mùi, chất bảo quản.',
    effects: {
      1:  { mam_craft_power: 1.15, label: 'Nước mắm tự chế tăng hiệu quả +15%' },
      2:  { mam_craft_power: 1.25 },
      3:  { mam_craft_power: 1.35, mam_bait_unlock: true,
            label: '⚡ Mắm làm mồi: đặt nước mắm → zombie bị kéo vào tile cụ thể (3 lần/lọ)' },
      4:  { mam_craft_power: 1.45, mam_bait_unlock: true },
      5:  { mam_craft_power: 1.55, mam_bait_unlock: true, mam_weapon_unlock: true,
            label: '⚡ Vũ khí mùi: ném nước mắm gây fear cho zombie trong tile (1 lọ + 1 AP)' },
      6:  { mam_craft_power: 1.65, mam_bait_unlock: true, mam_weapon_unlock: true },
      7:  { mam_craft_power: 1.75, mam_bait_unlock: true, mam_weapon_unlock: true,
            mam_preserve_all: true,
            label: '⚡ Nước mắm ngâm: ngâm đồ ăn trong nước mắm → không hư 20 ngày' },
      8:  { mam_craft_power: 1.85, mam_bait_unlock: true, mam_weapon_unlock: true,
            mam_preserve_all: true },
      9:  { mam_craft_power: 1.95, mam_bait_unlock: true, mam_weapon_unlock: true,
            mam_preserve_all: true },
      10: { mam_craft_power: 2.10, mam_bait_unlock: true, mam_weapon_unlock: true,
            mam_preserve_all: true, legendary_mam: true,
            label: '🏆 MASTERY: Nước Mắm Tuyệt Thế — craft nuoc_mam_30_nam (1 lần/game): Hunger+5, Stress-15, HP+2, bleed cure' },
    },
  },

  // ══════════════════════════════════════════════════════
  // SIGNATURE SKILLS (maxLevel:1, unlock qua milestone)
  // B5 fix: recipe_memory chỉ bypass cooking recipes, không bypass all
  // B1 fix: morale_meal x1.5 (không còn x2)
  // ══════════════════════════════════════════════════════

  recipe_memory: {
    id: 'recipe_memory', name: 'Trí Nhớ Công Thức',
    branch: 'signature', branchLabel: '🏅 Signature',
    jobFilter: 'chef', icon: '🧠',
    prereq: [], maxLevel: 1, isSignature: true,
    // B5 fix: chỉ bypass blueprint cho cooking recipes (tag cooked_food)
    // Không bypass tất cả blueprint trong game
    desc: 'Nhớ hết công thức nấu ăn — không cần cookbook để nấu. Unlock qua milestone cook_first_meal (ngày 5+).',
    effects: {
      1: {
        recipe_memory_active: true,
        bypass_cooking_blueprint: true,   // chỉ bypass cooking recipes có tag cooked_food
        auto_identify_ingredients: true,
        label: '🏅 Trí Nhớ Công Thức: không cần blueprint cho công thức nấu ăn; nhận ra nguyên liệu thay thế',
      },
    },
  },

  morale_meal: {
    id: 'morale_meal', name: 'Bữa Ăn Tinh Thần',
    branch: 'signature', branchLabel: '🏅 Signature',
    jobFilter: 'chef', icon: '❤️',
    prereq: [], maxLevel: 1, isSignature: true,
    // B1 fix: x1.5 thay vì x2 — giảm stress tăng thêm 50% từ đồ ăn nấu chín
    // Kết hợp với daily_cook_stress_cap nên tổng vẫn bị giới hạn
    desc: 'Bữa ăn nấu chín giảm stress thêm 50%. Unlock qua milestone cook_feast.',
    effects: {
      1: {
        morale_meal_active: true,
        cooked_stress_multiplier: 1.5,    // B1 fix: 1.5 thay vì 2
        cooked_depression_reduce: 4,
        label: '🏅 Bữa Ăn Tinh Thần: đồ ăn nấu chín giảm stress x1.5; mỗi bữa nấu giảm thêm -4 depression',
      },
    },
  },

  zero_waste: {
    id: 'zero_waste', name: 'Không Bỏ Gì',
    branch: 'signature', branchLabel: '🏅 Signature',
    jobFilter: 'chef', icon: '♻️',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Khi ăn đồ hộp, 30% vỏ hộp → metal_scrap. Unlock qua milestone cook_survivor.',
    effects: {
      1: {
        zero_waste_active: true,
        can_recycle_chance: 0.30,
        food_scrap_reuse: true,
        label: '🏅 Không Bỏ Gì: 30% vỏ đồ hộp → metal_scrap; thức ăn thừa sau nấu → nguyên liệu phụ',
      },
    },
  },

};

// ══════════════════════════════════════════════════════
// CHEF ITEMS — đăng ký vào ITEM_DB
// ══════════════════════════════════════════════════════
(function _registerChefItems() {
  if (typeof ITEM_DB === 'undefined') return;

  const chefItems = {
    chef_knife: {
      id: 'chef_knife', name: 'Dao Bếp Trưởng', icon: '🔪', weight: 0.4,
      type: 'weapon', tier: 3, usable: false, equippable: true, slot: 'weapon',
      tags: ['equip', 'weapon', 'blade', 'chef_weapon'],
      baseDmg: 4, hitBonus: 2, noise: 1, durMax: 60,
      desc: 'Dao tự rèn của đầu bếp. Tier 3 blade, nhẹ, sắc bén, cực ít ồn.',
    },
    cooked_rice: {
      id: 'cooked_rice', name: 'Cơm Trắng', icon: '🍚', weight: 0.4,
      type: 'food', tier: 1, usable: true,
      useEffect: { hunger: 4.0, stress: -8 },
      tags: ['food', 'cooked_food', 'viet_food'],
      desc: 'Cơm trắng nóng. Hunger +4, Stress -8.',
    },
    pho_bo: {
      id: 'pho_bo', name: 'Phở Bò', icon: '🍜', weight: 0.6,
      type: 'food', tier: 3, usable: true,
      useEffect: { hunger: 5.5, thirst: 1.0, stress: -15, hp: 2 },
      tags: ['food', 'cooked_food', 'viet_food', 'signature_dish'],
      desc: 'Phở bò đặc biệt. Hunger +5.5, Thirst +1, Stress -15, HP +2.',
    },
    canh_chua: {
      id: 'canh_chua', name: 'Canh Chua', icon: '🥣', weight: 0.5,
      type: 'food', tier: 2, usable: true,
      useEffect: { hunger: 4.0, thirst: 1.0, stress: -10, hp: 1 },
      tags: ['food', 'cooked_food', 'viet_food'],
      desc: 'Canh chua miền Nam. Hunger +4, Thirst +1, Stress -10, HP +1.',
    },
    bun_bo_hue: {
      id: 'bun_bo_hue', name: 'Bún Bò Huế', icon: '🍜', weight: 0.6,
      type: 'food', tier: 3, usable: true,
      useEffect: { hunger: 5.0, thirst: 1.0, stress: -13, hp: 2 },
      tags: ['food', 'cooked_food', 'viet_food', 'signature_dish'],
      desc: 'Bún bò Huế cay. Hunger +5, Thirst +1, Stress -13, HP +2.',
    },
    // B4 fix: com_tam và che_ba_mau giảm chỉ số
    com_tam: {
      id: 'com_tam', name: 'Cơm Tấm Sườn Nướng', icon: '🍖', weight: 0.6,
      type: 'food', tier: 3, usable: true,
      useEffect: { hunger: 5.5, stress: -8, hp: 1 },
      tags: ['food', 'cooked_food', 'viet_food', 'signature_dish', 'master_recipe'],
      desc: 'Cơm tấm sườn nướng. Hunger +5.5, Stress -8, HP +1. AP max +1 trong 6h. Chỉ Chef master mới nấu được.',
    },
    che_ba_mau: {
      id: 'che_ba_mau', name: 'Chè Ba Màu', icon: '🥤', weight: 0.3,
      type: 'food', tier: 3, usable: true,
      useEffect: { hunger: 2.0, thirst: 2.5, stress: -18, depression: -8 },
      tags: ['food', 'cooked_food', 'viet_food', 'signature_dish', 'master_recipe'],
      desc: 'Chè ba màu ngọt mát. Hunger +2, Thirst +2.5, Stress -18, Depression -8. Chỉ Chef master mới nấu được.',
    },
    chao_ca: {
      id: 'chao_ca', name: 'Cháo Cá', icon: '🍲', weight: 0.5,
      type: 'food', tier: 1, usable: true,
      useEffect: { hunger: 3.5, thirst: 0.5, hp: 2, stress: -7 },
      tags: ['food', 'cooked_food', 'viet_food'],
      desc: 'Cháo cá nóng hổi. Hunger +3.5, HP +2, Stress -7.',
    },
    rau_xao: {
      id: 'rau_xao', name: 'Rau Xào', icon: '🥬', weight: 0.2,
      type: 'food', tier: 1, usable: true,
      useEffect: { hunger: 2.5, stress: -5 },
      tags: ['food', 'cooked_food', 'viet_food'],
      desc: 'Rau dại xào đơn giản. Hunger +2.5, Stress -5.',
    },
    bun_rieu: {
      id: 'bun_rieu', name: 'Bún Riêu', icon: '🥣', weight: 0.5,
      type: 'food', tier: 2, usable: true,
      useEffect: { hunger: 4.5, thirst: 1.0, stress: -12, hp: 1 },
      tags: ['food', 'cooked_food', 'viet_food'],
      desc: 'Bún riêu cua. Hunger +4.5, Thirst +1, Stress -12, HP +1.',
    },
    nuoc_mam_craft: {
      id: 'nuoc_mam_craft', name: 'Nước Mắm Tự Chế', icon: '🫙', weight: 0.3,
      type: 'food', tier: 2, usable: true,
      useEffect: { hunger: 2.0, stress: -8 },
      tags: ['food', 'condiment', 'craft_mat'],
      desc: 'Nước mắm ủ tự chế. Hunger +2, Stress -8. Tăng hiệu quả công thức nấu ăn.',
    },
    // B4 fix: nuoc_mam_30_nam giảm chỉ số — ngang tầm item tier 3 chuẩn, không phải tier 5
    nuoc_mam_30_nam: {
      id: 'nuoc_mam_30_nam', name: 'Nước Mắm 30 Năm', icon: '✨', weight: 0.3,
      type: 'food', tier: 3, usable: true,
      useEffect: { hunger: 5.0, stress: -15, hp: 2, removesStatus: 'bleed' },
      tags: ['food', 'condiment', 'rare'],
      desc: 'Nước mắm ủ lâu năm. Hunger +5, Stress -15, HP +2, cầm máu. Chỉ craft được 1 lần/game.',
    },
    dua_cai_muoi: {
      id: 'dua_cai_muoi', name: 'Dưa Cải Muối', icon: '🥒', weight: 0.3,
      type: 'food', tier: 1, usable: true,
      useEffect: { hunger: 3.0, stress: -4 },
      tags: ['food', 'cooked_food', 'preserved_food'],
      desc: 'Dưa cải muối truyền thống. Hunger +3, Stress -4.',
    },
    bone_broth: {
      id: 'bone_broth', name: 'Nước Dùng Xương', icon: '🍵', weight: 0.4,
      type: 'food', tier: 2, usable: true,
      useEffect: { hunger: 2.0, thirst: 2.0, hp: 3, stress: -4 },
      tags: ['food', 'cooked_food', 'craft_mat'],
      desc: 'Nước dùng từ xương. Hunger +2, Thirst +2, HP +3. Dùng làm nguyên liệu nấu phở.',
    },
    wood_ash: {
      id: 'wood_ash', name: 'Tro Bếp', icon: '⚫', weight: 0.1,
      type: 'material', tier: 0, usable: false,
      tags: ['craft_mat'],
      desc: 'Tro từ bếp củi. Dùng khử trùng hoặc làm bẫy.',
    },
    rough_stone: {
      id: 'rough_stone', name: 'Đá Nhám', icon: '🪨', weight: 0.5,
      type: 'material', tier: 0, usable: false,
      tags: ['craft_mat'],
      desc: 'Đá nhám để mài dao. Cần cho kỹ năng Dao Tự Rèn.',
    },
    wild_herb: {
      id: 'wild_herb', name: 'Rau Thơm Dại', icon: '🌿', weight: 0.1,
      type: 'food', tier: 0, usable: false,
      tags: ['food', 'craft_mat'],
      desc: 'Húng, ngò, kinh giới. Nguyên liệu nấu ăn Việt.',
    },
  };

  for (const [k, v] of Object.entries(chefItems)) {
    if (!ITEM_DB[k]) ITEM_DB[k] = v;
  }
})();

// ══════════════════════════════════════════════════════
// CHEF CRAFT RECIPES — đăng ký vào CRAFT_RECIPES
// ══════════════════════════════════════════════════════
(function _registerChefRecipes() {
  if (typeof CRAFT_RECIPES === 'undefined') return;
  const existingIds = new Set(CRAFT_RECIPES.map(r => r.id));

  const chefRecipes = [
    { id:'cook_com_trang', name:'Nấu Cơm Trắng', icon:'🍚',
      desc:'Cơm trắng cơ bản.',
      ingredients:['wild_fruit','rainwater','wood_fuel'],
      result:'cooked_rice', apCost:2, skillReq:{}, jobFilter:'chef' },
    { id:'cook_rau_xao', name:'Xào Rau Dại', icon:'🥬',
      desc:'Rau dại xào.',
      ingredients:['mushroom','wood_fuel'],
      result:'rau_xao', apCost:1, skillReq:{}, jobFilter:'chef' },
    { id:'cook_chao_ca', name:'Nấu Cháo Cá', icon:'🍲',
      desc:'Cháo cá hồi HP.',
      ingredients:['wild_fruit','rainwater','wood_fuel'],
      result:'chao_ca', apCost:2, skillReq:{}, jobFilter:'chef' },
    { id:'cook_canh_chua', name:'Nấu Canh Chua', icon:'🥣',
      desc:'Canh chua HP + Thirst.',
      ingredients:['wild_fruit','rainwater','mushroom','wood_fuel'],
      result:'canh_chua', apCost:2, skillReq:{}, jobFilter:'chef' },
    { id:'cook_bun_rieu', name:'Nấu Bún Riêu', icon:'🥣',
      desc:'Bún riêu — cần bếp dã chiến tier 2.',
      ingredients:['instant_noodle','rainwater','mushroom','wood_fuel'],
      result:'bun_rieu', apCost:3, skillReq:{}, jobFilter:'chef' },
    { id:'make_dua_muoi', name:'Muối Dưa Cải', icon:'🥒',
      desc:'Dưa cải muối.',
      ingredients:['mushroom','wild_herb'],
      result:'dua_cai_muoi', apCost:2, skillReq:{}, jobFilter:'chef' },
    { id:'brew_bone_broth', name:'Nấu Nước Dùng Xương', icon:'🍵',
      desc:'Nước dùng hồi HP.',
      ingredients:['rainwater','wood_fuel'],
      result:'bone_broth', apCost:2, skillReq:{}, jobFilter:'chef' },
    { id:'make_nuoc_mam', name:'Ủ Nước Mắm Tự Chế', icon:'🫙',
      desc:'Nước mắm tự ủ.',
      ingredients:['rainwater','wild_fruit'],
      result:'nuoc_mam_craft', apCost:3, skillReq:{}, jobFilter:'chef' },
    { id:'craft_chef_knife', name:'Rèn Dao Bếp Trưởng', icon:'🔪',
      desc:'Dao bếp tier 3 blade.',
      ingredients:['metal_scrap','rough_stone','rope_5m'],
      result:'chef_knife', apCost:4, skillReq:{}, jobFilter:'chef' },
    { id:'cook_pho_bo', name:'Nấu Phở Bò', icon:'🍜',
      desc:'Phở bò đặc biệt.',
      ingredients:['bone_broth','instant_noodle','wild_herb','wood_fuel'],
      result:'pho_bo', apCost:3, skillReq:{}, jobFilter:'chef' },
    { id:'cook_bun_bo', name:'Nấu Bún Bò Huế', icon:'🍜',
      desc:'Bún bò Huế cay.',
      ingredients:['bone_broth','instant_noodle','mushroom','wood_fuel'],
      result:'bun_bo_hue', apCost:3, skillReq:{}, jobFilter:'chef' },
    { id:'cook_com_tam', name:'Nấu Cơm Tấm Sườn Nướng', icon:'🍖',
      desc:'Cơm tấm — AP max +1 trong 6h. Chỉ Chef master.',
      ingredients:['cooked_rice','wild_fruit','nuoc_mam_craft','wood_fuel'],
      result:'com_tam', apCost:4, skillReq:{}, jobFilter:'chef' },
    { id:'cook_che_ba_mau', name:'Làm Chè Ba Màu', icon:'🥤',
      desc:'Chè ba màu — xóa Depression. Chỉ Chef master.',
      ingredients:['wild_fruit','rainwater','mushroom','energy_candy'],
      result:'che_ba_mau', apCost:3, skillReq:{}, jobFilter:'chef' },
    { id:'make_legendary_mam', name:'Ủ Nước Mắm 30 Năm', icon:'✨',
      desc:'Nước mắm tuyệt thế — chỉ craft 1 lần/game.',
      ingredients:['nuoc_mam_craft','nuoc_mam_craft','nuoc_mam_craft','wild_herb'],
      result:'nuoc_mam_30_nam', apCost:5, skillReq:{}, jobFilter:'chef', unique:true },
  ];

  for (const r of chefRecipes) {
    if (!existingIds.has(r.id)) { CRAFT_RECIPES.push(r); existingIds.add(r.id); }
  }
})();

// ══════════════════════════════════════════════════════
// CHEF PREREQUISITES
// ══════════════════════════════════════════════════════
(function() {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;
  SKILL_PREREQUISITES.com_nong_tinh_than    = [{ skill:'ngu_vi_giac',           level:3 }];
  SKILL_PREREQUISITES.bun_pho_cuu_nguoi     = [{ skill:'com_nong_tinh_than',    level:3 }];
  SKILL_PREREQUISITES.huong_vi_que_huong    = [{ skill:'bun_pho_cuu_nguoi',     level:3 }];
  SKILL_PREREQUISITES.mam_muoi_du_song      = [{ skill:'huong_vi_que_huong',    level:5 }];
  SKILL_PREREQUISITES.xu_ly_nguyen_lieu     = [{ skill:'ban_tay_toc_do',        level:3 }];
  SKILL_PREREQUISITES.the_tran_bep_truong   = [{ skill:'xu_ly_nguyen_lieu',     level:3 }];
  SKILL_PREREQUISITES.mui_mut_kinh_nghiem   = [{ skill:'the_tran_bep_truong',   level:3 }];
  SKILL_PREREQUISITES.dao_tu_ren            = [{ skill:'mui_mut_kinh_nghiem',   level:5 }];
  SKILL_PREREQUISITES.tiet_kiem_nguyen_lieu = [{ skill:'bep_lo_da_chien',       level:3 }];
  SKILL_PREREQUISITES.cong_thuc_gia_truyen  = [{ skill:'tiet_kiem_nguyen_lieu', level:3 }];
  SKILL_PREREQUISITES.dinh_duong_chien_luoc = [{ skill:'cong_thuc_gia_truyen',  level:3 }];
  SKILL_PREREQUISITES.nuoc_mam_huyen_thoai  = [{ skill:'dinh_duong_chien_luoc',level:5 }];
})();

// ══════════════════════════════════════════════════════
// CHEF MILESTONE HINTS + MILESTONE FIX (B5: ngày 5+)
// ══════════════════════════════════════════════════════
var CHEF_SIGNATURE_HINTS = {
  cook_first_meal: {
    hint_50:  'Lần đầu tiên mùi khói bếp bay lên. Mùi quen lạ — như thể thế giới này vẫn còn một phần bình thường.',
    hint_80:  'Tay anh tự động thái, tự động đảo. Không cần nghĩ — cơ thể nhớ hết từ trước khi mọi thứ vỡ ra.',
    hint_100: 'Bát cháo đầu tiên. Không phải vì ngon — vì trong khói bếp đó, anh nhớ lại mình là ai. 🏅 Trí Nhớ Công Thức mở khóa.',
    unlock_skill: 'recipe_memory', unlock_label: 'Trí Nhớ Công Thức',
  },
  cook_feast: {
    hint_50:  'Người phụ nữ già nhìn anh nấu, không nói gì. Nhưng mắt bà ướt.',
    hint_80:  'Ba người. Bốn người. Họ ngồi xung quanh bếp lửa không nói chuyện — chỉ ăn. Đủ rồi.',
    hint_100: 'Cái anh làm hôm nay nuôi sống nhiều hơn một người. 🏅 Bữa Ăn Tinh Thần mở khóa.',
    unlock_skill: 'morale_meal', unlock_label: 'Bữa Ăn Tinh Thần',
  },
  cook_survivor: {
    hint_50:  'Hai mươi ngày. Anh chưa để đói một lần — không phải may mắn. Là kỹ năng.',
    hint_80:  'Hộp thiếc rỗng được anh rửa sạch cất đi. Không bỏ gì cả.',
    hint_100: 'Nghề không bao giờ phản người. 🏅 Không Bỏ Gì mở khóa.',
    unlock_skill: 'zero_waste', unlock_label: 'Không Bỏ Gì',
  },
};

(function() {
  if (typeof MILESTONE_DEFS === 'undefined') return;

  // B5 fix: cook_first_meal yêu cầu ngày 5+ để unlock recipe_memory
  if (MILESTONE_DEFS.cook_first_meal) {
    const orig = MILESTONE_DEFS.cook_first_meal.condition;
    MILESTONE_DEFS.cook_first_meal.condition = s =>
      s.day >= 5 && orig(s);
    MILESTONE_DEFS.cook_first_meal.hints = CHEF_SIGNATURE_HINTS.cook_first_meal;
  }
  if (MILESTONE_DEFS.cook_feast)
    MILESTONE_DEFS.cook_feast.hints = CHEF_SIGNATURE_HINTS.cook_feast;
  if (MILESTONE_DEFS.cook_survivor)
    MILESTONE_DEFS.cook_survivor.hints = CHEF_SIGNATURE_HINTS.cook_survivor;
})();

// ══════════════════════════════════════════════════════
// CHEF SYNERGIES
// ══════════════════════════════════════════════════════
(function() {
  if (typeof SKILL_SYNERGIES === 'undefined') return;
  SKILL_SYNERGIES.push(
    {
      id: 'bep_chien_binh',
      name: 'Bếp Chiến Binh',
      desc: 'Gia Vị + Dao Bếp: pre-combat meal thêm +1 hit bonus (tổng +cấp skill).',
      jobFilter: 'chef',
      requires: [
        { skill:'com_nong_tinh_than', level:3 },
        { skill:'ban_tay_toc_do',     level:5 },
      ],
      effect: { synergy_prebattle_meal: true },
    },
    {
      id: 'nuoc_duong_che_tao',
      name: 'Nguồn Dưỡng Sức',
      desc: 'Bếp Dã Chiến + Gia Vị: nấu ngoài trời không cần wood_fuel khi ngũ vị giác lv5+.',
      jobFilter: 'chef',
      requires: [
        { skill:'ngu_vi_giac',    level:5 },
        { skill:'bep_lo_da_chien', level:5 },
      ],
      effect: { field_cook_no_fuel: true },
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
  DW_ROLE_TREES['chef'] = CHEF_SKILL_TREE;

  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(CHEF_SKILL_TREE)) {
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

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — COMBAT
// ══════════════════════════════════════════════════════

(function() {
  if (typeof DW_fight !== 'function') {
    console.error('[Chef Patch Combat] DW_fight chưa load. Kiểm tra load order.');
    return;
  }

  const _origFight = DW_fight;

  DW_fight = function(state, objId, opts) {
    if (state.job !== 'chef') return _origFight(state, objId, opts);

    const tileKey  = `${state.x},${state.y}`;
    const boss     = state.activeBosses?.[tileKey];
    const weapDef  = state.equip?.weapon ? (EQUIP_DEFS?.[state.equip.weapon] || null) : null;
    const isBlade  = !!(weapDef?.type === 'blade' || weapDef?.tags?.includes('blade'));

    // ── 1. fear_resist — cancel fear trước khi vào combat ──
    let patchedState = state;
    const fearResist = DW_getSkillEffect(state, 'mui_mut_kinh_nghiem', 'fear_resist') || 0;
    if (fearResist > 0 && (state.statuses || []).includes('fear') && Math.random() < fearResist) {
      const newStatuses = (state.statuses || []).filter(x => x !== 'fear');
      patchedState = { ...patchedState, statuses: newStatuses };
    }

    // ── 2. blade_ap_reduce — bù AP trước khi engine gốc trừ ──
    const bladeApReduce = isBlade
      ? (DW_getSkillEffect(state, 'ban_tay_toc_do', 'blade_ap_reduce') || 0)
      : 0;
    const tempState = bladeApReduce > 0
      ? { ...patchedState, ap: patchedState.ap + bladeApReduce }
      : patchedState;

    // ── 3. Tổng hợp opts ──────────────────────────────────
    const finalOpts = { ...opts };

    // blade_hit_bonus (ban_tay_toc_do)
    if (isBlade) {
      const bladeHit = DW_getSkillEffect(state, 'ban_tay_toc_do', 'blade_hit_bonus') || 0;
      if (bladeHit > 0) finalOpts.hitBonusExtra = (finalOpts.hitBonusExtra || 0) + bladeHit;
    }

    // first_strike_bonus — đòn đầu tiên của combat này
    if (!state.combatHitCountToday || state.combatHitCountToday === 0) {
      const firstStrike = isBlade
        ? (DW_getSkillEffect(state, 'ban_tay_toc_do', 'first_strike_bonus') || 0)
        : 0;
      if (firstStrike > 0) finalOpts.dmgBonusOnce = (finalOpts.dmgBonusOnce || 0) + firstStrike;
    }

    // kitchen_knife_mastery
    if (DW_getSkillEffect(state, 'ban_tay_toc_do', 'kitchen_knife_mastery')
        && state.equip?.weapon === 'chef_knife') {
      finalOpts.hitBonusExtra = (finalOpts.hitBonusExtra || 0) + 3;
    }

    // pre_combat_meal_bonus
    if (state.preCombatMealActive) {
      const pmBonus = DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'pre_combat_meal_bonus') || 0;
      if (pmBonus > 0) finalOpts.hitBonusExtra = (finalOpts.hitBonusExtra || 0) + pmBonus;
    }

    // chokepoint_mastery — 1v1
    if (DW_getSkillEffect(state, 'the_tran_bep_truong', 'chokepoint_mastery')) {
      const tile       = state.tiles?.[tileKey];
      const enemyCnt   = (tile?.objects || []).filter(
        o => OBJECT_DEFS?.[o.type]?.type === 'enemy' && o.alive !== false
      ).length + (boss ? 1 : 0);
      if (enemyCnt <= 1) finalOpts.hitBonusExtra = (finalOpts.hitBonusExtra || 0) + 4;
    }

    // ── 4. Chạy engine gốc ────────────────────────────────
    const result = _origFight(tempState, objId, finalOpts);
    if (!result.ok) return result;

    let s = result.state;

    // ── 5. indoor_defense_bonus — undo damage khi bị trúng ──
    if (!result.hit && s.hp > 0) {
      const tile = state.tiles?.[tileKey];
      const INDOOR = new Set(['apartment','store','hospital','police','warehouse','factory','bunker','school']);
      if (INDOOR.has(tile?.type)) {
        const indoorDef = DW_getSkillEffect(state, 'the_tran_bep_truong', 'indoor_defense_bonus') || 0;
        const inBase    = state.base?.tileKey === tileKey;
        const baseLvl   = inBase ? (state.base?.level || 0) : 0;
        const fortress  = (DW_getSkillEffect(state, 'the_tran_bep_truong', 'kitchen_fortress') && baseLvl >= 2) ? 2 : 0;
        const enemy     = boss ? BOSS_DEFS?.[boss.id] : (OBJECT_DEFS?.[
          (tile?.objects || []).find(o => o.id === objId)?.type
        ]);
        const rawDmg    = enemy?.damage || 1;
        const reduceDmg = Math.floor(rawDmg * indoorDef) + fortress;
        if (reduceDmg > 0) {
          s = { ...s, hp: Math.min(state.hp, s.hp + reduceDmg) };
          s.log = [`🔪 Thế Trận Bếp Trưởng: giảm ${reduceDmg} damage.`, ...(s.log || [])];
        }
      }
    }

    // ── 6. counter_attack_chance — khi bị trúng ──────────
    if (!result.hit && s.hp > 0 && !boss) {
      const counterChance = DW_getSkillEffect(state, 'the_tran_bep_truong', 'counter_attack_chance') || 0;
      if (counterChance > 0 && Math.random() < counterChance) {
        const cDmg        = Math.max(1, Math.ceil((weapDef?.baseDmg || 1) * 0.5));
        const bleedOnCtr  = DW_getSkillEffect(state, 'the_tran_bep_truong', 'bleed_on_counter');
        const tileRef     = s.tiles?.[tileKey];
        if (tileRef) {
          const objIdx = (tileRef.objects || []).findIndex(o => o.id === objId);
          if (objIdx !== -1) {
            const objCopy  = { ...tileRef.objects[objIdx] };
            const objDef   = OBJECT_DEFS?.[objCopy.type];
            objCopy.hp     = Math.max(0, (objCopy.hp ?? objDef?.hp ?? 3) - cDmg);
            const newObjs  = [...tileRef.objects];
            if (objCopy.hp <= 0) {
              newObjs[objIdx] = { ...objCopy, alive: false };
              if (typeof DW_grantCharacterXp === 'function')
                s = DW_grantCharacterXp(s, 'kill_zombie');
            } else {
              newObjs[objIdx] = objCopy;
            }
            s = { ...s, tiles: { ...s.tiles, [tileKey]: { ...tileRef, objects: newObjs } } };
            if (bleedOnCtr && typeof DW_addStatus === 'function') s = DW_addStatus(s, 'bleed');
            s.log = [
              `⚡ Phản Đòn! +${cDmg} damage${bleedOnCtr ? ' + Chảy Máu!' : ''}`,
              ...(s.log || [])
            ];
          }
        }
      }
    }

    // ── 7. stress_combat_cap — B1: cap chặt hơn ──────────
    const stressCap = DW_getSkillEffect(state, 'mui_mut_kinh_nghiem', 'stress_combat_cap') || 0;
    if (stressCap > 0) {
      const stressToday = s.combatStressToday || 0;
      const stressDiff  = Math.max(0, s.stress - state.stress);
      if (stressDiff > 0) {
        if (stressToday >= stressCap) {
          // Đã đạt cap — rollback toàn bộ stress gain từ lần này
          s = { ...s, stress: state.stress + (s.stress - state.stress > 0 ? 0 : s.stress - state.stress) };
          s = { ...s, stress: state.stress };
        } else if (stressToday + stressDiff > stressCap) {
          const allowed = stressCap - stressToday;
          s = { ...s, stress: state.stress + allowed, combatStressToday: stressCap };
        } else {
          s = { ...s, combatStressToday: stressToday + stressDiff };
        }
      }
    }

    // ── 8. battle_calm mastery — B6 fix: đánh trúng = không tăng stress ──
    // Không còn giảm stress -1 mỗi hit — chỉ cancel stress gain từ lần hit này
    const battleCalm = DW_getSkillEffect(state, 'mui_mut_kinh_nghiem', 'battle_calm');
    if (battleCalm && result.hit) {
      // Nếu stress tăng sau hit (hiếm nhưng có thể xảy ra) → hoàn lại
      if (s.stress > state.stress) {
        s = { ...s, stress: state.stress };
      }
      // Không giảm stress xuống dưới state ban đầu
    }

    // ── 9. butcher_efficiency — T1 fix: wild_fruit/mushroom ──
    const butcherEff = DW_getSkillEffect(state, 'ban_tay_toc_do', 'butcher_efficiency');
    if (butcherEff) {
      const tileRef     = s.tiles?.[tileKey];
      const justKilled  = (tileRef?.objects || []).some(o => o.id === objId && o.alive === false);
      if (justKilled && Math.random() < 0.35) {
        const loot = Math.random() < 0.5 ? 'wild_fruit' : 'mushroom';
        if (ITEM_DB?.[loot] && (s.inventory || []).length < 20) {
          s = { ...s, inventory: [...(s.inventory || []), loot] };
          s.log = [
            `🔪 Kỹ thuật mổ: thu được ${DW_itemName ? DW_itemName(loot) : loot} từ xác zombie!`,
            ...(s.log || [])
          ];
        }
      }
    }

    // ── 10. Reset preCombatMeal sau khi dùng hit ──────────
    if (state.preCombatMealActive) {
      const hits = Math.max(0, (s.preCombatMealHits || 0) - 1);
      s = { ...s,
        preCombatMealHits: hits,
        preCombatMealActive: hits > 0,
        combatHitCountToday: (s.combatHitCountToday || 0) + 1,
      };
    } else {
      s = { ...s, combatHitCountToday: (s.combatHitCountToday || 0) + 1 };
    }

    return { ...result, state: s };
  };

  // ── quick_draw_blade — auto-counter khi bị interrupt khi ngủ ──
  if (typeof DW_sleep === 'function') {
    const _origSleep = DW_sleep;
    DW_sleep = function(state) {
      const result = _origSleep(state);
      if (!result.ok || state.job !== 'chef') return result;

      let s = result.state;
      if (result.interrupted && !state.quickDrawUsedToday) {
        const qDraw   = DW_getSkillEffect(state, 'ban_tay_toc_do', 'quick_draw_blade');
        const weapDef = state.equip?.weapon ? (EQUIP_DEFS?.[state.equip.weapon] || null) : null;
        const isBlade = !!(weapDef?.type === 'blade' || weapDef?.tags?.includes('blade'));
        if (qDraw && isBlade) {
          const cDmg = weapDef.baseDmg || 1;
          s = {
            ...s,
            quickDrawUsedToday: true,
            log: [
              `⚡ Rút Dao Phản Xạ! Phản công ${cDmg} damage trước khi bị tấn công!`,
              ...(s.log || [])
            ],
          };
        }
      }
      return { ...result, state: s };
    };
  }

})();

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — SURVIVAL & FIELD COOK
// ══════════════════════════════════════════════════════

(function() {
  if (typeof DW_sleep !== 'function') {
    console.error('[Chef Patch Survival] DW_sleep chưa load. Kiểm tra load order.');
    return;
  }

  // ── Wrap DW_sleep ──────────────────────────────────────
  const _origSleep = DW_sleep;

  DW_sleep = function(state) {
    const result = _origSleep(state);
    if (!result.ok || state.job !== 'chef') return result;

    let s    = result.state;
    const msgs = [];
    const tileKey = `${state.x},${state.y}`;
    const inBase  = state.base?.tileKey === tileKey;

    // sleep_meal_hp_bonus: ăn đồ nấu trước ngủ → HP hồi thêm khi dậy
    if (state.ateSleepMeal) {
      const sleepHp = DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'sleep_meal_hp_bonus') || 0;
      if (sleepHp > 0) {
        s = { ...s, hp: Math.min(s.maxHp, s.hp + sleepHp), ateSleepMeal: false };
        msgs.push(`🍚 Bữa tối: HP +${sleepHp} thêm khi thức dậy.`);
      }
    }

    // overnight_cook_heal: ngủ ở BASE sau khi ăn đồ nấu → +2 HP (B3: chỉ inBase)
    const overnightHeal = DW_getSkillEffect(state, 'bun_pho_cuu_nguoi', 'overnight_cook_heal');
    if (overnightHeal && inBase && state.ateCookedFoodToday) {
      s = { ...s, hp: Math.min(s.maxHp, s.hp + 2) };
      msgs.push('🍜 Cháo đêm: HP +2 thêm (ngủ ở base).');
    }

    // Reset daily trackers sau mỗi lần ngủ
    s = {
      ...s,
      ateCookedFoodToday:  false,
      ateSleepMeal:        false,
      combatStressToday:   0,
      combatHitCountToday: 0,
      quickDrawUsedToday:  false,
      hungerOkToday:       false,
      poisonReducedToday:  false,
      dailyCookStressUsed: 0,
    };

    if (msgs.length > 0) s.log = [...msgs, ...(s.log || [])];
    return { ...result, state: s };
  };

  // ══════════════════════════════════════════════════════
  // DW_fieldCook — nấu ăn dã chiến (không cần base)
  // T2 fix: var thay vì window
  // B8: ingredient_substitute chỉ áp cho nguyên liệu cuối thiếu
  // ══════════════════════════════════════════════════════
  var DW_fieldCook = function(state, recipeId) {
    if (state.job !== 'chef') {
      return { state, ok: false, msg: 'Chỉ Đầu Bếp mới có thể nấu dã chiến.' };
    }

    if (!DW_getSkillEffect(state, 'bep_lo_da_chien', 'field_cook_unlock')) {
      return { state, ok: false, msg: 'Cần Bếp Lò Dã Chiến lv1+ để nấu ngoài base.' };
    }

    // Kiểm tra thời tiết
    const rainCookOk = DW_getSkillEffect(state, 'bep_lo_da_chien', 'rain_cook_ok');
    if (state.weather === 'rain' && !rainCookOk) {
      return { state, ok: false, msg: 'Trời mưa không nấu được ngoài trời. Cần Bếp Lò Dã Chiến lv7+.' };
    }

    const recipe = (typeof CRAFT_RECIPES !== 'undefined' ? CRAFT_RECIPES : [])
      .find(r => r.id === recipeId);
    if (!recipe) return { state, ok: false, msg: `Không có công thức: ${recipeId}` };

    const resultItemDef = ITEM_DB?.[recipe.result];
    const isCooking = resultItemDef?.tags?.includes('cooked_food')
      || resultItemDef?.tags?.includes('food')
      || resultItemDef?.type === 'food';
    if (!isCooking) {
      return { state, ok: false, msg: 'DW_fieldCook chỉ dùng cho công thức nấu ăn.' };
    }

    // AP cost
    const apReduce = DW_getSkillEffect(state, 'bep_lo_da_chien', 'field_cook_ap_reduce') || 0;
    const apCost   = Math.max(1, (recipe.apCost || 2) - apReduce);
    if (state.ap < apCost) return { state, ok: false, msg: `Cần ${apCost} ĐHĐ để nấu.` };

    // Kiểm tra wood_fuel
    const anyTerrainCook = DW_getSkillEffect(state, 'bep_lo_da_chien', 'any_terrain_cook');
    const synergyNoFuel  = (state.unlockedSynergies || []).includes('nuoc_duong_che_tao');
    const needFuel = !anyTerrainCook && !synergyNoFuel;
    if (needFuel && !(state.inventory || []).includes('wood_fuel')) {
      return { state, ok: false, msg: 'Cần củi đốt (wood_fuel) để nấu dã chiến.' };
    }

    // Kiểm tra và tiêu nguyên liệu
    let inv = [...(state.inventory || [])];
    const matSave    = DW_getSkillEffect(state, 'tiet_kiem_nguyen_lieu', 'cook_mat_save') || 0;
    const canSub     = DW_getSkillEffect(state, 'tiet_kiem_nguyen_lieu', 'ingredient_substitute');

    // B8 fix: ingredient_substitute chỉ cho đúng 1 nguyên liệu còn thiếu cuối cùng
    let substitutesUsed = 0;

    for (const ingId of recipe.ingredients) {
      if (ingId === 'wood_fuel') continue; // xử lý riêng bên dưới
      const idx = inv.indexOf(ingId);
      if (idx === -1) {
        // B8: chỉ được substitute 1 lần, và chỉ cho nguyên liệu thực sự thiếu
        if (canSub && substitutesUsed === 0) {
          const subIdx = inv.indexOf('wild_fruit') !== -1
            ? inv.indexOf('wild_fruit')
            : inv.indexOf('mushroom');
          if (subIdx !== -1) {
            inv.splice(subIdx, 1);
            substitutesUsed++;
            continue;
          }
        }
        return { state, ok: false, msg: `Thiếu nguyên liệu: ${DW_itemName ? DW_itemName(ingId) : ingId}.`, missingItem: ingId };
      }
      if (!(matSave > 0 && Math.random() < matSave)) {
        inv.splice(idx, 1);
      }
    }

    // Tiêu wood_fuel
    if (needFuel) {
      const woodSave = DW_getSkillEffect(state, 'tiet_kiem_nguyen_lieu', 'wood_fuel_save') || 0;
      if (!(woodSave > 0 && Math.random() < woodSave)) {
        const fi = inv.indexOf('wood_fuel');
        if (fi !== -1) inv.splice(fi, 1);
      }
    }

    // Thêm kết quả
    inv.push(recipe.result);

    // cook_byproduct: 25% nhận thêm phụ phẩm
    let byMsg = '';
    if (DW_getSkillEffect(state, 'tiet_kiem_nguyen_lieu', 'cook_byproduct') && Math.random() < 0.25) {
      const byProds = ['wood_ash', 'bone_broth'];
      const picked  = byProds[Math.floor(Math.random() * byProds.length)];
      if (inv.length < 20 && ITEM_DB?.[picked]) {
        inv.push(picked);
        byMsg = ` + phụ phẩm: ${DW_itemName ? DW_itemName(picked) : picked}`;
      }
    }

    // Noise — smokeless_cook = không tốn noise
    const noiseAdd = DW_getSkillEffect(state, 'bep_lo_da_chien', 'smokeless_cook') ? 0 : 2;

    let s = {
      ...state,
      inventory: inv,
      ap: state.ap - apCost,
      noise: Math.min(10, (state.noise || 0) + noiseAdd),
      ateCookedFoodToday: state.ateCookedFoodToday,
    };

    // Milestone tracking
    if (typeof DW_checkMilestone === 'function') {
      s = { ...s, milestones: { ...(s.milestones || {}), cooked_first_meal: true } };
      s = DW_checkMilestone(s, 'cook_first_meal');
    }

    if (typeof DW_grantCharacterXp === 'function') s = DW_grantCharacterXp(s, 'craft');

    s.log = [
      `🔥 Nấu dã chiến: ${recipe.name} → ${DW_itemName ? DW_itemName(recipe.result) : recipe.result}${byMsg}.`,
      ...(s.log || [])
    ];

    return { state: s, ok: true, msg: `Nấu xong: ${DW_itemName ? DW_itemName(recipe.result) : recipe.result}.` };
  };

  // Expose ra ngoài để UI gọi được
  if (typeof window !== 'undefined') window.DW_fieldCook = DW_fieldCook;

})();

// ══════════════════════════════════════════════════════
// ENGINE PATCHES — INVENTORY & USE ITEM
// ══════════════════════════════════════════════════════

(function() {
  if (typeof DW_useItem !== 'function') {
    console.error('[Chef Patch Inventory] DW_useItem chưa load. Kiểm tra load order.');
    return;
  }

  // ══════════════════════════════════════════════════════
  // Wrap DW_useItem
  // ══════════════════════════════════════════════════════
  const _origUseItem = DW_useItem;

  DW_useItem = function(state, itemId) {
    const result = _origUseItem(state, itemId);
    if (!result.ok || state.job !== 'chef') return result;

    const itemDef     = ITEM_DB?.[itemId];
    if (!itemDef) return result;

    const isCookedFood = !!(itemDef.tags?.includes('cooked_food'));
    const isVietFood   = !!(itemDef.tags?.includes('viet_food'));

    let s    = result.state;
    const msgs = [];

    if (isCookedFood) {
      // ── cooked_stress_bonus (com_nong_tinh_than) ──────
      let extraStress = DW_getSkillEffect(state, 'com_nong_tinh_than', 'cooked_stress_bonus') || 0;

      // morale_meal signature — B1 fix: x1.5
      const moraleMealActive = DW_hasSignatureSkill(state, 'morale_meal');
      if (moraleMealActive && itemDef.useEffect?.stress < 0) {
        const baseMult = DW_getSkillEffect(state, 'morale_meal', 'cooked_stress_multiplier') || 1.5;
        const baseAbs  = Math.abs(itemDef.useEffect.stress);
        extraStress += Math.floor(baseAbs * (baseMult - 1));
      }

      // B1 fix: enforce daily_cook_stress_cap
      if (extraStress > 0) {
        const cap    = DW_getSkillEffect(state, 'com_nong_tinh_than', 'daily_cook_stress_cap') || 0;
        const used   = s.dailyCookStressUsed || 0;
        if (cap > 0 && used >= cap) {
          extraStress = 0; // cap đã đạt, không giảm thêm
        } else if (cap > 0 && used + extraStress > cap) {
          extraStress = cap - used;
        }
        if (extraStress > 0) {
          s = { ...s,
            stress: Math.max(0, s.stress - extraStress),
            dailyCookStressUsed: (s.dailyCookStressUsed || 0) + extraStress,
          };
          msgs.push(`🌿 Gia vị tâm hồn: Stress -${extraStress} thêm`);
        }
      }

      // morale_meal depression reduce
      if (moraleMealActive) {
        const depReduce = DW_getSkillEffect(state, 'morale_meal', 'cooked_depression_reduce') || 0;
        if (depReduce > 0) {
          s = { ...s, depression: Math.max(0, (s.depression || 0) - depReduce) };
          msgs.push(`❤️ Bữa Ăn Tinh Thần: Depression -${depReduce}`);
        }
      }

      // depression_resist — set flag cho ngày hiện tại
      const depResist = DW_getSkillEffect(state, 'com_nong_tinh_than', 'depression_resist') || 0;
      if (depResist > 0) s = { ...s, chefDepResistUntilDay: (state.day || 1) + 1 };

      // groggy_cure_on_eat
      if (DW_getSkillEffect(state, 'com_nong_tinh_than', 'groggy_cure_on_eat')
          && (s.statuses || []).includes('groggy')) {
        s = typeof DW_removeStatus === 'function'
          ? DW_removeStatus(s, 'groggy')
          : { ...s, statuses: (s.statuses || []).filter(x => x !== 'groggy') };
        msgs.push('🍳 Cơm Nóng: hết Groggy!');
      }

      // feast_mode mastery (1 lần/ngày)
      if (DW_getSkillEffect(state, 'com_nong_tinh_than', 'feast_mode')
          && state.stress > 60
          && !state.feastModeUsedToday) {
        s = { ...s, hp: Math.min(s.maxHp, s.hp + 3), feastModeUsedToday: true };
        if ((s.statuses || []).length > 0) {
          const randS = s.statuses[Math.floor(Math.random() * s.statuses.length)];
          s = typeof DW_removeStatus === 'function'
            ? DW_removeStatus(s, randS)
            : { ...s, statuses: s.statuses.filter(x => x !== randS) };
          msgs.push(`🍽️ Bữa Tiệc: HP +3, xóa ${randS}`);
        } else {
          msgs.push('🍽️ Bữa Tiệc: HP +3');
        }
      }

      // recovery_meal_unlock (HP thấp)
      if (DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'recovery_meal_unlock')) {
        const recHp = DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'recovery_meal_hp') || 0;
        if (recHp > 0 && state.hp < (state.maxHp || 20) * 0.4) {
          s = { ...s, hp: Math.min(s.maxHp, s.hp + recHp) };
          msgs.push(`💊 Bữa Phục Hồi: HP +${recHp}`);
        }
      }

      // cooked_heal_bonus (bun_pho_cuu_nguoi)
      const healBonus = DW_getSkillEffect(state, 'bun_pho_cuu_nguoi', 'cooked_heal_bonus') || 0;
      if (healBonus > 0) {
        s = { ...s, hp: Math.min(s.maxHp, s.hp + healBonus) };
        msgs.push(`🍜 Súp Dưỡng Thể: HP +${healBonus}`);
      }

      // bleed cure on eat
      const bleedChance = DW_getSkillEffect(state, 'bun_pho_cuu_nguoi', 'bleed_cure_chance') || 0;
      if (bleedChance > 0 && (s.statuses || []).includes('bleed') && Math.random() < bleedChance) {
        s = typeof DW_removeStatus === 'function'
          ? DW_removeStatus(s, 'bleed')
          : { ...s, statuses: (s.statuses || []).filter(x => x !== 'bleed') };
        msgs.push('🍲 Nước súp nóng cầm máu!');
      }

      // poison reduce on eat
      if (DW_getSkillEffect(state, 'bun_pho_cuu_nguoi', 'poison_reduce_on_eat')
          && (s.statuses || []).includes('poison')) {
        s = { ...s, poisonReducedToday: true };
        msgs.push('🍵 Nước dùng giải độc: giảm thời gian nhiễm độc.');
      }

      // miracle_soup mastery (1 lần/ngày, nấu từ DW_fieldCook hoặc DW_craft với flag)
      if (DW_getSkillEffect(state, 'bun_pho_cuu_nguoi', 'miracle_soup')
          && state.activatingMiracleSoup
          && !state.miracleSoupUsedToday) {
        s = { ...s,
          hp: Math.min(s.maxHp, s.hp + 6),
          miracleSoupUsedToday: true,
          statuses: [],
        };
        msgs.push('🌟 Súp Kỳ Diệu: HP +6, xóa mọi debuff!');
      }

      // ateCookedFoodToday flag (cho overnight_cook_heal)
      s = { ...s, ateCookedFoodToday: true };

      // Milestone cook_feast
      if (typeof DW_checkMilestone === 'function' && state.refugeePresent) {
        s = { ...s, milestones: { ...(s.milestones || {}), cooked_feast_progress: true } };
        s = DW_checkMilestone(s, 'cook_feast');
      }
    }

    // ── pre_combat_meal flag ──────────────────────────────
    if (isCookedFood && DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'pre_combat_meal_unlock')) {
      const pmBonus = DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'pre_combat_meal_bonus') || 0;
      if (pmBonus > 0) {
        // B7 fix: perfect_nutrition = buff kéo dài x2 → hits x2 (6 thay vì 3)
        const masterTiming = DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'meal_timing_master');
        const perfectNutr  = DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'perfect_nutrition');
        const hits = perfectNutr ? 6 : (masterTiming ? 6 : 3);
        s = { ...s, preCombatMealActive: true, preCombatMealHits: hits };
        msgs.push(`⚔️ Pre-combat meal: +${pmBonus} hit bonus cho ${hits} đòn tới.`);
      }
    }

    // ── sleep_meal flag ───────────────────────────────────
    if (isCookedFood && DW_getSkillEffect(state, 'dinh_duong_chien_luoc', 'sleep_meal_unlock')) {
      s = { ...s, ateSleepMeal: true };
    }

    // ── zero_waste signature ──────────────────────────────
    if (DW_hasSignatureSkill(state, 'zero_waste')) {
      const canRecycle = DW_getSkillEffect(state, 'zero_waste', 'can_recycle_chance') || 0;
      if ((itemId.includes('canned') || itemId === 'canned_food') && Math.random() < canRecycle) {
        if ((s.inventory || []).length < 20 && ITEM_DB?.['metal_scrap']) {
          s = { ...s, inventory: [...(s.inventory || []), 'metal_scrap'] };
          msgs.push('♻️ Không Bỏ Gì: vỏ hộp → metal_scrap!');
        }
      }
    }

    // ── huong_vi_que_huong — AP temp buff ────────────────
    if (isVietFood && isCookedFood
        && DW_getSkillEffect(state, 'huong_vi_que_huong', 'ap_temp_bonus')) {
      s = { ...s, chefWillBonusUntilHour: ((state.hour || 0) + 6) % 24 };
      msgs.push('🌾 Hương Vị Quê Hương: AP max tạm +1 trong 6h.');
    }

    // ── hunger_ok_today — cho cook_survivor milestone ────
    if ((itemDef.type === 'food') && s.hunger >= 2) {
      s = { ...s, hungerOkToday: true };
    }

    if (msgs.length > 0) s.log = [...msgs, ...(s.log || [])];
    return { ...result, state: s };
  };

  // ══════════════════════════════════════════════════════
  // Wrap DW_searchObject — food_find_bonus + scavenge_ap_reduce
  // ══════════════════════════════════════════════════════
  if (typeof DW_searchObject === 'function') {
    const _origSearch = DW_searchObject;
    DW_searchObject = function(state, objId) {
      const result = _origSearch(state, objId);
      if (!result.ok || state.job !== 'chef') return result;

      let s = result.state;

      // food_find_bonus (ngu_vi_giac)
      const foodBonus = DW_getSkillEffect(state, 'ngu_vi_giac', 'food_find_bonus') || 0;
      if (foodBonus > 0 && Math.random() < foodBonus) {
        const bonusFoods = ['wild_fruit', 'mushroom', 'wild_herb', 'instant_noodle'];
        const picked     = bonusFoods[Math.floor(Math.random() * bonusFoods.length)];
        if ((s.inventory || []).length < 20 && ITEM_DB?.[picked]) {
          s = { ...s, inventory: [...(s.inventory || []), picked] };
          s.log = [
            `👃 Ngũ Vị Giác: tìm thêm được ${DW_itemName ? DW_itemName(picked) : picked}!`,
            ...(s.log || [])
          ];
        }
      }

      // scavenge_ap_reduce (xu_ly_nguyen_lieu lv10 mastery)
      const apRefund = DW_getSkillEffect(state, 'xu_ly_nguyen_lieu', 'scavenge_ap_reduce') || 0;
      if (apRefund > 0) {
        const maxAp = typeof DW_apMax === 'function' ? DW_apMax(s) : (s.apMax || 40);
        s = { ...s, ap: Math.min(maxAp, s.ap + apRefund) };
        s.log = [`🥩 Đôi Tay Vàng: hoàn ${apRefund} ĐHĐ lục soát.`, ...(s.log || [])];
      }

      return { ...result, state: s };
    };
  }

  // ══════════════════════════════════════════════════════
  // Wrap DW_apMax — chefWillBonusUntilHour temp AP+1
  // ══════════════════════════════════════════════════════
  if (typeof DW_apMax === 'function') {
    const _origApMax = DW_apMax;
    DW_apMax = function(state) {
      const base = _origApMax(state);
      if (state.job !== 'chef' || !state.chefWillBonusUntilHour) return base;
      const hour  = state.hour || 0;
      const until = state.chefWillBonusUntilHour;
      // Đơn giản hóa: still active nếu chưa advance qua 24h hoặc wrap-around
      const active = until > 0 && (
        (until >= 6 && hour < until && hour >= until - 6) ||
        (until < 6)
      );
      return active ? base + 1 : base;
    };
  }

  // ══════════════════════════════════════════════════════
  // Wrap DW_craft (nếu tồn tại) — recipe_memory bypass
  // B5 fix: chỉ bypass cooked_food blueprint, không bypass tất cả
  // ══════════════════════════════════════════════════════
  if (typeof DW_craft === 'function') {
    const _origCraft = DW_craft;
    DW_craft = function(state, recipeId) {
      // recipe_memory: bypass blueprint requirement cho cooking recipes
      let modState = state;
      if (state.job === 'chef' && DW_hasSignatureSkill(state, 'recipe_memory')) {
        const recipe   = (typeof CRAFT_RECIPES !== 'undefined' ? CRAFT_RECIPES : [])
          .find(r => r.id === recipeId);
        const resDef   = recipe ? ITEM_DB?.[recipe.result] : null;
        const isCooking = resDef?.tags?.includes('cooked_food') || resDef?.type === 'food';
        if (isCooking && recipe?.blueprint && !state.knownBlueprints?.includes(recipe.blueprint)) {
          // Tạm thêm blueprint vào known để engine gốc không chặn
          modState = {
            ...state,
            knownBlueprints: [...(state.knownBlueprints || []), recipe.blueprint],
          };
        }
      }
      return _origCraft(modState, recipeId);
    };
  }

})();

console.log('[Deadworld] chef-skill-tree v1.1 loaded.');
