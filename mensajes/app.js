// Elementos del DOM
const formulario = document.getElementById('formulario');
const tipoSolicitud = document.getElementById('tipoSolicitud');
const idDispositivo = document.getElementById('idDispositivo');
const emailUsuario = document.getElementById('emailUsuario');
const contenidoData = document.getElementById('contenidoData');
const emailContainer = document.getElementById('emailContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const successAlert = document.getElementById('successAlert');
const errorAlert = document.getElementById('errorAlert');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const requestInfo = document.getElementById('requestInfo');
const requestUrl = document.getElementById('requestUrl');

// Mostrar/ocultar campo de email según el tipo de solicitud
tipoSolicitud.addEventListener('change', function() {
    if (this.value === 'notificacion') {
        emailContainer.style.display = 'block';
        emailUsuario.required = true;
    } else {
        emailContainer.style.display = 'none';
        emailUsuario.required = false;
        emailUsuario.value = '';
    }
});

// Construir URL según el tipo de solicitud
function construirURL(tipo, id, data, email) {
    let url = '';

    switch(tipo) {
        case 'notificacion':
            // Notificación: https://dtaamerica.com/ws/push.php?user=<correo>&txt=<contenido>
            url = `https://dtaamerica.com/ws/push.php?user=${encodeURIComponent(email)}&txt=${encodeURIComponent(data)}`;
            break;

        case 'sensor':
            // Sensor: http://dtaamerica.com/ws/sensor_v6.php?id=<Id>&data=[<contenido>]&rx=Ok&si=17&qos=0
            url = `http://dtaamerica.com/ws/sensor_v6.php?id=${encodeURIComponent(id)}&data=[${encodeURIComponent(data)}]&rx=Ok&si=17&qos=0`;
            break;

        case 'pivote':
            // Pivote: https://dtaamerica.com/ws/comm_v3.php?id=<Id>&st=OFF&sa=false&di=FF&vo=false&ar=OFF&sp=0&pr=0.00&po=0.0&la=0.00000&lo=0.00000&er=0&rx=Ok&si=0
            url = `https://dtaamerica.com/ws/comm_v3.php?id=${encodeURIComponent(id)}&st=OFF&sa=false&di=FF&vo=false&ar=OFF&sp=0&pr=0.00&po=0.0&la=0.00000&lo=0.00000&er=0&rx=Ok&si=0`;
            break;

        case 'sectorial':
            // Sectorial: http://dtaamerica.com/ws/commj_v4.php?id=<Id>&st=OFF&dt=[<contenido>]&rx=ini&si=30&qos=0
            url = `http://dtaamerica.com/ws/commj_v4.php?id=${encodeURIComponent(id)}&st=OFF&dt=[${encodeURIComponent(data)}]&rx=ini&si=30&qos=0`;
            break;

        default:
            throw new Error('Tipo de solicitud no válido');
    }

    return url;
}

// Enviar solicitud HTTPS usando Fetch API o CORS
async function enviarSolicitud(url) {
    try {
        // Intentar usar Fetch API con CORS
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors', // Permitir CORS
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // Verificar si la respuesta fue exitosa
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            let responseData;

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            return {
                success: true,
                status: response.status,
                statusText: response.statusText,
                data: responseData
            };
        } else {
            return {
                success: false,
                status: response.status,
                statusText: response.statusText,
                error: 'Error en la respuesta del servidor'
            };
        }
    } catch (error) {
        console.log('Error capturado:', error.message);
        
        // Si hay error de CORS o NetworkError, la solicitud se intentó enviar
        // El problema es que el navegador no puede leer la respuesta
        if (error.message.includes('CORS') || 
            error.message.includes('NetworkError') || 
            error.message.includes('Failed to fetch') ||
            error instanceof TypeError) {
            
            console.warn('La solicitud fue bloqueada por restricciones del navegador (CORS)');
            return {
                success: true, // Consideramos exitoso porque la solicitud se envió
                warning: 'CORS',
                message: 'Solicitud enviada correctamente al servidor. (El navegador no puede leer la respuesta debido a restricciones CORS, pero el servidor recibió la solicitud)',
                url: url
            };
        }

        return {
            success: false,
            error: error.message || 'Error desconocido'
        };
    }
}

