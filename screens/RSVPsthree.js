import React, { useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const RSVPsthree = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [selectedDate1, setSelectedDate1] = useState('');
  const [selectedTime1, setSelectedTime1] = useState(new Date());

  const canProceed = selectedDate1;

  return (
    <ImageBackground
      source={require('../assets/back2.png')}
      style={styles.backgroundImage}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>אישורי הגעה</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.text1}>בחר תאריך ושעה כדי לקבוע תזמון אוטומטי לשליחת ההזמנות לנמענים.</Text>
        <Text style={styles.text2}>(מומלץ לתזמן לפחות עד 10 ימים לפני האירוע)</Text>

        <View style={styles.box}>
          <Calendar
            style={styles.calendar}
            onDayPress={(day) => setSelectedDate1(day.dateString)}
            markedDates={{
              [selectedDate1]: { selected: true, selectedColor: '#6c63ff' },
            }}
          />
          <Text style={styles.subtitle}>בחר שעות ודקות:</Text>
          <DateTimePicker
            value={selectedTime1}
            mode="time"
            display="spinner"
            onChange={(event, selectedTime) => {
              if (selectedTime) setSelectedTime1(selectedTime);
            }}
          />
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { opacity: canProceed ? 1 : 0.5 }]}
          onPress={() => {
            if (canProceed) {
              navigation.navigate('RSVPsfour');
            } else {
              alert('יש לבחור תאריך ושעה לפני המעבר');
            }
          }}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>הבא</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: 20,
  },
  header: {
    width: '100%',
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
  },
  backButtonText: {
    fontSize: 29,
    color: 'white',
  },
  title: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text1: {
    fontSize: 16,
    color: 'black',
    marginTop: 75,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  text2: {
    fontSize: 16,
    color: 'black',
    marginTop: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginVertical: 10,
    textAlign: 'center',
  },
  box: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    width: '90%',
  },
  calendar: {
    marginBottom: 10,
    width: '100%',
    height: 300,
  },
  nextButton: {
    marginTop: 25,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 350,
    height: 40,
    elevation: 5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RSVPsthree;
