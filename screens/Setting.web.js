// Setting.js (Dark Mode: System default + Light/Dark/System selector + Persisted)
// ✅ דיפולט: מצב מערכת
// ✅ אפשר לבחור: אוטומטי / בהיר / כהה
// ✅ נשמר (AsyncStorage / localStorage fallback)
// ✅ כפתור יציאה עובד ב-Web: מודל אישור במקום Alert
// ✅ מחיקת חשבון: אנימציית "המתנה" (Loader + Pulse) + Disable בזמן פעולה

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Switch,
  Animated,
  Easing,
  I18nManager,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

I18nManager.forceRTL(true);

const APP_VERSION = "1.2.0";
const BUILD_NUMBER = "45";

const THEME_MODE_KEY = "setting_theme_mode_v1"; // 'system' | 'light' | 'dark'

let AsyncStorageLib = null;
try {
  AsyncStorageLib = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  AsyncStorageLib = null;
}

async function storageGet(key) {
  try {
    if (AsyncStorageLib) return await AsyncStorageLib.getItem(key);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

async function storageSet(key, value) {
  try {
    if (AsyncStorageLib) return await AsyncStorageLib.setItem(key, value);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────────────────────
const lightTheme = {
  isDark: false,
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  subText: '#666666',
  border: '#E5E5EA',
  iconBg: '#F2F2F7',
  iconTint: '#333333',
  arrowTint: '#C7C7CC',
  primary: '#007AFF',
  danger: '#FF3B30',
  dangerBg: '#FFECEC',
  gold: '#FFD700',
  overlay: 'rgba(0,0,0,0.5)',
  inputBg: '#F2F2F7',
  modalText: '#333333',
  shadow: '#000000',
};

const darkTheme = {
  isDark: true,
  bg: '#0B0D12',
  card: '#141826',
  text: '#FFFFFF',
  subText: '#A7B0C0',
  border: '#273043',
  iconBg: '#1C2233',
  iconTint: '#E7ECF7',
  arrowTint: '#5C667A',
  primary: '#4DA3FF',
  danger: '#FF4D4F',
  dangerBg: '#3A1C1F',
  gold: '#FFD700',
  overlay: 'rgba(0,0,0,0.65)',
  inputBg: '#1C2233',
  modalText: '#E7ECF7',
  shadow: '#000000',
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal cross-platform
// ─────────────────────────────────────────────────────────────────────────────
const CrossPlatformModal = ({ visible, onRequestClose, children, s }) => {
  if (Platform.OS === 'web') {
    if (!visible) return null;
    return (
      <View style={[s.modalOverlay, s.webOverlayFix]}>
        <View style={s.modalContent}>{children}</View>
      </View>
    );
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>{children}</View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Setting row
// ─────────────────────────────────────────────────────────────────────────────
const SettingItem = ({ title, icon, onPress, isDestructive, hasArrow = true, rightElement, s }) => (
  <TouchableOpacity
    style={[s.settingItem, isDestructive && s.destructiveItem]}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={!onPress}
  >
    <View style={s.settingLeft}>
      <View style={[s.iconContainer, isDestructive && s.destructiveIconBase]}>
        <Image source={icon} style={[s.settingIcon, isDestructive && s.destructiveIcon]} resizeMode="contain" />
      </View>
      <Text style={[s.settingText, isDestructive && s.destructiveText]}>{title}</Text>
    </View>

    <View style={s.settingRight}>
      {rightElement}
      {hasArrow && !rightElement && (
        <Image source={require('../assets/left-arrow.png')} style={s.arrowIcon} />
      )}
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
const Setting = () => {
  const navigation = useNavigation();

  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const [themeMode, setThemeMode] = useState('system');

  const isDarkMode = useMemo(() => {
    if (themeMode === 'system') return systemScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const theme = useMemo(() => (isDarkMode ? darkTheme : lightTheme), [isDarkMode]);
  const s = useMemo(() => createStyles(theme), [theme]);

  // entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // pulse animation (for deleting effect)
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // modals
  const [isModalVisible, setIsModalVisible] = useState(false); // delete account
  const [aboutVisible, setAboutVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);

  // web reset
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // ✅ NEW: sign out modal (works everywhere)
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutMsg, setSignOutMsg] = useState('');

  // ✅ NEW: delete loading
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');

  useEffect(() => {
    // load theme mode
    (async () => {
      const saved = await storageGet(THEME_MODE_KEY);
      if (saved === 'system' || saved === 'light' || saved === 'dark') setThemeMode(saved);
      else setThemeMode('system');
    })();
  }, []);

  useEffect(() => {
    storageSet(THEME_MODE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    // entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();

    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
      setUserEmail(authUser?.email || 'אורח');
    });
    return () => unsubscribeAuth();
  }, [fadeAnim, slideAnim]);

  // ✅ pulse animation while busy (delete/signout)
  useEffect(() => {
    if (!(deleteBusy || signOutBusy)) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [deleteBusy, signOutBusy, pulseAnim]);

  // ─────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────
  const doSignOut = async () => {
    try {
      setSignOutBusy(true);
      setSignOutMsg('');

      await firebase.auth().signOut();

      // ✅ הכי אמין: לא רק navigate, אלא reset כדי שלא יחזור אחורה למסכים מוגנים
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginEmail' }],
      });
    } catch (e) {
      setSignOutMsg('שגיאה בהתנתקות: ' + (e?.message || 'נסה שוב'));
    } finally {
      setSignOutBusy(false);
    }
  };

  const reauthenticateAndDelete = async () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      setDeleteMsg('אין משתמש מחובר.');
      return;
    }
    if (!password || password.length < 3) {
      setDeleteMsg('אנא הזן סיסמה תקינה.');
      return;
    }

    try {
      setDeleteBusy(true);
      setDeleteMsg('');

      const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(credential);

      // אפקט "המתנה" קצר שמרגיש טוב (אופציונלי)
      await new Promise((r) => setTimeout(r, 650));

      await user.delete();

      setDeleteMsg('החשבון נמחק בהצלחה ✅');

      // סוגר מודל ואז עובר ל-login
      setTimeout(() => {
        setIsModalVisible(false);
        navigation.reset({ index: 0, routes: [{ name: 'LoginEmail' }] });
      }, 700);
    } catch (e) {
      setDeleteMsg('שגיאה: ' + (e?.message || 'נסה שוב'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleChangePassword = () => {
    const user = firebase.auth().currentUser;
    if (!user?.email) return;

    if (Platform.OS === 'web') {
      setResetMsg('');
      setResetVisible(true);
    } else {
      Alert.alert(
        'איפוס סיסמה',
        `לשלוח קישור לאיפוס סיסמה לכתובת:\n${user.email}?`,
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'שלח',
            onPress: async () => {
              try {
                await firebase.auth().sendPasswordResetEmail(user.email);
                Alert.alert('נשלח!', 'בדוק את תיבת הדואר שלך.');
              } catch (e) {
                Alert.alert('שגיאה', e.message);
              }
            },
          },
        ]
      );
    }
  };

  const sendResetEmailWeb = async () => {
    try {
      setResetBusy(true);
      setResetMsg('');
      await firebase.auth().sendPasswordResetEmail(userEmail);
      setResetMsg('המייל נשלח בהצלחה!');
    } catch (e) {
      setResetMsg('שגיאה: ' + e.message);
    } finally {
      setResetBusy(false);
    }
  };

  // ─── Theme selector ───
  const ThemeSegment = () => {
    const options = [
      { key: 'system', label: 'אוטומטי' },
      { key: 'light', label: 'בהיר' },
      { key: 'dark', label: 'כהה' },
    ];

    return (
      <View style={s.segmentWrap}>
        {options.map((opt) => {
          const active = themeMode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[s.segmentBtn, active && s.segmentBtnActive]}
              onPress={() => setThemeMode(opt.key)}
              activeOpacity={0.85}
            >
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // pulse styles (scale/opacity)
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });

  return (
    <View style={s.container}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      <View style={s.header}>
        <View style={{ width: 40 }} />
        <Text style={s.headerTitle}>הגדרות</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Image source={require('../assets/return.png')} style={s.headerIcon} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        contentContainerStyle={s.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.profileCard}>
          <View style={s.avatarContainer}>
            <Text style={s.avatarText}>{userEmail ? userEmail.charAt(0).toUpperCase() : '?'}</Text>
          </View>
          <View>
            <Text style={s.profileName}>החשבון שלי</Text>
            <Text style={s.profileEmail}>{userEmail}</Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeText}>PRO</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>כללי</Text>
        <View style={s.sectionCard}>
          <SettingItem
            title="התראות פוש"
            icon={require('../assets/info.png')}
            hasArrow={false}
            s={s}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#767577", true: "#34C759" }}
              />
            }
          />
          <View style={s.separator} />
          <SettingItem
            title="מצב תצוגה"
            icon={require('../assets/settings.png')}
            hasArrow={false}
            s={s}
            rightElement={<ThemeSegment />}
          />
          <View style={s.separator} />
          <SettingItem
            title="כניסה ביומטרית"
            icon={require('../assets/reset-password.png')}
            hasArrow={false}
            s={s}
            rightElement={
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                trackColor={{ false: "#767577", true: "#34C759" }}
              />
            }
          />
        </View>

        <Text style={s.sectionTitle}>חשבון ואבטחה</Text>
        <View style={s.sectionCard}>
          <SettingItem
            title="איפוס סיסמה"
            icon={require('../assets/reset-password.png')}
            onPress={handleChangePassword}
            s={s}
          />
        </View>

        <Text style={s.sectionTitle}>מידע ותמיכה</Text>
        <View style={s.sectionCard}>
          <SettingItem title="עזרה ותמיכה" icon={require('../assets/question.png')} onPress={() => setHelpModalVisible(true)} s={s} />
          <View style={s.separator} />
          <SettingItem title="תנאי שימוש" icon={require('../assets/document.png')} onPress={() => setTermsModalVisible(true)} s={s} />
          <View style={s.separator} />
          <SettingItem title="אודות האפליקציה" icon={require('../assets/info.png')} onPress={() => setAboutVisible(true)} s={s} />
        </View>

        <Text style={s.sectionTitle}>אזור מסוכן</Text>
        <View style={s.sectionCard}>
          {/* ✅ במקום Alert – מודל אישור */}
          <SettingItem
            title="התנתק מהמערכת"
            icon={require('../assets/return.png')}
            onPress={() => { setSignOutMsg(''); setSignOutVisible(true); }}
            isDestructive
            hasArrow={false}
            s={s}
          />
          <View style={s.separator} />
          <SettingItem
            title="מחיקת חשבון לצמיתות"
            icon={require('../assets/remove-user.png')}
            onPress={() => { setDeleteMsg(''); setPassword(''); setIsModalVisible(true); }}
            isDestructive
            s={s}
          />
        </View>

        <Text style={s.versionFooter}>Version {APP_VERSION} (Build {BUILD_NUMBER})</Text>
        <View style={{ height: 50 }} />
      </Animated.ScrollView>

      {/* ───────────────────────── SignOut Modal ───────────────────────── */}
      <CrossPlatformModal visible={signOutVisible} onRequestClose={() => !signOutBusy && setSignOutVisible(false)} s={s}>
        <Text style={s.modalTitle}>התנתקות</Text>
        <Text style={s.modalTextCenter}>האם אתה בטוח שברצונך להתנתק?</Text>

        {!!signOutMsg && <Text style={s.msgErrorText}>{signOutMsg}</Text>}

        {signOutBusy && (
          <Animated.View style={[s.loadingBox, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={s.loadingText}>מתנתק…</Text>
          </Animated.View>
        )}

        <View style={s.modalButtonRow}>
          <TouchableOpacity
            style={[s.btnCancel, signOutBusy && { opacity: 0.6 }]}
            onPress={() => setSignOutVisible(false)}
            disabled={signOutBusy}
          >
            <Text style={s.btnTextBlack}>ביטול</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btnPrimary, signOutBusy && { opacity: 0.6 }]}
            onPress={doSignOut}
            disabled={signOutBusy}
          >
            <Text style={s.btnTextWhite}>{signOutBusy ? '…' : 'כן, התנתק'}</Text>
          </TouchableOpacity>
        </View>
      </CrossPlatformModal>

      {/* ───────────────────────── Delete Account Modal ───────────────────────── */}
      <CrossPlatformModal visible={isModalVisible} onRequestClose={() => !deleteBusy && setIsModalVisible(false)} s={s}>
        <View style={s.modalHeader}>
          <Image source={require('../assets/remove-user.png')} style={s.modalIconDanger} />
          <Text style={s.modalTitleDanger}>מחיקת חשבון</Text>
        </View>

        <Text style={s.modalTextCenter}>
          פעולה זו אינה הפיכה. אנא הזן את הסיסמה שלך לאישור המחיקה.
        </Text>

        <TextInput
          style={s.inputField}
          secureTextEntry
          placeholder="הזן סיסמה"
          value={password}
          onChangeText={setPassword}
          editable={!deleteBusy}
          placeholderTextColor={theme.isDark ? "#8E9AB0" : "#999"}
        />

        {!!deleteMsg && (
          <Text style={deleteMsg.includes('✅') ? s.msgText : s.msgErrorText}>
            {deleteMsg}
          </Text>
        )}

        {deleteBusy && (
          <Animated.View style={[s.loadingBoxDanger, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}>
            <ActivityIndicator size="large" color={theme.danger} />
            <Text style={s.loadingText}>מוחק חשבון…</Text>
            <Text style={s.loadingSubText}>אל תצא מהמסך</Text>
          </Animated.View>
        )}

        <View style={s.modalButtonRow}>
          <TouchableOpacity
            style={[s.btnCancel, deleteBusy && { opacity: 0.6 }]}
            onPress={() => setIsModalVisible(false)}
            disabled={deleteBusy}
          >
            <Text style={s.btnTextBlack}>ביטול</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btnDanger, deleteBusy && { opacity: 0.6 }]}
            onPress={reauthenticateAndDelete}
            disabled={deleteBusy}
          >
            <Text style={s.btnTextWhite}>{deleteBusy ? 'מוחק…' : 'מחק חשבון'}</Text>
          </TouchableOpacity>
        </View>
      </CrossPlatformModal>

      {/* ───────────────────────── About Modal ───────────────────────── */}
      <CrossPlatformModal visible={aboutVisible} onRequestClose={() => setAboutVisible(false)} s={s}>
        <Text style={s.modalTitle}>אודות האפליקציה</Text>
        <Text style={s.versionText}>גרסה {APP_VERSION}</Text>
        <ScrollView style={s.modalScroll}>
          <Text style={s.modalBody}>
            החברה – יובל טכנולוגיות מכבדת את פרטיות המשתמשים...
            {'\n\n'}
            <Text style={s.bold}>פיתוח:</Text> יובל דריי
            {'\n'}<Text style={s.bold}>כל הזכויות שמורות © 2024</Text>
            {'\n\n'}
            כאן יופיע טקסט ארוך ומפורט אודות החברה, החזון, הטכנולוגיה והאנשים שמאחורי הפרויקט.
          </Text>
        </ScrollView>
        <TouchableOpacity style={s.btnClose} onPress={() => setAboutVisible(false)}>
          <Text style={s.btnTextWhite}>סגור</Text>
        </TouchableOpacity>
      </CrossPlatformModal>

      {/* ───────────────────────── Help Modal ───────────────────────── */}
      <CrossPlatformModal visible={helpModalVisible} onRequestClose={() => setHelpModalVisible(false)} s={s}>
        <Text style={s.modalTitle}>מרכז התמיכה</Text>
        <ScrollView style={s.modalScroll}>
          <Text style={s.modalBody}>
            אנחנו כאן בשבילך לכל שאלה.
            {'\n\n'}
            <Text style={s.bold}>יצירת קשר מהירה:</Text>
            {'\n'}📞 054-2455869
            {'\n'}📧 yovelderey@gmail.com
            {'\n\n'}
            <Text style={s.bold}>שעות פעילות:</Text>
            {'\n'}ימים א'-ה': 09:00 - 18:00
          </Text>
        </ScrollView>
        <TouchableOpacity style={s.btnClose} onPress={() => setHelpModalVisible(false)}>
          <Text style={s.btnTextWhite}>הבנתי, תודה</Text>
        </TouchableOpacity>
      </CrossPlatformModal>

      {/* ───────────────────────── Terms Modal ───────────────────────── */}
      <CrossPlatformModal visible={termsModalVisible} onRequestClose={() => setTermsModalVisible(false)} s={s}>
        <Text style={s.modalTitle}>תנאי שימוש ופרטיות</Text>
        <ScrollView style={s.modalScroll}>
          <Text style={s.modalBody}>
            ברוכים הבאים לאפליקציה. השימוש במערכת כפוף לתנאים הבאים...
            {'\n\n'}
            1. אין לעשות שימוש לא חוקי.
            {'\n'}2. הפרטיות שלך חשובה לנו.
            {'\n'}3. אנחנו שומרים קוקיז לשיפור החוויה.
            {'\n\n'}
            (טקסט זה יכול להיות ארוך מאוד...)
          </Text>
        </ScrollView>
        <TouchableOpacity style={s.btnClose} onPress={() => setTermsModalVisible(false)}>
          <Text style={s.btnTextWhite}>אני מסכים/ה</Text>
        </TouchableOpacity>
      </CrossPlatformModal>

      {/* ───────────────────────── Reset Password (WEB) ───────────────────────── */}
      <CrossPlatformModal visible={resetVisible} onRequestClose={() => setResetVisible(false)} s={s}>
        <Text style={s.modalTitle}>איפוס סיסמה</Text>
        <Text style={s.modalTextCenter}>
          לשלוח קישור לאיפוס סיסמה למייל:
          {'\n'}<Text style={s.bold}>{firebase.auth().currentUser?.email}</Text> ?
        </Text>

        {!!resetMsg && <Text style={resetMsg.includes('שגיאה') ? s.msgErrorText : s.msgText}>{resetMsg}</Text>}

        <View style={s.modalButtonRow}>
          <TouchableOpacity style={s.btnCancel} onPress={() => setResetVisible(false)}>
            <Text style={s.btnTextBlack}>סגור</Text>
          </TouchableOpacity>

          {!resetMsg && (
            <TouchableOpacity style={[s.btnPrimary, resetBusy && { opacity: 0.6 }]} onPress={sendResetEmailWeb} disabled={resetBusy}>
              <Text style={s.btnTextWhite}>{resetBusy ? 'שולח...' : 'שלח מייל'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </CrossPlatformModal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES (Dynamic)
// ─────────────────────────────────────────────────────────────────────────────
function createStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 15,
      backgroundColor: t.card,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: t.isDark ? 0.25 : 0.05,
      shadowRadius: 3,
      zIndex: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: t.text },
    backBtn: { padding: 5 },
    headerIcon: { width: 22, height: 22, tintColor: t.primary },

    scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 20 },

    profileCard: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginBottom: 25,
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: t.isDark ? 0.25 : 0.08,
      shadowRadius: 10,
      elevation: 4,
      borderWidth: t.isDark ? 1 : 0,
      borderColor: t.border,
    },
    avatarContainer: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: t.primary,
      justifyContent: 'center', alignItems: 'center',
      marginLeft: 15,
    },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    profileName: { fontSize: 18, fontWeight: 'bold', color: t.text, textAlign: 'right' },
    profileEmail: { fontSize: 14, color: t.subText, marginTop: 2, textAlign: 'right' },
    badge: {
      backgroundColor: t.gold,
      paddingVertical: 4, paddingHorizontal: 8,
      borderRadius: 8,
      position: 'absolute', top: 15, left: 15,
    },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#000' },

    sectionTitle: {
      fontSize: 14, fontWeight: '600', color: t.subText,
      marginBottom: 8, marginRight: 10, textAlign: 'right',
      textTransform: 'uppercase'
    },

    sectionCard: {
      backgroundColor: t.card,
      borderRadius: 12,
      marginBottom: 25,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.border,
    },
separator: {
  height: StyleSheet.hairlineWidth,
  backgroundColor: t.border,
  width: '100%',
  alignSelf: 'stretch',
  marginLeft: 0,
  marginRight: 0,
},

    settingItem: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: t.card,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
    },
    destructiveItem: { backgroundColor: t.card },

    settingLeft: { flexDirection: 'row-reverse', alignItems: 'center' },
    iconContainer: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: t.iconBg,
      justifyContent: 'center', alignItems: 'center',
      marginLeft: 12,
    },
    destructiveIconBase: { backgroundColor: t.dangerBg },

    settingIcon: { width: 18, height: 18, tintColor: t.iconTint },
    destructiveIcon: { tintColor: t.danger },

    settingText: { fontSize: 16, color: t.text },
    destructiveText: { color: t.danger },

    settingRight: { flexDirection: 'row-reverse', alignItems: 'center' },
    arrowIcon: { width: 14, height: 14, tintColor: t.arrowTint, transform: [{ rotate: '180deg' }] },

    versionFooter: { textAlign: 'center', color: t.subText, fontSize: 12, marginTop: -10 },

    segmentWrap: {
      flexDirection: 'row-reverse',
      backgroundColor: t.iconBg,
      borderRadius: 10,
      padding: 2,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
    },
    segmentBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginHorizontal: 2 },
    segmentBtnActive: { backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
    segmentText: { fontSize: 12, color: t.subText, fontWeight: '700' },
    segmentTextActive: { color: t.text },

    modalOverlay: { flex: 1, backgroundColor: t.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
    webOverlayFix: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },

    modalContent: {
      backgroundColor: t.card,
      width: '100%',
      maxWidth: 420,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: t.isDark ? 0.4 : 0.25,
      shadowRadius: 20,
      elevation: 10,
      borderWidth: 1,
      borderColor: t.border,
    },
    modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
    modalIconDanger: { width: 30, height: 30, tintColor: t.danger, marginLeft: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: t.text, marginBottom: 10, textAlign: 'center' },
    modalTitleDanger: { fontSize: 20, fontWeight: 'bold', color: t.danger },

    modalTextCenter: { fontSize: 16, color: t.modalText, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    modalBody: { fontSize: 15, color: t.modalText, lineHeight: 24, textAlign: 'right' },
    versionText: { fontSize: 14, color: t.subText, marginBottom: 10 },

    modalScroll: { maxHeight: 300, width: '100%', marginBottom: 20 },
    bold: { fontWeight: 'bold' },

    msgText: { color: '#34C759', marginBottom: 12, textAlign: 'center', fontWeight: '700' },
    msgErrorText: { color: t.danger, marginBottom: 12, textAlign: 'center', fontWeight: '700' },

    inputField: {
      backgroundColor: t.inputBg,
      width: '100%',
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      textAlign: 'right',
      marginBottom: 12,
      color: t.text,
      borderWidth: 1,
      borderColor: t.border,
    },

    modalButtonRow: { flexDirection: 'row-reverse', width: '100%', justifyContent: 'space-between', gap: 10 },

    btnCancel: { flex: 1, backgroundColor: t.isDark ? '#2A3347' : '#E5E5EA', padding: 12, borderRadius: 10, alignItems: 'center' },
    btnDanger: { flex: 1, backgroundColor: t.danger, padding: 12, borderRadius: 10, alignItems: 'center' },
    btnPrimary: { flex: 1, backgroundColor: t.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
    btnClose: { backgroundColor: t.primary, width: '100%', padding: 14, borderRadius: 12, alignItems: 'center' },

    btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    btnTextBlack: { color: t.text, fontWeight: '600', fontSize: 16 },

    // ✅ Loading effect boxes
    loadingBox: {
      width: '100%',
      marginBottom: 14,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.isDark ? '#101423' : '#F6F7FB',
    },
    loadingBoxDanger: {
      width: '100%',
      marginBottom: 14,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.isDark ? '#3A1C1F' : '#FFD0D0',
      backgroundColor: t.isDark ? '#1A1114' : '#FFF3F3',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: '800',
      color: t.text,
    },
    loadingSubText: {
      marginTop: 4,
      fontSize: 12,
      color: t.subText,
      fontWeight: '700',
    },
  });
}

export default Setting;
