export interface ExcelCell {
  value: string | number | boolean;
  style?: {
    bold?: boolean;
    bg?: string;
    textColor?: string;
    border?: boolean;
    align?: 'left' | 'center' | 'right';
  };
}

export interface ExcelRow {
  cells: ExcelCell[];
}

export const generateSimpleXLSX = (
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][]
): string => {
  // XLSX is a ZIP file containing XML files
  // For simplicity, we'll create a CSV-like structure but with XLSX format

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x15" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main">
  <workbookPr defaultTheme="1"/>
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="19020" windowHeight="11010" tabRatio="500" activeTab="0"/>
  </bookViews>
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
  <definedNames/>
  <calcPr calcId="152"/>
</workbook>`;

  return xml;
};

// For now, we'll use a simpler approach: generate TSV/CSV that Excel can open
export const generateProductCatalogXLSX = (products: any[]): string => {
  // Header
  let content =
    'Unidade\tProduto\tAbreviação\tCategoria\tFórmula Ativa\tAplicação\tDificuldade\tNotas\n';

  // Add products
  products.forEach((p, idx) => {
    const row = [
      `SC${idx + 1}`,
      p.product || p.name || p.title || '',
      p.recipe || p.alias || '',
      p.category || '',
      p.active_ingredient || p.className || p.func || '',
      p.application || p.applications || '',
      p.difficulty || p.level || 'N/A',
      p.notes || p.description || '',
    ];
    content += row.join('\t') + '\n';
  });

  return content;
};

// Generate CSV format that can be opened in Excel
export const generateCSVContent = (
  title: string,
  headers: string[],
  rows: (string | number)[][],
  products?: any[]
): string => {
  let content = '';

  // Add title
  if (title) {
    content += title + '\n\n';
  }

  // Add headers
  content += headers.join(',') + '\n';

  // Add data rows
  rows.forEach(row => {
    const escapedRow = row.map(cell => {
      const str = String(cell ?? '');
      // Escape quotes and wrap in quotes if contains comma
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    content += escapedRow.join(',') + '\n';
  });

  return content;
};

// Generate a detailed product catalog
export const generateProductCatalogCSV = (
  recipes: any[],
  chemistry: any[],
  procedures: any[]
): string => {
  let content = 'CATÁLOGO DE PRODUTOS - FORMULAÇÃO AGRÍCOLA\n\n';

  // PRODUTOS
  content += '=== PRODUTOS ===\n';
  content +=
    'Produto,Receita,Ingrediente Ativo,Categoria,Função,Aplicação,Tempo Massagem,Dificuldade,Notas\n';
  recipes.forEach(r => {
    const row = [
      `"${r.product}"`,
      `"${r.recipe}"`,
      `"${r.active_ingredient}"`,
      `"${r.category}"`,
      `"${r.func}"`,
      `"${r.application}"`,
      r.massageTime || r.duration || 'N/A',
      r.difficulty || 'N/A',
      `"${r.notes}"`,
    ];
    content += row.join(',') + '\n';
  });

  content += '\n';

  // CHEMISTRY
  content += '=== INGREDIENTES QUÍMICOS ===\n';
  content += 'Nome,Alias,Classe,Mecanismo,Aplicações,Segurança,Fórmula Molecular\n';
  chemistry.forEach(c => {
    const row = [
      `"${c.name}"`,
      `"${c.alias}"`,
      `"${c.className}"`,
      `"${c.func}"`,
      `"${c.applications}"`,
      `"${c.safety}"`,
      c.molecularFormula || 'N/A',
    ];
    content += row.join(',') + '\n';
  });

  content += '\n';

  // PROCEDURES
  content += '=== PROCEDIMENTOS ===\n';
  content += 'Título,Descrição,Duração,Passos\n';
  procedures.forEach(p => {
    const stepsStr = p.steps ? `"${p.steps.join('; ')}"` : '""';
    const row = [`"${p.title}"`, `"${p.content}"`, p.duration || 'N/A', stepsStr];
    content += row.join(',') + '\n';
  });

  return content;
};
