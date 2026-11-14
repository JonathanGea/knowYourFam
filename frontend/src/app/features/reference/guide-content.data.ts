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
    "title": "Apa bedanya Fokus dan Seluruh Pohon?",
    "summary": "Fokus menampilkan keluarga terdekat; Seluruh Pohon menampilkan seluruh data.",
    "steps": [
      "Pilih mode Fokus Orang di atas kanvas.",
      "Gunakan Jadikan fokus pada kartu yang ingin dijelajahi.",
      "Beralih ke Seluruh Pohon untuk melihat semua anggota.",
      "Gunakan Fit All saat kehilangan posisi."
    ],
    "result": "Anggota yang tidak terlihat di mode Fokus tidak hilang dari data.",
    "module": "kanvas"
  },
  {
    "id": "expand",
    "group": "jelajah",
    "title": "Expand dan Collapse cabang",
    "summary": "Buka dan tutup orang tua ↑, saudara ↔, atau anak ↓.",
    "steps": [
      "Di Fokus Orang, tekan ↑ pada kartu untuk satu tingkat leluhur.",
      "Tekan ↔ untuk membuka saudara pada generasi yang sama.",
      "Tekan ↓ untuk membuka anak; setiap kelompok pasangan mempunyai cabang anak sendiri.",
      "Tekan lagi tombol arah yang terbuka untuk menutup cabang tanpa menghapus siapa pun."
    ],
    "result": "Cabang yang awalnya terlihat otomatis tetap boleh di-Collapse. Reset cabang mengembalikan tampilan Fokus awal.",
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
      "Jadikan fokus orang lain untuk berpindah pusat eksplorasi."
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
    "result": "Konektor mengikuti hubungan data; garis yang tersembunyi oleh Focus tidak berarti hubungannya terhapus.",
    "module": "cabang"
  },
  {
    "id": "storage",
    "group": "data",
    "title": "Di mana data keluarga tersimpan?",
    "summary": "Pahami penyimpanan lokal dan batas sinkronisasi.",
    "steps": [
      "Perubahan pada pohon asli disimpan di browser perangkat ini.",
      "Data tidak otomatis tersinkron ke akun atau perangkat lain.",
      "Ekspor JSON secara berkala untuk membuat cadangan.",
      "Impor hanya jika kamu ingin mengganti data aktif dengan isi berkas tersebut."
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
      "Konfirmasi hanya jika memang ingin mengganti data aktif."
    ],
    "result": "Impor menggantikan pohon di browser. Pada latihan, tombol simulasi tidak mengunduh atau mengimpor file sungguhan.",
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
      "Gunakan Hapus anggota hanya bila benar-benar ingin menghapus profil.",
      "Ekspor cadangan sebelum perubahan besar."
    ],
    "result": "Menghapus hubungan tidak sama dengan menghapus kedua orang yang terlibat.",
    "module": "data"
  }
];
