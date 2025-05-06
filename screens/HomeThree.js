import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// שימו לב שהוספנו גם update לצד get ו-remove
import { getDatabase, ref, set, get, remove, update } from 'firebase/database';

// הגדרות Firebase (לא לגעת אם אצלכם זה מוגדר במקום אחר)
const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
  const database = getDatabase();
// פונקציית עזר לעדכן main_sms באירוע
// ומספר המוזמנים (Numberofguests). אם החבילה בסיסית => מכפילים ב-2, אחרת ב-4.
async function updateMainSms(packageType, numberOfGuests,finalEventName) {
  try {
    const db = getDatabase();
    const user = firebase.auth().currentUser;

    // חישוב מקדם:
    // basic = 2, plus/digital/premium = 4
    let multiplier = 2;
    if (
      packageType === 'plus' ||
      packageType === 'digital' ||
      packageType === 'premium'
    ) {
      multiplier = 4;
    }

    const newValue = numberOfGuests * multiplier;
    console.log('finalEventName', finalEventName);

    // אם אצלכם שונה, עדכנו בהתאם
    await set(ref(db, `Events/${user.uid}/${finalEventName}/main_sms`), newValue);
    await set(ref(db, `Events/${user.uid}/${finalEventName}/plan`), packageType);


  } catch (err) {
    console.error('Error updating main_sms:', err);
  }
}

