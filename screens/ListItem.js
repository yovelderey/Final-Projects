  import React from 'react';
  import { View, TextInput, Button, StyleSheet } from 'react-native';
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
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="the event screen"
        />

        <Button title="back" onPress={() => props.navigation.navigate('Main')}/>
  
      </View>
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
  });
  
  export default ListItem;
  