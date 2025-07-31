document.addEventListener('DOMContentLoaded', () => {
    const developerModeButton = document.getElementById('developer_mode_button');
    const settingsSelect = document.getElementById('settings_select');
    const settingTitleInput = document.getElementById('setting_title');
    const saveSettingButton = document.getElementById('save_setting_button');
    const deleteSettingButton = document.getElementById('delete_setting_button');
    const exportSettingsButton = document.getElementById('export_settings_button');
    const importSettingsButton = document.getElementById('import_settings_button');
    const importFileInput = document.getElementById('import_file_input');
    const elementsWrapper = document.getElementById('elements_wrapper');
    const addElementButtonTop = document.getElementById('add_element_top_button');
    const addElementButtonBottom = document.getElementById('add_element_bottom_button');
    const assignAllButton = document.getElementById('assign_all_button');
    const assignAllButtonTop = document.getElementById('assign_all_button_top');

    let currentElements = [];
    let isDeveloperMode = false;

    const createNewElement = (elementData = {}) => {
        // 이전 isRandom 속성과의 호환성을 위해 assignType을 결정
        let assignType = 'value';
        if (elementData.assignType) {
            assignType = elementData.assignType;
        } else if (elementData.isRandom === true) {
            assignType = 'randomAssign';
        }

        return {
            selectorType: elementData.selectorType || 'id',
            selectorValue: elementData.selectorValue || '',
            assignValue: elementData.assignValue || '',
            assignType: assignType,
            prefix: elementData.prefix || '',
            randomLength: elementData.randomLength || '9',
            randomType: elementData.randomType || 'alphanumeric',
            postfix: elementData.postfix || '',
            isActive: elementData.isActive !== false, // 기본값 true
        };
    };

    const generateRandomString = (length, type = 'alphanumeric') => {
        const chars = {
            alphanumeric: 'abcdefghijklmnopqrstuvwxyz0123456789',
            numeric: '0123456789',
            alpha: 'abcdefghijklmnopqrstuvwxyz'
        };
        const charSet = chars[type] || chars.alphanumeric;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charSet.charAt(Math.floor(Math.random() * charSet.length));
        }
        return result;
    };

    const getElementValue = (el) => {
        if (el.assignType === 'randomAssign') {
            const randomLength = parseInt(el.randomLength, 10) || 9;
            const randomString = generateRandomString(randomLength, el.randomType);
            return `${el.prefix || ''}${randomString}${el.postfix || ''}`;
        }
        return el.assignValue;
    };

    const assignAllElements = () => {
        currentElements.forEach(el => {
            if (!el.isActive) return;
            
            const selector = getCombinedSelector(el.selectorType, el.selectorValue);

            if (el.assignType === 'randomSelect') {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (selector) => {
                            const selectElement = document.querySelector(selector);
                            if (selectElement && selectElement.tagName === 'SELECT') {
                                const options = selectElement.options;
                                if (options.length > 0) {
                                    const randomIndex = Math.floor(Math.random() * options.length);
                                    selectElement.value = options[randomIndex].value;
                                    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                        },
                        args: [selector]
                    });
                });
                return;
            }
            
            const assValue = getElementValue(el);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: (selector, assValue) => {
                        const element = document.querySelector(selector);
                        if (element) {
                            element.value = assValue;
                            if (element.hasAttribute('data-select2-id') && window.jQuery) {
                                window.jQuery(element).trigger('change.select2');
                            } else {
                                element.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    },
                    args: [selector, assValue]
                });
            });
        });
        
        alert('모든 요소가 할당되었습니다.');
    };

    const getCombinedSelector = (type, value) => {
        switch (type) {
            case 'id': return `#${value}`;
            case 'class': return `.${value}`;
            case 'name': return `[name="${value}"]`;
            default: return value;
        }
    };

    const parseCombinedSelector = (selector) => {
        if (selector.startsWith('#')) {
            return { selectorType: 'id', selectorValue: selector.substring(1) };
        }
        if (selector.startsWith('.')) {
            return { selectorType: 'class', selectorValue: selector.substring(1) };
        }
        const nameMatch = selector.match(/^\[name="(.*)"\]$/);
        if (nameMatch) {
            return { selectorType: 'name', selectorValue: nameMatch[1] };
        }
        return { selectorType: 'id', selectorValue: selector }; // Default fallback
    };

    const updateDeveloperModeButton = () => {
        developerModeButton.style.backgroundColor = isDeveloperMode ? '#f44336' : '#95a5a6';
        developerModeButton.style.color = 'white';
    };

    const renderElements = () => {
        elementsWrapper.innerHTML = '';
        currentElements.forEach((elData, index) => {
            const container = document.createElement('div');
            container.className = 'element-container';

            const devModeUI = `
                <div>
                    <label>선택자:</label>
                    <input type="text" class="selector_value" placeholder="CSS 선택자" value="${getCombinedSelector(elData.selectorType, elData.selectorValue)}">
                </div>
            `;
            const userModeUI = `
                <div>
                    <label>선택자 유형:</label>
                    <select class="selector_type">
                        <option value="id" ${elData.selectorType === 'id' ? 'selected' : ''}>ID</option>
                        <option value="class" ${elData.selectorType === 'class' ? 'selected' : ''}>클래스</option>
                        <option value="name" ${elData.selectorType === 'name' ? 'selected' : ''}>이름</option>
                    </select>
                </div>
                <div>
                    <label>선택자 값:</label>
                    <input type="text" class="selector_value" placeholder="선택자 값" value="${elData.selectorValue || ''}">
                </div>
            `;

            container.innerHTML = `
                ${isDeveloperMode ? devModeUI : userModeUI}
                <div style="display: flex; align-items: center;">
                    <label style="width: 100px; flex-shrink: 0;">할당할 값:</label>
                    <div class="assign-value-wrapper" style="display: contents;">
                        <div class="normal-value-wrapper" style="display: ${elData.assignType === 'value' ? 'block' : 'none'}; width: 100%;">
                            <input type="text" class="assign_value" placeholder="할당할 값" value="${elData.assignValue || ''}" style="width: 100%;">
                        </div>
                        <div class="random-select-text" style="display: ${elData.assignType === 'randomSelect' ? 'block' : 'none'}; width: 100%; padding: 8px 0;">
                            option 랜덤 선택
                        </div>
                        <div class="random-value-wrapper" style="display: ${elData.assignType === 'randomAssign' ? 'flex' : 'none'}; width: 100%; align-items: center;">
                            <input type="text" class="random_prefix" placeholder="Prefix" value="${elData.prefix || ''}" style="flex: 1;">
                            <input type="number" class="random_length" placeholder="자릿수" value="${elData.randomLength || '9'}" style="flex: 2; width: 20px !important; margin: 0 5px;">
                            <select class="random_type" style="flex: 1; margin-right: 5px;">
                                <option value="alphanumeric" ${elData.randomType === 'alphanumeric' ? 'selected' : ''}>숫자+알파벳</option>
                                <option value="numeric" ${elData.randomType === 'numeric' ? 'selected' : ''}>숫자</option>
                                <option value="alpha" ${elData.randomType === 'alpha' ? 'selected' : ''}>알파벳</option>
                            </select>
                            <input type="text" class="random_postfix" placeholder="Postfix" value="${elData.postfix || ''}" style="flex: 1;">
                        </div>
                    </div>
                </div>
                <div class="element-footer">
                    <label>
                        <input type="checkbox" class="is_active_checkbox" ${!elData.isActive ? 'checked' : ''}>
                        비활성화
                    </label>
                    <div class="button-group">
                        <label><input type="radio" name="assign_type_${index}" class="assign_type_radio" value="value" ${elData.assignType === 'value' ? 'checked' : ''}> 값</label>
                        <label><input type="radio" name="assign_type_${index}" class="assign_type_radio" value="randomSelect" ${elData.assignType === 'randomSelect' ? 'checked' : ''}> 랜덤선택</label>
                        <label><input type="radio" name="assign_type_${index}" class="assign_type_radio" value="randomAssign" ${elData.assignType === 'randomAssign' ? 'checked' : ''}> 랜덤할당</label>
                        <button class="assign_single_button">실행</button>
                        <button class="remove_element_button">제거</button>
                    </div>
                </div>
            `;

            elementsWrapper.appendChild(container);

            const assignValueInput = container.querySelector('.assign_value');
            const selectorValueInput = container.querySelector('.selector_value');
            const selectorTypeInput = container.querySelector('.selector_type');
            
            const normalValueWrapper = container.querySelector('.normal-value-wrapper');
            const randomValueWrapper = container.querySelector('.random-value-wrapper');
            const randomSelectText = container.querySelector('.random-select-text');

            const randomPrefixInput = container.querySelector('.random_prefix');
            const randomLengthInput = container.querySelector('.random_length');
            const randomTypeSelect = container.querySelector('.random_type');
            const randomPostfixInput = container.querySelector('.random_postfix');
            const isActiveCheckbox = container.querySelector('.is_active_checkbox');

            const setInputsDisabled = (disabled) => {
                container.querySelectorAll('input[type="text"], input[type="number"], select, .assign_type_radio, .assign_single_button').forEach(input => {
                    if (!input.classList.contains('is_active_checkbox') && !input.classList.contains('remove_element_button')) {
                        input.disabled = disabled;
                    }
                });
            };

            setInputsDisabled(!elData.isActive);

            isActiveCheckbox.addEventListener('change', (e) => {
                currentElements[index].isActive = !e.target.checked;
                setInputsDisabled(e.target.checked);
            });

            container.querySelectorAll('.assign_type_radio').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const assignType = e.target.value;
                    currentElements[index].assignType = assignType;
                    normalValueWrapper.style.display = assignType === 'value' ? 'block' : 'none';
                    randomSelectText.style.display = assignType === 'randomSelect' ? 'block' : 'none';
                    randomValueWrapper.style.display = assignType === 'randomAssign' ? 'flex' : 'none';
                });
            });

            assignValueInput.addEventListener('change', (e) => currentElements[index].assignValue = e.target.value);
            randomPrefixInput.addEventListener('change', (e) => currentElements[index].prefix = e.target.value);
            randomLengthInput.addEventListener('change', (e) => currentElements[index].randomLength = e.target.value);
            randomTypeSelect.addEventListener('change', (e) => currentElements[index].randomType = e.target.value);
            randomPostfixInput.addEventListener('change', (e) => currentElements[index].postfix = e.target.value);

            if (isDeveloperMode) {
                selectorValueInput.addEventListener('change', (e) => {
                    const parsed = parseCombinedSelector(e.target.value);
                    currentElements[index].selectorType = parsed.selectorType;
                    currentElements[index].selectorValue = parsed.selectorValue;
                });
            } else {
                selectorValueInput.addEventListener('change', (e) => currentElements[index].selectorValue = e.target.value);
                selectorTypeInput.addEventListener('change', (e) => currentElements[index].selectorType = e.target.value);
            }

            container.querySelector('.remove_element_button').addEventListener('click', () => {
                currentElements.splice(index, 1);
                renderElements();
            });

            const assignAction = () => {
                const element = currentElements[index];
                if (!element.isActive) return;

                const selector = getCombinedSelector(element.selectorType, element.selectorValue);

                if (element.assignType === 'randomSelect') {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            func: (selector) => {
                                const selectElement = document.querySelector(selector);
                                if (selectElement && selectElement.tagName === 'SELECT') {
                                    const options = selectElement.options;
                                    if (options.length > 0) {
                                        const randomIndex = Math.floor(Math.random() * options.length);
                                        selectElement.value = options[randomIndex].value;
                                        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                                    }
                                }
                            },
                            args: [selector]
                        });
                    });
                    return;
                }

                const valueToAssign = getElementValue(element);
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: (selector, assValue) => {
                            const el = document.querySelector(selector);
                            if (el) el.value = assValue;
                        },
                        args: [selector, valueToAssign]
                    });
                });
            };

            container.querySelector('.assign_single_button').addEventListener('click', assignAction);
        });
    };

    const processLoadedElements = (elements) => {
        return elements.map(el => {
            const newEl = createNewElement(el);
            if (el.selector) {
                const parsed = parseCombinedSelector(el.selector);
                newEl.selectorType = parsed.selectorType;
                newEl.selectorValue = parsed.selectorValue;
            }
            return newEl;
        });
    };

    const addElement = (elementData = {}, position = 'top') => {
        const newElement = createNewElement(elementData);
        if (position === 'top') {
            currentElements.unshift(newElement);
        } else {
            currentElements.push(newElement);
        }
        renderElements();
    };

    const toggleDeveloperMode = () => {
        isDeveloperMode = !isDeveloperMode;
        chrome.storage.local.set({ developerMode: isDeveloperMode });
        updateDeveloperModeButton();
        renderElements();
    };

    developerModeButton.addEventListener('click', toggleDeveloperMode);

    settingsSelect.addEventListener('change', () => {
        const selectedTitle = settingsSelect.value;
        if (selectedTitle) {
            chrome.storage.local.set({ lastUsedSetting: selectedTitle });
            chrome.storage.local.get(['settings'], (result) => {
                const setting = result.settings[selectedTitle];
                if (setting && setting.elements) {
                    settingTitleInput.value = selectedTitle;
                    currentElements = processLoadedElements(setting.elements);
                    renderElements();
                }
            });
        } else {
            settingTitleInput.value = '';
            currentElements = [createNewElement()];
            renderElements();
        }
    });

    saveSettingButton.addEventListener('click', () => {
        const title = settingTitleInput.value.trim();
        if (!title) {
            alert('설정 이름을 입력하세요.');
            return;
        }

        const elementsToSave = currentElements.map(el => ({
            selector: getCombinedSelector(el.selectorType, el.selectorValue),
            assignValue: el.assignValue,
            assignType: el.assignType,
            prefix: el.prefix,
            randomLength: el.randomLength,
            randomType: el.randomType,
            postfix: el.postfix,
            isActive: el.isActive
        }));

        const newSetting = {
            elements: elementsToSave
        };

        chrome.storage.local.get(['settings'], (result) => {
            const settings = result.settings || {};
            settings[title] = newSetting;
            chrome.storage.local.set({ settings: settings, lastUsedSetting: title }, () => {
                alert(`설정 '${title}'이(가) 저장되었습니다!`);
                loadInitialState();
                settingsSelect.value = title;
            });
        });
    });

    deleteSettingButton.addEventListener('click', () => {
        const selectedTitle = settingsSelect.value;
        if (!selectedTitle) {
            alert('삭제할 설정을 선택하세요.');
            return;
        }

        chrome.storage.local.get(['settings'], (result) => {
            const settings = result.settings || {};
            delete settings[selectedTitle];
            chrome.storage.local.set({ settings: settings }, () => {
                alert(`설정 '${selectedTitle}'이(가) 삭제되었습니다!`);
                
                const optionToRemove = settingsSelect.querySelector(`option[value="${selectedTitle}"]`);
                if(optionToRemove) {
                    optionToRemove.remove();
                }

                settingTitleInput.value = '';
                settingsSelect.value = '';
                currentElements = [createNewElement()];
                renderElements();
            });
        });
    });

    addElementButtonTop.addEventListener('click', () => addElement({}, 'top'));
    addElementButtonBottom.addEventListener('click', () => addElement({}, 'bottom'));

    assignAllButton.addEventListener('click', assignAllElements);
    assignAllButtonTop.addEventListener('click', assignAllElements);

    exportSettingsButton.addEventListener('click', () => {
        chrome.storage.local.get(['settings'], (result) => {
            if (!result.settings || Object.keys(result.settings).length === 0) {
                alert('내보낼 설정이 없습니다.');
                return;
            }

            const settingsToExport = {};
            for (const title in result.settings) {
                settingsToExport[title] = {
                    elements: result.settings[title].elements.map(el => ({
                        selector: el.selector || getCombinedSelector(el.selectorType, el.selectorValue),
                        assignValue: el.assignValue,
                        assignType: el.assignType,
                        prefix: el.prefix,
                        randomLength: el.randomLength,
                        randomType: el.randomType,
                        postfix: el.postfix,
                        isActive: el.isActive
                    }))
                };
            }

            const dataStr = JSON.stringify(settingsToExport, null, 2);
            const blob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `요소 할당 리스트_${getToday()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('설정을 내보냈습니다.');
        });
    });

    function getToday() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    importSettingsButton.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                chrome.storage.local.get(['settings'], (result) => {
                    const existingSettings = result.settings || {};
                    const mergedSettings = { ...existingSettings, ...importedSettings };
                    chrome.storage.local.set({ settings: mergedSettings }, () => {
                        alert('설정을 성공적으로 불러왔습니다.');
                        loadInitialState();
                        importFileInput.value = '';
                    });
                });
            } catch (error) {
                alert('잘못된 파일 형식입니다. JSON 파일을 선택해주세요.');
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    const loadInitialState = () => {
        chrome.storage.local.get(['developerMode', 'settings', 'lastUsedSetting'], (result) => {
            isDeveloperMode = result.developerMode || false;
            updateDeveloperModeButton();

            const settings = result.settings || {};
            const lastUsedSetting = result.lastUsedSetting;

            settingsSelect.innerHTML = '<option value="">-- 새 설정 --</option>';
            for (const title in settings) {
                const option = document.createElement('option');
                option.value = title;
                option.textContent = title;
                settingsSelect.appendChild(option);
            }

            if (lastUsedSetting && settings[lastUsedSetting]) {
                settingsSelect.value = lastUsedSetting;
                settingTitleInput.value = lastUsedSetting;
                currentElements = processLoadedElements(settings[lastUsedSetting].elements);
            } else {
                currentElements = [createNewElement()];
            }
            renderElements();
        });
    };

    loadInitialState();
});
