import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '处方镜 RxLens - 智能处方管理系统',
  description: '赛博医疗级智能处方扫描与台账管理工具，支持OCR识别、离线存储与云端同步',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '处方镜 RxLens',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#121212',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

// 动态导入应用锁组件，避免服务端渲染问题
import dynamic from 'next/dynamic'
const AppLayout = dynamic(() => import('@/components/AppLayout'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #00F0FF',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} min-h-screen`} style={{ backgroundColor: '#121212', color: '#ffffff' }}>
        <AppLayout>
          {children}
        </AppLayout>
        {/* PWA Service Worker Registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('RxLens SW registered:', registration.scope);
                  },
                  function(err) {
                    console.log('RxLens SW registration failed:', err);
                  }
                );
              });
            }
          `
        }} />
      </body>
    </html>
  )
}
