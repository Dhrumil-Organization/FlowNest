// import { LinearGradient } from 'expo-linear-gradient';
// import { useRouter } from 'expo-router';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import axios from 'axios';
// import React, { useEffect, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   Image,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import logo from '../../assets/images/logo.png';
// import { API, initAPI } from '@/common/API/dynamicAPI';
// import { theme } from '../../components/theme';

// type FieldStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// const CHECK_API = 'https://apiy.tms-webapp.com/api/check_availability';

// export default function Signup() {
//   const router = useRouter();

//   // Form fields
//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [username, setUsername] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');

//   // UI states
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [submitError, setSubmitError] = useState('');

//   // Field validation status
//   const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('idle');
//   const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle');
//   const [usernameMessage, setUsernameMessage] = useState('');
//   const [emailMessage, setEmailMessage] = useState('');

//   // Password strength
//   const [passwordStrength, setPasswordStrength] = useState(0);
//   const [passwordChecks, setPasswordChecks] = useState({
//     length: false,
//     upper: false,
//     lower: false,
//     number: false,
//     special: false,
//   });

//   // Refs for debounce timers
//   const usernameTimer = useRef<NodeJS.Timeout | null>(null);
//   const emailTimer = useRef<NodeJS.Timeout | null>(null);

//   useEffect(() => {
//     initAPI();
//   }, []);

//   // ✅ PASSWORD STRENGTH CALCULATION
//   useEffect(() => {
//     const checks = {
//       length: password.length >= 8,
//       upper: /[A-Z]/.test(password),
//       lower: /[a-z]/.test(password),
//       number: /[0-9]/.test(password),
//       special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
//     };

//     setPasswordChecks(checks);

//     const score = Object.values(checks).filter(Boolean).length;
//     setPasswordStrength(score);
//   }, [password]);

//   // ✅ HELPER: Parse check_availability response
//   // Response format:
//   // {
//   //   "success": true,
//   //   "response": { "error": true/false, "message": "..." },
//   //   "message": "..."
//   // }
//   // If response.error === false → AVAILABLE ✅
//   // If response.error === true  → TAKEN ❌
//   const parseAvailabilityResponse = (data: any) => {
//     if (data?.response?.error === false) {
//       return {
//         available: true,
//         message: data?.response?.message || 'Available',
//       };
//     }
//     return {
//       available: false,
//       message: data?.response?.message || data?.message || 'Already exists',
//     };
//   };

//   // ✅ USERNAME AVAILABILITY CHECK (with debounce)
//   const checkUsernameAvailability = async (value: string) => {
//     if (!value || value.length < 3) {
//       setUsernameStatus('idle');
//       setUsernameMessage('');
//       return;
//     }

//     // Basic format validation
//     const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
//     if (!usernameRegex.test(value)) {
//       setUsernameStatus('invalid');
//       setUsernameMessage('3-20 chars, letters/numbers/underscore only');
//       return;
//     }

//     setUsernameStatus('checking');
//     setUsernameMessage('Checking availability...');

//     try {
//       const response = await axios.post(
//         CHECK_API,
//         { username: value.trim() },
//         { headers: { 'x-platform': 'mob' } }
//       );

//       console.log('✅ USERNAME CHECK:', response.data);

//       const result = parseAvailabilityResponse(response.data);

//       if (result.available) {
//         setUsernameStatus('available');
//         setUsernameMessage(`✓ ${result.message}`);
//       } else {
//         setUsernameStatus('taken');
//         setUsernameMessage(`✗ ${result.message}`);
//       }
//     } catch (err: any) {
//       console.log('❌ USERNAME CHECK ERROR:', err?.response || err);
//       setUsernameStatus('idle');
//       setUsernameMessage('Could not verify, try again');
//     }
//   };

//   // ✅ EMAIL AVAILABILITY CHECK (with debounce)
//   const checkEmailAvailability = async (value: string) => {
//     if (!value) {
//       setEmailStatus('idle');
//       setEmailMessage('');
//       return;
//     }

//     // Email format validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(value)) {
//       setEmailStatus('invalid');
//       setEmailMessage('Enter a valid email address');
//       return;
//     }

//     setEmailStatus('checking');
//     setEmailMessage('Checking email...');

//     try {
//       const response = await axios.post(
//         CHECK_API,
//         { email: value.trim() },
//         { headers: { 'x-platform': 'mob' } }
//       );

//       console.log('✅ EMAIL CHECK:', response.data);

//       const result = parseAvailabilityResponse(response.data);

