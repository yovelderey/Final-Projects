// HomeThree.js — Dark Mode Normal (בלי תמונת רקע) + Web no-white-scroll
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { getDatabase, ref, set, get, remove, update } from 'firebase/database';

// ===== Firebase config (כמו אצלך) =====
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

async function updateMainSms(packageType, numberOfGuests, finalEventName) {
  try {
    const db = getDatabase();
    const user = firebase.auth().currentUser;
    if (!user) return;

    let multiplier = 2;
    if (packageType === 'plus' || packageType === 'digital' || packageType === 'premium') {
      multiplier = 4;
    }

    const newValue = Number(numberOfGuests || 0) * multiplier;

    await set(ref(db, `Events/${user.uid}/${finalEventName}/main_sms`), newValue);
    await set(ref(db, `Events/${user.uid}/${finalEventName}/plan`), packageType);
  } catch (err) {
    console.error('Error updating main_sms:', err);
  }
}

const HomeThree = ({ route }) => {
  const navigation = useNavigation();
  const db = useMemo(() => getDatabase(), []);
  const { width: screenW } = useWindowDimensions();

  // ===== Dark Mode =====
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo(() => {
    const primary = '#6c63ff';
    return {
      isDark,
      primary,

      bg: isDark ? '#0B1220' : '#F6F7FB',
      text: isDark ? '#EAF0FF' : '#0F172A',
      subText: isDark ? '#A9B4CC' : '#475569',
      muted: isDark ? '#7E8AA6' : '#94A3B8',

      card: isDark ? '#0F1A2B' : '#FFFFFF',
      cardSoft: isDark ? '#101E36' : '#F1F5F9',
      border: isDark ? '#22314F' : '#E6E8F0',

      overlay: 'rgba(0,0,0,0.65)',

      inputBg: isDark ? '#0B162B' : '#FFFFFF',
      inputBorder: isDark ? '#2A3A5F' : '#CBD5E1',

      cyanBtn: '#00e6e6',
      danger: '#ff4d4d',
      highlight: isDark ? '#7CF6FF' : '#0EA5E9',
    };
  }, [isDark]);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const placeholderColor = theme.muted;

  const { Numberofguests, finalEventName } = route.params;

  // helper: deep clone
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj ?? {}));

  // uid lock
  const [uid, setUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged((u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // ✅ חשוב ל-WEB: שלא יציץ לבן בגלילה
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = theme.bg;
      document.body.style.backgroundColor = theme.bg;
    }
  }, [theme.bg]);

  // animation
  const [animationValue] = useState(new Animated.Value(-500));

  // modals
  const [modals, setModals] = useState({
    basic: false,
    plus: false,
    digital: false,
    premium: false,
  });

  // references
  const [basicReference, setBasicReference] = useState('');
  const [plusReference, setPlusReference] = useState('');
  const [digitalReference, setDigitalReference] = useState('');
  const [premiumReference, setPremiumReference] = useState('');

  // show Bit image
  const [showImageBasic, setShowImageBasic] = useState(false);
  const [showImagePlus, setShowImagePlus] = useState(false);
  const [showImageDigital, setShowImageDigital] = useState(false);
  const [showImagePremium, setShowImagePremium] = useState(false);

  // payments
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsSaving, setPaymentsSaving] = useState(false);
  const [wantCardGifts, setWantCardGifts] = useState(false);

  const defaultPayments = useMemo(
    () => ({
      bit: { enabled: true, link: '' },
      paybox: { enabled: false, link: '' },
      credit: { fullName: '', id: '', bankNumber: '', branch: '', account: '' },
    }),
    []
  );

  const [payments, setPayments] = useState(defaultPayments);
  const [editPaymentsModal, setEditPaymentsModal] = useState(false);
  const [draftPayments, setDraftPayments] = useState(() => deepClone(defaultPayments));
  const [policyModal, setPolicyModal] = useState(false);

  // totals
  const base2 = Number(Numberofguests || 0) * 0.4;
  const base3 = Number(Numberofguests || 0) * 0.65;
  const base4 = Number(Numberofguests || 0) * 0.8;
  const basePremium = Number(Numberofguests || 0) * 1.7;

  const giftsAddon = wantCardGifts ? 100 : 0;

  const total2 = base2 + giftsAddon;
  const total3 = base3 + giftsAddon;
  const total4 = base4 + giftsAddon;
  const total = basePremium + giftsAddon;

  // load payments
  useEffect(() => {
    let mounted = true;

    const loadPayments = async () => {
      try {
        if (!authReady) return;

        if (!uid) {
          if (mounted) setPaymentsLoading(false);
          return;
        }

        if (mounted) setPaymentsLoading(true);

        const snap = await get(ref(db, `Events/${uid}/${finalEventName}`));
        if (!mounted) return;

        if (snap.exists()) {
          const data = snap.val() || {};
          const p = data.payments || {};

          const want = p?.wantCardGifts ?? data?.wantCardGifts ?? false;
          setWantCardGifts(!!want);

          const nextPayments = {
            bit: { enabled: p?.bit?.enabled ?? true, link: p?.bit?.link ?? '' },
            paybox: { enabled: p?.paybox?.enabled ?? false, link: p?.paybox?.link ?? '' },
            credit: {
              fullName: p?.credit?.fullName ?? '',
              id: p?.credit?.id ?? '',
              bankNumber: p?.credit?.bankNumber ?? '',
              branch: p?.credit?.branch ?? '',
              account: p?.credit?.account ?? '',
            },
          };

          setPayments(nextPayments);
          setDraftPayments(deepClone(nextPayments));
        } else {
          setWantCardGifts(false);
          setPayments(defaultPayments);
          setDraftPayments(deepClone(defaultPayments));
        }
      } catch (e) {
        console.error('loadPayments error:', e);
      } finally {
        if (mounted) setPaymentsLoading(false);
      }
    };

    loadPayments();
    return () => {
      mounted = false;
    };
  }, [db, finalEventName, uid, authReady, defaultPayments]);

  // animation start
  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: 0,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, [animationValue]);

  // modal helpers
  const openModal = (type) => setModals((prev) => ({ ...prev, [type]: true }));

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));

    if (type === 'basic') {
      setShowImageBasic(false);
      setBasicReference('');
    }
    if (type === 'plus') {
      setShowImagePlus(false);
      setPlusReference('');
    }
    if (type === 'digital') {
      setShowImageDigital(false);
      setDigitalReference('');
    }
    if (type === 'premium') {
      setShowImagePremium(false);
      setPremiumReference('');
    }
  };

  const handleSave = () => navigation.navigate('Main');

  // validate & consume reference
  const validateAndConsumeReference = async ({ value, referencePath, planName }) => {
    if (!/^\d+$/.test(String(value || ''))) {
      Alert.alert('שגיאה', 'יש להזין מספרים בלבד');
      return;
    }

    try {
      const snapshot = await get(ref(db, referencePath));
      if (!snapshot.exists()) {
        Alert.alert('שגיאה', 'לא קיימות אסמכתאות לחבילה זו');
        return;
      }

      const data = snapshot.val() || {};
      const foundKey = Object.keys(data).find((k) => String(data[k]) === String(value));

      if (!foundKey) {
        Alert.alert('שגיאה', 'אסמכתא לא תקינה');
        return;
      }

      await remove(ref(db, `${referencePath}/${foundKey}`));
      await updateMainSms(planName, Numberofguests, finalEventName);

      Alert.alert('הצלחה', 'אסמכתא תקינה ונמחקה בהצלחה!');
    } catch (error) {
      console.error(error);
      Alert.alert('שגיאה', 'קרתה בעיה בעת בדיקת/מחיקת האסמכתא');
    }
  };

  const handleValidateBasicReference = () =>
    validateAndConsumeReference({ value: basicReference, referencePath: 'Reference/Basic', planName: 'basic' });

  const handleValidatePlusReference = () =>
    validateAndConsumeReference({ value: plusReference, referencePath: 'Reference/Plus', planName: 'plus' });

  const handleValidateDigitalReference = () =>
    validateAndConsumeReference({ value: digitalReference, referencePath: 'Reference/Digital', planName: 'digital' });

  const handleValidatePremiumReference = () =>
    validateAndConsumeReference({
      value: premiumReference,
      referencePath: 'Reference/Complementary',
      planName: 'premium',
    });

  // wantCardGifts toggle
  const toggleWantCardGifts = async () => {
    try {
      if (!uid) {
        Alert.alert('שגיאה', 'נראה שהמשתמש לא מחובר. נסה לצאת ולהיכנס שוב.');
        return;
      }

      const next = !wantCardGifts;
      setWantCardGifts(next);

      const base = `Events/${uid}/${finalEventName}`;
      const updatesObj = {
        [`${base}/payments/wantCardGifts`]: next,
        [`${base}/wantCardGifts`]: null, // ניקוי הישן
        [`${base}/updatedAt`]: Date.now(),
      };

      await update(ref(db), updatesObj);
    } catch (e) {
      console.error('toggleWantCardGifts error:', e);
      Alert.alert('שגיאה', 'לא הצלחתי לעדכן את המצב. נסה שוב.');
      setWantCardGifts((prev) => !prev); // rollback
    }
  };

  // open/close payments modal
  const openEditPayments = () => {
    setDraftPayments(deepClone(payments));
    setEditPaymentsModal(true);
  };

  const closeEditPayments = () => {
    setDraftPayments(deepClone(payments));
    setEditPaymentsModal(false);
  };

  // save payments
  const savePayments = async () => {
    if (!uid) {
      Alert.alert('שגיאה', 'נראה שהמשתמש לא מחובר. נסה לצאת ולהיכנס שוב.');
      return;
    }
    if (paymentsSaving) return;

    const idStr = String(draftPayments.credit.id || '').trim();
    if (idStr && !/^\d+$/.test(idStr)) {
      Alert.alert('שגיאה', 'ת.ז חייבת להיות מספרים בלבד');
      return;
    }

    const branchStr = String(draftPayments.credit.branch || '').trim();
    if (branchStr && !/^\d+$/.test(branchStr)) {
      Alert.alert('שגיאה', 'סניף חייב להיות מספרים בלבד');
      return;
    }

    const accountStr = String(draftPayments.credit.account || '').trim();
    if (accountStr && !/^\d+$/.test(accountStr)) {
      Alert.alert('שגיאה', 'חשבון חייב להיות מספרים בלבד');
      return;
    }

    try {
      setPaymentsSaving(true);

      const base = `Events/${uid}/${finalEventName}`;
      const updatesObj = {
        [`${base}/payments/credit/fullName`]: String(draftPayments.credit.fullName || ''),
        [`${base}/payments/credit/id`]: String(draftPayments.credit.id || ''),
        [`${base}/payments/credit/bankNumber`]: String(draftPayments.credit.bankNumber || ''),
        [`${base}/payments/credit/branch`]: String(draftPayments.credit.branch || ''),
        [`${base}/payments/credit/account`]: String(draftPayments.credit.account || ''),

        [`${base}/payments/bit/enabled`]: !!draftPayments.bit.enabled,
        [`${base}/payments/bit/link`]: String(draftPayments.bit.link || ''),

        [`${base}/payments/paybox/enabled`]: !!draftPayments.paybox.enabled,
        [`${base}/payments/paybox/link`]: String(draftPayments.paybox.link || ''),

        [`${base}/updatedAt`]: Date.now(),
      };

      await update(ref(db), updatesObj);

      const saved = deepClone(draftPayments);
      setPayments(saved);
      setDraftPayments(deepClone(saved));

      setEditPaymentsModal(false);
      Alert.alert('נשמר', 'הפרטים עודכנו בהצלחה');
    } catch (e) {
      console.error('savePayments error:', e);
      Alert.alert('שגיאה', 'לא הצלחתי לשמור. נסה שוב.');
    } finally {
      setPaymentsSaving(false);
    }
  };

  // Checkbox UI
  const CheckboxRow = ({ checked, onPress, label, labelColor }) => {
    return (
      <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
          {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={[styles.checkLabel, { color: labelColor ?? theme.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const isSmall = screenW < 520;
  const pkgWidth = isSmall ? '100%' : '48%';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>יש לנו את זה! הכל מוכן</Text>
        <Text style={styles.title2}>בחר חבילה שמתאימה לך</Text>
        <Text style={styles.title3}>ותהנה מחווית ניהול אירוע ברמה גבוהה ומשתלמת</Text>
      </View>

      <View style={styles.container}>
        <Animated.View style={[styles.packageContainer, { transform: [{ translateY: animationValue }] }]}>
          {/* basic */}
          <View style={[styles.package, { width: pkgWidth }]}>
            <Image source={require('../assets/bag.png')} style={styles.packageIcon} />
            <Text style={styles.packageTitle}>חבילה בסיסית</Text>
            <Text style={styles.packageDescription}>
              חבילה לאירוע קטן (0-100 מוזמנים), הכוללת אישורי הגעה ב-WhatsApp וסידורי הושבה.
            </Text>
            <TouchableOpacity style={styles.purchaseButton} onPress={() => openModal('basic')}>
              <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
            </TouchableOpacity>
          </View>

          {/* plus */}
          <View style={[styles.package, { width: pkgWidth }]}>
            <Image source={require('../assets/pluss.png')} style={styles.packageIcon} />
            <Text style={styles.packageTitle}>חבילה פלוס</Text>
            <Text style={styles.packageDescription}>
              חבילה לאירוע בינוני (100-300 מוזמנים), הכוללת אישורי הגעה ב-WhatsApp, אישורי הגעה טלפוניים, וסידורי הושבה.
            </Text>
            <TouchableOpacity style={styles.purchaseButton} onPress={() => openModal('plus')}>
              <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
            </TouchableOpacity>
          </View>

          {/* digital */}
          <View style={[styles.package, { width: pkgWidth }]}>
            <View style={styles.availabilityBadge2}>
              <Text style={styles.availabilityText2}>הכי משתלמת!</Text>
            </View>
            <Image source={require('../assets/whatsapp.png')} style={styles.packageIcon} />
            <Text style={styles.packageTitle}>חבילה דיגיטלית</Text>
            <Text style={styles.packageDescription}>
              חבילה ב״ראש שקט״ שנתונת המון פיצרים (300-500 מוזמנים), הכוללת אישורי הגעה ב-WhatsApp, אישורי הגעה טלפוניים,
              וסידורי הושבה.
            </Text>
            <TouchableOpacity style={styles.purchaseButton} onPress={() => openModal('digital')}>
              <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
            </TouchableOpacity>
          </View>

          {/* premium */}
          <View style={[styles.package, { width: pkgWidth }]}>
            {Number(Numberofguests || 0) < 300 && (
              <View style={styles.availabilityBadge}>
                <Text style={styles.availabilityText}>זמין מעל 300</Text>
              </View>
            )}
            <Image source={require('../assets/send.png')} style={styles.packageIcon} />
            <Text style={styles.packageTitle}>חבילה משלימה</Text>
            <Text style={styles.packageDescription}>
              חבילה לאירוע ענק (500+ מוזמנים), הכוללת אישורי הגעה ב-WhatsApp, אישורי הגעה טלפוניים, סידורי הושבה, תמיכה
              טכנית מותאמת אישית, ודוחות מתקדמים לאירוע.
            </Text>
            <TouchableOpacity
              style={[styles.purchaseButton, Number(Numberofguests || 0) < 300 && styles.disabledButton]}
              disabled={Number(Numberofguests || 0) < 300}
              onPress={() => openModal('premium')}
            >
              <Text style={[styles.purchaseButtonText, Number(Numberofguests || 0) < 300 && styles.disabledButtonText]}>
                לפרטים ורכישה
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.title4}>ניתן להמשיך מבלי לבחור בחבילה ולהנות מרוב התכנים שאנו מספקים עבור האירוע שלכם.</Text>

        {/* gifts */}
        <View style={styles.giftsCardNarrow}>
          <Text style={styles.giftsTitle}>מתנות בהשראי</Text>

          {paymentsLoading ? (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <View style={[styles.giftsRow, isSmall && { flexDirection: 'column-reverse' }]}>
              <View style={[styles.giftsActions, isSmall && { width: '100%' }]}>
                <CheckboxRow checked={wantCardGifts} onPress={toggleWantCardGifts} label="אפשר לאורחים להביא מתנות בהשראי" />

                <Text style={styles.giftsPriceNote}>מחיר המנוי למתנות בהשראי הינו 100 ש״ח</Text>

                <TouchableOpacity style={styles.policyBtn} onPress={() => setPolicyModal(true)}>
                  <Text style={styles.policyBtnText}>מדיניות</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.editBtn} onPress={openEditPayments}>
                  <Text style={styles.editBtnText}>עריכת פרטים</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.giftsInfo}>
                <Text style={styles.giftsInfoTitle}>איך זה עובד בפועל?</Text>

                <Text style={styles.giftsInfoText}>
                  כשאתה מפעיל “מתנות בהשראי”, EasyVent יוצר לכל אורח מנגנון תשלום מסודר שמחובר לאירוע שלך. בפועל, כל אורח
                  מקבל קישור אישי (לינק ייחודי) שמוביל למסך תשלום מאובטח.
                </Text>

                <Text style={styles.giftsInfoText}>
                  בתוך הלינק, האורח יכול לבחור סכום מתנה, להשלים פרטים, ולבצע תשלום בצורה נוחה – בלי לבקש ממך מספר חשבון,
                  בלי לחפש איך מעבירים, ובלי “אני אשלח אחרי האירוע”.
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleSave}>
          <Text style={styles.nextButtonText}>סיימתי, בואו נתחיל!</Text>
        </TouchableOpacity>
      </View>

      {/* ===================== MODALS (Packages) ===================== */}

      {/* premium */}
      <Modal visible={modals.premium} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButtonX} onPress={() => closeModal('premium')}>
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>חבילה משלימה</Text>

              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>

                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות <Text style={styles.highlight}>אוטומטי ב-sms</Text> (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>✅ שיחות לאורחים שלא אישרו הגעה ע"י מוקד אנושי</Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת תודות <Text style={styles.highlight}>WhatsApp</Text> אחרי האירוע
                </Text>

                <Text style={styles.modalSubtitle}>החבילה כוללת גם:</Text>
                <Text style={styles.modalItem}>✅ מענה טלפוני להתייעצות ושאלות לגבי האירוע משעה (8:00 - 20:00)</Text>
                <Text style={styles.modalItem}>
                  ✅ צוות EasyVent מגיע לאירוע לסדר את האורחים בשולחנות על ידי דלפק בכניסה לאולם (זמין לכל הארץ מלבד אילת)
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/sms.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/phone-call.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב טלפוני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>תזכורת</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>תודה רבה</Text>
                </View>
              </View>

              <View style={styles.iconContainer}>
                <Image source={require('../assets/stewardess.png')} style={styles.icon3} />
                <Text style={styles.iconText}>מארחת לסידור השולחנות</Text>
              </View>

              <Text style={styles.packageTitle2}> רק ב- {total.toFixed(2)}₪</Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 1.7 = {basePremium.toFixed(2)}₪)
                {wantCardGifts ? ` + 100₪ = ${total.toFixed(2)}₪` : ''}
              </Text>
              <Text style={styles.iconText}>*המחיר לפי {Numberofguests} מוזמנים</Text>

              {showImagePremium && <View style={styles.separator} />}

              {showImagePremium && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל האירוע או לחלופין ליצור קשר עם התמיכה
                  בטלפון: 054-2455869
                </Text>
              )}
              {showImagePremium && <Image source={require('../assets/payment.png')} style={styles.purchaseImage} />}

              <TouchableOpacity style={styles.purchaseButton2} onPress={() => setShowImagePremium(true)}>
                <Text style={styles.purchaseButtonText2}>רכישה</Text>
              </TouchableOpacity>

              {showImagePremium && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="הזן אסמכתא"
                    placeholderTextColor={placeholderColor}
                    value={premiumReference}
                    onChangeText={setPremiumReference}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.validateButton} onPress={handleValidatePremiumReference}>
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* basic */}
      <Modal visible={modals.basic} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButtonX} onPress={() => closeModal('basic')}>
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>חבילה בסיסית</Text>

              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות <Text style={styles.highlight}>אוטומטי ב-sms</Text> (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/sms.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
              </View>

              <Text style={styles.packageTitle2}> רק ב- {total2.toFixed(2)}₪</Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 0.4 = {base2.toFixed(2)}₪)
                {wantCardGifts ? ` + 100₪ = ${total2.toFixed(2)}₪` : ''}
              </Text>
              <Text style={styles.iconText}>*המחיר לפי {Numberofguests} מוזמנים</Text>

              {showImageBasic && <View style={styles.separator} />}

              {showImageBasic && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל האירוע או לחלופין ליצור קשר עם התמיכה
                  בטלפון: 054-2455869
                </Text>
              )}
              {showImageBasic && <Image source={require('../assets/payment.png')} style={styles.purchaseImage} />}

              <TouchableOpacity style={styles.purchaseButton2} onPress={() => setShowImageBasic(true)}>
                <Text style={styles.purchaseButtonText2}>רכישה</Text>
              </TouchableOpacity>

              {showImageBasic && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="הזן אסמכתא"
                    placeholderTextColor={placeholderColor}
                    value={basicReference}
                    onChangeText={setBasicReference}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.validateButton} onPress={handleValidateBasicReference}>
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* plus */}
      <Modal visible={modals.plus} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButtonX} onPress={() => closeModal('plus')}>
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>חבילה פלוס</Text>

              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות <Text style={styles.highlight}>אוטומטי ב-sms</Text> (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת תודות <Text style={styles.highlight}>WhatsApp</Text> אחרי האירוע
                </Text>

                <Text style={styles.modalSubtitle}>החבילה כוללת גם:</Text>
                <Text style={styles.modalItem}>✅ מענה טלפוני להתייעצות ושאלות לגבי האירוע משעה (8:00 - 20:00)</Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/sms.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>תזכורת</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>תודה רבה</Text>
                </View>
              </View>

              <Text style={styles.packageTitle2}> רק ב- {total3.toFixed(2)}₪</Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 0.65 = {base3.toFixed(2)}₪)
                {wantCardGifts ? ` + 100₪ = ${total3.toFixed(2)}₪` : ''}
              </Text>
              <Text style={styles.iconText}>*המחיר לפי {Numberofguests} מוזמנים</Text>

              {showImagePlus && <View style={styles.separator} />}

              {showImagePlus && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל האירוע או לחלופין ליצור קשר עם התמיכה
                  בטלפון: 054-2455869
                </Text>
              )}
              {showImagePlus && <Image source={require('../assets/payment.png')} style={styles.purchaseImage} />}

              <TouchableOpacity style={styles.purchaseButton2} onPress={() => setShowImagePlus(true)}>
                <Text style={styles.purchaseButtonText2}>רכישה</Text>
              </TouchableOpacity>

              {showImagePlus && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="הזן אסמכתא"
                    placeholderTextColor={placeholderColor}
                    value={plusReference}
                    onChangeText={setPlusReference}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.validateButton} onPress={handleValidatePlusReference}>
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* digital */}
      <Modal visible={modals.digital} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButtonX} onPress={() => closeModal('digital')}>
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>חבילה דיגיטלית</Text>

              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>

                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text> (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>✅ שיחות לאורחים שלא אישרו הגעה ע"י מוקד אנושי</Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת תודות <Text style={styles.highlight}>WhatsApp</Text> אחרי האירוע
                </Text>

                <Text style={styles.modalSubtitle}>החבילה כוללת גם:</Text>
                <Text style={styles.modalItem}>✅ מענה טלפוני להתייעצות ושאלות לגבי האירוע משעה (8:00 - 20:00)</Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/phone-call.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>סבב טלפוני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>תזכורת</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image source={require('../assets/whatsapp.png')} style={styles.icon3} />
                  <Text style={styles.iconText}>תודה רבה</Text>
                </View>
              </View>

              <Text style={styles.packageTitle2}> רק ב- {total4.toFixed(2)}₪</Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 0.8 = {base4.toFixed(2)}₪)
                {wantCardGifts ? ` + 100₪ = ${total4.toFixed(2)}₪` : ''}
              </Text>
              <Text style={styles.iconText}>*המחיר לפי {Numberofguests} מוזמנים</Text>

              {showImageDigital && <View style={styles.separator} />}

              {showImageDigital && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל האירוע או לחלופין ליצור קשר עם התמיכה
                  בטלפון: 054-2455869
                </Text>
              )}
              {showImageDigital && <Image source={require('../assets/payment.png')} style={styles.purchaseImage} />}

              <TouchableOpacity style={styles.purchaseButton2} onPress={() => setShowImageDigital(true)}>
                <Text style={styles.purchaseButtonText2}>רכישה</Text>
              </TouchableOpacity>

              {showImageDigital && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="הזן אסמכתא"
                    placeholderTextColor={placeholderColor}
                    value={digitalReference}
                    onChangeText={setDigitalReference}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.validateButton} onPress={handleValidateDigitalReference}>
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* edit payments */}
      <Modal visible={editPaymentsModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.paymentsModal}>
            <TouchableOpacity style={styles.closeButtonX} onPress={closeEditPayments}>
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>עריכת פרטי תשלום / אשראי</Text>

              <Text style={styles.modalSubtitle}>פרטי אשראי (למתנות באשראי)</Text>

              <TextInput
                style={styles.input}
                placeholder="שם מלא"
                placeholderTextColor={placeholderColor}
                value={draftPayments.credit.fullName}
                onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, fullName: t } }))}
              />

              <TextInput
                style={styles.input}
                placeholder="תעודת זהות"
                placeholderTextColor={placeholderColor}
                value={draftPayments.credit.id}
                onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, id: t } }))}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="שם/מספר בנק (למשל לאומי)"
                placeholderTextColor={placeholderColor}
                value={draftPayments.credit.bankNumber}
                onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, bankNumber: t } }))}
              />

              <TextInput
                style={styles.input}
                placeholder="סניף"
                placeholderTextColor={placeholderColor}
                value={draftPayments.credit.branch}
                onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, branch: t } }))}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="מספר חשבון"
                placeholderTextColor={placeholderColor}
                value={draftPayments.credit.account}
                onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, account: t } }))}
                keyboardType="numeric"
              />

              <View style={styles.separator} />

              <Text style={styles.modalSubtitle}>Bit</Text>
              <CheckboxRow
                checked={!!draftPayments.bit.enabled}
                onPress={() => setDraftPayments((p) => ({ ...p, bit: { ...p.bit, enabled: !p.bit.enabled } }))}
                label="להפעיל Bit"
              />
              <TextInput
                style={styles.input}
                placeholder="קישור Bit"
                placeholderTextColor={placeholderColor}
                value={draftPayments.bit.link}
                onChangeText={(t) => setDraftPayments((p) => ({ ...p, bit: { ...p.bit, link: t } }))}
              />

              <View style={styles.separator} />

              <Text style={styles.modalSubtitle}>PayBox</Text>
              <CheckboxRow
                checked={!!draftPayments.paybox.enabled}
                onPress={() =>
                  setDraftPayments((p) => ({
                    ...p,
                    paybox: { ...p.paybox, enabled: !p.paybox.enabled },
                  }))
                }
                label="להפעיל PayBox"
              />
              <TextInput
                style={styles.input}
                placeholder="קישור PayBox"
                placeholderTextColor={placeholderColor}
                value={draftPayments.paybox.link}
                onChangeText={(t) => setDraftPayments((p) => ({ ...p, paybox: { ...p.paybox, link: t } }))}
              />

              <View style={{ height: 10 }} />

              <TouchableOpacity
                style={[styles.purchaseButton2, paymentsSaving && { opacity: 0.6 }]}
                onPress={savePayments}
                disabled={paymentsSaving}
              >
                <Text style={styles.purchaseButtonText2}>{paymentsSaving ? 'שומר...' : 'שמור'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* policy */}
      <Modal visible={policyModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.policyModal}>
            <TouchableOpacity style={styles.closeButtonX} onPress={() => setPolicyModal(false)}>
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={{ paddingTop: 10 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>מדיניות מתנות בהשראי</Text>

              <Text style={styles.policyText}>
                • המנוי למתנות בהשראי עולה 100 ש״ח ומתווסף למחיר החבילה במידה והאפשרות מסומנת.{'\n'}
                • האחריות למילוי פרטי התשלום/חשבון היא על בעל האירוע.{'\n'}
                • מומלץ לוודא שהפרטים נכונים לפני הפעלה.{'\n'}
                • ניתן לכבות את האפשרות בכל עת – המחיר מוצג ומתווסף בזמן שהאפשרות פעילה.
              </Text>

              <TouchableOpacity style={[styles.validateButton, { marginTop: 14 }]} onPress={() => setPolicyModal(false)}>
                <Text style={styles.validateButtonText}>הבנתי</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (t) =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: t.bg,
      paddingBottom: 30,
      ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
    },

    header: {
      paddingTop: 22,
      paddingHorizontal: 16,
      alignItems: 'center',
    },

    container: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 10,
    },

    title: {
      fontSize: 24,
      fontWeight: '900',
      color: t.primary,
      marginTop: 6,
      textAlign: 'center',
    },
    title2: {
      fontSize: 22,
      fontWeight: '900',
      color: t.text,
      marginTop: 6,
      textAlign: 'center',
    },
    title3: {
      fontSize: 13,
      fontWeight: '800',
      color: t.subText,
      marginTop: 6,
      textAlign: 'center',
    },
    title4: {
      fontSize: 13,
      marginTop: 12,
      textAlign: 'center',
      fontWeight: '800',
      color: t.subText,
      maxWidth: 900,
    },

    packageContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      width: '100%',
      maxWidth: 980,
      marginTop: 14,
      gap: 12,
    },

    package: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      marginBottom: 4,
      minHeight: 220,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: '#000',
      shadowOpacity: t.isDark ? 0.28 : 0.08,
      shadowRadius: 10,
      elevation: 4,
    },

    packageIcon: { width: 48, height: 48, marginBottom: 10, resizeMode: 'contain' },

    packageTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: t.primary,
      marginBottom: 8,
      textAlign: 'center',
    },

    packageDescription: {
      fontSize: 13,
      textAlign: 'center',
      color: t.subText,
      flex: 1,
      marginBottom: 12,
      lineHeight: 18,
      fontWeight: '700',
    },

    purchaseButton: {
      backgroundColor: t.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
    },
    purchaseButtonText: { color: 'white', fontSize: 15, fontWeight: '900' },

    nextButton: {
      marginTop: 18,
      backgroundColor: t.primary,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      width: 300,
      maxWidth: '92%',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: t.isDark ? 0.25 : 0.12,
      shadowRadius: 10,
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
    },
    nextButtonText: { color: 'white', fontSize: 17, fontWeight: '900' },

    packageTitle2: {
      backgroundColor: t.cardSoft,
      color: t.primary,
      fontSize: 24,
      fontWeight: '900',
      padding: 10,
      borderRadius: 14,
      textAlign: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 10,
      marginTop: 18,
      width: '100%',
    },

    // ===== modal base =====
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.overlay,
      paddingHorizontal: 12,
    },

    modalContent: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 18,
      width: '100%',
      maxWidth: 560,
      height: '72%',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },

    paymentsModal: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 18,
      width: '100%',
      maxWidth: 620,
      height: '80%',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },

    policyModal: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 18,
      width: '100%',
      maxWidth: 560,
      maxHeight: '72%',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },

    closeButtonX: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: t.danger,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    closeButtonXText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

    modalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: t.text,
      marginBottom: 10,
      textAlign: 'right',
      alignSelf: 'stretch',
      paddingLeft: 40,
    },

    modalSubtitle: {
      fontSize: 16,
      fontWeight: '900',
      color: t.text,
      marginVertical: 10,
      textAlign: 'right',
      alignSelf: 'stretch',
    },

    modalItem: {
      fontSize: 14,
      color: t.subText,
      marginBottom: 8,
      textAlign: 'right',
      alignSelf: 'stretch',
      fontWeight: '700',
      lineHeight: 20,
    },

    highlight: { color: t.highlight, fontWeight: '900' },

    separator: {
      height: 1,
      backgroundColor: t.border,
      marginVertical: 14,
      alignSelf: 'stretch',
    },

    modalDetails: { alignSelf: 'stretch' },

    iconRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      width: '100%',
      marginTop: 10,
      flexWrap: 'wrap',
      gap: 10,
    },

    iconContainer: { alignItems: 'center' },
    icon3: { width: 34, height: 34, marginBottom: 6, resizeMode: 'contain' },
    iconText: { fontSize: 12, color: t.subText, textAlign: 'center', fontWeight: '800' },

    purchaseButton2: {
      backgroundColor: t.cyanBtn,
      paddingVertical: 12,
      borderRadius: 14,
      marginTop: 18,
      alignSelf: 'center',
      width: '86%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.08)',
    },
    purchaseButtonText2: { color: '#0B1220', fontSize: 16, fontWeight: '900' },

    purchaseImage: {
      width: '100%',
      height: 360,
      marginTop: 14,
      borderRadius: 14,
      alignSelf: 'center',
      resizeMode: 'contain',
    },

    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingBottom: 50,
      paddingTop: 10,
    },

    txtpay: {
      marginTop: 14,
      fontSize: 14,
      fontWeight: '800',
      color: t.subText,
      textAlign: 'center',
      lineHeight: 20,
    },

    disabledButton: { backgroundColor: t.isDark ? '#2A3347' : '#E2E8F0' },
    disabledButtonText: { color: t.isDark ? '#A9B4CC' : '#64748B' },

    availabilityBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: t.isDark ? '#0B1220' : '#0F172A',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    availabilityText: { color: 'white', fontSize: 11, fontWeight: '900' },

    availabilityBadge2: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: '#FF69B4',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    availabilityText2: { color: 'white', fontSize: 11, fontWeight: '900' },

    input: {
      width: '92%',
      height: 48,
      borderColor: t.inputBorder,
      borderWidth: 1,
      marginTop: 12,
      borderRadius: 14,
      paddingHorizontal: 12,
      color: t.text,
      textAlign: 'right',
      backgroundColor: t.inputBg,
      fontWeight: '800',
    },

    validateButton: {
      backgroundColor: t.primary,
      paddingVertical: 10,
      marginTop: 10,
      borderRadius: 14,
      alignSelf: 'center',
      width: '70%',
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
    },
    validateButtonText: { color: '#fff', fontSize: 15, textAlign: 'center', fontWeight: '900' },

    // checkbox
    checkRow: {
      width: '100%',
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingVertical: 8,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      backgroundColor: 'transparent',
    },
    checkboxOn: { backgroundColor: t.primary },
    checkboxMark: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: -1 },
    checkLabel: { fontSize: 14, fontWeight: '900', textAlign: 'right', flex: 1 },

    // gifts section
    giftsCardNarrow: {
      width: '100%',
      maxWidth: 980,
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 14,
      marginTop: 18,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: t.isDark ? 0.22 : 0.08,
      shadowRadius: 10,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    giftsTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: t.primary,
      textAlign: 'right',
      marginBottom: 6,
    },
    giftsPriceNote: {
      marginTop: 4,
      textAlign: 'right',
      fontSize: 12,
      color: t.subText,
      fontWeight: '900',
      alignSelf: 'stretch',
    },
    policyBtn: {
      marginTop: 8,
      alignSelf: 'flex-end',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.primary,
      backgroundColor: 'transparent',
    },
    policyBtnText: { color: t.primary, fontWeight: '900', fontSize: 12 },
    editBtn: {
      marginTop: 10,
      backgroundColor: t.primary,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
    },
    editBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    policyText: {
      color: t.text,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'right',
      fontWeight: '700',
    },

    giftsRow: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      gap: 12,
    },
    giftsActions: { width: 190, alignItems: 'stretch' },
    giftsInfo: { flex: 1, paddingRight: 6 },
    giftsInfoTitle: { fontSize: 14, fontWeight: '900', color: t.text, textAlign: 'right', marginBottom: 6 },
    giftsInfoText: {
      fontSize: 12.5,
      color: t.subText,
      lineHeight: 18,
      textAlign: 'right',
      marginBottom: 8,
      fontWeight: '700',
    },
  });

export default HomeThree;
