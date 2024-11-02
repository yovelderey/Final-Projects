import React, { useEffect, useRef,useState } from 'react';
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
import { getDatabase, ref,set, remove,get,onValue } from 'firebase/database';

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

const EditHome = (props) => {
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState('');
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [Spend, setSpend] = useState('');

  const [eventDescription, setEventDescription] = useState('');
  const [secondOwnerName, setSecondOwnerName] = useState(''); // new state for the second owner name
  const [firstOwnerName, setfirstOwnerName] = useState(''); // new state for the second owner name
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const [eventDetails, setEventDetails] = useState({});
  const id = props.route.params.id; // Accessing the passed id

  const formatDate = (date) => format(date, "dd MMMM yyyy", { locale: he });

  const navigation = useNavigation();

  const handleCreateEvent = () => {

    // חיבור השמות במידה והקטגוריה היא "חתונה"

  
    if (!user) {
      Alert.alert('Error', 'User is not logged in.');
      return;
    }
  
    const databaseRefeventLocation = ref(database, `Events/${user.uid}/${eventDetails.eventName}/eventLocation/`);
    const databaseRefeventCategory = ref(database, `Events/${user.uid}/${eventDetails.eventName}/eventCategory/`);
    const databaseRefeventDate = ref(database, `Events/${user.uid}/${eventDetails.eventName}/eventDate/`);
    const databaseRefeventTime = ref(database, `Events/${user.uid}/${eventDetails.eventName}/eventTime/`);
    const databaseRefbudget = ref(database, `Events/${user.uid}/${eventDetails.eventName}/budget/`);
    const databaseRefNumberofguests = ref(database, `Events/${user.uid}/${eventDetails.eventName}/Numberofguests/`);


  
    set(databaseRefeventLocation, eventLocation)
    set(databaseRefeventCategory, eventCategory)
    set(databaseRefeventDate, eventDate.toISOString().split('T')[0])
    set(databaseRefeventTime, eventTime)
    set(databaseRefbudget, budget)
    set(databaseRefNumberofguests, Numberofguests)

  };
  

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };



  useEffect(() => {
    if (user) {
      const eventRef = ref(database, `Events/${user.uid}/${id}/`);
      
      const handleValueChange = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEventDetails(data);

        }
      };
      
      // Attach listener
      const unsubscribe = onValue(eventRef, handleValueChange);
      
      // Cleanup function
      return () => {
        unsubscribe(); // Call unsubscribe to remove the listener
      };
    }

  }, [user, id]);


  useEffect(() => {
    if (eventDetails.eventLocation) {
      setEventLocation(eventDetails.eventLocation);
    }
    if (eventDetails.eventCategory) {
        setEventCategory(eventDetails.eventCategory);
    }

    if (eventDetails.eventTime) {
        setEventTime(eventDetails.eventTime);
    }
    if (eventDetails.Numberofguests) {
        setNumberofguests(eventDetails.Numberofguests);
      }
      if (eventDetails.budget) {
        setBudget(eventDetails.budget);
      }
      if (eventDetails.spend) {
        setSpend(eventDetails.spend);
      }
      console.log('formatDate(eventDate)1',eventDate.toISOString().split('T')[0]);

     
  }, [eventDetails]);

  return (
    
    <ScrollView contentContainerStyle={styles.container}>
        <ImageBackground
        source={require('../assets/create_backgruond.png')} // טוען את ה-GIF מהתיקייה המקומית
        style={styles.gif}
        resizeMode="cover" // כדי שה-GIF יכסה את כל המסך
      />      
      <Text style={[styles.title, { marginTop: -780 }]}>ערוך אירוע</Text>

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
          value={eventDate || eventDetails.eventTime || 'תאריך'}
          mode="date"
          display="default"
          onChange={handleDateChange}
          style={styles.picker2}
        />
      )}

      <TextInput
        style={styles.input}
        value={eventTime || eventDetails.eventTime || 'שעה'}
        onChangeText={(text) => setEventTime(text)}
        keyboardType="numeric" // מקלדת מספרים בלבד
      />


      <TextInput
        style={styles.input}
        value={eventLocation || eventDetails.eventLocation || 'מקום האירוע'}
        onChangeText={(text) => setEventLocation(text)}
      />

        <TextInput
        style={styles.input}
        value={Numberofguests || eventDetails.Numberofguests || 'מספר מוזמנים'}
        onChangeText={(text) => setNumberofguests(text)}
        keyboardType="numeric"
        />

        <TextInput
        style={styles.input}
        value={budget || eventDetails.budget || 'תקציב'}
        onChangeText={(text) => setBudget(text)}
        keyboardType="numeric"
        />


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

export default EditHome;
