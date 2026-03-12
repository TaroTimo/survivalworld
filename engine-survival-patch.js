// ══════════════════════════════════════════════════════
// engine-survival-patch.js  v2
// Runtime helpers còn thiếu: DW_trackMilestoneCounter,
// DW_checkMilestone.
// Dùng guard "if undefined" để không override nếu engine
// đã định nghĩa rồi.
// ══════════════════════════════════════════════════════

// ── DW_trackMilestoneCounter ──────────────────────────
// Tăng milestone counter trong state.milestoneCounters.
// Pure function: (state, key, delta) → newState
if (typeof DW_trackMilestoneCounter === 'undefined') {
  window.DW_trackMilestoneCounter = function(state, key, delta) {
    if (!key || !delta) return state;
    const counters = state.milestoneCounters || {};
    return {
      ...state,
      milestoneCounters: { ...counters, [key]: (counters[key] || 0) + delta },
    };
  };
}

// ── DW_checkMilestone ─────────────────────────────────
// Kiểm tra điều kiện milestone và unlock nếu đủ.
// Pure function: (state, milestoneId) → newState
if (typeof DW_checkMilestone === 'undefined') {
  window.DW_checkMilestone = function(state, milestoneId) {
    if (typeof MILESTONE_DEFS === 'undefined') return state;
    const def = MILESTONE_DEFS[milestoneId];
    if (!def) return state;
    const milestones = state.milestones || {};
    if (milestones[milestoneId]) return state;
    const met = def.check ? def.check(state) : false;
    if (!met) return state;
    const s = { ...state, milestones: { ...milestones, [milestoneId]: true } };
    return { ...s, log: [`🏅 Milestone: ${def.name||milestoneId}`, ...(s.log||[])] };
  };
}

console.log('[DW] engine-survival-patch v2 loaded.');
