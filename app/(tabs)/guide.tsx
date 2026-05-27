import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/auth';
import {
  Chemistry,
  EPI,
  GuideCategory,
  Procedure,
  Recipe,
  SafetyTip,
  Tutorial,
  defaultChemistry,
  defaultEPIs,
  defaultProcedures,
  defaultRecipes,
  defaultSafetyTips,
  defaultTutorials,
} from '../../src/guideData';
import { useTheme } from '../../src/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const GRID_GAP = 16;

interface CourseCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  gradientColors: string[];
  image?: string;
  duration: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  lessons: number;
  category: GuideCategory;
  data?: any;
  massageTime?: string;
}

export default function GuideScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('produtos');
  const [search, setSearch] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [chemistry, setChemistry] = useState<Chemistry[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [epis, setEPIs] = useState<EPI[]>([]);
  const [safetyTips, setSafetyTips] = useState<SafetyTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const r = await api.get('/recipes');
      const baseRecipes = r.data.recipes ?? [];
      const baseChemistry = r.data.chemistry ?? [];
      const baseProcedures = r.data.procedures ?? [];

      setRecipes(baseRecipes.length > 0 ? baseRecipes : defaultRecipes);
      setChemistry(baseChemistry.length > 0 ? baseChemistry : defaultChemistry);
      setProcedures(baseProcedures.length > 0 ? baseProcedures : defaultProcedures);
    } catch (e) {
      console.log('Erro recipes:', e);
      setRecipes(defaultRecipes);
      setChemistry(defaultChemistry);
      setProcedures(defaultProcedures);
    } finally {
      setTutorials(defaultTutorials);
      setEPIs(defaultEPIs);
      setSafetyTips(defaultSafetyTips);
      setLoading(false);
    }
  };

  const q = search.trim().toLowerCase();

  const filteredRecipes = useMemo(() => {
    if (!q) return recipes;
    return recipes.filter(r =>
      `${r.product} ${r.recipe} ${r.active_ingredient} ${r.category}`.toLowerCase().includes(q)
    );
  }, [recipes, q]);

  const filteredChem = useMemo(() => {
    if (!q) return chemistry;
    return chemistry.filter(c => `${c.name} ${c.alias} ${c.className}`.toLowerCase().includes(q));
  }, [chemistry, q]);

  const filteredProc = useMemo(() => {
    if (!q) return procedures;
    return procedures.filter(p => `${p.title} ${p.content}`.toLowerCase().includes(q));
  }, [procedures, q]);

  const filteredTutorials = useMemo(() => {
    if (!q) return tutorials;
    return tutorials.filter(t => `${t.title} ${t.description}`.toLowerCase().includes(q));
  }, [tutorials, q]);

  const filteredEPIs = useMemo(() => {
    if (!q) return epis;
    return epis.filter(e => `${e.name} ${e.description}`.toLowerCase().includes(q));
  }, [epis, q]);

  const filteredSafety = useMemo(() => {
    if (!q) return safetyTips;
    return safetyTips.filter(s => `${s.title} ${s.description}`.toLowerCase().includes(q));
  }, [safetyTips, q]);

  const categories: {
    key: GuideCategory;
    label: string;
    icon: string;
    color: string;
    gradient: string[];
  }[] = [
    {
      key: 'produtos',
      label: 'Produtos',
      icon: 'flask',
      color: '#00BCFF',
      gradient: ['#00BCFF', '#0099CC'],
    },
    {
      key: 'receita',
      label: 'Receitas',
      icon: 'list',
      color: '#10B981',
      gradient: ['#10B981', '#059669'],
    },
    {
      key: 'quimica',
      label: 'Química',
      icon: 'leaf',
      color: '#89D329',
      gradient: ['#89D329', '#6BA31F'],
    },
    {
      key: 'procedimentos',
      label: 'Procedimentos',
      icon: 'cog',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#D97706'],
    },
    {
      key: 'tutorial',
      label: 'Tutoriais',
      icon: 'play-circle',
      color: '#EC4899',
      gradient: ['#EC4899', '#BE185D'],
    },
    {
      key: 'epis',
      label: 'EPIs',
      icon: 'shield',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#6D28D9'],
    },
    {
      key: 'seguranca',
      label: 'Segurança',
      icon: 'warning',
      color: '#EF4444',
      gradient: ['#EF4444', '#DC2626'],
    },
  ];

  const getCourseCards = (): CourseCard[] => {
    const searchRecipes = activeCategory === 'receita' ? filteredRecipes : recipes;
    const searchChem = activeCategory === 'receita' ? [] : filteredChem;
    const searchProc = activeCategory === 'receita' ? [] : filteredProc;

    if (activeCategory === 'produtos') {
      return filteredRecipes.map((r, i) => ({
        id: `prod-${i}`,
        title: r.product,
        subtitle: r.recipe,
        description: r.notes,
        icon: 'flask',
        color: '#00BCFF',
        gradientColors: ['#00BCFF', '#0099CC'],
        duration: r.duration || '8-10',
        level: 'Intermediário',
        lessons: 4,
        category: 'produtos',
        data: r,
      }));
    }
    if (activeCategory === 'receita') {
      return filteredRecipes.map((r, i) => ({
        id: `rec-${i}`,
        title: r.product,
        subtitle: r.recipe,
        description: r.category,
        icon: 'list',
        color: '#10B981',
        gradientColors: ['#10B981', '#059669'],
        duration: r.massageTime || 'A cronometrar',
        level: (r.difficulty as any) || 'Intermediário',
        lessons: 1,
        category: 'receita',
        data: r,
        massageTime: r.massageTime,
      }));
    }
    if (activeCategory === 'quimica') {
      return filteredChem.map((c, i) => ({
        id: `chem-${i}`,
        title: c.name,
        subtitle: c.alias,
        description: c.func,
        icon: 'leaf',
        color: '#89D329',
        gradientColors: ['#89D329', '#6BA31F'],
        duration: 'N/A',
        level: 'Avançado',
        lessons: 3,
        category: 'quimica',
        data: c,
      }));
    }
    if (activeCategory === 'procedimentos') {
      return filteredProc.map((p, i) => ({
        id: `proc-${i}`,
        title: p.title,
        subtitle: 'Passo a passo',
        description: p.content.split('\n')[0],
        icon: p.icon,
        color: '#F59E0B',
        gradientColors: ['#F59E0B', '#D97706'],
        duration: p.duration || '15-20',
        level: 'Iniciante',
        lessons: 5,
        category: 'procedimentos',
        data: p,
      }));
    }
    if (activeCategory === 'tutorial') {
      return filteredTutorials.map((t, i) => ({
        id: `tut-${i}`,
        title: t.title,
        subtitle: t.level,
        description: t.description,
        icon: 'play-circle',
        color: '#EC4899',
        gradientColors: ['#EC4899', '#BE185D'],
        duration: t.duration,
        level: (t.level as any) || 'Iniciante',
        lessons: 1,
        category: 'tutorial',
        data: t,
      }));
    }
    if (activeCategory === 'epis') {
      return filteredEPIs.map((e, i) => ({
        id: `epi-${i}`,
        title: e.name,
        subtitle: e.category,
        description: e.description,
        icon: 'shield',
        color: '#8B5CF6',
        gradientColors: ['#8B5CF6', '#6D28D9'],
        duration: e.importance,
        level: (e.importance as any) || 'Médio',
        lessons: 1,
        category: 'epis',
        data: e,
      }));
    }
    if (activeCategory === 'seguranca') {
      return filteredSafety.map((s, i) => ({
        id: `safe-${i}`,
        title: s.title,
        subtitle: s.severity,
        description: s.description,
        icon: 'alert-circle',
        color: '#EF4444',
        gradientColors: ['#EF4444', '#DC2626'],
        duration: s.severity,
        level: (s.severity as any) || 'Médio',
        lessons: 1,
        category: 'seguranca',
        data: s,
      }));
    }
    return [];
  };

  const openDetail = (item: CourseCard) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const navigateToDetail = (item: CourseCard) => {
    router.push({
      pathname: '/guide-detail',
      params: {
        itemId: item.id,
        category: item.category,
        title: item.title,
      },
    });
    setModalVisible(false);
  };

  const renderCourseCard = ({ item }: { item: CourseCard }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openDetail(item)}
      style={styles.cardWrapper}
    >
      <LinearGradient
        colors={item.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.courseCard}
      >
        <View style={styles.cardIconContainer}>
          <Ionicons name={item.icon} size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.cardBadge}>
            <Ionicons name="time-outline" size={12} color="#FFFFFF" />
            <Text style={styles.cardBadgeText}>{item.duration} min</Text>
          </View>
          <View style={styles.cardBadge}>
            <Ionicons name="book-outline" size={12} color="#FFFFFF" />
            <Text style={styles.cardBadgeText}>{item.lessons} aulas</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHeroCard = () => (
    <LinearGradient
      colors={isDark ? ['#2d2d3d', '#1a1a2e'] : ['#f0f4f8', '#e2e8f0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroContent}>
        <Text style={[styles.heroBadge, { color: isDark ? '#a0aec0' : '#4a5568' }]}>
          🎓 GUIA COMPLETO
        </Text>
        <Text style={[styles.heroTitle, { color: isDark ? '#e2e8f0' : '#1a202c' }]}>
          Aprenda sobre{'\n'}Formulação Agrícola
        </Text>
        <Text style={[styles.heroDescription, { color: isDark ? '#cbd5e0' : '#4a5568' }]}>
          Domine as técnicas de massagem, conheça os produtos e garanta a qualidade do seu processo
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatNumber, { color: isDark ? '#e2e8f0' : '#1a202c' }]}>
              50+
            </Text>
            <Text style={[styles.heroStatLabel, { color: isDark ? '#a0aec0' : '#718096' }]}>
              Produtos
            </Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatNumber, { color: isDark ? '#e2e8f0' : '#1a202c' }]}>
              30+
            </Text>
            <Text style={[styles.heroStatLabel, { color: isDark ? '#a0aec0' : '#718096' }]}>
              Ingredientes
            </Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatNumber, { color: isDark ? '#e2e8f0' : '#1a202c' }]}>
              15+
            </Text>
            <Text style={[styles.heroStatLabel, { color: isDark ? '#a0aec0' : '#718096' }]}>
              Procedimentos
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.heroImageContainer}>
        <Ionicons
          name="school-outline"
          size={120}
          color={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
        />
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>📚 Guia de Estudos</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Conhecimento técnico especializado
            </Text>
          </View>
          <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* SEARCH */}
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar cursos, produtos, ingredientes..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* HERO BANNER */}
        {renderHeroCard()}

        {/* CATEGORY TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map(cat => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setActiveCategory(cat.key)}
                style={[
                  styles.categoryTab,
                  {
                    backgroundColor: isActive ? cat.color : colors.surface,
                    borderColor: isActive ? cat.color : colors.border,
                  },
                ]}
              >
                <LinearGradient
                  colors={isActive ? cat.gradient : ['transparent', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.categoryGradient}
                >
                  <Ionicons
                    name={cat.icon}
                    size={20}
                    color={isActive ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      {
                        color: isActive ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* COURSES GRID */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <View style={styles.coursesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {categories.find(c => c.key === activeCategory)?.label}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {getCourseCards().length} cursos
              </Text>
            </View>
            <FlatList
              data={getCourseCards()}
              renderItem={renderCourseCard}
              keyExtractor={item => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
              columnWrapperStyle={styles.gridRow}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={64} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Nenhum curso encontrado
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </ScrollView>

      {/* DETAIL MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 50 : 100} style={StyleSheet.absoluteFill}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.modalIconContainer}>
                  <Ionicons name={selectedItem?.icon || 'book'} size={40} color="#FFFFFF" />
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {selectedItem?.title}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedItem?.subtitle}
                </Text>

                <View style={styles.modalStats}>
                  <View style={styles.modalStat}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={[styles.modalStatText, { color: colors.textSecondary }]}>
                      {selectedItem?.category === 'receita'
                        ? selectedItem?.massageTime || selectedItem?.duration
                        : `${selectedItem?.duration}${selectedItem?.category === 'receita' ? '' : ' min'}`}
                    </Text>
                  </View>
                  {selectedItem?.category !== 'receita' && (
                    <>
                      <View style={styles.modalStat}>
                        <Ionicons name="book-outline" size={16} color={colors.primary} />
                        <Text style={[styles.modalStatText, { color: colors.textSecondary }]}>
                          {selectedItem?.lessons} aula(s)
                        </Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
                        <Text style={[styles.modalStatText, { color: colors.textSecondary }]}>
                          {selectedItem?.level}
                        </Text>
                      </View>
                    </>
                  )}
                  {selectedItem?.category === 'receita' && (
                    <View style={styles.modalStat}>
                      <Ionicons name="flask-outline" size={16} color={colors.primary} />
                      <Text style={[styles.modalStatText, { color: colors.textSecondary }]}>
                        {selectedItem?.level}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                <Text style={[styles.modalDescription, { color: colors.textPrimary }]}>
                  {selectedItem?.description}
                </Text>

                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigateToDetail(selectedItem)}
                >
                  <Text style={styles.startButtonText}>Mais Detalhes</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  heroCard: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    minHeight: 200,
  },
  heroContent: {
    flex: 1,
  },
  heroBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 36,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 20,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroStatLabel: {
    fontSize: 11,
  },
  heroImageContainer: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.3,
  },
  categoriesScroll: {
    marginVertical: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryTab: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 14,
  },
  coursesSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
  },
  gridContainer: {
    paddingHorizontal: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: 4,
  },
  courseCard: {
    borderRadius: 20,
    padding: 16,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cardBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalClose: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00BCFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 16,
  },
  modalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalStatText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 20,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
