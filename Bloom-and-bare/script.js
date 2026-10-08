// =========================================================
// BLOOM & BARE — shared interactivity
// =========================================================
//
// NOTE ON STORAGE: Journal, Tracker, and Vibe Streak below use
// localStorage as a stand-in for real user accounts. It's scoped
// to one browser/device, so it won't sync across a phone and a
// laptop yet. When accounts ship, swap the bb_get/bb_set helpers
// below for API calls — every feature reads/writes only through
// those two functions, so nothing else needs to change.
// =========================================================

function bb_get(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function bb_set(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
}
function bb_today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function bb_daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + 'T00:00:00');
  const b = new Date(dateStrB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

// ---------- Shared Journal API (used by Quiz, Mixer, My Nails) ----------
function bb_journalGet() { return bb_get('bb_journal', []); }
function bb_journalSave(item) {
  const journal = bb_journalGet();
  journal.unshift({ id: 'j_' + Date.now(), savedAt: bb_today(), ...item });
  bb_set('bb_journal', journal);
  bb_updateProfileDot();
  return journal;
}
function bb_journalRemove(id) {
  const journal = bb_journalGet().filter((j) => j.id !== id);
  bb_set('bb_journal', journal);
  return journal;
}

// ---------- Profile icon "new activity" dot ----------
function bb_updateProfileDot() {
  const dot = document.querySelector('.icon-link .dot');
  if (!dot) return;
  const seen = bb_get('bb_journalSeenCount', 0);
  const count = bb_journalGet().length;
  dot.classList.toggle('show', count > seen);
}
document.addEventListener('DOMContentLoaded', bb_updateProfileDot);

// ---------- Mobile nav toggle ----------
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (menuBtn && mobileMenu) {
  mobileMenu.style.maxHeight = '0px';
  menuBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.style.maxHeight !== '0px';
    mobileMenu.style.maxHeight = isOpen ? '0px' : mobileMenu.scrollHeight + 'px';
    menuBtn.setAttribute('aria-expanded', String(!isOpen));
  });
}

// ---------- Scroll reveal ----------
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

