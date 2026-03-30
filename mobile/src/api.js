import { supabase } from './lib/supabaseClient';
import { callAppsScriptFunction } from './lib/gasProxy';
import CryptoJS from 'crypto-js';

const hashPin = async (pin) => {
  const hash = CryptoJS.SHA256(pin);
  return hash.toString(CryptoJS.enc.Base64);
};

export const login = async (name, pin) => {
  const pinHash = await hashPin(pin);
  
  console.log('Login attempt:', { name });

  // Use ILIKE for case-insensitive search
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role')
    .ilike('name', `%${name.trim()}%`)
    .eq('pin_hash', pinHash)
    .single();

  console.log('Supabase response:', { data, error: !!error });

  if (error || !data) {
    console.error('Login failed:', { error, data });
    throw new Error('Invalid name or PIN');
  }

  await supabase
    .from('employees')
    .update({ last_login: new Date().toISOString() })
    .eq('id', data.id);

  return data;
};

export const getItems = async () => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const deductItem = async ({ employeeId, employeeName, items }) => {
  const itemsJson = JSON.stringify(items);

  console.log('Deduct item request:', {
    employeeId,
    employeeName,
    items,
    itemsJson
  });

  const { data, error } = await supabase.rpc('deduct_item_and_log', {
    p_employee_id: employeeId,
    p_employee_name: employeeName,
    p_items: itemsJson
  });

  console.log('Deduct item response:', { data, error });

  if (error) {
    console.error('Deduct item error:', error);
    throw error;
  }

  if (data?.low_stock_alerts && data.low_stock_alerts.length > 0) {
    try {
      await callAppsScriptFunction('SEND_LOW_STOCK_ALERT', {
        alerts: data.low_stock_alerts,
        recipients: data.admin_emails
      });
    } catch (notifError) {
      console.error('Gagal mengirim low stock alert:', notifError);
    }
  }

  return data;
};

export const getHistory = async (params = {}) => {
  const { employeeId, limit = 50, startDate, endDate } = params;
  
  let query = supabase
    .from('history')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  if (startDate && endDate) {
    query = query.gte('timestamp', startDate).lte('timestamp', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getTasks = async (params = {}) => {
  const { employeeId } = params;
  
  let query = supabase
    .from('tasks')
    .select('*')
    .order('assigned_at', { ascending: false });

  if (!employeeId) {
    query = query.neq('status', 'completed');
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(task => {
    let taskItems = [];
    try {
      taskItems = JSON.parse(task.items || '[]');
    } catch (e) {
      taskItems = [];
    }

    const parseCsv = (field) => {
      const raw = task[field] || '';
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    };

    return {
      ...task,
      items: taskItems,
      items_count: taskItems.length,
      read_by_list: parseCsv('read_by'),
      read_by_count: parseCsv('read_by').length,
      checked_by_list: parseCsv('checked_by'),
      checked_by_count: parseCsv('checked_by').length,
      done_by_list: parseCsv('done_by'),
      done_by_count: parseCsv('done_by').length
    };
  });
};

export const updateTaskReadStatus = async (taskId, employeeId) => {
  const { data: task } = await supabase
    .from('tasks')
    .select('read_by')
    .eq('task_id', taskId)
    .single();

  if (!task) throw new Error('Task not found');

  const readByList = (task.read_by || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!readByList.includes(employeeId)) {
    const updatedReadBy = readByList.length > 0 ? `${task.read_by},${employeeId}` : employeeId;
    return supabase
      .from('tasks')
      .update({ read_by: updatedReadBy })
      .eq('task_id', taskId);
  }
};

export const updateTaskCheckStatus = async (taskId, employeeId) => {
  const { data: task } = await supabase
    .from('tasks')
    .select('checked_by')
    .eq('task_id', taskId)
    .single();

  if (!task) throw new Error('Task not found');

  const checkedByList = (task.checked_by || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!checkedByList.includes(employeeId)) {
    const updatedCheckedBy = checkedByList.length > 0 ? `${task.checked_by},${employeeId}` : employeeId;
    return supabase
      .from('tasks')
      .update({ checked_by: updatedCheckedBy })
      .eq('task_id', taskId);
  }
};

export const updateTaskDoneStatus = async (taskId, employeeId) => {
  const { data: task } = await supabase
    .from('tasks')
    .select('done_by')
    .eq('task_id', taskId)
    .single();

  if (!task) throw new Error('Task not found');

  const doneByList = (task.done_by || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!doneByList.includes(employeeId)) {
    const updatedDoneBy = doneByList.length > 0 ? `${task.done_by},${employeeId}` : employeeId;
    return supabase
      .from('tasks')
      .update({ done_by: updatedDoneBy })
      .eq('task_id', taskId);
  }
};

export const registerPushToken = async (employeeId, token) => {
  return supabase
    .from('employees')
    .update({ expo_push_token: token })
    .eq('id', employeeId);
};
