/* ============================================================
   interactives.js — every entry's hands-on demo.
   Exposes window.Demos[kind](hostEl, entryId).
   Pure vanilla JS + Canvas; no external libraries.
   ============================================================ */

(function () {
  'use strict';
  const Demos = (window.Demos = window.Demos || {});

  // ---------- tiny helpers ----------
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const k in props) {
      if (k === 'class') el.className = props[k];
      else if (k === 'style') Object.assign(el.style, props[k]);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (k === 'html') el.innerHTML = props[k];
      else el.setAttribute(k, props[k]);
    }
    for (const kid of kids) {
      if (kid == null) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  };
  const wrap = (title, sub, ...children) => {
    const w = h('div', { class: 'demo' });
    w.append(h('h4', {}, title));
    if (sub) w.append(h('div', { class: 'demo-sub' }, sub));
    children.forEach(c => w.append(c));
    return w;
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const dot   = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const softmax = (xs, T = 1) => {
    const m = Math.max(...xs);
    const exps = xs.map(x => Math.exp((x - m) / T));
    const Z = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / Z);
  };
  const sigmoid = x => 1 / (1 + Math.exp(-x));
  const tanh    = Math.tanh;

  function canvas(width, height, label) {
    const w = h('div', { class: 'canvas-wrap' });
    if (label) w.append(h('div', { class: 'canvas-label' }, label));
    const c = h('canvas');
    c.width = width; c.height = height;
    c.style.width = '100%';
    w.append(c);
    return { wrap: w, canvas: c, ctx: c.getContext('2d') };
  }

  // ============================================================
  // 1. SYMBOLIC AI — three modes: 20-questions, forward chain, browse
  // ============================================================
  Demos.symbolic = function (host) {
    // -- knowledge base --
    const ANIMALS = {
      'Dog':       { fur:1, feathers:0, scales:0, fourLegs:1, swims:0, flies:0, mammal:1, carnivore:1, large:0 },
      'Cat':       { fur:1, feathers:0, scales:0, fourLegs:1, swims:0, flies:0, mammal:1, carnivore:1, large:0 },
      'Horse':     { fur:1, feathers:0, scales:0, fourLegs:1, swims:0, flies:0, mammal:1, carnivore:0, large:1 },
      'Cow':       { fur:1, feathers:0, scales:0, fourLegs:1, swims:0, flies:0, mammal:1, carnivore:0, large:1 },
      'Bat':       { fur:1, feathers:0, scales:0, fourLegs:0, swims:0, flies:1, mammal:1, carnivore:1, large:0 },
      'Dolphin':   { fur:0, feathers:0, scales:0, fourLegs:0, swims:1, flies:0, mammal:1, carnivore:1, large:1 },
      'Whale':     { fur:0, feathers:0, scales:0, fourLegs:0, swims:1, flies:0, mammal:1, carnivore:1, large:1 },
      'Eagle':     { fur:0, feathers:1, scales:0, fourLegs:0, swims:0, flies:1, mammal:0, carnivore:1, large:0 },
      'Penguin':   { fur:0, feathers:1, scales:0, fourLegs:0, swims:1, flies:0, mammal:0, carnivore:1, large:0 },
      'Sparrow':   { fur:0, feathers:1, scales:0, fourLegs:0, swims:0, flies:1, mammal:0, carnivore:0, large:0 },
      'Snake':     { fur:0, feathers:0, scales:1, fourLegs:0, swims:0, flies:0, mammal:0, carnivore:1, large:0 },
      'Crocodile': { fur:0, feathers:0, scales:1, fourLegs:1, swims:1, flies:0, mammal:0, carnivore:1, large:1 },
      'Turtle':    { fur:0, feathers:0, scales:1, fourLegs:1, swims:1, flies:0, mammal:0, carnivore:0, large:0 },
      'Shark':     { fur:0, feathers:0, scales:1, fourLegs:0, swims:1, flies:0, mammal:0, carnivore:1, large:1 },
      'Goldfish':  { fur:0, feathers:0, scales:1, fourLegs:0, swims:1, flies:0, mammal:0, carnivore:0, large:0 },
      'Frog':      { fur:0, feathers:0, scales:0, fourLegs:1, swims:1, flies:0, mammal:0, carnivore:1, large:0 },
    };
    const FEATURES = {
      fur:       'Does it have fur?',
      feathers:  'Does it have feathers?',
      scales:    'Does it have scales?',
      fourLegs:  'Does it have four legs?',
      swims:     'Does it swim?',
      flies:     'Can it fly?',
      mammal:    'Is it a mammal?',
      carnivore: 'Is it carnivorous?',
      large:     'Is it large?',
    };

    let mode = 'guess';
    const root = wrap(
      'A classical expert system',
      '"20 questions" runs backward chaining — the system asks YOU and narrows down. "Identify by features" runs forward chaining. "Browse" shows the raw rule base.'
    );

    // tab strip
    const tabs = h('div', { class: 'demo-controls', style: { borderBottom: '1px solid var(--rule)', paddingBottom: '14px' } });
    const tabLabels = { guess: '20 questions (backward)', identify: 'identify by features (forward)', browse: 'browse rules' };
    Object.keys(tabLabels).forEach(m => {
      const b = h('button', { class: 'chip' + (m === mode ? ' selected' : '') }, tabLabels[m]);
      b.addEventListener('click', () => {
        mode = m;
        tabs.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        b.classList.add('selected');
        render();
      });
      tabs.append(b);
    });

    const body = h('div', { style: { marginTop: '16px' } });

    // ---------- MODE 1: BACKWARD CHAINING / 20 QUESTIONS ----------
    function modeGuess() {
      let candidates = Object.keys(ANIMALS).slice();
      let answered = [];          // [feature, 'yes'|'no']

      function entropy(featureKey) {
        const yes = candidates.filter(a => ANIMALS[a][featureKey] === 1).length;
        const no  = candidates.length - yes;
        if (yes === 0 || no === 0) return 0;
        const py = yes / candidates.length, pn = no / candidates.length;
        return -(py * Math.log2(py) + pn * Math.log2(pn));
      }
      function bestFeature() {
        const used = new Set(answered.map(([f]) => f));
        const remaining = Object.keys(FEATURES).filter(f => !used.has(f));
        if (!remaining.length) return null;
        return remaining.reduce((best, f) => entropy(f) > entropy(best) ? f : best, remaining[0]);
      }

      function paint() {
        body.innerHTML = '';

        // candidates pool
        const status = h('div', { style: { padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--rule)', marginBottom: '14px' } });
        status.innerHTML =
          `<div style="font-size:11px; color:var(--amber-dim); letter-spacing:0.12em;">CANDIDATES &nbsp;(${candidates.length})</div>` +
          `<div style="margin-top:6px;">` +
          candidates.map(a =>
            `<span style="display:inline-block; padding:2px 8px; margin:2px; background:var(--surface); border:1px solid var(--rule-bright); font-size:12px; color:var(--amber-hi);">${a}</span>`
          ).join('') +
          `</div>`;
        body.append(status);

        // answer history
        if (answered.length) {
          const hist = h('div', { style: { marginBottom: '14px', fontSize: '12px', color: 'var(--amber-dim)' } });
          hist.innerHTML =
            `<div style="font-size:11px; letter-spacing:0.12em; margin-bottom:6px;">ANSWERS SO FAR</div>` +
            answered.map(([f, a]) =>
              `<div>· ${FEATURES[f]} → <span style="color:var(--${a === 'yes' ? 'green' : 'red'});">${a.toUpperCase()}</span></div>`
            ).join('');
          body.append(hist);
        }

        // decision
        if (candidates.length === 1) {
          body.append(h('div', {
            style: { padding: '16px 20px', background: 'var(--surface-2)', border: '1px solid var(--amber)', fontFamily: 'var(--vt)', fontSize: '24px', color: 'var(--amber-hi)' }
          }, '▶ Your animal is: ' + candidates[0]));
          body.append(h('div', { class: 'demo-controls' },
            h('button', { class: 'btn primary', onclick: () => { candidates = Object.keys(ANIMALS).slice(); answered = []; paint(); } }, '↻ play again')
          ));
          return;
        }
        if (candidates.length === 0) {
          body.append(h('div', {
            style: { padding: '16px 20px', background: 'var(--surface-2)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px', lineHeight: '1.55' }
          }, '× No animal in the knowledge base matches those answers. ' +
              'This is the classic limit of symbolic AI: every concept must be pre-coded. Real animals not in the database become invisible.'));
          body.append(h('div', { class: 'demo-controls' },
            h('button', { class: 'btn primary', onclick: () => { candidates = Object.keys(ANIMALS).slice(); answered = []; paint(); } }, '↻ play again')
          ));
          return;
        }

        // ask the next question (max info gain)
        const q = bestFeature();
        if (!q) {
          body.append(h('div', { style: { padding: '14px', color: 'var(--amber-dim)' } },
            `Ambiguous: ${candidates.length} candidates left, no more questions.`));
          return;
        }
        const qBox = h('div', { style: { padding: '20px', background: 'var(--surface)', border: '1px solid var(--rule-bright)' } });
        qBox.append(h('div', { style: { fontSize: '11px', color: 'var(--amber-dim)', letterSpacing: '0.12em', marginBottom: '8px' } }, 'NEXT QUESTION'));
        qBox.append(h('div', { style: { fontFamily: 'var(--vt)', fontSize: '24px', color: 'var(--amber-hi)', marginBottom: '14px' } }, FEATURES[q]));
        const buttons = h('div', { class: 'demo-controls' });
        buttons.append(h('button', { class: 'btn primary', style: { color: 'var(--green)', borderColor: 'var(--green)' }, onclick: () => {
          answered.push([q, 'yes']);
          candidates = candidates.filter(a => ANIMALS[a][q] === 1);
          paint();
        } }, 'YES'));
        buttons.append(h('button', { class: 'btn', style: { color: 'var(--red)', borderColor: 'var(--red)' }, onclick: () => {
          answered.push([q, 'no']);
          candidates = candidates.filter(a => ANIMALS[a][q] === 0);
          paint();
        } }, 'NO'));
        qBox.append(buttons);
        qBox.append(h('div', { style: { marginTop: '12px', fontSize: '10px', color: 'var(--amber-dim)', letterSpacing: '0.04em' } },
          `(question chosen to maximise information gain: H = ${entropy(q).toFixed(2)} bits — splits the candidate set most evenly)`));
        body.append(qBox);
      }
      paint();
    }

    // ---------- MODE 2: FORWARD CHAINING ----------
    function modeIdentify() {
      const selected = new Set();
      body.append(h('div', { style: { fontSize: '13px', color: 'var(--amber-dim)', marginBottom: '14px' } },
        'Tick observed traits; every animal whose traits match fires. Try (fur + four legs) — multiple animals match. Add a discriminator like "carnivore" or "large".'));

      const chipRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' } });
      Object.keys(FEATURES).forEach(f => {
        const label = FEATURES[f].replace(/^Does it |^Can it |^Is it /i, '').replace(/\?$/, '').trim();
        const c = h('button', { class: 'chip' }, label);
        c.addEventListener('click', () => {
          if (selected.has(f)) { selected.delete(f); c.classList.remove('selected'); }
          else { selected.add(f); c.classList.add('selected'); }
          run();
        });
        chipRow.append(c);
      });
      body.append(chipRow);

      const output = h('div');
      body.append(output);

      function run() {
        output.innerHTML = '';
        if (selected.size === 0) {
          output.append(h('div', { style: { color: 'var(--amber-dim)', fontStyle: 'italic', padding: '10px 0' } }, 'Tick at least one trait above.'));
          return;
        }
        const matching = Object.entries(ANIMALS)
          .filter(([, a]) => [...selected].every(f => a[f] === 1))
          .map(([n]) => n);

        const card = h('div', {
          style: {
            padding: '14px 20px',
            background: 'var(--surface-2)',
            border: '1px solid ' + (matching.length ? 'var(--amber)' : 'var(--red)')
          }
        });
        if (matching.length === 1) {
          card.innerHTML = `<div style="font-size:11px; color:var(--amber-dim); letter-spacing:0.12em; margin-bottom:6px;">INFERENCE</div>
            <div style="font-family:var(--vt); font-size:22px; color:var(--amber-hi);">▶ ${matching[0]}</div>`;
        } else if (matching.length > 1) {
          card.innerHTML = `<div style="font-size:11px; color:var(--amber-dim); letter-spacing:0.12em; margin-bottom:6px;">AMBIGUOUS — ${matching.length} matches</div>
            <div style="font-family:var(--vt); font-size:20px; color:var(--amber-hi); line-height:1.4;">${matching.join(' &nbsp;·&nbsp; ')}</div>
            <div style="font-size:12px; color:var(--amber-dim); margin-top:8px; font-style:italic;">add more features to disambiguate</div>`;
        } else {
          card.innerHTML = `<div style="font-size:11px; color:var(--red); letter-spacing:0.12em; margin-bottom:6px;">NO MATCH</div>
            <div style="font-size:13px; color:var(--amber-lo);">No animal in the knowledge base has all of these traits.</div>`;
        }
        output.append(card);

        // trace
        const trace = h('div', { style: { marginTop: '14px', fontFamily: 'var(--mono)', fontSize: '12px' } });
        trace.append(h('div', { style: { fontSize: '11px', letterSpacing: '0.12em', color: 'var(--amber-dim)', marginBottom: '6px' } }, 'RULE TRACE'));
        Object.entries(ANIMALS).forEach(([name, attrs]) => {
          const ok = [...selected].every(f => attrs[f] === 1);
          trace.append(h('div', { style: { padding: '2px 0', color: ok ? 'var(--green)' : 'var(--amber-deep)' } },
            (ok ? '✓ ' : '· ') + 'IF ' + [...selected].join(' ∧ ') + ' THEN ' + name));
        });
        output.append(trace);
      }
      run();
    }

    // ---------- MODE 3: BROWSE THE KNOWLEDGE BASE ----------
    function modeBrowse() {
      body.append(h('div', { style: { fontSize: '13px', color: 'var(--amber-dim)', marginBottom: '14px' } },
        'The full knowledge base. Each row is an animal; each column a feature. ● = has the trait, · = does not.'));
      const tbl = h('table', { style: { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '12px' } });
      const headRow = h('tr');
      headRow.append(h('th', { style: { padding: '6px 8px', borderBottom: '1px solid var(--amber-dim)', textAlign: 'left', color: 'var(--amber)' } }, 'animal'));
      Object.keys(FEATURES).forEach(f => {
        headRow.append(h('th', { style: { padding: '6px 4px', borderBottom: '1px solid var(--amber-dim)', textAlign: 'center', color: 'var(--amber-dim)', fontSize: '10px', letterSpacing: '0.06em' } }, f));
      });
      tbl.append(headRow);
      Object.entries(ANIMALS).forEach(([name, attrs]) => {
        const tr = h('tr');
        tr.append(h('td', { style: { padding: '5px 8px', borderBottom: '1px dashed var(--rule)', color: 'var(--amber-hi)' } }, name));
        Object.keys(FEATURES).forEach(f => {
          tr.append(h('td', {
            style: {
              padding: '5px 4px', borderBottom: '1px dashed var(--rule)', textAlign: 'center',
              color: attrs[f] ? 'var(--green)' : 'var(--amber-deep)'
            }
          }, attrs[f] ? '●' : '·'));
        });
        tbl.append(tr);
      });
      body.append(tbl);
    }

    function render() {
      body.innerHTML = '';
      if (mode === 'guess')    modeGuess();
      if (mode === 'identify') modeIdentify();
      if (mode === 'browse')   modeBrowse();
    }

    root.append(tabs, body);
    render();
    host.append(root);
  };

  // ============================================================
  // 2. PERCEPTRON — animated training, mistake counter, w-vector
  // ============================================================
  Demos.perceptron = function (host) {
    const C = {
      bg: '#0a0805', grid: '#3a2e1a', axis: '#6a4e22',
      pos: '#ff8a2a', neg: '#6abce0', line: '#ffb95a',
      mistake: '#d4665a', wArr: '#9bbd47', text: '#d4b67c',
    };
    const W = 420, H = 420;
    let points = [];
    let w = [0, 0], b = 0;
    let mode = 1;
    let trained = false;
    let iters = 0, mistakes = 0;
    let animTimer = null;
    let lastStatus = '—';     // '—' | 'converged' | 'inseparable' | 'running'

    const { wrap: cwrap, canvas: cv, ctx } = canvas(W, H);

    // -- coordinate helpers (uses range [-1.2, 1.2]) --
    function toPx(p) { return { x: (p.x + 1.2) / 2.4 * W, y: (1 - (p.y + 1.2) / 2.4) * H }; }
    function fromPx(px, py) { return { x: px / W * 2.4 - 1.2, y: 1.2 - py / H * 2.4 }; }
    function predict(p) { const z = w[0] * p.x + w[1] * p.y + b; return z >= 0 ? 1 : -1; }
    function accuracy() {
      if (!points.length) return 0;
      return points.filter(p => predict(p) === p.label).length / points.length;
    }

    function draw() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(i * W / 6, 0); ctx.lineTo(i * W / 6, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * H / 6); ctx.lineTo(W, i * H / 6); ctx.stroke();
      }
      // axes
      ctx.strokeStyle = C.axis;
      ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();

      // decision line
      if (trained && (Math.abs(w[0]) > 1e-6 || Math.abs(w[1]) > 1e-6)) {
        const xs = [-1.4, 1.4];
        let pts;
        if (Math.abs(w[1]) > 1e-6) {
          pts = xs.map(x => ({ x, y: -(w[0] * x + b) / w[1] }));
        } else {
          const xV = -b / w[0];
          pts = [{ x: xV, y: -1.4 }, { x: xV, y: 1.4 }];
        }
        const a = toPx(pts[0]), c2 = toPx(pts[1]);
        ctx.strokeStyle = C.line; ctx.lineWidth = 2;
        ctx.shadowColor = C.line; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
        ctx.shadowBlur = 0;

        // w vector from origin (in pixel coords, fixed length 80)
        const origin = toPx({ x: 0, y: 0 });
        const wlen = Math.sqrt(w[0]*w[0] + w[1]*w[1]) || 1;
        const sc = 80 / wlen;
        const tip = { x: origin.x + w[0] * sc, y: origin.y - w[1] * sc };
        ctx.strokeStyle = C.wArr; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
        ctx.setLineDash([]);
        const ang = Math.atan2(tip.y - origin.y, tip.x - origin.x);
        ctx.fillStyle = C.wArr;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x - 9 * Math.cos(ang - 0.4), tip.y - 9 * Math.sin(ang - 0.4));
        ctx.lineTo(tip.x - 9 * Math.cos(ang + 0.4), tip.y - 9 * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fill();
        ctx.font = '12px IBM Plex Mono';
        ctx.fillText('w', tip.x + 8, tip.y + 4);
      }

      // points
      points.forEach(p => {
        const px = toPx(p);
        const wrong = trained && predict(p) !== p.label;
        ctx.fillStyle = p.label === 1 ? C.pos : C.neg;
        ctx.beginPath(); ctx.arc(px.x, px.y, 7, 0, Math.PI * 2); ctx.fill();
        if (wrong) {
          ctx.strokeStyle = C.mistake; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(px.x, px.y, 11, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        }
      });

      // legend
      ctx.font = '11px IBM Plex Mono';
      ctx.fillStyle = C.pos; ctx.fillText('● class +1', 12, H - 30);
      ctx.fillStyle = C.neg; ctx.fillText('● class -1', 12, H - 14);
      if (trained) {
        ctx.fillStyle = C.line; ctx.fillText('— boundary', 110, H - 30);
        ctx.fillStyle = C.wArr; ctx.fillText('-- w vector', 110, H - 14);
      }
    }

    // one perceptron pass through all points
    function oneEpoch() {
      let m = 0;
      points.forEach(p => {
        const z = w[0] * p.x + w[1] * p.y + b;
        if (p.label * z <= 0) {
          w[0] += p.label * p.x;
          w[1] += p.label * p.y;
          b += p.label;
          m++;
        }
      });
      iters++; mistakes = m;
      trained = true;
      return m;
    }
    function resetWeights() {
      stopAnim();
      w = [0, 0]; b = 0; iters = 0; mistakes = 0; trained = false; lastStatus = '—';
    }
    function stopAnim() { if (animTimer) { clearInterval(animTimer); animTimer = null; } }

    function startTrain() {
      stopAnim();
      w = [0, 0]; b = 0; iters = 0; mistakes = 0; trained = true; lastStatus = 'running';
      updateStatus(); draw();
      animTimer = setInterval(() => {
        const m = oneEpoch();
        draw(); updateStatus();
        if (m === 0) { lastStatus = 'converged'; stopAnim(); updateStatus(); }
        else if (iters >= 200) { lastStatus = 'inseparable'; stopAnim(); updateStatus(); }
      }, 150);
    }
    function stepOnce() {
      stopAnim();
      if (!trained) { lastStatus = 'running'; }
      const m = oneEpoch();
      if (m === 0) lastStatus = 'converged';
      draw(); updateStatus();
    }

    // click to add point
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      const py = (e.clientY - r.top) * (H / r.height);
      const { x, y } = fromPx(px, py);
      if (Math.abs(x) > 1.2 || Math.abs(y) > 1.2) return;
      points.push({ x, y, label: mode });
      resetWeights();
      draw(); updateStatus();
    });

    // class toggle
    const posBtn = h('button', { class: 'btn' }, '● + class');
    const negBtn = h('button', { class: 'btn' }, '● − class');
    function setMode(m) {
      mode = m;
      if (m === 1) {
        posBtn.style.background = C.pos; posBtn.style.color = '#100c08'; posBtn.style.borderColor = C.pos;
        negBtn.style.background = '';    negBtn.style.color = C.neg;      negBtn.style.borderColor = C.neg;
      } else {
        negBtn.style.background = C.neg; negBtn.style.color = '#100c08'; negBtn.style.borderColor = C.neg;
        posBtn.style.background = '';    posBtn.style.color = C.pos;      posBtn.style.borderColor = C.pos;
      }
    }
    posBtn.addEventListener('click', () => setMode(1));
    negBtn.addEventListener('click', () => setMode(-1));

    // status panel
    const status = h('div', { style: { padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--rule)', marginTop: '10px', fontFamily: 'var(--mono)', fontSize: '12px' } });
    function updateStatus() {
      const labels = {
        '—':            ['—', 'var(--amber-dim)'],
        'running':      ['… training', 'var(--amber-hi)'],
        'converged':    ['✓ CONVERGED — data separable', 'var(--green)'],
        'inseparable':  ['✗ MAX-ITER — data not linearly separable', 'var(--red)'],
      };
      const [txt, col] = labels[lastStatus] || labels['—'];
      status.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:18px; align-items:baseline;">
          <div><span style="color:var(--amber-dim);">iter</span>
               <span style="color:var(--amber-hi); font-family:var(--vt); font-size:18px; margin-left:6px;">${iters}</span></div>
          <div><span style="color:var(--amber-dim);">mistakes (last epoch)</span>
               <span style="color:var(--amber-hi); font-family:var(--vt); font-size:18px; margin-left:6px;">${mistakes}</span></div>
          <div><span style="color:var(--amber-dim);">accuracy</span>
               <span style="color:var(--amber-hi); font-family:var(--vt); font-size:18px; margin-left:6px;">${(accuracy()*100).toFixed(0)}%</span></div>
          <div><span style="color:var(--amber-dim);">points</span>
               <span style="color:var(--amber-hi); font-family:var(--vt); font-size:18px; margin-left:6px;">${points.length}</span></div>
          <div style="margin-left:auto;"><span style="color:var(--amber-dim);">status</span>
               <span style="color:${col}; margin-left:6px;">${txt}</span></div>
        </div>
        <div style="margin-top:6px; font-size:11px; color:var(--amber-dim);">
          w = [${w[0].toFixed(2)}, ${w[1].toFixed(2)}],&nbsp; b = ${b.toFixed(2)}
        </div>
      `;
    }

    // action buttons
    const actionBtns = h('div', { class: 'demo-controls' },
      h('button', { class: 'btn primary', onclick: startTrain }, '▶ Train (animated)'),
      h('button', { class: 'btn', onclick: stepOnce }, 'Step one epoch'),
      h('button', { class: 'btn', onclick: () => { points = []; resetWeights(); draw(); updateStatus(); } }, '× Clear all')
    );

    // presets
    const presets = h('div', { class: 'demo-controls', style: { borderTop: '1px solid var(--rule)', paddingTop: '10px' } });
    presets.append(h('span', { style: { fontSize: '11px', color: 'var(--amber-dim)', letterSpacing: '0.14em' } }, 'PRESETS'));
    presets.append(
      h('button', { class: 'btn', onclick: () => {
        points = [];
        for (let i = 0; i < 14; i++) {
          points.push({ x: -0.8 + Math.random() * 0.5, y: -0.7 + Math.random() * 1.4, label: -1 });
          points.push({ x:  0.3 + Math.random() * 0.5, y: -0.7 + Math.random() * 1.4, label:  1 });
        }
        resetWeights(); draw(); updateStatus();
      } }, 'linearly separable'),
      h('button', { class: 'btn', onclick: () => {
        points = [
          { x: -0.6, y: -0.6, label: -1 },
          { x:  0.6, y:  0.6, label: -1 },
          { x: -0.6, y:  0.6, label:  1 },
          { x:  0.6, y: -0.6, label:  1 },
        ];
        resetWeights(); draw(); updateStatus();
      } }, 'XOR (impossible)'),
      h('button', { class: 'btn', onclick: () => {
        points = [];
        for (let i = 0; i < 10; i++) {
          points.push({ x: -0.5 + Math.random() * 0.7, y: -0.4 + Math.random() * 0.8, label: -1 });
          points.push({ x:  0.0 + Math.random() * 0.7, y: -0.4 + Math.random() * 0.8, label:  1 });
        }
        resetWeights(); draw(); updateStatus();
      } }, 'overlapping (noisy)')
    );

    const help = h('div', { style: { fontSize: '12px', color: 'var(--amber-dim)', lineHeight: '1.6', padding: '10px 0' } });
    help.innerHTML =
      `<strong style="color:var(--amber-hi);">how to use:</strong> pick a class, click the canvas to add points,
       then press <em>Train</em>. The amber line is the current decision boundary; the green dashed arrow is
       the weight vector w (perpendicular to the line). Points circled in red are still misclassified — watch
       them disappear as training proceeds. The XOR preset loops forever because no line separates those four
       corners — that is the proof in §2.`;

    const root = wrap(
      'Train a perceptron on your own data',
      'Real animated training. Watch the line move, the weight vector rotate, and the mistake counter drop.'
    );
    root.append(
      help,
      h('div', { class: 'demo-controls' },
        h('span', { style: { fontSize: '11px', color: 'var(--amber-dim)', letterSpacing: '0.14em' } }, 'CLICK ADDS:'),
        posBtn, negBtn),
      cwrap,
      status,
      actionBtns,
      presets
    );
    host.append(root);

    setMode(1);
    draw(); updateStatus();
  };

  // ============================================================
  // 3. MLP-XOR — real SGD, animated decision boundary, loss curve
  // ============================================================
  Demos.mlp_xor = function (host) {
    const C = {
      bg: '#0a0805', grid: '#3a2e1a', text: '#d4b67c',
      pos: '#ff8a2a', neg: '#6abce0', line: '#ffb95a',
    };
    // network: 2 -> H -> 1, sigmoid everywhere, MSE loss
    let H_units = 4;
    let lr = 0.5;
    let W1, b1, W2, b2;
    function initWeights() {
      W1 = Array.from({ length: H_units }, () =>
        [Math.random() * 2 - 1, Math.random() * 2 - 1]);
      b1 = Array.from({ length: H_units }, () => Math.random() * 0.4 - 0.2);
      W2 = Array.from({ length: H_units }, () => Math.random() * 2 - 1);
      b2 = Math.random() * 0.4 - 0.2;
    }
    initWeights();

    const DATA = [
      { x: [0, 0], y: 0 },
      { x: [1, 0], y: 1 },
      { x: [0, 1], y: 1 },
      { x: [1, 1], y: 0 },
    ];

    function forward(x) {
      const z1 = W1.map((row, i) => row[0] * x[0] + row[1] * x[1] + b1[i]);
      const hh = z1.map(sigmoid);
      const z2 = W2.reduce((s, v, i) => s + v * hh[i], 0) + b2;
      const yhat = sigmoid(z2);
      return { hh, yhat };
    }
    function trainStep() {
      let totalLoss = 0;
      // shuffle order so SGD is stochastic
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      for (const idx of order) {
        const { x, y } = DATA[idx];
        const { hh, yhat } = forward(x);
        const e = yhat - y;
        totalLoss += 0.5 * e * e;
        // backward
        const d_z2 = e * yhat * (1 - yhat);
        const dW2 = hh.map(hi => d_z2 * hi);
        const db2 = d_z2;
        const d_h = W2.map(w => w * d_z2);
        const d_z1 = d_h.map((dhi, i) => dhi * hh[i] * (1 - hh[i]));
        const dW1 = d_z1.map(dz => [dz * x[0], dz * x[1]]);
        const db1 = d_z1;
        // sgd update
        for (let i = 0; i < H_units; i++) {
          W1[i][0] -= lr * dW1[i][0];
          W1[i][1] -= lr * dW1[i][1];
          b1[i]    -= lr * db1[i];
          W2[i]    -= lr * dW2[i];
        }
        b2 -= lr * db2;
      }
      return totalLoss;
    }

    const SIZE = 320;
    const LOSS_H = 180;
    const { wrap: w1wrap, ctx: ctx1 } = canvas(SIZE, SIZE, 'input space + boundary');
    const { wrap: w2wrap, ctx: ctx2 } = canvas(SIZE, LOSS_H, 'loss over training');
    let lossHistory = [];
    let trainingEpochs = 0;

    function tx(x) { return 20 + (x + 0.3) / 1.6 * (SIZE - 40); }
    function ty(y) { return SIZE - (20 + (y + 0.3) / 1.6 * (SIZE - 40)); }

    function drawBoundary() {
      ctx1.fillStyle = C.bg; ctx1.fillRect(0, 0, SIZE, SIZE);
      // contour: paint a grid of pixels coloured by predicted probability
      const RES = 64;
      const cell = (SIZE - 40) / RES;
      for (let i = 0; i < RES; i++) {
        for (let j = 0; j < RES; j++) {
          const x = -0.3 + (i / RES) * 1.6;
          const y = -0.3 + (j / RES) * 1.6;
          const { yhat } = forward([x, y]);
          // 0 -> blue (cool), 1 -> orange (hot)
          const r = Math.round(0xff * yhat + 0x10 * (1 - yhat));
          const g = Math.round(0x8a * yhat + 0x30 * (1 - yhat));
          const bch = Math.round(0x2a * yhat + 0x40 * (1 - yhat));
          ctx1.fillStyle = `rgba(${r},${g},${bch},0.55)`;
          ctx1.fillRect(20 + i * cell, SIZE - 20 - (j + 1) * cell,
                        cell + 0.5, cell + 0.5);
        }
      }
      // axes
      ctx1.strokeStyle = C.grid;
      [0, 0.5, 1].forEach(v => {
        ctx1.beginPath(); ctx1.moveTo(tx(v), 0); ctx1.lineTo(tx(v), SIZE); ctx1.stroke();
        ctx1.beginPath(); ctx1.moveTo(0, ty(v)); ctx1.lineTo(SIZE, ty(v)); ctx1.stroke();
      });
      // XOR points
      DATA.forEach(({ x, y }) => {
        const px = tx(x[0]), py = ty(x[1]);
        ctx1.fillStyle = y === 1 ? C.pos : C.neg;
        ctx1.beginPath(); ctx1.arc(px, py, 10, 0, Math.PI * 2); ctx1.fill();
        ctx1.strokeStyle = '#100c08'; ctx1.lineWidth = 2;
        ctx1.stroke();
        ctx1.fillStyle = C.text; ctx1.font = '11px IBM Plex Mono';
        ctx1.fillText(`(${x[0]},${x[1]})`, px + 12, py + 4);
      });
      ctx1.fillStyle = C.text; ctx1.font = '10px IBM Plex Mono';
      ctx1.fillText('blue = predict 0   ·   orange = predict 1', 14, SIZE - 8);
    }
    function drawLoss() {
      ctx2.fillStyle = C.bg; ctx2.fillRect(0, 0, SIZE, LOSS_H);
      if (lossHistory.length < 2) {
        ctx2.fillStyle = C.text; ctx2.font = '12px IBM Plex Mono';
        ctx2.fillText('press Train to start', 14, 22);
        return;
      }
      const vmax = Math.max(...lossHistory.slice(-300), 0.5);
      ctx2.strokeStyle = C.grid;
      for (let i = 1; i < 5; i++) {
        const yL = 20 + (LOSS_H - 36) * i / 5;
        ctx2.beginPath(); ctx2.moveTo(0, yL); ctx2.lineTo(SIZE, yL); ctx2.stroke();
      }
      ctx2.strokeStyle = C.line; ctx2.lineWidth = 2;
      ctx2.shadowColor = C.line; ctx2.shadowBlur = 4;
      ctx2.beginPath();
      const recent = lossHistory.slice(-300);
      recent.forEach((v, i) => {
        const xc = 14 + i / Math.max(1, recent.length - 1) * (SIZE - 28);
        const yc = LOSS_H - 16 - (v / vmax) * (LOSS_H - 36);
        if (i === 0) ctx2.moveTo(xc, yc); else ctx2.lineTo(xc, yc);
      });
      ctx2.stroke(); ctx2.shadowBlur = 0;
      ctx2.fillStyle = C.text; ctx2.font = '11px IBM Plex Mono';
      const last = lossHistory[lossHistory.length - 1];
      ctx2.fillText(`epoch ${trainingEpochs}`, 14, 18);
      ctx2.fillText(`loss = ${last.toFixed(4)}`, 14, 32);
      ctx2.fillStyle = '#7a5a28';
      ctx2.fillText(`max in view: ${vmax.toFixed(3)}`, SIZE - 130, 18);
    }

    let animTimer = null;
    function stopAnim() { if (animTimer) { clearInterval(animTimer); animTimer = null; } }
    function startTrain() {
      stopAnim();
      animTimer = setInterval(() => {
        for (let i = 0; i < 5; i++) {
          const l = trainStep();
          lossHistory.push(l);
          trainingEpochs++;
        }
        drawBoundary(); drawLoss();
        if (trainingEpochs > 4000) stopAnim();
      }, 50);
    }

    // controls
    const hSlider = h('div', { class: 'slider-row' });
    const hVal = h('span', { class: 'val' }, String(H_units));
    const hSl  = h('input', { type: 'range', min: '1', max: '8', step: '1', value: H_units });
    hSl.addEventListener('input', () => {
      H_units = +hSl.value; hVal.textContent = String(H_units);
      initWeights(); lossHistory = []; trainingEpochs = 0;
      drawBoundary(); drawLoss();
    });
    hSlider.append(h('label', {}, 'hidden units H'), hSl, hVal);

    const lrSlider = h('div', { class: 'slider-row' });
    const lrVal = h('span', { class: 'val' }, lr.toFixed(2));
    const lrSl  = h('input', { type: 'range', min: '0.05', max: '2.0', step: '0.05', value: lr });
    lrSl.addEventListener('input', () => { lr = +lrSl.value; lrVal.textContent = lr.toFixed(2); });
    lrSlider.append(h('label', {}, 'learning rate η'), lrSl, lrVal);

    const buttons = h('div', { class: 'demo-controls' },
      h('button', { class: 'btn primary', onclick: startTrain }, '▶ Train'),
      h('button', { class: 'btn', onclick: stopAnim }, '⏸ Pause'),
      h('button', { class: 'btn', onclick: () => {
        const l = trainStep(); lossHistory.push(l); trainingEpochs++;
        drawBoundary(); drawLoss();
      } }, 'Step one batch'),
      h('button', { class: 'btn', onclick: () => {
        stopAnim(); initWeights(); lossHistory = []; trainingEpochs = 0;
        drawBoundary(); drawLoss();
      } }, '↻ Reset (new init)')
    );

    const help = h('div', { style: { fontSize: '12px', color: 'var(--amber-dim)', lineHeight: '1.6', padding: '10px 0' } });
    help.innerHTML =
      `<strong style="color:var(--amber-hi);">how to use:</strong> press <em>Train</em>. The shaded background
       is the network's current output across the input plane (blue = 0, orange = 1). The four XOR points sit
       on top. With H ≥ 2 the boundary curves and resolves XOR within a few hundred steps. With H = 1 it
       <em>cannot</em> — the network collapses to a single hyperplane. Reset to retry with a fresh random
       initialisation: some seeds get stuck.`;

    const root = wrap(
      'Train a small MLP to solve XOR',
      'Real stochastic gradient descent. The decision surface forms in front of you.'
    );
    const grid = h('div', { class: 'demo-grid-2' });
    grid.append(w1wrap, w2wrap);
    root.append(help, hSlider, lrSlider, buttons, grid);
    host.append(root);

    drawBoundary(); drawLoss();
  };

  // ============================================================
  // 4. CNN  —  apply a learnable filter to a small image
  // ============================================================
  Demos.cnn = function (host) {
    // a 20x20 'image' — a stylised arrow/digit
    const SZ = 20;
    const img = Array.from({ length: SZ }, () => new Array(SZ).fill(0.92));
    // draw a stylised "7" shape with anti-aliasing-like grey
    const setBlock = (r, c, v) => { if (r >= 0 && r < SZ && c >= 0 && c < SZ) img[r][c] = v; };
    for (let c = 3; c < 17; c++) setBlock(3, c, 0.1);
    for (let i = 0; i < 14; i++) {
      const r = 3 + i;
      const c = 17 - Math.floor(i * 0.9);
      setBlock(r, c, 0.1); setBlock(r, c - 1, 0.2);
    }

    const filters = {
      'vertical edge':   [[ 1, 0,-1], [ 1, 0,-1], [ 1, 0,-1]],
      'horizontal edge': [[ 1, 1, 1], [ 0, 0, 0], [-1,-1,-1]],
      'blur (mean)':     [[ 1/9, 1/9, 1/9], [ 1/9, 1/9, 1/9], [ 1/9, 1/9, 1/9]],
      'sharpen':         [[ 0,-1, 0], [-1, 5,-1], [ 0,-1, 0]],
      'identity':        [[ 0, 0, 0], [ 0, 1, 0], [ 0, 0, 0]],
    };
    let selected = 'vertical edge';

    function conv(image, K) {
      const kh = K.length, kw = K[0].length;
      const out = Array.from({ length: SZ - kh + 1 }, () => new Array(SZ - kw + 1).fill(0));
      for (let i = 0; i < out.length; i++) {
        for (let j = 0; j < out[0].length; j++) {
          let s = 0;
          for (let a = 0; a < kh; a++)
            for (let b = 0; b < kw; b++)
              s += K[a][b] * image[i + a][j + b];
          out[i][j] = s;
        }
      }
      return out;
    }

    function drawGrid(ctx, grid, w, h, opts = {}) {
      const cellW = w / grid[0].length;
      const cellH = h / grid.length;
      let lo = Infinity, hi = -Infinity;
      grid.forEach(r => r.forEach(v => { if (v < lo) lo = v; if (v > hi) hi = v; }));
      const range = (hi - lo) || 1;
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[0].length; j++) {
          const v = (grid[i][j] - lo) / range;
          const g = Math.round(lerp(255, 30, v));
          ctx.fillStyle = `rgb(${g},${g},${g})`;
          ctx.fillRect(j * cellW, i * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
      if (opts.grid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        for (let i = 1; i < grid.length; i++) {
          ctx.beginPath(); ctx.moveTo(0, i * cellH); ctx.lineTo(w, i * cellH); ctx.stroke();
        }
        for (let j = 1; j < grid[0].length; j++) {
          ctx.beginPath(); ctx.moveTo(j * cellW, 0); ctx.lineTo(j * cellW, h); ctx.stroke();
        }
      }
    }

    const W = 240, H = 240;
    const { wrap: w1, ctx: ctxIn  } = canvas(W, H, 'input image');
    const { wrap: w2, ctx: ctxOut } = canvas(W, H, 'after convolution');
    const { wrap: w3, ctx: ctxK   } = canvas(W, H, 'filter kernel');

    function repaint() {
      drawGrid(ctxIn, img, W, H, { grid: true });
      const out = conv(img, filters[selected]);
      drawGrid(ctxOut, out, W, H, { grid: false });
      const K = filters[selected];
      drawGrid(ctxK, K, W, H, { grid: true });
      // overlay numbers on kernel
      ctxK.fillStyle = '#b3622a';
      ctxK.font = 'bold 22px JetBrains Mono, monospace';
      ctxK.textAlign = 'center';
      const cellW = W / K[0].length, cellH = H / K.length;
      for (let i = 0; i < K.length; i++) {
        for (let j = 0; j < K[0].length; j++) {
          ctxK.fillStyle = K[i][j] > 0.5 ? '#faf7f1' : (Math.abs(K[i][j]) < 0.01 ? '#666' : '#b03a2e');
          ctxK.fillText(K[i][j].toFixed(2).replace(/\.?0+$/, ''), j * cellW + cellW / 2, i * cellH + cellH / 2 + 7);
        }
      }
    }

    const chips = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' } });
    Object.keys(filters).forEach(name => {
      const c = h('button', { class: 'chip' + (name === selected ? ' selected' : ''), type: 'button' }, name);
      c.addEventListener('click', () => {
        selected = name;
        chips.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        repaint();
      });
      chips.append(c);
    });

    const root = wrap(
      'Convolve a 3 × 3 filter across a small image',
      'The same 9 weights, slid across every position. Try the different filters — each one detects a different pattern.'
    );
    const grid3 = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } });
    grid3.append(w1, w3, w2);
    root.append(chips, grid3);
    host.append(root);
    repaint();
  };

  // ============================================================
  // 5. RNN  —  hidden-state evolution over a sentence
  // ============================================================
  Demos.rnn = function (host) {
    // a tiny fixed RNN with 4 hidden units, trained-by-hand to track sentiment
    // We use very small embeddings for a few words and a fixed transition.
    const VOCAB = {
      'the':   [ 0,  0,  0,  0],
      'movie': [ 0,  0,  0,  0],
      'was':   [ 0,  0,  0,  0],
      'good':  [ 0.9,  0.1,  0,  0],
      'great': [ 1.0,  0.2,  0,  0],
      'bad':   [-0.9,  0.1,  0,  0],
      'awful': [-1.0,  0.2,  0,  0],
      'not':   [ 0,    0,    1.0, 0],
      'really':[ 0.1,  0.1,  0,  0],
      'very':  [ 0.1,  0.1,  0,  0],
    };
    // Hidden update: h_t = tanh( Wx @ x + Wh @ h_{t-1} )
    // Hand-designed so that the third hidden unit ("negation flag") flips sentiment.
    function rnnRun(words) {
      let h = [0, 0, 0, 0];
      const trace = [{ word: '<start>', h: h.slice(), sentiment: 0 }];
      for (const w of words) {
        const x = VOCAB[w] || [0,0,0,0];
        // newH[0] = sentiment carry; if negation flag (h[2]) is on, invert incoming sentiment
        const sign = (h[2] > 0.5) ? -1 : 1;
        const newH = [
          tanh(0.9 * h[0] + sign * 1.4 * x[0]),     // running sentiment
          tanh(0.7 * h[1] + 1.2 * x[1]),            // intensity
          tanh(0.7 * h[2] + 1.5 * x[2]),            // negation flag, persists
          tanh(0.3 * h[3]),                          // decay
        ];
        h = newH;
        trace.push({ word: w, h: h.slice(), sentiment: h[0] * (1 + 0.5 * h[1]) });
      }
      return trace;
    }

    const sentences = [
      ['the','movie','was','good'],
      ['the','movie','was','not','good'],
      ['the','movie','was','really','great'],
      ['the','movie','was','not','bad'],
      ['the','movie','was','awful'],
    ];

    const root = wrap(
      'A tiny RNN tracking sentiment, word by word',
      'Each row shows the hidden state after the model reads one more word. Watch how "not" flips the running sentiment.'
    );

    const select = h('select', {
      style: { padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: '13px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: '3px' }
    });
    sentences.forEach((s, i) => select.append(h('option', { value: i }, '"' + s.join(' ') + '"')));

    const board = h('div', { style: { marginTop: '14px' } });

    function paint() {
      const trace = rnnRun(sentences[+select.value]);
      board.innerHTML = '';
      const labels = ['sentiment', 'intensity', 'negation', 'decay'];
      // header
      const head = h('div', { style: { display: 'grid', gridTemplateColumns: '110px repeat(4, 1fr) 110px', gap: '8px', fontSize: '11px', color: 'var(--ink-faded)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' } });
      head.append(h('div', {}, 'word'));
      labels.forEach(l => head.append(h('div', {}, 'h: ' + l)));
      head.append(h('div', { style: { textAlign: 'right' } }, 'output'));
      board.append(head);

      trace.forEach(step => {
        const row = h('div', {
          style: {
            display: 'grid', gridTemplateColumns: '110px repeat(4, 1fr) 110px',
            gap: '8px', alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed var(--rule)'
          }
        });
        row.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, step.word));
        step.h.forEach(v => {
          const bar = h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } });
          const track = h('div', { style: { flex: '1', height: '6px', background: 'var(--bg)', borderRadius: '3px', position: 'relative', overflow: 'hidden' } });
          const fill = h('div', {
            style: {
              position: 'absolute', top: 0, height: '100%',
              left: v >= 0 ? '50%' : (50 - Math.min(50, Math.abs(v) * 50)) + '%',
              width: Math.min(50, Math.abs(v) * 50) + '%',
              background: v >= 0 ? 'var(--accent)' : '#1f4e79'
            }
          });
          track.append(fill);
          bar.append(track, h('span', { style: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-faded)', minWidth: '38px', textAlign: 'right' } }, v.toFixed(2)));
          row.append(bar);
        });
        const out = step.sentiment;
        const verdict = Math.abs(out) < 0.1 ? 'neutral' : (out > 0 ? 'positive' : 'negative');
        row.append(h('div', {
          style: {
            textAlign: 'right',
            color: Math.abs(out) < 0.1 ? 'var(--ink-faded)' : (out > 0 ? 'var(--pos)' : 'var(--neg)'),
            fontFamily: 'var(--mono)', fontSize: '12px'
          }
        }, verdict));
        board.append(row);
      });
    }
    select.addEventListener('change', paint);

    root.append(h('div', { class: 'demo-controls' }, h('span', { class: 'muted', style: { fontFamily: 'var(--mono)', fontSize: '12px' } }, 'sentence:'), select));
    root.append(board);
    paint();
    host.append(root);
  };

  // ============================================================
  // 6. LSTM  —  gates over a subject-verb agreement sentence
  // ============================================================
  Demos.lstm = function (host) {
    // pre-cached "what the gates should look like" for a known sentence,
    // hand-designed to match the explanation in the math notes.
    const sentence = ['The','book','that','the','students','borrowed','from','the','library','was','interesting','.'];
    // forget_gate ~ how much of OLD memory we keep. For a model tracking the
    // subject's number, we want f≈1 across "that ... library", then dip a bit at "was".
    const forget = [0.4, 0.95, 0.85, 0.92, 0.92, 0.93, 0.94, 0.94, 0.94, 0.6, 0.7, 0.5];
    const input  = [0.6, 0.9,  0.2,  0.2,  0.3,  0.5,  0.2,  0.2,  0.4,  0.6, 0.8, 0.3];
    const output = [0.5, 0.7,  0.4,  0.4,  0.4,  0.5,  0.4,  0.4,  0.5,  0.95,0.9, 0.5];
    // "memory of singular subject" — set on "book", maintained, used at "was"
    const subjectMem = forget.reduce((acc, f, i) => {
      const prev = acc.length ? acc[acc.length - 1] : 0;
      const writeNow = (sentence[i] === 'book' || sentence[i] === 'book.') ? 1 : 0;
      const next = f * prev + input[i] * writeNow;
      acc.push(next);
      return acc;
    }, []);

    const root = wrap(
      'LSTM gates across a long-distance dependency',
      'The model must remember that the subject "book" is singular until it reaches "was". Watch how the forget gate stays near 1 across the relative clause.'
    );

    function bar(v, color) {
      const t = h('div', { style: { height: '6px', background: 'var(--bg)', borderRadius: '3px', position: 'relative', overflow: 'hidden', marginTop: '4px' } });
      t.append(h('div', { style: { position: 'absolute', top: 0, left: 0, height: '100%', width: (v * 100) + '%', background: color } }));
      return t;
    }

    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'auto repeat(' + sentence.length + ', 1fr)', gap: '4px', fontSize: '11px' } });
    const headers = ['', ...sentence];
    headers.forEach((w, i) => {
      grid.append(h('div', {
        style: {
          fontFamily: 'var(--mono)', textAlign: 'center', padding: '4px 2px',
          color: w === 'book' || w === 'was' ? 'var(--accent)' : 'var(--ink)',
          fontWeight: w === 'book' || w === 'was' ? 600 : 400,
          borderBottom: '1px solid var(--rule)'
        }
      }, w));
    });
    const labels = [
      ['forget gate fₜ',      forget,     '#b3622a'],
      ['input gate iₜ',       input,      '#1f4e79'],
      ['output gate oₜ',      output,     '#1f7a4d'],
      ['subject memory cₜ',   subjectMem, '#7a3a1f'],
    ];
    labels.forEach(([name, arr, color]) => {
      grid.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-faded)', textAlign: 'right', padding: '8px 8px 0 0' } }, name));
      arr.forEach((v, i) => {
        const cell = h('div', { style: { padding: '4px 2px' } });
        cell.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink-faded)', textAlign: 'center' } }, v.toFixed(2)));
        cell.append(bar(v, color));
        grid.append(cell);
      });
    });

    root.append(grid);

    const note = h('div', { class: 'narrative', style: { fontSize: '15px', marginTop: '16px' } });
    note.innerHTML = `
      <p>Notice the highlighted columns. When the model reads <strong>book</strong>,
      the input gate iₜ spikes to write subject-number information into the cell
      state. Through the relative clause "that the students borrowed from the
      library", the forget gate stays near 1, so that information is preserved.
      At <strong>was</strong>, the output gate opens and the stored subject
      becomes available to predict the verb — singular "was", not "were".</p>`;
    root.append(note);
    host.append(root);
  };

  // ============================================================
  // 7. EMBEDDINGS  —  Word2Vec analogy & nearest neighbours
  // ============================================================
  Demos.embeddings = function (host) {
    // Hand-crafted 2D embeddings for ~25 words. Designed so that:
    //   king - man + woman ≈ queen
    //   paris - france + germany ≈ berlin
    //   walked - walk + run ≈ ran
    const E = {
      // gender axis ~ x, royalty axis ~ y
      king:   [ 0.7,  0.9],
      queen:  [-0.7,  0.9],
      man:    [ 0.8,  0.0],
      woman:  [-0.8,  0.0],
      boy:    [ 0.7, -0.5],
      girl:   [-0.7, -0.5],
      prince: [ 0.5,  0.7],
      princess:[-0.5, 0.7],
      // separate cluster, country/capital
      paris:    [ 2.4,  1.5],
      france:   [ 2.4,  2.4],
      berlin:   [ 3.4,  1.5],
      germany:  [ 3.4,  2.4],
      tokyo:    [ 4.4,  1.5],
      japan:    [ 4.4,  2.4],
      // animals cluster
      dog:    [ 2.0, -2.2],
      cat:    [ 1.6, -2.0],
      puppy:  [ 2.2, -2.6],
      kitten: [ 1.8, -2.4],
      // food cluster
      apple:  [-2.2, -2.0],
      orange: [-1.9, -2.1],
      banana: [-2.1, -2.4],
    };
    const words = Object.keys(E);

    const root = wrap(
      'A word embedding space',
      'Words living near each other share meaning. Click a word to see its closest neighbours, or run the analogy below.'
    );

    // -- 2D scatter --
    const W = 480, H = 360;
    const { wrap: cwrap, canvas: cv, ctx } = canvas(W, H, 'embedding space');
    let highlighted = null;
    let arrow = null;   // {from, to}

    function tx(x) { return 30 + (x + 3) / 8.5 * (W - 60); }
    function ty(y) { return H - (30 + (y + 3) / 6 * (H - 60)); }

    function repaint() {
      ctx.fillStyle = '#faf7f1'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#e8e1cf';
      for (let i = 1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(i * W / 6, 0); ctx.lineTo(i * W / 6, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * H / 6); ctx.lineTo(W, i * H / 6); ctx.stroke();
      }
      // arrow (analogy result)
      if (arrow) {
        const a = { x: tx(arrow.from[0]), y: ty(arrow.from[1]) };
        const b = { x: tx(arrow.to[0]),   y: ty(arrow.to[1]) };
        ctx.strokeStyle = '#b3622a'; ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
        // arrowhead
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.fillStyle = '#b3622a';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 9 * Math.cos(ang - 0.3), b.y - 9 * Math.sin(ang - 0.3));
        ctx.lineTo(b.x - 9 * Math.cos(ang + 0.3), b.y - 9 * Math.sin(ang + 0.3));
        ctx.closePath(); ctx.fill();
      }
      // points
      words.forEach(w => {
        const [x, y] = E[w];
        const isHi = highlighted === w;
        ctx.fillStyle = isHi ? '#b3622a' : '#4a463f';
        ctx.beginPath(); ctx.arc(tx(x), ty(y), isHi ? 5 : 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isHi ? '#b3622a' : '#1a1815';
        ctx.font = (isHi ? 'bold ' : '') + '12px JetBrains Mono, monospace';
        ctx.fillText(w, tx(x) + 7, ty(y) + 4);
      });
    }

    // hover -> highlight
    cv.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (W / r.width);
      const my = (e.clientY - r.top) * (H / r.height);
      let best = null, bestD = 20;
      words.forEach(w => {
        const dx = tx(E[w][0]) - mx;
        const dy = ty(E[w][1]) - my;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < bestD) { bestD = d; best = w; }
      });
      if (best !== highlighted) { highlighted = best; repaint(); updateInfo(); }
    });

    // ----- info panel -----
    const info = h('div', { style: { marginTop: '14px', fontFamily: 'var(--mono)', fontSize: '13px', minHeight: '90px' } });
    function cosine(a, b) {
      const dp = a[0]*b[0] + a[1]*b[1];
      const na = Math.sqrt(a[0]*a[0] + a[1]*a[1]);
      const nb = Math.sqrt(b[0]*b[0] + b[1]*b[1]);
      return dp / (na * nb || 1);
    }
    function updateInfo() {
      info.innerHTML = '';
      if (!highlighted) {
        info.append(h('div', { class: 'muted', style: { fontStyle: 'italic', fontFamily: 'var(--serif)' } }, 'Hover a word to see its nearest neighbours.'));
        return;
      }
      const v = E[highlighted];
      const dists = words
        .filter(w => w !== highlighted)
        .map(w => ({ word: w, cos: cosine(v, E[w]) }))
        .sort((a, b) => b.cos - a.cos)
        .slice(0, 5);
      info.append(h('div', { style: { color: 'var(--accent)', marginBottom: '6px' } },
        `nearest to "${highlighted}":`));
      dists.forEach(d => {
        info.append(h('div', {},
          `  ${d.word.padEnd(10)} cos = ${d.cos.toFixed(3)}`));
      });
    }
    updateInfo();

    // ----- analogy section -----
    const analogyRow = h('div', { class: 'demo-controls', style: { marginTop: '20px' } });
    function pickSelect(label, def) {
      const s = h('select', { style: { padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: '13px', background: 'var(--bg)', border: '1px solid var(--rule)' } });
      words.forEach(w => s.append(h('option', { value: w, selected: w === def ? '' : null }, w)));
      return s;
    }
    const sA = pickSelect('a', 'king');
    const sB = pickSelect('b', 'man');
    const sC = pickSelect('c', 'woman');
    const resultBox = h('span', { style: { fontFamily: 'var(--mono)', fontSize: '14px', color: 'var(--accent)' } }, '?');
    function runAnalogy() {
      const a = E[sA.value], b = E[sB.value], c = E[sC.value];
      const target = [a[0] - b[0] + c[0], a[1] - b[1] + c[1]];
      const excl = new Set([sA.value, sB.value, sC.value]);
      const dists = words
        .filter(w => !excl.has(w))
        .map(w => ({ word: w, cos: cosine(target, E[w]) }))
        .sort((a, b) => b.cos - a.cos);
      const best = dists[0];
      resultBox.textContent = best.word + ' (cos = ' + best.cos.toFixed(3) + ')';
      arrow = { from: E[sC.value], to: E[best.word] };
      repaint();
    }
    analogyRow.append(
      sA, h('span', { class: 'muted' }, ' − '),
      sB, h('span', { class: 'muted' }, ' + '),
      sC, h('span', { class: 'muted' }, ' ≈ '),
      resultBox,
      h('button', { class: 'btn primary', onclick: runAnalogy }, 'Compute')
    );

    root.append(cwrap, info, analogyRow);
    repaint();
    host.append(root);
  };

  // ============================================================
  // 8. ATTENTION  —  pick a token, see its attention weights
  // ============================================================
  Demos.attention = function (host) {
    const sentences = {
      'The animal didn\'t cross the street because it was tired.': {
        // for each token, attention weights TO every other token (hand-crafted)
        focusToken: 8,    // "it"
        tokens: ['The','animal','didn\'t','cross','the','street','because','it','was','tired','.'],
        // scores: indexed by target token (token i attends to these)
        scores: {
          8: [0.1, 3.2, 0.2, 0.4, 0.1, 1.0, 0.6, 0.0, 0.7, 0.9, 0.0],   // "it" → mostly "animal"
        }
      },
      'The trophy didn\'t fit in the suitcase because it was too big.': {
        focusToken: 8,
        tokens: ['The','trophy','didn\'t','fit','in','the','suitcase','because','it','was','too','big','.'],
        scores: {
          8: [0.1, 2.8, 0.2, 0.3, 0.1, 0.1, 1.0, 0.4, 0.0, 0.6, 0.4, 2.4, 0.0],  // "it" → "trophy" / "big"
        }
      },
      'The bank was closed because the river had flooded.': {
        focusToken: 1,
        tokens: ['The','bank','was','closed','because','the','river','had','flooded','.'],
        scores: {
          1: [0.1, 0.0, 0.6, 0.5, 0.4, 0.1, 2.6, 0.3, 1.5, 0.0],  // "bank" → "river" / "flooded"
        }
      }
    };

    const root = wrap(
      'Click a token to see what it attends to',
      'Attention weights are formed by softmax over relevance scores. Note how "it" disambiguates by looking at its referent.'
    );

    let selectedSentence = Object.keys(sentences)[0];
    let temperature = 1.0;
    let focusedToken = sentences[selectedSentence].focusToken;

    // sentence selector
    const select = h('select', {
      style: { padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: '13px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: '3px', flex: '1' }
    });
    Object.keys(sentences).forEach(s => select.append(h('option', { value: s }, '"' + s + '"')));
    select.addEventListener('change', () => {
      selectedSentence = select.value;
      focusedToken = sentences[selectedSentence].focusToken;
      repaint();
    });

    // temperature slider
    const tempRow = h('div', { class: 'slider-row' });
    const tempVal = h('span', { class: 'val' }, '1.0');
    const slider  = h('input', { type: 'range', min: '0.2', max: '3.0', step: '0.1', value: '1.0' });
    slider.addEventListener('input', () => {
      temperature = parseFloat(slider.value);
      tempVal.textContent = temperature.toFixed(1);
      repaint();
    });
    tempRow.append(h('label', {}, 'softmax T'), slider, tempVal);

    const tokensRow = h('div', { style: { marginTop: '16px', lineHeight: '2.4' } });
    const summary   = h('div', { style: { marginTop: '14px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-faded)' } });

    function repaint() {
      const data = sentences[selectedSentence];
      const tokens = data.tokens;
      const scores = data.scores[focusedToken] || tokens.map(() => 0);
      const weights = softmax(scores, temperature);

      tokensRow.innerHTML = '';
      tokens.forEach((tok, i) => {
        const w = weights[i];
        const tspan = h('span', {
          class: 'token attn-tok',
          style: {
            background: i === focusedToken
              ? 'var(--ink)'
              : `rgba(179, 98, 42, ${0.05 + w * 1.5})`,
            color: i === focusedToken ? 'var(--bg)' : 'var(--ink)',
            cursor: 'pointer',
            borderColor: i === focusedToken ? 'var(--ink)' : 'var(--rule)'
          }
        }, tok);
        // attention strength bar under each token
        const bar = h('div', { class: 'bar', style: { width: (w * 100) + '%' } });
        tspan.append(bar);
        tspan.addEventListener('click', () => { focusedToken = i; repaint(); });
        tokensRow.append(tspan);
      });
      // summary
      const sorted = weights
        .map((w, i) => ({ tok: tokens[i], w, i }))
        .filter(o => o.i !== focusedToken)
        .sort((a, b) => b.w - a.w);
      summary.innerHTML = `<span style="color:var(--accent)">${tokens[focusedToken]}</span> attends most to: `
        + sorted.slice(0, 3).map(o => `${o.tok} (${(o.w * 100).toFixed(1)}%)`).join(', ');
    }

    root.append(
      h('div', { class: 'demo-controls' }, h('span', { class: 'muted', style: { fontFamily: 'var(--mono)', fontSize: '12px' } }, 'sentence:'), select),
      tempRow,
      tokensRow,
      summary
    );
    repaint();
    host.append(root);
  };

  // ============================================================
  // 9. TRANSFORMER  —  multi-head self-attention matrix
  // ============================================================
  Demos.transformer = function (host) {
    const tokens = ['The','quick','brown','fox','jumps','over','the','lazy','dog','.'];
    const T = tokens.length;

    // four hand-designed attention patterns to show what different heads learn
    const heads = {
      'head 1: previous token': (i, j) => (j === Math.max(0, i - 1)) ? 3 : (j === i ? 1 : -0.5),
      'head 2: subject-verb':   (i, j) => (i === 4 && j === 3) ? 3 : (i === 4 && j === 0) ? 2 : (i === j ? 1 : -0.2),
      'head 3: object/det':     (i, j) => (i === 7 && j === 8) ? 3 : (i === 1 && j === 2) ? 2 : (i === j ? 1 : -0.2),
      'head 4: distant lookup': (i, j) => (j === 0) ? 1.5 + Math.random() * 0.2 : (i === j ? 1 : -0.3),
    };
    let selectedHead = 'head 1: previous token';

    const root = wrap(
      'Multi-head self-attention on one sentence',
      'Each head learns a different relevance pattern. Switch heads to see how they specialise.'
    );

    const chips = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' } });
    Object.keys(heads).forEach(name => {
      const c = h('button', { class: 'chip' + (name === selectedHead ? ' selected' : ''), type: 'button' }, name);
      c.addEventListener('click', () => {
        selectedHead = name;
        chips.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        repaint();
      });
      chips.append(c);
    });

    const W = 480, H = 480;
    const { wrap: cwrap, canvas: cv, ctx } = canvas(W, H, 'attention matrix QK⊤ → softmax → weights');

    function repaint() {
      const matrix = [];
      for (let i = 0; i < T; i++) {
        const row = [];
        for (let j = 0; j < T; j++) row.push(heads[selectedHead](i, j));
        matrix.push(softmax(row, 0.7));
      }
      ctx.fillStyle = '#faf7f1'; ctx.fillRect(0, 0, W, H);
      const pad = 70;
      const cell = (W - pad) / T;
      // draw heatmap
      for (let i = 0; i < T; i++) {
        for (let j = 0; j < T; j++) {
          const v = matrix[i][j];
          const alpha = Math.min(1, v * 2);
          ctx.fillStyle = `rgba(179, 98, 42, ${alpha})`;
          ctx.fillRect(pad + j * cell, pad + i * cell, cell - 1, cell - 1);
          if (alpha > 0.4) {
            ctx.fillStyle = '#faf7f1';
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(v.toFixed(2), pad + j * cell + cell / 2, pad + i * cell + cell / 2 + 3);
          }
        }
      }
      // labels
      ctx.fillStyle = '#1a1815';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      for (let i = 0; i < T; i++) {
        ctx.fillText(tokens[i], pad - 6, pad + i * cell + cell / 2 + 4);
      }
      ctx.textAlign = 'center';
      ctx.save();
      for (let j = 0; j < T; j++) {
        ctx.save();
        ctx.translate(pad + j * cell + cell / 2, pad - 6);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(tokens[j], 0, 0);
        ctx.restore();
      }
      ctx.restore();
      // axis labels
      ctx.fillStyle = 'var(--ink-faded)';
      ctx.font = 'italic 11px EB Garamond';
      ctx.textAlign = 'center';
      ctx.fillText('key (attended-to token)', pad + (W - pad) / 2, pad - 50);
      ctx.save();
      ctx.translate(pad - 50, pad + (H - pad) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('query (attending token)', 0, 0);
      ctx.restore();
    }

    repaint();
    root.append(chips, cwrap);
    host.append(root);
  };

  // ============================================================
  // 10. BERT  —  masked language model
  // ============================================================
  Demos.bert = function (host) {
    // pre-cached top-5 predictions for several masked sentences
    const examples = {
      'The capital of France is ___.': ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nice'],
      'The student submitted the ___ before the deadline.': ['paper', 'assignment', 'report', 'thesis', 'essay'],
      'The cat sat on the ___.': ['mat', 'floor', 'sofa', 'chair', 'bed'],
      'I drank a cup of hot ___ this morning.': ['coffee', 'tea', 'chocolate', 'cocoa', 'milk'],
      'The bank was closed because of the heavy ___.': ['rain', 'snow', 'fog', 'flooding', 'storm'],
      'My favourite programming language is ___.': ['Python', 'JavaScript', 'Java', 'C++', 'Rust'],
    };
    // simulated probabilities (descending)
    const probs = [0.52, 0.18, 0.11, 0.08, 0.04];

    const root = wrap(
      'Masked language modelling — BERT-style',
      'BERT learns to fill in the blanks using both left and right context. Choose a sentence, see the top candidates.'
    );

    const select = h('select', {
      style: { padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: '13px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: '3px', width: '100%' }
    });
    Object.keys(examples).forEach(s => select.append(h('option', { value: s }, s)));

    const masked = h('div', {
      style: { fontFamily: 'var(--serif)', fontSize: '22px', lineHeight: '1.4', padding: '20px 0', textAlign: 'center' }
    });

    const candList = h('div', { style: { marginTop: '14px' } });

    function paint() {
      const sentence = select.value;
      const cands = examples[sentence];
      masked.innerHTML = sentence.replace('___', '<span style="background:var(--accent-bg); color:var(--accent); padding:2px 12px; border:1px dashed var(--accent); border-radius:3px;">[MASK]</span>');

      candList.innerHTML = '';
      candList.append(h('div', {
        style: { fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faded)', marginBottom: '10px' }
      }, 'top-5 BERT predictions'));

      cands.forEach((w, i) => {
        const row = h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' } });
        row.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px', minWidth: '120px', color: i === 0 ? 'var(--accent)' : 'var(--ink)' } }, w));
        const track = h('div', { style: { flex: '1', height: '8px', background: 'var(--bg)', borderRadius: '4px', position: 'relative', overflow: 'hidden' } });
        track.append(h('div', { style: { position: 'absolute', top: 0, left: 0, height: '100%', width: (probs[i] * 100) + '%', background: i === 0 ? 'var(--accent)' : 'var(--accent-soft)' } }));
        row.append(track);
        row.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '12px', minWidth: '50px', textAlign: 'right', color: 'var(--ink-faded)' } }, (probs[i] * 100).toFixed(1) + '%'));
        candList.append(row);
      });
    }
    select.addEventListener('change', paint);

    root.append(select, masked, candList);
    paint();
    host.append(root);
  };

  // ============================================================
  // 11. GPT  —  bigram next-token predictor
  // ============================================================
  Demos.gpt = function (host) {
    const corpus = `the cat sat on the mat the cat ran after the mouse the dog chased the cat the cat ran away the dog barked at the cat the cat hissed the dog ran the mouse hid the cat slept the dog slept the mouse came out the cat woke up the cat saw the mouse the cat chased the mouse the mouse ran the cat caught the mouse`;
    const words = corpus.split(/\s+/);

    // build bigram counts
    const counts = {};
    for (let i = 0; i < words.length - 1; i++) {
      const a = words[i], b = words[i+1];
      counts[a] = counts[a] || {};
      counts[a][b] = (counts[a][b] || 0) + 1;
    }
    function nextDistribution(w, temperature) {
      const c = counts[w];
      if (!c) return null;
      const tokens = Object.keys(c);
      const logits = tokens.map(t => Math.log(c[t]));
      const probs = softmax(logits, temperature);
      return tokens.map((t, i) => ({ token: t, p: probs[i] }));
    }
    function sample(dist) {
      const r = Math.random();
      let cum = 0;
      for (const d of dist) {
        cum += d.p;
        if (r < cum) return d.token;
      }
      return dist[dist.length - 1].token;
    }

    const root = wrap(
      'A character-of-the-corpus bigram model — GPT in miniature',
      'Trained on the toy corpus shown below. Adjust temperature, press generate, watch sampling fan out.'
    );

    const corpusBox = h('div', {
      style: { padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: '12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: '3px', color: 'var(--ink-faded)', lineHeight: '1.6' }
    }, corpus);

    let temperature = 1.0;
    const tempRow = h('div', { class: 'slider-row' });
    const tempVal = h('span', { class: 'val' }, '1.0');
    const slider  = h('input', { type: 'range', min: '0.2', max: '2.0', step: '0.1', value: '1.0' });
    slider.addEventListener('input', () => { temperature = +slider.value; tempVal.textContent = temperature.toFixed(1); paintDist(); });
    tempRow.append(h('label', {}, 'temperature'), slider, tempVal);

    const seedRow = h('div', { class: 'demo-controls' });
    let seed = 'the';
    const seedSel = h('select', { style: { padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: '13px', background: 'var(--bg)', border: '1px solid var(--rule)' } });
    ['the','cat','dog','mouse'].forEach(w => seedSel.append(h('option', { value: w }, w)));
    seedSel.addEventListener('change', () => { seed = seedSel.value; paintDist(); });
    seedRow.append(h('span', { class: 'muted', style: { fontFamily: 'var(--mono)', fontSize: '12px' } }, 'seed word:'), seedSel);

    const distBox = h('div', { style: { padding: '12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: '3px', minHeight: '120px', marginTop: '10px' } });
    function paintDist() {
      distBox.innerHTML = '';
      const dist = nextDistribution(seed, temperature);
      if (!dist) {
        distBox.append(h('div', { class: 'muted' }, '(no continuations seen for "' + seed + '")'));
        return;
      }
      distBox.append(h('div', {
        style: { fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faded)', marginBottom: '8px' }
      }, 'P(next | "' + seed + '")'));
      dist.sort((a, b) => b.p - a.p);
      dist.forEach(d => {
        const row = h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 0' } });
        row.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px', minWidth: '70px' } }, d.token));
        const tr = h('div', { style: { flex: '1', height: '6px', background: 'var(--bg-soft)', borderRadius: '3px', position: 'relative', overflow: 'hidden' } });
        tr.append(h('div', { style: { position: 'absolute', top: 0, left: 0, height: '100%', width: (d.p * 100) + '%', background: 'var(--accent)' } }));
        row.append(tr);
        row.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '11px', minWidth: '50px', textAlign: 'right', color: 'var(--ink-faded)' } }, (d.p * 100).toFixed(1) + '%'));
        distBox.append(row);
      });
    }

    const genBox = h('div', { style: { marginTop: '10px', padding: '14px 18px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: '3px', fontFamily: 'var(--serif)', fontSize: '17px', minHeight: '60px', lineHeight: '1.6' } });
    function generate() {
      const out = [seed];
      for (let i = 0; i < 30; i++) {
        const dist = nextDistribution(out[out.length - 1], temperature);
        if (!dist) break;
        out.push(sample(dist));
      }
      genBox.textContent = out.join(' ');
    }

    root.append(
      h('div', { style: { marginBottom: '10px', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faded)' } }, 'training corpus'),
      corpusBox,
      seedRow,
      tempRow,
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' } }, distBox,
        h('div', {},
          h('div', { style: { fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faded)', marginBottom: '8px' } }, 'sampled continuation'),
          genBox,
          h('div', { class: 'demo-controls' }, h('button', { class: 'btn primary', onclick: generate }, '↻ Generate'))
        )
      )
    );

    paintDist();
    host.append(root);
  };

  // ============================================================
  // 12. SCALING LAWS  —  log-log plot of L(N)
  // ============================================================
  Demos.scaling = function (host) {
    const root = wrap(
      'Scaling laws: how loss falls with model size',
      'Adjust α and the model size N. On the log–log plot, a power law becomes a straight line.'
    );

    let alpha = 0.1;
    let logN = 9;       // 10^9 = 1B params
    const L_inf = 1.5;
    const a = 50;

    const tempRow1 = h('div', { class: 'slider-row' });
    const val1 = h('span', { class: 'val' }, alpha.toFixed(2));
    const sl1  = h('input', { type: 'range', min: '0.02', max: '0.3', step: '0.01', value: alpha });
    sl1.addEventListener('input', () => { alpha = +sl1.value; val1.textContent = alpha.toFixed(2); paint(); });
    tempRow1.append(h('label', {}, 'exponent α'), sl1, val1);

    const tempRow2 = h('div', { class: 'slider-row' });
    const val2 = h('span', { class: 'val' }, '10^' + logN);
    const sl2  = h('input', { type: 'range', min: '6', max: '12', step: '0.1', value: logN });
    sl2.addEventListener('input', () => { logN = +sl2.value; val2.textContent = '10^' + logN.toFixed(1); paint(); });
    tempRow2.append(h('label', {}, 'log₁₀(N)'), sl2, val2);

    const { wrap: cwrap, canvas: cv, ctx } = canvas(560, 320, 'loss vs. model size (log–log)');

    function paint() {
      const W = 560, H = 320;
      ctx.fillStyle = '#faf7f1'; ctx.fillRect(0, 0, W, H);
      // axes (log10 N from 6 to 12, log10 (L-L_inf) from -2 to 2)
      const x0 = 60, y0 = 40, wPlot = W - 90, hPlot = H - 80;
      ctx.strokeStyle = '#a09787'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + hPlot); ctx.lineTo(x0 + wPlot, y0 + hPlot); ctx.stroke();
      // gridlines + tick labels
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#8a8479';
      for (let lN = 6; lN <= 12; lN++) {
        const px = x0 + (lN - 6) / 6 * wPlot;
        ctx.strokeStyle = '#e8e1cf';
        ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + hPlot); ctx.stroke();
        ctx.fillStyle = '#8a8479'; ctx.textAlign = 'center';
        ctx.fillText('10^' + lN, px, y0 + hPlot + 16);
      }
      for (let lL = -2; lL <= 2; lL++) {
        const py = y0 + hPlot - (lL + 2) / 4 * hPlot;
        ctx.strokeStyle = '#e8e1cf';
        ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x0 + wPlot, py); ctx.stroke();
        ctx.fillStyle = '#8a8479'; ctx.textAlign = 'right';
        ctx.fillText('10^' + lL, x0 - 6, py + 4);
      }
      // axis labels
      ctx.fillStyle = 'var(--ink-faded)';
      ctx.font = 'italic 12px EB Garamond';
      ctx.textAlign = 'center';
      ctx.fillText('model size N (log scale)', x0 + wPlot / 2, H - 8);
      ctx.save();
      ctx.translate(16, y0 + hPlot / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('L(N) − L∞  (log scale)', 0, 0);
      ctx.restore();

      // power law curve: log(L - L_inf) = log(a) - alpha * log(N)
      ctx.strokeStyle = '#b3622a'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const lN = 6 + (i / 100) * 6;
        const lL = Math.log10(a) - alpha * lN;
        const px = x0 + (lN - 6) / 6 * wPlot;
        const py = y0 + hPlot - (lL + 2) / 4 * hPlot;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // current point
      const lL_now = Math.log10(a) - alpha * logN;
      const px = x0 + (logN - 6) / 6 * wPlot;
      const py = y0 + hPlot - (lL_now + 2) / 4 * hPlot;
      ctx.fillStyle = '#b3622a';
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#faf7f1'; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle = '#1a1815';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `N = 10^${logN.toFixed(1)}, L − L∞ ≈ ${Math.pow(10, lL_now).toFixed(3)}`,
        px + 12, py - 8
      );
    }

    const factRow = h('div', { class: 'info-row' });
    function updateFacts() {
      factRow.innerHTML = '';
      const ratio = Math.pow(10, -alpha);
      const ratio100 = Math.pow(100, -alpha);
      factRow.append(
        h('div', { class: 'cell' },
          h('div', { class: 'k' }, '10× larger model'),
          h('div', { class: 'v' }, 'loss × ' + ratio.toFixed(2))),
        h('div', { class: 'cell' },
          h('div', { class: 'k' }, '100× larger model'),
          h('div', { class: 'v' }, 'loss × ' + ratio100.toFixed(2)))
      );
    }

    function refresh() { paint(); updateFacts(); }
    sl1.addEventListener('input', updateFacts);

    root.append(tempRow1, tempRow2, cwrap, factRow);
    refresh();
    host.append(root);

    // re-attach listeners that also update facts on change
    sl1.removeEventListener('input', updateFacts); // (defensive: no-op if not present)
    sl1.addEventListener('input', updateFacts);
  };

  // ============================================================
  // 13. RLHF  —  base model vs. aligned model
  // ============================================================
  Demos.rlhf = function (host) {
    const examples = [
      {
        prompt: 'How do I bake a chocolate cake?',
        base: 'How do I bake a chocolate cake? I have never made one before and I want to try this weekend. Any tips would be appreciated. I also want to know what kind of chocolate to use.',
        aligned: `Here's a simple chocolate cake recipe:

Ingredients: 1¾ cup flour, 1¾ cup sugar, ¾ cup cocoa powder, 1½ tsp baking powder, 1½ tsp baking soda, 1 tsp salt, 2 eggs, 1 cup milk, ½ cup oil, 2 tsp vanilla, 1 cup hot water.

Method: Mix dry ingredients. Add wet ingredients (except water) and beat for 2 minutes. Stir in hot water — the batter will be thin. Bake at 350°F (175°C) for 30–35 minutes. Cool before frosting.`,
      },
      {
        prompt: 'Write code to sort a list of numbers.',
        base: 'Write code to sort a list of numbers. In what language? Are you sure you want the fastest, or just something simple? What size of list are we talking about?',
        aligned: `Here's a clean Python example:

\`\`\`python
def sort_numbers(nums):
    return sorted(nums)

print(sort_numbers([3, 1, 4, 1, 5, 9, 2, 6]))
# -> [1, 1, 2, 3, 4, 5, 6, 9]
\`\`\`

If you'd like to implement a sort yourself, quicksort or mergesort are good starting points — say the word and I'll write one out.`,
      },
      {
        prompt: 'Is the Earth flat?',
        base: 'Is the Earth flat? Many people on the internet claim it is. There is a lot of debate. Some say yes, some say no.',
        aligned: 'No — the Earth is approximately a sphere (more precisely, an oblate spheroid). This is established by satellite imagery, the curvature visible from high altitude, the way ships disappear hull-first over the horizon, the way time zones work, gravity measurements, and direct measurement by GPS and geodesy. The flat-Earth claim is not supported by any consistent line of evidence.',
      },
    ];

    const root = wrap(
      'Same prompt, two policies',
      'Left: a base model trained only to predict plausible text. Right: the same model after instruction-tuning and RLHF.'
    );

    let idx = 0;
    const promptChips = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' } });
    examples.forEach((ex, i) => {
      const c = h('button', { class: 'chip' + (i === idx ? ' selected' : ''), type: 'button' }, '"' + ex.prompt.slice(0, 38) + (ex.prompt.length > 38 ? '…' : '') + '"');
      c.addEventListener('click', () => {
        idx = i;
        promptChips.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        paint();
      });
      promptChips.append(c);
    });

    const promptBox = h('div', { style: { textAlign: 'center', fontFamily: 'var(--serif)', fontSize: '18px', fontStyle: 'italic', margin: '12px 0 18px', color: 'var(--ink-soft)' } });

    const cols = h('div', { class: 'demo-grid-2' });
    const colBase = h('div', { style: { padding: '18px', background: 'var(--bg)', border: '1px solid var(--rule)', borderRadius: '3px' } });
    const colAlg  = h('div', { style: { padding: '18px', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: '3px' } });
    cols.append(colBase, colAlg);

    function paint() {
      const ex = examples[idx];
      promptBox.textContent = '"' + ex.prompt + '"';
      colBase.innerHTML =
        `<div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-faded);margin-bottom:10px;">base GPT (pretrained only)</div>
         <div style="font-family:var(--serif);font-size:15px;line-height:1.55;white-space:pre-wrap;">${ex.base}</div>`;
      colAlg.innerHTML =
        `<div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;">after SFT + RLHF</div>
         <div style="font-family:var(--serif);font-size:15px;line-height:1.55;white-space:pre-wrap;">${ex.aligned}</div>`;
    }

    root.append(promptChips, promptBox, cols);
    paint();
    host.append(root);
  };

  // ============================================================
  // 14. GPT-4  —  ReAct-style tool-use trace
  // ============================================================
  Demos.gpt4 = function (host) {
    const examples = [
      {
        question: 'What is 17 × 23, and is the result prime?',
        steps: [
          { kind: 'thought',     text: 'I need to compute 17 × 23, then check primality.' },
          { kind: 'action',      text: 'calculator("17 * 23")' },
          { kind: 'observation', text: '391' },
          { kind: 'thought',     text: '391 = 17 × 23 by construction, so it has at least two non-trivial factors. Not prime.' },
          { kind: 'final',       text: '17 × 23 = 391. It is not prime (391 = 17 × 23).' }
        ]
      },
      {
        question: 'I have $1,000 in a 5% APY account. How much do I have after 7 years?',
        steps: [
          { kind: 'thought',     text: 'Compound interest: A = P(1 + r)^t with P=1000, r=0.05, t=7.' },
          { kind: 'action',      text: 'calculator("1000 * (1 + 0.05) ** 7")' },
          { kind: 'observation', text: '1407.10' },
          { kind: 'final',       text: 'About $1,407.10 — a gain of $407 over 7 years.' }
        ]
      },
      {
        question: 'Summarise the abstract of the Transformer paper.',
        steps: [
          { kind: 'thought',     text: 'I should fetch the abstract of Vaswani et al. 2017.' },
          { kind: 'action',      text: 'web_search("Attention Is All You Need abstract")' },
          { kind: 'observation', text: '"...We propose a new simple network architecture, the Transformer, based solely on attention mechanisms..."' },
          { kind: 'thought',     text: 'Now I can summarise.' },
          { kind: 'final',       text: 'The paper introduces the Transformer, a sequence-to-sequence architecture that replaces recurrence and convolution with attention alone. It enables more parallelism, trains faster, and outperforms prior models on WMT translation benchmarks.' }
        ]
      },
    ];

    const root = wrap(
      'A GPT-4 style tool-use loop',
      'Watch the model think, call a tool, observe the result, and decide what to do next.'
    );

    let idx = 0;
    const chips = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' } });
    examples.forEach((ex, i) => {
      const c = h('button', { class: 'chip' + (i === idx ? ' selected' : ''), type: 'button' }, '"' + ex.question.slice(0, 38) + (ex.question.length > 38 ? '…' : '') + '"');
      c.addEventListener('click', () => {
        idx = i;
        chips.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        run();
      });
      chips.append(c);
    });

    const transcript = h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px', lineHeight: '1.55', marginTop: '14px' } });

    function step(kind, text) {
      const color = {
        thought:    'var(--ink-soft)',
        action:     '#1f4e79',
        observation:'var(--accent)',
        final:      'var(--pos)'
      }[kind];
      const label = {
        thought:    'Thought',
        action:     'Action',
        observation:'Observation',
        final:      'Final answer'
      }[kind];
      const block = h('div', { style: { marginBottom: '10px', opacity: 0, transform: 'translateY(6px)', transition: 'all 0.4s ease' } });
      block.append(
        h('div', { style: { fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color, marginBottom: '2px' } }, label),
        h('div', { style: { padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--rule)', borderLeft: '2px solid ' + color, borderRadius: '2px' } }, text)
      );
      return block;
    }

    function run() {
      transcript.innerHTML = '';
      const ex = examples[idx];
      transcript.append(h('div', { style: { padding: '10px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: '3px', marginBottom: '14px', color: 'var(--ink)' } }, 'Question: ' + ex.question));
      ex.steps.forEach((s, i) => {
        const block = step(s.kind, s.text);
        transcript.append(block);
        setTimeout(() => { block.style.opacity = 1; block.style.transform = 'translateY(0)'; }, 100 + i * 380);
      });
    }

    root.append(chips, transcript);
    run();
    host.append(root);
  };

  // ============================================================
  // 15. OPEN-SOURCE LLMS  —  comparison cards
  // ============================================================
  Demos.opensource = function (host) {
    const models = [
      { name: 'LLaMA',      org: 'Meta',      year: 2023, params: '7B – 65B',  context: '2K',  license: 'research only (initial)', note: 'Sparked the modern open-LLM ecosystem.' },
      { name: 'LLaMA 2',    org: 'Meta',      year: 2023, params: '7B – 70B',  context: '4K',  license: 'commercial-friendly',     note: 'First major frontier-class model with permissive licence.' },
      { name: 'Mistral 7B', org: 'Mistral',   year: 2023, params: '7B',        context: '8K',  license: 'Apache 2.0',              note: 'Sliding-window attention + grouped-query attention.' },
      { name: 'Mixtral 8x7B',org: 'Mistral',  year: 2023, params: '47B (MoE)', context: '32K', license: 'Apache 2.0',              note: 'Mixture-of-experts: only 13B active per token.' },
      { name: 'Falcon',     org: 'TII (UAE)', year: 2023, params: '7B – 180B', context: '2K',  license: 'Apache 2.0',              note: 'Top of the Open LLM Leaderboard in mid-2023.' },
      { name: 'BLOOM',      org: 'BigScience',year: 2022, params: '176B',      context: '2K',  license: 'RAIL',                    note: 'Multilingual (46 languages) collaborative model.' },
      { name: 'Qwen',       org: 'Alibaba',   year: 2023, params: '1.8B – 72B',context: '32K', license: 'Apache 2.0 (most)',       note: 'Strong multilingual and code performance.' },
      { name: 'DeepSeek',   org: 'DeepSeek',  year: 2024, params: 'up to 671B (MoE)',context: '128K', license: 'permissive',         note: 'Frontier-class reasoning at open weights.' },
      { name: 'Gemma',      org: 'Google',    year: 2024, params: '2B / 7B',   context: '8K',  license: 'open weights',            note: 'Distilled from the Gemini family.' },
    ];

    let filter = 'all';
    const filters = ['all', 'Meta', 'Mistral', 'Asia'];

    const root = wrap(
      'The open-source LLM landscape',
      'Open weights you can download, fine-tune, and run yourself. The capability gap to closed frontier models has narrowed dramatically.'
    );

    const chips = h('div', { style: { display: 'flex', gap: '6px', marginBottom: '14px' } });
    filters.forEach(f => {
      const c = h('button', { class: 'chip' + (f === filter ? ' selected' : ''), type: 'button' }, f);
      c.addEventListener('click', () => {
        filter = f;
        chips.querySelectorAll('.chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        paint();
      });
      chips.append(c);
    });

    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' } });

    function paint() {
      grid.innerHTML = '';
      const visible = models.filter(m => {
        if (filter === 'all') return true;
        if (filter === 'Asia') return ['Alibaba', 'DeepSeek'].includes(m.org);
        return m.org === filter;
      });
      visible.forEach(m => {
        const card = h('div', {
          style: {
            padding: '16px',
            background: 'var(--bg)',
            border: '1px solid var(--rule)',
            borderRadius: '3px',
            transition: 'all 0.15s ease',
          }
        });
        card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--accent)'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--rule)'; });
        card.append(
          h('div', { style: { fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 500, color: 'var(--accent)' } }, m.name),
          h('div', { style: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-faded)', marginBottom: '10px' } }, m.org + ' · ' + m.year),
          h('div', { style: { fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-soft)' } },
            'params: ' + m.params,
            h('br'), 'context: ' + m.context,
            h('br'), 'licence: ' + m.license
          ),
          h('div', { style: { marginTop: '10px', fontFamily: 'var(--serif)', fontSize: '14px', fontStyle: 'italic', color: 'var(--ink-soft)' } }, m.note)
        );
        grid.append(card);
      });
    }

    root.append(chips, grid);
    paint();
    host.append(root);
  };

})();
