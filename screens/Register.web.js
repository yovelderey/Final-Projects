// Register.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set ,serverTimestamp} from 'firebase/database';

// ---- Firebase (כמו במסכים האחרים) ----
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

function Register(props) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const fieldWrapWidth = width > 600 ? '40%' : '85%';

  // שדות טופס
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [fullname, setFullname] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const HOLD_AFTER_SUCCESS_MS = 6000;
  // שגיאות אינליין
  const [emailErr, setEmailErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwd2Err, setPwd2Err] = useState('');
  const [termsErr, setTermsErr] = useState('');
  const navigatedRef = useRef(false);

  // באנר הודעות בראש הטופס (שגיאה/מידע בתוך הדף)
  const [banner, setBanner] = useState(null); // { type: 'error' | 'info', text: string } | null

  // מודל תקנון
  const [termsVisible, setTermsVisible] = useState(false);

  // שכבת "התחברות לחשבון" עם ספינר וטקסט מתחלף
  const [loading, setLoading] = useState(false);
  const phrases = ['תודה שבחרת בנו 🙏', 'אנחנו כבר מחברים אותך לחשבון…'];
  const [phraseIndex, setPhraseIndex] = useState(0);

  // refs לניהול חיי קומפוננטה ולנגישות מודל
  const isMounted = useRef(true);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // טקסט מתחלף בשכבת טעינה
  useEffect(() => {
    if (!loading) return;
    setPhraseIndex(0);
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [loading]);

  // להציב פוקוס על כפתור הסגירה כשמודל התקנון נפתח (web)
  useEffect(() => {
    if (Platform.OS === 'web' && termsVisible && closeBtnRef.current) {
      try { closeBtnRef.current.focus(); } catch (e) {}
    }
  }, [termsVisible]);

  // עזר ולידציה
  const isValidEmail = (v) => /^\S+@\S+\.\S+$/.test(v.trim());
  const pwRules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    noSpace: !/\s/.test(password),
  };
  const isStrong = Object.values(pwRules).every(Boolean);

  const mapFirebaseError = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'האימייל כבר רשום במערכת.';
      case 'auth/invalid-email':
        return 'האימייל שהוזן אינו תקין.';
      case 'auth/weak-password':
        return 'הסיסמה חלשה מדי. עמוד בדרישות החוזק מטה.';
      case 'auth/network-request-failed':
        return 'בעיית רשת. נסה שוב.';
      default:
        return 'ההרשמה נכשלה. נסה שוב.';
    }
  };

  // סגירת מודל תקנון בצורה נגישה (למנוע aria-hidden warning)
  const closeTerms = () => {
    if (Platform.OS === 'web') {
      try { document.activeElement && document.activeElement.blur(); } catch (e) {}
    }
    setTermsVisible(false);
  };

  // Register.js — הפונקציה המלאה
