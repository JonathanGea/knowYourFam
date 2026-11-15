import { Injectable, inject } from '@angular/core';
import { SupabaseConnectionService } from '../infrastructure/supabase-connection.service';

/**
 * Person self-identification is stored separately from protected Person facts.
 * Supabase RLS ensures the signed-in user can only claim a Person they created
 * inside a tree they own. A unique user/person mapping prevents duplicates.
 */
@Injectable({ providedIn: 'root' })
export class PersonIdentityService {
  private readonly cloud = inject(SupabaseConnectionService);

  private async ownedTree(treeClientId:string, userId:string):Promise<string> {
    const {data,error} = await this.cloud.client.from('family_trees').select('id')
      .eq('client_id',treeClientId).eq('owner_id',userId).maybeSingle();
    if(error)throw new Error(error.message);
    if(!data)throw new Error('Hanya pemilik pohon yang dapat menautkan Person pada MVP ini.');
    return data.id;
  }

  async claimSelf(treeClientId:string,personClientId:string):Promise<string> {
    const uid=await this.cloud.requireUserId();
    const treeId=await this.ownedTree(treeClientId,uid);
    const {data:linked,error:linkedError}=await this.cloud.client.from('person_account_links')
      .select('person_id').eq('auth_user_id',uid).maybeSingle();
    if(linkedError)throw new Error(linkedError.message);
    if(linked)throw new Error('Akun ini sudah terhubung dengan satu Person.');

    const {data:person,error:personError}=await this.cloud.client.from('persons')
      .select('id').eq('tree_id',treeId).eq('client_id',personClientId)
      .eq('created_by',uid).is('claimed_by',null).is('deleted_at',null).maybeSingle();
    if(personError)throw new Error(personError.message);
    if(!person)throw new Error('Person tidak dapat diklaim oleh akun ini.');

    const {error}=await this.cloud.client.from('person_account_links')
      .insert({auth_user_id:uid,person_id:person.id});
    if(error)throw new Error(error.message);
    return uid;
  }

  async unlinkSelf(treeClientId:string,personClientId:string):Promise<void> {
    const uid=await this.cloud.requireUserId();
    const treeId=await this.ownedTree(treeClientId,uid);
    const {data:person,error:personError}=await this.cloud.client.from('persons')
      .select('id').eq('tree_id',treeId).eq('client_id',personClientId).maybeSingle();
    if(personError)throw new Error(personError.message);
    if(!person)throw new Error('Person tidak ditemukan pada pohon Anda.');

    const {data,error}=await this.cloud.client.from('person_account_links')
      .delete().eq('auth_user_id',uid).eq('person_id',person.id)
      .select('auth_user_id').maybeSingle();
    if(error)throw new Error(error.message);
    if(!data)throw new Error('Akun ini tidak tertaut pada Person tersebut.');
  }
}
