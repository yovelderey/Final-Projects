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
import { getDatabase, ref, push, remove, set } from 'firebase/database';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const user = firebase.auth().currentUser;
  const database = getDatabase();

  const formatDate = (date) => format(date, "dd MMMM yyyy", { locale: he });

  const navigation = useNavigation();

  const handleCreateEvent = () => {
    if (
      !eventName ||
      !eventCategory ||
      !eventDate ||
      !eventTime ||
      !Numberofguests ||
      !budget ||
      !eventLocation ||
      !eventDescription
    ) {
      Alert.alert('Error', 'Please fill all fields before creating the event.');
      return;
    }

    //const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User is not logged in.');
      return;
    }

    const databaseRef = ref(database, `Events/${user.uid}/${eventName}/`);
    const userData = {
      eventName: eventName,
      eventCategory: eventCategory,
      eventDate: eventDate.toISOString().split('T')[0],
      eventTime: eventTime,
      budget: budget,
      Numberofguests: Numberofguests,
      eventLocation: eventLocation,
      eventDescription: eventDescription,
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

    set(ref(database, `Events/${user.uid}/${eventName}/yes_caming`), 0);
    set(ref(database, `Events/${user.uid}/${eventName}/maybe`), 0);
    set(ref(database, `Events/${user.uid}/${eventName}/no_cuming`), 0);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  return (
    <ImageBackground 
      source={require('../assets/backgruondcreate.png')} 
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { marginTop: -130 }]}>Create New Event</Text>

        <TextInput
          style={styles.input}
          placeholder="שם בעלי האירוע"
          value={eventName}
          onChangeText={(text) => setEventName(text)}
        />

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
            value={eventDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="שעה"
          value={eventTime}
          onChangeText={(text) => setEventTime(text)}
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
        />

        <TextInput
          style={styles.input}
          placeholder="תקציב"
          value={budget}
          onChangeText={(text) => setBudget(text)}
        />

        <TextInput
          style={styles.input}
          placeholder="הערות"
          multiline
          numberOfLines={4}
          value={eventDescription}
          onChangeText={(text) => setEventDescription(text)}
        />

        <TouchableOpacity onPress={handleCreateEvent} style={styles.phoneButton}>
          <Image source={require('../assets/CreateEventB.png')} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => props.navigation.navigate('Main')}
          style={[styles.showPasswordButton, { position: 'absolute', top: '91%', left: '8%' }]}
        >
          <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 25,
    padding: 10,
    width: '100%',
  },
  dateButton: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 25,
    padding: 10,
    width: '100%',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: 'black',
  },
  pickerButton: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 25,
    padding: 10,
    width: '100%',
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: 'black',
  },
  picker: {
    height: 150,
    width: '100%',
    backgroundColor: '#fff',
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
});

export default Home;
