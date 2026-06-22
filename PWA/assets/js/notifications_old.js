// Add this at the top of your notifications.js
const FIREBASE_AUTH = firebase.auth();
let FIREBASE_MESSAGING;

function initializeMessaging() {
    // Ensure Firebase is fully loaded before initializing messaging
    if (firebase.messaging.isSupported()) {
        FIREBASE_MESSAGING = firebase.messaging();
        
        // Add VAPID key configuration
        FIREBASE_MESSAGING.usePublicVapidKey('BCUVqEwpfFtJi-ikOB0_NU5nxLQDV0uHO0PTVLdTBDvxeqJtDqU20lFF159RI5T1v6aBM_JMc3AmzK5xMoUOg4o');
        console.log('Firebase messaging initialized');
    } else {
        console.error('Firebase messaging is not supported in this browser');
    }
}

// Call this after Firebase is initialized
function setupMessaging() {
    // Ensure Firebase is loaded
    if (!firebase || !firebase.messaging) {
        console.error('Firebase not properly initialized');
        return;
    }

    initializeMessaging();

    // FIREBASE_AUTH.onAuthStateChanged(handleAuthStateChanged);
    
    // Add error handling for token refresh
    if (FIREBASE_MESSAGING) {
        FIREBASE_MESSAGING.onTokenRefresh(() => {
            FIREBASE_MESSAGING.getToken()
                .then((refreshedToken) => {
                    console.log('Token refreshed:', refreshedToken);
                    // Update token on server if user is logged in
                    const user = FIREBASE_AUTH.currentUser;
                    if (user) {
                        handleTokenRefresh(user.uid);
                    }
                })
                .catch((err) => {
                    console.error('Unable to retrieve refreshed token', err);
                });
        });
    }
}

// Call this when your app initializes
document.addEventListener('DOMContentLoaded', setupMessaging);

function suscribeToNotifications(userId) {
    if (!FIREBASE_MESSAGING) {
        console.error('Messaging not initialized');
        return;
    }

    FIREBASE_MESSAGING.requestPermission()
        .then(() => {
            console.log('Notification permission granted');
            let _token = FIREBASE_MESSAGING.getToken();
            return _token;
        })
        .then((token) => {
            console.log("Token: " + token);
            console.log("User: " + userId);
            
            // Ensure token is saved to database
            if (token) {
                firebase.database().ref("users/" + userId + "/token").set(token);
                document.getElementById('tokenViewer').innerHTML = "Token: " + token;
            } else {
                console.warn('No token available');
            }
        })
        .catch((err) => {
            console.error("Error obtaining token", err);
            document.getElementById('tokenViewer').innerHTML = "Error obtaining token";
        });
}


// /* Variables */

// const FIREBASE_AUTH = firebase.auth();
// const FIREBASE_MESSAGING = firebase.messaging();
// const FIREBASE_DATABASE = firebase.database();

// // const signInButton = document.getElementById('sign-in');
// // const signOutButton = document.getElementById('sign-out');
// const suscribeButton = document.getElementById('suscribe');
// const unSuscribeButton = document.getElementById('unsuscribe');
// // const sendNotificationForm = document.getElementById('send-notification-form');

// /* Event Listeners */

// // signInButton.addEventListener('click', signIn);
// // signOutButton.addEventListener('click', signOut);
// suscribeButton.addEventListener('click', suscribeToNotifications);
// unSuscribeButton.addEventListener('click', unSuscribeToNotifications);
// // sendNotificationForm.addEventListener('submit', sendNotification);

// FIREBASE_AUTH.onAuthStateChanged(handleAuthStateChanged);
// FIREBASE_MESSAGING.onTokenRefresh(handleTokenRefresh);

// /* Functions */

// function signIn() {
//     FIREBASE_AUTH.signInWithPopup(new firebase.auth.GoogleAuthProvider());
// }

// function signOut() {
//     FIREBASE_AUTH.signOut();
// }

// function handleAuthStateChanged(user) {
//     if (user) {
//         console.log(user);
//         // signInButton.setAttribute("hidden", "true");
//         // signOutButton.removeAttribute("hidden");
//         // suscribeButton.removeAttribute("hidden");
//         // unSuscribeButton.removeAttribute("hidden");
//     } else {
//         // signInButton.removeAttribute("hidden");
//         // signOutButton.setAttribute("hidden", "true");
//         suscribeButton.setAttribute("hidden", "true");
//         unSuscribeButton.setAttribute("hidden", "true");
//     }
// }

// function suscribeToNotifications(userId) {
//     FIREBASE_MESSAGING.requestPermission()
//         .then(() => handleTokenRefresh(userId))
//         .catch((err) => console.log("No se pudo obtener el token", err));
// }

// function handleTokenRefresh(userId) {
//     return FIREBASE_MESSAGING.getToken()
//         .then((token) => {
//             console.log("Token: " + token);
//             console.log("User: " + userId);
//             // FIREBASE_DATABASE.ref("users/" + userId + "/token").set(token);
//             document.getElementById('tokenViewer').innerHTML = "Token: " + token;
//             firebase.database().ref("users/" + userId + "/token").set(token);
//             document.getElementById('tokenViewer').innerHTML = "Solicitud de suscripción enviada";
//         });
// }

// function unSuscribeToNotifications(userId) {
//     FIREBASE_MESSAGING.getToken()
//         .then((token) => FIREBASE_MESSAGING.deleteToken(token))
//         .then(() => FIREBASE_DATABASE.ref("users/" + userId).orderByChild('token').equalTo(FIREBASE_AUTH.currentUser.uid).once('value'))
//         .then((snapshot) => {
//             console.log(snapshot.val());
//             const key = Object.keys(snapshot.val())[0];
//             return FIREBASE_DATABASE.ref("users/" + userId).child('token').remove();
//         });
//         alert("Solicitud de desuscripción enviada");
// }

// function sendNotification(e) {
//     e.preventDefault();
//     let notificationMessage = document.getElementById('notification-message');
//     FIREBASE_DATABASE.ref("notification").push({
//         user: FIREBASE_AUTH.currentUser.displayName,
//         message: notificationMessage.value
//     }).then(() => {
//         notificationMessage.value = "";
//     });
// }