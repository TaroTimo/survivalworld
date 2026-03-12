// ══════════════════════════════════════════════════════
// DEAD WORLD — engine-ai.js
// AI prompt builder: tile descriptions, rumor narrative,
// daily journal, psychological events, offline report,
// and AI Director score.
// Dependencies: deadworld-data.js (DW_JOBS, TILE_TYPES, OBJECT_DEFS, EQUIP_SLOTS)
// ══════════════════════════════════════════════════════

// ── AI DESCRIPTION PROMPT ─────────────────────────────
function DW_buildTilePrompt(state, tile) {
  const job      = DW_JOBS.find(j => j.id === state.job)?.name || state.job;
  const equipped = Object.entries(state.equip||{})
    .filter(([,v]) => v)
    .map(([slot, id]) => `${EQUIP_SLOTS[slot]?.label}: ${DW_itemName(id)}`)
    .join(', ') || 'tay không';
  const inv = state.inventory.slice(0, 5).map(DW_itemName).join(', ') || 'không có gì';

  return `Bạn là game master viết mô tả ngắn cho game survival zombie Việt Nam.
Nhân vật: ${job}, Ngày ${state.day}, ${state.hour}:00, HP ${state.hp}/${state.maxHp}, Stress ${state.stress}%.
Vị trí: ${tile.name} (${TILE_TYPES[tile.type]?.name||tile.type}).
Trang bị: ${equipped}. Túi: ${inv}.
Barricade: ${tile.barricade||0}/5.
Đối tượng: ${(tile.objects||[]).map(o => OBJECT_DEFS[o.type]?.label||o.type).join(', ')||'trống'}.
Viết 2-3 câu tối tăm, sinh động bằng tiếng Việt. KHÔNG đề xuất hành động.`;
}

// ── RUMOR ENCOUNTER NARRATIVE ─────────────────────────
// Nhận encounter context, trả về prompt cho AI kể cảnh ambush
function DW_buildAmbushPrompt(state, encounterCtx) {
  const job      = DW_JOBS.find(j => j.id === state.job)?.name || state.job;
  const outcome  = encounterCtx.outcome || 'bandit';
  const bandits  = (encounterCtx.bandits || []).map(b => b.name).join(', ') || 'kẻ lạ';
  const location = encounterCtx.targetName || 'địa điểm bí ẩn';
  const baitIcon = encounterCtx.baitIcon || '📦';
  const source   = encounterCtx.source   || 'radio';

  const sourceLabel = source === 'radio' ? 'radio' : source === 'npc' ? 'người lạ'
                    : source === 'note' ? 'mảnh giấy' : 'tên tù binh';

  return `Bạn là game master viết cảnh nhập vai cho game survival zombie Việt Nam.
Nhân vật: ${job}, Ngày ${state.day}, HP ${state.hp}/${state.maxHp}.
Địa điểm: ${location}.
Tình huống: Nhân vật đến đây vì tin từ ${sourceLabel}. Thấy ${baitIcon} nhưng phát hiện: ${
  outcome === 'bandit'       ? `${bandits} đang phục kích` :
  outcome === 'zombie'       ? 'zombie horde đang chờ trong bóng tối' :
  outcome === 'empty'        ? 'nơi đã bị lấy sạch từ trước' :
  outcome === 'twist'        ? 'cướp đã bị zombie giết trước — xác nằm la liệt' :
  'loot thật sự đang chờ'
}.
Viết 3-4 câu mô tả khoảnh khắc phát hiện. Giọng điệu căng thẳng, tối tăm. KHÔNG đề xuất hành động. Tiếng Việt.`;
}

// ── SURVIVOR JOURNAL (cuối ngày) ─────────────────────
// Nhận mảng event summary của ngày, trả về prompt cho AI viết nhật ký
function DW_buildDayJournalPrompt(state, dayEvents) {
  const job     = DW_JOBS.find(j => j.id === state.job)?.name || state.job;
  const events  = dayEvents.slice(0, 8).join('\n- ') || 'không có gì đặc biệt';
  const mood    = state.stress > 70 ? 'kiệt sức, tuyệt vọng'
                : state.stress > 40 ? 'lo lắng, căng thẳng'
                : 'tương đối bình tĩnh';
  const health  = state.hp < state.maxHp * 0.4 ? 'đang bị thương nặng'
                : state.hp < state.maxHp * 0.7 ? 'bị thương nhẹ'
                : 'khỏe mạnh';

  return `Bạn là một người sống sót đang viết nhật ký sau một ngày dài trong thế giới zombie.
Nhân vật: ${job}, Ngày ${state.day}, tâm trạng: ${mood}, sức khỏe: ${health}.
Hôm nay đã xảy ra:
- ${events}
Viết nhật ký 4-6 câu, ngôi thứ nhất, giọng văn mệt mỏi và chân thật của người sống sót hậu tận thế. 
Không cần đề cập số liệu cụ thể. Chỉ cảm xúc và những gì đáng nhớ. Tiếng Việt.`;
}

