/**
 * 金额校验逻辑快速测试脚本
 * 在浏览器控制台运行此脚本来验证校验算法
 */

// 校验函数（与组件中的逻辑一致）
function isAmountMismatch(quantity: number, price: number, amount: number): boolean {
  const expected = Math.round(quantity * price * 100) / 100
  return Math.abs(amount - expected) > 0.01
}

// 测试用例
const testCases = [
  { name: '正常场景', quantity: 2, price: 15.5, amount: 31.0, expected: false },
  { name: '金额偏少', quantity: 2, price: 15.5, amount: 30.0, expected: true },
  { name: '金额偏多', quantity: 2, price: 15.5, amount: 32.0, expected: true },
  { name: '小数精度差异', quantity: 3, price: 5.225, amount: 15.67, expected: true },
  { name: '数量为0', quantity: 0, price: 15.5, amount: 0, expected: false },
  { name: '单价为0', quantity: 2, price: 0, amount: 0, expected: false },
  { name: '极端差异', quantity: 10, price: 10.0, amount: 0.01, expected: true },
  { name: '边界值测试', quantity: 1, price: 100.01, amount: 100.02, expected: true },
  { name: '边界值可接受', quantity: 1, price: 100.005, amount: 100.00, expected: false },
  { name: '多行场景-正常', quantity: 2, price: 15.5, amount: 31.0, expected: false },
  { name: '多行场景-警告', quantity: 1, price: 28.0, amount: 27.5, expected: true }
]

// 运行测试
function runValidationTests() {
  console.log('🧪 开始金额校验逻辑测试...\n')
  
  let passed = 0
  let failed = 0
  
  testCases.forEach((testCase, index) => {
    const result = isAmountMismatch(testCase.quantity, testCase.price, testCase.amount)
    const expected = testCase.expected
    const success = result === expected
    
    if (success) {
      passed++
      console.log(`✅ 测试 #${index + 1}: ${testCase.name}`)
    } else {
      failed++
      console.log(`❌ 测试 #${index + 1}: ${testCase.name}`)
      console.log(`   数量: ${testCase.quantity}, 单价: ${testCase.price}, 金额: ${testCase.amount}`)
      console.log(`   预期: ${expected ? '警告' : '正常'}, 实际: ${result ? '警告' : '正常'}`)
    }
  })
  
  console.log(`\n📊 测试结果: ${passed}/${testCases.length} 通过`)
  console.log(`   ✅ 通过: ${passed}`)
  console.log(`   ❌ 失败: ${failed}`)
  
  return { passed, failed, total: testCases.length }
}

// 详细测试单个用例
function testSingleCase(quantity: number, price: number, amount: number) {
  const expected = Math.round(quantity * price * 100) / 100
  const mismatch = isAmountMismatch(quantity, price, amount)
  const diff = Math.abs(amount - expected)
  
  console.log('📝 单个用例测试:')
  console.log(`   数量: ${quantity}`)
  console.log(`   单价: ${price}`)
  console.log(`   金额: ${amount}`)
  console.log(`   计算值: ${expected}`)
  console.log(`   差异: ${diff}`)
  console.log(`   结果: ${mismatch ? '⚠️ 警告' : '✅ 正常'}`)
  
  return { expected, mismatch, diff }
}

// 边界值测试
function testBoundaryValues() {
  console.log('🎯 边界值测试...\n')
  
  const boundaryTests = [
    { name: '差异 = 0.009 (应该正常)', diff: 0.009, expected: false },
    { name: '差异 = 0.01 (应该正常)', diff: 0.01, expected: false },
    { name: '差异 = 0.0101 (应该警告)', diff: 0.0101, expected: true },
    { name: '差异 = 0.011 (应该警告)', diff: 0.011, expected: true },
    { name: '差异 = 0.1 (应该警告)', diff: 0.1, expected: true },
    { name: '差异 = 1.0 (应该警告)', diff: 1.0, expected: true }
  ]
  
  boundaryTests.forEach(test => {
    const result = test.diff > 0.01
    const success = result === test.expected
    const icon = success ? '✅' : '❌'
    console.log(`${icon} ${test.name}: ${result ? '警告' : '正常'}`)
  })
}

// 导出函数
console.log('💡 提示: 运行以下命令进行测试:')
console.log('   runValidationTests()  - 运行所有测试用例')
console.log('   testSingleCase(2, 15.5, 31.0)  - 测试单个用例')
console.log('   testBoundaryValues()  - 测试边界值\n')

window.runValidationTests = runValidationTests
window.testSingleCase = testSingleCase
window.testBoundaryValues = testBoundaryValues