import * as cheerio from 'cheerio';
import type { NotaFiscal, Produto, Estabelecimento, FormaPagamento, ScrapingResult } from './types';

/**
 * Extrai dados de uma NFC-e a partir do HTML da página de consulta
 */
export async function scrapNFCe(html: string, urlOrigem?: string): Promise<ScrapingResult> {
  try {
    const $ = cheerio.load(html);

    // Log key selectors to diagnose parsing issues
    console.log(`[scraper:parse] #tabResult tbody tr count: ${$('#tabResult tbody tr').length}`);
    console.log(`[scraper:parse] .txtTopo#u20 text: "${$('.txtTopo#u20').text().trim()}"`);
    console.log(`[scraper:parse] .text first: "${$('.text').first().text().trim()}"`);
    console.log(`[scraper:parse] #infos content (first 300): "${$('#infos .ui-collapsible-content').first().text().substring(0, 300)}"`);
    console.log(`[scraper:parse] .chave text: "${$('.chave').text().trim()}"`);
    console.log(`[scraper:parse] #totalNota children: ${$('#totalNota').children().length}`);

    const estabelecimento = extrairEstabelecimento($);
    const produtos = extrairProdutos($);
    const totalizadores = extrairTotalizadores($);
    const infoNota = extrairInformacoesNota($);
    const formasPagamento = extrairFormasPagamento($);

    console.log(`[scraper:parse] Parsed results:`, {
      estabelecimento: { nome: estabelecimento.nome, cnpj: estabelecimento.cnpj },
      produtosCount: produtos.length,
      totalizadores,
      infoNota: { numero: infoNota.numero, serie: infoNota.serie, chaveAcesso: infoNota.chaveAcesso?.substring(0, 10) + '...' },
      formasPagamentoCount: formasPagamento.length,
    });

    const notaFiscal: NotaFiscal = {
      numero: infoNota.numero,
      serie: infoNota.serie,
      chaveAcesso: infoNota.chaveAcesso,
      protocoloAutorizacao: infoNota.protocoloAutorizacao,
      dataEmissao: infoNota.dataEmissao,
      dataAutorizacao: infoNota.dataAutorizacao,
      estabelecimento,
      produtos,
      quantidadeTotalItens: totalizadores.quantidadeTotalItens,
      valorTotalProdutos: totalizadores.valorTotalProdutos,
      descontos: totalizadores.descontos,
      valorAPagar: totalizadores.valorAPagar,
      tributos: totalizadores.tributos,
      formasPagamento,
      troco: totalizadores.troco,
      urlOrigem,
      dataExtracao: new Date(),
    };

    return {
      sucesso: true,
      notaFiscal,
    };
  } catch (erro) {
    return {
      sucesso: false,
      erro: erro instanceof Error ? erro.message : 'Erro desconhecido ao fazer scraping',
    };
  }
}

function extrairEstabelecimento($: cheerio.CheerioAPI): Estabelecimento {
  const nomeCompleto = $('.txtTopo#u20').text().trim();
  const cnpjTexto = $('.text').first().text().trim();
  const cnpj = cnpjTexto.replace('CNPJ:', '').trim();
  const enderecoCompleto = $('.text').eq(1).text().trim();

  const partesEndereco = enderecoCompleto.split(',').map(p => p.trim());

  return {
    nome: nomeCompleto,
    cnpj,
    endereco: enderecoCompleto,
    logradouro: partesEndereco[0] || undefined,
    numero: partesEndereco[1] || undefined,
    bairro: partesEndereco[3] || undefined,
    cidade: partesEndereco[4] || undefined,
    estado: partesEndereco[5] || undefined,
  };
}

