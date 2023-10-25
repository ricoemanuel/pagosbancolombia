import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventoComponent } from './components/evento/evento.component';
import { LoginComponent } from './components/login/login.component';
import { MisComprasComponent } from './components/mis-compras/mis-compras.component';
import { AdminComponent } from './components/admin/admin.component';


//Components
const routes: Routes = [
  {path:'evento/:id',component:EventoComponent},
  {path:'login',component:LoginComponent},
  {path:'mis-compras',component:MisComprasComponent},
  {path:'ventas',component:AdminComponent},
  {
    path: '**', // El wildcard '**' atrapa cualquier ruta que no coincida con las rutas anteriores
    redirectTo: '/evento/0gcsQiNsuSbw7W12Mo97', // Redirige a la ruta deseada
  },
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
