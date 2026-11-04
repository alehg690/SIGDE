import assert from 'node:assert/strict';
import test from 'node:test';
import { esMutacionSitioCruzado } from './request-origin.ts';

function request({ method = 'POST', url = 'http://127.0.0.1:3000/api/auth', headers = {} } = {}) {
  return {
    method,
    headers: new Headers(headers),
    nextUrl: new URL(url),
  };
}

test('acepta el mismo origen indicado por el navegador detrás del proxy', () => {
  assert.equal(esMutacionSitioCruzado(request({
    headers: {
      origin: 'https://sigde.example.com',
      'sec-fetch-site': 'same-origin',
    },
  })), false);
});

test('rechaza solicitudes que el navegador identifica como cross-site', () => {
  assert.equal(esMutacionSitioCruzado(request({
    headers: {
      origin: 'https://malicioso.example',
      'sec-fetch-site': 'cross-site',
    },
  })), true);
});

test('usa host y protocolo reenviados cuando no hay Fetch Metadata', () => {
  assert.equal(esMutacionSitioCruzado(request({
    headers: {
      origin: 'https://sigde.example.com',
      'x-forwarded-host': 'sigde.example.com',
      'x-forwarded-proto': 'https',
    },
  })), false);
  assert.equal(esMutacionSitioCruzado(request({
    headers: {
      origin: 'https://malicioso.example',
      'x-forwarded-host': 'sigde.example.com',
      'x-forwarded-proto': 'https',
    },
  })), true);
});

test('no bloquea métodos seguros', () => {
  assert.equal(esMutacionSitioCruzado(request({
    method: 'GET',
    headers: { 'sec-fetch-site': 'cross-site' },
  })), false);
});