// =========================================================
// NAIL STYLE FINDER QUIZ
// =========================================================
const quizRoot = document.getElementById('quiz-root');
if (quizRoot) {
  const state = { step: 0, lifestyle: null, aesthetic: null };

  const questions = [
    {
      key: 'lifestyle',
      title: 'What does your typical day look like?',
      sub: 'Step 1 of 2',
      options: [
        { id: 'corporate', label: 'Corporate / Office', desc: 'Meetings, laptops, polished hands on camera.' },
        { id: 'creative', label: 'Hands-on / Creative', desc: 'Making, building, working with your hands.' },
        { id: 'mom', label: 'Stay-at-home Mom', desc: 'Constant motion, durability matters most.' },
        { id: 'active', label: 'Active / Fitness', desc: 'Gym, sport, hands that need to keep up.' },
      ],
    },
    {
      key: 'aesthetic',
      title: 'What is your personal style aesthetic?',
      sub: 'Step 2 of 2',
      options: [
        { id: 'minimalist', label: 'Minimalist & Clean', desc: 'Quiet, considered, nothing shouting.' },
        { id: 'bold', label: 'Bold & Artistic', desc: 'You want your hands to say something.' },
        { id: 'elegant', label: 'Elegant & Classic', desc: 'Timeless over trendy, always.' },
        { id: 'edgy', label: 'Trendy & Edgy', desc: 'First to try it, first to wear it well.' },
      ],
    },
  ];

  // Result matrix — lifestyle sets the base shape/durability, aesthetic sets the finish
  const results = {
    'corporate-minimalist': { name: 'The Corporate Minimalist', desc: 'Short Oval Soft-Gel Set in a whisper-nude tone — polished enough for the boardroom, subtle enough for every meeting after.', shape: 'oval' },
    'corporate-elegant':    { name: 'The Boardroom Classic', desc: 'Almond Soft-Gel Set in milky rose — structured, quiet confidence with a French-tip finish.', shape: 'almond' },
    'corporate-bold':       { name: 'The Power Player', desc: 'Square Soft-Gel Set with a single accent nail — professional with one considered statement.', shape: 'square' },
    'corporate-edgy':       { name: 'The Modern Executive', desc: 'Short Coffin Soft-Gel Set in chrome or graphite — sharp, current, still desk-appropriate.', shape: 'coffin' },
    'creative-bold':        { name: 'The Bold Trendsetter', desc: 'Long Coffin Acrylics with hand-painted line art — durable enough for making, expressive enough to be yours.', shape: 'coffin' },
    'creative-edgy':        { name: 'The Studio Artist', desc: 'Medium Coffin Acrylics with textured or 3D detail — built to work through, made to be noticed.', shape: 'coffin' },
    'creative-minimalist':  { name: 'The Quiet Maker', desc: 'Short Almond Soft-Gel Set in a single clean tone — protection first, style that doesn\u2019t compete with the work.', shape: 'almond' },
    'creative-elegant':     { name: 'The Refined Craftsperson', desc: 'Medium Oval Soft-Gel Set with a soft chrome finish — elegant hands that can still hold a tool.', shape: 'oval' },
    'mom-minimalist':       { name: 'The Effortless Everyday', desc: 'Short Square Soft-Gel Set in a durable neutral — low-maintenance, chip-resistant, done in one sitting.', shape: 'square' },
    'mom-elegant':          { name: 'The Timeless Caregiver', desc: 'Short Oval Soft-Gel Set in soft blush — classic, gentle, built to survive the daily chaos.', shape: 'oval' },
    'mom-bold':             { name: 'The Playful Parent', desc: 'Short Square Acrylics with a fun accent detail — sturdy enough for snacks and Legos, still yours.', shape: 'square' },
    'mom-edgy':             { name: 'The Low-Key Rebel', desc: 'Short Coffin Soft-Gel Set in a moody tone — a little edge that still survives nap time.', shape: 'coffin' },
    'active-minimalist':    { name: 'The Clean Athlete', desc: 'Short Oval Soft-Gel Set, bare or single-tone — grip-friendly, gym-ready, quietly polished.', shape: 'oval' },
    'active-bold':          { name: 'The Statement Mover', desc: 'Short Square Acrylics with bold color — durable enough for training, loud enough to notice.', shape: 'square' },
    'active-elegant':       { name: 'The Classic Competitor', desc: 'Short Almond Soft-Gel Set in soft rose — elegant even mid-rep.', shape: 'almond' },
    'active-edgy':          { name: 'The Trend Athlete', desc: 'Short Coffin Soft-Gel Set in a current color story — built for movement, styled for now.', shape: 'coffin' },
  };

  function render() {
    if (state.step < questions.length) {
      renderQuestion(questions[state.step]);
    } else {
      renderResult();
    }
  }

  function renderQuestion(q) {
    const progressPct = Math.round((state.step / questions.length) * 100);
    quizRoot.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold tracking-widest uppercase text-[--gold]" style="color:var(--gold)">${q.sub}</span>
          <span class="text-xs text-[--charcoal-soft]" style="color:var(--charcoal-soft)">${progressPct}%</span>
        </div>
        <div class="progress-track mb-8"><div class="progress-fill" style="width:${progressPct}%"></div></div>
        <h2 class="font-display text-2xl sm:text-3xl mb-6" style="color:var(--charcoal)">${q.title}</h2>
        <div class="grid sm:grid-cols-2 gap-4" role="radiogroup" aria-label="${q.title}">
          ${q.options.map(opt => `
            <button type="button" class="quiz-option text-left p-5 w-full" data-key="${q.key}" data-id="${opt.id}" role="radio" aria-checked="false">
              <span class="block font-display text-lg mb-1">${opt.label}</span>
              <span class="block text-sm" style="color:var(--charcoal-soft)">${opt.desc}</span>
            </button>
          `).join('')}
        </div>
        ${state.step > 0 ? `<button type="button" id="quiz-back" class="mt-8 text-sm font-semibold underline" style="color:var(--charcoal-soft)">← Back</button>` : ''}
      </div>
    `;

    quizRoot.querySelectorAll('.quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        state[btn.dataset.key] = btn.dataset.id;
        state.step += 1;
        render();
      });
    });

    const backBtn = document.getElementById('quiz-back');
    if (backBtn) backBtn.addEventListener('click', () => { state.step -= 1; render(); });
  }

  function renderResult() {
    const key = `${state.lifestyle}-${state.aesthetic}`;
    const result = results[key] || {
      name: 'The Signature Set',
      desc: 'A soft-gel set tailored to your lifestyle and finished in a tone that matches your personal aesthetic — built by your nail artist in studio.',
      shape: 'almond',
    };

    quizRoot.innerHTML = `
      <div class="max-w-lg mx-auto text-center">
        <p class="text-xs font-semibold tracking-widest uppercase mb-3" style="color:var(--gold)">Your recommendation</p>
        <div class="label-card px-8 py-10 sm:px-12 sm:py-12">
          <div class="flex justify-center gap-2 mb-6" aria-hidden="true">
            <span class="nail-mark nail-mark--${result.shape}"></span>
            <span class="nail-mark nail-mark--${result.shape}"></span>
            <span class="nail-mark nail-mark--${result.shape}"></span>
          </div>
          <h2 class="font-display text-3xl sm:text-4xl mb-4" style="color:var(--charcoal)">${result.name}</h2>
          <p class="text-base leading-relaxed mb-8" style="color:var(--charcoal-soft)">${result.desc}</p>
          <a href="lookbook.html" class="btn-primary">Get This Look</a>
        </div>

        <div class="flex flex-wrap justify-center gap-3 mt-6">
          <button type="button" id="quiz-save" class="btn-secondary !py-2.5 !px-6 text-sm">Save to My Nails</button>
          <button type="button" id="quiz-share" class="btn-secondary !py-2.5 !px-6 text-sm">Share My Result</button>
        </div>
        <p id="quiz-save-confirm" class="text-sm mt-3 hidden" style="color:var(--rose-deep)">Saved to your Nail Journal ✓</p>

        <canvas id="quiz-share-canvas" width="1080" height="1920" class="hidden"></canvas>

        <button type="button" id="quiz-restart" class="mt-6 text-sm font-semibold underline" style="color:var(--charcoal-soft)">Retake the quiz</button>
      </div>
    `;

    document.getElementById('quiz-restart').addEventListener('click', () => {
      state.step = 0; state.lifestyle = null; state.aesthetic = null;
      render();
    });

    document.getElementById('quiz-save').addEventListener('click', (e) => {
      bb_journalSave({ name: result.name, desc: result.desc, shape: result.shape, source: 'Style Quiz' });
      document.getElementById('quiz-save-confirm').classList.remove('hidden');
      e.target.textContent = 'Saved ✓';
      e.target.disabled = true;
    });

    document.getElementById('quiz-share').addEventListener('click', () => bb_drawShareCard(result));
  }

  // Draws an Instagram-story-shaped (1080x1920) result card and triggers a download
  function bb_drawShareCard(result) {
    const canvas = document.getElementById('quiz-share-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const shapeColors = { almond: '#E4C3A3', coffin: '#C77B86', oval: '#F1D9D6', square: '#D9C39D' };
    const accent = shapeColors[result.shape] || '#C77B86';

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#FBF6EF');
    grad.addColorStop(1, '#F1D9D6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Three simple nail silhouettes near the top
    ctx.fillStyle = accent;
    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 160 + i * 160;
      ctx.beginPath();
      ctx.ellipse(x, 420, 60, 130, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrow label
    ctx.fillStyle = '#AD8A55';
    ctx.font = '600 32px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MY NAIL STYLE RESULT', W / 2, 660);

    // Result name — wraps if long
    ctx.fillStyle = '#2B2622';
    ctx.font = '600 76px Fraunces, serif';
    wrapCanvasText(ctx, result.name, W / 2, 780, W - 160, 88);

    // Tagline
    ctx.fillStyle = '#554C44';
    ctx.font = '400 34px Manrope, sans-serif';
    wrapCanvasText(ctx, result.desc, W / 2, 1020, W - 200, 48);

    // Brand footer
    ctx.fillStyle = '#2B2622';
    ctx.font = '600 44px Fraunces, serif';
    ctx.fillText('Bloom & Bare', W / 2, H - 140);
    ctx.fillStyle = '#AD8A55';
    ctx.font = '600 26px Manrope, sans-serif';
    ctx.fillText('Take the quiz — bloomandbare.com/quiz', W / 2, H - 90);

    canvas.classList.remove('hidden');
    const link = document.createElement('a');
    link.download = 'my-nail-style-result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    canvas.classList.add('hidden');
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '', lines = [];
    words.forEach((word) => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  }

  render();
}

// =========================================================
// LOOKBOOK FILTER
// =========================================================
const filterPills = document.querySelectorAll('.filter-pill');
const lookbookItems = document.querySelectorAll('.lookbook-item');
if (filterPills.length && lookbookItems.length) {
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const vibe = pill.dataset.vibe;
      lookbookItems.forEach((item) => {
        const match = vibe === 'all' || item.dataset.vibe === vibe;
        item.style.display = match ? '' : 'none';
      });
    });
  });
}

// =========================================================
// LOOKBOOK SAVE-TO-JOURNAL HEARTS
// =========================================================
const lookbookHearts = document.querySelectorAll('.lookbook-heart');
if (lookbookHearts.length) {
  function bb_isSaved(name) {
    return bb_journalGet().some((j) => j.name === name && j.source === 'Lookbook');
  }
  function bb_syncHeart(btn) {
    const card = btn.closest('.lookbook-item');
    const saved = bb_isSaved(card.dataset.name);
    btn.classList.toggle('saved', saved);
    btn.textContent = saved ? '♥' : '♡';
    btn.setAttribute('aria-pressed', String(saved));
  }
  lookbookHearts.forEach((btn) => {
    bb_syncHeart(btn);
    btn.addEventListener('click', () => {
      const card = btn.closest('.lookbook-item');
      const { name, shape, color } = card.dataset;
      if (bb_isSaved(name)) {
        const match = bb_journalGet().find((j) => j.name === name && j.source === 'Lookbook');
        if (match) bb_journalRemove(match.id);
      } else {
        bb_journalSave({ name, desc: `Saved from the Lookbook.`, shape, color, source: 'Lookbook' });
      }
      bb_syncHeart(btn);
    });
  });
}

// =========================================================
// DAILY VIBE CHECK (homepage widget, builds a streak)
// =========================================================
const vibeRoot = document.getElementById('vibe-root');
if (vibeRoot) {
  const vibes = {
    calm:        { label: 'Calm', pairing: 'Short Oval, Milk-Bath Nude', line: 'Quiet hands for a quiet kind of day.' },
    confident:   { label: 'Confident', pairing: 'Square, Classic Red', line: 'Walk in like you already got the yes.' },
    playful:     { label: 'Playful', pairing: 'Almond, Two-Tone Pastel', line: 'A little color goes a long way today.' },
    powerful:    { label: 'Powerful', pairing: 'Coffin, Deep Espresso', line: 'Take up exactly the space you deserve.' },
    romantic:    { label: 'Romantic', pairing: 'Oval, Soft Blush Chrome', line: 'Soft edges, warm light, good energy.' },
    adventurous: { label: 'Adventurous', pairing: 'Coffin, Line Art Detail', line: 'Today calls for something with a story.' },
  };

  function bb_renderVibe() {
    const today = bb_today();
    const savedToday = bb_get('bb_dailyVibe', null);
    const streak = bb_get('bb_vibeStreak', { count: 0, lastDate: null });

    if (savedToday && savedToday.date === today) {
      const v = vibes[savedToday.mood];
      vibeRoot.innerHTML = `
        <div class="text-center">
          <span class="streak-badge mb-5 inline-flex">🔥 ${streak.count}-day streak</span>
          <p class="text-xs font-semibold tracking-widest uppercase mb-2" style="color:var(--gold)">Today's pairing</p>
          <h3 class="font-display text-2xl mb-2">${v.label} → ${v.pairing}</h3>
          <p class="text-sm mb-5" style="color:var(--charcoal-soft)">${v.line}</p>
          <button type="button" id="vibe-change" class="text-sm font-semibold underline" style="color:var(--charcoal-soft)">Feeling different? Change it</button>
        </div>
      `;
      document.getElementById('vibe-change').addEventListener('click', bb_renderVibePicker);
    } else {
      bb_renderVibePicker();
    }
  }

  function bb_renderVibePicker() {
    const streak = bb_get('bb_vibeStreak', { count: 0, lastDate: null });
    vibeRoot.innerHTML = `
      <div class="text-center mb-6">
        ${streak.count > 0 ? `<span class="streak-badge mb-4 inline-flex">🔥 ${streak.count}-day streak</span>` : ''}
        <h3 class="font-display text-2xl mb-1">How do you want your hands to feel today?</h3>
        <p class="text-sm" style="color:var(--charcoal-soft)">Pick one — get a pairing for today only.</p>
      </div>
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-2xl mx-auto">
        ${Object.entries(vibes).map(([key, v]) => `
          <button type="button" class="vibe-chip" data-mood="${key}">
            <span class="block font-display text-sm">${v.label}</span>
          </button>
        `).join('')}
      </div>
    `;
    vibeRoot.querySelectorAll('.vibe-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const mood = chip.dataset.mood;
        const today = bb_today();
        const streak = bb_get('bb_vibeStreak', { count: 0, lastDate: null });

        let newStreak;
        if (streak.lastDate === today) {
          newStreak = streak; // already counted today
        } else if (streak.lastDate && bb_daysBetween(streak.lastDate, today) === 1) {
          newStreak = { count: streak.count + 1, lastDate: today }; // consecutive day
        } else {
          newStreak = { count: 1, lastDate: today }; // streak broken or first time
        }
        bb_set('bb_vibeStreak', newStreak);
        bb_set('bb_dailyVibe', { date: today, mood });
        bb_renderVibe();
      });
    });
  }

  bb_renderVibe();
}

// =========================================================
// REGROWTH TRACKER (My Nails hub)
// =========================================================
const trackerRoot = document.getElementById('tracker-root');
if (trackerRoot) {
  const setTypes = {
    softgel:  { label: 'Soft-Gel Manicure', cycleDays: 14 },
    acrylic:  { label: 'Acrylic / Extensions', cycleDays: 21 },
    pressOn:  { label: 'Press-On Set', cycleDays: 14 },
  };

  function bb_renderTracker() {
    const appt = bb_get('bb_lastAppointment', null);

    if (!appt) {
      trackerRoot.innerHTML = `
        <div class="soft-card p-8 max-w-md mx-auto text-center">
          <div class="flex justify-center gap-2 mb-5" aria-hidden="true">
            <span class="nail-mark nail-mark--almond"></span><span class="nail-mark nail-mark--oval"></span><span class="nail-mark nail-mark--coffin"></span>
          </div>
          <h3 class="font-display text-2xl mb-2">Track your regrowth</h3>
          <p class="text-sm mb-6" style="color:var(--charcoal-soft)">Log your last appointment and we'll tell you exactly when to book your fill.</p>
          <form id="tracker-form" class="space-y-4 text-left">
            <div>
              <label for="appt-date" class="block text-xs font-semibold uppercase tracking-wide mb-2" style="color:var(--gold)">Last appointment date</label>
              <input type="date" id="appt-date" required max="${bb_today()}" class="w-full border rounded-xl px-4 py-3 text-sm" style="border-color:var(--creamdim)">
            </div>
            <div>
              <label for="appt-type" class="block text-xs font-semibold uppercase tracking-wide mb-2" style="color:var(--gold)">Set type</label>
              <select id="appt-type" required class="w-full border rounded-xl px-4 py-3 text-sm" style="border-color:var(--creamdim)">
                ${Object.entries(setTypes).map(([k, v]) => `<option value="${k}">${v.label} (${v.cycleDays}-day cycle)</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="btn-primary w-full">Start Tracking</button>
          </form>
        </div>
      `;
      document.getElementById('tracker-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('appt-date').value;
        const type = document.getElementById('appt-type').value;
        if (!date) return;
        bb_set('bb_lastAppointment', { date, type });
        bb_renderTracker();
      });
      return;
    }

    const cycleDays = setTypes[appt.type].cycleDays;
    const elapsed = bb_daysBetween(appt.date, bb_today());
    const pct = Math.min(Math.max(elapsed / cycleDays, 0), 1.15);
    const remaining = cycleDays - elapsed;

    let status, statusClass;
    if (pct < 0.6) { status = "You're all set. Enjoy the finish."; statusClass = 'fresh'; }
    else if (pct < 0.85) { status = 'Getting close — start watching for lifting.'; statusClass = ''; }
    else if (pct <= 1) { status = 'Time to book your fill.'; statusClass = ''; }
    else { status = 'Overdue — book now to protect your natural nail.'; statusClass = 'overdue'; }

    const r = 70, circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - Math.min(pct, 1));

    trackerRoot.innerHTML = `
      <div class="soft-card p-8 max-w-md mx-auto text-center">
        <p class="text-xs font-semibold uppercase tracking-wide mb-6" style="color:var(--gold)">${setTypes[appt.type].label}</p>
        <div class="relative w-44 h-44 mx-auto mb-6">
          <svg width="176" height="176" viewBox="0 0 176 176" class="-rotate-90">
            <circle class="growth-ring-track" cx="88" cy="88" r="${r}" fill="none" stroke-width="12"/>
            <circle class="growth-ring-fill ${statusClass}" cx="88" cy="88" r="${r}" fill="none" stroke-width="12"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="font-display text-3xl">${remaining > 0 ? remaining : 0}</span>
            <span class="text-xs" style="color:var(--charcoal-soft)">days left</span>
          </div>
        </div>
        <p class="font-display text-xl mb-2">${status}</p>
        <p class="text-sm mb-6" style="color:var(--charcoal-soft)">Last set: ${appt.date} · ${cycleDays}-day cycle</p>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="lookbook.html#shop" class="btn-primary !py-2.5 !px-6 text-sm">Book a Fill</a>
          <button type="button" id="tracker-reset" class="btn-secondary !py-2.5 !px-6 text-sm">Log New Appointment</button>
        </div>
      </div>
    `;
    document.getElementById('tracker-reset').addEventListener('click', () => {
      bb_set('bb_lastAppointment', null);
      bb_renderTracker();
    });
  }

  bb_renderTracker();
}

