import React, { useState, useEffect } from 'react';
import { View, Text, Image, FlatList, TextInput, StyleSheet, StatusBar, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set, get, remove } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const Budget = (props) => {
  const id = props.route.params.id;
  const initialData = [
    [true, 'מחיר', 'מקדמה', 'תאריך', 'הוצאה'],
    ...Array.from({ length: 9 }, () => Array(5).fill(''))
  ];

  const [tableData, setTableData] = useState(initialData);
  const [checked, setChecked] = useState(Array(10).fill(false));
  const [sumNumericColumn, setSumNumericColumn] = useState(Array(10).fill(0));
  const [spend, setSpend] = useState('');
  const [eventDetails, setEventDetails] = useState({});
  const [deleteIndex, setDeleteIndex] = useState('');
  const insets = useSafeAreaInsets();

  const database = getDatabase();
  const user = firebase.auth().currentUser;
// הגדרת רשימת הצבעים
const standardColors = [
  "#FF6347", // Tomato
  "#FF4500", // OrangeRed
  "#FFD700", // Gold
  "#ADFF2F", // GreenYellow
  "#32CD32", // LimeGreen
  "#1E90FF", // DodgerBlue
  "#8A2BE2", // BlueViolet
  "#FF1493", // DeepPink
  "#FF69B4", // HotPink
  "#B0C4DE", // LightSteelBlue
  "#00FA9A", // MediumSpringGreen
  "#FF8C00", // DarkOrange
  "#D2691E", // Chocolate
  "#4B0082", // Indigo
  "#F08080", // LightCoral
  "#00CED1", // DarkTurquoise
  "#8B0000", // DarkRed
  "#800080", // Purple
  "#D3D3D3", // LightGray
  "#C71585", // MediumVioletRed
];

  const handleInputChange = (text, rowIndex, colIndex) => {
    const newData = [...tableData];
    newData[rowIndex][colIndex] = text;
    setTableData(newData);
  };

  const handleCheckBoxChange = (rowIndex) => {
    const newChecked = [...checked];
    newChecked[rowIndex] = !newChecked[rowIndex];
    setChecked(newChecked);

    const newTableData = [...tableData];
    newTableData[rowIndex][0] = newChecked[rowIndex];
    setTableData(newTableData);

    if (newChecked[rowIndex]) {
      let sum = 0;
      tableData[rowIndex].forEach((cell, colIndex) => {
        if (colIndex === 1) {
          const numericValue = parseFloat(cell.replace(/[^0-9.-]/g, ''));
          if (!isNaN(numericValue)) {
            sum += numericValue;
          }
        }
      });
      const newSumNumericColumn = [...sumNumericColumn];
      newSumNumericColumn[rowIndex] = sum;
      setSumNumericColumn(newSumNumericColumn);
    } else {
      const newSumNumericColumn = [...sumNumericColumn];
      newSumNumericColumn[rowIndex] = 0;
      setSumNumericColumn(newSumNumericColumn);
    }
  };

  const handleDeleteBudgetItems = () => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
    remove(databaseRef)
      .then(() => {
        Alert.alert('Deleted Successfully!', 'The budget items have been deleted from Firebase.');
      })
      .catch(error => {
        Alert.alert('Delete Error', `An error occurred while deleting the budget items: ${error.message}`);
      });
  };

  const handleCustomAction = (index) => {
    console.log(`Custom action button at index ${index} pressed`);
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

  const fetchDataFromFirebase = () => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
    if (user) {
      get(databaseRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const formattedData = data.map(item => [
              item.checked,
              item.price,
              item.content,
              item.date,
              item.name
            ]);
            setTableData(formattedData);
            const checkedData = formattedData.map(row => row[0]);
            setChecked(checkedData);
          }
        })
        .catch(error => {
          Alert.alert('שגיאה בקריאה', `אירעה שגיאה בעת קריאת הנתונים: ${error.message}`);
        });
    }
  };

  useEffect(() => {
    fetchDataFromFirebase();

    const fetchData = async () => {
      if (user) {
        try {
          const databaseRef = ref(database, `Events/${user.uid}/${id}/spend`);
          const snapshot = await get(databaseRef);
          const fetchedData = snapshot.val();
          if (fetchedData) {
            setEventDetails(fetchedData);
          }
        } catch (error) {
          console.error("Error fetching data: ", error);
        }
      }
    };

    fetchData();
  }, [user, id]);

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {renderCheckBox(index)}
      {item.slice(1).map((cell, colIndex) => (
        <TextInput
          key={`${index}-${colIndex}`}
          style={styles.cell}
          value={cell}
          onChangeText={(text) => {
            if (colIndex === 4) {
              const numericValue = text.replace(/[^0-9]/g, '');
              handleInputChange(numericValue, index, colIndex + 1);
            } else {
              handleInputChange(text, index, colIndex + 1);
            }
          }}
          keyboardType={colIndex === 4 ? 'numeric' : 'default'}
        />
      ))}
    </View>
  );

  const handleRemoveLastRow = () => {
    if (tableData.length === 0) {
      Alert.alert('שגיאה', 'אין שורות להסרה.');
      return;
    }
    const newTableData = tableData.slice(0, -1);
    setTableData(newTableData);
    const newChecked = checked.slice(0, -1);
    setChecked(newChecked);
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
    set(databaseRef, newTableData.map(row => ({
      checked: row[0],
      price: row[1],
      content: row[2],
      date: row[3],
      name: row[4]
    })))
      .catch(error => {});
  };

  const handleAddRow = () => {
    const newRow = [false, '', '', '', ''];
    const newTableData = [...tableData, newRow];
    setTableData(newTableData);
    const newChecked = [...checked, false];
    setChecked(newChecked);
    const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
    set(databaseRef, newTableData.map(row => ({
      checked: row[0],
      price: row[1],
      content: row[2],
      date: row[3],
      name: row[4]
    })))
      .catch(error => {});
  };

  const handleSaveToFirebase = () => {
    const dataToSave = tableData.map(row => ({
      checked: row[0],
      price: row[1],
      content: row[2],
      date: row[3],
      name: row[4]
    }));

    if (user) {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
      set(databaseRef, dataToSave)
        .then(() => {
          Alert.alert('נשמר בהצלחה!', 'הנתונים נשמרו בבסיס הנתונים של Firebase.');
        })
        .catch(error => {
          Alert.alert('שגיאה בשמירה', `אירעה שגיאה בעת שמירת הנתונים: ${error.message}`);
        });

      const databaseRef2 = ref(database, `Events/${user.uid}/${id}/spend`);
      set(databaseRef2, sumNumericColumn.reduce((acc, cur) => acc + cur, 0))
        .catch(error => {});
    }
  };

  // פונקציה לבחירת צבע אקראי מתוך הרשימה
  const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * standardColors.length);
  return standardColors[randomIndex];
}


  const screenWidth = Dimensions.get('window').width;

  // Pie chart data
  const pieData = tableData.map((row, index) => ({
    name: `נתון ${index + 1}`,
    amount: parseFloat(row[1].replace(/[^0-9.-]/g, '')) || 0,
    color: getRandomColor(), // השתמש בצבע אקראי מתוך הרשימה
    legendFontColor: '#7F7F7F',
    legendFontSize: 15
  }));
  

  return (
    <ImageBackground source={require('../assets/backgruond_pro.png')} style={styles.background}>
      <View style={styles.container}>
        <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
        
        <Text style={styles.header2}>תקציב</Text>


        <View style={styles.leftIcons}>
          <TouchableOpacity
            onPress={handleAddRow}
            style={styles.removeButton}>
            <Image source={require('../assets/plus.png')} style={styles.icon2} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRemoveLastRow}
            style={styles.removeButton}>
            <Image source={require('../assets/minus-sign.png')} style={styles.icon2} />
          </TouchableOpacity>
        </View>

        <View style={styles.tableContainer}>
          <FlatList
            data={tableData}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>

        <PieChart
          data={pieData}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
        />

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveToFirebase}>
            <Text style={styles.saveButtonText}>שמור</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteBudgetItems}>
            <Text style={styles.deleteButtonText}>מחק פריטים</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity 
          onPress={() => props.navigation.navigate('ListItem', { id })}
          style={[styles.showPasswordButton, { position: 'absolute', top: '7%', left: '4%' }]}
        >
          <Image source={require('../assets/back_icon2.png')} style={styles.backIcon} />
        </TouchableOpacity>
    </ImageBackground>
  );
};
const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  header2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 30,
    padding: 10,

    alignItems: 'center',
    textAlign: 'center',

  },
  button: {
    backgroundColor: '#FFC0CB',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
  },
  tableContainer: {
    flex: 1,
    marginBottom: 16,
  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 280, // רווח בין כפתורים

  },
  backIcon: {
    width: 40,
    height: 40,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 8,
  },
  cell: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 16,
    width: '50%',
    alignItems: 'center',
    textAlign: 'center',

  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 16,
    width: '50%',
    alignItems: 'center',
    textAlign: 'center',
    marginLeft: 8, // רווח בין כפתורים

  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    marginLeft: 10,
    padding: 5,
  },
  icon2: {
    width: 20,
    height: 20,

  },
  checkboxText: {
    fontSize: 20,
  }
  
});

export default Budget;
