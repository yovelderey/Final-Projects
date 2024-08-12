import React, { useEffect, useState } from 'react';
import { View, TextInput, ScrollView, StatusBar, TouchableOpacity, Image, Text, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Initialize Firebase only if it's not already initialized
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

function Setting(props) {
  const navigation = useNavigation();
  const [displayText, setDisplayText] = useState('Hello!');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        console.log("The user is logged in:", authUser.email);
        setDisplayText(authUser.email);
      } else {
        console.log("The user is not logged in");
        setDisplayText('Not logged in');
      }
    });

    return () => unsubscribeAuth();
  }, []);



  const handleSignOut = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await firebase.auth().signOut();
              props.navigation.navigate('Main');
            } catch (e) {
              console.log(e);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <View style={styles.innerContainer}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <Text style={[styles.title, { marginTop: 10 }]}>My Account</Text>

        <View style={styles.toolbar_bag}>
          <TouchableOpacity  style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Image source={require('../assets/rec.png')} style={[styles.img, { width: 100, height: 100 }]} />
            <Text style={{ marginTop: -60, marginHorizontal: 25 }}>{displayText}</Text>
          </TouchableOpacity>





          <TouchableOpacity onPress={() => navigation.navigate('AddressBookScreen')} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>Address Book</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('HelpScreen')} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>Need Help?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('RateAppScreen')} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>Rate This App</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignOut} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Manager')} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 70 }]}>
            <Text style={styles.text}>Manager</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
            <Text style={styles.text}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: StatusBar.currentHeight || 40,
  },
  title: {
    fontSize: 20,
    color: 'black',
    marginBottom: 0,
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
  toolbar_bag: {
    // Add styles for toolbar_bag if necessary
  },
  toolbar_down: {
    // Add styles for toolbar_down if necessary
  },
  text: {
    // Add styles for text if necessary
  },
  img: {
    // Add styles for img if necessary
  },
});

export default Setting;
