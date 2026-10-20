import { nativeLinkRoute } from './native-links';
const origin = 'https://sureplace.twinpeaksinvestment.com';
describe('Native links', () => {
  it('preserves listing, verification and reset routes with query parameters', () => {
    expect(nativeLinkRoute(origin + '/properties/home?town=Mbabane', origin)).toBe('/properties/home?town=Mbabane');
    expect(nativeLinkRoute('sureplace://reset-password?token=example', origin)).toBe('/reset-password?token=example');
    expect(nativeLinkRoute('sureplace://account/messages/thread', origin)).toBe('/account/messages/thread');
  });
  it.each(['https://evil.example/account', 'https://sureplace.twinpeaksinvestment.com.evil.example/account', 'javascript:alert(1)', 'sureplace://staff/users', 'sureplace://properties/%2f%2fevil.example', 'https://name:password@sureplace.twinpeaksinvestment.com/account'])('rejects untrusted or unsupported link %s', (url) => {
    expect(nativeLinkRoute(url, origin)).toBeNull();
  });
});
