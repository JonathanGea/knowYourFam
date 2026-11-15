# KnowYourFam — Person Preview & hubungan terhadap pengguna login

## Tujuan

Person Preview muncul ketika kartu Person diklik, dengan tiga informasi inti:
foto/nama/tahun lahir-wafat, panggilan terhadap akun yang sedang login,
dan alasan/jalur hubungan yang benar-benar tercatat. Popup ini **bukan**
daftar Keluarga Terdekat, bukan kontrol Cabang Pohon, dan bukan halaman profil.

## Susunan popup

- Header: foto, nama penuh, tahun lahir/wafat, badge 'Paman Anda'/'Ini Anda'.
- Body: hubungan dengan Anda, alasan relasi, jalur singkat bila tersedia.
- Footer: Lihat profil lengkap sebagai tombol utama.
  Di bawah: Fokus pohon (sekunder) dan Tambah hubungan (sekunder).
- Tablet/mobile: dialog tengah dengan overlay, scroll internal, tinggi maksimum 82dvh.
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
- `frontend/scripts/relationship-explorer.test.mjs` checks popup and identity linkage.
- Angular production build checks TypeScript/template.
- Browser geometry test ensures desktop dock and centered tablet/mobile dialogs.
