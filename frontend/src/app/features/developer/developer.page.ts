import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAIN_DEVELOPER_BLOB, MAIN_DEVELOPER_SECTIONS } from './developer-reference.data';

@Component({
  selector: 'app-developer-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="dev-page">
      <header class="hero">
        <a routerLink="/" class="back-link">← Kembali ke Family Tree</a>
        <div class="kicker">KNOWYOURFAM · DEVELOPMENT ONLY · IMPLEMENTATION REFERENCE</div>
        <h1>Developer Guide <span>Family Tree Canvas</span></h1>
        <p>15 bagian dokumentasi developer yang diambil dari halaman dokumentasi
          di <code>main/index.html</code>. Bersumber dari kode canvas HTML/JavaScript asli.</p>
        <div class="source-row">
          <span>Source blob: <code>{{ blob.slice(0, 10) }}</code></span>
          <a href="https://github.com/JonathanGea/knowYourFam/blob/dev/fullstack-mvp/docs/CANVAS-MAIN-ANGULAR-MIGRATION.md"
            target="_blank" rel="noopener noreferrer">Lihat status migrasi Angular ↗</a>
        </div>
        <p class="note"><strong>Catatan:</strong> Label <em>DI KODE</em> / <em>BERLAKU</em> dalam teks sumber
          menunjukkan status pada <code>main</code>, bukan bukti semua fitur sudah setara di Angular.</p>
      </header>
      <nav class="contents" aria-label="Daftar isi panduan developer">
        @for (chapter of chapters; track chapter.id; let i = $index) {
          <a [href]="'#' + chapter.id"><span>{{ i + 1 }}</span>{{ chapter.title }}</a>
        }
      </nav>
      <div class="chapters">
        @for (chapter of chapters; track chapter.id; let i = $index) {
          <section class="chapter" [id]="chapter.id">
            <header>
              <span class="chapter-no">{{ (i + 1).toString().padStart(2, '0') }}</span>
              <div><h2>{{ chapter.title }}</h2><p>{{ chapter.description }}</p></div>
            </header>
            <div class="dev-content" [innerHTML]="chapter.content"></div>
          </section>
        }
      </div>
      <footer>Dokumen sumber lengkap juga tersedia di
        <a href="https://github.com/JonathanGea/knowYourFam/blob/dev/fullstack-mvp/docs/DEVELOPER-CANVAS-MAIN-REFERENCE.md"
          target="_blank" rel="noopener noreferrer">GitHub Markdown ↗</a>.
      </footer>
    </main>
  `,
  styleUrl: './developer.page.css'
})
export class DeveloperPage {
  readonly chapters = MAIN_DEVELOPER_SECTIONS;
  readonly blob = MAIN_DEVELOPER_BLOB;
}
