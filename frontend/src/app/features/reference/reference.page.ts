import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FamilyTreeStore } from '../../application/family-tree.store';
import { LEARNING_ARTICLES, LEARNING_GROUPS } from './guide-content.data';
import { MAIN_RULES_HTML } from './main-rules.data';

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
