import type { FamilyRelationship, FamilyTree, Gender, Person, RelationKind, RelationStatus } from '../domain/family-tree.model';

/**
 * Offline/demo-only parser: accepts legacy main/index.html JSON and the
 * Angular FamilyTree JSON export. NEVER use as an authorization boundary.
 * Validates tree scope and graph integrity before replacing local data.
 */
export function parseDemoTreeJson(text: string): FamilyTree {
  if (text.length > 3_100_000) throw new Error('File terlalu besar. Maksimal 3 MB.');
  let raw: unknown;
  try { raw = JSON.parse(text); }
  catch { throw new Error('File bukan JSON yang valid.'); }
  if (!isRecord(raw) || !Array.isArray(raw['people']) || raw['people'].length > 10000) {
    throw new Error('JSON harus memuat daftar people, maksimal 10.000 orang.');
  }
  const people = raw['people'].map((value, index) => parsePerson(value, index));
  const ids = new Set(people.map(p => p.id));
  if (ids.size !== people.length) throw new Error('Terdapat Person ID duplikat.');
  const legacy = Array.isArray(raw['parent']) || Array.isArray(raw['partner']) || Array.isArray(raw['sibling']);
  const relationships: FamilyRelationship[] = [];
  if (legacy) {
    for (const [kind, field] of [['parent','parent'],['partner','partner'],['sibling','sibling']] as const) {
      const entries=raw[field] ?? [];
      if (!Array.isArray(entries) || entries.length > 30000) throw new Error('Daftar relasi tidak valid.');
      for (let i=0;i<entries.length;i++) {
        const pair=entries[i];
        if (!Array.isArray(pair) || pair.length!==2 || pair.some(x=>typeof x!=='string'))
          throw new Error('Relasi '+kind+' tidak valid di baris '+(i+1));
        relationships.push({id:kind+'-'+(i+1),kind,fromId:pair[0],toId:pair[1],status:'confirmed'});
      }
    }
  } else {
    if (!Array.isArray(raw['relationships']) || raw['relationships'].length > 30000)
      throw new Error('Daftar relationships tidak valid.');
    for (let i=0;i<raw['relationships'].length;i++) {
      const item=raw['relationships'][i];
      if (!isRecord(item)) throw new Error('Relasi pada baris '+(i+1)+' tidak valid.');
      const kind=item['kind'],status=item['status'];
      if (!['parent','partner','sibling'].includes(String(kind)))
        throw new Error('Tipe relasi tidak dikenal.');
      const relationKind=kind as RelationKind;
      relationships.push({
        id:stringField(item,'id') || relationKind+'-'+(i+1),
        kind:relationKind,
        fromId:stringField(item,'fromId'),
        toId:stringField(item,'toId'),
        status:['unconfirmed','confirmed','disputed'].includes(String(status))
          ? status as RelationStatus : 'unconfirmed'
      });
    }
  }
  if (relationships.length > 30000) throw new Error('Terlalu banyak relasi.');
  const seen = new Set<string>();
  const parentByChild = new Map<string,string[]>();
  for (const r of relationships) {
    if (!ids.has(r.fromId) || !ids.has(r.toId) || r.fromId === r.toId)
      throw new Error('Relasi mengacu pada Person yang tidak valid.');
    const key=r.kind+':'+(r.kind==='parent' ? r.fromId+'>'+r.toId : [r.fromId,r.toId].sort().join('|'));
    if (seen.has(key)) throw new Error('Terdapat relasi duplikat: '+key);
    seen.add(key);
    if (r.kind==='parent') {
      parentByChild.set(r.toId,[...(parentByChild.get(r.toId) ?? []),r.fromId]);
    }
  }
  // Ancestor cycle detection is required; a visual tree cannot repair cycles.
  const visiting=new Set<string>(),visited=new Set<string>();
  function checkCycle(id: string): void {
    if (visiting.has(id)) throw new Error('Hubungan orang tua membentuk siklus.');
    if (visited.has(id)) return;
    visiting.add(id);
    for(const parent of parentByChild.get(id) ?? []) checkCycle(parent);
    visiting.delete(id);
    visited.add(id);
  }
  ids.forEach(checkCycle);
  const name=String(raw['treeName'] ?? raw['name'] ?? 'Keluarga Saya').trim().slice(0,120);
  return {
    id:String(raw['id'] ?? 'imported-demo').slice(0,120),
    name:name || 'Keluarga Saya',
    people,relationships
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function stringField(o: Record<string, unknown>,key: string): string {
  const value=o[key];
  return typeof value==='string' ? value.trim() : '';
}
function parsePerson(value: unknown,index: number): Person {
  if (!isRecord(value)) throw new Error('Person pada baris '+(index+1)+' tidak valid.');
  const id=stringField(value,'id'),name=stringField(value,'name');
  if (!id || id.length>180 || !name || name.length>150)
    throw new Error('Nama atau ID Person tidak valid pada baris '+(index+1));
  const gender=stringField(value,'gender');
  const normalizedGender: Gender = ['male','female','other','unknown'].includes(gender) ? gender as Gender : 'unknown';
  const birth = stringField(value,'birthDate') || stringField(value,'birth');
  const death = stringField(value,'deathDate') || stringField(value,'death');
  const order = value['birthOrder'];
  if (birth && !validDate(birth) || death && !validDate(death)) throw new Error('Tanggal tidak valid untuk '+name);
  if (order !== undefined && order !== null && (!Number.isInteger(order) || (order as number)<1 || (order as number)>999))
    throw new Error('Urutan lahir tidak valid untuk '+name);
  return {
    id,name,gender:normalizedGender,claimed:value['claimed']===true || value['self']===true,
    ...(birth?{birthDate:birth}:{}),...(death?{deathDate:death}:{}),
    ...(typeof order==='number'?{birthOrder:order}:{}),
    ...(stringField(value,'nickname')?{nickname:stringField(value,'nickname')}:{}),
    ...(stringField(value,'occupation')?{occupation:stringField(value,'occupation')}:{}),
    ...(stringField(value,'residence')?{residence:stringField(value,'residence')}:{}),
    ...(stringField(value,'birthPlace')?{birthPlace:stringField(value,'birthPlace')}:{}),
    ...(stringField(value,'notes')?{notes:stringField(value,'notes')}: {})
  };
}
function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d=new Date(s+'T12:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===s;
}
