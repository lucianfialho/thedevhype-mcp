import { describe, it, expect } from 'vitest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getUserId } from '../auth-helpers';

describe('getUserId', () => {
  it('extracts userId from valid extra object', () => {
    const extra = {
      authInfo: { extra: { userId: 'user-123' } },
    };
    expect(getUserId(extra)).toBe('user-123');
  });

  it('throws McpError InvalidRequest when extra is empty', () => {
    expect(() => getUserId({})).toThrow(McpError);
    try {
      getUserId({});
    } catch (err) {
      expect((err as McpError).code).toBe(ErrorCode.InvalidRequest);
      expect((err as McpError).message).toContain('Authentication required');
      expect((err as McpError).message).toContain('onboarding');
    }
  });

  it('throws when authInfo is missing', () => {
    expect(() => getUserId({ something: 'else' })).toThrow(McpError);
  });

  it('throws when authInfo.extra is missing', () => {
    const extra = { authInfo: {} };
    expect(() => getUserId(extra)).toThrow(McpError);
  });

  it('throws when authInfo.extra.userId is undefined', () => {
    const extra = { authInfo: { extra: {} } };
    expect(() => getUserId(extra)).toThrow(McpError);
  });

  it('throws when authInfo.extra.userId is empty string', () => {
    const extra = { authInfo: { extra: { userId: '' } } };
    expect(() => getUserId(extra)).toThrow(McpError);
  });
});
