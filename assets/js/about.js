/* =========================================================
   หน้าเกี่ยวกับฉัน — about.html
   ========================================================= */
(async function () {
  await MT.loadData();
  MT.renderChrome({
    active: 'about',
    title: 'เกี่ยวกับฉัน',
    hero: { title: 'เกี่ยวกับฉัน', tagline: MT.settings.site_title, image: MT.settings.hero_url },
  });

  var root = MT.q('#about-root');
  if (!root) return;

  var raw = MT.settings.about_text || '';
  var body = raw
    ? (MT.isRichText(raw) ? MT.sanitizeRichHtml(raw) : MT.paragraphs(raw).map(function (p) {
        return '<p>' + MT.escapeHtml(p) + '</p>';
      }).join(''))
    : '<p>ยังไม่ได้เขียนเนื้อหาหน้านี้ — แก้ไขได้ที่หน้า <a href="admin.html">ผู้ดูแล</a> → ตั้งค่าเว็บ</p>';

  /* แสดงประเทศที่เคยไปเป็นชิป */
  var seen = {};
  var countries = [];
  MT.publicTrips().forEach(function (t) {
    var c = (t.country || '').trim();
    if (c && !seen[c]) { seen[c] = true; countries.push(c); }
  });
  countries.sort(function (a, b) { return a.localeCompare(b, 'th'); });

  var chipsHtml = countries.length
    ? '<h3 class="about-chips-title">' + MT.icon('compass') + ' ประเทศที่เคยไป (' + countries.length + ')</h3>' +
      '<div class="about-chips">' +
      countries.map(function (c) {
        return '<a class="chip chip-accent" href="index.html?country=' + encodeURIComponent(c) + '">' + MT.escapeHtml(c) + '</a>';
      }).join('') +
      '</div>'
    : '';

  root.innerHTML =
    '<div class="about-wrap">' +
    '<div class="about-body">' + body + '</div>' +
    chipsHtml +
    '</div>';
})();
