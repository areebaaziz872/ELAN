/* ==========================================================
   ÉLAN — vanilla JS. One file, no libraries.
   1 images  2 transitions  3 reveals  4 menu  5 cursor
   6 follow images  7 lookbook strip  8 interlude  9 viewer
   ========================================================== */
(() => {
  'use strict';
  const d = document, de = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
  de.classList.add('js');

  /* 1. Missing images: show a labelled stone block instead of a broken icon */
  const mark = img => {
    const f = img.closest('.fig,.vw-f');
    if (!f) return;
    f.classList.add('miss');
    f.dataset.ph = (img.getAttribute('src') || '').split('/').slice(-2).join('/');
  };
  d.addEventListener('error', e => { if (e.target.tagName === 'IMG') mark(e.target); }, true);
  $$('img').forEach(i => { if (i.complete && i.getAttribute('src') && !i.naturalWidth) mark(i); });

  /* 2. Page transition: dark panel rises, then the next page lifts it away */
  const pt = $('.pt');
  const leave = url => {
    pt.style.animation = 'none';
    pt.style.transition = 'none';
    pt.style.transform = 'translateY(100%)';
    void pt.offsetWidth;
    pt.style.transition = '';
    pt.style.transform = 'none';
    setTimeout(() => { location.href = url; }, 480);
  };
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || !pt || RM || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.origin !== location.origin || a.pathname === location.pathname) return;
    e.preventDefault();
    leave(a.href);
  });
  addEventListener('pageshow', e => {
    if (e.persisted && pt) { pt.style.cssText = ''; pt.style.animation = 'none'; }
  });

  /* 3. Scroll reveals (clip, slide, tracking, line) */
  // Masked images start fully clipped, and a fully clipped element never counts as
  // "intersecting". So for clip reveals we observe the parent and reveal the image.
  const targets = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    (targets.get(e.target) || []).forEach(x => x.classList.add('in'));
    io.unobserve(e.target);
  }), { threshold: .05, rootMargin: '0px 0px -6% 0px' });
  $$('[data-r]').forEach(el => {
    $$('.ln', el).forEach((l, i) => l.style.setProperty('--i', i));
    const t = el.dataset.r === 'clip' ? el.parentElement : el;
    if (!targets.has(t)) targets.set(t, []);
    targets.get(t).push(el);
    io.observe(t);
  });

  /* 4. Full-screen mobile menu, built from the header links */
  const nav = $('.nav'), mbtn = $('.mbtn');
  let menu;
  if (nav && mbtn) {
    const links = $$('a', nav);
    menu = d.createElement('div');
    menu.className = 'menu';
    menu.id = 'menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Menu');
    menu.innerHTML =
      '<div class="menu-top"><a class="logo" href="index.html">ÉLAN</a><button class="lab mbtn" style="display:block" data-close>Close</button></div>' +
      '<ul>' + links.map(a => `<li><a href="${a.getAttribute('href')}" data-img="${a.dataset.img || ''}">${a.textContent.toUpperCase()}</a></li>`).join('') + '</ul>' +
      `<div class="menu-img" aria-hidden="true"><img alt="" src="${links[0].dataset.img || ''}"></div>`;
    d.body.append(menu);
    const mi = $('.menu-img img', menu), mw = $('.menu-img', menu);
    const show = a => {
      if (!a.dataset.img || mi.getAttribute('src') === a.dataset.img) return;
      mi.src = a.dataset.img;
      mw.classList.remove('sw'); void mw.offsetWidth; mw.classList.add('sw');
    };
    $$('li a', menu).forEach(a => ['pointerenter', 'focus', 'touchstart'].forEach(ev => a.addEventListener(ev, () => show(a), { passive: true })));
    const setMenu = on => {
      menu.classList.toggle('open', on);
      d.body.classList.toggle('lock', on);
      mbtn.setAttribute('aria-expanded', on);
      if (on) $('[data-close]', menu).focus(); else mbtn.focus({ preventScroll: true });
    };
    mbtn.addEventListener('click', () => setMenu(true));
    $('[data-close]', menu).addEventListener('click', () => setMenu(false));
    addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
    addEventListener('resize', () => { if (innerWidth > 820 && menu.classList.contains('open')) setMenu(false); });
  }

  /* 5. Custom cursor (fine pointers only) */
  let cur;
  if (FINE) {
    cur = d.createElement('div');
    cur.className = 'cur';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span></span>';
    d.body.append(cur);
    de.classList.add('has-cur');
    const lab = cur.firstChild;
    let x = 0, y = 0, tx = 0, ty = 0, seen = false;
    addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { x = tx; y = ty; seen = true; cur.classList.add('on'); }
    }, { passive: true });
    de.addEventListener('mouseleave', () => cur.classList.remove('on'));
    de.addEventListener('mouseenter', () => seen && cur.classList.add('on'));
    d.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t && t.dataset.cursor) { lab.textContent = t.dataset.cursor; cur.classList.add('big'); }
      else { lab.textContent = ''; cur.classList.remove('big'); }
    });
    (function loop() {
      const k = RM ? 1 : .22;
      x += (tx - x) * k; y += (ty - y) * k;
      cur.style.transform = `translate3d(${x}px,${y}px,0)`;
      requestAnimationFrame(loop);
    })();
  }

  /* 6. Follow images: image trails the cursor on desktop, taps open inline on touch */
  const items = $$('[data-follow]');
  if (items.length && FINE) {
    const fol = d.createElement('div');
    fol.className = 'fol';
    fol.setAttribute('aria-hidden', 'true');
    fol.innerHTML = '<img alt="">';
    d.body.append(fol);
    const img = fol.firstChild;
    let x = 0, y = 0, tx = 0, ty = 0, active = false;
    const place = e => {
      const w = fol.offsetWidth, h = fol.offsetHeight;
      tx = Math.min(e.clientX + 46, innerWidth - w - 12);
      ty = Math.min(Math.max(e.clientY - h / 2, 70), innerHeight - h - 12);
    };
    items.forEach(it => {
      it.addEventListener('mouseenter', e => {
        img.src = it.dataset.img;
        place(e);
        if (!active) { x = tx; y = ty; }
        active = true; fol.classList.add('on');
      });
      it.addEventListener('mousemove', place, { passive: true });
      it.addEventListener('mouseleave', () => { active = false; fol.classList.remove('on'); });
    });
    (function loop() {
      if (active) {
        const k = RM ? 1 : .14;
        x += (tx - x) * k; y += (ty - y) * k;
        fol.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
      requestAnimationFrame(loop);
    })();
  } else if (items.length) {
    items.forEach(it => {
      const li = it.parentElement;
      const t = d.createElement('span');
      t.className = 'tap fig p';
      t.innerHTML = `<img alt="" loading="lazy" src="${it.dataset.img}">`;
      li.append(t);
      it.addEventListener('click', e => {
        const isOpen = li.classList.contains('open');
        $$('.open', li.parentElement).forEach(o => o.classList.remove('open'));
        if (!isOpen) { li.classList.add('open'); e.preventDefault(); e.stopPropagation(); }
        else if (it.tagName === 'BUTTON') li.classList.remove('open');
      }, true);
    });
  }

  /* 7. Horizontal lookbook strip: native scroll + wheel + mouse drag */
  $$('.strip').forEach(s => {
    let down = false, sx = 0, sl = 0, moved = 0;
    $$('img,a', s).forEach(n => { n.draggable = false; });
    s.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0; sx = e.clientX; sl = s.scrollLeft; s.classList.add('drag');
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      moved = Math.max(moved, Math.abs(dx));
      s.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', () => { down = false; s.classList.remove('drag'); });
    s.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    s.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = s.scrollWidth - s.clientWidth;
      if ((e.deltaY > 0 && s.scrollLeft < max - 1) || (e.deltaY < 0 && s.scrollLeft > 0)) {
        e.preventDefault(); s.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  });

  /* 8. Typographic interlude: words drift against each other while scrolling */
  const ints = $$('[data-drift]');
  if (ints.length && !RM) {
    let queued = false;
    const update = () => {
      queued = false;
      ints.forEach(sec => {
        const r = sec.getBoundingClientRect(), vh = innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        const p = (vh - r.top) / (vh + r.height) - .5;
        $$('[data-s]', sec).forEach(w => { w.style.transform = `translate3d(${(p * w.dataset.s).toFixed(2)}vw,0,0)`; });
      });
    };
    const req = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    update();
  }

  /* 9. Full-screen image viewer (lookbook page): no arrows, Esc / backdrop / button close */
  const looks = $$('.gal [data-n]');
  if (looks.length) {
    const vw = d.createElement('div');
    vw.className = 'vw';
    vw.setAttribute('role', 'dialog');
    vw.setAttribute('aria-modal', 'true');
    vw.setAttribute('aria-label', 'Look viewer');
    vw.dataset.cursor = 'CLOSE';
    vw.innerHTML = '<div class="vw-in" data-cursor=""><figure class="vw-f"><img alt=""></figure>' +
      '<div class="vw-cap"><div><p class="lab" data-n></p><p class="mut" data-m></p></div><button class="lab vw-x">Close</button></div></div>';
    d.body.append(vw);
    const vimg = $('img', vw), vf = $('.vw-f', vw), x = $('.vw-x', vw);
    let last = null;
    const open = b => {
      last = b;
      vf.classList.remove('miss');
      const src = $('img', b).getAttribute('src');
      vimg.alt = $('img', b).alt;
      vimg.src = src;
      vf.dataset.ph = src.split('/').slice(-2).join('/');
      $('[data-n]', vw).textContent = b.dataset.n;
      $('[data-m]', vw).textContent = b.dataset.m;
      vw.classList.add('open');
      d.body.classList.add('lock');
      x.focus({ preventScroll: true });
    };
    const close = () => {
      vw.classList.remove('open');
      d.body.classList.remove('lock');
      if (last) last.focus({ preventScroll: true });
    };
    looks.forEach(b => b.addEventListener('click', () => open(b)));
    x.addEventListener('click', close);
    vw.addEventListener('click', e => { if (e.target === vw) close(); });
    addEventListener('keydown', e => {
      if (!vw.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { e.preventDefault(); x.focus(); }
    });
    const hit = location.hash && looks.find(b => '#' + b.id === location.hash);
    if (hit) setTimeout(() => open(hit), RM ? 0 : 900);
  }
})();
