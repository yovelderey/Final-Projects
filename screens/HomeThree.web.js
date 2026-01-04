// HomeThree.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Modal,
  Animated,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
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

  const { Numberofguests, finalEventName } = route.params;

  // ✅ helper: deep clone כדי לא להעביר reference בין עריכות
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj ?? {}));

  // ✅ ננעל על uid כדי לא להשתמש ב-currentUser בזמן לחיצה (שיכול להיות null)
  const [uid, setUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged((u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // ===== animation =====
  const [animationValue] = useState(new Animated.Value(-500));

  // ===== modals of packages =====
  const [modals, setModals] = useState({
    basic: false,
    plus: false,
    digital: false,
    premium: false,
  });

  // ===== reference inputs =====
  const [basicReference, setBasicReference] = useState('');
  const [plusReference, setPlusReference] = useState('');
  const [digitalReference, setDigitalReference] = useState('');
  const [premiumReference, setPremiumReference] = useState('');

  // ===== show Bit image per modal =====
  const [showImageBasic, setShowImageBasic] = useState(false);
  const [showImagePlus, setShowImagePlus] = useState(false);
  const [showImageDigital, setShowImageDigital] = useState(false);
  const [showImagePremium, setShowImagePremium] = useState(false);

  // ===== ✅ Credit gifts area (wantCardGifts + payments edit) =====
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsSaving, setPaymentsSaving] = useState(false);

  // ✅ הצ׳קבוקס (נשמר בתוך payments/wantCardGifts)
  const [wantCardGifts, setWantCardGifts] = useState(false);

  const defaultPayments = useMemo(
    () => ({
      bit: { enabled: true, link: '' },
      paybox: { enabled: false, link: '' },
      credit: {
        fullName: '',
        id: '',
        bankNumber: '',
        branch: '',
        account: '',
      },
    }),
    []
  );

  const [payments, setPayments] = useState(defaultPayments);
  const [editPaymentsModal, setEditPaymentsModal] = useState(false);
  const [draftPayments, setDraftPayments] = useState(() => deepClone(defaultPayments));

  // ✅ מודאל מדיניות
  const [policyModal, setPolicyModal] = useState(false);

  // ===== totals =====
  const base2 = Number(Numberofguests || 0) * 0.4;
  const base3 = Number(Numberofguests || 0) * 0.65;
  const base4 = Number(Numberofguests || 0) * 0.8;
  const basePremium = Number(Numberofguests || 0) * 1.7;

  const giftsAddon = wantCardGifts ? 100 : 0;

  const total2 = base2 + giftsAddon;
  const total3 = base3 + giftsAddon;
  const total4 = base4 + giftsAddon;
  const total = basePremium + giftsAddon;

  // ===== load payments + wantCardGifts from firebase =====
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

          // ✅ חשוב: wantCardGifts מתוך payments (ואם יש כפול הישן ברוט – fallback)
          const want = p?.wantCardGifts ?? data?.wantCardGifts ?? false;
          setWantCardGifts(!!want);

          const nextPayments = {
            bit: {
              enabled: p?.bit?.enabled ?? true,
              link: p?.bit?.link ?? '',
            },
            paybox: {
              enabled: p?.paybox?.enabled ?? false,
              link: p?.paybox?.link ?? '',
            },
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

  // ===== animation start =====
  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [animationValue]);

  // ===== modal helpers =====
  const openModal = (type) => setModals((prev) => ({ ...prev, [type]: true }));

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));

    // reset per modal
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

  // ===== generic validate & remove reference =====
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
    validateAndConsumeReference({
      value: basicReference,
      referencePath: 'Reference/Basic',
      planName: 'basic',
    });

  const handleValidatePlusReference = () =>
    validateAndConsumeReference({
      value: plusReference,
      referencePath: 'Reference/Plus',
      planName: 'plus',
    });

  const handleValidateDigitalReference = () =>
    validateAndConsumeReference({
      value: digitalReference,
      referencePath: 'Reference/Digital',
      planName: 'digital',
    });

  const handleValidatePremiumReference = () =>
    validateAndConsumeReference({
      value: premiumReference,
      referencePath: 'Reference/Complementary',
      planName: 'premium',
    });

  // ===== ✅ wantCardGifts toggle (checkbox) =====
  const toggleWantCardGifts = async () => {
    try {
      if (!uid) {
        Alert.alert('שגיאה', 'נראה שהמשתמש לא מחובר. נסה לצאת ולהיכנס שוב.');
        return;
      }

      const next = !wantCardGifts;
      setWantCardGifts(next);

      const base = `Events/${uid}/${finalEventName}`;

      // ✅ מעדכן את השדה הנכון בתוך payments
      // ✅ ומנקה את הכפול ברוט (רק כדי שלא תסתבך בעתיד)
      const updatesObj = {
        [`${base}/payments/wantCardGifts`]: next,
        [`${base}/wantCardGifts`]: null, // מוחק את השדה הישן ברוט אם קיים
        [`${base}/updatedAt`]: Date.now(),
      };

      await update(ref(db), updatesObj);
    } catch (e) {
      console.error('toggleWantCardGifts error:', e);
      Alert.alert('שגיאה', 'לא הצלחתי לעדכן את המצב. נסה שוב.');
      setWantCardGifts((prev) => !prev); // rollback
    }
  };

  // ===== ✅ open edit modal =====
  const openEditPayments = () => {
    setDraftPayments(deepClone(payments)); // ✅ אין reference
    setEditPaymentsModal(true);
  };

  const closeEditPayments = () => {
    setDraftPayments(deepClone(payments)); // מחזירים את הטיוטה למצב האחרון שנשמר
    setEditPaymentsModal(false);
  };

  // ===== ✅ save payments fields =====
  const savePayments = async () => {
    if (!uid) {
      Alert.alert('שגיאה', 'נראה שהמשתמש לא מחובר. נסה לצאת ולהיכנס שוב.');
      return;
    }
    if (paymentsSaving) return;

    // ✅ ולידציות לפני שמדליקים "שומר..."
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

      // עדכון בפיירבייס בצורה "שטוחה" כדי לא לדרוס אובייקטים בטעות
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

      // ✅ מעדכנים state עם clone כדי לא לשמור reference
      const saved = deepClone(draftPayments);
      setPayments(saved);
      setDraftPayments(deepClone(saved));

      setEditPaymentsModal(false); // ✅ נסגר תמיד אחרי הצלחה
      Alert.alert('נשמר', 'הפרטים עודכנו בהצלחה');
    } catch (e) {
      console.error('savePayments error:', e);
      Alert.alert('שגיאה', 'לא הצלחתי לשמור. נסה שוב.');
    } finally {
      setPaymentsSaving(false);
    }
  };

  // ===== Checkbox UI =====
  const CheckboxRow = ({ checked, onPress, label, labelColor = '#111' }) => {
    return (
      <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
          {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={[styles.checkLabel, { color: labelColor }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <ImageBackground source={require('../assets/Home_four2.png')} style={styles.backgroundImage}>
        <Text style={styles.title}>יש לנו את זה! הכל מוכן</Text>
        <Text style={styles.title2}>בחר חבילה שמתאימה לך</Text>
        <Text style={styles.title3}>ותהנה מחווית ניהול אירוע ברמה גבוהה ומשתלמת</Text>

        <View style={styles.container}>
          <Animated.View style={[styles.packageContainer, { transform: [{ translateY: animationValue }] }]}>
            {/* basic */}
            <View style={styles.package}>
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
            <View style={styles.package}>
              <Image source={require('../assets/pluss.png')} style={styles.packageIcon} />
              <Text style={styles.packageTitle}>חבילה פלוס</Text>
              <Text style={styles.packageDescription}>
                חבילה לאירוע בינוני (100-300 מוזמנים), הכוללת אישורי הגעה ב-WhatsApp, אישורי הגעה טלפוניים, וסידורי
                הושבה.
              </Text>
              <TouchableOpacity style={styles.purchaseButton} onPress={() => openModal('plus')}>
                <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
              </TouchableOpacity>
            </View>

            {/* digital */}
            <View style={styles.package}>
              <View style={styles.availabilityBadge2}>
                <Text style={styles.availabilityText2}>הכי משתלמת!</Text>
              </View>
              <Image source={require('../assets/whatsapp.png')} style={styles.packageIcon} />
              <Text style={styles.packageTitle}>חבילה דיגיטלית</Text>
              <Text style={styles.packageDescription}>
                חבילה ב״ראש שקט״ שנתונת המון פיצרים (300-500 מוזמנים), הכוללת אישורי הגעה ב-WhatsApp, אישורי הגעה
                טלפוניים, וסידורי הושבה.
              </Text>
              <TouchableOpacity style={styles.purchaseButton} onPress={() => openModal('digital')}>
                <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
              </TouchableOpacity>
            </View>

            {/* premium */}
            <View style={styles.package}>
              {Number(Numberofguests || 0) < 300 && (
                <View style={styles.availabilityBadge}>
                  <Text style={styles.availabilityText}>זמין מעל 300</Text>
                </View>
              )}
              <Image source={require('../assets/send.png')} style={styles.packageIcon} />
              <Text style={styles.packageTitle}>חבילה משלימה</Text>
              <Text style={styles.packageDescription}>
                חבילה לאירוע ענק (500+ מוזמנים), הכוללת אישורי הגעה ב-WhatsApp, אישורי הגעה טלפוניים, סידורי הושבה,
                תמיכה טכנית מותאמת אישית, ודוחות מתקדמים לאירוע.
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

          <Text style={styles.title4}>
            ניתן להמשיך מבלי לבחור בחבילה ולהנות מרוב התכנים שאנו מספקים עבור האירוע שלכם.
          </Text>

          {/* ✅ אזור מתנות בהשראי (צר יותר) */}
<View style={styles.giftsCardNarrow}>
  <Text style={styles.giftsTitle}>מתנות בהשראי</Text>

  {paymentsLoading ? (
    <View style={{ paddingVertical: 10 }}>
      <ActivityIndicator />
    </View>
  ) : (
    <View style={styles.giftsRow}>
      {/* ✅ צד שמאל: פעולות */}
      <View style={styles.giftsActions}>
        <CheckboxRow
          checked={wantCardGifts}
          onPress={toggleWantCardGifts}
          label="אפשר לאורחים להביא מתנות בהשראי"
          labelColor="#111"
        />

        <Text style={styles.giftsPriceNote}>מחיר המנוי למתנות בהשראי הינו 100 ש״ח</Text>

        <TouchableOpacity style={styles.policyBtn} onPress={() => setPolicyModal(true)}>
          <Text style={styles.policyBtnText}>מדיניות</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBtn} onPress={openEditPayments}>
          <Text style={styles.editBtnText}>עריכת פרטים</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ צד ימין: טקסט הסבר ארוך */}
      <View style={styles.giftsInfo}>
        <Text style={styles.giftsInfoTitle}>איך זה עובד בפועל?</Text>

        <Text style={styles.giftsInfoText}>
          כשאתה מפעיל “מתנות בהשראי”, EasyVent יוצר לכל אורח מנגנון תשלום מסודר שמחובר לאירוע שלך.  
          בפועל, כל אורח מקבל קישור אישי (לינק ייחודי) שמוביל למסך תשלום מאובטח.
        </Text>

        <Text style={styles.giftsInfoText}>
          בתוך הלינק, האורח יכול לבחור סכום מתנה, להשלים פרטים, ולבצע תשלום בצורה נוחה – בלי לבקש ממך מספר חשבון, בלי לחפש איך
          מעבירים, ובלי “אני אשלח אחרי האירוע”.
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

              <ScrollView contentContainerStyle={styles.scrollContent}>
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
                    ✅ צוות EasyVent מגיע לאירוע לסדר את האורחים בשולחנות על ידי דלפק בכניסה לאולם (זמין לכל הארץ מלבד
                    אילת)
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
                      placeholderTextColor="#ccc"
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

              <ScrollView contentContainerStyle={styles.scrollContent}>
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
                      placeholderTextColor="#ccc"
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

              <ScrollView contentContainerStyle={styles.scrollContent}>
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
                      placeholderTextColor="#ccc"
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

              <ScrollView contentContainerStyle={styles.scrollContent}>
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
                      placeholderTextColor="#ccc"
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

        {/* ===================== ✅ MODAL: edit payments ===================== */}
        <Modal visible={editPaymentsModal} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.paymentsModal}>
              <TouchableOpacity style={styles.closeButtonX} onPress={closeEditPayments}>
                <Text style={styles.closeButtonXText}>X</Text>
              </TouchableOpacity>

              <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.modalTitle}>עריכת פרטי תשלום / אשראי</Text>

                <Text style={styles.modalSubtitle}>פרטי אשראי (למתנות באשראי)</Text>

                <TextInput
                  style={styles.input}
                  placeholder="שם מלא"
                  placeholderTextColor="#ccc"
                  value={draftPayments.credit.fullName}
                  onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, fullName: t } }))}
                />

                <TextInput
                  style={styles.input}
                  placeholder="תעודת זהות"
                  placeholderTextColor="#ccc"
                  value={draftPayments.credit.id}
                  onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, id: t } }))}
                  keyboardType="numeric"
                />

                <TextInput
                  style={styles.input}
                  placeholder="שם/מספר בנק (למשל לאומי)"
                  placeholderTextColor="#ccc"
                  value={draftPayments.credit.bankNumber}
                  onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, bankNumber: t } }))}
                />

                <TextInput
                  style={styles.input}
                  placeholder="סניף"
                  placeholderTextColor="#ccc"
                  value={draftPayments.credit.branch}
                  onChangeText={(t) => setDraftPayments((p) => ({ ...p, credit: { ...p.credit, branch: t } }))}
                  keyboardType="numeric"
                />

                <TextInput
                  style={styles.input}
                  placeholder="מספר חשבון"
                  placeholderTextColor="#ccc"
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
                  labelColor="#fff"
                />
                <TextInput
                  style={styles.input}
                  placeholder="קישור Bit"
                  placeholderTextColor="#ccc"
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
                  labelColor="#fff"
                />
                <TextInput
                  style={styles.input}
                  placeholder="קישור PayBox"
                  placeholderTextColor="#ccc"
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

        {/* ===================== ✅ MODAL: policy ===================== */}
        <Modal visible={policyModal} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.policyModal}>
              <TouchableOpacity style={styles.closeButtonX} onPress={() => setPolicyModal(false)}>
                <Text style={styles.closeButtonXText}>X</Text>
              </TouchableOpacity>

              <ScrollView contentContainerStyle={{ paddingTop: 10 }}>
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
      </ImageBackground>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    minHeight: '100vh',
    resizeMode: 'cover',
    justifyContent: 'flex-start',
  },
  scrollContainer: { flexGrow: 1 },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 70,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginTop: 20,
    textAlign: 'center',
  },
  title2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 3,
    textAlign: 'center',
  },
  title3: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 20,
    textAlign: 'center',
  },
  title4: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  packageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  package: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: '45%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  packageIcon: { width: 50, height: 50, marginBottom: 10 },
  packageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 10,
    textAlign: 'center',
  },
  packageDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
    flex: 1,
    marginBottom: 10,
  },
  purchaseButton: { backgroundColor: '#6c63ff', padding: 10, borderRadius: 5 },
  purchaseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  nextButton: {
    marginTop: 18,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    elevation: 5,
  },
  nextButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  packageTitle2: {
    backgroundColor: '#fff',
    color: '#6c63ff',
    fontSize: 26,
    fontWeight: 'bold',
    padding: 10,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    marginBottom: 10,
    marginTop: 20,
    shadowRadius: 5,
  },

  // ===== modal base =====
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#2b2b2b',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    height: '70%',
  },
  paymentsModal: {
    backgroundColor: '#2b2b2b',
    borderRadius: 10,
    padding: 20,
    width: '92%',
    height: '78%',
  },
  closeButtonX: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#ff4d4d',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonXText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 10,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  modalItem: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  highlight: { color: '#00e6e6', fontWeight: 'bold' },
  separator: { height: 1, backgroundColor: '#ffffff', marginVertical: 15, alignSelf: 'stretch' },

  modalDetails: { alignSelf: 'stretch' },

  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  iconContainer: { alignItems: 'center' },
  icon3: { width: 35, height: 35, marginBottom: 5 },
  iconText: { fontSize: 12, color: '#ffffff', textAlign: 'center' },

  purchaseButton2: {
    backgroundColor: '#00e6e6',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    alignSelf: 'center',
    width: '80%',
    alignItems: 'center',
  },
  purchaseButtonText2: { color: '#2b2b2b', fontSize: 18, fontWeight: 'bold' },

  purchaseImage: {
    width: '100%',
    height: 400,
    marginTop: 20,
    borderRadius: 10,
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 10,
  },
  txtpay: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },

  disabledButton: { backgroundColor: '#d3d3d3' },
  disabledButtonText: { color: '#a9a9a9' },

  availabilityBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'black',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  availabilityText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  availabilityBadge2: {
    transform: [{ rotate: '-45deg' }, { translateX: -23 }, { translateY: -5 }],
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FF69B4',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  availabilityText2: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  input: {
    width: '90%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginTop: 14,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#fff',
    textAlign: 'right',
  },
  validateButton: {
    backgroundColor: '#6c63ff',
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
    alignSelf: 'center',
    width: '60%',
  },
  validateButtonText: { color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: 'bold' },

  // ===== ✅ checkbox styles =====
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
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    backgroundColor: 'transparent',
  },
  checkboxOn: {
    backgroundColor: '#6c63ff',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: -1,
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
  },

  // ===== ✅ gifts section card (צר יותר) =====