// ══════════════════════════════════════════════════════
// FEATURE 1 — PSYCHOLOGICAL EVENTS
// Prompt builder cho ảo giác / ác mộng / tiếng động giả.
// Engine chỉ truyền eventId — AI chỉ viết narrative, không thay đổi mechanics.
// ══════════════════════════════════════════════════════

// Bảng loại sự kiện tâm lý — engine-skills.js đọc để roll
// id: định danh, minStress/minDep: ngưỡng trigger, weight: xác suất tương đối
var PSYCH_EVENT_POOL = [
  // Ảo giác nhẹ — chỉ cần stress cao
  { id: 'shadow_flicker',  label: 'Bóng tối nhấp nháy',   minStress: 65, minDep:  0, nightOnly: false, weight: 30 },
  { id: 'false_footstep',  label: 'Tiếng bước chân giả',  minStress: 65, minDep:  0, nightOnly: false, weight: 25 },
  // Ảo giác nặng hơn — stress hoặc depression cao
  { id: 'hallucination',   label: 'Ảo giác người quen',   minStress: 75, minDep: 30, nightOnly: false, weight: 20 },
  { id: 'radio_voices',    label: 'Tiếng trong radio',     minStress: 70, minDep: 20, nightOnly: false, weight: 15 },
  // Ác mộng — chỉ xảy ra ban đêm (hour 0–4)
  { id: 'nightmare',       label: 'Ác mộng',               minStress: 60, minDep: 40, nightOnly: true,  weight: 20 },
  { id: 'night_terror',    label: 'Kinh hoàng đêm khuya', minStress: 80, minDep: 50, nightOnly: true,  weight: 10 },
];

// DW_buildPsychEventPrompt — trả về prompt để AI viết cảnh tâm lý
// eventId: một trong các id trong PSYCH_EVENT_POOL
// AI chỉ viết text — engine không thêm status hay thay đổi số
function DW_buildPsychEventPrompt(state, eventId) {
  const job    = DW_JOBS.find(j => j.id === state.job)?.name || state.job;
  const mood   = state.stress > 80 ? 'hoảng loạn, mất kiểm soát'
               : state.stress > 65 ? 'căng thẳng tột độ, paranoid'
               : 'mệt mỏi, tinh thần suy yếu';
  const hour   = state.hour ?? 12;
  const timeCtx = (hour >= 0 && hour < 6) ? 'giữa đêm tối' : `${hour}:00`;

  const eventDesc = {
    shadow_flicker: 'nhìn thấy bóng người lướt qua góc tối — nhưng quay lại thì không có gì',
    false_footstep: 'nghe rõ tiếng bước chân nặng nề phía sau — nhưng im lặng hoàn toàn khi dừng lại',
    hallucination:  'thấy khuôn mặt người quen đứng ở xa — rồi tan biến như chưa từng có',
    radio_voices:   'radio tắt nhưng vẫn nghe giọng nói lầm bầm không rõ lời',
    nightmare:      'tỉnh dậy giữa đêm — trong mơ vừa thấy toàn bộ những người đã chết vì mình',
    night_terror:   'không thể phân biệt đang mơ hay tỉnh — bóng tối xung quanh dường như đang thở',
  };

  const desc = eventDesc[eventId] || 'có gì đó không đúng nhưng không thể xác định được';

  return `Bạn là game master viết cảnh tâm lý cho game survival zombie Việt Nam.
Nhân vật: ${job}, Ngày ${state.day}, ${timeCtx}, HP ${state.hp}/${state.maxHp}, Stress ${state.stress}%, Depression ${state.depression || 0}%.
Tâm trạng: ${mood}.
Sự kiện: Nhân vật ${desc}.
Viết 2-3 câu ngôi thứ nhất, cảm giác mơ hồ giữa thật và ảo. Không xác nhận rõ ràng là thật hay giả. Giọng văn rối loạn, chân thật. Tiếng Việt. KHÔNG đề xuất hành động.`;
}

// ══════════════════════════════════════════════════════
// FEATURE 2 — OFFLINE NARRATIVE REPORT
// Khi player quay lại sau nhiều giờ vắng mặt,
// AI kể "chuyện gì đã xảy ra" dựa trên state lúc save.
// Chỉ đọc state — không thay đổi bất kỳ số nào.
// ══════════════════════════════════════════════════════

