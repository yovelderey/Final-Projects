//import * as React from 'react';
import React, { useEffect,useState ,useRef} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ImageBackground,Dimensions,Animated, TouchableOpacity, Alert, StyleSheet, StatusBar,ScrollView ,Image} from 'react-native';
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getDatabase, ref, remove,get } from 'firebase/database';
import 'firebase/database'; // Import the Realtime Database module
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';

const { width, height } = Dimensions.get('window');


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
    const slideAnim = useRef(new Animated.Value(-500)).current; // מתחיל מחוץ למסך למעלה


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

  const handleEditHome = async (id) => {
  
    //console.log('Navigate to home screen',id);
    props.navigation.navigate('EditHome', { id });
  };

  const handlePressRefresh = () => {
    props.navigation.navigate('Home');
    //fetchData(); // Refresh data
  };





  


  const showAlert = (idToDelete) => {
    Alert.alert(
      'מחק אירוע', // כותרת ההתראה
      'האם אתה בטוח שברצונך למחוק אירוע זה?', // הודעת התראה
      [
        {
          text: 'מחק', // כפתור מחיקה
          onPress: () => deleteAlert(idToDelete), // פונקציה שמבצעת את המחיקה
          style: 'destructive', // עיצוב אדום ובולט למחיקה
        },
        {
          text: 'ערוך', // כפתור מחיקה
          onPress: () => handleEditHome(idToDelete), // פונקציה שמבצעת את המחיקה
          style: 'cancel', // עיצוב אדום ובולט למחיקה
        },
        {
          text: 'ביטול', // כפתור ביטול
          onPress: () => console.log('cancel'), // פעולה במקרה של ביטול
          style: 'cancel', // עיצוב סטנדרטי לביטול
        },
      ],
      { cancelable: true } // מאפשר ביטול בלחיצה מחוץ להתראה
    );
  };
  
const deleteImage = async (folderPath) => {
  try {
    const storage = getStorage();
    const folderRef = storageRef(storage, folderPath);

    // שליפת כל הקבצים והתיקיות בתיקייה
    const result = await listAll(folderRef);

    // מחיקת כל הקבצים
    for (const file of result.items) {
      await deleteObject(file);
      console.log(`נמחק קובץ: ${file.name}`);
    }

    // מחיקת כל תתי התיקיות (רק אם קיימות)
    for (const subFolder of result.prefixes) {
      await deleteImage(subFolder.fullPath);
    }

    console.log(`כל התוכן בתיקייה ${folderPath} נמחק בהצלחה.`);
  } catch (error) {
    console.error('שגיאה במחיקת תיקייה:', error);
  }
};



  const deleteAlert = async (idToDelete) => {
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            const database = getDatabase();
            const databaseRef = ref(database, 'Events/' + user.uid + '/' + idToDelete);
            await remove(databaseRef);
            deleteImage(`users/${user.uid}/${idToDelete}/`);
            console.log('Event deleted successfully');
            setData(data.filter(event => event.id !== idToDelete));
        } else {
            console.error('No user is currently authenticated.');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
    }
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

