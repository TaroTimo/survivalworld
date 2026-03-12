// ══════════════════════════════════════════════════════
// DEAD WORLD — deadworld-zone-ui.js
// Zone Travel UI v1 — 3-panel command layout
//
// Thay thế giao diện di chuyển ô-by-ô bằng:
// - Zone map panel (visual, zone-based)
// - Status panel (kể chuyện thông qua bars)
// - Action command bar (AP cost hiển thị rõ ràng)
//
// Load AFTER deadworld-shim.js (cuối cùng)
// ══════════════════════════════════════════════════════

// ── CONSTANTS ─────────────────────────────────────────
var ZUI_VERSION = '1.0';

// ── CSS INJECTION ──────────────────────────────────────
(function ZUI_injectStyles() {
  const style = document.createElement('style');
  style.id = 'zui-styles';
  style.textContent = `

/* ═══════════════════════════════════════════════
   ZONE TRAVEL UI — BASE LAYOUT
   3-panel: [zone map | status] [action bar]
   ═══════════════════════════════════════════════ */

#zui-container {
  position: fixed;
  inset: 0;
  display: none;
  flex-direction: column;
  background: #080808;
  z-index: 900;
  font-family: 'Rajdhani', sans-serif;
  overflow: hidden;
}
#zui-container.active { display: flex; }

/* ── TOP BAR ─────────────────────────────────── */
#zui-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  height: 52px;
  background: #0a0a0a;
  border-bottom: 1px solid #1a1a1a;
  position: relative;
  overflow: hidden;
}
#zui-topbar::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 3px,
    rgba(0,0,0,.06) 3px, rgba(0,0,0,.06) 4px
  );
}

/* HP block */
.zui-stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 14px;
  border-right: 1px solid #1a1a1a;
  min-width: 58px;
  flex-shrink: 0;
}
.zui-stat-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 26px;
  line-height: 1;
  letter-spacing: 1px;
}
.zui-stat-lbl {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  letter-spacing: 2px;
  color: #444;
  text-transform: uppercase;
  margin-top: 1px;
}
.zui-stat-block.ok   .zui-stat-val { color: #5DD462; }
.zui-stat-block.warn .zui-stat-val { color: #F0C000; }
.zui-stat-block.crit .zui-stat-val { color: #D44030; animation: zpulse .6s infinite; }

/* AP mega block */
#zui-ap-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 5px 14px;
  border-right: 1px solid #1a1a1a;
  min-width: 140px;
  flex-shrink: 0;
  gap: 3px;
}
.zui-ap-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.zui-ap-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: #444;
  letter-spacing: 1px;
  flex-shrink: 0;
  width: 24px;
}
.zui-ap-count {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 20px;
  color: #F0C000;
  line-height: 1;
  flex-shrink: 0;
  min-width: 36px;
}
.zui-ap-track {
  flex: 1;
  height: 6px;
  background: #111;
  border: 1px solid #1e1e1e;
  border-radius: 2px;
  overflow: hidden;
}
.zui-ap-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #8B1A1A 0%, #F0C000 60%, #FFE066 100%);
  transition: width .4s ease;
}
.zui-ap-regen {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  color: #333;
  text-align: right;
}
.zui-ap-regen.ready { color: #5DD462; animation: zpulse .8s infinite; }

/* Needs blocks */
.zui-need-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-right: 1px solid #1a1a1a;
  gap: 2px;
  min-width: 52px;
  flex-shrink: 0;
}
.zui-need-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 20px;
  line-height: 1;
}
.zui-need-lbl {
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  color: #444;
}
.zui-need-bar {
  width: 32px;
  height: 4px;
  background: #111;
  border: 1px solid #1a1a1a;
  border-radius: 2px;
  overflow: hidden;
}
.zui-need-fill { height: 100%; border-radius: 2px; transition: width .3s; }
.zui-need-fill.ok   { background: #5DD462; }
.zui-need-fill.warn { background: #F0C000; }
.zui-need-fill.crit { background: #D44030; animation: zpulse .7s infinite; }
.zui-need-block.ok   .zui-need-val { color: #5DD462; }
.zui-need-block.warn .zui-need-val { color: #F0C000; }
.zui-need-block.crit .zui-need-val { color: #D44030; }

/* Time block */
#zui-time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-right: 1px solid #1a1a1a;
  min-width: 80px;
  flex-shrink: 0;
}
.zui-time-day {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 14px;
  color: #444;
  letter-spacing: 1px;
  line-height: 1;
}
.zui-time-hour {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  color: #F0C000;
  line-height: 1;
  letter-spacing: 2px;
}
.zui-time-night { color: #5CD0FF; }

/* Location block — stretches to fill */
#zui-location-block {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 14px;
  overflow: hidden;
  min-width: 0;
}
.zui-location-zone {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  color: #333;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.zui-location-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px;
  color: #BDB8AE;
  letter-spacing: 1px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.zui-location-threat {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  margin-top: 2px;
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Collapse toggle */
#zui-toggle-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  border-left: 1px solid #1a1a1a;
  color: #333;
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  padding: 0 12px;
  cursor: pointer;
  transition: color .15s;
  -webkit-appearance: none;
}
#zui-toggle-btn:hover { color: #F0C000; }

/* ── MAIN BODY ───────────────────────────────── */
#zui-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ── LEFT: ZONE MAP ──────────────────────────── */
#zui-zone-panel {
  flex: 3;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #080808;
  border-right: 1px solid #141414;
  min-width: 0;
}

#zui-zone-compass {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 4px;
  padding: 10px;
}

/* Zone cells */
.zui-zone-cell {
  background: #0d0d0d;
  border: 1px solid #1c1c1c;
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  position: relative;
  overflow: hidden;
  transition: border-color .15s, background .15s, transform .12s;
}
.zui-zone-cell.clickable {
  cursor: pointer;
}
.zui-zone-cell.clickable:hover {
  border-color: #3a3a3a;
  background: #111;
  transform: scale(1.015);
}
.zui-zone-cell.zui-you {
  background: rgba(122,21,21,.2);
  border-color: #7A1515 !important;
  cursor: default;
}
.zui-zone-cell.zui-corner {
  background: transparent;
  border: 1px solid #0d0d0d;
}
.zui-zone-cell.cant-afford {
  opacity: .3;
  pointer-events: none;
}
.zui-zone-cell.unknown {
  border-style: dashed;
  border-color: #181818;
}

/* Threat color left border */
.zui-zone-cell.threat-clear   { border-left: 3px solid #2a4a2a; }
.zui-zone-cell.threat-low     { border-left: 3px solid #4a4a1a; }
.zui-zone-cell.threat-medium  { border-left: 3px solid #5a3010; }
.zui-zone-cell.threat-high    { border-left: 3px solid #7a1515; }
.zui-zone-cell.threat-extreme { border-left: 3px solid #D44030; animation: zpulse 1s infinite; }
.zui-zone-cell.clickable.threat-clear:hover   { border-left-color: #5DD462; }
.zui-zone-cell.clickable.threat-low:hover     { border-left-color: #F0C000; }
.zui-zone-cell.clickable.threat-medium:hover  { border-left-color: #FF8C00; }
.zui-zone-cell.clickable.threat-high:hover    { border-left-color: #D44030; }

/* Zone cell content */
.zzc-icon { font-size: 22px; line-height: 1; margin-bottom: 4px; }
.zzc-name {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  color: #888;
  letter-spacing: .5px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.zzc-name.unknown { color: #2a2a2a; }
.zzc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 4px;
}
.zzc-tag {
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  padding: 1px 4px;
  line-height: 1.4;
  border-radius: 1px;
}
.zzc-tag.zombie { background: rgba(192,57,43,.25); color: #D44030; }
.zzc-tag.loot   { background: rgba(240,192,0,.12); color: #F0C000; }
.zzc-tag.boss   { background: rgba(220,50,50,.3); color: #FF4444; font-weight: bold; }
.zzc-tag.base   { background: rgba(92,208,255,.12); color: #5CD0FF; }
.zzc-tag.safe   { background: rgba(93,212,98,.08); color: #5DD462; }

/* AP cost badge — bottom right */
.zzc-ap-cost {
  position: absolute;
  bottom: 5px;
  right: 6px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 14px;
  color: #333;
  line-height: 1;
  transition: color .15s;
}
.zui-zone-cell.clickable:hover .zzc-ap-cost { color: #F0C000; }

/* Direction arrow */
.zzc-dir-arrow {
  position: absolute;
  top: 6px;
  right: 7px;
  font-size: 14px;
  color: #1e1e1e;
  transition: color .15s;
}
.zui-zone-cell.clickable:hover .zzc-dir-arrow { color: #666; }

/* YOU cell content */
.zzc-you-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #D44030;
  box-shadow: 0 0 8px #D44030;
  animation: zpulse .7s infinite;
  margin-bottom: 4px;
}
.zzc-you-label {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 16px;
  color: #D44030;
  letter-spacing: 2px;
}
.zzc-you-coords {
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  color: #444;
  margin-top: 2px;
}
.zzc-you-explored {
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  color: #333;
}

/* Fog overlay on unknown zones */
.zzc-fog {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    45deg, transparent, transparent 3px,
    rgba(0,0,0,.25) 3px, rgba(0,0,0,.25) 4px
  );
  pointer-events: none;
}

/* ── RIGHT: STATUS PANEL ─────────────────────── */
#zui-status-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #090909;
  scrollbar-width: none;
}
#zui-status-panel::-webkit-scrollbar { display: none; }

/* Status section */
.zui-sec {
  padding: 10px 12px 8px;
  border-bottom: 1px solid #121212;
}
.zui-sec-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  letter-spacing: 2px;
  color: #2a2a2a;
  text-transform: uppercase;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.zui-sec-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #1a1a1a;
}

/* Threat radar */
#zui-threat-radar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.zui-threat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.zui-threat-icon { font-size: 16px; width: 20px; flex-shrink: 0; }
.zui-threat-label {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 14px;
  flex: 1;
  color: #CEC9C0;
}
.zui-threat-count {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px;
  line-height: 1;
}
.zui-threat-count.danger { color: #D44030; }
.zui-threat-count.warn   { color: #F0C000; }
.zui-threat-count.ok     { color: #5DD462; }

.zui-threat-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.zui-threat-bar-track {
  flex: 1;
  height: 3px;
  background: #111;
  border-radius: 2px;
  overflow: hidden;
}
.zui-threat-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .4s;
}

/* Shelter block */
#zui-shelter-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #0c0c0c;
  border: 1px solid #171717;
}
.zui-shelter-icon { font-size: 22px; }
.zui-shelter-info { flex: 1; }
.zui-shelter-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 16px;
  color: #BDB8AE;
  letter-spacing: 1px;
}
.zui-shelter-meta {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  color: #444;
  margin-top: 1px;
}
.zui-shelter-level {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  color: #F0C000;
  letter-spacing: 1px;
}

/* Status chips */
#zui-status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.zui-chip {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  padding: 3px 8px;
  border: 1px solid;
  letter-spacing: .5px;
}
.zui-chip.bad    { color: #D44030; border-color: rgba(212,64,48,.3); background: rgba(212,64,48,.08); }
.zui-chip.warn   { color: #F0C000; border-color: rgba(240,192,0,.3);  background: rgba(240,192,0,.06); }
.zui-chip.good   { color: #5DD462; border-color: rgba(93,212,98,.3);  background: rgba(93,212,98,.06); }
.zui-chip.info   { color: #5CD0FF; border-color: rgba(92,208,255,.2); background: rgba(92,208,255,.05); }

/* Log stream */
#zui-log-stream {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 150px;
  overflow-y: auto;
  scrollbar-width: none;
}
#zui-log-stream::-webkit-scrollbar { display: none; }
.zui-log-entry {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: #555;
  line-height: 1.5;
  padding: 1px 0;
  border-bottom: 1px solid #111;
}
.zui-log-entry:first-child { color: #999; }
.zui-log-entry:nth-child(2) { color: #777; }

/* ── BOTTOM: ACTION COMMAND BAR ──────────────── */
#zui-action-bar {
  flex-shrink: 0;
  background: #0a0a0a;
  border-top: 2px solid #1a1a1a;
  display: flex;
  flex-direction: column;
  padding: 0;
}

/* Action category row */
#zui-action-tabs {
  display: flex;
  border-bottom: 1px solid #141414;
}
.zui-action-tab {
  flex: 1;
  background: none;
  border: none;
  border-right: 1px solid #141414;
  color: #333;
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  padding: 6px 4px;
  cursor: pointer;
  transition: color .12s, background .12s;
  -webkit-appearance: none;
  text-transform: uppercase;
}
.zui-action-tab:last-child { border-right: none; }
.zui-action-tab:hover { color: #888; background: #0d0d0d; }
.zui-action-tab.active { color: #F0C000; background: #0f0d00; }

/* Action buttons grid */
#zui-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
}

.zui-action-btn {
  background: #0d0d0d;
  border: 1px solid #1e1e1e;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 6px 8px;
  cursor: pointer;
  transition: border-color .12s, background .12s, color .12s, transform .1s;
  -webkit-appearance: none;
  position: relative;
  min-height: 64px;
  gap: 3px;
}
.zui-action-btn:hover:not(:disabled) {
  border-color: #3a3a3a;
  background: #121212;
  color: #CEC9C0;
  transform: translateY(-1px);
}
.zui-action-btn:disabled {
  opacity: .2;
  cursor: not-allowed;
}
.zui-action-btn.primary {
  border-color: #2a2400;
  color: #F0C000;
}
.zui-action-btn.primary:hover:not(:disabled) {
  border-color: #F0C000;
  background: #0d0b00;
}
.zui-action-btn.danger { border-color: #2a0d0d; }
.zui-action-btn.danger:hover:not(:disabled) {
  border-color: #D44030;
  color: #D44030;
}

/* Button content */
.zab-icon { font-size: 20px; line-height: 1; }
.zab-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  line-height: 1;
  text-align: center;
}
.zab-cost {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 13px;
  color: #444;
  line-height: 1;
  transition: color .12s;
}
.zui-action-btn:hover:not(:disabled) .zab-cost { color: #F0C000; }
.zui-action-btn.primary .zab-cost { color: #F0C000; opacity: .7; }
.zab-cost.unaffordable { color: #D44030 !important; }

/* "Why disabled" tooltip hint */
.zab-reason {
  position: absolute;
  bottom: 2px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 7px;
  color: #D44030;
  letter-spacing: .3px;
  text-align: center;
  width: 100%;
  padding: 0 4px;
  line-height: 1;
}

/* AP cost warning flash on hover */
.zui-action-btn:hover:not(:disabled)::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(240,192,0,.02);
  pointer-events: none;
}

/* ── NOTIFICATIONS ───────────────────────────── */
#zui-notif-container {
  position: fixed;
  top: 70px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
  pointer-events: none;
  max-width: 260px;
}
.zui-notif {
  background: #111;
  border: 1px solid #2a2a2a;
  border-left: 3px solid #444;
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: #888;
  padding: 8px 12px;
  animation: zuiSlideIn .25s ease;
  pointer-events: none;
}
.zui-notif.success { border-left-color: #5DD462; color: #5DD462; background: rgba(93,212,98,.05); }
.zui-notif.danger  { border-left-color: #D44030; color: #D44030; background: rgba(212,64,48,.05); }
.zui-notif.info    { border-left-color: #5CD0FF; color: #5CD0FF; }
.zui-notif.warn    { border-left-color: #F0C000; color: #F0C000; }

/* ── LEGACY UI TOGGLE ────────────────────────── */
#zui-legacy-toggle {
  position: fixed;
  top: 60px;
  left: 8px;
  z-index: 950;
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  color: #2a2a2a;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  padding: 4px 8px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: color .15s;
  -webkit-appearance: none;
  display: none;
}
#zui-legacy-toggle:hover { color: #555; }
#zui-legacy-toggle.visible { display: block; }

/* ── ANIMATIONS ──────────────────────────────── */
@keyframes zpulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}
@keyframes zuiSlideIn {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}

/* ── RESPONSIVE: mobile adjustments ──────────── */
@media (max-width: 420px) {
  #zui-zone-compass { padding: 6px; gap: 3px; }
  .zui-zone-cell { padding: 6px 7px; }
  .zzc-icon { font-size: 18px; }
  #zui-actions-grid { grid-template-columns: repeat(4, 1fr); gap: 3px; padding: 6px; }
  .zui-action-btn { padding: 8px 4px 6px; min-height: 56px; }
  .zab-icon { font-size: 18px; }
}

  `;
  document.head.appendChild(style);
})();

