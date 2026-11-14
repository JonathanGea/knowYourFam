# KnowYourFam — Final MVP Permission & Contribution Policy

**Status:** FINAL — aturan produk untuk implementasi MVP (belum diimplementasikan)  
**Tanggal:** 14 November 2026  
**Branch:** dev/fullstack-mvp  
**Berlaku untuk:** satu Family Tree dan anggota yang memiliki akses ke Family Tree tersebut  
**Rujukan:** ADR-001 Backend Portability; ADR-002 Person Claim & Registration  
**Prioritas:** Jika contoh aturan permission pada dokumen lama bertentangan, dokumen ini menjadi acuan MVP.

## 1. Tujuan dan prinsip wajib

1. Setiap anggota berhak berkontribusi tanpa batas jarak keluarga atau generasi. Tidak ada “cabang milik Rudi” atau “cabang milik Surya”.
2. **Role berlaku per Family Tree**, bukan role global pengguna. Pencipta pohon adalah Owner; pemilik profil adalah individu yang mengklaim Person, bukan otomatis pencipta profil.
3. **Person berbeda dari User.** Sebuah Person dapat dibuat sebelum pemiliknya memiliki akun. Undangan/registrasi menghubungkan akun ke Person lama, bukan menciptakan Person duplikat.
4. Data pribadi Person yang sudah diklaim tidak dapat diubah sepihak oleh Owner sekalipun.
5. Hubungan yang tidak langsung menyangkut seorang anggota **tidak memberikan hak veto**. Rudi menambah anak sendiri tidak perlu persetujuan Surya meskipun anak itu menjadi kerabat Surya.
6. Membedakan **membuat data baru**, **menyatakan hubungan baru**, **mengubah fakta yang sudah diterima**, dan **menghapus data**. Keempatnya tidak otomatis memiliki izin yang sama.
7. Akses membaca (Focus, Expand, Search) tidak memberikan izin edit. Anggota hanya melihat data yang memang diizinkan.
8. Hapus Person atau hubungan dengan soft-delete dan audit. Tidak pernah menghapus akun login hanya karena sebuah profil silsilah dihapus.

## 2. Empat role MVP

| Role | Fungsi dan batas utama |
|---|---|
| **Owner** | Membuat/mengelola Family Tree; menyetujui klaim Person, menentukan role, meninjau kontribusi, dan menangani penghapusan penting. Tidak boleh sepihak mengambil alih akun atau menimpa informasi pribadi anggota yang sudah mengklaim Person. |
| **Editor** | Mengelola data silsilah dan meninjau proposal terkait profil/relasi yang belum diklaim sesuai mandat dari Owner. Tidak bisa memberi role, menyetujui klaim identitas, atau menghapus pohon. |
| **Contributor** | Role default anggota setelah klaim Person disetujui. Membuat Person baru, menambah relasi baru sesuai aturan, mengedit data pribadi yang diizinkan, dan mengusulkan perubahan sensitif. Tidak bisa mengubah data orang lain atau menghapus relasi terkonfirmasi secara sepihak. |
| **Viewer** | Melihat data yang diizinkan, navigasi, Focus/Expand/Search. Tidak bisa menulis Person, relasi, ataupun menyetujui proposal. |

**Belum login / bukan tree member:** tidak mempunyai role; hanya dapat mengakses halaman undangan/registrasi yang aman. **Belum klaim:** status Person, bukan role kelima.

Pendaftaran lewat undangan Person mengikuti ADR-002: login + verifikasi kontak + permintaan klaim + persetujuan Owner. Setelah persetujuan, role otomatis menjadi **Contributor**, bukan Viewer. Mengklaim Person tidak mengubah pemilik Family Tree.

## 3. Definisi formal: direct vs indirect

- **Pihak langsung:** Person yang ID-nya menjadi endpoint hubungan yang ditambah/diubah/dihapus, atau Person yang atribut profilnya diubah.
- **Kerabat tidak langsung:** anggota lain yang menjadi kerabat karena koneksi graf, tetapi **bukan endpoint** hubungan itu. Kerabat tidak langsung tidak perlu menyetujui.
- **Profil sendiri:** Person yang terhubung ke akun melalui tree_members.self_person_id di Family Tree yang sama; bukan berdasarkan nama, nomor telepon, kedekatan keluarga, atau siapa pembuatnya.
- **Profil diklaim:** Person sudah dihubungkan dengan akun terverifikasi melalui klaim yang disetujui.
- **Profil belum diklaim:** belum ada akun dengan binding self_person_id ke Person tersebut.
- **Hubungan baru:** sebuah edge yang belum ada dan tidak menggantikan/melanggar edge yang sudah diterima.
- **Konflik:** duplikasi Person yang mungkin sama, pelanggaran aturan relasi, penggantian fakta lama, siklus leluhur, atau klaim yang bertentangan. Sistem menahan perubahan untuk diperiksa.

