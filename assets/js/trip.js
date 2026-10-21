/* =========================================================
   หน้ารายละเอียดทริป — trip.html?p=<id>
   ========================================================= */
(async function () {
  await MT.loadData();

  var id = MT.qs.get('p');
  var trips = MT.publicTrips();
  var idx = -1;
  for (var i = 0; i < trips.length; i++) {
    if (trips[i].id === id) { idx = i; break; }
  }
  var trip = idx >= 0 ? trips[idx] : null;
  var root = MT.q('#trip-root');

  if (!trip) {
    MT.renderChrome({ active: '', showHero: false, title: 'ไม่พบทริป' });
    root.innerHTML =
      '<div class="notfound">' +
      '<p class="notfound-emoji">🧭</p>' +
      '<h1>ไม่พบบันทึกทริปนี้</h1>' +
      '<p>ลิงก์อาจไม่ถูกต้อง หรือทริปนี้ถูกตั้งเป็น "ฉบับร่าง" (ไม่เผยแพร่) อยู่</p>' +
      '<p style="margin-top:22px"><a class="btn btn-accent" href="index.html">กลับหน้าแรก</a></p>' +
      '</div>';
    return;
  }

  var dateText = MT.formatRange(trip.start_date, trip.end_date);
  MT.renderChrome({
    active: '',
    title: trip.title,
    hero: {
      title: trip.title,
      tagline: [dateText, trip.location].filter(Boolean).join(' · '),
      image: trip.cover_url,
    },
  });

  /* ---------- แถบข้อมูลโดยย่อ ---------- */
  var chips = [];
  if (trip.country) chips.push({ html: MT.icon('pin') + MT.escapeHtml(trip.country), accent: true });
  if (dateText) chips.push({ html: MT.icon('calendar') + MT.escapeHtml(dateText) });
  if (MT.tripDays(trip) > 1) chips.push({ html: MT.icon('clock') + MT.tripDays(trip) + ' วัน' });
  chips.push({ html: MT.icon('camera') + MT.tripPhotoCount(trip) + ' รูป' });

  /* ---------- เนื้อหา ---------- */
  var lead = trip.summary ? '<p class="trip-lead">' + MT.escapeHtml(trip.summary) + '</p>' : '';
  var body = MT.isRichText(trip.content)
    ? MT.sanitizeRichHtml(trip.content)
    : MT.paragraphs(trip.content).map(function (p) {
        return '<p>' + MT.escapeHtml(p).replace(/\n/g, '<br>') + '</p>';
      }).join('');

  var highlights = (Array.isArray(trip.highlights) ? trip.highlights : []).filter(Boolean);
  var highlightsHtml = highlights.length
    ? '<section class="highlights"><h3>' + MT.icon('star') + ' จุดเด่นของทริป</h3><ul>' +
      highlights.map(function (h) { return '<li>' + MT.escapeHtml(h) + '</li>'; }).join('') +
      '</ul></section>'
    : '';

  /* ---------- แกลเลอรี ---------- */
  var photos = (Array.isArray(trip.photos) ? trip.photos : []).filter(function (p) { return p && p.url; });
  var galleryHtml = photos.length
    ? '<section class="gallery">' +
      photos.map(function (p, i) {
        return (
          '<figure class="gallery-item" data-index="' + i + '" title="คลิกเพื่อดูรูปเต็ม">' +
          '<img src="' + MT.escapeHtml(p.url) + '" alt="' + MT.escapeHtml(p.caption || trip.title) + '" loading="lazy">' +
          (p.caption ? '<figcaption>' + MT.escapeHtml(p.caption) + '</figcaption>' : '') +
          '</figure>'
        );
      }).join('') +
      '</section>'
    : '';

  /* ---------- ทริปก่อนหน้า / ถัดไป ---------- */
  var prev = idx > 0 ? trips[idx - 1] : null;        // ใหม่กว่า
  var next = idx < trips.length - 1 ? trips[idx + 1] : null; // เก่ากว่า
  var navHtml = (prev || next)
    ? '<nav class="trip-nav">' +
      (prev
        ? '<a class="prev" href="trip.html?p=' + encodeURIComponent(prev.id) + '"><span class="tn-label">' + MT.icon('left') + ' ทริปใหม่กว่า</span><span class="tn-title">' + MT.escapeHtml(prev.title) + '</span></a>'
        : '<span></span>') +
      (next
        ? '<a class="next" href="trip.html?p=' + encodeURIComponent(next.id) + '"><span class="tn-label">ทริปเก่ากว่า ' + MT.icon('right') + '</span><span class="tn-title">' + MT.escapeHtml(next.title) + '</span></a>'
        : '') +
      '</nav>'
    : '';

  var editLink = MT.user
    ? '<p style="margin-top:26px"><a class="btn btn-ghost btn-sm" href="admin.html?edit=' + encodeURIComponent(trip.id) + '">' + MT.icon('edit') + ' แก้ไขทริปนี้</a></p>'
    : '';

  root.innerHTML =
    '<div class="trip-wrap">' +
    '<a class="trip-back" href="index.html">' + MT.icon('left') + ' กลับหนารวมทริปทั้งหมด</a>' +
    '<div class="trip-meta">' +
    chips.map(function (c) { return '<span class="chip' + (c.accent ? ' chip-accent' : '') + '">' + c.html + '</span>'; }).join('') +
    '</div>' +
    '<article class="trip-body">' +
    lead + body + highlightsHtml + galleryHtml +
    '</article>' +
    navHtml +
    editLink +
    '</div>';

  /* คลิกรูปเปิด Lightbox */
  root.addEventListener('click', function (e) {
    var item = e.target.closest ? e.target.closest('.gallery-item') : null;
    if (item) MT.openLightbox(photos, parseInt(item.getAttribute('data-index'), 10) || 0);
  });
})();
