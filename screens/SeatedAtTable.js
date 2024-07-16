import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet , TouchableOpacity,Dimensions,Animated } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';



const { width } = Dimensions.get('window');
const images = [
  require('../assets/imagemainone.png'),
  require('../assets/imgmaintwo.png'),
  require('../assets/imagmaintree.png'),
  require('../assets/imagemainfour.png'),
];

const SeatedAtTable = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  const animatedValue = useState(new Animated.Value(0))[0];
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        try {

          const intervalId = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
            animate();
          }, 5000); // Change image every 5 seconds
      
          return () => clearInterval(intervalId);

        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      
    };
    

    fetchData();
  }, []);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>סידורי הושבה</Text>

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

      <TouchableOpacity 
        onPress={() => props.navigation.navigate('ListItem', { id })}
        style={[styles.showPasswordButton, { position: 'absolute', top: '94%', left: '3%' }]}
      >
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,

  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  backIcon: {
    width: 50,
    height: 50,

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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePlaceholder: {
    width: '100%',
    height: '20%',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 70,
  },
});

export default SeatedAtTable;
