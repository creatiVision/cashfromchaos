import { extractJson, runHermesJson } from '../hermesCli';
import * as childProcess from 'node:child_process';

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}));

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
});
