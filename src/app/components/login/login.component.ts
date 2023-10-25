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
    this.router.navigate(['evento', '0pRlSIWu9Cxyv7X8s8TQ'])
  }
  async iniciar() {
    this.spinner = true
    let email = `${this.formularioLogin.value.cedula}@gmail.com`
    let password = this.formularioLogin.value.cedula
    this.loginservice.login({ email, password }).then(async (res: any) => {
      let compras = await this.loginservice.getFacturaByuser(res.user.uid)
      let pass = true
      compras.forEach((doc: any) => {
        let compra = doc.data()
        if (compra.estado !== 'cancelado') {
          pass = false
        }
      })
      console.log(pass)
      if (!pass) {
        this.spinner = false
        this.router.navigate(["mis-compras"])
      } else {
        this.redireccionarPago(res)
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
    }
    if (pass === true) {
      this.loginservice.singup({ email, password }).then(async res => {
        user.uid = res.user.uid
        await this.loginservice.setUser(user)
        this.redireccionarPago(res)
      }).catch((error) => {



      })
    }



  }




}
