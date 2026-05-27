import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Link, useRouter } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context';

import safeAsyncStorage from '../src/utils/safeAsyncStorage';

import { useAuth } from '../src/auth';

import { BAYER_LOGO_URL, useTheme } from '../src/theme';

const REMEMBER_KEY = 'bayer_remember';
const REMEMBER_EMAIL_KEY = 'bayer_remember_email';

type AuthMode = 'login' | 'register';

export default function Login() {
  const { login, register } = useAuth();

  const { colors, mode } = useTheme();

  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const [email, setEmail] = useState('admin@bayer.com');
  const [password, setPassword] = useState('admin123');

  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);

  const [showPwd, setShowPwd] = useState(false);

  const [remember, setRemember] = useState(true);

  useEffect(() => {
    loadRememberData();
  }, []);

  const loadRememberData = async () => {
    try {
      const rememberValue = await safeAsyncStorage.getItem(REMEMBER_KEY);

      const savedEmail = await safeAsyncStorage.getItem(REMEMBER_EMAIL_KEY);

      const shouldRemember = rememberValue !== '0';

      setRemember(shouldRemember);

      if (shouldRemember && savedEmail) {
        setEmail(savedEmail);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');

      return;
    }

    if (authMode === 'register' && !name.trim()) {
      Alert.alert('Atenção', 'Informe seu nome.');

      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (authMode === 'login') {
        await login(cleanEmail, password);
      } else {
        await register(cleanEmail, password, name.trim());
      }

      await safeAsyncStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');

      if (remember) {
        await safeAsyncStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
      } else {
        await safeAsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      router.replace('/(tabs)');
    } catch (e: any) {
      console.log(e);

      const detail = e?.response?.data?.detail;

      const msg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' ')
            : e?.message?.includes('Network')
              ? 'Sem conexão com o servidor.'
              : 'Falha ao autenticar';

      Alert.alert(
        'Erro de Autenticação',
        msg +
          '\n\nCertifique-se de que o backend está rodando e o usuário admin@bayer.com foi criado via seed.py'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.brandRow}>
            <View
              style={[
                styles.logoBg,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Image
                source={{
                  uri: BAYER_LOGO_URL,
                }}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.brand,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                Preparação
              </Text>

              <Text
                style={[
                  styles.brandSub,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Bayer · Controle Operacional
              </Text>
            </View>
          </View>

          {/* Card */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.heroHeader}>
              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor: colors.primary + '22',
                  },
                ]}
              >
                <Ionicons name="flask-outline" size={14} color={colors.primary} />

                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  PRODUÇÃO INDUSTRIAL
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.heroTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              {authMode === 'login' ? 'Bem-vindo de volta' : 'Criar nova conta'}
            </Text>

            <Text
              style={[
                styles.heroSub,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {authMode === 'login'
                ? 'Acesse sua planilha operacional.'
                : 'Cadastre-se para colaborar com o turno.'}
            </Text>

            {/* Tabs */}
            <View
              style={[
                styles.tabs,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setAuthMode('login')}
                style={[
                  styles.tab,
                  authMode === 'login' && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: authMode === 'login' ? '#fff' : colors.textSecondary,
                    fontWeight: '700',
                  }}
                >
                  Entrar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAuthMode('register')}
                style={[
                  styles.tab,
                  authMode === 'register' && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: authMode === 'register' ? '#fff' : colors.textSecondary,
                    fontWeight: '700',
                  }}
                >
                  Criar conta
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nome */}
            {authMode === 'register' && (
              <Field label="Nome" colors={colors}>
                <Input
                  icon="person-outline"
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu nome"
                  colors={colors}
                />
              </Field>
            )}

            {/* Email */}
            <Field label="E-mail" colors={colors}>
              <Input
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@bayer.com"
                autoCapitalize="none"
                keyboardType="email-address"
                colors={colors}
              />
            </Field>

            {/* Senha */}
            <Field label="Senha" colors={colors}>
              <Input
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPwd}
                colors={colors}
                rightIcon={showPwd ? 'eye-off-outline' : 'eye-outline'}
                onRightPress={() => setShowPwd(s => !s)}
              />
            </Field>

            {/* Remember */}
            <View style={styles.rowBetween}>
              <View style={styles.rememberRow}>
                <Switch
                  value={remember}
                  onValueChange={setRemember}
                  trackColor={{
                    false: colors.border,
                    true: colors.primary,
                  }}
                  thumbColor="#fff"
                />

                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                  }}
                >
                  Lembrar de mim
                </Text>
              </View>

              {authMode === 'login' && (
                <Link href="/forgot-password" asChild>
                  <TouchableOpacity>
                    <Text
                      style={{
                        color: colors.secondary,
                        fontWeight: '600',
                      }}
                    >
                      Esqueci a senha
                    </Text>
                  </TouchableOpacity>
                </Link>
              )}
            </View>

            {/* Botão */}
            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              style={[
                styles.button,
                {
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={authMode === 'login' ? 'log-in-outline' : 'person-add-outline'}
                    size={18}
                    color="#fff"
                  />

                  <Text style={styles.buttonText}>
                    {authMode === 'login' ? 'Entrar' : 'Criar conta'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
  colors: any;
};

function Field({ label, children, colors }: FieldProps) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>

      {children}
    </View>
  );
}

type InputProps = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  colors: any;
};

function Input({ icon, rightIcon, onRightPress, colors, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.input,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: focused ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.textTertiary} />

      <TextInput
        {...props}
        placeholderTextColor={colors.textTertiary}
        onFocus={e => {
          setFocused(true);

          props.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);

          props.onBlur?.(e);
        }}
        style={[
          styles.inputText,
          {
            color: colors.textPrimary,
          },
        ]}
      />

      {rightIcon && (
        <TouchableOpacity onPress={onRightPress} hitSlop={10}>
          <Ionicons name={rightIcon} size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    marginTop: 8,
  },

  logoBg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 6,
  },

  logoImg: {
    width: '100%',
    height: '100%',
  },

  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  brandSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },

  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },

  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },

  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },

  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 4,
  },

  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
  },

  inputText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 4,
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 0,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlignVertical: 'center',
  },
});
