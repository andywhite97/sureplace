// Keep external links restricted to SurePlace routes; never load a remote page
// with access to the Capacitor bridge.
export function nativeLinkRoute(input: string, publicOrigin: string): string | null {
  try {
    const url = new URL(input);
    if (url.username || url.password) return null;
    let path: string;
    if (url.protocol === 'sureplace:') path = '/' + url.hostname + url.pathname;
    else if (url.protocol === 'https:' && url.origin === new URL(publicOrigin).origin) path = url.pathname;
    else return null;
    if (!/^\/(?:$|properties(?:\/|$)|stays(?:\/|$)|agents(?:\/|$)|agencies(?:\/|$)|account(?:\/|$)|login$|register$|verify-email(?:\/|$)|reset-password$|agency-invitations\/accept$)/.test(path)) return null;
    if (path.includes('\\') || path.includes('//') || /%2f|%5c/i.test(path)) return null;
    return path + url.search + url.hash;
  } catch { return null; }
}
