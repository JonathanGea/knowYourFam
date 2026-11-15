import { inject, Injectable, signal } from '@angular/core';
import type { FamilyTree } from '../domain/family-tree.model';
import { SupabaseConnectionService } from './supabase-connection.service';

export interface LearningState {
  dismissed: boolean;
  completed: string[];
  progress: Record<string, number>;
  snapshots: Record<string, FamilyTree>;
}
const empty = (): LearningState => ({ dismissed: false, completed: [], progress: {}, snapshots: {} });

/** Persist tutorial/onboarding state to PostgreSQL, never to browser storage. */
@Injectable({ providedIn: 'root' })
export class LearningProgressService {
  readonly state = signal<LearningState>(empty());
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  private readonly connection = inject(SupabaseConnectionService);
  private loading: Promise<void> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  load(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = this.loadState();
    return this.loading;
  }

  private async loadState(): Promise<void> {
    try {
      const userId = await this.connection.requireUserId();
      const { data, error } = await this.connection.client.from('user_learning_states')
        .select('dismissed,completed,progress,snapshots').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (data) {
        this.state.set({
          dismissed: data.dismissed === true,
          completed: Array.isArray(data.completed) ? data.completed.filter((s): s is string => typeof s === 'string') : [],
          progress: data.progress && typeof data.progress === 'object' && !Array.isArray(data.progress) ? data.progress as Record<string, number> : {},
          snapshots: data.snapshots && typeof data.snapshots === 'object' && !Array.isArray(data.snapshots) ? data.snapshots as Record<string, FamilyTree> : {}
        });
      }
      this.error.set(null);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Gagal memuat progres tutorial.');
      throw error;
    } finally {
      this.loaded.set(true);
    }
  }

  save(next: LearningState): Promise<void> {
    this.state.set(next);
    // Serialize writes so older snapshots cannot overwrite newer progress.
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      const userId = await this.connection.requireUserId();
      const { error } = await this.connection.client.from('user_learning_states').upsert({
        user_id: userId,
        dismissed: next.dismissed, completed: next.completed,
        progress: next.progress, snapshots: next.snapshots,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      this.error.set(null);
    }).catch(error => {
      this.error.set(error instanceof Error ? error.message : 'Gagal menyimpan progres tutorial.');
      throw error;
    });
    return this.writeQueue;
  }
}