//       if (result.available) {
//         setEmailStatus('available');
//         setEmailMessage(`✓ ${result.message}`);
//       } else {
//         setEmailStatus('taken');
//         setEmailMessage(`✗ ${result.message}`);
//       }
//     } catch (err: any) {
//       console.log('❌ EMAIL CHECK ERROR:', err?.response || err);
//       setEmailStatus('idle');
//       setEmailMessage('Could not verify, try again');
//     }
//   };

//   // ✅ HANDLE USERNAME CHANGE WITH DEBOUNCE
//   const handleUsernameChange = (value: string) => {
//     setUsername(value);

//     // Reset status if user is still typing / field cleared
//     if (value.length < 3) {
//       setUsernameStatus('idle');
//       setUsernameMessage('');
//       if (usernameTimer.current) clearTimeout(usernameTimer.current);
//       return;
//     }

//     setUsernameStatus('checking');
//     setUsernameMessage('');

//     if (usernameTimer.current) {
//       clearTimeout(usernameTimer.current);
//     }

//     usernameTimer.current = setTimeout(() => {
//       checkUsernameAvailability(value);
//     }, 600);
//   };

//   // ✅ HANDLE EMAIL CHANGE WITH DEBOUNCE
//   const handleEmailChange = (value: string) => {
//     setEmail(value);

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(value)) {
//       setEmailStatus(value.length === 0 ? 'idle' : 'invalid');
//       setEmailMessage(value.length === 0 ? '' : 'Enter a valid email address');
//       if (emailTimer.current) clearTimeout(emailTimer.current);
//       return;
//     }

//     setEmailStatus('checking');
//     setEmailMessage('');

//     if (emailTimer.current) {
//       clearTimeout(emailTimer.current);
//     }

//     emailTimer.current = setTimeout(() => {
//       checkEmailAvailability(value);
//     }, 600);
//   };

//   // ✅ GET PASSWORD STRENGTH INFO
//   const getPasswordStrengthInfo = () => {
//     if (password.length === 0) {
//       return { label: '', color: '#E0E0E0', percent: 0 };
//     }
//     if (passwordStrength <= 2) return { label: 'Weak', color: '#FF4D4D', percent: 33 };
//     if (passwordStrength === 3) return { label: 'Fair', color: '#FFA726', percent: 60 };
//     if (passwordStrength === 4) return { label: 'Good', color: '#66BB6A', percent: 80 };
//     return { label: 'Strong', color: '#2E7D32', percent: 100 };
//   };

//   const strengthInfo = getPasswordStrengthInfo();

//   // ✅ VALIDATE FORM BEFORE SUBMIT
//   const validateForm = (): boolean => {
//     if (!firstName.trim()) {
//       setSubmitError('First name is required');
//       return false;
//     }
//     if (!lastName.trim()) {
//       setSubmitError('Last name is required');
//       return false;
//     }
//     if (usernameStatus !== 'available') {
//       setSubmitError('Please choose an available username');
//       return false;
//     }
//     if (emailStatus !== 'available') {
//       setSubmitError('Please use an available email');
//       return false;
//     }
//     if (passwordStrength < 5) {
//       setSubmitError('Password does not meet all requirements');
//       return false;
//     }
//     if (password !== confirmPassword) {
//       setSubmitError('Passwords do not match');
//       return false;
//     }
//     setSubmitError('');
//     return true;
//   };

//   // ✅ HANDLE SUBMIT
//   const handleSubmit = async () => {
//     if (!validateForm()) return;

//     try {
//       setIsSubmitting(true);

//       const payload = {
//         first_name: firstName.trim(),
//         last_name: lastName.trim(),
//         username: username.trim(),
//         email: email.trim(),
//         password: password,
//         password_confirmation: confirmPassword,
//       };

//       console.log('📤 SIGNUP PAYLOAD:', payload);

//       // TODO: Call signup API
//       // const response = await axios.post(
//       //   `${API}/api/signup`,
//       //   payload,
//       //   { headers: { 'x-platform': 'mob' } }
//       // );
//       // console.log('✅ SIGNUP RESPONSE:', response.data);

//       alert('Signup Successful! 🎉');
//       router.replace('/(auth)/login');
//     } catch (err: any) {
//       console.log('❌ SIGNUP ERROR:', err?.response || err);
//       setSubmitError(err?.response?.data?.message || 'Signup failed. Try again.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // ✅ GET STATUS ICON
//   const getStatusIcon = (status: FieldStatus) => {
//     switch (status) {
//       case 'checking':
//         return <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} />;
//       case 'available':
//         return <Icon name="check-circle" size={20} color="#2E7D32" />;
//       case 'taken':
//         return <Icon name="cancel" size={20} color="#D32F2F" />;
//       case 'invalid':
//         return <Icon name="error-outline" size={20} color="#FFA726" />;
//       default:
//         return null;
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       style={{ flex: 1, backgroundColor: theme.NEUTRAL_BG }}
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//     >
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: 40 }}
//       >
//         {/* 🔥 HERO SECTION */}
//         <LinearGradient
//           colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
//           style={styles.hero}
//         >
//           <TouchableOpacity
//             onPress={() => router.replace('/(auth)/login')}
//             style={styles.backBtn}
//           >
//             <Icon name="arrow-back" size={22} color="#fff" />
//             <Text style={styles.backText}>Back to Login</Text>
//           </TouchableOpacity>

