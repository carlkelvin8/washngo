import { StyleSheet, Text, View } from 'react-native';
export function TrackingMap() { return <View style={styles.frame}><Text style={styles.text}>Live map is available in the iOS and Android app.</Text></View>; }
const styles = StyleSheet.create({ frame: { height: 180, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF', padding: 24 }, text: { color: '#102A43', textAlign: 'center', fontWeight: '700' } });
