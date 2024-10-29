import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { WompiService } from './services/wompi.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  cargando: boolean = true
  login: boolean = false
  logged: boolean = false
  esAdmin: boolean = false
  constructor(private router: Router, private firebase: FirebaseService, private wompi: WompiService, private route: ActivatedRoute) { }
  async ngOnInit(): Promise<void> {
    // let users = await this.firebase.getUsers()
    // users.forEach(async (user: any) => {
    //   let data = user.data()
    //   if (!data.uid) {
    //     try {
    //       let userauth = await this.firebase.login({ email: `${data.DOCUMENTO}@gmail.com`, password: data.DOCUMENTO })
    //       data.uid = userauth.user.uid
    //       console.log(data)
    //     } catch (e) {
    //       console.log(e)
    //     }

    //   }
    // })
    this.setCedulas()
    this.firebase.getAuthState().subscribe(async res => {
      if (res) {
        this.logged = true
        res.uid === "NNcOSeH29sRCTw7LDqOlthXdg8E3" ? this.esAdmin = true : this.esAdmin = false
      }
      this.cargando = false
    })
    this.router.events.subscribe((event: any) => {
      if (event.url) {
        if (event.url === '/login') {
          this.login = true
        }
        else {
          this.login = false
        }
      }


    });
  }
  logout() {
    this.firebase.cerrarSesion()
    this.logged = false
  }
  redirect() {
    this.router.navigate(['login'])
  }
  redirectW() {
    const urlWhatsApp = 'https://api.whatsapp.com/send?phone=573219194560';
    window.open(urlWhatsApp, '_blank'); // Abre en una nueva ventana o pestaña
    // O puedes usar router.navigate para redirigir en la misma ventana
    // this.router.navigate(['/']); // Por ejemplo, redirigir a la página de inicio de tu aplicación Angular

  }
  async setCedulas(){
    // let users=await this.firebase.getUsers1()
    // //let users=await this.firebase.getUsers2()
    // users.forEach(async (query)=>{
    //   let user:any=query.data()
    //   if(user.uid){
    //     let doc=user.DOCUMENTO.toString()
    //     let user3:any=await this.firebase.getUser(doc)
    //     if(user3){
    //       user3.uid=user.uid
    //       await this.firebase.setUser(user3)
    //     }
    
    //   }
    // })
  }


}
