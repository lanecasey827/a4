/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const componentPalette = document.getElementById('component-palette');
    const promptCanvas = document.getElementById('prompt-canvas');
    const templateList = document.getElementById('template-list');
    const variableForm = document.getElementById('variable-form');
    const livePreview = document.getElementById('live-preview');
    const saveTemplateButton = document.getElementById('save-template-button');
    const copyPromptButton = document.getElementById('copy-prompt-button');
    const saveTemplateModal = document.getElementById('save-template-modal');
    const saveTemplateForm = document.getElementById('save-template-form');
    const cancelSaveButton = document.getElementById('cancel-save-button');
    const templateNameInput = document.getElementById('template-name-input');

    // Application State
    let state = {
        components: [],
        templates: [],
        variables: {},
    };

    let draggedElement = null;

    // --- STATE MANAGEMENT & LOCALSTORAGE ---

    const saveState = () => {
        try {
            const appState = {
                templates: state.templates,
            };
            localStorage.setItem('promptBuilderState', JSON.stringify(appState));
        } catch (error) {
            console.error("Could not save state to localStorage:", error);
        }
    };

    const loadState = () => {
        try {
            const savedState = localStorage.getItem('promptBuilderState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                state.templates = parsedState.templates || [];
            }
        } catch (error) {
            console.error("Could not load state from localStorage:", error);
            state.templates = [];
        }
    };

    // --- CORE RENDERING FUNCTIONS ---

    const render = () => {
        renderCanvas();
        renderTemplates();
        updatePreviewAndVariables();
    };

    const renderTemplates = () => {
        templateList.innerHTML = '';
        if (state.templates.length === 0) {
            templateList.innerHTML = '<p class="empty-list-message">No saved templates.</p>';
            return;
        }
        state.templates.forEach(template => {
            const templateEl = document.createElement('div');
            templateEl.className = 'template-item';
            templateEl.dataset.templateId = String(template.id);
            templateEl.innerHTML = `
                <span class="template-name">${escapeHTML(template.name)}</span>
                <div class="template-actions">
                    <button class="icon-button load-template-button" aria-label="Load template ${escapeHTML(template.name)}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4.333 20.333v-1.466h15.334v1.466H4.333zM12 17.5l-4.9-4.9 1.033-1.034L11.3 14.7V3.667h1.4v11.033l3.167-3.166 1.033 1.034L12 17.5z"/></svg>
                    </button>
                    <button class="icon-button delete-template-button" aria-label="Delete template ${escapeHTML(template.name)}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18.667a2.667 2.667 0 0 1-2.667-2.667V6.333H3.667v-1.4h5.333v-.933h6v.933h5.333v1.4h-.666V16a2.667 2.667 0 0 1-2.667 2.667H7zM18.333 6.333H5.667V16c0 .733.6 1.333 1.333 1.333h10c.733 0 1.333-.6 1.333-1.333V6.333zM8.333 15h1.4V8.667h-1.4V15zm4.533 0h1.4V8.667h-1.4V15z"/></svg>
                    </button>
                </div>
            `;
            templateList.appendChild(templateEl);
        });
    };
    
    const renderCanvas = () => {
        promptCanvas.innerHTML = '';
        if (state.components.length === 0) {
            promptCanvas.innerHTML = '<div class="empty-canvas-message"><p>Drop components here</p></div>';
            return;
        }
        state.components.forEach((component, index) => {
            const el = createComponentElement(component, index);
            promptCanvas.appendChild(el);
        });
    };

    const updatePreviewAndVariables = () => {
        let fullText = '';
        const detectedVariables = new Set();
        const variableRegex = /\[([A-Z_]+)\]/g;

        state.components.forEach(comp => {
            let componentText = '';
            switch (comp.type) {
                case 'heading':
                    componentText = `# ${comp.content}\n\n`;
                    break;
                case 'text-block':
                    componentText = `${comp.content}\n\n`;
                    break;
                case 'key-value':
                    componentText = `${comp.key}: ${comp.value}\n`;
                    break;
            }
            let match;
            while ((match = variableRegex.exec(componentText)) !== null) {
                detectedVariables.add(match[1]);
            }
            fullText += componentText;
        });

        renderVariableInputs(Array.from(detectedVariables));

        let previewText = fullText;
        for (const key in state.variables) {
            const value = state.variables[key];
            const placeholder = `[${key}]`;
            const regex = new RegExp('\\[' + key + '\\]', 'g');
            previewText = previewText.replace(regex, value || placeholder);
        }
        
        livePreview.textContent = previewText.trim();
    };
    
    const renderVariableInputs = (variables) => {
        variableForm.innerHTML = '';
        if (variables.length === 0) {
            variableForm.innerHTML = '<p class="empty-list-message">No variables detected.</p>';
            return;
        }

        variables.forEach(varName => {
            if (!state.variables.hasOwnProperty(varName)) {
                state.variables[varName] = '';
            }
            const varId = `var-${varName}`;
            const group = document.createElement('div');
            group.className = 'variable-input-group';
            group.innerHTML = `
                <label for="${varId}">${varName}</label>
                <input type="text" id="${varId}" data-variable-name="${varName}" value="${escapeHTML(state.variables[varName] || '')}" placeholder="Enter value for ${varName}">
            `;
            variableForm.appendChild(group);
        });
    };
    
    // --- COMPONENT CREATION ---

    const createComponentElement = (component, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-component';
        wrapper.dataset.componentId = String(component.id);
        wrapper.dataset.index = String(index);
        wrapper.setAttribute('draggable', 'true');

        let contentHtml = '';
        switch (component.type) {
            case 'heading':
                contentHtml = `<input type="text" class="component-input" data-property="content" value="${escapeHTML(component.content || '')}" placeholder="Heading">`;
                break;
            case 'text-block':
                contentHtml = `<textarea class="component-input" data-property="content" placeholder="Enter text...">${escapeHTML(component.content || '')}</textarea>`;
                break;
            case 'key-value':
                contentHtml = `
                    <div class="key-value-inputs">
                        <input type="text" class="component-input" data-property="key" value="${escapeHTML(component.key || '')}" placeholder="Key">
                        <span>:</span>
                        <input type="text" class="component-input" data-property="value" value="${escapeHTML(component.value || '')}" placeholder="Value, e.g., [PLACEHOLDER]">
                    </div>
                `;
                break;
        }

        wrapper.innerHTML = `
            <div class="component-header">
                <span class="component-drag-handle" aria-label="Drag to reorder">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.667 17.667a1.333 1.333 0 1 1 0-2.667 1.333 1.333 0 0 1 0 2.667zm2.666 0a1.333 1.333 0 1 1 0-2.667 1.333 1.333 0 0 1 0 2.667zM10.667 12.333a1.333 1.333 0 1 1 0-2.666 1.333 1.333 0 0 1 0 2.666zm2.666 0a1.333 1.333 0 1 1 0-2.666 1.333 1.333 0 0 1 0 2.666zM10.667 7a1.333 1.333 0 1 1 0-2.667 1.333 1.333 0 0 1 0 2.667zm2.666 0a1.333 1.333 0 1 1 0-2.667 1.333 1.333 0 0 1 0 2.667z"/></svg>
                </span>
                <span class="component-title">${component.type.replace('-', ' ')}</span>
                <button class="icon-button delete-component-button" aria-label="Delete component">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35 12 12l-5.65-5.65L5 7.7l5.65 5.65L5 19.05l1.35 1.35L12 13.35l5.65 5.65 1.35-1.35L13.35 12l5.65-5.65L17.65 6.35z"/></svg>
                </button>
            </div>
            <div class="component-body">${contentHtml}</div>
        `;
        return wrapper;
    };

    const createNewComponent = (type) => {
        const newComp = { id: Date.now(), type };
        switch (type) {
            case 'heading':
                newComp.content = 'New Heading';
                break;
            case 'text-block':
                newComp.content = 'This is a new text block. You can use variables like [TOPIC].';
                break;
            case 'key-value':
                newComp.key = 'Key';
                newComp.value = '[VALUE]';
                break;
        }
        return newComp;
    };
    
    // --- EVENT HANDLERS ---
    
    // Drag and Drop
    componentPalette.addEventListener('dragstart', (e) => {
        const target = e.target;
        if (target.classList.contains('component-item')) {
            e.dataTransfer?.setData('text/plain', target.dataset.componentType || '');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'copy';
            }
        }
    });

    promptCanvas.addEventListener('dragstart', (e) => {
        const target = e.target;
        if (target.classList.contains('canvas-component')) {
            draggedElement = target;
            setTimeout(() => {
                target.classList.add('dragging');
            }, 0);
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
            }
        }
    });

    promptCanvas.addEventListener('dragend', () => {
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
            draggedElement = null;
        }
    });
    
    promptCanvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        const target = e.target;
        const dropTarget = target.closest('.canvas-component');
        const isNewComponent = e.dataTransfer?.effectAllowed === 'copy';

        if (draggedElement && dropTarget === draggedElement) {
            return;
        }

        const afterElement = getDragAfterElement(promptCanvas, e.clientY);
        const currentPlaceholder = promptCanvas.querySelector('.drop-placeholder');

        if (!currentPlaceholder || (afterElement && afterElement !== currentPlaceholder.nextSibling) || (!afterElement && promptCanvas.lastChild !== currentPlaceholder)) {
            if (currentPlaceholder) currentPlaceholder.remove();
            
            const placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            
            if (isNewComponent) {
                placeholder.classList.add('new-component');
            }

            if (afterElement == null) {
                promptCanvas.appendChild(placeholder);
            } else {
                promptCanvas.insertBefore(placeholder, afterElement);
            }
        }
    });

    promptCanvas.addEventListener('dragleave', (e) => {
        if (e.target === promptCanvas && (!e.relatedTarget || !promptCanvas.contains(e.relatedTarget))) {
             const placeholder = promptCanvas.querySelector('.drop-placeholder');
             if (placeholder) placeholder.remove();
        }
    });

    promptCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const placeholder = promptCanvas.querySelector('.drop-placeholder');
        
        const componentType = e.dataTransfer?.getData('text/plain');

        if (draggedElement) {
            const fromIndex = parseInt(draggedElement.dataset.index, 10);
            
            let toIndex = placeholder ? Array.from(promptCanvas.children).indexOf(placeholder) : state.components.length;
            if (fromIndex < toIndex) {
                toIndex--;
            }
            
            if (fromIndex !== toIndex) {
                 const [movedComponent] = state.components.splice(fromIndex, 1);
                 state.components.splice(toIndex, 0, movedComponent);
            }
        } else if (componentType) {
             const newComponent = createNewComponent(componentType);
             const newIndex = placeholder ? Array.from(promptCanvas.children).indexOf(placeholder) : state.components.length;
             state.components.splice(newIndex, 0, newComponent);
        }
        
        if (placeholder) placeholder.remove();
        draggedElement = null;
        render();
    });

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.canvas-component:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    };
    
    // Component Interactions
    promptCanvas.addEventListener('input', (e) => {
        const target = e.target;
        if (target.classList.contains('component-input')) {
            const componentElem = target.closest('.canvas-component');
            const componentId = componentElem.dataset.componentId;
            const property = target.dataset.property;
            const component = state.components.find(c => c.id == Number(componentId));

            if (component && property && (property === 'content' || property === 'key' || property === 'value')) {
                component[property] = target.value;
                updatePreviewAndVariables();
            }
        }
    });

    promptCanvas.addEventListener('click', (e) => {
        const target = e.target;
        const deleteButton = target.closest('.delete-component-button');
        if (deleteButton) {
            const componentElem = deleteButton.closest('.canvas-component');
            const componentId = componentElem.dataset.componentId;
            state.components = state.components.filter(c => c.id != Number(componentId));
            render();
        }
    });

    // Variable Form Interaction
    variableForm.addEventListener('input', (e) => {
        const target = e.target;
        if (target.matches('input[data-variable-name]')) {
            const varName = target.dataset.variableName;
            if (varName) {
                state.variables[varName] = target.value;
                updatePreviewAndVariables();
            }
        }
    });
    
    // Template List Interactions
    templateList.addEventListener('click', (e) => {
        const target = e.target;
        const templateItem = target.closest('.template-item');
        if (!templateItem) return;

        const templateId = templateItem.dataset.templateId;

        if (target.closest('.load-template-button')) {
            const template = state.templates.find(t => t.id == Number(templateId));
            if (template) {
                state.components = JSON.parse(JSON.stringify(template.components));
                render();
            }
        } else if (target.closest('.delete-template-button')) {
            if (confirm('Are you sure you want to delete this template?')) {
                state.templates = state.templates.filter(t => t.id != Number(templateId));
                saveState();
                renderTemplates();
            }
        }
    });

    // Main Actions
    copyPromptButton.addEventListener('click', () => {
        navigator.clipboard.writeText(livePreview.textContent || "").then(() => {
            const span = copyPromptButton.querySelector('span');
            if (!span) return;
            const originalText = span.textContent;
            span.textContent = 'Copied!';
            copyPromptButton.classList.add('success');
            setTimeout(() => {
                span.textContent = originalText;
                copyPromptButton.classList.remove('success');
            }, 2000);
        });
    });

    saveTemplateButton.addEventListener('click', () => {
        if(state.components.length === 0) {
            alert('Cannot save an empty prompt. Add some components first.');
            return;
        }
        saveTemplateModal.hidden = false;
        templateNameInput.focus();
    });

    // Modal Handlers
    saveTemplateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = templateNameInput.value.trim();
        if (name) {
            const newTemplate = {
                id: Date.now(),
                name,
                components: JSON.parse(JSON.stringify(state.components))
            };
            state.templates.push(newTemplate);
            saveState();
            renderTemplates();
            closeModal();
        }
    });
    
    cancelSaveButton.addEventListener('click', closeModal);
    saveTemplateModal.addEventListener('click', (e) => {
        if (e.target === saveTemplateModal) {
            closeModal();
        }
    });
    
    function closeModal() {
        saveTemplateForm.reset();
        saveTemplateModal.hidden = true;
    }

    // --- UTILS ---
    function escapeHTML(str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // --- INITIALIZATION ---
    function init() {
        loadState();
        render();
    }
    
    init();
});
