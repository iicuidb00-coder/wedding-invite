import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCZL0s9KSdpVpHH6Y4-Grz8v4FDTlQR1Hs",
  authDomain: "wedding-invite-e1ddc.firebaseapp.com",
  projectId: "wedding-invite-e1ddc",
  storageBucket: "wedding-invite-e1ddc.firebasestorage.app",
  messagingSenderId: "842485754925",
  appId: "1:842485754925:web:19ba010059dcfd781c1ca4",
};

// Next.js는 페이지를 여러 번 로드할 수 있어서, 앱이 이미 초기화됐으면 재사용
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);