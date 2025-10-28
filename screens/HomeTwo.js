import React, { useState, useEffect } from 'react';
import { View, Text,ScrollView, TouchableOpacity, ImageBackground, StyleSheet,Modal, TextInput,Alert, Animated } from 'react-native';
import { Calendar } from 'react-native-calendars';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';


const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};

if (!firebase.apps.length){
      firebase.initializeApp(firebaseConfig);
}

const HomeTwo = ({ route }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [canProceed, setCanProceed] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0)); // עבור האנימציה
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const { finalEventName } = route.params;
  const navigation = useNavigation();
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [Address, setAddress] = useState('');
  const [NumberPhone, setNumberPhone] = useState('');
  const [buttonScale] = useState(new Animated.Value(1));

  

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // בדיקה האם כל השדות מלאים
    if (

      Numberofguests &&
      budget &&
      eventLocation &&
      Address &&
      NumberPhone
    ) {
      setCanProceed(true);
      Animated.spring(buttonScale, {
        toValue: 1.1,
        friction: 2,
        useNativeDriver: true,
      }).start();
    } else {
      setCanProceed(false);
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 2,
        useNativeDriver: true,
      }).start();
    }
  }, [Numberofguests, budget, eventLocation, Address, NumberPhone]);


  const handleSave = () => {
 
  
    // שמירת התאריך והשעה בפיירבייס
    const databaseRefNumberofguests = ref(database, `Events/${user.uid}/${finalEventName}/Numberofguests/`);
    set(databaseRefNumberofguests, Numberofguests)
      .then(() => console.log('תאריך נשמר בהצלחה'));
  
    const databaseRebudget = ref(database, `Events/${user.uid}/${finalEventName}/budget/`);
    set(databaseRebudget, budget)
      .then(() => console.log('שעה נשמרה בהצלחה'));

    const databaseReeventLocation = ref(database, `Events/${user.uid}/${finalEventName}/eventLocation/`);
    set(databaseReeventLocation, eventLocation)
      .then(() => console.log('שעה נשמרה בהצלחה'));

    const databaseaddres = ref(database, `Events/${user.uid}/${finalEventName}/Address/`);
    set(databaseaddres, Address)
      .then(() => console.log('שעה נשמרה בהצלחה'));

    const databaseRefphone = ref(database, `Events/${user.uid}/${finalEventName}/Phone_Number/`);
    set(databaseRefphone, NumberPhone)
      .then(() => console.log('שעה נשמרה בהצלחה'));
  
      navigation.navigate('HomeThree', { Numberofguests, finalEventName });

  };
  
  return (
    <ImageBackground
      source={require('../assets/Home_three.png')}
      style={styles.backgroundImage}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title}>פרטי האירוע</Text>

        <View style={styles.box}>
        <Text style={styles.txt}>באיזה מקום / אולם אירועים מתקיים האירוע</Text>

          <TextInput
            style={styles.input}
            placeholder="שם מקום"
            value={eventLocation}
            onChangeText={(text) => setEventLocation(text)}
            placeholderTextColor="#aaa"
          />
        <Text style={styles.txt}>כמות מוזמנים (משוערת)</Text>

          <TextInput
            style={styles.input}
            placeholder="מספר מוזמנים"
            value={Numberofguests}
            onChangeText={(text) => setNumberofguests(text)}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />
        <Text style={styles.txt}>תקציב האירוע (משוערת)</Text>

          <TextInput
            style={styles.input}
            placeholder="תקציב"
            value={budget}
            onChangeText={(text) => setBudget(text)}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />

          <Text style={styles.txt}>כתובת מלאה לאירוע לניווט</Text>

          <TextInput
            style={styles.input}
            placeholder="כתובת"
            value={Address}
            onChangeText={(text) => setAddress(text)}
            placeholderTextColor="#aaa"
          />

          <Text style={styles.txt}>טלפון ליצירת קשר</Text>

          <TextInput
            style={styles.input}
            placeholder="טלפון"
            value={NumberPhone}
            onChangeText={(text) => setNumberPhone(text)}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />
        </View>

        <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text style={styles.textButton}>לחץ כאן לתנאי השימוש ומדיניות פרטיות שלנו</Text>
      </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed && { backgroundColor: 'gray' }]}
            onPress={handleSave}
            disabled={!canProceed}
          >
            <Text style={styles.nextButtonText}>אני מאשר את השימוש, המשך</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

  {/* המודאל */}
  <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>EasyVent - תנאי שימוש, מדיניות פרטיות ותקנון</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                ברוכים הבאים ל-EasyVent, אפליקציה לניהול ותכנון אירועים. 
                השימוש באפליקציה כפוף לתנאי השימוש, מדיניות הפרטיות והתקנון כמפורט להלן:
              </Text>
              
              <Text style={styles.sectionTitle}>1. תנאי שימוש</Text>
              <Text style={styles.modalText}>
                - השימוש באפליקציה מיועד למשתמשים מגיל 18 ומעלה בלבד.{'\n'}
                - חל איסור להשתמש באפליקציה לצורך פגיעה או הונאה.{'\n'}
                - האפליקציה מספקת שירותי עזר בלבד ואינה אחראית לתוצאות השימוש בשירותים אלו.
              </Text>

              <Text style={styles.sectionTitle}>2. מדיניות פרטיות</Text>
              <Text style={styles.modalText}>
                - המידע האישי שלך נשמר באופן מאובטח ואינו מועבר לגורמים חיצוניים ללא אישור.{'\n'}
                - אנו עשויים להשתמש במידע לצורך שיפור חוויית המשתמש.{'\n'}
                - באפשרותך לפנות אלינו בכל עת כדי לבקש עיון או מחיקה של המידע האישי שלך.
              </Text>

              <Text style={styles.sectionTitle}>3. תקנון</Text>
              <Text style={styles.modalText}>
                - החברה שומרת לעצמה את הזכות לשנות את תנאי השימוש, מדיניות הפרטיות והתקנון מעת לעת.{'\n'}
                - כל שינוי יחול באופן מיידי עם פרסומו באפליקציה.{'\n'}
                - למשתמש יש אחריות לקרוא ולהבין את התנאים המעודכנים.
              </Text>

              <Text style={styles.modalText}>
                לתמיכה ושאלות, אנא פנה לשירות הלקוחות שלנו דרך האפליקציה או במייל: support@easyvent.com.
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>סגור</Text>
            </TouchableOpacity>
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
    marginTop: 0,

    fontSize: 25,
    fontWeight: 'bold',
    color: '#6c63ff',
    textAlign: 'center',
    marginBottom: 100,
  },
  box: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: 'rgba(108, 99, 255, 0.7)',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'right',
  },
  nextButton: {
    marginTop: 25,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 40,
    elevation: 5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  txt: {
    fontSize: 14,
    textAlign: 'right',
    padding: 4,

  },
  textButton: {
    fontSize: 15,
    color: '#000',
    textDecorationLine: 'underline', // מוסיף קו תחתון לטקסט
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // רקע שקוף כהה
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  modalText: {
    fontSize: 20,
    marginBottom: 20,
    color: '#333',
    textAlign: 'right',

  },
  closeButton: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c63ff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginTop: 15,
    marginBottom: 5,
    textAlign: 'right',

  },
  closeButton: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: 'bold',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default HomeTwo;