function extrairProdutos($: cheerio.CheerioAPI): Produto[] {
  const produtos: Produto[] = [];

  $('#tabResult tbody tr').each((_index, element) => {
    const $tr = $(element);

    const nome = $tr.find('.txtTit').first().text().trim();

    const codigoTexto = $tr.find('.RCod').text().trim();
    const codigoMatch = codigoTexto.match(/Código:\s*(\d+)/);
    const codigo = codigoMatch ? codigoMatch[1] : '';

    const qtdeTexto = $tr.find('.Rqtd').text().trim();
    const qtdeMatch = qtdeTexto.match(/Qtde\.:([0-9.,]+)/);
    const quantidade = qtdeMatch ? parseFloat(qtdeMatch[1].replace(',', '.')) : 0;

    const unidadeTexto = $tr.find('.RUN').text().trim();
    const unidadeMatch = unidadeTexto.match(/UN:\s*(\w+)/);
    const unidade = unidadeMatch ? unidadeMatch[1] : '';

    const vlUnitTexto = $tr.find('.RvlUnit').text().trim();
    const vlUnitMatch = vlUnitTexto.match(/Vl\. Unit\.:[\s\u00A0]*([0-9.,]+)/);
    const valorUnitario = vlUnitMatch ? parseFloat(vlUnitMatch[1].replace(',', '.')) : 0;

    const valorTotalTexto = $tr.find('.valor').text().trim();
    const valorTotal = parseFloat(valorTotalTexto.replace(',', '.'));

    produtos.push({
      codigo,
      nome,
      quantidade,
      unidade,
      valorUnitario,
      valorTotal,
    });
  });

  return produtos;
}

function extrairTotalizadores($: cheerio.CheerioAPI) {
  const quantidadeTotalItens = parseInt(
    $('#totalNota #linhaTotal')
      .filter((_i, el) => $(el).find('label').text().includes('Qtd. total de itens'))
      .find('.totalNumb')
      .text()
      .trim()
  );

  const valorTotalProdutos = parseFloat(
    $('#totalNota #linhaTotal')
      .filter((_i, el) => $(el).find('label').text().includes('Valor total R$'))
      .find('.totalNumb')
      .text()
      .trim()
      .replace('.', '')
      .replace(',', '.')
  );

  const descontos = parseFloat(
    $('#totalNota #linhaTotal')
      .filter((_i, el) => $(el).find('label').text().includes('Descontos R$'))
      .find('.totalNumb')
      .text()
      .trim()
      .replace('.', '')
      .replace(',', '.')
  );

  const valorAPagar = parseFloat(
    $('#totalNota .linhaShade#linhaTotal')
      .find('.totalNumb')
      .text()
      .trim()
      .replace('.', '')
      .replace(',', '.')
  );

  const troco = parseFloat(
    $('#totalNota #linhaTotal')
      .filter((_i, el) => $(el).find('label').text().includes('Troco'))
      .find('.totalNumb')
      .text()
      .trim()
      .replace(',', '.')
  );

  const tributos = parseFloat(
    $('#totalNota .spcTop#linhaTotal')
      .find('.totalNumb')
      .text()
      .trim()
      .replace('.', '')
      .replace(',', '.')
  );

  return {
    quantidadeTotalItens,
    valorTotalProdutos,
    descontos,
    valorAPagar,
    troco,
    tributos,
  };
}

function extrairInformacoesNota($: cheerio.CheerioAPI) {
  let numero = '';
  let serie = '';
  let dataEmissao = new Date();
  let dataAutorizacao: Date | undefined;
  let protocoloAutorizacao = '';
  let chaveAcesso = '';

  const infoGeralTexto = $('#infos .ui-collapsible-content').first().text();

  const numeroMatch = infoGeralTexto.match(/Número:\s*(\d+)/);
  if (numeroMatch) numero = numeroMatch[1];

  const serieMatch = infoGeralTexto.match(/Série:\s*(\d+)/);
  if (serieMatch) serie = serieMatch[1];

  const emissaoMatch = infoGeralTexto.match(/Emissão:\s*([\d\/]+\s+[\d:]+)/);
  if (emissaoMatch) {
    dataEmissao = parseDataBrasileira(emissaoMatch[1]);
  }

  const protocoloMatch = infoGeralTexto.match(/Protocolo de Autorização:\s*(\d+)/);
  if (protocoloMatch) protocoloAutorizacao = protocoloMatch[1];

  const autorizacaoMatch = infoGeralTexto.match(/(\d{2}\/\d{2}\/\d{4})\s+às\s+(\d{2}:\d{2}:\d{2})/);
  if (autorizacaoMatch) {
    dataAutorizacao = parseDataBrasileira(`${autorizacaoMatch[1]} ${autorizacaoMatch[2]}`);
  }

  chaveAcesso = $('.chave').text().trim().replace(/\s/g, '');

  return {
    numero,
    serie,
    dataEmissao,
    dataAutorizacao,
    protocoloAutorizacao,
    chaveAcesso,
  };
}

