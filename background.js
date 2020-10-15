const V1_STORAGE_KEY_ENABLE_TIME = 'v1.enableAt';
const V1_STORAGE_KEY_DISABLE_TIME = 'v1.disableAt';
const V1_STORAGE_DAYS = 'v1.days';
const V1_EXTENSION_IDS = 'v1.extensionIds';

const ALARM_NAME_ENABLE = 'ALARM_AUTO_ENABLE_EXTENSIONS';
const ALARM_NAME_DISABLE = 'ALARM_AUTO_DISABLE_EXTENSIONS';

const setBadge = (enabled) => {
  chrome.browserAction.setBadgeText({text: enabled ? 'ON' : 'OFF'});
  chrome.browserAction.setBadgeBackgroundColor({color: enabled ? '#28a745' : '#6c757d'});
};

const _coreListener = () => {
  _isDisabledHours(result => _setExtensionsEnabled(!result));

  _createAlarm(ALARM_NAME_ENABLE, V1_STORAGE_KEY_ENABLE_TIME);
  _createAlarm(ALARM_NAME_DISABLE, V1_STORAGE_KEY_DISABLE_TIME);

  _printAllAlarms();
};

chrome.runtime.onInstalled.addListener(() => {
  console.log(`----- onInstalled -------`);
  _coreListener();
});

chrome.runtime.onStartup.addListener(() => {
  console.log(`----- onStartup -------`);
  _coreListener();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`Alarm ${alarm.name} triggered : ${JSON.stringify(alarm)}`);
  _isDisabledHours(result => _setExtensionsEnabled(!result));
});

const _printAllAlarms = () => chrome.alarms.getAll(alarms => console.log(`Alarms: ${JSON.stringify(alarms)}`));

const _createAlarm = (alarmName, storageKey) => {
  chrome.storage.sync.get([storageKey], values => {
    if(values[storageKey] === undefined) {
      chrome.alarms.clear(alarmName);
      return;
    }
    const now = new Date();
    let alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), values[storageKey].hh, values[storageKey].mm, 0, 0);
    if(now > alarmDate) {
      alarmDate = new Date(alarmDate.setDate(1 + alarmDate.getDate()));
    }

    const timestamp = +new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate(), values[storageKey].hh, values[storageKey].mm, 0, 0);

    chrome.alarms.create(alarmName, {
      when: timestamp,
      periodInMinutes: 24*60 // 24 hours
    });
    console.log(`Alarm ${alarmName} ${values[storageKey].textValue} created`);
  });
};

const _isDisabledHours = (cb) => {
  chrome.storage.sync.get([
    V1_STORAGE_KEY_DISABLE_TIME,
    V1_STORAGE_KEY_ENABLE_TIME,
    V1_STORAGE_DAYS], values => {
    console.log(`[Storage] Stored values: ${JSON.stringify(values)}`);
    const now = new Date();
    if(values[V1_STORAGE_DAYS] === undefined || !values[V1_STORAGE_DAYS][now.getDay()]) return cb(false);
    if(values[V1_STORAGE_KEY_DISABLE_TIME] === undefined || values[V1_STORAGE_KEY_ENABLE_TIME] === undefined) return cb(false);

    const disableAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), values[V1_STORAGE_KEY_DISABLE_TIME].hh, values[V1_STORAGE_KEY_DISABLE_TIME].mm, 0, 0);
    const enableAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), values[V1_STORAGE_KEY_ENABLE_TIME].hh, values[V1_STORAGE_KEY_ENABLE_TIME].mm, 0, 0);

    if(disableAt > enableAt) {
      return cb(now >= disableAt || now < enableAt);
    }
    return cb(now >= disableAt && now < enableAt);
  });
}

const _setExtensionsEnabled = (enabled) => {
  setBadge(enabled);
  chrome.management.getSelf(self => {
    chrome.storage.sync.get([V1_EXTENSION_IDS], values => {
      if(values[V1_EXTENSION_IDS] === undefined) return;
      values[V1_EXTENSION_IDS].forEach(id => {
        if(id === self.id) return;
        chrome.management.setEnabled(id, enabled, () => {
          console.log(`Extension \"${id}\" enabled: ${enabled}`);
        });
      });
    });
  });
};

chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let key in changes) {
    var storageChange = changes[key];
    console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                JSON.stringify(storageChange.oldValue),
                JSON.stringify(storageChange.newValue));

    if(key === V1_STORAGE_DAYS || key === V1_STORAGE_KEY_ENABLE_TIME || key === V1_STORAGE_KEY_DISABLE_TIME) _isDisabledHours(result => _setExtensionsEnabled(!result));

    if(key === V1_STORAGE_KEY_ENABLE_TIME) _createAlarm(ALARM_NAME_ENABLE, V1_STORAGE_KEY_ENABLE_TIME);
    if(key === V1_STORAGE_KEY_DISABLE_TIME) _createAlarm(ALARM_NAME_DISABLE, V1_STORAGE_KEY_DISABLE_TIME);
  }
});