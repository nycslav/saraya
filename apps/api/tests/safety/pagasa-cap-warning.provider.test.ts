import {
  PagasaCapWarningProvider,
  WarningProviderUnavailableError,
  normalizePagasaCapAlert,
} from '../../src/integrations/warnings';

const capAlert = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>PAGASA-TEST-1</identifier>
  <sender>pagasa.dost.gov.ph</sender>
  <sent>2026-09-29T01:00:00+00:00</sent>
  <status>Actual</status><msgType>Alert</msgType><scope>Public</scope>
  <info>
    <language>en-PH</language><category>Met</category><event>Heavy Rainfall Warning</event>
    <severity>Severe</severity><effective>2026-09-29T01:00:00+00:00</effective>
    <expires>2026-09-29T04:00:00+00:00</expires><senderName>DOST-PAGASA</senderName>
    <headline>Heavy rainfall warning</headline><description>Heavy rainfall is affecting the test area.</description>
    <instruction>Follow official evacuation guidance.</instruction>
    <area><areaDesc>Bicol Region</areaDesc>
      <geocode><valueName>PH_REGION</valueName><value>Bicol Region</value></geocode>
      <polygon>13.0,123.0 14.0,123.0 14.0,124.0 13.0,124.0</polygon>
    </area>
  </info>
</alert>`;

describe('PagasaCapWarningProvider', () => {
  it('validates and normalizes an official CAP alert including provenance and geography', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(capAlert, { status: 200 }));
    const provider = new PagasaCapWarningProvider(
      'https://publicalert.pagasa.dost.gov.ph/feeds/', 5_000, fetcher,
    );

    await expect(provider.getActiveWarnings()).resolves.toEqual([
      expect.objectContaining({
        id: 'pagasa-cap:PAGASA-TEST-1',
        severity: 'red',
        affectedRegions: ['Bicol Region'],
        affectedArea: expect.objectContaining({ type: 'MultiPolygon' }),
        source: expect.objectContaining({ provider: 'pagasa-cap', isDemo: false }),
      }),
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'https://publicalert.pagasa.dost.gov.ph/feeds/',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('rejects malformed upstream XML as unavailable', async () => {
    const provider = new PagasaCapWarningProvider(
      'https://publicalert.pagasa.dost.gov.ph/feeds/',
      5_000,
      jest.fn().mockResolvedValue(new Response('<alert>', { status: 200 })),
    );
    await expect(provider.getActiveWarnings()).rejects.toBeInstanceOf(WarningProviderUnavailableError);
  });

  it('ignores CAP test messages instead of exposing them as live warnings', () => {
    expect(normalizePagasaCapAlert({
      identifier: 'test', sender: 'pagasa', sent: '2026-09-29T01:00:00Z',
      status: 'Test', msgType: 'Alert', scope: 'Public',
      info: {
        event: 'Test', severity: 'Minor', description: 'Test only.',
        area: { areaDesc: 'Bicol Region' },
      },
    })).toBeNull();
  });
});
