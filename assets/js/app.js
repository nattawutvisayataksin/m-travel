/* =========================================================
   M-Travel — แกนหลักของเว็บ
   โหลดข้อมูลจาก Supabase (หรือโหมดตัวอย่าง), สร้างเมนู/hero/footer,
   ระบบ Lightbox รูป, และตัวช่วยต่าง ๆ ที่ทุกหน้าใช้ร่วมกัน
   ========================================================= */
(function () {
  'use strict';

  var cfg = window.SUPABASE_CONFIG || {};
  var hasConfig = /^https:\/\/.+/i.test(cfg.url || '') && String(cfg.anonKey || '').length > 20;

  var MT = (window.MT = {
    demo: !hasConfig,
    sb: null,
    trips: [],
    settings: {},
    user: null,
    loadError: '',
  });

  if (hasConfig && window.supabase) {
    try {
      MT.sb = window.supabase.createClient(cfg.url.replace(/\/+$/, ''), cfg.anonKey);
    } catch (err) {
      console.error('สร้าง Supabase client ไม่สำเร็จ:', err);
      MT.loadError = 'ตั้งค่า Supabase ไม่ถูกต้อง: ' + (err && err.message ? err.message : err);
    }
  }

  var DEFAULT_SETTINGS = {
    site_title: 'M-Travel',
    tagline: 'บันทึกการเดินทางของฉัน',
    hero_url: 'https://picsum.photos/seed/mtravel-hero/1600/700',
    about_text:
      'สวัสดี 👋 ยินดีต้อนรับสู่บันทึกการเดินทางส่วนตัว\n\n' +
      'เว็บนี้สร้างขึ้นเพื่อเก็บเรื่องราว รูปถ่าย และความทรงจำดี ๆ จากทุกการเดินทาง ' +
      'เผื่อวันนึงความจำเริ่มเลือนราง อย่างน้อยก็ยังมีบันทึกไว้ให้กลับมาเปิดดูได้เสมอ\n\n' +
      'เข้าสู่ระบบที่หน้า "ผู้ดูแล" เพื่อเริ่มเขียนบันทึกทริปของคุณเองได้เลย',
  };

  var THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  /* ---------- ตัวช่วยทั่วไป ---------- */

  MT.q = function (sel, el) { return (el || document).querySelector(sel); };
  MT.qa = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  MT.qs = new URLSearchParams(window.location.search);

  MT.escapeHtml = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  MT.paragraphs = function (text) {
    return String(text || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  };

  MT.lines = function (text) {
    return String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  };

  /* ---------- เนื้อหาแบบรวย (ตัวหนา/ลิงก์/ลิสต์) ---------- */
  var RICH_TAG_RE = /<(p|br|b|strong|i|em|u|a|ul|ol|li|h3|h4|blockquote)\b/i;
  var ALLOWED_TAGS = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, A: 1, UL: 1, OL: 1, LI: 1, H3: 1, H4: 1, BLOCKQUOTE: 1, IMG: 1 };

  MT.isRichText = function (text) {
    return RICH_TAG_RE.test(String(text || ''));
  };

  /* ข้อความธรรมดา (ของเก่า) → HTML ย่อหน้า */
  MT.textToRichHtml = function (text) {
    return MT.paragraphs(text).map(function (p) {
      return '<p>' + MT.escapeHtml(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  };

  /* กรอง HTML ให้เหลือเฉพาะแท็กที่อนุญาต — ปลอดภัยเวลาแสดงผล */
  MT.sanitizeRichHtml = function (html) {
    var holder = document.createElement('div');
    holder.innerHTML = String(html || '');

    /* แท็กพิษพวงนี้ลบทิ้งทั้งก้อน (รวมเนื้อหาข้างใน) */
    var DROP_TAGS = {
      SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1,
      TEMPLATE: 1, LINK: 1, META: 1, BASE: 1, TITLE: 1, FORM: 1, SVG: 1, MATH: 1
    };

    function cleanAttrs(el) {
      var tag = el.tagName;
      Array.prototype.slice.call(el.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var keep = (tag === 'A' && name === 'href') || (tag === 'IMG' && (name === 'src' || name === 'alt'));
        if (!keep) el.removeAttribute(attr.name);
      });
      if (tag === 'A') {
        var href = (el.getAttribute('href') || '').trim();
        if (!/^https?:\/\//i.test(href)) {
          el.removeAttribute('href');
        } else {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
      if (tag === 'IMG') {
        var src = (el.getAttribute('src') || '').trim();
        if (!/^https?:\/\//i.test(src)) {
          el.removeAttribute('src'); /* กัน src ปลอม เช่น javascript: หรือ data: */
        } else {
          el.setAttribute('src', src.replace(/^http:\/\//i, 'https://')); /* เว็บเราเป็น https */
          el.setAttribute('loading', 'lazy');
        }
      }
    }

    function clean(el) {
      var node = el.firstChild;
      while (node) {
        var next = node.nextSibling;
        if (node.nodeType === 8 || node.nodeType === 7) {
          node.remove(); /* comment / PI */
        } else if (node.nodeType === 1) {
          var tag = (node.tagName || '').toUpperCase();
          if (DROP_TAGS[tag]) {
            node.remove();
          } else if (!ALLOWED_TAGS[tag]) {
            /* แท็กไม่รู้จัก: ดึงเนื้อหาข้างในออกมาวางแทน แล้วไล่ทำความสะอาดต่อจากลูกที่ย้ายมา */
            var first = node.firstChild;
            var child = first;
            while (child) {
              var cNext = child.nextSibling;
              el.insertBefore(child, node);
              child = cNext;
            }
            el.removeChild(node);
            node = first || next;
            continue;
          } else {
            cleanAttrs(node);
            clean(node);
          }
        }
        node = next;
      }
    }

    clean(holder);
    return holder.innerHTML.trim();
  };

  /* ตัดแท็กออก เหลือข้อความล้วน (ใช้ตอนค้นหา) */
  MT.stripTags = function (text) {
    return String(text || '').replace(/<[^>]*>/g, ' ');
  };


  MT.parseDate = function (value) {
    if (!value) return null;
    var d = new Date(String(value).slice(0, 10) + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  };

  MT.formatDate = function (value) {
    var d = MT.parseDate(value);
    if (!d) return '';
    return d.getDate() + ' ' + THAI_MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543);
  };

  MT.formatRange = function (start, end) {
    var a = MT.parseDate(start);
    var b = MT.parseDate(end);
    if (!a && !b) return '';
    if (!b || start === end) return MT.formatDate(start);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
      return a.getDate() + '–' + b.getDate() + ' ' + THAI_MONTHS[b.getMonth()] + ' ' + (b.getFullYear() + 543);
    }
    return MT.formatDate(start) + ' – ' + MT.formatDate(end);
  };

  MT.tripDays = function (trip) {
    var a = MT.parseDate(trip.start_date);
    var b = MT.parseDate(trip.end_date);
    if (!a) return 0;
    var to = b || a;
    return Math.max(1, Math.round((to - a) / 86400000) + 1);
  };

  MT.tripPhotoCount = function (trip) {
    return Array.isArray(trip.photos) ? trip.photos.length : 0;
  };

  MT.toast = function (message, type) {
    type = type || 'ok';
    var wrap = MT.q('#toast-wrap');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML =
      (type === 'err' ? MT.icon('alert') : type === 'info' ? MT.icon('info') : MT.icon('check')) + '<span></span>';
    el.querySelector('span').textContent = message;
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 350);
    }, 4200);
  };

  /* ---------- ไอคอน SVG (สไตล์เส้นบาง) ---------- */

  var ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 6.5l3 3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.5-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.5 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
  };

  MT.icon = function (name) { return ICONS[name] || ''; };

  /* ---------- โหลดข้อมูลจาก Supabase (หรือโหมดตัวอย่าง) ---------- */

  MT.loadData = async function () {
    if (MT.demo) {
      MT.trips = (window.DEMO_TRIPS || []).map(function (t) { return Object.assign({}, t); });
      MT.settings = Object.assign({}, DEFAULT_SETTINGS, window.DEMO_SETTINGS || {});
      return;
    }
    if (!MT.sb) return;
    try {
      var results = await Promise.all([
        MT.sb.from('trips').select('*').order('start_date', { ascending: false, nullsFirst: false }),
        MT.sb.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      ]);
      var tripsRes = results[0];
      var setRes = results[1];
      if (tripsRes.error) {
        MT.loadError = tripsRes.error.message;
        console.error('โหลดทริปไม่สำเร็จ:', tripsRes.error);
      }
      MT.trips = tripsRes.data || [];
      MT.settings = Object.assign({}, DEFAULT_SETTINGS, setRes.data || {});
      try {
        var userRes = await MT.sb.auth.getUser();
        MT.user = userRes && userRes.data && userRes.data.user ? userRes.data.user : null;
      } catch (e) {
        MT.user = null;
      }
    } catch (err) {
      MT.loadError = (err && err.message) ? err.message : String(err);
      console.error('โหลดข้อมูลไม่สำเร็จ:', err);
    }
  };

  MT.publicTrips = function () {
    return MT.trips.filter(function (t) { return t.is_public !== false; });
  };

  /* ---------- โครงหน้า: แบนเนอร์ / เมนู / hero / footer ---------- */

  MT.renderChrome = function (opts) {
    opts = opts || {};
    var settings = MT.settings;
    var siteTitle = settings.site_title || 'M-Travel';

    document.title = opts.title
      ? opts.title + ' · ' + siteTitle
      : siteTitle + ' — ' + (settings.tagline || 'บันทึกการเดินทางของฉัน');

    /* แบนเนอร์โหมดตัวอย่าง / ข้อผิดพลาด */
    var banner = MT.q('#demo-banner');
    if (banner) {
      if (MT.loadError) {
        banner.classList.remove('hidden');
        banner.classList.add('demo-banner--error');
        var textEl = MT.q('.demo-text', banner);
        if (textEl) textEl.textContent = 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ' + MT.loadError;
        var closeBtn = MT.q('.demo-close', banner);
        if (closeBtn) closeBtn.remove();
      } else if (MT.demo && sessionStorage.getItem('mt-demo-dismissed') !== '1') {
        banner.classList.remove('hidden');
        var btn = MT.q('.demo-close', banner);
        if (btn) {
          btn.addEventListener('click', function () {
            banner.classList.add('hidden');
            sessionStorage.setItem('mt-demo-dismissed', '1');
          });
        }
      }
    }

    /* เมนู */
    var brand = MT.q('#brand-name');
    if (brand) brand.textContent = siteTitle;

    var panel = MT.q('#countries-panel');
    if (panel) {
      var seen = {};
      var countries = [];
      MT.publicTrips().forEach(function (t) {
        var c = (t.country || '').trim();
        if (c && !seen[c]) { seen[c] = true; countries.push(c); }
      });
      countries.sort(function (a, b) { return a.localeCompare(b, 'th'); });
      panel.innerHTML =
        '<a href="index.html">ดูทุกทริป</a>' +
        countries.map(function (c) {
          return '<a href="index.html?country=' + encodeURIComponent(c) + '">' + MT.escapeHtml(c) + '</a>';
        }).join('');
    }

    /* ปุ่มเมนูมือถือ */
    var nav = MT.q('#site-nav');
    var toggle = MT.q('#nav-toggle');
    if (toggle && nav) {
      toggle.addEventListener('click', function () { nav.classList.toggle('nav-open'); });
    }

    /* เมนูประเทศแบบ dropdown */
    var drop = MT.q('#nav-countries');
    if (drop) {
      var dropBtn = MT.q('.nav-drop-btn', drop);
      if (dropBtn) {
        dropBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          drop.classList.toggle('open');
        });
      }
      document.addEventListener('click', function (e) {
        if (!drop.contains(e.target)) drop.classList.remove('open');
      });
    }

    /* ไฮไลต์ลิงก์เมนูปัจจุบัน */
    if (opts.active) {
      var link = MT.q('[data-nav="' + opts.active + '"]');
      if (link) link.classList.add('active');
    }

    /* ช่องค้นหา: หน้าแรกกรองสด หน้าอื่นส่งไป index.html?q= */
    var searchForm = MT.q('#nav-search-form');
    var searchInput = MT.q('#nav-search-input');
    if (searchForm && searchInput) {
      if (MT.q('#posts')) {
        searchForm.addEventListener('submit', function (e) { e.preventDefault(); });
        searchInput.addEventListener('input', function () {
          document.dispatchEvent(new CustomEvent('mt:search', { detail: { q: searchInput.value } }));
        });
        var initial = MT.qs.get('q');
        if (initial) searchInput.value = initial;
      }
    }

    /* Hero */
    var hero = MT.q('#hero');
    if (hero) {
      if (opts.showHero === false) {
        hero.style.display = 'none';
      } else {
        var h = opts.hero || {};
        var bg = MT.q('#hero-bg');
        var title = MT.q('#hero-title');
        var tagline = MT.q('#hero-tagline');
        if (bg) {
          if (h.image) {
            bg.style.backgroundImage = 'url("' + h.image + '")';
            bg.classList.remove('hero-bg--fallback');
          } else {
            bg.style.backgroundImage = '';
            bg.classList.add('hero-bg--fallback');
          }
        }
        if (title && h.title != null) title.textContent = h.title;
        if (tagline) tagline.textContent = h.tagline || '';
        if (h.tagline) tagline.style.display = '';
        else if (tagline) tagline.style.display = 'none';
      }
    }

    /* Footer */
    var footer = MT.q('#footer-copy');
    if (footer) {
      footer.innerHTML =
        '© ' + new Date().getFullYear() + ' <strong>' + MT.escapeHtml(siteTitle) + '</strong>' +
        (settings.tagline ? ' — ' + MT.escapeHtml(settings.tagline) : '') +
        ' · <a href="admin.html">ผู้ดูแลเว็บ</a>';
    }
  };

  /* ---------- Lightbox รูปแกลเลอรี ---------- */

  MT.openLightbox = function (photos, index) {
    photos = photos || [];
    if (!photos.length) return;
    var cur = index || 0;

    var el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML =
      '<button class="lb-btn lb-close" aria-label="ปิด">' + MT.icon('close') + '</button>' +
      '<div class="lb-counter"></div>' +
      '<button class="lb-btn lb-prev" aria-label="รูปก่อนหน้า">' + MT.icon('left') + '</button>' +
      '<figure class="lb-stage"><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-next" aria-label="รูปถัดไป">' + MT.icon('right') + '</button>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    var img = MT.q('img', el);
    var cap = MT.q('figcaption', el);
    var counter = MT.q('.lb-counter', el);

    function show(i) {
      cur = ((i % photos.length) + photos.length) % photos.length;
      var p = photos[cur];
      img.src = p.url || '';
      img.alt = p.caption || '';
      cap.textContent = p.caption || '';
      cap.style.display = p.caption ? '' : 'none';
      counter.textContent = (cur + 1) + ' / ' + photos.length;
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      el.remove();
      document.body.style.overflow = '';
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    }

    MT.q('.lb-close', el).addEventListener('click', close);
    MT.q('.lb-prev', el).addEventListener('click', function (e) { e.stopPropagation(); show(cur - 1); });
    MT.q('.lb-next', el).addEventListener('click', function (e) { e.stopPropagation(); show(cur + 1); });
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    document.addEventListener('keydown', onKey);

    show(cur);
  };
})();
