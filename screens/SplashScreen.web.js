import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, Text, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';

const SplashScreen = () => {
  const navigation = useNavigation();
  const loadingBarWidth = useRef(new Animated.Value(0)).current;
  const [isConnected, setIsConnected] = useState(true);



  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    const timer = setTimeout(() => {
      if (isConnected) {
        navigation.replace('LoginEmail'); // 'Main' הוא שם המסך הראשי באפליקציה שלך
      }
    }, 5); // זמן בסרטונים באלפיות שנייה (4.5 שניות)

    Animated.timing(loadingBarWidth, {
      toValue: 100,
      duration: 4000,
      useNativeDriver: false,
    }).start();

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [isConnected, navigation]);

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>בעיית אינטרנט</Text>
        <Text style={styles.errorSubText}>נא בדוק חיבור לרשת ה - wifi או בדוק עם ספק התקשורת שלך, תודה רבה.</Text>
        <TouchableOpacity style={styles.button} onPress={() => {
          // נסה לטעון מחדש את האפליקציה
          navigation.replace('SplashScreen');
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
    <View style={styles.container}>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // מוודא שהתמונה תכסה את כל המסך
  },
  loadingBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#3b5998',
    borderRadius: 5,
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
});

export default SplashScreen;
