const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyoDQQhpn-zuKHQ8HSn2awsti3IXaen0kCQinsPCDhjoTbl9BSgF6ZL-8rFGQX5mQzS/exec';
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
