import { Ionicons } from '@expo/vector-icons';
import BayerLogo from '../../src/BayerLogo';
import React, { useState } from 'react';
import {
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
import { useTheme } from '../../src/theme';

type WorkerStatus = 'ativo' | 'ferias' | 'administrativo' | 'afastado';
type Worker = { id: string; name: string; position: string; status: WorkerStatus; role?: string };
type Shift = {
  id: string;
  name: string;
  line: string;
  product?: string;
  obs?: string;
  workers: Worker[];
};

const SHIFTS: Shift[] = [
  {
    id: 'sc1',
    name: 'SC I',
    line: 'Linha 1',
    product: 'Verango',
    workers: [
      { id: '1a', name: 'Cristiano', position: 'ESP', status: 'ativo', role: 'Especialista' },
      { id: '1b', name: 'Leandro M.', position: 'ESP', status: 'ativo', role: 'Especialista' },
      { id: '1c', name: 'Kiebson', position: 'ESP', status: 'ativo', role: 'Especialista' },
      { id: '1d', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '1e', name: 'Operador B', position: 'B', status: 'ativo' },
    ],
  },
  {
    id: 'sc2',
    name: 'SC II',
    line: 'Linha 2',
    product: 'Belt',
    workers: [
      { id: '2a', name: 'Luiz Alberto', position: 'ESP', status: 'ativo', role: 'Especialista' },
      {
        id: '2b',
        name: 'Andre Fernandes',
        position: 'ESP',
        status: 'ferias',
        role: 'Especialista',
      },
      { id: '2c', name: 'Operador A', position: 'A', status: 'ferias' },
      { id: '2d', name: 'Operador B', position: 'B', status: 'ativo' },
    ],
  },
  {
    id: 'sc3',
    name: 'SC III',
    line: 'Linha 3',
    product: 'Nativo',
    workers: [
      { id: '3a', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '3b', name: 'Operador B', position: 'B', status: 'ativo' },
      { id: '3c', name: 'Operador C', position: 'C', status: 'administrativo' },
    ],
  },
  {
    id: 'sc4',
    name: 'SC IV',
    line: 'Linha 4',
    workers: [
      { id: '4a', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '4b', name: 'Operador B', position: 'B', status: 'ativo' },
      { id: '4c', name: 'Operador C', position: 'C', status: 'ativo' },
      { id: '4d', name: 'Operador D', position: 'D', status: 'ativo' },
    ],
  },
  {
    id: 'sc5',
    name: 'SC V',
    line: 'Linha 5',
    workers: [
      { id: '5a', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '5b', name: 'Operador B', position: 'B', status: 'ferias' },
      { id: '5c', name: 'Operador C', position: 'C', status: 'ativo' },
    ],
  },
  {
    id: 'sc6',
    name: 'SC VI',
    line: 'Linha 6',
    workers: [
      { id: '6a', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '6b', name: 'Operador B', position: 'B', status: 'ativo' },
    ],
  },
  {
    id: 'sc7',
    name: 'SC VII',
    line: 'Linha 7',
    product: 'Verango',
    obs: 'HA',
    workers: [
      { id: '7a', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '7b', name: 'Operador B', position: 'B', status: 'ativo' },
      { id: '7c', name: 'Operador C', position: 'C', status: 'administrativo' },
      { id: '7d', name: 'Operador D', position: 'D', status: 'ativo' },
      { id: '7e', name: 'Operador E', position: 'E', status: 'ativo' },
    ],
  },
  {
    id: 'cefito',
    name: 'C.E FITO',
    line: 'Fito',
    workers: [
      { id: '8a', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '8b', name: 'Operador B', position: 'B', status: 'ativo' },
    ],
  },
  {
    id: 'herb',
    name: 'Herbicidas',
    line: 'Herbicidas',
    workers: [
      { id: '9a', name: 'Operador A', position: 'A', status: 'ativo' },
      { id: '9b', name: 'Operador B', position: 'B', status: 'ativo' },
    ],
  },
];

const STATUS_CFG = {
  ativo: { label: 'Ativo', short: 'AT', color: '#0FA4AF' },
  ferias: { label: 'Ferias', short: 'FE', color: '#EF4444' },
  administrativo: { label: 'Adm', short: 'AD', color: '#F59E0B' },
  afastado: { label: 'Afastado', short: 'AF', color: '#8B5CF6' },
};

const PRODUCT_COLORS: Record<string, string> = {
  Verango: '#009A44',
  Nativo: '#0FA4AF',
  Belt: '#7C3AED',
  Oberon: '#0284C7',
  default: '#64748B',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getProductColor(product?: string): string {
  if (!product) return PRODUCT_COLORS.default;
  return PRODUCT_COLORS[product] || PRODUCT_COLORS.default;
}

function WorkerAvatar({
  worker,
  colors,
  size = 44,
}: {
  worker: Worker;
  colors: any;
  size?: number;
}) {
  const cfg = STATUS_CFG[worker.status];
  const isEsp = worker.position === 'ESP';
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: cfg.color,
            backgroundColor: isEsp ? cfg.color + '22' : colors.surfaceElevated,
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.3, fontWeight: '800', color: cfg.color }}>
          {getInitials(worker.name)}
        </Text>
        {worker.status !== 'ativo' && (
          <View
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              backgroundColor: cfg.color,
              borderRadius: 8,
              minWidth: 16,
              paddingHorizontal: 2,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 7, fontWeight: '800', color: '#fff' }}>{cfg.short}</Text>
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 9,
          color: colors.textSecondary,
          textAlign: 'center',
          maxWidth: size + 8,
        }}
        numberOfLines={1}
      >
        {worker.name.split(' ')[0]}
      </Text>
      <Text style={{ fontSize: 8, color: cfg.color, fontWeight: '700' }}>{worker.position}</Text>
    </View>
  );
}

