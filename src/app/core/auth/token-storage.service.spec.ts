import { TestBed } from '@angular/core/testing';
import { TokenStorage, NATIVE_TOKEN_PLATFORM, SECURE_TOKEN_STORAGE } from './token-storage.service';

const SecureStorage = { getItem: vi.fn<() => Promise<string | null>>(), setItem: vi.fn<(key: string, value: string) => Promise<void>>(), removeItem: vi.fn<() => Promise<void>>() };

const tokens = { access: 'access', refresh: 'refresh' };
const key = 'sureplace.tokens';
const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
};

describe('TokenStorage native sessions', () => {
  let stored: string | null;
  beforeEach(() => {
    stored = null;
    vi.stubGlobal('localStorage', memory());
    vi.stubGlobal('sessionStorage', memory());
    vi.mocked(SecureStorage.getItem).mockImplementation(async () => stored);
    vi.mocked(SecureStorage.setItem).mockImplementation(async (_, value) => { stored = value; });
    vi.mocked(SecureStorage.removeItem).mockImplementation(async () => { stored = null; });
    TestBed.configureTestingModule({ providers: [
      { provide: NATIVE_TOKEN_PLATFORM, useValue: true },
      { provide: SECURE_TOKEN_STORAGE, useValue: SecureStorage },
    ] });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('migrates remembered prototype credentials and removes plaintext copies', async () => {
    localStorage.setItem(key, JSON.stringify(tokens));
    const storage = TestBed.inject(TokenStorage);
    await storage.initialize();
    expect(storage.read()).toEqual(tokens);
    expect(storage.remembered()).toBe(true);
    expect(JSON.parse(stored!)).toEqual(tokens);
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });
  it('restores a remembered session using secure storage', async () => {
    stored = JSON.stringify(tokens);
    const storage = TestBed.inject(TokenStorage);
    await storage.initialize();
    expect(storage.read()).toEqual(tokens);
    expect(storage.remembered()).toBe(true);
  });
  it('keeps non-remembered sessions in memory only', async () => {
    const storage = TestBed.inject(TokenStorage);
    await storage.initialize();
    await storage.write(tokens);
    expect(storage.read()).toEqual(tokens);
    expect(stored).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(storage.remembered()).toBe(false);
  });
  it('orders token rotation before logout so a late write cannot restore it', async () => {
    const storage = TestBed.inject(TokenStorage);
    await storage.initialize();
    const write = storage.write(tokens, true);
    const clear = storage.clear();
    expect(storage.read()).toBeNull();
    await Promise.all([write, clear]);
    expect(stored).toBeNull();
    expect(storage.read()).toBeNull();
  });
  it('leaves a logout marker if secure deletion fails and blocks restoration', async () => {
    stored = JSON.stringify(tokens);
    const storage = TestBed.inject(TokenStorage);
    await storage.initialize();
    vi.mocked(SecureStorage.removeItem).mockRejectedValue(new Error('locked'));
    await expect(storage.clear()).rejects.toThrow();
    expect(storage.read()).toBeNull();
    expect(localStorage.getItem('sureplace.logout-pending')).toBe('1');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      { provide: NATIVE_TOKEN_PLATFORM, useValue: true },
      { provide: SECURE_TOKEN_STORAGE, useValue: SecureStorage },
    ] });
    const restarted = TestBed.inject(TokenStorage);
    await expect(restarted.initialize()).rejects.toThrow();
    expect(restarted.read()).toBeNull();
  });
  it('does not retain a cached authenticated session after a secure-write failure', async () => {
    const storage = TestBed.inject(TokenStorage);
    await storage.initialize();
    vi.mocked(SecureStorage.setItem).mockRejectedValueOnce(new Error('locked'));
    await expect(storage.write(tokens, true)).rejects.toThrow();
    expect(storage.read()).toBeNull();
    expect(localStorage.getItem('sureplace.logout-pending')).toBe('1');
  });
  it('rejects malformed secure credentials', async () => {
    stored = '{"access":42}';
    const storage = TestBed.inject(TokenStorage);
    await storage.initialize();
    expect(storage.read()).toBeNull();
  });
  it('preserves existing browser remember-me behavior', () => {
    TestBed.overrideProvider(NATIVE_TOKEN_PLATFORM, { useValue: false });
    const storage = TestBed.inject(TokenStorage);
    storage.write(tokens, true);
    expect(localStorage.getItem(key)).toBe(JSON.stringify(tokens));
    expect(storage.read()).toEqual(tokens);
    storage.clear();
    expect(storage.read()).toBeNull();
  });
  it('does not expose the native proxy as an Angular lifecycle object', () => {
    TestBed.resetTestingModule();
    const adapter = TestBed.inject(SECURE_TOKEN_STORAGE);
    expect((adapter as unknown as { ngOnDestroy?: unknown }).ngOnDestroy).toBeUndefined();
  });
});
