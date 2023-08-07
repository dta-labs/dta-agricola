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
            signInSuccessWithAuthResult: function (currentUser, credential, redirectUrl) {
                //setAuthUser(currentUser, credential, redirectUrl);
                return false;
            },
            uiShown: function () {
                //document.getElementById('loader').style.display = 'none';
            }
        },
        signInSuccessUrl: 'https://dta-labs.droppages.com/privacidad-es.html',
        signInOptions: [
            firebase.auth.GoogleAuthProvider.PROVIDER_ID,
            firebase.auth.EmailAuthProvider.PROVIDER_ID,
            {
                provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
                recaptchaParameters: {
                    type: 'image',
                    //size: 'invisible',
                    badge: 'bottonleft'
                }
            }
        ],
        tosUrl: '<your-tos-url>',
        privacyPolicyUrl: function () {
            window.location.assign('<your-privacy-policy-url>');
        }
    };
    ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', uiConfig);
}

function loadUserLocations(email) {
    return new Promise((resolve, reject) => {
        firebase.database().ref("users").orderByKey().equalTo(convertDotToDash(email)).on("value", users => {
            resolve(addNewFields(users));
        });
    });
}

function loadUserSystem(id) {
    return new Promise((resolve, reject) => {
        firebase.database().ref("systems/" + id + "/settings").on("value", system => {
            resolve(addNewFields(system));
        });
    });
}

function findUserEnterprises() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("enterprises").on("value", enterprises => {
            resolve(addNewFields(enterprises));
        });
    });
}

function loadUsersFromFB() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("users").on("value", usuarios => {
            resolve(addNewFields(usuarios));
        });
    });
}

function loadCampo(id) {
    return new Promise((resolve, reject) => {
        firebase.database().ref("systems").on("value", campos => {
            resolve(addNewFields(campos));
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

// #region Ejemplos

function loadCamposFromFB() {
    return new Promise((resolve, reject) => {
        firebase.database().ref("systems").on("value", campos => {
            resolve(addNewFields(campos));
        });
    });
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

// #endregion Ejemplos
