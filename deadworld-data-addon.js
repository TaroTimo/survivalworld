// ══════════════════════════════════════════════════════
// SKILL SYSTEM v2 — DATA DEFINITIONS
// Append vào cuối deadworld-data.js
// Gồm 4 bảng: SKILL_UNLOCK_EFFECTS, SKILL_PREREQUISITES,
//             SKILL_SYNERGIES, MILESTONE_DEFS
// Không có logic — chỉ là data được đọc bởi engine-skills.js
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// 1. SKILL_UNLOCK_EFFECTS
// ──────────────────────────────────────────────────────
// Định nghĩa effect cụ thể khi mỗi skill đạt một level nhất định.
// Cấu trúc: { skillKey: { level: { effectId: value, label: 'mô tả ngắn' } } }
//
// effectId là key mà DW_getSkillEffect() sẽ query.
// label là text hiển thị khi level up ("🔷 Blade lv3 — Tấn công chí mạng +15%")
//
// Triết lý milestone: level 1/3/5/7/10 có thay đổi CƠ CHẾ (không chỉ +số).
// Level chẵn giữa là incremental buff nhỏ — tạo cảm giác tiến trình liên tục.
//
// AP REDUCTION CAP: tổng AP reduction từ skills không được vượt 4 AP/action
// DAMAGE BONUS CAP: không skill nào cho hơn +40% damage tổng
// Hai quy tắc này được enforce bởi engine khi tính damage/cost thực tế.
// ══════════════════════════════════════════════════════
var SKILL_UNLOCK_EFFECTS = {

  // ── BLADE (Vũ khí chém) ───────────────────────────
  // Fantasy: từ "đánh loạn" → "sát thủ chính xác"
  // Cơ chế độc: stealth_kill_ap_bonus — giảm AP stealth kill
  blade: {
    1:  { damage_bonus: 0.05, label: 'Chém +5% sát thương' },
    2:  { damage_bonus: 0.10, label: 'Chém +10% sát thương' },
    3:  { damage_bonus: 0.15, crit_chance: 0.10,
          label: '⚡ Tấn công chí mạng mở khóa (10%)' },
    4:  { damage_bonus: 0.20, crit_chance: 0.12, label: 'Crit +12%' },
    5:  { damage_bonus: 0.25, crit_chance: 0.15, bleed_on_hit: 0.20,
          label: '⚡ Đòn chém gây Chảy máu (20%)' },
    6:  { damage_bonus: 0.28, crit_chance: 0.17, bleed_on_hit: 0.25 },
    7:  { damage_bonus: 0.30, crit_chance: 0.20, bleed_on_hit: 0.30,
          stealth_kill_ap_bonus: 1,
          label: '⚡ Ám sát tốn -1 AP' },
    8:  { damage_bonus: 0.33, crit_chance: 0.22, bleed_on_hit: 0.35,
          stealth_kill_ap_bonus: 1 },
    9:  { damage_bonus: 0.36, crit_chance: 0.25, bleed_on_hit: 0.40,
          stealth_kill_ap_bonus: 2 },
    10: { damage_bonus: 0.40, crit_chance: 0.30, bleed_on_hit: 0.50,
          stealth_kill_ap_bonus: 2, execute_threshold: 0.15,
          label: '🏆 MASTERY: Hành quyết kẻ địch dưới 15% HP tức thì' },
  },

  // ── BLUNT (Vũ khí đánh) ──────────────────────────
  // Fantasy: từ "đánh choáng" → "phá giáp + kiểm soát đám đông"
  // Cơ chế độc: stun_chance — cơ hội làm kẻ địch mất lượt
  blunt: {
    1:  { damage_bonus: 0.05, label: 'Đánh +5% sát thương' },
    2:  { damage_bonus: 0.10, label: 'Đánh +10% sát thương' },
    3:  { damage_bonus: 0.12, stun_chance: 0.15,
          label: '⚡ Đòn choáng mở khóa (15% cơ hội)' },
    4:  { damage_bonus: 0.15, stun_chance: 0.18, label: 'Stun +18%' },
    5:  { damage_bonus: 0.18, stun_chance: 0.20, armor_break: 0.10,
          label: '⚡ Phá giáp: xuyên 10% giảm sát thương của kẻ địch' },
    6:  { damage_bonus: 0.22, stun_chance: 0.22, armor_break: 0.15 },
    7:  { damage_bonus: 0.26, stun_chance: 0.25, armor_break: 0.20,
          cleave_damage: 0.30,
          label: '⚡ Cleave: đòn mạnh văng 30% sát thương sang zombie kế cận' },
    8:  { damage_bonus: 0.30, stun_chance: 0.28, armor_break: 0.25,
          cleave_damage: 0.40 },
    9:  { damage_bonus: 0.35, stun_chance: 0.30, armor_break: 0.30,
          cleave_damage: 0.50 },
    10: { damage_bonus: 0.40, stun_chance: 0.35, armor_break: 0.35,
          cleave_damage: 0.60, knockback_always: true,
          label: '🏆 MASTERY: Đòn mạnh luôn hất văng zombie (không dùng AP flee)' },
  },

  // ── FIREARM (Súng) ────────────────────────────────
  // Fantasy: từ "bắn thẳng" → "xạ thủ chiến thuật"
  // Cơ chế độc: ap_cost_reduction — giảm AP bắn; headshot_chance — sát thương x2
  // Balance note: noise penalty của súng không bao giờ giảm qua skill
  firearm: {
    1:  { accuracy_bonus: 0.08, label: 'Súng +8% chính xác' },
    2:  { accuracy_bonus: 0.15, ap_cost_reduction: 1,
          label: 'Bắn -1 AP' },
    3:  { accuracy_bonus: 0.20, ap_cost_reduction: 1, headshot_chance: 0.10,
          label: '⚡ Headshot mở khóa (x2 sát thương, 10%)' },
    4:  { accuracy_bonus: 0.25, ap_cost_reduction: 1, headshot_chance: 0.13 },
    5:  { accuracy_bonus: 0.30, ap_cost_reduction: 2, headshot_chance: 0.16,
          burst_unlocked: true,
          label: '⚡ Bắn liên thanh mở khóa (2 AP, 2 đạn, 2 lần damage)' },
    6:  { accuracy_bonus: 0.33, ap_cost_reduction: 2, headshot_chance: 0.19,
          burst_unlocked: true },
    7:  { accuracy_bonus: 0.36, ap_cost_reduction: 2, headshot_chance: 0.22,
          burst_unlocked: true, suppress_effect: true,
          label: '⚡ Suppression: bắn gây stress +10 cho mục tiêu còn sống' },
    8:  { accuracy_bonus: 0.38, ap_cost_reduction: 2, headshot_chance: 0.25,
          burst_unlocked: true, suppress_effect: true },
    9:  { accuracy_bonus: 0.39, ap_cost_reduction: 2, headshot_chance: 0.28,
          burst_unlocked: true, suppress_effect: true },
    10: { accuracy_bonus: 0.40, ap_cost_reduction: 2, headshot_chance: 0.35,
          burst_unlocked: true, suppress_effect: true, execute_shot: true,
          label: '🏆 MASTERY: Headshot luôn một phát (bỏ qua HP còn lại)' },
  },

  // ── FIRSTAID (Sơ cứu) ────────────────────────────
  // Fantasy: từ "băng bó cơ bản" → "bác sĩ chiến trường"
  // Cơ chế độc: revive_chance — cơ hội hồi sinh từ near-death; over_heal
  firstaid: {
    1:  { heal_bonus: 0.10, label: 'Thuốc +10% hồi HP' },
    2:  { heal_bonus: 0.20, label: 'Thuốc +20% hồi HP' },
    3:  { heal_bonus: 0.30, status_cure_bonus: true,
          label: '⚡ Chữa trị: xóa thêm 1 debuff ngẫu nhiên khi dùng medkit' },
    4:  { heal_bonus: 0.35, status_cure_bonus: true,
          bandage_efficiency: 1.5, label: 'Băng gạc hiệu quả +50%' },
    5:  { heal_bonus: 0.40, status_cure_bonus: true,
          bandage_efficiency: 2.0, ap_cost_reduction: 1,
          label: '⚡ Sơ cứu -1 AP; Băng gạc x2 hiệu quả' },
    6:  { heal_bonus: 0.45, status_cure_bonus: true,
          bandage_efficiency: 2.0, ap_cost_reduction: 1 },
    7:  { heal_bonus: 0.50, status_cure_bonus: true,
          bandage_efficiency: 2.0, ap_cost_reduction: 1,
          triage_mode: true,
          label: '⚡ Triage: dùng item y tế không tốn AP nếu HP < 30%' },
    8:  { heal_bonus: 0.55, status_cure_bonus: true,
          bandage_efficiency: 2.5, ap_cost_reduction: 1, triage_mode: true },
    9:  { heal_bonus: 0.60, status_cure_bonus: true,
          bandage_efficiency: 3.0, ap_cost_reduction: 2, triage_mode: true },
    10: { heal_bonus: 0.70, status_cure_bonus: true,
          bandage_efficiency: 3.0, ap_cost_reduction: 2, triage_mode: true,
          over_heal: true,
          label: '🏆 MASTERY: Hồi HP có thể vượt maxHP +5 (over-heal buffer)' },
  },

  // ── SNEAK (Tàng hình) ─────────────────────────────
  // Fantasy: từ "đi nhẹ nhàng" → "bóng tối vô hình"
  // Cơ chế độc: noise_reduction; avoid_ambush; shadow_step
  sneak: {
    1:  { noise_reduction: 1, label: 'Noise -1 khi lục soát' },
    2:  { noise_reduction: 2, avoid_ambush_bonus: 0.20,
          label: 'Né phục kích +20%' },
    3:  { noise_reduction: 2, avoid_ambush_bonus: 0.30,
          stealth_search: true,
          label: '⚡ Lục soát im lặng: noise = 0 khi search tile nhỏ' },
    4:  { noise_reduction: 3, avoid_ambush_bonus: 0.35,
          stealth_search: true },
    5:  { noise_reduction: 3, avoid_ambush_bonus: 0.40,
          stealth_search: true, shadow_move: true,
          label: '⚡ Di chuyển bóng tối: noise khi di chuyển ban đêm -2' },
    6:  { noise_reduction: 4, avoid_ambush_bonus: 0.45,
          stealth_search: true, shadow_move: true },
    7:  { noise_reduction: 4, avoid_ambush_bonus: 0.50,
          stealth_search: true, shadow_move: true,
          vanish_chance: 0.25,
          label: '⚡ Biến mất: 25% thoát chiến đấu không tốn AP' },
    8:  { noise_reduction: 5, avoid_ambush_bonus: 0.55,
          stealth_search: true, shadow_move: true, vanish_chance: 0.30 },
    9:  { noise_reduction: 5, avoid_ambush_bonus: 0.60,
          stealth_search: true, shadow_move: true, vanish_chance: 0.35 },
    10: { noise_reduction: 6, avoid_ambush_bonus: 0.70,
          stealth_search: true, shadow_move: true, vanish_chance: 0.50,
          ghost_mode: true,
          label: '🏆 MASTERY: Ghost — zombie không phát hiện khi đứng yên' },
  },

  // ── FITNESS (Thể lực) ─────────────────────────────
  // Fantasy: từ "người bình thường" → "máy chịu đựng"
  // Cơ chế độc: ap_max_bonus; hunger_rate_reduction; injury_resist
  // AP bonus bị cap cứng tại +4 theo rule balance (DW_apMax đã enforce)
  fitness: {
    1:  { ap_max_bonus: 1, label: 'AP max +1' },
    2:  { ap_max_bonus: 2, label: 'AP max +2' },
    3:  { ap_max_bonus: 2, hunger_rate_bonus: 0.10,
          label: '⚡ Trao đổi chất tối ưu: đói chậm hơn 10%' },
    4:  { ap_max_bonus: 3, hunger_rate_bonus: 0.15, label: 'AP max +3' },
    5:  { ap_max_bonus: 3, hunger_rate_bonus: 0.20, injury_resist: 0.15,
          label: '⚡ Cơ thể cứng cáp: giảm 15% damage nhận từ đòn vật lý' },
    6:  { ap_max_bonus: 4, hunger_rate_bonus: 0.20, injury_resist: 0.20,
          label: 'AP max +4 (đạt cap)' },
    7:  { ap_max_bonus: 4, hunger_rate_bonus: 0.25, injury_resist: 0.25,
          second_wind: true,
          label: '⚡ Second Wind: 1 lần/ngày, khi AP = 0 hồi ngay 3 AP' },
    8:  { ap_max_bonus: 4, hunger_rate_bonus: 0.28, injury_resist: 0.28,
          second_wind: true },
    9:  { ap_max_bonus: 4, hunger_rate_bonus: 0.30, injury_resist: 0.30,
          second_wind: true },
    10: { ap_max_bonus: 4, hunger_rate_bonus: 0.35, injury_resist: 0.35,
          second_wind: true, endurance_run: true,
          label: '🏆 MASTERY: Endurance — penalty AP từ đói/khát giảm 50%' },
  },

  // ── CARPENTRY (Thủ công) ──────────────────────────
  // Fantasy: từ "chắp vá" → "kỹ sư sinh tồn"
  // Cơ chế độc: craft_speed; barricade_quality; trap_craft
  carpentry: {
    1:  { craft_material_save: 0.10, label: 'Craft tiết kiệm 10% nguyên liệu' },
    2:  { craft_material_save: 0.15, barricade_ap_reduction: 1,
          label: 'Barricade -1 AP' },
    3:  { craft_material_save: 0.20, barricade_ap_reduction: 1,
          barricade_quality: 1,
          label: '⚡ Barricade chắc hơn: +1 effective level khi tính damage resist' },
    4:  { craft_material_save: 0.22, barricade_ap_reduction: 1,
          barricade_quality: 1, repair_efficiency: 1.5,
          label: 'Sửa đồ hiệu quả +50%' },
    5:  { craft_material_save: 0.25, barricade_ap_reduction: 1,
          barricade_quality: 1, repair_efficiency: 2.0,
          trap_craft_unlocked: true,
          label: '⚡ Bẫy thủ công mở khóa (trip wire, spike pit)' },
    6:  { craft_material_save: 0.28, barricade_ap_reduction: 1,
          barricade_quality: 2, repair_efficiency: 2.0,
          trap_craft_unlocked: true },
    7:  { craft_material_save: 0.30, barricade_ap_reduction: 2,
          barricade_quality: 2, repair_efficiency: 2.5,
          trap_craft_unlocked: true, salvage_bonus: 0.20,
          label: '⚡ Tháo dỡ khéo léo: +20% vật liệu thu hồi khi phá đồ' },
    8:  { craft_material_save: 0.33, barricade_ap_reduction: 2,
          barricade_quality: 2, repair_efficiency: 3.0,
          trap_craft_unlocked: true, salvage_bonus: 0.25 },
    9:  { craft_material_save: 0.35, barricade_ap_reduction: 2,
          barricade_quality: 3, repair_efficiency: 3.0,
          trap_craft_unlocked: true, salvage_bonus: 0.30 },
    10: { craft_material_save: 0.40, barricade_ap_reduction: 2,
          barricade_quality: 3, repair_efficiency: 4.0,
          trap_craft_unlocked: true, salvage_bonus: 0.35,
          mastercraft: true,
          label: '🏆 MASTERY: Mastercraft — vũ khí tự chế không bao giờ hỏng' },
  },

  // ── MENTAL (Ý chí) ────────────────────────────────
  // Fantasy: từ "hoảng loạn" → "tâm lý thép"
  // Cơ chế độc: stress_resist; depression_resist; morale_aura (bonus cho NPC)
  mental: {
    1:  { stress_rate_reduction: 0.10, label: 'Stress tăng chậm 10%' },
    2:  { stress_rate_reduction: 0.15, panic_threshold_bonus: 5,
          label: 'Ngưỡng Panic +5 (80→85)' },
    3:  { stress_rate_reduction: 0.20, panic_threshold_bonus: 10,
          meditation: true,
          label: '⚡ Thiền định: 1 lần/ngày, hành động nghỉ giảm stress thêm -10' },
    4:  { stress_rate_reduction: 0.25, panic_threshold_bonus: 10,
          meditation: true, depression_rate_reduction: 0.15,
          label: 'Trầm cảm tăng chậm 15%' },
    5:  { stress_rate_reduction: 0.30, panic_threshold_bonus: 15,
          meditation: true, depression_rate_reduction: 0.20,
          trauma_resist: true,
          label: '⚡ Kháng chấn thương: sự kiện kinh hoàng gây stress -30%' },
    6:  { stress_rate_reduction: 0.33, panic_threshold_bonus: 15,
          meditation: true, depression_rate_reduction: 0.25,
          trauma_resist: true },
    7:  { stress_rate_reduction: 0.36, panic_threshold_bonus: 20,
          meditation: true, depression_rate_reduction: 0.30,
          trauma_resist: true, rally: true,
          label: '⚡ Rally: khi HP < 30%, stress không tăng trong trận chiến' },
    8:  { stress_rate_reduction: 0.38, panic_threshold_bonus: 20,
          meditation: true, depression_rate_reduction: 0.35,
          trauma_resist: true, rally: true },
    9:  { stress_rate_reduction: 0.40, panic_threshold_bonus: 25,
          meditation: true, depression_rate_reduction: 0.40,
          trauma_resist: true, rally: true },
    10: { stress_rate_reduction: 0.45, panic_threshold_bonus: 30,
          meditation: true, depression_rate_reduction: 0.50,
          trauma_resist: true, rally: true, unbreakable: true,
          label: '🏆 MASTERY: Unbreakable — Panic Mode không thể kích hoạt' },
  },
};

