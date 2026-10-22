import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAPbcs3eUyXxKs-GOrHGd634mC9jid4CGI",
    authDomain: "govproject-bd98d.firebaseapp.com",
    projectId: "govproject-bd98d",
    storageBucket: "govproject-bd98d.firebasestorage.app",
    messagingSenderId: "224564431446",
    appId: "1:224564431446:web:42ba745d777842024849f7",
    measurementId: "G-K16G5JDPM7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
export * from "firebase/auth";
