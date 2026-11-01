import { describe, expect, it } from 'vitest';
import {
  canOpenExternally,
  isAllowedInApp,
  isGoogleSignIn,
  isPassiveSignIn,
} from '../src/shared/navigation';

describe('isAllowedInApp', () => {
  it.each([
    'https://www.youtube.com/watch?v=abc',
    'https://youtube.com/',
    'https://m.youtube.com/',
    'https://accounts.youtube.com/accounts/SetSID',
    'https://youtu.be/abc',
    'https://consent.google.com/',
  ])('permite %s', (url) => {
    expect(isAllowedInApp(url)).toBe(true);
  });

  it.each([
    'http://www.youtube.com/',
    'https://www.google.com/',
    'https://accounts.google.com/signin',
    'https://example.com/',
    'https://youtube.com.example.com/',
    'https://notyoutube.com/',
    'https://accounts.google.com.example.com/',
    'file:///C:/Windows/win.ini',
    'no es una url',
  ])('rechaza %s', (url) => {
    expect(isAllowedInApp(url)).toBe(false);
  });
});

describe('inicio de sesión de Google', () => {
  it('distingue el pedido del usuario de la comprobación automática', () => {
    const requested = 'https://accounts.google.com/ServiceLogin?service=youtube';
    const passive = 'https://accounts.google.com/ServiceLogin?service=youtube&passive=true';

    expect(isGoogleSignIn(requested)).toBe(true);
    expect(isPassiveSignIn(requested)).toBe(false);
    expect(isGoogleSignIn(passive)).toBe(true);
    expect(isPassiveSignIn(passive)).toBe(true);
  });

  it('no confunde otros sitios con el de Google', () => {
    expect(isGoogleSignIn('https://accounts.google.com.example.com/')).toBe(false);
    expect(isPassiveSignIn('https://example.com/?passive=true')).toBe(false);
  });
});

describe('canOpenExternally', () => {
  it('solo acepta enlaces web', () => {
    expect(canOpenExternally('https://example.com/')).toBe(true);
    expect(canOpenExternally('http://example.com/')).toBe(true);
    expect(canOpenExternally('file:///C:/Windows/win.ini')).toBe(false);
    expect(canOpenExternally('ms-settings:privacy')).toBe(false);
    expect(canOpenExternally('no es una url')).toBe(false);
  });
});
