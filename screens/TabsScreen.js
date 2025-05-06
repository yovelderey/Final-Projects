import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
    authDomain: "final-project-d6ce7.firebaseapp.com",
    projectId: "final-project-d6ce7",
    storageBucket: "final-project-d6ce7.appspot.com",
    messagingSenderId: "1056060530572",
    appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
    measurementId: "G-LD61QH3VVP",
  });
}

const DynamicViewScreen = ({ route, navigation }) => {
  const id = route.params.id;
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const insets = useSafeAreaInsets();

  const [contactsData, setContactsData] = useState({});
  const [categories, setCategories] = useState({
    "מגיעים": [],
    "לא מגיעים": [],
    "אולי": [],
    "נשלח": [],
    "לא נשלח": [],
    "מוזמנים": [],
  });

  const [activeCategory, setActiveCategory] = useState("מוזמנים");
  const [searchQuery, setSearchQuery] = useState("");

  /** 🟢 פונקציה לניקוי והשוואת מספרים */
  const normalizePhoneNumber = (phone) => {
    return phone.replace(/\D/g, '').replace(/^972/, '0'); // מסיר רווחים ותווים לא רצויים
  };

  /** 🟢 טעינת אנשי קשר */
  useEffect(() => {
    if (user) {
      const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      onValue(contactsRef, (snapshot) => {
        if (snapshot.exists()) {
          console.log("📞 אנשי קשר שהתקבלו:", snapshot.val());
          setContactsData(snapshot.val());
        } else {
          console.log("🚫 אין אנשי קשר");
          setContactsData({});
        }
      });
    }
  }, [user, id]);

  /** 🟢 טעינת קטגוריות "מגיעים", "לא מגיעים", "אולי" */
  useEffect(() => {
    if (user) {
        const responsesRef = ref(database, `Events/${user.uid}/${id}/responses`);
        onValue(responsesRef, (snapshot) => {
            if (!snapshot.exists()) {
                console.log("🚫 אין נתונים תחת responses!");
                return;
            }

            const responsesData = snapshot.val();
            console.log("🔹 נתונים שהתקבלו מ- responses:", responsesData);

            const updatedCategories = {
                "מגיעים": [],
                "לא מגיעים": [],
                "אולי": [],
            };

            Object.entries(responsesData).forEach(([guestId, response]) => {
                const guestName = response.guestName || "אורח לא ידוע";
                const numberOfGuests = response.numberOfGuests || 1;
                const responseType = response.response || "ללא תשובה";
                const timestamp = response.timestamp || null;

                const matchingContact = Object.values(contactsData).find(
                    contact => contact.recordID === guestId
                );
                
                let phone = matchingContact ? matchingContact.phoneNumbers : "מספר לא ידוע";
                phone = normalizePhoneNumber(phone); // ✅ נרמול מספר טלפון

                // ⏳ המרת timestamp לתאריך קריא
                let formattedTime = "לא ידוע";
                if (timestamp) {
                    const date = new Date(timestamp);
                    const hours = date.getHours().toString().padStart(2, "0");
                    const minutes = date.getMinutes().toString().padStart(2, "0");
                    const day = date.getDate().toString().padStart(2, "0");
                    const month = (date.getMonth() + 1).toString().padStart(2, "0");

                    formattedTime = `${hours}:${minutes} | ${day}/${month}`;
                }

                // 🔹 הצגת זמן קבלת התגובה בתוך סוגריים מרובעים
                const displayText = `${guestName} (${numberOfGuests}) - ${phone}  [${formattedTime}]`;

                if (responseType === "מגיע") {
                    updatedCategories["מגיעים"].push(displayText);
                } else if (responseType === "אולי") {
                    updatedCategories["אולי"].push(displayText);
                } else if (responseType === "לא מגיע") {
                    updatedCategories["לא מגיעים"].push(displayText);
                }
            });

            setCategories((prev) => ({
                ...prev,
                ...updatedCategories,
            }));
        });
    }
}, [user, id, contactsData]);








const getTotalGuests = () => {
  if (activeCategory !== "מגיעים") return null;

  return categories["מגיעים"].reduce((total, item) => {
      const match = item.match(/\((\d+)\)/);
      const numGuests = match ? parseInt(match[1], 10) : 1;
      return total + numGuests;
  }, 0);
};


  /** 🟢 טעינת "נשלח" ו-"לא נשלח" מה-whatsapp */

  useEffect(() => {
    if (user) {
        const whatsappRef = ref(database, `whatsapp/${user.uid}/${id}`);
        onValue(whatsappRef, (snapshot) => {
            if (!snapshot.exists()) {
                console.log("🚫 אין הודעות");
                return;
            }

            const messages = snapshot.val();
            const updatedCategories = {
                "נשלח": [],
                "לא נשלח": [],
            };

            Object.values(messages).forEach((msg) => {
                const rawPhone = msg?.formattedContacts || "מספר לא ידוע";
                const cleanedPhone = normalizePhoneNumber(rawPhone); // ✅ נרמול מספר טלפון

                const matchingContact = Object.values(contactsData).find(
                    (contact) => normalizePhoneNumber(contact.phoneNumbers) === cleanedPhone
                );

                const contactName = matchingContact ? matchingContact.displayName : "שם לא ידוע";
                const contactDisplay = `${contactName} - ${cleanedPhone}`;

                if (msg.status === "sent") {
                    updatedCategories["נשלח"].push(contactDisplay); // ✅ נרמול גם ל"נשלח"
                } else if (msg.status === "error") {
                    updatedCategories["לא נשלח"].push(contactDisplay); // ✅ נרמול ל"לא נשלח"
                }
            });

            setCategories((prev) => ({
                ...prev,
                ...updatedCategories,
            }));
        });
    }
}, [user, id, contactsData]);



useEffect(() => {
  if (user) {
      const messagesRef = ref(database, `whatsapp/${user.uid}/${id}`);
      const responsesRef = ref(database, `Events/${user.uid}/${id}/responses`);

      onValue(messagesRef, (snapshot) => {
          const newSent = [];
          const sentContacts = new Set();
          const contactDetails = {};

          if (snapshot.exists()) {
              Object.values(snapshot.val()).forEach((msg) => {
                  const rawPhone = msg?.formattedContacts || "מספר לא ידוע";
                  const cleanedPhone = normalizePhoneNumber(rawPhone);

                  const contact = Object.values(contactsData).find(
                      (c) => normalizePhoneNumber(c.phoneNumbers) === cleanedPhone
                  );

                  const contactName = contact ? contact.displayName : "שם לא ידוע";
                  const contactDisplay = `${contactName} - ${cleanedPhone}`;

                  if (msg.status === "sent") {
                      newSent.push(contactDisplay);
                      sentContacts.add(cleanedPhone);
                      contactDetails[cleanedPhone] = contactName;
                  }
              });
          }

          // ✅ רק אם הנתונים באמת השתנו, נעדכן את state (ומונעים לולאה אינסופית)
          setCategories((prev) => {
              if (JSON.stringify(prev["נשלח"]) !== JSON.stringify(newSent)) {
                  return { ...prev, "נשלח": newSent };
              }
              return prev;
          });

          // שליפה של כל מי שנמצא ב"מגיעים", "לא מגיעים", "אולי" כדי להסירם מ"ללא מענה"
          onValue(responsesRef, (responseSnapshot) => {
              const respondedContacts = new Set();

              if (responseSnapshot.exists()) {
                  Object.entries(responseSnapshot.val()).forEach(([_, response]) => {
                      if (response.phoneNumbers) {
                          respondedContacts.add(normalizePhoneNumber(response.phoneNumbers));
                      }
                  });
              }

              setCategories((prev) => {
                  const newNoResponse = prev["נשלח"].filter(item => {
                      const phone = normalizePhoneNumber(item.split(" - ")[1]);
                      return (
                          !respondedContacts.has(phone) &&
                          !prev["מגיעים"].some(entry => normalizePhoneNumber(entry.split(" - ")[1]) === phone) &&
                          !prev["לא מגיעים"].some(entry => normalizePhoneNumber(entry.split(" - ")[1]) === phone) &&
                          !prev["אולי"].some(entry => normalizePhoneNumber(entry.split(" - ")[1]) === phone)
                      );
                  });

                  // ✅ עדכון רק אם יש שינוי בנתונים
                  if (JSON.stringify(prev["טרם השיבו"]) !== JSON.stringify(newNoResponse)) {
                      return { ...prev, "טרם השיבו": newNoResponse };
                  }
                  return prev;
              });
          });
      });
  }
}, [user, id, contactsData]); // ✅ אין תלות ב-categories! נמנע רינדור אינסופי




  /** 🟢 טעינת "מוזמנים" */
  useEffect(() => {
    if (user) {
        const allContacts = Object.values(contactsData).map((contact) => {
            const name = contact?.displayName || "שם לא ידוע";
            const phone = contact?.phoneNumbers || "מספר לא ידוע";
            const cleanedPhone = normalizePhoneNumber(phone); // ✅ נרמול מספר

            return `${name} - ${cleanedPhone}`;
        });

        setCategories((prev) => ({
            ...prev,
            "מוזמנים": allContacts,
        }));
    }
}, [user, id, contactsData]);

  /** 🟢 פילטור נתונים לפי חיפוש */
  const filteredData = categories[activeCategory].filter((item) =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /** 🟢 הצגת נתונים */
  const renderItem = ({ item, index }) => {
    console.log("📋 מציג פריט ברשימה:", item);

    // בדיקה אם ה- item מכיל את הנתונים בצורה תקינה
    let guestName = "אורח לא ידוע";
    let numGuests = "1";
    let phone = "מספר לא ידוע";

    if (typeof item === "string" && item.includes(" - ")) {
        const parts = item.split(" - ");
        if (parts.length === 2) {
            const nameAndGuests = parts[0].trim();
            phone = parts[1].trim();

            const match = nameAndGuests.match(/^(.*?)\s\((\d+)\)$/);
            if (match) {
                guestName = match[1] || "אורח לא ידוע";
                numGuests = match[2] || "1";
            } else {
                guestName = nameAndGuests;
            }
        }
    }

    return (
        <View
            style={[
                styles.listItemContainer,
                { backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9F9F9" },
            ]}
        >
            <Text style={styles.contactPhone}>{phone}</Text> 
            <Text style={styles.numGuests}>({numGuests}) </Text>
            <Text style={styles.contactName}>{guestName}</Text>
        </View>
    );
};

  return (
    <View style={styles.container}>
    {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>אישורי הגעה</Text>
      </View>
  
    {/* Category Buttons */}
    <View style={styles.buttonsContainer}>
  {Object.keys(categories).map((category) => {
    const totalGuests = category === "מגיעים" ? getTotalGuests() : null;

    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          activeCategory === category && styles.activeCategoryButton,
        ]}
        onPress={() => {
          setActiveCategory(category);
          setSearchQuery(""); // Reset search when switching category
        }}
      >
        <Text
          style={[
            styles.categoryButtonText,
            activeCategory === category && styles.activeCategoryButtonText,
          ]}
        >
          {category} ({categories[category].length}
          {totalGuests !== null ? `) [${totalGuests}]` : ")"}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

  


    {/* Search Bar */}
    <TextInput
      style={styles.searchBar}
      placeholder="חפש לפי שם או מספר"
      placeholderTextColor="#999" // צבע טקסט placeholder
      value={searchQuery}
      textAlign="right" // יישור טקסט לימין

      onChangeText={setSearchQuery}
    />

{activeCategory === "מגיעים" && (
    <Text style={styles.totalGuestsText}>
        סך הכל מגיעים: {getTotalGuests()}
    </Text>
)}


  
    {/* Data List */}
    <FlatList
      data={filteredData} // שימוש בנתונים המסוננים
      renderItem={renderItem}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={{ flexGrow: 1 }}
      ListEmptyComponent={<Text style={styles.emptyText}>אין נתונים להצגה</Text>}
    />
  </View>
  
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
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
    bottom: 20,
  },
  backButtonText: {
    fontSize: 29,
    color: 'white',
  },
  title: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: -10,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    margin: 5,
    borderWidth: 1,
    borderColor: "#6C63FF",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  activeCategoryButton: {
    backgroundColor: "#6C63FF",
  },
  categoryButtonText: {
    color: "#6C63FF",
    fontWeight: "bold",
  },
  activeCategoryButtonText: {
    color: "#FFFFFF",
  },
  listItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between", // מיקום שם ומספר בצדדים מנוגדים
    alignItems: "center",
    marginBottom: 12,
    padding: 15,
    borderRadius: 12, // פינות מעוגלות
    elevation: 4, // צללים לאנדרואיד
    shadowColor: "#000", // צללים ל-iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  listItem: {
    fontSize: 16,
  },
  contactName: {
    textAlign: "right", // יישור לימין
    color: "#333",
    fontWeight: "bold", // הדגשת שם
    fontSize: 16,
  },
contactPhone: {
    textAlign: "left", // מספר טלפון בשמאל
    flex: 1, // תופס מקום מצד שמאל
    color: "#777",
    fontStyle: "italic",
    fontSize: 14,
},
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
    fontSize: 16,
  },
  searchBar: {
    borderWidth: 0, // ללא גבולות
    borderRadius: 12, // פינות מעוגלות
    paddingHorizontal: 15, // ריווח פנימי בצדדים
    paddingVertical: 10, // ריווח פנימי מלמעלה ולמטה
    backgroundColor: "#FFFFFF", // צבע רקע לבן
    shadowColor: "#000", // צבע צל
    shadowOffset: { width: 0, height: 3 }, // מיקום צל
    shadowOpacity: 0.1, // שקיפות צל
    shadowRadius: 5, // טשטוש צל
    elevation: 4, // צללים לאנדרואיד
    marginHorizontal: 10, // ריווח מהצדדים
    marginBottom: 10, // ריווח מתחת
    fontSize: 16, // גודל טקסט
    color: "#333", // צבע טקסט
  },
  numGuests: {
    textAlign: "center", // המספרים באמצע עם סוגריים
    flex: 0, // תופס מקום שווה באמצע
    color: "#555",
    fontSize: 16,
},
totalGuestsText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "bold",
    color: "black",
    marginBottom: 10, // ריווח מתחת
},

});

export default DynamicViewScreen;
