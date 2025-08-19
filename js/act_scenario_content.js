// --- START of TOTP Generation Code ---
// This code is adapted from various open-source implementations.
const totpGenerator = {
    base32tohex: function(base32) {
        const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        let hex = "";
        base32 = base32.replace(/\s/g, '').replace(/=/g, ''); // Remove whitespace and padding

        for (let i = 0; i < base32.length; i++) {
            const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            if (val === -1) throw new Error("Invalid base32 character");
            bits += val.toString(2).padStart(5, '0');
        }

        for (let i = 0; i + 4 <= bits.length; i += 4) {
            const chunk = bits.substr(i, 4);
            hex += parseInt(chunk, 2).toString(16);
        }
        return hex;
    },

    hex2buf: function(hex) {
        const buffer = new Uint8Array(Math.ceil(hex.length / 2));
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return buffer;
    },

    generate: async function(secret) {
        try {
            if (!crypto || !crypto.subtle) {
                throw new Error("Web Crypto API not available.");
            }
            const period = 30;
            const digits = 6;
            const algorithm = 'SHA-1';
            const timestamp = Date.now();

            const keyHex = this.base32tohex(secret);
            const keyBuffer = this.hex2buf(keyHex);

            if (keyBuffer.length === 0) {
                console.error("TOTP Error: The provided secret key is empty or invalid.");
                throw new Error("Invalid base32 key");
            }

            const epoch = Math.round(timestamp / 1000.0);
            const timeStep = Math.floor(epoch / period);
            
            const timeBuffer = new ArrayBuffer(8);
            const timeView = new DataView(timeBuffer);
            // Time must be a 64-bit integer. JS numbers are 53-bit.
            // This is a workaround for BigInt compatibility.
            timeView.setUint32(4, timeStep, false);

            const cryptoKey = await crypto.subtle.importKey(
                'raw', keyBuffer,
                { name: 'HMAC', hash: algorithm },
                false, ['sign']
            );

            const mac = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
            const hash = new Uint8Array(mac);
            
            const offset = hash[hash.length - 1] & 0x0f;
            const binary =
                ((hash[offset] & 0x7f) << 24) |
                ((hash[offset + 1] & 0xff) << 16) |
                ((hash[offset + 2] & 0xff) << 8) |
                (hash[offset + 3] & 0xff);

            let otp = binary % (10 ** digits);
            otp = otp.toString();
            return otp.padStart(digits, '0');
        } catch (e) {
            console.error("TOTP Generation Error:", e);
            if (e.message.includes("Web Crypto API")) {
                return "NO_CRYPTO";
            }
            if (e.message.includes("Invalid base32")) {
                return "KEY_ERR";
            }
            return "GEN_ERR";
        }
    }
};
// --- END of TOTP Generation Code ---

// Function to add a button to the page
function addScenarioButton(selector, scenarioTitle) {
    const targetElement = document.querySelector(selector);
    if (!targetElement) {
        console.error(`[Scenario Tool] Element not found for selector: ${selector}`);
        return;
    }

    const button = document.createElement('button');
    button.textContent = `▶ ${scenarioTitle}`;
    // Basic styling, can be customized
    button.style.backgroundColor = '#3498db';
    button.style.color = 'white';
    button.style.padding = '8px 12px';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.marginLeft = '10px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Running scenario: ${scenarioTitle}`);
        runScenarioByName(scenarioTitle);
    });

    targetElement.appendChild(button);
}

async function runScenarioByName(scenarioTitle) {
    chrome.storage.local.get('scenarios', (data) => {
        const scenarios = data.scenarios || {};
        const scenarioActions = scenarios[scenarioTitle];
        if (scenarioActions) {
            // This re-uses the existing scenario execution logic
            // but first processes actions for random values, etc.
            const processedActions = scenarioActions.map(action => {
                if (action.type === 'action' && action.eventType === 'input' && action.assignType === 'randomAssign') {
                    const randomLength = parseInt(action.randomLength, 10) || 9;
                    const randomString = generateRandomString(randomLength, action.randomType);
                    const finalValue = `${action.prefix || ''}${randomString}${action.postfix || ''}`;
                    return { ...action, assignValue: finalValue };
                }
                return action;
            });
            runScenario(processedActions).catch(err => console.error(`Error running scenario ${scenarioTitle}:`, err));
        } else {
            console.error(`Scenario "${scenarioTitle}" not found.`);
        }
    });
}

