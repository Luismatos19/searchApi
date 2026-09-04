import { pool } from '../db/pool.js';
import type { Produto, NovoProdutoInput, AtualizaProdutoInput } from '../types.js';

function toProduto(row: any): Produto {
  return {
    id: row.id,
    sku: row.sku,
    nome: row.nome,
    descricao: row.descricao,
    preco: Number(row.preco),
    categoria: row.categoria,
    quantidadeEstoque: row.quantidade_estoque,
    ativo: row.ativo,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createProduto(input: NovoProdutoInput): Promise<Produto> {
  const result = await pool.query(
    `INSERT INTO produtos (sku, nome, descricao, preco, categoria, quantidade_estoque, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.sku,
      input.nome,
      input.descricao ?? null,
      input.preco,
      input.categoria ?? null,
      input.quantidadeEstoque ?? 0,
      input.ativo ?? true,
    ]
  );
  return toProduto(result.rows[0]);
}

export async function findProdutoById(id: string): Promise<Produto | null> {
  const result = await pool.query('SELECT * FROM produtos WHERE id = $1', [id]);
  return result.rows[0] ? toProduto(result.rows[0]) : null;
}

export async function updateProduto(
  id: string,
  input: AtualizaProdutoInput
): Promise<Produto | null> {
  const existing = await findProdutoById(id);
  if (!existing) return null;

  const merged = { ...existing, ...input };
  const result = await pool.query(
    `UPDATE produtos
     SET sku = $1, nome = $2, descricao = $3, preco = $4, categoria = $5,
         quantidade_estoque = $6, ativo = $7, updated_at = now()
     WHERE id = $8
     RETURNING *`,
    [
      merged.sku,
      merged.nome,
      merged.descricao ?? null,
      merged.preco,
      merged.categoria ?? null,
      merged.quantidadeEstoque,
      merged.ativo,
      id,
    ]
  );
  return toProduto(result.rows[0]);
}

export async function deleteProduto(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM produtos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
