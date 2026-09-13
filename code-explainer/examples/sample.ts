// 用于手动测试“解释代码 / 生成注释”的示例片段。
export function fibonacci(n: number): number[] {
  const result: number[] = [];
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