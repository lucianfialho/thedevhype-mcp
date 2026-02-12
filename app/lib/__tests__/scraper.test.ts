import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { scrapNFCe } from '../scraper';

const sampleHtml = readFileSync(
  join(__dirname, 'fixtures/nfce-sample.html'),
  'utf-8',
);

describe('scrapNFCe', () => {
  it('should return sucesso: true for valid HTML', async () => {
    const result = await scrapNFCe(sampleHtml, 'https://example.com/nfce');
    expect(result.sucesso).toBe(true);
    expect(result.notaFiscal).toBeDefined();
  });

  it('should extract estabelecimento data', async () => {
    const result = await scrapNFCe(sampleHtml);
    const est = result.notaFiscal!.estabelecimento;

    expect(est.nome).toBe('SUPERMERCADO TESTE LTDA');
    expect(est.cnpj).toBe('12.345.678/0001-99');
    expect(est.endereco).toContain('Rua das Flores');
  });

  it('should extract produtos', async () => {
    const result = await scrapNFCe(sampleHtml);
    const produtos = result.notaFiscal!.produtos;

    expect(produtos).toHaveLength(2);

    expect(produtos[0].nome).toBe('ARROZ BRANCO 5KG');
    expect(produtos[0].codigo).toBe('7891234');
    expect(produtos[0].quantidade).toBe(2);
    expect(produtos[0].unidade).toBe('UN');
    expect(produtos[0].valorUnitario).toBe(22.9);
    expect(produtos[0].valorTotal).toBe(45.8);

    expect(produtos[1].nome).toBe('FEIJAO PRETO 1KG');
    expect(produtos[1].codigo).toBe('7895678');
    expect(produtos[1].quantidade).toBe(3);
    expect(produtos[1].valorUnitario).toBe(8.5);
    expect(produtos[1].valorTotal).toBe(25.5);
  });

  it('should extract totalizadores', async () => {
    const result = await scrapNFCe(sampleHtml);
    const nf = result.notaFiscal!;

    expect(nf.quantidadeTotalItens).toBe(5);
    expect(nf.valorTotalProdutos).toBe(71.3);
    expect(nf.descontos).toBe(0);
    expect(nf.valorAPagar).toBe(71.3);
    expect(nf.tributos).toBe(12.5);
  });

  it('should extract informacoes da nota', async () => {
    const result = await scrapNFCe(sampleHtml);
    const nf = result.notaFiscal!;

    expect(nf.numero).toBe('001234');
    expect(nf.serie).toBe('001');
    expect(nf.protocoloAutorizacao).toBe('135260000111222');
    expect(nf.chaveAcesso).toBe('35260212345678000199650010000012341000135678');
  });

  it('should extract formas de pagamento', async () => {
    const result = await scrapNFCe(sampleHtml);
    const pagamentos = result.notaFiscal!.formasPagamento;

    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0].tipo).toBe('Cartão de Débito');
    expect(pagamentos[0].valorPago).toBe(71.3);
  });

  it('should include urlOrigem when provided', async () => {
    const url = 'https://nfce.fazenda.gov.br/consulta/123';
    const result = await scrapNFCe(sampleHtml, url);

    expect(result.notaFiscal!.urlOrigem).toBe(url);
  });

  it('should include dataExtracao', async () => {
    const before = new Date();
    const result = await scrapNFCe(sampleHtml);
    const after = new Date();

    expect(result.notaFiscal!.dataExtracao.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.notaFiscal!.dataExtracao.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle empty HTML gracefully', async () => {
    const result = await scrapNFCe('<html><body></body></html>');
    expect(result.sucesso).toBe(true);
    expect(result.notaFiscal!.produtos).toHaveLength(0);
  });
});
