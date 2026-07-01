import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Clipboard,
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

import { api, useAuth } from '../../src/auth';
import { defaultCatalog } from '../../src/guideData';
import { useTheme } from '../../src/theme';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type LotEntry = {
  id: string;
  unit: string;
  sc: string;
  product: string;
  lot: string;
  status: string;
  notes: string;
};

type ReceiptEntry = {
  id: string;
  product: string;
  qty: string;
};

type Handover = {
  _id: string;
  shift: string;
  lots: LotEntry[];
  receipts: ReceiptEntry[];
  observations: string;
  participants: string[];
  created_by_name: string;
  created_at: string;
};

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SHIFTS = ['A', 'B', 'C', 'D', 'E'];
const SHIFT_COLORS: Record<string, string> = {
  A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#EF4444', E: '#8B5CF6',
};

const LOT_STATUSES = [
  'Preparado',
  'Em fábrica',
  'Recebido',
  'Aguardando',
];

const UNIT_SUGGESTIONS = ['EVEREST', 'FÊNIX'];
const PRODUCT_NAMES = [...defaultCatalog.map(p => p.name)].sort((a, b) => a.localeCompare(b, 'pt-BR'));

function newLot(): LotEntry {
  return { id: Math.random().toString(36).slice(2), unit: '', sc: '', product: '', lot: '', status: 'Em fábrica', notes: '' };
}
function newReceipt(): ReceiptEntry {
  return { id: Math.random().toString(36).slice(2), product: '', qty: '' };
}

// ─────────────────────────────────────────────
// WHATSAPP FORMATTER
// ─────────────────────────────────────────────
function formatHandoverMessage(h: Handover): string {
  const dt = new Date(h.created_at);
  const hour = dt.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const DIVIDER = '━━━━━━━━━━━━━━━━━━━━';
  let msg = '';

  msg += `*${greeting}, segue a situação dos materiais para o próximo turno:*\n`;

  // ── Lotes de produção
  const activeLots = h.lots.filter(l => l.unit || l.lot || l.product);
  if (activeLots.length > 0) {
    const byUnit: Record<string, LotEntry[]> = {};
    for (const lot of activeLots) {
      const u = lot.unit.trim() || 'Sem unidade';
      if (!byUnit[u]) byUnit[u] = [];
      byUnit[u].push(lot);
    }

    for (const [unit, lots] of Object.entries(byUnit)) {
      msg += `\n> ${unit}\n`;
      const bySC: Record<string, LotEntry[]> = {};
      for (const l of lots) {
        const key = [l.sc ? `SC${l.sc}` : '', l.product].filter(Boolean).join(' – ') || '(sem info)';
        if (!bySC[key]) bySC[key] = [];
        bySC[key].push(l);
      }
      for (const [scLabel, items] of Object.entries(bySC)) {
        msg += `\n*${scLabel}*\n`;
        for (const item of items) {
          const parts: string[] = [];
          if (item.lot) parts.push(`Lote ${item.lot}`);
          if (item.status) parts.push(item.status);
          if (item.notes) parts.push(`(${item.notes})`);
          msg += `• ${parts.join(' - ')}\n`;
        }
      }
    }
  }

  // ── Recebimentos
  const activeReceipts = (h.receipts || []).filter(r => r.product.trim());
  if (activeReceipts.length > 0) {
    msg += `\n${DIVIDER}\n`;
    msg += `*📦 Recebimentos:*\n`;
    for (const r of activeReceipts) {
      const qtyStr = r.qty.trim() ? ` (${r.qty})` : '';
      msg += `- ${r.product}${qtyStr}\n`;
    }
  }

  // ── Observações
  if (h.observations.trim()) {
    msg += `\n${DIVIDER}\n`;
    msg += `*📋 Observações:*\n`;
    for (const line of h.observations.trim().split('\n')) {
      if (line.trim()) msg += `- ${line.trim()}\n`;
    }
  }

  // ── Participantes
  const activeParticipants = h.participants.filter(p => p.trim());
  if (activeParticipants.length > 0) {
    msg += `\n${DIVIDER}\n`;
    msg += `*👤 Participação no turno:*\n`;
    for (const p of activeParticipants) msg += `• ${p}\n`;
  }

  return msg.trim();
}

