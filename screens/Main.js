//import * as React from 'react';
import React, { useEffect,useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button,Dimensions, TouchableOpacity, Alert, StyleSheet, StatusBar,ScrollView ,Image} from 'react-native';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getDatabase, ref, remove,get } from 'firebase/database';
import 'firebase/database'; // Import the Realtime Database module
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';


function Main(props) {


    const [isLoggedIn, setLoggedIn] = useState(false);
    const [isCreate, setisCreate] = useState(false);
    const [user, setUser] = useState(null);
    const Tab = createBottomTabNavigator();
    const [events, setEvents] = useState([]);
    const [eventName, setEventName] = useState('');
    const [data, setData] = useState([]);
    const [showDialog, setShowDialog] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const navigation = useNavigation();
    const { width } = Dimensions.get('window');


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


  const handlePressHome = async (id) => {
  
    //console.log('Navigate to home screen',id);
    props.navigation.navigate('ListItem', { id });
  };

  const handlePressRefresh = () => {
    props.navigation.navigate('Home');
    //fetchData(); // Refresh data
  };
  const showAlert = (idToDelete) => {
    Alert.alert(
      'Delete',
      'Are you sure you want to delete??',
      [
        { text: 'Delete', onPress: () => deletAlert(idToDelete) },
        { text: 'Cancel', onPress: () => console.log('cacnel') }
      ]
    );
  };


  useEffect(() => {


    const fetchData = async () => {
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const database = getDatabase();
                const databaseRef = ref(database, 'Events/' + user.uid + '/');
                const snapshot = await get(databaseRef);
                const fetchedData = snapshot.val();
                if (fetchedData) {
                    const dataArray = Object.keys(fetchedData).map(key => ({ id: key, ...fetchedData[key] }));
                    setData(dataArray);
                }
            } else {
                console.log('No user is currently authenticated.');
            }
        } catch (error) {
            console.log('Error fetching data:', error);
        }
    };

    fetchData();

    const unsubscribe2 = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    const unsubscribe = props.navigation.addListener('focus', () => {
        fetchData();
        
    });
 
    const unsubscribeAuth = firebase.auth().onAuthStateChanged((authUser) => {
        if (authUser) {
            console.log("The user is logged in:", authUser.email);
            setUser(authUser);
            setLoggedIn(true);
            setisCreate(false);
        } else {
            console.log("The user is not logged in");
            setUser(null);
            setLoggedIn(false);
            setisCreate(true);
        }
    });

    return () => {
        unsubscribe2();
        unsubscribe();
        unsubscribeAuth();
        
    };
}, [props.navigation, isConnected]);

  
  const handleDeleteData = async (idToDelete) => {
    const user = firebase.auth().currentUser;
    if (user) {
        showAlert(idToDelete);
    } else {
        console.error('No user is currently authenticated.');
    }
};

  
  const deletAlert = async (idToDelete) => {
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            const database = getDatabase();
            const databaseRef = ref(database, 'Events/' + user.uid + '/' + idToDelete);
            await remove(databaseRef);
            console.log('Event deleted successfully');
            setData(data.filter(event => event.id !== idToDelete));
        } else {
            console.error('No user is currently authenticated.');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
    }
};

  


    const onPressLogin = () => {
        // כאן תוכל להוסיף לוגיקה להתחברות
      };

      const setting_button = () => {
        // כאן תוכל להוסיף לוגיקה להתחברות
      };

      if (!isConnected) {
        return (
          <View style={styles.container}>
            <Text style={styles.errorText}>בעיית אינטרנט</Text>
            <Text style={styles.errorSubText}>נא בדוק חיבור לרשת ה - wifi או בדוק עם ספק התקשורת שלך, תודה רבה.</Text>
            <TouchableOpacity style={styles.button} onPress={() => {
              // נסה לטעון מחדש את האפליקציה
              navigation.replace('Main');
            }}>
              <Text style={styles.buttonText}>טען מחדש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => {
              // סגור את האפליקציה
              Alert.alert(
                "יציאה",
                "האם אתה בטוח שברצונך לצאת מהאפליקציה?",
                [
                  {
                    text: "ביטול",
                    style: "cancel"
                  },
                  {
                    text: "יציאה", 
                    onPress: () => {
                      // יציאה מהאפליקציה (פועל רק על אנדרואיד)
                      BackHandler.exitApp();
                    }
                  }
                ]
              );
            }}>
              <Text style={styles.buttonText}>יציאה</Text>
            </TouchableOpacity>
          </View>
        );
      }

    return (


              
            <View style={styles.innerContainer}>
              <StatusBar backgroundColor="#000" barStyle="light-content" />
              <View style={styles.toolbar_bag}>          
              {!isCreate && (

              <TouchableOpacity onPress={() => props.navigation.navigate('Setting')} style={[styles.toolbar_down, { marginHorizontal: 319,marginTop:70 }]}>
                  <Image source={ require('../assets/user.png')}  style={[styles.img,{width: 30,height: 30,}]}/>
              </TouchableOpacity>             
              )}
             </View>

              {!isLoggedIn && (
                <Image
                  source={require('../assets/VIDEOLOADING.gif')} // נתיב ל-GIF שלך
                  style={{
                    width: width * 1,  // 60% מרוחב המסך
                    height: (width * 1) * (350 / 440),
                    marginTop: -30  // לשמור על היחס המקורי של התמונה
                  }}                 />
              )}

              {!isLoggedIn && (
                <Image 
                  source={require('../assets/eastvent_text1.png')} 
                  style={{
                    width: width * 0.8333,  // 60% מרוחב המסך
                    height: (width * 0.5) * (350 / 440),
                    marginTop: 80  // לשמור על היחס המקורי של התמונה
                  }} 
                />
              )}
    
              {!isLoggedIn && (
               <TouchableOpacity onPress={() => props.navigation.navigate('LoginEmail')} style={styles.loginBtn}>
                <Image source={ require('../assets/easyvent_login_botton.png')}  style={[styles.img,{width: 340,height: 50,}]}/>

              </TouchableOpacity>
              )}
              {!isLoggedIn && (
                <Text style={styles.footerText}>כל הזכויות שמורות לליאור ויובל ©</Text>
       
              )}

              {!isCreate && (
               <TouchableOpacity onPress={handlePressRefresh} style={styles.loginBtn}>
                <Text style={styles.loginText}>צור אירוע חדש</Text>
              </TouchableOpacity>          
              )}


              {!isCreate && (
              <View style={styles.container}>
                  <Text style={[styles.titleEvent, { marginTop: 15 }]}>- My Events -</Text>

                  {data.length === 0 ? (
                    <Text>You have no events</Text>
                  ) : (
                    data.map(event => (
                      <TouchableOpacity key={event.id} onPress={() => handlePressHome(event.id)} style={styles.eventContainer}>
                        <Text style={styles.eventTitle}>{event.id}</Text>

                        <TouchableOpacity onPress={() => handleDeleteData(event.id)} style={styles.deleteButton}>
                          <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>

                      </TouchableOpacity>
                    ))
                  )}

                </View>
                )}
              <Text style={[styles.toolbar_down, { marginTop:550 }]}></Text>
        
              </View>   
          
            
    
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
        backgroundColor: 'white', // רקע לבן
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

        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        marginBottom: 0,
      },
      loginText: {
        color: 'white',
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
        marginBottom: 0,
      },
      img2: {

        marginTop: 0,
        marginBottom: 0,
      },
    
      title_toolbar_yovel: {
        fontSize: 15,
        color: 'black',
        marginBottom: 25, // email password log in is down
    
      },
    
      scrollViewContainer: {
        flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
      },
    
      title: {
        fontSize: 55,
        fontWeight: 'bold',
        marginBottom: 20,
      },
      titleEvent: {
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 25,
      },
      eventContainer: {
        marginBottom: 20,
        width: 350,
        height: 65,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: '#f0f0f0',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      eventTitle: {
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 5,
        backgroundColor: '#f0f0f0',

      },
      eventDate: {
        fontSize: 16,
        marginBottom: 5,
      },
      eventDescription: {
        fontSize: 16,
      },

      background: {
        flex: 1,
        resizeMode: 'cover', // or 'stretch' or 'contain'
        justifyContent: 'center',
      },
      deleteButton: {
        position: 'absolute',
        top: 15,
        right: 10,
        backgroundColor: 'red',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 10,
      },
      deleteText: {
        color: 'white',
        fontWeight: 'bold',
      },
      errorText: {
        fontSize: 24,
        color: 'red',
        fontWeight: 'bold',
        textAlign: 'center',
      },
      errorSubText: {
        fontSize: 18,
        color: 'black',
        textAlign: 'center',
        marginVertical: 10,
      },
      button: {
        marginTop: 20,
        padding: 15,
        backgroundColor: 'black',
        borderRadius: 5,
        width: '80%',
        alignItems: 'center',
      },
      buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
      },
      footerText: {
        position: 'absolute',
        bottom: 20, // מרחק מהתחתית
        fontSize: 13,
        color: 'gray',
        marginTop: 150  // לשמור על היחס המקורי של התמונה

      },
    });
    export default Main;





