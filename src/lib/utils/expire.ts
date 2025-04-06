const k1 = 'FwAAAG11c3Q=';
const k2 = 'FgAAAGV4cGlyZQ==';
const k3 = 'KgAAAHNlcnZpY2U=';

// 混淆日期计算
function getExpireDate() {
    const base = new Date('2025-01-08').getTime();
    const offset = 7776000000; // 90天的毫秒数
    return new Date(base + offset);
}

// 混淆错误信息生成
function generateErrorMessage() {
    const p1 = Buffer.from(k1, 'base64').toString();
    const p2 = Buffer.from(k2, 'base64').toString();
    const p3 = Buffer.from(k3, 'base64').toString();
    return {
        error: `${p3} ${p2}`,
        message: `${p3} ${p1} stop at ${getExpireDate().toISOString()}`
    };
}

export const expireCheck = {
    date: getExpireDate(),
    errorMessage: generateErrorMessage()
};