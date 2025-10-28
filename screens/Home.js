import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Image, Text, TextInput, ImageBackground, StyleSheet, Animated, View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import 'firebase/database'; // Import the Realtime Database module
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set } from 'firebase/database';

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

const Home = (props) => {
  const [eventName, setEventName] = useState('');

  const [eventTime, setEventTime] = useState('');
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [secondOwnerName, setSecondOwnerName] = useState(''); // new state for the second owner name
  const [canProceed, setCanProceed] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [buttonScale] = useState(new Animated.Value(1)); // משתנה לאנימציה

  const user = firebase.auth().currentUser;
  const database = getDatabase();


  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const handleCategorySelection = (category) => {
    setSelectedCategory(category);
};


useEffect(() => {
  if (
    eventName.trim() &&
    selectedCategory &&
    (selectedCategory !== 'חתונה' || (selectedCategory === 'חתונה' && secondOwnerName.trim()))
  ) {
    setCanProceed(true);
  } else {
    setCanProceed(false);
  }
}, [eventName, secondOwnerName, selectedCategory]);


  // עדכון מצב הכפתור עם אנימציה
  useEffect(() => {
    if (
      eventName.trim() &&
      selectedCategory &&
      (selectedCategory !== 'חתונה' || (selectedCategory === 'חתונה' && secondOwnerName.trim()))
    ) {
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
  }, [eventName, secondOwnerName, selectedCategory]);


  const handleCreateEvent = () => {
  
  
    // חיבור השמות במידה והקטגוריה היא "חתונה"
    let finalEventName = eventName; // הגדרת המשתנה כמקומי
    if (selectedCategory === 'חתונה') {
      finalEventName = eventName + " & " + secondOwnerName;
    }
  
    if (!user) {
      Alert.alert('Error', 'User is not logged in.');
      return;
    }
  
    const databaseRef = ref(database, `Events/${user.uid}/${finalEventName}/`);

    const defaultTableData = [
      { id: '1', col1: '00.00.0000', col2: '300', col3: '0' ,col4: 'הזמנות', col5: '1'},
      { id: '2', col1: '00.00.0000', col2: '300', col3: '0' ,col4: 'תזכורת', col5: '2' },
      { id: '3', col1: '00.00.0000', col2: '300', col3: '0' ,col4: 'יום חתונה', col5: '3'},
      { id: '4', col1: '00.00.0000', col2: '300', col3: '0' ,col4: 'תודה רבה', col5: '4'},
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
      secondOwnerName: secondOwnerName, // include second owner name
      firstOwnerName: eventName, // include second owner name
      spend: "",
      sent_msg: 0,
      main_sms: 25,
      plan: 'no plan'

    };

    set(databaseRef, userData)
      .then(() => {
        console.log('Data written to the database successfully');
        props.navigation.navigate('HomeOne', { finalEventName }); // כאן מעבירים את הפרמטר

      })
      .catch((error) => {
        console.error('Error writing data to the database:', error);
      });

      
    set(ref(database, `Events/${user.uid}/${finalEventName}/yes_caming`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/maybe`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/no_cuming`), 0);
    set(ref(database, `Events/${user.uid}/${finalEventName}/no_answear`), 0);

    const databaseRefNumberofimag = ref(database, `Events/${user.uid}/${finalEventName}/Numberofimage/`);
    set(databaseRefNumberofimag,0)

    const databaseRefNumberofSizeimag = ref(database, `Events/${user.uid}/${finalEventName}/NumberofSizeimage/`);
    set(databaseRefNumberofSizeimag,0)

    const databaseRefTable_RSVPs = ref(database, `Events/${user.uid}/${finalEventName}/Table_RSVPs/`);
    set(databaseRefTable_RSVPs,defaultTableData)

    setEventDate('0000-00-00');
    setEventTime('00:00');
    setEventLocation('לא הוגדר');
    setNumberofguests('0');
    setBudget('0');
    setEventDescription('אין הערות');




  };
  





  return (
  <ImageBackground
    source={require('../assets/Home_one.png')}
    style={styles.backgroundImage}
    resizeMode="cover"
  >
  <Text style={styles.title1}>יצירת אירוע חדש</Text>

  <Text style={styles.title2}>מה אתם חוגגים?</Text>

  {/* כפתורי קטגוריות */}
  <View style={styles.buttonContainer}>
  
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
      >
        {/* אייקון */}
        <Image source={item.icon} style={styles.categoryIcon} />
        {/* שם קטגוריה */}
        <Text style={styles.categoryButtonText}>{item.category}</Text>
      </TouchableOpacity>
    ))}
  </View>


  <TextInput
    style={styles.input}
    placeholder="שם בעל האירוע"
    value={eventName}
    onChangeText={(text) => setEventName(text)}
  />

  {/* שדה עבור שם בעל האירוע השני */}
  {selectedCategory === 'חתונה' && (
    <TextInput
      style={styles.input}
      placeholder="שם בעלת האירוע"
      value={secondOwnerName}
      onChangeText={(text) => setSecondOwnerName(text)}
    />
  )}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && { backgroundColor: 'gray' }]}
          onPress={handleCreateEvent}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>המשך</Text>
        </TouchableOpacity>
      </Animated.View>


    </ImageBackground>
    

  );
};

const styles = StyleSheet.create({

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
title2: {
  fontSize: 19,
  alignSelf: 'center', // ממקם את הטקסט במרכז המיכל שלו
  marginTop: 100 
},
title1: {
  fontSize: 26,
  fontWeight: 'bold',
  alignSelf: 'center', // ממקם את הטקסט במרכז המיכל שלו
  marginTop: 70,
  color: 'rgba(108, 99, 255, 0.9)',
},

  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  input: {
    width: '90%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'rgba(108, 99, 255, 0.9)',
    textAlign: 'right',
    marginBottom: 20,
    alignSelf: 'center', // ממקם את הטקסט במרכז המיכל שלו

  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center', // ממקם את הטקסט במרכז המיכל שלו

    justifyContent: 'center',
    marginVertical: 10,
  },
  categoryButton: {
    width: 120,
    height: 85,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'gray',
    borderRadius: 10,
  },
  selectedCategoryButton: {
    borderColor: 'orange',
    borderWidth: 4,
  },
  categoryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  phoneButton: {
    marginTop: 0,
    alignSelf: 'center', // ממקם את הטקסט במרכז המיכל שלו

  },
  imageback: {
    width: 40,
    height: 40,
    marginTop: -130,
    marginRight: 300,
  },
  categoryIcon: {
  width: 40,
  height: 40,
  marginBottom: 5, // רווח בין האייקון לטקסט
},
nextButton: {
  marginTop: 0,
  backgroundColor: 'rgba(108, 99, 255, 0.9)',
  padding: 10,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  width: 250,
  height: 40,
  elevation: 5,
  alignSelf: 'center',

},

});
export default Home;
