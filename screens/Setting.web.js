// Setting.js (גרסה מותאמת Web)
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// ─────────────────────────────────────────────────────────────────────────────
// קומפוננטת Modal חוצה־פלטפורמות:
// - בנייטיב: משתמשת ב-React Native Modal
// - בווב: מציירת Overlay רגיל (ללא aria-hidden בעייתי)
// ─────────────────────────────────────────────────────────────────────────────
const CrossPlatformModal = ({ visible, onRequestClose, children }) => {
  if (Platform.OS === 'web') {
    if (!visible) return null;
    return (
      <View style={[styles.modalOverlay, styles.webOverlayFix]}>
        <View style={styles.modalContent}>
          {children}
        </View>
      </View>
    );
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>{children}</View>
      </View>
    </Modal>
  );
};

const Setting = () => {
  const navigation = useNavigation();

  const [displayText, setDisplayText] = useState('');
  const [password, setPassword] = useState('');

  // מצבי מודלים
  const [isModalVisible, setIsModalVisible] = useState(false);     // מחיקת חשבון (אימות סיסמה)
  const [aboutVisible, setAboutVisible] = useState(false);         // אודות
  const [helpModalVisible, setHelpModalVisible] = useState(false); // עזרה ותמיכה
  const [termsModalVisible, setTermsModalVisible] = useState(false); // תנאי שימוש
  const [resetVisible, setResetVisible] = useState(false);         // איפוס סיסמה (WEB)
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState('');                    // הודעת הצלחה/שגיאה במודל

  useEffect(() => {
    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        setDisplayText(authUser.email || 'Logged in');
      } else {
        setDisplayText('Not logged in');
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await firebase.auth().signOut();
      navigation.navigate('LoginEmail');
    } catch (error) {
      console.log('Sign out error:', error.message);
    }
  };

  const reauthenticateAndDelete = () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      Alert.alert('שגיאה', 'אין משתמש מחובר.');
      return;
    }

    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      password
    );

    user
      .reauthenticateWithCredential(credential)
      .then(() => {
        user
          .delete()
          .then(() => {
            Alert.alert('החשבון נמחק בהצלחה');
            navigation.navigate('LoginEmail');
          })
          .catch((error) => {
            Alert.alert('שגיאה במחיקת החשבון', error.message);
          });
      })
      .catch((error) => {
        Alert.alert('שגיאה באימות', 'אימות מחדש נכשל: ' + error.message);
      });
  };

  const confirmDeleteAccount = () => setIsModalVisible(true);

  // פותח תהליך איפוס סיסמה: בנייטיב עם Alert, בווב עם מודל ייעודי
  const handleChangePassword = () => {
    const user = firebase.auth().currentUser;
    if (!user?.email) {
      if (Platform.OS === 'web') {
        window.alert('אין משתמש מחובר.');
      } else {
        Alert.alert('Error', 'No user is logged in.');
      }
      return;
    }

    if (Platform.OS === 'web') {
      setResetMsg('');
      setResetVisible(true);
      return;
    }

    // נייטיב: נשאיר Alert עם כפתור פעולה
    Alert.alert(
      'איפוס סיסמה',
      `נשלח מייל איפוס סיסמה ל־\n${user.email}`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'איפוס סיסמה',
          onPress: async () => {
            try {
              await firebase.auth().sendPasswordResetEmail(user.email);
              Alert.alert('האימייל נשלח', 'בדוק/י את תיבת הדוא״ל שלך.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // שליחת מייל איפוס מתוך מודל ה-Web
  const sendResetEmail = async () => {
    const user = firebase.auth().currentUser;
    if (!user?.email) return;

    try {
      setResetBusy(true);
      setResetMsg('');
      await firebase.auth().sendPasswordResetEmail(user.email);
      setResetMsg('האימייל נשלח! בדוק/י את תיבת הדוא״ל.');
    } catch (e) {
      setResetMsg('שגיאה: ' + (e?.message || 'נכשלה שליחת המייל.'));
    } finally {
      setResetBusy(false);
    }
  };

  // רשימת אפשרויות ההגדרות (נבנית בתוך הקומפוננטה כדי ש־onPress יעבוד בווב)
  const settingsOptions = useMemo(
    () => [
      {
        id: 4,
        title: 'תנאי שימוש',
        icon: require('../assets/document.png'),
        onPress: () => setTermsModalVisible(true),
      },
      {
        id: 5,
        title: 'עזרה & תמיכה',
        icon: require('../assets/question.png'),
        onPress: () => setHelpModalVisible(true),
      },
      {
        id: 6,
        title: 'אודות',
        icon: require('../assets/info.png'),
        onPress: () => setAboutVisible(true),
      },
      {
        id: 7,
        title: 'אפס סיסמה',
        icon: require('../assets/reset-password.png'),
        onPress: handleChangePassword,
      },
      {
        id: 8,
        title: 'מחק חשבון',
        icon: require('../assets/remove-user.png'),
        onPress: confirmDeleteAccount,
      },
      {
        id: 1,
        title: 'חזור למסך הראשי',
        icon: require('../assets/return.png'),
        onPress: () => navigation.navigate('Main'),
      },
    ],
    [navigation]
  );

  const renderSettingOption = ({ item }) => (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.optionContainer}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      
      <View style={styles.optionContent}>
        <Image source={item.icon} style={styles.optionIcon} />
        <Text style={styles.optionText}>{item.title}</Text>   
      </View>
      <Image source={require('../assets/left-arrow.png')} style={styles.arrowIcon} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Image source={require('../assets/settings.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הגדרות</Text>
      </View>

      {/* User Info */}
      <Text style={styles.userInfo}>שלום, {displayText}</Text>

      {/* Settings List */}
      <FlatList
        data={settingsOptions}
        renderItem={renderSettingOption}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} accessibilityRole="button">
        <Text style={styles.signOutText}>התנתק</Text>
      </TouchableOpacity>

      {/* ───────────── מודל מחיקת חשבון (אימות סיסמה) ───────────── */}
      <CrossPlatformModal
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Text style={styles.modalTitle}>אימות סיסמה</Text>
        <TextInput
          style={styles.passwordInput}
          secureTextEntry
          placeholder="הזן סיסמה"
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#aaa"
          textAlign="right"
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Text style={styles.cancelButtonText}>ביטול</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => {
              reauthenticateAndDelete();
              setIsModalVisible(false);
            }}
          >
            <Text style={styles.confirmButtonText}>אישור</Text>
          </TouchableOpacity>
        </View>
      </CrossPlatformModal>

      {/* ───────────── מודל אודות ───────────── */}
      <CrossPlatformModal
        visible={aboutVisible}
        onRequestClose={() => setAboutVisible(false)}
      >
        <Text style={styles.modalTitle}>אודות</Text>
        <ScrollView style={{ alignSelf: 'stretch', maxHeight: '70%' }}>
          <Text style={styles.modalText}>
            החברה – יובל טכנולוגיות מכבדת את פרטיות המשתמשים באתר...
            {'\n\n'}
            <Text style={styles.subHeader}>כללי</Text>{'\n'}
            בעת שימוש בשירותי האתר נאסף מידע אודות המשתמש...
            {'\n\n'}
            <Text style={styles.subHeader}>רישום לשירותים</Text>{'\n'}
            ככל שתידרש מסירת פרטים אישיים...
            {'\n\n'}
            <Text style={styles.subHeader}>Cookies</Text>{'\n'}
            האתר משתמש ב"עוגיות" לצורך תפעולו...
            {'\n\n'}
            <Text style={styles.subHeader}>אבטחת מידע</Text>{'\n'}
            באתר מיושמות מערכות ונהלים...
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={() => setAboutVisible(false)}>
          <Text style={styles.closeButtonText}>סגור</Text>
        </TouchableOpacity>
      </CrossPlatformModal>

      {/* ───────────── מודל עזרה ותמיכה ───────────── */}
      <CrossPlatformModal
        visible={helpModalVisible}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <Text style={styles.modalTitle}>עזרה ותמיכה</Text>
        <ScrollView style={{ alignSelf: 'stretch', maxHeight: '70%' }}>
          <Text style={styles.modalText}>
            אם אתה נתקל בבעיות או זקוק לעזרה, אנו כאן כדי לסייע לך!
            {'\n\n'}
            <Text style={styles.subHeader}>צור קשר:</Text>{'\n'}
            אנו זמינים בשעות הפעילות שלנו:
            {'\n'}- ימים א'-ה': 09:00 - 18:00
            {'\n'}- יום ו': 09:00 - 13:00
            {'\n\n'}
            <Text style={styles.subHeader}>דרכי יצירת קשר:</Text>{'\n'}
            - דוא"ל: yovelderey@gmail.com
            {'\n'}- וואטסאפ: 054-2455869
            {'\n\n'}
            <Text style={styles.subHeader}>שאלות נפוצות:</Text>{'\n'}
            <Text style={styles.boldText}>1. שכחתי את הסיסמה שלי?</Text>{'\n'}
            אפשר לאפס דרך "אפס סיסמה".
            {'\n\n'}
            <Text style={styles.boldText}>2. כיצד עורכים פרטי אירוע?</Text>{'\n'}
            במסך "ניהול אירועים".
            {'\n\n'}
            <Text style={styles.boldText}>3. בעיה טכנית?</Text>{'\n'}
            צרו קשר עם התמיכה.
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={() => setHelpModalVisible(false)}>
          <Text style={styles.closeButtonText}>סגור</Text>
        </TouchableOpacity>
      </CrossPlatformModal>

      {/* ───────────── מודל תנאי שימוש ───────────── */}
      <CrossPlatformModal
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <Text style={styles.modalTitle}>תנאי שימוש</Text>
        <ScrollView style={{ alignSelf: 'stretch', maxHeight: '70%' }}>
          <Text style={styles.modalText}>
            <Text style={styles.subHeader}>ברוכים הבאים לאפליקציה שלנו!</Text>
            {'\n\n'}
            האפליקציה מיועדת לספק פתרונות חכמים לניהול אירועים:
            {'\n'}• הזמנות בוואטסאפ
            {'\n'}• ניהול אישורי הגעה
            {'\n'}• סידור שולחנות
            {'\n'}• ניהול ספקים והוצאות
            {'\n'}• מעקב מתנות
            {'\n\n'}
            <Text style={styles.subHeader}>שימוש באפליקציה</Text>{'\n'}
            1) שימוש אישי בלבד.{'\n'}
            2) למסור פרטים מדויקים ולכבד פרטיות אורחים.{'\n'}
            3) אין להשתמש לשימוש בלתי חוקי.
            {'\n\n'}
            <Text style={styles.subHeader}>מדיניות פרטיות</Text>{'\n'}
            המידע ישמש לניהול האירוע בלבד, ולא יועבר לצד ג' ללא הסכמה.
            {'\n\n'}
            <Text style={styles.subHeader}>אחריות ושיפוי</Text>{'\n'}
            השימוש באחריות המשתמש בלבד.
            {'\n\n'}
            <Text style={styles.subHeader}>שינויים בתנאים</Text>{'\n'}
            ייתכנו עדכונים; מומלץ לעיין מעת לעת.
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={() => setTermsModalVisible(false)}>
          <Text style={styles.closeButtonText}>סגור</Text>
        </TouchableOpacity>
      </CrossPlatformModal>

      {/* ───────────── מודל איפוס סיסמה (WEB) ───────────── */}
      <CrossPlatformModal
        visible={resetVisible}
        onRequestClose={() => setResetVisible(false)}
      >
        <Text style={styles.modalTitle}>איפוס סיסמה</Text>
        <Text style={styles.modalText}>
          לשלוח מייל איפוס סיסמה ל־{' '}
          <Text style={{ fontWeight: 'bold' }}>
            {firebase.auth().currentUser?.email || ''}
          </Text>
          ?
        </Text>

        {!!resetMsg && (
          <Text style={[styles.modalText, { marginTop: 10 }]}>
            {resetMsg}
          </Text>
        )}

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setResetVisible(false)}
            disabled={resetBusy}
          >
            <Text style={styles.cancelButtonText}>ביטול</Text>
          </TouchableOpacity>

          {!resetMsg ? (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={sendResetEmail}
              disabled={resetBusy}
            >
              <Text style={styles.confirmButtonText}>
                {resetBusy ? 'שולח…' : 'שלח מייל'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setResetVisible(false)}
            >
              <Text style={styles.confirmButtonText}>סגור</Text>
            </TouchableOpacity>
          )}
        </View>
      </CrossPlatformModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 50,
  },
  backIcon: { width: 24, height: 24, tintColor: '#333' },
  headerTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 15, textAlign: 'right',
  },

  userInfo: { fontSize: 16, color: '#555', padding: 15, textAlign: 'center' },
  listContainer: { paddingHorizontal: 20 },

  optionContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
  optionContent: { flexDirection: 'row-reverse', alignItems: 'center' ,gap: 8, },
  optionIcon: { width: 24, height: 24, marginRight: 0 },
  optionText: { fontSize: 16, color: '#333' },
  arrowIcon: { width: 16, height: 16, tintColor: '#aaa' },

