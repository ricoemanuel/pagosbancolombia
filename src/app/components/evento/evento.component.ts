import { Component, OnInit, TemplateRef, Pipe, PipeTransform, OnDestroy, ChangeDetectorRef, AfterViewInit, ElementRef, HostListener } from '@angular/core';
import { FormControl } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeScript, SafeStyle, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { FirebaseService } from 'src/app/services/firebase.service';
import { WompiService } from 'src/app/services/wompi.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-evento',
  templateUrl: './evento.component.html',
  styleUrls: ['./evento.component.scss']
})
export class EventoComponent implements  AfterViewInit {
  spinner: boolean = true
  id: string | null;
  evento: any
  modalRef?: BsModalRef;
  listaAsientos: any[] = []
  link!: SafeUrl
  user!: string
  enabled = new FormControl(false);
  suscriptionTransaccion!: Subscription;
  asientosReservadosSus!: Subscription;
  matriz: any[] = []
  localidadesMostradas: Set<string> = new Set<string>();
  nombreLocalidadMostrado: boolean = false;
  uid!: string;
  constructor(private aRoute: ActivatedRoute,
    private firebase: FirebaseService,
    private modalService: BsModalService,
    private wompi: WompiService,
    protected _sanitizer: DomSanitizer,
    private cdRef: ChangeDetectorRef,
    private el: ElementRef, private router: Router) {
    this.id = this.aRoute.snapshot.paramMap.get('id');
  }
  ngAfterViewInit(): void {
    this.spinner = false
  }

  
  comprar() {
    const queryParams = {
      generarLink: true,
    };
    this.router.navigate(['login'], { queryParams: queryParams })

  }


}
