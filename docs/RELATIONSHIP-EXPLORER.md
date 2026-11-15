# KnowYourFam — Person Overview Card adaptif

## Tujuan

Person Overview Card muncul ketika kartu Person dipilih. Komponen ini
menjawab siapa orangnya, hubungan terhadap akun login, **satu fakta keluarga
kontekstual** apabila ada, serta **maksimal dua fakta personal** yang terisi.
Tujuannya mengenali anggota dengan cepat tanpa menduplikasi halaman profil.
Popup **bukan** daftar Keluarga Terdekat atau pengatur Cabang Pohon.

## Susunan popup

- Identitas: foto, nama penuh, nama panggilan yang berbeda dari nama lengkap
  (jika ada), tahun lahir/wafat yang tercatat, serta badge hubungan terhadap
  akun login yang hanya tampil satu kali.
- Konteks keluarga: maksimal satu informasi yang menambah nilai. Contoh
  pasangan: jumlah anak bersama yang benar-benar tercatat; paman/bibi: jalur
  dari ayah/ibu; cucu: nama orang tua perantara. Hubungan langsung tanpa
  konteks baru tidak menampilkan bagian ini.
- Sekilas tentangnya: hingga dua dari domisili, pekerjaan, atau tempat lahir
  (urutan prioritas demikian). Tidak ada placeholder kosong.
- Tidak ada lagi label 'Hubungan dengan Anda' di body, pengulangan badge,
  diagram breadcrumb untuk relasi langsung, atau kotak informasi kosong.
- Footer: Lihat profil lengkap sebagai tombol utama.
  Di bawah: Fokus pohon (sekunder) dan Tambah hubungan (sekunder).
- Tablet/mobile: dialog tengah dengan overlay lebih ringan (tanpa blur),
  tinggi mengikuti konten sampai maksimum 82dvh. Konten saja yang
  dapat di-scroll ketika tinggi terbatas.
  Desktop: inspector di kanan kanvas.

## Identitas akun ↔ Person

- Authentication: Supabase Auth `auth.getUser()`.
- Explicit association: `public.person_account_links` with one-to-one unique
  `auth_user_id` ↔ `person_id`, RLS self-only and own-tree claim policy.
- Existing `persons_guard()` remains unchanged: direct updates of
  `persons.claimed_by` continue to be disallowed. The account link is stored
  in its own protected table, not forged into Person identity fields.
- `SupabaseFamilyTreeRepository.load()` reads the signed-in account's
  mapping and attaches `Person.claimedBy` in memory.
- `FamilyTreePage.viewerPerson` resolves by account ID only;
  **never** from `focusPersonId`, card selection, or substring matching names.
- `PersonIdentityService` supports explicit self-linking and unlinking for
  an owner-created Person under owner-only tree policy.
- At this stage, the existing demo tree owner is linked to
  `User / Diri Sendiri (G1)` in the database. Do not put a specific account
  UUID, password, or person database UUID into the source code.

## Automatic relation resolver

`frontend/src/app/application/relationship-kinship.ts` is pure TypeScript
using the currently authorised Person and Relationship graph. It supports
self, parent, child, partner, older/younger sibling, grandparents, uncle/aunt,
cousin, nephew/niece, in-laws, and ancestor/descendant generations.

Do not infer older/younger when order/birth date evidence is unavailable.
Exclude disputed edges. Unknown paths display 'Hubungan belum dapat ditentukan'.
Multiple conflicting nearest paths show 'Kerabat Anda' rather than guessing.
Result is a **family-data inference**, not independent fact verification.
No derived kinship labels are persisted in PostgreSQL.

## Validation

- `frontend/scripts/relationship-kinship.test.mjs` tests resolver scenarios.
- `frontend/src/app/application/person-overview.ts` derives one contextual
  insight and two personal facts from the authorised graph. It never
  persists calculated data.
- `frontend/scripts/person-overview.test.mjs` tests data selection,
  complexity adaptation, missing data and disputed relations.
- `frontend/scripts/relationship-explorer.test.mjs` checks popup and identity linkage.
- Angular production build checks TypeScript/template.
- Browser geometry test ensures desktop dock and centered tablet/mobile dialogs.
