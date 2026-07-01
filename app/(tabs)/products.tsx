import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import {
  CATEGORY_COLORS,
  ProductCategory,
  ProductDetail,
  defaultCatalog,
} from '../../src/guideData';
import { useTheme } from '../../src/theme';

type ExtendedProduct = ProductDetail & { isCustom?: boolean };

function parseMassageSeconds(massageTime: string): number {
  const rangeMatch = massageTime.match(/(\d+)[–\-](\d+)\s*minuto/);
  if (rangeMatch) {
    const avg = (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
    return Math.round(avg * 60);
  }
  let total = 0;
  const minMatch = massageTime.match(/(\d+)\s*minuto/);
  if (minMatch) total += parseInt(minMatch[1]) * 60;
  const secMatch = massageTime.match(/(\d+)\s*segundo/);
  if (secMatch) total += parseInt(secMatch[1]);
  return total > 0 ? total : 300;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ALL_CATEGORIES: ProductCategory[] = [
  'Fungicida',
  'Inseticida',
  'Acaricida',
  'Regulador de Crescimento',
];

const CATEGORY_ICONS: Record<ProductCategory, React.ComponentProps<typeof Ionicons>['name']> = {
  Fungicida: 'leaf',
  Inseticida: 'bug',
  Acaricida: 'analytics',
  'Regulador de Crescimento': 'flask',
};

const CATEGORY_GRADIENTS: Record<ProductCategory, string[]> = {
  Fungicida: ['#1A3A0A', '#0D2618'],
  Inseticida: ['#3A2A00', '#1F1500'],
  Acaricida: ['#3A0A22', '#200010'],
  'Regulador de Crescimento': ['#1E0A3A', '#10001F'],
};

export default function ProductsScreen() {
  const { colors, isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [customProducts, setCustomProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ExtendedProduct | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Fungicida');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [timerVisible, setTimerVisible] = useState(false);
  const [timerTotal, setTimerTotal] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [timerProductName, setTimerProductName] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimerRemaining(r => {
          if (r <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            setTimerDone(true);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  function openTimer(productName: string, massageTime: string) {
    const secs = parseMassageSeconds(massageTime);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerProductName(productName);
    setTimerTotal(secs);
    setTimerRemaining(secs);
    setTimerRunning(false);
    setTimerDone(false);
    setTimerVisible(true);
  }

  function closeTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerVisible(false);
  }

  const timerProgress = timerTotal > 0 ? (timerTotal - timerRemaining) / timerTotal : 0;

  const fetchCustomProducts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/products');
      const apiProducts: { name: string; abbr: string }[] = Array.isArray(r.data) ? r.data : [];
      const catalogNames = new Set(defaultCatalog.map(p => p.name.toUpperCase()));
      const customs = apiProducts
        .filter(p => !catalogNames.has((p.name || '').toUpperCase()))
        .map(p => ({
          id: `custom-${p.name}`,
          name: p.name,
          category: 'Inseticida' as ProductCategory,
          subcategory: 'Produto personalizado',
          purpose: 'Produto adicionado manualmente ao catálogo.',
          characteristics: [],
          activeIngredients: [],
          hasMassageEffect: false,
          applicationGuidelines: [],
          technicalInfo: [],
          isRecipe: false,
          isCustom: true,
        }));
      setCustomProducts(customs);
    } catch {
      setCustomProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCustomProducts();
    }, [fetchCustomProducts])
  );

  const allProducts: ExtendedProduct[] = useMemo(
    () => [...defaultCatalog, ...customProducts],
    [customProducts]
  );

  const filtered = useMemo(() => {
    let list = allProducts;
    if (activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.activeIngredients.some(ai => ai.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allProducts, activeCategory, search]);

  const grouped = useMemo(() => {
    const g: Record<string, ExtendedProduct[]> = {};
    filtered.forEach(p => {
      if (!g[p.category]) g[p.category] = [];
      g[p.category].push(p);
    });
    return g;
  }, [filtered]);

  const totalCount = filtered.length;

  const handleAddProduct = async () => {
    if (!newName.trim()) {
      Alert.alert('Atenção', 'O nome do produto é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/products', { name: newName.trim().toUpperCase(), abbr: '' });
      await fetchCustomProducts();
      setAddVisible(false);
      setNewName('');
      setNewCategory('Fungicida');
      setNewDescription('');
      Alert.alert('Sucesso', `"${newName.trim().toUpperCase()}" adicionado ao catálogo.`);
    } catch {
      Alert.alert('Erro', 'Falha ao adicionar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (product: ExtendedProduct) => {
    setSelectedProduct(product);
    setDetailVisible(true);
  };

  const catColor = (cat: ProductCategory) => CATEGORY_COLORS[cat] ?? colors.primary;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Catálogo</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {loading ? 'Carregando…' : `${totalCount} produto${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddVisible(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por produto ou ingrediente…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CATEGORY FILTER */}
      <View style={[styles.filterWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[{ key: 'all', label: 'Todos' }, ...ALL_CATEGORIES.map(c => ({ key: c, label: c }))].map(item => {
            const isActive = activeCategory === item.key;
            const color = item.key === 'all' ? colors.secondary : catColor(item.key as ProductCategory);
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setActiveCategory(item.key as ProductCategory | 'all')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? color + '22' : 'transparent',
                    borderColor: isActive ? color : colors.border,
                  },
                ]}
              >
                {item.key !== 'all' && (
                  <View style={[styles.filterDot, { backgroundColor: catColor(item.key as ProductCategory) }]} />
                )}
                <Text style={[styles.filterLabel, { color: isActive ? color : colors.textSecondary, fontWeight: isActive ? '700' : '500' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={52} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Nenhum produto</Text>
          <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
            Tente outro termo ou categoria
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {Object.entries(grouped).map(([cat, items]) => (
            <View key={cat}>
              {/* Category group header */}
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: catColor(cat as ProductCategory) }]} />
                <Ionicons name={CATEGORY_ICONS[cat as ProductCategory] ?? 'flask-outline'} size={15} color={catColor(cat as ProductCategory)} />
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{cat.toUpperCase()}</Text>
                <Text style={[styles.groupCount, { color: colors.textTertiary }]}>{items.length}</Text>
              </View>

              {/* Product cards */}
              <View style={{ gap: 8 }}>
                {items.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => openDetail(product)}
                    activeOpacity={0.82}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderLeftColor: catColor(product.category),
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text style={[styles.productName, { color: colors.textPrimary }]}>
                        {product.name}
                      </Text>
                      <Text style={[styles.productSubcat, { color: colors.textSecondary }]} numberOfLines={1}>
                        {product.subcategory}
                      </Text>
                      {product.activeIngredients.length > 0 && (
                        <View style={styles.ingredientTags}>
                          {product.activeIngredients.slice(0, 2).map(ai => (
                            <View
                              key={ai.name}
                              style={[styles.ingredientTag, { backgroundColor: catColor(product.category) + '15', borderColor: catColor(product.category) + '30' }]}
                            >
                              <Text style={[styles.ingredientTagText, { color: catColor(product.category) }]}>
                                {ai.name}
                              </Text>
                            </View>
                          ))}
                          {product.activeIngredients.length > 2 && (
                            <Text style={[styles.moreTag, { color: colors.textTertiary }]}>
                              +{product.activeIngredients.length - 2}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.cardRight}>
                      {product.hasMassageEffect && (
                        <View style={[styles.massageBadge, { backgroundColor: colors.infoBg }]}>
                          <Ionicons name="time-outline" size={11} color={colors.info} />
                          <Text style={[styles.massageBadgeText, { color: colors.info }]}>Massagem</Text>
                        </View>
                      )}
                      {product.specialNote && (
                        <View style={[styles.alertBadge, { backgroundColor: colors.warningBg }]}>
                          <Ionicons name="alert-circle-outline" size={11} color={colors.warning} />
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── PRODUCT DETAIL MODAL ── */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        {selectedProduct && (
          <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Modal Header */}
            <LinearGradient
              colors={isDark ? CATEGORY_GRADIENTS[selectedProduct.category] : ['#FFFFFF', '#F5F8FB']}
              style={styles.detailHero}
            >
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Ionicons name="chevron-down" size={22} color={isDark ? '#fff' : colors.textPrimary} />
              </TouchableOpacity>

              <View style={[styles.heroCategoryBadge, { backgroundColor: catColor(selectedProduct.category) + '25' }]}>
                <Ionicons name={CATEGORY_ICONS[selectedProduct.category] ?? 'flask-outline'} size={13} color={catColor(selectedProduct.category)} />
                <Text style={[styles.heroCategoryText, { color: catColor(selectedProduct.category) }]}>
                  {selectedProduct.category.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.heroName, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>
                {selectedProduct.name}
              </Text>
              <Text style={[styles.heroSubcat, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>
                {selectedProduct.subcategory}
              </Text>

              {selectedProduct.hasMassageEffect && (
                <View style={[styles.heroMassageBadge, { backgroundColor: isDark ? 'rgba(0,188,255,0.2)' : colors.infoBg }]}>
                  <Ionicons name="timer-outline" size={14} color={colors.info} />
                  <Text style={[styles.heroMassageText, { color: colors.info }]}>
                    Tempo de massagem: {selectedProduct.massageTime}
                  </Text>
                </View>
              )}
            </LinearGradient>

            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Special Note Banner */}
              {!!selectedProduct.specialNote && (
                <View style={[styles.specialNote, { backgroundColor: colors.warningBg, borderColor: colors.warning + '40' }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.warning} style={{ marginTop: 1 }} />
                  <Text style={[styles.specialNoteText, { color: colors.warning }]}>
                    {selectedProduct.specialNote}
                  </Text>
                </View>
              )}

              {/* Finalidade */}
              <DetailSection icon="information-circle-outline" title="Finalidade e Indicação de Uso" iconColor={catColor(selectedProduct.category)} colors={colors}>
                <Text style={[styles.sectionBody, { color: colors.textPrimary }]}>
                  {selectedProduct.purpose}
                </Text>
              </DetailSection>

              {/* Ingredientes Ativos */}
              {selectedProduct.activeIngredients.length > 0 && (
                <DetailSection icon="flask-outline" title="Ingredientes Ativos" iconColor={catColor(selectedProduct.category)} colors={colors}>
                  {selectedProduct.activeIngredients.map((ai, idx) => (
                    <View key={`${ai.name}-${idx}`} style={[styles.aiRow, { borderBottomColor: colors.border, borderBottomWidth: idx < selectedProduct.activeIngredients.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                      <View style={[styles.aiDot, { backgroundColor: catColor(selectedProduct.category) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.aiName, { color: colors.textPrimary }]}>
                          {ai.name}
                          {ai.percentage ? ` · ${ai.percentage}` : ''}
                        </Text>
                        {!!ai.role && (
                          <Text style={[styles.aiRole, { color: colors.textSecondary }]}>{ai.role}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </DetailSection>
              )}

              {/* Efeito Massagem */}
              <DetailSection
                icon="timer-outline"
                title="Efeito de Massagem"
                iconColor={selectedProduct.hasMassageEffect ? colors.info : colors.textTertiary}
                colors={colors}
              >
                {selectedProduct.hasMassageEffect ? (
                  <>
                    <View style={[styles.massageInfo, { backgroundColor: colors.infoBg, borderColor: colors.info + '30' }]}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.info} />
                      <Text style={[styles.massageInfoText, { color: colors.info }]}>
                        Possui efeito de massagem
                      </Text>
                    </View>
                    {!!selectedProduct.massageTime && (
                      <>
                        <Text style={[styles.sectionBody, { color: colors.textPrimary, marginTop: 8 }]}>
                          Tempo: <Text style={{ fontWeight: '700' }}>{selectedProduct.massageTime}</Text>
                        </Text>
                        <TouchableOpacity
                          style={[styles.timerBtn, { backgroundColor: colors.info }]}
                          onPress={() => openTimer(selectedProduct.name, selectedProduct.massageTime!)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="timer-outline" size={18} color="#fff" />
                          <Text style={styles.timerBtnText}>Iniciar Massagem</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {!!selectedProduct.massageNotes && (
                      <Text style={[styles.sectionNote, { color: colors.textSecondary }]}>
                        {selectedProduct.massageNotes}
                      </Text>
                    )}
                  </>
                ) : (
                  <View style={[styles.massageInfo, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Ionicons name="close-circle-outline" size={18} color={colors.textTertiary} />
                    <Text style={[styles.massageInfoText, { color: colors.textSecondary }]}>
                      Não possui efeito de massagem
                    </Text>
                  </View>
                )}
              </DetailSection>

              {/* Características */}
              {selectedProduct.characteristics.length > 0 && (
                <DetailSection icon="star-outline" title="Principais Características" iconColor={catColor(selectedProduct.category)} colors={colors}>
                  {selectedProduct.characteristics.map((c, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: catColor(selectedProduct.category) }]} />
                      <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{c}</Text>
                    </View>
                  ))}
                </DetailSection>
              )}

              {/* Receitas */}
              {selectedProduct.isRecipe && (selectedProduct.compatibleRecipes?.length ?? 0) > 0 && (
                <DetailSection icon="list-outline" title="Receitas e Compatibilidades" iconColor={colors.success} colors={colors}>
                  {selectedProduct.compatibleRecipes!.map((r, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons name="checkmark" size={14} color={colors.success} />
                      <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{r}</Text>
                    </View>
                  ))}
                </DetailSection>
              )}

              {!selectedProduct.isRecipe && (
                <DetailSection icon="list-outline" title="Receitas e Compatibilidades" iconColor={colors.textTertiary} colors={colors}>
                  <View style={[styles.notRecipeInfo, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.massageInfoText, { color: colors.textSecondary }]}>
                      Este produto não é categorizado como receita de tratamento de sementes.
                    </Text>
                  </View>
                </DetailSection>
              )}

              {/* Orientações de Aplicação */}
              {selectedProduct.applicationGuidelines.length > 0 && (
                <DetailSection icon="clipboard-outline" title="Orientações de Aplicação" iconColor={catColor(selectedProduct.category)} colors={colors}>
                  {selectedProduct.applicationGuidelines.map((g, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={[styles.bulletNumber, { color: catColor(selectedProduct.category) }]}>{i + 1}.</Text>
                      <Text style={[styles.bulletText, { color: colors.textPrimary }]}>{g}</Text>
                    </View>
                  ))}
                </DetailSection>
              )}

              {/* Informações Técnicas */}
              {selectedProduct.technicalInfo.length > 0 && (
                <DetailSection icon="document-text-outline" title="Informações Técnicas" iconColor={colors.textSecondary} colors={colors}>
                  {selectedProduct.technicalInfo.map((t, i) => (
                    <View key={i} style={[styles.techRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.techText, { color: colors.textSecondary }]}>{t}</Text>
                    </View>
                  ))}
                </DetailSection>
              )}

              {/* Bags por Lote */}
              {!!selectedProduct.bagsPerLot && (
                <DetailSection icon="archive-outline" title="Embalagem / Lote" iconColor={colors.secondary} colors={colors}>
                  <View style={[styles.massageInfo, { backgroundColor: colors.infoBg, borderColor: colors.info + '30' }]}>
                    <Ionicons name="cube-outline" size={18} color={colors.info} />
                    <Text style={[styles.massageInfoText, { color: colors.info }]}>
                      <Text style={{ fontWeight: '800' }}>{selectedProduct.bagsPerLot} bags</Text> por lote
                    </Text>
                  </View>
                </DetailSection>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── ADD PRODUCT MODAL ── */}
      <Modal visible={addVisible} animationType="slide" transparent onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView
          style={styles.addBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.addSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.addHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.addTitle, { color: colors.textPrimary }]}>Novo Produto</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 6 }}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>NOME DO PRODUTO</Text>
                <TextInput
                  value={newName}
                  onChangeText={v => setNewName(v.toUpperCase())}
                  placeholder="Ex: NOME DO PRODUTO"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                  style={[styles.formInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>CATEGORIA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {ALL_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewCategory(cat)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: newCategory === cat ? catColor(cat) + '22' : 'transparent',
                          borderColor: newCategory === cat ? catColor(cat) : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.filterDot, { backgroundColor: catColor(cat) }]} />
                      <Text style={[styles.filterLabel, { color: newCategory === cat ? catColor(cat) : colors.textSecondary, fontWeight: newCategory === cat ? '700' : '500' }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>DESCRIÇÃO (opcional)</Text>
                <TextInput
                  value={newDescription}
                  onChangeText={setNewDescription}
                  placeholder="Finalidade, indicação de uso..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.formInput,
                    {
                      height: 80,
                      textAlignVertical: 'top',
                      paddingTop: 12,
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                onPress={handleAddProduct}
                disabled={saving}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.8 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#000" />
                    <Text style={[styles.saveBtnText, { color: '#000' }]}>Adicionar ao Catálogo</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Timer de Massagem ── */}
      <Modal visible={timerVisible} animationType="fade" transparent onRequestClose={closeTimer}>
        <View style={styles.timerOverlay}>
          <View style={[styles.timerCard, { backgroundColor: isDark ? '#0E1F10' : '#0A2B10' }]}>
            {/* Header */}
            <View style={styles.timerCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timerLabel}>MASSAGEM — {timerProductName}</Text>
                <Text style={styles.timerSubLabel}>{formatTime(timerTotal)} no total</Text>
              </View>
              <TouchableOpacity onPress={closeTimer} hitSlop={10}>
                <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Progress ring area */}
            <View style={styles.timerRingContainer}>
              {/* Outer ring background */}
              <View style={[styles.timerRingBg, { borderColor: 'rgba(255,255,255,0.1)' }]} />
              {/* Progress indicator (filled arc via rotation trick - left half) */}
              {timerProgress >= 0 && (
                <View
                  style={[
                    styles.timerRingProgress,
                    {
                      borderColor: timerDone ? '#4CAF50' : '#00BFFF',
                      transform: [{ rotate: `${Math.min(timerProgress, 0.5) * 360}deg` }],
                    },
                  ]}
                />
              )}
              {/* Center content */}
              <View style={styles.timerCenter}>
                {timerDone ? (
                  <>
                    <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                    <Text style={[styles.timerDoneText, { color: '#4CAF50' }]}>Concluído!</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.timerCountdown}>{formatTime(timerRemaining)}</Text>
                    <Text style={styles.timerCountdownSub}>
                      {timerRunning ? 'em progresso' : timerRemaining === timerTotal ? 'pronto para iniciar' : 'pausado'}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.timerBarBg}>
              <View
                style={[
                  styles.timerBarFill,
                  {
                    width: `${timerProgress * 100}%` as any,
                    backgroundColor: timerDone ? '#4CAF50' : '#00BFFF',
                  },
                ]}
              />
            </View>
            <Text style={styles.timerBarLabel}>
              {Math.round(timerProgress * 100)}% concluído
            </Text>

            {/* Buttons */}
            <View style={styles.timerBtns}>
              <TouchableOpacity
                style={[styles.timerControlBtn, { backgroundColor: 'rgba(255,255,255,0.1)', flex: 1 }]}
                onPress={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setTimerRunning(false);
                  setTimerRemaining(timerTotal);
                  setTimerDone(false);
                }}
              >
                <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.timerControlBtnText}>Reiniciar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.timerControlBtn,
                  {
                    backgroundColor: timerDone ? '#4CAF50' : timerRunning ? '#FF6B35' : '#00BFFF',
                    flex: 2,
                  },
                ]}
                onPress={() => {
                  if (timerDone) {
                    setTimerRemaining(timerTotal);
                    setTimerDone(false);
                  } else {
                    setTimerRunning(r => !r);
                  }
                }}
              >
                <Ionicons
                  name={timerDone ? 'refresh-circle' : timerRunning ? 'pause' : 'play'}
                  size={22}
                  color="#fff"
                />
                <Text style={[styles.timerControlBtnText, { color: '#fff', fontWeight: '700' }]}>
                  {timerDone ? 'Repetir' : timerRunning ? 'Pausar' : 'Iniciar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helper component ──
function DetailSection({
  icon,
  title,
  iconColor,
  colors,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  iconColor: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[sectionStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={sectionStyles.header}>
        <View style={[sectionStyles.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[sectionStyles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={{ gap: 8, paddingTop: 4 }}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterWrapper: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 6,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterLabel: { fontSize: 12 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySub: { fontSize: 13 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  groupCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  productSubcat: {
    fontSize: 12,
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  ingredientTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  ingredientTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreTag: {
    fontSize: 11,
    alignSelf: 'center',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  massageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  massageBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  alertBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // DETAIL MODAL
  detailHero: {
    padding: 20,
    paddingBottom: 24,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSubcat: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroMassageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  heroMassageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  specialNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  specialNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  sectionNote: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  aiName: {
    fontSize: 14,
    fontWeight: '700',
  },
  aiRole: {
    fontSize: 12,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletNumber: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
    minWidth: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  massageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  massageInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  notRecipeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  techRow: {
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  techText: {
    fontSize: 12,
    lineHeight: 18,
  },
  // ADD MODAL
  addBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  addSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  addHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  addTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  formInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    height: 46,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: {
    fontWeight: '800',
    fontSize: 16,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 14,
  },
  timerBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  timerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  timerCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  timerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timerSubLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  timerRingContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  timerRingBg: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
  },
  timerRingProgress: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  timerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  timerCountdown: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 72,
    fontVariant: ['tabular-nums'],
  },
  timerCountdownSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timerDoneText: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  timerBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerBarLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    alignSelf: 'flex-start',
    marginTop: -8,
  },
  timerBtns: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  timerControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  timerControlBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