// =========================================================
// NAIL JOURNAL (My Nails hub)
// =========================================================
const journalRoot = document.getElementById('journal-root');
if (journalRoot) {
  function bb_renderJournal() {
    const journal = bb_journalGet();
    bb_set('bb_journalSeenCount', journal.length);
    bb_updateProfileDot();

    if (!journal.length) {
      journalRoot.innerHTML = `
        <div class="text-center py-12">
          <div class="flex justify-center gap-2 mb-5" aria-hidden="true">
            <span class="nail-mark nail-mark--oval"></span><span class="nail-mark nail-mark--square"></span>
          </div>
          <h3 class="font-display text-xl mb-2">Your journal is empty</h3>
          <p class="text-sm mb-6" style="color:var(--charcoal-soft)">Save looks from the Style Quiz or Look Mixer to build your collection.</p>
          <div class="flex justify-center gap-3">
            <a href="quiz.html" class="btn-secondary !py-2.5 !px-6 text-sm">Take the Quiz</a>
            <a href="mixer.html" class="btn-secondary !py-2.5 !px-6 text-sm">Try the Mixer</a>
          </div>
        </div>
      `;
      return;
    }

    journalRoot.innerHTML = `
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${journal.map((j) => `
          <div class="journal-card">
            <div class="aspect-[4/3] relative flex items-center justify-center" style="background:var(--blush)">
              <div class="flex gap-2" aria-hidden="true">
                <span class="nail-mark nail-mark--${j.shape}" style="height:56px;width:32px;${j.color ? `background:${j.color}` : ''}"></span>
                <span class="nail-mark nail-mark--${j.shape}" style="height:56px;width:32px;${j.color ? `background:${j.color}` : ''}"></span>
              </div>
              <button type="button" class="journal-remove absolute top-3 right-3" data-id="${j.id}" aria-label="Remove ${j.name}">✕</button>
            </div>
            <div class="p-5">
              <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:var(--gold)">${j.source || 'Saved'}</p>
              <h3 class="font-display text-lg mb-1">${j.name}</h3>
              <p class="text-xs" style="color:var(--charcoal-soft)">Saved ${j.savedAt}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    journalRoot.querySelectorAll('.journal-remove').forEach((btn) => {
      btn.addEventListener('click', () => { bb_journalRemove(btn.dataset.id); bb_renderJournal(); });
    });
  }

  bb_renderJournal();
}

