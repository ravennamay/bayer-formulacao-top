import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../src/auth';
import { BAYER_LOGO_URL, useTheme } from '../src/theme';

type ForgotStep = 'email' | 'reset';

export default function ForgotPassword() {
  const { colors } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.toLowerCase().trim(),
      });

      setResetToken(response.data.reset_token);
      setStep('reset');

      Alert.alert(
        'Sucesso',
        'Token de reset gerado. Você tem 30 minutos para redefinir sua senha.'
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Falha ao processar solicitação';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Atenção', 'Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não correspondem');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token: resetToken,
        password: password,
      });

      Alert.alert('Sucesso', 'Senha redefinida com sucesso!');

      router.replace('/login');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Falha ao redefinir senha';
      Alert.alert('Erro', msg);
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
                Formulação
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
            {/* Header */}
            <View style={styles.heroHeader}>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={10}
                style={{ marginRight: 8 }}
              >
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>

              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor: colors.primary + '22',
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />

                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  SEGURANÇA
                </Text>
              </View>
            </View>

            {step === 'email' ? (
              <>
                <Text
                  style={[
                    styles.heroTitle,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  Recuperar senha
                </Text>

                <Text
                  style={[
                    styles.heroSub,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Informe o e-mail associado à sua conta para redefinir sua senha.
                </Text>

                <Field label="E-mail" colors={colors}>
                  <Input
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seu@bayer.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    colors={colors}
                    editable={!loading}
                  />
                </Field>

                <TouchableOpacity
                  onPress={handleForgotPassword}
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
                      <Ionicons name="send-outline" size={18} color="#fff" />

                      <Text style={styles.buttonText}>Enviar link de reset</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.heroTitle,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  Redefinir senha
                </Text>

                <Text
                  style={[
                    styles.heroSub,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  Crie uma nova senha segura para sua conta.
                </Text>

                <Field label="Nova senha" colors={colors}>
                  <Input
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPwd}
                    colors={colors}
                    rightIcon={showPwd ? 'eye-off-outline' : 'eye-outline'}
                    onRightPress={() => setShowPwd(s => !s)}
                    editable={!loading}
                  />
                </Field>

                <Field label="Confirmar senha" colors={colors}>
                  <Input
                    icon="lock-closed-outline"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showConfirm}
                    colors={colors}
                    rightIcon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    onRightPress={() => setShowConfirm(s => !s)}
                    editable={!loading}
                  />
                </Field>

                <Text
                  style={[
                    styles.hint,
                    {
                      color: colors.textTertiary,
                    },
                  ]}
                >
                  Mínimo 6 caracteres
                </Text>

                <TouchableOpacity
                  onPress={handleResetPassword}
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
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />

                      <Text style={styles.buttonText}>Redefinir senha</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  const [focused, setFocused] = React.useState(false);

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

  hint: {
    fontSize: 12,
    marginTop: 6,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginTop: 20,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