// ─────────────────────────────────────────────
// STATUS COLOR
// ─────────────────────────────────────────────
function statusColor(s: string): string {
  if (s.includes('Preparado')) return '#10B981';
  if (s.includes('Recebido')) return '#3B82F6';
  if (s.includes('Aguardando')) return '#F59E0B';
  if (s.includes('parte A')) return '#8B5CF6';
  if (s.includes('parte B')) return '#EC4899';
  return '#6B7280';
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function HandoverScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [shift, setShift] = useState('A');
  const [lots, setLots] = useState<LotEntry[]>([newLot()]);
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [observations, setObservations] = useState('');
  const [participants, setParticipants] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState<Handover[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewShift, setPreviewShift] = useState('A');

  const [detailHandover, setDetailHandover] = useState<Handover | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const [editHandover, setEditHandover] = useState<Handover | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editLots, setEditLots] = useState<LotEntry[]>([newLot()]);
  const [editReceipts, setEditReceipts] = useState<ReceiptEntry[]>([]);
  const [editObservations, setEditObservations] = useState('');
  const [editParticipants, setEditParticipants] = useState('');
  const [editShift, setEditShift] = useState('A');
  const [saving, setSaving] = useState(false);


  // ── fetch history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const r = await api.get('/handover?limit=40');
      setHistory(Array.isArray(r.data) ? r.data : []);
    } catch {}
    setLoadingHistory(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  // ── lot helpers
  function updateLot(id: string, field: keyof LotEntry, value: string) {
    setLots(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }
  function removeLot(id: string) {
    setLots(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  // ── receipt helpers
  function updateReceipt(id: string, field: keyof ReceiptEntry, value: string) {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function removeReceipt(id: string) {
    setReceipts(prev => prev.filter(r => r.id !== id));
  }

  // ── submit
  async function handleSubmit() {
    const activeLots = lots.filter(l => l.unit || l.lot || l.product);
    const activeReceipts = receipts.filter(r => r.product.trim());
    if (activeLots.length === 0 && activeReceipts.length === 0 && !observations.trim()) {
      Alert.alert('Atenção', 'Preencha ao menos um lote, recebimento ou observação.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/handover', {
        shift,
        lots: activeLots,
        receipts: activeReceipts,
        observations,
        participants: participants.split('\n').map(p => p.trim()).filter(Boolean),
      });
      Alert.alert('✅ Passagem registrada!', `Turno ${shift} salvo com sucesso.`);
      setLots([newLot()]);
      setReceipts([]);
      setObservations('');
      setParticipants('');
      fetchHistory();
      setActiveTab('history');
    } catch {
      Alert.alert('Erro', 'Falha ao salvar passagem.');
    }
    setSubmitting(false);
  }

  // ── can modify (15 min window or admin)
  function canModify(h: Handover): boolean {
    if (user?.role === 'admin') return true;
    const created = new Date(h.created_at).getTime();
    return Date.now() - created <= 15 * 60 * 1000;
  }

  // ── delete (called from modal after inline confirmation)
  async function handleDelete(h: Handover) {
    try {
      await api.delete(`/handover/${h._id}`);
      setDetailVisible(false);
      setDetailHandover(null);
      fetchHistory();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Não foi possível excluir.';
      Alert.alert('Erro', msg);
    }
  }

  // ── open edit modal
  function openEdit(h: Handover) {
    setEditHandover(h);
    setEditShift(h.shift);
    setEditLots(h.lots.length > 0 ? h.lots.map(l => ({ ...l })) : [newLot()]);
    setEditReceipts((h.receipts || []).map(r => ({ ...r })));
    setEditObservations(h.observations);
    setEditParticipants(h.participants.join('\n'));
    setEditVisible(true);
  }

  // ── save edit
  async function handleEditSave() {
    if (!editHandover) return;
    const activeLots = editLots.filter(l => l.unit || l.lot || l.product);
    const activeReceipts = editReceipts.filter(r => r.product.trim());
    setSaving(true);
    try {
      const r = await api.put(`/handover/${editHandover._id}`, {
        shift: editShift,
        lots: activeLots,
        receipts: activeReceipts,
        observations: editObservations,
        participants: editParticipants.split('\n').map(p => p.trim()).filter(Boolean),
      });
      setEditVisible(false);
      setDetailVisible(false);
      fetchHistory();
      Alert.alert('✅ Salvo!', 'Passagem atualizada com sucesso.');
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Não foi possível salvar.';
      Alert.alert('Erro', msg);
    }
    setSaving(false);
  }

  // ── preview
  function openPreview(h?: Handover) {
    const target: Handover = h ?? {
      _id: '',
      shift,
      lots: lots.filter(l => l.unit || l.lot || l.product),
      receipts: receipts.filter(r => r.product.trim()),
      observations,
      participants: participants.split('\n').map(p => p.trim()).filter(Boolean),
      created_by_name: user?.name ?? 'Operador',
      created_at: new Date().toISOString(),
    };
    setPreviewText(formatHandoverMessage(target));
    setPreviewShift(target.shift);
    setPreviewVisible(true);
  }

  function copyText(text: string) {
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(text).catch(() => {});
    } else {
      Clipboard.setString(text);
    }
    Alert.alert('✅ Copiado!', 'Pronto para colar no WhatsApp.');
  }

  const shiftColor = SHIFT_COLORS[shift] ?? colors.primary;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>

      {/* ── HEADER */}
      <LinearGradient
        colors={isDark ? ['#071A0D', '#0D1A0D'] : ['#0D5C28', '#0A4520']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Passagem de Serviço</Text>
            <Text style={styles.headerSub}>Registro e histórico de turno</Text>
          </View>
          <View style={styles.tabToggleGroup}>
            <TouchableOpacity
              onPress={() => setActiveTab('create')}
              style={[styles.toggleBtn, activeTab === 'create' && styles.toggleBtnActive]}
            >
              <Ionicons name="add-circle-outline" size={15} color={activeTab === 'create' ? '#000' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.toggleBtnText, { color: activeTab === 'create' ? '#000' : 'rgba(255,255,255,0.7)' }]}>Nova</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('history')}
              style={[styles.toggleBtn, activeTab === 'history' && styles.toggleBtnActive]}
            >
              <Ionicons name="time-outline" size={15} color={activeTab === 'history' ? '#000' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.toggleBtnText, { color: activeTab === 'history' ? '#000' : 'rgba(255,255,255,0.7)' }]}>Histórico</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ════════════════════════════════════════
          CREATE TAB
      ════════════════════════════════════════ */}
      {activeTab === 'create' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── TURNO */}
            <SectionCard title="Turno de Trabalho" icon="swap-horizontal-outline" colors={colors}>
              <View style={styles.shiftRow}>
                {SHIFTS.map(s => {
                  const sc = SHIFT_COLORS[s];
                  const active = shift === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setShift(s)}
                      style={[styles.shiftBtn, {
                        backgroundColor: active ? sc : colors.surfaceElevated,
                        borderColor: active ? sc : colors.border,
                        shadowColor: active ? sc : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: active ? 0.4 : 0,
                        shadowRadius: 8,
                        elevation: active ? 6 : 0,
                      }]}
                    >
                      <Text style={[styles.shiftBtnLetter, { color: active ? '#000' : colors.textTertiary }]}>{s}</Text>
                      <Text style={[styles.shiftBtnLabel, { color: active ? '#00000080' : colors.textTertiary + '80' }]}>
                        turno
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SectionCard>

            {/* ── LOTES */}
            <SectionCard
              title="Lotes em Produção"
              icon="cube-outline"
              colors={colors}
              action={
                <TouchableOpacity
                  onPress={() => setLots(prev => [...prev, newLot()])}
                  style={[styles.addRowBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '60' }]}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={[styles.addRowBtnText, { color: colors.primary }]}>Adicionar lote</Text>
                </TouchableOpacity>
              }
            >
              {lots.map((lot, idx) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  idx={idx}
                  colors={colors}
                  onUpdate={updateLot}
                  onRemove={removeLot}
                  canRemove={lots.length > 1}
                />
              ))}
            </SectionCard>

            {/* ── RECEBIMENTOS */}
            <SectionCard
              title="Recebimentos"
              icon="archive-outline"
              colors={colors}
              subtitle="Materiais recebidos sem lote de produção"
              action={
                <TouchableOpacity
                  onPress={() => setReceipts(prev => [...prev, newReceipt()])}
                  style={[styles.addRowBtn, { backgroundColor: '#3B82F620', borderColor: '#3B82F660' }]}
                >
                  <Ionicons name="add" size={14} color="#3B82F6" />
                  <Text style={[styles.addRowBtnText, { color: '#3B82F6' }]}>Adicionar</Text>
                </TouchableOpacity>
              }
            >
              {receipts.length === 0 ? (
                <TouchableOpacity
                  onPress={() => setReceipts([newReceipt()])}
                  style={[styles.emptyReceiptBtn, { borderColor: colors.border }]}
                >
                  <Ionicons name="add-circle-outline" size={22} color={colors.textTertiary} />
                  <Text style={[styles.emptyReceiptText, { color: colors.textTertiary }]}>
                    Toque para registrar recebimentos
                  </Text>
                </TouchableOpacity>
              ) : (
                receipts.map((r, i) => (
                  <View key={r.id} style={[styles.receiptRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <View style={[styles.receiptIndex, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[styles.receiptIndexText, { color: '#3B82F6' }]}>{i + 1}</Text>
                    </View>
                    <TextInput
                      value={r.product}
                      onChangeText={v => updateReceipt(r.id, 'product', v)}
                      placeholder="Bulldock técnico"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.receiptInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    />
                    <TextInput
                      value={r.qty}
                      onChangeText={v => updateReceipt(r.id, 'qty', v)}
                      placeholder="qtd"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      style={[styles.receiptQtyInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    />
                    <TouchableOpacity onPress={() => removeReceipt(r.id)} hitSlop={10}>
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </SectionCard>

            {/* ── OBSERVAÇÕES */}
            <SectionCard
              title="Observações Gerais"
              icon="document-text-outline"
              colors={colors}
              subtitle="Ocorrências, manutenções, trocas de equipamento..."
            >
              <TextInput
                value={observations}
                onChangeText={setObservations}
                placeholder={
                  'Realizada a troca das baterias da empilhadeira 611 e 614.\nAs mesmas encontram-se no EVEREST.'
                }
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={6}
                style={[styles.textArea, {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }]}
              />
            </SectionCard>

            {/* ── PARTICIPANTES */}
            <SectionCard title="Participação no Turno" icon="people-outline" colors={colors} subtitle="Um nome por linha">
              <TextInput
                value={participants}
                onChangeText={setParticipants}
                placeholder={'Estevão\nAlan\nCarlos'}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                style={[styles.textArea, {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }]}
              />
            </SectionCard>

            {/* ── ACTIONS */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => openPreview()}
              >
                <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Prévia</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: shiftColor, opacity: submitting ? 0.7 : 1, flex: 2 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Ionicons name="checkmark-circle" size={20} color="#000" />
                <Text style={styles.primaryBtnText}>
                  {submitting ? 'Salvando...' : 'Registrar Passagem'}
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

      ) : (
        /* ════════════════════════════════════════
            HISTORY TAB
        ════════════════════════════════════════ */
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {loadingHistory && (
            <View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}>
              <Ionicons name="time-outline" size={32} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, fontSize: 14 }}>Carregando histórico...</Text>
            </View>
          )}

          {!loadingHistory && history.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="swap-horizontal-outline" size={44} color={colors.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>Nenhuma passagem ainda</Text>
              <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>
                As passagens de turno registradas aparecerão aqui.
              </Text>
            </View>
          )}

          {history.map(h => (
            <HandoverHistoryCard
              key={h._id}
              handover={h}
              colors={colors}
              isDark={isDark}
              onOpen={() => { setDetailHandover(h); setDetailVisible(true); }}
              onCopy={() => copyText(formatHandoverMessage(h))}
              onPreview={() => openPreview(h)}
            />
          ))}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════
          PREVIEW MODAL (WhatsApp copy)
      ════════════════════════════════════════ */}
      <Modal visible={previewVisible} animationType="slide" transparent onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Prévia — Turno {previewShift}</Text>
                <Text style={[styles.sheetSub, { color: colors.textTertiary }]}>Formatado para WhatsApp</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 12, backgroundColor: isDark ? '#0B1A0D' : '#E5DDD5', minHeight: 200 }}>
              <View style={styles.waChatRow}>
                {/* Sender avatar */}
                <View style={styles.waAvatar}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
                {/* Bubble */}
                <View style={[styles.waBubble, { backgroundColor: isDark ? '#1F2E21' : '#FFFFFF' }]}>
                  {/* Sender name */}
                  <Text style={styles.waSender}>Operador — Turno {previewShift}</Text>
                  {/* Rendered lines */}
                  {previewText.split('\n').map((line, idx) => {
                    if (line.startsWith('> ')) {
                      const content = line.slice(2);
                      return (
                        <View key={idx} style={[styles.waQuoteBlock, { borderLeftColor: isDark ? '#4CAF50' : '#25D366' }]}>
                          <Text style={[styles.waQuoteText, { color: isDark ? '#A5D6A7' : '#2e7d32' }]}>{content}</Text>
                        </View>
                      );
                    }
                    const boldParts = line.split(/(\*[^*]+\*)/g);
                    if (boldParts.length > 1) {
                      return (
                        <Text key={idx} style={[styles.waLine, { color: isDark ? '#E8F5E9' : '#111' }]}>
                          {boldParts.map((part, pi) =>
                            part.startsWith('*') && part.endsWith('*')
                              ? <Text key={pi} style={{ fontWeight: '700' }}>{part.slice(1, -1)}</Text>
                              : <Text key={pi}>{part}</Text>
                          )}
                        </Text>
                      );
                    }
                    if (line.startsWith('━')) {
                      return <View key={idx} style={[styles.waDivider, { backgroundColor: isDark ? '#2a3a2a' : '#e0e0e0' }]} />;
                    }
                    return (
                      <Text key={idx} style={[styles.waLine, { color: isDark ? '#E8F5E9' : '#111', ...(line === '' ? { marginBottom: 2 } : {}) }]}>
                        {line || ' '}
                      </Text>
                    );
                  })}
                  {/* Timestamp */}
                  <View style={styles.waTimeRow}>
                    <Text style={[styles.waTime, { color: isDark ? '#7CB87E' : '#888' }]}>
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Ionicons name="checkmark-done" size={14} color="#4FC3F7" />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.sheetFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#25D366', flex: 1 }]}
                onPress={() => { copyText(previewText); setPreviewVisible(false); }}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#000" />
                <Text style={styles.primaryBtnText}>Copiar para WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════
          DETAIL MODAL (card expandido)
      ════════════════════════════════════════ */}
      {detailHandover && (
        <HandoverDetailModal
          handover={detailHandover}
          visible={detailVisible}
          colors={colors}
          isDark={isDark}
          canModify={canModify(detailHandover)}
          onClose={() => setDetailVisible(false)}
          onCopy={() => copyText(formatHandoverMessage(detailHandover))}
          onWhatsApp={() => { openPreview(detailHandover); setDetailVisible(false); }}
          onEdit={() => { setDetailVisible(false); openEdit(detailHandover); }}
          onDelete={() => handleDelete(detailHandover)}
        />
      )}

      {editHandover && (
        <EditHandoverModal
          handover={editHandover}
          visible={editVisible}
          colors={colors}
          isDark={isDark}
          shift={editShift}
          lots={editLots}
          receipts={editReceipts}
          observations={editObservations}
          participants={editParticipants}
          saving={saving}
          onShiftChange={setEditShift}
          onLotsChange={setEditLots}
          onReceiptsChange={setEditReceipts}
          onObservationsChange={setEditObservations}
          onParticipantsChange={setEditParticipants}
          onClose={() => setEditVisible(false)}
          onSave={handleEditSave}
        />
      )}

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function SectionCard({
  title, icon, subtitle, action, children, colors,
}: {
  title: string;
  icon: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionCardHeader}>
        <View style={[styles.sectionIconBg, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name={icon as any} size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionCardTitle, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && <Text style={[styles.sectionCardSub, { color: colors.textTertiary }]}>{subtitle}</Text>}
        </View>
        {action}
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────
// AUTOCOMPLETE INPUT
// ─────────────────────────────────────────────
function AutocompleteInput({
  value, onChangeText, suggestions, placeholder, autoCapitalize, inputStyle, colors,
}: {
  value: string;
  onChangeText: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  inputStyle: any;
  colors: any;
}) {
  const [focused, setFocused] = useState(false);

  const filtered = useMemo(() => {
    const q = value.toUpperCase().trim();
    if (!q) return suggestions.slice(0, 6);
    return suggestions
      .filter(s => s.toUpperCase().includes(q) && s.toUpperCase() !== q)
      .slice(0, 6);
  }, [value, suggestions]);

  const showDropdown = focused && filtered.length > 0;

  return (
    <View style={{ zIndex: 200 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize={autoCapitalize ?? 'characters'}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 180)}
        style={inputStyle}
      />
      {showDropdown && (
        <View style={[styles.acDropdown, {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          shadowColor: '#000',
        }]}>
          {filtered.map((s, i) => (
            <TouchableOpacity
              key={s}
              onPress={() => { onChangeText(s); setFocused(false); }}
              style={[styles.acItem, i < filtered.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              activeOpacity={0.65}
            >
              <Ionicons name="chevron-forward-outline" size={12} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.acItemText, { color: colors.textPrimary }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function LotCard({ lot, idx, colors, onUpdate, onRemove, canRemove }: {
  lot: LotEntry;
  idx: number;
  colors: any;
  onUpdate: (id: string, field: keyof LotEntry, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const sc = statusColor(lot.status);

  return (
    <View style={[styles.lotCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderLeftColor: sc, borderLeftWidth: 3 }]}>
      {/* Row 1: index + delete */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={[styles.lotIndexBadge, { backgroundColor: sc + '20' }]}>
          <Text style={[styles.lotIndexText, { color: sc }]}>Lote #{idx + 1}</Text>
        </View>
        {canRemove && (
          <TouchableOpacity onPress={() => onRemove(lot.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2: UNIDADE + SC */}
      <View style={[styles.fieldRow, { zIndex: 20 }]}>
        <View style={{ flex: 2, zIndex: 20 }}>
          <FieldLabel>UNIDADE</FieldLabel>
          <AutocompleteInput
            value={lot.unit}
            onChangeText={v => onUpdate(lot.id, 'unit', v.toUpperCase())}
            suggestions={UNIT_SUGGESTIONS}
            placeholder="EVEREST"
            autoCapitalize="characters"
            inputStyle={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            colors={colors}
          />
        </View>
        <View style={{ flex: 1, zIndex: 10 }}>
          <FieldLabel>SC</FieldLabel>
          <TextInput
            value={lot.sc}
            onChangeText={v => onUpdate(lot.id, 'sc', v)}
            placeholder="5"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          />
        </View>
      </View>

      {/* Row 3: PRODUTO + LOTE */}
      <View style={[styles.fieldRow, { zIndex: 10 }]}>
        <View style={{ flex: 1.4, zIndex: 10 }}>
          <FieldLabel>PRODUTO</FieldLabel>
          <AutocompleteInput
            value={lot.product}
            onChangeText={v => onUpdate(lot.id, 'product', v.toUpperCase())}
            suggestions={PRODUCT_NAMES}
            placeholder="FOX XPRO"
            autoCapitalize="characters"
            inputStyle={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            colors={colors}
          />
        </View>
        <View style={{ flex: 1, zIndex: 5 }}>
          <FieldLabel>LOTE</FieldLabel>
          <TextInput
            value={lot.lot}
            onChangeText={v => onUpdate(lot.id, 'lot', v)}
            placeholder="279/26"
            placeholderTextColor={colors.textTertiary}
            style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          />
        </View>
      </View>

      {/* Status chips */}
      <FieldLabel>SITUAÇÃO</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 2 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {LOT_STATUSES.map(s => {
            const active = lot.status === s;
            const c = statusColor(s);
            return (
              <TouchableOpacity
                key={s}
                onPress={() => onUpdate(lot.id, 'status', s)}
                style={[styles.statusChip, {
                  backgroundColor: active ? c + '22' : 'transparent',
                  borderColor: active ? c : colors.border,
                }]}
              >
                {active && <View style={[styles.statusChipDot, { backgroundColor: c }]} />}
                <Text style={[styles.statusChipText, { color: active ? c : colors.textSecondary }]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Notes */}
      <FieldLabel>OBSERVAÇÃO DO LOTE</FieldLabel>
      <TextInput
        value={lot.notes}
        onChangeText={v => onUpdate(lot.id, 'notes', v)}
        placeholder="parte B preparada, aguardando aprovação..."
        placeholderTextColor={colors.textTertiary}
        style={[styles.fieldInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
      />
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabelText}>{children}</Text>;
}

function HandoverHistoryCard({ handover: h, colors, isDark, onOpen, onCopy, onPreview }: {
  handover: Handover;
  colors: any;
  isDark: boolean;
  onOpen: () => void;
  onCopy: () => void;
  onPreview: () => void;
}) {
  const dt = new Date(h.created_at);
  const dateStr = dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sc = SHIFT_COLORS[h.shift] ?? '#10B981';
  const activeLots = h.lots.filter(l => l.unit || l.lot || l.product);
  const activeReceipts = (h.receipts || []).filter(r => r.product);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      style={[styles.histCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Top accent bar */}
      <View style={[styles.histCardAccent, { backgroundColor: sc }]} />

      {/* Header */}
      <View style={styles.histCardHeader}>
        <View style={[styles.histShiftBadge, { backgroundColor: sc + '22', borderColor: sc + '55' }]}>
          <Text style={[styles.histShiftText, { color: sc }]}>{h.shift}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.histDateText, { color: colors.textPrimary }]}>
            Passagem do Turno {h.shift}
          </Text>
          <Text style={[styles.histByText, { color: colors.textTertiary }]}>
            {dateStr} · {timeStr} · {h.created_by_name || 'Operador'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 4 }} />
      </View>

      {/* Stats pills */}
      <View style={styles.histStats}>
        {activeLots.length > 0 && (
          <View style={[styles.statPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
            <Ionicons name="cube-outline" size={11} color={colors.primary} />
            <Text style={[styles.statPillText, { color: colors.primary }]}>{activeLots.length} lote{activeLots.length > 1 ? 's' : ''}</Text>
          </View>
        )}
        {activeReceipts.length > 0 && (
          <View style={[styles.statPill, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}>
            <Ionicons name="archive-outline" size={11} color="#3B82F6" />
            <Text style={[styles.statPillText, { color: '#3B82F6' }]}>{activeReceipts.length} receb.</Text>
          </View>
        )}
        {h.observations.trim() && (
          <View style={[styles.statPill, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
            <Ionicons name="document-text-outline" size={11} color="#F59E0B" />
            <Text style={[styles.statPillText, { color: '#F59E0B' }]}>obs.</Text>
          </View>
        )}
        {h.participants.length > 0 && (
          <View style={[styles.statPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
            <Text style={[styles.statPillText, { color: colors.textSecondary }]}>{h.participants.length} pessoa{h.participants.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Lot preview */}
      {activeLots.length > 0 && (
        <View style={[styles.histPreview, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {activeLots.slice(0, 3).map((l, i) => (
            <View key={i} style={styles.histPreviewRow}>
              <View style={[styles.histDot, { backgroundColor: statusColor(l.status) }]} />
              <Text style={[styles.histPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{l.unit}</Text>
                {l.sc ? ` · SC${l.sc}` : ''}
                {l.product ? ` · ${l.product}` : ''}
                {l.lot ? ` · Lote ${l.lot}` : ''}
              </Text>
            </View>
          ))}
          {activeLots.length > 3 && (
            <Text style={[styles.histMore, { color: colors.textTertiary }]}>+{activeLots.length - 3} mais</Text>
          )}
        </View>
      )}

      {/* Receipts preview */}
      {activeReceipts.length > 0 && (
        <View style={[styles.histReceiptsBox, { backgroundColor: '#3B82F608', borderColor: '#3B82F620' }]}>
          <Text style={[styles.histReceiptsLabel, { color: '#3B82F6' }]}>📦 Recebimentos</Text>
          <Text style={[styles.histReceiptsItems, { color: colors.textSecondary }]} numberOfLines={2}>
            {activeReceipts.map(r => `${r.product}${r.qty ? ` (${r.qty})` : ''}`).join('  ·  ')}
          </Text>
        </View>
      )}

      {/* Action footer */}
      <View style={[styles.histFooter, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.histAction} onPress={onCopy}>
          <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.histActionText, { color: colors.textTertiary }]}>Copiar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.histAction} onPress={onPreview}>
          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
          <Text style={[styles.histActionText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.histAction} onPress={onOpen}>
          <Ionicons name="expand-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.histActionText, { color: colors.textTertiary }]}>Ver tudo</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function DetailSection({ icon, iconColor, title, children }: {
  icon: string; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.dtSection}>
      <View style={styles.dtSectionHead}>
        <View style={[styles.dtSectionIcon, { backgroundColor: iconColor + '1A' }]}>
          <Ionicons name={icon as any} size={14} color={iconColor} />
        </View>
        <Text style={[styles.dtSectionTitle, { color: iconColor }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function HandoverDetailModal({ handover: h, visible, colors, isDark, canModify, onClose, onCopy, onWhatsApp, onEdit, onDelete }: {
  handover: Handover;
  visible: boolean;
  colors: any;
  isDark: boolean;
  canModify: boolean;
  onClose: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const dt = new Date(h.created_at);
  const fullDate = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sc = SHIFT_COLORS[h.shift] ?? '#10B981';
  const activeLots = h.lots.filter(l => l.unit || l.lot || l.product);
  const activeReceipts = (h.receipts || []).filter(r => r.product);

  const parseLotNum = (s: string) => { const n = parseInt(s?.replace(/\D/g, '') || '0', 10); return isNaN(n) ? 0 : n; };
  const parseSCNum = (key: string) => { const m = key.match(/SC(\d+)/i); return m ? parseInt(m[1], 10) : 9999; };
  const sortedLots = [...activeLots].sort((a, b) => parseLotNum(a.lot) - parseLotNum(b.lot));

  const byUnit: Record<string, LotEntry[]> = {};
  for (const lot of sortedLots) {
    const u = lot.unit.trim() || 'Sem unidade';
    if (!byUnit[u]) byUnit[u] = [];
    byUnit[u].push(lot);
  }

  async function confirmAndDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>

          {/* ── Header */}
          <LinearGradient
            colors={isDark ? [sc + '28', colors.background] : [sc + '18', colors.surface]}
            style={styles.detailHeader}
          >
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#ffffff30' : '#00000020' }]} />
            <View style={styles.detailHeaderContent}>
              <View style={[styles.detailShiftBadge, { backgroundColor: sc }]}>
                <Text style={styles.detailShiftText}>{h.shift}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>Passagem de Serviço</Text>
                <Text style={[styles.detailDate, { color: colors.textSecondary }]}>{fullDate}</Text>
                <Text style={[styles.detailTime, { color: colors.textTertiary }]}>
                  {timeStr} · {h.created_by_name || 'Operador'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {canModify && (
                  <TouchableOpacity onPress={onEdit} hitSlop={10}
                    style={[styles.headerIconBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} hitSlop={12}
                  style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* ── Delete confirm banner */}
          {confirmDelete && (
            <View style={[styles.deleteBanner, { backgroundColor: '#EF444412', borderColor: '#EF444430' }]}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.deleteBannerText}>Excluir esta passagem?</Text>
              <TouchableOpacity
                onPress={() => setConfirmDelete(false)}
                style={[styles.deleteBannerBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Text style={[styles.deleteBannerBtnText, { color: colors.textSecondary }]}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmAndDelete}
                disabled={deleting}
                style={[styles.deleteBannerBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
              >
                <Text style={[styles.deleteBannerBtnText, { color: '#fff' }]}>{deleting ? '...' : 'Sim'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >

            {/* LOTES — estilo WhatsApp */}
            {activeLots.length > 0 && (
              <View style={[styles.dtLotsCard, {
                backgroundColor: isDark ? '#111E12' : '#F0F7F1',
                borderColor: isDark ? colors.primary + '30' : colors.primary + '40',
              }]}>
                {Object.entries(byUnit).map(([unit, unitLots]) => {
                  const bySC: Record<string, LotEntry[]> = {};
                  for (const l of unitLots) {
                    const key = [l.sc ? `SC${l.sc}` : '', l.product].filter(Boolean).join(' – ') || '(sem info)';
                    if (!bySC[key]) bySC[key] = [];
                    bySC[key].push(l);
                  }
                  return (
                    <View key={unit}>
                      {/* > UNIT quote block */}
                      <View style={[styles.dtWaQuote, { borderLeftColor: colors.primary }]}>
                        <Text style={[styles.dtWaQuoteText, { color: colors.primary }]}>{unit}</Text>
                      </View>
                      {Object.entries(bySC).sort(([a], [b]) => parseSCNum(a) - parseSCNum(b)).map(([scLabel, items]) => (
                        <View key={scLabel} style={{ marginBottom: 6 }}>
                          {/* *SC – PRODUTO* bold line */}
                          <Text style={[styles.dtWaBold, { color: colors.textPrimary }]}>{scLabel}</Text>
                          {items.map((item, ii) => {
                            const parts: string[] = [];
                            if (item.lot) parts.push(`Lote ${item.lot}`);
                            if (item.status) parts.push(item.status);
                            if (item.notes) parts.push(`(${item.notes})`);
                            const c = statusColor(item.status);
                            return (
                              <View key={ii} style={styles.dtWaBulletRow}>
                                <Text style={[styles.dtWaBullet, { color: c }]}>•</Text>
                                <Text style={[styles.dtWaBulletText, { color: colors.textSecondary }]}>
                                  {parts.join(' - ')}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}

            {/* RECEBIMENTOS */}
            {activeReceipts.length > 0 && (
              <DetailSection icon="archive-outline" iconColor="#3B82F6" title="Recebimentos">
                {activeReceipts.map((r, i) => (
                  <View key={i} style={[styles.dtReceiptRow, { backgroundColor: '#3B82F608', borderColor: '#3B82F620' }]}>
                    <View style={[styles.dtReceiptNum, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[styles.dtReceiptNumText, { color: '#3B82F6' }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dtReceiptProduct, { color: colors.textPrimary }]}>{r.product}</Text>
                      {r.qty ? <Text style={[styles.dtReceiptQty, { color: '#3B82F6' }]}>{r.qty} unid.</Text> : null}
                    </View>
                  </View>
                ))}
              </DetailSection>
            )}

            {/* OBSERVAÇÕES */}
            {h.observations.trim() ? (
              <DetailSection icon="document-text-outline" iconColor="#F59E0B" title="Observações">
                <View style={[styles.dtObsBox, { backgroundColor: '#F59E0B08', borderColor: '#F59E0B25' }]}>
                  <Text style={[styles.dtObsText, { color: colors.textSecondary }]}>{h.observations.trim()}</Text>
                </View>
              </DetailSection>
            ) : null}

            {/* PARTICIPANTES */}
            {h.participants.filter(p => p.trim()).length > 0 && (
              <DetailSection icon="people-outline" iconColor="#8B5CF6" title="Participação no Turno">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {h.participants.filter(p => p.trim()).map((p, i) => (
                    <View key={i} style={[styles.dtParticipant, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF630' }]}>
                      <Ionicons name="person-circle-outline" size={15} color="#8B5CF6" />
                      <Text style={[styles.dtParticipantText, { color: colors.textPrimary }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              </DetailSection>
            )}

          </ScrollView>

          {/* ── Footer */}
          <View style={[styles.detailFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            {canModify && (
              <TouchableOpacity
                onPress={() => setConfirmDelete(true)}
                style={[styles.dtFooterIcon, { borderColor: '#EF444430', backgroundColor: '#EF444410' }]}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border, flex: 1 }]} onPress={onCopy}>
              <Ionicons name="copy-outline" size={17} color={colors.textSecondary} />
              <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Copiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#25D366', flex: 2 }]} onPress={onWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#000" />
              <Text style={styles.primaryBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

function EditHandoverModal({
  handover, visible, colors, isDark,
  shift, lots, receipts, observations, participants, saving,
  onShiftChange, onLotsChange, onReceiptsChange,
  onObservationsChange, onParticipantsChange,
  onClose, onSave,
}: {
  handover: Handover;
  visible: boolean;
  colors: any;
  isDark: boolean;
  shift: string;
  lots: LotEntry[];
  receipts: ReceiptEntry[];
  observations: string;
  participants: string;
  saving: boolean;
  onShiftChange: (s: string) => void;
  onLotsChange: (fn: (prev: LotEntry[]) => LotEntry[]) => void;
  onReceiptsChange: (fn: (prev: ReceiptEntry[]) => ReceiptEntry[]) => void;
  onObservationsChange: (s: string) => void;
  onParticipantsChange: (s: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const sc = SHIFT_COLORS[shift] ?? '#10B981';

  function updateLot(id: string, field: keyof LotEntry, value: string) {
    onLotsChange(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }
  function removeLot(id: string) {
    onLotsChange(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }
  function updateReceipt(id: string, field: keyof ReceiptEntry, value: string) {
    onReceiptsChange(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function removeReceipt(id: string) {
    onReceiptsChange(prev => prev.filter(r => r.id !== id));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
          <LinearGradient
            colors={isDark ? [sc + '33', '#0D1A0D'] : [sc + '22', colors.surface]}
            style={styles.detailHeader}
          >
            <View style={[styles.sheetHandle, { backgroundColor: sc + '60' }]} />
            <View style={styles.detailHeaderContent}>
              <View style={[styles.detailShiftBadge, { backgroundColor: sc }]}>
                <Text style={styles.detailShiftText}>{shift}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>Editar Passagem</Text>
                <Text style={[styles.detailTime, { color: colors.textTertiary }]}>
                  Turno {shift} · {handover.created_by_name}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={12}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 0 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Turno */}
              <SectionCard title="Turno de Trabalho" icon="swap-horizontal-outline" colors={colors}>
                <View style={styles.shiftRow}>
                  {SHIFTS.map(s => {
                    const c = SHIFT_COLORS[s];
                    const active = shift === s;
                    return (
                      <TouchableOpacity key={s} onPress={() => onShiftChange(s)}
                        style={[styles.shiftBtn, {
                          backgroundColor: active ? c : colors.surfaceElevated,
                          borderColor: active ? c : colors.border,
                        }]}
                      >
                        <Text style={[styles.shiftBtnLetter, { color: active ? '#000' : colors.textTertiary }]}>{s}</Text>
                        <Text style={[styles.shiftBtnLabel, { color: active ? '#00000080' : colors.textTertiary + '80' }]}>turno</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SectionCard>

              {/* Lotes */}
              <SectionCard
                title="Lotes em Produção" icon="cube-outline" colors={colors}
                action={
                  <TouchableOpacity
                    onPress={() => onLotsChange(prev => [...prev, newLot()])}
                    style={[styles.addRowBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '60' }]}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.addRowBtnText, { color: colors.primary }]}>Adicionar</Text>
                  </TouchableOpacity>
                }
              >
                {lots.map((lot, idx) => (
                  <LotCard key={lot.id} lot={lot} idx={idx} colors={colors}
                    onUpdate={updateLot} onRemove={removeLot} canRemove={lots.length > 1} />
                ))}
              </SectionCard>

              {/* Recebimentos */}
              <SectionCard
                title="Recebimentos" icon="archive-outline" colors={colors}
                subtitle="Materiais recebidos sem lote de produção"
                action={
                  <TouchableOpacity
                    onPress={() => onReceiptsChange(prev => [...prev, newReceipt()])}
                    style={[styles.addRowBtn, { backgroundColor: '#3B82F620', borderColor: '#3B82F660' }]}
                  >
                    <Ionicons name="add" size={14} color="#3B82F6" />
                    <Text style={[styles.addRowBtnText, { color: '#3B82F6' }]}>Adicionar</Text>
                  </TouchableOpacity>
                }
              >
                {receipts.length === 0 ? (
                  <TouchableOpacity
                    onPress={() => onReceiptsChange(prev => [...prev, newReceipt()])}
                    style={[styles.emptyReceiptBtn, { borderColor: colors.border }]}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={colors.textTertiary} />
                    <Text style={[styles.emptyReceiptText, { color: colors.textTertiary }]}>Toque para registrar recebimentos</Text>
                  </TouchableOpacity>
                ) : receipts.map((r, i) => (
                  <View key={r.id} style={[styles.receiptRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <View style={[styles.receiptIndex, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[styles.receiptIndexText, { color: '#3B82F6' }]}>{i + 1}</Text>
                    </View>
                    <TextInput value={r.product} onChangeText={v => updateReceipt(r.id, 'product', v)}
                      placeholder="Produto" placeholderTextColor={colors.textTertiary}
                      style={[styles.receiptInput, { color: colors.textPrimary, borderColor: colors.border }]} />
                    <TextInput value={r.qty} onChangeText={v => updateReceipt(r.id, 'qty', v)}
                      placeholder="qtd" placeholderTextColor={colors.textTertiary} keyboardType="numeric"
                      style={[styles.receiptQtyInput, { color: colors.textPrimary, borderColor: colors.border }]} />
                    <TouchableOpacity onPress={() => removeReceipt(r.id)} hitSlop={10}>
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </SectionCard>

              {/* Observações */}
              <SectionCard title="Observações Gerais" icon="document-text-outline" colors={colors}>
                <TextInput value={observations} onChangeText={onObservationsChange}
                  placeholder="Ocorrências, manutenções..." placeholderTextColor={colors.textTertiary}
                  multiline numberOfLines={6}
                  style={[styles.textArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]} />
              </SectionCard>

              {/* Participantes */}
              <SectionCard title="Participação no Turno" icon="people-outline" colors={colors} subtitle="Um nome por linha">
                <TextInput value={participants} onChangeText={onParticipantsChange}
                  placeholder={'Estevão\nAlan'} placeholderTextColor={colors.textTertiary}
                  multiline numberOfLines={4}
                  style={[styles.textArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]} />
              </SectionCard>
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={[styles.detailFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border, flex: 1 }]} onPress={onClose}>
              <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: sc, flex: 2, opacity: saving ? 0.7 : 1 }]}
              onPress={onSave} disabled={saving}
            >
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={styles.primaryBtnText}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  shiftPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1.5,
  },
  shiftPillText: { fontSize: 14, fontWeight: '900' },
  tabToggleGroup: {
    flexDirection: 'row', borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 3, gap: 2,
  },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 17,
  },
  toggleBtnActive: { backgroundColor: '#FFFFFFEE' },
  toggleBtnText: { fontSize: 12, fontWeight: '700' },

  sectionCard: {
    borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 12, marginBottom: 12,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconBg: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionCardTitle: { fontSize: 14, fontWeight: '800' },
  sectionCardSub: { fontSize: 11, marginTop: 1 },

  shiftRow: { flexDirection: 'row', gap: 8 },
  shiftBtn: {
    flex: 1, aspectRatio: 1, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  shiftBtnLetter: { fontSize: 22, fontWeight: '900' },
  shiftBtnLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4 },

  addRowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  addRowBtnText: { fontSize: 12, fontWeight: '700' },

  lotCard: {
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 8,
  },
  lotIndexBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  lotIndexText: { fontSize: 11, fontWeight: '800' },

  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldLabelText: {
    fontSize: 9, fontWeight: '800', letterSpacing: 1,
    color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
  },
  acDropdown: {
    position: 'absolute', top: 42, left: 0, right: 0,
    borderWidth: 1.5, borderRadius: 10,
    zIndex: 999, elevation: 12,
    shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  acItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  acItemText: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.1 },

  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  statusChipDot: { width: 5, height: 5, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: '600' },

  emptyReceiptBtn: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 20, alignItems: 'center', gap: 6,
  },
  emptyReceiptText: { fontSize: 13 },

  receiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  receiptIndex: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  receiptIndexText: { fontSize: 12, fontWeight: '800' },
  receiptInput: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, fontSize: 14,
  },
  receiptQtyInput: {
    width: 52, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 7, fontSize: 14, textAlign: 'center',
  },

  textArea: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, textAlignVertical: 'top', minHeight: 100,
  },

  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1, flex: 1,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },

  // History cards
  histCard: {
    borderRadius: 16, borderWidth: 1,
    marginBottom: 10, overflow: 'hidden',
  },
  histCardAccent: { height: 3, width: '100%' },
  histCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 8 },
  histShiftBadge: {
    width: 42, height: 42, borderRadius: 13, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  histShiftText: { fontSize: 16, fontWeight: '900' },
  histDateText: { fontSize: 13, fontWeight: '700' },
  histByText: { fontSize: 11, marginTop: 1 },

  histStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  statPillText: { fontSize: 11, fontWeight: '700' },

  histPreview: {
    marginHorizontal: 12, borderRadius: 10, borderWidth: 1,
    padding: 10, gap: 6, marginBottom: 8,
  },
  histPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  histDot: { width: 7, height: 7, borderRadius: 4 },
  histPreviewText: { flex: 1, fontSize: 12, lineHeight: 18 },
  histMore: { fontSize: 11, fontStyle: 'italic', marginLeft: 14 },

  histReceiptsBox: {
    marginHorizontal: 12, borderRadius: 10, borderWidth: 1,
    padding: 10, marginBottom: 8,
  },
  histReceiptsLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  histReceiptsItems: { fontSize: 12, lineHeight: 18 },

  histFooter: {
    flexDirection: 'row', borderTopWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, gap: 4,
  },
  histAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 5 },
  histActionText: { fontSize: 12, fontWeight: '700' },

  emptyState: {
    borderRadius: 16, borderWidth: 1,
    padding: 40, alignItems: 'center', gap: 12, marginTop: 20,
  },
  emptyStateTitle: { fontSize: 16, fontWeight: '800' },
  emptyStateText: { fontSize: 13, textAlign: 'center' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, maxHeight: '88%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  sheetSub: { fontSize: 12, marginTop: 2 },
  sheetFooter: { padding: 16, borderTopWidth: 1 },

  waChatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  waAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  waBubble: { flex: 1, borderRadius: 8, borderTopLeftRadius: 0, padding: 10, paddingBottom: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  waBubbleDetail: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 0 },
  waSender: { fontSize: 12, fontWeight: '700', color: '#25D366', marginBottom: 4 },
  waLine: { fontSize: 13.5, lineHeight: 20, marginBottom: 1 },
  waQuoteBlock: { borderLeftWidth: 3, paddingLeft: 8, marginVertical: 4, paddingVertical: 2 },
  waQuoteText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  waDivider: { height: 1, marginVertical: 6, borderRadius: 1 },
  waTimeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 6 },
  waTime: { fontSize: 11 },

  whatsappBubble: {
    borderRadius: 16, padding: 14, borderTopRightRadius: 4,
  },
  whatsappText: { fontSize: 13.5, lineHeight: 21, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Detail modal
  detailSheet: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  detailHeader: { padding: 16, paddingTop: 10, paddingBottom: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  detailHeaderContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailShiftBadge: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  detailShiftText: { fontSize: 20, fontWeight: '900', color: '#000' },
  detailTitle: { fontSize: 20, fontWeight: '900' },
  detailDate: { fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  detailTime: { fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 6, borderRadius: 10 },

  detailSection: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  detailSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailSectionTitle: { fontSize: 14, fontWeight: '800' },

  detailLotRow: {
    borderWidth: 1, borderLeftWidth: 3, borderRadius: 10, padding: 10, gap: 6,
  },
  statusTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusTagDot: { width: 6, height: 6, borderRadius: 3 },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  lotNotesText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },

  receiptDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  receiptBullet: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  receiptDetailText: { flex: 1, fontSize: 13, lineHeight: 20 },

  obsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  obsBullet: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  obsText: { flex: 1, fontSize: 13, lineHeight: 20 },

  participantChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  participantText: { fontSize: 13, fontWeight: '500' },

  badge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  detailFooter: {
    flexDirection: 'row', gap: 8, padding: 14, borderTopWidth: 1,
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },

  // Header icon buttons
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  // Delete footer icon
  dtFooterIcon: {
    width: 46, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  // Delete confirmation banner
  deleteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1,
  },
  deleteBannerText: {
    flex: 1, fontSize: 13, fontWeight: '600', color: '#EF4444',
  },
  deleteBannerBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  deleteBannerBtnText: { fontSize: 13, fontWeight: '700' },

  // Lots WhatsApp-style card
  dtLotsCard: {
    borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 4,
  },
  dtWaQuote: {
    borderLeftWidth: 3, paddingLeft: 10,
    paddingVertical: 4, marginBottom: 8, marginTop: 4,
  },
  dtWaQuoteText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  dtWaBold: { fontSize: 14, fontWeight: '700', marginBottom: 4, marginTop: 2 },
  dtWaBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 2, paddingLeft: 4 },
  dtWaBullet: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  dtWaBulletText: { flex: 1, fontSize: 13.5, lineHeight: 20 },

  // Detail content sections
  dtSection: { gap: 8 },
  dtSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  dtSectionIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dtSectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },

  // Lot rows
  dtLotRow: {
    borderWidth: 1, borderLeftWidth: 3, borderRadius: 10,
    padding: 10, gap: 5, marginBottom: 6,
  },
  dtTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  dtTagText: { fontSize: 12, fontWeight: '700' },
  dtStatusDot: { width: 6, height: 6, borderRadius: 3 },
  dtStatusText: { fontSize: 12, fontWeight: '600' },
  dtNotes: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },

  // Receipt rows
  dtReceiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6,
  },
  dtReceiptNum: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  dtReceiptNumText: { fontSize: 12, fontWeight: '800' },
  dtReceiptProduct: { fontSize: 14, fontWeight: '600' },
  dtReceiptQty: { fontSize: 12, marginTop: 1 },

  // Observations box
  dtObsBox: {
    borderRadius: 10, borderWidth: 1,
    padding: 12,
  },
  dtObsText: { fontSize: 14, lineHeight: 22 },

  // Participants
  dtParticipant: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  dtParticipantText: { fontSize: 13, fontWeight: '500' },
});