giftsCardNarrow: {
  width: '94%',
  maxWidth: 900,          // ✅ או תמחוק את השורה הזאת לגמרי
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 12,
  marginTop: 18,
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  alignSelf: 'center',
},

  giftsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c63ff',
    textAlign: 'right',
    marginBottom: 6,
  },
  giftsPriceNote: {
    marginTop: 4,
    textAlign: 'right',
    fontSize: 12,
    color: '#444',
    fontWeight: 'bold',
    alignSelf: 'stretch',
  },
  policyBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6c63ff',
    backgroundColor: 'transparent',
  },
  policyBtnText: {
    color: '#6c63ff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  editBtn: {
    marginTop: 10,
    backgroundColor: '#2b2b2b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  summaryRow: { marginTop: 10 },
  summaryText: { textAlign: 'right', fontSize: 12, color: '#444', marginTop: 3 },

  // ===== ✅ policy modal =====
  policyModal: {
    backgroundColor: '#2b2b2b',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 520,
    maxHeight: '70%',
  },
  policyText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  // ===== modal base =====
modalContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
},

// ✅ כל מודלי החבילות (basic/plus/digital/premium)
modalContent: {
  backgroundColor: '#2b2b2b',
  borderRadius: 10,
  padding: 20,
  width: '84%',      // ✅ היה 90%
  maxWidth: 520,     // ✅ שלא יתפרס בדסקטופ
  height: '70%',
  alignSelf: 'center',
},

