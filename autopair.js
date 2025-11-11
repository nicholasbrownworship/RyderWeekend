/* autopair.js — Combined-site version (publishes to ozarkShared_v1)
 * Works with your new all-in-one site and the scorecard/leaderboard bridges.
 * Requires: window.state, save(), renderAll() defined by script.js
 * Optional: TEAM_FORMATS (Set), desiredGroupSize(fmt)
 *
 * UI hooks (if present on scoreboard.html):
 *   - #btnAutoPairRound   (auto-pair current day/side)
 *   - #btnAutoPairDay     (auto-pair both rounds for current day)
 *   - #btnAutoPairAll     (auto-pair all day/side)
 *   - #chkFillUnassigned  (if checked: only fill empty slots; else overwrite)
 *   - #btnClearSide       (we inject a sibling "Reset all groups" next to it)
 *
 * Data bridge:
 *   - Publishes a snapshot to localStorage key "ozarkShared_v1"
 *   - Scorecard & Leaderboard read it and live-update via 'storage' events
 */

(function () {
  'use strict';

  // ---------- Hard guard ----------
  if (!window.state) {
    console.warn("[autopair] 'state' not found; load this AFTER script.js on scoreboard.html");
    return;
  }

  // ---------- LocalStorage bridge ----------
  const SHARED_KEY = 'ozarkShared_v1';

  function publishSharedSnapshot(reason = 'manual') {
    try {
      // Minimal, stable shape for readers (scorecard/leaderboard)
      const snap = {
        ts: Date.now(),
        reason,
        // players: only essentials used by card/leaderboard pages
        players: (state.players || []).map(p => ({
          id: String(p.id),
          firstName: p.firstName || '',
          lastName:  p.lastName  || '',
          nickname:  p.nickname  || '',
          team:      p.team      || 'ozark',
          handicap:  Number.isFinite(p.handicap) ? p.handicap : 0,
        })),
        // pairings & meta used by the bridge
        groups:  deepClone(state.groups || { day1:{front:[],back:[]}, day2:{front:[],back:[]} }),
        format:  deepClone(state.format || { day1:{front:'Best Ball', back:'Best Ball'}, day2:{front:'Best Ball', back:'Best Ball'} }),
        dates:   deepClone(state.dates  || { day1: (state.dateDay1 || ''), day2: (state.dateDay2 || '') }),
        numGroups: Number(state.numGroups) || 1,
        currentDay: state.currentDay || 'day1',
        side: state.side || 'front',
      };
      localStorage.setItem(SHARED_KEY, JSON.stringify(snap));
      // Fire a manual 'storage' event for same-tab listeners (optional but handy)
      try {
        window.dispatchEvent(new StorageEvent('storage', { key: SHARED_KEY, newValue: JSON.stringify(snap) }));
      } catch {}
      // console.log('[autopair] published snapshot', { reason, snap });
    } catch (e) {
      console.warn('[autopair] publishSharedSnapshot failed', e);
    }
  }

  function deepClone(x){ return JSON.parse(JSON.stringify(x)); }

  // ---------- TEAM formats & group size ----------
  const TEAM_FORMATS =
    (window.TEAM_FORMATS instanceof Set && window.TEAM_FORMATS.size)
      ? window.TEAM_FORMATS
      : new Set(['Best Ball','Scramble','Alt Shot','Shamble']);

  // We want singles to create TWO matches (1v1 x 2) per group → 4 slots total.
  const desiredGroupSize =
    typeof window.desiredGroupSize === 'function'
      ? window.desiredGroupSize
      : (fmt => {
          const f = String(fmt || '').toLowerCase();
          if (TEAM_FORMATS.has(fmt)) return 4;        // team formats → foursomes
          if (f.includes('single')) return 4;         // singles → 2 matches → 4 slots
          return 2;                                   // fallback
        });

  // ---------- State sanitizer ----------
  function ensureShape() {
    if (!state.players) state.players = [];
    if (!state.format)  state.format  = { day1:{front:'Best Ball', back:'Best Ball'}, day2:{front:'Best Ball', back:'Best Ball'} };
    if (!state.groups)  state.groups  = { day1:{front:[], back:[]}, day2:{front:[], back:[]} };
    if (!state.dates)   state.dates   = { day1: (state.dateDay1 || ''), day2: (state.dateDay2 || '') };
    if (!state.currentDay) state.currentDay = 'day1';
    if (!state.side)       state.side = 'front';
    if (!Number.isFinite(state.numGroups)) state.numGroups = Number(state.numGroups) || 1;

    // Keep nested arrays sane
    ['day1','day2'].forEach(d=>{
      if (!state.groups[d]) state.groups[d] = { front:[], back:[] };
      ['front','back'].forEach(s=>{
        if (!Array.isArray(state.groups[d][s])) state.groups[d][s] = [];
      });
      if (!state.format[d]) state.format[d] = { front:'Best Ball', back:'Best Ball' };
      if (!state.format[d].front) state.format[d].front = 'Best Ball';
      if (!state.format[d].back)  state.format[d].back  = 'Best Ball';
    });
  }

  // Always sanitize before rendering
  if (typeof window.renderAll === 'function' && !window.__autopair_renderWrapped) {
    const _renderAll = window.renderAll;
    window.renderAll = function wrappedRenderAll() {
      try { ensureShape(); } catch(e){ console.warn('[autopair] ensure before renderAll failed', e); }
      return _renderAll.apply(this, arguments);
    };
    window.__autopair_renderWrapped = true;
  }

  // Also wrap save() to publish the snapshot automatically
  if (typeof window.save === 'function' && !window.__autopair_saveWrapped) {
    const _save = window.save;
    window.save = function wrappedSave() {
      const r = _save.apply(this, arguments);
      try { publishSharedSnapshot('save()'); } catch {}
      return r;
    };
    window.__autopair_saveWrapped = true;
  }

  // ---------- Utils ----------
  function findPlayer(id){ return (state.players||[]).find(p => String(p.id) === String(id)); }

  function mulberry32(a){
    return function(){
      let t=a+=0x6D2B79F5;
      t=Math.imul(t^t>>>15, t|1);
      t^=t+Math.imul(t^t>>>7, t|61);
      return ((t^t>>>14)>>>0)/4294967296;
    };
  }
  function shuffle(arr, seed=null){
    const a = arr.slice();
    const rnd = seed==null ? Math.random : mulberry32(Number(seed)||1);
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rnd()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function labelRound(day, side){
    return `${day==='day1'?'Day 1':'Day 2'} ${side==='front'?'Front 9':'Back 9'}`;
  }

  // Ensure side grid shape (rows = numGroups, cols = desiredGroupSize(fmt))
  function ensureSide(day, side, fmt){
    ensureShape();
    const gs = desiredGroupSize(fmt);
    const count = Math.max(1, Number(state.numGroups)||1);
    let arr = state.groups[day][side];
    if (!Array.isArray(arr) || arr.length !== count) {
      arr = Array.from({length: count}, ()=> Array(gs).fill(null));
    } else {
      arr = arr.map(g=>{
        const x = Array.isArray(g) ? g.slice(0, gs) : [];
        while (x.length < gs) x.push(null);
        return x;
      });
    }
    state.groups[day][side] = arr;
  }

  function availableByTeam(day, side){
    const placed = new Set((state.groups?.[day]?.[side]||[]).flat().filter(Boolean).map(String));
    const oz = [], va = [];
    for(const p of state.players||[]){
      if (placed.has(String(p.id))) continue;
      (p.team === 'valley' ? va : oz).push(String(p.id));
    }
    return { oz, va };
  }

  // ---------- Assignment builders ----------
  // Team formats: fill groups with two OZ + two VA (pairs per side)
  function buildAssignmentsTeam(ozIds, vaIds, groupsCount, options){
    const seed = options.seed ?? null;
    const A = shuffle(ozIds, seed);
    const B = shuffle(vaIds, seed!=null ? Number(seed)+1 : null);

    const mkPairs = arr => { const out=[]; for(let i=0;i<arr.length;i+=2) out.push(arr.slice(i,i+2)); return out; };
    const pairsA = mkPairs(A), pairsB = mkPairs(B);

    const assignments = Array.from({length: groupsCount}, ()=> [null,null,null,null]);
    let pa=0, pb=0, shortA=0, shortB=0;

    for(let g=0; g<groupsCount; g++){
      const pairA = pairsA[pa] || [];
      const pairB = pairsB[pb] || [];

      if (pairA.length === 2){ assignments[g][0]=pairA[0]; assignments[g][1]=pairA[1]; pa++; }
      else { if (pairA.length===1){ assignments[g][0]=pairA[0]; } shortA += (2 - pairA.length); }

      if (pairB.length === 2){ assignments[g][2]=pairB[0]; assignments[g][3]=pairB[1]; pb++; }
      else { if (pairB.length===1){ assignments[g][2]=pairB[0]; } shortB += (2 - pairB.length); }
    }
    return { assignments, shortA, shortB };
  }

  // Singles: two 1v1 matches per group -> 4 slots (0 vs 1) + (2 vs 3)
  function buildAssignmentsSingles(ozIds, vaIds, groupsCount, options){
    const seed = options.seed ?? null;
    const A = shuffle(ozIds, seed);
    const B = shuffle(vaIds, seed!=null ? Number(seed)+1 : null);

    const assignments = Array.from({length: groupsCount}, ()=> [null,null,null,null]);

    let i=0, j=0;
    for(let g=0; g<groupsCount; g++){
      // Match 1
      assignments[g][0] = A[i] ?? null; if (A[i] != null) i++;
      assignments[g][1] = B[j] ?? null; if (B[j] != null) j++;
      // Match 2
      assignments[g][2] = A[i] ?? null; if (A[i] != null) i++;
      assignments[g][3] = B[j] ?? null; if (B[j] != null) j++;
    }

    const needPerSide = groupsCount * 2; // two OZ + two VA per group
    const shortOz = Math.max(0, needPerSide - i);
    const shortVa = Math.max(0, needPerSide - j);
    return { assignments, shortOz, shortVa };
  }

  // ---------- Apply assignments ----------
  function applyAssignments(day, side, assignments, options){
    const fillUnassigned = options.fillMode === 'unassigned';
    const gs = assignments[0]?.length || 0;
    const groups = state.groups[day][side];

    for(let g=0; g<groups.length; g++){
      if (!groups[g]) groups[g] = Array(gs).fill(null);
      const row = groups[g];
      while (row.length < gs) row.push(null);
      if (row.length > gs) row.length = gs;

      for(let i=0;i<gs;i++){
        const target = assignments[g][i] ?? null;
        if (fillUnassigned){
          if (row[i] == null) row[i] = target;
        } else {
          row[i] = target;
        }
      }
    }
  }

  // ---------- Public autopair ops ----------
  function autoPairRound(day, side, options={}){
    try {
      ensureShape();
      const fmt = (state.format?.[day]?.[side]) || 'Best Ball';
      ensureSide(day, side, fmt);

      const gs  = desiredGroupSize(fmt);
      const isTeam = TEAM_FORMATS.has(fmt);
      const groupsCount = Math.max(1, Number(state.numGroups)||1);

      const fillMode =
        options.fillMode ||
        (document.getElementById('chkFillUnassigned')?.checked ? 'unassigned' : 'overwrite');

      if (fillMode === 'overwrite') {
        state.groups[day][side] = Array.from({length: groupsCount}, ()=> Array(gs).fill(null));
      }

      const { oz, va } = availableByTeam(day, side);

      // console.log('[autopair] run', { day, side, fmt, isTeam, gs, fillMode, groupsCount, availOz: oz.length, availVa: va.length });

      if (isTeam && gs===4){
        const res = buildAssignmentsTeam(oz, va, groupsCount, options);
        applyAssignments(day, side, res.assignments, { fillMode });
        const msgs = [];
        if (res.shortA) msgs.push(`Ozark short by ${res.shortA} slot(s) on ${labelRound(day,side)}.`);
        if (res.shortB) msgs.push(`Valley short by ${res.shortB} slot(s) on ${labelRound(day,side)}.`);
        if (msgs.length) alert(msgs.join("\n"));
      } else {
        const res = buildAssignmentsSingles(oz, va, groupsCount, options);
        applyAssignments(day, side, res.assignments, { fillMode });
        const needPerSide = groupsCount * 2;
        const msgs = [];
        if (oz.length < needPerSide) msgs.push(`Ozark has only ${oz.length} available for singles on ${labelRound(day,side)} (need ${needPerSide}).`);
        if (va.length < needPerSide) msgs.push(`Valley has only ${va.length} available for singles on ${labelRound(day,side)} (need ${needPerSide}).`);
        if (msgs.length) alert(msgs.join("\n"));
      }

      if (typeof save === 'function') save();    // triggers snapshot publish via our wrapper
      if (typeof renderAll === 'function') renderAll();
      publishSharedSnapshot('autopair');         // extra explicit publish (safe)
    } catch (err) {
      console.error('[autopair] ERROR in autoPairRound:', err);
      alert('Auto-pair hit an error. Check console for details.');
    }
  }

  function autoPairDay(day, options={}) {
    autoPairRound(day, 'front', options);
    autoPairRound(day, 'back',  options);
  }

  function autoPairAll(options={}) {
    autoPairDay('day1', options);
    autoPairDay('day2', options);
  }

  // ---------- Reset helper (all rounds, both days) ----------
  function resetAllGroups() {
    ensureShape();
    const days  = ['day1','day2'];
    const sides = ['front','back'];
    const count = Math.max(1, Number(state.numGroups) || 1);
    days.forEach(day => {
      sides.forEach(side => {
        const fmt = (state.format?.[day]?.[side]) || 'Best Ball';
        const gs  = desiredGroupSize(fmt);
        state.groups[day][side] = Array.from({ length: count }, () => Array(gs).fill(null));
      });
    });
  }

  // ---------- Wire buttons if present ----------
  function wireButtons(){
    const btnRound = document.getElementById('btnAutoPairRound');
    const btnDay   = document.getElementById('btnAutoPairDay');
    const btnAll   = document.getElementById('btnAutoPairAll');

    if (btnRound) btnRound.addEventListener('click', ()=>{
      autoPairRound(state.currentDay || 'day1', state.side || 'front', {
        fillMode: (document.getElementById('chkFillUnassigned')?.checked ? 'unassigned' : 'overwrite')
      });
    });

    if (btnDay) btnDay.addEventListener('click', ()=>{
      autoPairDay(state.currentDay || 'day1', {
        fillMode: (document.getElementById('chkFillUnassigned')?.checked ? 'unassigned' : 'overwrite')
      });
    });

    if (btnAll) btnAll.addEventListener('click', ()=>{
      autoPairAll({
        fillMode: (document.getElementById('chkFillUnassigned')?.checked ? 'unassigned' : 'overwrite')
      });
    });

    // Inject "Reset all groups" next to Clear side
    const btnClearSide = document.getElementById('btnClearSide');
    if (btnClearSide && !document.getElementById('btnResetGroups')) {
      const btnReset = document.createElement('button');
      btnReset.id = 'btnResetGroups';
      btnReset.className = 'btn warn';
      btnReset.style.marginLeft = '6px';
      btnReset.textContent = 'Reset all groups';
      btnClearSide.insertAdjacentElement('afterend', btnReset);

      btnReset.addEventListener('click', ()=>{
        if (!confirm('Reset ALL groups (Day 1 & Day 2, Front & Back) to empty slots?')) return;
        resetAllGroups();
        if (typeof save === 'function') save();
        if (typeof renderAll === 'function') renderAll();
        publishSharedSnapshot('resetAllGroups');
        alert('All groups reset.');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireButtons);
  } else {
    wireButtons();
  }

  // ---------- Expose (debug) ----------
  window.__autoPair = {
    autoPairRound, autoPairDay, autoPairAll,
    resetAllGroups,
    publishSharedSnapshot,
    __ensure: ensureShape
  };

  // First-time sanitize + publish so other tabs/pages can see baseline
  try { ensureShape(); publishSharedSnapshot('init'); } catch {}
  console.log('[autopair] ready', {
    hasState: !!window.state,
    TEAM_FORMATS: TEAM_FORMATS ? [...TEAM_FORMATS] : null
  });
})();
