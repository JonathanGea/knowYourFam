import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FamilyTreeStore} from '../../application/family-tree.store';
import {MAIN_DEVELOPER_BLOB, MAIN_DEVELOPER_SECTIONS} from './developer-reference.data';

@Component({
  selector:'app-developer-page',
  standalone:true,
  imports:[RouterLink],
  templateUrl:'./developer.page.html',
  styleUrl:'./developer.page.css'
})
export class DeveloperPage {
  readonly store=inject(FamilyTreeStore);
  readonly chapters=MAIN_DEVELOPER_SECTIONS;
  readonly blob=MAIN_DEVELOPER_BLOB;
}
