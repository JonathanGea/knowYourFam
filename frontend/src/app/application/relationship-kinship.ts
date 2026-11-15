import type { FamilyRelationship, Person } from '../domain/family-tree.model';

export type KinshipStatus = 'unlinked' | 'self' | 'known' | 'unknown' | 'ambiguous';
export interface KinshipPreview {
  readonly status: KinshipStatus;
  /** Stable semantic category, independent from localized display labels. */
  readonly kind?: string;
  readonly label: string;
  readonly explanation: string;
  /** Human-readable route, never a claim of independently verified ancestry. */
  readonly route: readonly string[];
}

type Candidate = KinshipPreview & { readonly distance: number; readonly category: string };

const gendered = (person: Person, male: string, female: string, fallback: string): string =>
  person.gender === 'male' ? male : person.gender === 'female' ? female : fallback;

function birthDifference(viewer: Person, target: Person): 'older' | 'younger' | null {
  const va=viewer.birthOrder, ta=target.birthOrder;
  if(Number.isInteger(va) && Number.isInteger(ta) && va!>0 && ta!>0 && va!==ta) {
    // Conflicting dates are not enough evidence to decide older/younger.
    if(viewer.birthDate && target.birthDate &&
      Math.sign(ta!-va!) !== Math.sign(target.birthDate.localeCompare(viewer.birthDate)))return null;
    return ta!<va! ? 'older' : 'younger';
  }
  if(viewer.birthDate && target.birthDate && viewer.birthDate !== target.birthDate)
    return target.birthDate<viewer.birthDate ? 'older' : 'younger';
  return null;
}

/**
 * Conservative, pure relationship resolver. It uses only currently visible-to-
 * the-user graph facts and does not infer kinship through marriage as blood.
 * Direct relatives outrank extended relationships. Ambiguous paths remain
 * ambiguous; unresolved user identity must never be guessed from tree focus.
 */
