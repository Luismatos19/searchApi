import { describe, it, expect } from 'vitest';
import { novoProdutoSchema, atualizaProdutoSchema, searchQuerySchema } from '../../src/api/validation.js';

describe('novoProdutoSchema', () => {
  it('accepts a valid payload', () => {
    const result = novoProdutoSchema.safeParse({ sku: 'SKU-1', nome: 'Caneta', preco: 2.5 });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing required fields', () => {
    const result = novoProdutoSchema.safeParse({ nome: 'Caneta' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive preco', () => {
    const result = novoProdutoSchema.safeParse({ sku: 'SKU-1', nome: 'Caneta', preco: 0 });
    expect(result.success).toBe(false);
  });
});

describe('atualizaProdutoSchema', () => {
  it('accepts a partial payload', () => {
    const result = atualizaProdutoSchema.safeParse({ preco: 9.99 });
    expect(result.success).toBe(true);
  });

  it('accepts an empty payload', () => {
    const result = atualizaProdutoSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('searchQuerySchema', () => {
  it('defaults page and size', () => {
    const result = searchQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.size).toBe(20);
  });

  it('coerces numeric query params', () => {
    const result = searchQuerySchema.parse({ precoMin: '10', precoMax: '50', page: '2', size: '5' });
    expect(result).toMatchObject({ precoMin: 10, precoMax: 50, page: 2, size: 5 });
  });
});
