// tool.js - ツール・プロパティ機能

// 要素選択処理
window.selectElement = function(el) {
    if (window.selectedElement) window.selectedElement.classList.remove('selected-element-outline');
    
    window.selectedElement = el;

    if (window.selectedElement) {
        window.selectedElement.classList.add('selected-element-outline');
        renderProperties(window.selectedElement);
    } else {
        renderCanvasProperties();
    }
    
    if(window.updateLayerListHighlight) window.updateLayerListHighlight();
};

// キャンバスのプロパティ描画
function renderCanvasProperties() {
    if(!window.propContainer) return;
    window.mainSvg = document.getElementById('main-svg');
    if(!window.mainSvg) return;

    window.propContainer.innerHTML = '';
    
    const width = window.mainSvg.getAttribute('width') || '600';
    const height = window.mainSvg.getAttribute('height') || '400';
    const viewBox = window.mainSvg.getAttribute('viewBox') || `0 0 ${width} ${height}`;

    // タイトル
    const title = document.createElement('div');
    title.className = 'panel-header';
    title.style.background = 'transparent';
    title.style.padding = '0 0 10px 0';
    title.innerText = 'Canvas Settings (用紙設定)';
    window.propContainer.appendChild(title);

    // Width Input
    const wGroup = document.createElement('div');
    wGroup.className = 'property-group';
    wGroup.innerHTML = `
        <label>Width (px)</label>
        <input type="number" value="${width}" oninput="window.updateCanvasSize('width', this.value)">
    `;
    window.propContainer.appendChild(wGroup);

    // Height Input
    const hGroup = document.createElement('div');
    hGroup.className = 'property-group';
    hGroup.innerHTML = `
        <label>Height (px)</label>
        <input type="number" value="${height}" oninput="window.updateCanvasSize('height', this.value)">
    `;
    window.propContainer.appendChild(hGroup);

    // ViewBox Info
    const vGroup = document.createElement('div');
    vGroup.className = 'property-group';
    vGroup.innerHTML = `
        <label>ViewBox (自動設定)</label>
        <input type="text" value="${viewBox}" disabled style="opacity:0.5;">
    `;
    window.propContainer.appendChild(vGroup);
    
    // 背景色変更機能
    const bgGroup = document.createElement('div');
    bgGroup.className = 'property-group';
    // 現在の背景色を取得
    let currentBg = window.mainSvg.style.background || '#ffffff';
    if(currentBg.indexOf('rgb') > -1) currentBg = '#ffffff'; 
    
    bgGroup.innerHTML = `
        <label>Background Color</label>
        <input type="color" value="${currentBg}" oninput="window.updateCanvasBg(this.value)">
    `;
    window.propContainer.appendChild(bgGroup);
}

// キャンバスサイズ更新ロジック
window.updateCanvasSize = function(attr, value) {
    window.mainSvg = document.getElementById('main-svg');
    if(!window.mainSvg) return;

    // width / height 属性を更新
    window.mainSvg.setAttribute(attr, value);

    const w = window.mainSvg.getAttribute('width');
    const h = window.mainSvg.getAttribute('height');
    window.mainSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    
    renderCanvasProperties();
};

window.updateCanvasBg = function(color) {
    window.mainSvg = document.getElementById('main-svg');
    if(window.mainSvg) {
        window.mainSvg.style.background = color;
    }
};