// DW_buildOfflineReportPrompt — trả về prompt để AI viết báo cáo offline
// offlineHours: số giờ thực tế player vắng mặt (số thực, ví dụ 7.5)
function DW_buildOfflineReportPrompt(state, offlineHours) {
  const job    = DW_JOBS.find(j => j.id === state.job)?.name || state.job;
  const hours  = Math.round(offlineHours);
  const days   = Math.floor(hours / 24);
  const restH  = hours % 24;

  const timeDesc = days > 0
    ? `${days} ngày${restH > 0 ? ' ' + restH + ' giờ' : ''}`.trim()
    : `${hours} giờ`;

  const tier       = state.directorTier || 'calm';
  const banditRep  = state.banditRep || 0;

  // Gợi ý narrative theo mức nguy hiểm — AI tự bịa chi tiết phù hợp
  const threatHint =
    tier === 'crisis' ? 'Mức nguy hiểm cực cao — gần như chắc chắn có tấn công, tiếng súng, dấu máu.' :
    tier === 'danger' ? 'Căng thẳng rõ rệt — zombie di chuyển gần, tiếng động xa, bóng người lạ quan sát.' :
    tier === 'tense'  ? 'Yên tĩnh bất thường — có thể là may mắn, cũng có thể là trước cơn bão.' :
                        'Tương đối bình yên — chỉ gió và tiếng rỉ sét của thành phố bỏ hoang.';

  const baseSituation = state.base
    ? `có base cấp ${state.base.level || 1}`
    : 'không có base, đang di chuyển ngoài trời';

  const repLabel = banditRep > 5 ? 'bị nhiều nhóm cướp biết mặt'
                 : banditRep > 2 ? 'đã có tiếng trong vùng'
                 : 'chưa ai để ý';

  return `Bạn là người kể chuyện viết báo cáo ngắn về ${timeDesc} vắng mặt của người sống sót.
Nhân vật: ${job}, Ngày ${state.day}, ${baseSituation}, HP ${state.hp}/${state.maxHp}.
Danh tiếng: ${repLabel}.
Bầu không khí trong thời gian vắng mặt: ${threatHint}
Viết 3-4 câu ngôi thứ ba, tường thuật những gì có thể đã diễn ra quanh khu vực. 
Không đề cập số. Chỉ hình ảnh và cảm giác. Kết thúc bằng 1 câu kéo người đọc trở lại — ví dụ dấu hiệu bất thường cần kiểm tra. Tiếng Việt.`;
}

// ══════════════════════════════════════════════════════
// FEATURE 3 — AI DIRECTOR SCORE
// Pure function — chỉ đọc state, không bao giờ ghi state.
// Tổng hợp các tín hiệu nguy hiểm → 1 score + 1 tier label.
// engine-world.js gọi hàm này trong DW_advanceDay() mỗi ngày
// và lưu kết quả vào state.directorTier + state.directorScore.
// Event pool, UI, và offline report đọc directorTier để bias.
// ══════════════════════════════════════════════════════

// DW_directorScore — tính điểm tension tổng hợp
// Trả về { score: number, tier: 'calm'|'tense'|'danger'|'crisis' }
function DW_directorScore(state) {
  const noise      = Math.min(10,  state.noise             || 0);
  const stress     = Math.min(100, state.stress            || 0);
  const depression = Math.min(100, state.depression        || 0);
  const banditRep  = Math.min(10,  state.banditRep         || 0);
  const day        = Math.min(30,  state.day               || 1);
  const baseThreat = Math.min(60,  state.base?.threatAccum || 0);
  const hp         = Math.max(1,   state.hp                || 1);
  const maxHp      = Math.max(1,   state.maxHp             || 10);
  const hpRatio    = hp / maxHp; // 1.0 = đầy HP, 0.0 = sắp chết

  // Công thức — score thường nằm trong 0–100
  // Mỗi nhân tố được cân nhắc theo mức ảnh hưởng thực tế lên gameplay
  const score = Math.round(
    noise      * 3    // tiếng động = mối đe dọa tức thì
  + stress     * 0.25 // stress = tình trạng tâm lý tổng thể
  + depression * 0.10 // depression = tín hiệu dài hạn
  + banditRep  * 4    // bandit biết tên = nguy hiểm chủ động tìm player
  + day        * 1.5  // ngày càng dài thế giới càng phản ứng mạnh hơn
  + baseThreat * 0.4  // threat tích lũy = áp lực từ từ nhưng thực chất
  - hpRatio    * 15   // HP đầy = player ở thế mạnh, giảm cảm giác crisis
  );

  const tier =
    score >= 70 ? 'crisis' :  // sự kiện nặng sắp xảy ra
    score >= 45 ? 'danger' :  // thế giới đang chú ý đến player
    score >= 20 ? 'tense'  :  // bất ổn tiềm ẩn
                  'calm';     // cơ hội phục hồi và thở

  return { score, tier };
}
