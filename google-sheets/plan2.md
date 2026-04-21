Guide Part II Project Salim

Workflow sederhana:

- Admin membuatkan akun untuk employee
- Admin melakukan penambahan item & stock melalui dashboard web
- Admin menambahkan task untuk employee (task pengurangan stock barang, karena
  employee yang menjual)
- Saat admin menambahkan task, maka notifikasi berisik akan keluar melalui hp employee
- Tugas employee adalah untuk mengurangi stock yang ada melalui app dari hp
- Employee yang sudah melihat dashboard hp yang isinya list task dari admin akan segera
  muncul dalam table “Read by” dalam row task tersebut di dashboard admin. Notifikasi akan
  berhenti setelah employee read.
- Employee yang sudah melihat melakukan check dalam aplikasi hp yang akan segera
  muncul dalam table “Checked by” dalam row task tersebut di dashboard admin.
- Setelah employee melakukan suatu deduct, maka tombol “Done by” akan menjadi
  available dan dapat dipencet oleh employee yang akan muncul dalam row task tersebut di
  dashboard admin.

1. DONE BY:

(Table task)

Menambahkan column baru “Done by”, cara kerjanya sama persis seperti “Checked by”, tapi
tidak bisa di centang dari mobile sebelum employee melakukan “Check” & “Deduct”.

JANGAN melakukan done by secara otomatis atau dengan melakukan “tracking” ke item
karena klien sudah minta untuk task untuk tidak track item. Fitur tersebut sudah dikerjakan
sebelumnya dan dia sendiri yang minta untuk dihapus.
BUKTI:

Before:

After:

(Dulu setiap pembuatan task memerlukan list item, tapi sekarang sudah tidak ada)

(Bukti dia ingin menghilangkan sistem tracking item tersebut)

2. TOMBOL DETAILS:
   Lalu tambahkan juga tombol “details” pada actions dalam page Task. yang mengarah pada
   page History karena di sana juga sudah ada log aktivitas

(Di history sudah terdapat fitur yang melihat siapa saja yang deduct)

3. Pembagusan view mobile:
   Untuk setiap page-page yang ada, tolong dibuat dengan lebih bagus & profesional saja.
   Boleh mencari referensi app2 yang bagus lalu suruh gpt untuk generate ulang untuk setiap
   pages yang ada.
4. Pastikan semua fitur bekerja & lengkap:

- Test login/logout
- Test apakah update/add task masih mengeluarkan bunyi suara & notifikasi dari app hp
- Test apakah fitur check by, read by, done by masih bekerja dengan semestinya
- Test apakah history & add item bekerja dengan semestinya
- Test & pahami semua fitur yang ada