## 4. Tiga hasil keputusan izin

- **APPLY:** boleh diterapkan sekarang. Jika menyatakan hubungan yang belum diverifikasi, simpan dengan status **unconfirmed**. “Diterapkan” bukan berarti semua pihak sudah membenarkan hubungan itu.
- **PROPOSE:** disimpan sebagai proposal **pending**, tanpa diam-diam menimpa sumber data aktif. Reviewer yang tepat menyetujui/menolak.
- **DENY:** tindakan tidak dapat dilakukan oleh role tersebut; UI dan server harus menolak dengan alasan jelas.

Semua operasi melewati autentikasi, keanggotaan Tree, pemeriksaan akses baca/tulis, validasi duplikasi dan validasi relasi. Data private dari Family Tree lain tidak otomatis tersedia.

## 5. Matriks izin final

| Aksi | Owner | Editor | Contributor | Viewer |
|---|---|---|---|---|
| Melihat Person/Tree yang diizinkan | APPLY | APPLY | APPLY | APPLY |
| Focus, Expand/Collapse, Search | APPLY | APPLY | APPLY | APPLY |
| Membuat profil Person baru tanpa duplikat | APPLY | APPLY | APPLY | DENY |
| Mengedit nickname, pekerjaan, foto diri sendiri (klaim sah) | APPLY | APPLY | APPLY | DENY |
| Mengubah fakta identitas penting milik diri (contoh tanggal lahir) | PROPOSE | PROPOSE | PROPOSE | DENY |
| Mengubah data pribadi Person lain yang sudah diklaim | PROPOSE | PROPOSE | PROPOSE | DENY |
| Mengedit data dasar Person belum diklaim | APPLY* | APPLY* | APPLY jika pembuat dan belum dipakai orang lain; selain itu PROPOSE | DENY |
| Menambah relasi Person baru langsung ke diri sendiri, tidak konflik | APPLY (unconfirmed) | APPLY (unconfirmed) | APPLY (unconfirmed) | DENY |
| Menambah relasi Person baru ke Person lain yang sudah diklaim | PROPOSE | PROPOSE | PROPOSE | DENY |
| Menambah relasi Person baru ke Person lain yang belum diklaim, tidak konflik | APPLY (unconfirmed)* | APPLY (unconfirmed)* | APPLY (unconfirmed)* | DENY |
| Menghubungkan dua Person yang keduanya sudah ada | PROPOSE** | PROPOSE** | PROPOSE | DENY |
| Mengganti/memutus hubungan yang sudah diterima | PROPOSE** | PROPOSE** | PROPOSE | DENY |
| Menghapus Person yang dibuat sendiri, belum diklaim, belum dipakai anggota lain, tanpa relasi terkonfirmasi | APPLY setelah preview dampak | APPLY setelah preview dampak | APPLY setelah preview dampak | DENY |
| Menghapus Person lain atau Person yang sudah diklaim/dipakai bersama | PROPOSE/restricted | PROPOSE/restricted | PROPOSE | DENY |
| Membuat/menarik undangan klaim Person | APPLY | Berdasarkan delegasi Owner | DENY (MVP) | DENY |
| Menyetujui klaim identitas Person | APPLY | DENY | DENY | DENY |
| Meninjau proposal perubahan | APPLY | APPLY untuk data yang belum diklaim dan tidak konflik | DENY | DENY |
| Mengubah role anggota | APPLY | DENY | DENY | DENY |
| Mengarsipkan/menghapus Family Tree | APPLY dengan konfirmasi kuat | DENY | DENY | DENY |

* Hanya jika tidak menyentuh data yang diklaim orang lain, tidak ada konflik/duplikasi, dan tidak mengganti fakta yang sudah disepakati. Perubahan struktural yang melanggar aturan tetap DENY atau PROPOSE.

** Owner/Editor boleh memulai perubahan sendiri, tetapi tidak boleh mengesahkan sendiri klaim yang menyangkut identitas pribadi anggota lain; keputusan memerlukan persetujuan pihak langsung yang sudah mengklaim. Untuk Person belum diklaim, Owner atau Editor berwenang meninjau, dan pengusul tidak boleh sekaligus menjadi reviewer final proposalnya. Operasi darurat/override Owner bukan bagian MVP.

