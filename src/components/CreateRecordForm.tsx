'use client'
import { useState } from 'react'
import { Plus, X, FileText, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MedicineItem {
  name: string
  quantity: string
  price: string
}

interface FormData {
  type: 'prescription' | 'receipt'
  patientName: string
  doctorName: string
  storeName: string
  items: MedicineItem[]
}

interface CreateRecordFormProps {
  onSubmit: (data: FormData) => void
}

export function CreateRecordForm({ onSubmit }: CreateRecordFormProps) {
  const [formData, setFormData] = useState<FormData>({
    type: 'prescription',
    patientName: '',
    doctorName: '',
    storeName: '',
    items: [{ name: '', quantity: '', price: '' }],
  })

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: '', price: '' }],
    }))
  }

  const handleRemoveItem = (index: number) => {
    if (formData.items.length === 1) return
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const handleItemChange = (index: number, field: keyof MedicineItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      type: 'prescription',
      patientName: '',
      doctorName: '',
      storeName: '',
      items: [{ name: '', quantity: '', price: '' }],
    })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0
      const price = parseFloat(item.price) || 0
      return sum + quantity * price
    }, 0).toFixed(2)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, type: 'prescription' }))}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300',
            'border-2',
            formData.type === 'prescription'
              ? 'bg-accent/10 border-accent text-accent font-medium shadow-lg shadow-accent/20'
              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
          )}
        >
          <FileText className="w-5 h-5" />
          <span>处方</span>
        </button>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, type: 'receipt' }))}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300',
            'border-2',
            formData.type === 'receipt'
              ? 'bg-accent/10 border-accent text-accent font-medium shadow-lg shadow-accent/20'
              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
          )}
        >
          <Store className="w-5 h-5" />
          <span>小票</span>
        </button>
      </div>

      {formData.type === 'prescription' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">患者姓名</label>
            <input
              type="text"
              value={formData.patientName}
              onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
              className={cn(
                'w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3',
                'focus:outline-none focus:border-accent focus:shadow-lg focus:shadow-accent/20',
                'transition-all duration-300 text-white placeholder-gray-500'
              )}
              placeholder="请输入患者姓名"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">医生姓名</label>
            <input
              type="text"
              value={formData.doctorName}
              onChange={e => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
              className={cn(
                'w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3',
                'focus:outline-none focus:border-accent focus:shadow-lg focus:shadow-accent/20',
                'transition-all duration-300 text-white placeholder-gray-500'
              )}
              placeholder="请输入医生姓名"
              required
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">药店名称</label>
          <input
            type="text"
            value={formData.storeName}
            onChange={e => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
            className={cn(
              'w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3',
              'focus:outline-none focus:border-accent focus:shadow-lg focus:shadow-accent/20',
              'transition-all duration-300 text-white placeholder-gray-500'
            )}
            placeholder="请输入药店名称"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">药品清单</label>
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="flex gap-3 items-center">
              <input
                type="text"
                value={item.name}
                onChange={e => handleItemChange(index, 'name', e.target.value)}
                className={cn(
                  'flex-1 bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3',
                  'focus:outline-none focus:border-accent focus:shadow-lg focus:shadow-accent/20',
                  'transition-all duration-300 text-white placeholder-gray-500'
                )}
                placeholder="药品名称"
                required
              />
              <input
                type="number"
                value={item.quantity}
                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                className={cn(
                  'w-20 bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3',
                  'focus:outline-none focus:border-accent focus:shadow-lg focus:shadow-accent/20',
                  'transition-all duration-300 text-white placeholder-gray-500'
                )}
                placeholder="数量"
                min="1"
                required
              />
              <input
                type="number"
                value={item.price}
                onChange={e => handleItemChange(index, 'price', e.target.value)}
                className={cn(
                  'w-28 bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3',
                  'focus:outline-none focus:border-accent focus:shadow-lg focus:shadow-accent/20',
                  'transition-all duration-300 text-white placeholder-gray-500'
                )}
                placeholder="单价"
                min="0"
                step="0.01"
                required
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                disabled={formData.items.length === 1}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                  formData.items.length === 1
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 border border-red-500/20'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className={cn(
            'mt-3 flex items-center gap-2 px-4 py-2 rounded-xl',
            'bg-gray-800/50 border border-gray-700 text-accent',
            'hover:border-accent hover:bg-accent/5 transition-all duration-300'
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">添加药品</span>
        </button>
      </div>

      <div className="flex items-center justify-between py-4 px-1 border-t border-gray-700">
        <span className="text-gray-400 font-medium">合计金额</span>
        <div className="flex items-center gap-1">
          <span className="text-accent text-lg">¥</span>
          <span className="text-3xl font-bold text-accent">{calculateTotal()}</span>
        </div>
      </div>

      <button
        type="submit"
        className={cn(
          'w-full py-4 rounded-xl font-semibold text-background',
          'bg-gradient-to-r from-accent to-accentDark',
          'hover:shadow-lg hover:shadow-accent/30',
          'transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]'
        )}
      >
        确认录入
      </button>
    </form>
  )
}
