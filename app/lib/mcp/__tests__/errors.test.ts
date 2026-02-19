import { describe, it, expect } from 'vitest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { toolError, invalidParams, internalError } from '../errors';

describe('toolError', () => {
  it('returns CallToolResult with isError true', () => {
    const result = toolError('Something went wrong.');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });

  it('wraps message in <error> tags', () => {
    const result = toolError('Not found.');
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toBe('<error>Not found.</error>');
  });

  it('includes <recovery> when provided', () => {
    const result = toolError('Not found.', 'Use list_sources to find IDs.');
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toBe(
      '<error>Not found.</error>\n<recovery>Use list_sources to find IDs.</recovery>',
    );
  });

  it('omits <recovery> when not provided', () => {
    const result = toolError('Limit reached.');
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).not.toContain('<recovery>');
  });
});

describe('invalidParams', () => {
  it('throws McpError with InvalidParams code', () => {
    expect(() => invalidParams('Bad input.')).toThrow(McpError);
    try {
      invalidParams('Bad input.');
    } catch (err) {
      expect(err).toBeInstanceOf(McpError);
      expect((err as McpError).code).toBe(ErrorCode.InvalidParams);
      expect((err as McpError).message).toContain('Bad input.');
    }
  });

  it('includes recovery hint in message when provided', () => {
    try {
      invalidParams('Missing field.', 'Provide the "url" parameter.');
    } catch (err) {
      expect((err as McpError).message).toContain('Missing field.');
      expect((err as McpError).message).toContain(
        '<recovery>Provide the "url" parameter.</recovery>',
      );
    }
  });
});

describe('internalError', () => {
  it('throws McpError with InternalError code', () => {
    expect(() => internalError('DB down.')).toThrow(McpError);
    try {
      internalError('DB down.');
    } catch (err) {
      expect(err).toBeInstanceOf(McpError);
      expect((err as McpError).code).toBe(ErrorCode.InternalError);
      expect((err as McpError).message).toContain('DB down.');
    }
  });
});
