import { Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseConnectionService {
  // Only the publishable API key is included in browser code.
  // Login tokens persist for this tab in sessionStorage, never across browser sessions.
  readonly client = createClient(
    'https://fdhxysiixkkhnoyqbmzd.supabase.co',
    'sb_publishable_lLwruxqaOW5ZUU35Scqi6A_Svm-rMJM',
    { auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  readonly signedIn = signal(false);

  constructor() {
    this.client.auth.onAuthStateChange((_event, session) => this.signedIn.set(!!session));
    void this.client.auth.getSession().then(({data}) => this.signedIn.set(!!data.session));
  }

  async userId(): Promise<string | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error && !/Auth session missing/i.test(error.message)) throw error;
    return data.user?.id ?? null;
  }

  async requireUserId(): Promise<string> {
    const id = await this.userId();
    if (!id) throw new Error('Sesi login tidak tersedia. Silakan login kembali.');
    return id;
  }
}
