import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const app=read('src/app/features/family-tree/family-tree.page.html');
const css=read('src/family-explorer-workspace.css');
const pages=read('src/family-workspace-pages.css');
const sprite=read('public/icons.svg');

test('no decorative Unicode icon glyphs in application shell',()=>{
  const shell=app.slice(0,app.indexOf('class="explorer-stage"'));
  for(const glyph of ['♧','⌕','⑂','♙','☷','⚙','▦','📌']){
    assert.equal(shell.includes(glyph),false,'Unreviewed glyph '+glyph+' remains in app shell');
  }
  assert.match(app,/class="ui-icon"/);
  assert.match(sprite,/<symbol id="tree"/);
  assert.match(sprite,/<symbol id="search"/);
});

test('person node prioritizes identity over redundant action labels',()=>{
  assert.match(app,/class="node-name"/);
  assert.match(app,/class="node-years"/);
  assert.match(app,/class="node-self-tag"/);
  assert.doesNotMatch(app,/class="node-bottom"/);
  assert.doesNotMatch(app,/Lihat anggota/);
  assert.match(css,/scene:not\(\.zoom-compact\) \.node-name/);
  assert.match(css,/font-size:14px/);
  assert.match(css,/\.scene \.node\{\s*width:185px;height:113px/);
});

test('no new cascading stylesheet was added and existing shell styles share a vocabulary',()=>{
  const global=read('src/styles.css');
  assert.match(global,/\.ui-icon/);
  assert.match(global,/family-explorer-workspace.css/);
  assert.match(global,/family-workspace-pages.css/);
  assert.match(css,/--workspace-ink:#26342a/);
  assert.match(pages,/--family-ink:#26342a/);
  assert.match(css,/background:#fafbf8;background-image:none/);
  assert.match(css,/box-shadow:none;background:#fafbf8/);
});

test('other workspace routes use same SVG vocabulary',()=>{
  for(const path of ['reference/reference','profile/person-profile','developer/developer']){
    const html=read('src/app/features/'+path+'.page.html');
    assert.match(html,/href="\/icons\.svg#tree"/);
    assert.match(html,/href="\/icons\.svg#users"/);
    assert.match(html,/href="\/icons\.svg#user"/);
  }
});
