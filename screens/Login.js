import React, { useRef, useState } from 'react';
import { View, Image, TextInput, Button, TouchableOpacity,StyleSheet,ImageBackground, Alert } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { v4 as uuidv4 } from 'uuid';
import { useNavigation } from '@react-navigation/native';

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

  if (!firebase.apps.length) {
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
  const navigation = useNavigation()

  const sendVerification = () => {
    const phoneProvider = new firebase.auth.PhoneAuthProvider();
    
    phoneProvider
      .verifyPhoneNumber(phoneNumber, recaptchaVerifier.current)
      .then((verificationId) => {
        
        setVerificationId(verificationId);
        setPhoneNumber('')
        showAlert();
        // No need to setPhoneNumberSave here, as it should be done in confirmCode
      })
      .catch((error) => {
        console.error('Error sending verification code:', error.message);
        Alert.alert('Error', 'Failed to send verification code. ' + error.message);
      });

  };


  const showAlert = () => {
    Alert.prompt(
      'Enter Digit Code',
      'A verification code will be sent to you at this moment.',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: (text) => {
            const digit = text.trim(); // Access the entered text and remove any leading/trailing spaces
            if (digit.length <= 6) {
              console.log('Entered Digit:', digit);
              setCode(digit);
              confirmCode(verificationId); // Pass verificationId to confirmCode
              console.log('verificationId verificationId verificationId', verificationId);
              console.log('digit digit digit', digit);

            } else {
              console.log('Digit length exceeds 6 digits');
            }
          },
          
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const confirmCode = (verificationId) => {
    const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, code);
  
    firebase
      .auth()
      .signInWithCredential(credential)
      .then((userCredential) => {
        setCode('');
        Alert.alert('Login successful');
        navigation.navigate('Main');
        const phoneNumberSave = userCredential.user.phoneNumber;
        const databaseRef = ref(database, 'users/' + userCredential.user.uid);
  
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
        if (error.code === 'auth/code-expired') {
          Alert.alert('Error', 'The SMS code has expired. Please re-send the verification code to try again.');
          sendVerification(); // Prompt the user to resend the verification code
        } else {
          Alert.alert('Error', 'Failed to sign in with phone number. ' + error.message);
        }
      });
  };
  
  
  return (
    <ImageBackground 
    source={require('../assets/phonecrreate.png')} // Adjust the path accordingly
    style={styles.background}
  >
    <View style={styles.container}>
        <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={firebaseConfig} />


        <TextInput
        
          placeholder="+972XXXXXXXXX"
          style={styles.input}
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(text)}
          
        />

        <TouchableOpacity onPress={sendVerification} style={styles.phoneButton}>
          <Image source={require('../assets/button.png')}  />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('LoginEmail')}
            style={[styles.showPasswordButton, { position: 'absolute', top: '91%', left: '4%' }]}>
            <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
        </TouchableOpacity>
        
      </View>
      </ImageBackground>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    
  },

  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: 350,
    height: 40,
    backgroundColor: 'white',
    marginTop: -150,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingLeft: 10,
  },

  back: {
    backgroundColor: 'red',
    marginTop: 30,
    borderRadius: 10,
  },
  phoneButton: {
    marginTop: 240,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 60,
    height: 60,

  },
});

export default Login;
