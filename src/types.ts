export interface Produto {
  id: string;
  sku: string;
  nome: string;
  descricao: string | null;
  preco: number;
  categoria: string | null;
  quantidadeEstoque: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NovoProdutoInput {
  sku: string;
  nome: string;
  descricao?: string;
  preco: number;
  categoria?: string;
  quantidadeEstoque?: number;
  ativo?: boolean;
}

export type AtualizaProdutoInput = Partial<NovoProdutoInput>;
