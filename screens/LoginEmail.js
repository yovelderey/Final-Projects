import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  StyleSheet,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, get, query as dbQuery, orderByChild, equalTo } from 'firebase/database';
import { auth } from '../firebase'; // ← initializeApp + auth בקובץ הזה

const SUPPORT_PHONE_DISPLAY = '054-2455869';
const SUPPORT_PHONE_LINK = 'tel:0542455869';

function LoginEmail() {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  // מודל חסימה
  const [blockedModal, setBlockedModal] = useState(false);
  const [blockedName, setBlockedName] = useState('');
  const [blockedReason, setBlockedReason] = useState('הגישה לחשבון זה נחסמה.');

  // --- Utility: find user by email in RTDB (users/)
  const findUserByEmail = async (mail) => {
    const db = getDatabase();
    const normalized = String(mail || '').trim().toLowerCase();

    // primary: email בשדה באותיות קטנות
    const q = dbQuery(ref(db, 'users'), orderByChild('email'), equalTo(normalized));
    const snap = await get(q);
    if (snap.exists()) {
      const obj = snap.val();
      const firstKey = Object.keys(obj)[0];
      return { uid: firstKey, ...obj[firstKey] };
    }

    // fallback: חיפוש גם על אותו מייל בדיוק כפי שהוזן (למקרה שנשמר בלי lowercase)
    if (normalized !== mail) {
      const q2 = dbQuery(ref(db, 'users'), orderByChild('email'), equalTo(String(mail || '').trim()));
      const snap2 = await get(q2);
      if (snap2.exists()) {
        const obj2 = snap2.val();
        const firstKey2 = Object.keys(obj2)[0];
        return { uid: firstKey2, ...obj2[firstKey2] };
      }
    }

    return null;
  };

  // אוטו־ניווט אם מחובר – אבל בודקים שלא חסום
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const db = getDatabase();
        const uref = ref(db, `users/${user.uid}/disabled`);
        const snap = await get(uref);
        const isDisabled = !!snap.val();
        if (isDisabled) {
          // מוודאים שלא יישאר מחובר
          try { await signOut(auth); } catch {}
          setBlockedName(user.email || '');
          setBlockedReason('החשבון סומן כחסום.');
          setBlockedModal(true);
          return;
        }
        // לא חסום – נווט פנימה
        navigation.navigate('Main');
      } catch {
        // במקרה של כשל קריאה – עדיף לא לחסום בטעות; נותנים להיכנס
        navigation.navigate('Main');
      }
    });
    return unsub;
  }, [navigation]);

  const openSupport = async () => {
    try {
      await Linking.openURL(SUPPORT_PHONE_LINK);
    } catch {
      Alert.alert('שגיאה', `לא הצלחתי לפתוח חיוג. צור קשר ידנית: ${SUPPORT_PHONE_DISPLAY}`);
    }
  };

  const handleLogin = async () => {
    const mail = email.trim();
    if (!mail || !password) {
      return Alert.alert('שגיאה', 'יש להזין אימייל וסיסמה.');
    }

    try {
      setBusy(true);

      // 1) בדיקת חסימה לפי אימייל לפני התחברות
      const userDoc = await findUserByEmail(mail);
      if (userDoc && userDoc.disabled) {
        setBlockedName(userDoc.displayName || userDoc.email || mail);
        setBlockedReason('מנהל המערכת השבית את החשבון שלך.');
        setBlockedModal(true);
        setBusy(false);
        return;
      }

      // 2) אין חסימה – מבצעים התחברות רגילה
      await signInWithEmailAndPassword(auth, mail, password);
      // הניווט ל־Main מתבצע כבר ב־onAuthStateChanged אחרי בדיקה שאין חסימה.
    } catch (err) {
      setBusy(false);
      Alert.alert('שגיאת התחברות', err?.message || 'נכשל להתחבר.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('Main')}>
        <Image source={require('../assets/backicontwo.png')} style={styles.imageback} />
      </TouchableOpacity>

      <Image source={require('../assets/wellcome_text.png')} style={styles.imagetext} />

      <View style={styles.emailInput}>
        <TextInput
          style={styles.input}
          placeholder="אימייל"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail}
          value={email}
          textContentType="emailAddress"
        />
      </View>

      <View style={styles.passwordInput}>
        <TextInput
          style={styles.input}
          placeholder="סיסמה"
          secureTextEntry={!showPwd}
          onChangeText={setPassword}
          value={password}
          textContentType="password"
        />
        <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.showPasswordButton}>
          <Image source={require('../assets/Eye.png')} style={styles.eyeIcon} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('RePassword')} style={styles.fpButton}>
        <Text style={styles.header_re}>לחץ לאיפוס סיסמה</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogin} style={[styles.loginButton, busy && { opacity: 0.7 }] } disabled={busy}>
        <Image source={require('../assets/logineasyvent.png')} style={styles.image} />
      </TouchableOpacity>

      <Image source={require('../assets/find_us.png')} style={styles.divider} />

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signupButton}>
        <Text style={styles.header_re2}>
          עדיין אין לך חשבון?, <Text style={styles.registerNow}>הירשם עכשיו</Text>
        </Text>
      </TouchableOpacity>

      {/* מודל חסימה מעוצב */}
      <Modal visible={blockedModal} transparent animationType="fade" onRequestClose={() => setBlockedModal(false)}>
        <View style={styles.blockBackdrop}>
          <View style={styles.blockCard}>
            <View style={styles.blockHeader}>
              <View style={styles.blockIconWrap}>
                <Text style={styles.blockIcon}>⛔</Text>
              </View>
              <Text style={styles.blockTitle}>הכניסה נחסמה</Text>
            </View>

            {!!blockedName && (
              <Text style={styles.blockSubtitle}>
                חשבון: <Text style={{ fontWeight: '800' }}>{blockedName}</Text>
              </Text>
            )}

            <Text style={styles.blockMsg}>
              {blockedReason}
              {'\n'}
              לקבלת סיוע נא לפנות לתמיכה.
            </Text>

            <View style={styles.blockActions}>
              <TouchableOpacity onPress={openSupport} style={[styles.blockBtn, styles.blockBtnPrimary]}>
                <Text style={styles.blockBtnText}>התקשר לתמיכה ({SUPPORT_PHONE_DISPLAY})</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setBlockedModal(false)} style={[styles.blockBtn, styles.blockBtnGhost]}>
                <Text style={[styles.blockBtnText, { color: '#334155' }]}>סגור</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.blockHint}>
              ניתן גם לשלוח הודעה ולבקש פתיחה מחדש של החשבון.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },

  emailInput: { width: '90%', flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 150 },
  passwordInput: { width: '90%', flexDirection: 'row', alignItems: 'center', marginBottom: 20 },

  input: {
    width: '100%', height: 44, backgroundColor: 'white',
    borderColor: 'orange', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, textAlign: 'right',
  },

  showPasswordButton: { position: 'absolute', left: 10, padding: 0 },
  eyeIcon: { width: 20, height: 20 },

  imageback: { width: 40, height: 40, marginTop: 150, marginRight: 300 },
  imagetext: { marginBottom: -60, marginTop: 55 },

  fpButton: { marginTop: -15, marginBottom: 14, alignSelf: 'flex-end', marginRight: 20 },
  loginButton: { marginTop: 20 },
  signupButton: { marginTop: -60, marginBottom: 210 },

  divider: { marginTop: 85 },

  header_re: { color: 'black', fontWeight: 'bold', fontSize: 12 },
  header_re2: { color: '#FF66B2', fontWeight: 'bold', fontSize: 15 },
  registerNow: { color: '#0099FF', fontWeight: 'bold', fontSize: 15 },

  // ---- Blocked Modal Styles ----
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
  blockBtn: {
    height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, borderWidth: 1,
  },
  blockBtnPrimary: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  blockBtnGhost: { backgroundColor: '#fff', borderColor: '#CBD5E1' },
  blockBtnText: { color: '#fff', fontWeight: '800' },

  blockHint: { marginTop: 10, fontSize: 12, color: '#64748b', textAlign: 'center' },
});

export default LoginEmail;
