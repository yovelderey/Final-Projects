import React, { useEffect, useState } from 'react';
  import { View, ImageBackground, Button,Text, TouchableOpacity,Image,ScrollView, StyleSheet } from 'react-native';
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
        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      }
    };

    fetchData();
  }, [user, id]);
  


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
  };

  const handleButton2Press = () => {
    console.log('Button 2 pressed');
    // Add your code here for Button 2
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

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>

    <View style={styles.container}>
          <Text style={styles.title}> {eventDetails.eventName}</Text>
      {selectedImage ? (
        <Image source={{ uri: selectedImage }} style={styles.imageBackground} />
      ) : (
        <TouchableOpacity onPress={selectImage} style={styles.imagePlaceholder}>
          <Text style={styles.text}>Select an Image</Text>
        </TouchableOpacity>
      )}
      <View style={styles.priceContainer}>
          <Text style={styles.textprice}>0 / 255              </Text>
          <Text style={styles.textprice}>500₪ / 1000₪</Text>
        </View>

        <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleButton1Press} style={styles.button}>
          <Text style={styles.buttonText}>Button 1</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleButton2Press} style={styles.button}>
          <Text style={styles.buttonText}>Button 2</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleButton3Press} style={styles.button}>
          <Text style={styles.buttonText}>Button 3</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleButton4Press} style={styles.button}>
          <Text style={styles.buttonText}>Button 4</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleButton5Press} style={styles.button}>
          <Text style={styles.buttonText}>Button 5</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleButton6Press} style={styles.button}>
          <Text style={styles.buttonText}>Button 6</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => {}} style={styles.largeButton}>
      <Text style={styles.largeButtonText}>עוד 200 ימים</Text>
    </TouchableOpacity>
      </View>

      <View style={styles.rectangle}>
          <Text style={styles.text}>Text 1</Text>
          <Text style={styles.text}>Text 2</Text>
          <Text style={styles.text}>Text 3</Text>
      </View>

      <TouchableOpacity 
         onPress={() => props.navigation.navigate('Main')}
            style={[styles.showPasswordButton, { position: 'absolute', top: '91%', left: '8%' }]}>
            <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
        </TouchableOpacity>

    </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  textprice: {
    fontSize: 16,
    color: 'black',
  },
  imageBackground: {
    width: '100%',
    height: '25%',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: '100%',
    height: '25%',
    backgroundColor: '#d3d3d3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,  // הוספת שוליים פנימיים לקונטיינר של הכפתורים
    marginBottom: 20,
  },
  button: {
    width: '45%',
    aspectRatio: 1,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 5,  // הוספת שוליים אופקיים לכפתורים
  },
  buttonText: {
    color: 'white',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backIcon: {
    width: 60,
    height: 60,

  },

  largeButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
  },
      
  scrollViewContainer: {
    flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
  },
  largeButton: {
    width: '90%',
    height: 60,
    backgroundColor: '#FF6347',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
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
});


export default ListItem;

  