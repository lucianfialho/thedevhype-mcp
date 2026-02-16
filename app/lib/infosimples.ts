import type { ScrapingResult, NotaFiscal, Produto, FormaPagamento } from './types';

// ─── Infosimples API response types ───

interface InfosimplesProduct {
  codigo: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  valor_unitario: string;
  valor_total: string;
  normalizado_quantidade: number;
  normalizado_valor_unitario: number;
  normalizado_valor_total_produto: number;
}

interface InfosimplesPayment {
  tipo: string;
  valor: string;
  normalizado_valor_pago: number;
}

interface InfosimplesResponse {
  code: number;
  code_message: string;
  data: Array<{
    cancelada: boolean;
    data_emissao: string;
    hora_emissao: string;
    informacoes_nota: {
      numero: string;
      serie: string;
      chave_acesso: string;
      protocolo_autorizacao: string;
    };
    emitente: {
      nome_razao_social: string;
      cnpj: string;
      endereco: string;
    };
    produtos: InfosimplesProduct[];
    formas_pagamento: InfosimplesPayment[];
    normalizado_valor_a_pagar: number;
    normalizado_tributos_totais: number;
  }>;
}

/**
 * Extracts a 44-digit NFC-e access key from a URL or direct input.
 * Supports QR code URLs from all 27 Brazilian states.
 */
export function extractAccessKey(input: string): string | null {
  const trimmed = input.trim();

  // Direct 44-digit key
  if (/^\d{44}$/.test(trimmed)) {
    return trimmed;
  }

  // Try to parse as URL and check known query params
  try {
    const url = new URL(trimmed);
    const paramNames = ['chNFe', 'chave', 'p', 'nf'];

    for (const param of paramNames) {
      const value = url.searchParams.get(param);
      if (value) {
        const match = value.match(/\d{44}/);
        if (match) return match[0];
      }
    }
  } catch {
    // Not a valid URL, fall through to regex
  }

  // Fallback: regex on the entire string
  const match = trimmed.match(/\d{44}/);
  return match ? match[0] : null;
}

/**
 * Fetches NFC-e data from the Infosimples API using a 44-digit access key.
 */
export async function fetchNFCeFromInfosimples(accessKey: string): Promise<ScrapingResult> {
  const token = process.env.INFOSIMPLES_TOKEN;
  if (!token) {
    return { sucesso: false, erro: 'INFOSIMPLES_TOKEN not configured' };
  }

  try {
    const body = new URLSearchParams({ token, nfce: accessKey });
    const response = await fetch('https://api.infosimples.com/api/v2/consultas/sefaz/nfce', {
      method: 'POST',
      body,
    });

    const json = (await response.json()) as InfosimplesResponse;

    if (json.code !== 200) {
      return { sucesso: false, erro: `Infosimples API error: ${json.code_message}` };
    }

    const data = json.data[0];
    if (!data) {
      return { sucesso: false, erro: 'No data returned from Infosimples API' };
    }

    if (data.cancelada) {
      return { sucesso: false, erro: 'Nota fiscal cancelada' };
    }

    const notaFiscal = adaptInfosimplesToNotaFiscal(data);
    return { sucesso: true, notaFiscal };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro ao consultar Infosimples API',
    };
  }
}

/**
 * Parses Brazilian date "DD/MM/YYYY" + time "HH:MM:SS" into a Date object.
 */
export function parseBrazilianDate(dateStr: string, timeStr?: string): Date {
  const [dia, mes, ano] = dateStr.split('/').map(Number);
  if (timeStr) {
    const [hora, minuto, segundo] = timeStr.split(':').map(Number);
    return new Date(ano, mes - 1, dia, hora, minuto, segundo);
  }
  return new Date(ano, mes - 1, dia);
}

function adaptInfosimplesToNotaFiscal(
  data: InfosimplesResponse['data'][0],
): NotaFiscal {
  const info = data.informacoes_nota;
  const emitente = data.emitente;

  // Parse address parts from "Rua X, 123, Bairro, Cidade, UF"
  const enderecoParts = emitente.endereco.split(',').map((s) => s.trim());
  const estado = enderecoParts.length >= 2 ? enderecoParts[enderecoParts.length - 1] : '';
  const cidade = enderecoParts.length >= 3 ? enderecoParts[enderecoParts.length - 2] : '';

  // Map products
  const produtos: Produto[] = data.produtos.map((p) => ({
    codigo: p.codigo,
    nome: p.descricao,
    quantidade: p.normalizado_quantidade,
    unidade: p.unidade,
    valorUnitario: p.normalizado_valor_unitario,
    valorTotal: p.normalizado_valor_total_produto,
  }));

  // Map payment methods
  const formasPagamento: FormaPagamento[] = data.formas_pagamento
    .filter((fp) => !fp.tipo.toLowerCase().includes('troco'))
    .map((fp) => ({
      tipo: fp.tipo,
      valorPago: fp.normalizado_valor_pago,
    }));

  // Calculate troco
  const trocoEntry = data.formas_pagamento.find((fp) =>
    fp.tipo.toLowerCase().includes('troco'),
  );
  const totalPago = formasPagamento.reduce((sum, fp) => sum + fp.valorPago, 0);
  const troco = trocoEntry
    ? trocoEntry.normalizado_valor_pago
    : Math.max(0, totalPago - data.normalizado_valor_a_pagar);

  const valorTotalProdutos = produtos.reduce((sum, p) => sum + p.valorTotal, 0);
  const descontos = Math.max(0, valorTotalProdutos - data.normalizado_valor_a_pagar);

  return {
    numero: info.numero,
    serie: info.serie,
    chaveAcesso: info.chave_acesso.replace(/\s/g, ''),
    protocoloAutorizacao: info.protocolo_autorizacao,
    dataEmissao: parseBrazilianDate(data.data_emissao, data.hora_emissao),
    estabelecimento: {
      nome: emitente.nome_razao_social,
      cnpj: emitente.cnpj,
      endereco: emitente.endereco,
      cidade,
      estado,
    },
    produtos,
    quantidadeTotalItens: produtos.length,
    valorTotalProdutos,
    descontos,
    valorAPagar: data.normalizado_valor_a_pagar,
    tributos: data.normalizado_tributos_totais,
    formasPagamento,
    troco,
    dataExtracao: new Date(),
  };
}
