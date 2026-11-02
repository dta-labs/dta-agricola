var ui;

firebase.initializeApp(config);

// REQ-010: repositorio de datos (esquema) sobre el adaptador de Firebase.
// El controlador solo usa `repoDTA`; nadie mas construye rutas a mano.
var repoDTA = null;
try {
    repoDTA = DTALogic.repositorio.crear(DTALogic.adaptadorFirebase.crear(firebase.database()));
} catch (error) {
    console.error("No se pudo crear el repositorio de datos:", error);
}

// REQ-013: servicio de dominio de equipos (estado y suscripciones) sobre el repositorio.
var equiposDTA = null;
try {
    equiposDTA = DTALogic.equiposServicio.crear(repoDTA);
} catch (error) {
    console.error("No se pudo crear el servicio de equipos:", error);
}

// REQ-012: servicio de autenticacion sobre su adaptador.
var authDTA = null;
try {
    authDTA = DTALogic.autenticacion.crear(DTALogic.adaptadorFirebaseAuth.crear(firebase.auth()));
} catch (error) {
    console.error("No se pudo crear el servicio de autenticacion:", error);
}

function loadUserLocations(email) {
    return new Promise((resolve) => {
        repoDTA.escucharUsuarioPorClave(email, users => resolve(addNewFields(users)));
    });
}

function loadUserData(email) {
    return new Promise((resolve) => {
        repoDTA.escucharUsuarioPorClave(email, users => resolve(addNewFields(users)));
    });
}

function addNewFields(table) {
    let result = {};
    table.forEach(item => {
        let newItem = item.val();
        newItem.key = item.key;
        result[item.key] = newItem;
    });
    return result;
}

function updateNewAccessInFB(id, accessType, data) {
    return repoDTA.registrarAcceso(id, accessType, data === undefined ? "No data send" : data);
}

function setMachineState(system) {
    return repoDTA.escribirEstadoSistema(system.key, system.status);
}

function setMachineSettings(system) {
    var key = system.key;
    deleteFakeFiels(system);
    return repoDTA.guardarSettingsSistema(key, system);
}

function deleteFakeFiels(system){
    delete system.log;
    if (system.$$hashKey) delete system.$$hashKey;
    if (system.plans) {
        for (let plan in system.plans) {
            delete system.plans[plan].$$hashKey;
        }
    }
    if (system.sensors) {
        for (let id in system.sensors.sensorNumber) {
            let sensorId = "S" + id;
            delete system.sensors[sensorId].$$hashKey;
        }
    }
    if (system.irrigationPlan && system.irrigationPlan.schedule) {
        for (let sch in system.irrigationPlan.schedule) {
            delete system.irrigationPlan.schedule[sch].$$hashKey;
        }
    }
    // if (system.plots) {
    //     for (plot in system.plots) {
    //         if (system.plots[plot].schedule) {
    //             for (sch in system.plots[plot].schedule) {
    //                 delete system.plots[plot].schedule[sch].$$hashKey;
    //             }
    //         }
    //     }
    // }
    removeHashKeys(system);
    return system;
}

function removeHashKeys(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
   if (obj.hasOwnProperty('$$hashKey')) {
        delete obj['$$hashKey'];
    }
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            obj[key] = removeHashKeys(obj[key]);
        }
    }
    return obj;
}

function updateUserInfo(authUserKey, profile) {
    return repoDTA.guardarPerfilUsuario(authUserKey, profile);
}

function updateNewDevice(newDevice) {
    deleteFakeFiels(newDevice);
    return repoDTA.crearSistema(newDevice.key, newDevice);
}

function updateDeviceUsers(authUserKey, newDeviceKey, name, role) {
    return repoDTA.vincularUsuarioASistema(authUserKey, newDeviceKey, role, name);
}

function deleteUser(deviceKey, userKey) {
    return repoDTA.desvincularUsuarioDeSistema(deviceKey, userKey);
}

function getMeassurementValues(locationKey, registers) {
    return repoDTA.leerMediciones(locationKey, registers);
}

function setUserToken(email, token) {
    if (typeof saveFcmToken === "function") {
        return saveFcmToken(email, token);
    }

    console.warn("No se guardo token legacy; Firebase Messaging no esta disponible.");
    return Promise.resolve();
}


