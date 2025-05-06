import React, { useEffect, useRef,useState } from 'react';
  import { View,Modal,ActivityIndicator, ImageBackground,Text,FlatList,Easing,Alert, TouchableOpacity,Image,ScrollView, StyleSheet,Dimensions,Animated } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { getDatabase, ref,set, remove,get,onValue } from 'firebase/database';
  import 'firebase/database'; // Import the Realtime Database module
  import  firebase from 'firebase/compat/app';
  import 'firebase/compat/auth';
  import 'firebase/compat/firestore';
  import * as ImagePicker from 'expo-image-picker';
  import * as FileSystem from 'expo-file-system';
  import { StatusBar } from 'expo-status-bar';
  import * as Progress from 'react-native-progress';
  import { Ionicons } from '@expo/vector-icons';

  const { width } = Dimensions.get('window');
  const images = [    
    require('../assets/imagemainone.png'),
    require('../assets/imgmaintwo.png'),
    require('../assets/imagemainthree.png'),
    require('../assets/imagemainfour.png'),
    require('../assets/addpic.png'),
  ];

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


  function ListItem(props) {

  const [displayText, setDisplayText] = useState('Click me');
  const database = getDatabase();
  const id = props.route.params.id; // Accessing the passed id
  const [eventDetails, setEventDetails] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigation = useNavigation();
  const [isScheduled_contact, setIsScheduled_contact] = useState(true); // מצב האם היומן נשמר
  const [isScheduled_table, setIsScheduled_table] = useState(true); // מצב האם היומן נשמר
  const [isScheduled_rspv, setIsScheduled_rspv] = useState(true); // מצב האם היומן נשמר
  //const databaseRef2 = ref(database, `Events/${user.uid}/${id}/checkbox`);

  const [inputDate, setInputDate] = useState('');
  const [daysLeft, setDaysLeft] = useState(null);
  const [eventDetailsspend, setEventDetailsspend] = useState({});
  const [isUploading, setIsUploading] = useState(true); // ניהול מצב טעינה


useEffect(() => {
  const unsubscribe = firebase.auth().onAuthStateChanged((currentUser) => {
    setUser(currentUser);
  });

  return () => unsubscribe();
}, []);


const [user, setUser] = useState(null);
const [databaseRef2, setDatabaseRef2] = useState(null);

useEffect(() => {
  const unsubscribe = firebase.auth().onAuthStateChanged(currentUser => {
    setUser(currentUser);
    if (currentUser) {
      // מגדיר את ה‑ref רק אחרי שהמשתמש נטען
      setDatabaseRef2(ref(
        database,
        `Events/${currentUser.uid}/${id}/checkbox`
      ));
    } else {
      console.log('No user authenticated');
      setDatabaseRef2(null);
      navigation.replace('LoginEmail');
    }
  });
  return () => unsubscribe();
}, [database, id, navigation]);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const databaseRef = ref(database, `Events/${user.uid}/${id}/`);
          const snapshot = await get(databaseRef);
          const fetchedData = snapshot.val();

          if (fetchedData) {
            setEventDetails(fetchedData); // Set the fetched event details
          }

          return () => clearInterval(intervalId);

        } catch (error) {
         // console.error("Error fetching data: ", error);
        }
      }
    };


    fetchData();
  }, [user, id]);

  useEffect(() => {

    if (eventDetails.eventDate) {

      calculateDaysLeft();
    }
  }, [eventDetails.eventDate]);

  // הפונקציה שמבצעת את האנימציה

  const [dontShowAgain, setDontShowAgain] = useState(false);

   useEffect(() => {
       // אם אין משתמש או אין reference ל-checkbox — לא קוראים לפונקציה
       if (!user || !databaseRef2) return;
    
       const checkIfShouldShowModal = async () => {
         try {
           const eventRef2 = ref(database, `Events/${user.uid}/${id}`);
           const snapshot2 = await get(eventRef2);
           const eventData2 = snapshot2.val();
    
           const snapshot = await get(databaseRef2);
           const value = snapshot.val();
           if (value !== 1 && (!eventData2?.contacts || !eventData2?.tables || !eventData2?.message)) {
             setIsModalVisible(true);
           }
         } catch (error) {
           console.error('Error fetching checkbox state:', error);
         }
       };
    
       checkIfShouldShowModal();
     }, [user, databaseRef2, id]);

  // שינוי ה- Checkbox ועדכון ב- Firebase
  const handleCheckboxChange = async () => {
    const newValue = !dontShowAgain;
    setDontShowAgain(newValue);
    try {
      await set(databaseRef2, newValue ? 1 : 0);
    } catch (error) {
      console.error('Error updating checkbox state:', error);
    }
  };
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null); // ניהול מצב התמונה שנבחרה

  useEffect(() => {
    if (!selectedImage) {
      const interval = setInterval(() => {
        setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
        flatListRef.current.scrollToIndex({ index: currentIndex, animated: true });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentIndex, images.length, selectedImage]);

  // פונקציה לפתיחת הגלריה ובחירת תמונה
  const pickImage = async () => {
    try {
      setIsUploading(true); // הפעל מצב טעינה
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled) {
        const imageName = result.assets[0].uri.split('/').pop();
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
  
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(`users/${user.uid}/${id}/main_carusela/${imageName}`);
  
        const uploadTask = imageRef.put(blob);
        uploadTask.on(
          'state_changed',
          null, // אופציונלי: מעקב אחרי ההתקדמות
          (error) => {
            console.error('Error uploading image: ', error);
            Alert.alert('שגיאה', 'לא ניתן להעלות את התמונה.');
            setIsUploading(false); // עצור טעינה אם יש שגיאה
          },
          async () => {
            const downloadURL = await imageRef.getDownloadURL();
            setSelectedImage(downloadURL); // עדכון התמונה שנבחרה מיידית
            setIsUploading(false); // עצור טעינה
          }
        );
      } else {
        setIsUploading(false); // עצור טעינה אם בוטל
      }
    } catch (error) {
      console.error('Error picking image: ', error);
      Alert.alert('שגיאה', 'לא ניתן לבחור תמונה.');
      setIsUploading(false); // עצור טעינה אם יש שגיאה
    }
  };
  

  useEffect(() => {
    const fetchImage = async () => {
      if (user) {
        const databaseRef = ref(database, `Events/${user.uid}/${id}/mainImage`);
        onValue(databaseRef, (snapshot) => {
          const data = snapshot.val();
          if (data?.imageURL) {
            setSelectedImage(data.imageURL); // טוען את התמונה שנשמרה
          }
        });
      }
    };
  
    fetchImage();
  }, [user, id]);
  
  
  const fetchImageFromStorage = async () => {
    try {
      const storageRef = firebase.storage().ref();
      const imagePath = `users/${user.uid}/${id}/main_carusela/`; // הנתיב הבסיסי
      const listResult = await storageRef.child(imagePath).listAll(); // רשימת קבצים בתיקייה
  
      if (listResult.items.length > 0) {
        const firstImageRef = listResult.items[0]; // נניח שאתה רוצה את התמונה הראשונה
        const downloadURL = await firstImageRef.getDownloadURL();
        setSelectedImage(downloadURL); // עדכון מצב עם כתובת ה-URL של התמונה
      } else {
        setSelectedImage(null); // אם אין תמונות, איפוס התמונה
      }
    } catch (error) {
      console.error('Error fetching image from storage:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את התמונה.');
    }
  };
  
  useEffect(() => {
    if (user) {
      fetchImageFromStorage();
    }
  }, [user, id]);
  
  

  
  // פונקציה למחיקת התמונה שנבחרה
  const removeImage = async () => {
    try {
      const storageRef = firebase.storage().ref();
      const imagePath = `users/${user.uid}/${id}/main_carusela/`; // הנתיב לתיקייה
      const listResult = await storageRef.child(imagePath).listAll();
  
      if (listResult.items.length > 0) {
        const firstImageRef = listResult.items[0]; // נניח שאתה מוחק את התמונה הראשונה
        await firstImageRef.delete();
        setSelectedImage(null); // איפוס התמונה
      } else {
        Alert.alert('שגיאה', 'לא נמצאה תמונה למחיקה.');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('שגיאה', 'לא ניתן למחוק את התמונה.');
    }
  };
  
  
  useEffect(() => {
    if (user) {
        const fetchData = async () => {
            try {
                const eventRef = ref(database, `Events/${user.uid}/${id}`);
                const snapshot = await get(eventRef);
                const eventData = snapshot.val();
                if (!eventData?.contacts)
                  setIsScheduled_contact(true); // מאפס את מצב השמירה
                else
                  setIsScheduled_contact(false); // מאפס את מצב השמירה

                if (!eventData?.tables)
                  setIsScheduled_table(true); // מאפס את מצב השמירה
                else
                  setIsScheduled_table(false); // מאפס את מצב השמירה

                if (!eventData?.message)
                  setIsScheduled_rspv(true); // מאפס את מצב השמירה
                else
                setIsScheduled_rspv(false); // מאפס את מצב השמירה


                if ((!eventData?.contacts || !eventData?.tables || !eventData?.message) && eventDetails.checkbox === 1) {
                  setIsModalVisible(true);
                }

            } catch (error) {
                console.error("Error fetching event data: ", error);
            }
        };
        fetchData();
    }
}, [user, id]);



  useEffect(() => {
    if (user) {
      const eventRef = ref(database, `Events/${user.uid}/${id}/`);
      
      const handleValueChange = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEventDetails(data);
        }
      };
      
      // Attach listener
      const unsubscribe = onValue(eventRef, handleValueChange);
      
      // Cleanup function
      return () => {
        unsubscribe(); // Call unsubscribe to remove the listener
      };
    }
  }, [user, id]);
  
  

  const animation = useRef(new Animated.Value(0)).current;

  const targetDate = new Date(eventDetails.eventDate);
  useEffect(() => {
    // חישוב הימים שנותרו עד לתאריך היעד
    const interval = setInterval(() => {
      const currentDate = new Date();
      const timeDiff = targetDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));


      if (daysDiff > 0) {
        setDaysLeft(`🎉 עוד ${daysDiff} ימים לאירוע הגדול! 🎉`);
      } else if (daysDiff === 0) {
        setDaysLeft("🎉 בשעה טובה! 🎉");
      } else {
        setDaysLeft("🎉 האירוע מאחורינו 🎉");
      }
    }, 1000);

    // אנימציה חד-פעמית שמופיעה עם טעינת המסך
    Animated.timing(animation, {
      toValue: 1,
      duration: 4000, // זמן האנימציה
      useNativeDriver: true,
    }).start(); // מפעילים את האנימציה פעם אחת בלבד

    return () => clearInterval(interval);
  }, [eventDetails.eventDate]);

  const animatedStyle = {
    opacity: animation, // האנימציה תשפיע רק על השקיפות
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.2], // התרחבות מ-50% עד 120%
        }),
      },
    ],
  };

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      if (isModalVisible) {
          Animated.parallel([
              Animated.timing(scaleAnim, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
              })
          ]).start();
      } else {
          Animated.parallel([
              Animated.timing(scaleAnim, {
                  toValue: 0.8,
                  duration: 200,
                  useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
              })
          ]).start();
      }
  }, [isModalVisible]);

  const handleButton1Press = () => {
    // Add your code here for Button 1 תקציב
    props.navigation.navigate('Budget', { id });
  };

  const handleButton2Press = () => {
        // Add your code here for Button 1 ניהול אורחים

    props.navigation.navigate('Management', { id });
  };

  const handleButton3Press = () => {
        // Add your code here for Button 1 משימות

    props.navigation.navigate('Task', { id });
  };

  const handleButton4Press = () => {
    props.navigation.navigate('SeatedAtTable', { id });

    // Add your code here for Button 4
  };

  const handleButton5Press = () => {
    props.navigation.navigate('Providers', { id });
    // Add your code here for Button 5 ספקים
  };

  const handleButton6Press = () => {
    if (eventDetails.message && eventDetails.message_date_hour) {
      props.navigation.navigate('RSVPs', { id });
      //props.navigation.navigate('Test2', { id });

    } else {
      props.navigation.navigate('RSVPstwo', { id });
    }
  };
  

  const handleButton7Press = () => {
    props.navigation.navigate('Gift', { id });
    // Add your code here for Button 7 מתנות
  };

  const handleButton8Press = () => {
    props.navigation.navigate('Document', { id });
    // Add your code here for Button 8 קבלות ומסמכים
  };

  const handleButton9Press = () => {
    props.navigation.navigate('Main');
    // Add your code here for Button 7 מתנות
  };

  const handleButton10Press = () => {
    props.navigation.navigate('HomeThree', { Numberofguests: eventDetails.Numberofguests,finalEventName: id});
    // Add your code here for Button 8 קבלות ומסמכים
  };

  const onPressLogin = () => {
    // כאן תוכל להוסיף לוגיקה להתחברות
  };

  const calculateDaysLeft = () => {

  };

  let fileCount = eventDetails.Numberofimage; // מספר הקבצים
  if (!(eventDetails && eventDetails.Numberofimage)) {
    fileCount = 0;
  }
  let fileSizeMB = eventDetails.NumberofSizeimage; // מספר הקבצים
  if (!(eventDetails && eventDetails.NumberofSizeimage)) {
    fileSizeMB = 0;
  }
  //const fileSizeMB = 10; // משקל של כל קובץ ב-מ"ב
  const maxStorage = 55; // מגבלת אחסון ב-מ"ב
  const [progress] = useState(new Animated.Value(0));
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    const totalStorageUsed = Math.max(1,fileSizeMB); // סך השימוש באחסון
    setStorageUsed(totalStorageUsed); // עדכון השימוש באחסון
    const progressValue = Math.min(fileCount / 10, 1); // חישוב ההתקדמות, מקסימום 1 (100%)

    // עצירה של אנימציה קודמת והתחלת אנימציה חדשה
    progress.stopAnimation();

    Animated.timing(progress, {
      toValue: progressValue, // יעד האנימציה
      duration: 1500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [fileCount]);

  const progressValue = progress.__getValue();
  const progressColor = progressValue > 0.8 ? 'red' : '#3498db'; // צבע דינמי לפי שימוש

  const screenWidth = Dimensions.get('window').width * 0.9; // 90% מרוחב המסך


  return (
  <ScrollView contentContainerStyle={styles.scrollViewContainer}>

     <View style={styles.container}>

          <View style={styles.maintext}>
            <Text style={styles.title}> {eventDetails.eventDate}</Text>
            <Text style={styles.title}> ●  </Text>
            <Text style={styles.title}> {eventDetails.eventName}</Text>
            <Text style={styles.title}>● </Text>
            <Text style={styles.title}> {eventDetails.eventLocation}</Text>
          </View>
          <View style={styles.container1}>
          <FlatList
  data={selectedImage ? [{ uri: selectedImage }] : images} // שימוש בתמונה שנבחרה אם קיימת
  horizontal
  ref={flatListRef}
  keyExtractor={(item, index) => item.uri || index.toString()}
  renderItem={({ item }) => (
    <View style={styles.imageContainer}>
      <TouchableOpacity onPress={pickImage}>
        <Image source={item.uri ? { uri: item.uri } : item} style={styles.image} />
      </TouchableOpacity>
      {selectedImage && (
        <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  )}
  showsHorizontalScrollIndicator={false}
  pagingEnabled
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={16}
/>


            <StatusBar style="auto" />

    </View>

          <View style={styles.backgroundContainer}>
        <View style={styles.row}>
          {/* אובייקט ראשון - מסמכים */}
          <View style={styles.documentContainer}>
            <View style={styles.infoContainer}>
              <Text style={styles.header}>מסמכים</Text>
              <Text style={[styles.textInfo, { width: screenWidth }]}>
                {fileCount} / 10
              </Text>

            </View>
            <View style={styles.progressContainer}>
              <Progress.Circle
                size={100}
                progress={progressValue}
                showsText
                formatText={() => `${Math.round(progressValue * 100)}%`}
                thickness={8}
                color={'#3498db'}
                borderWidth={3}
                animated={true}
              />
            </View>
          </View>

          {/* אובייקט שני - מוזמנים */}
          <View style={styles.documentContainer}>
            <View style={styles.infoContainer}>
              <Text style={styles.header}>מוזמנים</Text>
              <Text style={[styles.textInfo, { width: screenWidth }]}>
                {eventDetails.counter_contacts || 0} / {eventDetails.Numberofguests || 0}
              </Text>

            </View>
            <View style={styles.progressContainer}>
            <Progress.Circle
              size={100}
              progress={(eventDetails.counter_contacts || 0) / (eventDetails.Numberofguests || 1)}
              showsText
              formatText={() =>
                `${Math.round(((eventDetails.counter_contacts || 0) / (eventDetails.Numberofguests || 1)) * 100)}%`
              }
              thickness={10}
              color={'#e74c3c'}
              borderWidth={4}
              animated={true}
            />

            </View>
          </View>

          {/* אובייקט שלישי - תקציב */}
          <View style={styles.documentContainer}>
            <View style={styles.infoContainer}>
              <Text style={styles.header}>תקציב</Text>
              <Text style={[styles.textInfo, { width: screenWidth }]}>
                {eventDetails.spend} / {eventDetails.budget}
              </Text>

            </View>
            <View style={styles.progressContainer}>
              <Progress.Circle
                size={100}
                progress={eventDetails.budget ? eventDetails.spend / eventDetails.budget : 0}
                showsText
                formatText={() =>
                  `${Math.round((eventDetails.spend / eventDetails.budget) * 100)}%`
                }
                thickness={12}
                color={'#000'}
                borderWidth={2}
                animated={true}
              />
            </View>
          </View>
        </View>
      </View>



      <Animated.Text style={[styles.countdownText, animatedStyle]}>{daysLeft}</Animated.Text>

      <View style={styles.outerRectangle}>
  <View style={styles.rectangle}>

  <View style={styles.imageContainer}>
      <ImageBackground
        source={require('../assets/question-mark.png')}
        style={styles.background}
      />
      <Text style={styles.imageText5}>טרם השיבו</Text>
      <Text style={styles.imageText}>{eventDetails.no_answear || 0}</Text>
    </View>

    <View style={styles.imageContainer}>
      <ImageBackground
        source={require('../assets/warning.png')}
        style={styles.background}
      />
      <Text style={styles.imageText3}>לא מגיעים</Text>
      <Text style={styles.imageText}>{eventDetails.no_cuming || 0}</Text>
    </View>

    <View style={styles.imageContainer}>
      <ImageBackground
        source={require('../assets/warningy.png')}
        style={styles.background}
      />
      <Text style={styles.imageText4}>אולי</Text>
      <Text style={styles.imageText}>{eventDetails.maybe || 0}</Text>
    </View>

    <View style={styles.imageContainer}>
      <ImageBackground
        source={require('../assets/checked.png')}
        style={styles.background}
      />
      <Text style={styles.imageText2}>מגיעים</Text>
      <Text style={styles.imageText}>{eventDetails.yes_caming || 0}</Text>
    </View>
  </View>
</View>


    <View style={styles.buttonContainer}>
      <TouchableOpacity onPress={handleButton1Press} style={styles.button}>
        <Image source={require('../assets/budget.png')} style={styles.icon} />
        <Text style={styles.buttonText}>תקציב</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton2Press} style={styles.button}>
        <Image source={require('../assets/people.png')} style={styles.icon} />
        <Text style={styles.buttonText}>ניהול אורחים</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton3Press} style={styles.button}>
        <Image source={require('../assets/completed.png')} style={styles.icon} />
        <Text style={styles.buttonText}>משימות</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton4Press} style={styles.button}>
        <Image source={require('../assets/table.png')} style={styles.icon} />
        <Text style={styles.buttonText}>סידורי הושבה</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton5Press} style={styles.button}>
        <Image source={require('../assets/share.png')} style={styles.icon} />
        <Text style={styles.buttonText}>ניהול ספקים</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton6Press} style={styles.button}>
        <Image source={require('../assets/checked.png')} style={styles.icon} />
        <Text style={styles.buttonText}>אישורי הגעה</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton7Press} style={styles.button}>
        <Image source={require('../assets/gift.png')} style={styles.icon} />
        <Text style={styles.buttonText}>מתנות</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton8Press} style={styles.button}>
        <Image source={require('../assets/folder.png')} style={styles.icon} />
        <Text style={styles.buttonText}>קבלות ומסמכים</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton9Press} style={styles.button}>
        <Image source={require('../assets/home.png')} style={styles.icon} />
        <Text style={styles.buttonText}>מסך בית</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleButton10Press} style={styles.button}>
        <Image source={require('../assets/debit-card.png')} style={styles.icon} />
        <Text style={styles.buttonText}>רכוש חבילה</Text>
      </TouchableOpacity>
    </View>





          <Text style={styles.text2}> חפשו אותנו ברשתות החברתיות</Text>
               

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center',    marginBottom: 120,}}>
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
          <Modal visible={isModalVisible} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <ImageBackground source={require('../assets/backg1.png')} style={styles.icon3}>

        {/* כפתור סגירה */}
        <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* תוכן המודל */}
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>ברוכים הבאים ל- EasyVent!</Text>
          <Text style={styles.modalSubtitle}>מערכת לניהול אירועים</Text>
          <Text style={styles.modalSubtitle}>כדי להתחיל את האירוע יש להשלים את השלבים הבאים:</Text>

          <View style={styles.stepsContainer}>
            <Text style={styles.modalStep}>✔ ניהול אורחים</Text>
            <Text style={styles.modalStep}>✔ ניהול הושבה</Text>
            <Text style={styles.modalStep}>✔ אישורי הגעה</Text>
          </View>

          <Text style={styles.modalSubtitle}>בחרו שלב להתחלה:</Text>

          {/* כפתורים מודרניים עם אייקונים */}
          <View style={styles.buttonsContainer}>
            {isScheduled_contact && (
              <TouchableOpacity style={styles.modalButton} onPress={() => { setIsModalVisible(false); navigation.navigate('Management', { id }); }}>
                <Image source={require('../assets/buttonmodal1.png')} style={styles.icon2} />
              </TouchableOpacity>
            )}
            {isScheduled_table && (
              <TouchableOpacity style={styles.modalButton} onPress={() => { setIsModalVisible(false); navigation.navigate('SeatedAtTable', { id }); }}>
                <Image source={require('../assets/buttonmodal2.png')} style={styles.icon2} />
              </TouchableOpacity>
            )}
            {isScheduled_rspv && (
              <TouchableOpacity style={styles.modalButton} onPress={() => { setIsModalVisible(false); navigation.navigate('RSVPstwo', { id }); }}>
                <Image source={require('../assets/buttonmodal3.png')} style={styles.icon2} />
              </TouchableOpacity>
            )}
          </View>

              {/* CheckBox "אל תציג הודעה זו שוב" */}
          <TouchableOpacity style={styles.checkboxContainer} onPress={handleCheckboxChange}>
            <View style={styles.checkbox}>
              {dontShowAgain && <Text style={styles.checkboxMark}>✔</Text>}
            </View>
            <Text style={styles.checkboxText}>אל תציג הודעה זו שוב</Text>
          </TouchableOpacity>

            {dontShowAgain && (
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.closeModalButtonText}>סגור</Text>
              </TouchableOpacity>
            )}
        </View>
      </ImageBackground>
    </Animated.View>
  </View>
