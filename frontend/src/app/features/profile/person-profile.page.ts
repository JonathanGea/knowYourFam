import {Component, computed, inject, signal} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {FamilyTreeStore} from '../../application/family-tree.store';
import type {Person, RelationKind} from '../../domain/family-tree.model';

@Component({
  selector:'app-person-profile',
  standalone:true,
  imports:[RouterLink],
  templateUrl:'./person-profile.page.html',
  styleUrl:'./person-profile.page.css'
})
export class PersonProfilePage {
  readonly store=inject(FamilyTreeStore);
  private readonly route=inject(ActivatedRoute);
  readonly personId=toSignal(this.route.paramMap.pipe(map(p=>p.get('id')??'')),{
    initialValue:this.route.snapshot.paramMap.get('id')??''
  });
  readonly person=computed(()=>this.store.findPerson(this.personId()));
  readonly tab=signal<'bio'|'family'|'memories'>('bio');

  readonly relatives=computed(()=>this.store.relationsFor(this.personId()));

  years(person:Person): string {
    if(!person.birthDate&&!person.deathDate)return 'Tahun belum diisi';
    return (person.birthDate?.slice(0,4)??'—')+(person.deathDate?' – '+person.deathDate.slice(0,4):'');
  }
  value(text:string|number|undefined):string{
    return text===undefined||text===null||text===''?'Belum diisi':String(text);
  }
  sex(person:Person):string{
    return ({male:'Laki-laki',female:'Perempuan',unknown:'Belum diisi',other:'Lainnya'} as Record<string,string>)[person.gender]??'Belum diisi';
  }
  birthOrder(person:Person):string{
    return person.birthOrder?'Ke-'+person.birthOrder:'Belum diisi';
  }
  async unlink(from:string,to:string,kind:RelationKind):Promise<void>{
    const relation=this.store.directRelationship(from,to,kind);
    if(!relation)return;
    const a=this.store.findPerson(from)?.name??'Person A', b=this.store.findPerson(to)?.name??'Person B';
    if(!window.confirm('Hapus hanya hubungan antara '+a+' dan '+b+'? Profil tetap tersimpan.'))return;
    try{await this.store.unlinkRelationship(relation.id);}
    catch(error){window.alert(error instanceof Error?error.message:'Gagal menghapus hubungan.');}
  }
}
