# Penerjemah Bahasa Isyarat ke Teks

Aplikasi web untuk menerjemahkan gesture bahasa isyarat sederhana menjadi kata-kata Bahasa Indonesia secara real-time menggunakan MediaPipe Hands dan webcam.

---

## ✨ Fitur Utama

- Deteksi tangan dengan **MediaPipe Hands** langsung di browser
- Penerjemahan gesture menjadi **kata-kata praktis** (hallo, hai, i love you, ya, tidak dll.)
- UI elegan dua panel (kamera kiri, hasil kanan) dengan tema gelap modern
- Riwayat terjemahan otomatis lengkap dengan stempel waktu
- Tombol kontrol cepat: Mulai Kamera, Tambah Spasi, Bersihkan Teks
- Cooldown pintar agar kata tidak terduplikasi
- Responsif dan nyaman dipakai di desktop maupun perangkat mobile

---

## 📘 Manual Book Pengguna

### 1. Persiapan
| Kebutuhan | Detail |
|-----------|--------|
| Perangkat | Laptop/PC dengan webcam (internal/eksternal) |
| Browser   | Chrome, Edge, Firefox, Safari (versi terbaru direkomendasikan) |
| Koneksi   | Internet aktif untuk memuat library MediaPipe dari CDN |
| Lingkungan | Pencahayaan cukup dan background tangan kontras |

### 2. Langkah Penggunaan
1. Buka file `index.html` melalui browser.
2. Klik tombol **Mulai Kamera** → izinkan akses webcam ketika diminta.
3. Arahkan tangan ke kamera dan lakukan gesture yang didukung.
4. Tahan gesture ±1,5 detik sampai muncul status *“Kata <…> ditambahkan!”*.
5. Tambahkan spasi manual via tombol **Tambah Spasi** jika ingin memisahkan kata.
6. Klik **Bersihkan Teks** untuk memindahkan kalimat terakhir ke riwayat dan memulai kalimat baru.

### 3. Panel & Kontrol
| Bagian | Fungsi |
|--------|--------|
| Panel kiri | Video webcam + overlay landmark & status deteksi |
| Panel kanan | Hasil terjemahan realtime, preview kata aktif, dan riwayat |
| Status bar | Memberi tahu izin kamera, kata yang terdeteksi, atau peringatan |

### 4. Gestur yang Didukung (versi praktis & mudah)
- **hallo / hai / tolong** – lipat ibu jari ke telapak, luruskan ke‑4 jari lain dan arahkan telapak ke kamera.
- **i love you** – hanya ibu jari dan kelingking yang lurus; tiga jari lain menekuk (mirip tanda “rock” tapi tanpa telunjuk).
- **namaku** – luruskan telunjuk saja, jari lain menekuk, posisikan di depan dada dan arahkan ke diri sendiri.
- **yumna** – luruskan telunjuk + tengah rapat seperti tanda “peace”, jari lain menekuk, posisikan dua jari di depan dagu/dada atas.
- **terima kasih** – bentuk lingkaran kecil dengan ibu jari + telunjuk, jari lain menekuk rapat.
- **ya / baik** – angkat jempol ke atas, jari lain mengepal.
- **tidak / apa kabar** – luruskan telunjuk saja (seperti menunjuk ke depan/atas), jari lain mengepal.
- **maaf** – kepalkan tangan dan tempelkan lembut di dada.
- **sama-sama** – telapak terbuka (ibu jari tetap menekuk), hadapkan ke kamera lalu geser perlahan ke kanan/kiri.
- **selamat pagi / siang / malam** – telapak terbuka (ibu jari menekuk), bedakan tinggi tangan: pagi di atas alis, siang sejajar dada, malam sedikit lebih rendah dari dada.

> Contoh kalimat cepat: kombinasikan **hallo → namaku → yumna** untuk menyapa “hallo, namaku Yumna” hanya dengan dua jenis gerakan (telapak terbuka, lalu dua jari di depan dagu).

> Tips: tahan gesture stabil ±1,5 detik. Setelah kata masuk, turunkan tangan sebentar agar cooldown tidak menambahkan kata yang sama.

### 5. Riwayat & Pengelolaan Teks
- Setiap kali tombol **Bersihkan Teks** ditekan, kalimat terakhir otomatis masuk ke daftar riwayat dengan cap waktu.
- Riwayat menampilkan maksimal 8 entri; entri tertua akan dihapus otomatis.
- Preview kata aktif ditampilkan di bawah area hasil dengan warna berbeda (kuning untuk menunggu, hijau ketika berhasil).

### 6. Troubleshooting
| Masalah | Solusi |
|---------|--------|
| *“Permission dismissed / kamera tidak terbaca”* | Klik ikon kunci/kamera di address bar → Allow Camera → refresh halaman → klik **Mulai Kamera** lagi. |
| Kata muncul double | Pastikan menurunkan tangan setelah status “ditambahkan”. Sistem cooldown 2 detik mencegah duplikasi, tetapi gesture yang sama terus-menerus bisa terdeteksi lagi setelah cooldown habis. |
| Tidak ada tangan terdeteksi | Periksa pencahayaan, pastikan tangan masuk frame, dan background kontras. |
| Gerakan salah tafsir | Tahan gesture lebih stabil, hindari objek lain masuk kamera. |

### 7. Tips Akurasi
- Gunakan pencahayaan natural atau ring light.
- Pastikan tangan berada 30–60 cm dari kamera.
- Jangan memakai aksesori besar yang menutupi jari.
- Gunakan background polos (hitam/putih) agar landmark mudah dikenali.

---

## 🛠️ Teknologi
- **HTML5** – struktur UI
- **CSS3 (custom theme)** – tampilan elegan, responsif, glassmorphism
- **JavaScript** – logika deteksi gesture & manajemen state
- **MediaPipe Hands** – pelacakan tangan real-time di browser
- **WebRTC** – akses webcam

---

## 🗂️ Struktur Proyek
```
meme/
├── index.html      # Struktur halaman & elemen UI
├── style.css       # Styling elegan & responsive layout
├── script.js       # Logika kontrol kamera, deteksi gesture, cooldown, riwayat
└── README.md       # Manual & dokumentasi
```

---

## 📄 Lisensi
Proyek dibuat untuk tujuan edukasi dan penggunaan pribadi. Silakan modifikasi sesuai kebutuhan dengan mencantumkan sumber.

