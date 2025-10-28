import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firebase from 'firebase/compat/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

const RSVPsthree = (props) => {
  const insets = useSafeAreaInsets();
  const id = props.route.params.id; 
  const user = firebase.auth().currentUser;
  const database = getDatabase();

  const [selectedDate1, setSelectedDate1] = useState('');
  const [selectedTime1, setSelectedTime1] = useState(new Date());
  const [maxEventDate, setMaxEventDate] = useState('');

  const canProceed = selectedDate1 !== ''; // יכול להתקדם אם נבחר תאריך

  useEffect(() => {
    if (user) {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/eventDate`);
      onValue(databaseRef, (snapshot) => {
        const fetchedDate = snapshot.val();
        if (fetchedDate) {
          const eventDate = new Date(fetchedDate);
          eventDate.setDate(eventDate.getDate() - 2); // פחות יומיים
          setMaxEventDate(eventDate.toISOString().split('T')[0]);
        }
      });
    }
  }, [user, id]);
  

  const handleDayPress = (day) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (day.dateString < today) {
      Alert.alert('שגיאה', 'לא ניתן לבחור תאריך שהוא בעבר');
    } else if (day.dateString > maxEventDate) {
      Alert.alert('שגיאה', `לא ניתן לבחור תאריך אחרי ${maxEventDate}`);
    } else {
      setSelectedDate1(day.dateString);
    }
  };

  const handleSave = async () => {
    if (user) {
      try {
        const databaseRef = ref(database, `Events/${user.uid}/${id}/message_date_hour`);
        const messageData = {
          date: selectedDate1,
          time: selectedTime1.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        await set(databaseRef, messageData);
        props.navigation.navigate('RSVPsfour', { id });
      } catch (error) {
        console.error("Error saving message to Firebase: ", error);
        alert('שגיאה בשמירת ההודעה. נסה שוב.');
      }
    }
  };

  return (
    <ImageBackground source={require('../assets/back2.png')} style={styles.backgroundImage}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => props.navigation.navigate('RSVPstwo', { id })} style={styles.backButton}>
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
            onDayPress={handleDayPress}
            markedDates={{
              [selectedDate1]: { selected: true, selectedColor: '#6c63ff' },
            }}
            minDate={new Date().toISOString().split('T')[0]}
            maxDate={maxEventDate}
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
          onPress={handleSave}
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
