/* Configurador simplificado para el modulo ESP8266 mediante comandos AT
 * Puede cambiar segun la versión del Firmware. 
 * Este programa trabaja perfectamente con el firmware 0018000902. 
 * Si quieres actualizar el firmware de tu modulo ESP8266 tienes toda 
 * la informacion sobre el tema en:
 * https://www.infotronikblog.com/2016/12/actualizar-el-firmware-del-esp8266-con.html
 * Autor: Carlos Muñoz
 * Pagina web: https://www.infotronikblog.com
 */
#include <SoftwareSerial.h>

SoftwareSerial mySerial(3, 4); // Tx , Rx
#define MAIN_MENU 0
#define PAGE_STATUS 1
#define PAGE_RESET 2
#define PAGE_BAUDRATE 3
#define PAGE_MANAGE_CONNECTIONS 4
#define PAGE_CHANGE_MODE 5
#define PAGE_START_SERVER 6
#define PAGE_SHOW_FIRMWARE 7
#define PAGE_ABOUT 8

int8_t currIn = -1;
int8_t currSt = -1;
char quote = '"';
String serialStr, tmpName, Name, Pass;

void setup()
{
  Serial.begin(9600);
  
  // Recuerda poner aquí el Baudrate al que esta configurado el modulo
  mySerial.begin(115200); 
  serialStr = "";
  currIn = 0;
  currSt = 0;
  Serial.println(F("Configurador para modulo ESP8266 Mediante menu por Infotronikblog"));
}
void loop()
{
  if (Serial.available()) {
    serialStr = (Serial.readStringUntil('\n'));
    serialStr.trim();

    Serial.println(serialStr);
    // Cualquier tecla no numerica resultara "0"
    currIn = serialStr.toInt();  
  }

  // En caso de respuesta o entrada de de datos del modulo desde el modulo
  if (mySerial.available()) {
    while (mySerial.available()) {
      tmpName = mySerial.readString();
      tmpName.trim();
      Serial.println(tmpName);
      delay(150);
    }
  }

  if (currIn >= 0) {
    // Menu de seleccion
    switch (currSt) {
      // Menu principal 
      case MAIN_MENU: {       
          switch (currIn) { //selecciona una entrada del menu
            case 0:
              delay (1000);
              Serial.println(F("----------------------------------------------------------"));
              Serial.println(F("Selecciona una opcion de la lista:"));
              Serial.println(F("  1- Estado del Modulo ESP8266:"));
              Serial.println(F("  2- Reiniciar modulo ESP8266"));
              Serial.println(F("  3- Configurar el Baudrate"));
              Serial.println(F("  4- Configurar WiFi"));
              Serial.println(F("  5- Cambiar modo de conexion"));
              Serial.println(F("  6- Poner en modo servidor (Puerto 80)"));
              Serial.println(F("  7- Firmware"));
              Serial.println(F("  8- Sobre este programa"));
              Serial.println(F("     Pulsa la tecla 0 o escribe #menu para volver a este menu"));
              Serial.print(F("Opcion No. "));
              currIn = -1;  // Mandamos un -1 para entrar en un estado indefinido y permanecer en el menu.
              break;
            case 1:
              currSt = 1;
              currIn = 0;
              break;
            case 2:
              currSt = 2;
              currIn = 0;
              break;
            case 3:
              currSt = 3;
              currIn = 0;
              break;
            case 4:
              currSt = 4;
              currIn = 0;
              break;
            case 5:
              currSt = 5;
              currIn = 0;
              break;
            case 6:
              currSt = 6;
              currIn = 0;
              break;
            case 7:
              currSt = 7;
              currIn = 0;
              break;
              case 8:
              currSt = 8;
              currIn = 0;
              break;
            default:
              Serial.println (F("No es una entrada valida, por favor elige una de la lista"));
              currSt = 0;
              currIn = 0;
              break;
          }
          break;
        }
      // Muestra el estado del modulo  (AT OK).
      case PAGE_STATUS: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Estado del Modulo ESP8266:"));
          delay(500);
          mySerial.print("AT\r\n");
          currSt = 0;
          currIn = -1;
          break;
        }
      // Reinicia el Modulo ( AT+RST OK System Ready, Vendor:ai-thinker.com)
      case PAGE_RESET: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Reiniciando el modulo..."));
          delay(500);
          mySerial.print("AT+RST\r\n");
          currSt = 0;
          currIn = -1;
          break;
        }
      // Submenu para cambiar el Baudrate
      case PAGE_BAUDRATE: {
          switch (currIn) {
            case 0:
              delay(1000);
              Serial.println(F("----------------------------------------------------------"));
              Serial.println(F("Elija un nuevo Baudrate o dejelo en blanco para omitir el cambio. Posibles opciones:"));
              Serial.println(F("(1) Muestra el Baudrate actual"));
              Serial.println(F("(2) 9600      (3) 19200     (4) 38400     (5) 74880"));
              Serial.println(F("(6) 115200    (7) 230400    (8) 460800    (9) 921600"));
              Serial.println(F("(10) Para salir de este menu"));
              Serial.print(F("Opcion No. "));
              currIn = -1;
              break;
            case 1:
              currSt = 31;
              currIn = 0;
              break;
            case 2:
              currSt = 32;
              currIn = 0;
              break;
            case 3:
              currSt = 33;
              currIn = 0;
              break;
            case 4:
              currSt = 34;
              currIn = 0;
              break;
            case 5:
              currSt = 35;
              currIn = 0;
              break;
            case 6:
              currSt = 36;
              currIn = 0;
              break;
            case 7:
              currSt = 37;
              currIn = 0;
              break;
            case 8:
              currSt = 38;
              currIn = 0;
              break;
            case 9:
              currSt = 39;
              currIn = 0;
              break;
            case 10:
              currSt = 40;
              currIn = 0;
              break;
            default:
              Serial.println (F("No es una entrada valida, por favor elige una de la lista"));
              currSt = 3;
              currIn = 0;
              break;
          }
          break;
        }
      // Submenu para gestion de las conexiones WiFi
      case PAGE_MANAGE_CONNECTIONS: {
          switch (currIn) {
            case 0:
              delay (500);
              Serial.println(F("----------------------------------------------------------"));
              Serial.println(F("Selecciona una opcion de la lista:"));
              Serial.println(F("  1- Buscar redes WiFi"));
              Serial.println(F("  2- Conectarse a una red WiFi"));
              Serial.println(F("  3- Desconectarse de un punto de acceso (AP)"));
              Serial.println(F("  4- Ver IP"));
              Serial.println(F("  5- Atras..."));
              Serial.println(F("Opcion No. "));
              currIn = -1;  // we set to -1 to avoid entering into the state machine indefinately.
              break;
            case 1:
              currSt = 41;
              currIn = 0;
              break;
            case 2:
              currSt = 42;
              currIn = 0;
              break;
            case 3:
              currSt = 43;
              currIn = 0;
              break;
            case 4:
              currSt = 44;
              currIn = 0;
              break;
            case 5:
              currSt = 45;
              currIn = 0;
              break;
            default:
              Serial.println (F("No es una entrada valida, por favor elige una de la lista"));
              currSt = 4;
              currIn = 0;
              break;
          }
          break;
        }
      // Submenu para cambiar el modo de conexion
      case PAGE_CHANGE_MODE: {
          switch (currIn) { // based on the user input, selects the corresponding operation and therefore the next state
            case 0:
              delay (1000);
              Serial.println(F("----------------------------------------------------------"));
              Serial.println(F("Selecciona una opcion de la lista:"));
              Serial.println(F("  1- Muestra el modo actual"));
              Serial.println(F("  2- Cambiar modo de conexion"));
              Serial.println(F("  3- Atras..."));
              Serial.println(F("Opcion No. "));
              currIn = -1;  // we set to -1 to avoid entering into the state machine indefinately.
              break;
            case 1:
              currSt = 51;
              currIn = 0;
              break;
            case 2:
              currSt = 52;
              currIn = 0;
              break;
            case 3:
              currSt = 0;
              currIn = 0;
              break;
            default:
              Serial.println (F("No es una entrada valida, por favor elige una de la lista"));
              currSt = 0;
              currIn = 5;
              break;
          }
          break;
        }
      // Submenu para encender/apagar el servidor
      case PAGE_START_SERVER: {
          switch (currIn) {
            case 0:
              delay (1000);
              Serial.println(F("----------------------------------------------------------"));
              Serial.println(F("Selecciona una opcion de la lista:"));
              Serial.println(F("  1- Enciende el servidor"));
              Serial.println(F("  2- Apaga el servidor"));
              Serial.println(F("  3- Atras..."));
              Serial.println(F("Opcion No. "));
              currIn = -1;  // we set to -1 to avoid entering into the state machine indefinately.
              break;
            case 1:
              currSt = 61;
              currIn = 0;
              break;
            case 2:
              currSt = 62;
              currIn = 0;
              break;
            case 3:
              currSt = 0;
              currIn = 0;
              break;
            default:
              Serial.println (F("No es una entrada valida, por favor elige una de la lista"));
              currSt = 0;
              currIn = 6;
              break;
          }
          break;
        }
      // Muestra el firmware del modulo (AT+GMR, 0018000902, OK)
      case PAGE_SHOW_FIRMWARE: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("El Firmware del modulo es:"));
          delay(500);
          mySerial.print("AT+GMR\r\n");
          currSt = 0;
          currIn = -1;
          break;
        }
        case PAGE_ABOUT: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Sobre este programa:"));
          Serial.println(F("Configurador de modulo ESP8266 con comandos AT"));
          Serial.println(F("mediante una simple interfaz de menus."));
          Serial.println(F("Email: peyutron@gmail.com"));
          currSt = 0;
          currIn = -1;
          break;
        }
      // Muestra el Baudrate actual AT+CIOBAUD=?, +CIOBAUD:(xxxx-xxxx), OK
      case 31: {
          Serial.println (F("El baudrate actual es..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=?\r\n");
          delay(250);
          currSt = 3;
          currIn = 0;
          break;
        }
      // Cambia el baudrate a 9600
      case 32: {
          Serial.println (F("Cambiando el baudrate a 9600..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=9600\r\n");
          delay(250);
          mySerial.begin(9600);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 33: {
          Serial.println (F("Cambiando el baudrate a 19200..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=19200\r\n");
          delay(250);
          mySerial.begin(19200);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 34: {
          Serial.println (F("Cambiando el baudrate a 38400..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=38400\r\n");
          delay(250);
          mySerial.begin(38400);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 35: {
          Serial.println (F("Cambiando el baudrate a 74880..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=74880\r\n");
          delay(250);
          mySerial.begin(57600);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 36: {
          Serial.println (F("Cambiando el baudrate a 115200..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=115200\r\n");
          delay(250);
          mySerial.begin(115200);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 37: {
          Serial.println (F("Cambiando el baudrate a 234000..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=234000\r\n");
          delay(250);
          mySerial.begin(230400);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 38: {
          Serial.println (F("Cambiando el baudrate a 460800..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=460800\r\n");
          delay(250);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 39: {
          Serial.println (F("Cambiando el baudrate a 921600..."));
          delay(500);
          mySerial.print ("AT+CIOBAUD=921600\r\n");
          delay(250);
          mySerial.begin(921600);
          currSt = 3;
          currIn = 0;
          break;
        }
      case 40: {
          currSt = 0;
          currIn = 0;
          break;
        }
      // Busca las redes WiFi disponibles
      case 41: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Buscando redes WiFi..."));
          delay(500);
          mySerial.print("AT+CWLAP\r\n");
          currSt = 4;
          currIn = -1;
          break;
        }
      case 42: {
          delay (1000);
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Conectarse a una red WiFi:"));
          Serial.println(F("Introduce el nombre de la red (SSID)"));
          while (!Serial.available());
          tmpName = (Serial.readStringUntil('\n'));
          tmpName.trim();
          if (tmpName == "") {
            Serial.println(F("no se ha escrito ningun nombre"));
            currSt = 4;
            currIn = 0;
            break;
          }
          else {
            Name = tmpName;
            Serial.print("Nombre de la red: ");
            Serial.println(Name);
            Serial.println(F("Introduce la contraseña (Pass)"));
          }
          while (!Serial.available());
          tmpName = (Serial.readStringUntil('\n'));
          tmpName.trim();
          if (tmpName == "") {
            Serial.println(F("no se ha escrito ningun Password"));
            currSt = 4;
            currIn = 0;
            break;
          }
          else {
            Pass = tmpName;
            Serial.print("Password: ");
            Serial.println("");
          }
          tmpName = "AT+CWJAP=" + (quote + Name + quote) + "," + (quote + Pass + quote) + "\r\n";
          mySerial.print(tmpName);
          Name = ("");
          Pass = ("");
          currSt = 4;
          currIn = -1;
          break;
        }
      //Se desconecta del punto de acceso seleccionado
      case 43: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Desconectarse de un putdo de acceso ( AP )"));
          delay (500);
          mySerial.print("AT+CWQAP\r\n");
          delay(1000);
          currSt = 4;
          currIn = -1;
          break;
        }
      // Muestra la IP de dispositivo
      case 44: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("IP del dispositivo"));
          // Serial.println(F("MAC del dispositivo"));
          Serial.println(F("IP de la red"));
          // Serial.println(F("MAC del dispositivo"));
          Serial.println(F("Obteniendo IP..."));
          delay(500);
          mySerial.print("AT+CIFSR\r\n");
          currSt = 4;
          currIn = -1;
          break;
        }
      case 45: {
          currSt = 0;
          currIn = 0;
          break;
        }
      case 51: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Muestra el modo actual del modulo..."));
          Serial.println(F("(1)STA   (2)AP   (3) Ambos"));
          delay(500);
          mySerial.print("AT+CWMODE?\r\n");
          delay(250);
          currSt = 0;
          currIn = 5;
          break;
        }
      // Submenu para cambiar el modo de conexion (STA AP Ambos)
      case 52: {
          switch (currIn) {
            case 0:
              delay (1000);
              Serial.println(F("----------------------------------------------------------"));
              Serial.println(F("Selecciona una opcion de la lista:"));
              Serial.println(F("  1- Modo STA"));
              Serial.println(F("  2- Modo AP"));
              Serial.println(F("  3- Ambos"));
              Serial.println(F("  4- Atras..."));
              Serial.println(F("Opcion No. "));
              currIn = -1;  // we set to -1 to avoid entering into the state machine indefinately.
              break;
            case 1:
              delay(500);
              mySerial.print("AT+CWMODE=1\r\n");
              delay(250);
              currIn = 0;
              break;
            case 2:
              delay(500);
              mySerial.print("AT+CWMODE=2\r\n");
              delay(250);
              currIn = 0;
              break;
            case 3:
              delay(500);
              mySerial.print("AT+CWMODE=3\r\n");
              delay(250);
              currIn = 0;
              break;
            case 4:
              currSt = 0;
              currIn = 5;
              break;
            default:
              Serial.println (F("No es una entrada valida, por favor elige una de la lista"));
              // currSt = 0;
              currIn = 0;
              break;
          }
          break;
        }
      // Cambia a multiples conexiones y arranca el servidor en modo servidor en el puerto 80
      case 61: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("configurando multiples conexiones y servidor en puerto 80..."));
          delay(500);
          mySerial.print("AT+CIPMUX=1\r\n");
          delay(250);
          mySerial.print("AT+CIPSERVER=1,80\r\n");
          currSt = 0;
          currIn = 6;
          break;
        }
      // Apaga el servidor
      case 62: {
          Serial.println(F("----------------------------------------------------------"));
          Serial.println(F("Desconectando servidor..."));
          delay(500);
          mySerial.print("AT+CIPMUX=0\r\n");
          delay(250);
          mySerial.print("AT+CIPSERVER=0,80\r\n");
          currSt = 0;
          currIn = 6;
          break;
        }
      default: {
          Serial.println(F("no es una entrada valida, elige una de la lista"));
          currSt = 0;
          currIn = 0;
          break;
        }
    }

  }
  serialStr = "";
}