useEffect(() => {
  if (!isCreate) { // רק כשהמסך באמת מוצג
    Animated.timing(slideAnim, {
      toValue: 0, // להגיע למיקום הסופי
      duration: 1500, // זמן התנועה (אפשר לשנות)
      delay: 500, // השהייה קלה לפני תחילת האנימציה
      useNativeDriver: true,
    }).start();
  }
}, [isCreate]); // עכשיו זה יפעל רק אחרי שהמסך נטען

  const handleDeleteData = async (idToDelete) => {
    const user = firebase.auth().currentUser;
    if (user) {
        showAlert(idToDelete);
    } else {
        console.error('No user is currently authenticated.');
    }
};



      if (!isConnected) {
        return (
          <View style={styles.container}>
            <Text style={styles.errorText}>בעיית אינטרנט</Text>
            <Text style={styles.errorSubText}>
              נא בדוק חיבור לרשת ה - wifi או בדוק עם ספק התקשורת שלך, תודה רבה.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                // נסה לטעון מחדש את האפליקציה
                navigation.replace('Main');
              }}
            >
              <Text style={styles.buttonText}>טען מחדש</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                // סגור את האפליקציה
                if (Platform.OS === 'android') {
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
                        onPress: () => BackHandler.exitApp()
                      }
                    ]
                  );
                } else {
                  Alert.alert(
                    "הודעה",
                    "סגור את האפליקציה ידנית במכשיר ה-iOS שלך."
                  );
                }
              }}
            >
              <Text style={styles.buttonText}>יציאה</Text>
            </TouchableOpacity>
          </View>
        );
      }
    return (


              
            <View style={styles.innerContainer}>

                  {!isCreate && (  
                    <ImageBackground
                      source={require('../assets/Socialm.gif')} // טוען את ה-GIF מהתיקייה המקומית
                      style={styles.gif}
                      imageStyle={{ opacity: 0.3 }} // בהירות של 30%
                      resizeMode="cover" // כדי שה-GIF יכסה את כל המסך
                    />               
                  )}
               {!isCreate && (  
                <Text style={styles.footerText2}>EasyVent</Text>
               )}
              <StatusBar backgroundColor="#000" barStyle="light-content" />

              <View style={styles.toolbar_bag}>  



              {!isCreate && (

              <TouchableOpacity onPress={() => props.navigation.navigate('Setting')} style={[styles.toolbar_down]}>
                  <Image source={ require('../assets/user.png')}  style={[styles.img,{width: 30,height: 30,}]}/>
              </TouchableOpacity>             
              )}

              {!isCreate && (
                
                <TouchableOpacity onPress={handlePressRefresh} style={styles.loginBtn2}>
                <Image source={require('../assets/zor_event.png')} style={styles.newevent} />
               </TouchableOpacity>          
               )}


               {!isCreate && (

              <View style={styles.container}>
                  <Text style={[styles.titleEvent, {   marginBottom: 65,  marginTop: 10, }]}>- האירועים שלי -</Text>

                  {data.length === 0 ? (
                    <Text>אין כרגע אירועים, צור אירוע חדש</Text>
                  ) : (  <View style={{ flex: 0, alignItems: 'center',height: '100%',  width: '120%', }}>
                    <Animated.View style={[styles.container2, { transform: [{ translateY: slideAnim }] }]}>

                    <View style={styles.scrollContainer}>
                      <ScrollView 
                        style={styles.scrollView} 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={true}
                      >
                        {data.map(event => (
                          <TouchableOpacity 
                            key={event.id} 
                            onPress={() => handlePressHome(event.id)} 
                            style={styles.eventContainer}
                          >
                            <Text style={styles.eventTitle}>{event.id}</Text>

                            <TouchableOpacity onPress={() => handleDeleteData(event.id)} style={styles.deleteButton}>
                              <Image source={require('../assets/edit.png')} style={styles.icon} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    </Animated.View>

                  </View>

                  )}

                </View>

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
                <Text style={styles.footerText}>כל הזכויות שמורות EasyVent©</Text>
       
              )}
              {!isCreate && (
                
                <Text style={styles.footerText}>כל הזכויות שמורות EasyVent©</Text>
        
               )}





              <Text style={[styles.toolbar_down, { marginTop:550 }]}></Text>
        
              </View>   
          
            
    
      );
    };
    
    const styles = StyleSheet.create({
      container: {
        position: 'absolute', // מאפשר מיקום קבוע
        left: width / 2, // מרכז הקונטיינר אופקית
        top: height-550, // מרכז הקונטיינר אנכית
        transform: [{ translateX: -100 }, { translateY: -50 }], // תזוזה חזרה לפי גודל הקונטיינר
        width: 200, // רוחב קבוע של הקונטיינר
        height: 100, // גובה קבוע של הקונטיינר
        alignItems: 'center', // יישור התוכן במרכז האופקי בתוך הקונטיינר
        justifyContent: 'center', // יישור התוכן במרכז האנכי בתוך הקונטיינר
      },
      container2: {
        width: 250, // רוחב קבוע של הקונטיינר
        height: 100, // גובה קבוע של הקונטיינר
        alignItems: 'center', // יישור התוכן במרכז האופקי בתוך הקונטיינר
        justifyContent: 'center', // יישור התוכן במרכז האנכי בתוך הקונטיינר
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
        marginTop: StatusBar.currentHeight || 20, // הרווח מתחת לסטטוס בר
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

        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 70,
        marginBottom: 320,
        left: 0,

      },
      loginBtn2: {
        position: 'absolute', // מיקום אבסולוטי כדי לשלוט במיקום של הכפתור
        left: width / 2 - 25, // מרכז הכפתור ביחס לרוחב המסך (50/2 = 25)
        top: height-700, // מרכז הכפתור ביחס לגובה המסך (50/2 = 25)
        width: 50, // רוחב הכפתור
        height: 50, // גובה הכפתור
        justifyContent: 'center', // יישור התוכן במרכז האנכי
        alignItems: 'center', // יישור התוכן במרכז האופקי

      },
      loginText: {
        color: 'black',
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
        marginTop: height * 0.08,  // הצמדה 8% מהחלק העליון של המסך
        marginBottom: 0,
        position: 'absolute',  // מיקום אבסולוטי
        left: width * 0.80,  // הצמדה 85% מהשמאל של המסך
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
        fontSize: 25,
        fontWeight: 'bold',
        marginBottom: 0,
      },
      eventContainer: {
        marginBottom: 20,
        width: 350,
        height: 60,
        padding: 10,
        borderRadius: 15,
        borderWidth: 1,
        backgroundColor: '#f0f0f0',
        alignItems: 'center', // ממקם את התוכן במרכז האופקי

        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 1.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      eventTitle: {
        fontSize: 30,
        marginBottom: 5,
        backgroundColor: 'rgba(240, 240, 240, 0.1)', // צבע אפור עם שקיפות של 60%

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
        color: 'black',
        marginTop: 150  // לשמור על היחס המקורי של התמונה

      },
      icon: {
        width: 25,
        height: 25,
      },
      newevent: {
        width: 210,
        height: 37,
      },
      gif: {
        width: '100%',
        height: '115%',
        marginTop: -20, // מרווח מהחלק העליון, לשמירת מראה מאוזן

      },

      footerText2: {
        position: 'absolute',
        bottom: height * 0.87, // הצמדה 10% מהחלק התחתון של המסך, להתאמה אוטומטית לגודל המסך
        fontSize: 40, // גודל גופן גדול לכותרת
        color: 'black', // צבע הטקסט שחור
        alignSelf: 'center', // יישור הטקסט במרכז האופקי
        fontWeight: 'bold', // הפיכת הכותרת ליותר בולטת עם גופן מודגש
        textShadowColor: 'rgba(0, 0, 0, 0.75)', // צל לתלת מימדיות קלה
        textShadowOffset: { width: -1, height: 1 }, // מיקום הצל
        textShadowRadius: 10, // רדיוס הצל
      },
scrollContainer: {
  width: '150%', // כדי שהגלילה לא תהיה צרה מדי
  height: '210%', // גובה דינמי (יכול לשנות ל-70% אם רוצה יותר מקום) 210 היה
  maxHeight: 450, // גובה מקסימלי כדי שהרשימה לא תתפוס יותר מדי מקום
},
scrollView: {
  flex: 1, // מאפשר לרשימה לגדול לגובה מקסימלי
  width: '100%',
  height: '100%', // גובה דינמי (יכול לשנות ל-70% אם רוצה יותר מקום)

},
scrollContent: {
  alignItems: 'center', // ממרכז את האלמנטים בתוך הגלילה
  paddingBottom: 20, // מוסיף רווח למטה שלא ייחתך
  width: '97%',

},
eventContainer: {
  width: '100%',
  maxWidth: 450,
  padding: 10,
  borderRadius: 10,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
  backgroundColor: 'rgba(240, 240, 240, 0.6)', // צבע אפור עם שקיפות של 60%

},

    });
    export default Main;





