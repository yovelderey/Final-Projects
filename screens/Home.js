
import React, { useState } from 'react';
import { TouchableOpacity, Text, TextInput, ImageBackground,Image, StyleSheet, ScrollView } from 'react-native';
import { firebaseConfig } from '../config';
import { initializeApp } from 'firebase/app';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import 'firebase/database'; // Import the Realtime Database module
import { getDatabase, ref, set } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';


const Home = (props) => {
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventTags, setEventTags] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setbudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [spend, setSpend] = useState('');

  const navigation = useNavigation();

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

  const handleCreateEvent = () => {//create event
    const database = getDatabase();
    const databaseRef = ref(database, 'Events/' + firebase.auth().currentUser.uid + '/'+ eventName + '/');

    const userData = {
      eventName: eventName,
      eventCategory: eventCategory,
      eventTags: eventTags,
      eventDate: eventDate,
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
      const yes_caming = ref(database, 'Events/' + firebase.auth().currentUser.uid + '/'+ eventName + '/' + 'yes_caming');
      set(yes_caming, 0);
  
      const maybe = ref(database, 'Events/' + firebase.auth().currentUser.uid + '/'+ eventName + '/' + 'maybe');
      set(maybe, 0);
  
      const no_cuming = ref(database, 'Events/' + firebase.auth().currentUser.uid + '/'+ eventName + '/' + 'no_cuming');
      set(no_cuming, 0);

  };



  return (
    <ImageBackground 
    source={require('../assets/backgruondcreate.png')} // Adjust the path accordingly
    style={styles.background} >

    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { marginTop: -130 }]}>Create New Event </Text>


      <TextInput
        style={styles.input}
        placeholder="Event Name"
        value={eventName}
        onChangeText={(text) => setEventName(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Category"
        value={eventCategory}
        onChangeText={(text) => setEventCategory(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Tags"
        value={eventTags}
        onChangeText={(text) => setEventTags(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Date"
        value={eventDate}
        onChangeText={(text) => setEventDate(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Time"
        value={eventTime}
        onChangeText={(text) => setEventTime(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Location"
        value={eventLocation}
        onChangeText={(text) => setEventLocation(text)}
      />

        <TextInput
        style={styles.input}
        placeholder="מספר מוזמנים"
        value={Numberofguests}
        onChangeText={(text) => setNumberofguests(text)}
      />

        <TextInput
        style={styles.input}
        placeholder="תקציב"
        value={budget}
        onChangeText={(text) => setbudget(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Description"
        multiline
        numberOfLines={4}
        value={eventDescription}
        onChangeText={(text) => setEventDescription(text)}
      />


      <TouchableOpacity onPress={handleCreateEvent} style={styles.phoneButton}>
          <Image source={require('../assets/CreateEventB.png')}  />
        </TouchableOpacity>


      <TouchableOpacity 
         onPress={() => props.navigation.navigate('Main')}
            style={[styles.showPasswordButton, { position: 'absolute', top: '91%', left: '8%' }]}>
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
  backIcon: {
    width: 60,
    height: 60,

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