</Modal>


  </View>
  
</ScrollView>

  );
}
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
  },
  container1: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 21,
    marginBottom: 20,
    textAlign: 'center',

  },
  text: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  textdeshboard: {
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  textPrice: {
    fontSize: 16,
    color: '#000000',
  },
  imageBackground: {
    width: '100%',
    height: '25%',
    marginBottom: 20,
  },
  imageBackgroundcarusel: {
    width: '100%',
    height: '125%',
    marginBottom: -15,
  },
  imageContainer: {
    alignItems: 'center',

  },
  imagePlaceholder: {
    width: '100%',
    height: '17.5%',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 70,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,  // הוספת שוליים פנימיים לקונטיינר של הכפתורים
    marginBottom: -160,
  },
  button: {
    width: '45%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 5,  // הוספת שוליים אופקיים לכפתורים
  },

  button2: {
    backgroundColor: 'rgba(107, 99, 255, 0.77)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    width: '80%',
    alignItems: 'center',
    textAlign: 'center',
  },
  background: {
    width: 50, // Adjust the width as needed
    height: 50, // Adjust the height as needed
    justifyContent: 'center', // Center text horizontally
    alignItems: 'center', // Center text vertically
    margin: 20, // Add some space between the images

  },
  rectangle: {
    width: 200,
    height: 100,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  maintext: {
    width: 200,
    height: 70,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -20,

  },
  documentContainer: {
    flex: 1,
    flexDirection: 'column', // מסדר את התוכן בתוך המסמכים לאורך
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginHorizontal: 5, // מוסיף מרווח בין הטקסטים
  },
  text2: {
    fontSize: 14,
    color: 'black',
    marginHorizontal: 5,
    marginBottom: -45,

  },
  imageText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
    right: -39,

    marginTop: -10, // Adjust as needed
  },
  imageText2: {
    fontSize: 15,
    color: '#000000',
    fontWeight: 'bold',
    right: -23,
    marginBottom: 12, // email password log in is down
    marginTop: -10, // Adjust as needed
  },
  imageText3: {
    fontSize: 15,
    color: '#000000',
    fontWeight: 'bold',
    right: -10,
    marginBottom: 12, // email password log in is down
    marginTop: -10, // Adjust as needed
  },
  imageText4: {
    fontSize: 15,
    color: '#000000',
    fontWeight: 'bold',
    right: -30,
    marginBottom: 12, // email password log in is down
    marginTop: -10, // Adjust as needed
  },
  imageText5: {
    fontSize: 15,
    color: '#000000',
    fontWeight: 'bold',
    right: -10,
    marginBottom: 12, // email password log in is down
    marginTop: -10, // Adjust as needed
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
  },
  buttonText2: {
    color: 'black',
    fontSize: 16,
  },
  imageTextContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceContainer: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    width: '110%',
    alignItems: 'center',

  },
  backIcon: {
    width: 50,
    height: 50,

  },
  title_toolbar_yovel: {
    fontSize: 15,
    color: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5, // email password log in is down

  },
  largeButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',

  },
  section: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  header: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  largeButton: {
    width: '90%',
    height: 50,
    backgroundColor: '#ff69b4',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 50, // email password log in is down

  },
  largeButtonText: {
    color: 'white',
    fontSize: 18,
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
    marginBottom: -100,
  },
  scrollViewContainer: {
    flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0, // Add padding to create space between the sections
  },
  backgroundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  icon: {
    width: 50,
    height: 50,
    marginTop: 5,
    marginBottom: 10, // email password log in is down

  },
  icon2: {
    width: 270,
    height: 65,

  },
  icon3: {
    width: 390,
    height: 610,
  },
  imageContainer: {
    position: 'absolute',
    width: width,
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageContainer: {
    position: 'relative', // מאפשר למקם את כפתור ה-X בתוך התמונה
  },
  image: {
    width,
    height: 280,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'red',
    borderRadius: 15,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 24,
    lineHeight: 24,
  },
  countdownText: {
    fontSize: 20, // טקסט גדול יותר
    fontWeight: 'bold',
    color: 'rgba(108, 99, 255, 0.9)', // צבע ורוד עז לטקסט
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#fff0f5', // רקע נוסף מסביב לטקסט בצבע ורוד בהיר מאוד
    borderRadius: 7, // פינות עגולות לטקסט
    shadowColor: 'rgba(108, 99, 255, 0.9)', // צל בצבע ורוד
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10, // הצללה קלה לטקסט
    marginTop: 15, // email password log in is down
    marginBottom: 5, // email password log in is down

  },
  shadowContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5, // עבור אנדרואיד
    shadowColor: '#000', // עבור iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    width: '90%', // רוחב מלא
  },
  row: {
    flexDirection: 'row', // כל הקונטיינרים של המסמכים יוצגו אחד ליד השני
    justifyContent: 'space-between',
    alignItems: 'flex-start', // מיקוד האובייקטים לאורך
    width: '100%',
    paddingHorizontal: 10, // רווח בין העמודות
  },
  infoContainer: {
    marginBottom: 10, // רווח בין הטקסט למעגל
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10, // הוספת רווח פנימי סביב העיגול

  },
  textInfo: {
    fontSize: 14,
    color: '#34495e',
    textAlign: 'center',
  },
  textLimit: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
  },
modalContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)', // רקע חצי שקוף
},
modalContent: {
  width: 200,
  height: 200,
  backgroundColor: 'white',
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
loadingText: {
  marginTop: 10,
  fontSize: 16,
  color: '#000',
},
modalContainer: {
  width: '90%', // מתאים לכל המסכים
  maxWidth: 400, // מונע התרחבות יתר
  backgroundColor: '#fff',
  borderRadius: 20,
  overflow: 'hidden',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  alignItems: 'center', // ממורכז
  justifyContent: 'center',
},
modalContent: {
  padding: 20,
  alignItems: 'center',
},
closeButton: {
  position: 'absolute',
  top: 10,
  right: 20,
  backgroundColor: 'red',
  width: 30,
  height: 30,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 15,
  zIndex: 10,
},
closeButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},

modalTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
  marginTop: 20,

},
modalSubtitle: {
  fontSize: 16,
  fontWeight: '600',
  textAlign: 'center',

  color: '#555',
  marginVertical: 5,
},
modalTitle2: {
  fontSize: 15,
  marginBottom: 0,
},
modalText: {
  fontSize: 15,
  color: '#666',
  textAlign: 'center',
  marginBottom: 10,
},
modalStep: {
  fontSize: 15,
  fontWeight: 'bold',
  textAlign: 'center',
  marginVertical: 3,
},
modalButton: {
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  marginVertical: 5,
  width: '90%',
  alignItems: 'center',
},
modalButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
confirmButton: {
  marginTop: 10,
  padding: 10,
  backgroundColor: 'green',
  borderRadius: 5,
  alignItems: 'center',
  width: '100%',
},
confirmButtonText: {
  color: 'white',
  fontSize: 16,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalHeader: {
  width: '100%',
  paddingVertical: 15,
  alignItems: 'center',
  justifyContent: 'center',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
},
checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxMark: {
    fontSize: 15,
    color: '#007AFF',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
  },

closeModalButtonText: {
  color: 'red',
  fontSize: 18,
  fontWeight: 'bold',
},

});


export default ListItem;

  