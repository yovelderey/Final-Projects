import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text ,Alert} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {FirebaseRecaptchaVerifierModal }from 'expo-firebase-recaptcha'; // Import the package
import { firebaseConfig } from '../config';
import { initializeApp } from 'firebase/app';

import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

function LoginEmail() {

  const firebaseConfig = {
    apiKey: "AIzaSyDlfsAURNGgAD9OVsRlXS28dtv28eiLASs",
    authDomain: "yaara-mallka.firebaseapp.com",
    //authDomain: "YaaraMallka",
    projectId: "yaara-mallka",
    storageBucket: "yaara-mallka.appspot.com",
    messagingSenderId: "665221289464",
    appId: "1:665221289464:web:d2f8a91d9cded3265e320d",
    measurementId: "G-WS6M5TLZWD"
  };

  if (!firebase.apps.length){
        firebase.initializeApp(firebaseConfig);
  }
  

  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);



  

  const handleLogin = async () => {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);



     
    
      // You can navigate to your app's main screen upon successful login.
      navigation.navigate('Main');
    } catch (error) {
      Alert.alert('Authentication Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        onChangeText={text => setEmail(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry={true}
        onChangeText={text => setPassword(text)}
      />
      <Button title="LOGIN" onPress={handleLogin} />
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
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
  input: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingLeft: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});

export default LoginEmail;
