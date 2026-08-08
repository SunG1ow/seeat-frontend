import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// 각 테스트 뒤에 렌더된 DOM을 정리한다 (컴포넌트가 unmount되며 CategoryList의
// AbortController cleanup도 함께 실행돼, 다음 테스트로 상태가 새지 않는다).
afterEach(() => {
  cleanup()
})
