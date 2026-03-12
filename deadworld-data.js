// ══════════════════════════════════════════════════════
// DEAD WORLD — DATA LAYER v2
// Pure data. No DOM. No game logic.
// Inventory now stores item IDs only — no weight strings.
// ══════════════════════════════════════════════════════

// ── SEEDED PRNG ───────────────────────────────────────
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashCoord(gameId, x, y) {
  let h = 2166136261 >>> 0;
  for (const c of String(gameId)+'|'+x+'|'+y) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
function weightedPick(arr, rng) {
  const total = arr.reduce((s,e)=>s+(e.w||1),0);
  let r = rng() * total;
  for (const e of arr) { r -= (e.w||1); if (r<=0) return e; }
  return arr[arr.length-1];
}

// ── CONSTANTS ─────────────────────────────────────────
var DW_WORLD_SIZE = 30;
var DW_SPAWN_X    = 15;
var DW_SPAWN_Y    = 15;
var DW_SAVE_KEY   = 'dw_world_v4'; // v4: biome world gen, new tile types

// ══════════════════════════════════════════════════════
// ITEM DATABASE
// Single source of truth. Every item in the game is here.
// Inventory stores string IDs like "bandage", "kitchen_knife".
// Weight, icon, name, tags all come from here — never from
// parsing a string like "Băng gạc (0.2kg)" anymore.
// ══════════════════════════════════════════════════════
var ITEM_DB = {

  // ── MEDICAL ──────────────────────────────────────────
  bandage:{id:'bandage',name:'Băng gạc',icon:'🩹',weight:0.2,type:'medical',tier:1,
    usable:true,useEffect:{hp:2,skillScale:'firstaid'},tags:['heal','repair_mat'],
    desc:'Băng vết thương. +2 HP.'},
  alcohol:{id:'alcohol',name:'Cồn y tế',icon:'🧴',weight:0.3,type:'medical',tier:1,
    usable:true,useEffect:{hp:1,removesStatus:'bleed'},tags:['heal','craft_mat','repair_mat'],
    desc:'Khử trùng. Cầm máu.'},
  antibiotic:{id:'antibiotic',name:'Kháng sinh',icon:'💊',weight:0.1,type:'medical',tier:2,
    usable:true,useEffect:{hp:3,removesStatus:'poison'},tags:['heal'],
    desc:'+3 HP. Trị nhiễm độc.'},
  paracetamol:{id:'paracetamol',name:'Paracetamol',icon:'💊',weight:0.1,type:'medical',tier:1,
    usable:true,useEffect:{hp:1,stress:-10},tags:['heal'],desc:'+1 HP. Stress -10.'},
  morphine:{id:'morphine',name:'Morphine',icon:'💉',weight:0.1,type:'medical',tier:3,
    usable:true,useEffect:{hp:5,stress:-30},tags:['heal'],desc:'+5 HP, Stress -30.'},
  medkit:{id:'medkit',name:'Bộ sơ cứu đầy đủ',icon:'🩺',weight:1.0,type:'medical',tier:3,
    usable:true,useEffect:{hp:4,stress:-15,skillScale:'firstaid'},tags:['heal'],
    desc:'+4 HP (+1/level sơ cứu). Stress -15.'},
  medkit_field:{id:'medkit_field',name:'Bộ sơ cứu dã chiến',icon:'🩹',weight:0.4,type:'medical',tier:2,
    usable:true,useEffect:{hp:3,stress:-8},tags:['heal'],desc:'Tự chế. +3 HP, Stress -8.'},
  hydrogen_peroxide:{id:'hydrogen_peroxide',name:'Oxy già',icon:'🧴',weight:0.2,type:'medical',tier:1,
    usable:true,useEffect:{hp:1,removesStatus:'bleed'},tags:['heal','craft_mat'],desc:'+1 HP. Cầm máu.'},
  vitamin_c:{id:'vitamin_c',name:'Vitamin C',icon:'🍊',weight:0.1,type:'medical',tier:1,
    usable:true,useEffect:{stress:-5,hunger:0.5},tags:['heal'],desc:'Stress -5.'},
  antibacterial_cream:{id:'antibacterial_cream',name:'Kem kháng khuẩn',icon:'🧴',weight:0.1,
    type:'medical',tier:1,usable:true,useEffect:{hp:1,removesStatus:'bleed'},tags:['heal'],
    desc:'+1 HP. Ngăn nhiễm trùng.'},
  sleeping_pills:{id:'sleeping_pills',name:'Thuốc ngủ',icon:'💊',weight:0.1,type:'medical',tier:2,
    usable:true,useEffect:{stress:-25,depression:-10},tags:['heal'],desc:'Stress -25, Trầm cảm -10.'},
  painkiller:{id:'painkiller',name:'Thuốc giảm đau',icon:'💊',weight:0.1,type:'medical',tier:1,
    usable:true,useEffect:{hp:1,stress:-10},tags:['heal'],desc:'+1 HP, Stress -10.'},
  elastic_bandage:{id:'elastic_bandage',name:'Băng thun',icon:'🩹',weight:0.2,type:'medical',tier:1,
    usable:true,useEffect:{hp:1,removesStatus:'bleed'},tags:['heal','repair_mat'],desc:'+1 HP. Cầm máu.'},
  iv_drip:{id:'iv_drip',name:'IV drip',icon:'💉',weight:0.5,type:'medical',tier:3,
    usable:true,useEffect:{hp:6,thirst:2},tags:['heal'],desc:'+6 HP, Thirst +2.'},
  blood_pressure_monitor:{id:'blood_pressure_monitor',name:'Máy đo huyết áp',icon:'🩺',weight:0.3,
    type:'misc',tier:1,usable:true,useEffect:{revealStats:true},tags:['misc'],
    desc:'Xem chính xác chỉ số sức khỏe.'},

  // ── FOOD & DRINK ──────────────────────────────────────
  bread:{id:'bread',name:'Bánh mì',icon:'🍞',weight:0.5,type:'food',tier:1,
    usable:true,useEffect:{hunger:3.0},tags:['food'],desc:'Hunger +3.'},
  canned_food:{id:'canned_food',name:'Đồ hộp',icon:'🥫',weight:0.8,type:'food',tier:1,
    usable:true,useEffect:{hunger:3.0},tags:['food'],desc:'Hunger +3.'},
  instant_noodle:{id:'instant_noodle',name:'Mì gói',icon:'🍜',weight:0.1,type:'food',tier:0,
    usable:true,useEffect:{hunger:2.5},tags:['food'],desc:'Hunger +2.5. Nhẹ.'},
  energy_candy:{id:'energy_candy',name:'Kẹo năng lượng',icon:'🍬',weight:0.2,type:'food',tier:1,
    usable:true,useEffect:{hunger:1.5,stress:-5},tags:['food'],desc:'Hunger +1.5, Stress -5.'},
  soda:{id:'soda',name:'Nước ngọt',icon:'🥤',weight:0.5,type:'food',tier:1,
    usable:true,useEffect:{thirst:2.0,hunger:0.5},tags:['drink'],desc:'Thirst +2, Hunger +0.5.'},
  water_bottle:{id:'water_bottle',name:'Nước suối 1.5L',icon:'💧',weight:1.5,type:'drink',tier:1,
    usable:true,useEffect:{thirst:3.5},tags:['drink'],desc:'Thirst +3.5.'},
  rainwater:{id:'rainwater',name:'Nước mưa 0.5L',icon:'🌧️',weight:0.5,type:'drink',tier:0,
    usable:true,useEffect:{thirst:2.0},tags:['drink'],desc:'Thirst +2.'},
  wild_fruit:{id:'wild_fruit',name:'Quả dại',icon:'🍇',weight:0.2,type:'food',tier:0,
    usable:true,useEffect:{hunger:2.0,thirst:0.5},tags:['food'],desc:'Hunger +2, Thirst +0.5.'},
  mushroom:{id:'mushroom',name:'Nấm rừng',icon:'🍄',weight:0.1,type:'food',tier:0,
    usable:true,useEffect:{hunger:1.5},tags:['food','craft_mat'],desc:'Hunger +1.5. Dùng làm độc.'},
  military_ration:{id:'military_ration',name:'Khẩu phần quân sự',icon:'🍱',weight:0.5,type:'food',tier:3,
    usable:true,useEffect:{hunger:5.0,thirst:1.0,stress:-8},tags:['food'],
    desc:'Hunger +5, Thirst +1, Stress -8. Loại tốt nhất.'},

  // ── WEAPONS — BLADE ──────────────────────────────────
  box_cutter:{id:'box_cutter',name:'Dao rọc giấy',icon:'🔪',weight:0.1,type:'weapon',tier:0,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade'],desc:'Yếu nhất.'},
  scissors:{id:'scissors',name:'Kéo',icon:'✂️',weight:0.2,type:'weapon',tier:0,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade','craft_mat'],desc:'Tier 0.'},
  small_knife:{id:'small_knife',name:'Dao nhỏ',icon:'🔪',weight:0.2,type:'weapon',tier:1,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade'],desc:'Nhanh, ám sát x2.'},
  kitchen_knife:{id:'kitchen_knife',name:'Dao bếp',icon:'🔪',weight:0.3,type:'weapon',tier:1,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade','craft_mat'],desc:'Cân bằng tốt.'},
  scalpel:{id:'scalpel',name:'Dao mổ',icon:'🔪',weight:0.1,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade'],
    desc:'Sắc nhất. Xuyên giáp, ám sát x2.5.'},
  shiv:{id:'shiv',name:'Dao tự chế',icon:'🔪',weight:0.2,type:'weapon',tier:1,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade'],desc:'Từ mảnh kính + vải.'},
  poison_blade:{id:'poison_blade',name:'Dao tẩm độc',icon:'🗡️',weight:0.3,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade'],desc:'Gây độc khi trúng.'},
  butcher_knife:{id:'butcher_knife',name:'Dao Đồ Tể',icon:'🔪',weight:1.2,type:'weapon',tier:4,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blade','boss_drop'],
    desc:'Boss drop. Mạnh nhất blade.'},

  // ── WEAPONS — BLUNT ──────────────────────────────────
  wooden_ruler:{id:'wooden_ruler',name:'Thước gỗ',icon:'📏',weight:0.3,type:'weapon',tier:0,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt'],desc:'Yếu nhất blunt.'},
  branch:{id:'branch',name:'Cành cây',icon:'🌿',weight:0.8,type:'weapon',tier:0,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','craft_mat'],
    desc:'Thô sơ. Cũng dùng craft.'},
  wooden_stick:{id:'wooden_stick',name:'Gậy gỗ',icon:'🪵',weight:0.8,type:'weapon',tier:1,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','craft_mat'],desc:'Blunt cơ bản tốt.'},
  small_hammer:{id:'small_hammer',name:'Búa nhỏ',icon:'🔨',weight:0.8,type:'weapon',tier:1,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','barricade_mat'],
    desc:'Bền hơn gậy. Dùng barricade.'},
  rubber_baton:{id:'rubber_baton',name:'Gậy cao su',icon:'🏑',weight:0.8,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt'],desc:'Nhanh, ít ồn.'},
  iron_pipe:{id:'iron_pipe',name:'Ống nước',icon:'🔧',weight:1.0,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','craft_mat','barricade_mat'],
    desc:'Sát thương cao. Craft gậy gia cố.'},
  large_hammer:{id:'large_hammer',name:'Búa lớn',icon:'🔨',weight:2.0,type:'weapon',tier:3,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','barricade_mat'],
    desc:'Cao nhất blunt. Chậm, ồn. Có thể stun.'},
  crowbar:{id:'crowbar',name:'Xà beng',icon:'🔩',weight:1.5,type:'weapon',tier:3,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','barricade_mat','craft_mat'],
    desc:'BỀN NHẤT. Đa năng.'},
  fire_extinguisher:{id:'fire_extinguisher',name:'Bình chữa cháy',icon:'🧯',weight:2.0,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','throwable'],
    desc:'1 lần. AoE + hoảng loạn zombie.'},
  spiked_bat:{id:'spiked_bat',name:'Gậy đinh',icon:'🏏',weight:1.0,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt'],desc:'Tự chế.'},
  reinforced_bat:{id:'reinforced_bat',name:'Gậy gia cố',icon:'🪛',weight:1.3,type:'weapon',tier:3,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt'],desc:'Tự chế. Bền nhất.'},
  iron_bar:{id:'iron_bar',name:'Gậy sắt',icon:'⚙️',weight:1.5,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','blunt','barricade_mat'],desc:'Nặng và chắc.'},

  // ── WEAPONS — FIREARM ─────────────────────────────────
  handgun:{id:'handgun',name:'Súng ngắn',icon:'🔫',weight:0.9,type:'weapon',tier:3,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','firearm'],
    desc:'⚠ Alert 3 tile! Sát thương cao nhất.'},
  homemade_bow:{id:'homemade_bow',name:'Cung tự chế',icon:'🏹',weight:0.8,type:'weapon',tier:2,
    usable:false,equippable:true,slot:'weapon',tags:['equip','weapon','firearm'],
    desc:'Yên tĩnh. Không cần đạn.'},

  // ── ARMOR ─────────────────────────────────────────────
  warm_clothes:{id:'warm_clothes',name:'Quần áo ấm',icon:'🧥',weight:0.5,type:'armor',tier:0,
    usable:false,equippable:true,slot:'body',tags:['equip','armor'],desc:'Không giảm damage.'},
  light_vest:{id:'light_vest',name:'Áo giáp nhẹ',icon:'🦺',weight:2.0,type:'armor',tier:2,
    usable:false,equippable:true,slot:'body',tags:['equip','armor'],desc:'Giảm 1 damage/đòn.'},
  bulletproof_vest:{id:'bulletproof_vest',name:'Áo chống đạn',icon:'🛡️',weight:3.0,type:'armor',tier:3,
    usable:false,equippable:true,slot:'body',tags:['equip','armor'],desc:'Giảm 3 damage/đòn.'},
  gas_mask:{id:'gas_mask',name:'Mặt nạ phòng độc',icon:'😷',weight:0.5,type:'armor',tier:2,
    usable:false,equippable:true,slot:'head',tags:['equip','armor'],desc:'Bảo vệ đầu +1. Chặn độc.'},
  medical_gloves:{id:'medical_gloves',name:'Găng tay y tế',icon:'🧤',weight:0.1,type:'armor',tier:0,
    usable:false,equippable:true,slot:'hands',tags:['equip','armor'],desc:'Giảm stress khi băng bó.'},

  // ── TOOLS ─────────────────────────────────────────────
  flashlight:{id:'flashlight',name:'Đèn pin',icon:'🔦',weight:0.3,type:'tool',tier:1,
    usable:false,equippable:true,slot:'tool',tags:['equip','tool'],desc:'Đêm -1 ĐHĐ/tile.'},
  police_flashlight:{id:'police_flashlight',name:'Đèn pin CS',icon:'🔦',weight:0.4,type:'tool',tier:2,
    usable:false,equippable:true,slot:'tool',tags:['equip','tool'],desc:'Sáng hơn, bền hơn.'},
  industrial_flashlight:{id:'industrial_flashlight',name:'Đèn pin CN',icon:'🔦',weight:0.5,type:'tool',tier:3,
    usable:false,equippable:true,slot:'tool',tags:['equip','tool'],desc:'Tốt nhất. Đêm -2 ĐHĐ.'},
  walkie_talkie:{id:'walkie_talkie',name:'Bộ đàm',icon:'📻',weight:0.5,type:'tool',tier:2,
    usable:false,equippable:true,slot:'tool',tags:['equip','tool'],desc:'Cảnh báo boss 3 tile.'},
  military_radio:{id:'military_radio',name:'Bộ đàm QS',icon:'📻',weight:0.8,type:'tool',tier:3,
    usable:false,equippable:true,slot:'tool',tags:['equip','tool'],desc:'Cảnh báo boss 6 tile.'},
  torch:{id:'torch',name:'Đuốc tự chế',icon:'🕯️',weight:0.5,type:'tool',tier:1,
    usable:false,equippable:true,slot:'tool',tags:['equip','tool'],desc:'Đèn pin thô sơ, 1 ngày.'},

  // ── THROWABLES ────────────────────────────────────────
  molotov:{id:'molotov',name:'Bom xăng Molotov',icon:'🔥',weight:0.9,type:'throwable',tier:2,
    usable:false,tags:['throwable'],desc:'AoE. Burn cả tile. 1 lần.'},
  smoke_grenade_craft:{id:'smoke_grenade_craft',name:'Lựu đạn khói TC',icon:'💨',weight:0.5,
    type:'throwable',tier:2,usable:false,tags:['throwable'],desc:'Màn khói. Escape miễn phí.'},
  smoke_grenade:{id:'smoke_grenade',name:'Lựu đạn khói',icon:'💨',weight:0.4,type:'throwable',tier:2,
    usable:false,tags:['throwable'],desc:'Quân sự. Xịn hơn.'},

  // ── MATERIALS ─────────────────────────────────────────
  rope_5m:{id:'rope_5m',name:'Dây thừng 5m',icon:'🪢',weight:0.5,type:'material',tier:1,
    usable:false,tags:['craft_mat','barricade_mat','repair_mat'],desc:'Craft cung, gậy gia cố, barricade.'},
  rope_10m:{id:'rope_10m',name:'Dây thừng 10m',icon:'🪢',weight:1.0,type:'material',tier:2,
    usable:false,tags:['craft_mat','barricade_mat','repair_mat'],desc:'Thay thế rope_5m trong mọi recipe.'},
  electric_wire:{id:'electric_wire',name:'Dây điện',icon:'⚡',weight:0.3,type:'material',tier:1,
    usable:false,tags:['craft_mat','repair_mat'],desc:'Craft gậy đinh.'},
  cloth_bandage:{id:'cloth_bandage',name:'Vải băng',icon:'🧶',weight:0.1,type:'material',tier:0,
    usable:false,tags:['craft_mat','repair_mat'],desc:'Nguyên liệu cơ bản.'},
  glass_shard:{id:'glass_shard',name:'Mảnh kính',icon:'🔷',weight:0.3,type:'material',tier:0,
    usable:false,tags:['craft_mat'],desc:'Craft dao tự chế.'},
  gasoline_bottle:{id:'gasoline_bottle',name:'Chai xăng',icon:'⛽',weight:0.8,type:'material',tier:1,
    usable:false,tags:['craft_mat'],desc:'Craft Molotov.'},
  brick:{id:'brick',name:'Gạch vỡ',icon:'🧱',weight:1.0,type:'material',tier:0,
    usable:false,tags:['barricade_mat'],desc:'Barricade.'},
  broken_sign:{id:'broken_sign',name:'Biển báo gãy',icon:'🪧',weight:1.5,type:'material',tier:1,
    usable:false,tags:['barricade_mat'],desc:'Barricade tốt.'},
  wire_mesh:{id:'wire_mesh',name:'Lưới thép',icon:'🕸️',weight:2.0,type:'material',tier:2,
    usable:false,tags:['barricade_mat'],desc:'Barricade tốt nhất.'},
  toolbox:{id:'toolbox',name:'Hộp dụng cụ',icon:'🧰',weight:2.0,type:'material',tier:2,
    usable:false,tags:['repair_mat','craft_mat'],desc:'Sửa đồ +50% restored.'},
  door_brace:{id:'door_brace',name:'Thanh chặn cửa',icon:'🪵',weight:1.5,type:'material',tier:1,
    usable:false,tags:['barricade_mat'],desc:'Tự chế. Barricade mạnh.'},
  spray_can:{id:'spray_can',name:'Bình xịt',icon:'🫙',weight:0.3,type:'material',tier:1,
    usable:false,tags:['craft_mat'],desc:'Craft lựu đạn khói.'},
  lighter:{id:'lighter',name:'Bật lửa',icon:'🔥',weight:0.1,type:'material',tier:0,
    usable:false,tags:['craft_mat'],desc:'Craft đuốc, lựu đạn khói.'},
  battery_aa:{id:'battery_aa',name:'Pin AA',icon:'🔋',weight:0.1,type:'material',tier:1,
    usable:false,tags:['repair_mat'],desc:'Sạc đèn pin.'},
  gasoline_5l:{id:'gasoline_5l',name:'Xăng 5L',icon:'⛽',weight:5.0,type:'material',tier:2,
    usable:false,tags:['craft_mat'],desc:'Xăng lớn.'},
  industrial_battery:{id:'industrial_battery',name:'Pin công nghiệp',icon:'🔋',weight:0.5,
    type:'material',tier:2,usable:false,tags:['repair_mat'],desc:'Sửa thiết bị CN.'},
  charger_cable:{id:'charger_cable',name:'Cáp sạc',icon:'🔌',weight:0.1,type:'material',tier:0,
    usable:false,tags:['repair_mat'],desc:'Sửa thiết bị điện.'},
  pebble:{id:'pebble',name:'Đá cuội',icon:'🪨',weight:0.5,type:'material',tier:0,
    usable:false,tags:['barricade_mat','throwable'],desc:'Ném dụ zombie.'},
  leaf:{id:'leaf',name:'Lá cây',icon:'🍃',weight:0.1,type:'material',tier:0,
    usable:false,tags:['craft_mat'],desc:'Nguyên liệu phụ.'},

  // ── AMMO ─────────────────────────────────────────────
  ammo_9mm_10:{id:'ammo_9mm_10',name:'Đạn 9mm x10',icon:'🔴',weight:0.1,type:'ammo',tier:2,
    usable:false,ammoType:'ammo_9mm',ammoCount:10,tags:['ammo'],desc:'10 viên cho súng ngắn.'},
  ammo_9mm_20:{id:'ammo_9mm_20',name:'Đạn 9mm x20',icon:'🔴',weight:0.2,type:'ammo',tier:2,
    usable:false,ammoType:'ammo_9mm',ammoCount:20,tags:['ammo'],desc:'20 viên đạn 9mm.'},

  // ── MISC / QUEST ─────────────────────────────────────
  area_map:{id:'area_map',name:'Bản đồ khu vực',icon:'🗺️',weight:0.1,type:'misc',tier:1,
    usable:true,useEffect:{revealRadius:2},tags:['misc','quest'],desc:'Hé lộ 2 tile xung quanh.'},
  city_map:{id:'city_map',name:'Bản đồ thành phố',icon:'🗺️',weight:0.2,type:'misc',tier:2,
    usable:true,useEffect:{revealRadius:4},tags:['misc','quest'],desc:'Hé lộ 4 tile + địa điểm chính.'},
  secret_map:{id:'secret_map',name:'Bản đồ bí mật',icon:'📜',weight:0.1,type:'misc',tier:3,
    usable:true,useEffect:{revealRadius:6,revealKeyLocs:true},tags:['misc','quest'],
    desc:'Boss drop. Hé lộ mọi địa điểm.'},
  antidote_blueprint:{id:'antidote_blueprint',name:'Antidote Blueprint',icon:'📜',weight:0.1,
    type:'misc',tier:4,usable:false,tags:['misc','quest','key_item'],
    desc:'Drop từ Dr. Zero. Mở win condition.'},
  survival_book:{id:'survival_book',name:'Sách kỹ năng sinh tồn',icon:'📚',weight:0.5,
    type:'misc',tier:2,usable:true,useEffect:{skillXP:{carpentry:5,firstaid:3}},tags:['misc'],
    desc:'+5 XP thủ công, +3 XP sơ cứu.'},
  radio_item:{id:'radio_item',name:'Radio',icon:'📻',weight:0.5,type:'misc',tier:1,
    usable:true,useEffect:{stress:-15},tags:['misc'],desc:'Nghe tin tức. Stress -15.'},
  handcuffs:{id:'handcuffs',name:'Còng số 8',icon:'⛓️',weight:0.2,type:'misc',tier:1,
    usable:false,tags:['misc'],desc:'Bán cho trader.'},
  whistle:{id:'whistle',name:'Còi',icon:'📯',weight:0.1,type:'misc',tier:0,
    usable:true,useEffect:{attractZombies:true},tags:['misc'],desc:'Dụ zombie đi hướng khác.'},
  generator:{id:'generator',name:'Máy phát điện nhỏ',icon:'⚡',weight:8.0,type:'misc',tier:3,
    usable:false,tags:['misc'],desc:'Rất nặng. Giá trị cao.'},
  laptop:{id:'laptop',name:'Laptop cũ',icon:'💻',weight:1.5,type:'misc',tier:1,
    usable:false,tags:['misc'],desc:'Có thể có data hữu ích.'},
  building_map:{id:'building_map',name:'Bản đồ tòa nhà',icon:'🗺️',weight:0.1,type:'misc',tier:1,
    usable:true,useEffect:{revealRadius:1},tags:['misc'],desc:'Hé lộ 1 tile.'},
  tunnel_map:{id:'tunnel_map',name:'Bản đồ hầm',icon:'🗺️',weight:0.2,type:'misc',tier:2,
    usable:true,useEffect:{revealTunnel:true},tags:['misc','quest'],desc:'Chỉ đường đến hầm thoát.'},
  pen:{id:'pen',name:'Bút bi',icon:'🖊️',weight:0.05,type:'misc',tier:0,
    usable:false,tags:['misc'],desc:'Không có tác dụng.'},
  mutant_blood:{id:'mutant_blood',name:'Máu đột biến',icon:'🧬',weight:0.1,type:'misc',tier:3,
    usable:false,tags:['misc','boss_drop'],desc:'Boss drop.'},
  mutant_bone:{id:'mutant_bone',name:'Xương biến dị',icon:'🦴',weight:0.5,type:'misc',tier:3,
    usable:false,tags:['misc','boss_drop'],desc:'Boss drop.'},

  // cannibal bandit drop — gây stress khi nhặt
  strange_meat:{id:'strange_meat',name:'Thịt lạ',icon:'🥩',weight:0.4,type:'misc',tier:2,
    usable:false,tags:['misc','cannibal_drop'],
    desc:'Không nên hỏi đây là thịt gì.'},

  // ══════════════════════════════════════════════════════
  // BASE SYSTEM ITEMS
  // Các item liên quan đến hệ thống base.
  // Tag 'base_mat' = vật liệu xây/nâng cấp base.
  // Tag 'base_food' = thức ăn nấu được trong base (giá trị cao hơn raw food).
  // Tag 'base_tool' = công cụ đặc biệt chỉ dùng trong base.
  // ══════════════════════════════════════════════════════

  // ── VẬT LIỆU XÂY BASE ────────────────────────────────
  // tarp: vật liệu tier-0, dễ tìm nhất để dựng shelter ban đầu
  tarp:{id:'tarp',name:'Tấm bạt',icon:'⛺',weight:1.5,type:'material',tier:0,
    usable:false,tags:['base_mat','barricade_mat'],
    desc:'Dựng shelter tạm. Vật liệu base L1.'},

  // wooden_plank: vật liệu tier-1, cần cho upgrade lên L2/L3
  wooden_plank:{id:'wooden_plank',name:'Ván gỗ',icon:'🪵',weight:2.0,type:'material',tier:1,
    usable:false,tags:['base_mat','barricade_mat'],
    desc:'Gia cố tường. Vật liệu base L2.'},

  // metal_sheet: tier-2, cần cho L4 (repair bench)
  metal_sheet:{id:'metal_sheet',name:'Tấm kim loại',icon:'🔩',weight:3.0,type:'material',tier:2,
    usable:false,tags:['base_mat','barricade_mat'],
    desc:'Vật liệu base L4. Rất nặng, rất bền.'},

  // concrete_block: tier-3, chỉ cần cho L5 stronghold — hiếm, nặng
  concrete_block:{id:'concrete_block',name:'Khối bê tông',icon:'🏗️',weight:5.0,type:'material',tier:3,
    usable:false,tags:['base_mat'],
    desc:'Vật liệu base L5. Nặng nhất. Hiếm.'},

  // ── XE KÉO (CART) ────────────────────────────────────
  // cart_parts: nguyên liệu để craft xe kéo — nhặt từ warehouse/garage
  cart_parts:{id:'cart_parts',name:'Phụ tùng xe kéo',icon:'⚙️',weight:3.0,type:'material',tier:2,
    usable:false,tags:['base_mat','craft_mat'],
    desc:'Craft xe kéo. Tìm trong kho hàng hoặc garage.'},

  // handcart: xe kéo hoàn chỉnh — cho phép salvage 50% khi move base
  // usable:true để player có thể "dùng" (pack/unpack base storage)
  handcart:{id:'handcart',name:'Xe kéo tự chế',icon:'🛒',weight:4.0,type:'tool',tier:2,
    usable:true,useEffect:{enableCart:true},tags:['base_tool','craft_mat'],
    desc:'Kéo base storage khi di chuyển. Salvage +50% vật liệu.'},

  // ── ĐỒ ĂN NẤU TRONG BASE ─────────────────────────────
  // Cooking tại base (L3+) tạo ra food có giá trị cao hơn raw.
  // Đây là reward cho việc đầu tư vào base — không thể craft ngoài base.

  // cooked_stew: nấu từ canned_food + rainwater — phổ biến nhất
  cooked_stew:{id:'cooked_stew',name:'Cháo nấu',icon:'🍲',weight:0.8,type:'food',tier:2,
    usable:true,useEffect:{hunger:5.0,thirst:1.5,stress:-5},tags:['food','base_food'],
    desc:'Nấu trong base. Hunger +5, Thirst +1.5, Stress -5.'},

  // roasted_meat: nấu từ strange_meat hoặc wild_fruit — narrative choice
  roasted_meat:{id:'roasted_meat',name:'Thịt nướng',icon:'🥩',weight:0.6,type:'food',tier:2,
    usable:true,useEffect:{hunger:4.0,stress:-3},tags:['food','base_food'],
    desc:'Nấu trong base. Hunger +4, Stress -3.'},

  // herbal_tea: nấu từ leaf + rainwater — nhẹ, chữa stress tốt
  herbal_tea:{id:'herbal_tea',name:'Trà thảo mộc',icon:'🍵',weight:0.3,type:'food',tier:1,
    usable:true,useEffect:{thirst:2.0,stress:-12,depression:-5},tags:['drink','base_food'],
    desc:'Nấu trong base. Stress -12, Trầm cảm -5.'},

  // ── CÔNG CỤ ĐẶC BIỆT BASE ────────────────────────────
  // Một số công cụ chỉ hữu ích khi có base — tạo ra "reason to build"

  // camouflage_net: giảm base signature (threat accumulation)
  camouflage_net:{id:'camouflage_net',name:'Lưới ngụy trang',icon:'🕸️',weight:2.0,type:'material',tier:2,
    usable:false,tags:['base_mat','base_tool'],
    desc:'Giảm 30% tốc độ tích lũy Base Signature. Đặt quanh base.'},

  // noise_dampener: craft từ cloth_bandage + rope — giảm noise khi craft trong base
  noise_dampener:{id:'noise_dampener',name:'Vật cản âm thanh',icon:'🧱',weight:1.0,type:'material',tier:1,
    usable:false,tags:['base_mat','craft_mat'],
    desc:'Giảm noise +2 mỗi craft action trong base. Craft từ vải + dây.'},
};

// ── ITEM DB HELPERS ───────────────────────────────────
function DW_item(id)            { return ITEM_DB[id] || null; }
function DW_itemName(id)        { return ITEM_DB[id]?.name || id; }
function DW_itemIcon(id)        { return ITEM_DB[id]?.icon || '📦'; }
function DW_itemWeight(id)      { return ITEM_DB[id]?.weight || 0; }
function DW_itemHasTag(id, tag) { return (ITEM_DB[id]?.tags || []).includes(tag); }
function DW_invFindTag(inv, tag){ return inv.findIndex(id => DW_itemHasTag(id, tag)); }
function DW_invFindId(inv, itemId){ return inv.indexOf(itemId); }
function DW_invFindAmmo(inv, ammoType){
  return inv.findIndex(id => ITEM_DB[id]?.ammoType === ammoType);
}
function DW_invWeight(inv)      { return inv.reduce((s,id)=>s+DW_itemWeight(id),0); }
function DW_itemEquipSlot(id)   { return ITEM_DB[id]?.slot || null; }

// ── LEGACY SAVE MIGRATION ─────────────────────────────
var LEGACY_ITEM_MAP = {
  'băng gạc':'bandage','kháng sinh':'antibiotic','oxy già':'hydrogen_peroxide',
  'paracetamol':'paracetamol','găng tay y tế':'medical_gloves','dao mổ':'scalpel',
  'iv drip':'iv_drip','máy đo huyết áp':'blood_pressure_monitor','morphine':'morphine',
  'thuốc giảm đau':'painkiller','vitamin c':'vitamin_c','băng thun':'elastic_bandage',
  'cồn y tế':'alcohol','thuốc ngủ':'sleeping_pills','kem kháng khuẩn':'antibacterial_cream',
  'bánh mì':'bread','đồ hộp':'canned_food','nước suối 1.5l':'water_bottle',
  'nước suối':'water_bottle','kẹo năng lượng':'energy_candy','mì gói':'instant_noodle',
  'nước ngọt':'soda','nước mưa 0.5l':'rainwater','nước mưa':'rainwater',
  'quả dại':'wild_fruit','nấm rừng':'mushroom','khẩu phần quân sự':'military_ration',
  'dao rọc giấy':'box_cutter','kéo':'scissors','dao nhỏ':'small_knife',
  'dao bếp':'kitchen_knife','dao tự chế':'shiv','dao tẩm độc':'poison_blade',
  'thước gỗ':'wooden_ruler','cành cây':'branch','gậy gỗ':'wooden_stick',
  'búa nhỏ':'small_hammer','gậy cao su':'rubber_baton','ống nước':'iron_pipe',
  'búa lớn':'large_hammer','xà beng':'crowbar','bình chữa cháy':'fire_extinguisher',
  'gậy đinh':'spiked_bat','gậy gia cố':'reinforced_bat','súng ngắn':'handgun',
  'cung tự chế':'homemade_bow','quần áo ấm':'warm_clothes','áo giáp nhẹ':'light_vest',
  'áo chống đạn':'bulletproof_vest','mặt nạ phòng độc':'gas_mask',
  'đèn pin':'flashlight','đèn pin cảnh sát':'police_flashlight',
  'đèn pin công nghiệp':'industrial_flashlight','bộ đàm':'walkie_talkie',
  'bộ đàm quân sự':'military_radio','đuốc tự chế':'torch',
  'bom xăng molotov':'molotov','lựu đạn khói tự chế':'smoke_grenade_craft',
  'lựu đạn khói':'smoke_grenade','dây thừng 5m':'rope_5m','dây thừng 10m':'rope_10m',
  'dây thừng':'rope_5m','dây điện':'electric_wire','vải băng':'cloth_bandage',
  'mảnh kính':'glass_shard','chai xăng':'gasoline_bottle','gạch vỡ':'brick',
  'biển báo gãy':'broken_sign','lưới thép':'wire_mesh','hộp dụng cụ':'toolbox',
  'thanh chặn cửa':'door_brace','bình xịt':'spray_can','bật lửa':'lighter',
  'pin aa':'battery_aa','đạn 9mm x10':'ammo_9mm_10','đạn 9mm x20':'ammo_9mm_20',
  'bản đồ khu vực':'area_map','bản đồ thành phố':'city_map',
  'bản đồ bí mật':'secret_map','antidote blueprint':'antidote_blueprint',
  'sách kỹ năng sinh tồn':'survival_book','radio':'radio_item',
  'còng số 8':'handcuffs','còi':'whistle','xăng 5l':'gasoline_5l',
  'máy phát điện nhỏ':'generator','laptop cũ':'laptop',
  'bản đồ tòa nhà':'building_map','bản đồ hầm':'tunnel_map',
  'pin công nghiệp':'industrial_battery','cáp sạc':'charger_cable',
  'dao đồ tể':'butcher_knife','máu đột biến':'mutant_blood',
  'xương biến dị':'mutant_bone','bộ sơ cứu đầy đủ':'medkit',
  'bộ sơ cứu dã chiến':'medkit_field','gậy sắt':'iron_bar',
  'đá cuội':'pebble','lá cây':'leaf','bút bi':'pen',
  // ── BASE SYSTEM ITEMS ─────────────────────────────
  'tấm bạt':'tarp','ván gỗ':'wooden_plank','tấm kim loại':'metal_sheet',
  'khối bê tông':'concrete_block','phụ tùng xe kéo':'cart_parts',
  'xe kéo tự chế':'handcart','xe kéo':'handcart',
  'cháo nấu':'cooked_stew','thịt nướng':'roasted_meat','trà thảo mộc':'herbal_tea',
  'lưới ngụy trang':'camouflage_net','vật cản âm thanh':'noise_dampener',
};

function DW_legacyToId(str) {
  if (!str) return null;
  if (ITEM_DB[str]) return str;
  const lower = str.toLowerCase().replace(/\s*\(\d+\.?\d*kg\)/i,'').trim();
  return LEGACY_ITEM_MAP[lower] || null;
}

function DW_migrateLegacyInventory(inventory) {
  const ids=[], failed=[];
  for (const item of inventory) {
    const id = DW_legacyToId(item);
    if (id) ids.push(id);
    else { console.warn('[DW migrate] unknown item:', item); failed.push(item); }
  }
  return { ids, failed };
}

// ── LOOT TABLES v2 (item IDs) ─────────────────────────
var LOOT_TABLES = {
  hospital:[
    {id:'bandage',w:20},{id:'antibiotic',w:15},{id:'hydrogen_peroxide',w:15},
    {id:'paracetamol',w:20},{id:'medical_gloves',w:10},{id:'scalpel',w:8},
    {id:'iv_drip',w:3},{id:'blood_pressure_monitor',w:2},{id:'morphine',w:1},
    {id:'elastic_bandage',w:6},
  ],
  pharmacy:[
    {id:'painkiller',w:25},{id:'antibiotic',w:20},{id:'vitamin_c',w:20},
    {id:'elastic_bandage',w:15},{id:'alcohol',w:10},{id:'sleeping_pills',w:5},
    {id:'antibacterial_cream',w:5},
  ],
  supermarket:[
    {id:'bread',w:18},{id:'canned_food',w:18},{id:'water_bottle',w:15},
    {id:'energy_candy',w:12},{id:'instant_noodle',w:15},{id:'soda',w:10},
    {id:'kitchen_knife',w:5},{id:'lighter',w:5},{id:'battery_aa',w:2},
  ],
  house:[
    {id:'kitchen_knife',w:15},{id:'flashlight',w:15},{id:'battery_aa',w:15},
    {id:'rope_5m',w:10},{id:'lighter',w:15},{id:'small_hammer',w:10},
    {id:'canned_food',w:10},{id:'warm_clothes',w:5},
  ],
  police:[
    {id:'rubber_baton',w:20},{id:'light_vest',w:8},{id:'ammo_9mm_10',w:15},
    {id:'handgun',w:4},{id:'police_flashlight',w:15},{id:'whistle',w:12},
    {id:'walkie_talkie',w:8},{id:'handcuffs',w:8},{id:'bulletproof_vest',w:2},
  ],
  school:[
    {id:'survival_book',w:20},{id:'box_cutter',w:12},{id:'fire_extinguisher',w:10},
    {id:'bandage',w:15},{id:'wooden_ruler',w:12},{id:'scissors',w:12},
    {id:'area_map',w:8},{id:'pen',w:11},
  ],
  street:[
    {id:'brick',w:22},{id:'gasoline_bottle',w:12},{id:'iron_pipe',w:16},
    {id:'glass_shard',w:14},{id:'electric_wire',w:14},{id:'crowbar',w:10},
    {id:'broken_sign',w:5},{id:'tarp',w:4},{id:'wooden_plank',w:3},
  ],
  office:[
    {id:'scissors',w:15},{id:'spray_can',w:12},{id:'electric_wire',w:15},
    {id:'flashlight',w:15},{id:'charger_cable',w:15},{id:'painkiller',w:10},
    {id:'building_map',w:8},{id:'laptop',w:5},
  ],
  warehouse:[
    {id:'rope_10m',w:14},{id:'large_hammer',w:10},{id:'crowbar',w:10},
    {id:'toolbox',w:10},{id:'canned_food',w:16},{id:'water_bottle',w:13},
    {id:'gasoline_5l',w:4},{id:'wire_mesh',w:4},{id:'generator',w:2},
    {id:'wooden_plank',w:8},{id:'metal_sheet',w:4},{id:'cart_parts',w:3},
    {id:'tarp',w:5},{id:'camouflage_net',w:2},
  ],
  park:[
    {id:'branch',w:28},{id:'pebble',w:18},{id:'rainwater',w:18},
    {id:'wild_fruit',w:14},{id:'leaf',w:10},{id:'mushroom',w:5},
    {id:'tarp',w:7},
  ],
  tunnel:[
    {id:'industrial_flashlight',w:18},{id:'gas_mask',w:12},{id:'crowbar',w:15},
    {id:'rope_10m',w:15},{id:'walkie_talkie',w:10},{id:'tunnel_map',w:8},
    {id:'industrial_battery',w:12},
  ],
  bunker:[
    {id:'military_ration',w:20},{id:'handgun',w:10},{id:'ammo_9mm_20',w:15},
    {id:'medkit',w:15},{id:'city_map',w:15},{id:'military_radio',w:10},
    {id:'bulletproof_vest',w:8},{id:'smoke_grenade',w:7},
  ],
  default:[
    {id:'cloth_bandage',w:25},{id:'water_bottle',w:25},{id:'canned_food',w:25},
    {id:'wooden_stick',w:15},{id:'small_knife',w:10},
  ],
};

// ── TILE TYPES ────────────────────────────────────────
var TILE_TYPES = {
  // ── TERRAIN ─────────────────────────────────────
  street:      {icon:'🛣',name:'Đường phố',         danger:2, terrain:true},
  road:        {icon:'🛣',name:'Đường lớn',          danger:1, terrain:true},
  alley:       {icon:'🌑',name:'Ngõ hẻm',            danger:3, terrain:true},
  forest:      {icon:'🌲',name:'Khu rừng',           danger:1, terrain:true},
  field:       {icon:'🌾',name:'Đồng ruộng',         danger:1, terrain:true},
  river:       {icon:'🌊',name:'Sông',               danger:0, passable:false, terrain:true},
  mountain:    {icon:'⛰',name:'Núi đá',             danger:0, passable:false, terrain:true},
  rubble:      {icon:'💀',name:'Đống đổ nát',        danger:4, terrain:true},
  // ── LANDMARKS / BUILDINGS ───────────────────────
  house:       {icon:'🏠',name:'Nhà dân',            danger:1},
  apartment:   {icon:'🏢',name:'Chung cư',           danger:2},
  hospital:    {icon:'🏥',name:'Bệnh viện',          danger:3},
  pharmacy:    {icon:'💊',name:'Nhà thuốc',          danger:1},
  supermarket: {icon:'🏪',name:'Siêu thị',           danger:2},
  mall:        {icon:'🏬',name:'Trung tâm thương mại',danger:3},
  school:      {icon:'🏫',name:'Trường học',         danger:2},
  police:      {icon:'🚔',name:'Đồn Cảnh Sát',      danger:3},
  park:        {icon:'🌳',name:'Công viên',          danger:1},
  office:      {icon:'🏛',name:'Văn phòng',          danger:2},
  warehouse:   {icon:'🏗',name:'Kho hàng',           danger:3},
  gas_station: {icon:'⛽',name:'Trạm xăng',          danger:2},
  radio_tower: {icon:'📡',name:'Tháp radio',         danger:2},
  tunnel:      {icon:'⛏',name:'Cửa hầm thoát',      danger:3},
  bunker:      {icon:'🛡',name:'Hầm bí mật',        danger:2},
  // ── DANGER ZONES ────────────────────────────────
  zombie_nest: {icon:'☠',name:'Ổ zombie',            danger:5},
  radiation:   {icon:'☣',name:'Khu ô nhiễm',        danger:4},
};

var MOVE_COST = {
  // World travel — cheap
  road:1, street:1, field:1, forest:2, alley:2, rubble:3,
  park:1, river:99, mountain:99,
  // Landmark entry — normal cost
  house:1, apartment:2, hospital:2, pharmacy:1, mall:3,
  supermarket:2, school:2, police:3, office:2, warehouse:2,
  gas_station:1, radio_tower:2, tunnel:3, bunker:2,
  zombie_nest:4, radiation:3,
};

// ── BIOME DEFINITIONS ─────────────────────────────────
// Used by DW_generateWorld for region-based terrain placement
var BIOME_DEFS = [
  // id, weight, tile pool (terrain), landmark pool, danger
  {id:'forest',   w:30, tiles:['forest','forest','forest','forest','house'],
    landmarks:['house','radio_tower'], zombieDensity:0.15},
  {id:'suburb',   w:25, tiles:['street','house','house','house','field','alley'],
    landmarks:['house','pharmacy','school','gas_station'], zombieDensity:0.35},
  {id:'city',     w:20, tiles:['street','street','alley','apartment','office','rubble'],
    landmarks:['hospital','police','mall','supermarket','office'], zombieDensity:0.65},
  {id:'wasteland',w:15, tiles:['rubble','rubble','field','field','alley'],
    landmarks:['warehouse','zombie_nest'], zombieDensity:0.55},
  {id:'field',    w:10, tiles:['field','field','field','road','forest'],
    landmarks:['house','gas_station'], zombieDensity:0.10},
];

// ── OBJECTS ───────────────────────────────────────────
var OBJECT_DEFS = {
  shelf:       {icon:'📦',label:'Kệ hàng',      type:'container',searchAp:2},
  cabinet:     {icon:'🗄',label:'Tủ thuốc',      type:'container',searchAp:2},
  locker:      {icon:'🔒',label:'Tủ khóa',       type:'container',searchAp:3},
  chest:       {icon:'🧰',label:'Hòm đồ',        type:'container',searchAp:3},
  car:         {icon:'🚗',label:'Xe bỏ lại',     type:'container',searchAp:2},
  fridge:      {icon:'🧊',label:'Tủ lạnh',       type:'container',searchAp:2},
  desk:        {icon:'🪑',label:'Bàn làm việc',  type:'container',searchAp:2},
  crate:       {icon:'📫',label:'Thùng hàng',    type:'container',searchAp:2},
  zombie:      {icon:'🧟',label:'Zombie',         type:'enemy',fightAp:3,damage:1,flee_ap:2},
  zombie_fast: {icon:'💀',label:'Zombie nhanh',  type:'enemy',fightAp:4,damage:2,flee_ap:3},
  zombie_horde:{icon:'🧟',label:'Bầy zombie',    type:'enemy',fightAp:5,damage:3,flee_ap:2,isHorde:true},
  npc:         {icon:'👤',label:'Người sống sót',type:'npc',ap:1},
  barricade_mat:{icon:'🧱',label:'Vật liệu xây', type:'material',ap:1},
  radio:       {icon:'📻',label:'Radio',          type:'special',ap:2},
  map_item:    {icon:'🗺',label:'Bản đồ',         type:'special',ap:1},
  firstaid_kit:{icon:'🩺',label:'Bộ sơ cứu',     type:'usable',ap:1},
  fuel_can:    {icon:'⛽',label:'Can xăng',       type:'material',ap:1},
};

var TILE_OBJECT_POOLS = {
  hospital:    ['cabinet','cabinet','shelf','zombie','firstaid_kit','npc'],
  pharmacy:    ['cabinet','shelf','desk','zombie','firstaid_kit'],
  supermarket: ['shelf','shelf','fridge','crate','car','zombie','zombie'],
  mall:        ['shelf','shelf','fridge','crate','locker','zombie','zombie','zombie'],
  house:       ['shelf','chest','desk','fridge','zombie','npc'],
  police:      ['locker','locker','desk','zombie_fast','radio'],
  school:      ['shelf','desk','chest','zombie','npc','map_item'],
  office:      ['desk','cabinet','shelf','zombie','radio'],
  warehouse:   ['chest','chest','crate','car','zombie_horde','zombie','barricade_mat'],
  gas_station: ['fuel_can','fuel_can','car','zombie','shelf'],
  radio_tower: ['radio','radio','desk','zombie','map_item'],
  street:      ['car','car','zombie','zombie','zombie_fast','barricade_mat'],
  road:        ['car','zombie','barricade_mat'],
  alley:       ['chest','zombie_fast','zombie','barricade_mat'],
  park:        ['chest','zombie','npc','map_item'],
  forest:      ['chest','npc','map_item'],
  field:       ['chest','npc'],
  tunnel:      ['chest','zombie','zombie_fast','radio'],
  bunker:      ['locker','chest','shelf','npc','radio'],
  rubble:      ['chest','zombie_horde','barricade_mat'],
  apartment:   ['shelf','desk','fridge','zombie','npc','chest'],
  zombie_nest: ['zombie_horde','zombie_horde','zombie_fast','zombie'],
  radiation:   ['chest','zombie','firstaid_kit'],
};

var KEY_LOCATIONS = [
  {dx:0,  dy:0,  type:'house',       name:'Nhà của bạn',         special:'spawn'  },
  {dx:5,  dy:-3, type:'hospital',    name:'Bệnh viện Quận 3',    special:'medical'},
  {dx:-4, dy:4,  type:'police',      name:'Đồn Cảnh Sát',        special:'weapon' },
  {dx:2,  dy:5,  type:'supermarket', name:'Siêu thị BigC',       special:'food'   },
  {dx:-3, dy:-2, type:'pharmacy',    name:'Nhà thuốc Tâm An',    special:'medical'},
  {dx:7,  dy:2,  type:'warehouse',   name:'Kho hàng cảng',       special:'supply' },
  {dx:-5, dy:5,  type:'school',      name:'Trường THPT Lê Lợi',  special:'misc'   },
  {dx:9,  dy:9,  type:'tunnel',      name:'Cửa hầm thoát hiểm',  special:'escape' },
  {dx:-8, dy:-7, type:'bunker',      name:'Hầm bí mật B-17',     special:'bunker' },
  {dx:3,  dy:-5, type:'apartment',   name:'Chung cư Hoà Bình',   special:null     },
  {dx:-2, dy:3,  type:'park',        name:'Công viên 23/9',      special:null     },
  {dx:6,  dy:-1, type:'office',      name:'Toà nhà Bitexco',     special:null     },
  {dx:-6, dy:-4, type:'mall',        name:'TTTM Vincom',         special:'food'   },
  {dx:4,  dy:-7, type:'radio_tower', name:'Tháp phát sóng',      special:'radio'  },
  {dx:-7, dy:2,  type:'gas_station', name:'Trạm xăng Shell',     special:'fuel'   },
  {dx:8,  dy:-5, type:'zombie_nest', name:'Ổ zombie phía đông',  special:'danger' },
  {dx:-1, dy:-8, type:'radiation',   name:'Khu ô nhiễm bắc',     special:'danger' },
];

var RANDOM_TILE_WEIGHTS = [
  {type:'street',w:20},{type:'house',w:18},{type:'alley',w:6},
  {type:'apartment',w:8},{type:'park',w:6},{type:'office',w:6},
  {type:'school',w:3},{type:'supermarket',w:4},{type:'warehouse',w:4},
  {type:'hospital',w:2},{type:'pharmacy',w:2},{type:'rubble',w:4},
  {type:'forest',w:8},{type:'field',w:6},{type:'road',w:3},
];

// ── JOBS ─────────────────────────────────────────────
var DW_JOBS = [
  {id:'nurse',name:'Y Tá',icon:'🩺',diff:1,diffLabel:'DỄ',diffColor:'#55C45A',
    startSkills:{firstaid:2,mental:1},startItems:['bandage','bandage','painkiller'],
    perk:'Thuốc hồi máu +50% hiệu quả.',tagline:'Chữa lành bản thân. Né tránh thay vì đối đầu.',
    pros:['Hồi HP nhiều nhất','Stress & panic tăng chậm','Dễ sống sót giai đoạn đầu'],
    cons:['Chiến đấu yếu nhất','Không có bonus vũ khí'],
    stats:['HP hồi +50%','Skill: Sơ cứu 2, Ý chí 1']},
  {id:'soldier',name:'Quân Nhân',icon:'⚔️',diff:2,diffLabel:'TRUNG BÌNH',diffColor:'#E8B800',
    startSkills:{blade:2,fitness:2},startItems:['kitchen_knife','bandage','canned_food'],
    perk:'+1 sát thương. Thoát zombie luôn thành công.',tagline:'Đối đầu trực tiếp.',
    pros:['Chiến đấu mạnh nhất early game','Flee không bao giờ thất bại'],
    cons:['Tiêu thụ thức ăn nước nhiều','Chiến đấu tạo tiếng ồn'],
    stats:['HP max +2','Combat +1','Skill: Dao 2, Thể lực 2']},
  {id:'mechanic',name:'Thợ Máy',icon:'🔧',diff:2,diffLabel:'TRUNG BÌNH',diffColor:'#E8B800',
    startSkills:{carpentry:2,sneak:1},startItems:['small_hammer','electric_wire','cloth_bandage'],
    perk:'Barricade -1 ĐHĐ. Vũ khí tự chế bền hơn 25%.',tagline:'Thu nhặt phế liệu. Xây nơi an toàn.',
    pros:['Barricade & craft hiệu quả nhất','Vũ khí tự chế rất bền'],
    cons:['Yếu combat giai đoạn đầu','Cần nguyên liệu'],
    stats:['Barricade -1 AP','Craft +25%','Skill: Thủ công 2, Ẩn mình 1']},
  {id:'police',name:'Cảnh Sát',icon:'🚔',diff:2,diffLabel:'TRUNG BÌNH',diffColor:'#E8B800',
    startSkills:{firearm:2,fitness:1},startItems:['rubber_baton','ammo_9mm_10','bandage'],
    perk:'Súng tốn -1 ĐHĐ.',tagline:'Dùng súng tiêu diệt nhanh.',
    pros:['Súng hiệu quả nhất','Kết thúc trận đánh nhanh'],
    cons:['Phụ thuộc đạn','Súng nổ alert 3 tile'],
    stats:['Súng -1 AP','Skill: Súng 2, Thể lực 1']},
  {id:'teacher',name:'Giáo Viên',icon:'📚',diff:3,diffLabel:'KHÓ',diffColor:'#C0392B',
    startSkills:{mental:2,sneak:1},startItems:['survival_book','bandage','water_bottle'],
    perk:'XP gấp đôi. Stress tăng chậm 40%.',tagline:'Yếu lúc đầu. Mạnh nhất về sau.',
    pros:['Lên level nhanh nhất','Tâm lý ổn định nhất'],
    cons:['Rất yếu early game','Không có ưu thế chiến đấu ngay'],
    stats:['XP x2','Stress chậm 40%','Skill: Ý chí 2, Ẩn mình 1']},
  {id:'cook',name:'Đầu Bếp',icon:'🍳',diff:3,diffLabel:'KHÓ',diffColor:'#C0392B',
    startSkills:{firstaid:1,mental:2},startItems:['canned_food','canned_food','water_bottle'],
    perk:'Đói/khát giảm chậm 35%.',tagline:'Không bao giờ chết đói.',
    pros:['Không bao giờ chết đói/khát','Tinh thần ổn định'],
    cons:['Chiến đấu rất yếu','Phải liên tục tìm đồ ăn'],
    stats:['Hunger/Thirst -35%','Skill: Sơ cứu 1, Ý chí 2']},
  {id:'farmer',name:'Nông Dân',icon:'🌾',diff:1,diffLabel:'DỄ',diffColor:'#55C45A',
    startSkills:{fitness:2,sneak:1},startItems:['branch','wild_fruit','water_bottle'],
    perk:'Di chuyển ngoài trời -1 ĐHĐ. Stamina +3.',tagline:'Khám phá bản đồ nhanh nhất.',
    pros:['Stamina cao nhất','Di chuyển outdoor rẻ'],
    cons:['Không có kỹ năng y tế hay craft'],
    stats:['Stamina max +3','Outdoor -1 AP','Skill: Thể lực 2, Ẩn mình 1']},
  {id:'driver',name:'Tài Xế',icon:'🚗',diff:1,diffLabel:'DỄ',diffColor:'#55C45A',
    startSkills:{fitness:1,sneak:2},startItems:['flashlight','rope_5m','bandage'],
    perk:'Đường phố -1 ĐHĐ. Zombie ít phát hiện.',tagline:'Nhanh và khó bị phát hiện.',
    pros:['Nhanh nhất trên đường phố','Tàng hình tốt'],
    cons:['Yếu combat','Không có kỹ năng y tế hay xây dựng'],
    stats:['Đường phố -1 AP','Ám sát từ ngày 1','Skill: Thể lực 1, Ẩn mình 2']},
];

// ── SKILLS ────────────────────────────────────────────
var DW_SKILLS = {
  blade:    {name:'Vũ khí chém', icon:'⚔ ', desc:'Tăng sát thương kiếm, dao'},
  blunt:    {name:'Vũ khí đánh', icon:'🔨', desc:'Tăng sát thương gậy, búa'},
  firearm:  {name:'Súng',        icon:'🔫', desc:'Chính xác khi bắn'},
  firstaid: {name:'Sơ cứu',      icon:'🩹', desc:'Hồi máu hiệu quả hơn'},
  sneak:    {name:'Tàng hình',   icon:'👁 ', desc:'Giảm noise khi lục soát'},
  fitness:  {name:'Thể lực',     icon:'💪', desc:'Giảm stamina cost'},
  carpentry:{name:'Thủ công',    icon:'🔧', desc:'Xây dựng & craft tốt hơn'},
  mental:   {name:'Ý chí',       icon:'🧠', desc:'Stress/panic tăng chậm'},
};

// ── EQUIP SLOTS ───────────────────────────────────────
var EQUIP_SLOTS = {
  weapon:{label:'Vũ khí',  icon:'⚔️', hint:'Tăng sát thương chiến đấu'},
  body:  {label:'Áo giáp', icon:'🦺', hint:'Giảm sát thương nhận vào'},
  head:  {label:'Đầu',     icon:'🪖', hint:'Bảo vệ đầu, bộ lọc'},
  hands: {label:'Tay',     icon:'🧤', hint:'Cải thiện thao tác'},
  tool:  {label:'Công cụ', icon:'🔦', hint:'Hỗ trợ sinh tồn'},
};

// ── EQUIP DEFS (combat/armor stats per item ID) ───────
var EQUIP_DEFS = {
  // BLADE
  box_cutter:   {type:'blade', baseDmg:1.0, hitBonus:0,  durMax:8,  noise:1, stealthMul:1.5},
  scissors:     {type:'blade', baseDmg:1.0, hitBonus:1,  durMax:12, noise:1, stealthMul:1.5},
  small_knife:  {type:'blade', baseDmg:1.5, hitBonus:1,  durMax:18, noise:1, stealthMul:2.0},
  kitchen_knife:{type:'blade', baseDmg:2.0, hitBonus:1,  durMax:22, noise:1, stealthMul:2.0},
  scalpel:      {type:'blade', baseDmg:2.5, hitBonus:2,  durMax:28, noise:1, stealthMul:2.5, special:'penetrate'},
  shiv:         {type:'blade', baseDmg:1.5, hitBonus:1,  durMax:15, noise:1, stealthMul:2.0},
  poison_blade: {type:'blade', baseDmg:2.0, hitBonus:1,  durMax:20, noise:1, stealthMul:1.5, poisonChance:40},
  butcher_knife:{type:'blade', baseDmg:5.0, hitBonus:3,  durMax:80, noise:2, stealthMul:2.0},
  // BLUNT
  wooden_ruler: {type:'blunt', baseDmg:0.8, hitBonus:0,  durMax:10, noise:3, stealthMul:1.0},
  branch:       {type:'blunt', baseDmg:0.8, hitBonus:0,  durMax:7,  noise:2, stealthMul:1.0},
  wooden_stick: {type:'blunt', baseDmg:1.5, hitBonus:1,  durMax:18, noise:3, stealthMul:1.0},
  small_hammer: {type:'blunt', baseDmg:2.5, hitBonus:1,  durMax:32, noise:4, stealthMul:1.0},
  rubber_baton: {type:'blunt', baseDmg:2.0, hitBonus:2,  durMax:38, noise:2, stealthMul:1.0},
  iron_pipe:    {type:'blunt', baseDmg:3.0, hitBonus:1,  durMax:42, noise:4, stealthMul:1.0},
  large_hammer: {type:'blunt', baseDmg:4.5, hitBonus:0,  durMax:48, noise:6, stealthMul:1.0, special:'stun_chance'},
  crowbar:      {type:'blunt', baseDmg:3.0, hitBonus:1,  durMax:90, noise:3, stealthMul:1.0, special:'prybar'},
  fire_extinguisher:{type:'blunt',baseDmg:2.5,hitBonus:0,durMax:1,  noise:8, stealthMul:1.0, special:'one_use_aoe'},
  spiked_bat:   {type:'blunt', baseDmg:3.5, hitBonus:1,  durMax:30, noise:4, stealthMul:1.0},
  reinforced_bat:{type:'blunt',baseDmg:3.5, hitBonus:1,  durMax:55, noise:3, stealthMul:1.0},
  iron_bar:     {type:'blunt', baseDmg:3.0, hitBonus:0,  durMax:50, noise:5, stealthMul:1.0},
  // FIREARM
  handgun:      {type:'firearm',baseDmg:6.0,hitBonus:3,  durMax:50, noise:10,stealthMul:1.0,
                 ammoType:'ammo_9mm', special:'gunshot_alert'},
  homemade_bow: {type:'firearm',baseDmg:3.0,hitBonus:2,  durMax:25, noise:2, stealthMul:1.0},
  // ARMOR
  warm_clothes:         {armorBonus:0, durMax:200},
  light_vest:           {armorBonus:1, durMax:55},
  bulletproof_vest:     {armorBonus:3, durMax:75},
  gas_mask:             {armorBonus:1, durMax:38, special:'poison_resist'},
  medical_gloves:       {stressBonus:-5, durMax:5},
  // TOOLS
  flashlight:            {visBonus:1, durMax:28},
  police_flashlight:     {visBonus:1, durMax:38},
  industrial_flashlight: {visBonus:2, durMax:58},
  walkie_talkie:         {radarRange:3,durMax:48},
  military_radio:        {radarRange:6,durMax:78},
  torch:                 {visBonus:1, durMax:10},
};

// ── STATUS EFFECTS ────────────────────────────────────
var STATUS_DEFS = {
  bleed: {icon:'🩸',name:'Chảy máu',   color:'#C0392B',desc:'-0.3 HP/hành động'},
  poison:{icon:'☠️',name:'Nhiễm độc',  color:'#8E44AD',desc:'-HP mỗi giờ game'},
  burn:  {icon:'🔥',name:'Bốc cháy',   color:'#E67E22',desc:'Mất 2 HP mỗi lượt'},
  stun:  {icon:'⚡',name:'Choáng váng', color:'#F1C40F',desc:'Bỏ qua 1 lượt tấn công'},
  fear:  {icon:'😱',name:'Khiếp sợ',   color:'#7F8C8D',desc:'-2 combat rolls'},
};

// ── BOSS DEFS ─────────────────────────────────────────
var BOSS_DEFS = {
  mutant:{
    id:'mutant',icon:'🧬',name:'Kẻ Đột Biến',
    hp:25,maxHp:25,damage:4,phase2Hp:15,phase3Hp:8,
    fightAp:4,fleeAp:3,dc:12,dcPhase2:14,dcPhase3:16,
    phase2Msg:'Đột biến tăng tốc! Sát thương tăng!',
    phase3Msg:'Gần chết — ra đòn liều lĩnh!',
    spawnDay:5,spawnTypes:['warehouse','rubble'],
    desc:'Zombie biến dị khổng lồ.',
    loot:['mutant_blood','mutant_bone','medkit'],xpReward:80,
  },
  butcher:{
    id:'butcher',icon:'🩸',name:'Tên Đồ Tể',
    hp:40,maxHp:40,damage:5,phase2Hp:24,phase3Hp:10,
    fightAp:5,fleeAp:4,dc:13,dcPhase2:15,dcPhase3:13,
    phase2Msg:'Tên Đồ Tể điên cuồng!',
    phase3Msg:'Bị thương nặng — phản đòn tuyệt vọng!',
    spawnDay:10,spawnTypes:['warehouse','police','rubble'],
    desc:'Công nhân lò mổ biến đổi, móc thịt khổng lồ.',
    loot:['butcher_knife','bulletproof_vest','ammo_9mm_10'],xpReward:150,
  },
  soldier:{
    id:'soldier',icon:'💀',name:'Zombie Lính',
    hp:22,maxHp:22,damage:3,phase2Hp:12,phase3Hp:5,
    fightAp:4,fleeAp:3,dc:14,dcPhase2:16,dcPhase3:14,
    phase2Msg:'Kích hoạt phản xạ chiến đấu!',
    phase3Msg:'Hệ thống sắp sụp đổ — bắn loạn!',
    spawnDay:7,spawnTypes:['police','warehouse','bunker'],
    desc:'Zombie mặc quân phục, lựu đạn khói trên thắt lưng.',
    loot:['handgun','ammo_9mm_20','light_vest','walkie_talkie'],xpReward:120,
  },
  hivemind:{
    id:'hivemind',icon:'🕷️',name:'Bầy Chúa',
    hp:60,maxHp:60,damage:2,phase2Hp:36,phase3Hp:15,
    fightAp:5,fleeAp:3,dc:11,dcPhase2:13,dcPhase3:15,
    phase2Msg:'Bầy Chúa gọi thêm zombie! +3 zombie vào tile!',
    phase3Msg:'Tâm trí tập thể đang vỡ vụn!',
    spawnDay:15,spawnTypes:['park','street','apartment'],
    desc:'Hàng chục zombie hợp nhất, tâm trí chung.',
    loot:['secret_map','military_ration','antibiotic','crowbar'],
    xpReward:250,isHivemind:true,
  },
  drzero:{
    id:'drzero',icon:'☢️',name:'Tiến Sĩ Chết',
    hp:80,maxHp:80,damage:6,phase2Hp:48,phase3Hp:20,
    fightAp:6,fleeAp:5,dc:15,dcPhase2:17,dcPhase3:12,
    phase2Msg:'Dr. Zero tiêm huyết thanh — tăng giáp và tốc độ!',
    phase3Msg:'"Thí nghiệm... thất bại..."',
    spawnDay:25,spawnTypes:['bunker','hospital'],
    desc:'Nhà khoa học tạo ra virus. Nửa zombie nửa người.',
    loot:['antidote_blueprint','medkit','handgun','city_map'],
    xpReward:500,isFinal:true,
  },
};

// ── CRAFT RECIPES (exact item IDs) ───────────────────
var CRAFT_RECIPES = [
  {id:'molotov',name:'Bom xăng Molotov',icon:'🔥',
    desc:'AoE, burn cả tile',
    ingredients:['gasoline_bottle','cloth_bandage'],
    result:'molotov',apCost:2,skillReq:{}},
  {id:'shiv',name:'Dao ngắn tự chế',icon:'🔪',
    desc:'Dao mảnh kính + vải',
    ingredients:['glass_shard','cloth_bandage'],
    result:'shiv',apCost:2,skillReq:{carpentry:1}},
  {id:'spiked_bat',name:'Gậy đinh',icon:'🏏',
    desc:'Gậy gỗ + dây điện',
    ingredients:['wooden_stick','electric_wire'],
    result:'spiked_bat',apCost:3,skillReq:{carpentry:1}},
  {id:'reinforced_bat',name:'Gậy gia cố',icon:'🪛',
    desc:'Ống nước + dây thừng',
    ingredients:['iron_pipe','rope_5m'],
    result:'reinforced_bat',apCost:3,skillReq:{carpentry:2}},
  {id:'bow',name:'Cung tự chế',icon:'🏹',
    desc:'Cành cây + dây thừng, yên tĩnh',
    ingredients:['branch','rope_5m'],
    result:'homemade_bow',apCost:4,skillReq:{carpentry:2}},
  {id:'medkit_craft',name:'Bộ sơ cứu dã chiến',icon:'🩹',
    desc:'Băng gạc + cồn',
    ingredients:['bandage','alcohol'],
    result:'medkit_field',apCost:2,skillReq:{firstaid:1}},
  {id:'smoke_grenade',name:'Lựu đạn khói TC',icon:'💨',
    desc:'Bình xịt + bật lửa',
    ingredients:['spray_can','lighter'],
    result:'smoke_grenade_craft',apCost:3,skillReq:{carpentry:1}},
  {id:'door_brace',name:'Thanh chặn cửa',icon:'🪵',
    desc:'Cành cây + dây thừng',
    ingredients:['branch','rope_5m'],
    result:'door_brace',apCost:2,skillReq:{}},
  {id:'torch',name:'Đuốc tự chế',icon:'🕯️',
    desc:'Cành cây + vải băng + bật lửa',
    ingredients:['branch','cloth_bandage','lighter'],
    result:'torch',apCost:2,skillReq:{}},
  {id:'poison_blade',name:'Dao tẩm độc',icon:'🗡️',
    desc:'Dao bếp + nấm rừng → gây độc khi trúng',
    ingredients:['kitchen_knife','mushroom'],
    result:'poison_blade',apCost:3,skillReq:{carpentry:2,firstaid:1}},

  // ── BASE CRAFTING RECIPES ─────────────────────────────
  // Xe kéo: craft từ phụ tùng + dây thừng.
  // Không cần base để craft nhưng cho phép salvage khi move base.
  {id:'handcart',name:'Xe kéo tự chế',icon:'🛒',
    desc:'Cho phép salvage 50% vật liệu khi di chuyển base',
    ingredients:['cart_parts','rope_10m','toolbox'],
    result:'handcart',apCost:5,skillReq:{carpentry:2}},

  // Vật cản âm thanh: giảm noise khi craft trong base
  {id:'noise_dampener',name:'Vật cản âm thanh',icon:'🧱',
    desc:'Đặt trong base — giảm noise mỗi action',
    ingredients:['cloth_bandage','rope_5m','wooden_plank'],
    result:'noise_dampener',apCost:3,skillReq:{carpentry:1}},

  // BASE COOKING — chỉ khả dụng khi base level >= 3 (có cooking fire).
  // engine-survival.js kiểm tra state.base?.level >= 3 trước khi cho phép.
  // apCost thấp hơn craft thường — đây là REWARD của việc build base.
  {id:'cook_stew',name:'Nấu cháo',icon:'🍲',
    desc:'Cần bếp lửa base (L3+). Hunger +5, Thirst +1.5',
    ingredients:['canned_food','rainwater'],
    result:'cooked_stew',apCost:1,skillReq:{},baseOnly:true,baseLevel:3},

  {id:'cook_meat',name:'Nướng thịt',icon:'🥩',
    desc:'Cần bếp lửa base (L3+). Hunger +4',
    ingredients:['wild_fruit','cloth_bandage'],
    result:'roasted_meat',apCost:1,skillReq:{},baseOnly:true,baseLevel:3},

  {id:'brew_tea',name:'Pha trà thảo mộc',icon:'🍵',
    desc:'Cần bếp lửa base (L3+). Stress -12',
    ingredients:['leaf','rainwater'],
    result:'herbal_tea',apCost:1,skillReq:{},baseOnly:true,baseLevel:3},
];

// ══════════════════════════════════════════════════════
// BASE UPGRADE DEFINITIONS
// ──────────────────────────────────────────────────────
// Mỗi level mở thêm một feature và tăng baseThreatPerDay.
// materials: array item IDs cần tiêu hao khi upgrade.
// blueprintUnlocked: ID tính năng lưu vào state.baseBlueprints khi build.
//   Khi move base, state.baseBlueprints được giữ nguyên (kiến thức không mất).
//   Nhưng physical structure reset về level 0 — phải rebuild bằng materials.
// salvageMaterials: % vật liệu được giữ lại khi tháo dỡ (không có xe kéo).
//   Với handcart trong inventory: salvage rate tăng lên 50%.
// baseThreatPerDay: signature tích lũy mỗi ngày (độc lập với noise).
//   Signature cao → scouting event → raid event.
// noisePerAction: noise thêm vào mỗi khi thực hiện action trong base.
// ══════════════════════════════════════════════════════
var BASE_UPGRADE_DEFS = {
  // L1: Shelter cơ bản — chỉ cần tấm bạt + barricade có sẵn
  // Mở khóa: ngủ an toàn hơn barricade thông thường (không cần barricade ≥ 1).
  1: {
    level: 1, name: 'Trú ẩn tạm', icon: '⛺',
    desc: 'Shelter tạm. Ngủ an toàn không cần barricade. AP regen +5% khi trong base.',
    materials: ['tarp','tarp','rope_5m'],          // 2 tấm bạt + dây
    apCost: 3,
    blueprintUnlocked: 'shelter',
    salvageMaterials: 0.30,                         // không xe kéo: lấy lại 30%
    baseThreatPerDay: 1,                            // ai cũng có thể thấy khói bạt
    noisePerAction: 0,                              // L1 yên tĩnh
    features: ['safe_sleep'],                       // DW_sleep không cần barricade tile
  },
  // L2: Workshop — thêm ván gỗ để có bàn làm việc
  // Mở khóa: craft không tốn noise (thay vì +2 noise/craft bình thường).
  2: {
    level: 2, name: 'Xưởng tự chế', icon: '🔨',
    desc: 'Bàn làm việc. Craft trong base không tăng noise. Storage: 30 weight.',
    materials: ['wooden_plank','wooden_plank','small_hammer','rope_5m'],
    apCost: 4,
    blueprintUnlocked: 'workshop',
    salvageMaterials: 0.30,
    baseThreatPerDay: 2,
    noisePerAction: 0,                              // L2 còn yên tĩnh
    storageCapWeight: 30,                           // base storage max 30 units weight
    features: ['safe_sleep','silent_craft','storage'],
  },
  // L3: Cooking fire — thêm khói = thêm threat đáng kể
  // Mở khóa: base cooking recipes (baseOnly:true, baseLevel:3).
  // TRADE-OFF: cooking tạo smoke → baseThreatPerDay tăng mạnh.
  // Đây là điểm cân bằng giữa food security và threat attraction.
  3: {
    level: 3, name: 'Bếp lửa trại', icon: '🔥',
    desc: 'Nấu ăn trong base. Food value +30%. Storage: 50 weight. Khói thu hút nguy hiểm!',
    materials: ['wooden_plank','metal_sheet','brick','brick','rope_5m'],
    apCost: 5,
    blueprintUnlocked: 'cooking_fire',
    salvageMaterials: 0.25,
    baseThreatPerDay: 5,                            // khói — zombie và bandit có thể nhìn thấy
    noisePerAction: 2,                              // nấu ăn tạo mùi và tiếng động
    storageCapWeight: 50,
    features: ['safe_sleep','silent_craft','storage','cooking'],
  },
  // L4: Repair bench — cần kim loại, threat tăng vừa
  // Mở khóa: repair không tốn AP (chỉ tốn thời gian = base time token).
  4: {
    level: 4, name: 'Bàn sửa chữa', icon: '🔧',
    desc: 'Sửa trang bị miễn AP trong base. Storage: 80 weight.',
    materials: ['metal_sheet','metal_sheet','toolbox','wooden_plank','rope_10m'],
    apCost: 6,
    blueprintUnlocked: 'repair_bench',
    salvageMaterials: 0.20,
    baseThreatPerDay: 7,
    noisePerAction: 3,                              // tiếng búa khá lớn
    storageCapWeight: 80,
    features: ['safe_sleep','silent_craft','storage','cooking','free_repair'],
  },
  // L5: Stronghold — tường bê tông, threat cao nhất
  // Cực kỳ hiếm để đạt được (concrete_block rất nặng + khó kiếm).
  // Ở L5 quá lâu mà không có camouflage_net = guaranteed raid sau ~3 ngày.
  5: {
    level: 5, name: 'Pháo đài', icon: '🏰',
    desc: 'Phòng thủ tối đa. Barricade tự động L3. AP regen +15% khi trong base.',
    materials: ['concrete_block','concrete_block','metal_sheet','metal_sheet','wire_mesh','toolbox'],
    apCost: 8,
    blueprintUnlocked: 'stronghold',
    salvageMaterials: 0.15,                         // bê tông khó tháo — mất nhiều nhất
    baseThreatPerDay: 12,                           // ai cũng biết bạn ở đây
    noisePerAction: 3,
    storageCapWeight: 120,
    features: ['safe_sleep','silent_craft','storage','cooking','free_repair','auto_barricade'],
  },
};

// ══════════════════════════════════════════════════════
// BASE THREAT EVENTS
// ──────────────────────────────────────────────────────
// Mỗi event được trigger khi state.baseThreat đạt threshold.
// type: 'warning' (cảnh báo, không combat) | 'raid' (combat hoặc buộc di chuyển)
//       | 'refugee' (NPC event, player chọn accept/reject)
// Narrative text được AI mở rộng thêm — đây chỉ là template.
// signatureThreshold: điểm baseThreat để trigger.
// ══════════════════════════════════════════════════════
var BASE_THREAT_EVENTS = [
  // Ngưỡng 8: scouting cảnh báo — player thấy dấu hiệu đầu tiên
  {
    id:'scout_footprints', type:'warning', signatureThreshold: 8,
    icon:'👣', title:'Dấu chân lạ',
    msg:'Bạn thấy những vết chân bùn quanh base — ai đó đã thám thính đêm qua.',
    choices: null,                                  // chỉ thông báo, không có lựa chọn
    stressAdd: 8,
  },
  // Ngưỡng 15: refugee — NPC xin vào base, betrayal risk nếu accept
  {
    id:'refugee_arrives', type:'refugee', signatureThreshold: 15,
    icon:'👤', title:'Người tị nạn',
    msg:'Một người run rẩy đứng trước cửa base. Họ nói họ không có vũ khí.',
    choices: [
      { label:'Cho vào', key:'accept',
        effect:'refugee_join',                      // engine-survival.js xử lý
        desc:'Giảm stress -10. Nhưng có 20% cơ hội bị phản bội (lấy đồ khi ngủ).' },
      { label:'Từ chối', key:'reject',
        effect:'refugee_reject',
        desc:'Stress +12. Không có rủi ro mất đồ.' },
    ],
  },
  // Ngưỡng 22: bandit scouting — raid được cảnh báo 2 ngày trước
  {
    id:'bandit_scouting', type:'warning', signatureThreshold: 22,
    icon:'🗡️', title:'Bọn cướp thám thính',
    msg:'Bạn nghe tiếng xì xào từ bóng tối. Có bóng người đứng nhìn base từ xa rồi biến mất.',
    choices: null,
    stressAdd: 15,
    nextEventId: 'bandit_raid',                     // sau 2 ngày → trigger raid
    nextEventDelay: 2,
  },
  // Ngưỡng 30 hoặc 2 ngày sau bandit_scouting: raid thực sự
  {
    id:'bandit_raid', type:'raid', signatureThreshold: 30,
    icon:'⚔️', title:'Tập kích!',
    msg:'Đêm khuya. Cửa bị đập mạnh. Bọn cướp tấn công base!',
    choices: [
      { label:'Cố thủ', key:'defend',
        effect:'trigger_combat',                    // engine-combat.js
        desc:'Đánh với 1–3 bandit. Thắng → base nguyên. Thua → buộc rời base.' },
      { label:'Rút lui', key:'flee',
        effect:'force_relocate',
        desc:'Mất base. Salvage chỉ 20% (không có thời gian pack đồ). AP -5.' },
    ],
  },
  // Ngưỡng 40: zombie migration — horde lớn đang tiến đến
  {
    id:'zombie_horde_migration', type:'raid', signatureThreshold: 40,
    icon:'🧟', title:'Bầy xác sống',
    msg:'Tiếng rên rỉ vang khắp nơi. Một bầy zombie lớn đang di chuyển về hướng base.',
    choices: [
      { label:'Phòng thủ (cần barricade L4+)', key:'defend_horde',
        effect:'trigger_horde_combat',
        desc:'Nguy hiểm cao. Thắng → base còn nguyên + XP lớn.' },
      { label:'Di chuyển base ngay', key:'emergency_move',
        effect:'force_relocate',
        desc:'Mất base. Salvage 20%. Stress +20.' },
    ],
  },
];

// ══════════════════════════════════════════════════════
// BASE SYSTEM DATA
// Tất cả data tĩnh cho hệ thống base.
// Logic nằm hoàn toàn trong engine-survival.js.
// ══════════════════════════════════════════════════════

// ── BASE_UPGRADE_TABLE ────────────────────────────────
// 5 cấp độ base, mỗi cấp cần vật liệu + skill để build.
// signaturePerDay: điểm "dấu vết" tích lũy mỗi ngày — càng cao base càng dễ bị phát hiện.
// noiseMul: nhân số với BASE_NOISE_TABLE để tính noise thực tế khi craft/cook trong base.
//   Lý do dùng multiplier: base càng lớn → âm thanh lan ra xa hơn (vách mỏng hơn ở L1, kín hơn ở L4+)
//   nhưng nhược điểm là signature tăng nhanh hơn nhiều.
// salvagePct: % vật liệu lấy lại khi pack base để di chuyển (không có xe kéo).
//   Xe kéo (handcart) cộng thêm 20% vào con số này.
// maxStorageWeight: giới hạn trọng lượng kho base (kg).
//   Tránh exploit "infinite warehouse" — player phải chọn giữ gì.
var BASE_UPGRADE_TABLE = [
  // L1 — Shelter — chỉ cần tấm bạt và một mảnh ván
  {
    level: 1,
    name: 'Nơi trú ẩn',
    icon: '⛺',
    desc: 'Một tấm bạt và vài ván gỗ. Đủ để ngủ an toàn.',
    // Vật liệu xây: danh sách [itemId, quantity]
    buildCost: [['tarp', 2], ['wooden_plank', 1]],
    buildApCost: 4,             // AP cần để dựng
    skillReq: {},               // không cần skill đặc biệt
    benefits: ['sleep_safe'],   // cho phép ngủ mà không cần barricade riêng
    signaturePerDay: 1,         // rất ít dấu vết
    noiseMul: 1.0,              // noise không được giảm ở L1
    salvagePct: 0.30,           // chỉ lấy lại 30% nếu không có xe kéo
    maxStorageWeight: 20,       // 20kg — chỉ đủ cho đồ thiết yếu
  },
  // L2 — Camp — thêm khu vực craft cơ bản
  {
    level: 2,
    name: 'Trại tạm',
    icon: '🏕️',
    desc: 'Góc craft nhỏ. Có thể tự chế vũ khí và sơ cứu.',
    buildCost: [['wooden_plank', 3], ['rope_10m', 1], ['brick', 2]],
    buildApCost: 6,
    skillReq: { carpentry: 1 },
    // 'craft_basic' cho phép dùng CRAFT_RECIPES bình thường trong base (tiêu hao Base Time)
    benefits: ['sleep_safe', 'craft_basic'],
    signaturePerDay: 2,
    noiseMul: 0.9,              // tường dày hơn một chút → noise giảm 10%
    salvagePct: 0.40,
    maxStorageWeight: 35,
  },
  // L3 — Outpost — có bếp → nấu ăn, khói nhìn thấy từ xa
  {
    level: 3,
    name: 'Tiền đồn',
    icon: '🔥',
    desc: 'Bếp lửa. Nấu thức ăn chất lượng cao. Nhưng khói lộ vị trí.',
    buildCost: [['wooden_plank', 4], ['metal_sheet', 1], ['wire_mesh', 1]],
    buildApCost: 8,
    skillReq: { carpentry: 2 },
    // 'cook' cho phép dùng BASE_CRAFT_RECIPES với tag 'base_cook'
    benefits: ['sleep_safe', 'craft_basic', 'cook'],
    signaturePerDay: 4,         // khói lộ vị trí — tăng mạnh
    noiseMul: 0.85,
    salvagePct: 0.45,
    maxStorageWeight: 50,
  },
  // L4 — Refuge — bàn sửa chữa, tăng durability trang bị
  {
    level: 4,
    name: 'Nơi trú ẩn kiên cố',
    icon: '🏚️',
    desc: 'Bàn sửa đồ. Trang bị bền hơn. Khá lộ liễu.',
    buildCost: [['metal_sheet', 3], ['wooden_plank', 5], ['toolbox', 1]],
    buildApCost: 10,
    skillReq: { carpentry: 3 },
    // 'repair_bonus': khi sửa đồ trong base, durability hồi thêm 30%
    benefits: ['sleep_safe', 'craft_basic', 'cook', 'repair_bonus'],
    signaturePerDay: 7,
    noiseMul: 0.75,             // xưởng kín hơn → noise thấp hơn
    salvagePct: 0.50,
    maxStorageWeight: 70,
  },
  // L5 — Stronghold — pháo đài nhỏ, bảo vệ tốt nhất nhưng rất dễ bị tập kích
  {
    level: 5,
    name: 'Pháo đài',
    icon: '🏰',
    desc: 'Tường bê tông. Phòng thủ tốt nhất. Nhưng thu hút nguy hiểm cao nhất.',
    buildCost: [['concrete_block', 4], ['metal_sheet', 4], ['wire_mesh', 2]],
    buildApCost: 14,
    skillReq: { carpentry: 4 },
    // 'defense_bonus': khi bị tấn công tại base, player nhận -2 damage/hit
    benefits: ['sleep_safe', 'craft_basic', 'cook', 'repair_bonus', 'defense_bonus'],
    signaturePerDay: 12,        // rất dễ bị phát hiện — phòng thủ đi kèm rủi ro
    noiseMul: 0.60,
    salvagePct: 0.50,           // max salvage cũng chỉ 50% (không có xe kéo)
    maxStorageWeight: 100,
  },
];

// ── BASE_NOISE_TABLE ──────────────────────────────────
// Noise sinh ra khi thực hiện action trong base.
// Giá trị này được nhân với BASE_UPGRADE_TABLE[level].noiseMul để ra noise thực tế.
// Thiết kế dựa trên nguồn âm thực tế: búa > bếp > dụng cụ tay > không làm gì.
// Noise tích vào state.baseThreatSig (base signature) — KHÔNG phải state.noise của player.
// Lý do tách riêng: noise player ảnh hưởng tile ngay lập tức (zombie migration),
// còn baseThreatSig ảnh hưởng dài hạn (ai phát hiện base sau vài ngày).
var BASE_NOISE_TABLE = {
  craft_weapon:   4,  // đóng đinh, mài sắt — ồn nhất
  craft_armor:    3,  // cắt vải, buộc dây
  craft_misc:     2,  // làm đuốc, bẫy — nhẹ nhàng hơn
  cook:           2,  // bếp lửa, khói — âm thanh thấp nhưng khói tăng signature riêng
  repair:         3,  // búa sửa — tiếng kim loại
  sleep:          0,  // không tạo noise khi ngủ
  organize:       0,  // sắp xếp kho — yên lặng
  rest:           0,
};

// ── BASE_THREAT_EVENTS ────────────────────────────────
// Các sự kiện xảy ra khi baseThreatSig vượt ngưỡng.
// Engine-survival.js đọc bảng này để roll sự kiện phù hợp.
//
// sigThreshold: điểm signature tối thiểu để sự kiện này có thể xảy ra.
// weight: xác suất tương đối khi roll (nhiều event cùng đủ điều kiện).
// warningDays: số ngày cảnh báo trước khi event thực sự xảy ra (0 = ngay lập tức).
//   Cảnh báo tạo ra "dread" — người chơi biết nguy hiểm đang đến,
//   có thời gian chuẩn bị hoặc quyết định relocate. Đây là mechanic quan trọng nhất.
// canDefend: true nếu player có thể ở lại và chiến đấu.
// canFlee: true nếu player có thể bỏ chạy mà không mất base (nhưng mất thời gian).
var BASE_THREAT_EVENTS = [
  // ── SỰ KIỆN NHẸ (sig 5-14) ──────────────────────────
  {
    id: 'zombie_wander',
    name: 'Zombie lang thang',
    icon: '🧟',
    sigThreshold: 5,
    weight: 40,
    warningDays: 0,   // không có cảnh báo — xảy ra ngay
    // Thêm 1-2 zombie vào tile base (không phải horde)
    effect: { spawnZombies: 2, spawnType: 'zombie' },
    canDefend: true,
    canFlee: false,   // zombie thường không đuổi theo nếu player chạy khỏi tile
    narrativeHints: [
      'Tiếng lê bước chân ngoài cửa.',
      'Bóng tối phía ngoài rào chắn — có gì đó đang ngửi.',
      'Móng vuốt cào vào vách. Một con thôi. Nhưng chúng có thể gọi thêm.',
    ],
  },
  {
    id: 'refugee_knock',
    name: 'Người tị nạn gõ cửa',
    icon: '👤',
    sigThreshold: 8,
    weight: 25,
    warningDays: 0,
    // Người chơi chọn: accept (giảm stress nhưng chia sẻ storage) hoặc reject (tăng stress)
    effect: { type: 'choice', choices: ['accept', 'reject'] },
    canDefend: false,
    canFlee: false,
    narrativeHints: [
      'Tiếng gõ cửa nhẹ. Giọng phụ nữ: "Làm ơn... tôi không làm hại ai."',
      'Một đứa trẻ nhìn qua khe hở. Mắt nó trống rỗng vì mệt mỏi.',
      'Bóng người loạng choạng bên ngoài rào. Trông không phải zombie.',
    ],
    // Kết quả nếu accept: stress -10, nhưng food/thirst tiêu nhanh hơn (NPC chia sẻ)
    acceptEffect: { stress: -10, foodDrainMul: 1.3 },
    // Kết quả nếu reject: stress +8, depression +3
    rejectEffect: { stress: 8, depression: 3 },
  },
  // ── SỰ KIỆN TRUNG (sig 15-29) ──────────────────────
  {
    id: 'bandit_scout_spotted',
    name: 'Trinh sát cướp bị phát hiện',
    icon: '🗡️',
    sigThreshold: 15,
    weight: 30,
    warningDays: 2,   // 2 ngày sau sẽ có raid — player có thời gian chuẩn bị
    effect: { type: 'warning', followUp: 'bandit_raid' },
    canDefend: false,
    canFlee: false,
    narrativeHints: [
      'Bạn thấy bóng người biến mất sau góc tường. Không phải zombie — di chuyển quá nhanh.',
      'Vết giày mới ngoài rào. Ai đó đã đi vòng quanh đây tối qua.',
      'Radio bắt được đoạn ngắn: "...có căn cứ... đáng giá... chờ lệnh..."',
    ],
  },
  {
    id: 'zombie_horde_migration',
    name: 'Bầy zombie di cư',
    icon: '🧟‍♂️',
    sigThreshold: 20,
    weight: 20,
    warningDays: 1,   // 1 ngày cảnh báo — tiếng kêu từ xa
    effect: { spawnZombies: 5, spawnType: 'zombie_horde' },
    canDefend: true,
    canFlee: true,
    narrativeHints: [
      'Tiếng rên vang từ xa — nhiều lắm. Đang tiến đến đây.',
      'Mặt đất rung nhẹ. Hàng chục cặp chân không có nhịp điệu.',
      'Bầy chim bay vọt khỏi tòa nhà phía Bắc — chạy trốn điều gì đó lớn hơn.',
    ],
  },
  // ── SỰ KIỆN NẶNG (sig 30+) ─────────────────────────
  {
    id: 'bandit_raid',
    name: 'Cướp tập kích',
    icon: '💀',
    sigThreshold: 30,
    weight: 20,
    warningDays: 0,   // raid xảy ra ngay (thường sau bandit_scout_spotted)
    effect: { spawnBandits: 2, banditTier: 'auto' },
    canDefend: true,
    canFlee: true,    // nhưng bỏ chạy = mất 50% storage
    narrativeHints: [
      'Tiếng hét bên ngoài. "BẮT LẤY NÓ — ĐỪNG ĐỂ CHẠY!"',
      'Lửa đang cháy ở rào phía Tây. Bọn chúng đang phá vào.',
      'Đạn nổ. Không phải của bạn.',
    ],
    // Nếu player chọn flee: mất storageItems ngẫu nhiên (50% mất, 50% pack kịp)
    fleeStorageLoss: 0.50,
  },
  {
    id: 'boss_drawn',
    name: 'Boss bị thu hút',
    icon: '☠️',
    sigThreshold: 45,
    weight: 8,
    warningDays: 1,
    // Boss spawn tại tile base hoặc tile lân cận
    effect: { type: 'boss_spawn', bossPool: ['juggernaut', 'soldier', 'butcher'] },
    canDefend: true,
    canFlee: true,
    narrativeHints: [
      'Tiếng gầm không giống bất kỳ zombie nào bạn từng nghe.',
      'Kính cửa sổ rung bần bật. Thứ gì đó rất to đang đến gần.',
      'Mọi zombie quanh khu vực đột nhiên im lặng và nhìn về một hướng.',
    ],
  },
];

// ── BASE_CRAFT_RECIPES ────────────────────────────────
// Công thức chỉ thực hiện được khi có base ở level tương ứng.
// Phân biệt với CRAFT_RECIPES thông thường bởi field 'baseLevel'.
// 'type' phân loại để tra BASE_NOISE_TABLE: 'cook' | 'craft_weapon' | 'craft_armor' | 'craft_misc'.
//
// Lý do thiết kế: base food ngon hơn raw food đáng kể (hunger +5 so với +3)
// — đây là reward cụ thể cho việc đầu tư xây base, không phải chỉ cosmetic.
// Giới hạn exploit: base cooking tiêu Base Time (tính bởi engine) + nguyên liệu thực tế.
var BASE_CRAFT_RECIPES = [
  // ── NẤU ĂN (cần base L3+) ──────────────────────────
  {
    id: 'base_cook_stew',
    name: 'Nấu cháo',
    icon: '🍲',
    desc: 'Cháo từ đồ hộp + nước. Ngon hơn ăn sống nhiều.',
    ingredients: ['canned_food', 'rainwater'],
    result: 'cooked_stew',
    apCost: 0,          // không tốn AP của player — tốn Base Time (engine xử lý)
    baseTimeCost: 2,    // 2 Base Time tokens
    skillReq: {},
    baseLevel: 3,       // cần base L3 (có bếp)
    type: 'cook',
    noiseKey: 'cook',   // tra BASE_NOISE_TABLE['cook']
    dailyLimit: 3,      // tối đa 3 lần/ngày — tránh spam food
  },
  {
    id: 'base_cook_tea',
    name: 'Pha trà thảo mộc',
    icon: '🍵',
    desc: 'Lá cây + nước mưa. Giảm stress hiệu quả.',
    ingredients: ['leaf', 'rainwater'],
    result: 'herbal_tea',
    apCost: 0,
    baseTimeCost: 1,
    skillReq: {},
    baseLevel: 3,
    type: 'cook',
    noiseKey: 'cook',
    dailyLimit: 3,
  },
  {
    id: 'base_cook_meat',
    name: 'Nướng thịt',
    icon: '🥩',
    desc: 'Nướng thịt rừng hoặc thịt bắt được. Nguy cơ: nếu là strange_meat thì stress tăng.',
    ingredients: ['wild_fruit', 'leaf'],   // wild_fruit đại diện "thịt/nguyên liệu tươi"
    result: 'roasted_meat',
    apCost: 0,
    baseTimeCost: 2,
    skillReq: { firstaid: 1 },  // cần biết phân biệt thịt ăn được
    baseLevel: 3,
    type: 'cook',
    noiseKey: 'cook',
    dailyLimit: 2,
  },
  // ── CRAFT ĐẶC BIỆT (cần base L2+) ─────────────────
  {
    id: 'base_craft_noise_dampener',
    name: 'Làm vật cản âm thanh',
    icon: '🧱',
    desc: 'Vải + dây. Giảm noise khi craft trong base.',
    ingredients: ['cloth_bandage', 'rope_5m'],
    result: 'noise_dampener',
    apCost: 0,
    baseTimeCost: 2,
    skillReq: { carpentry: 1 },
    baseLevel: 2,
    type: 'craft_misc',
    noiseKey: 'craft_misc',
    dailyLimit: 1,  // chỉ cần 1 cái — không cần spam
  },
  {
    id: 'base_craft_handcart',
    name: 'Lắp ráp xe kéo',
    icon: '🛒',
    desc: 'Phụ tùng xe kéo + dây thừng. Cho phép salvage 50% khi move base.',
    ingredients: ['cart_parts', 'rope_10m', 'toolbox'],
    result: 'handcart',
    apCost: 0,
    baseTimeCost: 4,  // mất nhiều thời gian — đây là craft quan trọng
    skillReq: { carpentry: 2 },
    baseLevel: 2,
    type: 'craft_misc',
    noiseKey: 'craft_weapon',   // lắp ráp kim loại → khá ồn
    dailyLimit: 1,
  },
  {
    id: 'base_craft_camouflage',
    name: 'Dựng lưới ngụy trang',
    icon: '🕸️',
    desc: 'Lưới thép + lá cây. Giảm 30% tốc độ tích lũy Base Signature.',
    ingredients: ['wire_mesh', 'leaf', 'rope_5m'],
    result: 'camouflage_net',
    apCost: 0,
    baseTimeCost: 3,
    skillReq: { sneak: 1 },
    baseLevel: 2,
    type: 'craft_misc',
    noiseKey: 'craft_misc',
    dailyLimit: 1,
  },
];

// ── RUMOR POOL ────────────────────────────────────────
// source: 'radio'|'npc'|'note'|'prisoner'
// targetSpecial: khớp với KEY_LOCATIONS[].special để xác định tile đích
// rumorType sẽ được roll lúc runtime — không lưu ở đây tránh bị đoán
var RUMOR_POOL = [
  // === NHÓM HY VỌNG — dễ tin, dễ bị lợi dụng ===
  {id:'r01',source:'radio',
   text:'📻 Tín hiệu radio lờ mờ: "...kho quân y... bệnh viện phía Đông... còn nguyên..."',
   targetSpecial:'medical', baitIcon:'💊',
   lootItems:['medkit','antibiotic','morphine'],
   stashDesc:'Một tủ thuốc quân sự bị khóa — bên trong đầy ắp.'},

  {id:'r02',source:'npc',
   text:'👤 Người sống sót thì thầm: "Tôi thấy lính để lại súng ở đồn cảnh sát cũ. Họ chạy mất rồi."',
   targetSpecial:'weapon', baitIcon:'🔫',
   lootItems:['handgun','ammo_9mm_20','light_vest'],
   stashDesc:'Tủ locker cảnh sát — khóa bị phá, nhưng bên trong vẫn còn đồ.'},

  {id:'r03',source:'note',
   text:'📝 Mảnh giấy dán tường: "Kho BigC tầng B1 — đồ ăn chưa ai lấy. Cẩn thận cửa sau."',
   targetSpecial:'food', baitIcon:'🍱',
   lootItems:['military_ration','canned_food','water_bottle','canned_food'],
   stashDesc:'Kệ hàng tầng hầm — phủ bụi nhưng còn đầy đồ hộp.'},

  {id:'r04',source:'radio',
   text:'📻 "...kho cảng phía Tây... vật tư xây dựng... ai cần thì lấy trước..."',
   targetSpecial:'supply', baitIcon:'🧱',
   lootItems:['wire_mesh','rope_10m','toolbox','crowbar'],
   stashDesc:'Thùng hàng công nghiệp — dây thừng, dụng cụ còn nguyên.'},

  {id:'r05',source:'npc',
   text:'👤 "Hầm bí mật phía Bắc — nghe nói có người để lại đồ trước khi bỏ trốn."',
   targetSpecial:'bunker', baitIcon:'📦',
   lootItems:['secret_map','military_ration','ammo_9mm_20','medkit'],
   stashDesc:'Hòm sắt hàn chặt — bên trong là thứ người ta không muốn bỏ lại.'},

  // === NHÓM CẢNH BÁO — thường thật nhưng nguy hiểm ===
  {id:'r06',source:'note',
   text:'📝 Vẽ nguệch ngoạc trên cửa: "ĐỪNG VÀO TRƯỜNG — CÓ BẦY. Ký: T."',
   targetSpecial:'misc', baitIcon:'⚠️',
   lootItems:['survival_book','bandage','rope_5m'],
   stashDesc:'Lớp học bỏ hoang — sách vở và vài thứ còn sót lại.'},

  // === NHÓM MƠ HỒ — khó đoán, tension cao ===
  {id:'r07',source:'prisoner',
   text:'⛓️ Tên cướp bị trói nói: "Có kho đồ ở bệnh viện... bọn tao chưa lấy hết đâu. Thề."',
   targetSpecial:'medical', baitIcon:'🩺',
   lootItems:['medkit','alcohol','bandage','painkiller'],
   stashDesc:'Phòng kho bệnh viện — đã bị lục một phần nhưng còn nhiều thứ.'},

  {id:'r08',source:'radio',
   text:'📻 Tĩnh điện — rồi một giọng nói: "...Bitexco... tầng 3... còn thức ăn cho 2 tuần..."',
   targetSpecial:null, baitIcon:'🍞',
   lootItems:['bread','canned_food','instant_noodle','water_bottle'],
   stashDesc:'Căn tin tòa nhà — tủ lạnh tắt nhưng đồ khô còn nguyên.'},

  {id:'r09',source:'npc',
   text:'👤 Bà lão thì thầm: "Chung cư Hoà Bình — tầng 7 còn người. Họ có thức ăn."',
   targetSpecial:null, baitIcon:'👥',
   lootItems:['canned_food','bandage','water_bottle'],
   stashDesc:'Căn hộ tối — ai đó đã sống ở đây không lâu trước.'},

  {id:'r10',source:'note',
   text:'📝 Viết bằng máu trên tường gạch: "Công viên 23/9 — giếng cũ — tìm đi."',
   targetSpecial:null, baitIcon:'🗺️',
   lootItems:['area_map','rope_5m','pebble'],
   stashDesc:'Dưới lòng giếng cũ — ai đó đã giấu thứ này từ rất lâu.'},
];

// ── BANDIT DEFS ───────────────────────────────────────
// Bandit là enemy đặc biệt: tactical, có thể flee, có thể steal
// Tier scale theo state.day khi spawn.
// personality: 'scavenger' | 'ambusher' | 'deserter' | 'cannibal'
// — engine-combat.js đọc personality để dispatch behavior
var BANDIT_DEFS = {
  bandit_scout: {
    id:'bandit_scout',  icon:'🗡️', name:'Tên Cướp Thám Thính',
    hp:8,  maxHp:8,  damage:2, armor:0,
    weapon:'knife_implied', weaponLabel:'dao',
    fightAp:3, fleeAp:2, dc:9,
    fleeHp:2,
    steals:false,
    spawnDayMin:1,
    loot:['cloth_bandage','pebble','energy_candy'],
    xpReward:15,
    desc:'Một tên nhỏ tuổi, mắt đỏ hoe. Dao cầm run run.',
    // personality được gán lúc spawn bởi DW_assignBanditPersonality()
    // scout thiên về deserter hoặc scavenger
    personalityWeights:[
      {p:'scavenger',w:40},{p:'deserter',w:35},{p:'ambusher',w:20},{p:'cannibal',w:5},
    ],
  },
  bandit_raider: {
    id:'bandit_raider', icon:'🔨', name:'Tên Cướp Cứng Đầu',
    hp:14, maxHp:14, damage:3, armor:1,
    weapon:'crowbar_implied', weaponLabel:'xà beng',
    fightAp:3, fleeAp:2, dc:11,
    fleeHp:4,
    steals:false,
    spawnDayMin:4,
    loot:['bandage','canned_food','rope_5m'],
    xpReward:30,
    desc:'Áo khoác rách, xà beng trên vai. Nhìn bạn như nhìn thức ăn.',
    personalityWeights:[
      {p:'scavenger',w:35},{p:'ambusher',w:30},{p:'deserter',w:25},{p:'cannibal',w:10},
    ],
  },
  bandit_heavy: {
    id:'bandit_heavy',  icon:'🛡️', name:'Tên Cướp Bọc Thép',
    hp:20, maxHp:20, damage:5, armor:2,
    weapon:'handgun_implied', weaponLabel:'súng ngắn',
    fightAp:4, fleeAp:3, dc:13,
    fleeHp:6,
    steals:true,
    spawnDayMin:8,
    loot:['ammo_9mm_10','light_vest','bandage'],
    xpReward:50,
    desc:'Áo giáp tự chế. Súng dắt lưng. Mắt lạnh như đá.',
    personalityWeights:[
      {p:'ambusher',w:35},{p:'scavenger',w:30},{p:'cannibal',w:25},{p:'deserter',w:10},
    ],
  },
  bandit_leader: {
    id:'bandit_leader', icon:'💀', name:'Trùm Cướp',
    hp:25, maxHp:25, damage:4, armor:2,
    weapon:'rifle_implied', weaponLabel:'súng trường',
    fightAp:4, fleeAp:3, dc:14,
    fleeHp:5,
    steals:true,
    spawnDayMin:8,
    loot:['ammo_9mm_20','crowbar','medkit','canned_food'],
    xpReward:70,
    desc:'Trán có hình xăm đầu lâu. Nói ít — làm nhiều.',
    personalityWeights:[
      {p:'cannibal',w:35},{p:'ambusher',w:30},{p:'scavenger',w:25},{p:'deserter',w:10},
    ],
  },
};

// ── BANDIT PERSONALITY DATA ───────────────────────────
// Nguồn flavor text & tham số cho engine-combat.js dispatch table.
// Engine đọc personality từ banditObj.personality rồi tra bảng này.
var BANDIT_PERSONALITY = {
  scavenger: {
    label:'Kẻ Nhặt Xác',
    icon:'🎒',
    stealChance: 0.30,          // 30% steal khi trúng player
    // dialogue: hiển thị lúc gặp, khi steal, khi flee
    dialogue: {
      encounter: ['Đưa đồ đây!', 'Bỏ túi xuống — ngay!', 'Thứ đó tao cần hơn mày.'],
      steal:     ['Cái này của tao rồi!', 'Haha — cảm ơn đã "tặng"!', 'Tao cần cái này hơn.'],
      flee:      ['Lần sau nhé!', 'Đáng rồi... tạm thời thôi!'],
    },
  },
  ambusher: {
    label:'Kẻ Phục Kích',
    icon:'🥷',
    ambushHitBonus: 2,          // +2 hit bonus lượt đầu nếu chưa bị detect
    ambushDmgBonus: 1,          // +1 damage lượt đầu
    dialogue: {
      encounter: ['Đừng nhúc nhích!', 'Tao đã theo mày từ nãy.', 'Bước chân của mày quá ồn.'],
      ambush:    ['Bất ngờ chưa!', 'Mày không thấy tao à?', 'Quá chậm.'],
      flee:      ['Lần này tao nhường.', 'May mắn đấy.'],
    },
  },
  deserter: {
    label:'Lính Đào Ngũ',
    icon:'🏃',
    fleeThreshold: 0.50,        // bỏ chạy khi HP ≤ 50% maxHp (sớm hơn fleeHp mặc định)
    dropOnFlee: 0.50,           // bỏ lại 50% loot khi flee (làm tròn xuống)
    dialogue: {
      encounter: ['Tôi không muốn chiến đấu...', 'Chỉ cần đồ ăn thôi.', 'Đừng lại gần — tôi cảnh báo đấy!'],
      flee:      ['Thôi tôi đi đây!', 'Không đáng... không đáng chút nào.', 'Để lại cho anh — tôi đi!'],
    },
  },
  cannibal: {
    label:'Kẻ Ăn Thịt Người',
    icon:'🩸',
    dmgBonus: 2,                // +2 flat damage mỗi đòn trúng
    stressOnKill: 8,            // player stress +8 khi giết
    deathDrop: 'strange_meat',  // item đặc biệt rơi khi chết
    dialogue: {
      encounter: ['Trông mày ngon đấy...', 'Thịt tươi... lâu rồi không gặp.', '...mmm.'],
      attack:    ['Nếm thử xem nào!', 'Đừng chạy — lãng phí.'],
      flee:      ['Hẹn gặp lại... khi mày ngủ.'],
    },
  },
};

// Helper: roll personality từ BANDIT_DEFS[id].personalityWeights
// Trả về string personality. Gọi 1 lần khi spawn.
function DW_assignBanditPersonality(banditDefId) {
  const weights = BANDIT_DEFS[banditDefId]?.personalityWeights;
  if (!weights) return 'scavenger'; // fallback
  const total = weights.reduce((s,e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of weights) { r -= e.w; if (r <= 0) return e.p; }
  return weights[weights.length - 1].p;
}

// Loot bait cho rumor trap — hiển thị như mồi nhử
var BANDIT_BAIT_ITEMS = {
  military_crate:  {icon:'📦', name:'Thùng quân sự', desc:'Niêm phong còn nguyên.'},
  medicine_box:    {icon:'💊', name:'Hộp thuốc', desc:'Chữ thập đỏ trên nắp.'},
  ammo_cache:      {icon:'🔴', name:'Hộp đạn', desc:'Nặng, lắc nghe tiếng va chạm.'},
  food_stash:      {icon:'🍱', name:'Túi lương thực', desc:'Còn buộc dây cẩn thận.'},
  supply_box:      {icon:'🧰', name:'Hộp vật tư', desc:'Nhãn hiệu quân đội.'},
};

// ══════════════════════════════════════════════════════
// BASE SYSTEM — DATA LAYER
// Tất cả static data cho hệ thống Base (Single Mobile Base).
// Không chứa logic — engine-survival.js xử lý mechanics.
// ══════════════════════════════════════════════════════

// ── BASE MATERIALS (thêm vào ITEM_DB) ────────────────
// Các item mới phục vụ riêng cho việc xây và di chuyển base.
// Thêm trực tiếp vào ITEM_DB để hệ thống inventory nhận diện bình thường.
(function _registerBaseItems() {
  const baseItems = {
    // Vật liệu xây base cơ bản
    tarpaulin:{id:'tarpaulin',name:'Bạt nhựa',icon:'🏕️',weight:2.0,type:'material',tier:1,
      usable:false,tags:['base_mat','craft_mat'],
      desc:'Dựng mái che tạm. Nguyên liệu cơ bản xây base.'},

    // Đinh và thanh gỗ — xây dựng cơ bản
    nails_pack:{id:'nails_pack',name:'Đinh đóng gói',icon:'📌',weight:0.5,type:'material',tier:1,
      usable:false,tags:['base_mat','craft_mat'],
      desc:'Đóng ván gỗ. Cần để nâng cấp base L2+.'},
    plank:{id:'plank',name:'Tấm ván gỗ',icon:'🪵',weight:2.5,type:'material',tier:1,
      usable:false,tags:['base_mat','barricade_mat'],
      desc:'Ván gỗ chắc. Barricade và xây base.'},

    // Phụ kiện xe kéo — ghép lại thành cart
    cart_frame:{id:'cart_frame',name:'Khung xe đẩy',icon:'🛒',weight:5.0,type:'material',tier:2,
      usable:false,tags:['base_mat'],
      desc:'Khung kim loại từ siêu thị. Cần 1 bánh xe nữa để hoàn thiện.'},
    cart_wheel:{id:'cart_wheel',name:'Bánh xe',icon:'⚙️',weight:2.0,type:'material',tier:2,
      usable:false,tags:['base_mat'],
      desc:'Bánh xe cao su. Ghép với khung xe để làm xe kéo.'},

    // Xe kéo hoàn chỉnh — item đặc biệt, không drop bình thường.
    // carryBonus: +25 weight capacity khi state.hasCart === true.
    // Không stack, không equip, chỉ craft 1 lần (unique:true trong BASE_CRAFT_RECIPES).
    supply_cart:{id:'supply_cart',name:'Xe kéo vật tư',icon:'🛻',weight:8.0,type:'tool',tier:3,
      usable:false,equippable:false,tags:['base_tool','key_item'],
      carryBonus:25,  // +25 kg carry capacity khi hasCart = true
      desc:'Xe kéo tự chế. +25 kg sức chứa. Tăng salvage khi di chuyển base. Chỉ craft 1 lần.'},

    // Dầu đốt — cho cooking fire và generator
    cooking_oil:{id:'cooking_oil',name:'Dầu đốt',icon:'🫙',weight:0.8,type:'material',tier:1,
      usable:false,tags:['base_mat','craft_mat'],
      desc:'Nhiên liệu cho bếp nấu tại base. Cháy được 2 ngày/lọ.'},

    // Vải bố — cách âm và che chắn
    canvas_cloth:{id:'canvas_cloth',name:'Vải bố',icon:'🧵',weight:1.0,type:'material',tier:1,
      usable:false,tags:['base_mat','craft_mat'],
      desc:'Vải dày. Cách âm tốt — giảm noise khi craft trong base.'},

    // ── NHIÊN LIỆU NẤU ĂN ────────────────────────────────
    // Điểm 2 (cooking spam fix): mọi recipe nấu ăn đều tiêu 1 wood_fuel.
    // Có thể thu thập bằng cách dùng crowbar/axe lên cành cây hoặc đồ gỗ.
    // Drop thường từ park, rubble. Weight nhẹ để không punish quá nhiều.
    wood_fuel:{id:'wood_fuel',name:'Củi đốt',icon:'🪵',weight:0.5,type:'material',tier:0,
      usable:false,tags:['base_mat','fuel'],
      desc:'Củi nhỏ để đốt bếp. Cần cho mọi lần nấu ăn trong base.'},

    // ── VẬT LIỆU KIM LOẠI MID-TIER ───────────────────────
    // Điểm 5 (progression fix): metal_sheet là vật liệu tier-2 cần thiết
    // cho base L3 và L4. Drop từ factory, warehouse, police (hiếm).
    // Weight 3.0 — nặng nhưng vẫn mang được, đây là logistics challenge.
    metal_sheet:{id:'metal_sheet',name:'Tấm kim loại',icon:'🔩',weight:3.0,type:'material',tier:2,
      usable:false,tags:['base_mat','barricade_mat'],
      desc:'Tấm thép mỏng. Tăng cường base L3–L4. Nặng — cần xe kéo để vận chuyển nhiều.'},

    // Bêtông (Điểm 4) — phá vỡ concrete_block thành 4 concrete_piece để vận chuyển.
    // Override nếu key đã có: dùng force-set bên dưới thay vì skip.
    concrete_block:{id:'concrete_block',name:'Khối bêtông',icon:'🧱',weight:6.0,type:'material',tier:3,
      usable:false,tags:['base_mat'],
      desc:'Khối bêtông nguyên. Quá nặng để mang nhiều — dùng crowbar để phá thành 4 miếng.'},
    concrete_piece:{id:'concrete_piece',name:'Mảnh bêtông',icon:'🪨',weight:1.5,type:'material',tier:2,
      usable:false,tags:['base_mat'],
      desc:'Mảnh bêtông 1/4 khối. Vận chuyển được. 4 miếng = 1 khối nguyên khi xây L5.'},

    // Lưới ngụy trang — giảm 30% threat tích lũy/ngày, maxActive:1.
    camouflage_net:{id:'camouflage_net',name:'Lưới ngụy trang',icon:'🕸️',weight:1.5,type:'material',tier:2,
      usable:false,tags:['base_mat','base_tool'],
      maxActive:1,
      signatureReduce:0.30,
      desc:'Lưới che phủ base. Giảm 30% tốc độ tích lũy threat. Chỉ 1 cái có hiệu lực tại 1 lúc.'},
  };
  // Merge vào ITEM_DB chính.
  // Hầu hết items: skip nếu key đã có (không override loot items thông thường).
  // Force-override danh sách: concrete_block (update weight 5.0→6.0) + camouflage_net.
  const forceOverride = new Set(['concrete_block','camouflage_net']);
  for (const [k, v] of Object.entries(baseItems)) {
    if (!ITEM_DB[k] || forceOverride.has(k)) ITEM_DB[k] = v;
  }
})();

// ── BASE UPGRADE DEFINITIONS ──────────────────────────
// 5 levels. Mỗi level định nghĩa:
//   cost       — danh sách item ID cần để nâng cấp từ level trước
//   noisePerAction — noise BASE thêm vào mỗi action craft/repair trong base
//   threatPerDay   — điểm threat tích lũy mỗi ngày, độc lập với noise
//                    (đại diện cho "danh tiếng" base lan ra thế giới)
//   actions    — các hành động mở khóa tại level này
//   salvageRate— tỉ lệ vật liệu thu hồi khi pack base (0–1)
//   icon, name — hiển thị trên UI
//
// Design note: threat KHÔNG phải là damage — đó là xác suất event trigger.
// Engine-survival.js dùng baseThreat để roll event mỗi ngày.
// BASE_UPGRADE_DEFS v2 — progression rõ ràng theo survival sandbox chuẩn.
//
// Material progression: tarpaulin → wooden_plank → metal_sheet → concrete_piece
// Mỗi tier vật liệu tương ứng với một phase của game:
//   Early game  (ngày 1–5) : tarpaulin + rope  → L1
//   Mid game    (ngày 5–12): wooden plank       → L2, L3
//   Late game   (ngày 12+) : metal_sheet        → L4
//   End game    (ngày 20+) : concrete_piece      → L5
//
// upgradeTimeH: thời gian game tốn khi nâng cấp (tính bằng giờ, advance state.hour).
// noiseUpgrade: noise riêng khi BUILD (khác noisePerAction là noise mỗi action trong base).
// Xây dựng ồn hơn craft thường — tăng threat ngay lập tức.
var BASE_UPGRADE_DEFS = [
  // L0 — chưa có base
  { level:0, icon:'❌', name:'Không có base',
    cost:[], noisePerAction:0, noiseUpgrade:0, threatPerDay:0,
    upgradeTimeH:0, actions:[], salvageRate:0,
    desc:'Bạn chưa có nơi trú ẩn. Cần tile sạch zombie để xây base.',
  },

  // L1 — Trú ẩn tạm (Shelter)
  // Entry point thấp: 2 bạt + 2 dây thừng. Dễ tìm trong ngày đầu.
  // Chỉ cho ngủ — không có crafting. Đây là "cắm trại tối thiểu".
  // noiseUpgrade = 3: xây lều tạo noise đáng kể nhưng không nguy hiểm.
  { level:1, icon:'🏕️', name:'Trú ẩn tạm',
    cost:['tarpaulin','tarpaulin','rope_5m','rope_5m'],
    noisePerAction:1, noiseUpgrade:3, threatPerDay:1,
    upgradeTimeH:2, actions:['sleep','rest'],
    salvageRate:0.55,
    desc:'Bạt nhựa che mưa, dây buộc chắc. Ngủ an toàn hơn. Thế giới chưa chú ý bạn.',
  },

  // L2 — Trại gia cố (Fortified Camp)
  // Cần 4 ván gỗ + 2 bạt. Wooden plank là vật liệu mid-tier đầu tiên.
  // Mở khóa craft cơ bản + kho đồ. Đây là "base thật sự đầu tiên".
  // Khói bắt đầu tỏa — threat bắt đầu tích lũy rõ hơn.
  { level:2, icon:'🛖', name:'Trại gia cố',
    cost:['plank','plank','plank','plank','tarpaulin','tarpaulin'],
    noisePerAction:2, noiseUpgrade:4, threatPerDay:2,
    upgradeTimeH:2, actions:['sleep','rest','craft_basic','store'],
    salvageRate:0.50,
    desc:'Tường ván gỗ, mái bạt. Craft cơ bản không cần ĐHĐ. Khói bắt đầu tỏa ra xa.',
  },

  // L3 — Trạm nấu ăn (Cooking Station)
  // Cần 6 ván gỗ + 2 tấm kim loại. metal_sheet là vật liệu đầu tiên cần tìm kiếm có chủ đích.
  // Turning point: bếp lửa + metal tấm = signature tăng mạnh.
  // noiseUpgrade = 6: đóng đinh sắt vào tường — nghe xa hàng km.
  { level:3, icon:'🏠', name:'Trạm nấu ăn',
    cost:['plank','plank','plank','plank','plank','plank','metal_sheet','metal_sheet'],
    noisePerAction:3, noiseUpgrade:6, threatPerDay:4,
    upgradeTimeH:2, actions:['sleep','rest','craft_basic','craft_cooking','store'],
    salvageRate:0.40,
    desc:'Bếp lửa kim loại, tường ván dày. Nấu ăn được. Khói và tiếng búa có thể thấy từ xa.',
  },

  // L4 — Xưởng sửa chữa (Repair Bench)
  // Cần 4 tấm kim loại + 2 ván gỗ. Toàn metal — nặng, phải có kế hoạch logistics.
  // Mở repair_free: sửa trang bị không tốn AP — reward quan trọng cho late game.
  // threatPerDay = 8: tiếng máy hàn và búa sắt nghe rõ cả khu phố.
  { level:4, icon:'🏚️', name:'Xưởng sửa chữa',
    cost:['metal_sheet','metal_sheet','metal_sheet','metal_sheet','plank','plank'],
    noisePerAction:4, noiseUpgrade:8, threatPerDay:8,
    upgradeTimeH:2, actions:['sleep','rest','craft_basic','craft_cooking','craft_advanced','repair_free','store'],
    salvageRate:0.35,
    desc:'Bàn kim loại, dụng cụ hàn. Sửa đồ không cần ĐHĐ. Tiếng búa sắt vang xa.',
  },

  // L5 — Pháo đài tạm (Stronghold)
  // Cần 4 concrete_piece + 2 metal_sheet.
  // concrete_piece (1.5 kg x4 = 6.0 kg) buộc player phải logistics tốt.
  // Đây là level mà cả thế giới đều biết bạn ở đây — threatPerDay = 15.
  // salvageRate = 0.30: khó tháo gỡ bêtông — đây là sacrifice khi relocate.
  { level:5, icon:'🏰', name:'Pháo đài tạm',
    cost:['concrete_piece','concrete_piece','concrete_piece','concrete_piece','metal_sheet','metal_sheet'],
    noisePerAction:5, noiseUpgrade:10, threatPerDay:15,
    upgradeTimeH:2, actions:['sleep','rest','craft_basic','craft_cooking','craft_advanced','repair_free','store','fortify'],
    salvageRate:0.30,
    desc:'Tường bêtông, kim loại gia cố. Gần bất khả xâm phạm — nhưng cả thế giới đều biết bạn ở đây.',
  },
];

// ── BASE CRAFT RECIPES (chỉ available trong base) ─────
// Những recipe này chỉ unlock khi tile.base === true.
// apCost: 0 nghĩa là không tốn AP — nhưng tốn base_token (xử lý trong engine).
// baseLevel: level tối thiểu của base để craft recipe này.
// baseToken: số base token tiêu thụ.
//
// Design: base_token là resource riêng (6 tokens/ngày khi ở base),
// chống infinite crafting loop mà không cần AP gate.
// BASE_CRAFT_RECIPES v2 — Balance fixes áp dụng:
//   - Nấu ăn giờ cần wood_fuel (Điểm 2: chặn cooking spam)
//   - camouflage_net có maxActive:1 (Điểm 3: chặn stacking)
//   - supply_cart_craft dùng cart_parts + rope_10m (ingredients thực tế hơn)
//   - Thêm recipe salvage concrete_block → concrete_piece (Điểm 4: logistics)
var BASE_CRAFT_RECIPES = [
  // ── NẤU ĂN (mở từ L3) ────────────────────────────────
  // v2: cần 3 nguyên liệu (canned_food + rainwater + wood_fuel).
  // wood_fuel là resource có giới hạn — player phải đi tìm củi, không thể spam.
  // +1 noise riêng vì khói bếp — ngay cả soundproofing không giảm hết được tiếng bếp.
  // dailyLimit:3 — tối đa 3 lần nấu/ngày, đủ no nhưng không lạm dụng.
  {id:'cooked_meal', name:'Bữa ăn nấu chín', icon:'🍲',
    desc:'Cháo từ đồ hộp + nước mưa + củi đốt. Ngon hơn ăn sống — stress giảm thêm.',
    ingredients:['canned_food','rainwater','wood_fuel'],
    result:'military_ration',
    apCost:0, baseToken:1, baseLevel:3,
    skillReq:{},
    extraNoise:1,       // tiếng lửa bập bùng + mùi khói
    gameTimeCostH:0.5,  // 30 phút nấu — advance state.hour 0.5 khi craft
    dailyLimit:3,
    craftMsg:'🍲 Nấu xong. Mùi thức ăn ấm áp tỏa ra — lâu lắm rồi mới được ăn bữa ngon.'},

  {id:'boiled_water', name:'Nước đun sôi', icon:'♨️',
    desc:'Đun sôi nước mưa với chút củi. Sạch hơn và an toàn hơn uống thẳng.',
    ingredients:['rainwater','wood_fuel'],
    result:'water_bottle',
    apCost:0, baseToken:1, baseLevel:3,
    skillReq:{},
    extraNoise:1,
    gameTimeCostH:0.5,
    dailyLimit:3,
    craftMsg:'♨️ Nước đã sôi. Sạch hơn, an toàn hơn.'},

  // ── CRAFT NÂNG CAO (mở từ L4) ────────────────────────
  {id:'reinforced_barricade', name:'Barricade gia cố', icon:'🧱',
    desc:'Ván gỗ + đinh + lưới. Tăng barricade tile hiện tại +2 ngay.',
    ingredients:['plank','nails_pack','wire_mesh'],
    result:null,       // không tạo item — engine xử lý barricadeBonus
    apCost:0, baseToken:2, baseLevel:4,
    skillReq:{carpentry:2},
    isBarricadeBoost:true, barricadeBonus:2,
    craftMsg:'🧱 Barricade gia cố xong. Cảm giác chắc chắn hơn nhiều.'},

  {id:'base_medkit', name:'Bộ sơ cứu nâng cao', icon:'🏥',
    desc:'Phòng y tế tạm — hồi HP cao hơn medkit thường.',
    ingredients:['medkit','bandage','alcohol'],
    result:'iv_drip',
    apCost:0, baseToken:2, baseLevel:4,
    skillReq:{firstaid:2},
    craftMsg:'🏥 Chuẩn bị xong bộ y tế nâng cao.'},

  // ── XE KÉO (mở từ L2, chỉ craft 1 lần) ──────────────
  // v2: ingredients thực tế hơn — cart_parts + rope_10m + toolbox.
  // carryBonus +25 kg được engine-inventory.js đọc từ ITEM_DB.supply_cart.carryBonus.
  // 'unique:true' — engine kiểm tra state.hasCart trước khi cho craft.
  {id:'supply_cart_craft', name:'Lắp ráp xe kéo', icon:'🛻',
    desc:'Xe tự chế từ phụ tùng. +25 kg sức chứa và tăng salvage khi chuyển base.',
    ingredients:['cart_frame','cart_wheel','rope_10m','toolbox'],
    result:'supply_cart',
    apCost:0, baseToken:4, baseLevel:2,
    skillReq:{carpentry:2},
    unique:true,
    craftMsg:'🛻 Xe kéo hoàn chỉnh. +25 kg sức chứa. Chuyển base sẽ dễ hơn nhiều.'},

  // ── CÁCH ÂM (mở từ L3) ───────────────────────────────
  {id:'soundproofing', name:'Cách âm tạm thời', icon:'🔇',
    desc:'Treo vải bố quanh base — giảm 1 noise mỗi lần craft trong 3 ngày.',
    ingredients:['canvas_cloth','canvas_cloth','rope_5m'],
    result:null,
    apCost:0, baseToken:2, baseLevel:3,
    skillReq:{carpentry:1},
    isSoundproofing:true, soundproofDays:3,
    craftMsg:'🔇 Vải bố che phủ xung quanh. Tiếng động bên trong giảm hẳn.'},

  // ── LƯỚI NGỤY TRANG (mở từ L2) ───────────────────────
  // Điểm 3 fix: maxActive:1 được lưu vào state.base.activeNets.
  // Nếu activeNets >= 1 → engine từ chối craft thêm với msg rõ ràng.
  // Tại sao maxActive:1 hợp lý: trong thực tế, 2 lưới cùng lúc không giúp
  // giảm signature hơn vì zombie/bandit nhìn vào tổng thể, không phải chi tiết.
  {id:'camouflage_net', name:'Lưới ngụy trang', icon:'🕸️',
    desc:'Lưới + lá cây che phủ base. Giảm 30% threat tích lũy/ngày. Chỉ 1 cái có hiệu lực.',
    ingredients:['wire_mesh','leaf','leaf','rope_5m'],
    result:null,
    apCost:0, baseToken:3, baseLevel:2,
    skillReq:{sneak:1},
    isCamouflage:true,   // flag đặc biệt — engine kiểm tra state.base.activeNets
    maxActive:1,         // không cho craft thêm khi activeNets >= 1
    craftMsg:'🕸️ Lưới ngụy trang che phủ. Base khó nhận ra hơn từ xa.'},

  // ── SALVAGE BÊTÔNG (không cần base level) ────────────
  // Điểm 4 fix: player dùng crowbar để phá concrete_block thành 4 concrete_piece.
  // Đây là "recipe di động" — thực ra là craft action tại base, nhưng conceptually
  // player có thể làm ngoài base cũng được (baseLevel:0 để không bị gate).
  // apCost:0 vì đây là tận dụng base workshop — ngoài base sẽ tốn AP (engine-inventory.js).
  {id:'salvage_concrete', name:'Phá bêtông', icon:'🪨',
    desc:'Dùng búa/crowbar phá concrete_block thành 4 mảnh nhỏ để vận chuyển.',
    ingredients:['concrete_block','crowbar'],
    result:'concrete_piece', resultCount:4,  // trả lại crowbar + 4 concrete_piece
    returnIngredient:'crowbar',              // crowbar không tiêu thụ — chỉ dùng như tool
    apCost:0, baseToken:1, baseLevel:0,
    skillReq:{},
    craftMsg:'🪨 Bêtông đã được phá thành 4 mảnh. Giờ có thể vận chuyển được rồi.'},
];

// ── BASE EVENT POOL ───────────────────────────────────
// Narrative events xảy ra khi baseThreat vượt threshold.
// engine-ai.js đọc text để kể chuyện — engine-survival.js quyết định trigger.
//
// type: 'warning' | 'scout' | 'refugee' | 'bandit_raid' | 'horde'
//   warning   — chỉ flavor text, không có hậu quả ngay. Tạo dread.
//   scout     — tín hiệu bandit đến gần. Player có 1–2 ngày để chuẩn bị.
//   refugee   — NPC xin vào base. Có choice. Không có combat ngay.
//   bandit_raid — combat event. Bandit tấn công base trực tiếp.
//   horde     — zombie horde migration. Nguy hiểm nhất.
//
// triggerLevel: base level tối thiểu để event này có thể xảy ra
// threatCost:   threat points tiêu thụ khi trigger (reset một phần đồng hồ)
var BASE_EVENTS = [

  // ── CẢNH BÁO (warning) ────────────────────────────────
  // Những event này chỉ là text, không có hậu quả gameplay.
  // Mục đích: xây dựng tension trước khi sự kiện thật xảy ra.
  {id:'be_smoke_seen', type:'warning', triggerLevel:3, threatCost:3,
    icon:'🌫️',
    title:'Khói tỏa',
    text:'Từ xa nhìn vào, khói từ bếp của bạn vươn lên bầu trời xám. Ai đó có thể thấy.',
    choices:null},   // không có choice — chỉ là notification

  {id:'be_noise_echo', type:'warning', triggerLevel:2, threatCost:2,
    icon:'👂',
    title:'Tiếng vang',
    text:'Bạn dừng tay — tiếng búa của mình vang vọng xa hơn bạn nghĩ. Ngoài kia im lặng lạ thường.',
    choices:null},

  {id:'be_tracks_found', type:'warning', triggerLevel:1, threatCost:2,
    icon:'👣',
    title:'Dấu chân',
    text:'Buổi sáng. Bạn thấy dấu chân mới ngay bên ngoài base. Không phải của bạn.',
    choices:null},

  {id:'be_distant_shout', type:'warning', triggerLevel:2, threatCost:3,
    icon:'📢',
    title:'Tiếng hét xa',
    text:'Đêm thứ hai trong base. Từ xa có tiếng hét — rồi im lặng. Bạn không ngủ được.',
    choices:null},

  // ── THÁM THÍNH (scout) ────────────────────────────────
  // Báo hiệu bandit đang track base. Player có thời gian phản ứng.
  {id:'be_bandit_scout_1', type:'scout', triggerLevel:2, threatCost:5,
    icon:'🗡️',
    title:'Bóng người lạ',
    text:'Đêm qua bạn thấy bóng ai đó lảng vảng cách base khoảng 50m rồi biến mất vào bóng tối. Họ đang quan sát.',
    choices:null,   // engine tự schedule bandit_raid sau 1–2 ngày
    scheduledEvent:'bandit_raid', scheduleDays:2},

  {id:'be_bandit_scout_2', type:'scout', triggerLevel:3, threatCost:6,
    icon:'🔭',
    title:'Có người theo dõi',
    text:'Bạn tìm thấy vết thuốc lá còn ấm và chai nhựa rỗng cách base 30m. Ai đó đã ngồi đây quan sát rất lâu.',
    choices:null,
    scheduledEvent:'bandit_raid', scheduleDays:1},

  // ── NGƯỜI TỊ NẠN (refugee) ────────────────────────────
  // Player có choice. Thiết kế: không có "đúng/sai" rõ ràng.
  // Accept → NPC có thể giúp đỡ hoặc phản bội (roll ngẫu nhiên).
  // Reject → stress penalty nhưng không có rủi ro.
  {id:'be_refugee_1', type:'refugee', triggerLevel:1, threatCost:4,
    icon:'👤',
    title:'Người gõ cửa',
    text:'Giữa đêm. Tiếng gõ cửa nhẹ — không phải zombie. Một giọng người: "Tôi không có vũ khí. Chỉ cần một chỗ ngủ thôi."',
    choices:[
      {id:'accept', label:'🚪 Cho vào',
       desc:'Chia sẻ đồ ăn, mất 1 ngày lương thực. Có thể nhận được thông tin hoặc bị phản bội.',
       outcomes:[
         {w:50, result:'helpful',   msg:'Người lạ chia sẻ thông tin về một kho đồ gần đây. Stress -10.'},
         {w:30, result:'neutral',   msg:'Họ ngủ một giấc, sáng dậy cảm ơn rồi đi. Không có gì thêm.'},
         {w:20, result:'betrayal',  msg:'Sáng ra bạn thấy thiếu một số đồ trong kho. Họ đã đi từ lúc nửa đêm.'},
       ]},
      {id:'reject', label:'🚫 Đuổi đi',
       desc:'An toàn hơn — nhưng Stress +8.',
       outcomes:[
         {w:100, result:'safe', msg:'Bạn đuổi họ đi. Tâm trí không yên. Stress +8.'},
       ]},
    ]},

  {id:'be_refugee_2', type:'refugee', triggerLevel:2, threatCost:5,
    icon:'👨‍👩‍👦',
    title:'Gia đình',
    text:'Một phụ nữ và đứa trẻ nhỏ. Bà ấy không xin — chỉ đứng đó, mắt nhìn vào base của bạn. Đứa trẻ im lặng theo kiểu đã quen với im lặng.',
    choices:[
      {id:'accept', label:'🏠 Nhận vào',
       desc:'Tốn 2 ngày lương thực. Stress giảm nhưng thêm "người để bảo vệ" — rủi ro khi bị raid.',
       outcomes:[
         {w:60, result:'helpful',  msg:'Người mẹ biết nghề y. HP +2 mỗi ngày bà ở đây. Stress -15.'},
         {w:40, result:'burden',   msg:'Thêm miệng ăn. Hunger decay +20% khi họ ở cùng.'},
       ]},
      {id:'reject', label:'❌ Từ chối',
       desc:'Stress +15. Depression +5.',
       outcomes:[
         {w:100, result:'guilt', msg:'Bạn quay vào, đóng cửa lại. Tiếng bước chân nhỏ dần trong đêm. Stress +15, Trầm cảm +5.'},
       ]},
    ]},

  // ── BANDIT RAID ───────────────────────────────────────
  // Combat event trực tiếp tại base.
  // Engine không spawn bandit vào tile ngay — thay vào đó set state.baseUnderRaid = true,
  // UI hiển thị event, player chọn: defend / flee / negotiate.
  {id:'be_bandit_raid_1', type:'bandit_raid', triggerLevel:2, threatCost:8,
    icon:'⚔️',
    title:'Cướp đột kích',
    text:'Lúc 3 giờ sáng — tiếng kính vỡ. Ít nhất 2 người đang cố phá barricade. Bạn có vài giây để phản ứng.',
    choices:[
      {id:'defend',    label:'⚔️ Chiến đấu', desc:'Tiêu diệt chúng. Nguy hiểm nhưng giữ được đồ.'},
      {id:'flee',      label:'🏃 Bỏ chạy',   desc:'Mất một số đồ trong kho. AP tốn 3 để thoát.'},
      {id:'negotiate', label:'🗣️ Thương lượng',desc:'Mất 20–30% loot. Không có combat.'},
    ],
    banditsSpawned:['bandit_scout','bandit_raider']},   // engine spawn khi defend

  {id:'be_bandit_raid_2', type:'bandit_raid', triggerLevel:4, threatCost:12,
    icon:'💀',
    title:'Trùm cướp xuất hiện',
    text:'Không phải tên thường. Từ bên ngoài vang lên: "Chúng tao đã theo dõi anh ba ngày. Đưa đây mọi thứ hoặc chúng tao đốt cả chỗ này."',
    choices:[
      {id:'defend',    label:'⚔️ Tử chiến',   desc:'Combat với bandit_heavy + bandit_leader. Nguy hiểm cực cao.'},
      {id:'flee',      label:'🏃 Tháo chạy',   desc:'Mất 50% kho. Base level reset về L1.'},
      {id:'negotiate', label:'🤝 Đàm phán',    desc:'Mất 40% kho. Giữ được base. Stress +20.'},
    ],
    banditsSpawned:['bandit_heavy','bandit_leader']},

  // ── ZOMBIE HORDE ──────────────────────────────────────
  // Nguy hiểm nhất. Không thể "negotiate" với zombie.
  // Player chỉ có 2 lựa chọn: defend hoặc flee.
  {id:'be_horde_1', type:'horde', triggerLevel:3, threatCost:10,
    icon:'🧟',
    title:'Bầy zombie tiến đến',
    text:'Từ xa, âm thanh quen thuộc nhưng nhân lên gấp bội — không phải vài con. Một bầy. Chúng đang đi về phía base.',
    choices:[
      {id:'defend', label:'🧱 Cố thủ',     desc:'Barricade phải ≥ 3. Mỗi zombie giết tốn 1 AP. Có thể bị thương.'},
      {id:'flee',   label:'🏃 Bỏ chạy',    desc:'Mất toàn bộ base. Salvage 20% vật liệu nếu có xe kéo.'},
    ],
    hordeSize:5},   // số zombie spawn khi defend

  {id:'be_horde_2', type:'horde', triggerLevel:5, threatCost:15,
    icon:'🌊',
    title:'Làn sóng zombie',
    text:'Đêm thứ năm. Bạn nghe tiếng ầm ầm trước khi thấy chúng — hàng trăm. Không có cách nào giữ được nơi này.',
    choices:[
      {id:'flee', label:'🏃 Bỏ chạy ngay', desc:'Lựa chọn duy nhất. Mất base. Salvage tùy xe kéo.'},
    ],
    hordeSize:15, forceFlee:true},   // forceFlee: không thể defend
];

// ── BASE THREAT THRESHOLDS ────────────────────────────
// Mỗi ngày, engine tích lũy threat từ BASE_UPGRADE_DEFS[level].threatPerDay.
// Khi threat vượt threshold, engine roll một event từ BASE_EVENTS theo type.
//
// Thresholds được thiết kế để:
//   - warning events xảy ra sớm (threshold thấp) → tạo dread
//   - raid/horde events cần threat cao hơn → player có thời gian chuẩn bị
//   - cùng một threshold có thể roll nhiều loại event — weights quyết định loại nào
var BASE_THREAT_THRESHOLDS = [
  // {threshold, eventTypes, weights}
  // threshold thấp → warning events, không nguy hiểm ngay
  {threshold:5,  eventTypes:['warning'],              weights:[1]},
  {threshold:10, eventTypes:['warning','scout'],      weights:[0.6, 0.4]},
  {threshold:18, eventTypes:['scout','refugee'],      weights:[0.5, 0.5]},
  {threshold:28, eventTypes:['refugee','bandit_raid'],weights:[0.4, 0.6]},
  {threshold:40, eventTypes:['bandit_raid','horde'],  weights:[0.6, 0.4]},
  {threshold:60, eventTypes:['horde'],                weights:[1]},
];

// ── BASE DAILY TOKEN ──────────────────────────────────
// Số base_token player nhận mỗi ngày khi ở trong base.
// Mỗi BASE_CRAFT_RECIPES tiêu thụ baseToken.
// Tách biệt với AP — đây là "capacity giới hạn hoạt động mỗi ngày" trong base.
// Giá trị 6 = đủ để craft 3–4 item thông thường, không đủ để spam.
var BASE_DAILY_TOKENS = 6;

// ── BASE STORAGE CAP ──────────────────────────────────
// Weight limit cho kho base. Ngăn infinite warehouse exploit.
// Player phải đưa ra quyết định "giữ gì, bỏ gì" — đây là tension cốt lõi.
// 60 units = khoảng 30–40 item thông thường — đủ để tích trữ nhưng không vô hạn.
var BASE_STORAGE_CAP = 60; // weight units