signOutButton: {
  alignSelf: 'center',        // ← מונע stretch לרוחב מלא
  paddingVertical: 10,
  paddingHorizontal: 24,      // כפתור רחב קצת אבל לא פרוס
  backgroundColor: '#FF5252',
  borderRadius: 24,
  marginTop: 10,
  marginBottom: 30,
  ...(Platform.OS === 'web' ? {
    width: 'auto',            // ← חשוב לווב: רוחב לפי התוכן
    minWidth: 300,            // מינימום נחמד
    cursor: 'pointer',
  } : null),
},
signOutText: {
  fontSize: 16,
  color: '#fff',
  fontWeight: 'bold',
  textAlign: 'center',
},


  // מודלים
  modalOverlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  webOverlayFix: {
    position: 'fixed',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '80%',
    maxWidth: 720,
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'right', alignSelf: 'stretch' },
  modalText: { fontSize: 14, color: '#333', lineHeight: 22, textAlign: 'right' },

  passwordInput: {
    borderWidth: 1, borderColor: 'gray', borderRadius: 5,
    width: '100%', padding: 10, marginBottom: 20, textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  cancelButton: { backgroundColor: 'gray', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  cancelButtonText: { color: 'white', fontWeight: 'bold' },
  confirmButton: { backgroundColor: 'red', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  confirmButtonText: { color: 'white', fontWeight: 'bold' },

  closeButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 5, alignSelf: 'center', marginTop: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  subHeader: { fontWeight: 'bold', fontSize: 15 },
  boldText: { fontWeight: 'bold' },
});

export default Setting;
