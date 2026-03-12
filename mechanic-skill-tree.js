// ══════════════════════════════════════════════════════
// DEAD WORLD — mechanic-skill-tree.js
// Role: Tho May (mechanic) | Fantasy: "Bien do nat thanh vu khi"
// 3 nhanh x 5 skill = 15 skill + 3 signature = 18 total
// Nhanh 1: CHE TAO  | Nhanh 2: CONG SU | Nhanh 3: SUA CHUA
// Balance v1.1: eternal_bond cap +100% max (eternal_bond_max_bonus: 1.0)
// ══════════════════════════════════════════════════════

var MECHANIC_SKILL_TREE = {

  // ── NHANH 1: CHE TAO ──
  tai_che_ban_nang: {
    id: 'tai_che_ban_nang', name: 'Tai Che Ban Nang',
    branch: 'che_tao', branchLabel: 'Che Tao', jobFilter: 'mechanic', icon: 'recycle',
    prereq: [], maxLevel: 10,
    desc: 'Khi loot tile hoac pha do, luon nhan them nguyen lieu tho.',
    effects: {
      1:  { scrap_bonus_chance: 0.25, label: '25% nhan them scrap khi loot bat ky tile' },
      2:  { scrap_bonus_chance: 0.35 },
      3:  { scrap_bonus_chance: 0.45, dismantle_unlock: true,
            label: 'Dismantle: pha vu khi/giap cu lay nguyen lieu chat luong cao' },
      4:  { scrap_bonus_chance: 0.50, dismantle_unlock: true },
      5:  { scrap_bonus_chance: 0.55, dismantle_unlock: true, scrap_quality: true,
            label: 'Scrap Quality: nguyen lieu nhan duoc co grade cao hon' },
      6:  { scrap_bonus_chance: 0.60, dismantle_unlock: true, scrap_quality: true },
      7:  { scrap_bonus_chance: 0.65, dismantle_unlock: true, scrap_quality: true, vehicle_salvage: true,
            label: 'Vehicle Salvage: xe hong tren map ra nguyen lieu dac biet' },
      8:  { scrap_bonus_chance: 0.70, dismantle_unlock: true, scrap_quality: true, vehicle_salvage: true },
      9:  { scrap_bonus_chance: 0.75, dismantle_unlock: true, scrap_quality: true, vehicle_salvage: true },
      10: { scrap_bonus_chance: 0.85, dismantle_unlock: true, scrap_quality: true, vehicle_salvage: true,
            zero_waste_craft: true, zero_waste_chance: 0.70,
            label: 'MASTERY: Zero Waste - 70% chance craft khong tieu het nguyen lieu' },
    },
  },

  cong_thuc_bi_mat: {
    id: 'cong_thuc_bi_mat', name: 'Cong Thuc Bi Mat',
    branch: 'che_tao', branchLabel: 'Che Tao', jobFilter: 'mechanic', icon: 'blueprint',
    prereq: [{ skill: 'tai_che_ban_nang', level: 3 }], maxLevel: 10,
    desc: 'Mo khoa cong thuc craft doc quyen - bay dien, luu dan tu che, vu khi cai tien.',
    effects: {
      1:  { exclusive_recipe_tier: 1, label: 'Tier 1 unlock: spike_trap, scrap_hammer' },
      2:  { exclusive_recipe_tier: 1, craft_ap_reduce: 1, label: 'Craft dac biet -1 AP' },
      3:  { exclusive_recipe_tier: 2, craft_ap_reduce: 1, label: 'Tier 2 unlock: pipe_bomb, wire_trap' },
      4:  { exclusive_recipe_tier: 2, craft_ap_reduce: 1 },
      5:  { exclusive_recipe_tier: 3, craft_ap_reduce: 1, label: 'Tier 3 unlock: shock_trap, plate_armor_diy' },
      6:  { exclusive_recipe_tier: 3, craft_ap_reduce: 2 },
      7:  { exclusive_recipe_tier: 4, craft_ap_reduce: 2, label: 'Tier 4 unlock: auto_trap, bite_vest' },
      8:  { exclusive_recipe_tier: 4, craft_ap_reduce: 2 },
      9:  { exclusive_recipe_tier: 4, craft_ap_reduce: 2 },
      10: { exclusive_recipe_tier: 4, craft_ap_reduce: 2, improvise_anything: true,
            label: 'MASTERY: Improvise Anything - craft duoc bat ky item tier 1-3 tu scrap' },
    },
  },

  cai_tien_vu_khi: {
    id: 'cai_tien_vu_khi', name: 'Cai Tien Vu Khi',
    branch: 'che_tao', branchLabel: 'Che Tao', jobFilter: 'mechanic', icon: 'upgrade',
    prereq: [{ skill: 'cong_thuc_bi_mat', level: 3 }], maxLevel: 10,
    desc: 'Nang cap vu khi hien co thay vi tim vu khi moi.',
    effects: {
      1:  { weapon_upgrade_unlock: true, label: 'Upgrade vu khi: +1 baseDmg +10 durMax (1 scrap + 1 AP)' },
      2:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.20 },
      3:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.25, weapon_mod_unlock: true,
            label: 'Weapon Mod: them dac tinh cho vu khi (silencer, blade wrap)' },
      4:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.30, weapon_mod_unlock: true },
      5:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.35, weapon_mod_unlock: true, masterwork: true,
            label: 'Masterwork: vu khi nang cap 3+ lan nhan tag "masterwork"' },
      6:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.40, weapon_mod_unlock: true, masterwork: true },
      7:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.45, weapon_mod_unlock: true,
            masterwork: true, legendary_forge: true,
            label: 'Legendary Forge: 1 vu khi toan game len "legendary" damage+2 durMax x2' },
      8:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.50, weapon_mod_unlock: true,
            masterwork: true, legendary_forge: true },
      9:  { weapon_upgrade_unlock: true, upgrade_mat_save: 0.55, weapon_mod_unlock: true,
            masterwork: true, legendary_forge: true },
      10: { weapon_upgrade_unlock: true, upgrade_mat_save: 0.60, weapon_mod_unlock: true,
            masterwork: true, legendary_forge: true, arsenal: true, dual_durability_split: true,
            label: 'MASTERY: Arsenal - mang 2 vu khi swap 0 AP. Ca 2 chia deu durability loss' },
    },
  },

  day_chuyen_san_xuat: {
    id: 'day_chuyen_san_xuat', name: 'Day Chuyen San Xuat',
    branch: 'che_tao', branchLabel: 'Che Tao', jobFilter: 'mechanic', icon: 'factory',
    prereq: [{ skill: 'cai_tien_vu_khi', level: 3 }], maxLevel: 10,
    desc: 'Craft nhieu item cung luc ton it nguyen lieu va AP hon.',
    effects: {
      1:  { batch_craft_discount: 0.15, label: 'Craft 2 item cung loai: tiet kiem 15% nguyen lieu' },
      2:  { batch_craft_discount: 0.20 },
      3:  { batch_craft_discount: 0.25, batch_ap_reduce: 1, label: 'Batch craft -1 AP cho moi lan them item' },
      4:  { batch_craft_discount: 0.30, batch_ap_reduce: 1 },
      5:  { batch_craft_discount: 0.35, batch_ap_reduce: 1, batch_max: 3, label: 'Batch toi da 3 item cung luc' },
      6:  { batch_craft_discount: 0.38, batch_ap_reduce: 1, batch_max: 4 },
      7:  { batch_craft_discount: 0.40, batch_ap_reduce: 2, batch_max: 4, supply_cache: true,
            label: 'Supply Cache: craft them 1 item ngau nhien cung loai moi batch' },
      8:  { batch_craft_discount: 0.43, batch_ap_reduce: 2, batch_max: 5, supply_cache: true },
      9:  { batch_craft_discount: 0.45, batch_ap_reduce: 2, batch_max: 5, supply_cache: true },
      10: { batch_craft_discount: 0.50, batch_ap_reduce: 2, batch_max: 6,
            supply_cache: true, automated_craft: true, automated_craft_daily_cap: 3,
            label: 'MASTERY: Automated Craft - 3 lan/ngay craft 1 batch khong can AP' },
    },
  },

  nha_may_di_dong: {
    id: 'nha_may_di_dong', name: 'Nha May Di Dong',
    branch: 'che_tao', branchLabel: 'Che Tao', jobFilter: 'mechanic', icon: 'workshop',
    prereq: [{ skill: 'day_chuyen_san_xuat', level: 5 }], maxLevel: 10,
    desc: 'Skill cuoi nhanh Che Tao. Tho May mang theo toan bo xuong trong dau.',
    effects: {
      1:  { field_craft_all: true, label: 'Craft duoc bat ky item tier 1 o ngoai troi khong can base' },
      2:  { field_craft_all: true, field_craft_tier: 2 },
      3:  { field_craft_all: true, field_craft_tier: 2, label: 'Tier 2 cung craft duoc ngoai troi' },
      4:  { field_craft_all: true, field_craft_tier: 2, toolbelt: true,
            label: 'Toolbelt: khong can mang toolbox' },
      5:  { field_craft_all: true, field_craft_tier: 3, toolbelt: true, label: 'Tier 3 craft duoc ngoai troi' },
      6:  { field_craft_all: true, field_craft_tier: 3, toolbelt: true, craft_xp_bonus: 0.25 },
      7:  { field_craft_all: true, field_craft_tier: 3, toolbelt: true, craft_xp_bonus: 0.30,
            schematic_memory: true,
            label: 'Schematic Memory: nho moi cong thuc da tung craft (khong can sach)' },
      8:  { field_craft_all: true, field_craft_tier: 3, toolbelt: true, craft_xp_bonus: 0.35, schematic_memory: true },
      9:  { field_craft_all: true, field_craft_tier: 3, toolbelt: true, craft_xp_bonus: 0.40, schematic_memory: true },
      10: { field_craft_all: true, field_craft_tier: 3, toolbelt: true, craft_xp_bonus: 0.50,
            schematic_memory: true, living_workshop: true,
            label: 'MASTERY: Living Workshop - khong can base hay toolbox cho bat ky recipe nao' },
    },
  },

  // ── NHANH 2: CONG SU ──
  barricade_chuyen_nghiep: {
    id: 'barricade_chuyen_nghiep', name: 'Barricade Chuyen Nghiep',
    branch: 'cong_su', branchLabel: 'Cong Su', jobFilter: 'mechanic', icon: 'fortify',
    prereq: [], maxLevel: 10,
    desc: 'Barricade cua Tho May ben hon, nhanh hon, va hieu qua hon.',
    effects: {
      1:  { barricade_ap_reduce: 1, barricade_hp_bonus: 0.15, label: 'Barricade -1 AP; +15% HP' },
      2:  { barricade_ap_reduce: 1, barricade_hp_bonus: 0.20 },
      3:  { barricade_ap_reduce: 1, barricade_hp_bonus: 0.25, barricade_mat_save: 0.20,
            label: 'Barricade tiet kiem 20% nguyen lieu' },
      4:  { barricade_ap_reduce: 2, barricade_hp_bonus: 0.30, barricade_mat_save: 0.25 },
      5:  { barricade_ap_reduce: 2, barricade_hp_bonus: 0.35, barricade_mat_save: 0.30,
            reinforced_barricade: true,
            label: 'Reinforced: barricade lv5 cua Tho May tuong duong lv7 cua role khac' },
      6:  { barricade_ap_reduce: 2, barricade_hp_bonus: 0.40, barricade_mat_save: 0.33, reinforced_barricade: true },
      7:  { barricade_ap_reduce: 2, barricade_hp_bonus: 0.50, barricade_mat_save: 0.35,
            reinforced_barricade: true, barricade_repair_passive: true,
            label: 'Passive Repair: barricade tu hoi 1 level moi sang neu con > 0' },
      8:  { barricade_ap_reduce: 2, barricade_hp_bonus: 0.55, barricade_mat_save: 0.38,
            reinforced_barricade: true, barricade_repair_passive: true },
      9:  { barricade_ap_reduce: 2, barricade_hp_bonus: 0.60, barricade_mat_save: 0.40,
            reinforced_barricade: true, barricade_repair_passive: true },
      10: { barricade_ap_reduce: 2, barricade_hp_bonus: 0.70, barricade_mat_save: 0.50,
            reinforced_barricade: true, barricade_repair_passive: true, indestructible_base: true,
            label: 'MASTERY: Indestructible Base - barricade lv5 khong the bi pha trong 1 dem' },
    },
  },

  bay_co_hoc: {
    id: 'bay_co_hoc', name: 'Bay Co Hoc',
    branch: 'cong_su', branchLabel: 'Cong Su', jobFilter: 'mechanic', icon: 'trap',
    prereq: [{ skill: 'barricade_chuyen_nghiep', level: 3 }], maxLevel: 10,
    desc: 'Dat bay thu dong trong tile. Zombie di qua nhan damage.',
    effects: {
      1:  { trap_unlock: true, trap_damage: 3, label: 'Bay co ban (spike_trap): 3 damage 1 lan kich hoat' },
      2:  { trap_unlock: true, trap_damage: 4, trap_reset: true, label: 'Bay tu reset sau 2 luot' },
      3:  { trap_unlock: true, trap_damage: 5, trap_reset: true, trap_types: 2,
            label: 'Trap tier 2: wire_trap (lam cham zombie 1 luot) mo khoa' },
      4:  { trap_unlock: true, trap_damage: 6, trap_reset: true, trap_types: 2 },
      5:  { trap_unlock: true, trap_damage: 7, trap_reset: true, trap_types: 3, trap_chain: true,
            label: 'Trap tier 3: shock_trap (stun) + Chain: kich hoat bay ke can' },
      6:  { trap_unlock: true, trap_damage: 8, trap_reset: true, trap_types: 3, trap_chain: true },
      7:  { trap_unlock: true, trap_damage: 10, trap_reset: true, trap_types: 4, trap_chain: true, trap_area: true,
            label: 'Area Trap: bay AoE anh huong toan tile (auto_trap tier 4)' },
      8:  { trap_unlock: true, trap_damage: 12, trap_reset: true, trap_types: 4, trap_chain: true, trap_area: true },
      9:  { trap_unlock: true, trap_damage: 14, trap_reset: true, trap_types: 4, trap_chain: true, trap_area: true },
      10: { trap_unlock: true, trap_damage: 16, trap_reset: true, trap_types: 4,
            trap_chain: true, trap_area: true, trap_network: true,
            label: 'MASTERY: Trap Network - tat ca bay radius 2 kich hoat dong loat' },
    },
  },

  lop_giap_tuy_chinh: {
    id: 'lop_giap_tuy_chinh', name: 'Lop Giap Tuy Chinh',
    branch: 'cong_su', branchLabel: 'Cong Su', jobFilter: 'mechanic', icon: 'armor',
    prereq: [{ skill: 'bay_co_hoc', level: 3 }], maxLevel: 10,
    desc: 'Gia co giap hien co thay vi tim giap moi.',
    effects: {
      1:  { armor_upgrade_unlock: true, label: 'Armor Upgrade: +1 armorBonus +15 durMax (1 scrap + 1 AP)' },
      2:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.15 },
      3:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.20, armor_mod_unlock: true,
            label: 'Armor Mod: them dac tinh padding (giam bleed) spike (phan damage)' },
      4:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.25, armor_mod_unlock: true },
      5:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.30, armor_mod_unlock: true, custom_fit: true,
            label: 'Custom Fit: giap tu che khong bi penalty carry weight' },
      6:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.35, armor_mod_unlock: true, custom_fit: true },
      7:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.40,
            armor_mod_unlock: true, custom_fit: true, reactive_armor: true,
            label: 'Reactive Armor: khi nhan damage lon (>=5) tu giam 2 damage' },
      8:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.45, armor_mod_unlock: true, custom_fit: true, reactive_armor: true },
      9:  { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.50, armor_mod_unlock: true, custom_fit: true, reactive_armor: true },
      10: { armor_upgrade_unlock: true, armor_upgrade_mat_save: 0.60,
            armor_mod_unlock: true, custom_fit: true, reactive_armor: true, fortress_body: true,
            label: 'MASTERY: Fortress Body - giam 3 damage tat ca don thuong' },
    },
  },

  phao_dai_song: {
    id: 'phao_dai_song', name: 'Phao Dai Song',
    branch: 'cong_su', branchLabel: 'Cong Su', jobFilter: 'mechanic', icon: 'castle',
    prereq: [{ skill: 'lop_giap_tuy_chinh', level: 3 }], maxLevel: 10,
    desc: 'Bien bat ky tile nao thanh defended zone.',
    effects: {
      1:  { defended_zone_unlock: true, label: 'Defended Zone: tile duoc set up co 2 lop barricade' },
      2:  { defended_zone_unlock: true, zone_trap_bonus: 0.20 },
      3:  { defended_zone_unlock: true, zone_trap_bonus: 0.25, zone_alarm: true,
            label: 'Zone Alarm: khi zombie pha lop barricade dau nhan canh bao ngay' },
      4:  { defended_zone_unlock: true, zone_trap_bonus: 0.30, zone_alarm: true },
      5:  { defended_zone_unlock: true, zone_trap_bonus: 0.35, zone_alarm: true, kill_zone: true,
            label: 'Kill Zone: zombie vao defended zone nhan them 2 damage/luot' },
      6:  { defended_zone_unlock: true, zone_trap_bonus: 0.40, zone_alarm: true, kill_zone: true },
      7:  { defended_zone_unlock: true, zone_trap_bonus: 0.45, zone_alarm: true,
            kill_zone: true, choke_point: true,
            label: 'Choke Point: zombie chi co the vao defended zone tu 1 huong' },
      8:  { defended_zone_unlock: true, zone_trap_bonus: 0.50, zone_alarm: true, kill_zone: true, choke_point: true },
      9:  { defended_zone_unlock: true, zone_trap_bonus: 0.55, zone_alarm: true, kill_zone: true, choke_point: true },
      10: { defended_zone_unlock: true, zone_trap_bonus: 0.60, zone_alarm: true,
            kill_zone: true, choke_point: true, bunker: true,
            label: 'MASTERY: Bunker - defended zone khong the bi pha hoan toan trong 1 dem' },
    },
  },

  ky_su_chien_truong: {
    id: 'ky_su_chien_truong', name: 'Ky Su Chien Truong',
    branch: 'cong_su', branchLabel: 'Cong Su', jobFilter: 'mechanic', icon: 'war',
    prereq: [{ skill: 'phao_dai_song', level: 5 }], maxLevel: 10,
    desc: 'Skill cuoi nhanh Cong Su. Tho May bien toan bo map thanh chien truong co loi.',
    effects: {
      1:  { fortify_bonus: 0.15, label: 'Tat ca cong trinh phong thu +15% hieu qua' },
      2:  { fortify_bonus: 0.20 },
      3:  { fortify_bonus: 0.25, mobile_defense: true,
            label: 'Mobile Defense: dung barricade tam thoi trong combat (1 AP block 1 don)' },
      4:  { fortify_bonus: 0.30, mobile_defense: true },
      5:  { fortify_bonus: 0.35, mobile_defense: true, siegebreaker: true,
            label: 'Siegebreaker: khi base bi tan cong kich hoat tat ca bay dong thoi' },
      6:  { fortify_bonus: 0.40, mobile_defense: true, siegebreaker: true },
      7:  { fortify_bonus: 0.45, mobile_defense: true, siegebreaker: true, engineer_aura: true,
            label: 'Engineer Aura: NPC dong hanh nhan loi ich tu defended zone' },
      8:  { fortify_bonus: 0.50, mobile_defense: true, siegebreaker: true, engineer_aura: true },
      9:  { fortify_bonus: 0.55, mobile_defense: true, siegebreaker: true, engineer_aura: true },
      10: { fortify_bonus: 0.60, mobile_defense: true, siegebreaker: true, engineer_aura: true, war_engineer: true,
            label: 'MASTERY: War Engineer - doc toan bo ban do nhu chien dia' },
    },
  },

  // ── NHANH 3: SUA CHUA ──
  tay_nghe_vung: {
    id: 'tay_nghe_vung', name: 'Tay Nghe Vung',
    branch: 'sua_chua', branchLabel: 'Sua Chua', jobFilter: 'mechanic', icon: 'wrench',
    prereq: [], maxLevel: 10,
    desc: 'Repair ton it AP, it nguyen lieu, phuc hoi nhieu durability hon.',
    effects: {
      1:  { repair_ap_reduce: 1, repair_restore_bonus: 0.15, label: 'Repair -1 AP; phuc hoi +15% durability' },
      2:  { repair_ap_reduce: 1, repair_restore_bonus: 0.20, repair_mat_save: 0.15 },
      3:  { repair_ap_reduce: 1, repair_restore_bonus: 0.25, repair_mat_save: 0.20, diagnose_durability: true,
            label: 'Chan Doan: thay durability chinh xac cua moi item trong tile' },
      4:  { repair_ap_reduce: 1, repair_restore_bonus: 0.30, repair_mat_save: 0.25, diagnose_durability: true },
      5:  { repair_ap_reduce: 2, repair_restore_bonus: 0.35, repair_mat_save: 0.30,
            diagnose_durability: true, full_restore: true,
            label: 'Full Restore: 1 lan/ngay repair 1 item ve 100% durability' },
      6:  { repair_ap_reduce: 2, repair_restore_bonus: 0.40, repair_mat_save: 0.35, diagnose_durability: true, full_restore: true },
      7:  { repair_ap_reduce: 2, repair_restore_bonus: 0.45, repair_mat_save: 0.40,
            diagnose_durability: true, full_restore: true, repair_mastery: true,
            label: 'Repair Mastery: repair khong bao gio that bai' },
      8:  { repair_ap_reduce: 2, repair_restore_bonus: 0.50, repair_mat_save: 0.45, diagnose_durability: true, full_restore: true, repair_mastery: true },
      9:  { repair_ap_reduce: 2, repair_restore_bonus: 0.55, repair_mat_save: 0.50, diagnose_durability: true, full_restore: true, repair_mastery: true },
      10: { repair_ap_reduce: 2, repair_restore_bonus: 0.60, repair_mat_save: 0.60,
            diagnose_durability: true, full_restore: true, repair_mastery: true, ghost_repair_passive: true,
            label: 'MASTERY: Ghost Repair Passive - repair khong bao gio ton AP' },
    },
  },

  sua_bang_bat_cu_thu_gi: {
    id: 'sua_bang_bat_cu_thu_gi', name: 'Sua Bang Bat Cu Thu Gi',
    branch: 'sua_chua', branchLabel: 'Sua Chua', jobFilter: 'mechanic', icon: 'improvise',
    prereq: [{ skill: 'tay_nghe_vung', level: 3 }], maxLevel: 10,
    desc: 'Loai bo yeu cau nguyen lieu cu the. Bat ky thu gi deu co the la repair material.',
    effects: {
      1:  { any_material_repair: true, repair_material_efficiency: 0.80,
            label: 'Bat ky item nao cung dung repair duoc (efficiency 80%)' },
      2:  { any_material_repair: true, repair_material_efficiency: 0.85 },
      3:  { any_material_repair: true, repair_material_efficiency: 0.90, label: 'Efficiency 90%' },
      4:  { any_material_repair: true, repair_material_efficiency: 0.95 },
      5:  { any_material_repair: true, repair_material_efficiency: 1.00, scrap_to_mat: true,
            label: 'Scrap to Mat: scrap kim loai/go co gia tri repair bang mat chuan' },
      6:  { any_material_repair: true, repair_material_efficiency: 1.00, scrap_to_mat: true },
      7:  { any_material_repair: true, repair_material_efficiency: 1.10, scrap_to_mat: true, repair_from_nothing: true,
            label: 'Repair from Nothing: 1 lan/ngay repair nho (5 durability) khong can nguyen lieu' },
      8:  { any_material_repair: true, repair_material_efficiency: 1.15, scrap_to_mat: true, repair_from_nothing: true },
      9:  { any_material_repair: true, repair_material_efficiency: 1.20, scrap_to_mat: true, repair_from_nothing: true },
      10: { any_material_repair: true, repair_material_efficiency: 1.25,
            scrap_to_mat: true, repair_from_nothing: true, alchemist: true,
            label: 'MASTERY: Alchemist - repair bat ky thu gi tu bat ky thu gi. Gioi han la AP' },
    },
  },

  bao_tri_dinh_ky: {
    id: 'bao_tri_dinh_ky', name: 'Bao Tri Dinh Ky',
    branch: 'sua_chua', branchLabel: 'Sua Chua', jobFilter: 'mechanic', icon: 'moon',
    prereq: [{ skill: 'sua_bang_bat_cu_thu_gi', level: 3 }], maxLevel: 10,
    // B1 FIX: nightly_repair chi vua du bu decay (-1/slot/ngay).
    // inBase = full repair | ngoai base = 50% (lam tron xuong).
    // Decay rate: ~1/slot/ngay → lv1 net=0, lv5 net=+2, lv10 net=+4 (khi trong base).
    desc: 'Moi dem ngu trong base, equipment tu dong duoc bao duong day du. Ngu ngoai chi hoi 50%.',
    effects: {
      1:  { nightly_repair: 1, nightly_repair_inbase_only_full: true,
            label: 'Trong base: hoi 1 dur/slot. Ngoai base: 50% (= 0, lam tron xuong)' },
      2:  { nightly_repair: 1, nightly_repair_inbase_only_full: true },
      3:  { nightly_repair: 2, nightly_repair_inbase_only_full: true, nightly_repair_free: true,
            label: 'Bao tri dem khong ton nguyen lieu' },
      4:  { nightly_repair: 2, nightly_repair_inbase_only_full: true, nightly_repair_free: true },
      5:  { nightly_repair: 3, nightly_repair_inbase_only_full: true, nightly_repair_free: true,
            equipment_decay_slow: 0.30,
            label: 'Equipment decay 30% cham hon khi dung' },
      6:  { nightly_repair: 3, nightly_repair_inbase_only_full: true, nightly_repair_free: true,
            equipment_decay_slow: 0.40 },
      7:  { nightly_repair: 4, nightly_repair_inbase_only_full: true, nightly_repair_free: true,
            equipment_decay_slow: 0.50, pre_combat_check: true,
            label: 'Pre-Combat Check: truoc moi combat equipment tu boost +5 durability' },
      8:  { nightly_repair: 4, nightly_repair_inbase_only_full: true, nightly_repair_free: true,
            equipment_decay_slow: 0.55, pre_combat_check: true },
      9:  { nightly_repair: 5, nightly_repair_inbase_only_full: true, nightly_repair_free: true,
            equipment_decay_slow: 0.60, pre_combat_check: true },
      10: { nightly_repair: 5, nightly_repair_inbase_only_full: true, nightly_repair_free: true,
            equipment_decay_slow: 0.70,
            pre_combat_check: true, eternal_maintenance: true,
            label: 'MASTERY: Eternal Maintenance - equipment khong xuong duoi 10 durability khi ngu' },
    },
  },

  chan_doan_nhanh: {
    id: 'chan_doan_nhanh', name: 'Chan Doan Nhanh',
    branch: 'sua_chua', branchLabel: 'Sua Chua', jobFilter: 'mechanic', icon: 'diagnose',
    prereq: [{ skill: 'bao_tri_dinh_ky', level: 3 }], maxLevel: 10,
    desc: 'Tho May nhin vao thu gi do va biet ngay no can gi.',
    effects: {
      1:  { repair_preview: true, label: 'Thay truoc can bao nhieu vat lieu va AP de repair' },
      2:  { repair_preview: true, repair_efficiency_bonus: 0.10 },
      3:  { repair_preview: true, repair_efficiency_bonus: 0.15, triage_repair: true,
            label: 'Triage Repair: repair item nguy cap nhat tu dong - 1 lan/ngay' },
      4:  { repair_preview: true, repair_efficiency_bonus: 0.20, triage_repair: true },
      5:  { repair_preview: true, repair_efficiency_bonus: 0.25, triage_repair: true, item_appraise: true,
            label: 'Appraise: nhin vao item biet duoc gia tri that cua no' },
      6:  { repair_preview: true, repair_efficiency_bonus: 0.30, triage_repair: true, item_appraise: true },
      7:  { repair_preview: true, repair_efficiency_bonus: 0.35,
            triage_repair: true, item_appraise: true, mechanical_empathy: true,
            label: 'Mechanical Empathy: biet khi nao barricade bay tile ke can can bao duong' },
      8:  { repair_preview: true, repair_efficiency_bonus: 0.40, triage_repair: true, item_appraise: true, mechanical_empathy: true },
      9:  { repair_preview: true, repair_efficiency_bonus: 0.45, triage_repair: true, item_appraise: true, mechanical_empathy: true },
      10: { repair_preview: true, repair_efficiency_bonus: 0.50,
            triage_repair: true, item_appraise: true, mechanical_empathy: true, perfect_diagnosis: true,
            label: 'MASTERY: Perfect Diagnosis - biet chinh xac thu gi dang xay ra voi moi vat the trong tile' },
    },
  },

  vinh_cuu: {
    id: 'vinh_cuu', name: 'Vinh Cuu',
    branch: 'sua_chua', branchLabel: 'Sua Chua', jobFilter: 'mechanic', icon: 'infinity',
    prereq: [{ skill: 'chan_doan_nhanh', level: 5 }], maxLevel: 10,
    desc: 'Skill cuoi nhanh Sua Chua. Equipment ton tai mai mai neu duoc cham soc dung cach.',
    effects: {
      1:  { durability_floor: 1, label: 'Equipment khong bao gio hong hoan toan (floor 1 durability)' },
      2:  { durability_floor: 2 },
      3:  { durability_floor: 3, legendary_item_chance: 0.05,
            label: '5% chance item duoc repair thanh "legendary" (random bonus stat)' },
      4:  { durability_floor: 3, legendary_item_chance: 0.08 },
      5:  { durability_floor: 5, legendary_item_chance: 0.10, heirloom: true,
            label: 'Heirloom: 1 item tag "heirloom" khong bao gio hong khong bi mat khi bi cuop' },
      6:  { durability_floor: 5, legendary_item_chance: 0.12, heirloom: true },
      7:  { durability_floor: 8, legendary_item_chance: 0.15, heirloom: true,
            eternal_bond: true, eternal_bond_max_bonus: 1.0,
            label: 'Eternal Bond: vu khi heirloom tang damage 10%/ngay mang (toi da +100%)' },
      8:  { durability_floor: 8, legendary_item_chance: 0.18, heirloom: true, eternal_bond: true, eternal_bond_max_bonus: 1.0 },
      9:  { durability_floor: 10, legendary_item_chance: 0.20, heirloom: true, eternal_bond: true, eternal_bond_max_bonus: 1.0 },
      10: { durability_floor: 10, legendary_item_chance: 0.25,
            heirloom: true, eternal_bond: true, eternal_bond_max_bonus: 1.0, immortal_gear: true,
            label: 'MASTERY: Immortal Gear - tat ca equipment khong bao gio hong (boss exception: 20% override)' },
    },
  },

};

