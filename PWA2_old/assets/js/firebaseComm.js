var ui;

firebase.initializeApp(config);

function loadCamposFromFB() {           // Old ***********************
    return new Promise((resolve, reject) => {
        firebase.database().ref("campos").on("value", campos => {
            resolve(campos);
        });
    });
}

function loadUserLocations(email) {     // Old ***********************
    return new Promise((resolve, reject) => {
        firebase.database().ref("users").orderByKey().equalTo(convertDotToDash(email)).on("value", users => {
            resolve(addNewFields(users));
        });
    });
}

function loadUserData(email) {  
    return new Promise((resolve, reject) => {
        firebase.database().ref("users").orderByKey().equalTo(convertDotToDash(email)).on("value", users => {
            resolve(addNewFields(users));
        });
    });
}

function loadCulturesList() { 
    return new Promise((resolve, reject) => {
        firebase.database().ref("cultivos").on("value", cultivos => {
            resolve(addNewFields(cultivos));
        });
    });
}

function loadSpecificSystemLogsFromFB(systemKey) {         // New ***********************
    return new Promise((resolve, reject) => {
        firebase.database().ref("systems/" + systemKey + "/logs").orderByKey().equalTo(systemKey).on("value", systems => {
            resolve(addNewFields(systems));
        });
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

function updateNewAccessInFB(id, accessType, data = "No data send") {
    //let newKey = firebase.database().ref().child("Citas").push().key;
    let newKey = new Date().getTime();
    firebase.database().ref("access/" + id + "/" + newKey).update(
        {
            "accessType": accessType,
            "data": data
        }
    );
}

function setMachineState(system) {
    firebase.database().ref("systems/" + system.key + "/settings/").update({
        "status": system.status
    });
}

function setMachineSettings(system) {
    let key = system.key;
    deleteFakeFiels(system);
    firebase.database().ref("systems/" + key + "/settings/").update(system);
    // system.key = key;
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
    firebase.database().ref("users/" + authUserKey + "/profile").update(profile);
}

function updateNewDevice(newDevice) {
    deleteFakeFiels(newDevice);
    firebase.database().ref("systems/" + newDevice.key).update({"settings": newDevice});
}

function updateDeviceUsers(authUserKey, newDeviceKey, name, role) {
    let dato = JSON.parse(`{"${newDeviceKey}": "${role}"}`);
    firebase.database().ref("users/" + authUserKey + "/systems").update(dato);
    // dato = JSON.parse(`{"${authUserKey}": "${name}"}`);
    dato = JSON.parse(`{"${authUserKey}": {"alias": "${name}", "role": "${role}"}}`);
    firebase.database().ref("systems/" + newDeviceKey + "/users").update(dato);    
}

function deleteUser(deviceKey, userKey) {
    let dato = JSON.parse(`{"${userKey}": null}`);
    firebase.database().ref("systems/" + deviceKey + "/users").update(dato); 
    dato = JSON.parse(`{"${deviceKey}": null}`); 
    firebase.database().ref("users/" + userKey + "/systems/").update(dato);      
}

function getMeassurementValues(locationKey, registers) {
    return new Promise((resolve, reject) => {
        firebase.database().ref("systems/" + locationKey + "/logs").limitToLast(registers).on("value", data => {
            if (data.val()) {
                resolve(Object.values(data.val()));
            } else {
                resolve([]);
            }
        });
    });
}

function setUserToken(email, token) {
    firebase.database().ref("users/" + convertDotToDash(email) + "/token").set(token);
}

// #region Ejemplos

function loadSpecialistsFromFB() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("Especialistas").on("value", especialistas => {
            let specialists = addNewFields(especialistas);
            resolve(specialists);
        });
    });
}

function updateOfertaInFB(newKeyoffert) {
    //let newKey = firebase.database().ref().child("Citas").push().key;
    firebase.database().ref("Citas/" + newKey).update(offert);
}

function setAuthUser(currentUser, credential, redirectUrl) {
    let userName = currentUser.displayName.split(" ")[0];
    let userPicture = '<img src="' + currentUser.photoURL + '" class="img-auth">';
    document.getElementById('loginLink').innerHTML = '<a href="#" ng-click="logout()" title="Cerrar sesión">' + userName + ' ' + userPicture + '</a>';
    console.log(currentUser, credential, redirectUrl);
}

function logoutAutUser() {
    firebase.auth().signOut().then(function () {
        ui = null;
        initializeFirebaseUI();
    }, function (error) {
        // Error.
    });
}

function deleteCurrentOffert(key) {
    firebase.database().ref("Ofertas/" + key).remove();
}

// #endregion Ejemplos
