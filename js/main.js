(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  document.documentElement.classList.add('js');

  /* Missing photos: shop.jpg falls back to a stock photo, card.jpg to a labelled box */
  $$('img[data-fallback], img[data-placeholder]').forEach(function (img) {
    var done = false;
    function swap() {
      if (done) return;
      done = true;
      if (img.dataset.fallback) {
        img.alt = img.dataset.fallbackAlt || '';
        img.src = img.dataset.fallback;
      } else {
        var box = document.createElement('div');
        box.className = 'missing';
        box.textContent = img.dataset.placeholder;
        img.replaceWith(box);
      }
    }
    img.addEventListener('error', swap);
    if (img.complete && img.currentSrc && !img.naturalWidth) swap();
  });

  /* Lazy-loading fallback for browsers without loading="lazy" */
  if (!('loading' in HTMLImageElement.prototype) && hasIO) {
    var lazyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.src = e.target.dataset.src;
        lazyIO.unobserve(e.target);
      });
    }, { rootMargin: '400px' });
    $$('img[loading="lazy"]').forEach(function (img) {
      if (img.complete) return;
      img.dataset.src = img.getAttribute('src');
      img.removeAttribute('src');
      lazyIO.observe(img);
    });
  }

  /* Mobile menu */
  var nav = $('#nav');
  var burger = $('.burger');
  var header = $('#header');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  /* The dark layer behind the open menu belongs to the header, so a tap on it lands on the header itself */
  header.addEventListener('click', function (e) { if (e.target === header) setMenu(false); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.header')) setMenu(false);
  });
  header.addEventListener('focusout', function (e) {
    if (e.relatedTarget && !header.contains(e.relatedTarget)) setMenu(false);
  });
  window.matchMedia('(min-width: 992px)').addEventListener('change', function () { setMenu(false); });

  /* Smooth scroll to sections */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.getAttribute('href'));
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* Header shadow and active nav link */
  var links = $$('a', nav);
  var sections = links.map(function (a) { return $(a.getAttribute('href')); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    header.classList.toggle('is-stuck', window.scrollY > 40);
    var line = header.offsetHeight + window.innerHeight * 0.3;
    var current = 0;
    sections.forEach(function (s, i) { if (s.getBoundingClientRect().top <= line) current = i; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = links.length - 1;
    links.forEach(function (a, i) {
      a.classList.toggle('is-active', i === current);
      if (i === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* Gentle fade-in, only for parts that start below the screen */
  if (hasIO && !calm) {
    var fadeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        fadeIO.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -40px' });
    $$('.card, .tile, .steps li, .vcard').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('fade');
      fadeIO.observe(el);
    });
  }

  /* Gallery lightbox: buttons, arrow keys, Esc, swipe */
  var box = $('#lightbox');
  var items = $$('#gallery a');
  if (box && box.showModal && items.length) {
    var pic = $('.lightbox__img', box);
    var cap = $('.lightbox__cap', box);
    var at = 0;
    var startX = null;

    var show = function (i) {
      at = (i + items.length) % items.length;
      pic.src = items[at].href;
      pic.alt = $('img', items[at]).alt;
      cap.textContent = items[at].dataset.caption + ' (' + (at + 1) + ' / ' + items.length + ')';
    };

    items.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        show(i);
        box.showModal();
        document.body.classList.add('lb-open');
      });
    });
    $('.lightbox__close', box).addEventListener('click', function () { box.close(); });
    $('.lightbox__prev', box).addEventListener('click', function () { show(at - 1); });
    $('.lightbox__next', box).addEventListener('click', function () { show(at + 1); });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.tagName === 'FIGURE') box.close();
    });
    box.addEventListener('close', function () {
      document.body.classList.remove('lb-open');
      items[at].focus({ preventScroll: true });
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
    box.addEventListener('touchstart', function (e) {
      var zoomed = window.visualViewport && window.visualViewport.scale > 1.05;
      startX = e.touches.length === 1 && !zoomed ? e.touches[0].clientX : null;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 45) show(at + (dx < 0 ? 1 : -1));
    });
  }
})();