// ══════════════════════════════════════════════════════
// 2. SKILL_PREREQUISITES
// ──────────────────────────────────────────────────────
// Một số skill yêu cầu skill khác đạt level nhất định trước khi đầu tư.
// Điều này tạo ra "depth" — bạn phải commit vào một hướng trước.
//
// Cấu trúc: { skillKey: [ { skill: 'otherSkill', level: N }, ... ] }
// Hiện tại các skill cơ bản KHÔNG có prerequisite — để mọi build đều accessible.
// Prerequisite sẽ được thêm vào skill tree riêng từng role (bước sau).
// ══════════════════════════════════════════════════════
var SKILL_PREREQUISITES = {
  // Các skill cơ bản không có prerequisite
  blade:    [],
  blunt:    [],
  firearm:  [],
  firstaid: [],
  sneak:    [],
  fitness:  [],
  carpentry:[],
  mental:   [],
  // Skill tree riêng của từng role sẽ được thêm ở đây sau
  // Ví dụ: 'soldier_berserk': [{ skill: 'blade', level: 5 }]
};

// ══════════════════════════════════════════════════════
// 3. SKILL_SYNERGIES
// ──────────────────────────────────────────────────────
// Cross-branch synergy: khi đầu tư đủ vào 2 nhánh khác nhau → unlock passive đặc biệt.
// Đây là cơ chế Diablo 2 — khuyến khích khám phá build thay vì chỉ maxout 1 skill.
//
// Cấu trúc: { id, name, desc, requires: [{skill, level}], jobFilter?, effect }
// jobFilter: chỉ unlock cho role nhất định (Signature Synergy)
// effect: object mà DW_getSkillEffect() trả về khi query synergy id
//
// Hiện tại: 8 synergy chung (không phân role) + role-specific sẽ thêm sau
// ══════════════════════════════════════════════════════
var SKILL_SYNERGIES = [

  // ── Synergy chung (mọi role đều có thể đạt) ──────

  {
    id: 'ghost_warrior',
    name: 'Chiến binh bóng tối',
    desc: 'Kết hợp tàng hình và lưỡi dao: Ám sát không gây noise.',
    requires: [{ skill: 'sneak', level: 5 }, { skill: 'blade', level: 5 }],
    effect: { stealth_kill_no_noise: true },
  },
  {
    id: 'iron_will',
    name: 'Ý chí sắt đá',
    desc: 'Thể lực mạnh + tâm lý vững: AP penalty từ stress không còn tác dụng.',
    requires: [{ skill: 'fitness', level: 5 }, { skill: 'mental', level: 5 }],
    effect: { stress_ap_penalty_immune: true },
  },
  {
    id: 'field_surgeon',
    name: 'Bác sĩ chiến trường',
    desc: 'Sơ cứu + thể lực: Hồi HP khi giết kẻ địch (1 HP/kill).',
    requires: [{ skill: 'firstaid', level: 5 }, { skill: 'fitness', level: 3 }],
    effect: { lifesteal_on_kill: 1 },
  },
  {
    id: 'silent_builder',
    name: 'Thợ xây bóng tối',
    desc: 'Tàng hình + thủ công: Barricade không tạo noise.',
    requires: [{ skill: 'sneak', level: 3 }, { skill: 'carpentry', level: 5 }],
    effect: { barricade_no_noise: true },
  },
  {
    id: 'war_machine',
    name: 'Cỗ máy chiến tranh',
    desc: 'Dao + gậy: Crit với dao gây thêm 1 damage blunt splash lên zombie kế bên.',
    requires: [{ skill: 'blade', level: 5 }, { skill: 'blunt', level: 5 }],
    effect: { crit_splash_blunt: 1 },
  },
  {
    id: 'medic_runner',
    name: 'Y tá tốc độ',
    desc: 'Sơ cứu + tàng hình: Dùng item y tế không tốn AP khi không bị phát hiện.',
    requires: [{ skill: 'firstaid', level: 3 }, { skill: 'sneak', level: 3 }],
    effect: { heal_free_when_hidden: true },
  },
  {
    id: 'gunslinger',
    name: 'Tay súng điêu luyện',
    desc: 'Súng + thể lực: Bắn không bị penalty AP khi đang chạy (di chuyển cùng lượt).',
    requires: [{ skill: 'firearm', level: 5 }, { skill: 'fitness', level: 4 }],
    effect: { shoot_after_move_no_penalty: true },
  },
  {
    id: 'zen_fighter',
    name: 'Chiến binh thiền định',
    desc: 'Ý chí + vũ khí chém: Khi stress < 30, tất cả crit chance +10%.',
    requires: [{ skill: 'mental', level: 5 }, { skill: 'blade', level: 3 }],
    effect: { low_stress_crit_bonus: 0.10 },
  },
];

