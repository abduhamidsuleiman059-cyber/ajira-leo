(function () {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
  var TYPES = { serikali: 'Serikali', binafsi: 'Binafsi', ngo: 'NGO', internship: 'Internship' };

  /* ---------- Vifaa vidogo ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : '#'; }
  function todayStart() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function parseDate(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return null;
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function fmtDate(s) {
    var d = parseDate(s);
    return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '';
  }
  function daysLeft(s) {
    var d = parseDate(s);
    return d ? Math.round((d - todayStart()) / 86400000) : null;
  }
  function isActive(job) { var n = daysLeft(job.deadline); return n === null || n >= 0; }
  function sortNewest(a, b) { return String(b.posted || '').localeCompare(String(a.posted || '')); }

  function deadlineText(job) {
    var n = daysLeft(job.deadline);
    if (n === null) return '';
    if (n < 0) return 'Imeisha muda';
    if (n === 0) return 'Leo ndiyo mwisho!';
    if (n <= 7) return 'Siku ' + n + ' zimebaki';
    return 'Mwisho: ' + fmtDate(job.deadline);
  }

  function badge(job) {
    var label = TYPES[job.type] || 'Ajira';
    var cls = job.type === 'serikali' ? 'aj-badge aj-badge-red' : 'aj-badge';
    return '<span class="' + cls + '">' + esc(label) + '</span>';
  }

  function card(job) {
    var dl = deadlineText(job);
    return '<article class="aj-job">' +
      '<div class="aj-job-top"><h3>' + esc(job.title) + '</h3>' + badge(job) + '</div>' +
      '<p class="aj-job-org">' + esc(job.org) + '</p>' +
      '<div class="aj-meta">' +
        (job.location ? '<span>📍 ' + esc(job.location) + '</span>' : '') +
        (dl ? '<span>⏰ ' + esc(dl) + '</span>' : '') +
      '</div>' +
      '<a class="aj-btn" href="nafasi.html?id=' + encodeURIComponent(job.id) + '">Tazama nafasi</a>' +
    '</article>';
  }

  function load() {
    return fetch('data/jobs.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('jobs.json haijapatikana');
      return r.json();
    });
  }

  var EMPTY = 'style="grid-column:1/-1"';

  /* ---------- 1. Ukurasa wa mwanzo: nafasi 3 za karibuni ---------- */
  var homeEl = document.getElementById('aj-latest-jobs');
  if (homeEl) {
    load().then(function (jobs) {
      var list = jobs.filter(isActive).sort(sortNewest).slice(0, 3);
      homeEl.innerHTML = list.length
        ? list.map(card).join('')
        : '<div class="aj-empty" ' + EMPTY + '>Nafasi mpya zinakuja hivi karibuni.</div>';
    }).catch(function () { /* acha kadi za mfano zilizopo */ });
  }

  /* ---------- 2. ajira.html: orodha, kutafuta na kuchuja ---------- */
  var listEl = document.getElementById('aj-jobs-list');
  if (listEl) {
    var qInput = document.getElementById('aj-q');
    var countEl = document.getElementById('aj-count');
    var chips = document.querySelectorAll('.aj-chip[data-type]');
    var params = new URLSearchParams(location.search);
    var state = { q: params.get('q') || '', type: params.get('aina') || 'all' };
    var all = [];

    if (state.type !== 'all' && !TYPES[state.type]) state.type = 'all';
    qInput.value = state.q;

    var setChips = function () {
      chips.forEach(function (c) {
        c.classList.toggle('aj-chip-on', c.getAttribute('data-type') === state.type);
      });
    };

    var render = function () {
      var q = state.q.trim().toLowerCase();
      var list = all.filter(function (j) {
        if (state.type !== 'all' && j.type !== state.type) return false;
        if (!q) return true;
        return [j.title, j.org, j.location, j.summary].join(' ').toLowerCase().indexOf(q) !== -1;
      });
      countEl.textContent = 'Nafasi ' + list.length;
      listEl.innerHTML = list.length
        ? list.map(card).join('')
        : '<div class="aj-empty" ' + EMPTY + '>Hakuna nafasi iliyopatikana. Jaribu neno lingine au kundi lingine.</div>';
    };

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        state.type = c.getAttribute('data-type');
        setChips();
        render();
      });
    });
    qInput.addEventListener('input', function () { state.q = qInput.value; render(); });
    document.getElementById('aj-filter-form').addEventListener('submit', function (e) { e.preventDefault(); });

    setChips();
    load().then(function (jobs) {
      all = jobs.filter(isActive).sort(sortNewest);
      render();
    }).catch(function () {
      countEl.textContent = '';
      listEl.innerHTML = '<div class="aj-empty" ' + EMPTY + '>Imeshindwa kupakia nafasi. Onyesha upya ukurasa.</div>';
    });
  }

  /* ---------- 3. nafasi.html: nafasi moja ---------- */
  var detailEl = document.getElementById('aj-job-detail');
  if (detailEl) {
    var id = new URLSearchParams(location.search).get('id');

    var notFound = function () {
      detailEl.innerHTML = '<div class="aj-empty"><h2>Nafasi haijapatikana</h2>' +
        '<p>Huenda imeondolewa au kiungo si sahihi.</p>' +
        '<a class="aj-btn" href="ajira.html">Angalia ajira zote</a></div>';
    };

    var renderDetail = function (job) {
      var n = daysLeft(job.deadline);
      var off = n !== null && n < 0;
      var dl = deadlineText(job);
      var link = safeUrl(job.link);
      var reqs = (job.requirements || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');
      var wa = 'https://wa.me/?text=' + encodeURIComponent(job.title + ' - ' + job.org + '\n' + location.href);

      document.title = job.title + ' | AjiraLeo';
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute('content', String(job.summary || '').slice(0, 155));

      detailEl.innerHTML =
        '<div class="aj-detail-head">' +
          (off ? '<span class="aj-badge aj-badge-off">Imeisha muda</span>' : badge(job)) +
          '<h1>' + esc(job.title) + '</h1>' +
          '<p class="aj-job-org">' + esc(job.org) + '</p>' +
          '<div class="aj-meta">' +
            (job.location ? '<span>📍 ' + esc(job.location) + '</span>' : '') +
            (dl ? '<span>⏰ ' + esc(dl) + '</span>' : '') +
            (job.posted ? '<span>🗓️ Imewekwa: ' + esc(fmtDate(job.posted)) + '</span>' : '') +
          '</div>' +
        '</div>' +
        (off ? '<div class="aj-notice">Muda wa kutuma maombi wa nafasi hii umeisha.</div>' : '') +
        '<section class="aj-card"><h2>Muhtasari</h2><p>' + esc(job.summary) + '</p></section>' +
        (reqs ? '<section class="aj-card"><h2>Sifa zinazohitajika</h2><ul>' + reqs + '</ul></section>' : '') +
        '<section class="aj-card"><h2>Jinsi ya kuomba</h2><p>' + esc(job.how) + '</p>' +
          '<div class="aj-detail-actions">' +
            (link !== '#' ? '<a class="aj-btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Tazama tangazo rasmi →</a>' : '') +
            '<a class="aj-btn aj-btn-dark" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">Shiriki WhatsApp</a>' +
          '</div>' +
        '</section>' +
        '<div class="aj-notice"><strong>Tahadhari:</strong> Hakuna ajira halali inayohitaji ulipe pesa. Hakikisha kwenye tangazo rasmi kabla ya kutuma maombi.</div>';
    };

    load().then(function (jobs) {
      var job = jobs.filter(function (j) { return String(j.id) === String(id); })[0];
      if (job) renderDetail(job); else notFound();
    }).catch(function () {
      detailEl.innerHTML = '<div class="aj-empty">Imeshindwa kupakia nafasi. Onyesha upya ukurasa.</div>';
    });
  }
})();