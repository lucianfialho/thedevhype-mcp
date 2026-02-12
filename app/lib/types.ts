export interface Produto {
  codigo: string;
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface Estabelecimento {
  nome: string;
  cnpj: string;
  endereco: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export interface FormaPagamento {
  tipo: string;
  valorPago: number;
}

export interface NotaFiscal {
  numero: string;
  serie: string;
  chaveAcesso: string;
  protocoloAutorizacao: string;
  dataEmissao: Date;
  dataAutorizacao?: Date;
  estabelecimento: Estabelecimento;
  produtos: Produto[];
  quantidadeTotalItens: number;
  valorTotalProdutos: number;
  descontos: number;
  valorAPagar: number;
  tributos: number;
  formasPagamento: FormaPagamento[];
  troco: number;
  urlOrigem?: string;
  dataExtracao: Date;
}

export interface ScrapingResult {
  sucesso: boolean;
  notaFiscal?: NotaFiscal;
  erro?: string;
}
