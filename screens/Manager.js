import React, { useEffect,useState } from 'react';
import { View,TextInput ,Alert,ScrollView, StatusBar,TouchableOpacity,Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

function Manager(props) {
  const [email, setEmail] = useState('');


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

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    try {
      await firebase.auth().sendPasswordResetEmail(email);
      Alert.alert('Success', 'Password reset email sent.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send password reset email.');
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
                <View style={styles.innerContainer}>

              <StatusBar backgroundColor="#000" barStyle="light-content" />
              <Text style={[styles.title,{marginTop: 10}]}>Manager</Text>

              <View style={styles.toolbar_bag}>
                       
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => setEmail(text)}
              />
              <TouchableOpacity onPress={handlePasswordReset} style={[styles.toolbar_down, { marginHorizontal: 0, marginTop: 20 }]}>
                <Text style={styles.text}>Reset Password</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => props.navigation.navigate('Setting')} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:20 }]}>
                  <Text style={styles.text}>back</Text>
              </TouchableOpacity>   

              </View>
              </View>       

              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          </View>

        
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContainer: {
    flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
  },
  innerContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: StatusBar.currentHeight || 40, // הרווח מתחת לסטטוס בר
      },
      title: {
        fontSize: 20,
        color: 'black',
        marginBottom: 0, // email password log in is down
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
});

export default Manager;
