'use client'

import { useState, useEffect } from 'react'
import { useDatabaseRecords } from '@/hooks/useDatabase'

export default function OCRTestPage() {
  const { records, state: recordsState } = useDatabaseRecords()
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  return (
    <div style={{ 
      backgroundColor: '#121212', 
      minHeight: '100vh', 
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '24px',
      color: '#fff'
    }}>
      <h1 style={{ color: '#00F0FF', marginBottom: '24px' }}>OCR数据测试页面</h1>
      
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#9ca3af', marginBottom: '16px' }}>数据库记录列表</h2>
        {recordsState.status === 'loading' ? (
          <p style={{ color: '#6b7280' }}>加载中...</p>
        ) : records.length === 0 ? (
          <p style={{ color: '#6b7280' }}>暂无记录</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {records.map(record => (
              <div 
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                style={{
                  backgroundColor: 'rgba(26, 26, 26, 0.8)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #333',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 'medium' }}>
                      {record.patientName || record.storeName || '未命名记录'}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#00F0FF', fontWeight: 'bold' }}>¥{record.total.toFixed(2)}</p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                      {record.type} · {record.items.length}项
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    backgroundColor: record.attachment_base64 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                    color: record.attachment_base64 ? '#10b981' : '#6b7280',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}>
                    {record.attachment_base64 ? '✓ 有图片' : '✗ 无图片'}
                  </span>
                  {record.attachment_base64 && (
                    <span style={{ 
                      backgroundColor: 'rgba(0, 240, 255, 0.1)',
                      color: '#00F0FF',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      {(record.attachment_base64.length / 1024).toFixed(2)} KB
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(0, 240, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#00F0FF', margin: 0 }}>记录详情</h2>
              <button 
                onClick={() => setSelectedRecord(null)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>类型</p>
              <p style={{ color: '#fff' }}>{selectedRecord.type}</p>
            </div>

            {selectedRecord.patientName && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>患者姓名</p>
                <p style={{ color: '#fff' }}>{selectedRecord.patientName}</p>
              </div>
            )}

            {selectedRecord.doctorName && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>医生姓名</p>
                <p style={{ color: '#fff' }}>{selectedRecord.doctorName}</p>
              </div>
            )}

            {selectedRecord.storeName && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>药店名称</p>
                <p style={{ color: '#fff' }}>{selectedRecord.storeName}</p>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>药品明细</p>
              <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '12px' }}>
                {selectedRecord.items.map((item: any, index: number) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: index < selectedRecord.items.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                  }}>
                    <span style={{ color: '#fff' }}>{item.name}</span>
                    <span style={{ color: '#00F0FF' }}>
                      {item.qty} × ¥{item.price.toFixed(2)} = ¥{(item.qty * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>总金额</p>
              <p style={{ color: '#00F0FF', fontSize: '24px', fontWeight: 'bold' }}>¥{selectedRecord.total.toFixed(2)}</p>
            </div>

            {selectedRecord.attachment_base64 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>附件图片</p>
                <img 
                  src={selectedRecord.attachment_base64} 
                  alt="附件"
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
                <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>
                  图片大小: {(selectedRecord.attachment_base64.length / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>创建时间</p>
              <p style={{ color: '#fff' }}>{new Date(selectedRecord.timestamp).toLocaleString('zh-CN')}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>Schema版本</p>
              <p style={{ color: '#fff' }}>{selectedRecord.schema_version}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}