function ShiftCard({ shift, colors, onPress }: { shift: Shift; colors: any; onPress: () => void }) {
  const productColor = getProductColor(shift.product);
  const ativos = shift.workers.filter(w => w.status === 'ativo').length;
  const ferias = shift.workers.filter(w => w.status === 'ferias').length;
  const adm = shift.workers.filter(w => w.status === 'administrativo').length;
  const esp = shift.workers.filter(w => w.position === 'ESP');
  const ops = shift.workers.filter(w => w.position !== 'ESP');
  const occupancyRate = Math.round((ativos / shift.workers.length) * 100);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.shiftCard,
        {
          backgroundColor: colors.surfaceCard,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
      activeOpacity={0.75}
    >
      <View style={styles.shiftCardHeader}>
        <View
          style={[
            styles.shiftBadge,
            { backgroundColor: productColor + '18', borderColor: productColor },
          ]}
        >
          <Text style={[styles.shiftBadgeText, { color: productColor }]}>{shift.name}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {shift.product && (
            <Text style={[styles.shiftProduct, { color: productColor }]}>{shift.product}</Text>
          )}
          <Text style={[styles.shiftLine, { color: colors.textTertiary }]}>{shift.line}</Text>
        </View>
        <View
          style={[
            styles.occupancyBadge,
            {
              backgroundColor:
                occupancyRate >= 80 ? '#0FA4AF' : occupancyRate >= 50 ? '#F59E0B' : '#EF4444',
            },
          ]}
        >
          <Text style={styles.occupancyText}>{occupancyRate}%</Text>
        </View>
      </View>
      <View style={[styles.statusBar, { borderTopColor: colors.border }]}>
        <View style={styles.statusItem}>
          <Text style={[styles.statusNum, { color: '#0FA4AF' }]}>{ativos}</Text>
          <Text style={[styles.statusLbl, { color: colors.textTertiary }]}>Ativo</Text>
        </View>
        {ferias > 0 && (
          <>
            <View style={[styles.statusDiv, { backgroundColor: colors.border }]} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNum, { color: '#EF4444' }]}>{ferias}</Text>
              <Text style={[styles.statusLbl, { color: colors.textTertiary }]}>Férias</Text>
            </View>
          </>
        )}
        {adm > 0 && (
          <>
            <View style={[styles.statusDiv, { backgroundColor: colors.border }]} />
            <View style={styles.statusItem}>
              <Text style={[styles.statusNum, { color: '#F59E0B' }]}>{adm}</Text>
              <Text style={[styles.statusLbl, { color: colors.textTertiary }]}>Adm</Text>
            </View>
          </>
        )}
      </View>
      {esp.length > 0 && (
        <View style={[styles.espRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.espLabel, { color: colors.textTertiary }]}>ESPECIALISTA</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {esp.map(w => (
              <WorkerAvatar key={w.id} worker={w} colors={colors} size={40} />
            ))}
          </ScrollView>
        </View>
      )}
      <View style={[styles.opsRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.espLabel, { color: colors.textTertiary }]}>OPERADORES</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {ops.map(w => (
            <WorkerAvatar key={w.id} worker={w} colors={colors} size={40} />
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  );
}

export default function TurnoScreen() {
  const { colors } = useTheme();
  const [shifts] = useState<Shift[]>(SHIFTS);
  const [selected, setSelected] = useState<Shift | null>(null);
  const [search, setSearch] = useState('');

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const totalWorkers = shifts.reduce((s, sh) => s + sh.workers.length, 0);
  const onVacation = shifts.reduce(
    (s, sh) => s + sh.workers.filter(w => w.status === 'ferias').length,
    0
  );
  const onAdm = shifts.reduce(
    (s, sh) => s + sh.workers.filter(w => w.status === 'administrativo').length,
    0
  );

  const filtered = shifts.filter(
    sh =>
      !search ||
      sh.name.toLowerCase().includes(search.toLowerCase()) ||
      (sh.product || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View
        style={[
          styles.solidHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.solidHeaderRow}>
          <View style={styles.bayerBadge}>
            <BayerLogo size={24} />
          </View>
          <View style={styles.solidHeaderText}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Gestão de Turno</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{today}</Text>
          </View>
        </View>
      </View>
      <View
        style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{totalWorkers}</Text>
          <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.success }]}>
            {totalWorkers - onVacation - onAdm}
          </Text>
          <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Ativos</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.danger }]}>{onVacation}</Text>
          <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Ferias</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{onAdm}</Text>
          <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Adm</Text>
        </View>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.surface, borderColor: colors.border, margin: 12 },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar turno ou produto..."
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
      >
        {filtered.map(shift => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            colors={colors}
            onPress={() => setSelected(shift)}
          />
        ))}
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalDragBar}>
              <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {selected?.name}
                </Text>
                {selected?.product && (
                  <Text style={[styles.modalProduct, { color: getProductColor(selected.product) }]}>
                    Produto: {selected.product}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelected(null)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              {selected &&
                [
                  {
                    label: 'Especialistas',
                    workers: selected.workers.filter(w => w.position === 'ESP'),
                  },
                  {
                    label: 'Operadores',
                    workers: selected.workers.filter(w => w.position !== 'ESP'),
                  },
                ].map(
                  group =>
                    group.workers.length > 0 && (
                      <View key={group.label}>
                        <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>
                          {group.label.toUpperCase()}
                        </Text>
                        {group.workers.map(w => {
                          const cfg = STATUS_CFG[w.status];
                          return (
                            <View
                              key={w.id}
                              style={[
                                styles.workerRow,
                                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
                              ]}
                            >
                              <View
                                style={[
                                  styles.workerAvatar,
                                  { backgroundColor: cfg.color + '22', borderColor: cfg.color },
                                ]}
                              >
                                <Text style={[styles.workerAvatarText, { color: cfg.color }]}>
                                  {getInitials(w.name)}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.workerName, { color: colors.textPrimary }]}>
                                  {w.name}
                                </Text>
                                <Text style={[styles.workerRole, { color: colors.textSecondary }]}>
                                  {w.role || 'Posicao ' + w.position}
                                </Text>
                              </View>
                              <View
                                style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}
                              >
                                <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
                                  {cfg.label}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )
                )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  solidHeader: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1 },
  solidHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bayerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  solidHeaderText: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  headerRight: { marginTop: 4 },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 10, fontWeight: '600' },
  statDiv: { width: 1, height: 36, alignSelf: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  shiftCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  shiftCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  shiftBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  shiftBadgeText: { fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },
  shiftProduct: { fontSize: 14, fontWeight: '700' },
  shiftLine: { fontSize: 12, fontWeight: '500' },
  occupancyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  occupancyText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  statusBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, paddingBottom: 4 },
  statusItem: { flex: 1, alignItems: 'center', gap: 2 },
  statusNum: { fontSize: 18, fontWeight: '800' },
  statusLbl: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statusDiv: { width: 1, height: 28, alignSelf: 'center' },
  espRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderTopWidth: 1 },
  opsRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1 },
  espLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { height: '75%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1 },
  modalDragBar: { alignItems: 'center', paddingTop: 12 },
  dragIndicator: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalProduct: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  workerAvatarText: { fontSize: 14, fontWeight: '800' },
  workerName: { fontSize: 15, fontWeight: '700' },
  workerRole: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
});
