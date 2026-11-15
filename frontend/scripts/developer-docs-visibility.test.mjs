import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('manual developer documentation route always remains registered',()=>{
  const router=read('src/app/app.config.ts');
  assert.match(router,/path:\s*'developer'/);
  assert.doesNotMatch(router,/showDeveloperDocs|environment\./);
});

test('developer documentation remains reachable through family settings',()=>{
  const page=read('src/app/features/family-tree/family-tree.page.ts');
  const template=read('src/app/features/family-tree/family-tree.page.html');
  assert.match(template,/routerLink="\/developer"/);
  assert.match(template,/Dokumentasi Developer/);
  assert.match(template,/explorerTab\(\)==='settings'/);
  assert.doesNotMatch(page,/showDeveloperDocs|environments\/environment/);
  assert.doesNotMatch(template,/@if\s*\(showDeveloperDocs\)/);
});

test('production build has no developer documentation file replacement',()=>{
  const config=JSON.parse(read('angular.json'));
  const build=config.projects.knowyourfam.architect.build;
  assert.ok(!build.configurations.production.fileReplacements?.some(r=>r.replace.includes('environment.ts')));
  assert.equal(build.defaultConfiguration,'production');
});
