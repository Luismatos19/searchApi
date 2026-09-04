import type { Produto } from '../types.js';

export const PRODUTOS_INDEX = 'produtos';

export const produtosIndexMapping = {
  properties: {
    id: { type: 'keyword' },
    sku: { type: 'keyword' },
    nome: { type: 'text' },
    descricao: { type: 'text' },
    preco: { type: 'float' },
    categoria: { type: 'keyword' },
    quantidadeEstoque: { type: 'integer' },
    ativo: { type: 'boolean' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
  },
} as const;

export interface ProdutoDocument {
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

export function produtoToDocument(produto: Produto): ProdutoDocument {
  return { ...produto };
}
