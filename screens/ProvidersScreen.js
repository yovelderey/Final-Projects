import React, { useState, useEffect, use } from 'react';
import { View, Text, ScrollView,TextInput, TouchableOpacity,StatusBar, FlatList, Modal, StyleSheet, Alert } from 'react-native';
import { getDatabase, ref, set, get } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

const ProvidersScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [providers, setProviders] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', rating: '', review: '', phone: '', category: '', location: '', createdAt: '' });
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false); // מצב להצגת כל הקטגוריות
  const [showAllModalCategories, setShowAllModalCategories] = useState(false);
  const [isMyReviewsActive, setIsMyReviewsActive] = useState(false);

  const regions = ['דרום', 'מרכז', 'צפון'];
  const categories = [
    'צלם',
    'DJ',
    'אולם',
    'אלכוהול',
    'איפור',
    'הגברה',
    'מפיק',
    'קייטרינג',
    'שמלת כלה',
    'חליפת חתן',
    'עיצוב אירועים',
    'מגנטים',
    'הפקת אירועים',
    'רכב חתונה',
    'אטרקציות',
    'זיקוקים',
    'בלונים',
    'בר קפה',
    'להקה',
    'רב לחתונה',
    'סידורי פרחים',
    'תא צילום',
    'וידאו והקרנה',
    'שירותי בר',
    'שף פרטי',
    'שירותי ניקיון',
    'אחר'
  ];
  
  const categoriesToShow = categories && categories.length > 4 
  ? (showAllCategories ? categories : categories.slice(0, 4))
  : categories || [];

  const countByCategory = () => {
    const counts = {};
    categories.forEach((category) => {
      counts[category] = providers.filter((provider) => provider.category === category).length;
    });
    return counts;
  };
  const countByRegion = () => {
    const counts = {};
    regions.forEach((region) => {
      counts[region] = providers.filter((provider) => provider.location === region).length;
    });
    return counts;
  };
  
  const regionCounts = countByRegion();
  const categoryCounts = countByCategory();
  const visibleCategories = Array.isArray(categories)
  ? (showAllCategories ? categories : categories.slice(0, 4))
  : [];

  const database = getDatabase();
  const user = firebase.auth().currentUser;
  const applyFilters = (region, category) => {
  let filtered = providers;

  if (region) {
    filtered = filtered.filter((provider) => provider.location === region);
  }

  if (category) {
    filtered = filtered.filter((provider) => provider.category === category);
  }

  setFilteredProviders(filtered);
};

  useEffect(() => {
    loadFromFirebase();
  }, []);

  const loadFromFirebase = () => {
    if (!user) {
      Alert.alert('שגיאה', 'המשתמש אינו מחובר.');
      return;
    }
  
    const databaseRef = ref(database, `Providers`);
  
    get(databaseRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
  
          // הפוך את האובייקט למערך ושמור את ה-id
          const loadedProviders = Object.values(data).map((provider) => ({
            ...provider, // שמור את כל הנתונים הקיימים
            id: provider.id || '', // ודא שה-id של המשתמש קיים
          }));
  
          setProviders(loadedProviders);
          setFilteredProviders(loadedProviders);
        } else {
          setProviders([]);
          setFilteredProviders([]);
        }
      })
      .catch((error) => Alert.alert('Error', error.message));
  };
  

  


  const saveToFirebase = (updatedProviders) => {
    if (!user) {
      Alert.alert('שגיאה', 'המשתמש אינו מחובר.');
      return;
    }

    const databaseRef = ref(database, `Providers`);

    set(databaseRef, updatedProviders)
      .then(() => console.log('הנתונים נשמרו בהצלחה!'))
      .catch((error) => Alert.alert('Error', error.message));
  };
  const handleRegionFilter = (region) => {
    const newRegion = selectedRegion === region ? '' : region;
    setSelectedRegion(newRegion);
    applyFilters(newRegion, selectedCategory);
  };
  
  const handleCategoryFilter = (category) => {
    const newCategory = selectedCategory === category ? '' : category;
    setSelectedCategory(newCategory);
    applyFilters(selectedRegion, newCategory);
  };
  
  const addProvider = () => {
    // וולידציה לשדות החובה
    if (!newProvider.name) {
      Alert.alert('שגיאה', 'נא להזין את שם הספק.');
      return;
    }
    if (!newProvider.rating) {
      Alert.alert('שגיאה', 'נא להזין ציון.');
      return;
    }
    if (!newProvider.review) {
      Alert.alert('שגיאה', 'נא להזין ביקורת.');
      return;
    }
    if (!newProvider.phone) {
      Alert.alert('שגיאה', 'נא להזין מספר טלפון.');
      return;
    }
    if (!newProvider.category) {
      Alert.alert('שגיאה', 'נא לבחור קטגוריה.');
      return;
    }
    if (!newProvider.location) {
      Alert.alert('שגיאה', 'נא לבחור אזור.');
      return;
    }
    if (!newProvider.review || newProvider.review.length > 150) {
      Alert.alert('שגיאה', 'הביקורת חייבת להיות באורך של עד 150 תווים.');
      return;
    }
    if (!newProvider.name || newProvider.name.length > 20) {
      Alert.alert('שגיאה', 'שם הספק חייב להיות באורך של עד 20 תווים.');
      return;
    }
    // הבטחת שכל השדות אינם undefined
    const providerToAdd = {
      id: user.uid || '',
      name: newProvider.name?.trim() || '',
      rating: newProvider.rating?.trim() || '0',
      review: newProvider.review?.trim() || '',
      phone: newProvider.phone?.trim() || '',
      category: newProvider.category || '',
      location: newProvider.location || '', // הבטחת שה-`location` לא יהיה undefined
      createdAt: new Date().toISOString(), // שמירת תאריך ושעה בפורמט ISO

    };
    

    
  
    const updatedProviders = [...providers, providerToAdd];
    setProviders(updatedProviders);
    setFilteredProviders(updatedProviders);
    saveToFirebase(updatedProviders);
    setNewProvider({ id: user.uid ,name: '', rating: '', review: '', phone: '', category: '', location: '', createdAt: '' });
    setShowAddModal(false);
  };
  
  const formatDate = (isoString) => {
    if (!isoString) return 'תאריך לא זמין';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0'); // הוספת אפסים למספרים בודדים
    const month = String(date.getMonth() + 1).padStart(2, '0'); // חודשים הם מ-0 עד 11
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
  
    return `${day}.${month}.${year} - ${hours}:${minutes}`;
  };
  
  const handleSearch = (query) => {
    setSearchQuery(query);

    const filtered = providers.filter((provider) =>
      provider.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProviders(filtered);
  };
  const handleClearFilters = () => {
    setSelectedRegion('');
    setSelectedCategory('');
    setSearchQuery('');
    setFilteredProviders(providers);
  };
  
  const handleFilter = () => {
    let filtered = providers;

    if (selectedRegion) {
      filtered = filtered.filter((provider) => provider.location === selectedRegion);
    }

    if (selectedCategory) {
      filtered = filtered.filter((provider) => provider.category === selectedCategory);
    }

    setFilteredProviders(filtered);
  };

  const deleteProvider = (providerToDelete) => {
    Alert.alert(
      'אישור מחיקה',
      'האם אתה בטוח שברצונך למחוק את הספק?',
      [
        { text: 'בטל', style: 'cancel' },
        {
          text: 'מחק',
          onPress: () => {
            const updatedProviders = providers.filter(
              (provider) => provider !== providerToDelete
            );
            setProviders(updatedProviders);
            setFilteredProviders(updatedProviders);
  
            // מחיקה מ-Firebase
            const databaseRef = ref(database, `Providers`);
            set(databaseRef, updatedProviders)
              .then(() => Alert.alert('הכרטיסייה נמחקה בהצלחה!'))
              .catch((error) => Alert.alert('Error', error.message));
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const handleMyReviews = () => {
    if (isMyReviewsActive) {
      // אם הכפתור פעיל, החזר את כל הכרטיסיות
      setFilteredProviders(providers);
      setIsMyReviewsActive(false);
    } else {
      // אם הכפתור לא פעיל, סנן לפי המשתמש הנוכחי
      const myReviews = providers.filter((provider) => provider.id === user.uid);
      setFilteredProviders(myReviews);
      setIsMyReviewsActive(true);
    }
  };
  
  

  const renderProvider = ({ item }) => {
    if (!item) return null;
  
    const creationDate = item.createdAt ? formatDate(item.createdAt) : 'תאריך לא זמין';

    return (
      <View style={styles.providerCard}>
        <Text style={styles.providerName}>{item.name || 'לא ידוע'}</Text>
        <View style={styles.separator} />
  
        <Text style={styles.providerDetail}>{item.location || 'לא ידוע'}</Text>
        <Text style={styles.providerDetail}>{item.category || 'לא מוגדר'}</Text>
        <Text style={styles.providerDetail}>{item.phone || 'לא זמין'}</Text>
  
        <View style={styles.providerDetailStars}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Text
              key={index}
              style={[
                styles.star,
                index < item.rating ? styles.filledStar : styles.emptyStar,
              ]}
            >
              ★
            </Text>
          ))}
        </View>
        <Text style={styles.providerDetail}>{item.review || 'אין ביקורת'}</Text>
  
        <Text style={styles.creationDate}>תאריך: {creationDate}</Text>

        {item.id === user.uid && ( // בדיקה אם המשתמש הנוכחי הוסיף את הכרטיסייה
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteProvider(item)}
          >
            <Text style={styles.deleteButtonText}>מחק</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  

  return (
    
    <View style={styles.container}>

      <StatusBar backgroundColor="rgba(108, 99, 255, 0.9)" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>מאגר ספקים</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButtonSmall} onPress={() => setShowAddModal(true)}>
            <Text style={styles.backButtonText2}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

    <View style={styles.container2}>



    {/* חיפוש */}
    <TextInput
      style={styles.searchInput}
      placeholder="חפש ספק..."
      value={searchQuery}
      onChangeText={(query) => handleSearch(query)}
    />
        <Text style={styles.filterTitle2}>לחץ על כפתור ה - + להוספת ספק חדש</Text>
        <Text style={styles.filterTitle2}>והמלץ לנו על החוויה שלך.</Text>

        <Text style={styles.filterTitle}>בחר אזור:</Text>
        <View style={styles.filterButtonsRight}>
          {regions.map((region) => (
            <TouchableOpacity
              key={region}
              style={[
                styles.filterButton,
                selectedRegion === region && styles.selectedFilterButton,
              ]}
              onPress={() => handleRegionFilter(region)}
            >
              <Text style={styles.filterButtonText}>
                {region} ({regionCounts[region]})
              </Text>
            </TouchableOpacity>
          ))}

          

          <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>סינון לפי קטגוריה:</Text>
          <View style={styles.filterButtonsRight}>
          <View style={styles.categoryButtonsContainer}>
            {visibleCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterButton,
                  selectedCategory === category && styles.selectedFilterButton,
                ]}
                onPress={() => handleCategoryFilter(category)}
              >
                <Text style={styles.filterButtonText}>
                  {category} ({categoryCounts[category]})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* כפתור עוד... / פחות... */}
          <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)} style={styles.toggleButton}>
            <Text style={styles.toggleButtonText}>
              {showAllCategories ? 'פחות...' : 'עוד...'}
            </Text>
          </TouchableOpacity>
        </View>

        </View>
    </View>
    
    <View style={styles.totalContainer}>
  <Text style={styles.totalProvidersText}>
    סך הכל: {filteredProviders.length}
  </Text>

  <TouchableOpacity
  style={[
    styles.myReviewsButton,
    isMyReviewsActive && styles.myReviewsButtonActive,
  ]}
  onPress={handleMyReviews}
>
  <Text style={styles.myReviewsButtonText}>הביקורות שלי</Text>
</TouchableOpacity>

  
  <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
    <Text style={styles.clearButtonText}>נקה סינונים</Text>
  </TouchableOpacity>


</View>



      {/* רשימת ספקים */}
      <FlatList
        data={filteredProviders}
        renderItem={renderProvider}
        keyExtractor={(item, index) => index.toString()}
        numColumns={2} // הגדרה של 2 עמודות בשורה
        contentContainerStyle={styles.listContainer}
      />

<Modal
  visible={showAddModal}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setShowAddModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      {/* כפתור X בצד ימין למעלה */}
      <TouchableOpacity style={styles.closeButton} onPress={() => setShowAddModal(false)}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.modalTitle}>הוסף ספק חדש</Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
      <TextInput
        style={styles.modalInput}
        placeholder="שם הספק"
        value={newProvider.name}
        maxLength={300} // הגבלת מספר האותיות ל-300
        onChangeText={(text) => setNewProvider({ ...newProvider, name: text })}
        textAlign="right"
      />

        <TextInput
          style={styles.modalInput}
          placeholder="מספר טלפון"
          keyboardType="number-pad"
          value={newProvider.phone}
          onChangeText={(text) => setNewProvider({ ...newProvider, phone: text })}
          textAlign="right"
        />

      <TextInput
          style={styles.modalInput2}
          placeholder="ביקורת"
          value={newProvider.review}
          maxLength={300} // הגבלת מספר האותיות ל-300
          onChangeText={(text) => setNewProvider({ ...newProvider, review: text })}
          textAlign="right"
          multiline={true}
          numberOfLines={4}
        />

        <Text style={styles.filterTitle}>ציון:</Text>
        <View style={styles.starContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setNewProvider({ ...newProvider, rating: star.toString() })}>
              <Text style={[styles.star, newProvider.rating >= star && styles.filledStar]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterTitle}>בחר קטגוריה:</Text>
        <View style={styles.filterButtons}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                newProvider.category === category && styles.selectedFilterButton,
              ]}
              onPress={() => setNewProvider({ ...newProvider, category })}
            >
              <Text style={styles.filterButtonText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterTitle}>בחר אזור:</Text>
        <View style={styles.filterButtons}>
          {regions.map((region) => (
            <TouchableOpacity
              key={region}
              style={[
                styles.filterButton,
                newProvider.location === region && styles.selectedFilterButton,
              ]}
              onPress={() => setNewProvider({ ...newProvider, location: region })}
            >
              <Text style={styles.filterButtonText}>{region}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.modalButton} onPress={addProvider}>
          <Text style={styles.modalButtonText}>הוסף</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>

    </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  container2: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    marginTop: 25,
    color: '#fff', // טקסט כהה

    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: -20,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#6c63ff',
    textAlign: 'center', // ממרכז את הטקסט
  },
  
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  listContainer: {
    justifyContent: 'space-between',
  },
  headerButtons: {
    marginBottom: -23,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    
  },
  star: {
    fontSize: 30,
    color: '#ccc',
    marginHorizontal: 5,
  },
  
  filledStar: {
    color: '#ffd700', // צבע זהב עבור כוכבים מלאים
  },
  imageback: {
    width: 40,
    height: 40,
    position: 'absolute',
    top: 30, 
    left: -180, 
    zIndex: 0, 
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#6c63ff', // צבע גבול סגול תואם את צבע הכפתורים
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'right',
    borderRadius: 10, // פינות מעוגלות יותר
    marginBottom: 20,
    backgroundColor: '#f0f0f0', // רקע לבן כדי להבליט את שורת החיפוש
    fontSize: 16, // גודל טקסט ברור יותר
    color: '#333', // צבע טקסט כהה
    shadowColor: '#000', // צל להבלטת השורה
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // הצללה לאנדרואיד
  },
  
  scrollView: {
    flexGrow: 1,
  },
  filterContainer: {
    marginBottom: 6,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right', // יישור הטקסט לימין
    marginBottom: 5,
  },
  filterTitle2: {
    fontSize: 15,
    textAlign: 'center', // יישור הטקסט לימין
    marginBottom: 5,
  },
  filterButtonsRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end', // מצמיד את הכפתורים לצד ימין
    marginTop: 10,
  },
  
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end', // מצמיד את הכפתורים לצד ימין

    marginTop: 10,
  },
  filterButton: {
    backgroundColor: '#ddd',
    padding: 7,
    borderRadius: 8,
    margin: 5,
  },
  showMoreButtonText: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  
  selectedFilterButton: {
    backgroundColor: '#6c63ff',
  },
  filterButtonText: {
    color: '#000',
  },
  providersList: {
    marginBottom: 20,
  },
  providerCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%', // קובייה שתופסת כמעט חצי רוחב עם רווח קטן
    marginHorizontal: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    
    elevation: 2,
  },
  backButton: {
    padding: 10,
    marginLeft: -10, // מרווח משמאל לכפתור פלוס

  },
  backButtonText: {
    fontSize: 29,
    color: '#fff',
  },
  backButtonText2: {
    fontSize: 36,
    color: '#fff',
    marginRight: -12, // מרווח מימין לכפתור חזרה


  },
  addButtonSmall: {
    fontSize: 27,

  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    maxHeight: '70%', // מגביל את גובה המודל ל-80% מגובה המסך
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  clearButton: {
    backgroundColor: '#ff4d4d',
    padding: 5,
    borderRadius: 8,
  },
  
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  
  scrollView: {
    flexGrow: 1,
  },
  
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalInput2: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    height: 100,        // ניתן להגדיר גובה קבוע לתיבה
    textAlignVertical: 'top',  // להתחיל את הטקסט מהחלק העליון
  },
  
  modalButton: {
    backgroundColor: '#6c63ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerDetail: {
    fontSize: 15, // הקטנת גודל הטקסט של הפרטים
    marginBottom: 2, // הקטנת המרווחים בין הפרטים
    color: '#000',
    textAlign: 'center', // ממרכז את הטקסט של הפרטים
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  addButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  
  addButtonTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  totalProvidersText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 7,
  },
  icon2: {
    width: 20,
    height: 20,

  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
  
  closeButtonText: {
    fontSize: 24,
    color: 'red',
    fontWeight: 'bold',
  },
  
  toggleButton: {
    backgroundColor: '#ddd',
    padding: 7,
    borderRadius: 8,
    margin: 5,
  },
  
  toggleButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  categoryButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  toggleButton: {
    backgroundColor: '#ddd',
    padding: 7,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start', // שומר על יישור הכפתור עם הקטגוריות
  },
  toggleButton: {
    padding: 7,
    marginTop: 10,
    alignSelf: 'flex-start', // יישור עם כפתורי הקטגוריות
  },
  providerDetailStars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // ממרכז את הכוכבים

    marginBottom: 2,
  },
  
  star: {
    fontSize: 16,
    marginHorizontal: 1,
  },
  
  filledStar: {
    color: '#ffd700', // צבע זהב לכוכבים מלאים
  },
  
  emptyStar: {
    color: '#ccc', // צבע אפור לכוכבים ריקים
  },
  deleteButton: {
  backgroundColor: '#ff4d4d',
  padding: 8,
  borderRadius: 8,
  marginTop: 10,
  alignItems: 'center',
},
deleteButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: 'bold',
},
myReviewsButton: {
  backgroundColor: '#6c63ff',
  padding: 2,
  borderRadius: 8,
  marginLeft: 90,
  borderWidth: 2,
  borderColor: 'transparent', // גבול שקוף כברירת מחדל
},

myReviewsButtonActive: {
  borderColor: '#ffd700', // מסגרת זהב כאשר הכפתור פעיל
},


myReviewsButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},
creationDate: {
  fontSize: 12,
  color: '#888',
  marginTop: 10,
  textAlign: 'center',
},

});

export default ProvidersScreen;
