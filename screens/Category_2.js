

  
  import React, { useEffect, useState } from 'react';
  import { View, ScrollView, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import { Agenda } from 'react-native-calendars';
  import firebase from 'firebase/compat/app';
  import 'firebase/compat/auth';
  import 'firebase/compat/database';
  
  const Category_2 = (props) => {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [events, setEvents] = useState({});
    const [availableHours, setAvailableHours] = useState([]);
  
    const firebaseConfig = {
      apiKey: 'AIzaSyDlfsAURNGgAD9OVsRlXS28dtv28eiLASs',
      authDomain: 'yaara-mallka.firebaseapp.com',
      projectId: 'yaara-mallka',
      storageBucket: 'yaara-mallka.appspot.com',
      messagingSenderId: '665221289464',
      appId: '1:665221289464:web:d2f8a91d9cded3265e320d',
      measurementId: 'G-WS6M5TLZWD',
    };
  
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  
    useEffect(() => {
      const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
        if (authUser) {
          console.log('the user is logged in:', authUser.email);
          setUser(authUser);
          setLoggedIn(true);
        } else {
          console.log('the user is not logged in');
          setUser(null);
          setLoggedIn(false);
        }
      });
  
      const fetchEvents = async () => {
        try {
          const snapshot = await firebase.database().ref('events').once('value');
          const data = snapshot.val();
  
          if (data) {
            setEvents(data);
          }
        } catch (error) {
          console.error('Error fetching events:', error.message);
        }
      };
  
      fetchEvents();
      generateAvailableHours();
  
      return () => {
        unsubscribeAuth();
      };
    }, []);
  
    const generateAvailableHours = () => {
      const hours = [];
      for (let i = 10; i <= 22; i++) {
        const hour = i < 10 ? `0${i}:00` : `${i}:00`;
        hours.push(hour);
      }
      setAvailableHours(hours);
    };
  
    const renderEvent = (hour) => {
      const event = events[hour];
      return (
        <TouchableOpacity
          style={styles.eventContainer}
          onPress={() => handleEventPress(hour, event)}
        >
          <Text style={styles.eventText}>{event || 'Available'}</Text>
        </TouchableOpacity>
      );
    };
  
    const handleEventPress = (hour, event) => {
      if (event) {
        Alert.alert('Event Clicked', `You clicked on: ${event}`);
      } else {
        // Implement logic to add a new event for the selected hour
        // For example, you can show a modal or navigate to another screen for event creation
        console.log(`Add event for ${hour}`);
      }
    };
  
    const items = availableHours.reduce((acc, hour) => {
      acc[`2024-01-10T${hour}:00:00.000Z`] = { text: events[hour] || 'Available' };
      return acc;
    }, {});
  
    return (
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.innerContainer}>
          <Agenda
            items={items}
            renderItem={(item) => renderEvent(item.text)}
            renderEmptyDate={() => <View style={styles.emptyDate} />}
            theme={{
              backgroundColor: '#f5f5f5',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#000000',
              selectedDayBackgroundColor: '#2f95dc',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2f95dc',
              dayTextColor: '#000000',
              textDisabledColor: '#d9e1e8',
              dotColor: '#2f95dc',
              selectedDotColor: '#ffffff',
              arrowColor: '#2f95dc',
              monthTextColor: '#2f95dc',
              agendaKnobColor: '#2f95dc',
            }}
          />
        </View>
      </ScrollView>
    );
  };
  
  const styles = StyleSheet.create({
    scrollViewContainer: {
      flexGrow: 1,
    },
    innerContainer: {
      flex: 1,
      marginTop: 40,
    },
    eventContainer: {
      backgroundColor: '#e6e6e6',
      borderRadius: 5,
      padding: 10,
      marginBottom: 10,
    },
    eventText: {
      fontSize: 16,
      color: '#333333',
    },
    emptyDate: {
      height: 15,
      flex: 1,
      paddingTop: 30,
    },
  });
  
  export default Category_2;
  