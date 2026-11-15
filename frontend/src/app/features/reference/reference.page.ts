import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FamilyTreeStore } from '../../application/family-tree.store';
import { LEARNING_ARTICLES, LEARNING_GROUPS } from './guide-content.data';
import { MAIN_RULES_HTML } from './main-rules.data';
import { TUTORIAL_COURSES } from '../family-tree/tutorial-content.data';

type ReferenceView = 'members'|'guide'|'rules';

@Component({
  selector: 'app-reference-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reference.page.html',
  styleUrl: './reference.page.css'
})
export class ReferencePage {
  readonly store = inject(FamilyTreeStore);
  private readonly route = inject(ActivatedRoute);
  readonly view = this.route.snapshot.data['view'] as ReferenceView;
  readonly groups = LEARNING_GROUPS;
  readonly guideSearch = signal('');
  readonly courses = TUTORIAL_COURSES;
  readonly learning = this.readLearning();
  readonly completedCount = this.courses.filter(c => this.learning.completed.includes(c.id)).length;
  readonly courseProgress = Math.round(100*this.completedCount/this.courses.length);
  private readLearning():{completed:string[];progress:Record<string,number>} {
    try {
      const raw:unknown=JSON.parse(localStorage.getItem('knowyourfam_learning_v1')??'{}');
      if(!raw || typeof raw!=='object')return {completed:[],progress:{}};
      const record=raw as Record<string,unknown>;
      return {
        completed:Array.isArray(record['completed'])
          ? record['completed'].filter((v):v is string=>typeof v==='string'):[],
        progress:record['progress'] && typeof record['progress']==='object'
          ? record['progress'] as Record<string,number> : {}
      };
    }catch{return {completed:[],progress:{}};}
  }

  illustration(articleGroup:string):readonly string[] {
    return articleGroup==='data' ? ['Pohon asli','JSON','Cadangan'] :
      articleGroup==='kanvas' ? ['Kartu','Pan & zoom','Fit All'] :
      articleGroup==='jelajah' ? ['Orang','↑ ↔ ↓','Cabang'] :
      ['Orang tua','Anggota','Anak'];
  }
  courseStatus(id:string):string {
    return this.learning.completed.includes(id)?'✓ Selesai · Ulangi':
      (this.learning.progress[id]??0)>0?'↻ Lanjutkan tutorial':'▶ Coba tutorial';
  }

  readonly rulesHtml = MAIN_RULES_HTML;
  readonly articleId = toSignal(this.route.paramMap.pipe(map(params => params.get('id'))),
    {initialValue:this.route.snapshot.paramMap.get('id')});
  get article() { return LEARNING_ARTICLES.find(article => article.id === this.articleId()); }
  getGroupTitle(id: string) { return LEARNING_GROUPS.find(group => group.id === id)?.title ?? 'Panduan'; }
  articlesFor(id: string) {
    const q = this.guideSearch().trim().toLocaleLowerCase('id');
    return LEARNING_ARTICLES.filter(article => article.group === id &&
      (!q || (article.title + ' ' + article.summary + ' ' + article.steps.join(' ')).toLocaleLowerCase('id').includes(q)));
  }
}
