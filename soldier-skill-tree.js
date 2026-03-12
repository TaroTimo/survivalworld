// ══════════════════════════════════════════════════════
// DEAD WORLD — soldier-skill-tree.js
// Role: Quân Nhân (soldier)
// Fantasy: "Đánh thắng không phải vì mạnh hơn — mà vì khôn hơn"
//
// TRIẾT LÝ THIẾT KẾ:
// Lấy cảm hứng từ học thuyết chiến tranh nhân dân:
//   - Địa hình là vũ khí, không phải súng đạn
//   - Tốc độ và bất ngờ thay vì áp lực trực tiếp
//   - Tiêu hao địch dần, không quyết chiến khi yếu thế
//   - "Đánh chắc thắng mới đánh, chưa chắc thắng không đánh"
//   - Ý chí không bao giờ là điểm yếu
//
// BALANCE TARGET:
//   Combat:      Mạnh  — thông qua chiến thuật, không brute force
//   Survival:    TB    — chịu đựng tốt, không self-sufficient
//   Exploration: Yếu   — không movement bonus ngoài rừng/nước
//   Utility:     Yếu   — không crafting, không food bonus
//
// ĐIỂM YẾU CỐ Ý:
//   - Không crafting bonus, không food/water production
//   - Kém trong đô thị (địa hình của Tài Xế)
//   - Phải CHỌN: Chiến Thuật (đánh thẳng) XOR Du Kích (đánh gián tiếp)
//     SP không đủ max cả 2 nhánh → buộc phải có identity rõ ràng
//
// 3 nhánh × 5 skill = 15 skill + 3 signature = 18 total
// Nhánh 1: CHIẾN THUẬT — combat thông minh, khai thác địa hình
// Nhánh 2: Ý CHÍ       — không bao giờ chịu thua, stress immunity
// Nhánh 3: DU KÍCH     — tiêu hao, phục kích, bẫy tâm lý
//
// ENGINE INTEGRATION — các key được đọc bởi engine tương ứng:
//   engine-combat.js:
//     counter_attack_unlock, counter_damage_bonus, counter_uses_per_combat,
//     counter_stun_chance, counter_boss_damage_cap, berserker_threshold,
//     pain_threshold, kill_momentum, kill_damage_stack, kill_momentum_max,
//     kill_ap_reduce_at, kill_ap_reduce_at_2, sweep_attack, war_machine,
//     enemy_scan, scan_ap_cost, weak_point_bonus, tactical_strike_chance,
//     patience_strike, double_dmg_low_hp, double_dmg_low_hp_threshold,
//     first_hit_bonus, first_hit_bonus_pct, first_hit_no_counter,
//     zone_control, clear_tile_ap_refund, clear_tile_min_enemies, offensive_doctrine,
//     bleed_on_hit, bleed_damage_per_turn, slow_on_bleed,
//     wound_stack, finishing_blow, hemorrhage,
//     intimidate_flee_chance, horde_split_chance, bandit_intimidate_chance,
//     dread_aura, psychological_domination,
//     pre_battle_setup, setup_damage_bonus, setup_ap_cost,
//     ambush_chain, tactical_retreat, perfect_plan, perfect_plan_ap_save_cap,
//     adversity_damage, cornered_rat_bonus, comeback_heal,
//     desperation_mode, phoenix_protocol, phoenix_requires_death_refusal,
//     low_hp_combat_bonus, low_hp_ap_regen, last_stand,
//     death_refusal, death_refusal_daily, undying_will,
//     fear_convert, stress_to_combat,
//     npc_protect, npc_protect_absorb, npc_morale_boost,
//     rescue_ap_reduce, rescue_success_bonus, rescued_npc_loyalty,
//     ptsd_sense, surprise_detection_bonus,
//     no_surprise_after_flee
//   engine-survival.js:
//     stress_gain_reduce, panic_immune_horde, unbreakable,
//     hunger_penalty_reduce, thirst_penalty_reduce,
//     wound_ignore, damage_shrug, emergency_hp, iron_constitution,
//     npc_bond_radius, npc_combat_bonus, people_army, people_army_npc_bonus,
//     rally_cry, noise_spike, noise_spike_val, noise_spike_daily,
//     noise_spike_selective, bait_and_trap, maestro_of_chaos
//   engine-world.js:
//     terrain_read, terrain_combat_bonus, chokepoint_detect,
//     high_ground, field_fortify, tactical_mastery,
//     jungle_ap_reduce, water_ap_reduce, jungle_stealth,
//     night_jungle_bonus, jungle_ambush, camouflage, terrain_ghost,
//     intel_dominance, forage_jungle, jungle_water_find,
//     jungle_medicine_find
//
// Tự đăng ký vào DW_ROLE_TREES['soldier'] khi load.
// Load sau deadworld-data-addon.js, trước engine-skills.js.
// Balance: v1.1 — fixes: counter cap 60%, kill_momentum reset sleep-only,
//   preemptive→first_hit_bonus, one_shot→double_dmg_low_hp,
//   bait→noise_spike, false_retreat→no_surprise_after_flee,
//   clear_tile_ap 3→2, people_army npc-only, phoenix_protocol gate,
//   death_refusal condition removed
// ══════════════════════════════════════════════════════

