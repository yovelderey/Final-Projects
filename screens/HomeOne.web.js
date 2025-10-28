import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

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

const HomeOne = ({ route }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [canProceed, setCanProceed] = useState(false);

  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const { finalEventName } = route.params;
  const navigation = useNavigation();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [buttonScale] = useState(new Animated.Value(1));

  // אנימציית כניסה
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // אנימציה לכפתור לפי מצב השדות
  useEffect(() => {
    const ready = !!(selectedDate && selectedHour && selectedMinute);
    setCanProceed(ready);
    Animated.spring(buttonScale, {
      toValue: ready ? 1.08 : 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [selectedDate, selectedHour, selectedMinute]);

  const hebrewMonths = [
    "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
    "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
  ];

  const CustomHeader = ({ date }) => {
    const d = new Date(date);
    const month = hebrewMonths[d.getMonth()];
    const year  = d.getFullYear();
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#6c63ff' }}>
          {`${month} ${year}`}
        </Text>
      </View>
    );
  };

  const handleSave = async () => {
    if (!selectedDate) {
      Alert.alert('שגיאה', 'בחר תאריך.');
      return;
    }

    const formattedDate = selectedDate;
    const formattedTime = `${selectedHour}:${selectedMinute}`;

    const eventDate = new Date(formattedDate);
    const nextDay = new Date(eventDate);
    nextDay.setDate(eventDate.getDate() + 1);
    const nextDayFormatted = nextDay.toISOString().split('T')[0];

    try {
      await set(ref(database, `Events/${user.uid}/${finalEventName}/eventDate/`), formattedDate);
      await set(ref(database, `Events/${user.uid}/${finalEventName}/eventTime/`), formattedTime);

      const defaultTableData = [
        { id: '1', col1: '00.00.0000', col2: '300', col3: '0', col4: 'הזמנות',  col5: '1' },
        { id: '2', col1: '00.00.0000', col2: '300', col3: '0', col4: 'תזכורת', col5: '2' },
        { id: '3', col1: formattedDate, col2: '300', col3: '0', col4: 'יום חתונה', col5: '3' },
        { id: '4', col1: nextDayFormatted, col2: '300', col3: '0', col4: 'תודה רבה', col5: '4' },
      ];
      await set(ref(database, `Events/${user.uid}/${finalEventName}/Table_RSVPs/`), defaultTableData);

      navigation.navigate('HomeTwo', { finalEventName });
    } catch (e) {
      Alert.alert('שגיאה', 'נכשל בשמירה, נסה שוב.');
    }
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

  // התאמות גובה/מרווחים למכשירים קטנים
  const isSmallHeight = height < 700;
  const calendarHeight = Math.max(270, Math.min(340, Math.floor(height * 0.35)));

  return (
    <ImageBackground
      source={require('../assets/Home_two2.png')}
      style={styles.backgroundImage}
      imageStyle={{ resizeMode: 'cover' }}
    >
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 24 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title1, { marginTop: isSmallHeight ? 24 : 40 }]}>
              מתי אנחנו חוגגים?
            </Text>

            <View style={[
              styles.box,
              {
                marginTop: isSmallHeight ? 16 : 24,
                padding: isSmallHeight ? 14 : 20
              }
            ]}>
              <Calendar
                style={[styles.calendar, { height: calendarHeight }]}
                onDayPress={handleDayPress}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: '#6c63ff' },
                }}
                minDate={new Date().toISOString().split('T')[0]}
                renderHeader={(date) => <CustomHeader date={date} />}
                // הופך ידידותי ל־RTL אם צריך
                theme={{
                  textDayFontFamily: Platform.select({ ios: 'System', android: 'System' }),
                  textMonthFontFamily: Platform.select({ ios: 'System', android: 'System' }),
                  textDayHeaderFontFamily: Platform.select({ ios: 'System', android: 'System' }),
                }}
              />

              <Text style={[styles.subtitle, { marginTop: isSmallHeight ? 20 : 28 }]}>
                באיזה שעה האירוע?
              </Text>

              <View style={styles.timePickerContainer}>
                <View style={styles.pickerWrapper}>
                  <Text style={styles.pickerLabel}>שעה</Text>
                  <ScrollView
                    style={styles.picker}
                    showsVerticalScrollIndicator={false}
                  >
                    {[...Array(24).keys()].map((hour) => {
                      const val = hour.toString().padStart(2, '0');
                      const selected = val === selectedHour;
                      return (
                        <TouchableOpacity key={val} onPress={() => setSelectedHour(val)}>
                          <Text style={[styles.pickerItem, selected && styles.selectedPickerItem]}>
                            {val}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.pickerWrapper}>
                  <Text style={styles.pickerLabel}>דקות</Text>
                  <ScrollView
                    style={styles.picker}
                    showsVerticalScrollIndicator={false}
                  >
                    {[...Array(60).keys()].map((minute) => {
                      const val = minute.toString().padStart(2, '0');
                      const selected = val === selectedMinute;
                      return (
                        <TouchableOpacity key={val} onPress={() => setSelectedMinute(val)}>
                          <Text style={[styles.pickerItem, selected && styles.selectedPickerItem]}>
                            {val}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }], alignSelf: 'center' }}>
              <TouchableOpacity
                style={[styles.nextButton, !canProceed && { backgroundColor: 'gray' }]}
                onPress={handleSave}
                disabled={!canProceed}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>המשך</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    // בלי 'vh' – זה לא רלוונטי למובייל
    justifyContent: 'flex-start',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  title1: {
    fontSize: 26,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: 'rgba(108, 99, 255, 0.9)',
    marginBottom: 8,
  },
  box: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  calendar: {
    alignSelf: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pickerWrapper: {
    alignItems: 'center',
    width: '42%',
  },
  pickerLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 6,
  },
  picker: {
    height: 120,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 8,
  },
  selectedPickerItem: {
    fontSize: 18,
    color: '#6c63ff',
    fontWeight: 'bold',
  },
  nextButton: {
    marginTop: 8,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 260,
    elevation: 4,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeOne;