const handleRegister = async () => {
  // ניקוי הודעות/שגיאות קודמות
  setBanner(null);
  setEmailErr('');
  setNameErr('');
  setPwdErr('');
  setPwd2Err('');
  setTermsErr('');

  const e = email.trim();
  const n = fullname.trim();
  let hasErr = false;

  // ולידציות בסיס
  if (!n || n.length < 2) { setNameErr('אנא הזן שם מלא תקין.'); hasErr = true; }
  if (!e) { setEmailErr('אנא הזן אימייל.'); hasErr = true; }
  else if (/\s/.test(e)) { setEmailErr('אימייל לא יכול להכיל רווחים.'); hasErr = true; }
  else if (!/^\S+@\S+\.\S+$/.test(e)) { setEmailErr('האימייל שהוזן אינו תקין.'); hasErr = true; }

  // לפני ה-try:
  if (!password) { setPwdErr('אנא הזן סיסמה.'); hasErr = true; }
  else if (!isStrong) { setPwdErr('הסיסמה אינה עומדת בדרישות החוזק (ראה למטה).'); hasErr = true; }

  if (!passwordAgain) { setPwd2Err('אנא אשר את הסיסמה.'); hasErr = true; }
  else if (passwordAgain !== password) { setPwd2Err('אין התאמה בין הסיסמאות.'); hasErr = true; }

  if (!isChecked) { setTermsErr('יש לאשר את התקנון.'); hasErr = true; }

  if (hasErr) {
    setBanner({ type: 'error', text: 'אנא תקן את השדות המסומנים.' });
    return;
  }

  // לפני הקריאה ל-Firebase (להשאיר):
  setLoading(true);
  globalThis.__suppressAuthAutoNavUntil =
    Date.now() + HOLD_AFTER_SUCCESS_MS + 500;

  try {
    const cred = await createUserWithEmailAndPassword(auth, e, password);
    const user = cred.user;
    const db = getDatabase();
    await set(ref(db, `users/${user.uid}`), {
      email: user.email,
      password: passwordAgain,
      displayName: n,
      createdAt: serverTimestamp(),              // חותמת זמן מהשרת (RTDB)
      createdAtISO: new Date().toISOString(),   // גיבוי קריא מהקליינט
    });

    
    // אחרי הכתיבה ל-DB, הניווט עם השהיה:
    setTimeout(() => {
      if (isMounted.current && !navigatedRef.current) {
        navigatedRef.current = true;
        setLoading(false); // אופציונלי
        navigation.navigate('Main'); // עדיף להשתמש ב- navigation אחיד
      }
    }, HOLD_AFTER_SUCCESS_MS);
  } catch (err) {
    console.log('Register error:', err?.code, err?.message);
    if (err?.code === 'auth/email-already-in-use') {
      setEmailErr('האימייל כבר רשום במערכת.');
    }
    setBanner({ type: 'error', text: mapFirebaseError(err?.code) });
    setLoading(false);
  }
};

