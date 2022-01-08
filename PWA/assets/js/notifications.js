/* Variables */

const FIREBASE_AUTH = firebase.auth();
const FIREBASE_MESSAGING = firebase.messaging();
const FIREBASE_DATABASE = firebase.database();

const signInButton = document.getElementById('sign-in');
const signOutButton = document.getElementById('sign-out');
const suscribeButton = document.getElementById('suscribe');
const unSuscribeButton = document.getElementById('unsuscribe');
const sendNotificationForm = document.getElementById('send-notification-form');

/* Event Listeners */

// signInButton.addEventListener('click', signIn);
// signOutButton.addEventListener('click', signOut);
// suscribeButton.addEventListener('click', suscribeToNotifications);
// unSuscribeButton.addEventListener('click', unSuscribeToNotifications);
// sendNotificationForm.addEventListener('submit', sendNotification);

FIREBASE_AUTH.onAuthStateChanged(handleAuthStateChanged);
FIREBASE_MESSAGING.onTokenRefresh(handleTokenRefresh);

/* Functions */

function signIn() {
    FIREBASE_AUTH.signInWithPopup(new firebase.auth.GoogleAuthProvider());
}

function signOut() {
    FIREBASE_AUTH.signOut();
}

function handleAuthStateChanged(user) {
    if (user) {
        console.log(user);
        // signInButton.setAttribute("hidden", "true");
        // signOutButton.removeAttribute("hidden");
        // suscribeButton.removeAttribute("hidden");
        // unSuscribeButton.removeAttribute("hidden");
    } else {
        signInButton.removeAttribute("hidden");
        signOutButton.setAttribute("hidden", "true");
        suscribeButton.setAttribute("hidden", "true");
        unSuscribeButton.setAttribute("hidden", "true");
    }
}

function suscribeToNotifications(userId) {
    firebase.messaging().requestPermission()
        .then(() => handleTokenRefresh(userId))
        .catch(() => console.log("No se pudo obtener el token"));
}

function handleTokenRefresh(userId) {
    return firebase.messaging().getToken()
        .then((token) => {
            console.log("Token: " + token);
            console.log("User: " + userId);
            // FIREBASE_DATABASE.ref("users/" + userId + "/token").set(token);
            document.getElementById('tokenViewer').innerHTML = "Token: " + token;
            firebase.database().ref("users/" + userId + "/token").set(token);
            document.getElementById('tokenViewer').innerHTML = "Solicitud de suscripción enviada";
        });
}

function unSuscribeToNotifications(userId) {
    FIREBASE_MESSAGING.getToken()
        .then((token) => FIREBASE_MESSAGING.deleteToken(token))
        .then(() => FIREBASE_DATABASE.ref("users/" + userId).orderByChild('token').equalTo(FIREBASE_AUTH.currentUser.uid).once('value'))
        .then((snapshot) => {
            console.log(snapshot.val());
            const key = Object.keys(snapshot.val())[0];
            return FIREBASE_DATABASE.ref("users/" + userId).child('token').remove();
        });
        alert("Solicitud de desuscripción enviada");
}

function sendNotification(e) {
    e.preventDefault();
    let notificationMessage = document.getElementById('notification-message');
    FIREBASE_DATABASE.ref("notification").push({
        user: FIREBASE_AUTH.currentUser.displayName,
        message: notificationMessage.value
    }).then(() => {
        notificationMessage.value = "";
    });
}