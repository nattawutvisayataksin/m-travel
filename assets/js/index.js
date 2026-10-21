/* =========================================================
   หน้าแรก — สถิติการเดินทาง + ตัวกรอง + กริดการ์ดทริป
   ========================================================= */
(async function () {
  await MT.loadData();
  MT.renderChrome({
    active: 'home',
    hero: { title: MT.settings.site_title, tagline: MT.settings.tagline, image: MT.settings.hero_url },
    showStats: true,
  });

  var state = {
    q: (MT.qs.get('q') || '').trim(),
    country: MT.qs.get('country') || '',
    year: MT.qs.get('year') || '',
    sort: MT.qs.get('sort') || 'new',
  };

  var trips = MT.publicTrips();

  /* ---------- สถิติการเดินทาง ---------- */
  var strip = MT.q('#stats-strip');
  if (strip) {
    var countrySet = {};
    var totalDays = 0;
    var totalPhotos = 0;
    trips.forEach(function (t) {
      var c = (t.country || '').trim();
      if (c) countrySet[c] = true;
      totalDays += MT.tripDays(t);
      totalPhotos += MT.tripPhotoCount(t);
    });
    var stats = [
      { num: trips.length, label: 'ทริปที่บันทึกไว้' },
      { num: Object.keys(countrySet).length, label: 'ประเทศที่ไปแล้ว' },
      { num: totalDays, label: 'วันเดินทางรวม' },
      { num: totalPhotos, label: 'รูปถ่ายในคลัง' },
    ];
    strip.innerHTML =
      '<div class="stats-inner">' +
      stats.map(function (s) {
        return '<div class="stat"><div class="stat-num">' + s.num + '</div><div class="stat-label">' + s.label + '</div></div>';
      }).join('') +
      '</div>';
  }

  /* ---------- ตัวกรอง ---------- */
  var countrySel = MT.q('#filter-country');
  var yearSel = MT.q('#filter-year');
  var sortSel = MT.q('#filter-sort');
  var clearBtn = MT.q('#clear-filters');

  var countryList = Object.keys(trips.reduce(function (acc, t) {
    var c = (t.country || '').trim();
    if (c) acc[c] = true;
    return acc;
  }, {})).sort(function (a, b) { return a.localeCompare(b, 'th'); });

  var yearList = [];
  trips.forEach(function (t) {
    var d = MT.parseDate(t.start_date);
    if (d && yearList.indexOf(d.getFullYear()) < 0) yearList.push(d.getFullYear());
  });
  yearList.sort(function (a, b) { return b - a; });

  if (countrySel) {
    countrySel.innerHTML =
      '<option value="">ทุกประเทศ</option>' +
      countryList.map(function (c) {
        return '<option value="' + MT.escapeHtml(c) + '">' + MT.escapeHtml(c) + '</option>';
      }).join('');
    countrySel.value = state.country;
    if (countrySel.value !== state.country) state.country = '';
  }
  if (yearSel) {
    yearSel.innerHTML =
      '<option value="">ทุกปี</option>' +
      yearList.map(function (y) {
        return '<option value="' + y + '">ปี ' + (y + 543) + '</option>';
      }).join('');
    yearSel.value = state.year;
    if (yearSel.value !== state.year) state.year = '';
  }
  if (sortSel) sortSel.value = state.sort;

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.country) p.set('country', state.country);
    if (state.year) p.set('year', state.year);
    if (state.sort !== 'new') p.set('sort', state.sort);
    var str = p.toString();
    history.replaceState(null, '', str ? '?' + str : window.location.pathname);
  }

  function filtered() {
    var list = trips.slice();
    if (state.country) {
      list = list.filter(function (t) { return (t.country || '').trim() === state.country; });
    }
    if (state.year) {
      list = list.filter(function (t) {
        var d = MT.parseDate(t.start_date);
        return d && String(d.getFullYear()) === state.year;
      });
    }
    if (state.q) {
      var q = state.q.toLowerCase();
      list = list.filter(function (t) {
        var hay = [t.title, t.country, t.location, t.summary, t.content, (t.highlights || []).join(' ')]
          .join(' ').toLowerCase();
        return hay.indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) {
      if (state.sort === 'name') return (a.title || '').localeCompare(b.title || '', 'th');
      var da = MT.parseDate(a.start_date), db = MT.parseDate(b.start_date);
      var ta = da ? da.getTime() : 0, tb = db ? db.getTime() : 0;
      return state.sort === 'old' ? ta - tb : tb - ta;
    });
    return list;
  }

  function cardHtml(t) {
    var cover = t.cover_url || '';
    var date = MT.formatRange(t.start_date, t.end_date);
    var loc = [t.country, t.location].filter(Boolean).join(' · ');
    var initial = ((t.country || t.title || '✈').trim().charAt(0)) || '✈';
    return (
      '<a class="post" href="trip.html?p=' + encodeURIComponent(t.id) + '">' +
      (cover
        ? '<img class="post-img" src="' + MT.escapeHtml(cover) + '" alt="' + MT.escapeHtml(t.title) + '" loading="lazy">'
        : '<div class="post-img post-img-fallback"><span>' + MT.escapeHtml(initial) + '</span></div>') +
      '<div class="post-overlay"><div class="post-header">' +
      (date ? '<p class="post-date">' + MT.escapeHtml(date) + '</p>' : '') +
      '<h2 class="post-title">' + MT.escapeHtml(t.title) + '</h2>' +
      (loc ? '<p class="post-meta">' + MT.escapeHtml(loc) + '</p>' : '') +
      '</div></div></a>'
    );
  }

  function renderGrid() {
    var list = filtered();
    var count = MT.q('#result-count');
    if (count) count.textContent = 'พบ ' + list.length + ' ทริป';
    var wrap = MT.q('#posts');
    if (wrap) wrap.innerHTML = list.map(cardHtml).join('');
    var empty = MT.q('#empty-state');
    if (empty) empty.classList.toggle('hidden', list.length > 0);
    var hasFilter = !!(state.q || state.country || state.year || state.sort !== 'new');
    if (clearBtn) clearBtn.classList.toggle('hidden', !hasFilter);
  }

  if (countrySel) countrySel.addEventListener('change', function () { state.country = countrySel.value; syncUrl(); renderGrid(); });
  if (yearSel) yearSel.addEventListener('change', function () { state.year = yearSel.value; syncUrl(); renderGrid(); });
  if (sortSel) sortSel.addEventListener('change', function () { state.sort = sortSel.value; syncUrl(); renderGrid(); });
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      state.q = ''; state.country = ''; state.year = ''; state.sort = 'new';
      if (countrySel) countrySel.value = '';
      if (yearSel) yearSel.value = '';
      if (sortSel) sortSel.value = 'new';
      var navInput = MT.q('#nav-search-input');
      if (navInput) navInput.value = '';
      syncUrl();
      renderGrid();
    });
  }

  document.addEventListener('mt:search', function (e) {
    state.q = ((e.detail && e.detail.q) || '').trim();
    syncUrl();
    renderGrid();
  });

  renderGrid();
})();
