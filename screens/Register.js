// RegistrationScreen.js
import React, { useRef, useState } from 'react';
import { View, TextInput, Alert, StyleSheet,Image,ImageBackground,TouchableOpacity,Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { firebaseConfig } from '../config';
import { initializeApp } from 'firebase/app';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import 'firebase/database'; // Import the Realtime Database module
import { getDatabase, ref, set } from 'firebase/database';
import uuid from 'react-native-uuid';



function Register(props) {


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
  const database = getDatabase();
  //const databaseRef = ref(database, 'Users');
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordAgain, setpasswordAgain] = useState('')

  const [fullname, setfullName] = useState('')

  const auth = getAuth();

  const navigation = useNavigation()
// Get the currently authenticated user's UID
  //const user = auth.currentUser;
  //const uniqueID = uuidv4();

  //const databaseRef = ref(database, 'users/' + uniqueID);

    const showAlert = () => {
      Alert.alert('Terms of Service By using this application, you agree to be bound by the following terms of service. Please read these terms carefully before using the application. 1. Agreement 1.1. By using the application, you agree to the following terms of service in full and without reservation. 1.2. If you do not agree to these terms of service, please refrain from using the application. 2. Usage and Registration 2.1. Usage of the application is permitted only to users who are of legal age and who accept these terms of service. 2.2. Additional services in the application may require registration and submission of personal information. 3. Privacy 3.1. We are committed to maintaining the privacy of users and not disclosing personal information to third parties without prior authorization. 3.2. User privacy may be disclosed as necessary to comply with legal obligations, protect the rights of the company, or ensure public safety. 4. Liability ', "", [{ text: 'Agree' }]);
    };

  const handleRegister = () => {
    if (password !== passwordAgain) {
      alert("Passwords do not match");
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log('Registered with:', user.email);

      const database = getDatabase();
      const databaseRef = ref(database, 'users/' + user.uid);

      const userData = {
        email: user.email,
        displayName: fullname,
        // Note: Avoid storing passwords in plain text in the database
        // It's not secure, consider using a more secure authentication method
        // or hash the password before storing it
        // Example: hashedPassword: hashFunction(password),
      };

      set(databaseRef, userData)
        .then(() => {
          console.log('Data written to the database successfully');
          props.navigation.navigate('Main');
          //do here


          const database = getDatabase();
            //const databaseRef = ref(database, 'Events/' + firebase.auth().currentUser.uid + '/'+ eventName + '/');
         


        })
        .catch((error) => {
          console.error('Error writing data to the database:', error);
        });
    })
    .catch((error) => {
      // You might want to show a more user-friendly error message to the user
      alert('Registration failed. ' + error.message);
    });
};
  
  return (
    <ImageBackground 
    source={require('../assets/bacregg.png')} // Adjust the path accordingly
    style={styles.background} >

    <View style={styles.container}>

      <View style={styles.container}>




      <TextInput
        style={styles.input}
        placeholder="Full Name"
        keyboardType="email-address"
        onChangeText={text => setfullName(text)}

      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        onChangeText={text => setEmail(text)}

      />

    <TextInput
        style={styles.input}
        placeholder="Password"
        onChangeText={text => setPassword(text)}
        textContentType="password"
        secureTextEntry={true}

      />
    <TextInput
        style={styles.input}
        placeholder="password again"
        onChangeText={text => setpasswordAgain(text)}
        textContentType="password"
        secureTextEntry={true}

      />  

      <TouchableOpacity onPress={handleRegister} style={styles.phoneButton}>
          <Image source={require('../assets/buttonregister.png')}  />
        </TouchableOpacity>



        <TouchableOpacity 
         onPress={() => props.navigation.navigate('LoginEmail')}
            style={[styles.showPasswordButton, { position: 'absolute', top: '91%', left: '8%' }]}>
            <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
        </TouchableOpacity>

        <TouchableOpacity 
         onPress={showAlert}
            style={[styles.showPasswordButton, { position: 'absolute', top: '82%', left: '20%' }]}>
            <Image source={require('../assets/privacy.png')} />
        </TouchableOpacity>

    </View>

    </View>
    </ImageBackground>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: 280,
    height: 40,
    backgroundColor: 'white',
    marginTop: 15,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingLeft: 10,
  },
  backIcon: {
    width: 60,
    height: 60,

  },
  showPasswordButton: {
    marginLeft: -20,
  },
  phoneButton: {
    marginTop: 40,
  },

  phone2Button: {
    marginTop: 25,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
});

export default Register;
