import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { firebaseConfig } from '../config';
import { initializeApp } from 'firebase/app';
import 'firebase/database'; // Import the Realtime Database module
import { getDatabase, ref, set } from 'firebase/database';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAuth } from 'firebase/auth';



function Login(props) {

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
  const [phoneNumberSave, setPhoneNumberSave] = useState(''); 

  const sendVerification = () => {
    const phoneProvider = new firebase.auth.PhoneAuthProvider();
    
    phoneProvider
      .verifyPhoneNumber(phoneNumber, recaptchaVerifier.current)
      .then((verificationId) => {
        setVerificationId(verificationId);
        setPhoneNumber('');
        // No need to setPhoneNumberSave here, as it should be done in confirmCode
      })
      .catch((error) => {
        console.error('Error sending verification code:', error.message);
        Alert.alert('שגיאה', 'Failed to send verification code. ' + error.message);
      });
  };

  const confirmCode = () => {
    const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, code);

    firebase
      .auth()
      .signInWithCredential(credential)
      .then((userCredential) => {
        setCode('');
        Alert.alert('Login successful');
        props.navigation.navigate('HomeOne');
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
      <View style={styles.card}>
        <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}/>

        <Text style={styles.header}>Login with Phone Verification</Text>
        <TextInput
          placeholder="Phone Number"
          style={styles.input}
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(text)}
        />
        <Button
          title="Send OTP"
          onPress={sendVerification}
          buttonStyle={styles.button}
        />
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
         <Button
          title="register with email"
          onPress={() => props.navigation.navigate('Register')} 
          buttonStyle={styles.button}
        />
         <Button
          title="login with email"
          onPress={() => props.navigation.navigate('LoginEmail')} 
          buttonStyle={styles.button}
        />

        <Button
          title="back"
          onPress={() => props.navigation.navigate('HomeOne')} 
          buttonStyle={styles.back}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  card: {
    width: '80%',
    borderRadius: 10,
    backgroundColor: 'white',
    padding: 20,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  button: {
    backgroundColor: 'blue',
    marginTop: 10,
    borderRadius: 5,
  },

  back: {
    backgroundColor: 'red',
    marginTop: 30,
    borderRadius: 10,
  },
});

export default Login;
