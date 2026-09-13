"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fibonacci = fibonacci;
// 用于手动测试“解释代码 / 生成注释”的示例片段。
function fibonacci(n) {
    const result = [];
    let a = 0;
    let b = 1;
    for (let i = 0; i < n; i++) {
        result.push(a);
        const next = a + b;
        a = b;
        b = next;
    }
    return result;
}
console.log(fibonacci(10));
//# sourceMappingURL=sample.js.map