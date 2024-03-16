import React from 'react';
import { View, TextInput,Image, Button,TouchableOpacity,Text, ImageBackground,StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function RePassword(props) {
  const navigation = useNavigation();

  const handleRegister = () => {
    // Add your registration logic here (e.g., sending data to a server).
    // You can use the data entered in the TextInput fields.
  };

  return (
    <ImageBackground 
    source={require('../assets/Signbac.png')} // Adjust the path accordingly
    style={styles.background}
  >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          
        />

      <TouchableOpacity onPress={handleRegister} style={styles.phoneButton}>
          <Image source={require('../assets/sendcodebutton.png')}  />
        </TouchableOpacity>


        <TouchableOpacity 
          onPress={() => navigation.navigate('LoginEmail')}
            style={[styles.showPasswordButton, { position: 'absolute', top: '91%', left: '4%' }]}>
            <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
        </TouchableOpacity>

        <View>
          <Text style={styles.text}>Enter your email address and wait for a verification code to be sent to your mailbox</Text>
        </View>
    </View>
    </ImageBackground>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '90%',
    height: 40,
    backgroundColor: 'white',
    marginTop: -200,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingLeft: 10,
  },
  backIcon: {
    width: 60,
    height: 60,

  },
  showPasswordButton: {
    marginLeft: -20,
  },
  phoneButton: {
    marginTop: 20,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
});

export default RePassword;
