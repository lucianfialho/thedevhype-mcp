import { z } from 'zod';
import { scrapNFCeFromUrl } from '../../scraper';
import type { McpServerDefinition } from '../types';

export const notaFiscalServer: McpServerDefinition = {
  name: 'nota-fiscal',
  description: 'Busca e extrai dados de Notas Fiscais de Consumidor Eletrônicas (NFC-e)',
  category: 'Brazilian Services',
  tools: [
    {
      name: 'buscar_nota_fiscal',
      description: 'Extrai dados de uma NFC-e a partir da URL de consulta (estabelecimento, produtos, valores, pagamentos e informações fiscais)',
    },
  ],
  init: (server) => {
    server.tool(
      'buscar_nota_fiscal',
      'Busca e extrai dados de uma Nota Fiscal de Consumidor Eletrônica (NFC-e) a partir da URL de consulta. Retorna estabelecimento, produtos, valores, formas de pagamento e informações fiscais.',
      { url: z.string().url().describe('URL da página de consulta da NFC-e') },
      async ({ url }) => {
        const resultado = await scrapNFCeFromUrl(url);

        if (!resultado.sucesso || !resultado.notaFiscal) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Erro ao buscar nota fiscal: ${resultado.erro || 'Erro desconhecido'}`,
              },
            ],
          };
        }

        const nf = resultado.notaFiscal;

        const produtosFormatados = nf.produtos
          .map(
            (p, i) =>
              `  ${i + 1}. ${p.nome} (Cód: ${p.codigo})\n     Qtd: ${p.quantidade} ${p.unidade} × R$ ${p.valorUnitario.toFixed(2)} = R$ ${p.valorTotal.toFixed(2)}`
          )
          .join('\n');

        const pagamentosFormatados = nf.formasPagamento
          .map((fp) => `  - ${fp.tipo}: R$ ${fp.valorPago.toFixed(2)}`)
          .join('\n');

        const texto = [
          `# Nota Fiscal Eletrônica - NFC-e`,
          ``,
          `## Estabelecimento`,
          `- **Nome:** ${nf.estabelecimento.nome}`,
          `- **CNPJ:** ${nf.estabelecimento.cnpj}`,
          `- **Endereço:** ${nf.estabelecimento.endereco}`,
          ``,
          `## Informações da Nota`,
          `- **Número:** ${nf.numero}`,
          `- **Série:** ${nf.serie}`,
          `- **Chave de Acesso:** ${nf.chaveAcesso}`,
          `- **Protocolo:** ${nf.protocoloAutorizacao}`,
          `- **Emissão:** ${nf.dataEmissao.toLocaleString('pt-BR')}`,
          nf.dataAutorizacao ? `- **Autorização:** ${nf.dataAutorizacao.toLocaleString('pt-BR')}` : '',
          ``,
          `## Produtos (${nf.quantidadeTotalItens} itens)`,
          produtosFormatados,
          ``,
          `## Totais`,
          `- **Valor dos Produtos:** R$ ${nf.valorTotalProdutos.toFixed(2)}`,
          `- **Descontos:** R$ ${nf.descontos.toFixed(2)}`,
          `- **Valor a Pagar:** R$ ${nf.valorAPagar.toFixed(2)}`,
          `- **Tributos:** R$ ${nf.tributos.toFixed(2)}`,
          ``,
          `## Formas de Pagamento`,
          pagamentosFormatados,
          nf.troco > 0 ? `- **Troco:** R$ ${nf.troco.toFixed(2)}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [{ type: 'text' as const, text: texto }],
        };
      },
    );
  },
};
