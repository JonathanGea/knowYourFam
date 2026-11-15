import type { FamilyTree, Person, Gender, FamilyRelationship, RelationKind } from '../../domain/family-tree.model';

/** Tutorial courses are kept in source order and wording from main/index.html
 * blob 1d52703f6572639c4b64b1e476fe7a0eba201a72. */
export interface TutorialStep {
  readonly title: string;
  readonly hint: string;
  readonly type: 'card' | 'profile' | 'return' | 'created' | 'edited-order' |
    'edited-notes' | 'branch' | 'mode' | 'zoom' | 'pan' | 'fit' | 'inspect' |
    'simulate-export' | 'simulate-import';
  readonly target?: string;
  readonly relation?: 'parent' | 'child' | 'sibling' | 'partner';
  readonly cta?: string;
  readonly key?: string;
  readonly open?: boolean;
  readonly mode?: 'overview' | 'focus';
}
export interface TutorialCourse {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly description: string;
  readonly steps: readonly TutorialStep[];
}
export const TUTORIAL_COURSES=[
 {id:'kartu',title:'Mengenal kartu',icon:'♙',description:'Ketuk kartu, buka profil, lalu kembali ke pohon.',steps:[
  {title:'Ketuk kartu Saya',hint:'Ketuk kartu "Saya (latihan)" di pohon. Menu aksi cepat akan muncul.',type:'card',target:'edu-self'},
  {title:'Buka profil anggota',hint:'Pada menu aksi cepat, pilih Profil lengkap atau Lihat profil.',type:'profile',target:'edu-self'},
  {title:'Kembali ke kanvas',hint:'Tekan tombol di bawah untuk kembali ke pohon demo, atau gunakan tombol Kembali pada profil.',type:'return',cta:'Kembali ke Pohon'}]},
 {id:'hubungan',title:'Membuat hubungan',icon:'♡',description:'Tambahkan orang tua, pasangan, lalu anak melalui form asli.',steps:[
  {title:'Tambahkan orang tua',hint:'Buka form dan buat orang tua untuk "Saya (latihan)". Isi nama lalu simpan.',type:'created',relation:'parent',cta:'Buka form orang tua'},
  {title:'Tambahkan pasangan',hint:'Buka form pasangan. Nama fiktif bebas, dan tidak akan masuk ke data keluargamu.',type:'created',relation:'partner',cta:'Buka form pasangan'},
  {title:'Tambahkan anak',hint:'Buka form anak, pilih kedua orang tua bila sesuai, lalu simpan.',type:'created',relation:'child',cta:'Buka form anak'}]},
 {id:'saudara',title:'Mengatur saudara',icon:'↔',description:'Beri urutan lahir dan buat satu hubungan saudara.',steps:[
  {title:'Atur urutan lahir kakak',hint:'Buka form Edit Kakak, lalu isi Urutan lahir = 1 dan simpan.',type:'edited-order',cta:'Edit Kakak'},
  {title:'Tambahkan satu saudara',hint:'Buka form untuk menambahkan saudara "Saya (latihan)". Isi nama dan simpan.',type:'created',relation:'sibling',cta:'Tambah saudara'},
  {title:'Lihat hasilnya',hint:'Urutan kakak di kiri tetap berlaku saat Expand/Collapse. Tekan Lihat Hasil untuk menyelesaikan latihan.',type:'inspect',cta:'Lihat hasil'}]},
 {id:'cabang',title:'Expand & Collapse',icon:'↕',description:'Latih menutup dan membuka cabang default Fokus.',steps:[
  {title:'Tutup cabang orang tua',hint:'Tekan ↑ yang sedang terbuka pada kartu "Saya (latihan)" untuk Collapse.',type:'branch',key:'up:edu-self',open:false,target:'edu-self'},
  {title:'Buka orang tua lagi',hint:'Tekan ↑ sekali lagi untuk Expand satu tingkat.',type:'branch',key:'up:edu-self',open:true,target:'edu-self'},
  {title:'Tutup cabang saudara',hint:'Tekan ↔ pada kartu "Saya (latihan)" untuk menutup saudara.',type:'branch',key:'side:edu-self',open:false,target:'edu-self'},
  {title:'Buka saudara lagi',hint:'Tekan ↔ untuk menampilkan kembali saudara.',type:'branch',key:'side:edu-self',open:true,target:'edu-self'},
  {title:'Tutup anak pasangan',hint:'Tekan ↓ pada kelompok anak "Saya (latihan)" dan "Pasangan (latihan)".',type:'branch',key:'pair:edu-self|edu-spouse',open:false,target:'edu-self'},
  {title:'Buka anak pasangan lagi',hint:'Tekan ↓ untuk membuka kembali anak yang sama.',type:'branch',key:'pair:edu-self|edu-spouse',open:true,target:'edu-self'}]},
 {id:'kanvas',title:'Navigasi kanvas',icon:'⤢',description:'Jelajahi keluarga, Peta Keluarga, zoom, pan, dan Fit.',steps:[
  {title:'Buka Peta Keluarga',hint:'Tekan "Peta keluarga" di toolbar kanvas.',type:'mode',mode:'overview'},
  {title:'Kembali menjelajahi pohon',hint:'Tekan "Jelajahi pohon" untuk kembali ke keluarga terdekat.',type:'mode',mode:'focus'},
  {title:'Perbesar pohon',hint:'Gunakan zoom +, scroll mouse, atau cubit dua jari pada layar sentuh.',type:'zoom'},
  {title:'Geser kanvas',hint:'Geser satu jari atau drag ruang kosong di kanvas.',type:'pan'},
  {title:'Temukan seluruh anggota',hint:'Tekan tombol ⛶ Fit All di kanan atas kanvas.',type:'fit'}]},
 {id:'data',title:'Mengelola data',icon:'↓',description:'Edit profil dan pahami simulasi ekspor/impor tanpa mengganti file.',steps:[
  {title:'Edit catatan orang',hint:'Buka form Edit Saya, isi Catatan dengan teks apa saja, lalu simpan.',type:'edited-notes',cta:'Edit Saya'},
  {title:'Simulasi ekspor',hint:'Lihat bagaimana data berubah menjadi berkas JSON. Ini simulasi: tidak ada file pribadi yang diunduh.',type:'simulate-export',cta:'Lihat simulasi Ekspor'},
  {title:'Simulasi impor',hint:'Pelajari bagaimana impor akan mengganti pohon aktif. Simulasi ini tidak memilih file atau mengganti data.',type:'simulate-import',cta:'Lihat simulasi Impor'}]}
] as const satisfies readonly TutorialCourse[];
export type TutorialModule = typeof TUTORIAL_COURSES[number]['id'];
export function getTutorialCourse(value:string): TutorialCourse | undefined {
  return TUTORIAL_COURSES.find(course => course.id===value);
}

