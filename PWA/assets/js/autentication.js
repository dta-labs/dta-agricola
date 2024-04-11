// import { firebaseApp } from "./firebaseConfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";

const firebaseApp = initializeApp(config);
const auth = getAuth(firebaseApp);

const signupBtn = document.querySelector('#signupBtn');
const signupMail = document.querySelector('#signupMail');
const signupPassword = document.querySelector('#signupPassword');
const signinBtn = document.querySelector('#signinBtn');
const signinMail = document.querySelector('#signinMail');
const signinPassword = document.querySelector('#signinPassword');
const signout1 = document.querySelector('#signoutBtn1');
const signout2 = document.querySelector('#signoutBtn2');

// #region Auth State Changed

onAuthStateChanged(auth, async (user) => {
    console.log(user);
    signinMail.value = "";
    signinPassword.value = "";
});

// #endregion Auth State Changed

// #region SignUp with email

signupBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = signupMail.value;
    const password = signupPassword.value;
    try {
        const authCredentials = await createUserWithEmailAndPassword(auth, email, password);
        console.log(email, password, authCredentials);
    } catch (err) {
        switch (err.code) {
            case "auth/email-already-in-use":
                alert("Correo registrado con anterioridad...");
                break;
            case "auth/invalid-email":
                alert("Correo no válido...");
                break;
            case "auth/weak-password":
                alert("Contraseña muy débil...");
                break;
        }
    }
});

// #endregion SignUp with email

// #region SignIn with email

signinBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = signinMail.value;
    const password = signinPassword.value;
    try {
        const authCredentials = await signInWithEmailAndPassword(auth, email, password);
        console.log(email, password, authCredentials);
    } catch (err) {
        switch (err.code) {
            case "auth/wrong_password":
                console.error("Contraseña incorrecta...");
                break;
            case "auth/user_not_found":
                console.error("Usuario no encontrado...");
                break;
            case "auth/network-request-failed":
                console.error("Fallo en la solicitud de red...");
                break;
        }
    }
});

// #endregion SignIn with email

// #region SignOut

signout1.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
    } catch (err) {
        console.log(err);
    }
});

signout2.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
    } catch (err) {
        console.log(err);
    }
});

// #endregion SignOut

// #region SignIn with Google

const signinGoogle = document.querySelector('#signinGoogle');

signinGoogle.addEventListener('click', async (e) => {
    e.preventDefault();
    const provider = new GoogleAuthProvider();

    try {
        const credentials = await signInWithPopup(auth, provider);
        console.log(credentials);
    } catch (err) {}
});

// #endregion SignIn with Google