// ── HTML INJECTION ─────────────────────────────────────
(function ZUI_injectHTML() {
  const html = `
  <!-- ZONE UI CONTAINER -->
  <div id="zui-container">

    <!-- TOP STATUS BAR -->
    <div id="zui-topbar">
      <!-- HP -->
      <div class="zui-stat-block ok" id="zui-hp-block">
        <div class="zui-stat-val" id="zui-hp-val">--</div>
        <div class="zui-stat-lbl">HP</div>
      </div>

      <!-- AP -->
      <div id="zui-ap-block">
        <div class="zui-ap-row">
          <span class="zui-ap-label">ĐHĐ</span>
          <span class="zui-ap-count" id="zui-ap-val">--</span>
          <div class="zui-ap-track">
            <div class="zui-ap-fill" id="zui-ap-fill" style="width:100%"></div>
          </div>
        </div>
        <div class="zui-ap-regen" id="zui-ap-regen">hồi sau --</div>
      </div>

      <!-- HUNGER -->
      <div class="zui-need-block ok" id="zui-hunger-block">
        <div class="zui-need-val" id="zui-hunger-val">-</div>
        <div class="zui-need-bar"><div class="zui-need-fill ok" id="zui-hunger-fill" style="width:100%"></div></div>
        <div class="zui-need-lbl">ĐÓI</div>
      </div>

      <!-- THIRST -->
      <div class="zui-need-block ok" id="zui-thirst-block">
        <div class="zui-need-val" id="zui-thirst-val">-</div>
        <div class="zui-need-bar"><div class="zui-need-fill ok" id="zui-thirst-fill" style="width:100%"></div></div>
        <div class="zui-need-lbl">KHÁT</div>
      </div>

      <!-- TIME -->
      <div id="zui-time-block">
        <div class="zui-time-day" id="zui-day-val">NGÀY 1</div>
        <div class="zui-time-hour" id="zui-hour-val">08:00</div>
      </div>

      <!-- LOCATION -->
      <div id="zui-location-block">
        <div>
          <div class="zui-location-zone" id="zui-zone-label">KHU VỰC</div>
          <div class="zui-location-name" id="zui-location-name">Đang tải...</div>
          <div class="zui-location-threat" id="zui-location-threat"></div>
        </div>
      </div>

      <!-- TOGGLE -->
      <button id="zui-toggle-btn" onclick="ZUI_hide()">← GD CŨ</button>
    </div>

    <!-- MAIN BODY -->
    <div id="zui-body">

      <!-- ZONE MAP (3x3 compass) -->
      <div id="zui-zone-panel">
        <div id="zui-zone-compass">
          <!-- Row 1 -->
          <div class="zui-zone-cell zui-corner"></div>
          <div class="zui-zone-cell unknown" id="zui-cell-n" onclick="ZUI_travel('n')"></div>
          <div class="zui-zone-cell zui-corner"></div>
          <!-- Row 2 -->
          <div class="zui-zone-cell unknown" id="zui-cell-w" onclick="ZUI_travel('w')"></div>
          <div class="zui-zone-cell zui-you" id="zui-cell-you"></div>
          <div class="zui-zone-cell unknown" id="zui-cell-e" onclick="ZUI_travel('e')"></div>
          <!-- Row 3 -->
          <div class="zui-zone-cell zui-corner"></div>
          <div class="zui-zone-cell unknown" id="zui-cell-s" onclick="ZUI_travel('s')"></div>
          <div class="zui-zone-cell zui-corner"></div>
        </div>
      </div>

      <!-- STATUS PANEL -->
      <div id="zui-status-panel">

        <!-- Threats -->
        <div class="zui-sec">
          <div class="zui-sec-title">Mối đe dọa</div>
          <div id="zui-threat-radar">
            <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#2a2a2a">
              Đang quét...
            </div>
          </div>
        </div>

        <!-- Shelter -->
        <div class="zui-sec">
          <div class="zui-sec-title">Nơi trú ẩn</div>
          <div id="zui-shelter-block">
            <span class="zui-shelter-icon">🏕</span>
            <div class="zui-shelter-info">
              <div class="zui-shelter-name" id="zui-shelter-name">Chưa có base</div>
              <div class="zui-shelter-meta" id="zui-shelter-meta">Tìm nơi an toàn để đặt base</div>
            </div>
            <div class="zui-shelter-level" id="zui-shelter-level" style="display:none"></div>
          </div>
        </div>

        <!-- Statuses -->
        <div class="zui-sec">
          <div class="zui-sec-title">Trạng thái</div>
          <div id="zui-status-chips"></div>
        </div>

        <!-- Log stream -->
        <div class="zui-sec" style="flex:1">
          <div class="zui-sec-title">Nhật ký</div>
          <div id="zui-log-stream"></div>
        </div>

      </div>
    </div>

    <!-- ACTION COMMAND BAR -->
    <div id="zui-action-bar">
      <div id="zui-action-tabs">
        <button class="zui-action-tab active" data-tab="move" onclick="ZUI_switchActionTab('move')">🧭 Di chuyển</button>
        <button class="zui-action-tab" data-tab="combat" onclick="ZUI_switchActionTab('combat')">⚔️ Chiến đấu</button>
        <button class="zui-action-tab" data-tab="build" onclick="ZUI_switchActionTab('build')">🏗 Xây dựng</button>
        <button class="zui-action-tab" data-tab="survive" onclick="ZUI_switchActionTab('survive')">🩹 Sinh tồn</button>
      </div>
      <div id="zui-actions-grid"></div>
    </div>
  </div>

  <!-- NOTIFICATION CONTAINER -->
  <div id="zui-notif-container"></div>

  <!-- LEGACY TOGGLE BUTTON (shown when ZUI hidden) -->
  <button id="zui-legacy-toggle" onclick="ZUI_show()">⚡ ZUI</button>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
})();

// ── STATE & HELPERS ────────────────────────────────────
var _zuiActive = false;
var _zuiActionTab = 'move';

// Terrain icons
var ZUI_TERRAIN_ICONS = {
  forest: '🌲', field: '🌾', road: '🛣', street: '🏚',
  alley: '🪟', hospital: '🏥', mall: '🛍', school: '🏫',
  factory: '🏭', park: '🌳', swamp: '🌿', river: '🌊',
  plain: '🏜', hill: '⛰', tunnel: '🕳', default: '📍',
};

function ZUI_getTileIcon(type) {
  return ZUI_TERRAIN_ICONS[type] || ZUI_TERRAIN_ICONS.default;
}

// Threat colors
var ZUI_THREAT_COLORS = {
  clear: '#5DD462', low: '#F0C000',
  medium: '#FF8C00', high: '#D44030', extreme: '#FF2222',
};
var ZUI_THREAT_LABELS = {
  clear: 'AN TOÀN', low: 'THẤP',
  medium: 'TRUNG', high: 'NGUY HIỂM', extreme: '☠ CỰC ĐỘ',
};

function ZUI_getState() {
  return (typeof gs !== 'undefined' && gs?._state) ? gs._state : null;
}

// ── SHOW / HIDE ────────────────────────────────────────
function ZUI_show() {
  const el = document.getElementById('zui-container');
  const legBtn = document.getElementById('zui-legacy-toggle');
  if (!el) return;
  el.classList.add('active');
  if (legBtn) legBtn.classList.remove('visible');
  _zuiActive = true;
  ZUI_render();
}

function ZUI_hide() {
  const el = document.getElementById('zui-container');
  const legBtn = document.getElementById('zui-legacy-toggle');
  if (!el) return;
  el.classList.remove('active');
  if (legBtn) legBtn.classList.add('visible');
  _zuiActive = false;
}

function ZUI_toggle() {
  _zuiActive ? ZUI_hide() : ZUI_show();
}

// ── MAIN RENDER ────────────────────────────────────────
function ZUI_render() {
  if (!_zuiActive) return;
  const state = ZUI_getState();
  if (!state) return;

  ZUI_renderTopBar(state);
  ZUI_renderZoneCompass(state);
  ZUI_renderStatusPanel(state);
  ZUI_renderActionBar(state);
}

// ── TOP BAR RENDER ─────────────────────────────────────
function ZUI_renderTopBar(state) {
  // HP
  const hpPct = state.hp / (state.maxHp || 15);
  const hpBlock = document.getElementById('zui-hp-block');
  const hpVal   = document.getElementById('zui-hp-val');
  if (hpBlock && hpVal) {
    hpVal.textContent = state.hp;
    hpBlock.className = 'zui-stat-block ' +
      (hpPct > .5 ? 'ok' : hpPct > .25 ? 'warn' : 'crit');
  }

  // AP
  const apMax = (typeof DW_apMax === 'function') ? DW_apMax(state) : 40;
  const apPct = Math.min(1, state.ap / apMax);
  const apVal  = document.getElementById('zui-ap-val');
  const apFill = document.getElementById('zui-ap-fill');
  const apRegen = document.getElementById('zui-ap-regen');
  if (apVal) apVal.textContent = `${state.ap}/${apMax}`;
  if (apFill) apFill.style.width = `${apPct * 100}%`;
  if (apRegen) {
    const msLeft = (state.lastRegenMs || 0) + (2 * 60 * 1000) - Date.now();
    const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
    if (secLeft <= 5) {
      apRegen.textContent = '⚡ hồi ngay';
      apRegen.className = 'zui-ap-regen ready';
    } else {
      const m = Math.floor(secLeft / 60);
      const s = secLeft % 60;
      apRegen.textContent = `+1 sau ${m}:${String(s).padStart(2,'0')}`;
      apRegen.className = 'zui-ap-regen';
    }
  }

  // Hunger
  _ZUI_renderNeed('hunger', state.hunger, 10);
  // Thirst
  _ZUI_renderNeed('thirst', state.thirst, 10);

  // Time
  const dayEl  = document.getElementById('zui-day-val');
  const hourEl = document.getElementById('zui-hour-val');
  const isNight = (state.hour >= 20 || state.hour < 6);
  if (dayEl) dayEl.textContent = `NGÀY ${state.day || 1}`;
  if (hourEl) {
    const h = String(state.hour || 8).padStart(2, '0');
    hourEl.textContent = `${h}:00 ${isNight ? '🌙' : '☀️'}`;
    hourEl.className = 'zui-time-hour' + (isNight ? ' zui-time-night' : '');
  }

  // Location
  const zoneId = (typeof DW_getZoneId === 'function')
    ? DW_getZoneId(state.x, state.y) : '?';
  const curInfo = (typeof DW_getCurrentZoneInfo === 'function')
    ? DW_getCurrentZoneInfo(state) : null;
  const tile = state.tiles?.[`${state.x},${state.y}`];

  const zoneLabel = document.getElementById('zui-zone-label');
  const locName   = document.getElementById('zui-location-name');
  const locThreat = document.getElementById('zui-location-threat');

  if (zoneLabel) zoneLabel.textContent = `ZONE ${zoneId}`;
  if (locName) locName.textContent = tile?.name || 'Không rõ';
  if (locThreat && curInfo) {
    const tcolor = ZUI_THREAT_COLORS[curInfo.threat] || '#555';
    const tlabel = ZUI_THREAT_LABELS[curInfo.threat] || '';
    locThreat.innerHTML = `
      <span style="color:${tcolor}">${tlabel}</span>
      ${curInfo.totalZombies > 0
        ? `<span style="color:#555">•</span><span style="color:#888">🧟 ${curInfo.totalZombies}</span>`
        : ''}
      ${curInfo.hasBoss ? `<span style="color:#FF2222;animation:zpulse .7s infinite">• ⚠️ BOSS</span>` : ''}
    `;
  }
}

function _ZUI_renderNeed(type, val, max) {
  const pct = Math.min(1, Math.max(0, (val || 0) / max));
  const cls  = pct > .5 ? 'ok' : pct > .25 ? 'warn' : 'crit';
  const block = document.getElementById(`zui-${type}-block`);
  const valEl = document.getElementById(`zui-${type}-val`);
  const fill  = document.getElementById(`zui-${type}-fill`);
  if (!block) return;
  block.className = `zui-need-block ${cls}`;
  if (valEl) valEl.textContent = Math.ceil(val || 0);
  if (fill)  {
    fill.style.width = `${pct * 100}%`;
    fill.className = `zui-need-fill ${cls}`;
  }
}

// ── ZONE COMPASS RENDER ────────────────────────────────
function ZUI_renderZoneCompass(state) {
  if (typeof DW_getAdjacentZones !== 'function') return;

  const zones = DW_getAdjacentZones(state);
  const apMax = (typeof DW_apMax === 'function') ? DW_apMax(state) : 40;

  // Render each directional zone
  zones.forEach(zone => {
    const cell = document.getElementById(`zui-cell-${zone.dir}`);
    if (!cell) return;

    if (zone.outOfBounds || !zone.info) {
      cell.className = 'zui-zone-cell unknown';
      cell.innerHTML = `<span class="zzc-name unknown">—</span>`;
      return;
    }

    const info = zone.info;
    const apCost = (typeof DW_calcZoneTravelAP === 'function')
      ? DW_calcZoneTravelAP(state, info) : 4;
    const canAfford = state.ap >= apCost;
    const tColor = ZUI_THREAT_COLORS[info.threat] || '#333';
    const icon = ZUI_getTileIcon(info.dominantType);
    const isUnknown = info.exploredPct < 10;
    const isImpassable = info.impassable;

    cell.className = [
      'zui-zone-cell',
      !isImpassable ? 'clickable' : '',
      isUnknown ? 'unknown' : '',
      !canAfford && !isImpassable ? 'cant-afford' : '',
      `threat-${info.threat}`,
    ].filter(Boolean).join(' ');

    // Arrow based on direction
    const arrows = { n: '↑', s: '↓', e: '→', w: '←' };
    const arrow = arrows[zone.dir] || '';

    if (isImpassable) {
      cell.innerHTML = `
        <span class="zzc-icon" style="opacity:.3">🚫</span>
        <span class="zzc-name">Không thể đi</span>
      `;
      return;
    }

    // Tags
    const tags = [];
    if (info.totalZombies > 0) {
      tags.push(`<span class="zzc-tag zombie">🧟 ${info.totalZombies}</span>`);
    }
    if (info.hasLoot && !isUnknown) {
      tags.push(`<span class="zzc-tag loot">📦 Đồ</span>`);
    }
    if (info.hasBoss) {
      tags.push(`<span class="zzc-tag boss">⚠️ BOSS</span>`);
    }
    if (info.hasBase) {
      tags.push(`<span class="zzc-tag base">🏕 BASE</span>`);
    }
    if (info.totalZombies === 0 && !isUnknown) {
      tags.push(`<span class="zzc-tag safe">✓ An toàn</span>`);
    }

    const nameTxt = isUnknown
      ? `<span class="zzc-name unknown">? Chưa khám phá</span>`
      : `<span class="zzc-name">${ZUI_getZoneDisplayName(state, zone.zoneId, info)}</span>`;

    const apColor = canAfford ? '' : 'color:#D44030';

    cell.innerHTML = `
      <span class="zzc-dir-arrow">${arrow}</span>
      <span class="zzc-icon">${icon}</span>
      ${nameTxt}
      <div class="zzc-tags">${tags.join('')}</div>
      ${isUnknown ? '<div class="zzc-fog"></div>' : ''}
      <span class="zzc-ap-cost" style="${apColor}">${apCost} ĐHĐ</span>
    `;
  });

  // Render YOU cell
  const youCell = document.getElementById('zui-cell-you');
  if (youCell) {
    const curInfo = (typeof DW_getCurrentZoneInfo === 'function')
      ? DW_getCurrentZoneInfo(state) : null;
    const exploredPct = curInfo?.exploredPct || 0;
    youCell.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%">
        <div class="zzc-you-dot"></div>
        <div class="zzc-you-label">BẠN</div>
        <div class="zzc-you-coords">${state.x},${state.y}</div>
        <div class="zzc-you-explored">${exploredPct}% khám phá</div>
      </div>
    `;
  }
}

