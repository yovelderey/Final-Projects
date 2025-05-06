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


      <View style={styles.container}>

        <TouchableOpacity 
          onPress={() => navigation.navigate('Main')} >
          <Image source={require('../assets/backicontwo.png')} style={styles.imageback} />
        </TouchableOpacity>
        
        <Image source={require('../assets/wellcome_text.png')} style={styles.imagetext} />

          <View style={styles.emailInput}>
            <TextInput
              style={styles.input}
              placeholder="אימייל"
              keyboardType="email-address"
              onChangeText={text => setEmail(text)}
            />
            </View>


            <View style={styles.passwordInput}>
              <TextInput
                style={styles.input}
                placeholder="סיסמה"
                secureTextEntry={!showPassword}

                onChangeText={text => setPassword(text)}
              />

              <TouchableOpacity 
                onPress={togglePasswordVisibility} 
                  style={[styles.showPasswordButton]}>
                  <Image source={require('../assets/Eye.png')} style={styles.eyeIcon} />
              </TouchableOpacity>
            </View>


            <TouchableOpacity onPress={() => navigation.navigate('RePassword')} style={styles.fpButton}>
              <Text style={styles.header_re}>לחץ לאיפוס סיסמה</Text>
            </TouchableOpacity>





        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
          <Image source={require('../assets/logineasyvent.png')} style={styles.image} />
        </TouchableOpacity>

        <Image source={require('../assets/find_us.png')} style={styles.divider} />



        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signupButton}>
          <Text style={styles.header_re2}>
            עדיין אין לך חשבון?,{' '}
            <Text style={styles.registerNow}>הירשם עכשיו</Text>
          </Text>
        </TouchableOpacity>


      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white', // רקע לבן

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
    borderWidth: 1, // עובי המסגרת
    borderRadius: 7,
    borderColor: 'orange', // צבע השוליים לכתום
    textAlign: 'right', // מיישר את ה-placeholder והטקסט לימין

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
    marginTop: 150,


  },
  passwordInput: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  showPasswordButton: {
    padding: 0,
    position: 'absolute',  // שימוש במיקום אבסולוטי
    left: 10,  // הצמדה לצד שמאל של הקונטיינר
  },
  eyeIcon: {
    width: 20,
    height: 20,

  },
  backIcon: {
    width: 40,
    height: 40,

  },
  fpButton: {
    marginTop: -15,
    marginBottom: 14,
    alignSelf: 'flex-end', // מיישר את הכפתור לימין בתוך רכיב ההורה
    marginRight: 20, // ריווח בין התמונה לטקסט

  },
  
  loginButton: {
    marginTop: 20,
  },
  phoneButton: {
    marginTop: 20,
  },
  signupButton: {
    marginTop: -60,
    marginBottom: 210,

  },

  imageback: {
    width: 40,
    height: 40,
    marginTop: 150,
    marginRight: 300, // ריווח בין התמונה לטקסט

  },
  imagetext: {
    marginBottom: -60,
    marginTop: 55,

  },
  divider: {

    marginTop: 85,
  },
  logo: {
    width: 450,  // רוחב הלוגו
    height: 450, // גובה הלוגו
    marginTop: 0,

  },
  header_re: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: 'black',
    textAlign: 'right', // יישור הטקסט לימין

  },

  header_re: {
    color: 'black', // צבע ורוד כהה יותר
    fontWeight: 'bold', // הדגשה (עיבוי הטקסט)
    fontSize: 12,

  },

  header_re2: {
    color: '#FF66B2', // צבע ורוד כהה יותר
    fontWeight: 'bold', // הדגשה (עיבוי הטקסט)
    fontSize: 15,

  },
  registerNow: {
    color: 'lightblue', // צבע התכלת
    fontWeight: 'bold', // עבה יותר, אופציונלי
    fontSize: 15,
    color: '#0099FF', // צבע תכלת כהה יותר

  },
});

export default LoginEmail;
