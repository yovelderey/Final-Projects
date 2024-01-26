import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ImageBackground, StyleSheet, StatusBar,ScrollView ,Image, Settings} from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Main from './screens/Main';
import Login from './screens/Login';
import Register from './screens/Register';
import RePassword from './screens/RePassword';
import LoginEmail from './screens/LoginEmail';
import Setting from './screens/Setting';
import Category_1 from './screens/Category_1';
import Category_2 from './screens/Category_2';
import Category_3 from './screens/Category_3';
import Category_4 from './screens/Category_4';
import Manager from './screens/Manager';



const App = () => {

  const Stack = createNativeStackNavigator();
  return (
   <NavigationContainer>
  
      <Stack.Navigator initialRouteName="Main" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main" component={Main} options={{title:"",}}/>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="RePassword" component={RePassword}/>
        <Stack.Screen name="LoginEmail" component={LoginEmail}/>
        <Stack.Screen name="Setting" component={Setting}/>
        <Stack.Screen name="Category_1" component={Category_1}/>
        <Stack.Screen name="Category_2" component={Category_2}/>
        <Stack.Screen name="Category_3" component={Category_3}/>
        <Stack.Screen name="Category_4" component={Category_4}/>
        <Stack.Screen name="Manager" component={Manager}/>

      </Stack.Navigator>
   </NavigationContainer>       
  );
};
export default App;
