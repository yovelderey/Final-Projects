import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ImageBackground, StyleSheet, StatusBar, ScrollView, Image, Settings } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Main from './screens/Main';
import Login from './screens/Login';
import Register from './screens/Register';
import RePassword from './screens/RePassword';
import LoginEmail from './screens/LoginEmail';
import Setting from './screens/Setting';
import Manager from './screens/Manager';
import Home from './screens/Home';
import ListItem from './screens/ListItem';
import Budget from './screens/Budget';
import Management from './screens/Management';
import Task from './screens/Task';
import SeatedAtTable from './screens/SeatedAtTable';
import RSVPs from './screens/RSVPs';
import Providers from './screens/Providers';
import ContactsList from './screens/ContactsList';
import Document from './screens/Document';
import Gift from './screens/Gift';
import SplashScreen from './screens/SplashScreen';
import ResponsesScreen from './screens/ResponsesScreen';
import EditHome from './screens/EditHome';
import TablePlanningScreen from './screens/TablePlanningScreen';
import ProvidersScreen from './screens/ProvidersScreen';
import RSVPstwo from './screens/RSVPstwo';
import RSVPsthree from './screens/RSVPsthree';
import RSVPsfour from './screens/RSVPsfour';
import RSVPsfive from './screens/RSVPsfive';
import Test2 from './screens/Test2.js';



const App = () => {
  const Stack = createNativeStackNavigator();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={Main} options={{ title: "" }} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="RePassword" component={RePassword} />
        <Stack.Screen name="LoginEmail" component={LoginEmail} />
        <Stack.Screen name="Setting" component={Setting} />
        <Stack.Screen name="Manager" component={Manager} />
        <Stack.Screen name="ListItem" component={ListItem} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Budget" component={Budget} />
        <Stack.Screen name="Management" component={Management} />
        <Stack.Screen name="Task" component={Task} />
        <Stack.Screen name="SeatedAtTable" component={SeatedAtTable} />
        <Stack.Screen name="RSVPs" component={RSVPs} />
        <Stack.Screen name="Providers" component={Providers} />
        <Stack.Screen name="ContactsList" component={ContactsList} />
        <Stack.Screen name="Document" component={Document} />
        <Stack.Screen name="Gift" component={Gift} />
        <Stack.Screen name="ResponsesScreen" component={ResponsesScreen} />
        <Stack.Screen name="EditHome" component={EditHome} />
        <Stack.Screen name="TablePlanningScreen" component={TablePlanningScreen} />
        <Stack.Screen name="ProvidersScreen" component={ProvidersScreen} />
        <Stack.Screen name="RSVPstwo" component={RSVPstwo} />
        <Stack.Screen name="RSVPsthree" component={RSVPsthree} />
        <Stack.Screen name="RSVPsfour" component={RSVPsfour} />
        <Stack.Screen name="RSVPsfive" component={RSVPsfive} />
        <Stack.Screen name="Test2" component={Test2} />

        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
