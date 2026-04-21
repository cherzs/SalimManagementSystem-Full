🔀 BAGIAN 3: Migrasi API Layer (api.js)
Ini adalah inti dari migrasi. Kita akan mengganti fungsi di api.js yang sebelumnya
memanggil Apps Script, menjadi memanggil client Supabase langsung.
3.1 Instalasi & Setup Supabase Client

● Di Proyek Web Admin (React):
● bash
● npm install @supabase/supabase-js
○ Buat/update file .env.local:
○ env

REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
○ # Hapus atau kosongkan REACT_APP_API_URL dan
REACT_APP_API_SECRET lama

● Di Proyek Mobile (Expo):
● bash
● npx expo install @supabase/supabase-js
○ Update app.json atau app.config.js untuk menambahkan variabel
environment, atau buat file .env dan gunakan library seperti
react-native-dotenv.
3.2 Membuat File Client Supabase
Buat file baru, misalnya lib/supabaseClient.js, di kedua proyek (web & mobile):
javascript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL ||
process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY ||
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
3.3. Mengubah Fungsi API

Prinsip: Hampir semua fungsi action di doPost Apps Script Anda (seperti
GET_ITEMS, ADD_ITEM, LOGIN) akan diganti dengan operasi langsung ke Supabase.
Kecuali fungsi yang mengandung:
● sendEmail / MailApp.sendEmail
● sendExpoNotification / UrlFetchApp.fetch ke Expo
● scheduleTaskNotificationLoop / ScriptApp.newTrigger
Untuk operasi yang membutuhkan fungsi khusus di atas, kita akan membuat
Supabase Edge Functions yang nantinya akan memanggil endpoint Google Apps
Script Anda, atau mengimplementasikan logika serupa di dalam Edge Function itu
sendiri (jika memungkinkan, misalnya menggunakan service email pihak ketiga).
Contoh Konkret: Migrasi api.js untuk Web Admin
File api.js web admin akan berubah total. Berikut contoh isi baru untuk beberapa
fungsi:
javascript
// api.js (Web Admin - Versi Baru)
import { supabase } from './lib/supabaseClient';
import { callAppsScriptFunction } from './lib/gasProxy'; // Kita akan buat
ini nanti
// === AUTHENTICATION (Login Admin) ===
// Sekarang menggunakan Supabase Auth, TAPI sistem Anda pakai PIN.
// Opsi 1: Query manual ke tabel 'employees' (untuk sementara)
export const login = async (email, password) => {
// Hash password (PIN) yang dikirim user
const pinHash = await hashPin(password); // Buat fungsi hashPin yang sama
dengan GAS
const { data, error } = await supabase
.from('employees')
.select('id, name, role, email')
.eq('email', email.toLowerCase().trim())
.eq('pin_hash', pinHash)
.eq('role', 'admin')
.single();
if (error || !data) throw new Error('Invalid email or password');
// Update last_login
await supabase
.from('employees')

.update({ last_login: new Date() })
.eq('id', data.id);
return data;
};
// === ITEMS ===
export const getItems = () =>
supabase.from('items').select('*').order('created_at', { ascending: false
});
export const addItem = async (itemData) => {
// Generate ID seperti di GAS
const { data: lastItem } = await supabase
.from('items')
.select('id')
.order('id', { ascending: false })
.limit(1)
.single();
const lastIdNum = lastItem?.id ? parseInt(lastItem.id.replace('ITM', ''))
: 0;
const newId = `ITM${String(lastIdNum + 1).padStart(5, '0')}`;
const newItem = {
id: newId,
...itemData,
stock: parseInt(itemData.stock) || 0,
created_at: new Date(),
updated_at: new Date()
};
return supabase.from('items').insert([newItem]).select().single();
};
export const updateItem = (itemData) =>
supabase
.from('items')
.update({ ...itemData, updated_at: new Date() })
.eq('id', itemData.id)
.select()
.single();
export const deleteItem = (id) => supabase.from('items').delete().eq('id',
id);
// === TASKS ===

