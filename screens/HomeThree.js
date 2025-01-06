import React, { useState, useEffect } from 'react';
import { View, Text,ScrollView, TouchableOpacity, ImageBackground, StyleSheet,Modal, TextInput,Alert, Animated } from 'react-native';
import { Calendar } from 'react-native-calendars';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';


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

const HomeThree = ({ route }) => {

  const [canProceed, setCanProceed] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0)); // עבור האנימציה
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const { finalEventName } = route.params;
  const navigation = useNavigation();
  const [Numberofguests, setNumberofguests] = useState('');
  const [buttonScale] = useState(new Animated.Value(1));


  

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  


  const handleSave = () => {
 
    navigation.navigate('Main'); // כאן מעבירים את הפרמטר

  };
  
  return (
    <ImageBackground
      source={require('../assets/Home_four.png')}
      style={styles.backgroundImage}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title}>סיכום</Text>

        <Text style={styles.txt}>כגעגכעדגכעדגכע</Text>
        <Text style={styles.txt}>סיגדכעגכדעכום</Text>
        <Text style={styles.txt}>סיכגכעכעום</Text>
        <Text style={styles.txt}>גכגגג344ds3ככה</Text>


          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleSave}
          >
            <Text style={styles.nextButtonText}>סיימתי, בואו נתחיל!</Text>
          </TouchableOpacity>
        </Animated.View>

    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    marginTop: -400,

    fontSize: 25,
    fontWeight: 'bold',
    color: '#6c63ff',
    textAlign: 'center',
    marginBottom: 130,
  },

  nextButton: {
    marginTop: 25,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 40,
    elevation: 5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  txt: {
    fontSize: 14,
    textAlign: 'right',
    padding: 4,

  },
  textButton: {
    fontSize: 15,
    color: '#000',
    textDecorationLine: 'underline', // מוסיף קו תחתון לטקסט
  },

});

export default HomeThree;