/** main.teachingSeed() mapped to Angular's graph schema.
 * Source includes a dangling edu-grandpa/edu-grandma pair, intentionally
 * excluded because neither Person exists in the main teaching seed. */
export function createTutorialTree(module: string): FamilyTree {
  const person=(id:string,name:string,gender:Gender,birthDate:string,birthOrder?:number):Person=>({
    id,name,gender,birthDate, ...(birthOrder?{birthOrder}:{}), claimed:id==='edu-self',
    notes:'Data latihan saja'
  });
  const self=person('edu-self','Saya (latihan)','male','1999-06-11',2);
  const dad=person('edu-dad','Ayah (latihan)','male','1970-03-12');
  const mom=person('edu-mom','Ibu (latihan)','female','1972-04-04');
  const older=person('edu-older','Kakak (latihan)','female','1996-01-14');
  const younger=person('edu-younger','Adik (latihan)','male','2002-03-07',3);
  const spouse=person('edu-spouse','Pasangan (latihan)','female','2000-12-08');
  const child=person('edu-child','Anak (latihan)','female','2021-03-15');
  const parentPairs=[...['edu-self','edu-older','edu-younger'].flatMap(c=>[
    ['edu-dad',c],['edu-mom',c]
  ]),['edu-self','edu-child'],['edu-spouse','edu-child']];
  const relationships:FamilyRelationship[]=[];
  const link=(kind:RelationKind,fromId:string,toId:string)=>{
    relationships.push({id:'edu-rel-'+(relationships.length+1),kind,fromId,toId,status:'confirmed'});
  };
  if(module!=='hubungan'){
    const parent=module==='saudara'?parentPairs.filter(p=>p[0]==='edu-dad'||p[0]==='edu-mom'):parentPairs;
    parent.forEach(([from,to])=>link('parent',from,to));
    link('partner','edu-dad','edu-mom');
    if(module!=='saudara')link('partner','edu-self','edu-spouse');
  }
  return {
    id:'edu-family',name:'LATIHAN · Tidak mengubah pohon asli',
    people:module==='hubungan'?[self]:
      module==='saudara'?[dad,mom,self,older,younger]:
      [dad,mom,self,older,younger,spouse,child],
    relationships
  };
}
