import { Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseConnectionService {
  // The publishable key is safe in the frontend; never embed a secret/service_role key.
  readonly client = createClient(
    'https://fdhxysiixkkhnoyqbmzd.supabase.co',
    'sb_publishable_lLwruxqaOW5ZUU35Scqi6A_Svm-rMJM'
  );
  readonly signedIn = signal(false);

  constructor() {
    this.client.auth.onAuthStateChange((_event, session) => this.signedIn.set(!!session));
    void this.client.auth.getSession().then(({ data }) => this.signedIn.set(!!data.session));
  }

  async userId(): Promise<string | null> {
    const { data: session, error: sessionError } = await this.client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session.session) return null;
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  }
}