// ── PREREQUISITE ──
(function () {
  if (typeof SKILL_PREREQUISITES === 'undefined') return;
  SKILL_PREREQUISITES.cong_thuc_bi_mat       = [{ skill: 'tai_che_ban_nang',       level: 3 }];
  SKILL_PREREQUISITES.cai_tien_vu_khi        = [{ skill: 'cong_thuc_bi_mat',       level: 3 }];
  SKILL_PREREQUISITES.day_chuyen_san_xuat    = [{ skill: 'cai_tien_vu_khi',        level: 3 }];
  SKILL_PREREQUISITES.nha_may_di_dong        = [{ skill: 'day_chuyen_san_xuat',    level: 5 }];
  SKILL_PREREQUISITES.bay_co_hoc             = [{ skill: 'barricade_chuyen_nghiep', level: 3 }];
  SKILL_PREREQUISITES.lop_giap_tuy_chinh     = [{ skill: 'bay_co_hoc',             level: 3 }];
  SKILL_PREREQUISITES.phao_dai_song          = [{ skill: 'lop_giap_tuy_chinh',     level: 3 }];
  SKILL_PREREQUISITES.ky_su_chien_truong     = [{ skill: 'phao_dai_song',          level: 5 }];
  SKILL_PREREQUISITES.sua_bang_bat_cu_thu_gi = [{ skill: 'tay_nghe_vung',          level: 3 }];
  SKILL_PREREQUISITES.bao_tri_dinh_ky        = [{ skill: 'sua_bang_bat_cu_thu_gi', level: 3 }];
  SKILL_PREREQUISITES.chan_doan_nhanh        = [{ skill: 'bao_tri_dinh_ky',        level: 3 }];
  SKILL_PREREQUISITES.vinh_cuu               = [{ skill: 'chan_doan_nhanh',         level: 5 }];
})();

