var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-180656135-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

const V1_STORAGE_KEY_ENABLE_TIME = 'v1.enableAt';
const V1_STORAGE_KEY_DISABLE_TIME = 'v1.disableAt';
const V1_STORAGE_DAYS = 'v1.days';
const V1_EXTENSION_IDS = 'v1.extensionIds';

//NOTE: first day of week is sunday
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

document.addEventListener('DOMContentLoaded', () => {
  let enableTime = document.getElementById('time_enable');
  enableTime.onchange = (element) => storeTime(element, V1_STORAGE_KEY_ENABLE_TIME);

  let disableTime = document.getElementById('time_disable');
  disableTime.onchange = (element) => storeTime(element, V1_STORAGE_KEY_DISABLE_TIME);

  let selectAll = document.getElementById('selectAll');
  selectAll.onchange = () => {
    selectAll = document.getElementById('selectAll');
    selectOrUnselectAllExtensions(selectAll.checked);

    const allCheckboxes = document.getElementById('extensions').getElementsByTagName('input');
    if(allCheckboxes) {
      for (let i = 0; i < allCheckboxes.length; i++) {
        allCheckboxes[i].checked = selectAll.checked;
      }
    }
  };

  chrome.storage.sync.get([
    V1_STORAGE_KEY_DISABLE_TIME,
    V1_STORAGE_KEY_ENABLE_TIME,
    V1_STORAGE_DAYS,
    V1_EXTENSION_IDS], values => {
    console.log(`[Storage] Stored values: ${JSON.stringify(values)}`);

    renderTime(enableTime, values[V1_STORAGE_KEY_ENABLE_TIME]);
    renderTime(disableTime, values[V1_STORAGE_KEY_DISABLE_TIME]);
    renderDays(values[V1_STORAGE_DAYS]);
    renderExtensions(values[V1_EXTENSION_IDS]);
  });
});

const renderTime = (element, time) => {
  if(time !== undefined) element.value = `${time.textValue}`;
};

const renderDays = (dayValues) => {
  if(dayValues === undefined) dayValues = [false, false, false, false, false, false, false];
  let daysDiv = document.getElementById('days');
  DAY_LABELS.forEach((label, idx) => {
    const button = document.createElement('button');
    button.innerHTML = label;
    dayValues[idx] ? setDayEnabled(button, idx) : setDayDisabled(button, idx);
    daysDiv.appendChild(button);
  });
};

const setDayEnabled = (button, idx) => {
  button.classList = 'day day-enabled';
  button.onclick = () => {disableDay(idx); setDayDisabled(button, idx)};
};

const setDayDisabled = (button, idx) => {
  button.classList = 'day day-disabled';
  button.onclick = () => {enableDay(idx); setDayEnabled(button, idx)};
};

const enableDay = (idx) => {
  chrome.storage.sync.get(V1_STORAGE_DAYS, oldValue => {
    let values = oldValue[V1_STORAGE_DAYS];
    if(values === undefined) values = [false, false, false, false, false, false, false];
    if(values[idx] === true) return;
    values[idx] = true;
    chrome.storage.sync.set({[V1_STORAGE_DAYS]: values}, () => {
      console.log(`[Storage] day ${idx} set as enabled`);
    });
  });
};

const disableDay = (idx) => {
  chrome.storage.sync.get(V1_STORAGE_DAYS, oldValue => {
    let values = oldValue[V1_STORAGE_DAYS];
    if(values === undefined) values = [false, false, false, false, false, false, false];
    if(values[idx] === false) return;
    values[idx] = false;
    chrome.storage.sync.set({[V1_STORAGE_DAYS]: values}, () => {
      console.log(`[Storage] day ${idx} set as disabled`);
    });
  });
};

const renderExtensions = (storedExtensionIds) => {
  let extensionsDiv = document.getElementById('extensions');
  if(storedExtensionIds === undefined) storedExtensionIds = [];
  chrome.management.getSelf(self => {
    chrome.management.getAll((extensions) => {
      let docFrag = document.createDocumentFragment();
      extensions.forEach(extension => {
        if(self.id === extension.id) return;
        const _div = document.createElement('div');
        _div.classList = 'extension-row';

        const _checkbox = document.createElement('input');
        _checkbox.setAttribute("type", "checkbox");
        storedExtensionIds.includes(extension.id) ? setExtensionAsSelected(_checkbox, extension) : setExtensionAsNotSelected(_checkbox, extension);
        _div.appendChild(_checkbox);

        const _icon = document.createElement('img');
        _icon.classList = 'extension-icon';
        if(extension.icons) _icon.src = extension.icons[0].url;
        _div.appendChild(_icon);

        const _name = document.createElement('label');
        _name.classList = 'extension-name';
        _name.innerHTML = extension.name;
        _div.appendChild(_name);

        docFrag.appendChild(_div);
      });
      extensionsDiv.appendChild(docFrag);
    });
  });
};

const setExtensionAsSelected = (checkbox, extension) => {
  checkbox.checked = true;
  checkbox.onclick = () => {unselectExtension(extension); setExtensionAsNotSelected(checkbox, extension);};
};

const setExtensionAsNotSelected = (checkbox, extension) => {
  checkbox.checked = false;
  checkbox.onclick = () => {selectExtension(extension), setExtensionAsSelected(checkbox, extension)};
};

const selectExtension = (extension) => {
  chrome.storage.sync.get(V1_EXTENSION_IDS, oldValue => {
    let extensionIds = oldValue[V1_EXTENSION_IDS];
    if(extensionIds === undefined) extensionIds = [];
    if(extensionIds.includes(extension.id)) return;
    extensionIds.push(extension.id);
    chrome.storage.sync.set({[V1_EXTENSION_IDS]: extensionIds}, () => {
      console.log(`[Storage] extension id ${extension.id} added`);
    });
  });
};

const unselectExtension = (extension) => {
  chrome.storage.sync.get(V1_EXTENSION_IDS, oldValue => {
    let extensionIds = oldValue[V1_EXTENSION_IDS];
    if(extensionIds === undefined) extensionIds = [];
    if(!extensionIds.includes(extension.id)) return;
    extensionIds.splice(extensionIds.indexOf(extension.id), 1);
    chrome.storage.sync.set({[V1_EXTENSION_IDS]: extensionIds}, () => {
      console.log(`[Storage] extension id ${extension.id} removed`);
    });
  });
};

const selectOrUnselectAllExtensions = (isSelectAll) => {
  if(isSelectAll) {
    chrome.management.getSelf(self => {
      chrome.management.getAll((extensions) => {
        const extensionIds = extensions.map(extension => extension.id).filter(id => id !== self.id);
        chrome.storage.sync.set({[V1_EXTENSION_IDS]: extensionIds}, () => {
          console.log(`[Storage] All extensions added: ${JSON.stringify(extensionIds)}`);
        });
      });
    });
  } else {
    chrome.storage.sync.remove(V1_EXTENSION_IDS);
    console.log(`[Storage] All extensions removed`);
  }
};

const storeTime = (element, key) => {
  const arr = element.target.value.split(':');
  chrome.storage.sync.set({
    [key]: {
      hh: parseInt(arr[0]),
      mm: parseInt(arr[1]),
      textValue: element.target.value
    }
  }, () => {
    console.log(`[Storage] ${key} is set to ${element.target.value}`);
  });
};