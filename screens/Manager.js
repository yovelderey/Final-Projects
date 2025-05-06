import React, { useEffect, useState } from 'react';
import { View, TextInput, Alert, ScrollView, StatusBar, TouchableOpacity, Text, StyleSheet, ImageBackground } from 'react-native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

function Manager(props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showThankYou, setShowThankYou] = useState(false); // סטייט למסך התודה

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

  const validatePassword = (password) => {
    const minLength = 8;
    return password.length >= minLength;
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('שגיאה', 'אנא הכנס כתובת דוא"ל.');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להיות באורך של לפחות 8 תווים.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות.');
      return;
    }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      setShowThankYou(true); // הצגת מסך התודה עם תמונת רקע
      setTimeout(() => {
        setShowThankYou(false);
        props.navigation.navigate('Setting'); // חזרה למסך אחר אחרי 4 שניות
      }, 4000);
    } catch (error) {
      console.error(error);
      Alert.alert('שגיאה', 'שליחת המייל לאיפוס סיסמה נכשלה.');
    }
  };

  if (showThankYou) {
    return (
      <ImageBackground
        source={require('../assets/toda.png')} // נתיב לתמונה שלך
        style={styles.imageBackground}
      >
        {/* ניתן להוסיף אלמנטים נוספים אם יש צורך */}
      </ImageBackground>
    );
  }

  return (
      <View style={styles.innerContainer}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <Text style={styles.title}>איפוס סיסמה</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="איימיל"
            value={email}
            onChangeText={(text) => setEmail(text)}
            keyboardType="email-address"
            textAlign="right"
          />
          <TextInput
            style={styles.input}
            placeholder="הכנס סיסמה חדשה"
            value={password}
            onChangeText={(text) => setPassword(text)}
            secureTextEntry={true}
            textAlign="right"
          />
          <TextInput
            style={styles.input}
            placeholder="אמת סיסמה חדשה"
            value={confirmPassword}
            onChangeText={(text) => setConfirmPassword(text)}
            secureTextEntry={true}
            textAlign="right"
          />
          <Text style={styles.passwordHint}>
            הסיסמה חייבת להיות באורך של לפחות 8 תווים.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handlePasswordReset} style={styles.button}>
              <Text style={styles.buttonText}>איפוס סיסמה</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => props.navigation.navigate('Setting')} style={styles.button2}>
              <Text style={styles.buttonText}>חזרה</Text>
            </TouchableOpacity>
          </View>

        </View>
        <Text style={styles.footerText}>כל הזכויות שמורות לליאור ויובל ©</Text>

      </View>
  );
}

const styles = StyleSheet.create({

  innerContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    color: '#000',
    marginBottom: 40,
    fontWeight: 'bold',
    marginTop: 70,
    color: '#EA47A7',
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '90%',
    height: 50,
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 20,
    paddingLeft: 10,
    fontSize: 18,
  },
  passwordHint: {
    color: '#888',
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 50,
  },
  button: {
    width: '80%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: '#000', // Black border
    borderWidth: 2, // Thickness of the border
    borderRadius: 5, // Round corners (optional)
    alignItems: 'center', // Center the text horizontally
    justifyContent: 'center', // Center the text vertically
    marginBottom: 15,
    backgroundColor: '#EA47A7'
  },
  button2: {
    width: '80%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: '#000', // Black border
    borderWidth: 2, // Thickness of the border
    borderRadius: 5, // Round corners (optional)
    alignItems: 'center', // Center the text horizontally
    justifyContent: 'center', // Center the text vertically
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    position: 'absolute',
    bottom: 20, // מרחק מהתחתית
    fontSize: 13,
    color: 'black',
    marginTop: 150  // לשמור על היחס המקורי של התמונה

  },
});

export default Manager;
