export async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          let width = img.width
          let height = img.height
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }
          
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)
          
          const mimeType = file.type || 'image/jpeg'
          const base64String = canvas.toDataURL(mimeType, quality)
          
          resolve(base64String)
        } catch (err) {
          reject(err instanceof Error ? err : new Error('图片压缩失败'))
        }
      }
      
      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }
      
      img.src = event.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsDataURL(file)
  })
}
