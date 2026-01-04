// Main.js – רקע GIF/וידאו על כל המסך (Web/Native) עם שקיפות לרקע
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Platform,
  Alert,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

import { getDatabase, ref, remove, get, update } from 'firebase/database';

import NetInfo from '@react-native-community/netinfo';

import { getStorage, ref as storageRef, listAll, deleteObject } from 'firebase/storage';

// ⚙️ Firebase init (אם צריך)
const firebaseConfig = {
  apiKey: 'AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag',
  authDomain: 'final-project-d6ce7.firebaseapp.com',
  projectId: 'final-project-d6ce7',
  storageBucket: 'final-project-d6ce7.appspot.com',
  messagingSenderId: '1056060530572',
  appId: '1:1056060530572:web:d08d859ca2d25c46d340a9',
  measurementId: 'G-LD61QH3VVP',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

function Main(props) {
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();

  const MEDIA_VISIBILITY = 0.6;

  const [isLoggedIn, setLoggedIn] = useState(false);
  const [isCreate, setIsCreate] = useState(false);
  const [user, setUser] = useState(null);

  const [data, setData] = useState([]);
  const [isConnected, setIsConnected] = useState(true);

  const [showWebDialog, setShowWebDialog] = useState(false);
  const [showWebClearConfirm, setShowWebClearConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const slideAnim = useRef(new Animated.Value(-40)).current;

  // ─────────────────────────── subscriptions ───────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = firebase.auth().currentUser;
        if (!u) return;

        const db = getDatabase();
        const r = ref(db, `Events/${u.uid}/`);
        const snap = await get(r);
        const val = snap.val();

        setData(val ? Object.keys(val).map((k) => ({ id: k, ...val[k] })) : []);
      } catch (e) {
        console.log('Error fetching data:', e);
      }
    };

    const unsubNet = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected);
    });

    const unsubNav = props.navigation.addListener('focus', fetchData);

    const unsubAuth = firebase.auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser);
        setLoggedIn(true);
        setIsCreate(false);
      } else {
        setUser(null);
        setLoggedIn(false);
        setIsCreate(true);
      }
    });

    fetchData();

    return () => {
      unsubNet();
      unsubNav();
      unsubAuth();
    };
  }, [props.navigation]);

  useEffect(() => {
    if (!isCreate) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: Platform.OS !== 'web', // ✅ בווב אין native driver
      }).start();
    }
  }, [isCreate]);

  // ───────────────────────────── actions ───────────────────────────────
  const handlePressHome = (id) => props.navigation.navigate('ListItem', { id });
  const handleEditHome = (id) => props.navigation.navigate('EditHome', { id });
  const handlePressRefresh = () => props.navigation.navigate('Home');

  const deleteImage = async (folderPath) => {
    try {
      const storage = getStorage();
      const folderRef = storageRef(storage, folderPath);
      const result = await listAll(folderRef);

      for (const file of result.items) await deleteObject(file);
      for (const subFolder of result.prefixes) await deleteImage(subFolder.fullPath);
    } catch (error) {
      console.error('שגיאה במחיקת תיקייה:', error);
    }
  };

  const deleteAlert = async (idToDelete) => {
    try {
      const u = firebase.auth().currentUser;
      if (!u) return;

      const db = getDatabase();
      await remove(ref(db, `Events/${u.uid}/${idToDelete}`));
      await deleteImage(`users/${u.uid}/${idToDelete}/`);

      setData((prev) => prev.filter((ev) => ev.id !== idToDelete));
    } catch (e) {
      console.error('Error deleting event:', e);
      Alert.alert('שגיאה', e?.message || 'לא הצלחתי למחוק את האירוע.');
    }
  };

  // ✅ helper: מצא/אסוף נתיבים למחיקה לפי "שם מפתח" (fallback אם המבנה לא סטנדרטי)
  const collectDeletePathsByKey = (node, targetKey, basePath, out) => {
    if (!node || typeof node !== 'object') return;
    for (const k of Object.keys(node)) {
      const nextPath = `${basePath}/${k}`;
      if (k === targetKey) {
        out.push(nextPath);
      }
      collectDeletePathsByKey(node[k], targetKey, nextPath, out);
    }
  };

  // ✅ מוחק WhatsApp של האירוע שנלחץ (דינאמי) + fallback אם המבנה השתנה
  const clearWhatsappForEvent = async (eventId) => {
    const u = firebase.auth().currentUser;
    if (!u) return;

    const db = getDatabase();

    // 1) הכי חשוב: המבנה הסטנדרטי (ומומלץ) => whatsapp/{uid}/{eventId}
    const directRef = ref(db, `whatsapp/${u.uid}/${eventId}`);
    const directSnap = await get(directRef);
    if (directSnap.exists()) {
      await remove(directRef);
      return;
    }

    // 2) fallback: אם אצלך האירוע נמצא עמוק יותר תחת whatsapp/{uid}/...
    const rootRef = ref(db, `whatsapp/${u.uid}`);
    const rootSnap = await get(rootRef);
    const rootVal = rootSnap.val();

    if (!rootVal) return;

    const matches = [];
    collectDeletePathsByKey(rootVal, eventId, `whatsapp/${u.uid}`, matches);

    if (matches.length === 0) return;

    // מחיקה מרובה באטומיות באמצעות update(..., { path: null })
    const multi = {};
    for (const p of matches) multi[p] = null;
    await update(ref(db), multi);
  };

  // ✅ מאפס sent_msg ל-0 באירוע שנלחץ
  const resetEventStatsAndContacts = async (eventId) => {
  const u = firebase.auth().currentUser;
  if (!u) return;

  const db = getDatabase();

  // ✅ עדכון נקודתי בלי לדרוס שדות אחרים
  const patch = {
    [`Events/${u.uid}/${eventId}/sent_msg`]: 0,
    [`Events/${u.uid}/${eventId}/no_answear`]: 0,
    [`Events/${u.uid}/${eventId}/no_cuming`]: 0,
    [`Events/${u.uid}/${eventId}/yes_caming`]: 0,

    // ✅ מוחק את כל עץ contacts אם קיים
    [`Events/${u.uid}/${eventId}/contacts`]: null,
  };

  await update(ref(db), patch);
};


  // ✅ הפעולה הכוללת של "ניקוי נתונים": מוחק whatsapp של האירוע + מאפס sent_msg
  const clearDataForEvent = async (eventId) => {
    try {
      if (!eventId) return;

      await clearWhatsappForEvent(eventId);
      await resetEventStatsAndContacts(eventId);

      if (Platform.OS === 'web') {
        console.log('✅ cleared whatsapp + reset sent_msg');
      } else {
        Alert.alert('בוצע ✅', 'הנתונים נוקו בהצלחה.');
      }
    } catch (e) {
      console.error('❌ clearDataForEvent error:', e);
      if (Platform.OS === 'web') {
        console.log('❌ Error:', e?.message || e);
      } else {
        Alert.alert('שגיאה', e?.message || 'לא הצלחתי לנקות נתונים.');
      }
    }
  };

  const showAlert = (idToDelete) => {
    if (Platform.OS === 'web') {
      setSelectedId(idToDelete);
      setShowWebDialog(true);
    } else {
      Alert.alert(
        'מחק או ערוך',
        'מה ברצונך לעשות?',
        [
          { text: 'ערוך', onPress: () => handleEditHome(idToDelete) },
          { text: 'מחק', onPress: () => deleteAlert(idToDelete), style: 'destructive' },
          {
            text: 'ניקוי נתונים',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'ניקוי נתונים',
                'פעולה זו תנקה נתוני WhatsApp של האירוע ותאפס את מונה השליחות. האם להמשיך?',
                [
                  { text: 'ביטול', style: 'cancel' },
                  { text: 'כן, נקה', style: 'destructive', onPress: () => clearDataForEvent(idToDelete) },
                ],
                { cancelable: true }
              );
            },
          },
          { text: 'ביטול', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  };

  const handleDeleteData = (idToDelete) => {
    const u = firebase.auth().currentUser;
    if (u) showAlert(idToDelete);
  };

  // ───────────────────────────── offline view ──────────────────────────
  if (!isConnected) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.content, { maxWidth: 720 }]}>
          <Text style={styles.errorText}>בעיית אינטרנט</Text>
          <Text style={styles.errorSubText}>נא בדוק חיבור לרשת ה-Wi-Fi או בדוק עם ספק התקשורת שלך.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('Main')}>
            <Text style={styles.primaryBtnText}>טען מחדש</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────── render ──────────────────────────────
  return (
    <View style={styles.page}>
      {/* שכבת מדיה על כל המסך */}
      <Image
        source={require('../assets/Socialm.gif')}
        style={[styles.bgMedia, { opacity: MEDIA_VISIBILITY }]}
        resizeMode="cover"
      />

      {/* סקרימינג עדין לשיפור קריאות */}
      <View style={styles.bgScrim} />

      <StatusBar backgroundColor="#000" barStyle="light-content" />

      {/* מעטפת מרכזית רספונסיבית */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.brand}>EasyVent</Text>

          <TouchableOpacity
            onPress={() => props.navigation.navigate('Setting')}
            style={[
              styles.userBtn,
              Platform.OS === 'web' && windowWidth >= 900 ? { right: 250 } : { right: 30 },
            ]}
          >
            <Image source={require('../assets/user.png')} style={styles.userIcon} tintColor="#000" />
          </TouchableOpacity>
        </View>

        {/* CTA */}
        {!isCreate && (
          <TouchableOpacity onPress={handlePressRefresh} style={styles.cta}>
            <Image source={require('../assets/zor_event.png')} style={styles.ctaImg} />
          </TouchableOpacity>
        )}

        {/* כותרת רשימה */}
        {!isCreate && <Text style={styles.sectionTitle}>- האירועים שלי -</Text>}

        {/* רשימת אירועים */}
        {!isCreate && (
          <Animated.View style={[styles.listBox, { transform: [{ translateY: slideAnim }] }]}>
            {data.length === 0 ? (
              <Text style={styles.emptyText}>אין כרגע אירועים, צור אירוע חדש</Text>
            ) : (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator
              >
                {data.map((event) => (
                  // ✅ בלי accessibilityRole בווב => לא ייצר <button> (מונע button בתוך button)
                  <Pressable
                    key={event.id}
                    onPress={() => handlePressHome(event.id)}
                    style={styles.eventCard}
                    accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
                  >
                    <Text style={styles.eventTitle}>{event.id}</Text>

                    <Pressable
                      onPress={(ev) => {
                        if (Platform.OS === 'web' && ev?.stopPropagation) ev.stopPropagation();
                        handleDeleteData(event.id);
                      }}
                      style={styles.editBtn}
                      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
                    >
                      <Image source={require('../assets/edit.png')} style={styles.editIcon} />
                    </Pressable>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        )}

        {/* מצב לא מחובר/ברוכים הבאים */}
        {!isLoggedIn && (
          <>
            <Image source={require('../assets/VIDEOLOADING.gif')} style={styles.heroGif} />
            <Image source={require('../assets/eastvent_text1.png')} style={styles.heroTitleImg} />

            <TouchableOpacity onPress={() => props.navigation.navigate('LoginEmail')} style={styles.loginBtn}>
              <Image source={require('../assets/easyvent_login_botton.png')} style={styles.loginBtnImg} />
            </TouchableOpacity>
          </>
        )}

        {/* פוטר */}
        <Text style={styles.footer}>כל הזכויות שמורות EasyVent©</Text>
      </View>

      {/* ───────────── Web Dialog (ערוך/מחק/ניקוי/ביטול) ───────────── */}
      {Platform.OS === 'web' && showWebDialog && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>מה ברצונך לעשות?</Text>

            <TouchableOpacity
              onPress={() => {
                handleEditHome(selectedId);
                setShowWebDialog(false);
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>ערוך</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                deleteAlert(selectedId);
                setShowWebDialog(false);
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>מחק</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowWebDialog(false);
                setShowWebClearConfirm(true);
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>ניקוי נתונים</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowWebDialog(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ───────────── Web Confirm ניקוי (בלי להציג נתיב/UID) ───────────── */}
      {Platform.OS === 'web' && showWebClearConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>ניקוי נתונים</Text>

            <Text style={{ textAlign: 'center', marginBottom: 10 }}>
              פעולה זו תנקה נתוני WhatsApp של האירוע ותאפס את מונה השליחות.
              {'\n'}
              האם אתה בטוח שברצונך להמשיך?
            </Text>

            <TouchableOpacity
              onPress={async () => {
                await clearDataForEvent(selectedId);
                setShowWebClearConfirm(false);
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>כן, נקה</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowWebClearConfirm(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
    backgroundColor: '#fff',
  },

  bgMedia: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    pointerEvents: 'none',
  },

  bgScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.20)',
    zIndex: 1,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 980,
    paddingHorizontal: 16,
    paddingTop: 24,
    zIndex: 2,
  },

  headerRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    minHeight: 40,
  },
  brand: { fontSize: 32, fontWeight: '800', color: '#111' },
  userBtn: {
    position: 'absolute',
    right: 120,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  userIcon: { width: 28, height: 28 },

  cta: {
    marginTop: 12,
    marginBottom: 18,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  ctaImg: { width: 210, height: 37 },

  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, color: '#111' },

  listBox: {
    width: '100%',
    maxWidth: 520,
    maxHeight: 420,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  listScroll: { width: '100%' },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 16, color: '#222', textAlign: 'center', marginTop: 8 },

  eventCard: {
    width: '100%',
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(240,240,240,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: { fontSize: 24, color: '#111' },
  editBtn: {
    position: 'absolute',
    right: 10,
    top: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  editIcon: { width: 22, height: 22 },

  heroGif: { width: '70%', aspectRatio: 440 / 350, marginTop: 8 },
  heroTitleImg: { width: '60%', aspectRatio: 440 / 350, marginTop: 24 },
  loginBtn: { marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  loginBtnImg: { width: 340, height: 50 },

  footer: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#111',
    fontSize: 13,
  },

  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
    backgroundColor: '#fff',
  },
  errorText: { fontSize: 24, color: 'red', fontWeight: 'bold', textAlign: 'center' },
  errorSubText: { fontSize: 18, color: 'black', textAlign: 'center', marginVertical: 10 },
  primaryBtn: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'black',
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  primaryBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  modalButtonText: { color: '#fff', fontSize: 16 },
});

export default Main;
