import React, { useRef, useState } from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet , TouchableOpacity,ScrollView,Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';

const SeatedAtTable = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  const initialData = [
    [true, 'מחיר', 'תוכן', 'תאריך', 'שם'],
    ...Array.from({ length: 9 }, () => Array(5).fill(''))
  ];

  const [tableData, setTableData] = useState(initialData);
  const [checked, setChecked] = useState(Array(10).fill(false));

  const handleInputChange = (text, rowIndex, colIndex) => {
    const newData = [...tableData];
    newData[rowIndex][colIndex] = text;
    setTableData(newData);
  };

  const handleCheckBoxChange = (rowIndex) => {
    const newChecked = [...checked];
    newChecked[rowIndex] = !newChecked[rowIndex];
    setChecked(newChecked);
    Alert.alert('Button Pressed', `Button at index ${rowIndex} pressed`);

  };

  const handleCustomAction = (index) => {
    console.log(`Custom action button at index ${index} pressed`);
    Alert.alert('Button Pressed', `Button at index ${index} pressed`);
  };

  const renderCheckBox = (index) => {
    return (
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleCheckBoxChange(index)}
      >
        <Text style={styles.checkboxText}>
          {checked[index] ? 'V' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {renderCheckBox(index)}
      {item.slice(1).map((cell, colIndex) => (
        <TextInput
  key={`${index}-${colIndex}`}
  style={styles.cell}
  value={cell}
  onChangeText={(text) => handleInputChange(text, index, colIndex + 1)}
  keyboardType={colIndex === 4 ? 'numeric' : 'default'} // הוספת keyboardType לתא האחרון בכל שורה
/>
      ))}
      <TouchableOpacity
        style={styles.customAction}
        onPress={() => {
          console.log('Custom action button pressed');
          handleCustomAction(index);
        }}
      >
        <Text style={styles.customActionText}>פעולה מותאמת אישית</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ניהול תקציב</Text>
      <Text style={styles.title2}>ניתן לסמן עד עשרה פריטים, כל עמודה מהוה הוספת ערך חדש לסכום הכללי</Text>

      <View style={styles.tableContainer}>
        <FlatList
          data={tableData}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.table}
        />
      </View>

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
    justifyContent: 'center',
    alignItems: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',

  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,

  },

  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 10,
    width: 90, // Adjust width as needed
    textAlign: 'center',
  },
  headerText: {
    fontWeight: 'bold',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  title2: {
    fontSize: 12,
    marginBottom: 200,
  },
  backIcon: {
    width: 50,
    height: 50,

  },
});

export default SeatedAtTable;
