import React, { useEffect, useState } from 'react';
import { View, TextInput, Alert, ScrollView, StatusBar, TouchableOpacity, Text, StyleSheet } from 'react-native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

function Manager(props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumber
    );
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('שגיאה', 'אנא הכנס כתובת דוא"ל.');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להיות באורך של לפחות 8 תווים, לכלול אותיות גדולות וקטנות, מספרים ותווים מיוחדים.');
      return;
    }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      Alert.alert('הצלחה', 'מייל לאיפוס סיסמה נשלח.');
    } catch (error) {
      console.error(error);
      Alert.alert('שגיאה', 'שליחת המייל לאיפוס סיסמה נכשלה.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
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
          />
          <TextInput
            style={styles.input}
            placeholder="הכנס סיסמה חדשה"
            value={password}
            onChangeText={(text) => setPassword(text)}
            secureTextEntry={true}
          />
          <Text style={styles.passwordHint}>
            הסיסמה חייבת להיות באורך של לפחות 8 תווים, לכלול אותיות גדולות וקטנות, מספרים ותווים מיוחדים.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handlePasswordReset} style={styles.button}>
              <Text style={styles.buttonText}>איפוס סיסמה</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => props.navigation.navigate('Setting')} style={styles.button}>
              <Text style={styles.buttonText}>חזרה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: StatusBar.currentHeight || 40,
  },
  title: {
    fontSize: 24,
    color: '#000',
    marginBottom: 40, // רווח מתחת לכותרת
    fontWeight: 'bold',
    marginTop: 20,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 20, // רווח בין שדות האינפוט
    paddingLeft: 10,
    fontSize: 18,
  },
  passwordHint: {
    color: '#888',
    fontSize: 14,
    marginBottom: 30, // רווח בין ההסבר לכפתורים
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 50, // רווח בתחתית המסך
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
});

export default Manager;
