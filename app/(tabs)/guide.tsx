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
  CATEGORY_COLORS,
  BusRoute,
  Chemistry,
  EPI,
  GuideCategory,
  Procedure,
  ProductDetail,
  Recipe,
  SafetyTip,
  Tutorial,
  defaultBusRoutes,
  defaultCatalog,
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

const fmtDur = (raw: string): string => {
  if (!raw || raw === '—') return '—';
  return raw
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+e\s+\d+\s+segundos?/g, '')
    .replace(/minutos?/g, 'min')
    .replace(/\s+/g, ' ')
    .trim();
};

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
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<ProductDetail | null>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [busTrackingModal, setBusTrackingModal] = useState(false);

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

  const filteredCatalog = useMemo(() => {
    const base = !q
      ? defaultCatalog
      : defaultCatalog.filter(p =>
          `${p.name} ${p.category} ${p.subcategory} ${p.activeIngredients.map(ai => ai.name).join(' ')}`.toLowerCase().includes(q)
        );
    return [...base].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [q]);

  const filteredChem = useMemo(() => {
    const base = !q
      ? chemistry
      : chemistry.filter(c => `${c.name} ${c.alias} ${c.className}`.toLowerCase().includes(q));
    return [...base].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
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
    {
      key: 'fretado',
      label: 'Fretado',
      icon: 'bus',
      color: '#0FA4AF',
      gradient: ['#0FA4AF', '#007B82'],
    },
  ];

  const getCourseCards = (): CourseCard[] => {
    const searchRecipes = activeCategory === 'receita' ? filteredRecipes : recipes;
    const searchChem = activeCategory === 'receita' ? [] : filteredChem;
    const searchProc = activeCategory === 'receita' ? [] : filteredProc;

    if (activeCategory === 'produtos') {
      return filteredCatalog.map((p, i) => {
        const catColor = CATEGORY_COLORS[p.category] ?? '#00BCFF';
        const catGradients: Record<string, string[]> = {
          Fungicida: ['#2A5A10', '#1A3A08'],
          Inseticida: ['#7A5200', '#4A3200'],
          Acaricida: ['#7A1040', '#4A0828'],
          'Regulador de Crescimento': ['#3A1A7A', '#220E4A'],
        };
        return {
          id: `cat-${p.id}-${i}`,
          title: p.name,
          subtitle: p.subcategory,
          description: p.purpose,
          icon: p.category === 'Fungicida' ? 'leaf' :
                p.category === 'Inseticida' ? 'bug' :
                p.category === 'Acaricida' ? 'analytics' : 'flask',
          color: catColor,
          gradientColors: catGradients[p.category] ?? ['#1A3A7A', '#0E1F4A'],
          duration: p.hasMassageEffect ? fmtDur(p.massageTime ?? '~5') : '—',
          level: p.isRecipe ? 'Receita' : 'Produto',
          lessons: p.activeIngredients.length,
          category: 'produtos' as GuideCategory,
          data: p,
          _catalogProduct: p,
        };
      });
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
        duration: r.massageTime ? fmtDur(r.massageTime) : 'A cronometrar',
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
    if (item.category === 'produtos' && (item as any)._catalogProduct) {
      setSelectedCatalogProduct((item as any)._catalogProduct as ProductDetail);
      setProductModalVisible(true);
      return;
    }
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
            <Text style={styles.cardBadgeText}>{item.duration}</Text>
          </View>
          {item.category !== 'produtos' && (
            <View style={styles.cardBadge}>
              <Ionicons name="layers-outline" size={12} color="#FFFFFF" />
              <Text style={styles.cardBadgeText}>{item.lessons} itens</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHeroCard = () => (
    <LinearGradient
      colors={isDark ? ['#0D2015', '#0A1C28'] : ['#F0FFF4', '#E8F6FE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroContent}>
        <View style={[styles.heroBadgeRow, { backgroundColor: isDark ? 'rgba(137,211,41,0.15)' : 'rgba(137,211,41,0.12)' }]}>
          <Ionicons name="leaf" size={12} color="#89D329" />
          <Text style={[styles.heroBadge, { color: '#89D329' }]}>GUIA TÉCNICO</Text>
        </View>
        <Text style={[styles.heroTitle, { color: isDark ? '#F0FFF4' : '#0D2636' }]}>
          Formulação{'\n'}Agrícola Bayer
        </Text>
        <Text style={[styles.heroDescription, { color: isDark ? '#9FB3C2' : '#475569' }]}>
          Tempos de massagem, receitas e procedimentos operacionais
        </Text>
      </View>
      <View style={styles.heroImageContainer}>
        <Ionicons
          name="flask"
          size={96}
          color={isDark ? 'rgba(137,211,41,0.07)' : 'rgba(0,120,50,0.06)'}
        />
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <LinearGradient
          colors={isDark ? ['#1A3A25', '#13212C'] : ['#F0FAF0', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Guia Técnico</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Conhecimento técnico especializado
            </Text>
          </View>
          <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
          </TouchableOpacity>
        </LinearGradient>

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
            placeholder="Buscar produtos, ingredientes, procedimentos..."
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

        {/* COURSES GRID OR BUS ROUTES */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : activeCategory === 'fretado' ? (
          <View style={styles.coursesSection}>
            {/* Tursan Info Card */}
            <LinearGradient
              colors={isDark ? ['#0A2A2E', '#05181C'] : ['#E0F7FA', '#B2EBF2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.busInfoCard, { borderColor: isDark ? '#0FA4AF44' : '#0FA4AF33' }]}
            >
              <View style={styles.busInfoRow}>
                <View style={[styles.busIconCircle, { backgroundColor: '#0FA4AF' }]}>
                  <Ionicons name="bus" size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.busInfoTitle, { color: isDark ? '#fff' : '#003E47' }]}>
                    Ônibus Fretado · Tursan
                  </Text>
                  <Text style={[styles.busInfoSub, { color: isDark ? '#9FB3C2' : '#00616E' }]}>
                    Prestadora de serviço de transporte Bayer
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.busTrackBtn, { backgroundColor: '#0FA4AF' }]}
                onPress={() => setBusTrackingModal(true)}
              >
                <Ionicons name="navigate-circle-outline" size={18} color="#fff" />
                <Text style={styles.busTrackBtnText}>Rastreamento ao Vivo (SmartBus)</Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Legend */}
            <View style={[styles.busLegendRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { color: '#0FA4AF', label: 'TURNO' },
                { color: '#F59E0B', label: 'ADM' },
              ].map(l => (
                <View key={l.label} style={styles.busLegendItem}>
                  <View style={[styles.busLegendDot, { backgroundColor: l.color }]} />
                  <Text style={[styles.busLegendLabel, { color: colors.textSecondary }]}>{l.label}</Text>
                </View>
              ))}
              <Text style={[styles.busLegendNote, { color: colors.textTertiary }]}>
                {defaultBusRoutes.length} linhas ativas
              </Text>
            </View>

            {/* Bus Routes */}
            {defaultBusRoutes.map((route) => (
              <View
                key={route.id}
                style={[styles.busRouteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.busRouteHeader}>
                  <View style={[styles.busRouteIconWrap, { backgroundColor: '#0FA4AF18' }]}>
                    <Ionicons name="bus" size={20} color="#0FA4AF" />
                  </View>
                  <Text style={[styles.busRouteName, { color: colors.textPrimary }]}>{route.name}</Text>
                  <View style={[styles.busRoutePBadge, { backgroundColor: '#EF444422', borderColor: '#EF4444' }]}>
                    <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 10 }}>P</Text>
                  </View>
                </View>
                <View style={[styles.busDivider, { backgroundColor: colors.border }]} />
                {route.schedules.map((sched, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.busScheduleRow,
                      idx < route.schedules.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
                    ]}
                  >
                    <Text style={[styles.busTime, { color: '#0FA4AF' }]}>{sched.time}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.busType, { color: sched.type === 'ADM' ? '#F59E0B' : colors.textPrimary }]}>
                        {sched.type}
                      </Text>
                      <Text style={[styles.busDays, { color: colors.textSecondary }]}>{sched.days}</Text>
                    </View>
                    <View style={[styles.busLineChip, { backgroundColor: '#003E4710', borderColor: '#0FA4AF33' }]}>
                      <Text style={{ color: '#0FA4AF', fontWeight: '800', fontSize: 12 }}>{sched.lineNumber}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.coursesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {categories.find(c => c.key === activeCategory)?.label}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {getCourseCards().length} {
                  activeCategory === 'produtos' ? 'produtos' :
                  activeCategory === 'receita' ? 'receitas' :
                  activeCategory === 'quimica' ? 'compostos' :
                  activeCategory === 'procedimentos' ? 'procedimentos' :
                  activeCategory === 'epis' ? 'EPIs' :
                  'itens'
                }
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
                    Nenhum item encontrado
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
                      {selectedItem?.category !== 'produtos' && (
                        <View style={styles.modalStat}>
                          <Ionicons name="layers-outline" size={16} color={colors.primary} />
                          <Text style={[styles.modalStatText, { color: colors.textSecondary }]}>
                            {selectedItem?.lessons} itens
                          </Text>
                        </View>
                      )}
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

      {/* BUS TRACKING MODAL */}
      <Modal
        visible={busTrackingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setBusTrackingModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={[styles.busModalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.busModalHandle} />
            <View style={styles.busModalHeaderRow}>
              <View style={[styles.busIconCircle, { backgroundColor: '#0FA4AF' }]}>
                <Ionicons name="navigate-circle" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.busModalTitle, { color: colors.textPrimary }]}>
                  Rastreamento ao Vivo
                </Text>
                <Text style={[styles.busModalSub, { color: colors.textSecondary }]}>
                  SmartBus · Tursan
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBusTrackingModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.busCredentialCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.busCredLabel, { color: colors.textTertiary }]}>LOGIN</Text>
              <Text style={[styles.busCredValue, { color: colors.textPrimary }]}>
                Utilize seu <Text style={{ color: '#0FA4AF', fontWeight: '800' }}>CPF ou e-mail corporativo</Text>
              </Text>
              <View style={[styles.busDivider, { backgroundColor: colors.border, marginVertical: 12 }]} />
              <Text style={[styles.busCredLabel, { color: colors.textTertiary }]}>SENHA</Text>
              <Text style={[styles.busCredValue, { color: colors.textPrimary }]}>
                Sua senha padrão Bayer / matrícula
              </Text>
            </View>

            <View style={[styles.busInfoStepsCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {[
                { icon: 'download-outline', text: 'Baixe o app SmartBus na Play Store ou App Store' },
                { icon: 'person-outline', text: 'Acesse com CPF ou e-mail corporativo Bayer' },
                { icon: 'location-outline', text: 'Selecione sua linha e acompanhe o ônibus em tempo real' },
                { icon: 'notifications-outline', text: 'Ative notificações para receber alertas de partida' },
              ].map((step, idx) => (
                <View key={idx} style={[styles.busStep, idx < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border + '55' }]}>
                  <View style={[styles.busStepNum, { backgroundColor: '#0FA4AF' }]}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{idx + 1}</Text>
                  </View>
                  <Ionicons name={step.icon as any} size={18} color="#0FA4AF" style={{ marginRight: 10 }} />
                  <Text style={[styles.busStepText, { color: colors.textPrimary }]}>{step.text}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.busAlertBanner, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B44' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 12, flex: 1 }}>
                Em caso de dúvidas, entre em contato com o RH ou com a Tursan.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* PRODUCT CATALOG DETAIL MODAL */}
      <Modal
        visible={productModalVisible}
        animationType="slide"
        onRequestClose={() => setProductModalVisible(false)}
      >
        {selectedCatalogProduct && (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Hero */}
            <LinearGradient
              colors={isDark
                ? (selectedCatalogProduct.category === 'Fungicida' ? ['#1A3A0A', '#0D2618'] :
                   selectedCatalogProduct.category === 'Inseticida' ? ['#3A2A00', '#1F1500'] :
                   selectedCatalogProduct.category === 'Acaricida' ? ['#3A0A22', '#200010'] :
                   ['#1E0A3A', '#10001F'])
                : ['#FFFFFF', '#F5F8FB']}
              style={{ padding: 20, paddingBottom: 24, gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => setProductModalVisible(false)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  marginBottom: 4,
                }}
              >
                <Ionicons name="chevron-down" size={22} color={isDark ? '#fff' : colors.textPrimary} />
              </TouchableOpacity>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                alignSelf: 'flex-start',
                backgroundColor: (CATEGORY_COLORS[selectedCatalogProduct.category] ?? '#89D329') + '25',
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: CATEGORY_COLORS[selectedCatalogProduct.category] ?? '#89D329' }}>
                  {selectedCatalogProduct.category.toUpperCase()}
                </Text>
              </View>
              <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.5, color: isDark ? '#FFFFFF' : colors.textPrimary }}>
                {selectedCatalogProduct.name}
              </Text>
              <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : colors.textSecondary }}>
                {selectedCatalogProduct.subcategory}
              </Text>
              {selectedCatalogProduct.hasMassageEffect && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: colors.infoBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 4 }}>
                  <Ionicons name="timer-outline" size={14} color={colors.info} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.info }}>
                    Massagem: {selectedCatalogProduct.massageTime}
                  </Text>
                </View>
              )}
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Special Note */}
              {!!selectedCatalogProduct.specialNote && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, backgroundColor: colors.warningBg, borderColor: colors.warning + '40' }}>
                  <Ionicons name="alert-circle" size={18} color={colors.warning} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500', color: colors.warning }}>
                    {selectedCatalogProduct.specialNote}
                  </Text>
                </View>
              )}

              {/* Finalidade */}
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textSecondary }}>FINALIDADE</Text>
                <Text style={{ fontSize: 14, lineHeight: 21, color: colors.textPrimary }}>{selectedCatalogProduct.purpose}</Text>
              </View>

              {/* Ingredientes */}
              {selectedCatalogProduct.activeIngredients.length > 0 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textSecondary }}>INGREDIENTES ATIVOS</Text>
                  {selectedCatalogProduct.activeIngredients.map((ai, idx) => (
                    <View key={`${ai.name}-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[selectedCatalogProduct.category] ?? '#89D329', marginTop: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                          {ai.name}{ai.percentage ? ` · ${ai.percentage}` : ''}
                        </Text>
                        {!!ai.role && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{ai.role}</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Massagem */}
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textSecondary }}>EFEITO DE MASSAGEM</Text>
                {selectedCatalogProduct.hasMassageEffect ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, backgroundColor: colors.infoBg, borderColor: colors.info + '30' }}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.info} />
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.info }}>
                      Possui massagem — {selectedCatalogProduct.massageTime}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, backgroundColor: colors.surfaceElevated, borderColor: colors.border }}>
                    <Ionicons name="close-circle-outline" size={18} color={colors.textTertiary} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Não possui efeito de massagem</Text>
                  </View>
                )}
              </View>

              {/* Características */}
              {selectedCatalogProduct.characteristics.length > 0 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textSecondary }}>CARACTERÍSTICAS</Text>
                  {selectedCatalogProduct.characteristics.map((c, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CATEGORY_COLORS[selectedCatalogProduct.category] ?? '#89D329', marginTop: 7 }} />
                      <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: colors.textPrimary }}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Orientações */}
              {selectedCatalogProduct.applicationGuidelines.length > 0 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textSecondary }}>ORIENTAÇÕES DE APLICAÇÃO</Text>
                  {selectedCatalogProduct.applicationGuidelines.map((g, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: CATEGORY_COLORS[selectedCatalogProduct.category] ?? '#89D329', minWidth: 18 }}>{i + 1}.</Text>
                      <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: colors.textPrimary }}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Informações Técnicas */}
              {selectedCatalogProduct.technicalInfo.length > 0 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.textSecondary }}>INFORMAÇÕES TÉCNICAS</Text>
                  {selectedCatalogProduct.technicalInfo.map((t, i) => (
                    <Text key={i} style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, paddingVertical: 3, borderBottomWidth: i < selectedCatalogProduct.technicalInfo.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }}>
                      {t}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
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
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
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
    justifyContent: 'center',
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

  // ── BUS / FRETADO STYLES ──────────────────────────────────────────
  busInfoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  busInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  busIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busInfoTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  busInfoSub: {
    fontSize: 12,
    marginTop: 2,
  },
  busTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
  },
  busTrackBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  busLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  busLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  busLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  busLegendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  busLegendNote: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
  },
  busRouteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  busRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  busRouteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busRouteName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  busRoutePBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  busScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  busTime: {
    fontSize: 15,
    fontWeight: '800',
    width: 54,
  },
  busType: {
    fontSize: 12,
    fontWeight: '700',
  },
  busDays: {
    fontSize: 11,
    marginTop: 1,
  },
  busLineChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },

  // ── BUS MODAL STYLES ─────────────────────────────────────────────
  busModalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  busModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 8,
  },
  busModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  busModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  busCredentialCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  busCredLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  busCredValue: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  busInfoStepsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  busStep: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  busStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  busStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  busAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
