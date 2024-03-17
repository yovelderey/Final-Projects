  import React from 'react';
  import { View, ImageBackground, Button, StyleSheet } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  
  function ListItem(props) {
    const navigation = useNavigation();
  
    const handleRegister = () => {
      // Add your registration logic here (e.g., sending data to a server).
      // You can use the data entered in the TextInput fields.
    };
  
    return (
      <ImageBackground 
      source={require('../assets/imagedash.png')} // Adjust the path accordingly
      style={styles.background} >

      <View style={styles.container}>

        <Button title="back" onPress={() => props.navigation.navigate('Main')}/>
  
      </View>
      </ImageBackground>

    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    input: {
      width: '80%',
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      borderRadius: 5,
      marginBottom: 10,
      paddingLeft: 10,
    },
    background: {
      flex: 1,
      resizeMode: 'cover',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
  
  export default ListItem;
  