//           <View style={styles.logoRow}>
//             <Image source={logo} style={styles.logo} />
//             <Text style={styles.brandName}>FlowNest</Text>
//           </View>

//           <Text style={styles.heroTitle}>Create Your Account</Text>
//           <Text style={styles.heroSubtitle}>
//             Start managing your textile business smarter
//           </Text>
//         </LinearGradient>

//         {/* 🔥 SIGNUP CARD */}
//         <View style={styles.card}>
//           <Text style={styles.cardTitle}>Sign Up</Text>
//           <Text style={styles.cardSubtitle}>
//             Fill in your details to get started
//           </Text>

//           {/* ERROR MESSAGE */}
//           {submitError ? (
//             <View style={styles.errorBox}>
//               <Icon name="error-outline" size={18} color="#D32F2F" />
//               <Text style={styles.errorText}>{submitError}</Text>
//             </View>
//           ) : null}

//           {/* 🔥 FIRST NAME & LAST NAME (Row) */}
//           <View style={styles.row}>
//             <View style={styles.halfInput}>
//               <Text style={styles.label}>First Name</Text>
//               <View style={styles.inputBox}>
//                 <Icon name="person-outline" size={20} color={theme.BRAND_GRADIENT_END} />
//                 <TextInput
//                   placeholder="John"
//                   style={styles.input}
//                   value={firstName}
//                   onChangeText={setFirstName}
//                   autoCapitalize="words"
//                 />
//               </View>
//             </View>

//             <View style={styles.halfInput}>
//               <Text style={styles.label}>Last Name</Text>
//               <View style={styles.inputBox}>
//                 <Icon name="person-outline" size={20} color={theme.BRAND_GRADIENT_END} />
//                 <TextInput
//                   placeholder="Doe"
//                   style={styles.input}
//                   value={lastName}
//                   onChangeText={setLastName}
//                   autoCapitalize="words"
//                 />
//               </View>
//             </View>
//           </View>

//           {/* 🔥 USERNAME WITH REAL-TIME CHECK */}
//           <Text style={styles.label}>Username</Text>
//           <View
//             style={[
//               styles.inputBox,
//               usernameStatus === 'available' && styles.inputSuccess,
//               (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.inputError,
//             ]}
//           >
//             <Icon name="alternate-email" size={20} color={theme.BRAND_GRADIENT_END} />
//             <TextInput
//               placeholder="johndoe123"
//               style={styles.input}
//               value={username}
//               onChangeText={handleUsernameChange}
//               autoCapitalize="none"
//               autoCorrect={false}
//             />
//             {getStatusIcon(usernameStatus)}
//           </View>
//           {usernameMessage ? (
//             <Text
//               style={[
//                 styles.helperText,
//                 usernameStatus === 'available' && styles.helperSuccess,
//                 (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.helperError,
//               ]}
//             >
//               {usernameMessage}
//             </Text>
//           ) : (
//             <Text style={styles.helperText}>
//               3-20 characters, letters, numbers, underscore only
//             </Text>
//           )}

//           {/* 🔥 EMAIL WITH REAL-TIME CHECK */}
//           <Text style={styles.label}>Email Address</Text>
//           <View
//             style={[
//               styles.inputBox,
//               emailStatus === 'available' && styles.inputSuccess,
//               (emailStatus === 'taken' || emailStatus === 'invalid') && styles.inputError,
//             ]}
//           >
//             <Icon name="email" size={20} color={theme.BRAND_GRADIENT_END} />
//             <TextInput
//               placeholder="john@example.com"
//               style={styles.input}
//               value={email}
//               onChangeText={handleEmailChange}
//               keyboardType="email-address"
//               autoCapitalize="none"
//               autoCorrect={false}
//             />
//             {getStatusIcon(emailStatus)}
//           </View>
//           {emailMessage ? (
//             <Text
//               style={[
//                 styles.helperText,
//                 emailStatus === 'available' && styles.helperSuccess,
//                 (emailStatus === 'taken' || emailStatus === 'invalid') && styles.helperError,
//               ]}
//             >
//               {emailMessage}
//             </Text>
//           ) : null}