// =========================================================
// TABS (My Nails hub: Tracker / Journal)
// =========================================================
const tabButtons = document.querySelectorAll('.tab-btn');
if (tabButtons.length) {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === btn.dataset.tab);
      });
    });
  });
}

// =========================================================
// LOOK MIXER
// =========================================================
const mixerRoot = document.getElementById('mixer-root');
if (mixerRoot) {
  const shapes = [
    { id: 'oval', label: 'Oval' }, { id: 'almond', label: 'Almond' },
    { id: 'square', label: 'Square' }, { id: 'coffin', label: 'Coffin' },
  ];
  const colors = [
    { id: '#F1D9D6', label: 'Blush' }, { id: '#E4C3A3', label: 'Nude' },
    { id: '#C77B86', label: 'Rose' }, { id: '#D9C39D', label: 'Gold Beige' },
    { id: '#2B2622', label: 'Noir' }, { id: '#FBF6EF', label: 'Bare' },
  ];
  const finishes = [
    { id: 'glossy', label: 'Glossy' }, { id: 'matte', label: 'Matte' },
    { id: 'chrome', label: 'Chrome' }, { id: 'glitter', label: 'Glitter Tip' },
  ];

  const mix = { shape: 'almond', color: colors[0].id, colorLabel: colors[0].label, finish: 'glossy' };

  function bb_renderMixer() {
    mixerRoot.innerHTML = `
      <div class="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-start">
        <div class="space-y-8">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color:var(--gold)">Shape</p>
            <div class="flex flex-wrap gap-3">
              ${shapes.map((s) => `<button type="button" class="mixer-option ${mix.shape === s.id ? 'selected' : ''}" data-group="shape" data-value="${s.id}">${s.label}</button>`).join('')}
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color:var(--gold)">Color</p>
            <div class="flex flex-wrap gap-3">
              ${colors.map((c) => `<button type="button" class="mixer-swatch ${mix.color === c.id ? 'selected' : ''}" style="background:${c.id}; border-color:${mix.color === c.id ? 'var(--charcoal)' : '#00000015'}" data-group="color" data-value="${c.id}" data-label="${c.label}" aria-label="${c.label}"></button>`).join('')}
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color:var(--gold)">Finish</p>
            <div class="flex flex-wrap gap-3">
              ${finishes.map((f) => `<button type="button" class="mixer-option ${mix.finish === f.id ? 'selected' : ''}" data-group="finish" data-value="${f.id}">${f.label}</button>`).join('')}
            </div>
          </div>
          <button type="button" id="mixer-save" class="btn-primary">Save to My Nails</button>
          <p id="mixer-save-confirm" class="text-sm hidden" style="color:var(--rose-deep)">Saved to your Nail Journal ✓</p>
        </div>

        <div class="soft-card p-10 flex flex-col items-center justify-center min-h-[360px]">
          <div class="flex gap-4 mb-6" id="mixer-preview" aria-hidden="true"></div>
          <p class="font-display text-xl text-center" id="mixer-name"></p>
        </div>
      </div>
    `;
    bb_renderMixerPreview();

    mixerRoot.querySelectorAll('[data-group]').forEach((el) => {
      el.addEventListener('click', () => {
        const group = el.dataset.group;
        mix[group] = el.dataset.value;
        if (group === 'color') mix.colorLabel = el.dataset.label;
        bb_renderMixer();
      });
    });

    document.getElementById('mixer-save').addEventListener('click', (e) => {
      const shapeLabel = shapes.find((s) => s.id === mix.shape).label;
      const finishLabel = finishes.find((f) => f.id === mix.finish).label;
      bb_journalSave({
        name: `${shapeLabel} + ${mix.colorLabel} + ${finishLabel}`,
        desc: 'Custom set built in the Look Mixer.',
        shape: mix.shape, color: mix.color, source: 'Look Mixer',
      });
      document.getElementById('mixer-save-confirm').classList.remove('hidden');
      e.target.textContent = 'Saved ✓';
      e.target.disabled = true;
    });
  }

  function bb_renderMixerPreview() {
    const preview = document.getElementById('mixer-preview');
    const nameEl = document.getElementById('mixer-name');
    if (!preview) return;
    preview.innerHTML = [1, 2, 3].map(() =>
      `<span class="nail-mark nail-mark--${mix.shape} finish-${mix.finish}" style="height:100px;width:56px;background:${mix.color}"></span>`
    ).join('');
    const shapeLabel = shapes.find((s) => s.id === mix.shape).label;
    const finishLabel = finishes.find((f) => f.id === mix.finish).label;
    nameEl.textContent = `${shapeLabel} · ${mix.colorLabel} · ${finishLabel}`;
  }

  bb_renderMixer();
}
