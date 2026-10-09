/* Partners Unlimited — 2026 redesign
   Minimal progressive enhancement: mobile nav, header state,
   scroll reveal, password visibility toggle. */
(function () {
  document.documentElement.classList.add('js');

  /* ---- Mobile navigation ---- */
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        mobileNav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Header shadow on scroll ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Reveal on scroll ---- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealItems = document.querySelectorAll('[data-reveal]');
  if (revealItems.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      revealItems.forEach(function (el) { observer.observe(el); });
    }
  }

  /* ---- Password show/hide (member area) ---- */
  document.querySelectorAll('[data-pw-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = btn.closest('.pw-field').querySelector('input');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.querySelector('.eye-on').style.display = show ? 'none' : '';
      btn.querySelector('.eye-off').style.display = show ? '' : 'none';
    });
  });
})();