function ZUI_getZoneDisplayName(state, zoneId, info) {
  if (info.hasBase) return '🏕 Base';
  if (info.hasSpecial) return info.hasSpecial.replace(/_/g,' ');
  const terrain = TILE_TYPES?.[info.dominantType]?.name || info.dominantType;
  return terrain;
}

// ── STATUS PANEL RENDER ────────────────────────────────
function ZUI_renderStatusPanel(state) {
  ZUI_renderThreatRadar(state);
  ZUI_renderShelterBlock(state);
  ZUI_renderStatusChips(state);
  ZUI_renderLogStream(state);
}

function ZUI_renderThreatRadar(state) {
  const el = document.getElementById('zui-threat-radar');
  if (!el) return;

  const tile = state.tiles?.[`${state.x},${state.y}`];
  const zombies = (tile?.objects || []).filter(
    o => OBJECT_DEFS?.[o.type]?.type === 'enemy' && o.alive !== false
  );
  const boss = state.activeBosses?.[`${state.x},${state.y}`];
  const barricade = tile?.barricade || 0;

  const items = [];

  if (boss) {
    const bdef = BOSS_DEFS?.[boss.id] || {};
    const bPct = boss.hp / (bdef.maxHp || boss.hp || 1);
    items.push(`
      <div class="zui-threat-row">
        <span class="zui-threat-icon">💀</span>
        <span class="zui-threat-label" style="color:#FF2222">${bdef.name || 'BOSS'}</span>
        <span class="zui-threat-count danger">${boss.hp}/${bdef.maxHp || boss.hp}</span>
      </div>
      <div class="zui-threat-bar-row">
        <div class="zui-threat-bar-track"><div class="zui-threat-bar-fill" style="width:${bPct*100}%;background:#FF2222"></div></div>
      </div>
    `);
  }

  if (zombies.length > 0) {
    const threat = zombies.length >= 7 ? 'danger' : zombies.length >= 3 ? 'warn' : 'ok';
    const color = threat === 'danger' ? '#D44030' : threat === 'warn' ? '#F0C000' : '#5DD462';
    items.push(`
      <div class="zui-threat-row">
        <span class="zui-threat-icon">🧟</span>
        <span class="zui-threat-label">Zombie trong khu</span>
        <span class="zui-threat-count ${threat}">${zombies.length}</span>
      </div>
      <div class="zui-threat-bar-row">
        <div class="zui-threat-bar-track"><div class="zui-threat-bar-fill"
          style="width:${Math.min(100,zombies.length/10*100)}%;background:${color}"></div></div>
      </div>
    `);
  }

  if (barricade > 0) {
    items.push(`
      <div class="zui-threat-row">
        <span class="zui-threat-icon">🧱</span>
        <span class="zui-threat-label">Barricade</span>
        <span class="zui-threat-count ok">Lv${barricade}</span>
      </div>
    `);
  }

  if (items.length === 0) {
    el.innerHTML = `
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a4a2a">
        ✓ Khu vực yên tĩnh
      </div>
    `;
  } else {
    el.innerHTML = items.join('');
  }
}

