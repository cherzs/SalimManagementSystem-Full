import { supabase } from './supabaseClient';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyoDQQhpn-zuKHQ8HSn2awsti3IXaen0kCQinsPCDhjoTbl9BSgF6ZL-8rFGQX5mQzS/exec';
const SECRET = 'yoyo';

export const sendTaskPushNotification = async ({ taskId, title, description, items }) => {
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, expo_push_token')
    .eq('role', 'employee')
    .neq('expo_push_token', null)
    .neq('expo_push_token', '');

  if (error) {
    console.error('Failed to fetch employees:', error);
    return;
  }

  const validEmployees = employees.filter(
    emp => emp.expo_push_token && emp.expo_push_token.startsWith('ExponentPushToken[')
  );

  if (validEmployees.length === 0) return;

  const messages = validEmployees.map(emp => ({
    to: emp.expo_push_token,
    title: 'Incoming Task Call',
    body: description || 'New task assignment',
    data: JSON.stringify({
      taskId,
      type: 'fake_call',
      taskTitle: title,
      taskDescription: description || '',
      employeeId: emp.id
    }),
    priority: 'high',
    channelId: 'calls',
    sound: 'ringtone',
    _displayInForeground: true
  }));

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'SEND_PUSH_DIRECT',
        data: { messages },
        secret: SECRET
      })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    console.log('Push notification sent via Apps Script:', JSON.stringify(result));
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export const sendTaskEmails = async ({ taskId, title, description, items }) => {
  const { data: employees, error } = await supabase
    .from('employees')
    .select('email')
    .eq('role', 'employee')
    .neq('email', null)
    .neq('email', '');

  if (error || !employees || employees.length === 0) return;

  const emailList = employees.map(emp => emp.email).filter(Boolean);

  if (emailList.length === 0) return;

  const itemsArray = Array.isArray(items) ? items : [];
  const itemsNames = itemsArray.map(item => item.item_name || item.name || item).join(', ');

  const emailContent = `
    <h2>New Task Created</h2>
    <p><strong>Task ID:</strong> ${taskId}</p>
    <p><strong>Title:</strong> ${title}</p>
    <p><strong>Description:</strong> ${description || 'No description provided'}</p>
    <p><strong>Items:</strong> ${itemsNames || 'None'}</p>
    <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
    <p>Please check the task management system for details.</p>
  `;

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'SEND_TASK_EMAIL',
        data: { emailList, subject: `New Task: ${title}`, htmlBody: emailContent },
        secret: SECRET
      })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    console.log('Email sent via Apps Script:', JSON.stringify(result));
  } catch (error) {
    console.error('Failed to send task email:', error);
  }
};
