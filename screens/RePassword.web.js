// RePassword.js — DarkMode by System (useColorScheme)

import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
  Alert,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

// ---- Firebase (אותו קונפיג כמו במסך התחברות) ----
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

function RePassword() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

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
        error: '#EF4444',
      };
    }
    return {
      bg: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      subText: '#64748b',
      border: '#E2E8F0',
      inputBg: '#FFFFFF',
      orange: 'orange',
      error: '#D32F2F',
    };
  }, [isDark]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  // רוחב דינמי לשדות
  const fieldWrapWidth = width > 600 ? '40%' : '85%';

  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const emailHasIllegalChars = (v) => /\s/.test(v); // רווחים אסורים
  const isValidEmail = (v) => /^\S+@\S+\.\S+$/.test(v) && v.length <= 254;

  const handleSend = async () => {
    const e = (email || '').trim();

    // ולידציה לפני שליחה
    if (!e) {
      const msg = 'אנא הזן אימייל.';
      setErrorMsg(msg);
      Alert.alert('שגיאה', msg);
      return;
    }
    if (emailHasIllegalChars(e)) {
      const msg = 'אימייל לא יכול להכיל רווחים.';
      setErrorMsg(msg);
      Alert.alert('שגיאה', msg);
      return;
    }
    if (!isValidEmail(e)) {
      const msg = 'האימייל שהוזן אינו תקין.';
      setErrorMsg(msg);
      Alert.alert('שגיאה', msg);
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, e);
      setErrorMsg('');
      Alert.alert('נשלח', 'שלחנו קישור לאיפוס סיסמה לכתובת האימייל שלך.');
      // navigation.navigate('LoginEmail');
    } catch (err) {
      console.log('Reset error:', err?.code, err?.message);
      let msg = 'לא הצלחנו לשלוח קישור לאיפוס. נסה שוב.';
      if (err?.code === 'auth/user-not-found') msg = 'משתמש עם האימייל הזה לא נמצא.';
      if (err?.code === 'auth/invalid-email') msg = 'האימייל שהוזן אינו תקין.';
      if (err?.code === 'auth/too-many-requests') msg = 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.';
      setErrorMsg(msg);
      Alert.alert('שגיאה', msg);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* שורת חזרה */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('LoginEmail')}>
          <Image source={require('../assets/backicontwo.png')} style={styles.imageback} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, alignSelf: 'stretch' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* תמונת הכותרת (נשארת שלך) */}
          <Image source={require('../assets/epos_password.png')} style={styles.loginText} />

          {/* שדה אימייל */}
          <View style={[styles.fieldWrap, { width: fieldWrapWidth }]}>
            <TextInput
              style={styles.input}
              placeholder="אימייל"
              placeholderTextColor={colors.subText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errorMsg) setErrorMsg('');
              }}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            {Boolean(errorMsg) && <Text style={styles.errorText}>{errorMsg}</Text>}
          </View>

          {/* כפתור שליחה */}
          <TouchableOpacity onPress={handleSend} style={styles.phoneButton}>
            <Image source={require('../assets/send_code2.png')} />
          </TouchableOpacity>

          {/* טקסט עזר */}
          <View style={[styles.helperWrap, { width: fieldWrapWidth }]}>
            <Text style={styles.text}>
              הזן את כתובת הדואר האלקטרוני שלך והמתן עד שקוד אימות יישלח לתיבת הדואר שלך
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    imageback: {
      width: 40,
      height: 40,
    },

    scroll: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      paddingHorizontal: 12,
    },

    loginText: {
      marginBottom: 0,
      marginTop: -400,
    },

    fieldWrap: {
      alignItems: 'center',
      marginTop: 0,
      marginBottom: 8,
    },

    input: {
      alignSelf: 'stretch',
      height: 44,
      backgroundColor: c.inputBg,
      borderColor: c.orange,
      borderWidth: 1,
      borderRadius: 7,
      paddingHorizontal: 10,
      textAlign: 'right',
      color: c.text,
    },

    errorText: {
      alignSelf: 'flex-end',
      color: c.error,
      fontSize: 13,
      marginTop: 6,
      fontWeight: '700',
    },

    phoneButton: {
      marginTop: 16,
    },

    helperWrap: {
      marginTop: 16,
    },
    text: {
      fontSize: 16,
      textAlign: 'center',
      color: c.text,
      lineHeight: 22,
      fontWeight: '600',
    },
  });
}

export default RePassword;
