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
    if (!eventCategory || !eventDate || !eventTime || !eventLocation || !Numberofguests || !budget) {
      Alert.alert('שגיאה', 'יש למלא את כל השדות לפני שמירת האירוע.');
      return;
    }
  
    if (!user) {
      Alert.alert('שגיאה', 'משתמש אינו מחובר.');
      return;
    }
  
    const [hours, minutes] = eventTime.split(':').map(Number);
    if (!(hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60)) {
      Alert.alert('שגיאה', 'השעה שהוזנה אינה תקינה.');
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
    navigation.navigate('Main');

  };
  

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const [time, setTime] = useState('');

  const handleTimeChange = (input) => {
    // הסרת כל תווים לא רלוונטיים
    const sanitizedInput = input.replace(/[^0-9]/g, '');
  
    // הוספת `:` לאחר 2 תווים
    let formattedTime = sanitizedInput;
    if (sanitizedInput.length > 2) {
      formattedTime = `${sanitizedInput.slice(0, 2)}:${sanitizedInput.slice(2, 4)}`;
    }
  
    // הגבלת אורך ל-5 תווים (HH:mm)
    if (formattedTime.length <= 5) {
      setEventTime(formattedTime); // עדכון הערך ב-state
    }
  };
  


  

  const handllehome = () => {
    // בדיקה אם כל השדות מלאים
    if (!eventCategory || !eventDate || !eventTime || !eventLocation || !Numberofguests || !budget) {
      Alert.alert('שגיאה', 'יש למלא את כל השדות לפני היציאה.');
      return;
    }
  
    // אם כל השדות מלאים, מעבר למסך הראשי
    navigation.navigate('Main');
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
      //console.log('formatDate(eventDate)1',eventDate.toISOString().split('T')[0]);

     
  }, [eventDetails]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ImageBackground
        source={require('../assets/create_backgruond.png')} // טוען את הרקע
        style={styles.backgroundImage}
        resizeMode="cover"
      />
  
      {/* כותרת המסך */}
      <Text style={styles.title}>ערוך אירוע</Text>
  
      {/* כפתור חזור */}
      <TouchableOpacity onPress={() => handllehome()} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>X</Text>
      </TouchableOpacity>

  
      {/* סוג אירוע */}
      <TouchableOpacity style={styles.inputButton} onPress={() => setShowCategoryPicker(true)}>
        <Text style={styles.inputButtonText}>{eventCategory || 'סוג אירוע'}</Text>
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
  
      {/* תאריך האירוע */}
      <TouchableOpacity style={styles.inputButton} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.inputButtonText}>{formatDate(eventDate)}</Text>
      </TouchableOpacity>
  
      {showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
        {/* שעת האירוע */}
        <TextInput
        style={styles.input2}
        value={eventTime} // הערך הנוכחי מה-state
        onChangeText={handleTimeChange} // קריאה לפונקציה לעדכון
        placeholder="שעות:דקות"
        keyboardType="numeric" // מקלדת מספרים בלבד
        placeholderTextColor="#aaa"
      />

  
      {/* מיקום האירוע */}
      <TextInput
        style={styles.input}
        value={eventLocation}
        onChangeText={setEventLocation}
        placeholder="מיקום האירוע"
        placeholderTextColor="#aaa"
      />
  
      {/* מספר מוזמנים */}
      <TextInput
        style={styles.input}
        value={Numberofguests}
        onChangeText={setNumberofguests}
        placeholder="מספר מוזמנים"
        keyboardType="numeric"
        placeholderTextColor="#aaa"
      />
  
      {/* תקציב */}
      <TextInput
        style={styles.input}
        value={budget}
        onChangeText={setBudget}
        placeholder="תקציב"
        keyboardType="numeric"
        placeholderTextColor="#aaa"
      />
  



      {/* כפתור שמירת האירוע */}
      <TouchableOpacity onPress={handleCreateEvent} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>שמור אירוע</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
};
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 80,
    textAlign: 'center',
    marginTop: 50, // Adjust margin to position correctly

  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backIcon: {
    width: 30,
    height: 30,
  },
  inputButton: {
    width: '90%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputButtonText: {
    fontSize: 16,
    color: '#555',
  },
  input: {
    width: '90%',
    height: 50,
    backgroundColor: '#fff',
    textAlign: 'right', // מיישר את הטקסט לימין
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input2: {
    width: '90%', // שדה רחב יותר
    height: 50,
    backgroundColor: '#fff',
    textAlign: 'center', // מיישר את הטקסט לימין
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
  },
  saveButton: {
    width: '90%',
    height: 50,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 50, // מיקום מהחלק העליון
    right: 20, // מיקום מהצד הימני
    width: 32, // גודל כפתור
    height: 32,
    backgroundColor: '#ff4d4d', // צבע רקע אדום
    borderRadius: 20, // צורת עיגול
    justifyContent: 'center', // מרכז את ה-X
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // הצללה לאנדרואיד
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff', // צבע הטקסט לבן
    fontWeight: 'bold',
  },
});



export default EditHome;