const HomeThree = ({ route }) => {
  const [animationValue] = useState(new Animated.Value(-500)); // חבילות מתחילות מחוץ למסך
  const [modals, setModals] = useState({
    basic: false,
    plus: false,
    digital: false,
    premium: false,
  }); // מצב של כל מודל
  const { Numberofguests, finalEventName } = route.params;

  // ננהל לכל חבילה state משלה להזנה של אסמכתא
  const [basicReference, setBasicReference] = useState('');
  const [plusReference, setPlusReference] = useState('');
  const [digitalReference, setDigitalReference] = useState('');
  const [premiumReference, setPremiumReference] = useState('');

  // כאן ננהל state שבודק האם להציג את תמונת ה-Bit בכל אחת מהחבילות
  const [showImageBasic, setShowImageBasic] = useState(false);
  const [showImagePlus, setShowImagePlus] = useState(false);
  const [showImageDigital, setShowImageDigital] = useState(false);
  const [showImagePremium, setShowImagePremium] = useState(false);

  const navigation = useNavigation();



  let total2 = Numberofguests * 0.4;
  let total3 = Numberofguests * 0.65;
  let total4 = Numberofguests * 0.8;
  let total = Numberofguests * 1.7;

  useEffect(() => {
    // הפעלת אנימציה עם כניסת המסך
    Animated.timing(animationValue, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const openModal = (type) => {
    setModals({ ...modals, [type]: true });
  };

  const closeModal = (type) => {
    setModals({ ...modals, [type]: false });
    // איפוס התמונה והאינפוט ברגע שסוגרים את המודל
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

  const handleSave = () => {
    navigation.navigate('Main');
  };

  // פונקציות בדיקה ומחיקה מפיירבייס + עדכון main_sms
  const handleValidateBasicReference = async () => {
    if (!/^\d+$/.test(basicReference)) {
      Alert.alert('שגיאה', 'יש להזין מספרים בלבד');
      return;
    }
    try {
      const db = getDatabase();
      // מביאים את כל הערכים תחת Reference/Basic
      const snapshot = await get(ref(db, 'Reference/Basic'));
      if (snapshot.exists()) {
        const data = snapshot.val(); // למשל {1: 23567823, 2: 34561234, 3: 32127819}
        // מחפשים key שהערך שלו שווה לאסמכתא שהוזנה
        const foundKey = Object.keys(data).find(
          (key) => data[key] == basicReference
        );
        if (foundKey) {
          // אם מצאנו - מוחקים
          await remove(ref(db, `Reference/Basic/${foundKey}`));

          // כאן נעדכן את main_sms: basic => 2*guests
          await updateMainSms('basic', Numberofguests, finalEventName);

          Alert.alert('הצלחה', 'אסמכתא תקינה ונמחקה בהצלחה!');
        } else {
          Alert.alert('שגיאה', 'אסמכתא לא תקינה');
        }
      } else {
        Alert.alert('שגיאה', 'לא קיימות אסמכתאות לחבילה זו');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('שגיאה', 'קרתה בעיה בעת בדיקת/מחיקת האסמכתא');
    }
  };

  const handleValidatePlusReference = async () => {
    if (!/^\d+$/.test(plusReference)) {
      Alert.alert('שגיאה', 'יש להזין מספרים בלבד');
      return;
    }
    try {
      const db = getDatabase();
      const snapshot = await get(ref(db, 'Reference/Plus'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const foundKey = Object.keys(data).find(
          (key) => data[key] == plusReference
        );
        if (foundKey) {
          await remove(ref(db, `Reference/Plus/${foundKey}`));

          // כאן נעדכן את main_sms: plus => 4*guests
          await updateMainSms('plus', Numberofguests,finalEventName);

          Alert.alert('הצלחה', 'אסמכתא תקינה ונמחקה בהצלחה!');
        } else {
          Alert.alert('שגיאה', 'אסמכתא לא תקינה');
        }
      } else {
        Alert.alert('שגיאה', 'לא קיימות אסמכתאות לחבילה זו');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('שגיאה', 'קרתה בעיה בעת בדיקת/מחיקת האסמכתא');
    }
  };

  const handleValidateDigitalReference = async () => {
    if (!/^\d+$/.test(digitalReference)) {
      Alert.alert('שגיאה', 'יש להזין מספרים בלבד');
      return;
    }
    try {
      const db = getDatabase();
      const snapshot = await get(ref(db, 'Reference/Digital'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const foundKey = Object.keys(data).find(
          (key) => data[key] == digitalReference
        );
        if (foundKey) {
          await remove(ref(db, `Reference/Digital/${foundKey}`));

          // כאן נעדכן את main_sms: digital => 4*guests
          await updateMainSms('digital', Numberofguests,finalEventName);

          Alert.alert('הצלחה', 'אסמכתא תקינה ונמחקה בהצלחה!');
        } else {
          Alert.alert('שגיאה', 'אסמכתא לא תקינה');
        }
      } else {
        Alert.alert('שגיאה', 'לא קיימות אסמכתאות לחבילה זו');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('שגיאה', 'קרתה בעיה בעת בדיקת/מחיקת האסמכתא');
    }
  };

  const handleValidatePremiumReference = async () => {
    // החבילה המשלימה היא בנתיב Reference/Complementary
    if (!/^\d+$/.test(premiumReference)) {
      Alert.alert('שגיאה', 'יש להזין מספרים בלבד');
      return;
    }
    try {
      const db = getDatabase();
      const snapshot = await get(ref(db, 'Reference/Complementary'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const foundKey = Object.keys(data).find(
          (key) => data[key] == premiumReference
        );
        if (foundKey) {
          await remove(ref(db, `Reference/Complementary/${foundKey}`));

          // כאן נעדכן את main_sms: premium => 4*guests
          await updateMainSms('premium', Numberofguests,finalEventName);

          Alert.alert('הצלחה', 'אסמכתא תקינה ונמחקה בהצלחה!');
        } else {
          Alert.alert('שגיאה', 'אסמכתא לא תקינה');
        }
      } else {
        Alert.alert('שגיאה', 'לא קיימות אסמכתאות לחבילה זו');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('שגיאה', 'קרתה בעיה בעת בדיקת/מחיקת האסמכתא');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/giphy.gif')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <Text style={styles.title}>יש לנו את זה! הכל מוכן</Text>
        <Image source={require('../assets/grgr.png')} style={styles.icon} />
        <Text style={styles.title2}>בחר חבילה שמתאימה לך</Text>
        <Text style={styles.title3}>
          ותהנה מחווית ניהול אירוע ברמה גבוהה ומשתלמת
        </Text>

        <Animated.View
          style={[
            styles.packageContainer,
            { transform: [{ translateY: animationValue }] },
          ]}
        >
          {/* אירוע קטן */}
          <View style={styles.package}>
            <Image
              source={require('../assets/bag.png')}
              style={styles.packageIcon}
            />
            <Text style={styles.packageTitle}>חבילה בסיסית</Text>
            <Text style={styles.packageDescription}>
              חבילה לאירוע קטן (0-100 מוזמנים), הכוללת אישורי הגעה ב-WhatsApp
              וסידורי הושבה.
            </Text>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => openModal('basic')}
            >
              <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
            </TouchableOpacity>
          </View>

          {/* אירוע בינוני */}
          <View style={styles.package}>
            <Image
              source={require('../assets/pluss.png')}
              style={styles.packageIcon}
            />
            <Text style={styles.packageTitle}>חבילה פלוס</Text>
            <Text style={styles.packageDescription}>
              חבילה לאירוע בינוני (100-300 מוזמנים), הכוללת אישורי הגעה
              ב-WhatsApp, אישורי הגעה טלפוניים, וסידורי הושבה.
            </Text>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => openModal('plus')}
            >
              <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
            </TouchableOpacity>
          </View>

          {/* אירוע גדול */}
          <View style={styles.package}>
            <View style={styles.availabilityBadge2}>
              <Text style={styles.availabilityText2}>הכי משתלמת!</Text>
            </View>
            <Image
              source={require('../assets/whatsapp.png')}
              style={styles.packageIcon}
            />
            <Text style={styles.packageTitle}>חבילה דיגיטלית</Text>
            <Text style={styles.packageDescription}>
              חבילה ב״ראש שקט״ שנתונת המון פיצרים (300-500 מוזמנים), הכוללת אישורי
              הגעה ב-WhatsApp, אישורי הגעה טלפוניים, וסידורי הושבה.
            </Text>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => openModal('digital')}
            >
              <Text style={styles.purchaseButtonText}>לפרטים ורכישה</Text>
            </TouchableOpacity>
          </View>

          {/* אירוע ענק */}
          <View style={styles.package}>
            {Numberofguests < 300 && (
              <View style={styles.availabilityBadge}>
                <Text style={styles.availabilityText}>זמין מעל 300</Text>
              </View>
            )}
            <Image
              source={require('../assets/send.png')}
              style={styles.packageIcon}
            />
            <Text style={styles.packageTitle}>חבילה משלימה</Text>
            <Text style={styles.packageDescription}>
              חבילה לאירוע ענק (500+ מוזמנים), הכוללת אישורי הגעה ב-WhatsApp,
              אישורי הגעה טלפוניים, סידורי הושבה, תמיכה טכנית מותאמת אישית, ודוחות
              מתקדמים לאירוע.
            </Text>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                Numberofguests < 300 && styles.disabledButton,
              ]}
              disabled={Numberofguests < 300}
              onPress={() => openModal('premium')}
            >
              <Text
                style={[
                  styles.purchaseButtonText,
                  Numberofguests < 300 && styles.disabledButtonText,
                ]}
              >
                לפרטים ורכישה
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.title4}>
          ניתן להמשיך מבלי לבחור בחבילה ולהנות מרוב התכנים שאנו מספקים עבור
          האירוע שלכם.
        </Text>

        <TouchableOpacity style={styles.nextButton} onPress={handleSave}>
          <Text style={styles.nextButtonText}>סיימתי, בואו נתחיל!</Text>
        </TouchableOpacity>
      </View>

      {/* מודל - חבילה משלימה (premium) */}
      <Modal visible={modals.premium} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* כפתור X בצד שמאל למעלה */}
            <TouchableOpacity
              style={styles.closeButtonX}
              onPress={() => closeModal('premium')}
            >
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.modalTitle}>חבילה משלימה</Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות{' '}
                  <Text style={styles.highlight}>אוטומטי ב-sms</Text>{' '}
                  (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף{' '}
                  <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שיחות לאורחים שלא אישרו הגעה ע"י מוקד אנושי
                </Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע{' '}
                  <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת תודות <Text style={styles.highlight}>WhatsApp</Text>{' '}
                  אחרי האירוע
                </Text>

                <Text style={styles.modalSubtitle}>החבילה כוללת גם:</Text>
                <Text style={styles.modalItem}>
                  ✅ מענה טלפוני להתייעצות ושאלות לגבי האירוע משעה (8:00 - 20:00)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ צוות EasyVent מגיע לאירוע לסדר את האורחים בשולחנות על ידי דלפק
                  בכניסה לאולם (זמין לכל הארץ מלבד אילת)
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/sms.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/phone-call.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב טלפוני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>תזכורת</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>תודה רבה</Text>
                </View>
              </View>
              <View style={styles.iconContainer}>
                <Image
                  source={require('../assets/stewardess.png')}
                  style={styles.icon3}
                />
                <Text style={styles.iconText}>מארחת לסידור השולחנות</Text>
              </View>
              <Text style={styles.packageTitle2}> רק ב- {total.toFixed(2)}₪</Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 1.7 = {total.toFixed(2)}₪)
              </Text>
              <Text style={styles.iconText}>
                *המחיר לפי {Numberofguests} מוזמנים
              </Text>

              {showImagePremium && <View style={styles.separator} />}

              {showImagePremium && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל
                  האירוע או לחלופין ליצור קשר עם התמיכה בטלפון: 054-2455869
                </Text>
              )}
              {showImagePremium && (
                <Image
                  source={require('../assets/payment.png')}
                  style={styles.purchaseImage}
                />
              )}

              {/* כפתור רכישה */}
              <TouchableOpacity
                style={styles.purchaseButton2}
                onPress={() => setShowImagePremium(true)}
              >
                <Text style={styles.purchaseButtonText2}>רכישה</Text>
              </TouchableOpacity>

              {/* אינפוט עבור האסמכתא + כפתור אימות – רק אם כבר לוחצים על רכישה */}
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
                  <TouchableOpacity
                    style={styles.validateButton}
                    onPress={handleValidatePremiumReference}
                  >
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* מודל - basic */}
      <Modal visible={modals.basic} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButtonX}
              onPress={() => closeModal('basic')}
            >
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.modalTitle}>חבילה בסיסית</Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות{' '}
                  <Text style={styles.highlight}>אוטומטי ב-sms</Text>{' '}
                  (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף{' '}
                  <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע{' '}
                  <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/sms.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
              </View>

              <Text style={styles.packageTitle2}>
                {' '}
                רק ב- {total2.toFixed(2)}₪
              </Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 0.4 = {total2.toFixed(2)}₪)
              </Text>
              <Text style={styles.iconText}>
                *המחיר לפי {Numberofguests} מוזמנים
              </Text>

              {showImageBasic && <View style={styles.separator} />}
              {showImageBasic && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל
                  האירוע או לחלופין ליצור קשר עם התמיכה בטלפון: 054-2455869
                </Text>
              )}
              {showImageBasic && (
                <Image
                  source={require('../assets/payment.png')}
                  style={styles.purchaseImage}
                />
              )}

              <TouchableOpacity
                style={styles.purchaseButton2}
                onPress={() => setShowImageBasic(true)}
              >
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
                  <TouchableOpacity
                    style={styles.validateButton}
                    onPress={handleValidateBasicReference}
                  >
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* מודל - plus */}
      <Modal visible={modals.plus} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButtonX}
              onPress={() => closeModal('plus')}
            >
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.modalTitle}>חבילה פלוס</Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות{' '}
                  <Text style={styles.highlight}>אוטומטי ב-sms</Text>{' '}
                  (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף{' '}
                  <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע{' '}
                  <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת תודות <Text style={styles.highlight}>WhatsApp</Text>{' '}
                  אחרי האירוע
                </Text>

                <Text style={styles.modalSubtitle}>החבילה כוללת גם:</Text>
                <Text style={styles.modalItem}>
                  ✅ מענה טלפוני להתייעצות ושאלות לגבי האירוע משעה (8:00 - 20:00)
                </Text>
              </View>
              <View style={styles.separator} />
              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/sms.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>תזכורת</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>תודה רבה</Text>
                </View>
              </View>

              <Text style={styles.packageTitle2}>
                {' '}
                רק ב- {total3.toFixed(2)}₪
              </Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 0.65 = {total3.toFixed(2)}₪)
              </Text>
              <Text style={styles.iconText}>
                *המחיר לפי {Numberofguests} מוזמנים
              </Text>

              {showImagePlus && <View style={styles.separator} />}
              {showImagePlus && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל
                  האירוע או לחלופין ליצור קשר עם התמיכה בטלפון: 054-2455869
                </Text>
              )}
              {showImagePlus && (
                <Image
                  source={require('../assets/payment.png')}
                  style={styles.purchaseImage}
                />
              )}

              <TouchableOpacity
                style={styles.purchaseButton2}
                onPress={() => setShowImagePlus(true)}
              >
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
                  <TouchableOpacity
                    style={styles.validateButton}
                    onPress={handleValidatePlusReference}
                  >
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* מודל - digital */}
      <Modal visible={modals.digital} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButtonX}
              onPress={() => closeModal('digital')}
            >
              <Text style={styles.closeButtonXText}>X</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.modalTitle}>חבילה דיגיטלית</Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalSubtitle}>חבילה זו כוללת תהליך שלם:</Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת הזמנות{' '}
                  <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>{' '}
                  (לאישור הגעה)
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת סבב נוסף{' '}
                  <Text style={styles.highlight}>אוטומטי ב-WhatsApp</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שיחות לאורחים שלא אישרו הגעה ע"י מוקד אנושי
                </Text>
                <Text style={styles.modalItem}>
                  ✅ סידור שולחנות ביום האירוע{' '}
                  <Text style={styles.highlight}>אוטומטי</Text>
                </Text>
                <Text style={styles.modalItem}>
                  ✅ שליחת תודות <Text style={styles.highlight}>WhatsApp</Text>{' '}
                  אחרי האירוע
                </Text>

                <Text style={styles.modalSubtitle}>החבילה כוללת גם:</Text>
                <Text style={styles.modalItem}>
                  ✅ מענה טלפוני להתייעצות ושאלות לגבי האירוע משעה (8:00 - 20:00)
                </Text>
              </View>

              <View style={styles.separator} />
              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב ראשון</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב שני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/phone-call.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>סבב טלפוני</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>תזכורת</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../assets/whatsapp.png')}
                    style={styles.icon3}
                  />
                  <Text style={styles.iconText}>תודה רבה</Text>
                </View>
              </View>

              <Text style={styles.packageTitle2}>
                {' '}
                רק ב- {total4.toFixed(2)}₪
              </Text>
              <Text style={styles.iconText}>
                ({Numberofguests} x 0.8 = {total4.toFixed(2)}₪)
              </Text>
              <Text style={styles.iconText}>
                *המחיר לפי {Numberofguests} מוזמנים
              </Text>

              {showImageDigital && <View style={styles.separator} />}
              {showImageDigital && (
                <Text style={styles.txtpay}>
                  התשלום מועבר דרך אפליקצית "bit", סיבת העברה יש לרשום את שם בעל
                  האירוע או לחלופין ליצור קשר עם התמיכה בטלפון: 054-2455869
                </Text>
              )}
              {showImageDigital && (
                <Image
                  source={require('../assets/payment.png')}
                  style={styles.purchaseImage}
                />
              )}

              <TouchableOpacity
                style={styles.purchaseButton2}
                onPress={() => setShowImageDigital(true)}
              >
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
                  <TouchableOpacity
                    style={styles.validateButton}
                    onPress={handleValidateDigitalReference}
                  >
                    <Text style={styles.validateButtonText}>אמת אסמכתא</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: -20,
    marginTop: 30,

  },
  title2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 3,
  },

  title3: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 20,
  },
  title4: {
    fontSize: 14,
    marginBottom: 0,
    marginTop: 10,
    textAlign: 'center', // ממרכז את הטקסט אופקית
    fontWeight: 'bold', // משקל הטקסט

  },
