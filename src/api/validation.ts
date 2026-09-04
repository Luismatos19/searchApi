import { z } from 'zod';

export const novoProdutoSchema = z.object({
  sku: z.string().min(1),
  nome: z.string().min(1),
  descricao: z.string().optional(),
  preco: z.number().positive(),
  categoria: z.string().optional(),
  quantidadeEstoque: z.number().int().nonnegative().optional(),
  ativo: z.boolean().optional(),
});

export const atualizaProdutoSchema = novoProdutoSchema.partial();

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  precoMin: z.coerce.number().optional(),
  precoMax: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
});
