//import * as React from 'react';
import React, { useEffect,useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button,TextInput, TouchableOpacity, ImageBackground, StyleSheet, StatusBar,ScrollView ,Image} from 'react-native';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';


function Main(props) {
  //console.log(props);

    const [isLoggedIn, setLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const Tab = createBottomTabNavigator();


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
        } else {
          console.log("the user is not logged in");
          setUser(null);
          setLoggedIn(false);
        }
      });
  
      return () => unsubscribeAuth();
    }, []);

    const onPressLogin = () => {
        // כאן תוכל להוסיף לוגיקה להתחברות
            

      };

      const setting_button = () => {
        // כאן תוכל להוסיף לוגיקה להתחברות
            

      };

    return (

            <ScrollView contentContainerStyle={styles.scrollViewContainer}>
    
            <View style={styles.innerContainer}>
              <StatusBar backgroundColor="#000" barStyle="light-content" />

              <View style={styles.toolbar_bag}>
        

              <TouchableOpacity onPress={setting_button} style={[styles.toolbar_down, { marginHorizontal: 327 ,marginTop:55}]}>
                  <Image source={ require('../assets/search.png')}  style={[styles.img,{width: 35,height: 35,}]}/>
              </TouchableOpacity>             

              <TouchableOpacity onPress={() => props.navigation.navigate('Setting')} style={[styles.toolbar_down, { marginHorizontal: 287,marginTop:-55 }]}>
                  <Image source={ require('../assets/user.png')}  style={[styles.img,{width: 30,height: 30,}]}/>
              </TouchableOpacity>             

           
              </View>


              <Text style={styles.title}>סמי שמעון</Text>

              
              {!isLoggedIn && (
              <Text style={styles.title_2}>שלום אורח, ברוך הבא!</Text>
              )}
    
              {!isLoggedIn && (
               <TouchableOpacity onPress={() => props.navigation.navigate('Login')} style={styles.loginBtn}>
                <Text style={styles.loginText}>לחץ להתחברות או הרשמה</Text>
              </TouchableOpacity>
              )}

    
              <Text style={[styles.toolbar_down, { marginTop:550 }]}></Text>
    
               <View style={{ flexDirection: 'row',}}>
                <TouchableOpacity onPress={onPressLogin} style={[styles.toolbar_down, { marginHorizontal: 10 }]}>
                  <Image source={ require('../assets/icons8-facebook-48.png')}  style={[styles.img,{width: 40,height: 40,}]}/>
                </TouchableOpacity>
    
                <TouchableOpacity onPress={onPressLogin} style={[styles.toolbar_down, { marginHorizontal: 10 }]}>
                <Image source={ require('../assets/icons8-instagram-48.png')}  style={[styles.img,{width: 40,height: 40,}]}/>
                </TouchableOpacity>
    
                <TouchableOpacity onPress={onPressLogin} style={[styles.toolbar_down, { marginHorizontal: 10 }]}>
                <Image source={ require('../assets/icons8-tiktok-48.png')}  style={[styles.img,{width: 40,height: 40,}]}/>
                </TouchableOpacity>
    
                <TouchableOpacity onPress={onPressLogin} style={[styles.toolbar_down, { marginHorizontal: 10 }]}>
                <Image source={ require('../assets/icons8-whatsapp-48.png')}  style={[styles.img,{width: 40,height: 40,}]}/>
                </TouchableOpacity>
    
    
              </View>
     
              
              <Text style={styles.title_toolbar_yovel}> יובל ליאור פיתח אפליקציות | ylgroup</Text>
    
    
    
              </View>       
            </ScrollView>
    
           // </ImageBackground>
      );
    };
    
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      },
      toolbar_bag: {
        position: 'absolute',
        left: 5,
        top: -50,
        zIndex: 1, // To ensure the button is on top of other elements
      },
      innerContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: StatusBar.currentHeight || 40, // הרווח מתחת לסטטוס בר
      },
      title: {
        fontSize: 40,
        marginTop:4,
        color: 'black',
        marginBottom: 10, // email password log in is down
      },
    
      title_2: {
        fontSize: 15,
        color: 'black',
        marginBottom: 10, // email password log in is down
      },
    
     
      inputView: {
        width: '80%',
        backgroundColor: '#3AB4BA',
        borderRadius: 25,
        height: 50,
        marginBottom: 20,
        justifyContent: 'center',
        padding: 20,
      },
      
      loginBtn: {
        width: 180,
        backgroundColor: '#000',
        borderRadius: 25,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        marginBottom: 10,
      },
      loginText: {
        color: 'white',
      },
      catgory_1_btn: {
        width: 350,
        backgroundColor: '#000',
        borderRadius: 25,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        marginBottom: 10,
      },
    
      catgory_2_btn: {
        width: 350,
        backgroundColor: '#000',
        borderRadius: 25,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        marginBottom: 10,
      },
    
      catgory_3_btn: {
        width: 350,
        backgroundColor: '#000',
        borderRadius: 25,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        marginBottom: 10,
      },
    
      catgory_4_btn: {
        width: 350,
        backgroundColor: '#000',
        borderRadius: 25,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        marginBottom: 80,
      },
    
      title_toolbar_down: {
        fontSize: 25,
        color: 'black',
        marginBottom: -40, // email password log in is down
    
      },
      
    
      toolbar_down: {
        width: 50,
        borderRadius: 25,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
        marginBottom: 5,
      },
    
      title_toolbar_yovel: {
        fontSize: 15,
        color: 'black',
        marginBottom: 25, // email password log in is down
    
      },
    
      scrollViewContainer: {
        flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
      },
    
      
    });
    
    export default Main;