// ══════════════════════════════════════════════════════
// 4. MILESTONE_DEFS
// ──────────────────────────────────────────────────────
// Signature Skills và milestone narrative moments.
// condition(state) → boolean: kiểm tra trong engine mỗi khi action relevant xảy ra.
// trackedCounter: nếu milestone dùng bộ đếm, đây là key trong state.milestoneCounters.
// grantSkill: ID của Signature Skill sẽ thêm vào state.signatureSkills.
// bonusSP: Skill Point thưởng thêm (optional).
//
// Mỗi role có 3 milestone: sớm (ngày 1–7), giữa (ngày 8–20), muộn (ngày 20+).
// Điều kiện được viết đơn giản — không có logic phức tạp trong data layer.
// ══════════════════════════════════════════════════════
var MILESTONE_DEFS = {

  // ── 🌾 NÔNG DÂN ──────────────────────────────────

  farmer_first_harvest: {
    name: 'Đất nuôi người',
    desc: 'Sống sót 5 ngày đầu chỉ bằng đồ ăn tự kiếm ngoài trời (không dùng đồ hộp).',
    jobFilter: 'farmer',
    trackedCounter: 'wild_food_days', // tăng mỗi ngày không ăn canned food
    condition: s => (s.milestoneCounters?.wild_food_days || 0) >= 5,
    grantSkill: 'forager_instinct', // Signature: cây hoang và nước ngầm hiện trên minimap
    bonusSP: 1,
  },
  farmer_long_road: {
    name: 'Con đường dài',
    desc: 'Di chuyển tổng cộng 50 tile ngoài trời trong một game.',
    jobFilter: 'farmer',
    trackedCounter: 'outdoor_tiles_moved',
    condition: s => (s.milestoneCounters?.outdoor_tiles_moved || 0) >= 50,
    grantSkill: 'terrain_reader', // Signature: AP cost ngoài trời luôn là 1 dù ngày hay đêm
    bonusSP: 1,
  },
  farmer_endurance: {
    name: 'Sức bền vô tận',
    desc: 'Sống sót đến ngày 30 mà không bao giờ để AP xuống 0.',
    jobFilter: 'farmer',
    condition: s => s.day >= 30 && !(s.milestones?.farmer_ap_zeroed),
    grantSkill: 'iron_stamina', // Signature: AP regen nhanh gấp đôi trong 24h sau khi ngủ
  },

  // ── 🚗 TÀI XẾ ────────────────────────────────────

  driver_city_ghost: {
    name: 'Bóng ma đô thị',
    desc: 'Đi qua 10 tile đường phố mà không kích hoạt bất kỳ zombie nào.',
    jobFilter: 'driver',
    trackedCounter: 'street_tiles_silent',
    condition: s => (s.milestoneCounters?.street_tiles_silent || 0) >= 10,
    grantSkill: 'city_navigation', // Signature: đường phố luôn hiển thị trên bản đồ dù chưa đến
    bonusSP: 1,
  },
  driver_getaway: {
    name: 'Thoát trong gang tấc',
    desc: 'Thoát chiến đấu thành công 10 lần trong một game.',
    jobFilter: 'driver',
    trackedCounter: 'successful_escapes',
    condition: s => (s.milestoneCounters?.successful_escapes || 0) >= 10,
    grantSkill: 'adrenaline_escape', // Signature: sau khi flee thành công, +3 AP ngay lập tức
    bonusSP: 1,
  },
  driver_route_master: {
    name: 'Bậc thầy lộ trình',
    desc: 'Khám phá 60% bản đồ trong một game.',
    jobFilter: 'driver',
    condition: s => {
      const total = DW_WORLD_SIZE * DW_WORLD_SIZE;
      const seen  = Object.keys(s.tiles || {}).length;
      return seen / total >= 0.6;
    },
    grantSkill: 'shortcut_sense', // Signature: thấy trước tile nguy hiểm (hiện icon cảnh báo)
    bonusSP: 2,
  },

  // ── 🔧 THỢ MÁY ───────────────────────────────────

  mechanic_first_trap: {
    name: 'Bẫy đầu tiên',
    desc: 'Đặt và kích hoạt thành công bẫy lần đầu tiên.',
    jobFilter: 'mechanic',
    condition: s => !!(s.milestones?.trap_triggered_once),
    grantSkill: 'trap_instinct', // Signature: bẫy tự chế có 25% hồi lại vật liệu sau kích hoạt
    bonusSP: 1,
  },
  mechanic_fortress: {
    name: 'Pháo đài nhỏ',
    desc: 'Nâng cấp base lên level 3 trong ngày 15 đầu tiên.',
    jobFilter: 'mechanic',
    condition: s => (s.base?.level || 0) >= 3 && s.day <= 15,
    grantSkill: 'reinforced_walls', // Signature: barricade level không giảm khi bị tấn công ban đêm
    bonusSP: 1,
  },
  mechanic_salvage_king: {
    name: 'Vua phế liệu',
    desc: 'Sửa chữa tổng cộng 30 vũ khí/công cụ trong một game.',
    jobFilter: 'mechanic',
    trackedCounter: 'items_repaired',
    condition: s => (s.milestoneCounters?.items_repaired || 0) >= 30,
    grantSkill: 'ghost_repair', // Signature: sửa đồ tốn 0 AP (chỉ tốn vật liệu)
    bonusSP: 2,
  },

  // ── ⚔️ QUÂN NHÂN ─────────────────────────────────

  soldier_first_blood: {
    name: 'Trận đầu',
    desc: 'Giết 10 zombie trong ngày đầu tiên.',
    jobFilter: 'soldier',
    trackedCounter: 'kills_day1',
    condition: s => s.day === 1 && (s.milestoneCounters?.kills_day1 || 0) >= 10,
    grantSkill: 'combat_instinct', // Signature: không bao giờ bị surprise attack (luôn ra đòn trước)
    bonusSP: 1,
  },
  soldier_meet_veteran: {
    name: 'Gặp đồng đội',
    desc: 'Gặp NPC có background quân sự và không tấn công họ.',
    jobFilter: 'soldier',
    condition: s => !!(s.milestones?.met_military_npc),
    grantSkill: 'squad_tactics', // Signature: khi có NPC đồng hành, cả hai nhận +1 AP/ngày
    bonusSP: 1,
  },
  soldier_war_hardened: {
    name: 'Quen với chiến trường',
    desc: 'Sống sót qua 5 encounter có boss hoặc horde.',
    jobFilter: 'soldier',
    trackedCounter: 'boss_horde_survived',
    condition: s => (s.milestoneCounters?.boss_horde_survived || 0) >= 5,
    grantSkill: 'battle_aura', // Signature: giết zombie không gây stress (thay vì +stress mỗi kill)
    bonusSP: 2,
  },

  // ── 🚔 CẢNH SÁT ──────────────────────────────────

  police_first_arrest: {
    name: 'Giữ trật tự',
    desc: 'Buộc NPC thù địch đầu tiên rút lui bằng súng (không cần giết).',
    jobFilter: 'police',
    condition: s => !!(s.milestones?.intimidated_hostile_npc),
    grantSkill: 'authority_presence', // Signature: NPC thù địch có 40% rút lui khi nhìn thấy player
    bonusSP: 1,
  },
  police_crowd_control: {
    name: 'Kiểm soát đám đông',
    desc: 'Dùng súng giết 3 zombie trong 1 lượt (burst hoặc 3 viên đơn).',
    jobFilter: 'police',
    trackedCounter: 'multi_kill_turns',
    condition: s => (s.milestoneCounters?.multi_kill_turns || 0) >= 1,
    grantSkill: 'rapid_response', // Signature: reload súng không tốn AP
    bonusSP: 1,
  },
  police_guardian: {
    name: 'Người bảo vệ',
    desc: 'Bảo vệ base khỏi 3 cuộc tấn công (defend choice trong base event).',
    jobFilter: 'police',
    trackedCounter: 'base_defenses',
    condition: s => (s.milestoneCounters?.base_defenses || 0) >= 3,
    grantSkill: 'perimeter_alert', // Signature: biết trước 1 ngày khi có base attack sắp đến
    bonusSP: 2,
  },

  // ── 🩺 Y TÁ ──────────────────────────────────────

  nurse_first_save: {
    name: 'Người cứu sống',
    desc: 'Chữa trị NPC lần đầu tiên.',
    jobFilter: 'nurse',
    condition: s => (s.milestoneCounters?.npcs_healed || 0) >= 1,
    grantSkill: 'healing_touch', // Signature: dùng item y tế cho người khác hồi thêm +2 HP
    bonusSP: 1,
  },
  nurse_five_lives: {
    name: 'Năm sinh mạng',
    desc: 'Cứu sống 5 NPC trong một game.',
    jobFilter: 'nurse',
    trackedCounter: 'npcs_healed',
    condition: s => (s.milestoneCounters?.npcs_healed || 0) >= 5,
    grantSkill: 'field_triage',   // Signature: nhận biết được NPC nào cần cứu trên minimap
    bonusSP: 1,
  },
  nurse_miracle: {
    name: 'Phép màu',
    desc: 'Hồi sinh NPC từ trạng thái "sắp chết" (HP ≤ 1) bằng medkit.',
    jobFilter: 'nurse',
    condition: s => !!(s.milestones?.revived_dying_npc),
    grantSkill: 'miracle_hands', // Signature: 1 lần/game, hồi sinh chính mình từ 0 HP về 1 HP
    bonusSP: 2,
  },

  // ── 📚 GIÁO VIÊN ─────────────────────────────────

  teacher_first_lesson: {
    name: 'Bài học đầu tiên',
    desc: 'Đọc sách sinh tồn lần đầu tiên.',
    jobFilter: 'teacher',
    condition: s => !!(s.milestones?.read_survival_book),
    grantSkill: 'rapid_learner', // Signature: đọc sách nhanh hơn (không tốn ngày, chỉ tốn 2 AP)
    bonusSP: 1,
  },
  teacher_knowledge_hub: {
    name: 'Kho tri thức',
    desc: 'Thu thập 5 cuốn sách hoặc tài liệu khác nhau.',
    jobFilter: 'teacher',
    trackedCounter: 'books_collected',
    condition: s => (s.milestoneCounters?.books_collected || 0) >= 5,
    grantSkill: 'tactical_mind', // Signature: thấy trước outcome của rumor (70% chính xác)
    bonusSP: 1,
  },
  teacher_mentor: {
    name: 'Người thầy',
    desc: 'Chia sẻ tri thức với 3 NPC khác nhau (teach action).',
    jobFilter: 'teacher',
    trackedCounter: 'npcs_taught',
    condition: s => (s.milestoneCounters?.npcs_taught || 0) >= 3,
    grantSkill: 'legacy_knowledge', // Signature: khi chết, NPC được dạy giữ lại một phần blueprint
    bonusSP: 2,
  },

  // ── 🍳 ĐẦU BẾP ───────────────────────────────────

  cook_first_meal: {
    name: 'Bữa ăn đầu tiên',
    desc: 'Nấu ăn lần đầu tiên trong game.',
    jobFilter: 'chef',
    condition: s => !!(s.milestones?.cooked_first_meal),
    grantSkill: 'recipe_memory', // Signature: nhớ công thức nấu ăn — không cần sách để nấu
    bonusSP: 1,
  },
  cook_feast: {
    name: 'Bữa tiệc sinh tồn',
    desc: 'Nấu một bữa ăn đủ nuôi 3+ người (crafting meal cho NPC).',
    jobFilter: 'chef',
    condition: s => !!(s.milestones?.cooked_feast),
    grantSkill: 'morale_meal', // Signature: bữa ăn nấu chín giảm stress -15 thay vì -5
    bonusSP: 1,
  },
  cook_survivor: {
    name: 'Sống bằng đất',
    desc: 'Sống 20 ngày mà không bao giờ để hunger xuống dưới 2.',
    jobFilter: 'chef',
    condition: s => s.day >= 20 && !(s.milestones?.cook_hunger_failed),
    grantSkill: 'zero_waste', // Signature: khi ăn đồ hộp, 30% hộp vỏ trở thành craft material
    bonusSP: 2,
  },

  // ── Milestone chung (mọi role) ────────────────────

  first_boss_kill: {
    name: 'Thứ không thể giết',
    desc: 'Hạ gục boss lần đầu tiên.',
    condition: s => (s.milestoneCounters?.boss_kills || 0) >= 1,
    bonusSP: 2,
  },
  day_50_survivor: {
    name: 'Cựu binh',
    desc: 'Sống sót đến ngày 50.',
    condition: s => s.day >= 50,
    bonusSP: 3,
  },
  full_map_explorer: {
    name: 'Người lập bản đồ',
    desc: 'Khám phá 80% bản đồ.',
    condition: s => {
      const total = DW_WORLD_SIZE * DW_WORLD_SIZE;
      const seen  = Object.keys(s.tiles || {}).length;
      return seen / total >= 0.8;
    },
    bonusSP: 2,
  },
};

// ══════════════════════════════════════════════════════
// ROLE TREE REGISTRY
// ──────────────────────────────────────────────────────
// DW_ROLE_TREES là registry trung tâm cho tất cả role skill trees.
// Mỗi role file (driver-skill-tree.js, farmer-skill-tree.js, ...)
// tự đăng ký vào đây khi load.
//
// engine-skills.js đọc từ đây — không cần sửa engine khi thêm role mới.
//
// Pattern thêm role mới:
//   1. Tạo file <role>-skill-tree.js
//   2. Kết thúc file bằng: DW_ROLE_TREES['<role>'] = <ROLE>_SKILL_TREE;
//   3. Thêm <script> vào HTML sau deadworld-data-addon.js
//   4. Xong — không cần sửa bất kỳ engine nào.
// ══════════════════════════════════════════════════════
var DW_ROLE_TREES = {};
