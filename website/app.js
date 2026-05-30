/* ============================================================
   app.js — book renderer, page-flip, math click-for-proof.
   ============================================================ */
(function () {
  'use strict';

  // ----------- tiny helpers -----------
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  const PY_KEYWORDS = new Set(['def','return','if','elif','else','for','in','while','class','import','from','as','with','not','and','or','True','False','None','lambda','self','pass','print','break','continue','try','except','raise']);
  function highlightPython(src) {
    let html = '', i = 0;
    const len = src.length;
    while (i < len) {
      const c = src[i];
      if (c === '#') {
        let j = i; while (j < len && src[j] !== '\n') j++;
        html += `<span class="tok-cm">${escHtml(src.slice(i, j))}</span>`;
        i = j; continue;
      }
      if (c === '"' || c === "'") {
        const q = c;
        if (src[i+1] === q && src[i+2] === q) {
          let j = i + 3;
          while (j < len - 2 && !(src[j] === q && src[j+1] === q && src[j+2] === q)) j++;
          j += 3;
          html += `<span class="tok-str">${escHtml(src.slice(i, Math.min(j, len)))}</span>`;
          i = Math.min(j, len); continue;
        }
        let j = i + 1;
        while (j < len && src[j] !== q) {
          if (src[j] === '\\' && j + 1 < len) j++;
          j++;
        }
        j++;
        html += `<span class="tok-str">${escHtml(src.slice(i, Math.min(j, len)))}</span>`;
        i = Math.min(j, len); continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i;
        while (j < len && /[0-9.eE_]/.test(src[j])) j++;
        html += `<span class="tok-num">${escHtml(src.slice(i, j))}</span>`;
        i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < len && /[A-Za-z0-9_]/.test(src[j])) j++;
        const word = src.slice(i, j);
        if (PY_KEYWORDS.has(word)) html += `<span class="tok-kw">${escHtml(word)}</span>`;
        else if (src[j] === '(')   html += `<span class="tok-fn">${escHtml(word)}</span>`;
        else                        html += escHtml(word);
        i = j; continue;
      }
      html += escHtml(c); i++;
    }
    return html;
  }

  // ----------- chapter numbering -----------
  function chapterNumber(idx) { return String(idx + 1).padStart(2, '0'); }

  // ============================================================
  // TOC (spine)
  // ============================================================
  function renderTOC() {
    const toc = document.getElementById('toc');
    let html = '';
    ERAS.forEach((era) => {
      const eraEntries = ENTRIES
        .map((e, i) => ({ ...e, _idx: i }))
        .filter(e => e.era === era.id);
      if (!eraEntries.length) return;
      html += `<div class="spine-section">
        <div class="era-label"><span class="num">${era.num}.</span>${escHtml(era.title)}</div>`;
      eraEntries.forEach((e) => {
        const num = chapterNumber(e._idx);
        const yr  = e.year.split(/[\s–]/)[0];
        html += `<button class="toc-item" data-idx="${e._idx}">
          <span class="ch-num">${num}</span>
          <span class="ch-year">${escHtml(yr)}</span>
          <span class="ch-name">${escHtml(e.title.replace(/—.*/, '').trim())}</span>
        </button>`;
      });
      html += `</div>`;
    });
    toc.innerHTML = html;
    toc.querySelectorAll('.toc-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        Book.goTo(idx + 1, /* via TOC */ true);   // +1 because page 0 is cover
      });
    });
  }
  function highlightTOC(activeIdx) {
    document.querySelectorAll('.toc-item').forEach(b => b.classList.remove('active'));
    if (activeIdx >= 1) {
      const btn = document.querySelector(`.toc-item[data-idx="${activeIdx - 1}"]`);
      if (btn) btn.classList.add('active');
    }
  }

  // ============================================================
  // Page rendering
  // ============================================================
  function renderMath(mathArr, entryId) {
    if (!mathArr || !mathArr.length) return '';
    return mathArr.map((m, idx) => {
      const hasProof = m.proof && m.proof.length;
      let proofHtml = '';
      if (hasProof) {
        proofHtml = `<div class="proof">` +
          m.proof.map(s => `
            <div class="proof-step">
              <div>\\[${s.tex}\\]</div>
              <span class="why">${s.why || ''}</span>
            </div>
          `).join('') +
        `</div>`;
      }
      return `
        <div class="math-block" data-mathidx="${idx}">
          <div class="label">
            <span>${escHtml(m.label)}</span>
            ${hasProof ? `<span class="reveal">show proof ▾</span>` : ''}
          </div>
          <div class="tex-line">\\[${m.tex}\\]</div>
          ${m.note ? `<span class="note">${m.note}</span>` : ''}
          ${proofHtml}
        </div>
      `;
    }).join('');
  }

  function renderCode(code) {
    if (!code) return '';
    return `
      <div class="code-wrap">
        <div class="code-head">
          <span class="lang">${escHtml(code.lang)}</span>
          <span class="caption">${escHtml(code.caption || '')}</span>
        </div>
        <pre><code>${highlightPython(code.body)}</code></pre>
      </div>`;
  }

  function renderPapers(papers) {
    if (!papers || !papers.length) return '';
    return papers.map(p => {
      const localFileLink = p.file
        ? ` <span class="muted">·</span> <a href="../${p.file}" target="_blank" rel="noopener" style="color:var(--green); border-color:var(--green)">PDF</a>`
        : '';
      return `
        <a class="paper" href="${escHtml(p.url || '#')}" target="_blank" rel="noopener" data-ref="${escHtml(p.ref)}">
          <span class="ref-tag">[${escHtml(p.ref)}]</span>
          <span class="ttl">${escHtml(p.title)}</span>${localFileLink}
          <div class="meta">${escHtml(p.authors)} · <em>${escHtml(p.venue)}</em> · ${escHtml(String(p.year))}</div>
        </a>`;
    }).join('');
  }

  function renderCompare(cmp) {
    if (!cmp) return '';
    return `
      <div class="compare">
        <h4>${escHtml(cmp.title)}</h4>
        <table>
          <thead><tr><th></th><th>Strengths</th><th>Weaknesses</th></tr></thead>
          <tbody>${cmp.rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  function renderPage(entry, idx) {
    const num = chapterNumber(idx);
    const totals = ENTRIES.length;
    const eraObj = ERAS.find(e => e.id === entry.era);
    return `
      <section class="page" data-id="${entry.id}" data-page="${idx + 1}">

        <header class="page-hd">
          <div class="loadline">
            > LOAD chapter_${num}.txt &nbsp;<span class="ok">[ok]</span>
            &nbsp;<span class="ts">${escHtml(entry.year)}</span>
            &nbsp;<span class="ts">· era ${eraObj.num} / ${escHtml(eraObj.title)}</span>
            &nbsp;<span class="ts">· chapter ${num} of ${String(totals).padStart(2,'0')}</span>
          </div>
          <h1 class="title">${escHtml(entry.title)}</h1>
          <div class="stamps">
            <div><b>AUTHOR</b>${escHtml(entry.authors || '—')}</div>
            ${entry.instl ? `<div><b>INSTL</b>${escHtml(entry.instl)}</div>` : ''}
            <div><b>YEAR</b>${escHtml(entry.year)}</div>
          </div>
        </header>

        <div class="idea-box"><div class="text">${entry.keyIdea}</div></div>

        <div class="sec">1. Origins &amp; significance</div>
        <div class="narrative">${entry.narrative}</div>

        <div class="sec">2. Mathematics</div>
        <div class="muted" style="font-size:11px; margin-bottom:6px;">click any equation block to expand its full derivation</div>
        ${renderMath(entry.math, entry.id)}

        <div class="sec">3. Code that demonstrates the idea</div>
        ${renderCode(entry.code)}

        <div class="sec">4. Try it yourself</div>
        <div class="demo-host" data-kind="${entry.interactive.kind}" data-id="${entry.id}">
          <div class="demo"><p class="muted">loading interactive…</p></div>
        </div>

        ${entry.compare ? renderCompare(entry.compare) : ''}

        <div class="sec">5. Sources</div>
        ${renderPapers(entry.papers)}
      </section>
    `;
  }

  function renderAllPages() {
    const pages = document.getElementById('pages');
    // keep cover, then append chapter pages
    const cover = pages.querySelector('.cover');
    pages.innerHTML = '';
    pages.append(cover);
    ENTRIES.forEach((e, i) => {
      pages.insertAdjacentHTML('beforeend', renderPage(e, i));
    });
  }

  // ============================================================
  // Book state machine: cover (page 0) + 15 chapters (pages 1..15)
  // ============================================================
  const Book = {
    current: 0,
    total: 0,
    pageEls: [],
    flipping: false,

    init() {
      this.pageEls = Array.from(document.querySelectorAll('.page'));
      this.total = this.pageEls.length;          // 16 = cover + 15
      this.pageEls.forEach((p, i) => {
        if (i === 0) p.classList.add('active');
      });
      this.updateControls();
      this.bindMathToggles(this.pageEls[0]);     // (cover has no math, but harmless)
      this.mountInteractive(this.pageEls[0]);    // (ditto)
      this.typesetMath(this.pageEls[0]);
    },

    goTo(targetIdx, viaToc = false) {
      if (this.flipping) return;
      if (targetIdx < 0 || targetIdx >= this.total) return;
      if (targetIdx === this.current) return;
      const oldEl = this.pageEls[this.current];
      const newEl = this.pageEls[targetIdx];
      this.flipping = true;

      // mount demo & typeset math the moment a page is about to show
      this.mountInteractive(newEl);
      this.bindMathToggles(newEl);
      this.bindCitationJumps(newEl);

      oldEl.classList.remove('active');
      oldEl.classList.add('flip-out');
      newEl.classList.add('flip-in');

      setTimeout(() => {
        oldEl.classList.remove('flip-out');
        newEl.classList.remove('flip-in');
        newEl.classList.add('active');
        newEl.scrollTop = 0;
        this.current = targetIdx;
        this.flipping = false;
        this.updateControls();
        this.typesetMath(newEl);
      }, 420);
    },

    next() { this.goTo(this.current + 1); },
    prev() { this.goTo(this.current - 1); },

    updateControls() {
      const pager = document.getElementById('pager');
      if (this.current === 0) {
        pager.textContent = '— · cover · —';
      } else {
        pager.textContent = `page ${String(this.current).padStart(2,'0')} / ${String(this.total - 1).padStart(2,'0')}`;
      }
      document.getElementById('prevBtn').disabled = (this.current === 0);
      document.getElementById('nextBtn').disabled = (this.current === this.total - 1);
      highlightTOC(this.current);
    },

    typesetMath(el) {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([el]).catch((e) => console.warn('MathJax:', e));
      }
    },

    bindMathToggles(pageEl) {
      pageEl.querySelectorAll('.math-block').forEach((mb) => {
        if (mb.dataset.bound) return;
        mb.dataset.bound = '1';
        mb.addEventListener('click', (e) => {
          // don't toggle when clicking inside the proof (so users can select text)
          if (e.target.closest('.proof') && mb.classList.contains('expanded')) return;
          mb.classList.toggle('expanded');
          const rev = mb.querySelector('.reveal');
          if (rev) rev.textContent = mb.classList.contains('expanded') ? 'hide proof ▴' : 'show proof ▾';
          this.typesetMath(mb);
        });
      });
    },

    bindCitationJumps(pageEl) {
      pageEl.querySelectorAll('.cite').forEach((c) => {
        if (c.dataset.bound) return;
        c.dataset.bound = '1';
        c.addEventListener('click', () => {
          const ref = c.dataset.cite;
          const paper = pageEl.querySelector(`.paper[data-ref="${ref}"]`);
          if (paper) {
            paper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            paper.style.transition = 'background 0.2s ease';
            paper.style.background = 'var(--surface-2)';
            setTimeout(() => { paper.style.background = ''; }, 1200);
          }
        });
      });
    },

    mountInteractive(pageEl) {
      const host = pageEl.querySelector('.demo-host');
      if (!host || host.dataset.mounted) return;
      const kind = host.dataset.kind;
      if (!window.Demos || !window.Demos[kind]) return;
      try {
        host.innerHTML = '';
        window.Demos[kind](host, host.dataset.id);
        host.dataset.mounted = '1';
      } catch (err) {
        console.error('demo mount failed:', kind, err);
        host.innerHTML = `<div class="demo"><p class="muted">demo failed to load (${kind})</p></div>`;
      }
    },
  };

  // ============================================================
  // Wire up
  // ============================================================
  function bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input,textarea,select')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { Book.next(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { Book.prev(); e.preventDefault(); }
      else if (e.key === 'Home') { Book.goTo(0); e.preventDefault(); }
      else if (e.key === 'End')  { Book.goTo(Book.total - 1); e.preventDefault(); }
    });
  }

  function init() {
    renderTOC();
    renderAllPages();
    Book.init();
    document.getElementById('prevBtn').addEventListener('click', () => Book.prev());
    document.getElementById('nextBtn').addEventListener('click', () => Book.next());
    bindGlobalKeys();

    // optional: open via hash, e.g. #perceptron
    if (location.hash) {
      const id = location.hash.slice(1);
      const idx = ENTRIES.findIndex(e => e.id === id);
      if (idx >= 0) Book.goTo(idx + 1);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
