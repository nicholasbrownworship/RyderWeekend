/* autopair.js — Ozark Invitational (robust bootstrap)
 * Will wait for window.state/save/renderAll before initializing.
 * Safe to include anywhere, but still place it after your big inline script if you can.
 */

(function () {
  'use strict';

  // --- Bootstrapping: wait for state/save/renderAll ---
  const NEEDS = ['state', 'save', 'renderAll'];
  const MAX_MS = 15000;      // give it up to 15s
  const INTERVAL_MS = 40;    // poll every 40ms

  function depsReady() {
    return window.state && typeof window.save === 'function' && typeof window.renderAll === 'function';
  }

  function onReady(fn){
    if (depsReady()) return void fn();
    const t0 = Date.now();
    const id = setInterval(()=>{
      if (depsReady()) { clearInterval(id); fn(); }
      else if (Date.now() - t0 > MAX_MS) {
        clearInterval(id);
        console.warn('[autopair] Timed out waiting for', NEEDS.join(', '));
      }
    }, INTERVAL_MS);
  }

  onReady(init);

  function init(){
    // ---------- LocalStorage bridge ----------
    const SHARED_KEY = 'ozarkShared_v1';
    function deepClone(x){ return JSON.parse(JSON.stringify(x)); }

    function publishSharedSnapshot(reason = 'manual') {
      try {
        const s = window.state || {};
        const snap = {
          ts: Date.now(),
          reason,
          players: (s.players || []).map(p => ({
            id: String(p.id),
            firstName: p.firstName || '',
            lastName:  p.lastName  || '',
            nickname:  p.nickname  || '',
            team:      p.team      || 'ozark',
            handicap:  Number.isFinite(p.handicap) ? p.handicap : null,
            photoPath: p.photoPath || null
          })),
            // include photoBase so other pages can reconstruct avatar paths
          photoBase: s.photoBase || 'images/players/',
          groups:  deepClone(s.groups  || { day1:{front:[],back:[]}, day2:{front:[],back:[]} }),
          format:  deepClone(s.format  || { day1:{front:'Best Ball', back:'Best Ball'}, day2:{front:'Best Ball', back:'Best Ball'} }),
          dates:   deepClone(s.dates   || { day1: s.dateDay1 || '', day2: s.dateDay2 || '' }),
          numGroups: Number(s.numGroups) || 1,
          currentDay: s.currentDay || 'day1',
          side: s.side || 'front',
          eventName: s.eventName || 'Ozark Invitational'
        };

        const payload = JSON.stringify(snap);
        localStorage.setItem(SHARED_KEY, payload);
        try { window.dispatchEvent(new StorageEvent('storage', { key: SHARED_KEY, newValue: payload })); } catch {}
      } catch (e) {
        console.warn('[autopair] publishSharedSnapshot failed', e);
      }
    }

    // ---------- Format helpers ----------
    const TEAM_FORMATS_CANON = new Set(['best ball','scramble','alt shot','shamble']);

    function normalizeFormat(fmtRaw='') {
      const f = String(fmtRaw).trim().toLowerCase()
        .replace(/[–—-]/g,'-')
        .replace(/\s+/g,' ');
      if (f.includes('best') && (f.includes('ball') || f.includes('4-ball') || f.includes('fourball'))) return 'best ball';
      if (f.includes('scramble')) return 'scramble';
      if ((f.includes('alt') && f.includes('shot')) || f.includes('alternate')) return 'alt shot';
      if (f.includes('shamble')) return 'shamble';
      if (f.includes('single')) return 'singles';
      return f;
    }
    function isTeamFormat(fmt){ return TEAM_FORMATS_CANON.has(normalizeFormat(fmt)); }
    function isSingles(fmt){ return normalizeFormat(fmt) === 'singles'; }

    // Group size (respect your script.js if it defines desiredGroupSize)
    const desiredGroupSize =
      (typeof window.desiredGroupSize === 'function')
        ? window.desiredGroupSize
        : (fmt => isTeamFormat(fmt) ? 4 : (isSingles(fmt) ? 4 : 2));

    // ---------- State sanitizer ----------
    function ensureShape() {
      const s = window.state;
      if (!s.players) s.players = [];
      if (!s.format)  s.format  = { day1:{front:'Best Ball', back:'Best Ball'}, day2:{front:'Best Ball', back:'Best Ball'} };
      if (!s.groups)  s.groups  = { day1:{front:[], back:[]}, day2:{front:[], back:[]} };
      if (!s.dates)   s.dates   = { day1: s.dateDay1 || '', day2: s.dateDay2 || '' };
      if (!s.currentDay) s.currentDay = 'day1';
      if (!s.side)       s.side = 'front';
      if (!Number.isFinite(s.numGroups)) s.numGroups = Number(s.numGroups) || 1;

      ['day1','day2'].forEach(d=>{
        if (!s.groups[d]) s.groups[d] = { front:[], back:[] };
        ['front','back'].forEach(side=>{
          if (!Array.isArray(s.groups[d][side])) s.groups[d][side] = [];
        });
        if (!s.format[d]) s.format[d] = { front:'Best Ball', back:'Best Ball' };
        if (!s.format[d].front) s.format[d].front = 'Best Ball';
        if (!s.format[d].back)  s.format[d].back  = 'Best Ball';
      });
    }

    // Wrap renderAll to ensure shape
    if (!window.__autopair_renderWrapped && typeof window.renderAll === 'function') {
      const _renderAll = window.renderAll;
      window.renderAll = function wrappedRenderAll() {
        try { ensureShape(); } catch(e){ console.warn('[autopair] ensure before renderAll failed', e); }
        return _renderAll.apply(this, arguments);
      };
      window.__autopair_renderWrapped = true;
    }

    // Wrap save to publish snapshots
    if (!window.__autopair_saveWrapped && typeof window.save === 'function') {
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
    function labelRound(day, side){
      return `${day==='day1'?'Day 1':'Day 2'} ${side==='front'?'Front 9':'Back 9'}`;
    }
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

    function ensureSide(day, side, fmtRaw){
      ensureShape();
      const fmt = normalizeFormat(fmtRaw);
      const gs  = desiredGroupSize(fmt);
      const count = Math.max(1, Number(state.numGroups)||1);

      let rows = state.groups[day][side];
      if (!Array.isArray(rows) || rows.length !== count) {
        rows = Array.from({length: count}, ()=> Array(gs).fill(null));
      } else {
        rows = rows.map(g=>{
          const x = Array.isArray(g) ? g.slice(0, gs) : [];
          while (x.length < gs) x.push(null);
          return x;
        });
      }
      state.groups[day][side] = rows;
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

    function buildAssignmentsSingles(ozIds, vaIds, groupsCount, options){
      const seed = options.seed ?? null;
      const A = shuffle(ozIds, seed);
      const B = shuffle(vaIds, seed!=null ? Number(seed)+1 : null);

      const assignments = Array.from({length: groupsCount}, ()=> [null,null,null,null]);

      let i=0, j=0;
      for(let g=0; g<groupsCount; g++){
        assignments[g][0] = A[i] ?? null; if (A[i] != null) i++;
        assignments[g][1] = B[j] ?? null; if (B[j] != null) j++;
        assignments[g][2] = A[i] ?? null; if (A[i] != null) i++;
        assignments[g][3] = B[j] ?? null; if (B[j] != null) j++;
      }

      const needPerSide = groupsCount * 2;
      const shortOz = Math.max(0, needPerSide - i);
      const shortVa = Math.max(0, needPerSide - j);
      return { assignments, shortOz, shortVa };
    }

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
        const fmtRaw = (state.format?.[day]?.[side]) || 'Best Ball';
        const fmt    = normalizeFormat(fmtRaw);
        const isTeam = isTeamFormat(fmt);

        ensureSide(day, side, fmt);

        const groupsCount = Math.max(1, Number(state.numGroups)||1);
        const gs = desiredGroupSize(fmt);

        const fillMode =
          options.fillMode ||
          (document.getElementById('chkFillUnassigned')?.checked ? 'unassigned' : 'overwrite');

        if (fillMode === 'overwrite') {
          state.groups[day][side] = Array.from({length: groupsCount}, ()=> Array(gs).fill(null));
        }

        const { oz, va } = availableByTeam(day, side);

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

        if (typeof save === 'function') save();    // publishes snapshot via wrapped save
        if (typeof renderAll === 'function') renderAll();
        publishSharedSnapshot('autopair');
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

    // ---------- Reset helper ----------
    function resetAllGroups() {
      ensureShape();
      const days  = ['day1','day2'];
      const sides = ['front','back'];
      const count = Math.max(1, Number(state.numGroups) || 1);
      days.forEach(day => {
        sides.forEach(side => {
          const fmt = normalizeFormat(state.format?.[day]?.[side] || 'Best Ball');
          const gs  = desiredGroupSize(fmt);
          state.groups[day][side] = Array.from({ length: count }, () => Array(gs).fill(null));
        });
      });
    }

    // ---------- Wire buttons ----------
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

    // Expose for console
    window.__autoPair = {
      autoPairRound, autoPairDay, autoPairAll,
      resetAllGroups,
      publishSharedSnapshot,
      __ensure: ensureShape
    };

    // Initial publish
    try { ensureShape(); publishSharedSnapshot('init'); } catch {}
    console.log('[autopair] ready (booted after deps)', {
      hasState: !!window.state,
      numPlayers: (window.state.players||[]).length
    });
  }
})();