var SOLDIER_SKILL_TREE = {

  // ══════════════════════════════════════════════════════
  // NHÁNH 1: CHIẾN THUẬT
  // Fantasy: không đánh thẳng — đánh chỗ địch không có
  // ══════════════════════════════════════════════════════

  doc_dia_hinh: {
    id: 'doc_dia_hinh', name: 'Đọc Địa Hình',
    branch: 'chien_thuat', branchLabel: '⚔️ Chiến Thuật',
    jobFilter: 'soldier', icon: '🗺', prereq: [], maxLevel: 10,
    desc: 'Quân nhân nhìn tile không để tham quan — mà để biết đứng ở đâu thì không chết.',
    effects: {
      1:  { terrain_read: true,
            label: '⚡ Thấy trước loại địa hình tile kế cận (che khuất, cao điểm, hẹp)' },
      2:  { terrain_read: true, terrain_combat_bonus: 0.10 },
      3:  { terrain_read: true, terrain_combat_bonus: 0.15, chokepoint_detect: true,
            label: '⚡ Tile hẹp (hẻm, hành lang): combat +15% khi chiến đấu trong đó' },
      4:  { terrain_read: true, terrain_combat_bonus: 0.20, chokepoint_detect: true },
      5:  { terrain_read: true, terrain_combat_bonus: 0.25, chokepoint_detect: true,
            high_ground: true,
            label: '⚡ Cao Điểm: tile trên cao +1 damage và +10% hit chance' },
      6:  { terrain_read: true, terrain_combat_bonus: 0.28, chokepoint_detect: true, high_ground: true },
      7:  { terrain_read: true, terrain_combat_bonus: 0.30, chokepoint_detect: true,
            high_ground: true, field_fortify: true,
            label: '⚡ Tận Dụng Địa Vật: 1 AP biến bất kỳ tile nào thành chokepoint tạm thời (2 lượt)' },
      8:  { terrain_read: true, terrain_combat_bonus: 0.33, chokepoint_detect: true,
            high_ground: true, field_fortify: true },
      9:  { terrain_read: true, terrain_combat_bonus: 0.35, chokepoint_detect: true,
            high_ground: true, field_fortify: true },
      10: { terrain_read: true, terrain_combat_bonus: 0.40, chokepoint_detect: true,
            high_ground: true, field_fortify: true, tactical_mastery: true,
            label: '🏆 MASTERY: Chiến Trường Trong Đầu — mọi tile đã đến hiển thị địa hình. Mọi tile đều có thể là lợi thế.' },
    },
  },

  don_phan_cong: {
    id: 'don_phan_cong', name: 'Đòn Phản Công',
    branch: 'chien_thuat', branchLabel: '⚔️ Chiến Thuật',
    jobFilter: 'soldier', icon: '↩️',
    prereq: [{ skill: 'doc_dia_hinh', level: 3 }], maxLevel: 10,
    // "Lấy sức địch đánh địch" — đợi nó đánh, trả lại ngay.
    // Chỉ trigger sau khi nhận damage thực (sau armor). Miss KHÔNG trigger.
    // [FIX-7] counter_damage_bonus cap tối đa 60% để tránh one-shot zombie thường.
    //   Với dao bếp ~5 dmg: 60% bonus = +3 → tổng 8 dmg. Zombie thường 5HP vẫn chết
    //   nhưng boss (HP 25-80) vẫn cần nhiều đòn → không trivialize game.
    // Boss exception: counter_boss_damage_cap = 0.50 (nghĩa là bonus bị cap thêm ở 50%).
    desc: 'Sau khi bị đánh, lập tức phản công với bonus damage. Không né tránh — chờ đợi.',
    effects: {
      1:  { counter_attack_unlock: true, counter_damage_bonus: 0.15, counter_uses_per_combat: 1,
            label: '⚡ Sau khi nhận damage: phản công ngay (+15% bonus dmg, 0 AP, 1 lần/combat)' },
      2:  { counter_attack_unlock: true, counter_damage_bonus: 0.20, counter_uses_per_combat: 1 },
      3:  { counter_attack_unlock: true, counter_damage_bonus: 0.25, counter_uses_per_combat: 2,
            label: '⚡ Phản công 2 lần/combat' },
      4:  { counter_attack_unlock: true, counter_damage_bonus: 0.30, counter_uses_per_combat: 2 },
      5:  { counter_attack_unlock: true, counter_damage_bonus: 0.35, counter_uses_per_combat: 2,
            counter_stun: true, counter_stun_chance: 0.25,
            label: '⚡ Đòn phản công gây Stun 1 lượt (25% cơ hội)' },
      6:  { counter_attack_unlock: true, counter_damage_bonus: 0.40, counter_uses_per_combat: 3,
            counter_stun: true, counter_stun_chance: 0.30 },
      7:  { counter_attack_unlock: true, counter_damage_bonus: 0.45, counter_uses_per_combat: 3,
            counter_stun: true, counter_stun_chance: 0.35, pain_threshold: true,
            label: '⚡ Ngưỡng Chịu Đau: không bị Groggy hay Fear từ damage ≤ 3 HP/lượt' },
      8:  { counter_attack_unlock: true, counter_damage_bonus: 0.50, counter_uses_per_combat: 3,
            counter_stun: true, counter_stun_chance: 0.40, pain_threshold: true },
      9:  { counter_attack_unlock: true, counter_damage_bonus: 0.55, counter_uses_per_combat: 4,
            counter_stun: true, counter_stun_chance: 0.45, pain_threshold: true },
      10: { counter_attack_unlock: true, counter_damage_bonus: 0.60, counter_uses_per_combat: 4,
            counter_stun: true, counter_stun_chance: 0.50, pain_threshold: true,
            berserker_threshold: true, counter_boss_damage_cap: 0.50,
            label: '🏆 MASTERY: Thương Binh Còn Chiến — HP < 30%: phản công +60% bonus (cap). Khi bị đánh ≤ 3 HP/lượt: không Groggy, không Fear. Boss counter cap 50%.' },
    },
  },

  dau_oc_chien_thuat: {
    id: 'dau_oc_chien_thuat', name: 'Đầu Óc Chiến Thuật',
    branch: 'chien_thuat', branchLabel: '⚔️ Chiến Thuật',
    jobFilter: 'soldier', icon: '🧠',
    prereq: [{ skill: 'don_phan_cong', level: 3 }], maxLevel: 10,
    // "Đánh chắc thắng mới đánh" — biết rõ kẻ địch trước khi ra tay.
    desc: 'Nhìn vào kẻ địch một lần là biết điểm yếu của nó. Không lãng phí đòn vào chỗ vô ích.',
    effects: {
      1:  { enemy_scan: true, scan_ap_cost: 1,
            label: '⚡ Trước combat: thấy HP ước lượng và damage của zombie (1 AP)' },
      2:  { enemy_scan: true, scan_ap_cost: 0, label: '⚡ Scan miễn phí AP' },
      3:  { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 1,
            label: '⚡ Điểm Yếu: sau scan, đòn đầu +1 damage' },
      4:  { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 1 },
      5:  { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 2,
            tactical_strike: true, tactical_strike_chance: 0.30,
            label: '⚡ Đòn Chiến Thuật: sau scan, 30% đòn đầu bypass armor hoàn toàn' },
      6:  { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 2,
            tactical_strike: true, tactical_strike_chance: 0.35 },
      7:  { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 3,
            tactical_strike: true, tactical_strike_chance: 0.40, patience_strike: true,
            label: '⚡ Nhẫn Nại: chờ 1 lượt không đánh → đòn kế +50% damage (1 lần/kẻ địch)' },
      8:  { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 3,
            tactical_strike: true, tactical_strike_chance: 0.45, patience_strike: true },
      9:  { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 4,
            tactical_strike: true, tactical_strike_chance: 0.50, patience_strike: true },
      10: { enemy_scan: true, scan_ap_cost: 0, weak_point: true, weak_point_bonus: 4,
            tactical_strike: true, tactical_strike_chance: 0.55, patience_strike: true,
            double_dmg_low_hp: true, double_dmg_low_hp_threshold: 0.40,
            // [FIX-4] one_shot_protocol bypass d20 → đổi thành double dmg khi hit + enemy HP thấp.
            // Vẫn cần roll hit, vẫn dùng DC → không phá combat system.
            // Với zombie 5HP: lần đầu scan + chờ → đòn kế x2 damage = kill chắc nếu hit.
            label: '🏆 MASTERY: Điểm Tử Huyệt — sau scan + chờ 1 lượt, nếu đòn tiếp theo trúng (vẫn roll DC) VÀ enemy HP ≤ 40%: damage x2. Boss không bị ảnh hưởng.' },
    },
  },

  dieu_phoi_lua: {
    id: 'dieu_phoi_lua', name: 'Điều Phối Lửa',
    branch: 'chien_thuat', branchLabel: '⚔️ Chiến Thuật',
    jobFilter: 'soldier', icon: '🔥',
    prereq: [{ skill: 'dau_oc_chien_thuat', level: 3 }], maxLevel: 10,
    // [FIX-2] Kill Momentum reset CHỈ khi ngủ (DW_advanceDay).
    // Bỏ reset "khi bị đánh" vì state.tookDamage không tồn tại trong engine.
    // AP limit tự nhiên ngăn abuse: AP max 40 → tối đa ~13 combat action/ngày.
    // engine-combat.js đọc kill_momentum, kill_damage_stack, kill_momentum_max,
    // kill_ap_reduce_at, kill_ap_reduce_at_2, sweep_attack, war_machine.
    desc: 'Mỗi kẻ địch đổ xuống là cơ hội — cơ thể vào trạng thái chiến đấu, hành động tiếp theo nhanh hơn.',
    effects: {
      1:  { kill_momentum: true, kill_damage_stack: 0.05, kill_momentum_max: 5,
            label: '⚡ Kill Momentum: mỗi kill liên tiếp +5% damage (tối đa 5 kill, reset khi ngủ)' },
      2:  { kill_momentum: true, kill_damage_stack: 0.07, kill_momentum_max: 5 },
      3:  { kill_momentum: true, kill_damage_stack: 0.08, kill_momentum_max: 5,
            kill_ap_reduce_at: 3,
            label: '⚡ Sau 3 kill liên tiếp: combat AP cost -1 (floor 2 AP)' },
      4:  { kill_momentum: true, kill_damage_stack: 0.10, kill_momentum_max: 6, kill_ap_reduce_at: 3 },
      5:  { kill_momentum: true, kill_damage_stack: 0.12, kill_momentum_max: 7,
            kill_ap_reduce_at: 3, kill_ap_reduce_at_2: 6,
            label: '⚡ Sau 6 kill: AP cost giảm thêm 1 (floor 1 AP)' },
      6:  { kill_momentum: true, kill_damage_stack: 0.13, kill_momentum_max: 7,
            kill_ap_reduce_at: 3, kill_ap_reduce_at_2: 6 },
      7:  { kill_momentum: true, kill_damage_stack: 0.14, kill_momentum_max: 8,
            kill_ap_reduce_at: 3, kill_ap_reduce_at_2: 5, sweep_attack: true,
            label: '⚡ Sweep Attack: sau 5 kill, 1 lần/ngày đánh tất cả zombie trong tile (50% damage/con)' },
      8:  { kill_momentum: true, kill_damage_stack: 0.15, kill_momentum_max: 8,
            kill_ap_reduce_at: 3, kill_ap_reduce_at_2: 5, sweep_attack: true },
      9:  { kill_momentum: true, kill_damage_stack: 0.16, kill_momentum_max: 9,
            kill_ap_reduce_at: 3, kill_ap_reduce_at_2: 5, sweep_attack: true },
      10: { kill_momentum: true, kill_damage_stack: 0.20, kill_momentum_max: 10,
            kill_ap_reduce_at: 2, kill_ap_reduce_at_2: 5, sweep_attack: true, war_machine: true,
            label: '🏆 MASTERY: Guồng Chiến Tranh — Momentum tối đa 10 kill. AP combat minimum = 1 sau 2 kill.' },
    },
  },

  chu_dong_tan_cong: {
    id: 'chu_dong_tan_cong', name: 'Chủ Động Tấn Công',
    branch: 'chien_thuat', branchLabel: '⚔️ Chiến Thuật',
    jobFilter: 'soldier', icon: '🗡',
    prereq: [{ skill: 'dieu_phoi_lua', level: 5 }], maxLevel: 10,
    // [FIX-3] "zombie chưa aggro" không tồn tại trong engine → đổi thành first_hit_bonus:
    //   bonus damage cho đòn đầu tiên vào mỗi enemy object chưa bị đánh lần nào
    //   (engine đọc qua !obj.damagedBefore). Zombie miss KHÔNG set damagedBefore.
    // [FIX-8] clear_tile_ap_refund: 3→2, cần ≥ 2 zombie mới kích hoạt.
    //   Ngăn AP loop: tile 1 zombie chết → không hồi AP → không grind vô hạn.
    // offensive_doctrine: 1 free attack/ngày, không aggro zombie khác.
    desc: 'Không đợi zombie đến. Quân nhân ra tay trước — thế trận trong tay mình từ phát đầu.',
    effects: {
      1:  { first_hit_bonus: true, first_hit_bonus_pct: 0.30,
            label: '⚡ Đòn Mở Màn: đòn đầu tiên vào mỗi zombie +30% damage, zombie không phản đòn trong lượt đó' },
      2:  { first_hit_bonus: true, first_hit_bonus_pct: 0.35 },
      3:  { first_hit_bonus: true, first_hit_bonus_pct: 0.40, first_hit_no_counter: true,
            label: '⚡ Zombie không thể phản đòn khi bị Đòn Mở Màn' },
      4:  { first_hit_bonus: true, first_hit_bonus_pct: 0.45, first_hit_no_counter: true },
      5:  { first_hit_bonus: true, first_hit_bonus_pct: 0.50, first_hit_no_counter: true,
            zone_control: true,
            label: '⚡ Kiểm Soát Vùng: sau kill đầu tiên trong tile, zombie khác -2 roll tấn công (hoảng loạn)' },
      6:  { first_hit_bonus: true, first_hit_bonus_pct: 0.55, first_hit_no_counter: true, zone_control: true },
      7:  { first_hit_bonus: true, first_hit_bonus_pct: 0.60, first_hit_no_counter: true,
            zone_control: true, clear_tile_ap_refund: 2, clear_tile_min_enemies: 2,
            label: '⚡ Dọn Sạch: sau kill hết zombie trong tile (phải có ≥ 2 con), +2 AP hồi ngay' },
      8:  { first_hit_bonus: true, first_hit_bonus_pct: 0.65, first_hit_no_counter: true,
            zone_control: true, clear_tile_ap_refund: 2, clear_tile_min_enemies: 2 },
      9:  { first_hit_bonus: true, first_hit_bonus_pct: 0.70, first_hit_no_counter: true,
            zone_control: true, clear_tile_ap_refund: 2, clear_tile_min_enemies: 2 },
      10: { first_hit_bonus: true, first_hit_bonus_pct: 0.75, first_hit_no_counter: true,
            zone_control: true, clear_tile_ap_refund: 2, clear_tile_min_enemies: 2,
            offensive_doctrine: true,
            label: '🏆 MASTERY: Học Thuyết Tấn Công — mỗi ngày 1 tấn công chuẩn bị miễn phí (0 AP). Không kích hoạt aggro zombie khác trong tile.' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 2: Ý CHÍ
  // Fantasy: "Đánh 10 năm cũng đánh — địch mạnh hơn cũng đánh"
  // Buff chỉ phát huy khi ở trạng thái BẤT LỢI (HP thấp, stress cao)
  // ══════════════════════════════════════════════════════

  tinh_than_thep: {
    id: 'tinh_than_thep', name: 'Tinh Thần Thép',
    branch: 'y_chi', branchLabel: '🔩 Ý Chí',
    jobFilter: 'soldier', icon: '💪', prereq: [], maxLevel: 10,
    desc: 'Zombie horde, tiếng la hét, tình huống vô vọng — không cái gì làm anh mất bình tĩnh.',
    effects: {
      1:  { stress_gain_reduce: 0.20, label: '⚡ Stress tích lũy -20%' },
      2:  { stress_gain_reduce: 0.30 },
      3:  { stress_gain_reduce: 0.40, panic_immune_horde: true,
            label: '⚡ Miễn dịch Panic từ zombie horde' },
      4:  { stress_gain_reduce: 0.45, panic_immune_horde: true },
      5:  { stress_gain_reduce: 0.50, panic_immune_horde: true, fear_convert: true,
            label: '⚡ Chuyển Hóa Sợ Hãi: nhận status Fear → thay bằng +2 damage đòn tiếp theo' },
      6:  { stress_gain_reduce: 0.55, panic_immune_horde: true, fear_convert: true },
      7:  { stress_gain_reduce: 0.60, panic_immune_horde: true, fear_convert: true,
            stress_to_combat: true,
            label: '⚡ Lửa Thử Vàng: mỗi 20 stress hiện tại → +1 damage (max +5 ở 100 stress)' },
      8:  { stress_gain_reduce: 0.65, panic_immune_horde: true, fear_convert: true, stress_to_combat: true },
      9:  { stress_gain_reduce: 0.70, panic_immune_horde: true, fear_convert: true, stress_to_combat: true },
      10: { stress_gain_reduce: 0.80, panic_immune_horde: true, fear_convert: true,
            stress_to_combat: true, unbreakable: true,
            label: '🏆 MASTERY: Không Thể Khuất Phục — stress không bao giờ vượt 80. Mỗi combat action thành công khi stress = 80 tự giảm 10.' },
    },
  },

  chiu_dung: {
    id: 'chiu_dung', name: 'Chịu Đựng',
    branch: 'y_chi', branchLabel: '🔩 Ý Chí',
    jobFilter: 'soldier', icon: '🛡',
    prereq: [{ skill: 'tinh_than_thep', level: 3 }], maxLevel: 10,
    // "Gian khổ quen rồi" — KHÔNG có food/water production.
    // Chỉ giảm penalty, không xóa nhu cầu.
    desc: 'Đói, khát, thương tích — không cái gì dừng được anh. Cơ thể đã qua quá nhiều để còn quan tâm đến đau đớn.',
    effects: {
      1:  { hunger_penalty_reduce: 0.20, thirst_penalty_reduce: 0.20,
            label: '⚡ Penalty đói/khát -20%' },
      2:  { hunger_penalty_reduce: 0.30, thirst_penalty_reduce: 0.30 },
      3:  { hunger_penalty_reduce: 0.40, thirst_penalty_reduce: 0.40, wound_ignore: true,
            label: '⚡ Cầm Máu Bằng Ý Chí: Bleeding giảm tốc độ 50%' },
      4:  { hunger_penalty_reduce: 0.45, thirst_penalty_reduce: 0.45, wound_ignore: true },
      5:  { hunger_penalty_reduce: 0.50, thirst_penalty_reduce: 0.50,
            wound_ignore: true, damage_shrug: true,
            label: '⚡ Kháng Cự: sau khi nhận ≥ 4 damage/lượt, lượt tiếp theo nhận -1 damage' },
      6:  { hunger_penalty_reduce: 0.55, thirst_penalty_reduce: 0.55, wound_ignore: true, damage_shrug: true },
      7:  { hunger_penalty_reduce: 0.60, thirst_penalty_reduce: 0.60,
            wound_ignore: true, damage_shrug: true, emergency_hp: 2,
            label: '⚡ Dự Phòng: khi HP ≤ 3, hồi ngay 2 HP (1 lần/ngày)' },
      8:  { hunger_penalty_reduce: 0.65, thirst_penalty_reduce: 0.65, wound_ignore: true, damage_shrug: true, emergency_hp: 2 },
      9:  { hunger_penalty_reduce: 0.70, thirst_penalty_reduce: 0.70, wound_ignore: true, damage_shrug: true, emergency_hp: 3 },
      10: { hunger_penalty_reduce: 0.80, thirst_penalty_reduce: 0.80,
            wound_ignore: true, damage_shrug: true, emergency_hp: 3, iron_constitution: true,
            label: '🏆 MASTERY: Thể Chất Sắt Thép — không nhận status từ đói/khát. Bleeding tự khỏi sau 2 lượt.' },
    },
  },

  dong_doi: {
    id: 'dong_doi', name: 'Đồng Đội',
    branch: 'y_chi', branchLabel: '🔩 Ý Chí',
    jobFilter: 'soldier', icon: '🤝',
    prereq: [{ skill: 'chiu_dung', level: 3 }], maxLevel: 10,
    // Chiến tranh nhân dân: sức mạnh từ tập thể.
    // Tạo lý do để bảo vệ survivor, không chỉ tập trung bản thân.
    desc: 'Anh chiến đấu không chỉ cho bản thân. Khi có người bên cạnh — cả anh và họ đều mạnh hơn.',
    effects: {
      1:  { npc_bond_radius: 1, npc_combat_bonus: 0.10,
            label: '⚡ NPC đồng hành trong radius 1: cả 2 +10% combat damage' },
      2:  { npc_bond_radius: 1, npc_combat_bonus: 0.15 },
      3:  { npc_bond_radius: 2, npc_combat_bonus: 0.20, npc_protect: true, npc_protect_absorb: 0.50,
            label: '⚡ Lá Chắn Người: khi NPC trong radius 1 bị tấn công, hấp thụ 50% damage (1 lần/lượt)' },
      4:  { npc_bond_radius: 2, npc_combat_bonus: 0.25, npc_protect: true, npc_protect_absorb: 0.60 },
      5:  { npc_bond_radius: 2, npc_combat_bonus: 0.30, npc_protect: true,
            npc_protect_absorb: 0.70, npc_morale_boost: true,
            label: '⚡ Khí Thế: tiêu diệt zombie gần NPC → NPC nhận +2 AP ngay lập tức' },
      6:  { npc_bond_radius: 2, npc_combat_bonus: 0.33, npc_protect: true, npc_protect_absorb: 0.75, npc_morale_boost: true },
      7:  { npc_bond_radius: 3, npc_combat_bonus: 0.35, npc_protect: true,
            npc_protect_absorb: 0.80, npc_morale_boost: true, rally_cry: true,
            label: '⚡ Hô Xung Phong: 1 lần/ngày, NPC trong radius 3 nhận +4 AP và +20% combat' },
      8:  { npc_bond_radius: 3, npc_combat_bonus: 0.38, npc_protect: true, npc_protect_absorb: 0.85, npc_morale_boost: true, rally_cry: true },
      9:  { npc_bond_radius: 3, npc_combat_bonus: 0.40, npc_protect: true, npc_protect_absorb: 0.90, npc_morale_boost: true, rally_cry: true },
      10: { npc_bond_radius: 3, npc_combat_bonus: 0.40, npc_protect: true,
            npc_protect_absorb: 1.00, npc_morale_boost: true, rally_cry: true, people_army: true,
            // [FIX-9] people_army: NPC nhận +30% thay vì "tất cả +50%".
            // Soldier bản thân nhận +40% (npc_combat_bonus thông thường ở lv10).
            // Tránh party buff 50% stack quá mạnh khi có 2+ NPC.
            people_army_npc_bonus: 0.30,
            label: '🏆 MASTERY: Chiến Tranh Nhân Dân — ≥ 2 NPC trong radius 2: mỗi NPC nhận thêm +30% combat riêng. Quân nhân nhận +5 AP bù việc bảo vệ.' },
    },
  },

  khong_chiu_thua: {
    id: 'khong_chiu_thua', name: 'Không Chịu Thua',
    branch: 'y_chi', branchLabel: '🔩 Ý Chí',
    jobFilter: 'soldier', icon: '💀',
    prereq: [{ skill: 'dong_doi', level: 3 }], maxLevel: 10,
    // [FIX-1] Bỏ điều kiện "cần barricade lv1+ hoặc battleSetup" vì:
    //   - battleSetup là state field chưa có trong engine
    //   - barricade check tile-specific, không rõ tile nào tính
    //   1 lần/ngày đã là giới hạn đủ mạnh. Engine đọc death_refusal_daily = 1.
    desc: 'Còn một hơi thở là còn chiến đấu. Không phải bất tử — chỉ là anh chưa đồng ý chết.',
    effects: {
      1:  { low_hp_combat_bonus: 0.15, label: '⚡ Khi HP ≤ 5: combat damage +15%' },
      2:  { low_hp_combat_bonus: 0.20 },
      3:  { low_hp_combat_bonus: 0.25, low_hp_ap_regen: true,
            label: '⚡ Khi HP ≤ 3: mỗi combat action thành công hồi 1 AP thêm' },
      4:  { low_hp_combat_bonus: 0.30, low_hp_ap_regen: true },
      5:  { low_hp_combat_bonus: 0.35, low_hp_ap_regen: true, last_stand: true,
            label: '⚡ Last Stand: khi HP = 1, tất cả combat bonus tăng gấp đôi trong 3 lượt' },
      6:  { low_hp_combat_bonus: 0.40, low_hp_ap_regen: true, last_stand: true },
      7:  { low_hp_combat_bonus: 0.45, low_hp_ap_regen: true, last_stand: true,
            death_refusal: true, death_refusal_daily: 1,
            label: '⚡ Từ Chối Chết: 1 lần/ngày khi HP về 0, tự động ở lại HP = 1 thay vì chết' },
      8:  { low_hp_combat_bonus: 0.50, low_hp_ap_regen: true, last_stand: true, death_refusal: true, death_refusal_daily: 1 },
      9:  { low_hp_combat_bonus: 0.55, low_hp_ap_regen: true, last_stand: true, death_refusal: true, death_refusal_daily: 1 },
      10: { low_hp_combat_bonus: 0.60, low_hp_ap_regen: true, last_stand: true,
            death_refusal: true, death_refusal_daily: 1, undying_will: true,
            label: '🏆 MASTERY: Ý Chí Bất Diệt — sau Từ Chối Chết, miễn dịch damage 1 lượt tiếp theo. Không thể bị Fear hay Panic trong trạng thái này.' },
    },
  },

  bien_nguy_thanh_co: {
    id: 'bien_nguy_thanh_co', name: 'Biến Nguy Thành Cơ',
    branch: 'y_chi', branchLabel: '🔩 Ý Chí',
    jobFilter: 'soldier', icon: '⚡',
    prereq: [{ skill: 'khong_chiu_thua', level: 5 }], maxLevel: 10,
    // Skill cuối nhánh Ý Chí — tổng hợp "dùng yếu thắng mạnh".
    // [FIX-10] phoenix_protocol chỉ trigger khi state.deathRefusalUsedToday === true.
    //   Sequence bắt buộc: HP → 0 (death_refusal cứu) → HP = 1 → bị vây ≥ 3 → phoenix.
    //   Không thể abuse khi HP còn nhiều. engine-combat.js kiểm tra flag này.
    desc: 'Khi mọi thứ tệ nhất — HP thấp, stress cao, bị vây — đó là lúc anh nguy hiểm nhất.',
    effects: {
      1:  { adversity_damage: 0.10, label: '⚡ Sau khi nhận damage ≥ 5: +10% tất cả damage trong 2 lượt tiếp' },
      2:  { adversity_damage: 0.15 },
      3:  { adversity_damage: 0.20, cornered_rat: true, cornered_rat_bonus: 0.20,
            label: '⚡ Chuột Cùng Đường: bị ≥ 2 zombie trong tile → +20% damage thêm' },
      4:  { adversity_damage: 0.22, cornered_rat: true, cornered_rat_bonus: 0.25 },
      5:  { adversity_damage: 0.25, cornered_rat: true, cornered_rat_bonus: 0.30,
            comeback_heal: 2,
            label: '⚡ Vùng Dậy: sau khi giết zombie khi HP ≤ 3, hồi 2 HP ngay' },
      6:  { adversity_damage: 0.28, cornered_rat: true, cornered_rat_bonus: 0.33, comeback_heal: 2 },
      7:  { adversity_damage: 0.30, cornered_rat: true, cornered_rat_bonus: 0.35,
            comeback_heal: 2, desperation_mode: true,
            label: '⚡ Tuyệt Chiêu: 1 lần/ngày khi HP ≤ 2, dùng toàn bộ AP còn lại đánh tất cả zombie trong tile (80% damage/con)' },
      8:  { adversity_damage: 0.33, cornered_rat: true, cornered_rat_bonus: 0.38, comeback_heal: 2, desperation_mode: true },
      9:  { adversity_damage: 0.35, cornered_rat: true, cornered_rat_bonus: 0.40, comeback_heal: 3, desperation_mode: true },
      10: { adversity_damage: 0.40, cornered_rat: true, cornered_rat_bonus: 0.50,
            comeback_heal: 3, desperation_mode: true,
            phoenix_protocol: true, phoenix_requires_death_refusal: true,
            label: '🏆 MASTERY: Thoát Hiểm Vận — chỉ kích hoạt sau khi Từ Chối Chết đã dùng: bị ≥ 3 zombie VÀ HP = 1 → tự động đánh tất cả (0 AP) rồi flee (0 AP). 1 lần/ngày.' },
    },
  },

  // ══════════════════════════════════════════════════════
  // NHÁNH 3: DU KÍCH
  // Fantasy: "Đánh mà không cần để địch biết mình đang đánh"
  // Không stack raw damage với Chiến Thuật — phải CHỌN identity
  // ══════════════════════════════════════════════════════

  canh_sat_rung: {
    id: 'canh_sat_rung', name: 'Cảnh Sát Rừng',
    branch: 'du_kich', branchLabel: '🌿 Du Kích',
    jobFilter: 'soldier', icon: '🌿', prereq: [], maxLevel: 10,
    // Movement DUY NHẤT của quân nhân — chỉ trong địa hình tự nhiên.
    desc: 'Rừng núi là chiến trường của anh. Những nơi người khác sợ, anh thấy quen thuộc.',
    effects: {
      1:  { jungle_ap_reduce: 1, water_ap_reduce: 1, label: '⚡ Di chuyển rừng/nước/đồng -1 AP' },
      2:  { jungle_ap_reduce: 1, water_ap_reduce: 1, jungle_stealth: 0.20,
            label: '⚡ Trong tile rừng: zombie detection -20%' },
      3:  { jungle_ap_reduce: 1, water_ap_reduce: 1, jungle_stealth: 0.30, night_jungle_bonus: true,
            label: '⚡ Ban đêm trong rừng: di chuyển 0 AP' },
      4:  { jungle_ap_reduce: 1, water_ap_reduce: 1, jungle_stealth: 0.40, night_jungle_bonus: true },
      5:  { jungle_ap_reduce: 2, water_ap_reduce: 1, jungle_stealth: 0.50,
            night_jungle_bonus: true, jungle_ambush: true,
            label: '⚡ Phục Kích Rừng: tấn công từ tile rừng vào tile kế cận +40% damage' },
      6:  { jungle_ap_reduce: 2, water_ap_reduce: 2, jungle_stealth: 0.55, night_jungle_bonus: true, jungle_ambush: true },
      7:  { jungle_ap_reduce: 2, water_ap_reduce: 2, jungle_stealth: 0.60,
            night_jungle_bonus: true, jungle_ambush: true, camouflage: true,
            label: '⚡ Ngụy Trang Hoàn Hảo: đứng yên trong rừng = 100% invisible với zombie thường' },
      8:  { jungle_ap_reduce: 2, water_ap_reduce: 2, jungle_stealth: 0.65, night_jungle_bonus: true, jungle_ambush: true, camouflage: true },
      9:  { jungle_ap_reduce: 2, water_ap_reduce: 2, jungle_stealth: 0.70, night_jungle_bonus: true, jungle_ambush: true, camouflage: true },
      10: { jungle_ap_reduce: 3, water_ap_reduce: 2, jungle_stealth: 0.80,
            night_jungle_bonus: true, jungle_ambush: true, camouflage: true, terrain_ghost: true,
            label: '🏆 MASTERY: Hồn Rừng — trong tile tự nhiên, không tạo noise nào. Zombie kề cận không aggro dù đang combat.' },
    },
  },

  dan_du_va_diet: {
    id: 'dan_du_va_diet', name: 'Dẫn Dụ Và Diệt',
    branch: 'du_kich', branchLabel: '🌿 Du Kích',
    jobFilter: 'soldier', icon: '🎯',
    prereq: [{ skill: 'canh_sat_rung', level: 3 }], maxLevel: 10,
    // [FIX-5] Bỏ state.baitActive + bait_radius (engine-world chưa đọc).
    //   Thay bằng noise_spike: tăng noise mạnh tại tile hiện tại trong 1 lượt.
    //   Engine đã có noise system — zombie trong radius tự kéo về theo noise.
    //   noise_spike_val: mức noise tạo ra (engine noise max = 10).
    //   noise_spike_daily: số lần/ngày.
    //   bait_and_trap và bait_selective giữ nguyên nhưng dựa vào noise system.
    desc: 'Không đứng chờ zombie đến. Anh quyết định nó đến từ hướng nào, lúc nào, bao nhiêu con.',
    effects: {
      1:  { noise_spike: true, noise_spike_val: 7, noise_spike_daily: 1,
            label: '⚡ Tiếng Mồi: tạo noise 7 tại tile hiện tại (1 AP, 1 lần/ngày) — zombie trong vùng tự kéo về' },
      2:  { noise_spike: true, noise_spike_val: 7, noise_spike_daily: 2 },
      3:  { noise_spike: true, noise_spike_val: 8, noise_spike_daily: 2, noise_spike_selective: true,
            label: '⚡ Mồi Chọn Lọc: sau khi tạo noise, chỉ zombie loại chậm/nhanh (tuỳ chọn) phản ứng' },
      4:  { noise_spike: true, noise_spike_val: 8, noise_spike_daily: 3, noise_spike_selective: true },
      5:  { noise_spike: true, noise_spike_val: 9, noise_spike_daily: 3, noise_spike_selective: true,
            bait_and_trap: true,
            label: '⚡ Dẫn Vào Bẫy: zombie bị kéo bởi noise vào tile có trap → trap kích hoạt ngay lập tức' },
      6:  { noise_spike: true, noise_spike_val: 9, noise_spike_daily: 3, noise_spike_selective: true, bait_and_trap: true },
      7:  { noise_spike: true, noise_spike_val: 9, noise_spike_daily: 4, noise_spike_selective: true,
            bait_and_trap: true, no_surprise_after_flee: true,
            // [FIX-6] false_retreat → no_surprise_after_flee: sau khi flee thành công,
            //   lượt kế tiếp tấn công zombie cùng tile không bị surprise attack ngược lại.
            label: '⚡ Rút Lui Có Tính: sau khi flee thành công, lượt kế tấn công zombie không bị surprise attack' },
      8:  { noise_spike: true, noise_spike_val: 10, noise_spike_daily: 4, noise_spike_selective: true,
            bait_and_trap: true, no_surprise_after_flee: true },
      9:  { noise_spike: true, noise_spike_val: 10, noise_spike_daily: 4, noise_spike_selective: true,
            bait_and_trap: true, no_surprise_after_flee: true },
      10: { noise_spike: true, noise_spike_val: 10, noise_spike_daily: 5, noise_spike_selective: true,
            bait_and_trap: true, no_surprise_after_flee: true, maestro_of_chaos: true,
            label: '🏆 MASTERY: Chỉ Huy Hỗn Loạn — 1 lần/ngày tạo noise MAX tại tile hiện tại (0 AP). Zombie trong radius 3 kéo về. Quân nhân không bị aggro 2 lượt sau.' },
    },
  },

  tieu_hao: {
    id: 'tieu_hao', name: 'Tiêu Hao',
    branch: 'du_kich', branchLabel: '🌿 Du Kích',
    jobFilter: 'soldier', icon: '⏳',
    prereq: [{ skill: 'dan_du_va_diet', level: 3 }], maxLevel: 10,
    // "Không thể diệt nó hôm nay, thì làm nó yếu đi"
    // bleed stack tối đa 3, reset khi zombie chết.
    desc: 'Không cần kill ngay. Làm nó chảy máu, làm nó chậm lại, rồi đến lượt anh kết thúc.',
    effects: {
      1:  { bleed_on_hit: 0.25, bleed_damage_per_turn: 1, label: '⚡ 25% gây Chảy Máu khi đánh (+1 damage/lượt)' },
      2:  { bleed_on_hit: 0.30, bleed_damage_per_turn: 1 },
      3:  { bleed_on_hit: 0.35, bleed_damage_per_turn: 1, slow_on_bleed: true,
            label: '⚡ Zombie đang chảy máu: -1 speed (tốn thêm 1 AP để tấn công)' },
      4:  { bleed_on_hit: 0.40, bleed_damage_per_turn: 1, slow_on_bleed: true },
      5:  { bleed_on_hit: 0.45, bleed_damage_per_turn: 2, slow_on_bleed: true, wound_stack: true,
            label: '⚡ Vết Thương Chồng: mỗi lần trúng zombie đang bleed → +1 stack (max 3)' },
      6:  { bleed_on_hit: 0.50, bleed_damage_per_turn: 2, slow_on_bleed: true, wound_stack: true },
      7:  { bleed_on_hit: 0.55, bleed_damage_per_turn: 2, slow_on_bleed: true,
            wound_stack: true, finishing_blow: true,
            label: '⚡ Chốt Hạ: zombie có ≥ 2 bleed stack → instant kill khi HP ≤ 25%' },
      8:  { bleed_on_hit: 0.60, bleed_damage_per_turn: 3, slow_on_bleed: true, wound_stack: true, finishing_blow: true },
      9:  { bleed_on_hit: 0.65, bleed_damage_per_turn: 3, slow_on_bleed: true, wound_stack: true, finishing_blow: true },
      10: { bleed_on_hit: 0.70, bleed_damage_per_turn: 3, slow_on_bleed: true,
            wound_stack: true, finishing_blow: true, hemorrhage: true,
            label: '🏆 MASTERY: Xuất Huyết — 3 bleed stack: +3 damage/lượt. Boss với 2 stack chịu -2 armor bonus.' },
    },
  },

  chien_tranh_tam_ly: {
    id: 'chien_tranh_tam_ly', name: 'Chiến Tranh Tâm Lý',
    branch: 'du_kich', branchLabel: '🌿 Du Kích',
    jobFilter: 'soldier', icon: '🧨',
    prereq: [{ skill: 'tieu_hao', level: 3 }], maxLevel: 10,
    // "Chiến thắng ý chí trước khi chiến thắng thể lực"
    // Boss và special infected không bị ảnh hưởng bởi intimidate.
    desc: 'Không cần giết hết. Đôi khi chỉ cần làm chúng sợ.',
    effects: {
      1:  { intimidate_flee_chance: 0.15, label: '⚡ Sau kill đầu: 15% zombie còn lại bỏ chạy' },
      2:  { intimidate_flee_chance: 0.20 },
      3:  { intimidate_flee_chance: 0.25, horde_split: true, horde_split_chance: 0.30,
            label: '⚡ Phân Hóa Horde: 30% zombie horde tách 2 nhóm khi bị bait tấn công' },
      4:  { intimidate_flee_chance: 0.28, horde_split: true, horde_split_chance: 0.35 },
      5:  { intimidate_flee_chance: 0.30, horde_split: true, horde_split_chance: 0.40,
            bandit_intimidate: true, bandit_intimidate_chance: 0.50,
            label: '⚡ Uy Vũ: intimidate NPC bandit rút lui không cần combat (50% thành công)' },
      6:  { intimidate_flee_chance: 0.33, horde_split: true, horde_split_chance: 0.45, bandit_intimidate: true, bandit_intimidate_chance: 0.55 },
      7:  { intimidate_flee_chance: 0.35, horde_split: true, horde_split_chance: 0.50,
            bandit_intimidate: true, bandit_intimidate_chance: 0.60, dread_aura: true,
            label: '⚡ Khí Thế Chết Chóc: sau khi kill boss/special, zombie thường hoảng loạn 1 lượt' },
      8:  { intimidate_flee_chance: 0.38, horde_split: true, horde_split_chance: 0.55, bandit_intimidate: true, bandit_intimidate_chance: 0.65, dread_aura: true },
      9:  { intimidate_flee_chance: 0.40, horde_split: true, horde_split_chance: 0.60, bandit_intimidate: true, bandit_intimidate_chance: 0.70, dread_aura: true },
      10: { intimidate_flee_chance: 0.50, horde_split: true, horde_split_chance: 0.70,
            bandit_intimidate: true, bandit_intimidate_chance: 0.80,
            dread_aura: true, psychological_domination: true,
            label: '🏆 MASTERY: Chiến Thần — sống sót sau khi bị vây ≥ 4 zombie: tất cả zombie thường tự flee. Không roll. Boss không bị ảnh hưởng.' },
    },
  },

  chien_luoc_gia: {
    id: 'chien_luoc_gia', name: 'Chiến Lược Gia',
    branch: 'du_kich', branchLabel: '🌿 Du Kích',
    jobFilter: 'soldier', icon: '📋',
    prereq: [{ skill: 'chien_tranh_tam_ly', level: 5 }], maxLevel: 10,
    // Skill cuối nhánh Du Kích.
    // perfect_plan: 0 AP toàn bộ combat trong tile đã setup (tối đa 8 AP tiết kiệm/ngày).
    desc: 'Trận đánh kết thúc trước khi bắt đầu — nếu chuẩn bị đúng.',
    effects: {
      1:  { pre_battle_setup: true, setup_damage_bonus: 3, setup_ap_cost: 2,
            label: '⚡ Lập Trận Đồ: 2 AP cho tile hiện tại — zombie đầu tiên vào nhận +3 damage bất ngờ' },
      2:  { pre_battle_setup: true, setup_damage_bonus: 4, setup_ap_cost: 2 },
      3:  { pre_battle_setup: true, setup_damage_bonus: 4, setup_ap_cost: 2, ambush_chain: true,
            label: '⚡ Chuỗi Phục Kích: kill zombie đầu từ setup → zombie thứ 2 cũng nhận +2 surprise damage' },
      4:  { pre_battle_setup: true, setup_damage_bonus: 5, setup_ap_cost: 2, ambush_chain: true },
      5:  { pre_battle_setup: true, setup_damage_bonus: 5, setup_ap_cost: 2,
            ambush_chain: true, tactical_retreat: true,
            label: '⚡ Lui Có Kế: flee từ tile đã setup luôn thành công, kéo 1 zombie ra tách khỏi nhóm' },
      6:  { pre_battle_setup: true, setup_damage_bonus: 6, setup_ap_cost: 1, ambush_chain: true, tactical_retreat: true },
      7:  { pre_battle_setup: true, setup_damage_bonus: 6, setup_ap_cost: 1,
            ambush_chain: true, tactical_retreat: true, intel_dominance: true,
            label: '⚡ Thống Trị Thông Tin: số lượng zombie chính xác tại tất cả tile đã đến trong radius 2' },
      8:  { pre_battle_setup: true, setup_damage_bonus: 7, setup_ap_cost: 1, ambush_chain: true, tactical_retreat: true, intel_dominance: true },
      9:  { pre_battle_setup: true, setup_damage_bonus: 7, setup_ap_cost: 1, ambush_chain: true, tactical_retreat: true, intel_dominance: true },
      10: { pre_battle_setup: true, setup_damage_bonus: 8, setup_ap_cost: 1,
            ambush_chain: true, tactical_retreat: true, intel_dominance: true,
            perfect_plan: true, perfect_plan_ap_save_cap: 8,
            label: '🏆 MASTERY: Toàn Mỹ Kế Hoạch — combat trong tile đã setup không tốn AP (tối đa 8 AP/ngày). 1 tile/ngày.' },
    },
  },

  // ══════════════════════════════════════════════════════
  // SIGNATURE SKILLS — mở khóa qua Milestone
  // ══════════════════════════════════════════════════════

  vet_thuong_chien_tranh: {
    id: 'vet_thuong_chien_tranh', name: 'Vết Thương Chiến Tranh',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'soldier', icon: '🩸',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Cơ thể nhớ những thứ mà ký ức đã cố quên. Mỗi vết thương là bài học anh không thể không học.',
    effects: {
      1: { ptsd_sense: true, surprise_detection_bonus: 0.25,
           label: '🏅 Phản Xạ Chiến Tranh: -25% cơ hội bị surprise attack. Bị tấn công ban đêm — luôn biết từ hướng nào.' },
    },
  },

  khong_de_lai_nguoi: {
    id: 'khong_de_lai_nguoi', name: 'Không Để Lại Người',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'soldier', icon: '🤲',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Không ai bị bỏ lại phía sau. Không phải vì lệnh — mà vì không thể làm khác được.',
    effects: {
      1: { rescue_ap_reduce: 2, rescue_success_bonus: 0.30, rescued_npc_loyalty: true,
           label: '🏅 Không Bỏ Ai: cứu NPC bị thương -2 AP, +30% thành công. NPC được cứu không bao giờ phản bội.' },
    },
  },

  bai_hoc_tu_rung: {
    id: 'bai_hoc_tu_rung', name: 'Bài Học Từ Rừng',
    branch: 'signature', branchLabel: '🏅 Đặc Biệt',
    jobFilter: 'soldier', icon: '🌳',
    prereq: [], maxLevel: 1, isSignature: true,
    desc: 'Rừng đã dạy anh nhiều hơn bất kỳ trường quân sự nào. Anh biết đọc cây, đọc đất, đọc nước.',
    effects: {
      1: { forage_jungle: true, jungle_water_find: true, jungle_medicine_find: true,
           label: '🏅 Tri Thức Rừng: trong tile rừng/đồng, tìm được nước sạch (1 lần/tile/ngày) và cây thuốc dã chiến (hồi 2 HP, 1 lần/ngày).' },
    },
  },

};

// ══════════════════════════════════════════════════════
// SOLDIER PREREQUISITE — merge vào SKILL_PREREQUISITES
// ══════════════════════════════════════════════════════
(function () {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;
  // Nhánh Chiến Thuật
  SKILL_PREREQUISITES.don_phan_cong      = [{ skill: 'doc_dia_hinh',       level: 3 }];
  SKILL_PREREQUISITES.dau_oc_chien_thuat = [{ skill: 'don_phan_cong',      level: 3 }];
  SKILL_PREREQUISITES.dieu_phoi_lua      = [{ skill: 'dau_oc_chien_thuat', level: 3 }];
  SKILL_PREREQUISITES.chu_dong_tan_cong  = [{ skill: 'dieu_phoi_lua',      level: 5 }];
  // Nhánh Ý Chí
  SKILL_PREREQUISITES.chiu_dung          = [{ skill: 'tinh_than_thep',     level: 3 }];
  SKILL_PREREQUISITES.dong_doi           = [{ skill: 'chiu_dung',          level: 3 }];
  SKILL_PREREQUISITES.khong_chiu_thua    = [{ skill: 'dong_doi',           level: 3 }];
  SKILL_PREREQUISITES.bien_nguy_thanh_co = [{ skill: 'khong_chiu_thua',    level: 5 }];
  // Nhánh Du Kích
  SKILL_PREREQUISITES.dan_du_va_diet     = [{ skill: 'canh_sat_rung',      level: 3 }];
  SKILL_PREREQUISITES.tieu_hao           = [{ skill: 'dan_du_va_diet',     level: 3 }];
  SKILL_PREREQUISITES.chien_tranh_tam_ly = [{ skill: 'tieu_hao',           level: 3 }];
  SKILL_PREREQUISITES.chien_luoc_gia     = [{ skill: 'chien_tranh_tam_ly', level: 5 }];
  // Signature: không có prereq — unlock qua milestone
})();

// ══════════════════════════════════════════════════════
// SOLDIER SIGNATURE NARRATIVE HINTS
// Văn phong: ngắn gọn, nặng cảm xúc — như hồi ký chiến tranh
// ══════════════════════════════════════════════════════
var SOLDIER_SIGNATURE_HINTS = {

  soldier_combat_veteran: {
    // Trigger: 30 lần bị tấn công bất ngờ và sống sót
    hint_50:  'Lần đầu bị đánh bất ngờ, tim anh nhảy ra khỏi lồng ngực. Bây giờ — nó chỉ đập nhanh hơn một nhịp.',
    hint_80:  'Anh nhận ra mình không còn giật mình nữa. Không phải vì anh đã mất cảm giác — mà vì cơ thể anh đã học cách đón nhận trước khi não kịp xử lý.',
    hint_100: 'Ba mươi lần. Anh đếm không phải để tự hào. Mỗi lần là một người nào đó đã cố giết anh và thất bại. Anh nghĩ đến họ đôi khi. Rồi thôi.\n🏅 Vết Thương Chiến Tranh mở khóa.',
    unlock_skill: 'vet_thuong_chien_tranh',
    unlock_label: 'Vết Thương Chiến Tranh',
  },

  soldier_brotherhood: {
    // Trigger: cứu NPC 5 lần hoặc sống cùng NPC qua 15 ngày
    hint_50:  'Anh kéo người đó ra khỏi đám zombie. Không nghĩ gì. Chân tự chạy, tay tự túm.',
    hint_80:  'Đêm đó họ ngủ cạnh nhau. Anh không nhớ tên anh ta. Nhưng anh biết tiếng thở của anh ta khi ngủ — và khi không ngủ được.',
    hint_100: 'Năm lần. Anh nhớ từng lần một. Không phải vì anh muốn ghi nhớ — mà vì không tài nào quên được mặt người nhìn anh như thể anh vừa kéo họ ra khỏi địa ngục.\n🏅 Không Để Lại Người mở khóa.',
    unlock_skill: 'khong_de_lai_nguoi',
    unlock_label: 'Không Để Lại Người',
  },

  soldier_forest_son: {
    // Trigger: sống sót 20 đêm trong tile tự nhiên (rừng/đồng/nước)
    hint_50:  'Cây rừng không che anh — nhưng anh biết cách đứng để không cần che.',
    hint_80:  'Anh uống nước từ lá cây. Không phải vì không có cách khác. Mà vì cơ thể anh nhớ ra đây là cách tốt nhất từ bao giờ không biết.',
    hint_100: 'Hai mươi đêm. Không mái nhà. Không barricade. Chỉ có đất dưới lưng và trời trên đầu. Và anh vẫn còn sống. Rừng không cứu anh — nhưng nó đã giữ anh lại đủ lâu để tự cứu.\n🏅 Bài Học Từ Rừng mở khóa.',
    unlock_skill: 'bai_hoc_tu_rung',
    unlock_label: 'Bài Học Từ Rừng',
  },

};

// ── Merge hints vào MILESTONE_DEFS ────────────────────
(function () {
  if (typeof MILESTONE_DEFS === 'undefined') return;
  if (MILESTONE_DEFS.soldier_combat_veteran)
    MILESTONE_DEFS.soldier_combat_veteran.hints = SOLDIER_SIGNATURE_HINTS.soldier_combat_veteran;
  if (MILESTONE_DEFS.soldier_brotherhood)
    MILESTONE_DEFS.soldier_brotherhood.hints = SOLDIER_SIGNATURE_HINTS.soldier_brotherhood;
  if (MILESTONE_DEFS.soldier_forest_son)
    MILESTONE_DEFS.soldier_forest_son.hints = SOLDIER_SIGNATURE_HINTS.soldier_forest_son;
})();

// ══════════════════════════════════════════════════════
// SOLDIER SYNERGIES
// ══════════════════════════════════════════════════════
(function () {
  if (typeof SKILL_SYNERGIES === 'undefined') return;
  SKILL_SYNERGIES.push(

    {
      // Chiến Thuật + Du Kích: đòn khai mào từ tile đã setup gần như one-shot
      id: 'first_blood_doctrine',
      name: 'Học Thuyết Phát Súng Đầu',
      desc: 'Chiến Thuật + Du Kích: đánh zombie chưa aggro từ tile đã Lập Trận Đồ → đòn đầu gây gấp đôi damage. Chỉ zombie thường.',
      jobFilter: 'soldier',
      requires: [
        { skill: 'chu_dong_tan_cong', level: 3 },
        { skill: 'chien_luoc_gia',   level: 3 },
      ],
      effect: { first_strike_setup_double_damage: true, first_strike_zombie_only: true },
    },

    {
      // Ý Chí + Du Kích: gần chết mà vẫn không ngã → zombie sợ
      id: 'fear_no_death',
      name: 'Coi Cái Chết Như Không',
      desc: 'Ý Chí + Du Kích: khi HP ≤ 30% VÀ có ≥ 2 zombie trong tile → zombie thường có 40% chance bỏ chạy mỗi lượt. Boss và special không bị ảnh hưởng.',
      jobFilter: 'soldier',
      requires: [
        { skill: 'khong_chiu_thua',    level: 5 },
        { skill: 'chien_tranh_tam_ly', level: 3 },
      ],
      effect: {
        low_hp_zombie_flee_chance:    0.40,
        low_hp_zombie_flee_threshold: 0.30,
        low_hp_flee_zombie_only:      true,
      },
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
  DW_ROLE_TREES['soldier'] = SOLDIER_SKILL_TREE;

  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(SOLDIER_SKILL_TREE)) {
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
