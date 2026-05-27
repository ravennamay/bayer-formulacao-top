import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/auth';
import { useTheme } from '../../src/theme';

type Product = {
  name: string;
  abbr: string;
  description?: string;
  ingredients?: string[];
  procedure?: string;
  category?: string;
  weight?: number;
};

const FALLBACK_PRODUCTS: Product[] = [
  {
    name: 'VERANGO',
    abbr: 'VER',
    category: 'Fungicida',
    description: 'Fungicida sistêmico para folhas',
    ingredients: ['Trifloxystrobin', 'Fluopyram'],
    procedure: 'Aplicar conforme recomendação técnica',
    weight: 500,
  },
  {
    name: 'FOX XPRO',
    abbr: 'FXX',
    category: 'Fungicida',
    description: 'Fungicida tríplice ação',
    ingredients: ['Trifloxystrobin', 'Protioconazole', 'Bixafen'],
    procedure: 'Aplicar preventivamente',
    weight: 500,
  },
  {
    name: 'NATIVO',
    abbr: 'NAT',
    category: 'Fungicida',
    description: 'Fungicida de contato e sistêmico',
    ingredients: ['Trifloxystrobin', 'Tebuconazole'],
    procedure: 'Pulverização uniforme',
    weight: 500,
  },
];

export default function ProductsScreen() {
  const { colors } = useTheme();

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);

    try {
      console.log('Fetching /recipes');

      const r = await api.get('/recipes');

      console.log('RECIPES OK:', r.data);

      if (Array.isArray(r.data) && r.data.length > 0) {
        setProducts(r.data);
      } else {
        setProducts(FALLBACK_PRODUCTS);
      }
    } catch (err: any) {
      console.log('RECIPES ERROR');
      console.log('MESSAGE:', err?.message);
      console.log('STATUS:', err?.response?.status);
      console.log('DATA:', err?.response?.data);

      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return products;

    return products.filter(p =>
      `${p.name || ''} ${p.abbr || ''} ${p.description || ''} ${p.category || ''} ${(p.ingredients || []).join(' ')}`
        .toLowerCase()
        .includes(q)
    );
  }, [products, q]);

  const handleAddProduct = async () => {
    if (!newProduct.name?.trim() || !newProduct.abbr?.trim()) {
      Alert.alert('Erro', 'Nome e abreviação são obrigatórios');
      return;
    }

    const created: Product = {
      name: newProduct.name.trim(),
      abbr: newProduct.abbr.trim().toUpperCase(),
      category: newProduct.category?.trim() || 'Geral',
      description: newProduct.description?.trim() || '',
      ingredients: [],
      procedure: '',
      weight: newProduct.weight,
    };

    setProducts(prev => [created, ...prev]);

    setFormVisible(false);

    setNewProduct({});

    Alert.alert('Sucesso', 'Produto adicionado localmente');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: '#fff' }]}>📦 Catálogo de Produtos</Text>

          <Text style={[styles.subtitle, { color: '#ffffffCC' }]}>
            Todos os produtos disponíveis
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search" size={16} color={colors.textTertiary} />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar produto..."
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.searchInput,
            {
              color: colors.textPrimary,
            },
          ]}
        />

        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="inbox-outline" size={52} color={colors.textTertiary} />

          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum produto encontrado
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
          {filtered.map(product => (
            <TouchableOpacity
              key={`${product.name}-${product.abbr}`}
              style={[
                styles.productCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                setSelectedProduct(product);
                setDetailsVisible(true);
              }}
            >
              <View style={styles.productCardContent}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: colors.primary + '22',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 10,
                          fontWeight: '700',
                        }}
                      >
                        {product.category || 'Geral'}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.productName,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                  >
                    {product.name}
                  </Text>

                  <Text
                    style={[
                      styles.productAbbr,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
                    {product.abbr}
                  </Text>

                  {!!product.description && (
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.productDesc,
                        {
                          color: colors.textTertiary,
                        },
                      ]}
                    >
                      {product.description}
                    </Text>
                  )}
                </View>

                <View style={styles.productMeta}>
                  {!!product.weight && (
                    <View
                      style={[
                        styles.weightBadge,
                        {
                          backgroundColor: '#10B98122',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: '#10B981',
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        {product.weight}kg
                      </Text>
                    </View>
                  )}

                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
          },
        ]}
        onPress={() => {
          setNewProduct({});
          setFormVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* DETAILS MODAL */}

      <Modal visible={detailsVisible} animationType="slide">
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <TouchableOpacity onPress={() => setDetailsVisible(false)}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>

            <Text
              style={[
                styles.title,
                {
                  color: '#fff',
                  marginLeft: 12,
                },
              ]}
            >
              Detalhes
            </Text>
          </View>

          {selectedProduct && (
            <ScrollView contentContainerStyle={styles.detailsContent}>
              <View
                style={[
                  styles.detailsCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.detailsTitle,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  {selectedProduct.name}
                </Text>

                <Text
                  style={[
                    styles.detailsSubtitle,
                    {
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  {selectedProduct.abbr}
                </Text>

                {!!selectedProduct.description && (
                  <View style={styles.detailsSection}>
                    <Text
                      style={[
                        styles.detailsLabel,
                        {
                          color: colors.textTertiary,
                        },
                      ]}
                    >
                      DESCRIÇÃO
                    </Text>

                    <Text
                      style={[
                        styles.detailsText,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {selectedProduct.description}
                    </Text>
                  </View>
                )}

                {!!selectedProduct.ingredients?.length && (
                  <View style={styles.detailsSection}>
                    <Text
                      style={[
                        styles.detailsLabel,
                        {
                          color: colors.textTertiary,
                        },
                      ]}
                    >
                      INGREDIENTES
                    </Text>

                    {selectedProduct.ingredients.map((ing, idx) => (
                      <View key={`${ing}-${idx}`} style={styles.ingredientRow}>
                        <Text
                          style={[
                            styles.ingredientBullet,
                            {
                              color: colors.primary,
                            },
                          ]}
                        >
                          •
                        </Text>

                        <Text
                          style={[
                            styles.ingredientText,
                            {
                              color: colors.textPrimary,
                            },
                          ]}
                        >
                          {ing}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {!!selectedProduct.procedure && (
                  <View style={styles.detailsSection}>
                    <Text
                      style={[
                        styles.detailsLabel,
                        {
                          color: colors.textTertiary,
                        },
                      ]}
                    >
                      PROCEDIMENTO
                    </Text>

                    <Text
                      style={[
                        styles.detailsText,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {selectedProduct.procedure}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* FORM MODAL */}

      <Modal visible={formVisible} animationType="slide">
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <TouchableOpacity onPress={() => setFormVisible(false)}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>

            <Text
              style={[
                styles.title,
                {
                  color: '#fff',
                  marginLeft: 12,
                },
              ]}
            >
              Novo Produto
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Nome</Text>

              <TextInput
                value={newProduct.name || ''}
                onChangeText={v =>
                  setNewProduct(prev => ({
                    ...prev,
                    name: v,
                  }))
                }
                placeholder="Ex: FOX XPRO"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Abreviação</Text>

              <TextInput
                value={newProduct.abbr || ''}
                onChangeText={v =>
                  setNewProduct(prev => ({
                    ...prev,
                    abbr: v,
                  }))
                }
                placeholder="Ex: FXX"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Categoria</Text>

              <TextInput
                value={newProduct.category || ''}
                onChangeText={v =>
                  setNewProduct(prev => ({
                    ...prev,
                    category: v,
                  }))
                }
                placeholder="Ex: Fungicida"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Peso (kg)</Text>

              <TextInput
                value={newProduct.weight ? String(newProduct.weight) : ''}
                onChangeText={v =>
                  setNewProduct(prev => ({
                    ...prev,
                    weight: v ? parseFloat(v) : undefined,
                  }))
                }
                keyboardType="decimal-pad"
                placeholder="Ex: 500"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Descrição</Text>

              <TextInput
                value={newProduct.description || ''}
                onChangeText={v =>
                  setNewProduct(prev => ({
                    ...prev,
                    description: v,
                  }))
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Descrição do produto"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.formInput,
                  styles.formTextArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={handleAddProduct}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                Adicionar Produto
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  header: {
    padding: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
  },

  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },

  productCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },

  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },

  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  weightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  productName: {
    fontSize: 14,
    fontWeight: '700',
  },

  productAbbr: {
    fontSize: 12,
    marginBottom: 4,
  },

  productDesc: {
    fontSize: 11,
  },

  productMeta: {
    alignItems: 'center',
    gap: 8,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },

  detailsContent: {
    padding: 16,
    paddingBottom: 32,
  },

  detailsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },

  detailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },

  detailsSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },

  detailsSection: {
    marginBottom: 18,
  },

  detailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },

  detailsText: {
    fontSize: 14,
    lineHeight: 22,
  },

  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },

  ingredientBullet: {
    fontSize: 14,
    fontWeight: '700',
  },

  ingredientText: {
    flex: 1,
    fontSize: 13,
  },

  formContent: {
    padding: 16,
    paddingBottom: 40,
  },

  formGroup: {
    marginBottom: 16,
  },

  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  formTextArea: {
    minHeight: 100,
  },

  submitBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
