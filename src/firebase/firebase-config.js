// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA-iSMXwphhv_A2cioqul2Ov_7FNFGuNYE",
    authDomain: "new-one-a7334.firebaseapp.com",
    projectId: "new-one-a7334",
    storageBucket: "new-one-a7334.firebasestorage.app",
    messagingSenderId: "217305568602",
    appId: "1:217305568602:web:23c503ff08170cf5888f63",
    measurementId: "G-ZYRLMHDPNF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Authenticate anonymously (or with a custom token if available)
// This is important for Firestore operations to succeed, especially if your rules
// require authentication (e.g., allow write: if request.auth != null;).
async function initializeAuth() {
    try {
        // Check if __initial_auth_token is provided by the Canvas environment
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
            console.log("Signed in with custom token.");
        } else {
            await signInAnonymously(auth);
            console.log("Signed in anonymously.");
        }
    } catch (error) {
        console.error("Firebase authentication error:", error);
    }
}

initializeAuth();


export { db, auth, app };