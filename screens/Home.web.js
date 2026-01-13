// Home.js — רספונסיבי + גלילה + "יציאה ללובי" בלי ניתוק משתמש + כתיבת Event רק בלחיצה על "המשך" + שמירת DarkMode audit ב-Firebase
import React, { useEffect, useMemo, useState } from 'react';
import {
  TouchableOpacity,
  Image,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  View,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';

const firebaseConfig = {
  apiKey: 'AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag',
  authDomain: 'final-project-d6ce7.firebaseapp.com',
  projectId: 'final-project-d6ce7',
  storageBucket: 'final-project-d6ce7.appspot.com',
  messagingSenderId: '1056060530572',
  appId: '1:1056060530572:web:d08d859ca2d25c46d340a9',
  measurementId: 'G-LD61QH3VVP',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const Home = (props) => {
  const navigation = useNavigation();

  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [secondOwnerName, setSecondOwnerName] = useState('');
  const [canProceed, setCanProceed] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [buttonScale] = useState(new Animated.Value(1));

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const contentW = Math.min(screenWidth * 0.96, 980);

  const user = firebase.auth().currentUser;
  const database = getDatabase();

  // ===== Dark Mode (UI + audit write) =====
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const resolvedIsDark = systemScheme === 'dark';

  const theme = useMemo(() => {
    const isDark = resolvedIsDark;
    return {
      isDark,
      bg: isDark ? '#0B0F19' : '#FFFFFF',
      card: isDark ? '#111827' : '#FFFFFF',
      text: isDark ? '#E5E7EB' : '#111827',
      subText: isDark ? '#C7CED9' : '#333333',
      border: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(108, 99, 255, 0.35)',
      borderStrong: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(108, 99, 255, 0.9)',
      primary: 'rgba(108, 99, 255, 0.9)',
      primaryTextOn: '#FFFFFF',
      mutedBtn: isDark ? '#374151' : 'gray',
      shadow: isDark ? '#000' : '#000',
    };
  }, [resolvedIsDark]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleCategorySelection = (category) => {
    setSelectedCategory(category);
  };

  // הפעלת/כיבוי כפתור "המשך"
  useEffect(() => {
    const ok =
      eventName.trim() &&
      selectedCategory &&
      (selectedCategory !== 'חתונה' || (selectedCategory === 'חתונה' && secondOwnerName.trim()));

    setCanProceed(!!ok);

    Animated.spring(buttonScale, {
      toValue: ok ? 1.1 : 1,
      friction: 2,
      useNativeDriver: true,
    }).start();
  }, [eventName, secondOwnerName, selectedCategory, buttonScale]);

  // ✅ יציאה ללובי בלי SignOut (לא מנתק משתמש)
  const exitToLobby = () => {
    // אם יש לאן לחזור בסטאק – חזור אחורה
    if (props?.navigation?.canGoBack?.()) {
      props.navigation.goBack();
      return;
    }

    // אחרת – ריסט ללובי (לא עושים signOut)
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'LoginEmail' }], // אם הלובי אצלך בשם אחר — תחליף כאן
    });
  };

  // ✅ יצירת אירוע: הכל נכתב לפיירבייס רק אחרי לחיצה על "המשך"
  const handleCreateEvent = async () => {
    let finalEventName = eventName.trim();
    if (selectedCategory === 'חתונה') {
      finalEventName = `${eventName.trim()} & ${secondOwnerName.trim()}`;
    }

    if (!user) {
      Alert.alert('שגיאה', 'המשתמש לא מחובר.');
      return;
    }

    const basePath = `Events/${user.uid}/${finalEventName}`;

    const defaultTableData = [
      { id: '1', col1: '00.00.0000', col2: '300', col3: '0', col4: 'הזמנות', col5: '1' },
      { id: '2', col1: '00.00.0000', col2: '300', col3: '0', col4: 'תזכורת', col5: '2' },
      { id: '3', col1: '00.00.0000', col2: '300', col3: '0', col4: 'יום חתונה', col5: '3' },
      { id: '4', col1: '00.00.0000', col2: '300', col3: '0', col4: 'תודה רבה', col5: '4' },
    ];

    const userData = {
      eventName: finalEventName,
      eventCategory: selectedCategory,
      eventDate: '00.00.0000',
      eventTime: eventTime,
      budget: budget,
      Numberofguests: Numberofguests,
      eventLocation: eventLocation,
      eventDescription: eventDescription,
      secondOwnerName: secondOwnerName,
      firstOwnerName: eventName,
      spend: '',
      sent_msg: 0,
      main_sms: 25,
      plan: 'no plan',
    };

    // audit theme בדיוק כמו שביקשת:
    // Events/{uid}/{eventName}/__admin/audit/ui/theme
    const themeAudit = {
      mode: 'auto',
      platform: Platform.OS,
      resolvedIsDark: theme.isDark === true,
      systemScheme: systemScheme || 'unknown',
      ts: Date.now(),
    };

    try {
      // 1) קודם יוצרים בסיס אירוע
      await set(ref(database, `${basePath}/`), userData);

      // 2) ואז כל שאר הנתיבים (כדי לא להידרס בגלל set במקביל)
      await Promise.all([
        set(ref(database, `${basePath}/yes_caming`), 0),
        set(ref(database, `${basePath}/maybe`), 0),
        set(ref(database, `${basePath}/no_cuming`), 0),
        set(ref(database, `${basePath}/no_answear`), 0),

        set(ref(database, `${basePath}/Numberofimage/`), 0),
        set(ref(database, `${basePath}/NumberofSizeimage/`), 0),
        set(ref(database, `${basePath}/Table_RSVPs/`), defaultTableData),

        set(ref(database, `${basePath}/__admin/ui/theme`), themeAudit),
      ]);

      // 3) ניווט רק אחרי שכל הכתיבות הצליחו
      props.navigation.navigate('HomeOne', { finalEventName });

      // 4) איפוס שדות (אופציונלי)
      setEventDate('0000-00-00');
      setEventTime('00:00');
      setEventLocation('לא הוגדר');
      setNumberofguests('0');
      setBudget('0');
      setEventDescription('אין הערות');
    } catch (error) {
      console.error('Error writing data to the database:', error);
      Alert.alert('שגיאה', 'לא הצלחתי ליצור אירוע. נסה שוב.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, width: '100%', backgroundColor: theme.bg }}
      contentContainerStyle={[styles.scrollContent, { minHeight: screenHeight * 0.98 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* כותרות */}
      <Text style={styles.title1}>יצירת אירוע חדש</Text>

      {/* פעולות עליונות (יציאה ללובי) */}
      <View style={[styles.topActions, { width: contentW }]}>
        <TouchableOpacity
          onPress={exitToLobby}
          style={styles.exitBtn}
          activeOpacity={0.9}
          accessibilityLabel="יציאה ללובי"
        >
          <Ionicons name="log-out-outline" size={18} color={theme.primary} />
          <Text style={styles.exitBtnText}>יציאה ללובי</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title2}>מה אתם חוגגים?</Text>

      {/* קטגוריות */}
      <View style={[styles.buttonContainer, { width: contentW }]}>
        {[
          { category: 'חתונה', icon: require('../assets/rings.png') },
          { category: 'חינה', icon: require('../assets/camel.png') },
          { category: 'בר/ת מצווה', icon: require('../assets/children.png') },
          { category: 'בריתה', icon: require('../assets/baby-carriage.png') },
          { category: 'יום הולדת', icon: require('../assets/happy-birthday.png') },
          { category: 'כנס', icon: require('../assets/conference.png') },
          { category: 'וובינר', icon: require('../assets/webinar.png') },
          { category: 'אחר', icon: require('../assets/more.png') },
        ].map((item) => (
          <TouchableOpacity
            key={item.category}
            style={[
              styles.categoryButton,
              selectedCategory === item.category && styles.selectedCategoryButton,
            ]}
            onPress={() => handleCategorySelection(item.category)}
            activeOpacity={0.9}
          >
            <Image source={item.icon} style={styles.categoryIcon} />
            <Text style={styles.categoryButtonText}>{item.category}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* שדות טקסט רספונסיביים */}
      <TextInput
        style={[
          styles.input,
          { width: screenWidth >= 900 ? '32%' : screenWidth >= 600 ? '48%' : '80%' },
        ]}
        placeholder="שם בעל האירוע"
        placeholderTextColor={theme.isDark ? 'rgba(229,231,235,0.55)' : 'rgba(17,24,39,0.45)'}
        value={eventName}
        onChangeText={(text) => setEventName(text)}
      />

      {selectedCategory === 'חתונה' && (
        <TextInput
          style={[
            styles.input,
            { width: screenWidth >= 900 ? '32%' : screenWidth >= 600 ? '48%' : '80%' },
          ]}
          placeholder="שם בעלת האירוע"
          placeholderTextColor={theme.isDark ? 'rgba(229,231,235,0.55)' : 'rgba(17,24,39,0.45)'}
          value={secondOwnerName}
          onChangeText={(text) => setSecondOwnerName(text)}
        />
      )}

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed && { backgroundColor: theme.mutedBtn },
          ]}
          onPress={handleCreateEvent}
          disabled={!canProceed}
          activeOpacity={0.9}
        >
          <Text style={styles.nextButtonText}>המשך</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

function createStyles(theme) {
  return StyleSheet.create({
    scrollContent: {
      paddingTop: 50,
      paddingBottom: 30,
      alignItems: 'center',
      backgroundColor: theme.bg,
    },

    title1: {
      fontSize: 26,
      fontWeight: 'bold',
      alignSelf: 'center',
      color: theme.primary,
      marginBottom: 8,
    },
    title2: {
      fontSize: 19,
      alignSelf: 'center',
      marginTop: 60,
      marginBottom: 12,
      color: theme.text,
    },

    // אזור פעולות עליון
    topActions: {
      alignSelf: 'center',
      marginTop: 6,
      marginBottom: 6,
      flexDirection: 'row-reverse',
      justifyContent: 'flex-start',
    },
    exitBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: theme.card,
      alignSelf: 'flex-start',
    },
    exitBtnText: {
      color: theme.primary,
      fontWeight: '700',
      fontSize: 14,
    },

    // רשת כפתורי קטגוריות
    buttonContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignSelf: 'center',
      justifyContent: 'center',
      marginVertical: 10,
      columnGap: 10,
    },
    categoryButton: {
      width: 130,
      height: 90,
      margin: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'gray',
      borderRadius: 12,
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.18 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    selectedCategoryButton: {
      borderColor: 'orange',
      borderWidth: 4,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      marginBottom: 6,
    },
    categoryButtonText: {
      fontSize: 15,
      fontWeight: 'bold',
      color: theme.text,
    },

    // שדות
    input: {
      height: 42,
      borderWidth: 1,
      borderRadius: 7,
      borderColor: theme.borderStrong,
      backgroundColor: theme.card,
      paddingHorizontal: 12,
      textAlign: 'right',
      marginBottom: 14,
      alignSelf: 'center',
      color: theme.text,
    },

    // כפתור הבא
    nextButton: {
      marginTop: 6,
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      width: 260,
      height: 44,
      elevation: 5,
      alignSelf: 'center',
    },
    nextButtonText: {
      color: theme.primaryTextOn,
      fontWeight: '700',
      fontSize: 16,
    },
  });
}

export default Home;
