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
      apiKey: "AIzaSyDlfsAURNGgAD9OVsRlXS28dtv28eiLASs",
      authDomain: "yaara-mallka.firebaseapp.com",
      //authDomain: "YaaraMallka",
      projectId: "yaara-mallka",
      storageBucket: "yaara-mallka.appspot.com",
      messagingSenderId: "665221289464",
      appId: "1:665221289464:web:d2f8a91d9cded3265e320d",
      measurementId: "G-WS6M5TLZWD"
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


              <Text style={styles.title}>Tahel Store</Text>

              
              {!isLoggedIn && (
              <Text style={styles.title_2}>שלום אורח, ברוך הבא!</Text>
              )}
    
              {!isLoggedIn && (
               <TouchableOpacity onPress={() => props.navigation.navigate('Login')} style={styles.loginBtn}>
                <Text style={styles.loginText}>לחץ להתחברות או הרשמה</Text>
              </TouchableOpacity>
              )}
            
              <TouchableOpacity onPress={() => props.navigation.navigate('Category_1')} style={styles.catgory_1_btn}>
                <Text style={styles.loginText}>קטגוריה 1</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => props.navigation.navigate('Category_2')} style={styles.catgory_2_btn}>
                <Text style={styles.loginText}>קטגוריה 2</Text>
              </TouchableOpacity>
    
              <TouchableOpacity onPress={() => props.navigation.navigate('Category_3')} style={styles.catgory_3_btn}>
                <Text style={styles.loginText}>קטגוריה 3</Text>
              </TouchableOpacity>
    
              <TouchableOpacity onPress={() => props.navigation.navigate('Category_4')} style={styles.catgory_4_btn}>
                <Text style={styles.loginText}>קטגוריה 4</Text>
              </TouchableOpacity>
    
              <Text style={styles.title_toolbar_down}>עקבו אחרי</Text>
    
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
     
              
              <Text style={styles.title_toolbar_yovel}> יובל פיתח אפליקציות | ydgroup</Text>
    
    
    
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