// ── SIGNATURE HINTS ──
var MECHANIC_SIGNATURE_HINTS = {
  mechanic_first_invention: {
    hint_50:  'Doi tay anh lam truoc khi dau oc kip nghi. Khong phai theo ban ve nao.',
    hint_80:  'Anh bat dau nhin thay nhung thu nguoi khac khong thay. Mot cai lo xo cu. Mot doan day dien. Chung gan nhu tu ghep lai.',
    hint_100: 'Muoi lan bien khong thanh co. Anh khong con can ban ve nua - ngon tay anh da la ban ve. Trap Instinct mo khoa.',
    unlock_skill: 'trap_instinct', unlock_label: 'Trap Instinct',
  },
  mechanic_homebuilder: {
    hint_50:  'Anh dung truoc buc tuong vua xay va cam thay mot thu la lam - thu gi do gan giong nhu yen tinh.',
    hint_80:  'Nguoi ta xay tuong de ngan the gioi ben ngoai. Anh xay tuong de nhac nho ban than rang van con thu gi do dang bao ve.',
    hint_100: 'Ba noi. Ba buc tuong ma anh biet se dung vung khi anh khong con o do. Khong phai ky niem. La chung cu. Reinforced Walls mo khoa.',
    unlock_skill: 'reinforced_walls', unlock_label: 'Reinforced Walls',
  },
  mechanic_salvage_king: {
    hint_50:  'Anh sua cai bua lan thu ba hom nay. Nguoi khac da bo no tu lan thu nhat.',
    hint_80:  'Tay anh chuyen dong gan nhu khong can nghi. Siet kiem tra siet lai. Moi thu anh cham vao deu ke cau chuyen cua no.',
    hint_100: 'Ba muoi lan anh dat tay vao thu gi do da gan chet va keo no tro lai. Vi anh khong the nhin thu gi bi lang phi. Ghost Repair mo khoa.',
    unlock_skill: 'ghost_repair', unlock_label: 'Ghost Repair',
  },
};
(function () {
  if (typeof MILESTONE_DEFS === 'undefined') return;
  if (MILESTONE_DEFS.mechanic_first_invention) MILESTONE_DEFS.mechanic_first_invention.hints = MECHANIC_SIGNATURE_HINTS.mechanic_first_invention;
  if (MILESTONE_DEFS.mechanic_homebuilder) MILESTONE_DEFS.mechanic_homebuilder.hints = MECHANIC_SIGNATURE_HINTS.mechanic_homebuilder;
  if (MILESTONE_DEFS.mechanic_salvage_king) MILESTONE_DEFS.mechanic_salvage_king.hints = MECHANIC_SIGNATURE_HINTS.mechanic_salvage_king;
})();

