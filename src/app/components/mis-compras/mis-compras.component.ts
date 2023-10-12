import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { FirebaseService } from 'src/app/services/firebase.service';
import * as QRCode from 'qrcode-generator';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Router } from '@angular/router';
@Component({
  selector: 'app-mis-compras',
  templateUrl: './mis-compras.component.html',
  styleUrls: ['./mis-compras.component.scss']
})
export class MisComprasComponent implements OnInit{
  data: any[] = []
  baseSeleccionada = ""
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild('content', { static: false }) content!: ElementRef;
  constructor(private firebase: FirebaseService, private modalService: BsModalService, private router: Router) {

  }

  async ngOnInit(): Promise<void> {
    this.firebase.getAuthState().subscribe(user => {
      this.firebase.getCurrentFacturas(user!.uid).subscribe(res => {
        res = res.filter((factura: any) => {
          if (factura.eventoData) {
            return factura.eventoData.nombre.split(" ")[0] === "Innovación" && factura.transaccion.data.transaction.status !== 'ERROR' && factura.asientos.length > 0
          }else{
            return false
          }
        })
        this.data = res
        console.log(this.data)
      })
    })
  }
  generarPDF(id:string) {
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
        pdf.save(`halloween-${id}`);
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
}
