import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { api, useAuth } from '../../src/auth';
import ItemFormModal from '../../src/ItemFormModal';
import StatusPill from '../../src/StatusPill';
import { useTheme } from '../../src/theme';

import { formatDateLabel, ProductionItem, SITUATIONS, todayISO } from '../../src/types';
import {
  defaultRecipes,
  defaultChemistry,
  defaultProcedures,
  defaultTutorials,
  defaultEPIs,
  defaultSafetyTips,
} from '../../src/guideData';
import { generateProductCatalogCSV } from '../../src/excelGenerator';

const PRODUCT_COLORS: Record<string, string> = {
  'FOX XPRO': '#00BCFF',
  NATIVO: '#89D329',
  'FOX PRO': '#00BCFF',
  'FOX SUPRA': '#22C55E',
  CURBIX: '#EC4899',
  CONNECT: '#F59E0B',
  BULLDOCK: '#8B5CF6',
  ALSYSTIN: '#10B981',
  OBERON: '#06B6D4',
  'PREMIER PLUS': '#F97316',
  PROVADO: '#EF4444',
  'SPHERE MAX': '#6366F1',
  FINISH: '#A78BFA',
  SOBERAN: '#14B8A6',
  CROPSTAR: '#D97706',
  'SIVANTO PRIME': '#7C3AED',
  UNIVERSAL: '#64748B',
  MONCEREM: '#DB2777',
  GAUCHO: '#EA580C',
  VERANGO: '#0891B2',
  MYTHOS: '#84CC16',
};

