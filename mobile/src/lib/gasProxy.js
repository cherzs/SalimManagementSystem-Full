const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwxe1NXObpn8mkgTaD9Cc0YO-V84D32rvJe0XpEu3jobslvwEa1d9NN928e8OFH_hg/exec';
const SECRET_KEY = 'yoyo';

export const callAppsScriptFunction = async (functionName, payload) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: functionName, 
        data: payload, 
        secret: SECRET_KEY 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.error || 'Apps Script error');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error calling Apps Script:', error);
    throw error;
  }
};
