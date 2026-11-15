import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseConnectionService } from '../../infrastructure/supabase-connection.service';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'account';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth.page.html',
  styleUrl: './auth.page.css'
})
export class AuthPage {
  readonly connection = inject(SupabaseConnectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly mode = this.route.snapshot.data['mode'] as AuthMode;
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly accountEmail = signal('');
  readonly verified = this.route.snapshot.queryParamMap.has('confirmed');

  constructor() {
    if (this.mode === 'account') {
      void this.connection.client.auth.getUser().then(({ data }) => {
        this.accountEmail.set(data.user?.email ?? '');
      });
    }
  }

  private redirectDestination(): string {
    const path = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login')
      ? path : '/';
  }

  private failure(error: unknown): void {
    this.errorMessage.set(error instanceof Error ? error.message : 'Terjadi kesalahan. Coba kembali.');
  }

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    this.message.set('');
    this.errorMessage.set('');
    const email = this.email().trim().toLowerCase();
    const password = this.password();
    if (this.mode === 'register' && password !== this.confirmPassword()) {
      this.errorMessage.set('Konfirmasi password tidak sesuai.');
      return;
    }
    if ((this.mode === 'register' || this.mode === 'reset-password') && password.length < 8) {
      this.errorMessage.set('Gunakan password minimal 8 karakter.');
      return;
    }
    this.submitting.set(true);
    try {
      const auth = this.connection.client.auth;
      if (this.mode === 'login') {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        await this.router.navigateByUrl(this.redirectDestination());
      } else if (this.mode === 'register') {
        const { data, error } = await auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + '/login?confirmed=1' }
        });
        if (error) throw error;
        if (data.session) {
          await this.router.navigateByUrl('/');
        } else {
          this.message.set('Pendaftaran diterima. Periksa email Anda untuk konfirmasi akun sebelum login.');
        }
      } else if (this.mode === 'forgot-password') {
        const { error } = await auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password'
        });
        if (error) throw error;
        this.message.set('Jika email terdaftar, petunjuk reset password akan dikirim ke inbox Anda.');
      } else if (this.mode === 'reset-password') {
        if (password !== this.confirmPassword()) {
          this.errorMessage.set('Konfirmasi password tidak sesuai.');
          return;
        }
        const { data: userData, error: userError } = await auth.getUser();
        if (userError || !userData.user) throw new Error('Link reset sudah kedaluwarsa atau tidak valid. Minta link baru.');
        const { error } = await auth.updateUser({ password });
        if (error) throw error;
        this.message.set('Password berhasil diperbarui. Silakan kembali ke Family Tree.');
      }
    } catch (error) {
      this.failure(error);
    } finally {
      this.submitting.set(false);
    }
  }

  async logout(): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    try {
      const { error } = await this.connection.client.auth.signOut();
      if (error) throw error;
      // Ensure root-scoped Person/Tree signals cannot survive a user switch.
      window.location.replace('/login');
    } catch (error) {
      this.failure(error);
    } finally {
      this.submitting.set(false);
    }
  }
}