function ZUI_renderShelterBlock(state) {
  const nameEl  = document.getElementById('zui-shelter-name');
  const metaEl  = document.getElementById('zui-shelter-meta');
  const levelEl = document.getElementById('zui-shelter-level');
  if (!nameEl) return;

  const base = state.base;
  if (!base) {
    nameEl.textContent = 'Chưa có base';
    metaEl.textContent = 'Tìm nơi an toàn để đặt base';
    if (levelEl) levelEl.style.display = 'none';
    return;
  }

  const baseTile = state.tiles?.[base.tileKey];
  const lvl = base.level || 1;
  const isHome = (state.x === Number(base.tileKey.split(',')[0]) &&
                  state.y === Number(base.tileKey.split(',')[1]));

  nameEl.textContent = baseTile?.name || 'Base';
  const dist = Math.abs(state.x - Number(base.tileKey.split(',')[0])) +
               Math.abs(state.y - Number(base.tileKey.split(',')[1]));
  metaEl.textContent = isHome ? '📍 Bạn đang ở đây' : `Cách ${dist} ô`;
  if (levelEl) {
    levelEl.style.display = '';
    levelEl.textContent = `LV${lvl}`;
  }
}

function ZUI_renderStatusChips(state) {
  const el = document.getElementById('zui-status-chips');
  if (!el) return;

  const chips = [];
  const statuses = state.statuses || [];

  if (statuses.includes('bleed'))    chips.push({ label: '🩸 Chảy máu', cls: 'bad' });
  if (statuses.includes('infected')) chips.push({ label: '☣ Nhiễm trùng', cls: 'bad' });
  if (statuses.includes('fear'))     chips.push({ label: '😨 Sợ hãi', cls: 'warn' });
  if (statuses.includes('groggy'))   chips.push({ label: '😵 Choáng váng', cls: 'warn' });
  if (statuses.includes('poison'))   chips.push({ label: '🤢 Trúng độc', cls: 'bad' });

  if ((state.stress || 0) >= 70)     chips.push({ label: `😰 Stress ${state.stress}%`, cls: 'bad' });
  else if ((state.stress || 0) >= 50) chips.push({ label: `😟 Stress ${state.stress}%`, cls: 'warn' });

  if ((state.hunger || 5) < 2)      chips.push({ label: '🍽 Đói nặng', cls: 'bad' });
  if ((state.thirst || 5) < 2)      chips.push({ label: '💧 Khát nặng', cls: 'bad' });

  const weapon = state.equip?.weapon;
  if (weapon) {
    const wdef = EQUIP_DEFS?.[weapon];
    if (wdef) chips.push({ label: `⚔️ ${wdef.name}`, cls: 'info' });
  }

  if ((state.noise || 0) >= 6) chips.push({ label: `🔊 Tiếng ồn ${state.noise}/10`, cls: 'warn' });

  if (chips.length === 0) {
    chips.push({ label: '✓ Bình thường', cls: 'good' });
  }

  el.innerHTML = chips.map(c =>
    `<span class="zui-chip ${c.cls}">${c.label}</span>`
  ).join('');
}