//           {/* 🔥 PASSWORD WITH STRENGTH METER */}
//           <Text style={styles.label}>Password</Text>
//           <View style={styles.inputBox}>
//             <Icon name="lock-outline" size={20} color={theme.BRAND_GRADIENT_END} />
//             <TextInput
//               placeholder="Enter password"
//               secureTextEntry={!showPassword}
//               style={styles.input}
//               value={password}
//               onChangeText={setPassword}
//               autoCapitalize="none"
//             />
//             <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//               <Icon
//                 name={showPassword ? 'visibility-off' : 'visibility'}
//                 size={22}
//                 color={theme.BRAND_GRADIENT_END}
//               />
//             </TouchableOpacity>
//           </View>

//           {/* PASSWORD STRENGTH BAR */}
//           {password.length > 0 && (
//             <>
//               <View style={styles.strengthBarContainer}>
//                 <View
//                   style={[
//                     styles.strengthBar,
//                     {
//                       width: `${strengthInfo.percent}%`,
//                       backgroundColor: strengthInfo.color,
//                     },
//                   ]}
//                 />
//               </View>
//               <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
//                 {strengthInfo.label}
//               </Text>
//             </>
//           )}

//           {/* PASSWORD REQUIREMENTS */}
//           <View style={styles.requirementsBox}>
//             <RequirementRow met={passwordChecks.length} text="At least 8 characters" />
//             <RequirementRow met={passwordChecks.upper} text="One uppercase letter (A-Z)" />
//             <RequirementRow met={passwordChecks.lower} text="One lowercase letter (a-z)" />
//             <RequirementRow met={passwordChecks.number} text="One number (0-9)" />
//             <RequirementRow met={passwordChecks.special} text="One special character (!@#$%^&*)" />
//           </View>

//           {/* 🔥 CONFIRM PASSWORD */}
//           <Text style={styles.label}>Confirm Password</Text>
//           <View
//             style={[
//               styles.inputBox,
//               confirmPassword.length > 0 && password === confirmPassword && styles.inputSuccess,
//               confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
//             ]}
//           >
//             <Icon name="lock-outline" size={20} color={theme.BRAND_GRADIENT_END} />
//             <TextInput
//               placeholder="Re-enter password"
//               secureTextEntry={!showConfirmPassword}
//               style={styles.input}
//               value={confirmPassword}
//               onChangeText={setConfirmPassword}
//               autoCapitalize="none"
//             />
//             <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
//               <Icon
//                 name={showConfirmPassword ? 'visibility-off' : 'visibility'}
//                 size={22}
//                 color={theme.BRAND_GRADIENT_END}
//               />
//             </TouchableOpacity>
//           </View>
//           {confirmPassword.length > 0 && password !== confirmPassword && (
//             <Text style={[styles.helperText, styles.helperError]}>
//               ✗ Passwords do not match
//             </Text>
//           )}
//           {confirmPassword.length > 0 && password === confirmPassword && (
//             <Text style={[styles.helperText, styles.helperSuccess]}>
//               ✓ Passwords match
//             </Text>
//           )}

//           {/* 🔥 SUBMIT BUTTON */}
//           <LinearGradient
//             colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
//             style={styles.submitBtn}
//           >
//             <TouchableOpacity
//               onPress={handleSubmit}
//               disabled={isSubmitting}
//               style={styles.submitTouch}
//             >
//               {isSubmitting ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.submitText}>Create Account</Text>
//               )}
//             </TouchableOpacity>
//           </LinearGradient>

//           {/* 🔥 LOGIN LINK */}
//           <View style={styles.loginRow}>
//             <Text style={styles.loginText}>Already have an account? </Text>
//             <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
//               <Text style={styles.loginLink}>Login</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }

// // 🔥 REUSABLE REQUIREMENT ROW COMPONENT
// function RequirementRow({ met, text }: { met: boolean; text: string }) {
//   return (
//     <View style={styles.requirementRow}>
//       <Icon
//         name={met ? 'check-circle' : 'radio-button-unchecked'}
//         size={16}
//         color={met ? '#2E7D32' : '#999'}
//       />
//       <Text
//         style={[styles.requirementText, { color: met ? '#2E7D32' : '#666' }]}
//       >
//         {text}
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   hero: {
//     paddingTop: 60,
//     paddingBottom: 40,
//     paddingHorizontal: 25,
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//   },
//   backBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     alignSelf: 'flex-start',
//     marginBottom: 20,
//   },
//   backText: {
//     color: '#fff',
//     marginLeft: 5,
//     fontWeight: '600',
//   },
//   logoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   logo: {
//     width: 45,
//     height: 45,
//     marginRight: 10,
//   },
//   brandName: {
//     color: '#fff',
//     fontSize: 32,
//     fontWeight: '800',
//   },
//   heroTitle: {
//     color: '#fff',
//     fontSize: 24,
//     fontWeight: '700',
//     marginTop: 10,
//   },
//   heroSubtitle: {
//     color: '#EAF7FA',
//     fontSize: 14,
//     marginTop: 5,
//   },
//   card: {
//     backgroundColor: '#fff',
//     marginHorizontal: 20,
//     marginTop: -20,
//     borderRadius: 24,
//     padding: 24,
//     shadowColor: '#000',
//     shadowOpacity: 0.08,
//     shadowRadius: 15,
//     elevation: 6,
//   },
//   cardTitle: {
//     fontSize: 24,
//     fontWeight: '800',
//     color: theme.TEXT_PRIMARY,
//   },
//   cardSubtitle: {
//     color: theme.TEXT_SECONDARY,
//     marginTop: 4,
//     marginBottom: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   halfInput: {
//     width: '48%',
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: theme.TEXT_PRIMARY,
//     marginBottom: 6,
//     marginTop: 10,
//   },
//   inputBox: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#F5F8FA',
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     height: 52,
//     borderWidth: 1.5,
//     borderColor: 'transparent',
//   },
//   inputSuccess: {
//     borderColor: '#2E7D32',
//     backgroundColor: '#E8F5E9',
//   },
//   inputError: {
//     borderColor: '#D32F2F',
//     backgroundColor: '#FFEBEE',
//   },
//   input: {
//     flex: 1,
//     marginLeft: 10,
//     fontSize: 15,
//     color: theme.TEXT_PRIMARY,
//   },
//   helperText: {
//     fontSize: 12,
//     marginTop: 5,
//     marginLeft: 4,
//     color: '#888',
//   },
//   helperSuccess: {
//     color: '#2E7D32',
//     fontWeight: '600',
//   },
//   helperError: {
//     color: '#D32F2F',
//     fontWeight: '600',
//   },
//   strengthBarContainer: {
//     height: 5,
//     backgroundColor: '#E0E0E0',
//     borderRadius: 3,
//     marginTop: 8,
//     overflow: 'hidden',
//   },
//   strengthBar: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   strengthLabel: {
//     fontSize: 12,
//     fontWeight: '700',
//     marginTop: 4,
//     textAlign: 'right',
//   },
//   requirementsBox: {
//     backgroundColor: '#F8FAFC',
//     padding: 12,
//     borderRadius: 10,
//     marginTop: 10,
//     marginBottom: 5,
//   },
//   requirementRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 3,
//   },
//   requirementText: {
//     marginLeft: 8,
//     fontSize: 12,
//   },
//   errorBox: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFEBEE',
//     padding: 12,
//     borderRadius: 10,
//     marginBottom: 15,
//   },
//   errorText: {
//     color: '#D32F2F',
//     marginLeft: 8,
//     fontSize: 13,
//     fontWeight: '600',
//     flex: 1,
//   },
//   submitBtn: {
//     height: 54,
//     borderRadius: 16,
//     justifyContent: 'center',
//     marginTop: 25,
//   },
//   submitTouch: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   submitText: {
//     color: '#fff',
//     fontWeight: '700',
//     fontSize: 16,
//   },
//   loginRow: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 20,
//   },
//   loginText: {
//     color: theme.TEXT_SECONDARY,
//   },
//   loginLink: {
//     color: theme.BRAND_GRADIENT_END,
//     fontWeight: '700',
//   },
// });
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import logo from '../../assets/images/logo.png';
import { API, initAPI } from '@/common/API/dynamicAPI';
import { theme } from '../../components/theme';

type FieldStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const CHECK_API = 'https://apiy.tms-webapp.com/api/check_availability';
const SIGNUP_API = 'https://apiy.tms-webapp.com/api/signup';

export default function Signup() {
  const router = useRouter();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Field validation status
  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
  });

  // Refs for debounce timers
  const usernameTimer = useRef<NodeJS.Timeout | null>(null);
  const emailTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initAPI();
  }, []);

  // ✅ PASSWORD STRENGTH CALCULATION
  useEffect(() => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    setPasswordChecks(checks);

    const score = Object.values(checks).filter(Boolean).length;
    setPasswordStrength(score);
  }, [password]);

  // ✅ HELPER: Parse check_availability response
  const parseAvailabilityResponse = (data: any) => {
    if (data?.response?.error === false) {
      return {
        available: true,
        message: data?.response?.message || 'Available',
      };
    }
    return {
      available: false,
      message: data?.response?.message || data?.message || 'Already exists',
    };
  };

  // ✅ USERNAME AVAILABILITY CHECK (with debounce)
  const checkUsernameAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(value)) {
      setUsernameStatus('invalid');
      setUsernameMessage('3-20 chars, letters/numbers/underscore only');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    try {
      const response = await axios.post(
        CHECK_API,
        { username: value.trim() },
        { headers: { 'x-platform': 'mob' } }
      );

      console.log('✅ USERNAME CHECK:', response.data);

      const result = parseAvailabilityResponse(response.data);

      if (result.available) {
        setUsernameStatus('available');
        setUsernameMessage(`✓ ${result.message}`);
      } else {
        setUsernameStatus('taken');
        setUsernameMessage(`✗ ${result.message}`);
      }
    } catch (err: any) {
      console.log('❌ USERNAME CHECK ERROR:', err?.response || err);
      setUsernameStatus('idle');
      setUsernameMessage('Could not verify, try again');
    }
  };

  // ✅ EMAIL AVAILABILITY CHECK (with debounce)
  const checkEmailAvailability = async (value: string) => {
    if (!value) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailStatus('invalid');
      setEmailMessage('Enter a valid email address');
      return;
    }

    setEmailStatus('checking');
    setEmailMessage('Checking email...');

    try {
      const response = await axios.post(
        CHECK_API,
        { email: value.trim() },
        { headers: { 'x-platform': 'mob' } }
      );

      console.log('✅ EMAIL CHECK:', response.data);

      const result = parseAvailabilityResponse(response.data);

      if (result.available) {
        setEmailStatus('available');
        setEmailMessage(`✓ ${result.message}`);
      } else {
        setEmailStatus('taken');
        setEmailMessage(`✗ ${result.message}`);
      }
    } catch (err: any) {
      console.log('❌ EMAIL CHECK ERROR:', err?.response || err);
      setEmailStatus('idle');
      setEmailMessage('Could not verify, try again');
    }
  };

  // ✅ HANDLE USERNAME CHANGE WITH DEBOUNCE
  const handleUsernameChange = (value: string) => {
    setUsername(value);

    if (value.length < 3) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('');

    if (usernameTimer.current) {
      clearTimeout(usernameTimer.current);
    }

    usernameTimer.current = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 600);
  };

  // ✅ HANDLE EMAIL CHANGE WITH DEBOUNCE
  const handleEmailChange = (value: string) => {
    setEmail(value);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailStatus(value.length === 0 ? 'idle' : 'invalid');
      setEmailMessage(value.length === 0 ? '' : 'Enter a valid email address');
      if (emailTimer.current) clearTimeout(emailTimer.current);
      return;
    }

    setEmailStatus('checking');
    setEmailMessage('');

    if (emailTimer.current) {
      clearTimeout(emailTimer.current);
    }

    emailTimer.current = setTimeout(() => {
      checkEmailAvailability(value);
    }, 600);
  };

  // ✅ GET PASSWORD STRENGTH INFO
  const getPasswordStrengthInfo = () => {
    if (password.length === 0) {
      return { label: '', color: '#E0E0E0', percent: 0 };
    }
    if (passwordStrength <= 2) return { label: 'Weak', color: '#FF4D4D', percent: 33 };
    if (passwordStrength === 3) return { label: 'Fair', color: '#FFA726', percent: 60 };
    if (passwordStrength === 4) return { label: 'Good', color: '#66BB6A', percent: 80 };
    return { label: 'Strong', color: '#2E7D32', percent: 100 };
  };

  const strengthInfo = getPasswordStrengthInfo();

  // ✅ CHECK IF FORM IS READY (for disabled button state)
  const isFormReady = (): boolean => {
    return (
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      usernameStatus === 'available' &&
      emailStatus === 'available' &&
      passwordStrength === 5 &&
      password === confirmPassword &&
      password.length > 0
    );
  };

  // ✅ VALIDATE FORM BEFORE SUBMIT (with focus on specific field)
  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setSubmitError('First name is required');
      return false;
    }
    if (!lastName.trim()) {
      setSubmitError('Last name is required');
      return false;
    }
    if (usernameStatus === 'idle' || usernameStatus === 'checking') {
      setSubmitError('Please wait, checking username availability...');
      return false;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setSubmitError('Please choose an available username');
      return false;
    }
    if (emailStatus === 'idle' || emailStatus === 'checking') {
      setSubmitError('Please wait, checking email availability...');
      return false;
    }
    if (emailStatus === 'taken' || emailStatus === 'invalid') {
      setSubmitError('Please use an available email');
      return false;
    }
    if (passwordStrength < 5) {
      setSubmitError('Password does not meet all requirements');
      return false;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return false;
    }
    setSubmitError('');
    return true;
  };

  // ✅ HANDLE SUBMIT - FINAL SIGNUP API CALL
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');

      // 🔥 FINAL SIGNUP PAYLOAD (as you requested)
      const payload = {
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password: password,
      };

      console.log('📤 SIGNUP PAYLOAD:', payload);

      // 🔥 CALL SIGNUP API
      const response = await axios.post(
        SIGNUP_API,
        payload,
        { headers: { 'x-platform': 'mob' } }
      );

      console.log('✅ SIGNUP RESPONSE:', response.data);

      // ✅ Handle success response
      // Assuming response format similar to check_availability:
      // { success: true, response: { error: false, message: "..." } }
      if (response.data?.success === true && response.data?.response?.error === false) {
        const successMessage =
          response.data?.response?.message ||
          response.data?.message ||
          'Account created successfully!';

        alert(`🎉 ${successMessage}`);

        // Navigate to login after success
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 500);
      } else {
        // API returned error
        const errorMessage =
          response.data?.response?.message ||
          response.data?.message ||
          'Signup failed. Please try again.';
        setSubmitError(errorMessage);
      }
    } catch (err: any) {
      console.log('❌ SIGNUP ERROR:', err?.response || err);

      // Handle different error scenarios
      if (err?.response?.data?.response?.message) {
        setSubmitError(err.response.data.response.message);
      } else if (err?.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else if (err?.response?.data?.error) {
        setSubmitError(err.response.data.error);
      } else if (err?.message) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Signup failed. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ GET STATUS ICON
  const getStatusIcon = (status: FieldStatus) => {
    switch (status) {
      case 'checking':
        return <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} />;
      case 'available':
        return <Icon name="check-circle" size={20} color="#2E7D32" />;
      case 'taken':
        return <Icon name="cancel" size={20} color="#D32F2F" />;
      case 'invalid':
        return <Icon name="error-outline" size={20} color="#FFA726" />;
      default:
        return null;
    }
  };

   const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.NEUTRAL_BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 🔥 HERO SECTION */}
        <LinearGradient
          colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
          style={styles.hero}
        >
          <TouchableOpacity
            // onPress={() => router.replace('/(auth)/login')}
            onPress={goBack}
            style={styles.backBtn}
          >
            <Icon name="arrow-back" size={22} color="#fff" />
            {/* <Text style={styles.backText}>Back to Login</Text> */}
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* <View style={styles.logoRow}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.brandName}>FlowNest</Text>
          </View> */}

          <Text style={styles.heroTitle}>Create Your Account</Text>
          <Text style={styles.heroSubtitle}>
            Start managing your textile business smarter
          </Text>
        </LinearGradient>

        {/* 🔥 SIGNUP CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign Up</Text>
          <Text style={styles.cardSubtitle}>
            Fill in your details to get started
          </Text>

          {/* ERROR MESSAGE */}
          {submitError ? (
            <View style={styles.errorBox}>
              <Icon name="error-outline" size={18} color="#D32F2F" />
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}

          {/* 🔥 FIRST NAME & LAST NAME (Row) */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputBox}>
                <Icon name="person-outline" size={20} color={theme.BRAND_GRADIENT_END} />
                <TextInput
                  placeholder="John"
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
                {firstName.length > 0 && (
                  <Icon name="check-circle" size={18} color="#2E7D32" />
                )}
              </View>
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputBox}>
                <Icon name="person-outline" size={20} color={theme.BRAND_GRADIENT_END} />
                <TextInput
                  placeholder="Doe"
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
                {lastName.length > 0 && (
                  <Icon name="check-circle" size={18} color="#2E7D32" />
                )}
              </View>
            </View>
          </View>

          {/* 🔥 USERNAME WITH REAL-TIME CHECK */}
          <Text style={styles.label}>Username</Text>
          <View
            style={[
              styles.inputBox,
              usernameStatus === 'available' && styles.inputSuccess,
              (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.inputError,
            ]}
          >
            <Icon name="alternate-email" size={20} color={theme.BRAND_GRADIENT_END} />
            <TextInput
              placeholder="johndoe123"
              style={styles.input}
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {getStatusIcon(usernameStatus)}
          </View>
          {usernameMessage ? (
            <Text
              style={[
                styles.helperText,
                usernameStatus === 'available' && styles.helperSuccess,
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.helperError,
              ]}
            >
              {usernameMessage}
            </Text>
          ) : (
            <Text style={styles.helperText}>
              3-20 characters, letters, numbers, underscore only
            </Text>
          )}

          {/* 🔥 EMAIL WITH REAL-TIME CHECK */}
          <Text style={styles.label}>Email Address</Text>
          <View
            style={[
              styles.inputBox,
              emailStatus === 'available' && styles.inputSuccess,
              (emailStatus === 'taken' || emailStatus === 'invalid') && styles.inputError,
            ]}
          >
            <Icon name="email" size={20} color={theme.BRAND_GRADIENT_END} />
            <TextInput
              placeholder="john@example.com"
              style={styles.input}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {getStatusIcon(emailStatus)}
          </View>
          {emailMessage ? (
            <Text
              style={[
                styles.helperText,
                emailStatus === 'available' && styles.helperSuccess,
                (emailStatus === 'taken' || emailStatus === 'invalid') && styles.helperError,
              ]}
            >
              {emailMessage}
            </Text>
          ) : null}

          {/* 🔥 PASSWORD WITH STRENGTH METER */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputBox}>
            <Icon name="lock-outline" size={20} color={theme.BRAND_GRADIENT_END} />
            <TextInput
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={22}
                color={theme.BRAND_GRADIENT_END}
              />
            </TouchableOpacity>
          </View>

          {/* PASSWORD STRENGTH BAR */}
          {password.length > 0 && (
            <>
              <View style={styles.strengthBarContainer}>
                <View
                  style={[
                    styles.strengthBar,
                    {
                      width: `${strengthInfo.percent}%`,
                      backgroundColor: strengthInfo.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                {strengthInfo.label}
              </Text>
            </>
          )}

          {/* PASSWORD REQUIREMENTS */}
          <View style={styles.requirementsBox}>
            <RequirementRow met={passwordChecks.length} text="At least 8 characters" />
            <RequirementRow met={passwordChecks.upper} text="One uppercase letter (A-Z)" />
            <RequirementRow met={passwordChecks.lower} text="One lowercase letter (a-z)" />
            <RequirementRow met={passwordChecks.number} text="One number (0-9)" />
            <RequirementRow met={passwordChecks.special} text="One special character (!@#$%^&*)" />
          </View>

          {/* 🔥 CONFIRM PASSWORD */}
          <Text style={styles.label}>Confirm Password</Text>
          <View
            style={[
              styles.inputBox,
              confirmPassword.length > 0 && password === confirmPassword && styles.inputSuccess,
              confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
            ]}
          >
            <Icon name="lock-outline" size={20} color={theme.BRAND_GRADIENT_END} />
            <TextInput
              placeholder="Re-enter password"
              secureTextEntry={!showConfirmPassword}
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Icon
                name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                size={22}
                color={theme.BRAND_GRADIENT_END}
              />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={[styles.helperText, styles.helperError]}>
              ✗ Passwords do not match
            </Text>
          )}
          {confirmPassword.length > 0 && password === confirmPassword && (
            <Text style={[styles.helperText, styles.helperSuccess]}>
              ✓ Passwords match
            </Text>
          )}

          {/* 🔥 SUBMIT BUTTON (Disabled until form is ready) */}
          <LinearGradient
            colors={isFormReady()
              ? [theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]
              : ['#CCCCCC', '#999999']
            }
            style={styles.submitBtn}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !isFormReady()}
              style={styles.submitTouch}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {isFormReady() ? 'Create Account' : 'Complete All Fields'}
                </Text>
              )}
            </TouchableOpacity>
          </LinearGradient>

          {/* 🔥 LOGIN LINK */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🔥 REUSABLE REQUIREMENT ROW COMPONENT
function RequirementRow({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.requirementRow}>
      <Icon
        name={met ? 'check-circle' : 'radio-button-unchecked'}
        size={16}
        color={met ? '#2E7D32' : '#999'}
      />
      <Text
        style={[styles.requirementText, { color: met ? '#2E7D32' : '#666' }]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 45,
    height: 45,
    marginRight: 10,
  },
  brandName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 10,
  },
  heroSubtitle: {
    color: '#EAF7FA',
    fontSize: 14,
    marginTop: 5,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.TEXT_PRIMARY,
  },
  cardSubtitle: {
    color: theme.TEXT_SECONDARY,
    marginTop: 4,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.TEXT_PRIMARY,
    marginBottom: 6,
    marginTop: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputSuccess: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  inputError: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: theme.TEXT_PRIMARY,
  },
  helperText: {
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
    color: '#888',
  },
  helperSuccess: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  helperError: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  strengthBarContainer: {
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'right',
  },
  requirementsBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  requirementText: {
    marginLeft: 8,
    fontSize: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 25,
  },
  submitTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: theme.TEXT_SECONDARY,
  },
  loginLink: {
    color: theme.BRAND_GRADIENT_END,
    fontWeight: '700',
  },
});
