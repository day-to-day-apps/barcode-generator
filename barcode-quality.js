(function () {
  'use strict';

  function parseHex(value) {
    const hex = String(value || '').trim().replace(/^#/, '');
    const normalized = hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
    return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  }

  function luminance(value) {
    const rgb = parseHex(value);
    if (!rgb) return null;
    const linear = rgb.map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }

  function assessContrast(foreground, background, minimumRatio = 4.5) {
    if (background === 'transparent' || background === 'none') {
      return { valid: true, ratio: null, transparent: true };
    }
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    if (foregroundLuminance === null || backgroundLuminance === null) {
      return { valid: false, ratio: 0, transparent: false };
    }
    const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
      / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    return {
      valid: foregroundLuminance < backgroundLuminance && ratio >= minimumRatio,
      ratio,
      transparent: false,
    };
  }

  window.BarcodeQuality = Object.freeze({ assessContrast });
}());