function ZUI_renderLogStream(state) {
  const el = document.getElementById('zui-log-stream');
  if (!el) return;

  const log = (state.log || []).slice(0, 8);
  if (log.length === 0) {
    el.innerHTML = `<div class="zui-log-entry">Không có nhật ký.</div>`;
    return;
  }

  el.innerHTML = log.map((entry, i) =>
    `<div class="zui-log-entry" style="opacity:${1 - i * 0.1}">${entry}</div>`
  ).join('');
}

// ── ACTION BAR ────────────────────────────────────────
var ZUI_ACTION_TABS = {
  move: [
    { id: 'move_n', icon: '⬆', label: 'Bắc', ap: null, action: "ZUI_travel('n')" },
    { id: 'move_s', icon: '⬇', label: 'Nam', ap: null, action: "ZUI_travel('s')" },
    { id: 'move_e', icon: '⮕', label: 'Đông', ap: null, action: "ZUI_travel('e')" },
    { id: 'move_w', icon: '⬅', label: 'Tây', ap: null, action: "ZUI_travel('w')" },
    { id: 'explore', icon: '🔍', label: 'Lục soát', ap: 2, action: "ZUI_doSearch()" },
    { id: 'rest', icon: '😮‍💨', label: 'Nghỉ ngơi', ap: 0, action: "ZUI_doRest()" },
    { id: 'sleep', icon: '💤', label: 'Ngủ qua đêm', ap: 0, action: "ZUI_doSleep()" },
    { id: 'map', icon: '🗺', label: 'Bản đồ', ap: 0, action: "ZUI_openMap()" },
  ],
  combat: [
    { id: 'fight',   icon: '⚔️', label: 'Tấn công', ap: 3, action: "ZUI_doFight()"   },
    { id: 'heavy',   icon: '💥', label: 'Đòn mạnh',  ap: 5, action: "ZUI_doHeavy()"  },
    { id: 'stealth', icon: '🥷', label: 'Ám sát',    ap: 4, action: "ZUI_doStealth()"},
    { id: 'flee',    icon: '🏃', label: 'Bỏ chạy',   ap: 2, action: "ZUI_doFlee()"   },
    { id: 'throw',   icon: '🎯', label: 'Ném đồ',    ap: 2, action: "ZUI_doThrow()"  },
    { id: 'equip',   icon: '🗡',  label: 'Trang bị',  ap: 0, action: "ZUI_openEquip()"},
    { id: 'arena',   icon: '🎮', label: 'Vào Arena',  ap: 0, action: "DWArena.openForCurrentTile()" },
  ],
  build: [
    { id: 'barricade', icon: '🧱', label: 'Barricade', ap: 3, action: "ZUI_doBarricade()" },
    { id: 'setbase', icon: '🏕', label: 'Đặt base', ap: 5, action: "ZUI_doSetBase()" },
    { id: 'upgrade', icon: '⬆️', label: 'Nâng cấp', ap: 0, action: "ZUI_doUpgrade()" },
    { id: 'craft', icon: '⚒', label: 'Chế tạo', ap: 0, action: "ZUI_openCraft()" },
    { id: 'movebase', icon: '🚛', label: 'Di chuyển base', ap: 20, action: "ZUI_doMoveBase()" },
  ],
  survive: [
    { id: 'inventory', icon: '🎒', label: 'Túi đồ', ap: 0, action: "ZUI_openInventory()" },
    { id: 'heal', icon: '🩹', label: 'Sơ cứu', ap: 2, action: "ZUI_doHeal()" },
    { id: 'eat', icon: '🍞', label: 'Ăn uống', ap: 1, action: "ZUI_doEat()" },
    { id: 'skill', icon: '⭐', label: 'Kỹ năng', ap: 0, action: "ZUI_openSkills()" },
    { id: 'radio', icon: '📻', label: 'Radio', ap: 0, action: "ZUI_openRadio()" },
    { id: 'log', icon: '📋', label: 'Nhật ký', ap: 0, action: "ZUI_openLog()" },
  ],
};

