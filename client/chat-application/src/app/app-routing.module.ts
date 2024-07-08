import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FirstPageComponent } from './first-page/first-page.component';
import { BuzzComponent } from './buzz/buzz.component';

const routes: Routes = [
  { path: '', component: FirstPageComponent },
  { path: 'buzz', component: BuzzComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
