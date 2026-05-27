export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'federal' | 'municipal';
};

// Feriados federais brasileiros (fixos e móveis para 2024-2026)
// Nota: Páscoa e derivados são calculados dinamicamente
const FEDERAL_HOLIDAYS: Holiday[] = [
  // 2024
  { date: '2024-01-01', name: 'Ano Novo', type: 'federal' },
  { date: '2024-02-13', name: 'Carnaval', type: 'federal' },
  { date: '2024-02-14', name: 'Terça-feira de Carnaval', type: 'federal' },
  { date: '2024-02-15', name: 'Quarta-feira de Cinzas', type: 'federal' },
  { date: '2024-03-29', name: 'Sexta-feira Santa', type: 'federal' },
  { date: '2024-04-21', name: 'Tiradentes', type: 'federal' },
  { date: '2024-05-01', name: 'Dia do Trabalho', type: 'federal' },
  { date: '2024-05-30', name: 'Corpus Christi', type: 'federal' },
  { date: '2024-09-07', name: 'Independência do Brasil', type: 'federal' },
  { date: '2024-10-12', name: 'Nossa Senhora Aparecida', type: 'federal' },
  { date: '2024-11-02', name: 'Finados', type: 'federal' },
  { date: '2024-11-15', name: 'Proclamação da República', type: 'federal' },
  { date: '2024-11-20', name: 'Consciência Negra', type: 'federal' },
  { date: '2024-12-25', name: 'Natal', type: 'federal' },

  // 2025
  { date: '2025-01-01', name: 'Ano Novo', type: 'federal' },
  { date: '2025-03-04', name: 'Carnaval', type: 'federal' },
  { date: '2025-03-05', name: 'Terça-feira de Carnaval', type: 'federal' },
  { date: '2025-03-06', name: 'Quarta-feira de Cinzas', type: 'federal' },
  { date: '2025-04-18', name: 'Sexta-feira Santa', type: 'federal' },
  { date: '2025-04-21', name: 'Tiradentes', type: 'federal' },
  { date: '2025-05-01', name: 'Dia do Trabalho', type: 'federal' },
  { date: '2025-06-19', name: 'Corpus Christi', type: 'federal' },
  { date: '2025-09-07', name: 'Independência do Brasil', type: 'federal' },
  { date: '2025-10-12', name: 'Nossa Senhora Aparecida', type: 'federal' },
  { date: '2025-11-02', name: 'Finados', type: 'federal' },
  { date: '2025-11-15', name: 'Proclamação da República', type: 'federal' },
  { date: '2025-11-20', name: 'Consciência Negra', type: 'federal' },
  { date: '2025-12-25', name: 'Natal', type: 'federal' },

  // 2026
  { date: '2026-01-01', name: 'Ano Novo', type: 'federal' },
  { date: '2026-02-17', name: 'Carnaval', type: 'federal' },
  { date: '2026-02-18', name: 'Terça-feira de Carnaval', type: 'federal' },
  { date: '2026-02-19', name: 'Quarta-feira de Cinzas', type: 'federal' },
  { date: '2026-04-10', name: 'Sexta-feira Santa', type: 'federal' },
  { date: '2026-04-21', name: 'Tiradentes', type: 'federal' },
  { date: '2026-05-01', name: 'Dia do Trabalho', type: 'federal' },
  { date: '2026-06-11', name: 'Corpus Christi', type: 'federal' },
  { date: '2026-09-07', name: 'Independência do Brasil', type: 'federal' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'federal' },
  { date: '2026-11-02', name: 'Finados', type: 'federal' },
  { date: '2026-11-15', name: 'Proclamação da República', type: 'federal' },
  { date: '2026-11-20', name: 'Consciência Negra', type: 'federal' },
  { date: '2026-12-25', name: 'Natal', type: 'federal' },
];

// Feriados municipais de Belford Roxo - RJ
const MUNICIPAL_HOLIDAYS: Holiday[] = [
  // Aniversário de Belford Roxo (28 de março)
  { date: '2024-03-28', name: 'Aniversário de Belford Roxo', type: 'municipal' },
  { date: '2025-03-28', name: 'Aniversário de Belford Roxo', type: 'municipal' },
  { date: '2026-03-28', name: 'Aniversário de Belford Roxo', type: 'municipal' },
];

export const ALL_HOLIDAYS = [...FEDERAL_HOLIDAYS, ...MUNICIPAL_HOLIDAYS].sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);

/**
 * Obtém feriado para uma data específica (formato YYYY-MM-DD)
 */
export const getHolidayByDate = (dateStr: string): Holiday | undefined => {
  return ALL_HOLIDAYS.find(h => h.date === dateStr);
};

/**
 * Obtém todos os feriados de um mês específico
 * @param year - Ano (ex: 2024)
 * @param month - Mês (0-11)
 */
export const getHolidaysForMonth = (year: number, month: number): Holiday[] => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return ALL_HOLIDAYS.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= startDate && hDate <= endDate;
  });
};
