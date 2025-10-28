// Home.js — רספונסיבי לכל המסכים + גלילה + כפתור יציאה ללובי
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Image,
  Text,
  TextInput,
  ImageBackground,
  StyleSheet,
  Animated,
  View,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';

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

const Home = (props) => {
  const navigation = useNavigation();

  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [secondOwnerName, setSecondOwnerName] = useState('');
  const [canProceed, setCanProceed] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [buttonScale] = useState(new Animated.Value(1));

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const contentW = Math.min(screenWidth * 0.96, 980); // רוחב מקסימלי נעים לקריאה

  const user = firebase.auth().currentUser;
  const database = getDatabase();

  const handleCategorySelection = (category) => {
    setSelectedCategory(category);
  };

  // הפעלת/כיבוי כפתור "המשך"
  useEffect(() => {
    const ok =
      eventName.trim() &&
      selectedCategory &&
      (selectedCategory !== 'חתונה' || (selectedCategory === 'חתונה' && secondOwnerName.trim()));

    setCanProceed(!!ok);

    Animated.spring(buttonScale, {
      toValue: ok ? 1.1 : 1,
      friction: 2,
      useNativeDriver: true,
    }).start();
  }, [eventName, secondOwnerName, selectedCategory]);

  // יציאה ללובי (Sign out + reset)
  const exitToLobby = async () => {
    try {
      await firebase.auth().signOut();
    } catch (e) {
      // גם אם נכשל – ננווט ללובי
    }
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'LoginEmail' }], // ← אם שם הלובי שונה, להחליף כאן
    });
  };

  const handleCreateEvent = () => {
    let finalEventName = eventName;
    if (selectedCategory === 'חתונה') {
      finalEventName = eventName + ' & ' + secondOwnerName;
    }

    if (!user) {
      Alert.alert('Error', 'User is not logged in.');
      return;
    }

    const databaseRef = ref(database, `Events/${user.uid}/${finalEventName}/`);

    const defaultTableData = [
      { id: '1', col1: '00.00.0000', col2: '300', col3: '0', col4: 'הזמנות', col5: '1' },
      { id: '2', col1: '00.00.0000', col2: '300', col3: '0', col4: 'תזכורת', col5: '2' },
      { id: '3', col1: '00.00.0000', col2: '300', col3: '0', col4: 'יום חתונה', col5: '3' },
      { id: '4', col1: '00.00.0000', col2: '300', col3: '0', col4: 'תודה רבה', col5: '4' },
    ];

    const userData = {
      eventName: finalEventName,
      eventCategory: selectedCategory,
      eventDate: '00.00.0000',
      eventTime: eventTime,
      budget: budget,
      Numberofguests: Numberofguests,
      eventLocation: eventLocation,
      eventDescription: eventDescription,
      secondOwnerName: secondOwnerName,
      firstOwnerName: eventName,
      spend: '',
      sent_msg: 0,
      main_sms: 25,
      plan: 'no plan',
    };

    set(databaseRef, userData)
      .then(() => {
        props.navigation.navigate('HomeOne', { finalEventName });
      })
      .catch((error) => {
        console.error('Error writing data to the database:', error);
      });

    set(ref(database, `Events/${user.uid}/${finalEventName}/yes_caming`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/maybe`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/no_cuming`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/no_answear`), 0);

    set(ref(database, `Events/${user.uid}/${finalEventName}/Numberofimage/`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/NumberofSizeimage/`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/Table_RSVPs/`), defaultTableData);

    setEventDate('0000-00-00');
    setEventTime('00:00');
    setEventLocation('לא הוגדר');
    setNumberofguests('0');
    setBudget('0');
    setEventDescription('אין הערות');
  };

  return (

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={[styles.scrollContent, { minHeight: screenHeight * 0.98 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* כותרות */}
        <Text style={styles.title1}>יצירת אירוע חדש</Text>

        {/* פעולות עליונות (יציאה ללובי) */}
        <View style={[styles.topActions, { width: contentW }]}>
          <TouchableOpacity
            onPress={exitToLobby}
            style={styles.exitBtn}
            activeOpacity={0.9}
            accessibilityLabel="יציאה משמשתמש"
          >
            <Ionicons name="log-out-outline" size={18} color="rgba(108, 99, 255, 0.9)" />
            <Text style={styles.exitBtnText}>יציאה ללובי</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title2}>מה אתם חוגגים?</Text>

        {/* קטגוריות */}
        <View style={[styles.buttonContainer, { width: contentW }]}>
          {[
            { category: 'חתונה', icon: require('../assets/rings.png') },
            { category: 'חינה', icon: require('../assets/camel.png') },
            { category: 'בר/ת מצווה', icon: require('../assets/children.png') },
            { category: 'בריתה', icon: require('../assets/baby-carriage.png') },
            { category: 'יום הולדת', icon: require('../assets/happy-birthday.png') },
            { category: 'כנס', icon: require('../assets/conference.png') },
            { category: 'וובינר', icon: require('../assets/webinar.png') },
            { category: 'אחר', icon: require('../assets/more.png') },
          ].map((item) => (
            <TouchableOpacity
              key={item.category}
              style={[
                styles.categoryButton,
                selectedCategory === item.category && styles.selectedCategoryButton,
              ]}
              onPress={() => handleCategorySelection(item.category)}
              activeOpacity={0.9}
            >
              <Image source={item.icon} style={styles.categoryIcon} />
              <Text style={styles.categoryButtonText}>{item.category}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* שדות טקסט רספונסיביים */}
        <TextInput
          style={[
            styles.input,
            { width: screenWidth >= 900 ? '32%' : screenWidth >= 600 ? '48%' : '80%' },
          ]}
          placeholder="שם בעל האירוע"
          value={eventName}
          onChangeText={(text) => setEventName(text)}
        />

        {selectedCategory === 'חתונה' && (
          <TextInput
            style={[
              styles.input,
              { width: screenWidth >= 900 ? '32%' : screenWidth >= 600 ? '48%' : '80%' },
            ]}
            placeholder="שם בעלת האירוע"
            value={secondOwnerName}
            onChangeText={(text) => setSecondOwnerName(text)}
          />
        )}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed && { backgroundColor: 'gray' }]}
            onPress={handleCreateEvent}
            disabled={!canProceed}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>המשך</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* מרווח תחתון קטן כדי שלא "יידבק" לקצה במסכים קטנים */}
        <View style={{ height: 24 }} />
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
  },
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: 'center',
    backgroundColor: '#fff',

  },


  title1: {
    fontSize: 26,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: 'rgba(108, 99, 255, 0.9)',
    marginBottom: 8,
  },
  title2: {
    fontSize: 19,
    alignSelf: 'center',
    marginTop: 60,
    marginBottom: 12,
  },

  // אזור פעולות עליון
  topActions: {
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 6,
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  exitBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.9)',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  exitBtnText: {
    color: 'rgba(108, 99, 255, 0.9)',
    fontWeight: '700',
    fontSize: 14,
  },

  // רשת כפתורי קטגוריות
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    columnGap: 10,
  },
  categoryButton: {
    width: 130,
    height: 90,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'gray',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  selectedCategoryButton: {
    borderColor: 'orange',
    borderWidth: 4,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    marginBottom: 6,
  },
  categoryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'black',
  },

  // שדות
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'rgba(108, 99, 255, 0.9)',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    textAlign: 'right',
    marginBottom: 14,
    alignSelf: 'center',
  },

  // כפתור הבא
  nextButton: {
    marginTop: 6,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 260,
    height: 44,
    elevation: 5,
    alignSelf: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default Home;
