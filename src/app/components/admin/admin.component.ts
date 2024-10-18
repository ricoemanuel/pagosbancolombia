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
  displayedColumns: string[] = ['QR', 'Evento', 'Valor', 'estado', 'transaccion', 'fecha', 'cedula', 'uid', 'acciones'];
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
        let data = res.filter((factura: any) => {
          if (factura.eventoData) {
            return factura.evento === "nov-22-2024" && (factura.estado === "comprado")
          }
          return false
        })
        let acum = 0
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
              console.log(venta)
            }

          }

        })
        console.log(acum)
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
  validarUID() {
    let data = [
      {
        "Nombre": "Carolina Escobar ",
        "Correo": "caroesco@bancolombia.com.co",
        "DOCUMENTO": 1000410791,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Camilo Moreno",
        "Correo": "jcmoreno@bancolombia.com.co",
        "DOCUMENTO": 8164453,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Natalia Betancur Angel",
        "Correo": "nabetanc@bancolombia.com.co",
        "DOCUMENTO": 1026144662,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniel Estiben Gutierrez Marin",
        "Correo": "daegutie@bancolombia.com.co",
        "DOCUMENTO": 1037602224,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alejandro Murillo Puerta",
        "Correo": "almurill@bancolombia.com.co",
        "DOCUMENTO": 1035420173,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Daniel Giraldo Arango",
        "Correo": "dgarango@bancolombia.com.co",
        "DOCUMENTO": 1152456735,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan José Velásquez Valderrama",
        "Correo": "juavelas@bancolombia.com.co",
        "DOCUMENTO": 1216720831,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Echeverry Ortiz",
        "Correo": "sanechev@bancolombia.com.co",
        "DOCUMENTO": 1036642367,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Esteban Villegas Villegas",
        "Correo": "jevilleg@bancolombia.com.co",
        "DOCUMENTO": 8356336,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastián González Restrepo",
        "Correo": "sebgonza@bancolombia.com.co",
        "DOCUMENTO": 1152212513,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Isabella Tirado Galeano",
        "Correo": "istirado@bancolombia.com.co",
        "DOCUMENTO": 1095839517,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Gonzalez Gil",
        "Correo": "santgonz@bancolombia.com.co",
        "DOCUMENTO": 1017250802,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yesica Rangel Villada",
        "Correo": "yrangel@bancolombia.com.co",
        "DOCUMENTO": 3127287725,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "ELIANA JIMENA GOME SANCHEZ",
        "Correo": "elgomez@bancolombia.com.co",
        "DOCUMENTO": 1038627278,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "LUIS ALFONSO GALEANO CANTERO",
        "Correo": "LUGALEAN@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1193254900,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "JUAN DAVID POSSO GALLEGO",
        "Correo": "JPOSSO@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1128404214,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Estefania Morales Araque",
        "Correo": "esmaraqu@bancolombia.com.co",
        "DOCUMENTO": 1152438479,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Johan Sebastian Caicedo Melo",
        "Correo": "jocaiced@bancolombia.com.co",
        "DOCUMENTO": 1152210812,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Fernando Velez Hoyos",
        "Correo": "jfvelez@bancolombia.com.co",
        "DOCUMENTO": 15458377,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Daniela Ruiz Salazar",
        "Correo": "danruiz@bancolombia.com.co",
        "DOCUMENTO": 1098800207,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maria Fernanda Velez Ramirez",
        "Correo": "mavramir@bancolombia.com.co",
        "DOCUMENTO": 1017275253,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Evelin Valentina Escobar Rios",
        "Correo": "evvescob@bancolombia.com.co",
        "DOCUMENTO": 43985582,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Guillermo Romero Guzmán",
        "Correo": "juaromer@bancolombia.com.co",
        "DOCUMENTO": 71293663,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Ana María González Mazo",
        "Correo": "anmgonza@bancolombia.com.co",
        "DOCUMENTO": 1152189141,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Sebastian Castaño Castro",
        "Correo": "scastan@bancolombia.com.co",
        "DOCUMENTO": 1007238756,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "MARIA ISABEL BUITRAGO ATEHORTUA",
        "Correo": "mariabui@bancolombia.com.co",
        "DOCUMENTO": 1039470065,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Valentina Gutiérrez Ríos",
        "Correo": "valeguti@bancolmbia.com.co",
        "DOCUMENTO": 1001016828,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Estefania Londoño Vallejo",
        "Correo": "eslondon@bancolombia.com.co",
        "DOCUMENTO": 1152203150,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "JUAN CAMILO ANDRADE PEREZ",
        "Correo": "JUANDRAD@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 8106750,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Leidy Johanna Barco Perez",
        "Correo": "lbarco@bancolombia.com.co",
        "DOCUMENTO": 1036611895,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Cardona Correa",
        "Correo": "santcard@bancolombia.com.co",
        "DOCUMENTO": 1037593105,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Paula Andrea Pirela Rios",
        "Correo": "ppirela@bancolombia.com.co",
        "DOCUMENTO": 1083043553,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "SANTIAGO RESTREPO YEPES",
        "Correo": "SANTREST@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1152454951,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Elizabeth Marin Agudelo",
        "Correo": "elmarin@bancolombia.com.co",
        "DOCUMENTO": 1020489354,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "sebastian  bernal arango",
        "Correo": "sebarang@bancolombia.com.co",
        "DOCUMENTO": 1128280848,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "sara vargas",
        "Correo": "saravarg@bancolombia.com.co",
        "DOCUMENTO": 1040743700,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan David Linares Ospina",
        "Correo": "jualinar@bancolombia.com.co",
        "DOCUMENTO": 1020397338,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Tatiana Tobón Ochoa",
        "Correo": "ttobon@bancolombia.com.co",
        "DOCUMENTO": 1017130171,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Silvia Judith Daza Moya",
        "Correo": "sjdaza@bancolombia.com.co",
        "DOCUMENTO": 1065627028,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Susana Castillo",
        "Correo": "suscasti@bancolombia.com.co",
        "DOCUMENTO": 1152212903,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Anny Catalina Giraldo Moreno",
        "Correo": "acgirald@bancolombia.com.co",
        "DOCUMENTO": 43871992,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Natalia Andrea Vergara Marin",
        "Correo": "natverg@bancolombia.com.co",
        "DOCUMENTO": 1152459522,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yeniffer Cordero Pérez",
        "Correo": "yecorder@bancolombia.com.co",
        "DOCUMENTO": 1036666043,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jesús Andrés Acendra Martínez",
        "Correo": "jacendra@bancolombia.com.co",
        "DOCUMENTO": 1052739186,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alexander Echeverry Torres",
        "Correo": "alexeche@bancolombia.com.co",
        "DOCUMENTO": 1152437776,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Adriana Estela Franco Ospina",
        "Correo": "aefranco@bancolombia.com.co",
        "DOCUMENTO": 1017176899,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andres Ricardo Cardenas Izaquita",
        "Correo": "ancarden@bancolombia.com.co",
        "DOCUMENTO": 1140898172,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Omar Andres Martinez Rodriguez",
        "Correo": "omamarti@bancolombia.com.co",
        "DOCUMENTO": 1036660181,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maria Patricia Henao Arango",
        "Correo": "mphenao@bancolombia.com.co",
        "DOCUMENTO": 1128271946,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Carolina Lopera Gómez",
        "Correo": "carolope@bancolombia.com.co",
        "DOCUMENTO": 1026150095,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Kevin Steven Zapata",
        "Correo": "kszapata@bancolombia.com.co",
        "DOCUMENTO": 1094963884,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago López Restrepo",
        "Correo": "sanlop@bancolombia.com.co",
        "DOCUMENTO": 1214715604,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Juan Pablo Zambrano Cadavid",
        "Correo": "juzambra@bancolombia.com.co",
        "DOCUMENTO": 1036674740,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Camilo Andres Ramos Ortiz",
        "Correo": "camramos@bancolombia.com.co",
        "DOCUMENTO": 1020732338,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luisa Botero Lopez",
        "Correo": "lbotero@bancolombia.com.co",
        "DOCUMENTO": 1001367865,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Beatriz Elena García Sánchez",
        "Correo": "begarcia@bancolombia.com.co",
        "DOCUMENTO": 39445053,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniel Echeverri Marin",
        "Correo": "danieche@bancolombia.com.co",
        "DOCUMENTO": 1039460288,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Julian Giraldo Castañeda",
        "Correo": "jugiral@bancolombia.com.co",
        "DOCUMENTO": 1193531009,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Claudia Sofía Vélez Vega",
        "Correo": "cvelez@bancolombia.com.co",
        "DOCUMENTO": 39175325,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Erik Santiago Rojas Galindo",
        "Correo": "erikroja@bancolombia.com.co",
        "DOCUMENTO": 1073630502,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diana Marcela Chavez Quilindo",
        "Correo": "dmchavez@bancolombia.com.co",
        "DOCUMENTO": 1061714017,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "sandra milena arango bustamante",
        "Correo": "saarango@bancolombia.com.co",
        "DOCUMENTO": 32296722,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Laura Ibarra Betancur",
        "Correo": "libarra@bancolombia.com.co",
        "DOCUMENTO": 1036660124,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Valentina Carvajal Moreno",
        "Correo": "valcarva@bancolombia.com.co",
        "DOCUMENTO": 1152222024,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Anthony De Jesus De La Hoz De Leon",
        "Correo": "addelaho@bancolombia.com.co",
        "DOCUMENTO": 1046817928,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Mildrey Liliana Galeano Arango",
        "Correo": "migalean@bancolombia.com.co",
        "DOCUMENTO": 32299965,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Raúl Sebastián Meneses",
        "Correo": "rsmenese@bancolombia.com.co",
        "DOCUMENTO": 1053830961,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sara Marcela Ochoa Giraldo",
        "Correo": "sarochoa@bancolombia.com.co",
        "DOCUMENTO": 1017139902,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Juan Camilo González Arango",
        "Correo": "jucagonz@bancolombia.com.co",
        "DOCUMENTO": 8033171,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Jhon Sebastian Cano Ruiz",
        "Correo": "jhocano@bancolombia.com.co",
        "DOCUMENTO": 1116726331,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ena Teresa Juvinao Duque",
        "Correo": "ejuvinao@bancolombia.com.co",
        "DOCUMENTO": 43904177,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Andrés Felipe Chaparro Grimaldo",
        "Correo": "anchapar@bancolombia.com.co",
        "DOCUMENTO": 3125763799,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Lina Bianey Suarez Morales",
        "Correo": "linsuarm@bancolombia.com.co",
        "DOCUMENTO": 1152435149,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jeison Fernando Acosta Perdomo",
        "Correo": "jfacosta@bancolombial.com.co",
        "DOCUMENTO": 1005719065,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "MARTHA ISABEL MANCO RODRIGUEZ",
        "Correo": "MIMANCO@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1097390511,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Pablo Carabali Rivera",
        "Correo": "jpcaraba@Bancolombia.com.co",
        "DOCUMENTO": 1144102317,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Emilcar Bastidas Berrios",
        "Correo": "ebastida@bancolombia.com.co",
        "DOCUMENTO": 806337,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luis Fernando Martínez Martín",
        "Correo": "lfmartin@bancolombia.com.co",
        "DOCUMENTO": 79569267,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "PAULO ANDRES ARIAS ESGUERRA",
        "Correo": "pauarias@bancolombia.com.co",
        "DOCUMENTO": 71753243,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Jhan Carlos Sánchez Serna",
        "Correo": "jhcsanch@bancolombia.com.co",
        "DOCUMENTO": 1035236135,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Francisco Manuel Alvarado Santos",
        "Correo": "fmalvara@bancolombia.com.co",
        "DOCUMENTO": 5477562,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yeison Andres Vasco Durango ",
        "Correo": "yvasco@bancolombia.com.co",
        "DOCUMENTO": 1017272328,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "saida catalina castaño echavarria",
        "Correo": "saicasta@bancolombia.com.co",
        "DOCUMENTO": 1128445813,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Yulany Sierra Vargas",
        "Correo": "yusierra@bancolombia.com.co",
        "DOCUMENTO": 43221336,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "DANIEL PUERTA ALVAREZ",
        "Correo": "danpuert@bancolombia.com.co",
        "DOCUMENTO": 1017269199,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maria Cristina Llano Arbelaez",
        "Correo": "mallano@bancolombia.com.co",
        "DOCUMENTO": 1152704090,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Natalia Sandrid Mosquera Turizo",
        "Correo": "natmosqu@bancolombia.com.co",
        "DOCUMENTO": 1005419197,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Julián Andrés Álvarez Jiménez",
        "Correo": "julanalv@bancolombia.com.co",
        "DOCUMENTO": 1035436379,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Laura María Concha Vélez",
        "Correo": "lconcha@bancolombia.com.co",
        "DOCUMENTO": 1037391048,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "carolina arango gonzalez",
        "Correo": "caroliar@bancolombia.com.co",
        "DOCUMENTO": 1036626262,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maria Paulina Gonzalez Roldan",
        "Correo": "mapagonz@bancolombia.com.co",
        "DOCUMENTO": 1152711613,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "David Humberto Arias Parra",
        "Correo": "dharias@bancolombia.com.co",
        "DOCUMENTO": 14701321,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Esteban Toledo Jaramillo",
        "Correo": "etoledo@bancolombia.com.co",
        "DOCUMENTO": 1152193027,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "sara victoria padilla rodriguez",
        "Correo": "svpadill@bancolombia.com",
        "DOCUMENTO": 1000305260,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniela Rico Alzate",
        "Correo": "darico@bancolombia.com.co",
        "DOCUMENTO": 1037641634,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yeraldin Molina Mesa",
        "Correo": "yemolina@bancolombia.com.co",
        "DOCUMENTO": 1023622283,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "LADY GINETTE CARDONA MONTOYA",
        "Correo": "LCARDONA@BANCOLOMBIA.COM",
        "DOCUMENTO": 1128389574,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Gonzalez Zapata",
        "Correo": "sango@bancolombia.com.co",
        "DOCUMENTO": 1037672545,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Oscar Escobar Lozano",
        "Correo": "oescobar@bancolombia.com.co",
        "DOCUMENTO": 79555346,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diana Cristina Cortes Orozco",
        "Correo": "diccorte@bancolombia.com.co",
        "DOCUMENTO": 42694596,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Andrea Patricia Chica Patiño",
        "Correo": "apchica@bancolombia.com.co",
        "DOCUMENTO": 43756517,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Paula Andrea Roncancio Celis",
        "Correo": "proncanc@bancolombia.com.co",
        "DOCUMENTO": 1039454959,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Fernando Zuluaga Restrepo",
        "Correo": "jzuluaga@bancolombia.com.co",
        "DOCUMENTO": 1152205482,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "BEATRIZ ELENA IZQUIERDO CORRALES",
        "Correo": "BIZQUIER@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 31419989,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Paula Andrea Vallejo Buitrago",
        "Correo": "pauvalle@bancolombia.com.co",
        "DOCUMENTO": 43973643,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maritza Rios Restrepo",
        "Correo": "mtrios@bancolombia.com.co",
        "DOCUMENTO": 43989931,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Mauricio Higuita Niebles",
        "Correo": "cahiguit@bancolombia.com.co",
        "DOCUMENTO": 98669282,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Paula Andrea Patiño Naranjo",
        "Correo": "PAPATINO@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 39176717,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alejandra Maria Luján L",
        "Correo": "amlujan@bancolombia.com.co",
        "DOCUMENTO": 3184414979,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Manuela Zuluaga Ocampo",
        "Correo": "manuzulu@bancolombia.com.co",
        "DOCUMENTO": 1152211187,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Laura Catalina Restrepo Perez",
        "Correo": "lcrestre@bancolombia.com.co",
        "DOCUMENTO": 1037623980,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Laura Arteaga Estrada",
        "Correo": "lauartea@bancolombia.com.co",
        "DOCUMENTO": 1128448395,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luis Miguel Hurtado Cova",
        "Correo": "lumhurta@bancolombia.com.co",
        "DOCUMENTO": 1050959555,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Deisy Tatiana Arcila Mejia",
        "Correo": "dtarcila@bancolombia.com.co",
        "DOCUMENTO": 1092356720,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniel Darío Sánchez Macías",
        "Correo": "dansanch@bancolombia.com.co",
        "DOCUMENTO": 1020463257,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Valencia Calderon",
        "Correo": "savcalde@bancolombia.com.co",
        "DOCUMENTO": 1037632572,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Maryory Gómez Ortiz",
        "Correo": "marygome@bancolombia.com.co",
        "DOCUMENTO": 44006809,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "claudia maria posada alvarez",
        "Correo": "clposada@bancolombia.com.co",
        "DOCUMENTO": 43200445,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Kennyvher Echavarria Escudero",
        "Correo": "keechava@bancolombia.com.co",
        "DOCUMENTO": 1152689946,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Camilo Pérez Londoño",
        "Correo": "cplondo@bancolombia.com.co",
        "DOCUMENTO": 1152439357,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "camilo restrepo saldarriaga",
        "Correo": "camilres@bancolombia.com.co",
        "DOCUMENTO": 80076462,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Daniela Castañeda Prada",
        "Correo": "dcprada@bancolombia.com.co",
        "DOCUMENTO": 1000564577,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Gabriel Jaime Galeano Montoya",
        "Correo": "ggaleano@bancolombia.com.co",
        "DOCUMENTO": 98657719,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Duverney Londoño Sanchez",
        "Correo": "dulondon@bancolombia.com.co",
        "DOCUMENTO": 1020423797,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cristina Duque Jaramillo",
        "Correo": "criduque@bancolombia.com.co",
        "DOCUMENTO": 43984202,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Claudia Melissa Mesa Charry",
        "Correo": "clmmesa@bancolombia.com.co",
        "DOCUMENTO": 1128422625,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Castillo Giraldo",
        "Correo": "scastil@bancolombia.comc.o",
        "DOCUMENTO": 1000987567,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andres Felipe Donado Rodriguez",
        "Correo": "afdonado@bancolombia.com.co",
        "DOCUMENTO": 1042438788,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luis Gabriel Castro Montoya",
        "Correo": "lcastro@bancolombia.com.co",
        "DOCUMENTO": 98669427,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Erika Johana Cano Izquierdo",
        "Correo": "ejcano@bancolombia.com.co",
        "DOCUMENTO": 1060587532,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Natalia Alvarez Gaviria",
        "Correo": "nalvarez@bancolombia.com.co",
        "DOCUMENTO": 3174309183,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Orlando Aldahir Rodríguez Calderón",
        "Correo": "oarodrig@bancolombia.com.co",
        "DOCUMENTO": 1022443815,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ivan Camilo Gonzalez Colmenares",
        "Correo": "ivcgonza@bancolombia.com.co",
        "DOCUMENTO": 1018448683,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cesar Dario Rios ",
        "Correo": "cdrios@bancolombia.com.co",
        "DOCUMENTO": "Gerente",
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Edwin Marino Montaño Andrade",
        "Correo": "emontano@bancolombia.com.co",
        "DOCUMENTO": 1111740832,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Juan Diego Agudelo",
        "Correo": "jdagudel@bancolombia.com.co",
        "DOCUMENTO": 98667341,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Jesus Miguel Acevedo Arias",
        "Correo": "jacevedo@bancolombia.com.co",
        "DOCUMENTO": 1090527393,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "ANDRES FELIPE HERRERA GOMEZ",
        "Correo": "andherre@bancolombia.com.co",
        "DOCUMENTO": 1017231596,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Edwin Arturo Garcia Gomez",
        "Correo": "edwgarci@bancolombia.com.co",
        "DOCUMENTO": 1017125400,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Eugenia Toledo Jaramillo",
        "Correo": "eutoledo@bancolombia.com.co",
        "DOCUMENTO": 1128447625,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Camila Berrio Tamayo",
        "Correo": "caberrio@bancolombia.com.co",
        "DOCUMENTO": 1000893667,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Steven Martinez Marin",
        "Correo": "stmartin@bancolombia.com.co",
        "DOCUMENTO": 1017256337,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "ALEXANDRA MILENA CHAVARRIA GOMEZ",
        "Correo": "alchavar@bancolombia.com.co",
        "DOCUMENTO": 43903863,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "María José Sánchez Ayazo",
        "Correo": "majsanch@bancolombia.com.co",
        "DOCUMENTO": 1067894031,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "HEIDY DAYANA OTAGRI RODRIGUEZ",
        "Correo": "HOTAGRI@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": "DADIST12",
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maira Alejandra Suárez Tamayo",
        "Correo": "maisuare@bancolombi.com.co",
        "DOCUMENTO": 1152706847,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Diego Loaiza Martinez ",
        "Correo": "judiloai@bancolombia.com.co",
        "DOCUMENTO": 1234988328,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Katherin Daniela Gallego Lopera",
        "Correo": "kagalleg@bancolombia.com.co",
        "DOCUMENTO": 1214722932,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yicela Andrea Zuluaga ",
        "Correo": "yzuluaga@bancolombia.com.co",
        "DOCUMENTO": 43927254,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jenny Katherine Jaramillo Jimenez",
        "Correo": "jkjarami@bancolombia.com.co",
        "DOCUMENTO": 1039450564,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Esteban Nicolas Morales Hernandez",
        "Correo": "enmorale@bancolombia.com.co",
        "DOCUMENTO": 1010234459,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "leidy Johana Hernandez Higuita",
        "Correo": "lhhiguit@bancolombia.com",
        "DOCUMENTO": 1037631879,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Esteban Sanchez",
        "Correo": "essanche@bancolombia.com.co",
        "DOCUMENTO": 8160449,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "José Alberto Gómez Velásquez",
        "Correo": "josalgom@bancolombia.com.co",
        "DOCUMENTO": 71389830,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Sergio Hernan Vanegas Abellaneda",
        "Correo": "svanegas@bancolombia.com.co",
        "DOCUMENTO": 1073327977,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Felipe Rendón Muñoz",
        "Correo": "juarendo@bancolombia.com.co",
        "DOCUMENTO": 70142619,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Felipe Betancur Ospina",
        "Correo": "jufbetan@bancolombia.com.co",
        "DOCUMENTO": 98773128,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Vélez Roldán ",
        "Correo": "santivel@bancolombia.com",
        "DOCUMENTO": 1037627380,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sara Julieth Vanegas Quintana",
        "Correo": "sarvaneg@bancolombia.com.co",
        "DOCUMENTO": 1001131942,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carolina Ramirez Gaviria",
        "Correo": "carorami@bancolombia.com.co",
        "DOCUMENTO": 1128405484,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Ricardo Arboleda Echavarria",
        "Correo": "Riarbole@bancolombia.com.co",
        "DOCUMENTO": 1017150209,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Nauly Yesenia Daza Gamboa",
        "Correo": "ndaza@bancolombia.com.co",
        "DOCUMENTO": 1028013239,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "María Isabel Arango Duque ",
        "Correo": "mararang@bancolombia.com.co",
        "DOCUMENTO": 1152444388,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Paola Cristina Vanegas Tobón",
        "Correo": "pcvanega@bancolombia.com.co",
        "DOCUMENTO": 3045913300,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maryory Suárez García",
        "Correo": "msuarez@bancolombia.com.co",
        "DOCUMENTO": 43118551,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Mateo Hernández Restrepo",
        "Correo": "matherna@bancolombia.com.co",
        "DOCUMENTO": 1017247438,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andres Felipe Garcia Sierra",
        "Correo": "andfegar@bancolombia.com.co",
        "DOCUMENTO": 1037603283,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Lina Maria Henao Raigoza",
        "Correo": "linahena@bancolombia.com.co",
        "DOCUMENTO": 3014579166,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Fabio Andrés Martínez Torres",
        "Correo": "faamarti@bancolombia.com.co",
        "DOCUMENTO": 1069468689,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Laura Carolina Izquierdo Ramirez",
        "Correo": "lizquier@bancolombia.com.co",
        "DOCUMENTO": 1143846052,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Arango Gutierrez",
        "Correo": "sanara@bancolombia.com.co",
        "DOCUMENTO": 1007222572,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Alberto Almanza Ballestas",
        "Correo": "caaalman@bancolombia.com.co",
        "DOCUMENTO": 1143376185,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Wilson leon estrada",
        "Correo": "wileon@bancolombia.com.co",
        "DOCUMENTO": 1032383820,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Cristian Diaz Perez",
        "Correo": "Cridia@bancolombia.com.co",
        "DOCUMENTO": 1193217161,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andres Felipe Agudelo Usuga",
        "Correo": "andagude@bancolombia.com.co",
        "DOCUMENTO": 1017214724,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Diego Marin Tobon",
        "Correo": "jmtobon@bancolombia.com.co",
        "DOCUMENTO": 1152458428,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Dennis Adriana Ortiz Graterol",
        "Correo": "denortiz@bancolombia.com.co",
        "DOCUMENTO": 1152697692,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "jose manuel velez",
        "Correo": "jomavele@bancolombia.com.co",
        "DOCUMENTO": 1001544715,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "David Gonzalez Jiménez",
        "Correo": "dagonza@bancolombia.com.co",
        "DOCUMENTO": 1017252844,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yudi Alexandra Mantillla",
        "Correo": "ymantill@bancolombia.com.co",
        "DOCUMENTO": 1083885218,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cristian Londoño Bedoya",
        "Correo": "clondon@bancolombia.com.co",
        "DOCUMENTO": 3135924205,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Manuela Hernandez Cardona ",
        "Correo": "manuhern@bancolombia.com.co",
        "DOCUMENTO": 1017273977,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luz Damarys Alvaran",
        "Correo": "lalvaran@bancolombia.com.co",
        "DOCUMENTO": 32106300,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carolina Marín Salazar",
        "Correo": "carolmar@bancolombia.com.co",
        "DOCUMENTO": 24333522,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Ana Isabel Mazo Marin",
        "Correo": "anmazo@bancolombia.com.co",
        "DOCUMENTO": 21856430,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Andres Giraldo Restrepo",
        "Correo": "jugirald@bancolombia.com.co",
        "DOCUMENTO": 71792073,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "David Loaiza Herrera",
        "Correo": "daviloai@bancolombia.com.co",
        "DOCUMENTO": 1036609920,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jorge Andres Agudelo Ortiz",
        "Correo": "joragude@bancolombia.com.co",
        "DOCUMENTO": 1017242613,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yenny Marcela Vargas Rincon",
        "Correo": "ymvargas@bancolombia.com.co",
        "DOCUMENTO": 1001652321,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Aura Cristina Mosquera",
        "Correo": "aumosque@bancolombia.com ",
        "DOCUMENTO": 1035234708,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniela Mafla Orozco",
        "Correo": "dmafla@bancolombia.com.co",
        "DOCUMENTO": 1128478444,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "JORGE IVAN NARANJO VELEZ",
        "Correo": "JONARANJ@BANCOLOMBIA.COM.co",
        "DOCUMENTO": 71765694,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diana María Ochoa Durán",
        "Correo": "diaochoa@bancolombia.com.co",
        "DOCUMENTO": 1152438102,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Esteban Restrepo Sanchez",
        "Correo": "jrsanche@bancolombia.com.co",
        "DOCUMENTO": 1040731435,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "manuela castaño agudelo",
        "Correo": "mancasta@bancolombia.com.co",
        "DOCUMENTO": 1152457443,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ana Maria Echavarria Jaramillo",
        "Correo": "anechava@bancolombia.com.co",
        "DOCUMENTO": 1036640224,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Leidy Tatiana Lopez Echavarria",
        "Correo": "letlopez@bancolombia.com.co",
        "DOCUMENTO": 3104323529,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Fernando Ramirez Mazo",
        "Correo": "juframir@bancolombia.com.co",
        "DOCUMENTO": 3225157892,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Antonio Salcedo Bello",
        "Correo": "caasalce@bancolombia.com.co",
        "DOCUMENTO": 1065003539,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniela Palacio Perez",
        "Correo": "dapalac@bancolombia.com.co",
        "DOCUMENTO": 1152715475,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ana Sofia Hurtado Restrepo",
        "Correo": "ahrestre@bancolombia.com.com",
        "DOCUMENTO": 1144082776,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andres Vasquez Quiroz",
        "Correo": "andrvasq@bancolombia.com.co",
        "DOCUMENTO": 1128270920,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Melissa Velasquez Morales",
        "Correo": "mevmoral@bancolombia.com.co",
        "DOCUMENTO": 1020470910,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Giovanni Rodriguez Giraldo",
        "Correo": "grgiral@bancolombia.com.co",
        "DOCUMENTO": 1037570450,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Camilo Lopera Garica",
        "Correo": "CLGARCI@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1036947902,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Katherine Serrano Romero",
        "Correo": "rkcastan@bancolombia.com.co",
        "DOCUMENTO": 1049633474,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Monica Mayerly Martinez Medina ",
        "Correo": "monimart@bancolombia.com.co",
        "DOCUMENTO": 1037642161,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Laura Jimenez Heredia",
        "Correo": "laurajim@bancolombia.com.co",
        "DOCUMENTO": 1036647743,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sofia Salazar Hernandez",
        "Correo": "sosalaza@bancolombia.com.co",
        "DOCUMENTO": 1007286581,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "maria camila zapata galindo",
        "Correo": "mzgalind@bancolombia.com.co",
        "DOCUMENTO": 1000900945,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Paula Andrea Florez Naranjo",
        "Correo": "pauflore@bancolombia.com.co",
        "DOCUMENTO": 43203346,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yony Arley Escobar Ceballos",
        "Correo": "yaescoba@bancolombia.com.co",
        "DOCUMENTO": 1037631394,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "CAROLINA GARCIA ATEHORTUA",
        "Correo": "CAROGARC@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1152209702,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marilyn Tenorio Melenje",
        "Correo": "mtenorio@bancolombia.com.co",
        "DOCUMENTO": 1060237283,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Andres Naranjo Castro",
        "Correo": "cnaranjo@bancolombia.com.co",
        "DOCUMENTO": 1128469326,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Francy Lorena Marín Alvarez",
        "Correo": "flmarin@bancolombia.com.co",
        "DOCUMENTO": 44004603,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Esteban Llano Moreno",
        "Correo": "jullano@bancolombia.com.co",
        "DOCUMENTO": 15448382,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Johan Rojas Rodríguez",
        "Correo": "joroja@bancolombia.com.co",
        "DOCUMENTO": 1026155844,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cristian Camilo Lopez Muñoz",
        "Correo": "crcalope@bancolombia.com.co",
        "DOCUMENTO": 1053865076,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Harold Martinez ",
        "Correo": "hmgarci@bancolombia.com.co",
        "DOCUMENTO": 1001772854,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Felipe Arenas Moreno",
        "Correo": "jfarenas@bancolombia.com.co",
        "DOCUMENTO": 1088335957,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Vanessa Diosa Castro",
        "Correo": "vdiosa@bancolombia.com.co",
        "DOCUMENTO": 1033653088,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jaime Andres Sierra Grisales",
        "Correo": "jaisierr@bancolombia.com.co",
        "DOCUMENTO": 71777671,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Rosa Maria Zabala Ossa",
        "Correo": "rzabala@bancolombia.com.co",
        "DOCUMENTO": 39454117,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cindy Elizabeth Monsalve Torres",
        "Correo": "cimonsal@bancolombia.com.co",
        "DOCUMENTO": 1017165785,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "DAISY CONSTANZA GONZALEZ BARRERO",
        "Correo": "daigonza@bancolombia.com.co",
        "DOCUMENTO": 1077146461,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "andrea carolina de la cruz montero",
        "Correo": "acdelacr@bancolombia.com.co",
        "DOCUMENTO": 1001871994,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Noe Santiago Castellanos Salazar",
        "Correo": "ncastell@bancolombia.com.co",
        "DOCUMENTO": 1000020036,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Angelica Arbelaez Montoya ",
        "Correo": "anarbela@bancolombia.com.co ",
        "DOCUMENTO": 1214746786,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Hugo Armando Escobar Andrade",
        "Correo": "huaescob@bancolombia.com.co",
        "DOCUMENTO": 1140889031,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Natalia Osorio Piedrahita",
        "Correo": "nataosor@bancolombia.com.co",
        "DOCUMENTO": 43189786,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "paula andrea dominguez",
        "Correo": "paudomin@bancolombia,com.co",
        "DOCUMENTO": 43978368,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "MARISOL GONZALEZ VASQUEZ",
        "Correo": "MGVASQU@BANCOLOMBIA.COM",
        "DOCUMENTO": 1128432184,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "MARIA FERNANDA ALVAREZ ZULUAGA",
        "Correo": "MARFEALV@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1007243795,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "David Ochoa Uribe",
        "Correo": "davochoa@bancolombia.com.co",
        "DOCUMENTO": 1152202326,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Lissa Maria Giraldo Villa ",
        "Correo": "Lmgirald@bancolombia.com.co",
        "DOCUMENTO": 1000533081,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Catalina Cortés Uribe",
        "Correo": "cacortes@bancolombia.com.co",
        "DOCUMENTO": 43977227,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Andrés David Osorio Gómez",
        "Correo": "andresos@bancolombia.com.co",
        "DOCUMENTO": 1020459452,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Stiven Gonzalez vanegas",
        "Correo": "Stvanega@bancolombia.com.co",
        "DOCUMENTO": 1033340309,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luz Marina Londoño Mejia",
        "Correo": "luzlondo@bancolombia.com.co",
        "DOCUMENTO": 43272471,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Pablo Sanchez Cardona",
        "Correo": "juapasan@bancolombia.com.co",
        "DOCUMENTO": 3128427269,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diana Cristina Trujillo Valencia",
        "Correo": "Dtrujill@bancolombia.com.co",
        "DOCUMENTO": 43552711,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Luz María Munera",
        "Correo": "Luzmuner@bancolombia.com.co",
        "DOCUMENTO": 1037590926,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "sandra milena pineda vasquez",
        "Correo": "spineda@bancolombia.com",
        "DOCUMENTO": 1017130386,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "santiago aldana",
        "Correo": "santial@bancolombia.com.co",
        "DOCUMENTO": 3212546183,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Lili Johanna Ospina Restrepo",
        "Correo": "lilospin@bancolombia.com.co",
        "DOCUMENTO": 43263108,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Manuela Mesa Torres",
        "Correo": "manmes@bancolombia.com.co",
        "DOCUMENTO": 1036686835,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Valeria Sanchez Restrepo",
        "Correo": "valsanch@bancolombia.com.co",
        "DOCUMENTO": 1152447546,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Camilo Girón ",
        "Correo": "jgiron@bancolombia.com.co",
        "DOCUMENTO": 1144075446,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniel Alejandro Colorado Gaviria",
        "Correo": "dacolora@bancolombia.com.co",
        "DOCUMENTO": 1037647255,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Diego Campuzano Osorio",
        "Correo": "jcampuza@bancolombia.com.co",
        "DOCUMENTO": 1006320848,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yesica Alicia Florez Giraldo",
        "Correo": "yeflorez@bancolombia.com.co",
        "DOCUMENTO": 1037583665,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "MARIA ANGELICA BORJA HIDALGO",
        "Correo": "mborja@bancolombia.com.co",
        "DOCUMENTO": 26671703,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "MAURICIO ENRIQUE DELGADO CARABALLO",
        "Correo": "MEDELGAD@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 1143351574,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Tatiana Penagos Sierra",
        "Correo": "tpenagos@bancolombia.com.co",
        "DOCUMENTO": 39178182,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Herney Nicolás Benavides Bastidas",
        "Correo": "hnbenavi@bancolombia.com.co",
        "DOCUMENTO": 3146504672,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Dayana Milena Rios Monsalve",
        "Correo": "dmrios@Bancolombia.com.co",
        "DOCUMENTO": 1140848061,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yuliana olaya ",
        "Correo": "yuolaya@bancolombia.com.co",
        "DOCUMENTO": 1001004485,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jose Luis Ospina Gutierrez",
        "Correo": "jlospina@bancolombia.com.co",
        "DOCUMENTO": 1152190537,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Mailer Martinez Ballesta",
        "Correo": "maimar@bancolombia.com.co",
        "DOCUMENTO": 1039100351,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Machado Sánchez ",
        "Correo": "samachad@bancolombia.com.co",
        "DOCUMENTO": 1037654981,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sonia Velandia",
        "Correo": "smveland@bancolombia.com.co",
        "DOCUMENTO": 1127598126,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sara Lucia Parra Galvis",
        "Correo": "saparra@bancolombia.com.co",
        "DOCUMENTO": 1037602479,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Fernando Mesa Rivera",
        "Correo": "fermesa@bancolombia.com.co",
        "DOCUMENTO": 1036677516,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Stick Stivenson Cruz Madera",
        "Correo": "sscruz@bancolombia.com.co",
        "DOCUMENTO": 1128442702,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Julian Duque Cano",
        "Correo": "jdcano@bancolombia.com.co",
        "DOCUMENTO": 1128401620,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Juan Fernando Gómez Molina",
        "Correo": "jfgomez@bancolombia.com.co",
        "DOCUMENTO": 1036672529,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luisa Fernanda Gomez Serna",
        "Correo": "lfgomez@bancolombia.com.co",
        "DOCUMENTO": 32241084,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Edison Tabares Henao",
        "Correo": "edtabare@bancolombia.com.co",
        "DOCUMENTO": 98594546,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Mariana Riaño Gonzalez",
        "Correo": "marriago@bancolombia.com.co",
        "DOCUMENTO": 1152451444,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Carlos Alberto Medina Chaverra",
        "Correo": "cmedina@bancolombia.com.co",
        "DOCUMENTO": 71368562,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ximena Múnera Suarez ",
        "Correo": "Xmunera@bancolombia.com.co",
        "DOCUMENTO": 1037546838,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Diaz Gaona",
        "Correo": "sebdia@bancolombia.com.co",
        "DOCUMENTO": 1022442251,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marco Hans Hackling Martinez",
        "Correo": "mhacklin@bancolombia.com.co",
        "DOCUMENTO": 1002028675,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Johan Ferney Otalvaro Lopez",
        "Correo": "jfotalva@bancolombia.com.co",
        "DOCUMENTO": 1037595522,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "gabriel jaime velez restrepo",
        "Correo": "gavelez@bancolombia.com.co",
        "DOCUMENTO": 98583295,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diego Mauricio Sabogal Merchan",
        "Correo": "dsabogal@bancolombia.com.co",
        "DOCUMENTO": 1030681868,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Andres Castrillon",
        "Correo": "caacastr@bancolombia.com.co",
        "DOCUMENTO": 1037575110,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Oscar Ricardo Acosta Jaramillo",
        "Correo": "osacosta@bancolombia.com.co",
        "DOCUMENTO": 1037586063,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Cristian Mauricio Zapata Salazar",
        "Correo": "crizapat@bancolombia.com.co",
        "DOCUMENTO": 1039447000,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jeronimo Alvarez",
        "Correo": "jeralvar@bancolombia.com.co",
        "DOCUMENTO": 1152443591,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Camilo Hernandez Hernandez",
        "Correo": "juaherna@bancolombia.com.co",
        "DOCUMENTO": 71313916,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juanita Aranzazu aguirre",
        "Correo": "jaranzaz@bancolombia.com.co",
        "DOCUMENTO": 10538422881,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Fabian Reyes Muñoz",
        "Correo": "fabrey@bancolombia.com.co",
        "DOCUMENTO": 1098669389,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ruben Dario Cardona Ochoa",
        "Correo": "rcardona@bancolombia.com.co",
        "DOCUMENTO": 1036929363,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Mauricio Andres Pacheco Perez",
        "Correo": "maanpach@bancolombia.com.co",
        "DOCUMENTO": 1234092728,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Erika Velandia Pedraza",
        "Correo": "erveland@bancolombia.com.co",
        "DOCUMENTO": 1032433149,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Angie Caterine Restrepo Fernández",
        "Correo": "ancarest@bancolombia.com.co",
        "DOCUMENTO": 1017259480,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Wilman Andrés Galeano Correa",
        "Correo": "wgaleano@bancolombia.com.co",
        "DOCUMENTO": 1036620350,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Simon agudelo ramirez",
        "Correo": "siagud@bancolombia.com.co",
        "DOCUMENTO": 3186834121,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Duque Cano",
        "Correo": "sanduque@bancolombia.com.co",
        "DOCUMENTO": 1037622068,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Camilo Andres Calderon Rocha",
        "Correo": "cacalder@bancolombia.com.co",
        "DOCUMENTO": 1010005272,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Johana Catalina Celis Herrera",
        "Correo": "jocelis@bancolombia.com.co",
        "DOCUMENTO": 43873950,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Wendy Carolina Sierra Sepulveda ",
        "Correo": "wcsierra@bancolombia.com.co",
        "DOCUMENTO": 1020457867,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Esteban Restrepo Jaillier",
        "Correo": "estrestr@bancolombia.com.co",
        "DOCUMENTO": 1020487330,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "David Aguirre",
        "Correo": "davidagu@bancolombia.com.co",
        "DOCUMENTO": 8358691,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Sergio Iván Molina Molina",
        "Correo": "semolina@bancolombia.com",
        "DOCUMENTO": 98631391,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Christian Camilo Cortes Franco",
        "Correo": "cccortes@bancolombia.com.co",
        "DOCUMENTO": 1152692015,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sara Lopez Hernandez",
        "Correo": "saralope@bancolombia.com.co",
        "DOCUMENTO": 1037672364,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sandra Catalina Soto Londoño",
        "Correo": "Ssoto@bancolombia.com.co",
        "DOCUMENTO": 1017150489,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniela Álvarez Zuluaga",
        "Correo": "danialva@bancolombia.com",
        "DOCUMENTO": 1020474128,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "DALIA YASMIN TORRES SUAREZ",
        "Correo": "DALTORRE@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 32205277,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Cristian David Alvis Ortiz",
        "Correo": "calvis@bancolombia.com.co",
        "DOCUMENTO": 1022439934,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Rayssa Lambis Araos",
        "Correo": "rmaraos@bancolombia.com.co",
        "DOCUMENTO": 1143374179,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jhon Harold Giraldo Cifuentes",
        "Correo": "jhgirald@bancolombia.com.co",
        "DOCUMENTO": 1152197658,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Camilo Tangarife Roman",
        "Correo": "juatangr@bancolombia.com.co",
        "DOCUMENTO": 3402060,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ruben Dario Cano Gómez",
        "Correo": "rdcano@bancolombia.com.co",
        "DOCUMENTO": 1017138848,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Elizabeth Ramirez Hoyos",
        "Correo": "elizrami@bancolombia.com.co",
        "DOCUMENTO": 43978086,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marcela Mejia Gallo",
        "Correo": "mmgallo@bancolombia.com.co",
        "DOCUMENTO": 43866510,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alejandro Vallejo Parra",
        "Correo": "aleval@bancolombia.com.co",
        "DOCUMENTO": 1088348033,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Alejandro Vela Muñoz",
        "Correo": "cvela@bancolombia.com.co",
        "DOCUMENTO": 1032508052,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "ALEXIS ENRIQUE GOENAGA MAURY",
        "Correo": "agoenaga@bancolombia.com.co",
        "DOCUMENTO": 72291477,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "CARLOS ARLEY RAMIREZ MARTINEZ",
        "Correo": "caarrami@bancolombia.com.co",
        "DOCUMENTO": 98705727,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Carlos Oliva Posada",
        "Correo": "joliva@bancolombia.com.co",
        "DOCUMENTO": 1017221539,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Lina Maria Sierra Gaviria",
        "Correo": "lmsierra@bancolombia.com.co",
        "DOCUMENTO": 43589051,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sara Rodriguez Ospina",
        "Correo": "sararodr@bancolombia.com.co",
        "DOCUMENTO": 3013664960,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Katheryn Espinoza",
        "Correo": "kespinoz@bancolombia.com.co",
        "DOCUMENTO": 1020448525,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "MARIA CAMILA CASTRO SÁNCHEZ ",
        "Correo": "marcasan@bancolombia.com.co",
        "DOCUMENTO": 1036947325,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Sosa Yepes",
        "Correo": "ssosa@bancolombia.com.co",
        "DOCUMENTO": 1000409734,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Eliana López Sierra",
        "Correo": "elialope@bancolombia.com.co",
        "DOCUMENTO": 1216714617,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Davinson Mellizo",
        "Correo": "dmellizo@bancolombia.com.co",
        "DOCUMENTO": 1061772353,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "José Daniel Avendaño Muñoz",
        "Correo": "jdavenda@bancolombia.com.co",
        "DOCUMENTO": 15343084,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Mauricio Andres Quijano Rodriguez",
        "Correo": "maquijan@bancolombia.com.co",
        "DOCUMENTO": 1140832004,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Victor Danilo Jojoa Ordoñez",
        "Correo": "vjojoa@bancolombia.com.co",
        "DOCUMENTO": 1085325100,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luis Guillermo Gómez Galeano",
        "Correo": "lugomez@bancolombia.com.co",
        "DOCUMENTO": 1007141532,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andrés Santiago Ortega Borrero",
        "Correo": "asortega@bancolombia.com.co",
        "DOCUMENTO": 1061749014,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luis Fernando Toro",
        "Correo": "luitoro@bancolombia.com.co",
        "DOCUMENTO": 98645757,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Gilberto José Vélez Gómez",
        "Correo": "gilbertojose.velez@salesforce.com",
        "DOCUMENTO": 1065646892,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yojan Andrés Alcaraz Pérez",
        "Correo": "yalcaraz@bancolombia.com.co",
        "DOCUMENTO": 1000894889,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Anny Berrio Blandón",
        "Correo": "anberrio@bancolombia.com.co",
        "DOCUMENTO": 1214734363,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Isabel Cristina Ruiz Muñoz",
        "Correo": "isaruiz@bancolombia.com.co",
        "DOCUMENTO": 43276441,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Fanor Gregorio Pertuz Galvan",
        "Correo": "fpertuz@bancolombia.com.co",
        "DOCUMENTO": 1004499428,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Oscar Enrique Garces Quintero",
        "Correo": "oegarces@bancolombia.com.co",
        "DOCUMENTO": 1126598160,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alejandra Maria Rojas Isaza",
        "Correo": "almrojas@bancolombia.com.co",
        "DOCUMENTO": 1039446241,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniel Leonardo Escobar Vargas",
        "Correo": "daescoba@grupobancolombia.com.co",
        "DOCUMENTO": 79748218,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "ALEX ANDRES CELY ESPITIA",
        "Correo": "aacely@bancolombia.com.co",
        "DOCUMENTO": 79553580,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sara Catalina giraldo alzate ",
        "Correo": "Sarcagir@bancolombia.com.co",
        "DOCUMENTO": 1036650164,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Nicolas Alejandro Suarez ",
        "Correo": "nasuarez@bancolombia.com.co",
        "DOCUMENTO": 1049653787,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Armando Carlos Palmera",
        "Correo": "apalmera@bancolombia.com.co",
        "DOCUMENTO": 1140844836,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luisa Fernanda Montoya",
        "Correo": "luismont@bancolombia.com.co",
        "DOCUMENTO": 1128454893,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Natalia Yuliet Rendón Galvis",
        "Correo": "nyrendon@bancolombia.com.co",
        "DOCUMENTO": 1152199939,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cristhian Chica Acosta",
        "Correo": "crchica@bancolombia.com.co",
        "DOCUMENTO": 1152466424,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "JORGE BERNAL DELGADO",
        "Correo": "joberna@bancolombia.com.co",
        "DOCUMENTO": 1083813154,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luz Maria Agudelo Mejia",
        "Correo": "lagudelo@bancolombia.com.co",
        "DOCUMENTO": 1017133872,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "David Alejandro Ijaji Guerrero",
        "Correo": "dijaji@bancolombia.com.co",
        "DOCUMENTO": 1017250858,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Dolph Brandon Hincapie Fernández ",
        "Correo": "dbhincap@bancolombia.com.co",
        "DOCUMENTO": 1001545453,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Loaiza ",
        "Correo": "Seloaiz@bancolombia.com.co",
        "DOCUMENTO": 1152448655,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Angela Maria Franco Patiño",
        "Correo": "anmafran@bancolombia.com.co",
        "DOCUMENTO": 1037581341,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Oscar Alejandro Estrada Pabon",
        "Correo": "osestrad@bancolombia.com.co",
        "DOCUMENTO": 1125806684,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Allison Ramirez Bermudez",
        "Correo": "allirami@bancolombia.com.co",
        "DOCUMENTO": 1017277048,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Andrés Giraldo Parra",
        "Correo": "carlgira@bancolombia.com.co",
        "DOCUMENTO": 1001034488,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Jose Tabares Manjarres",
        "Correo": "jtabares@bancolombia.com.co",
        "DOCUMENTO": 1097406197,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Angela Maritza Risueño Portilla",
        "Correo": "amrisuen@bancolombia.com.co",
        "DOCUMENTO": 36950939,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Edward Stiven Rubiano Aguilar",
        "Correo": "esrubian@bancolombia.com.co",
        "DOCUMENTO": 1018508956,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alejandro Durango Restrepo",
        "Correo": "aldurang@bancolombia.com.co",
        "DOCUMENTO": 1017198162,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Sanchez Largo",
        "Correo": "sesanc@bancolombia.com.co",
        "DOCUMENTO": 3137228786,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Valentina Vasquez Echavarria",
        "Correo": "valevasq@bancolombia.com.co",
        "DOCUMENTO": 1020471786,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago Velez Usma",
        "Correo": "santvele@bancolombia.com.co",
        "DOCUMENTO": 1214730722,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maryy Selena Garay Larios",
        "Correo": "mgaray@bancolombia.com.co",
        "DOCUMENTO": 1003040858,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diego Ignacio Hoyos Montaño",
        "Correo": "dihoyos@bancolombia.com.co",
        "DOCUMENTO": 8161090,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Javier Augusto Puello Cabarcas ",
        "Correo": "Jpuello@bancolombia.com ",
        "DOCUMENTO": 1050948551,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Uriel Alonso Florez Vargas",
        "Correo": "uflorez@bancolombia.com.co",
        "DOCUMENTO": 79921547,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "JORGE ANDRES GOMEZ MEJIA",
        "Correo": "JORANDGO@BANCOLOMBIA.COM.CO",
        "DOCUMENTO": 3104978161,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "John Alejandro Ospina Granados",
        "Correo": "johnospi@bancolombia.com.co",
        "DOCUMENTO": 1026150288,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cristo Jesus Carrillo Sanchez",
        "Correo": "ccarrill@bancolombia.com.co",
        "DOCUMENTO": 1005073997,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Emiro Velasquez",
        "Correo": "emirovelasquez@gmail.com",
        "DOCUMENTO": 704871,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Richard Javier Bedoya González",
        "Correo": "rjbedoya@bancolombia.com.co",
        "DOCUMENTO": 92694289,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Lina Maria Herrera Castano",
        "Correo": "limherre@bancolombia.com.co",
        "DOCUMENTO": 43979120,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Juan Camilo Agudelo Perez",
        "Correo": "jucagude@bancolombia.com.co",
        "DOCUMENTO": 1053781616,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Alejandro Madrid Uribe",
        "Correo": "almadri@bancolombia.com.co",
        "DOCUMENTO": 1152209462,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Freddy Santiago Llano Metrio",
        "Correo": "fllano@bancolombia.com.co",
        "DOCUMENTO": 1036664758,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andrés Felipe Bedoya Alzate",
        "Correo": "abedoya@bancolombia.com.co",
        "DOCUMENTO": 1020423782,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Richard Javier Zamora Herrera",
        "Correo": "rjzamora@bancolombia.com.co",
        "DOCUMENTO": 1234645197,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Daniel Bello Hernandez",
        "Correo": "cbello@bancolombia.com.co",
        "DOCUMENTO": 1143410293,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Oscar Yovany Chauza Narvaez",
        "Correo": "ochauza@bancolombia.com.co",
        "DOCUMENTO": 1004594025,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Bautista Moreno Ballesteros",
        "Correo": "jbmoreno@bancolombia.com.co",
        "DOCUMENTO": 1020807432,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Susana Arboleda Ceballos",
        "Correo": "sacebal@bancolombia.com.co",
        "DOCUMENTO": 1152441435,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juliana Aguilar Suárez",
        "Correo": "jasuare@bancolombia.com.co",
        "DOCUMENTO": 1017240060,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Paula andrea zapata escobar",
        "Correo": "pauanzap@bancolombia.com.co",
        "DOCUMENTO": 1020475766,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Esteban Zabala Daza",
        "Correo": "jzabala@bancolombia.com.co",
        "DOCUMENTO": 1214721110,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "daniel esteban vasquez",
        "Correo": "daevasqu@bancolombia.com.co",
        "DOCUMENTO": 1036612963,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luisa Fernanda Quiceno Jimenez",
        "Correo": "luquicen@bancolombia.com.co",
        "DOCUMENTO": 1128278915,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cristian Jhoan Millan Arteaga",
        "Correo": "cmillan@bancolombia.com.co",
        "DOCUMENTO": 1005058588,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Omar Rodriguez Ropero",
        "Correo": "omrodri@bancolombia.com.co",
        "DOCUMENTO": 1007335893,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Angelica Maria Moronta Berrueta",
        "Correo": "amoronta@bancolombia.com.co",
        "DOCUMENTO": 826294,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "JUAN ESTEBAN OROZCO SIERRA",
        "Correo": "juorozco@bancolombia.com.co",
        "DOCUMENTO": 71378658,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andres Felipe Guzman Londoño",
        "Correo": "anguzman@bancolombia.com.co",
        "DOCUMENTO": 1097731891,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Bryan Stidh Calero Giraldo",
        "Correo": "bcalero@bancolombia.com.co",
        "DOCUMENTO": 1113669890,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diego Armando Sierra Sierra",
        "Correo": "diasierr@bancolombia.com.co",
        "DOCUMENTO": 3107479650,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Rosa Johana López Pinto",
        "Correo": "rlpinto@bancolombia.com.co",
        "DOCUMENTO": 1012389282,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Robinson Julian Medina Espinosa",
        "Correo": "romedina@bancolombia.com.co",
        "DOCUMENTO": 1056803989,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Victoria Eugenia Valencia Jaramillo",
        "Correo": "vicvalen@wenia.com.co",
        "DOCUMENTO": 43976917,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Johan Esteban Agudelo Vasquez",
        "Correo": "joesagud@bancolombia.com.co",
        "DOCUMENTO": 1193435527,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Gonzalez",
        "Correo": "Segonz@bancolombia.com.co",
        "DOCUMENTO": 1036966662,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Stiven Agudelo Tabares",
        "Correo": "stagudel@bancolombia.com.co",
        "DOCUMENTO": 1036686640,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Bryan Steven Biojo Romero",
        "Correo": "bbiojo@bancolombia.com.co",
        "DOCUMENTO": 1107511488,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Valentina Cano Gómez",
        "Correo": "valecano@bancolombia.com.co",
        "DOCUMENTO": 1039025030,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jennifer Rojano Jimenez",
        "Correo": "jrojano@bancolombia.com.co",
        "DOCUMENTO": 55233437,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Monica Isabel Oquendo ",
        "Correo": "mioquend@bancolombia.com.co",
        "DOCUMENTO": 1036602357,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Santiago García Gil",
        "Correo": "Sagarci@bancolombia.com.co",
        "DOCUMENTO": 1053836038,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alexander Lopera Cano",
        "Correo": "allopera@bancolombia.com.co",
        "DOCUMENTO": 1020399634,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Anhy Shirley Espinosa Velásquez",
        "Correo": "asespino@bancolombia.com.co",
        "DOCUMENTO": 1128441125,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "jeison alexander nausa gomez",
        "Correo": "jnausa@bancolombia.com.co",
        "DOCUMENTO": 1052401776,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jonathan Steven Ramirez Naranjo",
        "Correo": "jostrami@bancolombia.com.co",
        "DOCUMENTO": 1097405605,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jose Julian Garcia Vargas",
        "Correo": "jojgarci@bancolombia.com.co",
        "DOCUMENTO": 1000308070,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Frederick Rico",
        "Correo": "frico@bancolombia.com.co",
        "DOCUMENTO": 1127631093,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jorge Luis Arango Morales",
        "Correo": "jlarango@bancolombia.com.co",
        "DOCUMENTO": 1152188306,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Michael Joel Herrera Bermudez",
        "Correo": "mijoherr@bancolombia.com.co",
        "DOCUMENTO": 831267,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Anderson Alberto Baena Velez",
        "Correo": "abaena@bancolombia.com.co",
        "DOCUMENTO": 3594155,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jhonny Sierra Parra",
        "Correo": "jhsier@bancolombia.com.co",
        "DOCUMENTO": 1115187219,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andrea Marín Cadavid",
        "Correo": "andrmari@bancolombia.com.co",
        "DOCUMENTO": 1152450292,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Uribe",
        "Correo": "carlurib@bancolombia.com.co",
        "DOCUMENTO": 10007619,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Zuluaga Muñoz",
        "Correo": "sebzulua@bancolombia.com.co",
        "DOCUMENTO": 1037608980,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luisa Carolina Jimenez Jimenez",
        "Correo": "lucjimen@bancolombia.com.co",
        "DOCUMENTO": 1035862982,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "John Jairo Gaviria Escobar",
        "Correo": "jogaviri@bancolombia.com.co",
        "DOCUMENTO": 71753880,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Natalia Marin Morales",
        "Correo": "nmarin@nequi.com",
        "DOCUMENTO": 39456086,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Yenifer Torres Builes",
        "Correo": "yentorre@bancolombia.com.co",
        "DOCUMENTO": 1020408888,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Maria Fernanda Ospina Perez",
        "Correo": "Mariospi@bancolombia.com.co",
        "DOCUMENTO": 1152467152,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jorge Ivan Alonso Echeverri",
        "Correo": "jialonso@bancolombia.com.co",
        "DOCUMENTO": 1136887435,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "FRANKLIN OMAR BASTIDAS JIMENEZ",
        "Correo": "fbastida@bancolombia.com.co",
        "DOCUMENTO": 1723516215,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Natacha Gutiérrez Tamayo",
        "Correo": "nataguti@bancolombia.com.co",
        "DOCUMENTO": 1152201949,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sergio Alberto Mejía Vélez ",
        "Correo": "Serjmeji@bancolombia.com.co",
        "DOCUMENTO": 71375058,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Brayan Tabares Hidalgo",
        "Correo": "btabares@bancolombia.com.co",
        "DOCUMENTO": 1004798563,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Rafael Ignacio Ariza Alvarez",
        "Correo": "rariza@bancolombia.com.co",
        "DOCUMENTO": 1023874600,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Anyi Lorena Galeano Marin",
        "Correo": "anlgalea@bancolombia.com.co",
        "DOCUMENTO": 1020469864,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Luis Alberto Méndez Suarez",
        "Correo": "lualmend@bancolombia.com.co",
        "DOCUMENTO": 1102865630,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marta Lucia Hincapié Saldarriaga",
        "Correo": "marthinc@bancolombia.com.co",
        "DOCUMENTO": 1035862377,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Cecilia Alexandra Ortiz Mejia",
        "Correo": "cealorti@bancolombia.com.co",
        "DOCUMENTO": 104162342,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alejandra Cardona Perez",
        "Correo": "alejacar@bancolombia.com.co",
        "DOCUMENTO": 1037597956,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jenny Manrique Caballero ",
        "Correo": "Jmanriqu@bancolombia.com.co",
        "DOCUMENTO": 32747697,
        "Cuota": 200000,
        "CONTRIBUCIÓN": 210000
      },
      {
        "Nombre": "Daniel Stiven Aguirre Gómez ",
        "Correo": "danaguir@bancolombia.com.co",
        "DOCUMENTO": 1035232117,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "William Armando Mendoza Hernandez",
        "Correo": "wiamendoza@bancolombia.com.co",
        "DOCUMENTO": 1101691415,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Abish Andrea Jaramillo Arenas",
        "Correo": "abjarami@bancolombia.com.co",
        "DOCUMENTO": 43267813,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Catalina García Arango",
        "Correo": "catagarc@bancolombia.com.co",
        "DOCUMENTO": 43869944,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "oscar andres urrego velasquez",
        "Correo": "ourrego@bancolombia.com.co",
        "DOCUMENTO": 3014364307,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "daniel esteban bedoya medina",
        "Correo": "daniebed@bancolombia.com.co",
        "DOCUMENTO": 1001238089,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Alberto Osorio Jaramillo",
        "Correo": "cojaram@bancolombia.com.co",
        "DOCUMENTO": 1037603979,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Juliana Villa Londoño",
        "Correo": "juliavil@bancolombia.com.co",
        "DOCUMENTO": 1037598765,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Ramiro Castillo Oleas",
        "Correo": "Racasti@thoughtworks.com",
        "DOCUMENTO": "A4749441",
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "John Mario Cabrera solarte",
        "Correo": "jomcabre@bancolombia.com.co",
        "DOCUMENTO": 1214732836,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diana Catalina Calle Gonzalez",
        "Correo": "diccalle@bancolombia.com.co",
        "DOCUMENTO": 21562732,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marisol Ramirez Henao",
        "Correo": "marhena@bancolombia.com.co",
        "DOCUMENTO": 1053813154,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Mateo Garcia Carvajal",
        "Correo": "mateogar@bancolombia.com.co",
        "DOCUMENTO": 1037604897,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Claudia Eugenia Gallego Soto",
        "Correo": "clegalle@bancolombia.com.co",
        "DOCUMENTO": 43874601,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Heidi Andrea Restrepo Castrillón",
        "Correo": "hrestrep@bancolombia.com.co",
        "DOCUMENTO": 43111147,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Julian Rodrigo Caro Cardenas",
        "Correo": "jrcaro@bancolombia.com.co",
        "DOCUMENTO": 1054709572,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marcela Lopez Rendon",
        "Correo": "marclope@bancolombia.com.co",
        "DOCUMENTO": 1039461009,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Julieth Mejia Higuita",
        "Correo": "Julimeji@bancolombia.com.co",
        "DOCUMENTO": 1026135593,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan David Serna Amaya",
        "Correo": "jdserna@bancolombia.com.co",
        "DOCUMENTO": 1214727115,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "conrado alonso correa carmona ",
        "Correo": "coacorre@bancolombia.com.co",
        "DOCUMENTO": 1035420827,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Rafael Tigreros Colmenares",
        "Correo": "rtigrero@bancolombia.com.co",
        "DOCUMENTO": 1092362719,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alan Stiven Camacho Restrepo",
        "Correo": "ascamach@bancolombia.com.co",
        "DOCUMENTO": 3053936267,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diego Alejandro Restrepo Pérez",
        "Correo": "diegaler@bancolombia.com.co",
        "DOCUMENTO": 1027892651,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Steven Escobar Castaño",
        "Correo": "stescob@bancolombia.com.co",
        "DOCUMENTO": 1193524969,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Camilo Garcia Arias",
        "Correo": "jcgarias@bancolombia.com.co",
        "DOCUMENTO": 1053874092,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Dario Alexander Morales Velasco",
        "Correo": "daamoral@bancolombia.com.co",
        "DOCUMENTO": 1064432559,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Nicolas Alejandro Cabrales Vera",
        "Correo": "ncabrale@bancolombia.com.co",
        "DOCUMENTO": 80248198,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "George Sebastián Parra Macías",
        "Correo": "gsparra@bancolombia.com.co",
        "DOCUMENTO": 1012400378,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Mateo Loaiza Agudelo",
        "Correo": "matloaiz@bancolombia.com.co",
        "DOCUMENTO": 1000661457,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Nidy Tatiana Muñeton Hernandez",
        "Correo": "nmuneton@bancolombia.com.co",
        "DOCUMENTO": 1020468049,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniel De La Pava Ruiz",
        "Correo": "ddelapav@bancolombia.com.co",
        "DOCUMENTO": 1193055052,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "juan Daniel lopera llano",
        "Correo": "julopell@bancolombia.com.co",
        "DOCUMENTO": 71387398,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "william guillermo moreno puerta",
        "Correo": "wimoreno@bancolombia.com.co",
        "DOCUMENTO": 1152188370,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diana Marcela Cuartas Graciano",
        "Correo": "dcuartas@bancolombia.com.co",
        "DOCUMENTO": 1128427557,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marco Antonio Jimenez Soto",
        "Correo": "maanjime@bancolombia.com.co",
        "DOCUMENTO": 1040746446,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Velez Cardona",
        "Correo": "Sebvel@bancolombia.com.co",
        "DOCUMENTO": 1040051735,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andres Felipe Henao Lopez",
        "Correo": "andhenao@bancolombia.com.co",
        "DOCUMENTO": 1047966509,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Antonio Soto Cabrera",
        "Correo": "juasoto@bancolombia.com.co",
        "DOCUMENTO": 123216357,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Sebastian Botero Sanchez",
        "Correo": "Seboter@bancolombia.com.co",
        "DOCUMENTO": 1053867109,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "luis gabriel bedoya saldarriaga",
        "Correo": "lgbedoya@bancolombia.com.co",
        "DOCUMENTO": 3043399685,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Laura Dayana González Martínez",
        "Correo": "laurgonz@bancolombia.com.co",
        "DOCUMENTO": 1049657921,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jonathan David Yaguachi Pereira",
        "Correo": "jyaguach@bancolombia.com.co",
        "DOCUMENTO": 825290,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Dylan Mateo Llano Jaramillo ",
        "Correo": "dyllano@bancolombia.com.co",
        "DOCUMENTO": 1000549500,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Samuel Gil Arboleda",
        "Correo": "samgil@bancolombia.com.co",
        "DOCUMENTO": 1037654073,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Carlos Eduardo Ciro Piedrahita",
        "Correo": "cciro@bancolombia.com.co",
        "DOCUMENTO": 8161549,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Karen Melissa Ramírez Casas ",
        "Correo": "Kmramire@bancolombia.com.co",
        "DOCUMENTO": 1000752146,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Marcos Jardel Murillo Hernández ",
        "Correo": "marcmuri@bancolombia.com.co",
        "DOCUMENTO": 1017238240,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Edwin Fernando Gaviria Obando",
        "Correo": "efgaviri@bancolombia.com.co",
        "DOCUMENTO": 3006186596,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Alberto Lafaurie Giraldo",
        "Correo": "alafauri@bancolombia.com.co",
        "DOCUMENTO": 98669606,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "yenifer orozco sepulveda",
        "Correo": "yeorozco@bancolombia.com.co",
        "DOCUMENTO": 1214745473,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Shara García",
        "Correo": "shgarci@bancolombia.com.co",
        "DOCUMENTO": 1000634242,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Edgar Alonso Ortiz",
        "Correo": "Edalorti@bancolombia.com.co -",
        "DOCUMENTO": 1036675569,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Jonathan Ortiz",
        "Correo": "jpaez@bancolombia.com.co",
        "DOCUMENTO": 1077461458,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Gabriel González ",
        "Correo": "ggonzale@bancolombia.com.co",
        "DOCUMENTO": 71372000,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Juan Camilo Londoño",
        "Correo": "jlzapata@bancolombia.com.co",
        "DOCUMENTO": 1017211470,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "María José Torres Pertuz",
        "Correo": "majotorr@bancolombia.com.co",
        "DOCUMENTO": 1128471718,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Leidy Tatiana Mejia Londoño",
        "Correo": "leidmeji@bancolombia.com.co",
        "DOCUMENTO": 1017205556,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Andrés Mauricio Zapata Potes",
        "Correo": "anmazapa@bancolombia.com.co",
        "DOCUMENTO": 14468093,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Pablo Ramirez",
        "Correo": "jrecheve@bancolombia.com.co",
        "DOCUMENTO": 1152223760,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Juan Pablo Lopez Chavarriaga",
        "Correo": "juapablo@bancolombia.com.co",
        "DOCUMENTO": 1000089787,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Daniel Cordoba Arias",
        "Correo": "dacordob@bancolombia.com.co",
        "DOCUMENTO": 1035865748,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Oscar Mauricio Quintero Bonilla",
        "Correo": "osquinte@bancolombia.com.co",
        "DOCUMENTO": 1036598529,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Sebastian Sanchez Jaramillo",
        "Correo": "sebasanc@bancolombia.com.co",
        "DOCUMENTO": 1037592395,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      },
      {
        "Nombre": "Diana Patricia Durango Zapata",
        "Correo": "ddurango@bancolombia.com.co",
        "DOCUMENTO": 1128429628,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Yeisson Alejandro Arroyave Valle",
        "Correo": "yarroyav@bancolombia.com.co",
        "DOCUMENTO": 3380924,
        "Cuota": 250000,
        "CONTRIBUCIÓN": 262500
      },
      {
        "Nombre": "Felipe Restrepo Fernandez",
        "Correo": "felrestr@bancolombia.com.co",
        "DOCUMENTO": 71775287,
        "Cuota": 350000,
        "CONTRIBUCIÓN": 367500
      },
      {
        "Nombre": "Melina Penagos Restrepo",
        "Correo": "mpenago@bancolombia.com.co",
        "DOCUMENTO": 1001017855,
        "Cuota": 180000,
        "CONTRIBUCIÓN": 189000
      }
    ]

    data.forEach(async (user: any) => {
      user.DOCUMENTO = user.DOCUMENTO.toString()
      await this.firebase.setUser(user)
    })
  }
}
