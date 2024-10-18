import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { FirebaseService } from 'src/app/services/firebase.service';
import * as QRCode from 'qrcode-generator';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ActivatedRoute, Router } from '@angular/router';
import { WompiService } from 'src/app/services/wompi.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-mis-compras',
  templateUrl: './mis-compras.component.html',
  styleUrls: ['./mis-compras.component.scss']
})
export class MisComprasComponent implements OnInit {
  data: any[] = []
  baseSeleccionada = ""
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild('content', { static: false }) content!: ElementRef;
  idTranssaccion: any;
  suscriptionTransaccion: any;
  constructor(private firebase: FirebaseService,
    private modalService: BsModalService,
    private router: Router,
    private route: ActivatedRoute,
    private wompi: WompiService,) {

  }

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe(async params => {
      this.idTranssaccion = params['id']
      if (this.idTranssaccion) {
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Validando compra, por favor espere.',
          showConfirmButton: false,
        })
        let res = await this.wompi.transacciones(this.idTranssaccion)
        res.subscribe(async (datos: any) => {
          if (datos) {
            let idLink = datos.data.reference.split("_")[0]
            let estado = datos.data.status

            let resfactura = await this.firebase.getFactura(idLink)

            let factura: any
            let id: any
            resfactura.forEach((reserva: any) => {
              id = reserva.id
              factura = reserva.data()

            })
            if (!factura.respuesta) {
              if (estado === "APPROVED") {
                factura.respuesta = datos.data
                factura.estado = "comprado"
                await this.firebase.actualizarFactura(factura, id)
                Swal.fire({
                  position: 'top-end',
                  icon: 'success',
                  title: 'Has comprado tú entrada!',
                  showConfirmButton: false,
                  timer: 3000
                })
              } else {
                factura.respuesta = datos.data
                factura.estado = "cancelado"
                await this.firebase.actualizarFactura(factura, id)
                Swal.fire({
                  position: 'top-end',
                  icon: 'error',
                  title: 'La transacción no ha sido confirmada, comunícate con tu banco.',
                  showConfirmButton: false,
                  timer: 2000
                })
              }

            }



          }
        })
      }

    })
    this.firebase.getAuthState().subscribe(user => {
      this.firebase.getCurrentFacturas(user!.uid).subscribe(res => {
        this.data = res
        // this.data.forEach((compra:any)=>{
        //   if(compra.estado==="comprando"){
        //     this.verificar(compra.link)
        //   }
        // })
      })
    })
  }
  generarPDF(id: string) {
    const content = document.getElementById(id); // Reemplaza 'pdfContent' con el ID de tu elemento HTML

    if (content) {
      const contentWidth = content.offsetWidth;
      const contentHeight = content.offsetHeight;
      const reduccion = 0.25;
      const pdfWidth = contentWidth * reduccion;
      const pdfHeight = contentHeight * reduccion;

      html2canvas(content).then((canvas) => {
        const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`innovacion-${id}`);
      });
    } else {
      console.error('No se encontró el elemento con el ID especificado.');
    }
  }

  generateQRCodeBase64(qrData: string) {
    const qr = QRCode(0, 'L');
    qr.addData(qrData);
    qr.make();
    return qr.createDataURL(10, 0);
  }

  openQR(codigo: string, template: TemplateRef<any>) {
    this.baseSeleccionada = codigo
    this.openModal(template)
  }
  modalRef?: BsModalRef;
  openModal(template: TemplateRef<any>) {

    this.modalRef = this.modalService.show(template);


  }
  formatAsientos(asientos: any[]) {
    let asientosString: string = ""
    asientos.forEach(asiento => {
      asientosString += (asiento.split("/")[1] + ', ')
    })
    return asientosString.slice(0, -2)
  }
  formatZonas(asientos: any[]) {
    let asientosString: string[] = []
    asientos.forEach(asiento => {
      asientosString.push(asiento.split(",")[0])
    })
    asientosString = asientosString.filter((item, index) => {
      return asientosString.indexOf(item) === index;
    })
    return asientosString
  }
  iterObject(elemento: any) {
    let claves = Object.keys(elemento)
    let asistentes: string = ""
    claves.forEach(clave => {
      asistentes += `<div class="col-md-4">${clave}<br>Niños: ${elemento[clave].ninos}<br>Adultos: ${elemento[clave].adultos}</div>`
    })
    return asistentes
  }
  comprando(){
    
  }
  async verificar(link: string) {
    let resfactura = await this.firebase.getFactura(link)

    let factura: any
    let id: any
    resfactura.forEach((reserva: any) => {
      id = reserva.id
      factura = reserva.data()

    })
    Swal.fire({
      position: 'top-end',
      icon: 'info',
      title: 'Validando compra, por favor espere.',
      showConfirmButton: false,
      
    })
    
    this.suscriptionTransaccion = this.firebase.transactions().subscribe(async res => {
      let iterable = Object.entries(res);
      let array: any[] = [];

      iterable.forEach(([key, transaccion]: any) => {
        transaccion.key = key;
        array.push(transaccion);
      });



      let respuesta = array.filter(pago => {
        return pago.data.transaction.payment_link_id === link
      })

      if (respuesta.length > 0) {
        let datos:any=respuesta[0].data
        if(datos.transaction.status === 'APPROVED'){
          factura.respuesta = datos
          factura.estado = "comprado"
          await this.firebase.actualizarFactura(factura, id)
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: 'Has comprado tú entrada!',
            showConfirmButton: false,
            timer: 3000
          })
        }else{
          factura.respuesta = datos
          factura.estado = "cancelado"
          await this.firebase.actualizarFactura(factura, id)
          Swal.fire({
            position: 'top-end',
            icon: 'error',
            title: 'La transacción no ha sido confirmada, comunícate con tu banco.',
            showConfirmButton: false,
            timer: 2000
          })
        }
        
      }else{
          factura.estado = "cancelado"
          await this.firebase.actualizarFactura(factura, id)
        Swal.fire({
          position: 'top-end',
          icon: 'error',
          title: 'La transacción no ha sido confirmada, comunícate con tu banco.',
          showConfirmButton: false,
          timer: 2000
        })
      }
    })
  }
}