packageContainer: {
  flexDirection: 'row', // סידור חבילות בשורה
  flexWrap: 'wrap', // מעבר לשורה חדשה אם אין מקום
  justifyContent: 'space-between', // רווחים בין החבילות
  alignItems: 'center', // יישור חבילות אנכית
  width: '100%', // שימוש ברוחב מלא
},


package: {
  backgroundColor: '#f5f5f5',
  borderRadius: 10,
  padding: 10, // מרווח פנימי
  alignItems: 'center',
  width: '45%', // רוחב 45% לשתי חבילות בשורה
  marginBottom: 15, // ריווח בין השורות
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 5,
  minHeight: 200, // גובה מינימלי קבוע לכל החבילות
  justifyContent: 'space-between', // יישור תוכן אנכי
},
packageTitle: {
  fontSize: 20, // גודל כותרת
  fontWeight: 'bold',
  color: '#6c63ff',
  marginBottom: 10,
  textAlign: 'center',
},

packageTitle2: {
  backgroundColor: '#fff', // רקע לבן
  color: '#6c63ff',
  fontSize: 26, // גודל כותרת
  fontWeight: 'bold', // טקסט מודגש
  padding: 10, // רווח פנימי סביב הטקסט
  borderRadius: 10, // עיגול הפינות
  textAlign: 'center', // יישור טקסט למרכז
  overflow: 'hidden', // חיתוך תוכן מעבר לגבולות
  elevation: 5, // צל (עבור אנדרואיד)
  shadowColor: '#000', // צל (עבור iOS)
  shadowOpacity: 0.1,
  marginBottom: 10,
  fontWeight: 'bold',
  textAlign: 'center',
  marginTop: 20,
  shadowRadius: 5,
},
packageDescription: {
  fontSize: 14, // גודל טקסט
  textAlign: 'center',
  color: '#333',
  flex: 1, // מאפשר לטקסט להתפרס בצורה דינמית
  marginBottom: 10,
},
purchaseButton: {
  backgroundColor: '#6c63ff',
  padding: 10,
  borderRadius: 5,
},
purchaseButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},

  nextButton: {
    marginTop: 30,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    elevation: 5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#6c63ff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  icon2: {
    width: 370,
    height: 44,
    marginTop: 40,
    marginBottom: 20,

  },
