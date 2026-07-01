import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/auth';
import { formatReportText } from '../../src/reportFormatter';
import { useTheme } from '../../src/theme';
import { formatDateLabel, ProductionItem, todayISO } from '../../src/types';

const buildLast14Days = (): string[] => {
  const out: string[] = [];
  const base = new Date();

  for (let i = 13; i >= 0; i--) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);

    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');

    out.push(`${yyyy}-${mm}-${dd}`);
  }

  return out;
};

export default function ReportScreen() {
  const { colors, isDark } = useTheme();
  const [date, setDate] = useState(todayISO());
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  const [extraObs, setExtraObs] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/items', {
        params: { date },
      });

      const items: ProductionItem[] = r.data || [];
      const formattedText = formatReportText(items, extraObs);

      setText(formattedText);
      setCount(items.length);
    } catch {
      Alert.alert('Erro', 'Falha ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }, [date, extraObs]);

  useFocusEffect(
    useCallback(() => {
      generate();
    }, [generate])
  );

  const copy = async () => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado', 'Relatório copiado para a área de transferência.');
  };

  const shareWhats = async () => {
    if (!text) return;

    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  const dates = buildLast14Days();

  const previewBg = isDark ? '#0D1C29' : '#F0F8FF';
  const previewHeaderBg = isDark ? '#0F2030' : '#E8F4FD';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header — V3 style (icon box + title) */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <View style={styles.headerBottom}>
            <View style={styles.headerLeft}>
              <View style={[styles.whatsIconBox, { backgroundColor: colors.whatsappSubtle, borderColor: colors.whatsappBorder }]}>
                <Ionicons name="logo-whatsapp" size={20} color={colors.whatsapp} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Relatório de Turno</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {formatDateLabel(date)} · {count} {count === 1 ? 'item' : 'itens'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              testID="refresh-report"
              onPress={generate}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Ionicons name="refresh" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date strip — V1 rounded chips, WhatsApp green when active */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {dates.map(d => {
            const active = d === date;
            const [y, m, dd] = d.split('-');
            const dt = new Date(Number(y), Number(m) - 1, Number(dd));

            return (
              <TouchableOpacity
                key={d}
                testID={`rdate-${d}`}
                onPress={() => setDate(d)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: active ? colors.whatsapp : colors.surface,
                    borderColor: active ? colors.whatsapp : colors.border,
                  },
                ]}
              >
                <Text style={{ color: active ? '#0B1620' : colors.textTertiary, fontSize: 11, fontWeight: '600' }}>
                  {dt.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3).toUpperCase()}
                </Text>
                <Text style={{ color: active ? '#0B1620' : colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
                  {dd}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Obs row — V1: taller, more rounded */}
        <View style={[styles.obsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="create-outline" size={16} color={colors.textTertiary} />
          <TextInput
            testID="extra-obs"
            value={extraObs}
            onChangeText={setExtraObs}
            placeholder="Observações extras (opcional)"
            placeholderTextColor={colors.textTertiary}
            onBlur={generate}
            style={[styles.obsInput, { color: colors.textPrimary }]}
          />
        </View>

        {/* Preview card — V1: darker bg, bigger radius, dot indicator */}
        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          <View style={[styles.preview, { backgroundColor: previewBg, borderColor: colors.border }]}>
            <View style={[styles.previewHeader, { backgroundColor: previewHeaderBg, borderBottomColor: colors.border }]}>
              <View style={styles.previewDot} />
              <Ionicons name="logo-whatsapp" size={15} color={colors.whatsapp} />
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
                PRÉVIA DA MENSAGEM
              </Text>
            </View>

            {loading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : text ? (
              <Text testID="report-text" style={[styles.previewText, { color: colors.textPrimary }]}>
                {text}
              </Text>
            ) : (
              <Text style={{ color: colors.textTertiary, padding: 16, fontStyle: 'italic' }}>
                Nenhum item para esta data.
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Actions — V1: taller buttons, more rounded, gradient on WhatsApp */}
        <View style={[styles.actions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            testID="copy-report"
            onPress={copy}
            disabled={!text}
            style={[styles.btnCopy, { backgroundColor: colors.surface, borderColor: colors.border, opacity: text ? 1 : 0.5 }]}
          >
            <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Copiar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="share-whatsapp"
            onPress={shareWhats}
            disabled={!text}
            style={[styles.btnWhatsWrap, { opacity: text ? 1 : 0.5 }]}
          >
            <LinearGradient
              colors={['#25D366', '#128C7E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnWhats}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar no WhatsApp</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whatsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 1 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  dateStrip: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dateChip: {
    width: 50,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },

  obsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  obsInput: { flex: 1, fontSize: 14 },

  scrollBody: { paddingHorizontal: 16, paddingBottom: 16 },
  preview: { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden' },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#25D366',
  },
  previewText: {
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
  },
  btnCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  btnWhatsWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnWhats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
  },
});
