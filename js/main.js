document.addEventListener('DOMContentLoaded', function () {
  // Menyu ya juu kwenye simu
  var btn = document.querySelector('.aj-menu-btn');
  var nav = document.querySelector('.aj-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('aj-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? '✕' : '☰';
    });
  }

  // Angazia ukurasa uliopo (menyu ya juu na ya chini)
  function norm(s) {
    s = (s || '').replace(/\/+$/, '');
    s = s.split('/').pop().replace(/\.html$/, '');
    return s || 'index';
  }
  var current = norm(location.pathname);
  document.querySelectorAll('.aj-nav a, .aj-bn-item').forEach(function (a) {
    if (norm(a.getAttribute('href')) === current) {
      a.classList.add(a.classList.contains('aj-bn-item') ? 'aj-bn-active' : 'aj-active');
    }
  });

  // Mwaka wa footer
  var y = document.getElementById('aj-year');
  if (y) y.textContent = new Date().getFullYear();
});