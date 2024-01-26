import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Agenda } from 'react-native-calendars';
import Modal from 'react-native-modal';
import 'firebase/compat/database';
import 'firebase/compat/auth';
import { ref, get } from 'firebase/database';


function Category_1(props) {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dates, setDates] = useState(generateDates(currentMonth));
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const database = firebase.database();
  const currentUser = firebase.auth().currentUser;
  const [display_name, setdisplay_name] = useState('');
  const [selectedHours, setSelectedHours] = useState([]);
  const [fetchedHours, setFetchedHours] = useState([]);

  const firebaseConfig = {
    apiKey: "AIzaSyDlfsAURNGgAD9OVsRlXS28dtv28eiLASs",
    authDomain: "yaara-mallka.firebaseapp.com",
    //authDomain: "YaaraMallka",
    projectId: "yaara-mallka",
    storageBucket: "yaara-mallka.appspot.com",
    messagingSenderId: "665221289464",
    appId: "1:665221289464:web:d2f8a91d9cded3265e320d",
    measurementId: "G-WS6M5TLZWD"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  useEffect(() => {
    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
      setDates(generateDates(currentMonth));

      if (authUser) {
        console.log('the user is logged in:', authUser.email);
        setUser(authUser);
        setLoggedIn(true);
        setDisplayText(authUser.email);
      } else {
        console.log('the user is not logged in');
        setUser(null);
        setLoggedIn(false);
      }
    });
    const databaseRef = firebase.database().ref(`orders/${currentUser.uid}`);
    get(databaseRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const existingHours = Object.values(snapshot.val()).map((entry) => entry.hour);
          setFetchedHours(existingHours);
        }
      })
      .catch((error) => {
        console.error('Error fetching existing hours:', error);
      });


    return () => unsubscribeAuth();
}, [currentUser, currentMonth]);

  function generateDates(month) {
    const startDate = new Date(month);
    startDate.setDate(1); // Set to the first day of the month

    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1); // Set to the first day of the next month

    const dateList = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      dateList.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateList;
  }

  const renderHourItem = ({ item }) => (
    <TouchableOpacity style={styles.hourButton} onPress={() => handleHourPress(item)}>
      <Text style={styles.hourButtonText}>{item.getHours()}:00</Text>
    </TouchableOpacity>
  );
  
  const renderItem = ({ item }) => {
    const isSelected = selectedDate && selectedDate.getTime() === item.getTime();
    const dayName = getDayName(item.getDay());
  
    return (
      <View style={styles.dateContainer}>
        <TouchableOpacity
          style={[styles.dateItem, isSelected && styles.selectedDateItem]}
          onPress={() => handleDatePress(item)}
        >
          <Text style={isSelected ? styles.selectedDateText : styles.dateText}>
            {item.getDate()}
          </Text>
          <Text style={styles.dayName}>{dayName}</Text>
        </TouchableOpacity>
        {isSelected && (
          <ScrollView contentContainerStyle={styles.scrollViewContainer}>
            <View style={styles.hourContainer}>
              {generateHours().map((hour) => (
                <TouchableOpacity
                  key={hour.toString()}
                  style={styles.hourButton}
                  onPress={() => handleHourPress(hour)}
                >
                <Text style={styles.hourButtonText}>{hour.time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };
  

  const getDayName = (dayIndex)  => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return daysOfWeek[dayIndex];
  };
  
  // Add or update the styles accordingly...
  
 
  const generateHours = () => {
    const hours = [];
    const endHour = 18;
  
    // If it's Sunday or Thursday, start from 12:00
    let startHour = (selectedDate.getDay() === 0 || selectedDate.getDay() === 4) ? 12 : 10;
  
    for (let i = startHour; i <= endHour; i++) {
      for (let j = 0; j < 4; j++) {
        const minute = j * 15;
        const formattedHour = `${i < 10 ? '0' : ''}${i}:${minute === 0 ? '00' : minute}`;
        hours.push({ time: formattedHour });
      }
    }
    const availableHours = hours.filter(
      (hour) => !selectedHours.includes(hour.time) && !fetchedHours.includes(hour.time)
    );
    return availableHours;
  };
  
  const handleHourPress = (hour) => {
    setSelectedHours((prevSelectedHours) => [...prevSelectedHours, hour.time]);

    const formattedDate = selectedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  

    // Get the currently logged-in user
    try {
    const databaseRef = ref(database, `users/${currentUser.uid}`);
    // Use the 'get' method to retrieve data once
    get(databaseRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const displayName = userData.displayName || 'User'; // Default to 'User' if displayName is not available
          setdisplay_name(displayName);

          // Now you can use the user data in your React component state or wherever needed
        } else {
          console.log('User not found');
        }
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle the error appropriately, e.g., show an error message to the user
    }

    // Construct the data you want to save
    
      
     
    if (currentUser) {
      // Reference to the database node where you want to store the user's data
      const userRef = firebase.database().ref(`orders/${currentUser.uid}`);
      const userId = currentUser.uid;

      // Push the data to the user's node in the database
  
      // Show the alert
      Alert.alert(
        'Selected Date and Hour',
        `Date: ${formattedDate}\nHour: ${hour.time}`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('OK Pressed');
              const dataToSave = {
                date: formattedDate,
                hour: hour.time,
                email: currentUser.email,
                phone: currentUser.phoneNumber,
                displayName: display_name,
              };
    
              userRef
                .push(dataToSave)
                .then(() => {
                  console.log('Data pushed to the database successfully');
                  // The hour is now selected, and it will be removed from the UI
                })
                .catch((error) => {
                  console.error('Error pushing data to the database:', error);
                });
            },
          },
          // ...
        ]
      );
    }
    else
    {
      Alert.alert(
        'Simple Alert',
        'This is a simple alert message.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => props.navigation.navigate('Register'),
          },
        ]
      );
    }
   
  };
  
  
  const handleAddButtonClick = (date) => {
    // Add your logic to handle the button click for the selected date
    setIsModalVisible(true);
  };
  const handleDatePress = (date) => {
    setSelectedDate(date);
    setIsModalVisible(true);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleSaveEvent = () => {
    // Add your logic to save the event
    setIsModalVisible(false);
    // Reset input fields
    setEventName('');
    setEventTime('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => props.navigation.navigate('Main')}
        style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 50 }]}
      >
        <Text style={styles.text}>back</Text>
      </TouchableOpacity>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <Text style={[styles.title, { marginTop: 0 }]}>my category 1</Text>
      <Text style={[styles.title2, { marginTop: 0 }]}>
        המידע אינו זמין כעת המידע אינו זמין כעת המידע אינו זמין כעת המידע אינו זמין כעת
        המידע אינו זמין כעת המידע אינו זמין כעת המידע אינו זמין כעת
      </Text>
      <Text style={[styles.title2, { marginTop: 0 }]}>
        המידע אינו זמין כעת המידע אינו זמין כעת המידע אינו זמין כעת המידע אינו זמין כעת
        המידע אינו זמין כעת המידע אינו זמין כעת המידע אינו זמין כעת
      </Text>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePrevMonth}>
            <Text style={styles.navigationText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long' })}
          </Text>
          <Text style={styles.yearText}>{currentMonth.getFullYear()}</Text>
          <TouchableOpacity onPress={handleNextMonth}>
            <Text style={styles.navigationText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={dates}
          renderItem={renderItem}
          keyExtractor={(item) => item.toISOString()}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  title2: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  hourButton: {
    backgroundColor: 'black',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    margin: 4,
  },
  hourButtonText: {
    color: 'white',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 14, // Adjust the font size as needed
    fontWeight: 'bold', // You can change or remove this line based on your preference
    color: 'black', // You can set the color as per your design
  },
  navigationText: {
    fontSize: 20,
    color: 'black',
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  yearText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  item: {
    backgroundColor: 'white',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'lightgray',
  },
  scrollViewContainer: {
    flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
  },
  addButton: {
    backgroundColor: 'black',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
  },
  dateContainer: {
    marginBottom: 16,
  },
  hourItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourText: {
    fontSize: 16,
    color: 'gray',
  },
  
  dateItem: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'lightgray',
    margin: 4,
  },
  selectedDateItem: {
    backgroundColor: 'lightgray',
  },
  dateText: {
    fontSize: 18,
    color: 'black',
  },
  selectedDateText: {
    fontSize: 18,
    color: 'black',   
     fontWeight: 'bold',

  },
  hourContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  hourScrollView: {
    marginVertical: 10,
  },
  hourButton: {
    backgroundColor: 'black',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  hourButtonText: {
    color: 'white',
    fontSize: 16,
  },
  input: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingLeft: 10,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'lightgray',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default Category_1;
