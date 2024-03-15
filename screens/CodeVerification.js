import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, navigation,Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {FirebaseRecaptchaVerifierModal }from 'expo-firebase-recaptcha'; // Import the package
import { firebaseConfig } from '../config';
import { initializeApp } from 'firebase/app';
import 'firebase/database'; // Import the Realtime Database module
import { getDatabase, ref, set } from 'firebase/database';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

function CodeVerification(props) {
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
  const [phoneNumber, setPhoneNumber] = useState(''); 
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const recaptchaVerifier = useRef(null); 
  const uniqueID = uuidv4();
  const [phoneNumberSave, setPhoneNumberSave] = useState(''); 
  const [refreshCount, setRefreshCount] = useState(0);
  //const navigation = useNavigation();

  const handleRegister = () => {
    // Add your registration logic here (e.g., sending data to a server).
    // You can use the data entered in the TextInput fields.
  };

  const confirmCode = () => {
    const credential = firebase.auth.PhoneAuthProvider.credential(props.data, code);

    firebase
      .auth()
      .signInWithCredential(credential)
      .then((userCredential) => {
        setCode('');
        Alert.alert('Login successful');
        props.navigation.navigate('Main');
        setRefreshCount(refreshCount + 1);
        const phoneNumberSave = userCredential.user.phoneNumber;
        const databaseRef = ref(getDatabase(), 'users/' + userCredential.user.uid);

        const data = {
          phone: phoneNumberSave,
          // Add additional data as needed
        };

        set(databaseRef, data)
          .then(() => {
            console.log('Data written to the database successfully');
          })
          .catch((error) => {
            console.error('Error writing data to the database:', error);
          });
      })
      .catch((error) => {
        console.error('Error signing in with phone number:', error.message);
        Alert.alert('Error', 'Failed to sign in with phone number. ' + error.message);
      });
  };

  return (
    <View style={styles.container}>
    


    <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}/>

        <Text style={styles.header}>Login with Phone Verification</Text>
        <Text>{props.data}</Text>

        <TextInput
          placeholder="Enter OTP"
          style={styles.input}
          value={setCode}
          onChangeText={(text) => setCode(text)}
        />
        <Button
          title="Verify OTP"
          onPress={confirmCode}
          buttonStyle={styles.button}
        />
      <Button title="back" onPress={() => props.navigation.navigate('Login')}/>

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

export default CodeVerification;
