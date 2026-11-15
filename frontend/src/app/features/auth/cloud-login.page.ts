import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseConnectionService } from '../../infrastructure/supabase-connection.service';

@Component({
  selector: 'app-cloud-login',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    main { max-width: 460px; margin: 6vh auto; padding: 28px; color: #24342c;
      background: #fff; border: 1px solid #dfe6e0; border-radius: 20px; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { line-height: 1.6; margin: 10px 0; }
    input { width: 100%; font: inherit; padding: 12px; border: 1px solid #bfcfc3;
      border-radius: 10px; margin: 10px 0; box-sizing: border-box; }
    button, a.action { display: inline-block; border: none; border-radius: 10px;
      background: #14532d; color: #fff; padding: 12px 16px; font: inherit; cursor: pointer; }
    button:disabled { opacity: .6; } a.back { display: block; margin-top: 20px; color: #14532d; }
    .error { color: #a11b1b; } .note { color: #526154; font-size: 13px; }
  `],
  template: `
    <main>
      <h1>☁ Data KnowYourFam Online</h1>
      @if (connection.signedIn()) {
        <p>Anda sudah login. Data Family Tree berasal dari Supabase.</p>
        <a class="action" routerLink="/">Buka Family Tree</a>
        <p><button type="button" (click)="signOut()" [disabled]="busy()">Keluar dari akun</button></p>
      } @else {
        <p>Login dengan email agar data silsilah tersimpan di database.</p>
        <form (submit)="sendLink($event)">
          <label for="cloud-email">Alamat email</label>
          <input id="cloud-email" type="email" required autocomplete="email"
            [value]="email()" (input)="email.set($any($event.target).value)"
            placeholder="nama@email.com" />
          <button type="submit" [disabled]="busy()">{{ busy() ? 'Mengirim...' : 'Kirim link login' }}</button>
        </form>
        <p class="note">Klik link yang dikirim ke email. Data demo tidak otomatis diunggah.</p>
      }
      @if (message()) { <p [class.error]="isError()">{{ message() }}</p> }
      <a class="back" routerLink="/">← Kembali ke Family Tree</a>
    </main>
  `
})
export class CloudLoginPage {
  readonly connection = inject(SupabaseConnectionService);
  readonly email = signal('');
  readonly message = signal('');
  readonly isError = signal(false);
  readonly busy = signal(false);

  async sendLink(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.busy.set(true);
    const { error } = await this.connection.client.auth.signInWithOtp({
      email: this.email().trim(),
      options: { emailRedirectTo: window.location.origin + '/' }
    });
    this.isError.set(!!error);
    this.message.set(error?.message ?? 'Link login terkirim. Buka email Anda.');
    this.busy.set(false);
  }

  async signOut(): Promise<void> {
    this.busy.set(true);
    const { error } = await this.connection.client.auth.signOut();
    if (error) {
      this.isError.set(true);
      this.message.set(error.message);
      this.busy.set(false);
    } else {
      // Reset the root-scoped tree store before switching accounts.
      window.location.assign('/cloud');
    }
  }
}
