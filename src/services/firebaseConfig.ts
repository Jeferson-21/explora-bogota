import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const firebaseConfig: FirebaseAppConfig = {
  apiKey: 'AIzaSyD7wMTFYzJwM4efKX-7azEbe1a5pRGk5k8',
  authDomain: 'turismo-sostenible-bogota.firebaseapp.com',
  projectId: 'turismo-sostenible-bogota',
  storageBucket: 'turismo-sostenible-bogota.firebasestorage.app',
  messagingSenderId: '1010824333839',
  appId: '1:1010824333839:web:ebf219c7f6dced471ff17a',
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) =>
    typeof value === 'string' &&
    !value.startsWith('TU_') &&
    value.trim().length > 0
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, auth, db };