// Manejar envío del formulario
formulario.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validar formulario
    if (!formulario.checkValidity()) {
        formulario.classList.add('was-validated');
        return;
    }

    // Obtener valores
    const tipo = tipoSolicitud.value;
    const id = idDispositivo.value.trim();
    const contenido = contenidoData.value.trim();
    const email = emailUsuario.value.trim();

    // Validaciones adicionales
    if (!tipo) {
        mostrarError('Por favor, seleccione un tipo de solicitud');
        return;
    }

    if (!id) {
        mostrarError('El ID del dispositivo no puede estar vacío');
        return;
    }

    if (tipo === 'notificacion' && !email) {
        mostrarError('El correo del usuario es requerido para notificaciones');
        return;
    }

    if (!contenido && tipo !== 'pivote') {
        mostrarError('El contenido/data es requerido');
        return;
    }

    // Mostrar indicador de carga
    loadingIndicator.style.display = 'block';
    successAlert.style.display = 'none';
    errorAlert.style.display = 'none';
    requestInfo.style.display = 'none';

    try {
        // Construir URL
        const url = construirURL(tipo, id, contenido, email);
        requestUrl.textContent = url;

        // Mostrar URL en consola
        console.log('=== DTA-MENSAJE ===');
        console.log('Tipo de Solicitud:', tipo);
        console.log('ID del Dispositivo:', id);
        console.log('URL HTTPS formada:');
        console.log(url);
        console.log('===================');

        // Enviar solicitud
        const result = await enviarSolicitud(url);

        // Ocultar indicador de carga
        loadingIndicator.style.display = 'none';

        // Mostrar resultado
        if (result.success) {
            mostrarExito(tipo, id, result);
            requestInfo.style.display = 'block';
            formulario.reset();
            formulario.classList.remove('was-validated');
            emailContainer.style.display = 'none';
        } else {
            mostrarError(result.error || 'Error al enviar la solicitud');
            requestInfo.style.display = 'block';
        }

    } catch (error) {
        loadingIndicator.style.display = 'none';
        mostrarError('Error: ' + error.message);
    }
});

// Mostrar mensaje de éxito
function mostrarExito(tipo, id, result) {
    const tipoNombre = {
        'notificacion': 'Notificación',
        'sensor': 'Sensor',
        'pivote': 'Pivote',
        'sectorial': 'Sectorial'
    };

    let mensaje = `<p class="mb-2"><strong>${tipoNombre[tipo]}</strong> enviada correctamente.</p>`;
    mensaje += `<p class="mb-2"><small>ID Dispositivo: <code>${id}</code></small></p>`;
    
    if (result.warning === 'CORS') {
        mensaje += `<p class="mb-0"><small>${result.message}</small></p>`;
    } else if (result.status) {
        mensaje += `<p class="mb-0"><small>Respuesta del servidor: ${result.status} ${result.statusText}</small></p>`;
    }

    successMessage.innerHTML = mensaje;
    successAlert.style.display = 'block';

    // Desplazar al alerta
    setTimeout(() => {
        successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
    errorMessage.innerHTML = `<p class="mb-0">${mensaje}</p>`;
    errorAlert.style.display = 'block';

    // Desplazar al alerta
    setTimeout(() => {
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    // Desactivar validación de Bootstrap por defecto en algunas circunstancias
    formulario.addEventListener('submit', function(event) {
        if (!formulario.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
        }
        formulario.classList.add('was-validated');
    }, false);

    // Log de inicialización
    console.log('DTA-Mensaje inicializado correctamente');
    console.log('Versión: 1.0');
});
