(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GS1Tools = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FNC1 = String.fromCharCode(207);
  const GTIN_LENGTHS = [8, 12, 13, 14];
  const GS1_X = /^[!"%&'()*+,\-./0-9:;<=>?A-Z_a-z]+$/;

  class Gs1ValidationError extends Error {
    constructor(code, details = {}) {
      super(code);
      this.name = 'Gs1ValidationError';
      this.code = code;
      this.details = details;
    }
  }

  function digits(value) {
    return String(value ?? '').replace(/[\s-]+/g, '');
  }

  function calculateCheckDigit(body) {
    const value = digits(body);
    if (!value || !/^\d+$/.test(value)) throw new Gs1ValidationError('digits_only');
    let sum = 0;
    for (let index = value.length - 1, weight = 3; index >= 0; index--, weight = weight === 3 ? 1 : 3) {
      sum += Number(value[index]) * weight;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function normalizeKey(input, targetLength) {
    const value = digits(input);
    if (!/^\d+$/.test(value)) throw new Gs1ValidationError('digits_only');
    if (value.length === targetLength - 1) {
      return { value: value + calculateCheckDigit(value), corrected: true };
    }
    if (value.length !== targetLength) {
      throw new Gs1ValidationError('wrong_length', { expected: [targetLength - 1, targetLength] });
    }
    const expected = calculateCheckDigit(value.slice(0, -1));
    if (value.at(-1) !== expected) throw new Gs1ValidationError('invalid_check_digit', { expected });
    return { value, corrected: false };
  }

  function normalizeGtin(input, targetLength) {
    const length = Number(targetLength);
    if (!GTIN_LENGTHS.includes(length)) throw new Gs1ValidationError('unsupported_gtin');
    return { ...normalizeKey(input, length), type: `GTIN-${length}` };
  }

  function normalizeSscc(input) {
    return { ...normalizeKey(input, 18), type: 'SSCC' };
  }

  function toGtin14(gtin) {
    const value = digits(gtin);
    if (!GTIN_LENGTHS.includes(value.length)) throw new Gs1ValidationError('unsupported_gtin');
    const normalized = normalizeKey(value, value.length).value;
    return normalized.padStart(14, '0');
  }

  function encodeDate(input) {
    const match = String(input ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Gs1ValidationError('invalid_date');
    const [, year, month, day] = match;
    const numericMonth = Number(month);
    const numericDay = Number(day);
    if (numericMonth < 1 || numericMonth > 12 || numericDay < 1 || numericDay > 31) {
      throw new Gs1ValidationError('invalid_date');
    }
    const parsed = new Date(Date.UTC(Number(year), numericMonth - 1, numericDay));
    if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== numericMonth || parsed.getUTCDate() !== numericDay) {
      throw new Gs1ValidationError('invalid_date');
    }
    return `${year.slice(-2)}${month}${day}`;
  }

  function variableValue(value, max, field) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    if (text.length > max) throw new Gs1ValidationError('value_too_long', { field, max });
    if (!GS1_X.test(text)) throw new Gs1ValidationError('invalid_character', { field });
    return text;
  }

  function buildGtin(input, targetLength) {
    const normalized = normalizeGtin(input, targetLength);
    const formats = { 8: 'EAN8', 12: 'UPC', 13: 'EAN13', 14: 'ITF14' };
    return {
      ...normalized,
      format: formats[targetLength],
      encoded: normalized.value,
      hri: normalized.value,
      elements: [{ ai: '01', value: normalized.value.padStart(14, '0') }],
      gs1: false,
    };
  }

  function buildSscc(input) {
    const normalized = normalizeSscc(input);
    return {
      ...normalized,
      format: 'CODE128',
      encoded: `00${normalized.value}`,
      hri: `(00)${normalized.value}`,
      elements: [{ ai: '00', value: normalized.value }],
      gs1: true,
    };
  }

  function buildGs1128({ gtin, expiry = '', batch = '', serial = '' }) {
    const gtin14 = toGtin14(gtin);
    const elements = [{ ai: '01', value: gtin14, variable: false }];
    if (expiry) elements.push({ ai: '17', value: encodeDate(expiry), variable: false });
    const batchValue = variableValue(batch, 20, 'batch');
    const serialValue = variableValue(serial, 20, 'serial');
    if (batchValue) elements.push({ ai: '10', value: batchValue, variable: true });
    if (serialValue) elements.push({ ai: '21', value: serialValue, variable: true });

    let encoded = '';
    elements.forEach((element, index) => {
      encoded += element.ai + element.value;
      if (element.variable && index < elements.length - 1) encoded += FNC1;
    });
    return {
      type: 'GS1-128', format: 'CODE128', encoded,
      hri: elements.map(({ ai, value }) => `(${ai})${value}`).join(''),
      elements, gs1: true, corrected: false,
    };
  }

  return {
    FNC1, GTIN_LENGTHS, Gs1ValidationError, calculateCheckDigit, normalizeGtin,
    normalizeSscc, toGtin14, encodeDate, buildGtin, buildSscc, buildGs1128,
  };
}));
