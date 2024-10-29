import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from 'src/app/services/firebase.service';
import { WompiService } from 'src/app/services/wompi.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements AfterViewInit, OnInit {
  spinner: boolean = true

  formularioLogin = this.formBuilder.group({
    cedula: ['', Validators.required],
  });
  disabled!: boolean;
  generarLink: any;
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private loginservice: FirebaseService,
    private route: ActivatedRoute,
    private wompi: WompiService,) { }
  ngOnInit(): void {
    this.route.queryParams.subscribe(async params => {
      this.generarLink = params['generarLink']
    })
  }
  ngAfterViewInit(): void {
    this.spinner = false
  }
  redirect() {
    this.router.navigate(['evento', 'nov-22-2024'])
  }
  async iniciar() {
    this.spinner = true
    let email = `${this.formularioLogin.value.cedula}@gmail.com`
    let password = this.formularioLogin.value.cedula
    this.loginservice.login({ email, password }).then(async (res: any) => {
      let user:any=await this.loginservice.getUser(password!)
      let compras = await this.loginservice.getFacturaByuser(res.user.uid)
      if(user){
        let pass = true
        user.uid=res.user.uid
        await this.loginservice.setUser(user)
        compras.forEach((doc: any) => {
          let compra = doc.data()
          if (compra.estado !== 'cancelado' && compra.evento==="nov-22-2024") {
            pass = false
          }
        })
        if (!pass) {
          this.spinner = false
          this.router.navigate(["mis-compras"])
        } else {
          this.redireccionarPago(res)
        }
      }else{
        this.registro(email, password!)
      }



    }).catch(e => {

      if (e.code == "auth/user-not-found") {
        this.registro(email, password!)
      }


    })
  }
  async redireccionarPago(idUser: any) {
    let user: any = await this.loginservice.getUser(this.formularioLogin.value.cedula!)
    if (this.generarLink) {
      let link = await this.wompi.generarLink(user.CONTRIBUCIÓN, '')
      link.subscribe(async (res: any) => {
        let response = await this.loginservice.registrarFactura(idUser.user.uid, res.data.id, user.CONTRIBUCIÓN)
        if (response) {
          window.location.href = `https://checkout.wompi.co/l/${res.data.id}`
        }
      })
    }
  }
  async registro(email: string, password: string): Promise<void> {
    this.disabled = true
    let pass = true
    let user: any = await this.loginservice.getUser(this.formularioLogin.value.cedula!)
    if (!user) {
      pass = false
      Swal.fire({
        position: 'top-end',
        icon: 'error',
        title: 'Su cédula no está en nuestros registros.',
        showConfirmButton: false,
        timer: 2000
      }).then(() => {
        window.location.reload()
      })
    }
    
    if (pass) {
      this.loginservice.singup({ email, password }).then(async res => {
        user.uid = res.user.uid
        await this.loginservice.setUser(user)
        this.redireccionarPago(res)
      }).catch((error) => {



      })
    }



  }




}
