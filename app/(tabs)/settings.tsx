import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BayerLogo from '../../src/BayerLogo';

import { api, useAuth } from '../../src/auth';
import { useTheme } from '../../src/theme';

type Product = { name: string; abbr: string };

export default function SettingsScreen() {
  const { colors, mode, toggle } = useTheme();
  const { user, logout, isDemo } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [compactView, setCompactView] = useState(false);

  const loadProducts = useCallback(async () => {
    if (isDemo) return;
    try {
      const r = await api.get('/products');
      setProducts(Array.isArray(r.data) ? r.data : []);
    } catch {}
  }, [isDemo]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleLogout = () =>
    Alert.alert('Sair', 'Confirma encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);

  const openDocs = () => Linking.openURL('https://www.bayer.com');

  const defaultProducts = [
    { name: 'Nativo', abbr: 'NAT' },
    { name: 'Verango', abbr: 'VER' },
    { name: 'Oberon', abbr: 'OBE' },
    { name: 'Fox Xpro', abbr: 'FXX' },
    { name: 'Belt', abbr: 'BEL' },
    { name: 'Sphere Max', abbr: 'SPH' },
    { name: 'Connect', abbr: 'CON' },
    { name: 'Movento', abbr: 'MOV' },
    { name: 'Decis', abbr: 'DEC' },
    { name: 'Alsystim', abbr: 'ALS' },
    { name: 'Hybstem', abbr: 'HYB' },
    { name: 'Ureia', abbr: 'URE' },
  ];

  const productList = isDemo ? defaultProducts : products.length > 0 ? products : defaultProducts;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.bayerBadge}>
            <BayerLogo size={24} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Configurações</Text>
          <View style={styles.gearWrap}>
            <Ionicons name="settings-outline" size={22} color={colors.textTertiary} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Conta" colors={colors}>
          <View
            style={[
              styles.userBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
                {user?.name || 'Usuario'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{user?.email}</Text>
            </View>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: isDemo ? colors.warningBg : colors.successBg },
              ]}
            >
              <Text
                style={{
                  color: isDemo ? colors.warning : colors.success,
                  fontWeight: '700',
                  fontSize: 11,
                }}
              >
                {isDemo ? 'DEMO' : (user?.role || 'USER').toUpperCase()}
              </Text>
            </View>
          </View>
          {isDemo && (
            <View
              style={[
                styles.demoNote,
                { backgroundColor: colors.warningBg, borderColor: colors.warning + '44' },
              ]}
            >
              <Ionicons name="warning-outline" size={14} color={colors.warning} />
              <Text style={[styles.demoNoteText, { color: colors.warning }]}>
                Modo demonstração ativo. Dados não são persistidos.
              </Text>
            </View>
          )}
        </Section>

        <Section title="Aparencia" colors={colors}>
          <TouchableOpacity
            onPress={toggle}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>
                Modo {mode === 'dark' ? 'Escuro' : 'Claro'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Toque para alternar</Text>
            </View>
            <Ionicons name="swap-horizontal" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Section>

        <Section title="Status de Produção" colors={colors}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>
            Status dos materiais durante o processo de produção
          </Text>
          <View
            style={[
              styles.statusGrid,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 14,
              },
            ]}
          >
            {[
              {
                label: 'Recebido',
                color: colors.info,
                bg: colors.infoBg,
                icon: 'download-outline',
              },
              {
                label: 'A preparar',
                color: colors.warning,
                bg: colors.warningBg,
                icon: 'time-outline',
              },
              {
                label: 'Preparado',
                color: colors.success,
                bg: colors.successBg,
                icon: 'checkmark-done-circle',
              },
              { label: 'Em fábrica', color: colors.info, bg: colors.infoBg, icon: 'sync-circle' },
            ].map((s, i, arr) => (
              <View
                key={s.label}
                style={[
                  styles.statusItem,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon as any} size={16} color={s.color} />
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Catalogo de Produtos" colors={colors}>
          <TouchableOpacity
            style={[styles.catalogButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/planilha')}
          >
            <Ionicons name="folder-open-outline" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }}>Ver Catálogo Completo</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
          <Text
            style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12, marginBottom: 8 }}
          >
            Principais produtos
          </Text>
          <View
            style={[
              styles.productList,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {productList.slice(0, 6).map((p, i) => (
              <View
                key={i}
                style={[
                  styles.productRow,
                  i < Math.min(6, productList.length) - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="flask-outline"
                  size={14}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: colors.textPrimary, fontSize: 14, flex: 1 }}>{p.name}</Text>
                <View style={[styles.abbrChip, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
                    {p.abbr}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Pesos de Referencia (Bags)" colors={colors}>
          <View
            style={[
              styles.productList,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {[
              ['Verango', '400 kg/bag'],
              ['Ureia', '700 kg/bag'],
              ['Demais', 'Ver NF'],
            ].map(([name, weight], i, arr) => (
              <View
                key={name}
                style={[
                  styles.productRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14, flex: 1 }}>{name}</Text>
                <View style={[styles.abbrChip, { backgroundColor: colors.infoBg }]}>
                  <Text style={{ color: colors.info, fontWeight: '700', fontSize: 12 }}>
                    {weight}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {user?.role === 'admin' && (
          <Section title="Administracao" colors={colors}>
            <TouchableOpacity
              onPress={() => router.push('/admin')}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>
                  Painel Administrativo
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Gerenciar usuarios e dados
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </Section>
        )}

        <Section title="Links Uteis" colors={colors}>
          <TouchableOpacity
            onPress={openDocs}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="globe-outline" size={20} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>
                Portal Bayer Agricola
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Informacoes tecnicas oficiais
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Section>

        <TouchableOpacity
          onPress={handleLogout}
          style={[
            styles.row,
            { backgroundColor: colors.dangerBg, borderColor: colors.danger + '55' },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>
            Sair da conta
          </Text>
        </TouchableOpacity>

        <Text
          style={{ color: colors.textTertiary, fontSize: 11, textAlign: 'center', marginTop: 8 }}
        >
          Bayer Preparação · v2.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: colors.textTertiary,
          fontWeight: '600',
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bayerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  gearWrap: { marginLeft: 'auto' },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  userBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  demoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  demoNoteText: { fontSize: 12, flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  catalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  statusGrid: { overflow: 'hidden' },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  statusDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  abbrChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