// ✅ מודל "עריכת פרטים" של מתנות בהשראי
paymentsModal: {
  backgroundColor: '#2b2b2b',
  borderRadius: 10,
  padding: 20,
  width: '86%',      // ✅ היה 92%
  maxWidth: 560,     // ✅ שלא יתפרס בדסקטופ
  height: '78%',
  alignSelf: 'center',
},

// ✅ מודל מדיניות (אם יש לך)
policyModal: {
  backgroundColor: '#2b2b2b',
  borderRadius: 10,
  padding: 20,
  width: '82%',      // ✅ מעט יותר צר
  maxWidth: 520,
  maxHeight: '70%',
  alignSelf: 'center',
},
giftsRow: {
  flexDirection: 'row-reverse', // ✅ RTL: הטקסט מימין, הכפתורים משמאל
  alignItems: 'flex-start',
  gap: 12,
},

giftsActions: {
  width: 170,           // ✅ צד הכפתורים - קבוע כדי שהטקסט יקבל מקום
  alignItems: 'stretch',
},

giftsInfo: {
  flex: 1,              // ✅ הטקסט תופס את כל השאר
  paddingRight: 6,
},

giftsInfoTitle: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#111',
  textAlign: 'right',
  marginBottom: 6,
},

giftsInfoText: {
  fontSize: 12.5,
  color: '#333',
  lineHeight: 18,
  textAlign: 'right',
  marginBottom: 8,
},

});

export default HomeThree;
