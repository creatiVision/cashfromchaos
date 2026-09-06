import { extractJson, runHermesJson, getValidatedHermesBin, runHermes } from '../hermesCli';
import * as childProcess from 'node:child_process';

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}));

describe('getValidatedHermesBin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns default "hackathon" when HERMES_BIN is unset', () => {
    delete process.env.HERMES_BIN;
    expect(getValidatedHermesBin()).toBe('hackathon');
  });

  it('returns valid custom binary names and paths', () => {
    expect(getValidatedHermesBin('hermes')).toBe('hermes');
    expect(getValidatedHermesBin('hermes-cli_v1.0')).toBe('hermes-cli_v1.0');
    expect(getValidatedHermesBin('/usr/local/bin/hermes')).toBe('/usr/local/bin/hermes');
    expect(getValidatedHermesBin('./bin/hermes')).toBe('./bin/hermes');
  });

  it('rejects empty or whitespace-only inputs', () => {
    expect(() => getValidatedHermesBin('')).toThrow('HERMES_BIN must be a non-empty string');
    expect(() => getValidatedHermesBin('   ')).toThrow('HERMES_BIN must be a non-empty string');
  });

  it('rejects binary names starting with a hyphen (flag injection prevention)', () => {
    expect(() => getValidatedHermesBin('-o')).toThrow('binary name cannot start with a hyphen');
    expect(() => getValidatedHermesBin('--eval')).toThrow('binary name cannot start with a hyphen');
  });

  it('rejects path traversal attempts', () => {
    expect(() => getValidatedHermesBin('../bin/hermes')).toThrow('path traversal ("..") is not allowed');
    expect(() => getValidatedHermesBin('/usr/bin/../bin/hermes')).toThrow('path traversal ("..") is not allowed');
  });

  it('rejects null bytes', () => {
    expect(() => getValidatedHermesBin('hermes\0')).toThrow('contains null byte');
  });

  it('rejects unsafe characters and command injection attempts', () => {
    expect(() => getValidatedHermesBin('hermes; rm -rf /')).toThrow('contains unsafe characters');
    expect(() => getValidatedHermesBin('hermes & calc')).toThrow('contains unsafe characters');
    expect(() => getValidatedHermesBin('hermes | grep foo')).toThrow('contains unsafe characters');
    expect(() => getValidatedHermesBin('hermes $VAR')).toThrow('contains unsafe characters');
    expect(() => getValidatedHermesBin('hermes`id`')).toThrow('contains unsafe characters');
    expect(() => getValidatedHermesBin('hermes command')).toThrow('contains unsafe characters');
  });
});

describe('extractJson', () => {
  it('extracts plain JSON objects', () => {
    const input = '{"name": "test", "value": 123}';
    expect(extractJson(input)).toEqual({ name: 'test', value: 123 });
  });

  it('extracts JSON wrapped in ```json markdown fences', () => {
    const input = 'Here is the output:\n```json\n{"status": "ok", "count": 5}\n```';
    expect(extractJson(input)).toEqual({ status: 'ok', count: 5 });
  });

  it('extracts JSON wrapped in generic ``` markdown fences', () => {
    const input = 'Result:\n```\n{"active": true}\n```';
    expect(extractJson(input)).toEqual({ active: true });
  });

  it('extracts JSON embedded in surrounding prose text', () => {
    const input = 'Sure, here is the JSON you requested: {"id": "12345", "valid": true} Hope this helps!';
    expect(extractJson(input)).toEqual({ id: '12345', valid: true });
  });

  it('handles nested objects and arrays', () => {
    const input = '{"a": {"b": [1, 2, {"c": "d"}]}, "e": true}';
    expect(extractJson(input)).toEqual({ a: { b: [1, 2, { c: 'd' }] }, e: true });
  });

  it('handles strings containing braces and escaped quotes correctly', () => {
    const input = '{"code": "function() { return \\"hello\\"; }", "brace": "}"}';
    expect(extractJson(input)).toEqual({ code: 'function() { return "hello"; }', brace: '}' });
  });

  it('returns undefined if no opening brace is present', () => {
    const input = 'There is no JSON here at all.';
    expect(extractJson(input)).toBeUndefined();
  });

  it('returns undefined for invalid JSON structure inside braces', () => {
    const input = '{"invalid_json": true, missing_quotes: }';
    expect(extractJson(input)).toBeUndefined();
  });

  it('returns undefined for unbalanced braces', () => {
    const input = '{"unbalanced": true';
    expect(extractJson(input)).toBeUndefined();
  });
});

describe('runHermesJson', () => {
  const mockedExecFile = childProcess.execFile as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses valid JSON response from runHermes', async () => {
    mockedExecFile.mockImplementation((file, args, options, callback) => {
      callback(null, '```json\n{"result": "success"}\n```', '');
    });

    const result = await runHermesJson<{ result: string }>('Analyze item');

    expect(result).toEqual({ result: 'success' });
    expect(mockedExecFile).toHaveBeenCalledWith(
      'hackathon',
      [
        '-z',
        'Analyze item\n\nRespond with ONLY a single JSON object. No prose, no markdown fences, no tool use.',
      ],
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('throws an error if runHermes output does not contain parseable JSON', async () => {
    mockedExecFile.mockImplementation((file, args, options, callback) => {
      callback(null, 'Sorry, I failed to generate JSON.', '');
    });

    await expect(runHermesJson('Analyze item')).rejects.toThrow(
      'hermes did not return parseable JSON: Sorry, I failed to generate JSON.'
    );
  });

  it('rejects when HERMES_BIN environment variable is invalid', () => {
    const originalEnv = process.env.HERMES_BIN;
    process.env.HERMES_BIN = 'unsafe_bin; id';
    try {
      expect(() => runHermes('hello')).toThrow('contains unsafe characters');
    } finally {
      process.env.HERMES_BIN = originalEnv;
    }
  });
});