## 6. Aturan spesifik yang wajib diprogram

### 6.1 Tambah Person

- Contributor boleh membuat profil baru pada generasi atau cabang mana saja; cari calon duplikat lebih dulu dan beri pilihan menghubungkan profil yang ada.
- Person baru boleh langsung tersimpan walaupun belum mempunyai akun.
- Membuat Person dan menambahkan hubungan adalah dua tindakan berbeda; izinnya dinilai secara terpisah.
- Tidak boleh diam-diam membuat profil kedua untuk orang yang sudah terdeteksi sebagai profil yang sama; kandidat duplikat ditahan untuk review jika tidak dapat dipastikan.

### 6.2 Tambah hubungan baru

- Ke **diri sendiri + Person baru**: boleh langsung, relasi **unconfirmed**, jika tidak bertentangan dengan relasi yang sudah ada.
- Ke **Person lain yang sudah diklaim**: PROPOSE, meminta persetujuan pemilik profil langsung; tidak memerlukan persetujuan semua kerabat tidak langsung.
- Ke **Person lain yang belum diklaim + Person baru**: boleh langsung sebagai **unconfirmed** jika tidak ada konflik.
- **Dua Person yang sama-sama sudah tercatat**: PROPOSE untuk mencegah penyambungan tidak disengaja.
- **Mengganti, menghapus, atau bertentangan dengan hubungan aktif yang diterima**: PROPOSE, tidak ditimpa langsung.
- **Parent-child** harus memiliki arah eksplisit; tidak boleh ada siklus. Berbagi anak **tidak** menciptakan hubungan pasangan otomatis.
- Status hubungan: **unconfirmed** (baru diklaim satu pihak/belum diuji), **confirmed** (konfirmasi pihak langsung dan pemeriksaan yang disyaratkan telah lengkap), **disputed** (ada keberatan atau informasi bertentangan). Status tidak mengubah legalitas hubungan di dunia nyata.

### 6.3 Edit profil

- Profil sendiri yang sudah diklaim: nickname, pekerjaan, foto, dan informasi ringan lain yang diizinkan **langsung** dengan audit.
- Identitas penting (misalnya tanggal lahir atau nama resmi) serta koreksi terhadap data keluarga yang sudah dipakai bersama: PROPOSE.
- Profil orang lain yang sudah diklaim: PROPOSE dengan persetujuan pemilik profil; Owner pun tidak dapat menimpanya langsung.
- Profil belum diklaim: pembuat boleh melengkapi data ringan selama belum ada kontribusi pihak lain atau konflik. Owner/Editor dapat mengelolanya dengan audit.

### 6.4 Hapus Person yang dibuat sendiri

Contributor boleh langsung soft-delete **hanya jika seluruh syarat ini benar**:
1. Person dibuat oleh pengguna tersebut di Tree yang sama;
2. Person **belum diklaim** akun lain;
3. Belum ada perubahan, hubungan, atau kontribusi orang lain yang bergantung pada Person tersebut;
4. Tidak ada hubungan **confirmed** atau hubungan yang penghapusannya mengubah fakta diterima tentang Person lain;
5. Seluruh relasi yang perlu dinonaktifkan dibuat olehnya sendiri dan masih **unconfirmed**;
6. Preview dampak ditampilkan dan pengguna mengonfirmasi.

Jika satu syarat gagal: PROPOSE penghapusan; data aktif tidak berubah hingga keputusan. Hapus Person tidak menghapus profil, hubungan, atau akun anggota lain. Hapus Person yang diklaim perlu penanganan persetujuan khusus dan tidak boleh menjadi alat pengambilalihan identitas.

### 6.5 Hapus hubungan

- Contributor boleh membatalkan **usulan sendiri yang masih pending**.
- Contributor boleh mencabut relasi yang dia buat dan masih **unconfirmed** hanya jika semua endpoint/kontribusi terkait belum diklaim/digunakan pihak lain dan hasilnya tidak mengganti fakta yang sudah diterima.
- Hubungan **confirmed**, konflik, atau dibuat/dipakai bersama hanya dapat diubah lewat PROPOSE dan peninjauan sesuai pihak langsung.
- Penghapusan relasi = soft-delete edge; tidak menghapus Person endpoint.

### 6.6 Persetujuan proposal