icon3: {
  width: 35,
  height: 35,
  marginBottom: 5,
},
  packageIcon: {
  width: 50, // רוחב האייקון
  height: 50, // גובה האייקון
  marginBottom: 10, // ריווח בין האייקון לכותרת
},
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
  height: '70%', // גובה מוגדל לתפיסת יותר מסך
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
},
closeButtonXText: {
  color: '#ffffff',
  fontSize: 16,
  fontWeight: 'bold',
},
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
highlight: {
  color: '#00e6e6',
  fontWeight: 'bold',
},
separator: {
  height: 1,
  backgroundColor: '#ffffff',
  marginVertical: 15,
  alignSelf: 'stretch',
},
iconRow: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  width: '100%',
  marginTop: 10,
},
iconContainer: {
  alignItems: 'center',
},
icon2: {
  width: 50,
  height: 50,
  marginBottom: 5,
},
iconText: {
  fontSize: 12,
  color: '#ffffff',
  textAlign: 'center',
},
closeButton: {
  backgroundColor: '#00e6e6',
  padding: 10,
  borderRadius: 5,
  marginTop: 20,
  alignSelf: 'center',
},
closeButtonText: {
  color: '#2b2b2b',
  fontSize: 16,
  fontWeight: 'bold',
},
purchaseButton2: {
  backgroundColor: '#00e6e6',
  padding: 15,
  borderRadius: 5,
  marginTop: 20,
  alignSelf: 'center',
  width: '80%',
  alignItems: 'center',
},
purchaseButtonText2: {
  color: '#2b2b2b',
  fontSize: 18,
  fontWeight: 'bold',
},
icon: {
  width: 370,
  height: 44,
  marginTop: 40,
  marginBottom: 20,

},
purchaseImage: {
  width: '100%',
  height: 400,
  marginTop: 20,
  borderRadius: 10,
  alignSelf: 'center',
},
scrollContent: {
  flexGrow: 1, // מאפשר התרחבות תוכן
  justifyContent: 'flex-start', // התחלת תוכן מלמעלה
  alignItems: 'center', // ממרכז את התוכן אופקית
  paddingBottom: 50, // רווח נוסף בתחתית הגלילה
},
txtpay: {
  marginTop: 20,
  fontSize: 15,
  fontWeight: 'bold',
  color: 'white',
  marginBottom: 0,
  textAlign: 'center',

},
disabledButton: {
  backgroundColor: '#d3d3d3', // צבע אפור לכפתור במצב לא פעיל
},
disabledButtonText: {
  color: '#a9a9a9', // צבע טקסט אפור
},
availabilityBadge: {
  position: 'absolute',
  top: 5,
  left: 5,
  backgroundColor: 'black', // רקע שחור
  paddingHorizontal: 5, // רווחים אופקיים
  paddingVertical: 2, // רווחים אנכיים
  borderRadius: 5, // עיגול פינות
},

