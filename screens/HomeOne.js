import React, { useState,useEffect } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet, Alert, Animated } from 'react-native';
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

const HomeOne = ({ route }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [canProceed, setCanProceed] = useState(false);
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const { finalEventName } = route.params;
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(0)); // אנימציית טשטוש כניסה
  const [buttonScale] = useState(new Animated.Value(1)); // אנימציה של כפתור

  // הפעלת אנימציית טשטוש כאשר המסך נטען
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // אנימציה לכפתור לפי מצב השדות
  useEffect(() => {
    if (selectedDate && selectedHour && selectedMinute) {
      setCanProceed(true);
      Animated.spring(buttonScale, {
        toValue: 1.1,
        friction: 2,
        useNativeDriver: true,
      }).start();
    } else {
      setCanProceed(false);
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 2,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedDate, selectedHour, selectedMinute]);

  const hebrewMonths = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];
  
  const CustomHeader = ({ date }) => {
    const month = hebrewMonths[new Date(date).getMonth()];
    const year = new Date(date).getFullYear();
  
    return (
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#6c63ff" }}>
          {`${month} ${year}`}
        </Text>
      </View>
    );
  };
  

  const handleSave = () => {
    if (!selectedDate) {
      Alert.alert('Error', 'בחר תאריך.');
      return;
    }
  
    // יצירת הפורמט הנדרש
    const formattedDate = selectedDate;
    const formattedTime = `${selectedHour}:${selectedMinute}`;
  
    // חישוב יום אחד קדימה
    const eventDate = new Date(formattedDate);
    const nextDay = new Date(eventDate);
    nextDay.setDate(eventDate.getDate() + 1);

    const nextDayFormatted = nextDay.toISOString().split('T')[0]; // פורמט yyyy-mm-dd


    // שמירת התאריך והשעה בפיירבייס
    const databaseRefeventDate = ref(database, `Events/${user.uid}/${finalEventName}/eventDate/`);
    set(databaseRefeventDate, formattedDate)
      .then(() => console.log('תאריך נשמר בהצלחה'));
  
    const databaseRefeventTime = ref(database, `Events/${user.uid}/${finalEventName}/eventTime/`);
    set(databaseRefeventTime, formattedTime)
      .then(() => console.log('שעה נשמרה בהצלחה'));
  

      const defaultTableData = [
        { id: '1', col1: '00.00.0000', col2: '300', col3: '0' ,col4: 'הזמנות', col5: '1'},
        { id: '2', col1: '00.00.0000', col2: '300', col3: '0' ,col4: 'תזכורת', col5: '2' },
        { id: '3', col1: formattedDate, col2: '300', col3: '0' ,col4: 'יום חתונה', col5: '3'},
        { id: '4', col1: nextDayFormatted, col2: '300', col3: '0' ,col4: 'תודה רבה', col5: '4'},
      ];

          const databaseRefTable_RSVPs = ref(database, `Events/${user.uid}/${finalEventName}/Table_RSVPs/`);
          set(databaseRefTable_RSVPs,defaultTableData)

    console.log('databaseRefeventTime', databaseRefeventTime);
    navigation.navigate('HomeTwo', { finalEventName }); // כאן מעבירים את הפרמטר

  };
  
  const handleDayPress = (day) => {
    const today = new Date().toISOString().split('T')[0];
  
    if (day.dateString < today) {
      Alert.alert('שגיאה', 'לא ניתן לבחור תאריך שהוא בעבר');
    } else {
      setSelectedDate(day.dateString);
      setCanProceed(true);
    }
  };
  return (
    <ImageBackground
      source={require('../assets/Home_two.png')}
      style={styles.backgroundImage}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title1}>מתי אנחנו חוגגים?</Text>

        <View style={styles.box}>
        <Calendar
          style={styles.calendar}
          onDayPress={handleDayPress}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: '#6c63ff' },
          }}
          minDate={new Date().toISOString().split('T')[0]} // הגבלת תאריך מינימלי להיום
          renderHeader={(date) => <CustomHeader date={date} />}
        />


          <Text style={styles.subtitle}>באיזה שעה האירוע?</Text>
          <View style={styles.timePickerContainer}>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>שעה</Text>
              <Animated.ScrollView
                style={styles.picker}
                showsVerticalScrollIndicator={false}
              >
                {[...Array(24).keys()].map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => setSelectedHour(hour.toString().padStart(2, '0'))}
                  >
                    <Text
                      style={[
                        styles.pickerItem,
                        hour.toString().padStart(2, '0') === selectedHour && styles.selectedPickerItem,
                      ]}
                    >
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>
            </View>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>דקות</Text>
              <Animated.ScrollView
                style={styles.picker}
                showsVerticalScrollIndicator={false}
              >
                {[...Array(60).keys()].map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    onPress={() => setSelectedMinute(minute.toString().padStart(2, '0'))}
                  >
                    <Text
                      style={[
                        styles.pickerItem,
                        minute.toString().padStart(2, '0') === selectedMinute && styles.selectedPickerItem,
                      ]}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>
            </View>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed && { backgroundColor: 'gray' }]}
            onPress={handleSave}
            disabled={!canProceed}
          >
            <Text style={styles.nextButtonText}>המשך</Text>
          </TouchableOpacity>
        </Animated.View>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  text1: {
    fontSize: 18,
    color: 'black',
    marginTop: 40,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginVertical: 10,
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 70,


  },
  box: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    width: '90%',
    marginTop: 120,

  },
  calendar: {
    marginBottom: 10,
    width: '100%',
    height: 250,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pickerWrapper: {
    alignItems: 'center',
    width: '40%',
  },
  pickerLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  picker: {
    height: 100,
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 5,
  },
  selectedPickerItem: {
    fontSize: 18,
    color: '#6c63ff',
    fontWeight: 'bold',
  },
  nextButton: {
    marginTop: 25,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    height: 40,
    elevation: 5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title1: {
  fontSize: 26,
  fontWeight: 'bold',
  alignSelf: 'center', // ממקם את הטקסט במרכז המיכל שלו
  marginTop: 60,
  color: 'rgba(108, 99, 255, 0.9)',
  marginBottom: -30,

},
});

export default HomeOne;
