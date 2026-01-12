// Register.js — DarkMode by System (useColorScheme)

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';

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

  // ✅ System theme
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const colors = useMemo(() => {
    if (isDark) {
      return {
        bg: '#0B1220',
        card: '#111827',
        text: '#F8FAFC',
        subText: '#94A3B8',
        border: '#1F2937',
        inputBg: '#0F172A',
        orange: '#F59E0B',
        hint: '#64748b',

        error: '#EF4444',
        errorSoft: '#3B1B1B',
        errorBorder: '#7F1D1D',

        infoSoft: '#0B1F3A',
        infoBorder: '#1D4ED8',

        purple: '#6C63FF',
        green: '#22C55E',

        overlay: 'rgba(0,0,0,0.65)',
        overlaySoft: 'rgba(255,255,255,0.06)',
      };
    }
    return {
      bg: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      subText: '#475569',
      border: '#E2E8F0',
      inputBg: '#FFFFFF',
      orange: 'orange',
      hint: 'gray',

      error: '#D32F2F',
      errorSoft: '#fdecea',
      errorBorder: '#f5c6cb',

      infoSoft: '#e8f4fd',
      infoBorder: '#b6e0fe',

      purple: '#6C63FF',
      green: '#28A745',

      overlay: 'rgba(0,0,0,0.50)',
      overlaySoft: 'rgba(0,0,0,0.35)',
    };
  }, [isDark]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

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

  // שכבת טעינה עם ספינר וטקסט מתחלף
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
    else if (!isValidEmail(e)) { setEmailErr('האימייל שהוזן אינו תקין.'); hasErr = true; }

    if (!password) { setPwdErr('אנא הזן סיסמה.'); hasErr = true; }
    else if (!isStrong) { setPwdErr('הסיסמה אינה עומדת בדרישות החוזק (ראה למטה).'); hasErr = true; }

    if (!passwordAgain) { setPwd2Err('אנא אשר את הסיסמה.'); hasErr = true; }
    else if (passwordAgain !== password) { setPwd2Err('אין התאמה בין הסיסמאות.'); hasErr = true; }

    if (!isChecked) { setTermsErr('יש לאשר את התקנון.'); hasErr = true; }

    if (hasErr) {
      setBanner({ type: 'error', text: 'אנא תקן את השדות המסומנים.' });
      return;
    }

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

      setTimeout(() => {
        if (isMounted.current && !navigatedRef.current) {
          navigatedRef.current = true;
          setLoading(false);
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

        }
      }, HOLD_AFTER_SUCCESS_MS);
      console.log('REGISTER modular uid =', user.uid);

    } catch (err) {
      console.log('Register error:', err?.code, err?.message);
      if (err?.code === 'auth/email-already-in-use') {
        setEmailErr('האימייל כבר רשום במערכת.');
      }
      setBanner({ type: 'error', text: mapFirebaseError(err?.code) });
      setLoading(false);
    }
  };



  const CheckRow = ({ ok, text }) => (
    <View style={styles.ruleRow}>
      <Text style={[styles.ruleIcon, { color: ok ? colors.green : colors.error }]}>{ok ? '✓' : '✗'}</Text>
      <Text style={[styles.ruleText, { color: ok ? colors.green : colors.error }]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

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
            <View
              style={[
                styles.banner,
                banner.type === 'error' ? styles.bannerError : styles.bannerInfo,
                { width: fieldWrapWidth },
              ]}
            >
              <Text style={styles.bannerText}>{banner.text}</Text>
            </View>
          )}

          {/* כותרת (תמונה שלך) */}
          <Image source={require('../assets/shalom_oreah.png')} style={styles.loginText} />

          {/* שדות */}
          <View style={[styles.fieldWrap, { width: fieldWrapWidth }]}>
            <TextInput
              style={styles.input}
              placeholder="שם מלא"
              placeholderTextColor={colors.subText}
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
              placeholderTextColor={colors.subText}
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
              placeholderTextColor={colors.subText}
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
              placeholderTextColor={colors.subText}
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

          {/* קראתי/הסכמה לתקנון */}
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

          {/* כפתור הצגת התקנון (תמונה שלך) */}
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

      {/* תקנון — Modal */}
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

      {/* שכבת טעינה */}
      {loading && (
        <View style={[styles.loadingOverlay, Platform.OS === 'web' && styles.webOverlayFix]}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.purple} />
            <Text style={styles.loadingText}>{phrases[phraseIndex]}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
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

    // באנר
    banner: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    bannerError: {
      backgroundColor: c.errorSoft,
      borderColor: c.errorBorder,
    },
    bannerInfo: {
      backgroundColor: c.infoSoft,
      borderColor: c.infoBorder,
    },
    bannerText: {
      color: c.text,
      textAlign: 'right',
      fontSize: 14,
      fontWeight: '800',
    },

    loginText: { marginBottom: 10 },

    fieldWrap: {
      alignItems: 'stretch',
      marginTop: 6,
      marginBottom: 8,
    },

    input: {
      alignSelf: 'stretch',
      height: 44,
      borderColor: c.orange,
      borderWidth: 1,
      borderRadius: 7,
      backgroundColor: c.inputBg,
      paddingHorizontal: 10,
      textAlign: 'right',
      marginBottom: 16,
      color: c.text,
    },

    errText: {
      alignSelf: 'flex-end',
      color: c.error,
      fontSize: 13,
      marginTop: -8,
      marginBottom: 10,
      textAlign: 'right',
      fontWeight: '700',
    },

    rulesCard: {
      alignSelf: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    rulesTitle: {
      fontWeight: '900',
      fontSize: 15,
      marginBottom: 6,
      textAlign: 'right',
      color: c.text,
    },
    ruleRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginVertical: 2,
    },
    ruleIcon: { width: 18, textAlign: 'center', marginLeft: 6, fontSize: 14, fontWeight: '900' },
    ruleText: { fontSize: 14, textAlign: 'right', fontWeight: '700' },

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
      borderColor: c.subText,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
      backgroundColor: c.overlaySoft,
      borderRadius: 4,
    },
    checkboxChecked: { width: 14, height: 14, backgroundColor: c.orange, borderRadius: 3 },
    checkboxLabel: { fontSize: 16, color: c.text, textAlign: 'right', fontWeight: '800' },

    showPasswordButton: { marginTop: 16, marginBottom: 16, alignSelf: 'center' },
    phoneButton: { marginBottom: 24, alignSelf: 'center' },

    footerText: {
      fontSize: 13,
      color: c.subText,
      marginTop: 8,
      marginBottom: 8,
      textAlign: 'center',
      fontWeight: '700',
    },

    // Modal תקנון
    modalOverlay: {
      position: 'absolute',
      top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: c.overlay,
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
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    modalHeader: {
      backgroundColor: c.purple,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    closeX: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    modalBody: {
      maxHeight: 440,
      backgroundColor: c.card,
    },
    modalText: {
      textAlign: 'right',
      lineHeight: 22,
      color: c.text,
      fontSize: 14,
      fontWeight: '600',
    },
    modalPrimaryBtn: {
      backgroundColor: c.green,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalPrimaryBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 16,
    },

    // Loading overlay
    loadingOverlay: {
      position: 'absolute',
      top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      zIndex: 10000,
    },
    loadingCard: {
      width: '86%',
      maxWidth: 420,
      backgroundColor: c.card,
      borderRadius: 14,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: c.text,
      textAlign: 'center',
      fontWeight: '800',
    },
  });
}

export default Register;
