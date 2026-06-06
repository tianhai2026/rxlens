// 粒子特效工具函数
export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
}

export function createParticles(container: HTMLElement, color: string = '#00F0FF'): Particle[] {
  const rect = container.getBoundingClientRect()
  const particles: Particle[] = []
  const particleCount = Math.floor((rect.width * rect.height) / 1500)
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      id: i,
      x: rect.left + Math.random() * rect.width,
      y: rect.top + Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.8 + 0.2,
      color
    })
  }
  
  return particles
}

export function animateParticles(particles: Particle[], duration: number = 800): Promise<void> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '99999'
    document.body.appendChild(canvas)
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      document.body.removeChild(canvas)
      resolve()
      return
    }
    
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.scale(dpr, dpr)
    
    const startTime = performance.now()
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      
      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.15 // 重力效果
        particle.opacity = Math.max(0, 1 - progress)
        
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * (1 - progress * 0.5), 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.opacity
        ctx.fill()
        ctx.globalAlpha = 1
      })
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        document.body.removeChild(canvas)
        resolve()
      }
    }
    
    requestAnimationFrame(animate)
  })
}

// CountUp 动画工具
export function countUp(element: HTMLElement, targetValue: number, duration: number = 1000): void {
  const startValue = parseFloat(element.textContent?.replace(/[^0-9.]/g, '') || '0')
  const startTime = performance.now()
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 使用缓动函数
    const easeOut = 1 - Math.pow(1 - progress, 3)
    const currentValue = startValue + (targetValue - startValue) * easeOut
    
    element.textContent = `¥${currentValue.toFixed(2)}`
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  
  requestAnimationFrame(animate)
}

// 图表路径动画工具
export function animatePath(element: SVGPathElement, duration: number = 1000): void {
  const length = element.getTotalLength()
  element.style.strokeDasharray = `${length}`
  element.style.strokeDashoffset = `${length}`
  
  element.animate(
    [
      { strokeDashoffset: length },
      { strokeDashoffset: 0 }
    ],
    {
      duration,
      easing: 'easeOutCubic',
      fill: 'forwards'
    }
  )
}
