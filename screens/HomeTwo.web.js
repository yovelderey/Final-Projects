import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { getDatabase, ref, set } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ===== Firebase Setup =====
const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// ===== Components =====

const InputCard = ({ label, placeholder, value, onChangeText, icon, keyboardType = 'default' }) => (
  <View style={styles.inputCard}>
    <View style={styles.inputIconBox}>{icon}</View>
    <View style={styles.inputContent}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.inputField}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  </View>
);

const CheckboxRow = ({ checked, onPress, label, subLabel }) => (
  <TouchableOpacity style={styles.checkboxRow} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
      {checked && <Text style={styles.checkMark}>✓</Text>}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.checkLabel}>{label}</Text>
      {subLabel && <Text style={styles.checkSubLabel}>{subLabel}</Text>}
    </View>
  </TouchableOpacity>
);

// ===== Icons (Text Based) =====
const IconLocation = () => <Text style={{fontSize: 22}}>📍</Text>;
const IconGuests = () => <Text style={{fontSize: 22}}>👥</Text>;
const IconBudget = () => <Text style={{fontSize: 22}}>💰</Text>;
const IconAddress = () => <Text style={{fontSize: 22}}>🗺️</Text>;
const IconPhone = () => <Text style={{fontSize: 22}}>📞</Text>;

