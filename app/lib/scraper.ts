import * as cheerio from 'cheerio';
import type { NotaFiscal, Produto, Estabelecimento, FormaPagamento, ScrapingResult } from './types';

/**
 * Extrai dados de uma NFC-e a partir do HTML da página de consulta.
 * Usa cheerio para parsing — mantido para uso em testes unitários.
 * Em produção, use scrapNFCeFromUrl que usa Puppeteer.
 */
export async function scrapNFCe(html: string, urlOrigem?: string): Promise<ScrapingResult> {
  try {
    const $ = cheerio.load(html);

    const estabelecimento = extrairEstabelecimento($);
    const produtos = extrairProdutos($);
    const totalizadores = extrairTotalizadores($);
    const infoNota = extrairInformacoesNota($);
    const formasPagamento = extrairFormasPagamento($);

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
 * Launches a browser instance.
 * Uses @sparticuz/chromium for serverless environments (Vercel/AWS Lambda),
 * falls back to regular puppeteer for local development.
 */
async function launchBrowser() {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({ headless: true });
}

/**
 * Navega até a URL da NFC-e usando Puppeteer, aguarda o reCAPTCHA v3 resolver,
 * e extrai os dados da nota fiscal diretamente do DOM.
 */
export async function scrapNFCeFromUrl(url: string): Promise<ScrapingResult> {
  let browser;
  try {
    console.log(`[scraper] Launching browser (env: ${process.env.VERCEL ? 'vercel' : process.env.AWS_LAMBDA_FUNCTION_NAME ? 'lambda' : 'local'})`);
    browser = await launchBrowser();
    console.log(`[scraper] Browser launched, navigating to: ${url}`);
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    console.log(`[scraper] Page loaded, waiting for #tabResult selector`);
    await page.waitForSelector('#tabResult', { timeout: 30000 });
    console.log(`[scraper] #tabResult found, extracting data`);

    const data = await page.evaluate(() => {
      const text = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? '';

      // Estabelecimento
      const nome = text('.txtTopo#u20');
      const cnpjTexto = document.querySelectorAll('.text')[0]?.textContent?.trim() ?? '';
      const cnpj = cnpjTexto.replace('CNPJ:', '').trim();
      const enderecoCompleto = document.querySelectorAll('.text')[1]?.textContent?.trim() ?? '';
      const partesEndereco = enderecoCompleto.split(',').map(p => p.trim());

      // Produtos
      const produtos = Array.from(document.querySelectorAll('#tabResult tbody tr')).map(tr => {
        const nomeProd = tr.querySelector('.txtTit')?.textContent?.trim() ?? '';

        const codigoTexto = tr.querySelector('.RCod')?.textContent?.trim() ?? '';
        const codigoMatch = codigoTexto.match(/Código:\s*(\d+)/);
        const codigo = codigoMatch ? codigoMatch[1] : '';

        const qtdeTexto = tr.querySelector('.Rqtd')?.textContent?.trim() ?? '';
        const qtdeMatch = qtdeTexto.match(/Qtde\.:([0-9.,]+)/);
        const quantidade = qtdeMatch ? parseFloat(qtdeMatch[1].replace(',', '.')) : 0;

        const unidadeTexto = tr.querySelector('.RUN')?.textContent?.trim() ?? '';
        const unidadeMatch = unidadeTexto.match(/UN:\s*(\w+)/);
        const unidade = unidadeMatch ? unidadeMatch[1] : '';

        const vlUnitTexto = tr.querySelector('.RvlUnit')?.textContent?.trim() ?? '';
        const vlUnitMatch = vlUnitTexto.match(/Vl\. Unit\.:[\s\u00A0]*([0-9.,]+)/);
        const valorUnitario = vlUnitMatch ? parseFloat(vlUnitMatch[1].replace(',', '.')) : 0;

        const valorTotalTexto = tr.querySelector('.valor')?.textContent?.trim() ?? '';
        const valorTotal = parseFloat(valorTotalTexto.replace(',', '.'));

        return { codigo, nome: nomeProd, quantidade, unidade, valorUnitario, valorTotal };
      });

      // Totalizadores
      const linhasTotais = Array.from(document.querySelectorAll('#totalNota #linhaTotal'));
      const findTotal = (label: string) => {
        const linha = linhasTotais.find(el => el.querySelector('label')?.textContent?.includes(label));
        return linha?.querySelector('.totalNumb')?.textContent?.trim() ?? '0';
      };
      const parseBRL = (s: string) => parseFloat(s.replace('.', '').replace(',', '.'));

      const quantidadeTotalItens = parseInt(findTotal('Qtd. total de itens'));
      const valorTotalProdutos = parseBRL(findTotal('Valor total R$'));
      const descontos = parseBRL(findTotal('Descontos R$'));
      const troco = parseFloat(findTotal('Troco').replace(',', '.'));

      const valorAPagar = parseBRL(
        document.querySelector('#totalNota .linhaShade#linhaTotal .totalNumb')?.textContent?.trim() ?? '0'
      );
      const tributos = parseBRL(
        document.querySelector('#totalNota .spcTop#linhaTotal .totalNumb')?.textContent?.trim() ?? '0'
      );

      // Informações da nota
      const infoGeralTexto = document.querySelector('#infos .ui-collapsible-content')?.textContent ?? '';
      const numeroMatch = infoGeralTexto.match(/Número:\s*(\d+)/);
      const serieMatch = infoGeralTexto.match(/Série:\s*(\d+)/);
      const emissaoMatch = infoGeralTexto.match(/Emissão:\s*([\d\/]+\s+[\d:]+)/);
      const protocoloMatch = infoGeralTexto.match(/Protocolo de Autorização:\s*(\d+)/);
      const autorizacaoMatch = infoGeralTexto.match(/(\d{2}\/\d{2}\/\d{4})\s+às\s+(\d{2}:\d{2}:\d{2})/);
      const chaveAcesso = document.querySelector('.chave')?.textContent?.trim().replace(/\s/g, '') ?? '';

      // Formas de pagamento
      const formasPagamento: { tipo: string; valorPago: number }[] = [];
      const linhaForma = document.querySelector('#totalNota #linhaForma');
      if (linhaForma) {
        let sibling = linhaForma.nextElementSibling;
        while (sibling && sibling.id === 'linhaTotal') {
          const label = sibling.querySelector('label.tx')?.textContent?.trim() ?? '';
          if (label.toLowerCase().includes('troco')) break;
          if (label) {
            const valorTexto = sibling.querySelector('.totalNumb')?.textContent?.trim() ?? '0';
            formasPagamento.push({
              tipo: label,
              valorPago: parseFloat(valorTexto.replace('.', '').replace(',', '.')),
            });
          }
          sibling = sibling.nextElementSibling;
        }
      }

      return {
        estabelecimento: {
          nome,
          cnpj,
          endereco: enderecoCompleto,
          logradouro: partesEndereco[0] || undefined,
          numero: partesEndereco[1] || undefined,
          bairro: partesEndereco[3] || undefined,
          cidade: partesEndereco[4] || undefined,
          estado: partesEndereco[5] || undefined,
        },
        produtos,
        quantidadeTotalItens,
        valorTotalProdutos,
        descontos,
        valorAPagar,
        troco,
        tributos,
        infoNota: {
          numero: numeroMatch ? numeroMatch[1] : '',
          serie: serieMatch ? serieMatch[1] : '',
          emissao: emissaoMatch ? emissaoMatch[1] : '',
          protocolo: protocoloMatch ? protocoloMatch[1] : '',
          autorizacaoData: autorizacaoMatch ? `${autorizacaoMatch[1]} ${autorizacaoMatch[2]}` : '',
          chaveAcesso,
        },
        formasPagamento,
      };
    });

    console.log(`[scraper] Extracted: ${data.produtos.length} produtos, estabelecimento="${data.estabelecimento.nome}", nota=${data.infoNota.numero}`);

    const notaFiscal: NotaFiscal = {
      numero: data.infoNota.numero,
      serie: data.infoNota.serie,
      chaveAcesso: data.infoNota.chaveAcesso,
      protocoloAutorizacao: data.infoNota.protocolo,
      dataEmissao: data.infoNota.emissao ? parseDataBrasileira(data.infoNota.emissao) : new Date(),
      dataAutorizacao: data.infoNota.autorizacaoData ? parseDataBrasileira(data.infoNota.autorizacaoData) : undefined,
      estabelecimento: data.estabelecimento as Estabelecimento,
      produtos: data.produtos as Produto[],
      quantidadeTotalItens: data.quantidadeTotalItens,
      valorTotalProdutos: data.valorTotalProdutos,
      descontos: data.descontos,
      valorAPagar: data.valorAPagar,
      tributos: data.tributos,
      formasPagamento: data.formasPagamento as FormaPagamento[],
      troco: data.troco,
      urlOrigem: url,
      dataExtracao: new Date(),
    };

    return {
      sucesso: true,
      notaFiscal,
    };
  } catch (erro) {
    console.error(`[scraper] Error:`, erro instanceof Error ? erro.message : erro);
    return {
      sucesso: false,
      erro: erro instanceof Error ? erro.message : 'Erro ao fazer scraping com Puppeteer',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
