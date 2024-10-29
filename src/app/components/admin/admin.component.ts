import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { FirebaseService } from 'src/app/services/firebase.service';
import * as QRCode from 'qrcode-generator';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, AfterViewInit {
  dataSource: MatTableDataSource<any>
  baseSeleccionada = ""
  displayedColumns: string[] = ['QR', 'Evento', 'Valor', 'estado', 'transaccion', 'fecha', 'cedula','uid', 'acciones'];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  spinner!: boolean;
  constructor(private firebase: FirebaseService,
    private modalService: BsModalService,
  ) {
    this.dataSource = new MatTableDataSource<any>();
    this.dataSource.paginator = this.paginator;
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
  formatfecha(fecha: string) {

    const fechaDate = new Date(fecha);

    // Obtener el nombre del día
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombreDia = diasSemana[fechaDate.getUTCDay()];

    // Obtener la fecha en formato dd/mm/aaaa
    const dia = fechaDate.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaDate.getUTCMonth() + 1).toString().padStart(2, '0'); // Se suma 1 porque los meses van de 0 a 11
    const año = fechaDate.getUTCFullYear();

    // Obtener la hora en formato hh:mm
    const hora = fechaDate.getUTCHours().toString().padStart(2, '0');
    const minutos = fechaDate.getUTCMinutes().toString().padStart(2, '0');

    const formatoDeseado = `${nombreDia}, ${dia}/${mes}/${año} ${hora}:${minutos}`;
    return formatoDeseado


  }
  sinCedula:any[]=[]
  async ngOnInit(): Promise<void> {
    //this.validarUID()
    this.spinner = true
    //  let asientos=await this.firebase.getAsientoByEstadoString("ocupado")
    //  console.log(asientos)
    //  asientos.forEach(async (asiento:any)=>{
    //    asiento.estado="libre"
    //    asiento.clienteUser="null"
    //    if(asiento.clienteUSer){
    //      delete asiento.clienteUSer
    //    }
    //    asiento.clienteEstado="null"
    //  })
    let asientosFactura: string[] = []
    this.firebase.getAuthState().subscribe(user => {

      this.firebase.getFacturas().subscribe(res => {

        let comprando= res.filter((factura: any) => {
          if (factura.eventoData) {
            return factura.evento === "nov-22-2024" && (factura.estado === "comprando")
          }
          return false
        })
        // comprando.map(async (venta:any)=>{
        //   const ahora = new Date();
        //   venta.fecha=new Date(venta.fecha.seconds*1000)
        //   const diferenciaMinutos = (ahora.getTime() - venta.fecha.getTime()) / (1000 * 60);
        //   if (diferenciaMinutos > 15) {
        //     venta.estado = "cancelado";
        //   }
        //   await this.firebase.actualizarFactura(venta, venta.id)
        // })
        let data = res.filter((factura: any) => {
          if (factura.eventoData) {
            return factura.evento === "nov-22-2024" && (factura.estado === "comprado")
          }
          return false
        })
        let acum = 0
        let dataNoC:any=[]
        data.map(async (venta: any) => {
          acum += venta.valor
          try {
            let cedula = await this.firebase.geUserByUid(venta.uid)
            venta.cedula = cedula.docs[0].id
            return venta
          } catch (error) {
            try {
              venta.cedula = venta.respuesta.transaction.customer_data.legal_id
            } catch (error) {
              try {
                venta.cedula = venta.respuesta.customer_data.legal_id
              } catch (error) {
                dataNoC.push(venta)
              }
            }

          }

        })
        console.log(dataNoC)
        // console.log(data)
        // let Existe:any[]=[]
        // asientosFactura.forEach((mesa:string)=>{
        //   let existe=asientos.filter((mesaA:any)=>{
        //     return mesaA.id===mesa
        //   })
        //   Existe.push(existe[0])
        // })
        // let diferencia=asientos.filter(item => !Existe.includes(item));
        // console.log(diferencia)
        this.dataSource.data = data
        this.dataSource.paginator = this.paginator;
      })

    })

  }
  generateQRCodeBase64(qrData: string) {
    const qr = QRCode(0, 'L');
    qr.addData(qrData);
    qr.make();
    return qr.createDataURL(10, 0);
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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
      asistentes += `<br>${clave}<br>Niños: ${elemento[clave].ninos}<br>Adultos: ${elemento[clave].adultos}<br>`
    })
    return asistentes
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

    this.firebase.transactions().subscribe(async res => {
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
        let datos: any = respuesta[0].data
        if (datos.transaction.status === 'APPROVED') {
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
        } else {
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

      } else {
        Swal.fire({
          position: 'top-end',
          icon: 'info',
          title: 'La transacción no ha sido confirmada, comunícate con tu banco.',
          showConfirmButton: false,
          timer: 2000
        })
      }
    })
  }
  
}
