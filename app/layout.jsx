import './globals.css'

export const metadata = {
  title: '멜론티켓 모니터',
  description: '멜론티켓 공연 티켓을 자동으로 모니터링하고 Discord로 알림을 받아요',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
