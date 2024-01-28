var ui;
var config = {
    apiKey: "AIzaSyCMQrfX00C0DuaYCUugYPDsPSo-a-0nqNA",
    authDomain: "dta-agricola.firebaseapp.com",
    databaseURL: "https://dta-agricola.firebaseio.com",
    projectId: "dta-agricola",
    storageBucket: "dta-agricola.appspot.com",
    messagingSenderId: "157203634312",
    appId: "1:157203634312:web:95003cad8bc5a95151a73d",
    measurementId: "G-51FCCVQT6B"
};
// Initialize Firebase
firebase.initializeApp(config);
//firebase.analytics();

initializeFirebaseUI();

function initializeFirebaseUI() {
    let uiConfig = {
        callbacks: {
            signInFailure: function(error) {
                // For merge conflicts, the error.code will be
                // 'firebaseui/anonymous-upgrade-merge-conflict'.
                if (error.code != 'firebaseui/anonymous-upgrade-merge-conflict') {
                  return Promise.resolve();
                }
                // The credential the user tried to sign in with.
                var cred = error.credential;
                // Copy data from anonymous user to permanent user and delete anonymous
                // user.
                // ...
                // Finish sign-in after data is copied.
                return firebase.auth().signInWithCredential(cred);
            }
        //     signInFailure: function(error) {
        //         // For merge conflicts, the error.code will be
        //         // 'firebaseui/anonymous-upgrade-merge-conflict'.
        //         if (error.code != 'firebaseui/anonymous-upgrade-merge-conflict') {
        //           return Promise.resolve();
        //         }
        //         // The credential the user tried to sign in with.
        //         var cred = error.credential;
        //         // Copy data from anonymous user to permanent user and delete anonymous
        //         // user.
        //         // ...
        //         // Finish sign-in after data is copied.
        //         return firebase.auth().signInWithCredential(cred);
        //     },
        //     signInSuccessWithAu  thResult: function (currentUser, credential, redirectUrl) {
        //         //setAuthUser(currentUser, credential, redirectUrl);
        //         return false;
        //     },
        //     uiShown: function () {
        //         //document.getElementById('loader').style.display = 'none';
        //     }
        },
        signInOptions: [
            firebase.auth.GoogleAuthProvider.PROVIDER_ID,
            firebase.auth.EmailAuthProvider.PROVIDER_ID,
            // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
            // firebase.auth.PhoneAuthProvider.PROVIDER_ID,
        ],
        signInSuccessUrl: './index.html',
        tosUrl: 'https://dtaamerica.com/privacidad-es.html',
        privacyPolicyUrl: 'https://dtaamerica.com/privacidad-es.html'
    };
    ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', uiConfig);
	//if (ui.isPendingRedirect()) {
	//  ui.start('#firebaseui-auth-container', uiConfig);
	//}
}

// #region NOTIFICATIONS

// const messaging = firebase.messaging();

// function InitializeFirebaseMessaging() {
//     messaging
//         .requestPermission()
//         .then(function() {
//             console.log("Notification permission");
//         })
//         .then(function(token) {
//             console.log("Token: " + token);
//         })
//         .catch(function(reason) {
//             console.error("Error: " + reason);
//         });
//     }
    
// messaging.onMessage(function(payload) {
//     console.log(payload);
// });

// messaging.onTokenRefresh(function() {
//     messaging.getToken()
//         .then(function(newToken) {
//             console.log("New Token: " + newToken);
//         })
//         .catch(function(reason) {
//             console.error("Error: " + reason);
//         });
// })

// messaging.setBackgroundMessagingHandler(function(payload) {
//     console.log(payload);
// });

// InitializeFirebaseMessaging();

// #endregion NOTIFICATIONS

function loadCamposFromFB() {         // Old ***********************
    return new Promise((resolve, reject) => {
        firebase.database().ref("campos").on("value", campos => {
            resolve(campos);
        });
    });
}

function loadUserLocations(email) {  
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
    // delete system.key;
    for (let plan in system.plans) {
        delete system.plans[plan].$$hashKey;
    }
    for (let sch in system.schedule) {
        delete system.schedule[sch].$$hashKey;
    }
    return system;
}

function updateUserInfo(authUserKey, profile) {
    firebase.database().ref("users/" + authUserKey + "/profile").update(profile);
}

function updateNewDevice(newDevice) {
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
