/* =========================================================
   ตั้งค่าการเชื่อมต่อ Supabase ของเว็บ M-Travel
   ---------------------------------------------------------
   วิธีหาค่าทั้งสองตัวนี้:
   1) สร้างโปรเจกต์ฟรีที่ https://supabase.com
   2) เปิดหน้า SQL Editor แล้วรันไฟล์ supabase-schema.sql
      (อย่าลืมแก้อีเมลผู้ดูแลในไฟล์ก่อนรัน)
   3) ไปที่เมนู Settings → API ของโปรเจกต์ แล้วคัดลอก:
      - Project URL  → ใส่ที่ "url"
      - anon public key → ใส่ที่ "anonKey"
   4) Deploy เว็บ แล้วเข้าหน้า admin.html เพื่อเริ่มบันทึก

   * จนกว่าจะใส่ค่าทั้งสองตัว เว็บจะทำงานใน "โหมดตัวอย่าง"
     (แสดงข้อมูลสาธิตจากไฟล์ demo-data.js ให้ดูหน้าตาเว็บก่อน)
   ========================================================= */
window.SUPABASE_CONFIG = {
  url: "https://xhakmsxqmgseelswcswa.supabase.co",
  anonKey: "sb_publishable_mbZasMaN8ppihl65DGVhRg_JuFO367R",
};
