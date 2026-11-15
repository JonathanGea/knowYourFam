import type { FamilyRelationship, Person } from '../domain/family-tree.model';
import type { KinshipPreview } from './relationship-kinship';

export interface PersonOverviewFact {
  readonly id: 'residence' | 'occupation' | 'birthPlace';
  readonly label: string;
  readonly value: string;
}
export interface PersonOverview {
  readonly nickname: string | null;
  /** Optional additional family fact. Never repeats the kinship badge. */
  readonly familyContext: string | null;
  /** At most two populated personal details; never empty placeholders. */
  readonly facts: readonly PersonOverviewFact[];
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length ? trimmed : null;
}

/** One optional family insight plus two non-duplicative personal facts.
 * The relationship graph passed here must already be authorised for reading.
 */
export function buildPersonOverview(
  selected: Person,
  viewerId: string | null,
  people: readonly Person[],
  relationships: readonly FamilyRelationship[],
  kinship: KinshipPreview
): PersonOverview {
  const nickname = clean(selected.nickname);
  const facts: PersonOverviewFact[] = [];
  for (const [id, label, value] of [
    ['residence', 'Domisili', selected.residence],
    ['occupation', 'Pekerjaan', selected.occupation],
    ['birthPlace', 'Tempat lahir', selected.birthPlace]
  ] as const) {
    const text = clean(value);
    if(text && facts.length < 2) facts.push({id,label,value:text});
  }

  if(!viewerId || kinship.status !== 'known') {
    return {nickname:nickname && nickname.toLocaleLowerCase('id')!==selected.name.toLocaleLowerCase('id') ? nickname : null,
      familyContext:null,facts};
  }

  const active = new Map(people.filter(p=>!p.deletedAt).map(p=>[p.id,p]));
  const edges = relationships.filter(r=>!r.deletedAt && r.status!=='disputed' &&
    active.has(r.fromId)&&active.has(r.toId));
  const parents = (id:string)=>edges.filter(r=>r.kind==='parent'&&r.toId===id).map(r=>r.fromId);
  const children = (id:string)=>edges.filter(r=>r.kind==='parent'&&r.fromId===id).map(r=>r.toId);
  const partners = (id:string)=>edges.filter(r=>r.kind==='partner'&&(r.fromId===id||r.toId===id))
    .map(r=>r.fromId===id?r.toId:r.fromId);
  const siblings = (id:string)=> {
    const result = new Set(edges.filter(r=>r.kind==='sibling'&&(r.fromId===id||r.toId===id))
      .map(r=>r.fromId===id?r.toId:r.fromId));
    for(const p of parents(id)) for(const child of children(p)) if(child!==id)result.add(child);
    return result;
  };
  const name = (id:string)=>active.get(id)?.name;
  let familyContext:string|null=null;

  switch(kinship.kind) {
    case 'partner': {
      const mine=new Set(children(viewerId));
      const shared=children(selected.id).filter(id=>mine.has(id));
      if(shared.length)familyContext=`${shared.length} anak bersama yang tercatat di silsilah`;
      break;
    }
    case 'child': {
      const otherParent=parents(selected.id).find(id=>id!==viewerId && partners(viewerId).includes(id));
      if(otherParent)familyContext='Anak bersama '+name(otherParent);
      break;
    }
    case 'ancestor': {
      const directParent=parents(viewerId).find(id=>parents(id).includes(selected.id));
      if(directParent)familyContext='Orang tua dari '+name(directParent);
      else {
        const via=parents(viewerId).find(id=>{
          let frontier=[id];const visited=new Set<string>();
          for(let depth=0;depth<12 && frontier.length;depth++){
            if(frontier.includes(selected.id))return true;
            frontier=frontier.flatMap(person=>parents(person)).filter(person=>{
              if(visited.has(person))return false;visited.add(person);return true;
            });
          }
          return false;
        });
        if(via)familyContext='Leluhur dari jalur '+name(via);
      }
      break;
    }
    case 'descendant': {
      const immediate=parents(selected.id).find(id=>children(viewerId).includes(id));
      if(immediate)familyContext='Anak dari '+name(immediate);
      else {
        const via=children(viewerId).find(id=>{
          let frontier=[id];const visited=new Set<string>();
          for(let depth=0;depth<12 && frontier.length;depth++){
            if(frontier.includes(selected.id))return true;
            frontier=frontier.flatMap(person=>children(person)).filter(person=>{
              if(visited.has(person))return false;visited.add(person);return true;
            });
          }
          return false;
        });
        if(via)familyContext='Keturunan melalui '+name(via);
      }
      break;
    }
    case 'nephew': {
      const through=parents(selected.id).find(id=>siblings(viewerId).has(id));
      if(through)familyContext='Anak dari '+name(through);
      break;
    }
    case 'parent-in-law': {
      const through=partners(viewerId).find(id=>parents(id).includes(selected.id));
      if(through)familyContext='Orang tua dari '+name(through);
      break;
    }
    case 'sibling-in-law': {
      const sibling=Array.from(siblings(viewerId)).find(id=>partners(id).includes(selected.id));
      if(sibling)familyContext='Pasangan dari '+name(sibling);
      else {
        const spouse=partners(viewerId).find(id=>siblings(id).has(selected.id));
        if(spouse)familyContext='Saudara dari '+name(spouse);
      }
      break;
    }
    case 'aunt-uncle':
    case 'cousin':
      // Resolver provides a useful maternal/paternal explanation, not a repeat
      // of the badge. Full route breadcrumbs would be redundant here.
      familyContext=clean(kinship.explanation);
      break;
    default:
      break;
  }

  return {
    nickname:nickname && nickname.toLocaleLowerCase('id')!==selected.name.toLocaleLowerCase('id') ? nickname : null,
    familyContext:familyContext,
    facts
  };
}