- Perubahan **informasi pribadi claimed Person**: wajib disetujui pemilik profil yang sah. Owner/Editor tidak dapat menimpa persetujuan atau penolakannya di MVP.
- Perubahan **hubungan struktural yang diterima**: Owner/Editor meninjau integritas, dan setiap endpoint **claimed** yang langsung terdampak harus memberi persetujuan sebelum relasi terkonfirmasi diubah. Endpoint unclaimed diwakili reviewer Owner/Editor.
- Jika kedua endpoint telah diklaim, minta persetujuan **keduanya** untuk perubahan yang menghapus/mengganti hubungan aktif.
- Reviewer proposal tidak boleh menjadi satu-satunya pihak yang menyetujui proposalnya sendiri.
- Jika ada penolakan/konflik: pertahankan data aktif, tampilkan **rejected/disputed** yang aman, dan catat riwayat.
- Izin diperiksa ulang tepat saat penerapan transaksi (bukan hanya saat proposal dikirim).

## 7. Aturan status klaim dan keanggotaan

- Owner dapat menerbitkan undangan ke Person yang sudah ada. Link tidak otomatis memberikan kepemilikan Person.
- Penerima register/login, verifikasi kontak, mengajukan klaim dan menunggu persetujuan Owner.
- Klaim approved membuat/memperbarui **tree_members.self_person_id**, tidak membuat Person kedua.
- Sesudah klaim disetujui, role default **Contributor**.
- Satu Person aktif dalam satu Tree maksimal terhubung pada satu akun; satu akun dapat mengklaim Person yang berbeda dalam Tree yang berbeda dengan pemeriksaan terpisah.
- Klaim bukan bukti kebenaran semua hubungan; Person baru berhak melihat/mengonfirmasi atau menolak relasi unconfirmed yang melibatkan dirinya.
- Profil anak di bawah umur tidak memakai self-claim biasa; otorisasi wali perlu desain terpisah dan tidak otomatis diberikan hanya dari hubungan orang tua di graf.

## 8. Penentuan izin (decision order)

1. **Autentikasi + membership:** tidak ada -> DENY (kecuali endpoint undangan/registrasi aman).
2. **Batas Tree + visibility:** hanya data yang boleh dilihat/diakses; cross-tree -> DENY.
3. **Role:** Viewer -> DENY setiap write; Owner/Editor/Contributor sesuai tabel.
4. **Target Person:** self-claimed, claimed-other, unclaimed, baru; pemilik/pembuat data dan pihak yang pernah berkontribusi.
5. **Jenis perubahan:** create Person, add unconfirmed relation, edit simple fact, replace established fact, delete, claim, membership, governance.
6. **Integritas:** cek duplikat, parent-cycle, composite FK tree, status klaim, relasi confirmed, versi data, serta konflik.
7. Hasil **APPLY / PROPOSE / DENY**, sertai alasan untuk UI dan audit. Penentuan terjadi di server/RPC, bukan hanya tombol Angular.

## 9. Kebutuhan data untuk implementasi

- **tree_members.role:** tambah nilai **contributor** ke enum/CHECK; self_person_id mengikuti aturan klaim.
- **persons:** gunakan created_by, updated_by, deleted_at, updated_at, dan versi/revisi; status klaim diturunkan dari binding, bukan menambah boolean global is_owner.
- **parent_child_relations / partner_relations / sibling_relations:** dibuat oleh, diubah/dihapus oleh, status unconfirmed/confirmed/disputed, versi, dan metadata audit minimal.
- **contribution_proposals:** id, tree_id, proposer_user_id, operation, target_type, target_id, expected_version, proposed_payload, status (pending/approved/rejected/cancelled), decision maker/time/reason, timestamps. Jangan anggap payload usulan sebagai data aktif.
- **contribution_events:** append-only audit aktor, jenis perubahan, target, proposal, waktu, dan ringkasan minimal sebelum/sesudah; jangan simpan rahasia atau berkas sensitif sembarangan.
- **relationship_confirmations** bila diperlukan: satu keputusan per endpoint claimed atas sebuah relasi/proposal (claimer_user_id, relation_ref, decision, decided_at), untuk pembuktian bahwa konfirmasi benar-benar datang dari pihak langsung.
- **auth_identities** tetap terpisah dari domain User sebagaimana ADR-001.
- Migration awal **belum** memuat semua perubahan di atas; buat migration implementasi tersendiri setelah pengujian. Jangan menjalankan SQL draft V1 tanpa revisi.
- Gunakan constraint DB dan transaksi untuk mencegah dua approval konflik, duplikat active relation, klaim ganda, dan deletion race. Di Supabase: RLS + operasi terprivileg yang diaudit; di backend sendiri: authorization service yang mengikuti kontrak sama.