export function resolveKinship(
  people: readonly Person[],
  edges: readonly FamilyRelationship[],
  viewerId: string | null,
  targetId: string | null
): KinshipPreview {
  const map=new Map(people.filter(p=>!p.deletedAt).map(p=>[p.id,p]));
  const unknown=(label='Hubungan belum dapat ditentukan',explanation='Jalur hubungan belum cukup jelas dalam silsilah.') =>
    ({status:'unknown' as const,label,explanation,route:[]});
  if(!targetId || !map.has(targetId))return unknown();
  if(!viewerId || !map.has(viewerId))return {
    status:'unlinked', label:'Hubungan dengan Anda belum tersedia',
    explanation:'Tautkan akun Anda ke Person yang benar untuk menghitung panggilan keluarga secara otomatis.',
    route:[]
  };
  const target=map.get(targetId)!, viewer=map.get(viewerId)!;
  if(viewerId===targetId)return {
    status:'self',label:'Ini Anda',
    explanation:'Profil ini terhubung dengan akun Anda.',route:['Anda']
  };

  const rows=edges.filter(e=>!e.deletedAt && e.status!=='disputed' &&
    map.has(e.fromId)&&map.has(e.toId));
  const parents=(id:string)=>rows.filter(e=>e.kind==='parent'&&e.toId===id).map(e=>e.fromId);
  const children=(id:string)=>rows.filter(e=>e.kind==='parent'&&e.fromId===id).map(e=>e.toId);
  const partners=(id:string)=>rows.filter(e=>e.kind==='partner'&&(e.fromId===id||e.toId===id))
    .map(e=>e.fromId===id?e.toId:e.fromId);
  const siblings=(id:string)=>{
    const found=new Set(rows.filter(e=>e.kind==='sibling'&&(e.fromId===id||e.toId===id))
      .map(e=>e.fromId===id?e.toId:e.fromId));
    parents(id).forEach(parent=>children(parent).forEach(child=>{
      if(child!==id)found.add(child);
    }));
    found.delete(id);
    return [...found];
  };

  const candidates:Candidate[]=[];
  function add(distance:number,category:string,label:string,explanation:string,route:string[]) {
    candidates.push({status:'known',distance,category,label,explanation,route});
  }
  const parentRole=(p:Person)=>gendered(p,'Ayah Anda','Ibu Anda','orang tua Anda');
  const childRole=(p:Person)=>gendered(p,'Putra Anda','Putri Anda','Anak Anda');

  if(parents(viewerId).includes(targetId))
    add(1,'parent',gendered(target,'Ayah Anda','Ibu Anda','Orang tua Anda'),
      'Tercatat sebagai orang tua Anda.',['Anda','Orang tua']);
  if(children(viewerId).includes(targetId))
    add(1,'child',childRole(target),'Tercatat sebagai anak Anda.',['Anda','Anak']);
  if(partners(viewerId).includes(targetId))
    add(1,'partner','Pasangan Anda','Tercatat sebagai pasangan Anda.',['Anda','Pasangan']);
  if(siblings(viewerId).includes(targetId)) {
    const order=birthDifference(viewer,target);
    add(1,'sibling',order==='older'?'Kakak Anda':order==='younger'?'Adik Anda':'Saudara Anda',
      order==='older'?'Saudara yang lebih tua menurut data kelahiran.':
      order==='younger'?'Saudara yang lebih muda menurut data kelahiran.':
      'Hubungan saudara tercatat; urutan kelahiran belum dapat dipastikan.',
      ['Anda','Saudara']);
  }

  // Parents of parent / children of child. Traverse without assuming a family
  // member has only two parents or that the user always views three generations.
  function ancestors(start:string,walk:(id:string)=>string[],max=12) {
    const results:{id:string;path:string[]}[]=[];
    let frontier=[{id:start,path:[start]}];
    for(let d=0;d<max&&frontier.length;d++){
      const next:typeof frontier=[];
      for(const item of frontier)for(const id of walk(item.id)){
        if(item.path.includes(id))continue;
        const p={id,path:[...item.path,id]};
        results.push(p);next.push(p);
      }
      frontier=next;
    }
    return results;
  }
  const upward=ancestors(viewerId,parents);
  const downward=ancestors(viewerId,children);
  const ups=upward.filter(item=>item.id===targetId).sort((a,b)=>a.path.length-b.path.length);
  if(ups.length && ups[0].path.length>2) {
    const depth=ups[0].path.length-1;
    const label=depth===2?gendered(target,'Kakek Anda','Nenek Anda','Kakek/Nenek Anda'):
      depth===3?gendered(target,'Kakek buyut Anda','Nenek buyut Anda','Leluhur buyut Anda'):
      'Leluhur generasi ke-'+depth+' Anda';
    add(depth,'ancestor',label,'Leluhur pada tingkat ke-'+depth+' dalam silsilah.',
      ['Anda',...ups[0].path.slice(1).map((_,i)=>i===depth-1?'Leluhur':'Orang tua')]);
  }
  const downs=downward.filter(item=>item.id===targetId).sort((a,b)=>a.path.length-b.path.length);
  if(downs.length && downs[0].path.length>2) {
    const depth=downs[0].path.length-1;
    const label=depth===2?'Cucu Anda':depth===3?'Cicit Anda':
      'Keturunan generasi ke-'+depth+' Anda';
    add(depth,'descendant',label,'Keturunan pada tingkat ke-'+depth+' dalam silsilah.',
      ['Anda',...downs[0].path.slice(1).map((_,i)=>i===depth-1?'Keturunan':'Anak')]);
  }

  for(const parentId of parents(viewerId)) {
    const parent=map.get(parentId)!;
    const relatives=siblings(parentId);
    if(relatives.includes(targetId)) {
      const label=gendered(target,'Paman Anda','Bibi Anda','Saudara orang tua Anda');
      const source=gendered(target,'Saudara laki-laki','Saudara perempuan','Saudara');
      add(2,'aunt-uncle',label,source+' dari '+parentRole(parent)+'.',
        ['Anda',parentRole(parent).replace(' Anda',''),label.replace(' Anda','')]);
    }
    for(const uncleId of relatives){
      if(children(uncleId).includes(targetId)){
        const uncle=map.get(uncleId)!;
        const description='Anak dari '+gendered(uncle,'saudara laki-laki','saudara perempuan','saudara')+
          ' '+parentRole(parent)+'.';
        add(3,'cousin','Sepupu Anda',description,['Anda',parentRole(parent).replace(' Anda',''),'Saudara orang tua','Sepupu']);
      }
    }
  }
  for(const siblingId of siblings(viewerId)){
    if(children(siblingId).includes(targetId))
      add(2,'nephew','Keponakan Anda','Anak dari saudara Anda.',
        ['Anda','Saudara','Keponakan']);
    if(partners(siblingId).includes(targetId))
      add(2,'sibling-in-law','Ipar Anda','Pasangan dari saudara Anda.',
        ['Anda','Saudara','Ipar']);
  }
  for(const partnerId of partners(viewerId)){
    if(parents(partnerId).includes(targetId))
      add(2,'parent-in-law',gendered(target,'Ayah mertua Anda','Ibu mertua Anda','Mertua Anda'),
        'Orang tua dari pasangan Anda.',['Anda','Pasangan','Mertua']);
    if(siblings(partnerId).includes(targetId))
      add(2,'sibling-in-law','Ipar Anda','Saudara dari pasangan Anda.',
        ['Anda','Pasangan','Ipar']);
  }

  if(!candidates.length)return unknown();
  candidates.sort((a,b)=>a.distance-b.distance);
  const nearest=candidates.filter(c=>c.distance===candidates[0].distance);
  const labels=new Set(nearest.map(c=>c.label));
  if(labels.size>1)return {
    status:'ambiguous',label:'Kerabat Anda',
    explanation:'Ditemukan lebih dari satu jalur hubungan. Panggilan spesifik belum dapat dipastikan.',
    route:[]
  };
  const selected=nearest[0];
  return {status:selected.status,kind:selected.category,label:selected.label,explanation:selected.explanation,route:selected.route};
}