export default function Planilha2Screen() {
  const { colors, isDark } = useTheme();
  const { token } = useAuth();

  const [date] = useState(todayISO());
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sitFilter, setSitFilter] = useState('Todos');
  const [availabilityFilter, setAvailabilityFilter] = useState('Todos');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<ProductionItem | null>(null);

  // Função para formatar lote com ano automaticamente
  const formatBatchWithYear = useCallback((batch: string): string => {
    const currentYear = new Date().getFullYear();
    const yearSuffix = `/${currentYear.toString().slice(-2)}`;

    // Se já tem o padrão XXX/XX, retorna original
    if (/\d{3}\/\d{2}$/.test(batch)) {
      return batch;
    }

    // Se é apenas números, adiciona /ano
    if (/^\d+$/.test(batch)) {
      return `${batch}${yearSuffix}`;
    }

    return batch;
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get('/items', {
        params: { date },
      });

      // Formatar lotes dos itens recebidos
      const formattedItems = (response.data || []).map((item: ProductionItem) => ({
        ...item,
        batch: formatBatchWithYear(item.batch || ''),
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao carregar os materiais.');
    } finally {
      setLoading(false);
    }
  }, [date, formatBatchWithYear]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchItems();
    } finally {
      setRefreshing(false);
    }
  };

  const sitCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: items.length };
    for (const sit of SITUATIONS) {
      counts[sit] = items.filter(i => i.situation === sit).length;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter(item => {
      // Filtro por situação
      if (sitFilter !== 'Todos' && item.situation !== sitFilter) {
        return false;
      }

      // Filtro por disponibilidade
      if (availabilityFilter !== 'Todos' && item.material_status !== availabilityFilter) {
        return false;
      }

      if (!query) return true;

      return (
        item.product?.toLowerCase().includes(query) ||
        item.product_abbr?.toLowerCase().includes(query) ||
        item.batch?.toLowerCase().includes(query) ||
        item.sc?.toLowerCase().includes(query) ||
        item.unit?.toLowerCase().includes(query) ||
        item.observation?.toLowerCase().includes(query)
      );
    });
  }, [items, search, sitFilter, availabilityFilter]);

  const handleDelete = (id: string) => {
    Alert.alert('Remover material', 'Deseja remover este item?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/items/${id}`);
            await fetchItems();
          } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao remover item.');
          }
        },
      },
    ]);
  };

  const exportExcel = async () => {
    try {
      const backend = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');
      const url = `${backend}/api/export/excel?date=${date}`;

      if (Platform.OS === 'web') {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `bayer_planilha_${date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      } else {
        const target = `${FileSystem.cacheDirectory ?? ''}planilha_${date}.xlsx`;
        const download = await FileSystem.downloadAsync(url, target, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(download.uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Exportar Excel',
          });
        } else {
          Alert.alert('Arquivo salvo', download.uri);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao exportar Excel. Verifique se há itens na planilha.');
    }
  };

  const exportProductCatalog = async () => {
    try {
      const csvContent = generateProductCatalogCSV(
        defaultRecipes,
        defaultChemistry,
        defaultProcedures
      );

      const filename = `Catalogo_Produtos_${new Date().toISOString().split('T')[0]}.csv`;
      const filepath = `${FileSystem.documentDirectory ?? ''}${filename}`;

      await FileSystem.writeAsStringAsync(filepath, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filepath, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Catálogo de Produtos',
        });
      } else {
        Alert.alert('Sucesso', `Arquivo salvo em: ${filepath}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao exportar catálogo de produtos.');
    }
  };

  const getProductColor = (product: string): string => {
    return PRODUCT_COLORS[product] || colors.primary;
  };

  const getAvailabilityColor = (status: string): string => {
    switch (status) {
      case 'Disponível':
        return '#10B981';
      case 'Indisponível':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const renderItem = ({ item }: { item: ProductionItem }) => {
    const productColor = getProductColor(item.product);
    const availabilityColor = getAvailabilityColor(item.material_status || '');

    const renderLeftActions = () => (
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeEditAction]}
        onPress={() => {
          setEditing(item);
          setFormVisible(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="create" size={22} color="#000" />
        <Text style={[styles.swipeActionLabel, { color: '#000' }]}>Editar</Text>
      </TouchableOpacity>
    );

    const renderRightActions = () => (
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeDeleteAction]}
        onPress={() => handleDelete(item.id)}
        activeOpacity={0.85}
      >
        <Ionicons name="trash" size={22} color="#FFF" />
        <Text style={[styles.swipeActionLabel, { color: '#FFF' }]}>Excluir</Text>
      </TouchableOpacity>
    );

    return (
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
      >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: isDark ? '#000' : '#888',
          },
        ]}
      >
        {/* Left accent strip */}
        <View style={[styles.cardAccent, { backgroundColor: productColor }]} />

        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.locationPill,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="business-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                {item.unit} • {item.sc}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  setEditing(item);
                  setFormVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.danger + '20' }]}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View
              style={[
                styles.productBadge,
                {
                  backgroundColor: productColor + '22',
                  borderWidth: 1.5,
                  borderColor: productColor + '66',
                },
              ]}
            >
              <Text style={[styles.productBadgeText, { color: productColor }]}>
                {item.product_abbr || item.product.slice(0, 3).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[styles.productName, { color: colors.textPrimary }]}>
                {item.product}
              </Text>
              <Text style={[styles.batchText, { color: colors.textSecondary }]}>
                Lote {formatBatchWithYear(item.batch)}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusWrapper}>
              <StatusPill label={item.situation} />
            </View>

            {item.material_status && (
              <View
                style={[
                  styles.availabilityBadge,
                  {
                    backgroundColor: availabilityColor + '15',
                    borderColor: availabilityColor + '40',
                  },
                ]}
              >
                <View style={[styles.availabilityDot, { backgroundColor: availabilityColor }]} />
                <Text style={[styles.availabilityText, { color: availabilityColor }]}>
                  {item.material_status}
                </Text>
              </View>
            )}
          </View>

          {!!item.observation && (
            <Text
              style={[
                styles.observation,
                { color: colors.textSecondary, backgroundColor: colors.surfaceElevated },
              ]}
            >
              📝 {item.observation}
            </Text>
          )}
        </View>
      </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <LinearGradient
        colors={isDark ? ['#1A3A25', '#13212C'] : ['#F0FAF0', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.headerBadge, { backgroundColor: colors.primary + '25', borderColor: colors.primary + '50' }]}>
              <Text style={[styles.headerBadgeText, { color: colors.primary }]}>OPERACIONAL</Text>
            </View>
          </View>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                marginTop: 4,
              },
            ]}
          >
            Planilha
          </Text>

          <Text
            style={[
              styles.date,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {formatDateLabel(date)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={exportExcel}
            style={[
              styles.exportBtn,
              {
                backgroundColor: colors.success,
              },
            ]}
          >
            <Ionicons name="document-text" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={exportProductCatalog}
            style={[
              styles.exportBtn,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="list" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar produto, lote, SC..."
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.searchInput,
              {
                color: colors.textPrimary,
              },
            ]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filterGroup}>
            <Text
              style={[
                styles.filterLabel,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Situação:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['Todos', ...SITUATIONS].map(sit => (
                <TouchableOpacity
                  key={sit}
                  onPress={() => setSitFilter(sit)}
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor: sitFilter === sit ? colors.primary : colors.surfaceElevated,
                      borderColor: sitFilter === sit ? colors.primaryActive ?? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: sitFilter === sit ? '#FFF' : colors.textPrimary,
                      fontWeight: sitFilter === sit ? '700' : '500',
                      fontSize: 13,
                    }}
                  >
                    {sit}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text
              style={[
                styles.filterLabel,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Disponibilidade:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['Todos', 'Disponível', 'Indisponível'].map(status => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setAvailabilityFilter(status)}
                  style={[
                    styles.filterBtn,
                    {
                      backgroundColor:
                        availabilityFilter === status ? colors.primary : colors.surfaceElevated,
                      borderColor: availabilityFilter === status ? colors.primaryActive ?? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: availabilityFilter === status ? '#FFF' : colors.textPrimary,
                      fontWeight: availabilityFilter === status ? '700' : '500',
                      fontSize: 13,
                    }}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Stats strip */}
      <View style={[styles.statsStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.textPrimary }]}>{sitCounts['Todos'] ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
        </View>
        <View style={[styles.statSep, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#3B82F6' }]}>{sitCounts['Recebido'] ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Recebido</Text>
        </View>
        <View style={[styles.statSep, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#F59E0B' }]}>{sitCounts['A preparar'] ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>A preparar</Text>
        </View>
        <View style={[styles.statSep, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{sitCounts['Preparado'] ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Preparado</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: 120,
            },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={colors.textTertiary} />
              <Text
                style={[
                  styles.emptyText,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Nenhum item encontrado
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
          },
        ]}
        onPress={() => {
          setEditing(null);
          setFormVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>

      <ItemFormModal
        visible={formVisible}
        initial={editing}
        date={date}
        onClose={() => setFormVisible(false)}
        onSaved={fetchItems}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
  },

  date: {
    fontSize: 13,
    marginTop: 4,
  },

  exportBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchContainer: {
    padding: 12,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 16,
  },

  filtersScroll: {
    flexGrow: 0,
  },

  filterGroup: {
    marginBottom: 12,
  },

  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },

  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },

  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 16,
  },

  swipeEditAction: {
    backgroundColor: '#89D329',
    marginLeft: 12,
    marginRight: 4,
  },

  swipeDeleteAction: {
    backgroundColor: '#EF4444',
    marginRight: 12,
    marginLeft: 4,
  },

  swipeActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardAccent: {
    width: 4,
    flexShrink: 0,
  },

  cardInner: {
    flex: 1,
    padding: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  locationText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
  },

  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  productBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  productBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },

  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },

  statNum: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },

  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  statSep: {
    width: 1,
    height: 28,
  },

  productName: {
    fontSize: 16,
    fontWeight: '700',
  },

  batchText: {
    marginTop: 4,
    fontSize: 13,
  },

  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },

  statusWrapper: {
    marginRight: 8,
  },

  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },

  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },

  observation: {
    marginTop: 10,
    padding: 8,
    fontSize: 12,
    fontStyle: 'italic',
    borderRadius: 8,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },

  listContent: {
    padding: 12,
  },
});
