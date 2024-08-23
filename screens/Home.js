import React, { useState } from 'react';
import { TouchableOpacity, Image, Text, TextInput, ImageBackground, StyleSheet, ScrollView, View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import 'firebase/database'; // Import the Realtime Database module
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set } from 'firebase/database';

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

const Home = (props) => {
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState('');
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [secondOwnerName, setSecondOwnerName] = useState(''); // new state for the second owner name
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const user = firebase.auth().currentUser;
  const database = getDatabase();

  const formatDate = (date) => format(date, "dd MMMM yyyy", { locale: he });

  const navigation = useNavigation();

  const handleCreateEvent = () => {
    // בדיקת שכל השדות הנדרשים מלאים
    if (
      !eventName ||
      !eventCategory ||
      !eventDate ||
      !eventTime ||
      !Numberofguests ||
      !budget ||
      !eventLocation ||
      (eventCategory === 'חתונה' && !secondOwnerName) // לוודא שמולא השם השני אם קטגוריה היא חתונה
    ) {
      Alert.alert('Error', 'Please fill all fields before creating the event.');
      return;
    }
  
    // חיבור השמות במידה והקטגוריה היא "חתונה"
    let finalEventName = eventName;
    if (eventCategory === 'חתונה') {
      finalEventName = eventName + " & " + secondOwnerName;
    }
  
    if (!user) {
      Alert.alert('Error', 'User is not logged in.');
      return;
    }
  
    const databaseRef = ref(database, `Events/${user.uid}/${finalEventName}/`);
    const userData = {
      eventName: finalEventName,
      eventCategory: eventCategory,
      eventDate: eventDate.toISOString().split('T')[0],
      eventTime: eventTime,
      budget: budget,
      Numberofguests: Numberofguests,
      eventLocation: eventLocation,
      eventDescription: eventDescription,
      secondOwnerName: secondOwnerName, // include second owner name
      spend: ""
    };
  
    set(databaseRef, userData)
      .then(() => {
        console.log('Data written to the database successfully');
        props.navigation.navigate('Main');
      })
      .catch((error) => {
        console.error('Error writing data to the database:', error);
      });
  
    set(ref(database, `Events/${user.uid}/${finalEventName}/yes_caming`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/maybe`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/no_cuming`), 0);
  };
  

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  return (
    
    <ScrollView contentContainerStyle={styles.container}>
        <ImageBackground
        source={require('../assets/create_backgruond.png')} // טוען את ה-GIF מהתיקייה המקומית
        style={styles.gif}
        resizeMode="cover" // כדי שה-GIF יכסה את כל המסך
      />      
      <Text style={[styles.title, { marginTop: -780 }]}>אירוע חדש</Text>

      <TouchableOpacity onPress={() => navigation.navigate('Main')}>
        <Image source={require('../assets/back_icon2.png')} style={styles.imageback} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.pickerButton} 
        onPress={() => setShowCategoryPicker(true)}
      >
        <Text style={styles.pickerText}>
          {eventCategory ? eventCategory : 'סוג אירוע'}
        </Text>
      </TouchableOpacity>

      {showCategoryPicker && (
        <Picker
          selectedValue={eventCategory}
          onValueChange={(itemValue) => {
            setEventCategory(itemValue);
            setShowCategoryPicker(false);
          }}
          style={styles.picker}
        >
          <Picker.Item label="בחר סוג אירוע" value="" />
          <Picker.Item label="חתונה" value="חתונה" />
          <Picker.Item label="בר מצווה" value="בר מצווה" />
          <Picker.Item label="כנס" value="כנס" />
          <Picker.Item label="וובינר" value="וובינר" />
        </Picker>
      )}

      <TextInput
        style={styles.input}
        placeholder="שם בעל האירוע 1"
        value={eventName}
        onChangeText={(text) => setEventName(text)}
      />

      {/* Only show this TextInput if the eventCategory is "חתונה" */}
      {eventCategory === 'חתונה' && (
        <TextInput
          style={styles.input}
          placeholder="שם בעל האירוע 2"
          value={secondOwnerName}
          onChangeText={(text) => setSecondOwnerName(text)}
        />
      )}

      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateText}>
          {formatDate(eventDate)}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          style={styles.picker2}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="שעה"
        value={eventTime}
        onChangeText={(text) => setEventTime(text)}
        keyboardType="numeric" // מקלדת מספרים בלבד
        maxLength={4} // הגבלת האורך ל-4 תווים (לדוגמה: שעה בפורמט 24 שעות)
      />


      <TextInput
        style={styles.input}
        placeholder="מיקום"
        value={eventLocation}
        onChangeText={(text) => setEventLocation(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="מספר מוסמנים"
        value={Numberofguests}
        onChangeText={(text) => setNumberofguests(text)}
        keyboardType="numeric" // מקלדת מספרים בלבד

      />

      <TextInput
        style={styles.input}
        placeholder="תקציב"
        value={budget}
        onChangeText={(text) => setBudget(text)}
        keyboardType="numeric" // מקלדת מספרים בלבד

      />

      <TextInput
        style={styles.input}
        placeholder="הערות"
        multiline
        numberOfLines={4}
        value={eventDescription}
        onChangeText={(text) => setEventDescription(text)}
      />
      <Text style={styles.textnew}>אנא הקפידו למלא את כל השדות באופן מדוייק להמשך תהליך יצירת האירוע, לאחר יצירת האירוע לא ניתן לערוך אותו</Text>

      <TouchableOpacity onPress={handleCreateEvent} style={styles.phoneButton}>
        <Image source={require('../assets/started.png')} />
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',

  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  gif: {
    width: '120%',
    height: '105%',
    marginTop: -100
  },
  input: {
    width: '90%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'orange',
    textAlign: 'right',
    marginBottom: 20,
  },
  dateButton: {
    width: '90%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'orange',
    textAlign: 'right',
    marginBottom: 20,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'right',

  },
  pickerButton: {
    width: '90%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'orange',
    textAlign: 'right',
    marginBottom: 20,
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'right',

  },
  picker: {
    height: 150,
    width: '100%',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'orange',
    textAlign: 'right',
    marginBottom: 20,
    },

  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneButton: {
    marginTop: 20,
  },
  imageback: {
    width: 40,
    height: 40,
    marginTop: -130,
    marginRight: 300,
  },
  footerText: {
    position: 'absolute',
    bottom: 20, // מרחק מהתחתית
    fontSize: 13,
    color: 'gray',
    marginTop: 150  // לשמור על היחס המקורי של התמונה

  },
  textnew: {
    marginTop: 0,  // לשמור על היחס המקורי של התמונה

    textAlign: 'center', // מיישר את הטקסט למרכז
    alignSelf: 'center', // מיישר את הרכיב עצמו במרכז המיכל
    color: '#000',       // צבע טקסט שחור
    fontSize: 13,        // גודל פונט
    paddingHorizontal: 10, // ריווח אופקי לטקסט
  },
});

export default Home;
