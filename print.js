// print.js - 印刷システム制御

window.printSVG = function() {
    const mainSvg = document.getElementById('main-svg');
    if (!mainSvg) {
        alert("印刷対象のSVGが見つかりません。");
        return;
    }

    window.print();

};