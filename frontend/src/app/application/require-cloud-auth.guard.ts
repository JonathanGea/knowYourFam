import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseConnectionService } from '../infrastructure/supabase-connection.service';

/** Data pages require an authenticated Supabase user; there is no guest/demo fallback. */
export const requireCloudAuth: CanActivateFn = async () => {
  const auth = inject(SupabaseConnectionService);
  const router = inject(Router);
  try {
    return await auth.userId() ? true : router.parseUrl('/cloud');
  } catch {
    return router.parseUrl('/cloud');
  }
};
