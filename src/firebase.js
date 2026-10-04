import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC0ZGdMOWB4uPNWBrM9w5PcgMrwzyHRTg8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'todo-app-5b920.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'todo-app-5b920',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'todo-app-5b920.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '784721686259',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:784721686259:web:c376c2de0dc47b3aa45186',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-CL9W61SRCH',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
export default app
