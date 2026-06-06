/**
 * 数据库功能验证脚本
 * 在浏览器控制台运行此脚本来验证数据提交功能
 */
async function verifyDatabase() {
  console.log('🧪 开始验证数据库功能...')
  
  try {
    // 1. 导入数据库
    const { db } = await import('/src/lib/db.ts')
    console.log('✅ 数据库导入成功:', db.name)
    
    // 2. 清空数据库
    await db.records.clear()
    console.log('✅ 数据库已清空')
    
    // 3. 创建测试记录 - 处方
    console.log('\n📝 创建测试处方记录...')
    const prescriptionId = await db.records.add({
      schema_version: 'v1',
      timestamp: new Date(),
      type: '处方',
      items: [
        { name: '阿莫西林胶囊', qty: 2, price: 15.5 },
        { name: '布洛芬缓释胶囊', qty: 1, price: 28.0 }
      ],
      total: 59.0,
      patientName: '张三',
      doctorName: '李医生'
    })
    console.log('✅ 处方记录创建成功，ID:', prescriptionId)
    
    // 4. 创建测试记录 - 小票
    console.log('\n📝 创建测试小票记录...')
    const receiptId = await db.records.add({
      schema_version: 'v1',
      timestamp: new Date(),
      type: '小票',
      items: [
        { name: '维生素C', qty: 3, price: 12.0 }
      ],
      total: 36.0,
      storeName: '康佰家大药房'
    })
    console.log('✅ 小票记录创建成功，ID:', receiptId)
    
    // 5. 查询所有记录
    console.log('\n📋 查询所有记录...')
    const allRecords = await db.records.toArray()
    console.log(`✅ 共找到 ${allRecords.length} 条记录:`)
    allRecords.forEach((record, index) => {
      console.log(`  [${index + 1}] 类型:${record.type} | 金额:¥${record.total} | ${record.patientName || record.storeName} | 时间:${new Date(record.timestamp).toLocaleString('zh-CN')}`)
    })
    
    // 6. 按类型查询
    console.log('\n🔍 按类型查询处方记录...')
    const prescriptions = await db.records.where('type').equals('处方').toArray()
    console.log(`✅ 找到 ${prescriptions.length} 条处方记录`)
    
    // 7. 计算今日统计
    console.log('\n📊 计算今日统计...')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayRecords = allRecords.filter(record => {
      const timestamp = new Date(record.timestamp)
      return timestamp >= today && timestamp < tomorrow
    })
    
    const totalAmount = todayRecords.reduce((sum, record) => sum + record.total, 0)
    const prescriptionCount = todayRecords.filter(record => record.type === '处方').length
    
    console.log(`✅ 今日总金额: ¥${totalAmount.toFixed(2)}`)
    console.log(`✅ 今日处方数: ${prescriptionCount}`)
    
    // 8. 测试更新
    console.log('\n✏️ 测试更新记录...')
    await db.records.update(prescriptionId, { total: 60.0 })
    const updated = await db.records.get(prescriptionId)
    console.log(`✅ 更新后金额: ¥${updated?.total}`)
    
    // 9. 测试删除
    console.log('\n🗑️ 测试删除记录...')
    await db.records.delete(receiptId)
    const afterDelete = await db.records.toArray()
    console.log(`✅ 删除后剩余 ${afterDelete.length} 条记录`)
    
    console.log('\n🎉 所有数据库功能验证通过！')
    
    return {
      success: true,
      totalRecords: allRecords.length,
      todayAmount: totalAmount,
      todayCount: prescriptionCount
    }
  } catch (error) {
    console.error('❌ 验证失败:', error)
    return { success: false, error }
  }
}

// 导出验证函数
console.log('💡 提示：在控制台运行 verifyDatabase() 来执行验证')
window.verifyDatabase = verifyDatabase