function extrairFormasPagamento($: cheerio.CheerioAPI): FormaPagamento[] {
  const formasPagamento: FormaPagamento[] = [];

  $('#totalNota #linhaForma').nextAll('#linhaTotal').each((_index, element) => {
    const $linha = $(element);
    const label = $linha.find('label.tx').text().trim();

    if (label.toLowerCase().includes('troco')) {
      return false;
    }

    if (label) {
      const valorTexto = $linha.find('.totalNumb').text().trim();
      const valor = parseFloat(valorTexto.replace('.', '').replace(',', '.'));

      formasPagamento.push({
        tipo: label,
        valorPago: valor,
      });
    }
  });

  return formasPagamento;
}

function parseDataBrasileira(dataStr: string): Date {
  const dataSemTz = dataStr.replace(/-\d{2}:\d{2}$/, '').trim();

  const match = dataSemTz.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, dia, mes, ano, hora, minuto, segundo] = match;
    return new Date(
      parseInt(ano),
      parseInt(mes) - 1,
      parseInt(dia),
      parseInt(hora),
      parseInt(minuto),
      parseInt(segundo)
    );
  }

  return new Date();
}

/**
 * Detects if the HTML response is a SEFAZ IP block page instead of actual NFC-e data.
 */
function isBlockedResponse(html: string): boolean {
  return html.length < 3000 && (
    html.includes('crimes cibernéticos') ||
    html.includes('endereços IP') ||
    html.includes('proteção máxima') ||
    !html.includes('#tabResult') && !html.includes('txtTopo')
  );
}

/**
 * Builds the fetch URL — uses ScraperAPI proxy when SCRAPER_API_KEY is set.
 */
function buildFetchUrl(targetUrl: string): string {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (apiKey) {
    return `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&country_code=br`;
  }
  return targetUrl;
}

/**
 * Faz requisição HTTP e extrai dados da NFC-e.
 * Usa ScraperAPI como proxy quando SCRAPER_API_KEY está configurada.
 */
export async function scrapNFCeFromUrl(url: string): Promise<ScrapingResult> {
  const useProxy = !!process.env.SCRAPER_API_KEY;
  try {
    const fetchUrl = buildFetchUrl(url);
    console.log(`[scraper] Fetching URL${useProxy ? ' (via ScraperAPI)' : ''}: ${url}`);

    const response = await fetch(fetchUrl);

    console.log(`[scraper] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      return {
        sucesso: false,
        erro: `Erro HTTP: ${response.status} - ${response.statusText}`,
      };
    }

    const html = await response.text();
    console.log(`[scraper] HTML length: ${html.length} chars`);

    if (isBlockedResponse(html)) {
      console.log(`[scraper] Blocked by SEFAZ (IP restriction detected)`);
      return {
        sucesso: false,
        erro: 'A SEFAZ bloqueou a requisição (restrição de IP). Configure SCRAPER_API_KEY para usar proxy com IP residencial.',
      };
    }

    const result = await scrapNFCe(html, url);

    if (result.sucesso && result.notaFiscal) {
      const nf = result.notaFiscal;
      console.log(`[scraper] Extraction success:`, {
        estabelecimento: nf.estabelecimento.nome || '(empty)',
        cnpj: nf.estabelecimento.cnpj || '(empty)',
        numero: nf.numero || '(empty)',
        produtos: nf.produtos.length,
        valorAPagar: nf.valorAPagar,
      });
    } else {
      console.log(`[scraper] Extraction failed: ${result.erro}`);
    }

    return result;
  } catch (erro) {
    console.error(`[scraper] Fetch error:`, erro);
    return {
      sucesso: false,
      erro: erro instanceof Error ? erro.message : 'Erro ao fazer requisição',
    };
  }
}
