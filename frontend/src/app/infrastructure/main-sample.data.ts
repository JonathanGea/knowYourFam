import type { FamilyTree } from '../domain/family-tree.model';

/** The 31 fictional People and typed relationships from main/index.html sample
 * captured at Git blob 1d52703f6572639c4b64b1e476fe7a0eba201a72. No private user family data is imported.
 * Legacy "self" is mapped to demo claimed only as a visual marker, not Auth.
 * The source sample did not store confirmation state; confirmed here means
 * "accepted in the legacy demo graph", NOT independent verification.
 */
export const MAIN_SAMPLE_TREE: FamilyTree = {
  "id": "legacy-main-pratama-demo",
  "name": "Keluarga Pratama",
  "people": [
    {
      "id": "p1",
      "name": "Hadi Pratama",
      "gender": "male",
      "birthDate": "1946-02-09",
      "deathDate": "2022-08-04",
      "notes": "Kakek dari pihak Budi.",
      "claimed": false
    },
    {
      "id": "p2",
      "name": "Ratna Pratama",
      "gender": "female",
      "birthDate": "1949-11-20",
      "notes": "Nenek dari pihak Budi.",
      "claimed": false
    },
    {
      "id": "p10",
      "name": "Hasan Wulandari",
      "gender": "male",
      "birthDate": "1947-04-06",
      "notes": "Kakek dari pihak Sari.",
      "claimed": false
    },
    {
      "id": "p11",
      "name": "Lina Wulandari",
      "gender": "female",
      "birthDate": "1950-08-16",
      "notes": "Nenek dari pihak Sari.",
      "claimed": false
    },
    {
      "id": "p3",
      "name": "Budi Pratama",
      "gender": "male",
      "birthDate": "1973-05-18",
      "notes": "Anak Hadi dan Ratna. Menikah dengan Sari.",
      "claimed": false
    },
    {
      "id": "p4",
      "name": "Mira Pratama",
      "gender": "female",
      "birthDate": "1977-03-07",
      "notes": "Saudara Budi.",
      "claimed": false
    },
    {
      "id": "p6",
      "name": "Raka Pratama",
      "gender": "male",
      "birthDate": "1980-11-11",
      "notes": "Saudara Budi dan Mira.",
      "claimed": false
    },
    {
      "id": "p5",
      "name": "Sari Wulandari",
      "gender": "female",
      "birthDate": "1975-09-29",
      "notes": "Menikah dengan Budi.",
      "claimed": false
    },
    {
      "id": "p12",
      "name": "Ayu Wulandari",
      "gender": "female",
      "birthDate": "1978-02-05",
      "notes": "Saudara Sari.",
      "claimed": false
    },
    {
      "id": "p13",
      "name": "Farhan Wulandari",
      "gender": "male",
      "birthDate": "1982-08-23",
      "notes": "Saudara Sari.",
      "claimed": false
    },
    {
      "id": "p14",
      "name": "Dimas Wijaya",
      "gender": "male",
      "birthDate": "1976-02-13",
      "notes": "Suami Mira.",
      "claimed": false
    },
    {
      "id": "p15",
      "name": "Ratih Santoso",
      "gender": "female",
      "birthDate": "1981-07-10",
      "notes": "Istri Raka.",
      "claimed": false
    },
    {
      "id": "p16",
      "name": "Damar Suherman",
      "gender": "male",
      "birthDate": "1976-03-12",
      "notes": "Suami Ayu.",
      "claimed": false
    },
    {
      "id": "p17",
      "name": "Novi Lestari",
      "gender": "female",
      "birthDate": "1984-05-24",
      "notes": "Istri Farhan.",
      "claimed": false
    },
    {
      "id": "p7",
      "name": "Dina Pratama",
      "gender": "female",
      "birthDate": "2001-01-12",
      "notes": "Putri Budi dan Sari. Ini profil contoh yang menjadi fokus awal.",
      "claimed": true
    },
    {
      "id": "p8",
      "name": "Arga Pratama",
      "gender": "male",
      "birthDate": "2004-07-03",
      "notes": "Adik Dina.",
      "claimed": false
    },
    {
      "id": "p18",
      "name": "Nala Wijaya",
      "gender": "female",
      "birthDate": "2002-01-15",
      "notes": "Anak Mira dan Dimas.",
      "claimed": false
    },
    {
      "id": "p19",
      "name": "Gita Wijaya",
      "gender": "female",
      "birthDate": "2006-06-13",
      "notes": "Anak Mira dan Dimas.",
      "claimed": false
    },
    {
      "id": "p20",
      "name": "Rafi Pratama",
      "gender": "male",
      "birthDate": "2008-09-12",
      "notes": "Anak Raka dan Ratih.",
      "claimed": false
    },
    {
      "id": "p21",
      "name": "Citra Pratama",
      "gender": "female",
      "birthDate": "2011-12-08",
      "notes": "Anak Raka dan Ratih.",
      "claimed": false
    },
    {
      "id": "p22",
      "name": "Aksa Suherman",
      "gender": "male",
      "birthDate": "2001-08-11",
      "notes": "Anak Ayu dan Damar.",
      "claimed": false
    },
    {
      "id": "p23",
      "name": "Fina Suherman",
      "gender": "female",
      "birthDate": "2005-02-07",
      "notes": "Anak Ayu dan Damar.",
      "claimed": false
    },
    {
      "id": "p24",
      "name": "Rani Wulandari",
      "gender": "female",
      "birthDate": "2009-10-19",
      "notes": "Anak Farhan dan Novi.",
      "claimed": false
    },
    {
      "id": "p25",
      "name": "Galih Wulandari",
      "gender": "male",
      "birthDate": "2012-05-03",
      "notes": "Anak Farhan dan Novi.",
      "claimed": false
    },
    {
      "id": "p27",
      "name": "Fajar Saputra",
      "gender": "male",
      "birthDate": "2000-06-16",
      "notes": "Pasangan Dina. Keluarga asal Fajar dapat dibuka sebagai cabang tambahan.",
      "claimed": false
    },
    {
      "id": "p28",
      "name": "Agus Saputra",
      "gender": "male",
      "birthDate": "1972-04-02",
      "notes": "Ayah Fajar.",
      "claimed": false
    },
    {
      "id": "p29",
      "name": "Tina Saputra",
      "gender": "female",
      "birthDate": "1974-10-10",
      "notes": "Ibu Fajar.",
      "claimed": false
    },
    {
      "id": "p30",
      "name": "Putri Saputra",
      "gender": "female",
      "birthDate": "2003-07-21",
      "notes": "Saudara Fajar.",
      "claimed": false
    },
    {
      "id": "p26",
      "name": "Kevin Saputra",
      "gender": "male",
      "birthDate": "2024-05-18",
      "notes": "Anak Dina dan Fajar.",
      "claimed": false
    },
    {
      "id": "p31",
      "name": "Yusuf Saputra",
      "gender": "male",
      "birthDate": "1948-03-20",
      "notes": "Kakek dari pihak Fajar.",
      "claimed": false
    },
    {
      "id": "p32",
      "name": "Rina Saputra",
      "gender": "female",
      "birthDate": "1951-09-04",
      "notes": "Nenek dari pihak Fajar.",
      "claimed": false
    }
  ],
  "relationships": [
    {
      "id": "parent-1",
      "kind": "parent",
      "fromId": "p1",
      "toId": "p3",
      "status": "confirmed"
    },
    {
      "id": "parent-2",
      "kind": "parent",
      "fromId": "p2",
      "toId": "p3",
      "status": "confirmed"
    },
    {
      "id": "parent-3",
      "kind": "parent",
      "fromId": "p1",
      "toId": "p4",
      "status": "confirmed"
    },
    {
      "id": "parent-4",
      "kind": "parent",
      "fromId": "p2",
      "toId": "p4",
      "status": "confirmed"
    },
    {
      "id": "parent-5",
      "kind": "parent",
      "fromId": "p1",
      "toId": "p6",
      "status": "confirmed"
    },
    {
      "id": "parent-6",
      "kind": "parent",
      "fromId": "p2",
      "toId": "p6",
      "status": "confirmed"
    },
    {
      "id": "parent-7",
      "kind": "parent",
      "fromId": "p10",
      "toId": "p5",
      "status": "confirmed"
    },
    {
      "id": "parent-8",
      "kind": "parent",
      "fromId": "p11",
      "toId": "p5",
      "status": "confirmed"
    },
    {
      "id": "parent-9",
      "kind": "parent",
      "fromId": "p10",
      "toId": "p12",
      "status": "confirmed"
    },
    {
      "id": "parent-10",
      "kind": "parent",
      "fromId": "p11",
      "toId": "p12",
      "status": "confirmed"
    },
    {
      "id": "parent-11",
      "kind": "parent",
      "fromId": "p10",
      "toId": "p13",
      "status": "confirmed"
    },
    {
      "id": "parent-12",
      "kind": "parent",
      "fromId": "p11",
      "toId": "p13",
      "status": "confirmed"
    },
    {
      "id": "parent-13",
      "kind": "parent",
      "fromId": "p3",
      "toId": "p7",
      "status": "confirmed"
    },
    {
      "id": "parent-14",
      "kind": "parent",
      "fromId": "p5",
      "toId": "p7",
      "status": "confirmed"
    },
    {
      "id": "parent-15",
      "kind": "parent",
      "fromId": "p3",
      "toId": "p8",
      "status": "confirmed"
    },
    {
      "id": "parent-16",
      "kind": "parent",
      "fromId": "p5",
      "toId": "p8",
      "status": "confirmed"
    },
    {
      "id": "parent-17",
      "kind": "parent",
      "fromId": "p4",
      "toId": "p18",
      "status": "confirmed"
    },
    {
      "id": "parent-18",
      "kind": "parent",
      "fromId": "p14",
      "toId": "p18",
      "status": "confirmed"
    },
    {
      "id": "parent-19",
      "kind": "parent",
      "fromId": "p4",
      "toId": "p19",
      "status": "confirmed"
    },
    {
      "id": "parent-20",
      "kind": "parent",
      "fromId": "p14",
      "toId": "p19",
      "status": "confirmed"
    },
    {
      "id": "parent-21",
      "kind": "parent",
      "fromId": "p6",
      "toId": "p20",
      "status": "confirmed"
    },
    {
      "id": "parent-22",
      "kind": "parent",
      "fromId": "p15",
      "toId": "p20",
      "status": "confirmed"
    },
    {
      "id": "parent-23",
      "kind": "parent",
      "fromId": "p6",
      "toId": "p21",
      "status": "confirmed"
    },
    {
      "id": "parent-24",
      "kind": "parent",
      "fromId": "p15",
      "toId": "p21",
      "status": "confirmed"
    },
    {
      "id": "parent-25",
      "kind": "parent",
      "fromId": "p12",
      "toId": "p22",
      "status": "confirmed"
    },
    {
      "id": "parent-26",
      "kind": "parent",
      "fromId": "p16",
      "toId": "p22",
      "status": "confirmed"
    },
    {
      "id": "parent-27",
      "kind": "parent",
      "fromId": "p12",
      "toId": "p23",
      "status": "confirmed"
    },
    {
      "id": "parent-28",
      "kind": "parent",
      "fromId": "p16",
      "toId": "p23",
      "status": "confirmed"
    },
    {
      "id": "parent-29",
      "kind": "parent",
      "fromId": "p13",
      "toId": "p24",
      "status": "confirmed"
    },
    {
      "id": "parent-30",
      "kind": "parent",
      "fromId": "p17",
      "toId": "p24",
      "status": "confirmed"
    },
    {
      "id": "parent-31",
      "kind": "parent",
      "fromId": "p13",
      "toId": "p25",
      "status": "confirmed"
    },
    {
      "id": "parent-32",
      "kind": "parent",
      "fromId": "p17",
      "toId": "p25",
      "status": "confirmed"
    },
    {
      "id": "parent-33",
      "kind": "parent",
      "fromId": "p31",
      "toId": "p28",
      "status": "confirmed"
    },
    {
      "id": "parent-34",
      "kind": "parent",
      "fromId": "p32",
      "toId": "p28",
      "status": "confirmed"
    },
    {
      "id": "parent-35",
      "kind": "parent",
      "fromId": "p28",
      "toId": "p27",
      "status": "confirmed"
    },
    {
      "id": "parent-36",
      "kind": "parent",
      "fromId": "p29",
      "toId": "p27",
      "status": "confirmed"
    },
    {
      "id": "parent-37",
      "kind": "parent",
      "fromId": "p28",
      "toId": "p30",
      "status": "confirmed"
    },
    {
      "id": "parent-38",
      "kind": "parent",
      "fromId": "p29",
      "toId": "p30",
      "status": "confirmed"
    },
    {
      "id": "parent-39",
      "kind": "parent",
      "fromId": "p7",
      "toId": "p26",
      "status": "confirmed"
    },
    {
      "id": "parent-40",
      "kind": "parent",
      "fromId": "p27",
      "toId": "p26",
      "status": "confirmed"
    },
    {
      "id": "partner-1",
      "kind": "partner",
      "fromId": "p1",
      "toId": "p2",
      "status": "confirmed"
    },
    {
      "id": "partner-2",
      "kind": "partner",
      "fromId": "p10",
      "toId": "p11",
      "status": "confirmed"
    },
    {
      "id": "partner-3",
      "kind": "partner",
      "fromId": "p3",
      "toId": "p5",
      "status": "confirmed"
    },
    {
      "id": "partner-4",
      "kind": "partner",
      "fromId": "p4",
      "toId": "p14",
      "status": "confirmed"
    },
    {
      "id": "partner-5",
      "kind": "partner",
      "fromId": "p6",
      "toId": "p15",
      "status": "confirmed"
    },
    {
      "id": "partner-6",
      "kind": "partner",
      "fromId": "p12",
      "toId": "p16",
      "status": "confirmed"
    },
    {
      "id": "partner-7",
      "kind": "partner",
      "fromId": "p13",
      "toId": "p17",
      "status": "confirmed"
    },
    {
      "id": "partner-8",
      "kind": "partner",
      "fromId": "p7",
      "toId": "p27",
      "status": "confirmed"
    },
    {
      "id": "partner-9",
      "kind": "partner",
      "fromId": "p28",
      "toId": "p29",
      "status": "confirmed"
    },
    {
      "id": "partner-10",
      "kind": "partner",
      "fromId": "p31",
      "toId": "p32",
      "status": "confirmed"
    }
  ]
};
