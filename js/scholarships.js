(function () {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
  var TYPES = { ndani: 'Ndani', nje: 'Nje ya nchi' };

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
  function isActive(x) { var n = daysLeft(x.deadline); return n === null || n >= 0; }
  function sortNewest(a, b) { return String(b.posted || '').localeCompare(String(a.posted || '')); }

  function deadlineText(x) {
    var n = daysLeft(x.deadline);
    if (n === null) return '';
    if (n < 0) return 'Imeisha muda';
    if (n === 0) return 'Leo ndiyo mwisho!';
    if (n <= 7) return 'Siku ' + n + ' zimebaki';
    return 'Mwisho: ' + fmtDate(x.deadline);
  }

  function badge(x) {
    var cls = x.type === 'nje' ? 'aj-badge aj-badge-red' : 'aj-badge';
    return '<span class="' + cls + '">' + esc(TYPES[x.type] || 'Scholarship') + '</span>';
  }

  function metaHtml(x) {
    var dl = deadlineText(x);
    return '<div class="aj-meta">' +
      (x.level ? '<span>🎓 ' + esc(x.level) + '</span>' : '') +
      (x.country ? '<span>🌍 ' + esc(x.country) + '</span>' : '') +
      (dl ? '<span>⏰ ' + esc(dl) + '</span>' : '') +
    '</div>';
  }

  function listItems(arr) {
    return (arr || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');
  }

  /* Kadi fupi (ukurasa wa mwanzo) */
  function homeCard(x) {
    return '<article class="aj-job">' +
      '<div class="aj-job-top"><h3>' + esc(x.title) + '</h3>' + badge(x) + '</div>' +
      '<p class="aj-job-org">' + esc(x.org) + '</p>' +
      metaHtml(x) +
      '<a class="aj-btn" href="scholarships.html#s-' + encodeURIComponent(x.id) + '">Tazama</a>' +
    '</article>';
  }

  /* Kadi kamili (scholarships.html) */
  function listCard(x) {
    var link = safeUrl(x.link);
    var ben = listItems(x.benefits);
    var req = listItems(x.requirements);
    return '<article class="aj-job" id="s-' + esc(x.id) + '">' +
      '<div class="aj-job-top"><h3>' + esc(x.title) + '</h3>' + badge(x) + '</div>' +
      '<p class="aj-job-org">' + esc(x.org) + '</p>' +
      metaHtml(x) +
      '<p class="aj-sum">' + esc(x.summary) + '</p>' +
      '<details class="aj-more"><summary>Maelezo zaidi</summary>' +
        (ben ? '<h4>Faida</h4><ul>' + ben + '</ul>' : '') +
        (req ? '<h4>Sifa zinazohitajika</h4><ul>' + req + '</ul>' : '') +
        (x.how ? '<h4>Jinsi ya kuomba</h4><p>' + esc(x.how) + '</p>' : '') +
        (link !== '#' ? '<a class="aj-btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Tazama tangazo rasmi →</a>' : '') +
      '</details>' +
    '</article>';
  }

  function load() {
    return fetch('data/scholarships.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('scholarships.json haijapatikana');
      return r.json();
    });
  }

  var EMPTY = 'style="grid-column:1/-1"';

  /* ---------- 1. Ukurasa wa mwanzo ---------- */
  var homeEl = document.getElementById('aj-latest-scholarships');
  if (homeEl) {
    load().then(function (data) {
      var list = data.filter(isActive).sort(sortNewest).slice(0, 3);
      homeEl.innerHTML = list.length
        ? list.map(homeCard).join('')
        : '<div class="aj-empty" ' + EMPTY + '>Scholarships mpya zinakuja hivi karibuni.</div>';
    }).catch(function () { /* acha kadi za mfano zilizopo */ });
  }

  /* ---------- 2. scholarships.html ---------- */
  var listEl = document.getElementById('aj-sch-list');
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
      var list = all.filter(function (x) {
        if (state.type !== 'all' && x.type !== state.type) return false;
        if (!q) return true;
        return [x.title, x.org, x.country, x.level, x.summary].join(' ').toLowerCase().indexOf(q) !== -1;
      });
      countEl.textContent = 'Scholarships ' + list.length;
      listEl.innerHTML = list.length
        ? list.map(listCard).join('')
        : '<div class="aj-empty" ' + EMPTY + '>Hakuna scholarship iliyopatikana. Jaribu neno lingine au kundi lingine.</div>';
    };

    var openFromHash = function () {
      if (!location.hash) return;
      try {
        var t = document.querySelector(location.hash);
        if (!t) return;
        var d = t.querySelector('details');
        if (d) d.open = true;
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) { /* hash isiyo sahihi */ }
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
    load().then(function (data) {
      all = data.filter(isActive).sort(sortNewest);
      render();
      openFromHash();
    }).catch(function () {
      countEl.textContent = '';
      listEl.innerHTML = '<div class="aj-empty" ' + EMPTY + '>Imeshindwa kupakia scholarships. Onyesha upya ukurasa.</div>';
    });
  }
})();