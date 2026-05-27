import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { api, useAuth } from '../../src/auth';
import { useTheme } from '../../src/theme';
import { useResponsive } from '../../src/useResponsive';

type Product = {
  name: string;
  abbr: string;
};

const DEFAULT_PRODUCTS: Product[] = [
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

export default function ProductsScreen() {
  const { colors } = useTheme();

  const { isDemo } = useAuth();

  const router = useRouter();

  const responsive = useResponsive();

  const [products, setProducts] = useState<Product[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // =========================
  // LOAD PRODUCTS
  // =========================

  const loadProducts = useCallback(async () => {
    if (isDemo) {
      return;
    }

    try {
      const response = await api.get('/products');

      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log('Load products error:', error);
    }
  }, [isDemo]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // =========================
  // PRODUCT LIST
  // =========================

  const productList = useMemo<Product[]>(() => {
    if (isDemo) {
      return DEFAULT_PRODUCTS;
    }

    if (products.length > 0) {
      return products;
    }

    return DEFAULT_PRODUCTS;
  }, [isDemo, products]);

  // =========================
  // FILTERED PRODUCTS
  // =========================

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return productList.filter(
      product =>
        product.name.toLowerCase().includes(query) || product.abbr.toLowerCase().includes(query)
    );
  }, [productList, searchQuery]);

  // =========================
  // TOGGLE SELECTION
  // =========================

  const toggleProductSelection = useCallback((abbr: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);

      if (next.has(abbr)) {
        next.delete(abbr);
      } else {
        next.add(abbr);
      }

      return next;
    });
  }, []);

  // =========================
  // TAB LABEL STYLE FIX
  // =========================

  const tabLabelStyle: TextStyle = {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top']}
    >
      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          Catálogo de Produtos
        </Text>

        <View style={{ width: 24 }} />
      </View>

      {/* CONTENT */}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: responsive.padding,
          gap: responsive.gap,
          paddingBottom: 40,
        }}
      >
        {/* SEARCH */}

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar produtos..."
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.searchInput,
              {
                color: colors.textPrimary,
              },
            ]}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* STATS */}

        <View
          style={[
            styles.statsGrid,
            {
              gap: responsive.gap,
            },
          ]}
        >
          <StatCard
            label="Total"
            value={productList.length}
            icon="cube-outline"
            color={colors.primary}
            bg={colors.primary + '15'}
            colors={colors}
          />

          <StatCard
            label="Selecionados"
            value={selectedProducts.size}
            icon="checkmark-circle-outline"
            color={colors.success}
            bg={colors.success + '15'}
            colors={colors}
          />

          <StatCard
            label="Filtrados"
            value={filteredProducts.length}
            icon="filter-outline"
            color={colors.warning}
            bg={colors.warning + '15'}
            colors={colors}
          />
        </View>

        {/* PRODUCTS */}

        <View style={{ gap: responsive.gap }}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.textTertiary,
              },
            ]}
          >
            Todos os Produtos
          </Text>

          <View
            style={[
              styles.productGrid,
              {
                gap: responsive.gap,
              },
            ]}
          >
            {filteredProducts.map(product => {
              const selected = selectedProducts.has(product.abbr);

              return (
                <TouchableOpacity
                  key={product.abbr}
                  activeOpacity={0.8}
                  onPress={() => toggleProductSelection(product.abbr)}
                  style={[
                    styles.productCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkBox,
                      {
                        backgroundColor: selected ? colors.primary : 'transparent',
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>

                  <View style={{ flex: 1, marginTop: 10 }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 14,
                      }}
                    >
                      {product.name}
                    </Text>

                    <View
                      style={[
                        styles.abbrChip,
                        {
                          backgroundColor: colors.primary + '22',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontWeight: '700',
                          fontSize: 11,
                        }}
                      >
                        {product.abbr}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* EMPTY */}

          {filteredProducts.length === 0 && (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="search-outline" size={40} color={colors.textTertiary} />

              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '700',
                  fontSize: 15,
                  marginTop: 12,
                }}
              >
                Nenhum produto encontrado
              </Text>

              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                Tente outro termo de busca
              </Text>
            </View>
          )}
        </View>

        {/* SAVE */}

        {selectedProducts.size > 0 && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="checkmark-done" size={18} color="#fff" />

            <Text style={styles.saveButtonText}>Salvar Seleção ({selectedProducts.size})</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================
// STAT CARD
// =========================

type StatCardProps = {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  colors: any;
};

function StatCard({ label, value, icon, color, bg, colors }: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: bg,
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 12,
          marginTop: 8,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: '700',
          fontSize: 18,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  statCard: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  productCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
  },

  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  abbrChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
