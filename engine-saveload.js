// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-saveload.js
// Save, load, delete save, legacy save migration
// + lastSavedMs: timestamp lúc save để tính offline hours
// v3.1: Rarity migration — thêm itemRarity[] và equipRarity{} nếu thiếu
// Dependencies: deadworld-data.js (DW_SAVE_KEY, ITEM_DB)
// ══════════════════════════════════════════════════════

// ── SAVE / LOAD ───────────────────────────────────────
function DW_save(state) {
  try {
    const toSave = { ...state, lastSavedMs: Date.now() };
    localStorage.setItem(DW_SAVE_KEY, JSON.stringify(toSave));
    return true;
  }
  catch(e) { return false; }
}

// DW_load — trả về { state, offlineHours } hoặc null nếu không có save
// offlineHours > 1 → UI nên gọi DW_buildOfflineReportPrompt() để hiện báo cáo
function DW_load() {
  try {
    const raw = localStorage.getItem(DW_SAVE_KEY);
    if (!raw) return null;
    let state = JSON.parse(raw);

    const savedMs      = state.lastSavedMs || Date.now();
    const offlineHours = (Date.now() - savedMs) / 3_600_000;

    if (!state.version || state.version < 3) {
      const { ids, failed } = DW_migrateLegacyInventory(state.inventory || []);
      state.inventory = ids;
      state.version   = 3;
      if (failed.length) {
        state.log = [`[Migration] ${failed.length} item không nhận dạng được đã bị xóa.`, ...(state.log||[])];
      }
      if (state.equip) {
        for (const [slot, val] of Object.entries(state.equip)) {
          if (val && !ITEM_DB[val]) {
            state.equip[slot] = DW_legacyToId(val) || null;
          }
        }
      }
    }

    // ── Rarity migration (v3.1) ────────────────────────
    // Áp dụng cho mọi save chưa có itemRarity, bất kể version.
    // An toàn: chỉ thêm field còn thiếu, không bao giờ xóa dữ liệu.
    if (!state.itemRarity) {
      // Pad itemRarity với 'common' cho tất cả item trong inventory
      state.itemRarity = (state.inventory || []).map(() => 'common');
      state.log = ['[v3.1] Hệ thống Rarity đã được kích hoạt. Tất cả item cũ = Thường.', ...(state.log||[])];
    }
    // Đảm bảo độ dài đồng bộ (phòng ngừa partial migration)
    if (state.itemRarity.length !== (state.inventory || []).length) {
      const inv = state.inventory || [];
      state.itemRarity = inv.map((_, i) => state.itemRarity[i] || 'common');
    }
    // equipRarity — mặc định tất cả equipped item hiện tại là 'common'
    if (!state.equipRarity) {
      state.equipRarity = {};
      if (state.equip) {
        for (const [slot, itemId] of Object.entries(state.equip)) {
          if (itemId) state.equipRarity[slot] = 'common';
        }
      }
    }
    // ── End rarity migration ───────────────────────────

    return { state, offlineHours };
  } catch(e) { return null; }
}

function DW_deleteSave() {
  localStorage.removeItem(DW_SAVE_KEY);
}
