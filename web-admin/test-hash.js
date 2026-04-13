// Test hash PIN di browser console
// Jalankan ini di console browser (http://localhost:3000)

const testHashPin = async (pin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
};

// Test hash untuk '9999'
console.log('Hash 9999:', await testHashPin('9999'));

// Test hash untuk '1234'
console.log('Hash 1234:', await testHashPin('1234'));

// Update database dengan hash ini:
// UPDATE employees SET pin_hash = 'HASH_YANG_MUNCUL_DISINI' WHERE id = 'EMP00001';
