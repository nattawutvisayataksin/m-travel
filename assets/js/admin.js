/* =========================================================
   หน้าผู้ดูแล — admin.html
   ล็อกอินด้วย Supabase Auth → จัดการทริป / ตั้งค่าเว็บ / Backup
   ========================================================= */
(async function () {
  await MT.loadData();
  MT.renderChrome({ active: 'admin', showHero: false, title: 'ผู้ดูแลเว็บ' });

  var root = MT.q('#admin-root');
  var editingId = null;
  var editorPhotos = [];

  /* =========================================================
     โหมดตัวอย่าง: ยังไม่ได้ตั้งค่า Supabase → แสดงคำแนะนำ
     ========================================================= */
  if (MT.demo) {
    root.innerHTML =
      '<div class="setup-guide">' +
      '<div class="admin-card">' +
      '<h2 class="admin-title">' + MT.icon('gear') + ' ยังไม่ได้เชื่อมต่อฐานข้อมูล</h2>' +
      '<p class="admin-sub">ตอนนี้เว็บกำลังแสดง "ข้อมูลตัวอย่าง" ให้ดูหน้าตาก่อน ทำตาม 5 ขั้นตอนนี้เพื่อเริ่มบันทึกทริปจริง</p>' +
      '<ol>' +
      '<li>สร้างโปรเจกต์ฟรีที่ <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com ' + MT.icon('external') + '</a></li>' +
      '<li>เปิด <strong>SQL Editor</strong> แล้วรันไฟล์ <code>supabase-schema.sql</code> ที่อยู่ในโปรเจกต์นี้ ' +
      '(<strong>แก้อีเมลผู้ดูแลในไฟล์ก่อนรัน</strong> — บรรทัดที่เขียนว่า <code>insert into admins</code>)</li>' +
      '<li>เปิดเมนู <strong>Authentication → Sign In / Up</strong> แล้วเปิดผู้ให้ล็อกอินด้วย <strong>Email</strong></li>' +
      '<li>ไปที่ <strong>Settings → API</strong> คัดลอก <em>Project URL</em> และ <em>anon public key</em> มาใส่ในไฟล์ <code>assets/js/config.js</code></li>' +
      '<li>Deploy เว็บขึ้นโฮสติง (วิธีละเอียดอยู่ใน <code>README.md</code>) แล้วกลับมาหน้านี้เพื่อสมัครบัญชีผู้ดูแล</li>' +
      '</ol>' +
      '<div class="step-note">' + MT.icon('info') + ' อีเมลที่ใช้สมัครต้องตรงกับอีเมลที่ใส่ไว้ในตาราง <code>admins</code> ถึงจะมีสิทธิ์บันทึกข้อมูล</div>' +
      '<p style="margin-top:18px"><a class="btn btn-accent" href="index.html">' + MT.icon('compass') + ' ดูตัวอย่างหน้าเว็บ</a></p>' +
      '</div></div>';
    return;
  }

  if (!MT.sb) {
    root.innerHTML = '<div class="admin-card"><p>เกิดข้อผิดพลาดในการเชื่อมต่อ ลองรีเฟรชหน้าใหม่</p></div>';
    return;
  }

  /* ตรวจสถานะล็อกอิน */
  var sessionRes = await MT.sb.auth.getSession();
  var session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
  MT.user = session ? session.user : null;

  if (!MT.user) renderLogin();
  else renderDashboard();

  /* =========================================================
     หน้าล็อกอิน / สมัครครั้งแรก
     ========================================================= */
  function renderLogin(mode) {
    mode = mode || 'login';
    root.innerHTML =
      '<div class="auth-wrap"><div class="admin-card auth-card">' +
      '<h2 class="admin-title">' + MT.icon('user') + ' ' + (mode === 'signup' ? 'สมัครบัญชีผู้ดูแล (ครั้งแรก)' : 'เข้าสู่ระบบผู้ดูแล') + '</h2>' +
      '<p class="admin-sub">เฉพาะเจ้าของเว็บเท่านั้นที่เพิ่ม/แก้ไขบันทึกได้ — ผู้ชมทั่วไปดูได้อย่างเดียว</p>' +
      '<form id="auth-form">' +
      '<label>อีเมล<input class="input" type="email" id="auth-email" required autocomplete="email" placeholder="you@example.com"></label>' +
      '<label>รหัสผ่าน<input class="input" type="password" id="auth-pass" required minlength="6" autocomplete="current-password" placeholder="อย่างน้อย 6 ตัวอักษร"></label>' +
      (mode === 'signup'
        ? '<label>ยืนยันรหัสผ่าน<input class="input" type="password" id="auth-pass2" required minlength="6" autocomplete="new-password"></label>'
        : '') +
      '<button type="submit" class="btn btn-accent btn-block" id="auth-submit">' +
      (mode === 'signup' ? 'สมัครบัญชี' : 'เข้าสู่ระบบ') + '</button>' +
      '</form>' +
      '<div class="auth-links">' +
      '<button class="linklike" id="auth-mode">' + (mode === 'signup' ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครครั้งแรก') + '</button>' +
      '<button class="linklike" id="auth-forgot">ลืมรหัสผ่าน?</button>' +
      '</div>' +
      '</div></div>';

    MT.q('#auth-mode').addEventListener('click', function () {
      renderLogin(mode === 'signup' ? 'login' : 'signup');
    });

    MT.q('#auth-forgot').addEventListener('click', async function () {
      var email = window.prompt('ใส่อีเมลที่สมัครไว้ เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้:');
      if (!email) return;
      var res = await MT.sb.auth.resetPasswordForEmail(email.trim());
      if (res.error) MT.toast('ส่งลิงก์ไม่สำเร็จ: ' + res.error.message, 'err');
      else MT.toast('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว ตรวจดูในกล่องจดหมาย', 'info');
    });

    MT.q('#auth-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = MT.q('#auth-submit');
      var email = MT.q('#auth-email').value.trim();
      var pass = MT.q('#auth-pass').value;
      btn.disabled = true;
      btn.textContent = 'กำลังดำเนินการ…';
      try {
        if (mode === 'signup') {
          var pass2 = MT.q('#auth-pass2').value;
          if (pass !== pass2) { MT.toast('รหัสผ่านสองช่องไม่ตรงกัน', 'err'); return; }
          var res = await MT.sb.auth.signUp({ email: email, password: pass });
          if (res.error) { MT.toast('สมัครไม่สำเร็จ: ' + res.error.message, 'err'); return; }
          if (res.data.session) {
            MT.toast('สมัครบัญชีสำเร็จ!');
            MT.user = res.data.user;
            renderDashboard();
          } else {
            MT.toast('สมัครแล้ว — ตรวจอีเมลเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ', 'info');
            renderLogin('login');
          }
        } else {
          var res2 = await MT.sb.auth.signInWithPassword({ email: email, password: pass });
          if (res2.error) { MT.toast('เข้าสู่ระบบไม่สำเร็จ: ' + res2.error.message, 'err'); return; }
          MT.user = res2.data.user;
          MT.toast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ!');
          renderDashboard();
        }
      } catch (err) {
        MT.toast('เกิดข้อผิดพลาด: ' + (err.message || err), 'err');
      } finally {
        btn.disabled = false;
        btn.textContent = mode === 'signup' ? 'สมัครบัญชี' : 'เข้าสู่ระบบ';
      }
    });
  }

  /* =========================================================
     แดชบอร์ดผู้ดูแล
     ========================================================= */
  function renderDashboard() {
    root.innerHTML =
      '<div class="admin-head">' +
      '<div><h2>จัดการบันทึกท่องเที่ยว</h2>' +
      '<p class="admin-sub">ล็อกอินอยู่ในฐานะ ' + MT.escapeHtml(MT.user.email || '') + '</p></div>' +
      '<div class="admin-actions">' +
      '<button id="btn-new" class="btn btn-accent">' + MT.icon('plus') + ' เพิ่มทริป</button>' +
      '<button id="btn-settings" class="btn btn-dark">' + MT.icon('gear') + ' ตั้งค่าเว็บ</button>' +
      '<button id="btn-export" class="btn btn-ghost">' + MT.icon('download') + ' ส่งออก</button>' +
      '<button id="btn-import" class="btn btn-ghost">' + MT.icon('upload') + ' นำเข้า</button>' +
      '<button id="btn-logout" class="btn btn-ghost">' + MT.icon('logout') + ' ออกจากระบบ</button>' +
      '</div></div>' +
      '<div id="editor-slot" class="hidden"></div>' +
      '<div id="settings-slot" class="hidden"></div>' +
      '<div class="admin-card"><div style="overflow-x:auto"><table class="admin-table">' +
      '<thead><tr><th>ภาพ</th><th>ทริป</th><th>วันที่</th><th>เผยแพร่</th><th>รูป</th><th style="text-align:right">จัดการ</th></tr></thead>' +
      '<tbody id="trip-rows"></tbody>' +
      '</table></div></div>' +
      '<input type="file" id="import-file" accept=".json,application/json" class="hidden">';

    MT.q('#btn-new').addEventListener('click', function () { openEditor(null); });
    MT.q('#btn-settings').addEventListener('click', openSettings);
    MT.q('#btn-export').addEventListener('click', exportJson);
    MT.q('#btn-import').addEventListener('click', function () { MT.q('#import-file').click(); });
    MT.q('#import-file').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importJson(e.target.files[0]);
      e.target.value = '';
    });
    MT.q('#btn-logout').addEventListener('click', async function () {
      await MT.sb.auth.signOut();
      MT.user = null;
      MT.toast('ออกจากระบบแล้ว', 'info');
      renderLogin();
    });

    renderTripRows();

    /* รองรับลิงก์ admin.html?edit=<id> จากหน้าทริป */
    var editParam = MT.qs.get('edit');
    if (editParam) {
      var t = MT.trips.filter(function (x) { return x.id === editParam; })[0];
      if (t) openEditor(t);
    }
  }

  function renderTripRows() {
    var tbody = MT.q('#trip-rows');
    if (!tbody) return;
    if (!MT.trips.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:34px;color:var(--muted)">' +
        'ยังไม่มีทริป — กดปุ่ม "เพิ่มทริป" เพื่อเริ่มบันทึกทริปแรกของคุณ</td></tr>';
      return;
    }
    tbody.innerHTML = MT.trips.map(function (t) {
      var cover = t.cover_url || '';
      var date = MT.formatRange(t.start_date, t.end_date) || '—';
      return (
        '<tr data-id="' + MT.escapeHtml(t.id) + '">' +
        '<td>' + (cover
          ? '<img class="row-thumb" src="' + MT.escapeHtml(cover) + '" alt="">'
          : '<div class="row-thumb"></div>') + '</td>' +
        '<td><a class="row-title" href="trip.html?p=' + encodeURIComponent(t.id) + '" target="_blank">' + MT.escapeHtml(t.title || '(ไม่มีชื่อ)') + '</a>' +
        '<div class="row-sub">' + MT.escapeHtml([t.country, t.location].filter(Boolean).join(' · ') || '—') + '</div></td>' +
        '<td style="white-space:nowrap">' + MT.escapeHtml(date) + '</td>' +
        '<td><label class="switch" title="เปิด/ปิดการเผยแพร่"><input type="checkbox" class="pub-toggle"' + (t.is_public !== false ? ' checked' : '') + '><span></span></label>' +
        '<div class="row-sub" style="margin-top:4px">' + (t.is_public !== false ? 'เผยแพร่' : 'ฉบับร่าง') + '</div></td>' +
        '<td>' + MT.tripPhotoCount(t) + '</td>' +
        '<td><div class="row-actions">' +
        '<button class="icon-btn act-view" title="ดูหน้าเว็บ">' + MT.icon('external') + '</button>' +
        '<button class="icon-btn act-edit" title="แก้ไข">' + MT.icon('edit') + '</button>' +
        '<button class="icon-btn danger act-del" title="ลบ">' + MT.icon('trash') + '</button>' +
        '</div></td></tr>'
      );
    }).join('');

    MT.qa('tr', tbody).forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      var trip = MT.trips.filter(function (x) { return x.id === id; })[0];
      if (!trip) return;
      MT.q('.act-view', tr).addEventListener('click', function () {
        window.open('trip.html?p=' + encodeURIComponent(id), '_blank');
      });
      MT.q('.act-edit', tr).addEventListener('click', function () { openEditor(trip); });
      MT.q('.act-del', tr).addEventListener('click', function () { deleteTrip(trip); });
      MT.q('.pub-toggle', tr).addEventListener('change', async function (e) {
        var pub = e.target.checked;
        var res = await MT.sb.from('trips').update({ is_public: pub }).eq('id', id);
        if (res.error) {
          MT.toast('เปลี่ยนสถานะไม่สำเร็จ: ' + res.error.message, 'err');
          e.target.checked = !pub;
          return;
        }
        trip.is_public = pub;
        MT.toast(pub ? 'เผยแพร่ทริปแล้ว' : 'ตั้งเป็นฉบับร่างแล้ว (ไม่แสดงในหน้าเว็บ)', 'info');
      });
    });
  }

  async function deleteTrip(trip) {
    if (!window.confirm('ลบทริป "' + (trip.title || '') + '" ถาวร? ลบแล้วกู้คืนไม่ได้ (แนะนำส่งออก backup ก่อน)')) return;
    var res = await MT.sb.from('trips').delete().eq('id', trip.id);
    if (res.error) { MT.toast('ลบไม่สำเร็จ: ' + res.error.message, 'err'); return; }
    MT.trips = MT.trips.filter(function (t) { return t.id !== trip.id; });
    renderTripRows();
    MT.toast('ลบทริปแล้ว');
  }

  /* =========================================================
     ฟอร์มเพิ่ม/แก้ไขทริป
     ========================================================= */
  function openEditor(trip) {
    editingId = trip ? trip.id : null;
    editorPhotos = trip && Array.isArray(trip.photos) ? trip.photos.map(function (p) { return { url: p.url || '', caption: p.caption || '' }; }) : [];

    var slot = MT.q('#editor-slot');
    slot.classList.remove('hidden');
    MT.q('#settings-slot').classList.add('hidden');
    slot.innerHTML =
      '<div class="admin-card">' +
      '<h2 class="admin-title">' + MT.icon('edit') + ' ' + (editingId ? 'แก้ไขทริป' : 'เพิ่มทริปใหม่') + '</h2>' +
      '<form id="editor-form">' +
      '<div class="editor-grid">' +
      '<label class="field"><span class="field-label">ชื่อทริป *</span><input class="input" id="f-title" required placeholder="เช่น ญี่ปุ่น 2025"></label>' +
      '<label class="field"><span class="field-label">ประเทศ</span><input class="input" id="f-country" placeholder="เช่น ญี่ปุ่น"></label>' +
      '<label class="field"><span class="field-label">สถานที่ / เมือง</span><input class="input" id="f-location" placeholder="เช่น โอซาก้า · เกียวโต"></label>' +
      '<div class="field"><span class="field-label">ช่วงวันเดินทาง</span>' +
      '<div style="display:flex;gap:10px;align-items:center">' +
      '<input class="input" type="date" id="f-start"> <span style="color:var(--muted)">ถึง</span> <input class="input" type="date" id="f-end">' +
      '</div></div>' +
      '<label class="field field-full"><span class="field-label">ภาพปก</span>' +
      '<div class="editor-cover">' +
      '<img id="cover-preview" class="cover-preview" alt="ภาพปก">' +
      '<div style="flex:1;min-width:220px">' +
      '<input class="input" id="f-cover" placeholder="วาง URL รูป หรือกดปุ่มอัปโหลดด้านล่าง">' +
      '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="btn-cover-upload">' + MT.icon('upload') + ' อัปโหลดรูปปก</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="btn-cover-clear">ล้าง</button>' +
      '</div>' +
      '<input type="file" id="cover-file" accept="image/*" class="hidden">' +
      '</div></div></label>' +
      '<label class="field field-full"><span class="field-label">บทสรุปสั้น (แสดงใต้ชื่อทริป)</span>' +
      '<textarea class="input" id="f-summary" rows="2" placeholder="สรุปทริปใน 1–2 ประโยค"></textarea></label>' +
      '<div class="field field-full"><span class="field-label">เนื้อหาบันทึก</span>' +
      '<div class="rich-toolbar" id="rich-toolbar">' +
      '<button type="button" class="rt-btn" data-cmd="bold" title="ตัวหนา (Ctrl+B)"><b>B</b></button>' +
      '<button type="button" class="rt-btn" data-cmd="italic" title="ตัวเอียง (Ctrl+I)"><i>I</i></button>' +
      '<button type="button" class="rt-btn" data-cmd="underline" title="ขีดเส้นใต้ (Ctrl+U)"><u>U</u></button>' +
      '<button type="button" class="rt-btn rt-link" data-cmd="link" title="ใส่ลิงก์">' + MT.icon('search') + ' ลิงก์</button>' +
      '<button type="button" class="rt-btn" data-cmd="insertUnorderedList" title="รายการหัวข้อ">• ลิสต์</button>' +
      '<button type="button" class="rt-btn" data-cmd="removeFormat" title="ล้างรูปแบบของข้อความที่เลือก">✕ ล้างรูปแบบ</button>' +
      '</div>' +
      '<div class="input rich-editor" id="f-content-editor" contenteditable="true" spellcheck="false" data-placeholder="เล่าเรื่องทริปได้ยาว ๆ ตามใจ — กด Enter ขึ้นย่อหน้าใหม่ ใช้ปุ่มด้านบนทำตัวหนา/ใส่ลิงก์ได้เลย"></div>' +
      '<span class="field-hint">กด Enter = ย่อหน้าใหม่ · ปุ่ม B/I/U หรือ Ctrl+B/I/U ทำตัวหนา–เอียง–ขีดเส้น · ปุ่มลิงก์ใส่ที่อยู่เว็บที่เกี่ยวข้อง</span></div>' +
      '<label class="field field-full"><span class="field-label">จุดเด่นของทริป</span>' +
      '<textarea class="input" id="f-highlights" rows="4" placeholder="หนึ่งบรรทัดต่อหนึ่งข้อ เช่น&#10;ชมซากุระริมแม่น้ำคาโมะ&#10;ป่าไผ่อาราชิยามะยามเช้า"></textarea></label>' +
      '<div class="field field-full"><span class="field-label">แกลเลอรีรูป</span>' +
      '<div class="editor-photo-tools">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="btn-photos-upload">' + MT.icon('upload') + ' อัปโหลดหลายรูป</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="btn-photo-add-url">' + MT.icon('plus') + ' เพิ่มด้วย URL</button>' +
      '<input type="file" id="photos-file" accept="image/*" multiple class="hidden">' +
      '</div>' +
      '<div class="photo-list" id="photo-list"></div>' +
      '<span class="field-hint">ใส่คำบรรยายรูปได้ แล้วจัดลำดับด้วยปุ่ม ↑ ↓</span></div>' +
      '<label class="field field-full" style="display:flex;align-items:center;gap:10px">' +
      '<input type="checkbox" id="f-public" checked> <span class="field-label" style="margin:0">เผยแพร่ทริปนี้บนหน้าเว็บ (ถ้าไม่เลือก = ฉบับร่าง เฉพาะเราเห็น)</span></label>' +
      '</div>' +
      '<div class="editor-footer">' +
      '<button type="submit" class="btn btn-accent">' + MT.icon('check') + ' บันทึกทริป</button>' +
      '<button type="button" class="btn btn-ghost" id="btn-editor-cancel">ยกเลิก</button>' +
      '</div>' +
      '</form></div>';

    fillEditorForm(trip);
    wireRichEditor();
    renderPhotoRows();

    /* ภาพปก */
    var coverInput = MT.q('#f-cover');
    coverInput.addEventListener('input', updateCoverPreview);
    updateCoverPreview();
    MT.q('#btn-cover-upload').addEventListener('click', function () { MT.q('#cover-file').click(); });
    MT.q('#cover-file').addEventListener('change', async function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        var url = await uploadFile(file, 'กำลังอัปโหลดภาพปก…');
        coverInput.value = url;
        updateCoverPreview();
        MT.toast('อัปโหลดภาพปกสำเร็จ');
      } catch (err) {
        MT.toast(uploadErrorText(err), 'err');
      }
    });
    MT.q('#btn-cover-clear').addEventListener('click', function () {
      coverInput.value = '';
      updateCoverPreview();
    });

    /* รูปแกลเลอรี */
    MT.q('#btn-photos-upload').addEventListener('click', function () { MT.q('#photos-file').click(); });
    MT.q('#photos-file').addEventListener('change', async function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;
      for (var i = 0; i < files.length; i++) {
        try {
          var url = await uploadFile(files[i], 'กำลังอัปโหลดรูป ' + (i + 1) + '/' + files.length + '…');
          editorPhotos.push({ url: url, caption: '' });
        } catch (err) {
          MT.toast(uploadErrorText(err), 'err');
        }
      }
      renderPhotoRows();
      if (files.length) MT.toast('เพิ่มรูป ' + files.length + ' รูปแล้ว (อย่าลืมกดบันทึกทริป)');
    });
    MT.q('#btn-photo-add-url').addEventListener('click', function () {
      var url = window.prompt('วาง URL รูป:');
      if (url && url.trim()) {
        editorPhotos.push({ url: url.trim(), caption: '' });
        renderPhotoRows();
      }
    });

    MT.q('#btn-editor-cancel').addEventListener('click', function () {
      slot.classList.add('hidden');
      slot.innerHTML = '';
      editingId = null;
    });

    MT.q('#editor-form').addEventListener('submit', saveTrip);
    slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- ตัวแก้เนื้อหาแบบรวย ---------- */
  function wireRichEditor() {
    var ed = MT.q('#f-content-editor');
    var toolbar = MT.q('#rich-toolbar');
    if (!ed || !toolbar) return;

    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (err) { /* เบราว์เซอร์เก่า */ }

    /* กันโฟกัสหลุดจากข้อความที่กำลังเลือกไว้ ตอนกดปุ่ม */
    toolbar.addEventListener('mousedown', function (e) { e.preventDefault(); });

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('.rt-btn');
      if (!btn) return;
      var cmd = btn.getAttribute('data-cmd');
      ed.focus();
      if (cmd === 'link') {
        var url = window.prompt('ใส่ที่อยู่ลิงก์ (เริ่มด้วย https://):', 'https://');
        if (!url || url === 'https://') return;
        document.execCommand('createLink', false, url.trim());
        Array.prototype.forEach.call(ed.querySelectorAll('a'), function (a) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      } else if (cmd) {
        document.execCommand(cmd, false, null);
      }
    });

    /* วางข้อความเป็นข้อความล้วน กันโค้ดเศษจาก Word/เว็บอื่น */
    ed.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    /* placeholder เอง (contenteditable ไม่มี :placeholder ให้ใช้) */
    function syncEmpty() { ed.classList.toggle('empty', !ed.textContent.trim()); }
    ed.addEventListener('input', syncEmpty);
    syncEmpty();
  }

  function getContentValue() {
    var ed = MT.q('#f-content-editor');
    if (!ed) return '';
    var clean = MT.sanitizeRichHtml(ed.innerHTML);
    var probe = document.createElement('div');
    probe.innerHTML = clean;
    return probe.textContent.trim() ? clean : '';
  }

  function setContentValue(content) {
    var ed = MT.q('#f-content-editor');
    if (!ed) return;
    var val = String(content || '');
    ed.innerHTML = MT.isRichText(val) ? MT.sanitizeRichHtml(val) : MT.textToRichHtml(val);
    ed.classList.toggle('empty', !ed.textContent.trim());
  }

  function fillEditorForm(trip) {
    MT.q('#f-title').value = trip && trip.title ? trip.title : '';
    MT.q('#f-country').value = trip && trip.country ? trip.country : '';
    MT.q('#f-location').value = trip && trip.location ? trip.location : '';
    MT.q('#f-start').value = trip && trip.start_date ? String(trip.start_date).slice(0, 10) : '';
    MT.q('#f-end').value = trip && trip.end_date ? String(trip.end_date).slice(0, 10) : '';
    MT.q('#f-cover').value = trip && trip.cover_url ? trip.cover_url : '';
    MT.q('#f-summary').value = trip && trip.summary ? trip.summary : '';
    setContentValue(trip && trip.content);
    MT.q('#f-highlights').value = trip && Array.isArray(trip.highlights) ? trip.highlights.join('\n') : '';
    MT.q('#f-public').checked = trip ? trip.is_public !== false : true;
  }

  function updateCoverPreview() {
    var img = MT.q('#cover-preview');
    var val = MT.q('#f-cover').value.trim();
    if (val) {
      img.src = val;
      img.style.display = '';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
    }
  }

  function renderPhotoRows() {
    var list = MT.q('#photo-list');
    if (!list) return;
    if (!editorPhotos.length) {
      list.innerHTML = '<p class="field-hint" style="margin:4px 0">ยังไม่มีรูปในแกลเลอรี</p>';
      return;
    }
    list.innerHTML = editorPhotos.map(function (p, i) {
      return (
        '<div class="photo-row" data-i="' + i + '">' +
        '<img class="photo-thumb" src="' + MT.escapeHtml(p.url) + '" alt="">' +
        '<input class="input photo-caption" value="' + MT.escapeHtml(p.caption) + '" placeholder="คำบรรยายรูป (ถ้ามี)">' +
        '<div class="photo-actions">' +
        '<button type="button" class="icon-btn ph-up" title="เลื่อนขึ้น">↑</button>' +
        '<button type="button" class="icon-btn ph-down" title="เลื่อนลง">↓</button>' +
        '<button type="button" class="icon-btn danger ph-del" title="นำรูปนี้ออก">' + MT.icon('trash') + '</button>' +
        '</div></div>'
      );
    }).join('');

    MT.qa('.photo-row', list).forEach(function (row) {
      var i = parseInt(row.getAttribute('data-i'), 10);
      MT.q('.photo-caption', row).addEventListener('input', function (e) {
        editorPhotos[i].caption = e.target.value;
      });
      MT.q('.ph-up', row).addEventListener('click', function () {
        if (i <= 0) return;
        var tmp = editorPhotos[i - 1]; editorPhotos[i - 1] = editorPhotos[i]; editorPhotos[i] = tmp;
        renderPhotoRows();
      });
      MT.q('.ph-down', row).addEventListener('click', function () {
        if (i >= editorPhotos.length - 1) return;
        var tmp = editorPhotos[i + 1]; editorPhotos[i + 1] = editorPhotos[i]; editorPhotos[i] = tmp;
        renderPhotoRows();
      });
      MT.q('.ph-del', row).addEventListener('click', function () {
        editorPhotos.splice(i, 1);
        renderPhotoRows();
      });
    });
  }

  async function saveTrip(e) {
    e.preventDefault();
    var title = MT.q('#f-title').value.trim();
    if (!title) { MT.toast('กรุณาใส่ชื่อทริป', 'err'); return; }

    var payload = {
      title: title,
      country: MT.q('#f-country').value.trim(),
      location: MT.q('#f-location').value.trim(),
      start_date: MT.q('#f-start').value || null,
      end_date: MT.q('#f-end').value || null,
      summary: MT.q('#f-summary').value.trim(),
      content: getContentValue(),
      highlights: MT.lines(MT.q('#f-highlights').value),
      cover_url: MT.q('#f-cover').value.trim(),
      photos: editorPhotos.filter(function (p) { return p.url; }),
      is_public: MT.q('#f-public').checked,
    };

    var btn = MT.q('#editor-form button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก…';
    try {
      var res;
      if (editingId) {
        res = await MT.sb.from('trips').update(payload).eq('id', editingId);
      } else {
        res = await MT.sb.from('trips').insert(payload).select();
      }
      if (res.error) {
        MT.toast('บันทึกไม่สำเร็จ: ' + rlsHint(res.error.message), 'err');
        return;
      }
      MT.toast(editingId ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มทริปใหม่แล้ว!');
      await refreshTrips();
      var slot = MT.q('#editor-slot');
      slot.classList.add('hidden');
      slot.innerHTML = '';
      editingId = null;
    } catch (err) {
      MT.toast('เกิดข้อผิดพลาด: ' + (err.message || err), 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = MT.icon('check') + ' บันทึกทริป';
    }
  }

  async function refreshTrips() {
    var res = await MT.sb.from('trips').select('*').order('start_date', { ascending: false, nullsFirst: false });
    if (res.error) { MT.toast('โหลดรายการใหม่ไม่สำเร็จ: ' + res.error.message, 'err'); return; }
    MT.trips = res.data || [];
    renderTripRows();
  }

  /* =========================================================
     ตั้งค่าเว็บ (ชื่อเว็บ, Hero, หน้าเกี่ยวกับฉัน)
     ========================================================= */
  function openSettings() {
    var slot = MT.q('#settings-slot');
    slot.classList.remove('hidden');
    var editorSlot = MT.q('#editor-slot');
    editorSlot.classList.add('hidden');
    var s = MT.settings;

    slot.innerHTML =
      '<div class="admin-card">' +
      '<h2 class="admin-title">' + MT.icon('gear') + ' ตั้งค่าเว็บ</h2>' +
      '<form id="settings-form"><div class="editor-grid">' +
      '<label class="field"><span class="field-label">ชื่อเว็บ</span><input class="input" id="s-title" value="' + MT.escapeHtml(s.site_title || '') + '"></label>' +
      '<label class="field"><span class="field-label">คำโปรยใต้ชื่อเว็บ</span><input class="input" id="s-tagline" value="' + MT.escapeHtml(s.tagline || '') + '"></label>' +
      '<label class="field field-full"><span class="field-label">ภาพหน้าปกหลัก (Hero)</span>' +
      '<div class="editor-cover">' +
      '<img id="hero-preview" class="cover-preview" alt="ภาพ Hero">' +
      '<div style="flex:1;min-width:220px">' +
      '<input class="input" id="s-hero" value="' + MT.escapeHtml(s.hero_url || '') + '" placeholder="URL รูป Hero">' +
      '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="btn-hero-upload">' + MT.icon('upload') + ' อัปโหลดรูป</button>' +
      '</div></div></div></label>' +
      '<label class="field field-full"><span class="field-label">เนื้อหาหน้า "เกี่ยวกับฉัน"</span>' +
      '<textarea class="input" id="s-about" rows="7">' + MT.escapeHtml(s.about_text || '') + '</textarea>' +
      '<span class="field-hint">เว้นบรรทัดว่าง 1 บรรทัด = ขึ้นย่อหน้าใหม่</span></label>' +
      '</div>' +
      '<div class="editor-footer">' +
      '<button type="submit" class="btn btn-accent">' + MT.icon('check') + ' บันทึกการตั้งค่า</button>' +
      '<button type="button" class="btn btn-ghost" id="btn-settings-close">ปิด</button>' +
      '</div></form></div>';

    var heroInput = MT.q('#s-hero');
    function updateHeroPreview() {
      var img = MT.q('#hero-preview');
      var val = heroInput.value.trim();
      if (val) { img.src = val; img.style.display = ''; }
      else { img.removeAttribute('src'); img.style.display = 'none'; }
    }
    heroInput.addEventListener('input', updateHeroPreview);
    updateHeroPreview();

    MT.q('#btn-hero-upload').addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async function () {
        var file = input.files && input.files[0];
        if (!file) return;
        try {
          var url = await uploadFile(file, 'กำลังอัปโหลดภาพ Hero…');
          heroInput.value = url;
          updateHeroPreview();
          MT.toast('อัปโหลดสำเร็จ — อย่าลืมกดบันทึกการตั้งค่า');
        } catch (err) {
          MT.toast(uploadErrorText(err), 'err');
        }
      });
      input.click();
    });

    MT.q('#btn-settings-close').addEventListener('click', function () {
      slot.classList.add('hidden');
      slot.innerHTML = '';
    });

    MT.q('#settings-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var payload = {
        id: 1,
        site_title: MT.q('#s-title').value.trim() || 'M-Travel',
        tagline: MT.q('#s-tagline').value.trim(),
        hero_url: MT.q('#s-hero').value.trim(),
        about_text: MT.q('#s-about').value.replace(/\r\n/g, '\n').trim(),
      };
      var res = await MT.sb.from('site_settings').upsert(payload);
      if (res.error) { MT.toast('บันทึกไม่สำเร็จ: ' + rlsHint(res.error.message), 'err'); return; }
      MT.settings = Object.assign({}, MT.settings, payload);
      var brand = MT.q('#brand-name');
      if (brand) brand.textContent = payload.site_title;
      MT.toast('บันทึกการตั้งค่าแล้ว');
    });
  }

  /* =========================================================
     Backup: ส่งออก / นำเข้า (JSON)
     ========================================================= */
  function exportJson() {
    var payload = {
      app: 'M-Travel',
      version: 1,
      exported_at: new Date().toISOString(),
      settings: MT.settings,
      trips: MT.trips,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    var d = new Date();
    var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = 'm-travel-backup-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    MT.toast('ส่งออกข้อมูล ' + MT.trips.length + ' ทริปแล้ว');
  }

  async function importJson(file) {
    var text;
    try {
      text = await file.text();
    } catch (err) {
      MT.toast('อ่านไฟล์ไม่สำเร็จ', 'err');
      return;
    }
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      MT.toast('ไฟล์นี้ไม่ใช่ JSON ที่ถูกต้อง', 'err');
      return;
    }
    var rows = Array.isArray(data.trips) ? data.trips : [];
    if (!rows.length) { MT.toast('ในไฟล์นี้ไม่มีข้อมูลทริป', 'err'); return; }
    if (!window.confirm('นำเข้า ' + rows.length + ' ทริป?\n\nทริปเดิมที่มี id ตรงกันจะถูกแทนที่ด้วยข้อมูลในไฟล์')) return;

    var ok = 0, fail = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = sanitizeTrip(rows[i]);
      if (!row) { fail++; continue; }
      var res = await MT.sb.from('trips').upsert(row);
      if (res.error) { console.error(res.error); fail++; }
      else ok++;
    }
    if (data.settings) {
      await MT.sb.from('site_settings').upsert({
        id: 1,
        site_title: data.settings.site_title || 'M-Travel',
        tagline: data.settings.tagline || '',
        hero_url: data.settings.hero_url || '',
        about_text: data.settings.about_text || '',
      });
      MT.settings = Object.assign({}, MT.settings, data.settings);
    }
    await refreshTrips();
    MT.toast('นำเข้าสำเร็จ ' + ok + ' ทริป' + (fail ? ' (ล้มเหลว ' + fail + ')' : ''), fail ? 'err' : 'ok');
  }

  function sanitizeTrip(row) {
    if (!row || typeof row !== 'object') return null;
    var photos = Array.isArray(row.photos)
      ? row.photos.map(function (p) {
          if (typeof p === 'string') return { url: p, caption: '' };
          return { url: (p && p.url) || '', caption: (p && p.caption) || '' };
        }).filter(function (p) { return p.url; })
      : [];
    var highlights = Array.isArray(row.highlights)
      ? row.highlights.filter(function (h) { return typeof h === 'string' && h.trim(); })
      : MT.lines(row.highlights || '');
    return {
      id: typeof row.id === 'string' && row.id ? row.id : undefined,
      title: String(row.title || 'ไม่มีชื่อ').slice(0, 300),
      country: String(row.country || '').slice(0, 120),
      location: String(row.location || '').slice(0, 300),
      start_date: row.start_date || null,
      end_date: row.end_date || null,
      summary: String(row.summary || '').slice(0, 1000),
      content: String(row.content || ''),
      highlights: highlights,
      cover_url: String(row.cover_url || ''),
      photos: photos,
      is_public: row.is_public !== false,
    };
  }

  /* =========================================================
     อัปโหลดรูปไปยัง Supabase Storage (bucket: photos)
     ========================================================= */
  async function uploadFile(file, progressText) {
    if (progressText) MT.toast(progressText, 'info');
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    var path = 'trips/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var res = await MT.sb.storage.from('photos').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });
    if (res.error) throw res.error;
    var pub = MT.sb.storage.from('photos').getPublicUrl(path);
    return pub.data.publicUrl;
  }

  function rlsHint(message) {
    if (/row-level security|permission|policy/i.test(message || '')) {
      return message + ' — ตรวจว่าอีเมลนี้อยู่ในตาราง admins แล้ว (รัน SQL ใน supabase-schema.sql)';
    }
    return message;
  }

  function uploadErrorText(err) {
    var msg = (err && err.message) ? err.message : String(err);
    if (/row-level security|permission|policy|not authorized/i.test(msg)) {
      return 'อัปโหลดไม่สำเร็จ: ' + msg + ' — ตรวจว่ารันส่วน Storage policy ใน supabase-schema.sql แล้ว';
    }
    return 'อัปโหลดไม่สำเร็จ: ' + msg;
  }
})();