// Fungsi addTask dan updateTask yang memicu EMAIL & PUSH NOTIFICATION
// akan memanggil Edge Function atau Apps Script.
export const addTask = async (taskData) => {
// 1. Simpan task ke Supabase terlebih dahulu
const { data: newTask, error: dbError } = await supabase
.from('tasks')
.insert([{
...taskData,
// ... generate task_id seperti sebelumnya
}])
.select()
.single();
if (dbError) throw dbError;
// 2. Panggil Google Apps Script untuk kirim email & notifikasi push
// Kita buat fungsi khusus di GAS yang hanya handle ini, lalu panggil via
fetch
try {
await callAppsScriptFunction('sendTaskNotifications', {
taskId: newTask.task_id,
title: newTask.title,
description: newTask.description,
// ... data lainnya
});
} catch (notifError) {
console.error('Gagal mengirim notifikasi, tetapi task sudah
tersimpan:', notifError);
// Bisa di-skip, atau tampilkan warning ke user
}
return newTask;
};
// Helper untuk memanggil Apps Script
export const callAppsScriptFunction = async (functionName, payload) => {
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/.../exec'; //
URL deploy GAS Anda
const response = await fetch(GAS_WEB_APP_URL, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ action: functionName, data: payload, secret:
'yoyo' })
});
return response.json();

};
Untuk Aplikasi Mobile (api.js mobile), konsepnya sama:
● Ganti login, getItems, deductItem, getHistory dengan query ke Supabase.
● Fungsi registerPushToken sekarang bisa langsung update ke kolom
expo_push_token di tabel employees.
● Fungsi updateTaskReadStatus dan updateTaskCheckStatus bisa langsung
update kolom read_by / checked_by di tabel tasks.
3.4. Menangani Operasi Kompleks: deductItem
Operasi ini kompleks karena:
1. Mengurangi stock.
2. Mencatat history.
3. Memperbarui task yang terkait.
4. Mengecek low stock dan mengirim email.
Solusi: Buat Supabase Edge Function (serverless function) atau Database Function
(PL/pgSQL) yang menangani semua logika ini dalam satu transaksi database.
Contoh Skema Database Function:
sql
CREATE OR REPLACE FUNCTION deduct_item_and_log(
p_employee_id TEXT,
p_employee_name TEXT,
p_items JSONB -- Format: [{"itemId": "ITM001", "qty": 2}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
low_threshold INTEGER;
admin_emails TEXT[];
alert_items JSONB := '[]'::JSONB;
item_record JSONB;
BEGIN
-- Ambil threshold
SELECT setting_value::INTEGER INTO low_threshold
FROM settings WHERE setting_key = 'low_stock_threshold';

-- Loop untuk setiap item
FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
LOOP
-- 1. Kurangi stock
UPDATE items
SET stock = stock - (item_record->>'qty')::INTEGER,
updated_at = NOW()
WHERE id = item_record->>'itemId'
RETURNING stock INTO current_stock;
-- 2. Catat history
INSERT INTO history (employee_id, employee_name, item_id, item_name,
qty, action)
SELECT p_employee_id, p_employee_name,
item_record->>'itemId', name,
(item_record->>'qty')::INTEGER, 'deduct'
FROM items WHERE id = item_record->>'itemId';
-- 3. Cek low stock
IF current_stock <= low_threshold THEN
alert_items := alert_items || jsonb_build_object(
'id', item_record->>'itemId',
'name', (SELECT name FROM items WHERE id = item_record->>'itemId'),
'stock', current_stock
);
END IF;
END LOOP;
-- 4. Jika ada low stock, persiapkan data untuk dikirim email via Apps
Script
IF jsonb_array_length(alert_items) > 0 THEN
SELECT array_agg(email) INTO admin_emails
FROM employees WHERE role = 'admin' AND email IS NOT NULL;
-- Di sini kita bisa memanggil Edge Function lain atau mengatur trigger
-- untuk memanggil Google Apps Script mengirim email
-- Untuk sementara, kita kembalikan data alert
RETURN jsonb_build_object(
'success', true,
'low_stock_alerts', alert_items,
'admin_emails', admin_emails
);
END IF;
RETURN jsonb_build_object('success', true);
END;

$$;
Cara panggil dari frontend:
javascript
const { data, error } = await supabase.rpc('deduct_item_and_log', {
p_employee_id: 'EMP001',
p_employee_name: 'John Doe',
p_items: [{ itemId: 'ITM001', qty: 2 }]
});
// Jika ada alert, panggil GAS untuk kirim email
if (data?.low_stock_alerts) {
await callAppsScriptFunction('sendLowStockEmail', {
alerts: data.low_stock_alerts,
recipients: data.admin_emails
});
}


⚙️ BAGIAN 4: Memodifikasi & Mempertahankan Google Apps
Script
Google Apps Script (GAS) Anda tetap dibutuhkan sebagai "service layer" untuk
fungsi-fungsi khusus Google.
4.1. Simplifikasi Script GAS
Buat deployment baru dari script GAS yang sudah dimodifikasi. Hapus semua fungsi
yang terkait dengan CRUD database (getItems, addItem, updateItem, dll), dan hanya
pertahankan:
● doPost & doOptions (sebagai entry point).
● sendEmail / MailApp.sendEmail.
● sendExpoNotification.
● scheduleTaskNotificationLoop & runTaskNotificationLoop.
● Fungsi handler baru khusus untuk dipanggil dari Supabase/Client, misalnya:
○ handleSendTaskNotifications (untuk ADD_TASK/UPDATE_TASK)
○ handleSendLowStockAlert (untuk low stock)
○ handleSendGeneralEmail

4.2. Contoh Script GAS yang Disederhanakan
javascript
// CONFIG
const SECRET_KEY = "yoyo";
function doPost(e) {
// ... (headers dan verifikasi secret sama)
let result;
switch(action) {
case "SEND_TASK_NOTIFICATION":
result = handleSendTaskNotification(data);
break;
case "SEND_LOW_STOCK_ALERT":
result = handleSendLowStockAlert(data);
break;
// ... case lainnya
default:
throw new Error("Invalid action");
}
// ... return response
}
function handleSendTaskNotification(data) {
const { taskId, title, description, employeeIds } = data;
// 1. Kirim push notification via Expo (sama seperti di `addTask` lama)
// 2. Kirim email (sama seperti di `addTask` lama)
// 3. Bisa trigger scheduleTaskNotificationLoop
return { success: true };
}
function handleSendLowStockAlert(data) {
const { alerts, recipients } = data;
// Format & kirim email low stock
// ... (gunakan logika dari `deductItem` lama)
return { success: true };
}
// Pertahankan fungsi-fungsi helper ini:
function sendExpoNotification(messagePayload) { /* ... */ }
function scheduleTaskNotificationLoop(taskId, employeeIds, intervalSeconds,
maxAttempts) { /* ... */ }
// ... dst

4.3. Deploy Ulang GAS
Setelah dimodifikasi, deploy sebagai Web App:
1. Di editor GAS, klik "Deploy" > "New deployment".
2. Pilih jenis "Web app".
3. Set "Execute as" ke akun Anda, "Who has access" ke "Anyone" atau "Anyone
with Google account".
4. Klik "Deploy" dan salin URL Web App yang baru.

🧪 BAGIAN 5: Pengujian
Lakukan pengujian secara bertahap:
1. Test Koneksi Supabase: Pastikan frontend bisa terhubung dan melakukan
select * from items sederhana.
2. Test Operasi CRUD Dasar: Coba fitur tambah, edit, hapus item dari web admin.
3. Test Login Flow: Login di mobile dan web dengan data karyawan di tabel
Supabase.
4. Test Fungsi Kompleks: Cek fungsi deductItem yang memanggil database
function dan GAS.
5. Test Notifikasi: Buat task baru dari web admin, pastikan email masuk dan
notifikasi push muncul di Expo (jika konfigurasi Expo sudah benar).

📝 Ringkasan Tugas untuk Developer
1. Setup & jalankan proyek lokal.
2. Buat database Supabase sesuai skema SQL di atas.
3. Ganti file api.js di web admin dan mobile app:
○ Instal Supabase client.
○ Ganti fungsi-fungsi API lama dengan query ke Supabase.
○ Untuk operasi yang memicu email/notifikasi, arahkan ke pemanggilan
fungsi GAS yang baru.
4. Modifikasi Google Apps Script:
○ Hapus logika CRUD database.
○ Fokuskan hanya untuk fungsi sendEmail, sendExpoNotification, dan
schedule.

○ Deploy ulang dan dapatkan URL Web App baru.
5. Lakukan pengujian menyeluruh pada semua alur utama aplikasi.
6. (Opsional) Untuk produksi: Atur RLS dengan benar, gunakan environment
variables dengan aman, dan monitor penggunaan Supabase.
Jika developer mengalami kesulitan, fokuskan untuk menyelesaikan satu alur kerja
terlebih dahulu (misalnya: Login -> Lihat Items -> Deduct Item) dari awal hingga akhir
(termasuk notifikasi), sebelum melanjutkan ke fitur lainnya.