import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { friendlyError } from '@/lib/errors';
import { signIn } from '@/services/auth.service';

const c = { blue: '#2166F3', deep: '#1647B9', navy: '#11233F', muted: '#66758D', canvas: '#F5F8FF', line: '#DCE5F2', white: '#FFF', red: '#D64545' };

export default function LoginScreen() {
  const [error, setError] = useState(''); const [showPassword, setShowPassword] = useState(false);
  const { width } = useWindowDimensions(); const wide = width >= 860;
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const submit = handleSubmit(async (values) => { setError(''); try { await signIn(values.email, values.password); } catch (cause) { setError(friendlyError(cause)); } });
  return <SafeAreaView style={s.safe}><View style={s.glowTop} /><View style={s.glowBottom} />
    <ScrollView contentContainerStyle={[s.scroll, wide && s.scrollWide]} keyboardShouldPersistTaps="handled"><View style={[s.shell, wide && s.shellWide]}>
      <View style={[s.hero, wide && s.heroWide]}>
        <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>W</Text><View style={s.logoBubble} /></View><Text style={s.brand}>Wash<Text style={s.brandAccent}>Ngo</Text></Text></View>
        <View style={s.heroCopy}><View style={s.eyebrowPill}><Text style={s.eyebrow}>PICK UP  ·  CLEAN  ·  DELIVER</Text></View><Text style={[s.headline, wide && s.headlineWide]}>Fresh clothes.{"\n"}<Text style={s.headlineAccent}>Zero hassle.</Text></Text><Text style={s.subhead}>Laundry care that fits your day. We pick it up, clean it right, and bring it back fresh.</Text></View>
        {wide ? <View style={s.serviceRow}>{[['⌖','Doorstep pickup'],['✦','Trusted partners'],['✓','Live updates']].map(([icon,label]) => <View key={label} style={s.serviceItem}><View style={s.serviceIcon}><Text>{icon}</Text></View><Text style={s.serviceText}>{label}</Text></View>)}</View> : null}
      </View>
      <View style={[s.card, wide && s.cardWide]}>
        <View style={s.cardHeader}><Text style={s.welcome}>Welcome back</Text><Text style={s.cardSubtitle}>Sign in to manage your laundry</Text></View>
        {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
        <Controller control={control} name="email" render={({ field }) => <View style={s.fieldWrap}><Text style={s.label}>Email address</Text><View style={[s.inputShell, errors.email && s.inputError]}><Text style={s.inputIcon}>@</Text><TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#9AA8BA" style={s.input} value={field.value} onChangeText={field.onChange} /></View>{errors.email ? <Text style={s.fieldError}>{errors.email.message}</Text> : null}</View>} />
        <Controller control={control} name="password" render={({ field }) => <View style={s.fieldWrap}><View style={s.labelRow}><Text style={s.label}>Password</Text><Link href="/forgot-password" style={s.forgot}>Forgot password?</Link></View><View style={[s.inputShell, errors.password && s.inputError]}><Text style={s.inputIcon}>●</Text><TextInput accessibilityLabel="Password" autoComplete="current-password" placeholder="Enter your password" placeholderTextColor="#9AA8BA" secureTextEntry={!showPassword} style={s.input} value={field.value} onChangeText={field.onChange} /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(v => !v)} hitSlop={10}><Text style={s.showText}>{showPassword ? 'Hide' : 'Show'}</Text></Pressable></View>{errors.password ? <Text style={s.fieldError}>{errors.password.message}</Text> : null}</View>} />
        <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={submit} style={({ pressed }) => [s.signIn, pressed && s.pressed, isSubmitting && s.disabled]}>{isSubmitting ? <ActivityIndicator color={c.white} /> : <><Text style={s.signInText}>Sign in</Text><Text style={s.arrow}>→</Text></>}</Pressable>
        <View style={s.dividerRow}><View style={s.divider} /><Text style={s.dividerText}>NEW TO WASHNGO?</Text><View style={s.divider} /></View>
        <Link href="/register" style={s.createButton}>Create your free account</Link>
        <Text style={s.terms}>By continuing, you agree to our <Text style={s.termsLink}>Terms</Text> and <Text style={s.termsLink}>Privacy Policy</Text>.</Text>
      </View>
    </View></ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:c.canvas,overflow:'hidden'},scroll:{flexGrow:1,paddingHorizontal:18,paddingTop:16,paddingBottom:28},scrollWide:{justifyContent:'center',padding:20},shell:{width:'100%',maxWidth:1120,alignSelf:'center',gap:20},shellWide:{flexDirection:'row',alignItems:'center',gap:72,paddingVertical:32},hero:{gap:18},heroWide:{flex:1,paddingHorizontal:12,gap:32},
  brandRow:{flexDirection:'row',alignItems:'center',gap:9},logo:{width:38,height:38,borderRadius:13,backgroundColor:c.blue,alignItems:'center',justifyContent:'center',shadowColor:c.blue,shadowOpacity:.3,shadowRadius:14,shadowOffset:{width:0,height:7}},logoText:{color:c.white,fontSize:21,fontWeight:'900',fontStyle:'italic'},logoBubble:{position:'absolute',width:6,height:6,borderRadius:4,backgroundColor:'#9ED9FF',right:6,top:6},brand:{fontSize:21,fontWeight:'900',color:c.navy,letterSpacing:-.6},brandAccent:{color:c.blue},
  heroCopy:{gap:9},eyebrowPill:{alignSelf:'flex-start',borderRadius:99,paddingVertical:5,paddingHorizontal:9,backgroundColor:'#E6EEFF'},eyebrow:{fontSize:8,fontWeight:'900',letterSpacing:1,color:c.blue},headline:{color:c.navy,fontSize:32,lineHeight:35,letterSpacing:-1.3,fontWeight:'900'},headlineWide:{fontSize:58,lineHeight:61,letterSpacing:-2.8},headlineAccent:{color:c.blue},subhead:{maxWidth:510,color:c.muted,fontSize:14,lineHeight:20},
  serviceRow:{flexDirection:'row',flexWrap:'wrap',gap:18},serviceItem:{flexDirection:'row',alignItems:'center',gap:7},serviceIcon:{width:28,height:28,borderRadius:9,backgroundColor:c.white,alignItems:'center',justifyContent:'center'},serviceText:{color:'#4F6078',fontSize:12,fontWeight:'700'},
  card:{width:'100%',backgroundColor:c.white,borderRadius:24,borderWidth:1,borderColor:'#E8EEF7',padding:20,gap:16,shadowColor:'#173561',shadowOpacity:.08,shadowRadius:22,shadowOffset:{width:0,height:10}},cardWide:{width:440,padding:34,borderRadius:28,gap:19},cardHeader:{gap:4,marginBottom:1},welcome:{color:c.navy,fontSize:24,lineHeight:30,fontWeight:'900',letterSpacing:-.6},cardSubtitle:{color:c.muted,fontSize:13},
  fieldWrap:{gap:8},labelRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},label:{color:c.navy,fontSize:13,fontWeight:'800'},forgot:{color:c.blue,fontSize:12,fontWeight:'800'},inputShell:{minHeight:55,borderRadius:15,borderWidth:1.5,borderColor:c.line,backgroundColor:'#FBFCFF',flexDirection:'row',alignItems:'center',paddingHorizontal:16,gap:11},input:{flex:1,minHeight:52,color:c.navy,fontSize:15},inputIcon:{color:'#8A9AAF',fontWeight:'900',width:15,textAlign:'center'},showText:{color:c.blue,fontSize:12,fontWeight:'800'},inputError:{borderColor:c.red},fieldError:{color:c.red,fontSize:12},errorBox:{backgroundColor:'#FFF0F0',borderRadius:12,padding:12},errorText:{color:c.red,fontSize:13},
  signIn:{minHeight:54,borderRadius:15,backgroundColor:c.blue,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,shadowColor:c.blue,shadowOpacity:.24,shadowRadius:11,shadowOffset:{width:0,height:6}},signInText:{color:c.white,fontSize:16,fontWeight:'900'},arrow:{color:c.white,fontSize:20,marginTop:-2},pressed:{opacity:.82,transform:[{scale:.995}]},disabled:{opacity:.55},
  dividerRow:{flexDirection:'row',alignItems:'center',gap:10,marginTop:2},divider:{height:1,flex:1,backgroundColor:'#E8EDF4'},dividerText:{color:'#9AA8BA',fontSize:9,fontWeight:'900',letterSpacing:1},createButton:{minHeight:52,borderRadius:16,borderWidth:1.5,borderColor:'#BFD0ED',color:c.deep,fontSize:14,fontWeight:'900',textAlign:'center',paddingTop:16},terms:{color:'#97A4B5',textAlign:'center',fontSize:10,lineHeight:15},termsLink:{color:'#66758D',fontWeight:'800'},
  glowTop:{position:'absolute',width:430,height:430,borderRadius:215,backgroundColor:'#DCE9FF',top:-270,right:-100,opacity:.8},glowBottom:{position:'absolute',width:330,height:330,borderRadius:165,backgroundColor:'#E1F6FF',bottom:-230,left:-100,opacity:.8}
});
