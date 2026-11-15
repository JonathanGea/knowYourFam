import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TUTORIAL_COURSES,createTutorialTree} from '../src/app/features/family-tree/tutorial-content.data.ts';

const frontend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(frontend,p),'utf8');
const ui=read('src/app/features/family-tree/family-tree.page.ts');
const markup=read('src/app/features/family-tree/family-tree.page.html');
const store=read('src/app/application/family-tree.store.ts');
const guide=read('src/app/features/reference/reference.page.html');

test('six main training modules have original step sequences',()=>{
  assert.deepEqual(TUTORIAL_COURSES.map(course=>course.id),
    ['kartu','hubungan','saudara','cabang','kanvas','data']);
  assert.deepEqual(TUTORIAL_COURSES.map(course=>course.steps.length),[3,3,3,6,5,3]);
  assert.equal(TUTORIAL_COURSES.find(c=>c.id==='kartu').steps[0].target,'edu-self');
  assert.equal(TUTORIAL_COURSES.find(c=>c.id==='cabang').steps[4].key,
    'pair:edu-self|edu-spouse');
});

test('source practice tree uses isolated edu-family and correct module-specific data',()=>{
  for(const course of TUTORIAL_COURSES){
    const tree=createTutorialTree(course.id);
    assert.equal(tree.id,'edu-family');
    assert.ok(tree.people.some(p=>p.id==='edu-self'));
    assert.ok(tree.people.every(p=>p.id.startsWith('edu-')));
    const ids=new Set(tree.people.map(p=>p.id));
    assert.ok(tree.relationships.every(r=>ids.has(r.fromId)&&ids.has(r.toId)));
    assert.ok(tree.people.find(p=>p.id==='edu-self').claimed);
  }
  assert.equal(createTutorialTree('hubungan').people.length,1);
  assert.equal(createTutorialTree('saudara').people.length,5);
  assert.equal(createTutorialTree('kartu').people.length,7);
});

test('tutorial persistence is isolated and restores the original graph and view',()=>{
  assert.match(store,/if \(!this\.tutorialActive\(\)\) await this\.repository\.save\(next\)/);
  assert.match(store,/this\.tutorialOriginal\s*=\s*\{/);
  assert.match(store,/this\.tree\.set\(original\.tree\)/);
  assert.match(store,/this\.focusPersonId\.set\(original\.focus\)/);
  assert.match(store,/this\.collapsedBranches\.set\(new Set\(original\.collapsed\)\)/);
  assert.match(ui,/LearningProgressService/);
  assert.match(read('src/app/infrastructure/learning-progress.service.ts'), /user_learning_states/);
  assert.match(ui,/snapshots\[next\.module\]=structuredClone\(this\.store\.tree\(\)\)/);
});

test('step progress requires real event completion, not an unconditional Next button',()=>{
  const events=['card','profile','return','person-save','branch','mode','zoom','pan','fit',
    'inspect','simulate-export','simulate-import'];
  for(const type of events) assert.ok(ui.includes("'"+type+"'"),'Missing tutorial event '+type);
  assert.match(ui,/if\(correct\)this\.advanceTutorial\(\)/);
  assert.doesNotMatch(markup,/\(click\)="nextTutorial\(\)"/);
  assert.match(markup,/class="guide-tutorial-panel"/);
  assert.match(markup,/guide-tutorial-progress/);
  assert.match(markup,/tutorialAction\('back'\)/);
  assert.match(markup,/tutorialAction\('exit'\)/);
});

test('tutorial is displayed in guide as courses, progress, illustrations and FAQ',()=>{
  for(const key of ['guide-course-grid','guide-progress-bar','guide-illustration',
    'guide-faq','Lanjutkan tutorial','Tutorial Interaktif']){
    assert.ok(guide.includes(key)||read('src/app/features/reference/reference.page.ts').includes(key),
      'Missing main guide module: '+key);
  }
});

test('source-shaped tutorial profile replaces canvas without losing lesson state',()=>{
  assert.match(markup,/class="person-page active training-profile"/);
  assert.match(markup,/class="profile-hero"/);
  assert.match(markup,/class="profile-stats"/);
  assert.match(markup,/trainingProfileTab\(\)/);
  assert.match(ui,/trainingProfileOpen\.set\(true\)/);
  assert.match(ui,/returnFromTutorialProfile\(\)/);
});

test('source drawer fields, family sections and couple-child creation are linked',()=>{
  const source=read('src/app/features/family-tree/family-tree.page.html');
  for(const part of ['drawer-profile','drawer-actions','drawer-section',
    'info-row','relation-head','relation-item','couple-item','drawer-buttons']){
    assert.ok(source.includes('class="'+part+'"'),'Missing source-shaped drawer markup: '+part);
  }
  assert.match(source,/openAddToCouple\(person\.id,partnerId\)/);
  assert.match(store,/async addChildToCouple\(/);
  assert.match(store,/const next=linkCouple\(result\.tree,parentA,parentB,result\.person\.id\)/);
});

test('Quick Actions uses a profile page on desktop and bottom sheet on mobile',()=>{
  assert.match(ui,/this\.store\.tutorialActive\(\) && window\.innerWidth>650/);
  assert.match(ui,/else if \(window\.innerWidth<=650\)/);
  assert.match(ui,/void this\.router\.navigate\(\['\/person', id\]\)/);
});

test('mobile drawer provides source swipe and expand interactions',()=>{
  assert.match(markup,/class="sheet-grab-zone"/);
  assert.match(markup,/class="sheet-grab"/);
  assert.match(markup,/\[class\.expanded\]="drawerExpanded\(\)"/);
  for(const method of ['onDrawerGrabDown','onDrawerGrabUp','toggleDrawerExpanded','closePersonDrawer']){
    assert.ok(ui.includes(method+'('),method+' not implemented');
  }
});
