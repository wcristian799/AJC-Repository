import { NsBpeClient } from './ns-bpe.client';

describe('NsBpeClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('envia o token somente no corpo seguro esperado pela API NS', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 200, nsNRec: '123' }), { status: 200 }));
    const client = new NsBpeClient({ BPE_NS_TOKEN: 'segredo', BPE_NS_BASE_URL: 'https://bpe.test/v1' } as NodeJS.ProcessEnv);
    await client.issue({ BPe: { infBPe: {} } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ 'X-AUTH-TOKEN': 'segredo', BPe: { infBPe: {} } });
    expect(init?.headers).not.toHaveProperty('X-AUTH-TOKEN');
  });
});
