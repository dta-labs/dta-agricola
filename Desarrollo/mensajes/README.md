# DTA-Mensaje

Aplicación web responsiva para enviar solicitudes HTTPS a diferentes servicios de notificación y control de dispositivos IoT.

## Características

- ✅ **Responsiva**: Compatible con dispositivos móviles, tablets y desktops
- ✅ **Interfaz moderna**: Diseño limpio con Bootstrap 5
- ✅ **Múltiples tipos de solicitud**: Notificación, Sensor, Pivote y Sectorial
- ✅ **Validación de formulario**: Validación en tiempo real
- ✅ **Gestión de errores**: Mensajes claros de éxito y error
- ✅ **Visualización de URL**: Muestra la URL enviada para debugging

## Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a Internet

## Instalación

1. Descargar o clonar los archivos en tu servidor web
2. Asegurarse de que los siguientes archivos estén en el mismo directorio:
   - `index.html`
   - `styles.css`
   - `app.js`

3. Abrir `index.html` en tu navegador

## Uso

### 1. Seleccionar Tipo de Solicitud

En el dropdown "Tipo de Solicitud", selecciona uno de estos tipos:

- **Notificación**: Envía notificaciones por correo
- **Sensor**: Recopila datos de sensores
- **Pivote**: Controla sistemas de pivote
- **Sectorial**: Gestiona sistemas sectoriales

### 2. Completar los Datos

#### Para Notificación:
- **ID del Dispositivo**: Identificador único del dispositivo
- **Correo del Usuario**: Dirección de correo del destinatario
- **Contenido**: Mensaje a enviar

#### Para Sensor, Pivote y Sectorial:
- **ID del Dispositivo**: Identificador único del dispositivo
- **Contenido/Data**: Datos específicos a enviar (no requerido para Pivote)

### 3. Enviar

Haz clic en "Enviar Solicitud" para procesar el envío.

## Tipos de Solicitudes

### Notificación
```
https://dtaamerica.com/ws/push.php?user=<correo>&txt=<contenido>
```

### Sensor
```
http://dtaamerica.com/ws/sensor_v6.php?id=<id>&data=[<contenido>]&rx=Ok&si=17&qos=0
```

### Pivote
```
https://dtaamerica.com/ws/comm_v3.php?id=<id>&st=OFF&sa=false&di=FF&vo=false&ar=OFF&sp=0&pr=0.00&po=0.0&la=0.00000&lo=0.00000&er=0&rx=Ok&si=0
```

### Sectorial
```
http://dtaamerica.com/ws/commj_v4.php?id=<id>&st=OFF&dt=[<contenido>]&rx=ini&si=30&qos=0
```

## Estructura de Archivos

```
probarAlarma/
├── index.html      # Página principal con estructura HTML
├── styles.css      # Estilos CSS y diseño responsivo
├── app.js          # Lógica de la aplicación
└── README.md       # Este archivo
```

## Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos, animaciones y flexbox/grid
- **JavaScript**: Lógica de negocio y manejo de eventos
- **Bootstrap 5**: Framework CSS responsivo
- **Fetch API**: Comunicación con servidores

## Características Responsivas

La aplicación se adapta a diferentes tamaños de pantalla:

- **Desktops (≥992px)**: Diseño completo con espaciado óptimo
- **Tablets (768px - 991px)**: Ajuste de botones y espaciado
- **Móviles (≤767px)**: Diseño mobile-first completamente adaptado
- **Móviles pequeños (≤480px)**: Fuente aumentada para mejor legibilidad

## Validación

La aplicación incluye validación para:

- Campo de Tipo de Solicitud (obligatorio)
- Campo de ID del Dispositivo (obligatorio)
- Campo de Correo del Usuario (obligatorio solo para Notificación, con validación de email)
- Campo de Contenido/Data (obligatorio para Notificación, Sensor y Sectorial)

## Manejo de CORS

La aplicación maneja las restricciones CORS de manera inteligente:

- Si el servidor permite CORS, se mostrará la respuesta completa
- Si hay restricción CORS, se mostrará un mensaje informativo indicando que la solicitud fue enviada correctamente

## Soporte para Modo Oscuro

La aplicación incluye soporte para modo oscuro basado en las preferencias del sistema operativo.

## Mensajes de Respuesta

### Éxito
- Se muestra una alerta verde con detalles de la solicitud enviada
- Se visualiza la URL completa enviada
- El formulario se limpia automáticamente

### Error
- Se muestra una alerta roja con descripción del problema
- La URL se mantiene visible para debugging

## Seguridad

- Los valores se codifican correctamente para URLs (URL encoding)
- No se almacenan datos sensibles en el navegador
- No hay almacenamiento de credenciales

## Notas Importantes

1. La aplicación requiere que los servidores de destino (dtaamerica.com) permitan solicitudes desde navegadores web (CORS habilitado)
2. Las solicitudes se envían como GET requests
3. Se recomienda usar HTTPS en ambiente de producción
4. La aplicación funciona totalmente en el navegador del cliente, sin servidor intermedio

## Troubleshooting

### "Error de CORS"
- Verifica que el servidor destino tiene CORS habilitado
- Algunos navegadores pueden requerir configuración adicional

### "Validación fallida"
- Asegúrate de llenar todos los campos obligatorios
- Verifica el formato del correo electrónico (para Notificación)

### "Solicitud no se envía"
- Verifica tu conexión a Internet
- Comprueba que la URL está correctamente formada (visible en "URL enviada")
- Revisa la consola del navegador (F12) para más detalles

## Versión

**DTA-Mensaje v1.0**

Desarrollado con HTML5, CSS3, Bootstrap y JavaScript

## Licencia

Uso libre para propósitos no comerciales dentro de DTA América.

## Soporte

Para reportar bugs o sugerencias, contacta al equipo de desarrollo de DTA América.
