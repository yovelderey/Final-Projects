// RegistrationScreen.js
import React, { useRef, useState } from 'react';
import { View, TextInput, Button, StyleSheet,KeyboardAvoidingView,TouchableOpacity,Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {FirebaseRecaptchaVerifierModal }from 'expo-firebase-recaptcha'; // Import the package
import { firebaseConfig } from '../config';
import { initializeApp } from 'firebase/app';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import 'firebase/database'; // Import the Realtime Database module
import { getDatabase, ref, set } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';



function Register(props) {


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
  const database = getDatabase();
  //const databaseRef = ref(database, 'Users');
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordAgain, setpasswordAgain] = useState('')

  const [fullname, setfullName] = useState('')

  const auth = getAuth();

  const navigation = useNavigation()
// Get the currently authenticated user's UID
  //const user = auth.currentUser;
  //const uid = user.uid;
  const uniqueID = uuidv4();

// Save user data in the Realtime Database with the UID as the key
  const databaseRef = ref(database, 'users/' + uniqueID);

  const handleRegister = () => {
    if (password !== passwordAgain) {
      alert("Passwords do not match");
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log('Registered with:', user.email);

      const database = getDatabase();
      const databaseRef = ref(database, 'users/' + user.uid);

      const userData = {
        email: user.email,
        displayName: fullname,
        // Note: Avoid storing passwords in plain text in the database
        // It's not secure, consider using a more secure authentication method
        // or hash the password before storing it
        // Example: hashedPassword: hashFunction(password),
      };

      set(databaseRef, userData)
        .then(() => {
          console.log('Data written to the database successfully');
          props.navigation.navigate('Main');
          //do here


          const database = getDatabase();
            const databaseRef = ref(database, 'Events/' + firebase.auth().currentUser.uid + '/'+ eventName + '/');
        
            const userData = {
              eventName: 0,
              eventCategory: 0,
              eventTags: 0,
              eventDate: 0,
              eventTime: 0,
              eventLocation: 0,
              eventDescription: 0,
            };
        
            set(databaseRef, userData)
              .then(() => {
                console.log('Data written to the database successfully');
              })
              .catch((error) => {
                console.error('Error writing data to the database:', error);
              });
          


        })
        .catch((error) => {
          console.error('Error writing data to the database:', error);
        });
    })
    .catch((error) => {
      console.error('Error creating user:', error.message);
      // You might want to show a more user-friendly error message to the user
      alert('Registration failed. ' + error.message);
    });
};
  
  return (
    <View style={styles.container}>
<TextInput
        style={styles.input}
        placeholder="Full Name"
        keyboardType="email-address"
        onChangeText={text => setfullName(text)}

      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        onChangeText={text => setEmail(text)}

      />

    <TextInput
        style={styles.input}
        placeholder="Password"
        keyboardType="email-address"
        onChangeText={text => setPassword(text)}

      />
    <TextInput
        style={styles.input}
        placeholder="password again"
        keyboardType="email-address"
        onChangeText={text => setpasswordAgain(text)}

      />  
      
      <Button title="Register" onPress={handleRegister} />
      <Button title="back" onPress={() => props.navigation.navigate('LoginEmail')}/>
      <Button title="RePassword" onPress={() => props.navigation.navigate('RePassword')}/>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingLeft: 10,
  },
});

export default Register;
