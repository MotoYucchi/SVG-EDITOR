// layer.js - レイヤー管理機能

let draggedElementId = null; 

// ID確保
function ensureId(el) {
    if (!el.id) {
        el.id = 'el-' + Math.random().toString(36).substr(2, 9);
    }
    return el.id;
}

// レイヤーリスト更新
window.refreshLayerList = function() {
    if(!window.layerList) return;
    window.layerList.innerHTML = '';
    
    // 再取得
    window.mainSvg = document.getElementById('main-svg');
    if(window.mainSvg) {
        traverseSVG(window.mainSvg, 0);
    }
};

function traverseSVG(element, depth) {
    Array.from(element.children).forEach(child => {
        if (child.tagName === 'defs') return;

        const li = document.createElement('li');
        li.className = 'layer-item';
        li.draggable = true;
        ensureId(child);
        li.dataset.targetId = child.id;

        if (child === window.selectedElement) li.classList.add('active');
        
        // Drag Events
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('dragleave', handleDragLeave);
        li.addEventListener('drop', handleDrop);
        
        // Indent
        let indentStr = '';
        for(let i=0; i<depth; i++) indentStr += '<span class="layer-indent"></span>';
        
        // Visibility
        const isHidden = child.style.display === 'none' || child.getAttribute('display') === 'none';
        const eyeIcon = isHidden ? '🙈' : '👁️';
        const visBtn = document.createElement('button');
        visBtn.className = 'visibility-btn';
        visBtn.innerHTML = eyeIcon;
        visBtn.onclick = (e) => {
            e.stopPropagation();
            toggleVisibility(child);
        };

        // Name
        let name = child.tagName;
        if (child.id && !child.id.startsWith('el-')) name += ` #${child.id}`;
        const labelSpan = document.createElement('span');
        labelSpan.innerHTML = `${getIcon(child.tagName)} ${name}`;

        li.appendChild(visBtn);
        li.insertAdjacentHTML('beforeend', indentStr);
        li.appendChild(labelSpan);
        
        li.onclick = (e) => {
            e.stopPropagation();
            window.selectElement(child);
        };

        window.layerList.appendChild(li);

        if (child.tagName === 'g' || child.tagName === 'svg') {
            traverseSVG(child, depth + 1);
        }
    });
}

function getIcon(tagName) {
    const icons = {
        'rect': '🟥', 'circle': '⚫', 'path': '✒️', 'text': 'Tt', 'image': '🖼️', 'g': '📁'
    };
    return icons[tagName] || '🔹';
}

function toggleVisibility(el) {
    const current = el.style.display === 'none' || el.getAttribute('display') === 'none';
    if (current) {
        el.style.display = '';
        el.removeAttribute('display');
    } else {
        el.style.display = 'none';
    }
    window.refreshLayerList();
}

window.updateLayerListHighlight = function() {
    if(!window.layerList) return;
    const items = window.layerList.querySelectorAll('.layer-item');
    items.forEach(item => item.classList.remove('active'));
    if(!window.selectedElement) return;
    
    ensureId(window.selectedElement);
    const targetItem = Array.from(items).find(li => li.dataset.targetId === window.selectedElement.id);
    if(targetItem) {
        targetItem.classList.add('active');
        targetItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
};

// D&D Logic
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.targetId);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
    draggedElementId = e.currentTarget.dataset.targetId;
}

function handleDragOver(e) {
    e.preventDefault();
    const li = e.currentTarget;
    const targetId = li.dataset.targetId;
    if (targetId === draggedElementId) return;

    const rect = li.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const height = rect.height;
    
    li.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');

    const targetEl = document.getElementById(targetId);
    const isGroup = targetEl.tagName === 'g' || targetEl.tagName === 'svg';

    if (isGroup && offset > height * 0.25 && offset < height * 0.75) {
        li.classList.add('drag-over-center');
    } else if (offset < height * 0.5) {
        li.classList.add('drag-over-top');
    } else {
        li.classList.add('drag-over-bottom');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const li = e.currentTarget;
    li.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center', 'dragging');
    
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedEl = document.getElementById(draggedId);
    const targetId = li.dataset.targetId;
    const targetEl = document.getElementById(targetId);

    if (!draggedEl || !targetEl || draggedEl === targetEl) return;
    if (draggedEl.contains(targetEl)) return;

    const rect = li.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const height = rect.height;
    const isGroup = targetEl.tagName === 'g' || targetEl.tagName === 'svg';

    if (isGroup && offset > height * 0.25 && offset < height * 0.75) {
        targetEl.appendChild(draggedEl);
    } else if (offset < height * 0.5) {
        targetEl.parentNode.insertBefore(draggedEl, targetEl);
    } else {
        targetEl.parentNode.insertBefore(draggedEl, targetEl.nextSibling);
    }

    window.refreshLayerList();
    window.selectElement(draggedEl);
}

// Root Drop Zone
window.handleDragOverRoot = function(e) {
    e.preventDefault();
};
window.handleDropRoot = function(e) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedEl = document.getElementById(draggedId);
    window.mainSvg = document.getElementById('main-svg');
    
    if (draggedEl && draggedEl.parentNode !== window.mainSvg) {
        window.mainSvg.appendChild(draggedEl);
        window.refreshLayerList();
        window.selectElement(draggedEl);
    }
};