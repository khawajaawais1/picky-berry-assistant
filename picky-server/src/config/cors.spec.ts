import { DEFAULT_CORS_ORIGINS, parseCorsOrigins } from './cors';

describe('parseCorsOrigins', () => {
  it('falls back to the local console and Expo web origins', () => {
    expect(parseCorsOrigins(undefined)).toEqual([...DEFAULT_CORS_ORIGINS]);
    expect(parseCorsOrigins(undefined)).toContain('http://localhost:5173');
    expect(parseCorsOrigins(undefined)).toContain('http://localhost:8081');
    expect(parseCorsOrigins('   ')).toEqual([...DEFAULT_CORS_ORIGINS]);
  });

  it('trims, normalises and de-duplicates an explicit allow-list', () => {
    expect(
      parseCorsOrigins(
        ' https://admin.example.com , https://admin.example.com/ ,http://localhost:8080 ',
      ),
    ).toEqual(['https://admin.example.com', 'http://localhost:8080']);
  });

  it('accepts an empty explicit list, which closes the API to browsers', () => {
    expect(parseCorsOrigins(',')).toEqual([]);
  });

  it('refuses a wildcard', () => {
    expect(() => parseCorsOrigins('*')).toThrow(/explicit origins/);
    expect(() => parseCorsOrigins('https://admin.example.com,*')).toThrow(
      /explicit origins/,
    );
  });

  it('refuses paths, credentials and non-http schemes', () => {
    expect(() => parseCorsOrigins('https://admin.example.com/console')).toThrow(
      /bare origins/,
    );
    expect(() => parseCorsOrigins('https://user@example.com')).toThrow(
      /bare origins/,
    );
    expect(() => parseCorsOrigins('ftp://admin.example.com')).toThrow(
      /http or https/,
    );
    expect(() => parseCorsOrigins('not an origin')).toThrow(/invalid origin/);
  });
});
