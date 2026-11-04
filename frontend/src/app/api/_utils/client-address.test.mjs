import assert from 'node:assert/strict';
import test from 'node:test';
import { obtenerIdentificadorCliente, obtenerIpCliente } from './client-address.ts';

function request(headers) {
  return { headers: new Headers(headers) };
}

test('usa los encabezados confiables de Hostinger en producción', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProvider = process.env.HOSTING_PROVIDER;
  process.env.NODE_ENV = 'production';
  process.env.HOSTING_PROVIDER = 'hostinger';

  try {
    assert.equal(obtenerIpCliente(request({
      'x-real-ip': '203.0.113.20',
      'x-forwarded-for': '198.51.100.10, 203.0.113.20',
    })), '203.0.113.20');
    assert.equal(obtenerIpCliente(request({
      'x-forwarded-for': '198.51.100.10, 203.0.113.21',
    })), '203.0.113.21');
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousProvider === undefined) delete process.env.HOSTING_PROVIDER;
    else process.env.HOSTING_PROVIDER = previousProvider;
  }
});

test('no confía en encabezados genéricos sin proveedor en producción', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProvider = process.env.HOSTING_PROVIDER;
  process.env.NODE_ENV = 'production';
  delete process.env.HOSTING_PROVIDER;

  try {
    const input = request({ 'x-forwarded-for': '198.51.100.22', 'user-agent': 'test-agent' });
    assert.equal(obtenerIpCliente(input), null);
    assert.equal(obtenerIdentificadorCliente(input), 'sin-ip:test-agent');
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousProvider === undefined) delete process.env.HOSTING_PROVIDER;
    else process.env.HOSTING_PROVIDER = previousProvider;
  }
});
