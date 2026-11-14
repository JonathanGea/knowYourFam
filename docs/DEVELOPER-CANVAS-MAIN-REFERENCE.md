# KnowYourFam — Developer Guide Canvas (transkrip branch main)

**Sumber utama:** [`main/index.html`](https://github.com/JonathanGea/knowYourFam/blob/main/index.html), Git blob `1d52703f6572639c4b64b1e476fe7a0eba201a72`, fungsi `renderDeveloperPage()` (14 November 2026).  
**Tipe dokumen:** transkrip konten dokumentasi developer di halaman HTML **main**, disusun sebagai Markdown. Label *DI KODE* atau *BERLAKU* merujuk pada implementasi **main**, bukan klaim paritas Angular.

**Konsep utama dari main:** data `people / parent / partner / sibling` → `visibleFamilyGraph()` → `makeLayout()` → `drawTree()` → `applyView()`. Semua posisi adalah world coordinates; pan/zoom tidak mengubah hubungan keluarga.

## Daftar isi

1. Arsitektur canvas & rendering
2. Kontrak data Person & Relationship
3. DOM canvas, ukuran & koordinat
4. Graph visibility & branch state
5. Layout engine & family balancing
6. SVG routing & relationship connectors
7. Card lifecycle & directional controls
8. Pan · Zoom · Focus · Camera anchoring
9. Render lifecycle & update boundary
10. Validasi, seed & penyimpanan
11. Debugging checklist & batasan
12. User Guide & isolated interactive tutorials
13. Couple-Centered Child Layout
14. Orthogonal Family Routing V3
15. Overview Lineage Spine V2

---

## 1. Arsitektur canvas & rendering

*Section ID: `dev-architecture`; status di sumber: DI KODE.*

DI KODE

Source of truth**data**people · parent · partner · sibling

 →
Filter**visibleFamilyGraph()**Focus / Overview

 →
Layout**makeLayout()**positions · size

 →
Render**drawTree()**SVG + HTML nodes

 →
Camera**applyView()**translate + scale

## 2. Kontrak data Person & Relationship

*Section ID: `dev-model`; status di sumber: DI KODE.*

DI KODE

**Graph adalah sumber kebenaran**; bentuk kartu, posisi, garis dan status cabang tidak boleh mengubah fakta hubungan. `githubSeed` berasal dari `knowyourfam-family-tree.json`, sedangkan `data` adalah objek runtime.

>>

- `parent` berarah (orang tua → anak); `partner` dan `sibling` adalah pasangan ID, tanpa arah keturunan.

- `rel(id)` menurunkan *parents*, *children*, *partners*, dan *siblings*. Saudara diturunkan dari relasi eksplisit **atau** orang tua tercatat yang sama.

- Pasangan **tidak otomatis** menjadi orang tua. Anak pasangan hanya diketahui jika dua edge `parent` memang ada.

- Semua hubungan menggunakan `person.id`, bukan nama atau urutan kartu.

## 3. DOM canvas, ukuran & koordinat

*Section ID: `dev-canvas`; status di sumber: DI KODE.*

DI KODE

Renderer bukan elemen `<canvas>` HTML. Ini **DOM HTML absolut + SVG** di dalam `#scene`, dan `#scene` diposisikan di dalam `#viewport` yang menangani gesture.

>>

**185 × 113**Card W × H (unit world)

**26**Gap dasar antaranggota

**181**Jarak baris generasi (ROW)

**167 / 76**PADX / TOPY awal

>>

`positions` disimpan sebagai `Map<personId, {x,y,level}>`. Kartu berada di **world space**; pan/zoom tidak memodifikasi hasil layout atau database. `size.w/h` menyatakan bounding area dunia untuk Fit All.

## 4. Graph visibility & branch state

*Section ID: `dev-focus`; status di sumber: DI KODE.*

DI KODE

**Overview** mengembalikan seluruh graph. **Focus** memakai `focusRoot`, default 2 generasi leluhur, relasi samping yang relevan, pasangan fokus dan 1 generasi anak. Saudara kakek/nenek tidak masuk default, tetapi bisa dibuka manual.

>>

- `focusDefaultBranchKeys()` menentukan cabang yang *awal* terbuka; `branchIsOpen()` menghormati `collapsedBranches` terlebih dahulu.

- `focusFamilyMembers()` dan `visibleFamilyGraph()` memfilter kartu dan edges untuk layout. Orang yang tersembunyi tetap ada dalam `data`.

- `branchMembers()` berisi anggota langsung per arah; `toggleBranch()` membuka/menutup cabang. Ekspansi manual menambah maksimal 12 anggota per batch lewat `expansionPages`.

- `closeDirectionalBranch()` membersihkan ekspansi turunan yang sudah tidak terjangkau. **Collapse bukan delete.**

- `setFocus()` mengganti pusat eksplorasi dan mengatur ulang state cabang; `Reset cabang` memulihkan kondisi awal Focus.

## 5. Layout engine & family balancing

*Section ID: `dev-layout`; status di sumber: DI KODE.*

DI KODE

**Birth-order sorting (SIBLING_BIRTH_ORDER):** Setiap `Person.birthOrder?: number` adalah peringkat lahir opsional (1 = tertua). `validate()` menerima bilangan bulat 1–999. `siblingBirthCompare(a,b)` hanya mengembalikan -1/+1 bila keduanya memiliki peringkat berbeda, atau keduanya memiliki tanggal lahir valid yang dapat dibandingkan; selain itu hasil 0 (unknown). Peringkat manual mengalahkan tanggal jika keduanya tersedia. Jangan mengurutkan dari nama, gender, atau urutan input.

Di akhir `makeLayout()`, setiap baris memakai **stable topological sibling constraints** atas group atomik, lalu **isotonic packing** untuk menjaga jarak tanpa overlap. Anggota dengan pasangan tetap bergerak sebagai satu group. Aturan arah saudara pasangan kiri/kanan hanya fallback jika usia belum diketahui; informasi lebih tua/lebih muda diutamakan saat tersedia. Jika constraint bertentangan, jangan mengarang fakta: pertahankan urutan sebelumnya.

`makeLayout()` bukan sekadar menyortir daftar orang. Urutannya memperhitungkan graph yang terlihat dan **fakta saudara dari graph penuh** untuk mencegah saudara pasangan loncat generasi ketika orang tuanya tersembunyi.

- **Group pasangan.** Partner digabung menjadi unit penempatan satu baris menggunakan *disjoint-set*; pasangan tetap memiliki keluarga asal masing-masing.

- **Cohort generasi.** Saudara eksplisit/berbagi orang tua ditempatkan pada level yang sama. Parent–child menentukan level berikutnya melalui DAG/topological ordering, dengan fallback jika data bertentangan.

- **Susun birth-family.** Saudara dari partner kiri tumbuh ke kiri, saudara partner kanan ke kanan. Urutan pasangan mengikuti record, kecuali pasangan pria–wanita yang gendernya diketahui.

- **Anchor keturunan.** Unit ditargetkan ke posisi anak yang tercatat, bukan pusat seluruh keluarga pasangannya.

- **`FAMILY_BALANCE_V3`.** `balanceFamilyRow()` merapikan blok pasangan + saudara dengan target anak/orang tua, jarak antarkelompok, dan pendekatan *isotonic regression* agar urutan tidak saling menyalip.

- **Normalisasi.** Semua koordinat dipindah menjadi positif; hasil akhir masuk `positions` dan `size`.

>>

Heuristik balancing bukan solver graf sempurna. Pada relasi silang, pusat parent–children belum tentu simetris tanpa garis silang. Jangan membuat penyesuaian berbasis nama orang atau offset piksel khusus.

## 6. SVG routing & relationship connectors

*Section ID: `dev-connectors`; status di sumber: DI KODE.*

DI KODE

Semua hubungan digambar di satu `<svg class="connections">` sebelum elemen kartu HTML. Klasifikasi warna bukan tipe Person, melainkan tipe relasi.

** `.edge-parent` anak** `.edge-partner` pasangan** `.edge-sibling` saudara

- **Partner:** path pendek menghubungkan sisi dua kartu pada level yang sama.

- **Parent/child bus:** anak dikelompokkan menurut **set ID orang tua yang identik + level**. Jika keluarga lain berdiri di antara anak-anak satu unit, renderer memecah *bus visual* menjadi beberapa pulau lokal, masing-masing tetap memiliki trunk ke orang tua yang sama. Ini hanya pemisahan garis; relasi tetap satu sumber fakta.

- **Trunk routing:** `familyTrunk()`, `levelCandidates()`, dan `intermediateLanes()` memilih koridor vertikal lintas generasi menggunakan dynamic programming. Setiap perubahan arah horizontal hanya dilakukan di ruang kosong antarbaris; biaya rute mempertimbangkan panjang horizontal dan jumlah belokan.

- **Track isolation:** `occupiedTracks` memakai lima slot ketinggian (selisih 7 world unit) agar bus milik parent-set berbeda tidak tampak menyatu saat bentangnya saling tumpang tindih.

- **Sibling bracket:** ketika orang tua disembunyikan di Focus, `hiddenParentChildren` memakai seluruh `data.parent` untuk tetap menggambar kurung biru putus-putus. Relasi `sibling` eksplisit ditampilkan bila belum diwakili garis hijau.

- **Safety mask:** SVG `#tree-safe-card-mask` memotong jalur yang masih memotong zona aman sekitar kartu. Ini fallback visual, bukan pengganti routing.

>>

## 7. Card lifecycle & directional controls

*Section ID: `dev-cards`; status di sumber: DI KODE.*

DI KODE

**Satu Person = satu `.node` HTML dalam diagram.** Kartu dihasilkan dari `displayGraph.people.map(...)` pada `drawTree()`. Avatar inisial/foto berasal dari `photo(p)`, sedangkan nama dan nilai metadata diamankan dengan `safe()`.

>>

- `data-person` adalah identifier untuk memilih anggota, bukan posisi. Jangan gunakan indeks array atau nama sebagai key.

- `.branch-toggle` ditempatkan relatif pada kartu: **↑** di atas, **↔** di sisi luar pasangan, **↓** di bawah atau di midpoint pasangan jika anak bersama.

- Tombol Expand tidak boleh mengambil alih klik kartu; event delegation membaca `data-expand` sebelum membuka quick action.

- `choose(id)` membuka aksi cepat; `showQuickActions()` memakai panel kontekstual. Di HP, tersedia drawer/bottom sheet dengan akses profil penuh.

- CSS `.zoom-compact` dan `.zoom-far` mengurangi detail kartu saat zoom kecil, **bukan** menghapus profil dari graph.

## 8. Pan · Zoom · Focus · Camera anchoring

*Section ID: `dev-gesture`; status di sumber: DI KODE.*

DI KODE

Pan dan pinch dikelola dengan `PointerEvent` pada `#viewport`, menggunakan `points` untuk melacak pointer aktif. Transform diterapkan ke `#scene` satu kali.

>>

- `pointerdown/move/up`: satu jari/mouse untuk pan; dua pointer untuk pinch. Ambang drag dipakai untuk membedakan ketukan node dari gesture.

- `zoomAt()` mempertahankan koordinat dunia di bawah cursor; `fitView()` memakai dimensi `size` dan viewport. Zoom Fit All saat ini bisa turun hingga `0.004`, sehingga semua kartu muat tetapi teks sangat kecil.

- `focusOn()` memusatkan orang tertentu. `renderKeepingAnchor()` mempertahankan posisi layar node yang sedang di-expand/collapse sebisa mungkin.

- Jangan menyimpan `pan` atau `zoom` sebagai koordinat Person. Simpan hanya fakta keluarga di JSON.

## 9. Render lifecycle & update boundary

*Section ID: `dev-render`; status di sumber: DI KODE.*

DI KODE

Action**Event delegation**click · pointer · form
→
State**data / branch sets**sesuai aksi
→
Recalculate**render()**makeLayout + metadata
→
View**drawTree()**SVG + cards + controls

`render()` menghitung layout dan metadata. Pada view pohon, `drawTree()` juga memanggil `makeLayout()`; ini perilaku kode saat ini (ada perhitungan ulang), **bukan** pipeline optimal yang seharusnya selalu dipakai.

- Perubahan fakta: `savePerson()`, `addRelation()`, `linkChildToCouple()` → `save()` → render.

- Perubahan tampilan: `toggleBranch()`, `setFocus()`, zoom/pan → render atau `applyView()` tanpa menulis JSON.

- Card, lane, edge dan kontrol dibuat ulang dari data dengan `scene.innerHTML`. Jangan menyimpan event listener langsung di node hasil render; gunakan delegation di parent stabil.

## 10. Validasi, seed & penyimpanan

*Section ID: `dev-persistence`; status di sumber: DI KODE.*

DI KODE

MVP berjalan **client-side**. Saat boot, data non-demo yang tersimpan di `localStorage` menang atas seed GitHub. Perubahan lokal tidak otomatis tersinkron ke repo dan tidak ada database/server autentikasi pada halaman ini.

>>

- `validate()` memeriksa struktur array, ID unik, dan membersihkan beberapa input. `addRelation()` serta `isCyclic()` memvalidasi penambahan hubungan.

- `knowyourfam-family-tree.json` adalah seed repositori, bukan sinkronisasi langsung dua arah. Tombol GitHub dan Merge Test adalah tindakan eksplisit.

- Data foto berupa data URL terbatas; storage browser memiliki kuota. Ekspor JSON sebelum ganti data, hapus data lokal, atau uji dataset besar.

- Kontrol akses dan kolaborasi multiuser belum ada di MVP client-only ini; jangan perlakukan data browser sebagai storage produksi.

## 11. Debugging checklist & batasan

*Section ID: `dev-testing`; status di sumber: DI KODE.*

DI KODE

**Layout correctness**Tidak ada overlap kartu; pasangan berdampingan; saudara sejajar; family unit mengikuti keturunan, bukan melayang.

**Edge correctness**Tidak ada edge melewati badan kartu; anak tiap pasangan punya child bus sendiri; sibling bracket muncul saat parent hidden.

**Interaction correctness**Expand ↔ saudara pasangan Jonathan tidak meloncat generasi; urutan kakak → adik berdasarkan `birthOrder` / tanggal lahir harus tetap pada Focus, Overview dan setelah Collapse/Expand; default Focus bisa collapse & expand; Reset kembali awal.

**Camera correctness**Node anchor tetap terlihat setelah buka/tutup; Fit All muat semua node (mungkin pada skala sangat kecil).

**Data integrity**Snapshot ID dan relasi sebelum/sesudah expand identik; render tidak boleh menulis ke JSON.

>>

**Known limitation:** balancing berbasis heuristik dapat menyisakan garis panjang pada graf kompleks; SVG mask hanya pelindung visual; rendering ulang full scene dan lookup relasi dengan filter array belum dioptimalkan untuk ribuan Person. Target perbaikan berikutnya: indeks relasi, routing berbasis obstacle yang lebih kuat, serta test regresi otomatis untuk tiap jenis graph.

## 12. User Guide & isolated interactive tutorials

*Section ID: `dev-learning`; status di sumber: BERLAKU.*

**Alur:** `renderGuidePage()` memuat artikel dan modul; `startTutorial(id)` menyimpan snapshot state tampilan asli lalu memasang `teachingSeed(id)` sebagai data latihan. `tutorialRecord(type,payload)` memvalidasi aksi sesungguhnya sebelum memajukan langkah. `exitTutorial()` mengembalikan referensi data dan state kamera, fokus, mode, serta ekspansi.

**Pemisahan penyimpanan:** `STORE = knowyourfam_mvp_v1` adalah keluarga asli; `LEARNING_STORE = knowyourfam_learning_v1` khusus preferensi onboarding, progress, dan snapshot latihan. `save()` tidak menulis ke STORE selama `tutorial.active`. Destructive controls dan impor/ekspor asli diblok selama latihan.

**State dan validasi:** langkah `created` memakai form anggota asli tetapi menulis hanya ke `data` demo; `branch` memeriksa `branchIsOpen()`; `mode`, `zoom`, `pan`, `fit` harus berasal dari kontrol/gesture kanvas. Simulasi backup tidak mengakses File API dan tidak mengganti pohon. Untuk modul baru, tambahkan definisi ke `LEARNING_COURSES` dan artikel relevan ke `LEARNING_ARTICLES`.

Checklist regresi: periksa STORE tidak berubah byte-for-byte sebelum dan sesudah tutorial; relasi dan ID kembali, kamera dan fokus pulih, progress tersimpan terpisah, halaman panduan bisa dibuka dari desktop/HP, dan modul tidak selesai hanya karena tombol berikutnya ditekan.

Buka Panduan Pengguna ↗

## 13. Couple-Centered Child Layout

*Section ID: `dev-child-align`; status di sumber: BERLAKU.*

**Entry point:** `relaxFamilyCenters()` berjalan di akhir `makeLayout()`, sesudah `FAMILY_BALANCE_V3` dan `SIBLING_BIRTH_ORDER`, sebelum normalisasi koordinat dan pembuatan `positions`. Semua generasi dioptimalkan secara dua arah: parent group dapat mendekati child block, child block dapat mendekati parent group.

>>

- **Family units:** dikelompokkan dari `gdata.parent` berdasarkan ID orang tua terurut dan level anak (bukan nama, gender, atau urutan input). Pasangan yang hanya tercatat sebagai `partner` tanpa parent edges tidak otomatis menjadi orang tua.

- **Gradien:** setiap pasangan/anak menghasilkan gaya koreksi ke titik tengahnya. `150` iterasi iterasi pendek, gradient step terbatas ±32 world unit, dengan regularisasi `lambda = 0.015` untuk menghindari loncatan jauh antarcabang.

- **Collision & stable order:** setiap iterasi diproyeksikan melalui weighted isotonic / pool-adjacent-violators pada baris generasi; gap minimal untuk saudara dan cabang lain berbeda. Pasangan adalah satu atomic group, sehingga tidak terpisah; kakak/adik tidak bertukar posisi setelah birth-order disortir.

- **Render:** seluruh x adalah world coordinates; `positions`, `size` dan SVG child-bus dirender ulang setelah optimasi. Perhitungan tidak menulis perubahan posisi ke JSON atau `localStorage`.

- **Tradeoff:** satu Person bisa terhubung ke beberapa family units. Jika banyak constraint bertentangan, collision-free dan urutan saudara diutamakan; tidak menjanjikan semua pasangan bisa tepat di tengah pada graf 10 generasi.

**Checklist:** ukur selisih midpoint Jonathan–pasangannya terhadap dua anak, keluarga Mama talu, anak satu orang tua, keluarga pasangan lain, Focus/Overview, Expand/Collapse dan 390/768/1440 px. Bandingkan error sebelum/sesudah serta pastikan 0 card overlaps dan data `parent` tetap identik.

## 14. Orthogonal Family Routing V3

*Section ID: `dev-route-v3`; status di sumber: BERLAKU.*

**Entry point:** `drawTree()` memakai `positions` hasil `makeLayout()` tanpa mengubahnya. Renderer membangun `childParentSets`, `childUnits`, lalu `visualUnits`. Kunci keluarga tetap `sorted(parentIds) + '@' + childLevel`.

>>

- **Visual islands:** jika dua saudara dipisahkan kartu dari keluarga lain pada generasi yang sama, bus horizontal tidak boleh melintasi kartu itu. Bagi bus visual, tetapi buat trunk ke orang tua tercatat untuk setiap bagian. Pasangan dari anak satu keluarga tidak dianggap penghalang. Tidak membuat data relasi baru.

- **Obstacle routing:** `levelCandidates(level,fromX,toX)` membangun pilihan x dari tepi kartu dan celah aman. `intermediateLanes()` memakai dynamic programming dengan penalti 85 unit per belokan untuk membatasi zigzag. Horizontal turn dilakukan di ruang antargenerasi; dalam satu generasi, path turun pada kolom bebas kartu.

- **Bus tracks:** `occupiedTracks` menempatkan bus berbeda pada offset `26 + 7 * track` di atas baris anak, track 0–4. Bus dengan rentang x tumpang tindih mengutamakan track yang berbeda.

- **Mask fallback:** `tree-safe-card-mask` tetap membatasi gambar di area kartu, tetapi jalur seharusnya aman secara geometri. Pembukaan/penutupan Focus mengulang routing menggunakan graph terlihat dan tidak menyimpan koordinat ke JSON.

- **Batas yang belum diselesaikan:** ketika posisi saudara berjauhan, trunk yang benar dapat tetap panjang. Pengurangan panjang secara menyeluruh memerlukan penataan ulang family cohorts lintas generasi; jangan menyatukan parent-set berbeda demi membuat garis kelihatan pendek.

**Regresi wajib:** dataset 124 Person / 10 generasi, keluarga Kakek dari mama, keluarga asal pasangan Jonathan, garis orang tua yang melewati generasi, anak dari satu orang tua, pasangan dari beberapa cabang, Focus/Overview, Expand/Collapse, serta viewport 390/768/1440 px. Ukur jumlah perubahan arah dan panjang maksimum bus; pastikan relasi JSON tetap identik.

## 15. Overview Lineage Spine V2

*Section ID: `dev-overview-lineage`; status di sumber: BERLAKU.*

**Masalah:** pada Seluruh Pohon, setiap baris sebelumnya dioptimalkan secara lokal. Posisi anak di dalam pasangan digunakan berulang sebagai acuan pada leluhur berikutnya, sehingga offset horizontal kecil menumpuk menjadi zigzag sepanjang beberapa generasi. Di Fokus masalah lebih kecil karena anggota yang ditampilkan lebih sedikit.

**Implementasi:** `makeLayout()` menjalankan `relaxFamilyCenters()`, kemudian `alignOverviewLineageSpines()` hanya ketika `treeMode === 'overview'` dan kedalaman minimal enam generasi. Tiga generasi termuda dibiarkan sebagai acuan. Posisi referensi pasangan/kelompok adalah *center of atomic group*, bukan koordinat salah satu anggota di dalam pasangan. Nilai target diwariskan dari keturunan ke leluhur tanpa menambahkan offset anggota berkali-kali.

>>

- **Ordering:** anggota dalam satu birth-family block mempertahankan susunan yang sudah ditetapkan termasuk birthOrder; urutan block berbeda boleh berubah untuk mengurangi zigzag.

- **Collision:** isotonic projection menjaga jarak antar kartu dan pasangan tetap sebagai atomic group. Tidak ada drag posisi individual secara manual.

- **Routing:** setelah posisi diperbarui, `positions` dinormalisasi dan `drawTree()` menghitung ulang garis; routing V3 tetap menangani rintangan.

- **Scope:** tidak berjalan pada Focus Person atau pohon pendek; tidak mengubah `data.parent`, `data.partner` maupun `data.sibling`. Graf kompleks masih bisa membutuhkan garis panjang ketika satu orang terhubung pada beberapa cabang.

- **Regression:** uji 10 generasi, contoh rantai kakek papa/mama, sibling birth order, no overlaps, 19 anggota, viewport HP/tablet/desktop, serta Expand/Collapse pada Focus.

---

## Catatan migrasi ke Angular

Dokumen ini mempertahankan terminologi dan keterangan teknis dari **main**. Implementasi Angular dan ketidaksesuaian dijelaskan terpisah di `docs/CANVAS-MAIN-ANGULAR-MIGRATION.md`. Jangan menganggap panduan main sebagai bukti bahwa semua fitur sudah tersedia di Angular; pengujian paritas diperlukan.
