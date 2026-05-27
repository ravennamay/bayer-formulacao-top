import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../src/theme';

import safeAsyncStorage from '../../src/utils/safeAsyncStorage';

type ShiftKey = 'A' | 'B' | 'C' | 'D' | 'E';

type CellValue = '6' | '14' | '22' | 'F';

const SHIFTS: ShiftKey[] = ['A', 'B', 'C', 'D', 'E'];

const SHIFT_OFFSETS: Record<ShiftKey, number> = {
  B: 0,
  A: 2,
  D: 4,
  C: 6,
  E: 8,
};

const CYCLE: CellValue[] = ['6', '6', '14', '14', '22', '22', 'F', 'F', 'F', 'F'];

const EPOCH = new Date(2026, 4, 23);

const STORAGE_KEY = 'bayer_my_shift';

const MIN_YEAR = 2024;

const MAX_YEAR = 2035;

function daysBetween(a: Date, b: Date): number {
  const MS = 86400000;

  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());

  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.round((utcA - utcB) / MS);
}

function getShiftValue(date: Date, shift: ShiftKey): CellValue {
  const diff = daysBetween(date, EPOCH);

  const pos = (((diff + SHIFT_OFFSETS[shift]) % 10) + 10) % 10;

  return CYCLE[pos];
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}.${String(d.getFullYear()).slice(-2)}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];

  const last = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= last; d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

function getCellTheme(value: CellValue) {
  switch (value) {
    case '6':
      return {
        text: '#84CC16',
        bg: 'rgba(132,204,22,0.10)',
        border: 'rgba(132,204,22,0.30)',
        label: 'Manhã',
        icon: 'sunny-outline' as const,
      };

    case '14':
      return {
        text: '#06B6D4',
        bg: 'rgba(6,182,212,0.10)',
        border: 'rgba(6,182,212,0.30)',
        label: 'Tarde',
        icon: 'partly-sunny-outline' as const,
      };

    case '22':
      return {
        text: '#A855F7',
        bg: 'rgba(168,85,247,0.10)',
        border: 'rgba(168,85,247,0.30)',
        label: 'Noite',
        icon: 'moon-outline' as const,
      };

    default:
      return {
        text: '#3B82F6',
        bg: 'rgba(59,130,246,0.08)',
        border: 'rgba(59,130,246,0.22)',
        label: 'Folga',
        icon: 'bed-outline' as const,
      };
  }
}

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function TabelaTurnoScreen() {
  const { colors } = useTheme();

  const now = new Date();

  const scrollRef = useRef<ScrollView>(null);

  const todayY = useRef(0);

  const [myShift, setMyShift] = useState<ShiftKey>('C');

  const [year, setYear] = useState(now.getFullYear());

  const [month, setMonth] = useState(now.getMonth());

  const [showYearPicker, setShowYearPicker] = useState(false);

  const [selectedHolidayDate, setSelectedHolidayDate] = useState<string | null>(null);

  /**
   * =========================================================
   * LOAD SHIFT
   * =========================================================
   */

  useEffect(() => {
    const loadShift = async () => {
      try {
        const value = await safeAsyncStorage.getItem(STORAGE_KEY);

        if (value && SHIFTS.includes(value as ShiftKey)) {
          setMyShift(value as ShiftKey);
        }
      } catch (error) {
        console.log('Erro ao carregar turno:', error);
      }
    };

    loadShift();
  }, []);

  /**
   * =========================================================
   * SAVE SHIFT
   * =========================================================
   */

  const onSelectShift = useCallback(async (shift: ShiftKey) => {
    try {
      setMyShift(shift);

      await safeAsyncStorage.setItem(STORAGE_KEY, shift);
    } catch (error) {
      console.log('Erro ao salvar turno:', error);
    }
  }, []);

  /**
   * =========================================================
   * DAYS
   * =========================================================
   */

  const days = useMemo(() => {
    return getMonthDays(year, month);
  }, [year, month]);

  /**
   * =========================================================
   * MONTH NAVIGATION
   * =========================================================
   */

  const goPrev = () => {
    if (month === 0 && year > MIN_YEAR) {
      setYear(year - 1);

      setMonth(11);

      return;
    }

    if (month > 0) {
      setMonth(month - 1);
    }
  };

  const goNext = () => {
    if (month === 11 && year < MAX_YEAR) {
      setYear(year + 1);

      setMonth(0);

      return;
    }

    if (month < 11) {
      setMonth(month + 1);
    }
  };

  const goToday = () => {
    setYear(now.getFullYear());

    setMonth(now.getMonth());

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, todayY.current - 140),
        animated: true,
      });
    }, 200);
  };

  /**
   * =========================================================
   * SUMMARY
   * =========================================================
   */

  const monthSummary = useMemo(() => {
    const counts = {
      '6': 0,
      '14': 0,
      '22': 0,
      F: 0,
    };

    days.forEach(day => {
      counts[getShiftValue(day, myShift)]++;
    });

    return counts;
  }, [days, myShift]);

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
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={10}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View
            style={{
              flex: 1,
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                styles.headerTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              Tabela de Turno
            </Text>

            <Text
              style={[
                styles.headerSub,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Escala 6x4 · Bayer Belford Roxo
            </Text>
          </View>

          <TouchableOpacity
            onPress={goToday}
            hitSlop={10}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.textTertiary,
              },
            ]}
          >
            MEU TURNO
          </Text>

          <View style={styles.shiftPickerRow}>
            {SHIFTS.map(shift => {
              const active = shift === myShift;

              return (
                <TouchableOpacity
                  key={shift}
                  activeOpacity={0.8}
                  onPress={() => onSelectShift(shift)}
                  style={[
                    styles.shiftChip,
                    {
                      borderColor: active ? colors.primary : colors.border,

                      backgroundColor: active ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? '#fff' : colors.textSecondary,

                      fontWeight: '800',
                      fontSize: 15,
                    }}
                  >
                    {shift}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  headerSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },

  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },

  section: {
    gap: 10,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  shiftPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },

  shiftChip: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
