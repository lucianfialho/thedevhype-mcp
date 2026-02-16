import type { ScrapingResult, NotaFiscal, Produto, FormaPagamento } from './types';

// ─── Infosimples API response types ───

interface InfosimplesProduct {
  codigo: string;
  nome: string;
  quantidade: string;
  unidade: string;
  valor_unitario: string;
  valor_total_produto: string;
  normalizado_quantidade: number;
  normalizado_valor_unitario: number;
  normalizado_valor_total_produto: number;
}

interface InfosimplesPayment {
  forma_pagamento: string;
  valor_pago: string;
  normalizado_valor_pago: number;
}

interface InfosimplesResponse {
  code: number;
  code_message: string;
  data: Array<{
    cancelada: boolean;
    informacoes_nota: {
      numero: string;
      serie: string;
      chave_acesso: string;
      protocolo_autorizacao: string;
      data_emissao: string;
      hora_emissao: string;
      data_autorizacao?: string;
      hora_autorizacao?: string;
    };
    emitente: {
      nome_razao_social: string;
      cnpj: string;
      endereco: string;
    };
    produtos: InfosimplesProduct[];
    formas_pagamento: InfosimplesPayment[];
    normalizado_valor_a_pagar: number;
    normalizado_valor_total: number;
    normalizado_tributos_totais: number;
    normalizado_valor_desconto: number;
    normalizado_quantidade_total_items: number;
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

    const data = json.data?.[0];
    if (!data) {
      console.error('[infosimples] No data in response:', JSON.stringify(json).slice(0, 500));
      return { sucesso: false, erro: 'No data returned from Infosimples API' };
    }

    if (data.cancelada) {
      return { sucesso: false, erro: 'Nota fiscal cancelada' };
    }

    console.log('[infosimples] Response keys:', Object.keys(data));
    console.log('[infosimples] Products:', data.produtos?.length ?? 0);

    const notaFiscal = adaptInfosimplesToNotaFiscal(data);
    return { sucesso: true, notaFiscal };
  } catch (error) {
    console.error('[infosimples] Error:', error);
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
  const enderecoParts = (emitente.endereco || '').split(',').map((s) => s.trim());
  const estado = enderecoParts.length >= 2 ? enderecoParts[enderecoParts.length - 1] : '';
  const cidade = enderecoParts.length >= 3 ? enderecoParts[enderecoParts.length - 2] : '';

  // Map products
  const produtos: Produto[] = (data.produtos || []).map((p) => ({
    codigo: p.codigo || '',
    nome: p.nome || '',
    quantidade: p.normalizado_quantidade ?? 0,
    unidade: p.unidade || '',
    valorUnitario: p.normalizado_valor_unitario ?? 0,
    valorTotal: p.normalizado_valor_total_produto ?? 0,
  }));

  // Map payment methods (field is forma_pagamento, not tipo)
  const formasPagamento: FormaPagamento[] = (data.formas_pagamento || [])
    .filter((fp) => !(fp.forma_pagamento || '').toLowerCase().includes('troco'))
    .map((fp) => ({
      tipo: fp.forma_pagamento || '',
      valorPago: fp.normalizado_valor_pago ?? 0,
    }));

  // Calculate troco
  const trocoEntry = (data.formas_pagamento || []).find((fp) =>
    (fp.forma_pagamento || '').toLowerCase().includes('troco'),
  );
  const totalPago = formasPagamento.reduce((sum, fp) => sum + fp.valorPago, 0);
  const troco = trocoEntry
    ? trocoEntry.normalizado_valor_pago
    : Math.max(0, totalPago - (data.normalizado_valor_a_pagar ?? 0));

  const valorTotalProdutos = data.normalizado_valor_total
    ?? produtos.reduce((sum, p) => sum + p.valorTotal, 0);
  const descontos = data.normalizado_valor_desconto
    ?? Math.max(0, valorTotalProdutos - (data.normalizado_valor_a_pagar ?? 0));

  // Date fields are inside informacoes_nota
  const dataEmissao = info.data_emissao && info.hora_emissao
    ? parseBrazilianDate(info.data_emissao, info.hora_emissao)
    : info.data_emissao
      ? parseBrazilianDate(info.data_emissao)
      : new Date();

  return {
    numero: info.numero || '',
    serie: info.serie || '',
    chaveAcesso: (info.chave_acesso || '').replace(/\s/g, ''),
    protocoloAutorizacao: info.protocolo_autorizacao || '',
    dataEmissao,
    estabelecimento: {
      nome: emitente.nome_razao_social || '',
      cnpj: emitente.cnpj || '',
      endereco: emitente.endereco || '',
      cidade,
      estado,
    },
    produtos,
    quantidadeTotalItens: data.normalizado_quantidade_total_items ?? produtos.length,
    valorTotalProdutos,
    descontos,
    valorAPagar: data.normalizado_valor_a_pagar ?? 0,
    tributos: data.normalizado_tributos_totais ?? 0,
    formasPagamento,
    troco,
    dataExtracao: new Date(),
  };
}
