// main.js - グローバル設定と初期化

const svgNS = "http://www.w3.org/2000/svg";

window.selectedElement = null;
window.isInspectMode = false;
window.hoveredElement = null;
window.mainSvg = null; 
window.svgWrapper = null;
window.layerList = null;
window.propContainer = null;

async function loadComponent(id, file) {
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        document.getElementById(id).innerHTML = html;
    } catch (e) {
        console.error("Component load failed:", e);
        document.getElementById(id).innerHTML = `<p style="color:red; padding:10px;">Load Error: ${file}<br>※ローカルサーバーで実行してください</p>`;
    }
}

window.onload = async function() {
    window.mainSvg = document.getElementById('main-svg');
    window.svgWrapper = document.getElementById('svg-wrapper');
    
    await loadComponent('layer-container', 'layer.html');
    await loadComponent('tool-container', 'tool.html');

    window.layerList = document.getElementById('layer-list');
    window.propContainer = document.getElementById('properties-container');

    setupCanvasEvents();
    if(window.refreshLayerList) window.refreshLayerList();
    
    // 初期状態でキャンバス設定を表示
    if(window.selectElement) window.selectElement(null);
};

window.toggleInspectMode = function() {
    window.isInspectMode = !window.isInspectMode;
    document.getElementById('inspect-btn').classList.toggle('active', window.isInspectMode);
    window.svgWrapper.classList.toggle('inspect-mode', window.isInspectMode);
    
    if (!window.isInspectMode && window.hoveredElement) {
        window.hoveredElement.classList.remove('hover-highlight');
        window.hoveredElement = null;
    }
};

function setupCanvasEvents() {
    const canvasArea = document.querySelector('.canvas-area');
    if (canvasArea) {
        canvasArea.addEventListener('click', function(e) {
            if (e.target === canvasArea || e.target.id === 'svg-wrapper') {
                window.selectElement(null); // 選択解除 -> キャンバス設定表示
            }
        });
    }

    window.svgWrapper.addEventListener('mouseover', function(e) {
        if (!window.isInspectMode) return;
        const target = e.target;
        if (target instanceof SVGElement && target !== window.mainSvg && target.tagName !== 'defs') {
            if (window.hoveredElement && window.hoveredElement !== target) {
                window.hoveredElement.classList.remove('hover-highlight');
            }
            target.classList.add('hover-highlight');
            window.hoveredElement = target;
        }
    });

    window.svgWrapper.addEventListener('mouseout', function(e) {
        if (!window.isInspectMode) return;
        if (e.target === window.hoveredElement) {
            e.target.classList.remove('hover-highlight');
            window.hoveredElement = null;
        }
    });

    window.svgWrapper.addEventListener('click', function(e) {
        if (window.isInspectMode) {
            // インスペクトモード
            const target = e.target;
            if (target instanceof SVGElement && target !== window.mainSvg && target.tagName !== 'defs') {
                window.selectElement(target);
                window.toggleInspectMode();
                e.stopPropagation();
            }
        } else {
            // 通常モード
             if (e.target instanceof SVGElement && e.target !== window.mainSvg) {
                 window.selectElement(e.target);
                 e.stopPropagation(); 
             } else if (e.target === window.mainSvg) {
                 window.selectElement(null);
             }
        }
    });
}

// Panel Toggle System
window.addEventListener('DOMContentLoaded', () => {
    checkResponsiveMode();
});

window.addEventListener('resize', () => {
    // リサイズ時にもチェックしたい場合、ここを有効化
    // checkResponsiveMode();
});

function checkResponsiveMode() {
    const w = window.innerWidth;
    const leftPanel = document.getElementById('layer-container');
    const rightPanel = document.getElementById('tool-container');

    if (w <= 900) {
        if (leftPanel) leftPanel.classList.add('closed');
        if (rightPanel) rightPanel.classList.add('closed');
        
        updateToggleButtons();
    }
}

window.togglePanel = function(side) {
    const leftPanel = document.getElementById('layer-container');
    const rightPanel = document.getElementById('tool-container');
    const w = window.innerWidth;
    const isMobile = w <= 900;

    if (side === 'left' && leftPanel) {
        const isClosing = !leftPanel.classList.contains('closed');
        leftPanel.classList.toggle('closed');

        if (isMobile && !isClosing && rightPanel) {
            rightPanel.classList.add('closed');
        }
    } else if (side === 'right' && rightPanel) {
        const isClosing = !rightPanel.classList.contains('closed');
        rightPanel.classList.toggle('closed');
        
        if (isMobile && !isClosing && leftPanel) {
            leftPanel.classList.add('closed');
        }
    }
    
    updateToggleButtons();
};

function updateToggleButtons() {
    const leftPanel = document.getElementById('layer-container');
    const rightPanel = document.getElementById('tool-container');
    const leftBtn = document.getElementById('toggle-layer-btn');
    const rightBtn = document.getElementById('toggle-prop-btn');

    if(leftPanel && leftBtn) {
        if(!leftPanel.classList.contains('closed')) leftBtn.classList.add('active');
        else leftBtn.classList.remove('active');
    }
    if(rightPanel && rightBtn) {
        if(!rightPanel.classList.contains('closed')) rightBtn.classList.add('active');
        else rightBtn.classList.remove('active');
    }
}

//  System Initialization and Consent Management

window.addEventListener('DOMContentLoaded', () => {
    checkSystemConsent();
});

function checkSystemConsent() {
    const consent = localStorage.getItem('svgEditor_cookieAllowed');
    if (consent === 'true') {
        const overlay = document.getElementById('sys-init-lock');
        if (overlay) {
            overlay.classList.add('unlocked');
        }
    }
}

window.unlockSystem = function() {
    try {
        localStorage.setItem('svgEditor_cookieAllowed', 'true');
        
        const overlay = document.getElementById('sys-init-lock');
        if (overlay) {
            overlay.classList.add('unlocked');
        }
    } catch (e) {
        alert("ストレージへの書き込みに失敗しました。");
    }
};

window.resetSystemConsent = function() {
    localStorage.removeItem('svgEditor_cookieAllowed');
    location.reload();
};