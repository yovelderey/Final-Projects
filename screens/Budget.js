import React, { useState, useEffect } from 'react';
import { View, Text, Modal, FlatList, TextInput,Image, StyleSheet, StatusBar, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set, get, remove } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';



const Budget = (props) => {
  const id = props.route.params.id;
  const initialData = [
    [true, 'מחיר', 'מקדמה', 'תאריך', 'הוצאה'],
    ...Array.from({ length: 4 }, () => Array(5).fill(''))
  ];

  const [tableData, setTableData] = useState(initialData);
  const [checked, setChecked] = useState(Array(5).fill(false));
  const [sumNumericColumn, setSumNumericColumn] = useState(Array(5).fill(0));
  const [spend, setSpend] = useState('');
  const [eventDetails, setEventDetails] = useState({});
  const [deleteIndex, setDeleteIndex] = useState('');
  const insets = useSafeAreaInsets();
  const [totalCheckedSum, setTotalCheckedSum] = useState(0); // סך הכל מחיר
  const [totalCheckedCount, setTotalCheckedCount] = useState(0); // מספר הסימונים
  const navigation = useNavigation();
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState("");
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

const fixedColors = [
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
  
    // חישוב סך הכל סימונים וסכום
    calculateTotals(newTableData);
  };
  
  const handleCalculatorInput = (value) => {
    if (value === "=") {
      try {
        const result = eval(calculatorInput); // חישוב הביטוי
        setCalculatorInput(String(result));
      } catch (error) {
        Alert.alert("שגיאה", "ביטוי לא חוקי");
      }
    } else if (value === "C") {
      setCalculatorInput(""); // ניקוי המסך
    } else {
      setCalculatorInput((prev) => prev + value); // הוספת ערך להזנה
    }
  };

  const calculateTotals = (data) => {
    const totalSum = data.reduce((sum, row) => {
      const price = row[1] || '';
      const numericValue = parseFloat(price.replace(/[^0-9.-]/g, '')) || 0;
      return row[0] ? sum + numericValue : sum;
    }, 0);
  
    const totalCount = data.filter(row => row[0]).length;
  
    setTotalCheckedSum(totalSum);
    setTotalCheckedCount(totalCount);
  
    // עדכון spend במצב וב-Firebase
    setSpend(totalSum);
    if (user) {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/spend`);
      set(databaseRef, totalSum).catch((error) => {
        Alert.alert('שגיאה', `אירעה שגיאה בעת עדכון spend: ${error.message}`);
      });
    }
  };
  
  
  
  useEffect(() => {
    if (tableData.length > 0) {
      calculateTotals(tableData);
    }
  }, [tableData]);
  

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

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const databaseRef = ref(database, `Events/${user.uid}/${id}/`);
          const snapshot = await get(databaseRef);
          const fetchedData = snapshot.val();

          if (fetchedData) {
            setEventDetails(fetchedData); // Set the fetched event details
          }

          return () => clearInterval(intervalId);

        } catch (error) {
         // console.error("Error fetching data: ", error);
        }
      }
    };


    fetchData();
  }, [user, id]);

  const handleExportToExcel = async () => {
    try {
      // יצירת נתוני הטבלה
      const data = tableData.map((row) => ({
        Checked: row[0] ? 'V' : '',
        Price: row[1],
        Advance: row[2],
        Date: row[3],
        Expense: row[4],
      }));
  
      // יצירת וורקבוק ושיט
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget Data');
  
      // המרת הנתונים לבינארי
      const excelData = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  
      // יצירת נתיב לשמירת הקובץ
      const filePath = `${FileSystem.documentDirectory}BudgetData.xlsx`;
  
      // כתיבת הקובץ
      await FileSystem.writeAsStringAsync(filePath, excelData, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      // שיתוף או פתיחת הקובץ
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert('הצלחה', 'הקובץ נשמר בתיקיית המסמכים.');
      }
    } catch (error) {
      Alert.alert('שגיאה', `שגיאה בייצוא הקובץ: ${error.message}`);
    }
  };

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
    if (tableData.length <= 1) {
      Alert.alert('שגיאה', 'חייבת להישאר לפחות שורה אחת.');
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
    }))).catch(error => {
      Alert.alert('שגיאה', `אירעה שגיאה בעת עדכון הנתונים: ${error.message}`);
    });
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
          Alert.alert('נשמר בהצלחה!', 'הנתונים נשמרו במערכת.');
        })
        .catch(error => {
          Alert.alert('שגיאה בשמירה', `אירעה שגיאה בעת שמירת הנתונים: ${error.message}`);
        });


    }
  };

  // פונקציה לבחירת צבע אקראי מתוך הרשימה



  const screenWidth = Dimensions.get('window').width;

  // Pie chart data
  const pieData = tableData.map((row, index) => ({
    name: row[4]?.trim() || `נתון ${index + 1}`, // שימוש בערך בעמודה האחרונה או ברירת מחדל
    amount: parseFloat(row[1]?.replace(/[^0-9.-]/g, '')) || 0, // סכום מעמודת "מחיר"
    color: fixedColors[index % fixedColors.length], // צבע קבוע לפי אינדקס
    legendFontColor: '#7F7F7F',
    legendFontSize: 15,
  }));
  
  
  

  return (
    <ImageBackground source={require('../assets/backgruond_pro.png')} style={styles.background}>
        <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
        
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>ניהול תקציב</Text>
        </View>
          <View style={styles.buttonRow}>
            <View style={styles.leftIcons}>

            <TouchableOpacity onPress={() => setIsCalculatorVisible(true)} style={styles.calculatorButton}>
              <Icon name="calculator" size={18} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAddRow}
              style={styles.removeButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRemoveLastRow}
              style={styles.removeButton}>
              <Text style={styles.removeButtonText}>-</Text>
            </TouchableOpacity>
            
          </View>
        </View>

        <View style={styles.container}>
        <View style={styles.tableContainer}>
          <FlatList
            data={tableData}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>

          <View style={styles.row2}>
        
            <View style={styles.section}>
              <Text style={styles.header3}>מספר עסקאות</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>{totalCheckedCount}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.header3}>סך הכל עלות</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>{totalCheckedSum}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.header3}>ממוצע למוזמן</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>
                  {Math.round(totalCheckedSum / (eventDetails.counter_contacts || 1))}
                </Text>
              </View>
            </View>


            <View style={styles.section}>
              <Text style={styles.header3}>מספר טבלאות</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>{tableData.length}</Text>
              </View>
            </View>
          </View>

            <PieChart
              data={pieData}
              width={screenWidth}
              height={150}
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
    <View style={styles.exportButtonContainer}>
    <TouchableOpacity style={styles.exportButton} onPress={handleExportToExcel}>
      <Text style={styles.exportButtonText}>ייצוא לאקסל</Text>
    </TouchableOpacity>
  </View>

{/* מחשבון */}
      <Modal
        visible={isCalculatorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCalculatorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.calculatorContainer}>
            <TextInput
              style={styles.calculatorInput}
              value={calculatorInput}
              editable={false}
              placeholder="0"
              placeholderTextColor="#aaa"
            />
            <View style={styles.calculatorButtons}>
              {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "C", "0", ".", "=", "+"].map((value, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    value === "C" && styles.clearButton, // סגנון ייחודי לכפתור C
                    value === "=" && styles.equalsButton, // סגנון ייחודי לכפתור =
                  ]}
                  onPress={() => handleCalculatorInput(value)}
                >
                  <Text style={styles.buttonText}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsCalculatorVisible(false)}
            >
              <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    justifyContent: 'space-between', // פיזור הכפתורים באופן אחיד
    alignItems: 'center',
    marginBottom: -40,
    marginHorizontal: 5, // הוספת רווחים בצדדים
  },

  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    width: '100%',
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 50, // מרווח עליון מתחשב ב-Safe Area
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20, // ממקם את הכפתור בתחתית ה-`header`
  },
  backButtonText: {
    fontSize: 29,
    color: 'white',
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
  header3: {
    fontSize: 14,
    color: 'rgba(108, 99, 255, 0.9)',
    marginBottom: 5,
    fontWeight: 'bold',
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
  summaryText: {
  fontSize: 16,
  color: 'black',
  marginBottom: -12,
  marginLeft: 20, // רווח בין כפתורים

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
    width: '47%',
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
    width: '47%',
    alignItems: 'center',
    textAlign: 'center',
    marginLeft: 3, // רווח בין כפתורים

  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  imageback: {
    width: 25,
    height: 25,

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
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Align items to the right
    marginTop: -40, // Add some space from the top
    marginRight: 10, // Space between buttons
    marginBottom: 5,

  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 30,

  },
  removeButtonText: {
    color: '#fff',
    fontSize: 30,
  },
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-around',  // פיזור אחיד של הסקשנים
    alignItems: 'center',
    width: '100%',                   // הרחבת השורה לרוחב מלא
    paddingHorizontal: 0,    
  },
  section: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,     // הקטנת המרווח בין הסקשנים כדי לתת יותר מקום לרוחב
  },
  priceContainer: {
    paddingVertical: 10,       // רווח פנימי אנכי
    paddingHorizontal: 10,     // רווח פנימי אופקי
    borderRadius: 15,          // פינות מעוגלות
    borderWidth: 1,
    width: '100%',             // הרחבת הרוחב למלוא הקונטיינר
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,             // גובה מינימלי לקונטיינר
    flexDirection: 'row',  
    borderColor: 'rgba(108, 99, 255, 0.9)',   // סידור אופקי של התוכן
  },
  
  textPrice: {
    fontSize: 14,              // גודל טקסט קטן יותר כדי להתאים מספרים גדולים
    color: 'rgba(108, 99, 255, 0.9)',
    textAlign: 'center',       // יישור מרכזי של הטקסט
    flexShrink: 1,     
    fontWeight: 'bold',
    // מניעת שבירת השורה על ידי הקטנת האלמנט במידת הצורך
  },

  buttonText: {
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  calculatorContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  calculatorInput: {
    width: "100%",
    height: 70,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    fontSize: 32,
    textAlign: "right",
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  calculatorButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
button: {
  width: "22%", // כפתור בגודל של רבע שורה עם ריווח
  height: 70,
  backgroundColor: "#000",
  borderRadius: 5,
  justifyContent: "center",
  alignItems: "center",
  margin: 4, // רווח סביב הכפתור
},
  clearButton: {
    backgroundColor: "#FF6347",
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: "#FF4500",
    padding: 10,
    borderRadius: 5,
    width: "40%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
  },
equalsButton: {
  backgroundColor: "#32CD32", // כפתור "=" בירוק
},
exportButton: {
  backgroundColor: '#4CAF50',
  padding: 10,
  borderRadius: 15,
  alignItems: 'center',
  marginBottom: 16,
  width: '90%',
  alignItems: 'center',
  textAlign: 'center',
},
exportButtonText: {
  color: '#fff',
  fontSize: 18,
},
exportButtonContainer: {
  justifyContent: 'center', // יישור אנכי למרכז
  alignItems: 'center',    // יישור אופקי למרכז
  marginVertical: 20,      // רווח אנכי
},
});

export default Budget;
