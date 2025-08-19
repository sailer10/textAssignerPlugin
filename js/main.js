document.addEventListener('DOMContentLoaded', () => {
    // --- 0. TAB MANAGEMENT ---
    const tabScenarioTool = document.getElementById('tab_scenario_tool');
    const tabAddButton = document.getElementById('tab_add_button');
    const contentScenarioTool = document.getElementById('content_scenario_tool');
    const contentAddButton = document.getElementById('content_add_button');

    tabScenarioTool.addEventListener('click', () => {
        tabScenarioTool.classList.add('active');
        tabAddButton.classList.remove('active');
        contentScenarioTool.style.display = 'block';
        contentAddButton.style.display = 'none';
        chrome.storage.session.set({ lastTab: 'tab_scenario_tool' });
    });

    tabAddButton.addEventListener('click', () => {
        tabAddButton.classList.add('active');
        tabScenarioTool.classList.remove('active');
        contentAddButton.style.display = 'block';
        contentScenarioTool.style.display = 'none';
        chrome.storage.session.set({ lastTab: 'tab_add_button' });
    });


    // --- 1. ELEMENT SELECTORS ---
    const scenariosListContainer = document.getElementById('scenarios_list_container');
    const runImmediatelyCheckbox = document.getElementById('run_immediately_checkbox');
    const scenarioTitleInput = document.getElementById('setting_title');
    const saveScenarioButton = document.getElementById('save_scenario_button');
    const exportScenarioButton = document.getElementById('export_scenario_button');
    const importScenarioButton = document.getElementById('import_scenario_button');
    const importFileInput = document.getElementById('import_file_input');
    const actionsContainer = document.getElementById('actions_container');
    
    const addActionBtnTop = document.getElementById('add_action_btn_top');
    const addWaitBtnTop = document.getElementById('add_wait_btn_top');
    const addFunctionBtnTop = document.getElementById('add_function_btn_top');

    const addActionBtnBottom = document.getElementById('add_action_btn_bottom');
    const addWaitBtnBottom = document.getElementById('add_wait_btn_bottom');
    const addFunctionBtnBottom = document.getElementById('add_function_btn_bottom');

    const runScenarioBtnTop = document.getElementById('run_scenario_btn_top');
    const runScenarioBtnBottom = document.getElementById('run_scenario_btn_bottom');

    const clearActionsBtn = document.getElementById('clear_actions_btn');
    const scrollToTopBtn = document.getElementById('scroll_to_top_btn');

    // --- 1b. BUTTON ADDER UI SELECTORS ---
    const urlInputsContainer = document.getElementById('url_inputs_container');
    const addUrlInputFieldBtn = document.getElementById('add_url_input_field_btn');
    const addButtonManually = document.getElementById('add_button_manually');
    const saveMappingButton = document.getElementById('save_mapping_button');
    const urlListContainer = document.getElementById('url_list_container');

    const buttonSettingsContainer = document.getElementById('button_settings_container');
    const addButtonSettingBtn = document.getElementById('add_button_setting_btn');

    let allScenarios = {}; // Store all scenarios globally for dynamic dropdowns

    const populateScenarioDropdown = (dropdownElement, selectedValue = '') => {
        dropdownElement.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.textContent = '시나리오를 선택하세요';
        defaultOption.value = '';
        dropdownElement.appendChild(defaultOption);

        for (const title in allScenarios) {
            const option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            if (title === selectedValue) {
                option.selected = true;
            }
            dropdownElement.appendChild(option);
        }
    };

    // --- Dynamic URL Input Management ---
    const addUrlInputField = (value = '') => {
        const div = document.createElement('div');
        div.className = 'url-input-group';
        div.innerHTML = `
            <label>URL:</label>
            <input type="text" class="url-input" placeholder="https://example.com" value="${value}">
            <button class="remove-url-input-btn danger">X</button>
        `;
        urlInputsContainer.appendChild(div);

        const removeBtn = div.querySelector('.remove-url-input-btn');
        removeBtn.addEventListener('click', () => {
            if (urlInputsContainer.children.length > 1) {
                urlInputsContainer.removeChild(div);
            } else {
                alert('최소 하나의 URL 입력 필드가 필요합니다.');
            }
        });
        updateRemoveButtonsVisibility();
    };

    const updateRemoveButtonsVisibility = () => {
        const removeButtons = urlInputsContainer.querySelectorAll('.remove-url-input-btn');
        if (urlInputsContainer.children.length === 1) {
            removeButtons[0].style.display = 'none';
        } else {
            removeButtons.forEach(btn => btn.style.display = 'inline-block');
        }
    };

    const getAllUrlInputValues = () => {
        const inputs = urlInputsContainer.querySelectorAll('.url-input');
        return Array.from(inputs).map(input => input.value.trim()).filter(value => value !== '');
    };

    addUrlInputFieldBtn.addEventListener('click', () => addUrlInputField());

    // Initial URL input field
    addUrlInputField();

    // --- Dynamic Button Setting Management ---
    const addbuttonSettingField = (selectorValue = '', scenarioTitleValue = '', actionTypeValue = 'addButton') => {
        const div = document.createElement('div');
        div.className = 'button-setting-group';
        const uniqueId = `action_type_${Date.now()}_${Math.random()}`; // Unique name for radio buttons
        div.innerHTML = `
            <div class="action-type-radios">
                <label><input type="radio" name="${uniqueId}" value="addButton" ${actionTypeValue === 'addButton' ? 'checked' : ''}> 버튼 추가</label>
                <label><input type="radio" name="${uniqueId}" value="autoRun" ${actionTypeValue === 'autoRun' ? 'checked' : ''}> 자동 실행</label>
            </div>
            <div class="selector-group" style="display: ${actionTypeValue === 'addButton' ? 'flex' : 'none'};">
                <label>CSS 선택자:</label>
                <input type="text" class="button-position-selector" placeholder="#id or .class" value="${selectorValue}">
            </div>
            <div class="selector-group">
                <label>시나리오 선택:</label>
                <select class="scenario-select-for-button"></select>
            </div>
            <button class="remove-button-setting-btn danger">X</button>
        `;
        buttonSettingsContainer.appendChild(div);

        const selectorGroup = div.querySelector('.selector-group');
        div.querySelectorAll(`input[name="${uniqueId}"]`).forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'addButton') {
                    selectorGroup.style.display = 'flex';
                } else {
                    selectorGroup.style.display = 'none';
                }
            });
        });

        const removeBtn = div.querySelector('.remove-button-setting-btn');
        removeBtn.addEventListener('click', () => {
            if (buttonSettingsContainer.children.length > 1) {
                buttonSettingsContainer.removeChild(div);
            } else {
                alert('최소 하나의 시나리오 버튼 설정이 필요합니다.');
            }
            updateRemoveButtonSettingsVisibility();
        });
        updateRemoveButtonSettingsVisibility();

        // Populate scenario dropdown for the new field
        populateScenarioDropdown(div.querySelector('.scenario-select-for-button'), scenarioTitleValue);
    };

    const updateRemoveButtonSettingsVisibility = () => {
        const removeButtons = buttonSettingsContainer.querySelectorAll('.remove-button-setting-btn');
        if (buttonSettingsContainer.children.length === 1) {
            removeButtons[0].style.display = 'none';
        } else {
            removeButtons.forEach(btn => btn.style.display = 'inline-block');
        }
    };

    const getAllButtonSettingValues = () => {
        const settings = [];
        buttonSettingsContainer.querySelectorAll('.button-setting-group').forEach(group => {
            const actionType = group.querySelector('input[name^="action_type_"]:checked').value;
            const selectorInput = group.querySelector('.button-position-selector');
            const scenarioTitle = group.querySelector('.scenario-select-for-button').value;
            
            let selector = null;
            if (actionType === 'addButton') {
                selector = selectorInput.value.trim();
                if (!selector) return; // Skip if selector is required but empty
            }

            if (scenarioTitle) {
                settings.push({ actionType, selector, scenarioTitle });
            }
        });
        return settings;
    };

    addButtonSettingBtn.addEventListener('click', () => addbuttonSettingField());

    // Initial button setting field
    addbuttonSettingField();

    // --- 2. STATE MANAGEMENT ---
    let currentActions = [];
    let draggedIndex = null;

    const saveState = () => {
        const state = { title: scenarioTitleInput.value, actions: currentActions };
        chrome.storage.session.set({ draftScenario: state });
    };

    const restoreState = () => {
        chrome.storage.session.get('draftScenario', (data) => {
            if (data.draftScenario) {
                scenarioTitleInput.value = data.draftScenario.title || '';
                currentActions = data.draftScenario.actions || [];
                renderActions();
            }
        });
    };

    // --- 3. RENDERING LOGIC ---
    const renderActions = () => {
        actionsContainer.innerHTML = '';
        currentActions.forEach((action, index) => {
            const container = document.createElement('div');
            container.className = 'element-container';
            if (action.type === 'wait') container.classList.add('wait-action-card');
            container.draggable = true;
            container.dataset.index = index;

            container.addEventListener('dragstart', (e) => { draggedIndex = index; setTimeout(() => e.target.classList.add('dragging'), 0); });
            container.addEventListener('dragend', (e) => { e.target.classList.remove('dragging'); });

            const header = document.createElement('div');
            header.className = 'action-card-header';

            let headerHTML = `
                <select class="main-type-select">
                    <option value="action" ${action.type === 'action' ? 'selected' : ''}>행동</option>
                    <option value="wait" ${action.type === 'wait' ? 'selected' : ''}>대기</option>
                    <option value="function" ${action.type === 'function' ? 'selected' : ''}>함수</option>
                </select>
            `;

            if (action.type === 'action') {
                headerHTML += `
                    <select class="event-type">
                        <option value="click" ${action.eventType === 'click' ? 'selected' : ''}>클릭</option>
                        <option value="focus" ${action.eventType === 'focus' ? 'selected' : ''}>포커스</option>
                        <option value="input" ${action.eventType === 'input' ? 'selected' : ''}>입력</option>
                    </select>
                `;
            } else if (action.type === 'wait') {
                headerHTML += `
                    <select class="event-type">
                        <option value="delay" ${action.eventType === 'delay' ? 'selected' : ''}>지연</option>
                        <option value="visible" ${action.eventType === 'visible' ? 'selected' : ''}>표시</option>
                        <option value="hidden" ${action.eventType === 'hidden' ? 'selected' : ''}>숨김</option>
                        <option value="click" ${action.eventType === 'click' ? 'selected' : ''}>클릭</option>
                        <option value="focus" ${action.eventType === 'focus' ? 'selected' : ''}>포커스</option>
                        <option value="load" ${action.eventType === 'load' ? 'selected' : ''}>로드</option>
                    </select>
                `;
            }
            header.innerHTML = headerHTML;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.className = 'remove_element_button';
            deleteBtn.addEventListener('click', () => { currentActions.splice(index, 1); renderActions(); saveState(); });
            header.appendChild(deleteBtn);
            container.appendChild(header);

            const content = document.createElement('div');
            content.className = 'action-content';
            let contentHTML = '';

            if (action.type === 'action') {
                contentHTML += `<div class='selector-group'><label>CSS 선택자:</label><input type="text" class="selector" placeholder="CSS 선택자" value="${action.selector || ''}"></div>`;
                if (action.eventType === 'input') {
                    contentHTML += `
                        <div class="assign-type-radios">
                            <label><input type="radio" name="assign_type_${index}" value="value" ${action.assignType === 'value' ? 'checked' : ''}> 값</label>
                            <label><input type="radio" name="assign_type_${index}" value="randomSelect" ${action.assignType === 'randomSelect' ? 'checked' : ''}> 랜덤 선택</label>
                            <label><input type="radio" name="assign_type_${index}" value="randomAssign" ${action.assignType === 'randomAssign' ? 'checked' : ''}> 랜덤 할당</label>
                            <label><input type="radio" name="assign_type_${index}" value="totp" ${action.assignType === 'totp' ? 'checked' : ''}> TOTP</label>
                        </div>
                        <div class="value-wrapper"></div>
                    `;
                }
            } else if (action.type === 'wait') {
                if (action.eventType === 'delay') {
                    contentHTML += `<div><label>지연 (ms):</label><input type="number" class="delay-ms" placeholder="밀리초" value="${action.ms || '1000'}"></div>`;
                } else {
                    contentHTML += `<div class='selector-group'><label>CSS 선택자:</label><input type="text" class="selector" placeholder="CSS 선택자" value="${action.selector || ''}"></div>`;
                }
            } else if (action.type === 'function') {
                contentHTML += `<div><label>실행할 함수 코드:</label><textarea class="function-code" rows="4">${action.code || ''}</textarea></div>`;
            }

            content.innerHTML = contentHTML;
            container.appendChild(content);

            if (action.type === 'action' && action.eventType === 'input') {
                const valueWrapper = container.querySelector('.value-wrapper');
                if (action.assignType === 'randomAssign') {
                    valueWrapper.innerHTML = `
                        <input type="text" class="random_prefix" placeholder="Prefix" value="${action.prefix || ''}" style="flex:1;">
                        <input type="number" class="random_length" placeholder="Len" value="${action.randomLength || '9'}" style="flex:1;">
                        <select class="random_type" style="flex:2;">
                            <option value="alphanumeric" ${action.randomType === 'alphanumeric' ? 'selected' : ''}>숫자+알파벳</option>
                            <option value="numeric" ${action.randomType === 'numeric' ? 'selected' : ''}>숫자</option>
                            <option value="alpha" ${action.randomType === 'alpha' ? 'selected' : ''}>알파벳</option>
                        </select>
                        <input type="text" class="random_postfix" placeholder="Postfix" value="${action.postfix || ''}" style="flex:1;">
                    `;
                } else if (action.assignType === 'randomSelect') {
                    valueWrapper.innerHTML = `<input type="text" disabled value="<select>의 <option>이 랜덤 선택됩니다." />`;
                } else if (action.assignType === 'totp') {
                    valueWrapper.innerHTML = `<input type="text" class="assign_value" placeholder="TOTP Secret Key" value="${action.assignValue || ''}">`;
                } else { // 'value'
                    valueWrapper.innerHTML = `<input type="text" class="assign_value" placeholder="할당할 값" value="${action.assignValue || ''}">`;
                }
            }

            container.querySelectorAll('input, select, textarea').forEach(input => {
                input.addEventListener('change', (e) => {
                    const target = e.target;
                    const fieldClass = target.className.split(' ')[0];
                    const classToPropertyMap = {
                        'main-type-select': 'type', 'event-type': 'eventType', 'delay-ms': 'ms', 'selector': 'selector',
                        'assign_value': 'assignValue', 'random_prefix': 'prefix', 'random_length': 'randomLength',
                        'random_type': 'randomType', 'random_postfix': 'postfix', 'function-code': 'code'
                    };
                    if (target.name.startsWith('assign_type')) {
                        action.assignType = target.value;
                    } else if (classToPropertyMap[fieldClass]) {
                        action[classToPropertyMap[fieldClass]] = target.value;
                    }
                    renderActions();
                    saveState();
                });
            });

            actionsContainer.appendChild(container);
        });
    };

    // Drag and Drop Logic
    actionsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(actionsContainer, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) { actionsContainer.appendChild(dragging); } 
        else { actionsContainer.insertBefore(dragging, afterElement); }
    });
    actionsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(actionsContainer, e.clientY);
        const droppedIndex = afterElement ? parseInt(afterElement.dataset.index) : currentActions.length;
        const draggedItem = currentActions.splice(draggedIndex, 1)[0];
        let finalIndex = (draggedIndex < droppedIndex) ? droppedIndex - 1 : droppedIndex;
        currentActions.splice(finalIndex, 0, draggedItem);
        renderActions();
        saveState();
    });
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.element-container:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; }
            else { return closest; }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- 4. SCENARIO MANAGEMENT ---
    const renderScenariosList = () => {
        scenariosListContainer.innerHTML = '';
        chrome.storage.local.get('scenarios', (data) => {
            allScenarios = data.scenarios || {}; // Update global scenarios
            
            // Populate the main list
            for (const title in allScenarios) {
                const itemContainer = document.createElement('div');
                itemContainer.className = 'scenario-item';
                const button = document.createElement('button');
                button.textContent = title;
                button.className = 'scenario-load-btn';
                button.addEventListener('click', () => {
                    if (runImmediatelyCheckbox.checked) { runScenarioByTitle(title, allScenarios[title]); }
                    else { loadScenarioByTitle(title, allScenarios[title]); }
                });
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'X';
                deleteBtn.className = 'scenario-delete-btn';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!confirm(`'${title}' 시나리오를 정말 삭제하시겠습니까?`)) return;
                    delete allScenarios[title];
                    chrome.storage.local.set({ scenarios: allScenarios }, () => { renderScenariosList(); });
                });
                itemContainer.appendChild(button);
                itemContainer.appendChild(deleteBtn);
                scenariosListContainer.appendChild(itemContainer);
            }

            // Populate all dynamic scenario dropdowns
            document.querySelectorAll('.scenario-select-for-button').forEach(dropdown => {
                populateScenarioDropdown(dropdown, dropdown.value); // Keep current selection if any
            });
        });
    };

    const loadScenarioByTitle = (title, actions) => {
        scenarioTitleInput.value = title;
        currentActions = JSON.parse(JSON.stringify(actions));
        renderActions();
        saveState();
    };

    saveScenarioButton.addEventListener('click', () => {
        const title = scenarioTitleInput.value.trim();
        if (!title) { alert('시나리오 제목을 입력하세요.'); return; }
        chrome.storage.local.get('scenarios', (data) => {
            const scenarios = data.scenarios || {};
            scenarios[title] = currentActions;
            chrome.storage.local.set({ scenarios }, () => { alert(`시나리오 '${title}'이(가) 저장되었습니다.`); renderScenariosList(); });
        });
    });

    exportScenarioButton.addEventListener('click', () => {
        chrome.storage.local.get(['scenarios', 'buttonAdderMappings'], (data) => {
            const exportData = {
                scenarios: data.scenarios || {},
                buttonAdderMappings: data.buttonAdderMappings || {}
            };

            if (Object.keys(exportData.scenarios).length === 0 && Object.keys(exportData.buttonAdderMappings).length === 0) {
                alert('내보낼 데이터가 없습니다.');
                return;
            }

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scenarios_and_mappings.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    importScenarioButton.addEventListener('click', () => { importFileInput.click(); });
    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const importedScenarios = importedData.scenarios || {};
                const importedMappings = Array.isArray(importedData.buttonAdderMappings) ? importedData.buttonAdderMappings : [];

                chrome.storage.local.get(['scenarios', 'buttonAdderMappings'], (data) => {
                    const existingScenarios = data.scenarios || {};
                    const existingMappings = Array.isArray(data.buttonAdderMappings) ? data.buttonAdderMappings : [];

                    const mergedScenarios = { ...existingScenarios, ...importedScenarios };
                    const mergedMappings = existingMappings.concat(importedMappings);

                    chrome.storage.local.set({ scenarios: mergedScenarios, buttonAdderMappings: mergedMappings }, () => {
                        alert(`시나리오 ${Object.keys(importedScenarios).length}개, 버튼 매핑 ${importedMappings.length}개를 가져왔습니다.`);
                        renderScenariosList();
                        loadButtonAdderMappings(); // Reload mappings to update the view
                    });
                });
            } catch (error) {
                alert('JSON 파일을 처리하는 중 오류가 발생했습니다: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    // --- 5. ADD ACTION BUTTONS ---
    const addAction = (type, position = 'bottom') => {
        const newAction = { type };
        if (type === 'action') { newAction.eventType = 'input'; newAction.assignType = 'value'; }
        if (type === 'wait') { newAction.eventType = 'delay'; }
        if (position === 'top') { currentActions.unshift(newAction); } 
        else { currentActions.push(newAction); }
        renderActions();
        saveState();
    };
    
    addActionBtnTop.addEventListener('click', () => addAction('action', 'top'));
    addWaitBtnTop.addEventListener('click', () => addAction('wait', 'top'));
    addFunctionBtnTop.addEventListener('click', () => addAction('function', 'top'));
    
    addActionBtnBottom.addEventListener('click', () => addAction('action', 'bottom'));
    addWaitBtnBottom.addEventListener('click', () => addAction('wait', 'bottom'));
    addFunctionBtnBottom.addEventListener('click', () => addAction('function', 'bottom'));

    clearActionsBtn.addEventListener('click', () => {
        if (!confirm('정말로 모든 행동을 삭제하시겠습니까?')) return;
        currentActions = [];
        renderActions();
        saveState();
    });

    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo(0, 0);
    });

    // --- 6. EXECUTION LOGIC ---
    const generateRandomString = (length, type) => {
        const chars = { alphanumeric: 'abcdefghijklmnopqrstuvwxyz0123456789', numeric: '0123456789', alpha: 'abcdefghijklmnopqrstuvwxyz' };
        const charSet = chars[type] || chars.alphanumeric;
        let result = '';
        for (let i = 0; i < length; i++) result += charSet.charAt(Math.floor(Math.random() * charSet.length));
        return result;
    };

    const runScenarioByTitle = (title, actions) => {
        const processedActions = actions.map(action => {
            if (action.type === 'action' && action.eventType === 'input' && action.assignType === 'randomAssign') {
                const randomLength = parseInt(action.randomLength, 10) || 9;
                const randomString = generateRandomString(randomLength, action.randomType);
                const finalValue = `${action.prefix || ''}${randomString}${action.postfix || ''}`;
                return { ...action, assignValue: finalValue };
            }
            return action;
        });
        executeScenario({ title, actions: processedActions });
    };
    
    const runScenario = () => runScenarioByTitle(scenarioTitleInput.value, currentActions);
    runScenarioBtnTop.addEventListener('click', runScenario);
    runScenarioBtnBottom.addEventListener('click', runScenario);

    function executeScenario(scenario) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                { target: { tabId: tabs[0].id }, files: ['js/act_scenario_content.js'] },
                () => {
                    if (chrome.runtime.lastError) { 
                        console.error(chrome.runtime.lastError.message); 
                        alert('콘텐츠 스크립트를 주입할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.'); 
                        return; 
                    }
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'RUN_SCENARIO', scenario }, (response) => {
                        if (chrome.runtime.lastError) 
                            console.error(chrome.runtime.lastError.message);
                    });
                }
            );
        });
    }

    // --- 7. BUTTON ADDER LOGIC ---
    let buttonAdderMappings = []; // Changed to array

    const renderUrlList = () => {
        urlListContainer.innerHTML = '';
        buttonAdderMappings.forEach((mapping, index) => {
            const item = document.createElement('div');
            item.className = 'url-mapping-item';
            let detailsHTML = `<b>URLs:</b> ${mapping.urls.join(', ')}<br>`;
            if (mapping.actionType === 'addButton') {
                detailsHTML += `<b>Action:</b> 버튼 추가<br><b>Selector:</b> ${mapping.selector}<br>`;
            } else {
                detailsHTML += `<b>Action:</b> 자동 실행<br>`;
            }
            detailsHTML += `<b>Scenario:</b> ${mapping.scenarioTitle}`;

            item.innerHTML = `<span>${detailsHTML}</span>`;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '삭제';
            deleteBtn.className = 'danger';
            deleteBtn.style.marginLeft = '10px';
            deleteBtn.addEventListener('click', () => {
                if (!confirm('정말로 이 매핑을 삭제하시겠습니까?')) return;
                buttonAdderMappings.splice(index, 1);
                chrome.storage.local.set({ buttonAdderMappings }, renderUrlList);
            });

            item.appendChild(deleteBtn);
            urlListContainer.appendChild(item);
        });
    };

    const loadButtonAdderMappings = () => {
        chrome.storage.local.get('buttonAdderMappings', (data) => {
            if (Array.isArray(data.buttonAdderMappings)) {
                buttonAdderMappings = data.buttonAdderMappings;
            } else {
                buttonAdderMappings = []; // Initialize as empty array if not an array
            }
            renderUrlList();
        });
    };

    const saveMapping = () => {
        const urls = getAllUrlInputValues();
        const buttonSettings = getAllButtonSettingValues();

        if (urls.length === 0 || buttonSettings.length === 0) {
            alert('URL과 시나리오 버튼 설정을 모두 입력해야 합니다.');
            return;
        }

        chrome.storage.local.get('buttonAdderMappings', (data) => {
            const currentMappings = Array.isArray(data.buttonAdderMappings) ? data.buttonAdderMappings : [];

            buttonSettings.forEach(setting => {
                const newMapping = {
                    urls,
                    actionType: setting.actionType,
                    selector: setting.selector, // This will be null if not applicable
                    scenarioTitle: setting.scenarioTitle
                };
                currentMappings.push(newMapping);
            });

            chrome.storage.local.set({ buttonAdderMappings: currentMappings }, () => {
                alert('매핑이 저장되었습니다.');
                buttonAdderMappings = currentMappings; // Update local variable
                renderUrlList();
                // Clear inputs after saving
                const urlInputs = urlInputsContainer.querySelectorAll('.url-input');
                if (urlInputs.length > 1) {
                    Array.from(urlInputsContainer.children).slice(1).forEach(child => urlInputsContainer.removeChild(child));
                }
                urlInputs[0].value = '';
                updateRemoveButtonsVisibility();

                const buttonSettingGroups = buttonSettingsContainer.querySelectorAll('.button-setting-group');
                if (buttonSettingGroups.length > 1) {
                    Array.from(buttonSettingsContainer.children).slice(1).forEach(child => buttonSettingsContainer.removeChild(child));
                }
                const firstGroup = buttonSettingGroups[0];
                firstGroup.querySelector('.button-position-selector').value = '';
                populateScenarioDropdown(firstGroup.querySelector('.scenario-select-for-button'), '');
                firstGroup.querySelector('input[value="addButton"]').checked = true;
                firstGroup.querySelector('.selector-group').style.display = 'flex';
                updateRemoveButtonSettingsVisibility();
            });
        });
    };

    saveMappingButton.addEventListener('click', saveMapping);

    addButtonManually.addEventListener('click', () => {
        const buttonSettings = getAllButtonSettingValues();
        const settingsToAdd = buttonSettings.filter(s => s.actionType === 'addButton');

        if (settingsToAdd.length === 0) {
            alert('페이지에 추가할 버튼 설정이 없습니다. (자동 실행이 아닌 \"버튼 추가\" 옵션을 선택했는지 확인하세요.)');
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0] || !tabs[0].id) {
                alert('활성화된 탭을 찾을 수 없습니다.');
                return;
            }

            settingsToAdd.forEach(setting => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'MANUAL_ADD_BUTTON',
                    selector: setting.selector,
                    scenarioTitle: setting.scenarioTitle
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message:', chrome.runtime.lastError.message);
                    } 
                });
            });
            alert(`${settingsToAdd.length}개의 버튼이 현재 페이지에 추가 요청되었습니다.`);
        });
    });

    


    // --- 8. INITIALIZATION ---
    const restoreLastTab = () => {
        chrome.storage.session.get(['lastTab'], (result) => {
            if (result.lastTab) {
                const tabToActivate = document.getElementById(result.lastTab);
                if (tabToActivate) {
                    tabToActivate.click();
                }
            }
        });
    };

    renderScenariosList();
    restoreState();
    loadButtonAdderMappings();
    restoreLastTab();
});