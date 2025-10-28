// firebase.js
import { initializeApp }    from 'firebase/app';
import { getAuth }          from 'firebase/auth';
import { getDatabase }      from 'firebase/database';
import { getStorage }       from 'firebase/storage';

const firebaseConfig = {
  apiKey:            'AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag',
  authDomain:        'final-project-d6ce7.firebaseapp.com',
  projectId:         'final-project-d6ce7',
  storageBucket:     'final-project-d6ce7.appspot.com',
  messagingSenderId: '1056060530572',
  appId:             '1:1056060530572:web:d08d859ca2d25c46d340a9',
  measurementId:     'G-LD61QH3VVP',
};

// אתחול Firebase – מתבצע פעם אחת בלבד
const app       = initializeApp(firebaseConfig);

// שירותי Firebase שנשתמש בהם באפליקציה
const auth      = getAuth(app);       // Authentication
const database  = getDatabase(app);   // Realtime Database
const storage   = getStorage(app);    // Cloud Storage

// ייצוא לשימוש בקבצים אחרים
export { app, auth, database, storage };