// Helper for random string generation, needed for runScenarioByName
const generateRandomString = (length, type) => {
    const chars = { alphanumeric: 'abcdefghijklmnopqrstuvwxyz0123456789', numeric: '0123456789', alpha: 'abcdefghijklmnopqrstuvwxyz' };
    const charSet = chars[type] || chars.alphanumeric;
    let result = '';
    for (let i = 0; i < length; i++) result += charSet.charAt(Math.floor(Math.random() * charSet.length));
    return result;
};

// --- Main execution on page load ---
function applyButtonsForCurrentPage() {
    chrome.storage.local.get('buttonAdderMappings', (data) => {
        if (!data.buttonAdderMappings || !Array.isArray(data.buttonAdderMappings)) return;

        const mappings = data.buttonAdderMappings;
        const currentUrl = window.location.href;

        mappings.forEach(mapping => {
            const urlMatches = mapping.urls.some(mappedUrl => currentUrl.startsWith(mappedUrl));
            
            if (urlMatches) {
                if (mapping.actionType === 'autoRun') {
                    console.log(`[Scenario Tool] Auto-running scenario: ${mapping.scenarioTitle}`);
                    runScenarioByName(mapping.scenarioTitle);
                } else { // Default to 'addButton'
                    addScenarioButton(mapping.selector, mapping.scenarioTitle);
                }
            }
        });
    });
}

// Run the function to apply buttons
applyButtonsForCurrentPage();

// Listen for messages from the popup (for running scenarios from the main UI)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RUN_SCENARIO') {
    runScenario(request.scenario.actions).then(() => {
      sendResponse({ status: 'SUCCESS' });
    }).catch(error => {
      console.error('Scenario failed:', error);
      sendResponse({ status: 'ERROR', message: error.message });
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (request.type === 'MANUAL_ADD_BUTTON') {
    addScenarioButton(request.selector, request.scenarioTitle);
    sendResponse({ status: 'SUCCESS' });
  }
});

async function runScenario(actions) {
  for (const action of actions) {
    switch (action.type) {
      case 'action':
        await executeAction(action);
        break;
      case 'wait':
        await waitForEvent(action);
        break;
      case 'function':
        await executeFunction(action);
        break;
    }
  }
}

async function executeFunction(action) {
    try {
        // Using async new Function to handle both sync and async user code
        const func = new Function(action.code);
        await func();
    } catch (e) {
        console.error("Error executing custom function:", e);
        // Optionally, re-throw or handle the error to stop the scenario
        throw e;
    }
}

async function executeAction(action) {
  const element = document.querySelector(action.selector);
  if (!element) {
    throw new Error(`Element not found for selector: ${action.selector}`);
  }

  if (action.eventType === 'input') {
    if (action.assignType === 'randomSelect') {
      if (element.tagName !== 'SELECT') {
        throw new Error(`randomSelect can only be used on <select> elements. Selector: ${action.selector}`);
      }
      const options = element.options;
      if (options.length > 0) {
        const randomIndex = Math.floor(Math.random() * options.length);
        element.value = options[randomIndex].value;
      }
    } else if (action.assignType === 'totp') {
      if (!action.assignValue) {
        throw new Error('TOTP action requires a secret key.');
      }
      const totpResult = await totpGenerator.generate(action.assignValue);
      if (totpResult === 'KEY_ERR') {
        element.value = '키오류'; // "Key Error" in Korean
      } else if (totpResult === 'GEN_ERR') {
        element.value = '생성오류'; // "Generation Error" in Korean
      } else if (totpResult === 'NO_CRYPTO') {
        element.value = '1'; // "No API"
      } else {
        element.value = totpResult;
      }
    } else {
      element.value = action.assignValue;
    }
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  } else {
    const event = new Event(action.eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  }

  if (element.hasAttribute('data-select2-id') && window.jQuery) {
    window.jQuery(element).trigger('change.select2');
  }
}

function waitForEvent(action) {
  return new Promise((resolve, reject) => {
    if (action.eventType === 'delay') {
        setTimeout(resolve, parseInt(action.ms, 10) || 1000);
        return;
    }

    const element = document.querySelector(action.selector);
    if (!element && action.eventType !== 'hidden') {
      return reject(new Error(`Element not found for selector: ${action.selector}`));
    }

    if (action.eventType === 'visible') {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            obs.disconnect();
            resolve();
          }
        });
      }, { threshold: 0.1 });
      observer.observe(element);
    } else if (action.eventType === 'hidden') {
      const interval = setInterval(() => {
        const el = document.querySelector(action.selector);
        if (!el || window.getComputedStyle(el).display === 'none') {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    } else {
      const listener = () => {
        element.removeEventListener(action.eventType, listener);
        resolve();
      };
      element.addEventListener(action.eventType, listener, { once: true });
    }
  });
}
