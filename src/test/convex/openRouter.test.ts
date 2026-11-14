import { describe, expect, it, vi } from 'vitest';
import { OpenRouterConfigError, completeWithFallback, extractJson } from '../../../convex/lib/openRouter';

const reply = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

describe('extractJson', () => {
  it('pulls JSON out of surrounding prose', () => {
    expect(extractJson('Here you go: [{"a":1}] thanks', 'array')).toEqual([{ a: 1 }]);
    expect(extractJson('```json\n{"ok":true}\n```', 'object')).toEqual({ ok: true });
  });

  it('returns null for missing or invalid JSON', () => {
    expect(extractJson('no json here', 'array')).toBeNull();
    expect(extractJson('[not, json]', 'array')).toBeNull();
  });
});

describe('completeWithFallback', () => {
  it('requires an API key', async () => {
    await expect(completeWithFallback('hi', () => 1, { apiKey: '' })).rejects.toBeInstanceOf(
      OpenRouterConfigError,
    );
  });

  it('falls through failing and unparseable models until one succeeds', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('boom', { status: 500, statusText: 'Server Error' }))
      .mockResolvedValueOnce(reply('sorry, I cannot help'))
      .mockResolvedValueOnce(reply('[{"item":"Onion"}]'));

    const result = await completeWithFallback('prompt', (c) => extractJson(c, 'array'), {
      apiKey: 'key',
      models: ['a', 'b', 'c'],
      fetchImpl,
    });

    expect(result).toEqual([{ item: 'Onion' }]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const [, init] = fetchImpl.mock.calls[2];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer key');
    expect(JSON.parse(String(init?.body)).model).toBe('c');
  });

  it('throws after every model fails', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      completeWithFallback('p', () => 1, { apiKey: 'key', models: ['a', 'b'], fetchImpl }),
    ).rejects.toThrow('AI request failed: offline');
  });
});