function renderProperties(el) {
    if(!window.propContainer) return;
    window.propContainer.innerHTML = '';
    const tagName = el.tagName;
    
    addInput(el, 'id', 'text', 'ID');

    // Group Transform
    if (tagName === 'g') {
        const currentTransform = el.getAttribute('transform') || '';
        const translateMatch = currentTransform.match(/translate\(\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)\s*\)/);
        const tx = translateMatch ? translateMatch[1] : 0;
        const ty = translateMatch ? translateMatch[2] : 0;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'property-group';
        groupDiv.innerHTML = `
            <label>Position (Translate)</label>
            <div style="display:flex; gap:5px;">
                <input type="number" placeholder="X" value="${tx}" oninput="window.updateGroupTransform('x', this.value)">
                <input type="number" placeholder="Y" value="${ty}" oninput="window.updateGroupTransform('y', this.value)">
            </div>
            <small style="color:#666;">※Raw transform: ${currentTransform}</small>
        `;
        window.propContainer.appendChild(groupDiv);
    } else {
        addInput(el, 'transform', 'text', 'Transform');
    }
    
    if (tagName !== 'g' && tagName !== 'image') {
        addInput(el, 'fill', 'color', 'Fill Color');
        addInput(el, 'stroke', 'color', 'Stroke Color');
        addInput(el, 'stroke-width', 'number', 'Stroke Width');
    }

    if (tagName === 'rect') {
        addInput(el, 'x', 'number', 'X');
        addInput(el, 'y', 'number', 'Y');
        addInput(el, 'width', 'number', 'Width');
        addInput(el, 'height', 'number', 'Height');
    } else if (tagName === 'text') {
        addInput(el, 'x', 'number', 'X');
        addInput(el, 'y', 'number', 'Y');
        addInput(el, 'font-size', 'number', 'Font Size');
        const group = document.createElement('div');
        group.className = 'property-group';
        group.innerHTML = `<label>Content</label><input type="text" value="${el.textContent}" oninput="window.updateTextContent(this.value)">`;
        window.propContainer.appendChild(group);
    } else if (tagName === 'path') {
        addInput(el, 'd', 'textarea', 'Path Data (d)');
    } else if (tagName === 'image') {
        addInput(el, 'x', 'number', 'X');
        addInput(el, 'y', 'number', 'Y');
        addInput(el, 'width', 'number', 'Width');
        addInput(el, 'height', 'number', 'Height');
        const btnGroup = document.createElement('div');
        btnGroup.className = 'property-group';
        btnGroup.innerHTML = `<button onclick="triggerImageUpload()">画像を入れ替える</button>`;
        window.propContainer.appendChild(btnGroup);
    }

    addRawCodeEditor(el);
}

function addRawCodeEditor(el) {
    const group = document.createElement('div');
    group.className = 'property-group';
    group.style.borderTop = "2px solid #555"; 
    group.style.marginTop = "10px";

    let rawAttrs = "";
    for (const attr of el.attributes) {
        rawAttrs += `${attr.name}="${attr.value}" `;
    }

    const label = `<label style="color:#fff; font-weight:bold;">Raw Code Editor (&lt;${el.tagName} ... /&gt;)</label>`;
    const desc = `<div style="font-size:0.75rem; color:#888; margin-bottom:5px;">属性を直接編集できます。</div>`;
    const textarea = `<textarea class="code-editor" style="height:120px;" oninput="window.updateRawCode(this.value)">${rawAttrs.trim()}</textarea>`;

    group.innerHTML = `${label}${desc}${textarea}`;
    window.propContainer.appendChild(group);
}

function addInput(el, attr, type, label) {
    const group = document.createElement('div');
    group.className = 'property-group';
    let val = el.getAttribute(attr) || '';
    if (type === 'color' && !val) val = '#000000';

    let inputHtml = '';
    if (type === 'textarea') {
        inputHtml = `<textarea oninput="window.updateAttr('${attr}', this.value)">${val}</textarea>`;
    } else {
        inputHtml = `<input type="${type}" value="${val}" oninput="window.updateAttr('${attr}', this.value)">`;
    }

    group.innerHTML = `<label>${label}</label>${inputHtml}`;
    window.propContainer.appendChild(group);
}

window.updateAttr = function(attr, value) {
    if (!window.selectedElement) return;
    window.selectedElement.setAttribute(attr, value);
};

window.updateTextContent = function(value) {
    if (window.selectedElement && window.selectedElement.tagName === 'text') {
        window.selectedElement.textContent = value;
    }
};

window.updateGroupTransform = function(axis, val) {
    if (!window.selectedElement) return;
    let current = window.selectedElement.getAttribute('transform') || '';
    const regex = /translate\(\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)\s*\)/;
    const match = current.match(regex);
    
    let newX = 0, newY = 0;
    if (match) {
        newX = match[1];
        newY = match[2];
    }
    if (axis === 'x') newX = val;
    if (axis === 'y') newY = val;
    const newTranslate = `translate(${newX}, ${newY})`;

    if (match) {
        window.selectedElement.setAttribute('transform', current.replace(regex, newTranslate));
    } else {
        window.selectedElement.setAttribute('transform', `${newTranslate} ${current}`);
    }
};

