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

// Cookie/LocalStorage Consent System

window.addEventListener('DOMContentLoaded', () => {
    checkCookieConsent();
});

function checkCookieConsent() {
    const consent = localStorage.getItem('svgEditor_cookieAllowed');
    if (consent !== 'true') {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.style.display = 'flex';
        }
    }
}

window.acceptCookies = function() {
    localStorage.setItem('svgEditor_cookieAllowed', 'true');
    hideCookieBanner();
};

function hideCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.style.display = 'none';
    }
}

// (開発用リセット)
window.resetCookieConsent = function() {
    localStorage.removeItem('svgEditor_cookieAllowed');
    location.reload();
};