useEffect(() => {
  const canAutoNav = () =>
    !globalThis.__suppressAuthAutoNavUntil ||
    Date.now() >= globalThis.__suppressAuthAutoNavUntil;

  const unsub = onAuthStateChanged(auth, (user) => {
    if (user && canAutoNav()) {
      navigation.navigate('Main');
    }
  });
  return unsub;
}, [navigation]);



  const CheckRow = ({ ok, text }) => (
    <View style={styles.ruleRow}>
      <Text style={[styles.ruleIcon, { color: ok ? '#2e7d32' : '#c62828' }]}>{ok ? '✓' : '✗'}</Text>
      <Text style={[styles.ruleText, { color: ok ? '#2e7d32' : '#c62828' }]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* פס עליון עם חזרה — תמונה נשארת */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('LoginEmail')}>
          <Image source={require('../assets/backicontwo.png')} style={styles.imageback} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1, alignSelf: 'stretch' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* באנר הודעה בדף */}
          {banner && (
            <View style={[styles.banner, banner.type === 'error' ? styles.bannerError : styles.bannerInfo, { width: fieldWrapWidth }]}>
              <Text style={styles.bannerText}>{banner.text}</Text>
            </View>
          )}

          {/* כותרת (תמונה שלך) */}
          <Image source={require('../assets/shalom_oreah.png')} style={styles.loginText} />

          {/* שדות — עם רווחים ויישור לימין */}
          <View style={[styles.fieldWrap, { width: fieldWrapWidth }]}>
            <TextInput
              style={styles.input}
              placeholder="שם מלא"
              value={fullname}
              onChangeText={(t) => {
                setFullname(t);
                if (nameErr) setNameErr('');
              }}
              returnKeyType="next"
              textAlign="right"
            />
            {!!nameErr && <Text style={styles.errText}>{nameErr}</Text>}

            <TextInput
              style={styles.input}
              placeholder="אימייל"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailErr) setEmailErr('');
              }}
              returnKeyType="next"
              textAlign="right"
            />
            {!!emailErr && <Text style={styles.errText}>{emailErr}</Text>}

            <TextInput
              style={styles.input}
              placeholder="סיסמה"
              secureTextEntry
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (pwdErr) setPwdErr('');
              }}
              returnKeyType="next"
              textContentType="password"
              textAlign="right"
            />
            {!!pwdErr && <Text style={styles.errText}>{pwdErr}</Text>}

            <TextInput
              style={styles.input}
              placeholder="אימות סיסמה"
              secureTextEntry
              value={passwordAgain}
              onChangeText={(t) => {
                setPasswordAgain(t);
                if (pwd2Err) setPwd2Err('');
              }}
              returnKeyType="done"
              textContentType="password"
              textAlign="right"
              onSubmitEditing={handleRegister}
            />
            {!!pwd2Err && <Text style={styles.errText}>{pwd2Err}</Text>}
          </View>

          {/* מהי סיסמה חזקה */}
          <View style={[styles.rulesCard, { width: fieldWrapWidth }]}>
            <Text style={styles.rulesTitle}>מהי סיסמה חזקה?</Text>
            <CheckRow ok={pwRules.length}  text="לפחות 8 תווים" />
            <CheckRow ok={pwRules.upper}   text="לפחות אות לטינית גדולה (A-Z)" />
            <CheckRow ok={pwRules.lower}   text="לפחות אות לטינית קטנה (a-z)" />
            <CheckRow ok={pwRules.digit}   text="לפחות ספרה (0-9)" />
            <CheckRow ok={pwRules.special} text="לפחות תו מיוחד (למשל !@#$%^&*)" />
            <CheckRow ok={pwRules.noSpace} text="ללא רווחים" />
          </View>

          {/* קראתי/הסכמה לתקנון — באמצע ו־RTL */}
          <TouchableOpacity
            style={[styles.checkboxContainer, { width: fieldWrapWidth }]}
            onPress={() => {
              setIsChecked(!isChecked);
              if (termsErr) setTermsErr('');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.checkbox}>
              {isChecked && <View style={styles.checkboxChecked} />}
            </View>
            <Text style={styles.checkboxLabel}>קראתי ואני מסכים לתקנון</Text>
          </TouchableOpacity>
          {!!termsErr && (
            <Text style={[styles.errText, { width: fieldWrapWidth, textAlign: 'right', marginTop: 8 }]}>
              {termsErr}
            </Text>
          )}

          {/* כפתור הצגת התקנון (תמונה שלך) — במרכז */}
          <TouchableOpacity onPress={() => setTermsVisible(true)} style={styles.showPasswordButton}>
            <Image source={require('../assets/readtakanon.png')} />
          </TouchableOpacity>

          {/* כפתור הרשמה (תמונה שלך) */}
          <TouchableOpacity onPress={handleRegister} style={styles.phoneButton}>
            <Image source={require('../assets/button_reshum.png')} />
          </TouchableOpacity>

          <Text style={styles.footerText}>כל הזכויות שמורות EasyVent©</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* תקנון — Modal לנייטיב + Fallback ל־Web */}
      {Platform.OS === 'web' ? (
        termsVisible && (
          <View style={[styles.modalOverlay, styles.webOverlayFix]}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>תקנון ותנאי שימוש</Text>
                <TouchableOpacity
                  ref={closeBtnRef}
                  focusable={true}
                  accessibilityRole="button"
                  onPress={closeTerms}
                  style={styles.closeX}
                >
                  <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.modalText}>
                  {/* כאן הטקסט המלא של התקנון שלך */}
                  כללי אפליקציה זו נועדה לספק פלטפורמה נוחה לשימוש עבור הזמנות לחתונות, תוך שמירה על פרטיות המשתמשים
                  והתאמה לחוקי ההגנה על מידע. השימוש באפליקציה מותנה בקבלת כלל תנאי התקנון...{'\n\n'}
                  פרטיות ושמירת מידע — החברה מתחייבת לשמירה על פרטיות המשתמשים...{'\n\n'}
                  שימוש הוגן — שימוש אישי בלבד, ללא מטרות מסחריות ללא אישור...{'\n\n'}
                  הגבלת אחריות — האפליקציה מסופקת "כמות שהיא"...{'\n\n'}
                  שינויים ועדכונים — החברה רשאית לעדכן את האפליקציה ומדיניותה...{'\n\n'}
                  (המשך הטקסט המלא לפי הנוסח שלך)
                </Text>
              </ScrollView>

              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={closeTerms}>
                <Text style={styles.modalPrimaryBtnText}>הבנתי</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        <Modal
          visible={termsVisible}
          transparent
          animationType="fade"
          onRequestClose={closeTerms}
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>תקנון ותנאי שימוש</Text>
                <TouchableOpacity
                  ref={closeBtnRef}
                  focusable={true}
                  accessibilityRole="button"
                  onPress={closeTerms}
                  style={styles.closeX}
                >
                  <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.modalText}>
                  {/* כאן הטקסט המלא של התקנון שלך */}
                  כללי אפליקציה זו נועדה לספק פלטפורמה נוחה לשימוש עבור הזמנות לחתונות, תוך שמירה על פרטיות המשתמשים
                  והתאמה לחוקי ההגנה על מידע. השימוש באפליקציה מותנה בקבלת כלל תנאי התקנון...{'\n\n'}
                  פרטיות ושמירת מידע — החברה מתחייבת לשמירה על פרטיות המשתמשים...{'\n\n'}
                  שימוש הוגן — שימוש אישי בלבד, ללא מטרות מסחריות ללא אישור...{'\n\n'}
                  הגבלת אחריות — האפליקציה מסופקת "כמות שהיא"...{'\n\n'}
                  שינויים ועדכונים — החברה רשאית לעדכן את האפליקציה ומדיניותה...{'\n\n'}
                  (המשך הטקסט המלא לפי הנוסח שלך)
                </Text>
              </ScrollView>

              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={closeTerms}>
                <Text style={styles.modalPrimaryBtnText}>הבנתי</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* שכבת טעינה עם ספינר וטקסט מתחלף */}
      {loading && (
        <View style={[styles.loadingOverlay, Platform.OS === 'web' && styles.webOverlayFix]}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.loadingText}>{phrases[phraseIndex]}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // מסך כללי
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  topBar: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  imageback: { width: 40, height: 40 },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },

  // באנר הודעות בתוך הדף
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  bannerError: {
    backgroundColor: '#fdecea',
    borderColor: '#f5c6cb',
  },
  bannerInfo: {
    backgroundColor: '#e8f4fd',
    borderColor: '#b6e0fe',
  },
  bannerText: {
    color: '#b71c1c',
    textAlign: 'right',
    fontSize: 14,
  },

  // תמונות קיימות שלך — לא נגעתי
  loginText: { marginBottom: 10 },

  // עיטוף לשדות כדי לשלוט ברוחב דינמי
  fieldWrap: {
    alignItems: 'stretch',
    marginTop: 6,
    marginBottom: 8,
  },

  // רווח בין כל TextInput + יישור לימין
  input: {
    alignSelf: 'stretch',
    height: 44,
    borderColor: 'orange',
    borderWidth: 1,
    borderRadius: 7,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    textAlign: 'right',
    marginBottom: 16,
  },

  errText: {
    alignSelf: 'flex-end',
    color: '#D32F2F',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 10,
    textAlign: 'right',
  },

  // בלוק דרישות סיסמה
  rulesCard: {
    alignSelf: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  rulesTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
    textAlign: 'right',
  },
  ruleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: 2,
  },
  ruleIcon: { width: 18, textAlign: 'center', marginLeft: 6, fontSize: 14 },
  ruleText: { fontSize: 14, textAlign: 'right' },

  // תקנון — באמצע ו־RTL
  checkboxContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxChecked: { width: 14, height: 14, backgroundColor: 'orange' },
  checkboxLabel: { fontSize: 16, color: 'black', textAlign: 'right' },

  // כפתורים (תמונות) — נשארים שלך
  showPasswordButton: { marginTop: 16, marginBottom: 16, alignSelf: 'center' },
  phoneButton: { marginBottom: 24, alignSelf: 'center' },

  footerText: {
    fontSize: 13,
    color: 'gray',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },

  // === עיצוב מודל התקנון ===
  modalOverlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
    elevation: 50,
  },
  webOverlayFix: {
    position: 'fixed',
    top: 0, right: 0, bottom: 0, left: 0,
    zIndex: 9999,
  },
  modalCard: {
    width: '92%',
    maxWidth: 760,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  closeX: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modalBody: {
    maxHeight: 440,
    backgroundColor: '#fff',
  },
  modalText: {
    textAlign: 'right',
    lineHeight: 22,
    color: '#333',
    fontSize: 14,
  },
  modalPrimaryBtn: {
    backgroundColor: '#28A745',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // שכבת טעינה עם ספינר
  loadingOverlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 10000,
    // טיפ: אם תרצה טשטוש אמיתי בנייד, אפשר לשלב expo-blur (BlurView) במקום רקע חצי שקוף.
  },
  loadingCard: {
    width: '86%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default Register;