## 10. Contoh kontrak use-case

- createPerson(treeId, input)
- updateOwnProfile(treeId, personId, patch)
- createRelationship(treeId, kind, endpoints, payload)
- submitContributionProposal(treeId, kind, target, expectedVersion, payload)
- decideContributionProposal(treeId, proposalId, decision)
- deleteMyUnsharedPerson(treeId, personId, expectedVersion)
- previewDeletionImpact(treeId, personId)
- confirmDirectRelationship(treeId, relationshipId, decision)
- getMyPermissions(treeId, targetPersonId)
- claimExistingPerson(invitationToken) — melalui alur ADR-002

Respons mutasi harus menyertakan **decision** (applied, proposed, denied), **reason_code**, serta id Person/edge/proposal yang relevan. UI menampilkan “Tersimpan”, “Belum dikonfirmasi”, atau “Menunggu persetujuan” secara berbeda.

## 11. Acceptance criteria MVP

1. Surya membuat Tree dan mengundang Rudi; setelah klaim disetujui Rudi menjadi Contributor dan menunjuk **Person Rudi yang sama**, tanpa duplikat.
2. Rudi menambahkan anak baru dari dirinya: **APPLY unconfirmed**; tidak meminta persetujuan Surya yang hanya kerabat tidak langsung.
3. Rudi membuat sepupu baru: profil baru boleh ditambah; relasi ke kerabat yang belum diklaim dapat menjadi unconfirmed bila tidak konflik; relasi langsung ke Person claimed perlu proposal. Tidak ada izin massal dari seluruh sepupu.
4. Rudi mencoba menambahkan anak ke **Surya yang claimed**: **PROPOSE**, tidak langsung mengubah hubungan aktif hingga disetujui.
5. Dua anggota menambahkan Person yang tampak sama: tampilkan review calon duplikat sebelum membuat versi baru; jangan menggabung data otomatis hanya dari nama.
6. Rudi mengubah informasi pribadi Surya yang claimed: **PROPOSE**, tidak dapat diterapkan tanpa persetujuan Surya.
7. Rudi mengubah identitas penting dirinya: **PROPOSE**, sedangkan edit pekerjaan/nickname sendiri **APPLY**.
8. Rudi menghapus Person buatannya yang unclaimed, belum dipakai pihak lain dan hanya memiliki relasi miliknya yang unconfirmed: setelah dampak ditampilkan, **APPLY soft-delete**.
9. Rudi menghapus Person buatannya yang kemudian diklaim atau diedit pihak lain: **PROPOSE**; tidak ada data aktif yang hilang sementara menunggu review.
10. Rudi menghapus hubungan confirmed: **PROPOSE**, bukan langsung menghapus; endpoint claimed yang langsung terdampak dan reviewer sesuai aturan wajib menyetujui.
11. Viewer tidak dapat membuat atau mengubah data melalui UI **maupun API/RPC**.
12. Permintaan yang merujuk tree lain, token undangan yang sudah dipakai, parent-cycle, stale version, atau race approval ditolak aman tanpa data parsial.
13. Perubahan yang diterapkan memiliki audit dan alasan keputusan yang dapat ditelusuri.
14. Semua aturan bisa ditegakkan pada PostgreSQL biasa dengan auth adapter sendiri; tidak memakai logika UI sebagai satu-satunya pengaman.

## 12. Batasan dan urutan pengembangan

**Termasuk MVP:** 4 role, claim, anggota tanpa akun, menambah Person, relasi provisional, proposal sederhana, persetujuan, soft-delete, pemeriksaan duplikasi dasar, audit minimal, permission di backend.

**Belum termasuk:** bukti identitas hukum, verifikasi dokumen, guardian/anak di bawah umur, sistem sengketa kompleks, merger Person lintas Tree, tribunal keluarga, automatic approval berdasarkan kedekatan generasi, data publik tanpa consent, dan role khusus tambahan.

**Urutan:** portable schema + auth identities -> role/contributor policy + RLS -> Person Claim -> Create Person/Relationship -> proposal/review -> deletion safeguards -> tests dan UI mobile.

---

**Keputusan final:** Empat role saja. Kontribusi boleh menjangkau seluruh silsilah. Izin ditentukan oleh **tindakan, Person yang langsung terdampak, status klaim, status hubungan, dan kontribusi orang lain** — bukan jarak kekerabatan maupun siapa yang pertama membuat pohon.
