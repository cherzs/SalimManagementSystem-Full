// ========================
// CONFIGURATION
// ========================
const SHEET_ID = "1g3SBNnN_S2Vn_VfngvZ4DfKPDt1LnTVAa0u5lWjQhGs";
const SECRET_KEY = "yoyo";
const SUPABASE_URL = "https://nnlezmhknsetnrcewlel.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_asWrhmgneQUF57jv5wHqhw_z8XsMT93";

function getSupabaseUrl() { return SUPABASE_URL; }
function getSupabaseAnonKey() { return SUPABASE_ANON_KEY; }

// ========================
// API ENTRY POINT
// ========================
function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST'
  };

  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, data, secret } = payload;

    // Verify secret
    if (secret !== SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        error: "Unauthorized"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);

    let result;
    switch(action) {
      case "SEND_TASK_NOTIFICATION":
        result = handleSendTaskNotification(ss, data);
        break;
      case "SEND_LOW_STOCK_ALERT":
        result = handleSendLowStockAlert(ss, data);
        break;
      default:
        throw new Error("Invalid action");
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type"
    });
}

// ========================
// TASK NOTIFICATIONS
// ========================
function handleSendTaskNotification(ss, { taskId, title, description, items }) {
  const employeesSheet = ss.getSheetByName("Employees");
  const employees = getSheetData(ss, "Employees");

  // Get all employee IDs to notify (skip admins/dummies)
  const employeeIds = employees
    .filter(emp => emp.role === "employee" && emp.expo_push_token && emp.expo_push_token.startsWith("ExponentPushToken["))
    .map(emp => emp.id);

  employees
    .filter(emp => employeeIds.includes(emp.id))
    .forEach(emp => {
      sendExpoNotification(ss, {
        to: emp.expo_push_token,
        title: "Incoming Task Call",
        body: description || "New task assignment",
        data: JSON.stringify({
          taskId: taskId,
          type: 'fake_call',
          taskTitle: title,
          taskDescription: description || "",
          employeeId: emp.id
        }),
        priority: 'high',
        channelId: 'calls',
        sound: 'ringtone',
        _displayInForeground: true
      });
    });

  // Schedule repeated notification
  scheduleTaskNotificationLoop(taskId, employeeIds, 60, 5);

  // Send email to all employees with valid email addresses
  const emailList = employees
    .filter(emp => emp.email && emp.role !== "admin")
    .map(emp => emp.email);

  if (emailList.length > 0) {
    const itemsArray = Array.isArray(items) ? items : JSON.parse(items || "[]");
    const itemsNames = itemsArray.map(item => item.item_name || item.name || item).join(", ");

    const emailContent = `
      <h2>New Task Created</h2>
      <p><strong>Task ID:</strong> ${taskId}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Description:</strong> ${description || "No description provided"}</p>
      <p><strong>Items:</strong> ${itemsNames || "None"}</p>
      <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
      <p>Please check the task management system for details.</p>
    `;

    try {
      MailApp.sendEmail({
        to: emailList.join(","),
        subject: `New Task: ${title}`,
        htmlBody: emailContent,
        noReply: true
      });
      console.log(`Email sent to ${emailList.length} employees`);
    } catch (error) {
      console.error("Failed to send group email:", error);

      emailList.forEach(email => {
        try {
          MailApp.sendEmail(email, `New Task: ${title}`, "", {
            htmlBody: emailContent
          });
        } catch (individualError) {
          console.error(`Failed to send to ${email}:`, individualError);
        }
      });
    }
  }

  return { success: true };
}

// ========================
// LOW STOCK ALERTS
// ========================
function handleSendLowStockAlert(ss, { alerts, recipients }) {
  if (!alerts || alerts.length === 0) {
    return { success: true, message: "No alerts to send" };
  }

  const emailContent = `
    <h2>Low Stock Alert</h2>
    <p>The following items are now below the low stock threshold:</p>
    <ul style="list-style: none; padding-left: 0;">
      ${alerts.map(item => `
        <li style="margin-bottom: 8px;">
          <strong>${item.name}</strong> (ID: ${item.id}) - Current Stock: ${item.stock}
        </li>
      `).join("")}
    </ul>
    <p>Please restock as soon as possible.</p>
  `;

  try {
    if (recipients && recipients.length > 0) {
      MailApp.sendEmail({
        to: recipients.join(","),
        subject: `⚠️ Low Stock Alert - ${alerts.length} Item(s) Below Threshold`,
        htmlBody: emailContent
      });
      console.log(`Sent low stock alert to ${recipients.length} recipients`);
    }
  } catch (error) {
    console.error("Failed to send low stock email:", error);
  }

  return { success: true };
}

