// Test hash PIN dengan crypto-js
// Jalankan di Node.js: node test-hash-crypto.js

const CryptoJS = require('crypto-js');

const hashPin = (pin) => {
  const hash = CryptoJS.SHA256(pin);
  return hash.toString(CryptoJS.enc.Base64);
};

// Test hash untuk '1234'
console.log('Hash 1234:', hashPin('1234'));

// Test hash untuk '9999'
console.log('Hash 9999:', hashPin('9999'));

// Test hash untuk 'yoyo' (secret key lama)
console.log('Hash yoyo:', hashPin('yoyo'));
