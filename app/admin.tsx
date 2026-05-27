import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, useAuth } from '../src/auth';
import BayerLogo from '../src/BayerLogo';
import { useTheme } from '../src/theme';

type AppUser = { id: string; email: string; name: string; role: string; created_at: string };
type Stats = { total_users: number; total_items: number; total_products: number };

export default function AdminScreen() {
  const { colors } = useTheme();
  const { user, isDemo } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    try {
      const [uRes, sRes] = await Promise.all([api.get('/admin/users'), api.get('/admin/stats')]);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setStats(sRes.data);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.detail || 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (targetUser: AppUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    Alert.alert(
      'Alterar papel',
      'Mudar ' + targetUser.name + ' para ' + newRole.toUpperCase() + '?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await api.patch('/admin/users/' + targetUser.id + '/role', { role: newRole });
              loadData();
            } catch (e: any) {
              Alert.alert('Erro', e?.response?.data?.detail || 'Falha');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (targetUser: AppUser) => {
    Alert.alert('Remover usuário', 'Tem certeza? Esta ação é irreversível.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/admin/users/' + targetUser.id);
            loadData();
          } catch (e: any) {
            Alert.alert('Erro', e?.response?.data?.detail || 'Falha');
          }
        },
      },
    ]);
  };

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <Ionicons name="lock-closed" size={48} color={colors.textTertiary} />
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
          Acesso Restrito
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Apenas administradores</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, padding: 12 }}>
          <Text style={{ color: colors.primary }}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[S.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View
        style={[S.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={S.bayerBadge}>
          <BayerLogo size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[S.title, { color: colors.textPrimary }]}>Painel Admin</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Bayer Fito Formulação</Text>
        </View>
        <TouchableOpacity onPress={loadData} style={S.refreshBtn}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
          {isDemo && (
            <View
              style={[
                S.demoNote,
                { backgroundColor: colors.warningBg, borderColor: colors.warning + '44' },
              ]}
            >
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={{ color: colors.warning, flex: 1 }}>Modo demo: dados não são reais</Text>
            </View>
          )}
          {stats && (
            <View style={{ gap: 8 }}>
              <Text style={[S.sectionLabel, { color: colors.textTertiary }]}>
                RESUMO DO SISTEMA
              </Text>
              <View style={S.statsRow}>
                {(
                  [
                    ['Usuarios', stats.total_users, 'people'],
                    ['Itens Prod.', stats.total_items, 'layers'],
                    ['Produtos', stats.total_products, 'cube'],
                  ] as [string, number, string][]
                ).map(([label, val, icon]) => (
                  <View
                    key={label}
                    style={[
                      S.statCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name={icon as any} size={22} color={colors.primary} />
                    <Text style={[S.statVal, { color: colors.textPrimary }]}>{val}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Text style={[S.sectionLabel, { color: colors.textTertiary }]}>
              USUÁRIOS ({users.length})
            </Text>
            <View style={[S.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {users.length === 0 ? (
                <Text style={{ color: colors.textSecondary, padding: 16, textAlign: 'center' }}>
                  Nenhum usuário encontrado
                </Text>
              ) : (
                users.map((u, i) => (
                  <View
                    key={u.id}
                    style={[
                      S.userRow,
                      i < users.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        S.avatar,
                        { backgroundColor: u.role === 'admin' ? colors.primary : colors.secondary },
                      ]}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
                        {u.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{u.email}</Text>
                    </View>
                    <View
                      style={[
                        S.roleBadge,
                        {
                          backgroundColor:
                            u.role === 'admin' ? colors.primary + '22' : colors.successBg,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: u.role === 'admin' ? colors.primary : colors.success,
                          fontWeight: '700',
                          fontSize: 11,
                        }}
                      >
                        {u.role.toUpperCase()}
                      </Text>
                    </View>
                    {u.id !== user?.id && (
                      <TouchableOpacity onPress={() => handleRoleChange(u)} style={S.iconBtn}>
                        <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    {u.id !== user?.id && (
                      <TouchableOpacity
                        onPress={() => handleDelete(u)}
                        style={[S.iconBtn, { backgroundColor: colors.dangerBg }]}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  bayerBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  refreshBtn: { padding: 8, borderRadius: 8 },
  demoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionLabel: { fontWeight: '700', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statVal: { fontSize: 24, fontWeight: '800' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