const HomeTwo = ({ route }) => {
  const navigation = useNavigation();
  const { width } = Dimensions.get('window');
  
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const { finalEventName } = route.params;

  // Form States
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [Address, setAddress] = useState('');
  const [NumberPhone, setNumberPhone] = useState('');

  // Payment States
  const [wantCardGifts, setWantCardGifts] = useState(false);
  const [payerFullName, setPayerFullName] = useState('');
  const [payerId, setPayerId] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  
  const [enableBit, setEnableBit] = useState(false);
  const [bitLink, setBitLink] = useState('');
  
  const [enablePayBox, setEnablePayBox] = useState(false);
  const [payboxLink, setPayboxLink] = useState('');

  // Modals
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [creditPolicyVisible, setCreditPolicyVisible] = useState(false);

  // Animations & Validation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const baseOk = Numberofguests && budget && eventLocation && Address && NumberPhone;
    
    const creditOk = !wantCardGifts || (payerFullName && payerId && bankNumber && bankBranch && bankAccount);
    const bitOk = !wantCardGifts || (!enableBit || bitLink);
    const payboxOk = !wantCardGifts || (!enablePayBox || payboxLink);

    setCanProceed(!!(baseOk && creditOk && bitOk && payboxOk));
  }, [Numberofguests, budget, eventLocation, Address, NumberPhone, wantCardGifts, payerFullName, payerId, bankNumber, bankBranch, bankAccount, enableBit, bitLink, enablePayBox, payboxLink]);

  const handleSave = async () => {
    if (!user?.uid) { Alert.alert('שגיאה', 'אין משתמש מחובר'); return; }
    
    try {
      const basePath = `Events/${user.uid}/${finalEventName}`;
      
      await set(ref(database, `${basePath}/Numberofguests/`), Numberofguests);
      await set(ref(database, `${basePath}/budget/`), budget);
      await set(ref(database, `${basePath}/eventLocation/`), eventLocation);
      await set(ref(database, `${basePath}/Address/`), Address);
      await set(ref(database, `${basePath}/Phone_Number/`), NumberPhone);

      const paymentsPayload = {
        wantCardGifts: !!wantCardGifts,
        credit: wantCardGifts ? {
          fullName: payerFullName || '',
          id: payerId || '',
          bankNumber: bankNumber || '',
          branch: bankBranch || '',
          account: bankAccount || '',
        } : null,
        bit: {
          enabled: wantCardGifts ? !!enableBit : false,
          link: wantCardGifts && enableBit ? (bitLink || '') : '',
        },
        paybox: {
          enabled: wantCardGifts ? !!enablePayBox : false,
          link: wantCardGifts && enablePayBox ? (payboxLink || '') : '',
        },
        updatedAt: Date.now(),
      };

      await set(ref(database, `${basePath}/payments/`), paymentsPayload);
      navigation.navigate('HomeThree', { Numberofguests, finalEventName });

    } catch (e) {
      console.log('Save Error:', e);
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את הנתונים');
    }
  };

  return (
    <View style={styles.container}>
      {/* אלמנט גרפי עדין ברקע */}
      <View style={styles.bgGraphic} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
            
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Text style={styles.backArrow}>‹</Text>
              </TouchableOpacity>
              
              <View>
                <Text style={styles.title}>פרטי האירוע</Text>
                <Text style={styles.subtitle}>בוא נכיר את האירוע שלך לעומק</Text>
              </View>
            </View>

            {/* Main Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>פרטים כלליים</Text>
              
              <InputCard 
                label="שם המקום / אולם" 
                placeholder="לדוגמה: אולמי הנסיכה" 
                value={eventLocation} 
                onChangeText={setEventLocation}
                icon={<IconLocation />} 
              />
              
              <View style={styles.row}>
                <View style={{flex: 1, marginRight: 8}}>
                  <InputCard 
                    label="כמות מוזמנים" 
                    placeholder="משוער" 
                    value={Numberofguests} 
                    onChangeText={setNumberofguests}
                    keyboardType="numeric"
                    icon={<IconGuests />} 
                  />
                </View>
                <View style={{flex: 1, marginLeft: 8}}>
                  <InputCard 
                    label="תקציב (₪)" 
                    placeholder="תקציב משוער" 
                    value={budget} 
                    onChangeText={setBudget}
                    keyboardType="numeric"
                    icon={<IconBudget />} 
                  />
                </View>
              </View>

              <InputCard 
                label="כתובת מלאה (לניווט)" 
                placeholder="רחוב, עיר ומספר" 
                value={Address} 
                onChangeText={setAddress}
                icon={<IconAddress />} 
              />
              
              <InputCard 
                label="טלפון ליצירת קשר" 
                placeholder="050-0000000" 
                value={NumberPhone} 
                onChangeText={setNumberPhone}
                keyboardType="phone-pad"
                icon={<IconPhone />} 
              />
            </View>

            {/* Gifts Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>מתנות ותשלומים</Text>
              
              <View style={styles.card}>
                <CheckboxRow 
                  checked={wantCardGifts} 
                  onPress={() => setWantCardGifts(!wantCardGifts)} 
                  label="אפשר קבלת מתנות באשראי/אפליקציות"
                  subLabel="מאפשר לאורחים לשלוח מתנה דיגיטלית בקלות"
                />

                {wantCardGifts && (
                  <View style={styles.expandedSection}>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>עלות השירות הינה תשלום חד-פעמי. לפרטים נוספים:</Text>
                      <TouchableOpacity onPress={() => setCreditPolicyVisible(true)}>
                        <Text style={styles.linkText}>לחץ למדיניות השירות</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.subHeader}>פרטי חשבון בנק (לזיכוי)</Text>
                    <InputCard label="שם מלא (בעל החשבון)" placeholder="ישראל ישראלי" value={payerFullName} onChangeText={setPayerFullName} icon={<Text>👤</Text>} />
                    <InputCard label="תעודת זהות" placeholder="מספר ת.ז." value={payerId} onChangeText={setPayerId} keyboardType="numeric" icon={<Text>🆔</Text>} />
                    
                    <View style={styles.row}>
                       <View style={{flex: 1, marginRight: 5}}>
                          <InputCard label="בנק" placeholder="קוד בנק" value={bankNumber} onChangeText={setBankNumber} keyboardType="numeric" icon={<Text>🏦</Text>} />
                       </View>
                       <View style={{flex: 1, marginLeft: 5}}>
                          <InputCard label="סניף" placeholder="מס' סניף" value={bankBranch} onChangeText={setBankBranch} keyboardType="numeric" icon={<Text>🔢</Text>} />
                       </View>
                    </View>
                    <InputCard label="מספר חשבון" placeholder="מס' חשבון" value={bankAccount} onChangeText={setBankAccount} keyboardType="numeric" icon={<Text>💳</Text>} />

                    <Text style={[styles.subHeader, {marginTop: 20}]}>אפליקציות תשלום</Text>
                    
                    <CheckboxRow checked={enableBit} onPress={() => setEnableBit(!enableBit)} label="הוסף קישור Bit" />
                    {enableBit && <TextInput style={styles.simpleInput} placeholder="הדבק כאן את הקישור ל-Bit" value={bitLink} onChangeText={setBitLink} />}

                    <CheckboxRow checked={enablePayBox} onPress={() => setEnablePayBox(!enablePayBox)} label="הוסף קישור PayBox" />
                    {enablePayBox && <TextInput style={styles.simpleInput} placeholder="הדבק כאן את הקישור ל-PayBox" value={payboxLink} onChangeText={setPayboxLink} />}
                  </View>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => setTermsModalVisible(true)} style={styles.termsLink}>
                <Text style={styles.termsText}>בלחיצה על המשך אני מאשר את תנאי השימוש</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainBtn, !canProceed && styles.mainBtnDisabled]}
                onPress={handleSave}
                disabled={!canProceed}
              >
                <Text style={styles.mainBtnText}>שמור והמשך</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      <Modal visible={termsModalVisible} transparent animationType="slide" onRequestClose={() => setTermsModalVisible(false)}>
        <View style={styles.modalOverlay}>
           <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>תנאי שימוש ופרטיות</Text>
              <ScrollView style={{maxHeight: 300}}>
                 <Text style={styles.modalText}>כאן יופיעו תנאי השימוש...</Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setTermsModalVisible(false)}>
                 <Text style={styles.modalCloseText}>סגור</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

      <Modal visible={creditPolicyVisible} transparent animationType="slide" onRequestClose={() => setCreditPolicyVisible(false)}>
        <View style={styles.modalOverlay}>
           <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>מדיניות מתנות באשראי</Text>
              <ScrollView style={{maxHeight: 200}}>
                 <Text style={styles.modalText}>כאן תופיע מדיניות התשלומים...</Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCreditPolicyVisible(false)}>
                 <Text style={styles.modalCloseText}>הבנתי</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' }, // רקע לבן-אפרפר נקי
  bgGraphic: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(79, 70, 229, 0.05)' }, // כתם צבע עדין
  
  scrollContainer: { paddingBottom: 50, paddingTop: 10, paddingHorizontal: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 10 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, elevation: 2 },
  backArrow: { fontSize: 24, marginTop: -4, color: '#374151' },
  
  title: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'right', fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12, textAlign: 'right', paddingRight: 4 },
  
  inputCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1
  },
  inputIconBox: { width: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  inputContent: { flex: 1 },
  inputLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700', textAlign: 'right', marginBottom: 2 },
  inputField: { fontSize: 16, color: '#111827', fontWeight: '600', textAlign: 'right', padding: 0, height: 24 },
  
  row: { flexDirection: 'row-reverse' },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  
  checkboxRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  checkboxActive: { backgroundColor: '#4F46E5' },
  checkMark: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  checkLabel: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'right' },
  checkSubLabel: { fontSize: 12, color: '#6B7280', textAlign: 'right' },

  expandedSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  infoBox: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoText: { fontSize: 12, color: '#4338CA', textAlign: 'right' },
  linkText: { fontSize: 12, color: '#4F46E5', fontWeight: 'bold', textDecorationLine: 'underline', marginTop: 4, textAlign: 'right' },
  
  subHeader: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, textAlign: 'right' },
  simpleInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, textAlign: 'right', marginTop: 8, marginBottom: 16, fontSize: 14 },

  footer: { alignItems: 'center', marginTop: 10 },
  termsLink: { marginBottom: 16 },
  termsText: { fontSize: 12, color: '#6B7280', textDecorationLine: 'underline' },
  mainBtn: { backgroundColor: '#4F46E5', width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  mainBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 500, backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 14, color: '#4B5563', lineHeight: 22, textAlign: 'right' },
  modalCloseBtn: { marginTop: 20, alignSelf: 'center', padding: 10 },
  modalCloseText: { color: '#4F46E5', fontWeight: '700' },
});

export default HomeTwo;