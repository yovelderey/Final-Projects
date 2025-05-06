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

      <View style={styles.container}>
            <TouchableOpacity onPress={() => navigation.navigate('LoginEmail')}>
              <Image source={require('../assets/backicon.png')} style={styles.imageback} />
            </TouchableOpacity>


            <Image source={require('../assets/epos_password.png')} style={styles.loginText} />

            <TextInput
              style={styles.input}
              placeholder="אימייל"
              keyboardType="email-address"
              
            />

          <TouchableOpacity onPress={handleRegister} style={styles.phoneButton}>
              <Image source={require('../assets/send_code2.png')}  />
            </TouchableOpacity>

            <View>
              <Text style={styles.text}>הזן את כתובת הדואר האלקטרוני שלך והמתן עד שקוד אימות יישלח לתיבת הדואר שלך</Text>
            </View>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },

  input: {
    width: '90%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: 'orange',
    textAlign: 'right',
    marginBottom: 20,
  },
  backIcon: {
    width: 60,
    height: 60,

  },
  loginText: {
    marginTop: -410,
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
  imageback: {
    width: 40,
    height: 40,
    marginTop: -430,
    marginRight: 300,
  },
});

export default RePassword;
