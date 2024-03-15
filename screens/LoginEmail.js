import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text,TouchableOpacity, Image,ImageBackground,Alert} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {FirebaseRecaptchaVerifierModal }from 'expo-firebase-recaptcha'; // Import the package
import { firebaseConfig } from '../config';
import { initializeApp } from 'firebase/app';

import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

function LoginEmail(props) {

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
  

  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);

      setRefreshCount(refreshCount + 1);

      // You can navigate to your app's main screen upon successful login.
      props.navigation.navigate('Main');
    } catch (error) {
      Alert.alert('Authentication Error', error.message);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <ImageBackground 
      source={require('../assets/Login.png')} // Adjust the path accordingly
      style={styles.background}
    >
      <View style={styles.container}>
        <ImageBackground 
          source={require('../assets/Textinput.png')} // Adjust the path accordingly
          style={styles.backgroundTextinput}
        >
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            onChangeText={text => setEmail(text)}
          />
          <View style={styles.passwordInput}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry={!showPassword}
              onChangeText={text => setPassword(text)}
            />
            <TouchableOpacity onPress={togglePasswordVisibility} style={styles.showPasswordButton}>
              <Text style={styles.showPasswordButtonText}>{showPassword ? '' : ''}</Text>
              <Image source={ require('../assets/Eye.png')}  style={[styles.img,{width: 20,height: 20,}]}/>

            </TouchableOpacity>
          </View>
        </ImageBackground>
        

        <TouchableOpacity onPress={() => navigation.navigate('RePassword')} >
            <Image source={ require('../assets/Fp.png')}  style={[styles.img,{width: 220,height: 12, marginTop: -310,}]}/>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} >
            <Image source={ require('../assets/Loginbutton.png')}  style={[styles.img,{width: 350,height: 40, marginTop: -280,}]}/>
        </TouchableOpacity>

        <Button title="Back" onPress={() => navigation.goBack()} />
        <Button title="phone" onPress={() => navigation.navigate('Login')} />
        <Button
          title="Register with email"
          onPress={() => navigation.navigate('Register')} 
          buttonStyle={styles.button}
        />
      </View>
    </ImageBackground>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  background: {
    flex: 1,
    resizeMode: 'cover', // or 'stretch' or 'contain'
    justifyContent: 'center',
  },

  backgroundTextinput: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 0,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 250,
    marginBottom: 350,
  },
  input: {
    width: '80%', // Adjust width as per your preference
    height: 40,
    width: 350,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    marginBottom: 10,
    marginTop: 0,

  },
  input2: {
    width: '80%', // Adjust width as per your preference
    height: 40,
    width: 350,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    marginBottom: 10,
    marginTop: 0,

  },
  buttonStyle: {
    width: '80%', // Adjust width as per your preference
    height: 40,
    width: 350,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    marginBottom: 10,
    marginTop: -100,

  },
    passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  showPasswordButton: {
    marginTop: -20,
  },
  
  button: {
    marginTop: 10,
  },
});

export default LoginEmail;