// ── SYNERGIES ──
(function () {
  if (typeof SKILL_SYNERGIES === 'undefined') return;
  SKILL_SYNERGIES.push(
    {
      id: 'fortress_maker', name: 'Nguoi Xay Phao Dai',
      desc: 'Che Tao + Cong Su: bay duoc craft voi nguyen lieu thap hon 40% va damage tang 25%.',
      jobFilter: 'mechanic',
      requires: [{ skill: 'cong_thuc_bi_mat', level: 5 }, { skill: 'bay_co_hoc', level: 3 }],
      effect: { trap_craft_discount: 0.40, trap_damage_bonus: 0.25 },
    },
    {
      id: 'iron_endurance', name: 'Suc Ben Sat Thep',
      desc: 'Cong Su + Sua Chua: khi o trong defended zone equipment khong mat durability tu combat binh thuong.',
      jobFilter: 'mechanic',
      requires: [{ skill: 'phao_dai_song', level: 3 }, { skill: 'bao_tri_dinh_ky', level: 5 }],
      effect: { home_zone_no_durability_loss: true },
      alt_effect: { home_zone_npc_protection: true },
    }
  );
})();

// ── SELF-REGISTRATION ──
(function () {
  if (typeof DW_ROLE_TREES === 'undefined') { console.error('[Deadworld] DW_ROLE_TREES chua khai bao.'); return; }
  DW_ROLE_TREES['mechanic'] = MECHANIC_SKILL_TREE;
  if (typeof DW_SKILLS === 'undefined') return;
  for (const [key, def] of Object.entries(MECHANIC_SKILL_TREE)) {
    if (!DW_SKILLS[key]) {
      DW_SKILLS[key] = { id: def.id, name: def.name, branch: def.branch,
        jobFilter: def.jobFilter, isSignature: def.isSignature || false, maxLevel: def.maxLevel || 10 };
    }
  }
})();
