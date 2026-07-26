import './App.css'

const TOKEN_SWATCHES = [
  { name: 'Primary', code: '#0B2F61', bg: 'var(--color-primary)' },
  { name: 'Secondary', code: '#00A3C4', bg: 'var(--color-secondary)' },
  { name: 'Accent', code: '#FF5C35', bg: 'var(--color-accent)' },
  { name: 'Seller Theme', code: '#47230F', bg: 'var(--color-seller-theme)' },
]

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container">
          <span className="logo-dot" />
          <span className="fs-title2">SEEAT</span>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <h1 className="fs-title1">Global CSS 설정 완료</h1>
          <p className="fs-body2" style={{ color: 'var(--color-text-muted)' }}>
            디자인 초기안 v1.4 §4.1 스타일 가이드 기준 컬러 팔레트 · Noto Sans KR · 1280px 최소 해상도 레이아웃
          </p>

          <div className="token-swatches">
            {TOKEN_SWATCHES.map((token) => (
              <div className="token-swatch" key={token.name}>
                <div className="chip" style={{ background: token.bg }} />
                <div className="label">
                  <div className="name fs-body2">{token.name}</div>
                  <div className="code fs-caption mono">{token.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
