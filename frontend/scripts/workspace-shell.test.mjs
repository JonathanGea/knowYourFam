import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('all authenticated document pages share compact workspace shell',()=>{
  for(const page of ['reference/reference','profile/person-profile','developer/developer']){
    const file='src/app/features/'+page+'.page.html';
    const html=read(file);
    for(const klass of ['family-workspace-page','family-page-header','family-page-rail',
      'family-page-main','family-page-mobile-navigation']) {
      assert.ok(html.includes(klass),file+' missing '+klass);
    }
    assert.doesNotMatch(html,/<aside class="side"/,file+' still has legacy sidebar');
    assert.match(html,/routerLink="\/"/);
    assert.match(html,/routerLink="\/members"/);
    assert.match(html,/routerLink="\/guide"/);
  }
  const css=read('src/family-workspace-pages.css');
  assert.match(css,/\.family-workspace-page/);
  assert.match(css,/max-width:899px/);
  assert.match(css,/family-page-main/);
  const global=read('src/styles.css');
  assert.match(global,/family-workspace-pages.css/);
});

test('tutorial and user guide refer to current map and Supabase persistence',()=>{
  const tutorial=read('src/app/features/family-tree/tutorial-content.data.ts');
  const guide=read('src/app/features/reference/guide-content.data.ts');
  const reference=read('src/app/features/reference/reference.page.html');
  assert.match(tutorial,/Buka Peta Keluarga/);
  assert.match(tutorial,/Kembali menjelajahi pohon/);
  assert.match(guide,/Data asli berada di Supabase/);
  assert.match(guide,/membuat Family Tree baru di Supabase/);
  assert.match(reference,/Peta keluarga/);
  assert.doesNotMatch(guide,/Data tidak otomatis tersinkron ke akun/);
  assert.doesNotMatch(guide,/Impor menggantikan pohon di browser/);
});

test('authentication screens stay separate from protected workspace',()=>{
  const html=read('src/app/features/auth/auth.page.html');
  assert.match(html,/class="auth-shell"/);
  assert.doesNotMatch(html,/family-workspace-page/);
});