// ========================
// EXPO NOTIFICATIONS
// ========================
function sendExpoNotification(ss, messagePayload) {
  const employees = getSheetData(ss, "Employees");

  const recipients = employees.filter(emp =>
    emp.expo_push_token && emp.expo_push_token.startsWith("ExponentPushToken[")
  );

  if (recipients.length === 0) {
    console.log("No valid push tokens found");
    return;
  }

  const messages = { ...messagePayload };

  try {
    var response = UrlFetchApp.fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(messages),
      muteHttpExceptions: true
    });
    var result = JSON.parse(response.getContentText());
    console.log('Notification sent:', result);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// ========================
// SCHEDULED NOTIFICATIONS
// ========================
function scheduleTaskNotificationLoop(taskId, employeeIds, intervalSeconds, maxAttempts) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('notify_taskId', taskId);
  props.setProperty('notify_employeeIds', JSON.stringify(employeeIds));
  props.setProperty('notify_interval', intervalSeconds || 30);
  props.setProperty('notify_maxAttempts', maxAttempts || 10);
  props.setProperty('notify_attempt', 0);

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runTaskNotificationLoop') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('runTaskNotificationLoop')
    .timeBased()
    .everyMinutes(1)
    .create();
}

function runTaskNotificationLoop() {
  const props = PropertiesService.getScriptProperties();

  const taskId = props.getProperty('notify_taskId');
  const employeeIds = JSON.parse(props.getProperty('notify_employeeIds') || '[]');
  const maxAttempts = Number(props.getProperty('notify_maxAttempts') || 10);
  let attempt = Number(props.getProperty('notify_attempt') || 0);

  attempt++;
  props.setProperty('notify_attempt', attempt);

  const employees = getSheetData(SpreadsheetApp.openById(SHEET_ID), "Employees");

  let task = null;
  let allRead = false;

  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseAnonKey();
    const url = supabaseUrl + '/rest/v1/tasks?task_id=eq.' + taskId + '&select=read_by';
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
      },
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText());
    if (result && result.length > 0) {
      task = result[0];
    }
  } catch (e) {
    console.error('Failed to fetch task from Supabase:', e);
    if (attempt >= maxAttempts) {
      cleanupTaskNotificationLoop();
      return;
    }
  }

  if (!task) {
    cleanupTaskNotificationLoop();
    return;
  }

  const readByList = (task.read_by || "").split(",").map(s => s.trim()).filter(Boolean);
  allRead = true;

  employeeIds.forEach(function(empId) {
    if (!readByList.includes(empId)) {
      allRead = false;
      const employee = employees.find(function(e) {
        return e.id === empId && e.expo_push_token && e.expo_push_token.startsWith("ExponentPushToken[");
      });
      if (employee) {
        sendExpoNotification(SpreadsheetApp.openById(SHEET_ID), {
          to: employee.expo_push_token,
          title: "Incoming Task Call",
          body: "Reminder: You have an unread task",
          data: JSON.stringify({
            taskId: taskId,
            type: 'fake_call',
            taskTitle: 'Task Reminder',
            taskDescription: "Please check your tasks",
            employeeId: employee.id
          }),
          priority: 'high',
          channelId: 'calls',
          sound: 'ringtone',
          _displayInForeground: true
        });
      }
    }
  });

  if (allRead || attempt >= maxAttempts) {
    cleanupTaskNotificationLoop();
  }
}

function cleanupTaskNotificationLoop() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runTaskNotificationLoop') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  PropertiesService.getScriptProperties().deleteAllProperties();
}

// ========================
// HELPER FUNCTIONS
// ========================
function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const [headers, ...data] = sheet.getDataRange().getValues();

  return data.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().replace(/\s+/g, '_');
      obj[key] = row[index] instanceof Date ? row[index] : row[index];
    });
    return obj;
  });
}
