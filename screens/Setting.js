import React, { useEffect,useState } from 'react';
import { View, TextInput,ScrollView, StatusBar,TouchableOpacity,Image,Text,Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';


function Setting(props) {
  const navigation = useNavigation();
  const [displayText, setDisplayText] = useState('Hello!');



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

  useEffect(() => {

    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {

      if (authUser) {
        console.log("the user is logged in:", authUser.email);
        setUser(authUser);
        setLoggedIn(true);
        setDisplayText(authUser.email);

      } else {
        console.log("the user is not logged in");
        setUser(null);
        setLoggedIn(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleRegister = () => {
    // Add your registration logic here (e.g., sending data to a server).
    // You can use the data entered in the TextInput fields.
  };
  const handlePress = (screen) => {
    // Implement navigation logic based on the pressed button
    console.log(`Navigating to ${screen}`);
  };


  const handleSignOut = () => {
    // Display an alert to confirm the sign-out
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
            // Perform sign-out logic (clear tokens, remove data from storage, etc.)
            // ...

            // Call the signOut function from the authentication context
            try {
              await firebase.auth().signOut();
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
              <Text style={[styles.title,{marginTop: 10}]}>my account</Text>

              <View style={styles.toolbar_bag}>
              <TouchableOpacity onPress={handlePress} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:20 }]}>
                  <Image source={ require('../assets/rec.png')}  style={[styles.img,{width: 100,height: 100,}]}/>
                  <Text style={{ marginTop: -60,marginHorizontal: 25 }}>{displayText}</Text>

              </TouchableOpacity>             



              <TouchableOpacity onPress={handlePress} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:80 }]}>
                  <Text style={styles.text}>change password</Text>
              </TouchableOpacity>   

              <TouchableOpacity onPress={handlePress} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:20 }]}>
                  <Text style={styles.text}>Addres book</Text>
              </TouchableOpacity>   

              <TouchableOpacity onPress={handlePress} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:20 }]}>
                  <Text style={styles.text}>need help?</Text>
              </TouchableOpacity>   

              <TouchableOpacity onPress={handlePress} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:20 }]}>
                  <Text style={styles.text}>rate this app</Text>
              </TouchableOpacity>  

              <TouchableOpacity onPress={handleSignOut} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:20 }]}>
                  <Text style={styles.text}>Sign out</Text>
              </TouchableOpacity>  

              <TouchableOpacity onPress={() => props.navigation.navigate('Manager')} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:70 }]}>
                  <Text style={styles.text}>Manager</Text>
              </TouchableOpacity>  

              <TouchableOpacity onPress={() => props.navigation.navigate('Main')} style={[styles.toolbar_down, { marginHorizontal: 0,marginTop:20 }]}>
                  <Text style={styles.text}>back</Text>
              </TouchableOpacity>   





              </View>



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

export default Setting;