window.updateRawCode = function(rawString) {
    if (!window.selectedElement) return;
    const parser = new DOMParser();
    const tagName = window.selectedElement.tagName;
    const mockMarkup = `<svg xmlns="http://www.w3.org/2000/svg"><${tagName} ${rawString} /></svg>`;
    const doc = parser.parseFromString(mockMarkup, "image/svg+xml");
    if (doc.querySelector("parsererror")) return; 
    const newEl = doc.documentElement.firstElementChild;
    if (!newEl) return;
    while (window.selectedElement.attributes.length > 0) {
        window.selectedElement.removeAttribute(window.selectedElement.attributes[0].name);
    }
    for (const attr of newEl.attributes) {
        window.selectedElement.setAttribute(attr.name, attr.value);
    }
};

window.addElement = function(type) {
    const newEl = document.createElementNS("http://www.w3.org/2000/svg", type);
    window.mainSvg = document.getElementById('main-svg');
    
    if (type === 'rect') {
        newEl.setAttribute('x', 10); newEl.setAttribute('y', 10);
        newEl.setAttribute('width', 50); newEl.setAttribute('height', 50);
        newEl.setAttribute('fill', '#007acc');
    } else if (type === 'text') {
        newEl.setAttribute('x', 20); newEl.setAttribute('y', 40);
        newEl.setAttribute('font-size', 20);
        newEl.setAttribute('fill', '#ffffff');
        newEl.textContent = 'New Text';
    } else if (type === 'path') {
        newEl.setAttribute('d', 'M 10 10 L 50 10 L 30 50 Z');
        newEl.setAttribute('fill', '#28a745');
    }

    let targetParent = window.mainSvg;
    if (window.selectedElement && window.selectedElement.tagName === 'g') {
        targetParent = window.selectedElement;
    } else if (window.selectedElement && window.selectedElement.parentNode) {
        targetParent = window.selectedElement.parentNode;
    }

    targetParent.appendChild(newEl);
    if(window.refreshLayerList) window.refreshLayerList();
    window.selectElement(newEl);
};

window.deleteSelected = function() {
    window.mainSvg = document.getElementById('main-svg');
    if (!window.selectedElement || window.selectedElement === window.mainSvg) return;
    window.selectedElement.remove();
    // 削除後は「選択なし＝キャンバス設定」に戻る
    window.selectElement(null);
    if(window.refreshLayerList) window.refreshLayerList();
};

window.triggerImageUpload = function() { document.getElementById('image-upload-input').click(); };

window.handleAddImage = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            window.mainSvg = document.getElementById('main-svg');
            
            if (window.selectedElement && window.selectedElement.tagName === 'image') {
                window.selectedElement.setAttribute('href', base64);
                renderProperties(window.selectedElement);
            } else {
                const img = document.createElementNS("http://www.w3.org/2000/svg", 'image');
                img.setAttribute('x', 0); img.setAttribute('y', 0);
                img.setAttribute('width', 100); img.setAttribute('height', 100);
                img.setAttribute('href', base64);
                
                let targetParent = window.mainSvg;
                if (window.selectedElement && window.selectedElement.tagName === 'g') targetParent = window.selectedElement;
                
                targetParent.appendChild(img);
                if(window.refreshLayerList) window.refreshLayerList();
                window.selectElement(img);
            }
            input.value = '';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.exportSVG = function() {
    window.mainSvg = document.getElementById('main-svg');
    const selection = window.mainSvg.querySelector('.selected-element-outline');
    if(selection) selection.classList.remove('selected-element-outline');
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(window.mainSvg);
    if(selection) selection.classList.add('selected-element-outline');
    
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    const blob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "edited_motoyucchi.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.loadSVG = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(e.target.result, "image/svg+xml");
            const newSvg = doc.documentElement;
            if (newSvg.tagName === "parsererror") {
                alert("読込エラー");
                return;
            }
            const wrapper = document.getElementById('svg-wrapper');
            wrapper.innerHTML = '';
            newSvg.id = "main-svg";
            if(!newSvg.getAttribute('viewBox') && newSvg.getAttribute('width')){
                newSvg.setAttribute('viewBox', `0 0 ${newSvg.getAttribute('width')} ${newSvg.getAttribute('height')}`);
            }
            wrapper.appendChild(newSvg);
            window.mainSvg = newSvg;
            window.selectElement(null);
            if(window.refreshLayerList) window.refreshLayerList();
        };
        reader.readAsText(input.files[0]);
    }
};