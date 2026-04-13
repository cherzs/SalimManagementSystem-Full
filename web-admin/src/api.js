import { supabase } from './lib/supabaseClient';
import { callAppsScriptFunction } from './lib/gasProxy';

const hashPin = async (pin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
};

export const login = async (email, password) => {
  const pinHash = await hashPin(password);
  
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, email')
    .eq('email', email.toLowerCase().trim())
    .eq('pin_hash', pinHash)
    .eq('role', 'admin')
    .single();

  if (error || !data) throw new Error('Invalid email or password');

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
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const searchItems = async (query) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
    .order('name');
  if (error) throw error;
  return data || [];
};

export const addItem = async (itemData) => {
  const { data: lastItem } = await supabase
    .from('items')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  const lastIdNum = lastItem?.id ? parseInt(lastItem.id.replace('ITM', '')) : 0;
  const newId = `ITM${String(lastIdNum + 1).padStart(5, '0')}`;

  const newItem = {
    id: newId,
    name: itemData.name,
    category: itemData.category || null,
    stock: parseInt(itemData.stock) || 0,
    min_stock: parseInt(itemData.min_stock) || 1,
    barcode: itemData.barcode || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return supabase.from('items').insert([newItem]).select().single();
};

export const updateItem = async (itemData) => {
  const { id, ...otherData } = itemData;

  const updateData = {
    ...otherData,
    updated_at: new Date().toISOString()
  };

  // Ensure numeric values
  if (otherData.stock !== undefined) {
    updateData.stock = parseInt(otherData.stock) || 0;
  }
  if (otherData.min_stock !== undefined) {
    updateData.min_stock = parseInt(otherData.min_stock) || 1;
  }

  return supabase
    .from('items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
};

export const deleteItem = (id) =>
  supabase.from('items').delete().eq('id', id);

export const getEmployees = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, email, last_login')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addEmployee = async ({ name, pin, role = 'employee', email }) => {
  const { data: lastEmployee } = await supabase
    .from('employees')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  const lastIdNum = lastEmployee?.id ? parseInt(lastEmployee.id.replace('EMP', '')) : 0;
  const newId = `EMP${String(lastIdNum + 1).padStart(5, '0')}`;

  const pinHash = await hashPin(pin);

  const newEmployee = {
    id: newId,
    name,
    pin_hash: pinHash,
    role,
    email: email || null,
    created_at: new Date().toISOString()
  };

  return supabase.from('employees').insert([newEmployee]).select().single();
};

export const updateEmployee = async (employeeData) => {
  const { id, password, pin, ...otherData } = employeeData;
  
  const updateData = { ...otherData };

  // Handle either 'password' or 'pin' field
  const pinValue = password || pin;
  if (pinValue) {
    updateData.pin_hash = await hashPin(pinValue);
  }

  return supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
};

export const deleteEmployee = (id) =>
  supabase.from('employees').delete().eq('id', id);

export const getHistory = async ({ employeeId, limit = 50, startDate, endDate }) => {
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

export const updateHistory = ({ id, qty, action }) => {
  const updateData = {};
  if (qty !== undefined) updateData.qty = qty;
  if (action) updateData.action = action;

  return supabase.from('history').update(updateData).eq('id', id);
};

export const deleteHistory = (id) =>
  supabase.from('history').delete().eq('id', id);

export const addTask = async (taskData) => {
  // Get last task ID safely (handle empty table)
  const { data: lastTaskData } = await supabase
    .from('tasks')
    .select('task_id')
    .order('task_id', { ascending: false })
    .limit(1);

  const lastIdNum = lastTaskData?.[0]?.task_id ? parseInt(lastTaskData[0].task_id.replace('TASK', '')) : 0;
  const newId = `TASK${String(lastIdNum + 1).padStart(5, '0')}`;

  const newTask = {
    task_id: newId,
    title: taskData.title,
    description: taskData.description || '',
    items: taskData.items || [],
    status: 'assigned',
    assigned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    read_by: '',
    checked_by: '',
    done_by: ''
  };

  const { data: insertedTask, error: dbError } = await supabase
    .from('tasks')
    .insert([newTask])
    .select()
    .single();

  if (dbError) throw dbError;

  try {
    await callAppsScriptFunction('SEND_TASK_NOTIFICATION', {
      taskId: newId,
      title: taskData.title,
      description: taskData.description || '',
      items: taskData.items || []
    });
  } catch (notifError) {
    console.error('Gagal mengirim notifikasi, tetapi task sudah tersimpan:', notifError);
  }

  return insertedTask;
};

export const getTasks = async (employeeId) => {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('assigned_at', { ascending: false });

  if (!employeeId || employeeId === 'all') {
    query = query.neq('status', 'completed');
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(task => {
    let taskItems = [];
    try { taskItems = JSON.parse(task.items || '[]'); } catch { taskItems = []; }

    const parseCsv = (field) => {
      const raw = task[field] || '';
      const list = raw.split(',').map(s => s.trim()).filter(Boolean);
      return list;
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
      done_by_count: parseCsv('done_by').length,
    };
  });
};

export const updateTask = async (taskData) => {
  const { task_id, title, description, items, status } = taskData;

  const updateData = {
    title,
    description,
    items: items || [],
    updated_at: new Date().toISOString()
  };

  if (status) {
    updateData.status = status;
  }

  const { data: updatedTask, error: dbError } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('task_id', task_id)
    .select()
    .single();

  if (dbError) throw dbError;

  try {
    await callAppsScriptFunction('SEND_TASK_NOTIFICATION', {
      taskId: task_id,
      title,
      description,
      items: items || []
    });
  } catch (notifError) {
    console.error('Gagal mengirim notifikasi update:', notifError);
  }

  return updatedTask;
};

export const deleteTask = (taskId) =>
  supabase.from('tasks').delete().eq('task_id', taskId);

export const updateSettings = async (settings) => {
  const { data: currentSetting } = await supabase
    .from('settings')
    .select('*')
    .eq('setting_key', 'low_stock_threshold')
    .single();

  if (currentSetting) {
    return supabase
      .from('settings')
      .update({ setting_value: settings.threshold?.toString() || '1' })
      .eq('setting_key', 'low_stock_threshold');
  } else {
    return supabase
      .from('settings')
      .insert([{ setting_key: 'low_stock_threshold', setting_value: settings.threshold?.toString() || '1' }]);
  }
};

export const getLowStockThreshold = async () => {
  const { data } = await supabase
    .from('settings')
    .select('setting_value')
    .eq('setting_key', 'low_stock_threshold')
    .single();

  return { threshold: parseInt(data?.setting_value) || 1 };
};

export const updateLowStockThreshold = (threshold) =>
  updateSettings({ threshold });
