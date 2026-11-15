/** Source: main/index.html blob 1d52703f6572639c4b64b1e476fe7a0eba201a72 */
export interface LearningGroup { readonly id: string; readonly title: string; readonly icon: string; readonly description: string }
export interface LearningArticle { readonly id: string; readonly group: string; readonly title: string; readonly summary: string; readonly steps: readonly string[]; readonly result: string; readonly module: string }
export const LEARNING_GROUPS: readonly LearningGroup[] = [
  {
    "id": "awal",
    "title": "Mulai dari Nol",
    "icon": "♧",
    "description": "Pohon pertama dan kartu anggota"
  },
  {
    "id": "anggota",
    "title": "Mengelola Anggota",
    "icon": "♙",
    "description": "Tambah, lihat profil, dan edit"
  },
  {
    "id": "hubungan",
    "title": "Hubungan Keluarga",
    "icon": "♡",
    "description": "Orang tua, pasangan, saudara, anak"
  },
  {
    "id": "jelajah",
    "title": "Menjelajahi Pohon",
    "icon": "↔",
    "description": "Fokus, Expand, Collapse"
  },
  {
    "id": "kanvas",
    "title": "Navigasi Kanvas",
    "icon": "⤢",
    "description": "Pan, zoom, dan Fit All"
  },
  {
    "id": "data",
    "title": "Menyimpan Data",
    "icon": "↓",
    "description": "Browser, ekspor, impor, privasi"
  }
];
export const LEARNING_ARTICLES: readonly LearningArticle[] = [
  {
    "id": "tree-first",
    "group": "awal",
    "title": "Membuat pohon keluarga pertama",
    "summary": "Mulai dari satu anggota, kemudian hubungkan keluarga secara bertahap.",
    "steps": [
      "Buka Pohon Keluarga. Pilih ＋ Tambah anggota untuk membuat profil pertama, atau ketuk kartu yang sudah ada.",
      "Isi nama anggota dan informasi yang memang diketahui; tanggal lahir dan foto boleh kosong.",
      "Buka hubungan orang tua, pasangan, anak, atau saudara dari profil yang dipilih.",
      "Periksa garis yang menghubungkan anggota di kanvas."
    ],
    "result": "Setiap kartu mewakili satu orang. Satu orang tidak perlu dibuat ulang untuk relasi berikutnya.",
    "module": "hubungan"
  },
  {
    "id": "what-card",
    "group": "awal",
    "title": "Mengenal kartu orang",
    "summary": "Kenali nama, profil, tombol cabang, dan aksi cepat di satu kartu.",
    "steps": [
      "Ketuk satu kartu di Family Tree.",
      "Lihat menu ringkas yang menampilkan informasi dan jumlah hubungan.",
      "Tekan Lihat profil untuk membuka informasi lebih lengkap.",
      "Gunakan Jadikan fokus untuk menjelajahi orang itu."
    ],
    "result": "Kartu hanyalah tampilan anggota yang sama; zoom atau pindah fokus tidak mengubah data.",
    "module": "kartu"
  },
  {
    "id": "add-person",
    "group": "anggota",
    "title": "Menambah anggota baru",
    "summary": "Tambah profil yang belum ada, bukan menduplikasi anggota.",
    "steps": [
      "Ketuk kartu anggota yang sudah ada.",
      "Pilih tambah hubungan atau gunakan tombol Tambah anggota.",
      "Pilih hubungan yang benar, isi nama, lalu simpan.",
      "Pastikan kartu baru muncul pada generasi yang tepat."
    ],
    "result": "Profil baru tersimpan di browser selama menggunakan pohon asli. Simpan cadangan melalui Ekspor.",
    "module": "hubungan"
  },
  {
    "id": "edit-person",
    "group": "anggota",
    "title": "Memperbaiki biodata dan urutan lahir",
    "summary": "Ubah nama, tanggal lahir, urutan kakak-adik, atau foto.",
    "steps": [
      "Ketuk kartu dan pilih Profil atau Edit.",
      "Pilih Edit anggota.",
      "Isi Urutan lahir jika diketahui: 1 berarti yang tertua.",
      "Simpan dan periksa posisi saudara."
    ],
    "result": "Urutan kakak di kiri dan adik di kanan dipakai jika data kelahiran diketahui, bukan dari nama.",
    "module": "saudara"
  },
  {
    "id": "parent-child",
    "group": "hubungan",
    "title": "Menghubungkan orang tua dan anak",
    "summary": "Hubungan orang tua–anak memakai garis hijau.",
    "steps": [
      "Pilih orang yang akan dihubungkan.",
      "Tambah orang tua atau anak dari form hubungan.",
      "Jika anak memiliki dua orang tua tercatat, pilih pasangan orang tua yang sesuai.",
      "Simpan lalu periksa garis hijau pada cabang keluarga."
    ],
    "result": "Status pasangan tidak otomatis membuat dua orang menjadi orang tua. Relasi anak harus dicatat.",
    "module": "hubungan"
  },
  {
    "id": "partner-sibling",
    "group": "hubungan",
    "title": "Pasangan dan saudara",
    "summary": "Kenali garis merah muda untuk pasangan dan biru putus-putus untuk saudara.",
    "steps": [
      "Tambahkan pasangan pada satu orang.",
      "Tambahkan saudara atau catat orang tua bersama.",
      "Expand ↔ untuk menampilkan saudara jika sedang tersembunyi.",
      "Periksa urutan saudara pada satu generasi."
    ],
    "result": "Pasangan seorang saudara bukan otomatis saudara kandung.",
    "module": "saudara"
  },
  {
    "id": "focus",
    "group": "jelajah",
    "title": "Menjelajahi keluarga dan membuka Peta Keluarga",
    "summary": "Mulai dari keluarga terdekat, buka cabang sesuai kebutuhan, dan gunakan peta untuk melihat struktur lengkap.",
    "steps": [
      "Buka Pohon Keluarga: Person terdekat akan ditampilkan lebih dahulu.",
      "Ketuk Person untuk melihat Identity Card tanpa memindahkan kanvas.",
      "Pilih Jelajahi keluarganya untuk berpindah pusat eksplorasi.",
      "Buka Peta keluarga untuk melihat seluruh struktur; kembali ke pohon untuk melanjutkan."
    ],
    "result": "Anggota yang tersembunyi tetap ada di database dan bisa ditampilkan kembali.",
    "module": "kanvas"
  },
  {
    "id": "expand",
    "group": "jelajah",
    "title": "Expand dan Collapse cabang",
    "summary": "Buka dan tutup orang tua ↑, saudara ↔, atau anak ↓.",
    "steps": [
      "Pada kanvas keluarga, tekan ↑ pada kartu untuk membuka orang tua.",
      "Tekan ↔ untuk membuka saudara pada generasi yang sama.",
      "Tekan ↓ untuk membuka anak; setiap kelompok pasangan mempunyai cabang anak sendiri.",
      "Tekan lagi tombol arah yang terbuka untuk menutup cabang tanpa menghapus siapa pun."
    ],
    "result": "Collapse hanya menyembunyikan Person pada kanvas. Reset cabang memulihkan tampilan keluarga terdekat.",
    "module": "cabang"
  },
  {
    "id": "sibling-order",
    "group": "jelajah",
    "title": "Mengapa kakak berada di kiri?",
    "summary": "Saudara diurutkan berdasarkan urutan lahir atau tanggal lahir jika diketahui.",
    "steps": [
      "Buka Edit anggota pada salah satu saudara.",
      "Isi Urutan lahir 1, 2, 3 sesuai fakta keluarga jika diketahui.",
      "Atau isi tanggal lahir yang valid.",
      "Simpan, lalu buka cabang saudara kembali."
    ],
    "result": "Jika informasi tidak diketahui, posisi sementara tetap stabil; aplikasi tidak menebak usia.",
    "module": "saudara"
  },
  {
    "id": "pan-zoom",
    "group": "kanvas",
    "title": "Geser, zoom, dan Fit All",
    "summary": "Jelajahi kanvas tanpa mengubah struktur hubungan keluarga.",
    "steps": [
      "Geser satu jari pada HP atau drag pada ruang kosong dengan mouse.",
      "Cubit dua jari pada HP atau gunakan +/− pada desktop untuk zoom.",
      "Tekan ⛶ Fit All untuk melihat keseluruhan area yang sedang ditampilkan.",
      "Ketuk Person lalu pilih Jelajahi keluarganya untuk berpindah pusat eksplorasi."
    ],
    "result": "Zoom hanya mengubah tampilan, bukan hubungan atau posisi yang disimpan.",
    "module": "kanvas"
  },
  {
    "id": "lines",
    "group": "kanvas",
    "title": "Arti warna garis keluarga",
    "summary": "Jangan salah membaca garis orang tua, pasangan, dan saudara.",
    "steps": [
      "Garis hijau berarti orang tua–anak.",
      "Garis merah muda menunjukkan pasangan.",
      "Garis biru putus-putus menunjukkan hubungan saudara dalam situasi tertentu, misalnya saat orang tua tersembunyi.",
      "Tekan ? di kanvas untuk membaca legenda."
    ],
    "result": "Konektor mengikuti hubungan data; garis yang tersembunyi akibat cabang diringkas tidak berarti hubungannya terhapus.",
    "module": "cabang"
  },
  {
    "id": "storage",
    "group": "data",
    "title": "Di mana data keluarga tersimpan?",
    "summary": "Data asli berada di Supabase dan dapat dibuka dari perangkat lain menggunakan akun yang sama.",
    "steps": [
      "Masuk ke akun sebelum membuka Family Tree.",
      "Penambahan dan pengubahan data keluarga disimpan ke Supabase ketika berhasil.",
      "Gunakan akun yang sama pada perangkat lain untuk memuat data tersimpan.",
      "Ekspor JSON dari Pengaturan pohon sebagai cadangan tambahan."
    ],
    "result": "Tutorial latihan terpisah dan tidak menyimpan perubahan ke pohon asli.",
    "module": "data"
  },
  {
    "id": "backup",
    "group": "data",
    "title": "Ekspor dan impor dengan aman",
    "summary": "Bedakan backup dengan penggantian pohon aktif.",
    "steps": [
      "Buka tombol Ekspor untuk mengunduh cadangan JSON dari pohon asli.",
      "Simpan file di tempat yang aman.",
      "Saat hendak mengimpor, periksa jumlah anggota dan nama pohon.",
      "Konfirmasi pembuatan pohon baru di Supabase; pohon lama tidak otomatis dihapus."
    ],
    "result": "Impor membuat Family Tree baru di Supabase, tanpa menghapus pohon sebelumnya. Simulasi pada tutorial tidak memodifikasi data asli.",
    "module": "data"
  },
  {
    "id": "delete",
    "group": "data",
    "title": "Menghapus hubungan vs anggota",
    "summary": "Lepas sebuah relasi tanpa kehilangan profil.",
    "steps": [
      "Buka profil orang yang akan dikoreksi.",
      "Gunakan Hapus pada relasi langsung bila hanya hubungannya yang salah.",
      "Gunakan Arsipkan anggota hanya bila benar-benar ingin mengarsipkan profil.",
      "Ekspor cadangan sebelum perubahan besar."
    ],
    "result": "Menghapus hubungan tidak sama dengan menghapus kedua orang yang terlibat.",
    "module": "data"
  }
];
