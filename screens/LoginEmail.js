import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text,TouchableOpacity, Image,ImageBackground,Alert} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
          <View style={styles.emailInput}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              onChangeText={text => setEmail(text)}
            />
            </View>
            <View style={styles.passwordInput}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry={!showPassword}

                onChangeText={text => setPassword(text)}
              />
            </View>

        <TouchableOpacity 
          onPress={togglePasswordVisibility} 
            style={[styles.showPasswordButton, { position: 'absolute', top: '40%', left: '7%' }]}>
            <Image source={require('../assets/Eye.png')} style={styles.eyeIcon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('RePassword')} style={styles.fpButton}>
          <Image source={require('../assets/Fp.png')}  />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
          <Image source={require('../assets/Loginbutton.png')} style={styles.image} />
        </TouchableOpacity>

        <Image source={require('../assets/divider.png')} style={styles.divider} />

        <TouchableOpacity onPress={() => navigation.navigate('PhoneNumberScreen')} style={styles.phoneButton}>
          <Image source={require('../assets/buttonphone.png')}  />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signupButton}>
          <Image source={require('../assets/SignUp.png')}  />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('Main')}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundTextinput: {
    width: '80%',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
  },
  inputemail: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 140,
  },
  emailInput: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  passwordInput: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },

  showPasswordButton: {
    marginLeft: -20,
  },
  eyeIcon: {
    width: 20,
    height: 20,

  },
  backIcon: {
    width: 60,
    height: 60,

  },
  fpButton: {
    marginTop: 5,
  },
  loginButton: {
    marginTop: 20,
  },
  phoneButton: {
    marginTop: 20,
  },
  signupButton: {
    marginTop: 20,
  },


  image: {
    width: 350,
    height: 40,
  },
  divider: {
    width: 350,
    height: 25,
    marginTop: 40,
  },
});

export default LoginEmail;
