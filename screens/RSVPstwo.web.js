import React from 'react';
import { View, Text, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Dimensions } from 'react-native';

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

const RSVPstwo = (props) => {
  const insets = useSafeAreaInsets();
  const id = props.route.params.id; // Accessing the passed id
  const screenWidth = Dimensions.get('window').width;
  return (
    <ImageBackground
      source={require('../assets/Home_four2web.png')}
        style={styles.backgroundImage}    // המעטפת (כמו שהיה)
        imageStyle={styles.bgImage}    
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => props.navigation.navigate('ListItem', { id })} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>אשיורי הגעה</Text>
        </View>
        <TouchableOpacity 

        style={[styles.bottomButton, { width: screenWidth > 600 ? '30%' : '70%' }]}
        onPress={() => props.navigation.navigate('RSVPsthree', { id })}
        >
        <Text style={styles.bottomButtonText}>התחל!</Text>
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    minHeight: '100vh',
    resizeMode: 'cover',
    justifyContent: 'flex-start',
  },

  /* תוספת: סגנון לתמונה עצמה */
  bgImage: {
    /* cover שומר על מלוא הרוחב/גובה */
    resizeMode: 'cover',
    transform: [{ scale: 1.15 }],   // ↑ מגדיל ~15 %
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
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
  },
  bottomButton: {
    position: 'absolute',
    bottom: 90,
    width: '80%',
    backgroundColor: '#6c63ff',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  bottomButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default RSVPstwo;
