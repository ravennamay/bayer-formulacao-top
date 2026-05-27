import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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

import { api } from './auth';
import type { ThemeColors } from './theme';
import { useTheme } from './theme';
import { ProductionItem, SCS, SITUATIONS, UNITS } from './types';

// Peso por bag em kg
const PRODUCT_WEIGHTS: Record<string, number> = {
  UREIA: 700,
  TRIFLOXYSTROBIN: 500,
  BIXAFEN: 500,
  PROTIOCONAZOLE: 500,
  INPYRFLUXAM: 500,
  VERANGO: 500,
  NATIVO: 500,
  'FOX XPRO': 500,
  FOX: 500,
  OBERON: 500,
  BELT: 500,
  CONNECT: 500,
  MOVENTO: 500,
  'SPHERE MAX': 500,
  DECIS: 500,
};

type Props = {
  visible: boolean;
  initial?: ProductionItem | null;
  date: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ItemFormModal({ visible, initial, date, onClose, onSaved }: Props) {
  const { colors } = useTheme();

  const [unit, setUnit] = useState<string>(UNITS[0]);
  const [sc, setSc] = useState<string>(SCS[0]);
  const [product, setProduct] = useState('');
  const [batch, setBatch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calculatedWeight, setCalculatedWeight] = useState(0);
  const [situation, setSituation] = useState<string>(SITUATIONS[0]);
  const [observation, setObservation] = useState('');
  const [products, setProducts] = useState<{ name: string; abbr: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---------- Carrega produtos ----------
  useEffect(() => {
    let mounted = true;

    if (visible) {
      api
        .get('/products')
        .then(r => {
          if (mounted) setProducts(r.data || []);
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [visible]);

  // ---------- Preenche / Reseta ----------
  useEffect(() => {
    if (!visible) return;

    if (initial) {
      setUnit(initial.unit);
      setSc(initial.sc);
      setProduct(initial.product);
      setBatch(initial.batch);
      setQuantity(initial.quantity != null ? String(initial.quantity) : '');
      setSituation(initial.situation);
      setObservation(initial.observation || '');
      calculateWeight(initial.product, initial.quantity || 0);
    } else {
      setUnit(UNITS[0]);
      setSc(SCS[0]);
      setProduct('');
      setBatch('');
      setQuantity('');
      setSituation(SITUATIONS[0]);
      setObservation('');
      setCalculatedWeight(0);
    }
  }, [visible, initial]);

  // ---------- Auto cálculo de peso ----------
  useEffect(() => {
    if (product && quantity) {
      const qty = Number(String(quantity).replace(',', '.'));
      if (!isNaN(qty)) {
        calculateWeight(product, qty);
      } else {
        setCalculatedWeight(0);
      }
    } else {
      setCalculatedWeight(0);
    }
  }, [product, quantity]);

  const calculateWeight = (prod: string, qty: number) => {
    const weight = PRODUCT_WEIGHTS[prod.toUpperCase()] || 0;
    setCalculatedWeight(weight * qty);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(product.toLowerCase())
  );

  const save = async () => {
    if (!product.trim() || !batch.trim() || !quantity.trim()) {
      Alert.alert('Atenção', 'Produto, lote e quantidade são obrigatórios.');
      return;
    }

    const parsedQty = Number(String(quantity).replace(',', '.'));

    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser um número maior que zero');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        date,
        unit,
        sc,
        product: product.trim(),
        batch: batch.trim(),
        quantity: parsedQty,
        quantity_unit: 'bag',
        material_status: 'Disponível',
        situation,
        observation: observation.trim(),
      };

      if (initial) {
        await api.put(`/items/${initial.id}`, payload);
      } else {
        await api.post('/items', payload);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && (err as any)?.response?.data?.detail
          ? (err as any).response.data.detail
          : 'Falha ao salvar';

      Alert.alert('Erro', String(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {initial ? 'Editar item' : 'Novo item'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 16,
              gap: 14,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Unidade */}
            <Field label="Unidade" colors={colors}>
              <Chips options={[...UNITS]} value={unit} onChange={setUnit} colors={colors} />
            </Field>

            {/* SC */}
            <Field label="SC" colors={colors}>
              <Chips options={[...SCS]} value={sc} onChange={setSc} colors={colors} />
            </Field>

            {/* Produto */}
            <Field label="Produto" colors={colors}>
              <View>
                <TextInput
                  value={product}
                  onChangeText={p => {
                    setProduct(p);
                    setShowSuggestions(p.length > 0);
                  }}
                  placeholder="Digite o nome do produto"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                />

                {showSuggestions && filteredProducts.length > 0 && (
                  <View
                    style={[
                      styles.suggestions,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {filteredProducts.slice(0, 5).map(p => (
                      <TouchableOpacity
                        key={p.name}
                        onPress={() => {
                          setProduct(p.name);
                          setShowSuggestions(false);
                        }}
                        style={[styles.suggestion, { borderBottomColor: colors.border }]}
                      >
                        <Text
                          style={{
                            color: colors.textPrimary,
                            fontWeight: '500',
                          }}
                        >
                          {p.name}
                        </Text>
                        <Text
                          style={{
                            color: colors.textTertiary,
                            fontSize: 12,
                          }}
                        >
                          {p.abbr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </Field>

            {/* Lote */}
            <Field label="Lote" colors={colors}>
              <TextInput
                value={batch}
                onChangeText={setBatch}
                placeholder="Ex: 038, 042, etc"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </Field>

            {/* Quantidade em Bags */}
            <Field label="Quantidade (Bags)" colors={colors}>
              <View style={styles.quantityRow}>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                />
                <Text style={[styles.quantityUnit, { color: colors.textSecondary }]}>
                  bag{quantity !== '1' ? 's' : ''}
                </Text>
              </View>
            </Field>

            {/* Peso calculado */}
            {calculatedWeight > 0 && (
              <View
                style={[
                  styles.weightCard,
                  {
                    backgroundColor: colors.primary + '12',
                    borderColor: colors.primary + '30',
                  },
                ]}
              >
                <Ionicons name="calculator-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 11,
                      fontWeight: '500',
                    }}
                  >
                    Peso Calculado
                  </Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 16,
                      fontWeight: '800',
                    }}
                  >
                    {calculatedWeight} kg
                  </Text>
                </View>
              </View>
            )}

            {/* Situação */}
            <Field label="Situação" colors={colors}>
              <Chips
                options={[...SITUATIONS]}
                value={situation}
                onChange={setSituation}
                colors={colors}
              />
            </Field>

            {/* Observação */}
            <Field label="Observação (opcional)" colors={colors}>
              <TextInput
                value={observation}
                onChangeText={setObservation}
                placeholder="Adicionar anotação..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
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
            </Field>

            {/* Botão Salvar */}
            <TouchableOpacity
              onPress={save}
              disabled={saving}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: saving ? 0.7 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>{initial ? 'Atualizar' : 'Criar item'}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Subcomponents ----------
function Field({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function Chips({
  options,
  value,
  onChange,
  colors,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colors: ThemeColors;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
      {options.map(opt => {
        const active = value === opt;

        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: active ? '#fff' : colors.textSecondary,
                fontWeight: active ? '700' : '500',
                fontSize: 12,
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },

  sheet: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    height: 44,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  quantityUnit: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 50,
  },

  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    marginHorizontal: 4,
    borderWidth: 1,
  },

  suggestions: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
  },

  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },

  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
