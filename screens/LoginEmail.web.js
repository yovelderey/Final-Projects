// LoginEmail.js
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
} from 'firebase/database';

// --- Firebase config ---
const firebaseConfig = {
  apiKey: 'AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag',
  authDomain: 'final-project-d6ce7.firebaseapp.com',
  projectId: 'final-project-d6ce7',
  storageBucket: 'final-project-d6ce7.appspot.com',
  messagingSenderId: '1056060530572',
  appId: '1:1056060530572:web:d08d859ca2d25c46d340a9',
  measurementId: 'G-LD61QH3VVP',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);

// ---- תמיכת EasyVent ----
const SUPPORT_PHONE_DISPLAY = '054-2455869';
const SUPPORT_PHONE_LINK = 'tel:0542455869';

/* ============================
   🔒 נעילה אחרי 3 ניסיונות כושלים
   ============================ */

// מדיניות
const MAX_FAILS = 3;                     // סף נעילה
const FAIL_WINDOW_MS = 60 * 60 * 1000;   // “חלון” של שעה לצבירת טעויות (ניתן לשנות)
const LOCKS_BASE = 'loginLocks';         // נתיב RTDB לספירת ניסיונות לפי אימייל

// מפתח תקין ל־RTDB מתוך אימייל
const normKey = (email = '') =>
  String(email).trim().toLowerCase().replace(/[.#$\[\]]/g, '_');

// מציאת uid לפי אימייל מתוך users
async function findUidByEmail(email) {
  try {
    const snap = await get(ref(db, 'users'));
    const all = snap.val() || {};
    const needle = String(email || '').toLowerCase();
    for (const [uid, u] of Object.entries(all)) {
      if (String(u?.email || '').toLowerCase() === needle) return uid;
    }
  } catch {}
  return null;
}

// קריאת סטטוס טעויות עבור אימייל
async function readFailState(email) {
  const key = normKey(email);
  const snap = await get(ref(db, `${LOCKS_BASE}/${key}`));
  return snap.val() || { fails: 0, lastAt: 0, disabled: false };
}

// כתיבת סטטוס טעויות עבור אימייל
async function writeFailState(email, obj) {
  const key = normKey(email);
  await set(ref(db, `${LOCKS_BASE}/${key}`), obj);
}

// איפוס מונה
async function resetFails(email) {
  await writeFailState(email, { fails: 0, lastAt: 0, disabled: false });
}

// הגדלת מונה (כולל ניהול חלון זמן)
async function incFail(email) {
  const st = await readFailState(email);
  let fails = st.fails || 0;
  const now = Date.now();
  if (st.lastAt && now - st.lastAt > FAIL_WINDOW_MS) fails = 0; // חלון חדש
  fails += 1;
  const next = { ...st, fails, lastAt: now };
  await writeFailState(email, next);
  return next;
}

// חסימת משתמש בפועל לפי אימייל (users/<uid>/disabled=true) + שיקוף לאירועים
async function disableUserByEmail(email) {
  const uid = await findUidByEmail(email);
  if (!uid) {
    // לא מצאנו משתמש — ננעל זמנית דרך ה־locks בלבד
    await writeFailState(email, { fails: MAX_FAILS, lastAt: Date.now(), disabled: true });
    return false;
  }

  await update(ref(db, `users/${uid}`), {
    disabled: true,
    disabledUpdatedAt: Date.now(),
  });

  // שיקוף חסימה תחת כל האירועים של המשתמש (לא חובה, אך מומלץ ל־UI)
  try {
    const evSnap = await get(ref(db, `Events/${uid}`));
    const updates = {};
    evSnap.forEach((c) => {
      const eventId = c.key;
      if (!eventId || String(eventId).startsWith('__')) return;
      updates[`Events/${uid}/${eventId}/__meta/userDisabled`] = true;
      updates[`Events/${uid}/${eventId}/__meta/userDisabledAt`] = Date.now();
    });
    if (Object.keys(updates).length) {
      await update(ref(db, '/'), updates);
    }
  } catch {}

  await writeFailState(email, { fails: MAX_FAILS, lastAt: Date.now(), disabled: true });
  return true;
}

/* ============================ */

function LoginEmail() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // מודל חסימה
  const [blockedModal, setBlockedModal] = useState(false);
  const [blockedName, setBlockedName] = useState('');
  const [blockedMsg, setBlockedMsg] = useState('הכניסה נחסמה. אנא פנה לתמיכה לפתיחה מחדש.');

  // רוחב דינמי לשדות
  const fieldWrapWidth = width > 600 ? '40%' : '85%';

  // בדיקת חסימה לפי UID (משמשת כשמישהו כבר מחובר)
  const isUserDisabled = async (uid) => {
    const snap = await get(ref(db, `users/${uid}/disabled`));
    return !!snap.val();
  };

  // ניווט מאובטח אחרי בדיקה
  const goToMainSecure = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  // אם כבר מחובר: בודקים חסימה לפני ניווט
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const disabled = await isUserDisabled(user.uid);
        if (disabled) {
          try { await signOut(auth); } catch {}
          setBlockedName(user.email || '');
          setBlockedMsg('החשבון שלך הושבת על ידי המערכת.');
          setBlockedModal(true);
          return;
        }
        goToMainSecure();
      } catch {
        try { await signOut(auth); } catch {}
      }
    });
    return unsub;
  }, []);

  const togglePasswordVisibility = () => setShowPassword((s) => !s);

  const mapFirebaseError = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'האימייל שהוזן אינו תקין.';
      case 'auth/user-disabled':
        return 'המשתמש הושבת.';
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return 'משתמש לא נמצא או סיסמה שגויה.';
      case 'auth/too-many-requests':
        return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.';
      case 'auth/network-request-failed':
        return 'בעיית רשת. בדוק חיבור ונסה שוב.';
      default:
        return 'שגיאה בהתחברות. נסה שוב.';
    }
  };

  const handleLogin = async () => {
    const e = (email || '').trim();
    const p = (password || '').trim(); // חשוב: גם סיסמה ב-trim

    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setErrorMsg('אנא הזן אימייל תקין.');
      return;
    }
    if (!p) {
      setErrorMsg('אנא הזן סיסמה.');
      return;
    }

    // אדמין קבוע (בייפאס) – נכנס ללא ספירה/נעילה
    const IS_ADMIN = (e.toLowerCase() === 'admin@easyvent.com' && p === '31123112');
    if (IS_ADMIN) {
      setErrorMsg('');
      navigation.replace('OwnerDashboard');
      return;
    }

    // בדיקה מקדימה – האם נעול/עבר סף בחלון הזמן
    try {
      const pre = await readFailState(e);
      if (pre.disabled) {
        setBlockedName(e);
        setBlockedMsg('החשבון שלך הושבת עקב יותר מדי ניסיונות כושלים.');
        setBlockedModal(true);
        return;
      }
      if (pre.lastAt && Date.now() - pre.lastAt <= FAIL_WINDOW_MS && pre.fails >= MAX_FAILS) {
        setBlockedName(e);
        setBlockedMsg('יותר מדי ניסיונות כושלים. נסה שוב מאוחר יותר או פנה לתמיכה.');
        setBlockedModal(true);
        return;
      }
    } catch {}

    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, e, p);
      // הצלחה – איפוס מונה
      await resetFails(e);
      setErrorMsg('');
      navigation.replace('Main');
    } catch (error) {
      console.log('Login error:', error?.code, error?.message);
      const code = String(error?.code || '');

      // נספר מונה רק עבור כשלים של שם משתמש/סיסמה
      const countable =
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials';

      if (countable) {
        try {
          const st = await incFail(e);
          if (st.fails >= MAX_FAILS) {
            const disabledOk = await disableUserByEmail(e);
            setBlockedName(e);
            setBlockedMsg(
              disabledOk
                ? 'החשבון שלך הושבת עקב 3 ניסיונות כושלים.'
                : 'החשבון נחסם זמנית עקב 3 ניסיונות כושלים.'
            );
            setBlockedModal(true);
            setErrorMsg('');
            setBusy(false);
            return;
          } else {
            const left = MAX_FAILS - st.fails;
            setErrorMsg(`משתמש לא נמצא או סיסמה שגויה. נותרו ${left} ניסיונות.`);
          }
        } catch {
          setErrorMsg(mapFirebaseError(code));
        }
      } else {
        setErrorMsg(mapFirebaseError(code));
      }
    } finally {
      setBusy(false);
    }
  };

  const callSupport = async () => {
    try { await Linking.openURL(SUPPORT_PHONE_LINK); }
    catch { Alert.alert('שגיאה', `לא הצלחתי לפתוח חיוג. מספר: ${SUPPORT_PHONE_DISPLAY}`); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require('../assets/wellcome_text.png')} style={styles.imagetext} />

          {/* אימייל */}
          <View style={[styles.emailInput, { width: fieldWrapWidth }]}>
            <TextInput
              style={styles.input}
              placeholder="אימייל"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errorMsg) setErrorMsg('');
              }}
              returnKeyType="next"
            />
          </View>

          {/* סיסמה + כפתור עין */}
          <View style={[styles.passwordInput, { width: fieldWrapWidth }]}>
            <TextInput
              style={styles.input}
              placeholder="סיסמה"
              secureTextEntry={!showPassword}
              textContentType="password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMsg) setErrorMsg('');
              }}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={togglePasswordVisibility} style={styles.showPasswordButton}>
              <Image source={require('../assets/Eye.png')} style={styles.eyeIcon} />
            </TouchableOpacity>
          </View>

          {/* טקסט שגיאה */}
          {Boolean(errorMsg) && (
            <Text style={[styles.errorText, { width: fieldWrapWidth, alignSelf: 'center' }]}>
              {errorMsg}
            </Text>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('RePassword')} style={styles.fpButton}>
            <Text style={styles.header_re}>לחץ לאיפוס סיסמה</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            style={[styles.loginButton, busy && { opacity: 0.7 }]}
            disabled={busy}
          >
            <Image source={require('../assets/logineasyvent.png')} style={styles.image} />
          </TouchableOpacity>

          <Image source={require('../assets/find_us.png')} style={styles.divider} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signupButton}>
            <Text style={styles.header_re2}>
              עדיין אין לך חשבון?, <Text style={styles.registerNow}>הירשם עכשיו</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* מודל חסימה */}
      <Modal visible={blockedModal} transparent animationType="fade" onRequestClose={() => setBlockedModal(false)}>
        <View style={styles.blockBackdrop}>
          <View style={styles.blockCard}>
            <View style={styles.blockHeader}>
              <View style={styles.blockIconWrap}><Text style={styles.blockIcon}>⛔</Text></View>
              <Text style={styles.blockTitle}>הכניסה נחסמה</Text>
            </View>

            {!!blockedName && (
              <Text style={styles.blockSubtitle}>
                חשבון: <Text style={{ fontWeight: '800' }}>{blockedName}</Text>
              </Text>
            )}

            <Text style={styles.blockMsg}>
              {blockedMsg}{'\n'}לסיוע מיידי ניתן ליצור קשר עם התמיכה.
            </Text>

            <View style={styles.blockActions}>
              <TouchableOpacity onPress={callSupport} style={[styles.blockBtn, styles.blockBtnPrimary]}>
                <Text style={styles.blockBtnText}>התקשר לתמיכה ({SUPPORT_PHONE_DISPLAY})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBlockedModal(false)} style={[styles.blockBtn, styles.blockBtnGhost]}>
                <Text style={[styles.blockBtnText, { color: '#334155' }]}>סגור</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.blockHint}>צוות EasyVent כאן בשבילך 💙</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // שלד
  container: { flex: 1, backgroundColor: 'white' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },

  // שדות
  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'orange',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    textAlign: 'right',
  },
  emailInput: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 150 },
  passwordInput: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  showPasswordButton: { position: 'absolute', left: 10 },
  eyeIcon: { width: 20, height: 20 },

  // טקסט שגיאה
  errorText: {
    color: '#D32F2F',
    textAlign: 'right',
    marginBottom: 12,
    fontSize: 13,
  },

  // קישורים/כפתורים
  fpButton: { marginTop: -2 },
  loginButton: { marginTop: 20 },
  signupButton: { marginTop: -60, marginBottom: 210 },

  imagetext: { marginBottom: -120, marginTop: 55 },
  divider: { marginTop: 85 },

  header_re: { color: 'black', fontSize: 15, textAlign: 'center' },
  header_re2: { color: '#FF66B2', fontWeight: 'bold', fontSize: 15 },
  registerNow: { color: '#0099FF', fontWeight: 'bold', fontSize: 15 },

  // ---- Blocked Modal ----
  blockBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  blockCard: {
    width: '100%', maxWidth: 440, borderRadius: 16,
    backgroundColor: '#fff', padding: 16,
    borderWidth: 1, borderColor: '#E6E9F5',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  blockHeader: { alignItems: 'center', marginBottom: 6 },
  blockIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  blockIcon: { fontSize: 28 },
  blockTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  blockSubtitle: { marginTop: 4, fontSize: 13, color: '#334155', textAlign: 'center' },
  blockMsg: { marginTop: 10, fontSize: 14, color: '#1f2937', textAlign: 'center', lineHeight: 20 },

  blockActions: { marginTop: 14, gap: 8 },
  blockBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1 },
  blockBtnPrimary: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  blockBtnGhost: { backgroundColor: '#fff', borderColor: '#CBD5E1' },
  blockBtnText: { color: '#fff', fontWeight: '800' },

  blockHint: { marginTop: 10, fontSize: 12, color: '#64748b', textAlign: 'center' },
});

export default LoginEmail;