availabilityBadge: {
  position: 'absolute',
  top: 5,
  left: 5,
  backgroundColor: 'black', // רקע שחור
  paddingHorizontal: 5, // רווחים אופקיים
  paddingVertical: 2, // רווחים אנכיים
  borderRadius: 5, // עיגול פינות
},
availabilityText: {
  color: 'white', // צבע טקסט לבן
  fontSize: 10, // גודל טקסט קטן
  fontWeight: 'bold', // טקסט מודגש
},
availabilityBadge2: {
  transform: [
    { rotate: '-45deg' },  // סיבוב הטקסט
    { translateX: -23 },   // הזזה אופקית (שמאלה)
    { translateY: -5 },    // הזזה אנכית (למטה)
  ],
  position: 'absolute',
  top: 5,
  left: 5,
  backgroundColor: '#FF69B4', // רקע שחור
  paddingHorizontal: 5, // רווחים אופקיים
  paddingVertical: 2, // רווחים אנכיים
  borderRadius: 5, // עיגול פינות
},
availabilityText2: {
  color: 'white',
  fontSize: 10,
  fontWeight: 'bold',
},
// הוספת שדות טקסט וכפתור אימות
input: {
  width: '80%',
  height: 50,
  borderColor: '#ccc',
  borderWidth: 1,
  marginTop: 20,
  borderRadius: 5,
  paddingHorizontal: 10,
  color: '#fff'
},
validateButton: {
  backgroundColor: '#6c63ff',
  padding: 10,
  marginTop: 10,
  borderRadius: 5,
},
validateButtonText: {
  color: '#fff',
  fontSize: 16,
  textAlign: 'center',
  fontWeight: 'bold'
},
});

export default HomeThree;
