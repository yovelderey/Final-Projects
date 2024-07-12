import React, { useEffect, useState } from 'react';
  import { View, ImageBackground,Text, TouchableOpacity,Image,ScrollView, StyleSheet,Dimensions,Animated } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { getDatabase, ref, remove,get } from 'firebase/database';
  import 'firebase/database'; // Import the Realtime Database module
  import  firebase from 'firebase/compat/app';
  import 'firebase/compat/auth';
  import 'firebase/compat/firestore';
  import * as ImagePicker from 'expo-image-picker';
  import * as FileSystem from 'expo-file-system';
  import Carousel from 'react-native-snap-carousel';

  const { width } = Dimensions.get('window');
  const images = [
    require('../assets/imagemainone.png'),
    require('../assets/imgmaintwo.png'),
    require('../assets/imagmaintree.png'),
    require('../assets/imagemainfour.png'),
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
  const user = firebase.auth().currentUser;
  const id = props.route.params.id; // Accessing the passed id
  const [eventDetails, setEventDetails] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const animatedValue = useState(new Animated.Value(0))[0];
  const [inputDate, setInputDate] = useState('');
  const [daysLeft, setDaysLeft] = useState(null);


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

          const intervalId = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
            animate();
          }, 5000); // Change image every 5 seconds
      
          return () => clearInterval(intervalId);

        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      }
    };
    

    fetchData();
  }, [user, id]);

  useEffect(() => {
    console.log("eventDetails.eventDate55555  ", eventDetails.eventDate);

    if (eventDetails.eventDate) {
      console.log("eventDetails.eventDate111  ", eventDetails.eventDate);

      calculateDaysLeft();
    }
  }, [eventDetails.eventDate]);

  const animate = () => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.5],
  });

  const animatedStyle = {
    transform: [
      { translateX },
      { rotate },
      { scale },
    ],
  };

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access media library is required!');
      return;
    }
  
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      try {
        const selectedAsset = pickerResult.assets[0];
        const fileName = selectedAsset.uri.split('/').pop();
        const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
  
        await FileSystem.copyAsync({
          from: selectedAsset.uri,
          to: destinationUri,
        });
  
        setSelectedImage(destinationUri);
      } catch (error) {
        console.error("Error copying image: ", error);
      }
    }
  };
  
  const handleButton1Press = () => {
    console.log('Button 1 pressed');
    // Add your code here for Button 1
    props.navigation.navigate('Budget', { id });


  };

  const handleButton2Press = () => {
    console.log('Button 2 pressed');
    props.navigation.navigate('Management', { id });
  };

  const handleButton3Press = () => {
    console.log('Button 3 pressed');
    // Add your code here for Button 3
  };

  const handleButton4Press = () => {
    console.log('Button 4 pressed');
    // Add your code here for Button 4
  };

  const handleButton5Press = () => {
    console.log('Button 5 pressed');
    // Add your code here for Button 5
  };

  const handleButton6Press = () => {
    console.log('Button 6 pressed');
    // Add your code here for Button 6
  };

  const onPressLogin = () => {
    // כאן תוכל להוסיף לוגיקה להתחברות
  };

  const calculateDaysLeft = () => {

    const currentDate = new Date();
    const targetDate = new Date(eventDetails.eventDate);
    
    // Calculate the difference in time
    const timeDiff = targetDate.getTime() - currentDate.getTime();
    // Calculate the difference in days
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    console.log("eventDetails.eventDate2222  ", eventDetails.eventDate);

    if(daysDiff>0)
      setDaysLeft("עוד "+ daysDiff + " ימים");
    else if(daysDiff == 0)
      setDaysLeft("בשעה טובה!");
    else
      setDaysLeft("האירוע מאחורינו");
    

  };

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

        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.imageBackground} />
        ) : (

          <TouchableOpacity onPress={selectImage} style={styles.imagePlaceholder}>
          <Animated.Image
            source={images[currentIndex]}
            style={[styles.imageBackgroundcarusel,{transform: [{ translateX: animatedValue }],},]}
          />
          </TouchableOpacity>

        )}
        <View style={styles.backgroundContainer}>
        <View style={styles.row}>
          <View style={styles.section}>
            <Text style={styles.header}>מוזמנים</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.textPrice}>0 / {eventDetails.Numberofguests}</Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.header}>תקציב</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.textPrice}>0₪ / {eventDetails.budget}₪</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.rectangle}>
      <View style={styles.imageContainer}>
        <ImageBackground
          source={require('../assets/warning.png')}
          style={styles.background}
        />
        <Text style={styles.imageText}>0</Text>
      </View>

      <View style={styles.imageContainer}>
        <ImageBackground
          source={require('../assets/warningy.png')}
          style={styles.background}
        />
        <Text style={styles.imageText}>0</Text>
      </View>

      <View style={styles.imageContainer}>
        <ImageBackground
          source={require('../assets/checked.png')}
          style={styles.background}
        />
        <Text style={styles.imageText}>0</Text>
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
    </View>

          <TouchableOpacity  style={styles.largeButton}>
              <Text style={styles.largeButtonText}> {daysLeft} </Text>
          </TouchableOpacity>

          <Text style={styles.text2}> חפשו אותנו ברשתות החברתיות</Text>
               
                 

          <TouchableOpacity 
          onPress={() => props.navigation.navigate('Main')}
              style={[styles.showPasswordButton, { position: 'absolute', top: '94%', left: '3%' }]}>
              <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center',    marginBottom: 250,}}>
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
    height: '20%',
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
    marginBottom: -140,
  },
  button: {
    width: '45%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 5,  // הוספת שוליים אופקיים לכפתורים
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
    marginBottom: 30,
  },
  maintext: {
    width: 200,
    height: 70,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: -10, // Adjust as needed
  },
  buttonText: {
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
    width: '100%',
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
    marginBottom: 5,
  },
  scrollViewContainer: {
    flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // Add padding to create space between the sections
  },
  backgroundContainer: {
    backgroundColor: '#ff69b4', // Background color for the whole row
    padding: 10,
    borderRadius: 10,
    width: '90%',
  },
  icon: {
    width: 50,
    height: 50,
    marginTop: 5,
    marginBottom: 10, // email password log in is down

  },
});


export default ListItem;

  