function ZUI_switchActionTab(tab) {
  _zuiActionTab = tab;
  document.querySelectorAll('.zui-action-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  ZUI_renderActionBar(ZUI_getState());
}

function ZUI_renderActionBar(state) {
  const grid = document.getElementById('zui-actions-grid');
  if (!grid || !state) return;

  const actions = ZUI_ACTION_TABS[_zuiActionTab] || [];
  const apMax = (typeof DW_apMax === 'function') ? DW_apMax(state) : 40;

  const html = actions.map(act => {
    let apCost = act.ap;
    let disabled = false;
    let reason = '';
    let cls = '';

    // Dynamic AP cost for movement
    if (act.id.startsWith('move_')) {
      const dir = act.id.split('_')[1];
      const zones = (typeof DW_getAdjacentZones === 'function')
        ? DW_getAdjacentZones(state) : [];
      const z = zones.find(z => z.dir === dir);
      if (z?.info) {
        apCost = (typeof DW_calcZoneTravelAP === 'function')
          ? DW_calcZoneTravelAP(state, z.info) : 4;
        if (z.outOfBounds) { disabled = true; reason = 'Hết bản đồ'; }
        if (z.info.impassable) { disabled = true; reason = 'Không thể qua'; }
      } else if (z?.outOfBounds) {
        disabled = true; reason = 'Hết bản đồ';
      }
    }

    // Check AP
    if (apCost !== null && apCost !== 0 && !disabled) {
      if (state.ap < apCost) {
        disabled = true;
        reason = `Cần ${apCost} ĐHĐ`;
      }
    }

    // Special disables
    if (act.id === 'setbase' && state.base) {
      disabled = true; reason = 'Đã có base';
    }
    if (act.id === 'movebase' && !state.base) {
      disabled = true; reason = 'Chưa có base';
    }
    if (act.id === 'upgrade') {
      if (!state.base) { disabled = true; reason = 'Cần có base'; }
      else if ((state.base.level || 1) >= 5) { disabled = true; reason = 'Đã Max'; }
    }
    if (act.id === 'fight' || act.id === 'heavy' || act.id === 'stealth') {
      const tile = state.tiles?.[`${state.x},${state.y}`];
      const hasEnemy = (tile?.objects || []).some(
        o => OBJECT_DEFS?.[o.type]?.type === 'enemy' && o.alive !== false
      ) || state.activeBosses?.[`${state.x},${state.y}`];
      if (!hasEnemy) { disabled = true; reason = 'Không có kẻ thù'; }
    }

    if (act.id === 'primary' || act.id === 'movebase') cls = '';
    if (act.id === 'fight' || act.id === 'heavy') cls = 'danger';

    const costDisplay = apCost === null || apCost === 0
      ? ''
      : `<span class="zab-cost${disabled && apCost > state.ap ? ' unaffordable' : ''}">${apCost} ĐHĐ</span>`;

    return `
      <button class="zui-action-btn ${cls}" ${disabled ? 'disabled' : ''} onclick="${act.action}">
        <span class="zab-icon">${act.icon}</span>
        <span class="zab-label">${act.label}</span>
        ${costDisplay}
        ${reason ? `<span class="zab-reason">${reason}</span>` : ''}
      </button>
    `;
  }).join('');

  grid.innerHTML = html;
}

// ── TRAVEL ACTIONS ────────────────────────────────────
function ZUI_travel(dir) {
  const state = ZUI_getState();
  if (!state) return;

  if (typeof DW_zoneTravel !== 'function') {
    ZUI_notif('Hệ thống zone travel chưa load.', 'danger');
    return;
  }

  const result = DW_zoneTravel(state, dir);
  if (!result.ok) {
    ZUI_notif(result.msg, 'danger');
    return;
  }

  // Commit state via shim
  if (typeof gs !== 'undefined' && gs.setState) {
    gs.setState(result.state);
  }

  ZUI_notif(result.msg, result.apCost > 6 ? 'warn' : 'success');

  // AI description on new zone
  if (result.isNewZone && typeof aiDescribeNewTile === 'function') {
    setTimeout(() => aiDescribeNewTile(), 100);
  }

  ZUI_render();

  // Sync with legacy UI if open
  if (typeof UI_renderAll === 'function') UI_renderAll();
}

// ── DELEGATE TO EXISTING FUNCTIONS ────────────────────
function ZUI_doSearch() {
  if (typeof UI_openObjectPopup === 'function') {
    // Find first unsearched non-enemy object
    const state = ZUI_getState();
    const tile = state?.tiles?.[`${state.x},${state.y}`];
    const idx = (tile?.objects || []).findIndex(o => !o.searched && OBJECT_DEFS?.[o.type]?.type !== 'enemy');
    if (idx >= 0) UI_openObjectPopup(idx);
    else ZUI_notif('Không có gì để lục soát.', 'warn');
  }
}
function ZUI_doRest() {
  if (typeof UI_doRest === 'function') { UI_doRest(); ZUI_render(); }
}
function ZUI_doSleep() {
  if (typeof UI_doSleep === 'function') { UI_doSleep(); ZUI_render(); }
}
function ZUI_doBarricade() {
  if (typeof UI_doBarricade === 'function') { UI_doBarricade(); ZUI_render(); }
}
function ZUI_doFight() {
  const state = ZUI_getState();
  const tile = state?.tiles?.[`${state.x},${state.y}`];
  const enemy = (tile?.objects || []).find(o => OBJECT_DEFS?.[o.type]?.type === 'enemy' && o.alive !== false);
  if (enemy && typeof UI_openObjectPopup === 'function') {
    const idx = tile.objects.indexOf(enemy);
    UI_openObjectPopup(idx);
  }
}
function ZUI_doHeavy() { ZUI_doFight(); }
function ZUI_doStealth() { ZUI_doFight(); }
function ZUI_doFlee() {
  if (typeof DW_flee === 'function') {
    const r = DW_flee('n');
    if (typeof gs !== 'undefined' && gs.setState && r.state) gs.setState(r.state);
    ZUI_notif(r.ok ? '🏃 Bỏ chạy!' : r.msg, r.ok ? 'success' : 'danger');
    ZUI_render();
  }
}
function ZUI_doThrow() {
  if (typeof UI_tab === 'function') UI_tab('equip');
}
function ZUI_doHeal() {
  if (typeof UI_tab === 'function') UI_tab('equip');
}
function ZUI_doEat() {
  if (typeof UI_tab === 'function') UI_tab('equip');
}
function ZUI_doSetBase() {
  if (typeof DW_setBase === 'function') {
    const r = DW_setBase();
    if (r.ok && typeof gs !== 'undefined' && gs.setState) gs.setState(r.state);
    ZUI_notif(r.msg, r.ok ? 'success' : 'danger');
    ZUI_render();
  }
}
function ZUI_doUpgrade() {
  if (typeof DW_upgradeBase === 'function') {
    const r = DW_upgradeBase();
    if (r.ok && typeof gs !== 'undefined' && gs.setState) gs.setState(r.state);
    ZUI_notif(r.msg, r.ok ? 'success' : 'danger');
    ZUI_render();
  }
}
function ZUI_doMoveBase() {
  ZUI_notif('Tính năng di chuyển base — cần 20 ĐHĐ. Đang phát triển.', 'warn');
}
function ZUI_openMap()       { if (typeof UI_tab === 'function') UI_tab('map'); }
function ZUI_openInventory() { if (typeof UI_tab === 'function') UI_tab('equip'); }
function ZUI_openCraft()     { if (typeof UI_tab === 'function') UI_tab('craft'); }
function ZUI_openSkills()    { if (typeof UI_tab === 'function') UI_tab('skill'); }
function ZUI_openLog()       { if (typeof UI_tab === 'function') UI_tab('log'); }
function ZUI_openEquip()     { if (typeof UI_tab === 'function') UI_tab('equip'); }
function ZUI_openRadio() {
  if (typeof UI_openRadio === 'function') UI_openRadio();
}

// ── NOTIFICATION ──────────────────────────────────────
function ZUI_notif(msg, type = '') {
  const container = document.getElementById('zui-notif-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `zui-notif ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);

  // Also call original notif
  if (typeof showNotif === 'function') showNotif(msg, type);
}

// ── AUTO-SYNC: patch into UI_renderAll ────────────────
(function ZUI_hookRenderAll() {
  const originalRenderAll = typeof UI_renderAll === 'function' ? UI_renderAll : null;
  if (!originalRenderAll) {
    // Try again after load
    setTimeout(ZUI_hookRenderAll, 500);
    return;
  }
  window.UI_renderAll = function() {
    originalRenderAll.apply(this, arguments);
    if (_zuiActive) ZUI_render();
  };
})();

// ── AUTO-START ────────────────────────────────────────
// Tự động show ZUI khi game bắt đầu
(function ZUI_autoStart() {
  // Hook into game start
  const origStart = typeof startGame === 'function' ? startGame : null;
  if (origStart) {
    window.startGame = function() {
      origStart.apply(this, arguments);
      setTimeout(ZUI_show, 300);
    };
  }

  // Also show if game is already running
  setTimeout(() => {
    const state = ZUI_getState();
    if (state && !state.gameOver) {
      // Show legacy toggle button — let user opt in
      const legBtn = document.getElementById('zui-legacy-toggle');
      if (legBtn) legBtn.classList.add('visible');
    }
  }, 1000);
})();

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (!_zuiActive) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowUp'    || e.key === 'w') ZUI_travel('n');
  if (e.key === 'ArrowDown'  || e.key === 's') ZUI_travel('s');
  if (e.key === 'ArrowRight' || e.key === 'd') ZUI_travel('e');
  if (e.key === 'ArrowLeft'  || e.key === 'a') ZUI_travel('w');
  if (e.key === 'Escape') ZUI_hide();
  if (e.key === '1') ZUI_switchActionTab('move');
  if (e.key === '2') ZUI_switchActionTab('combat');
  if (e.key === '3') ZUI_switchActionTab('build');
  if (e.key === '4') ZUI_switchActionTab('survive');
});

console.log(`[DeadWorld] Zone UI v${ZUI_VERSION} loaded.`);
