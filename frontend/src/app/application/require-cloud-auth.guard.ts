import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseConnectionService } from '../infrastructure/supabase-connection.service';

/** Protect Family Tree pages. Remember the target URL so login returns to it. */
export const requireCloudAuth: CanActivateFn = async (_route, state) => {
  const auth = inject(SupabaseConnectionService);
  const router = inject(Router);
  const login = () => router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  try {
    return await auth.userId() ? true : login();
  } catch {
    return login();
  }
};
