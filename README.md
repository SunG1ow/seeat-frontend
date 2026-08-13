# Seeat — 수산물 산지 위판 직거래 플랫폼 (Frontend)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-Private-lightgrey)]()

> 산지 어민(선장·소규모 어업인)과 소비자를 직접 연결하여, 수산물 위판장의 **경매 마감시간·잔여수량**을 실시간으로 노출하는 신선식품 직거래 플랫폼의 프론트엔드입니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요-project-overview)
2. [주요 기능](#2-주요-기능-key-features)
3. [기술 스택](#3-기술-스택-tech-stack)
4. [프로젝트 구조](#4-프로젝트-구조-directory-structure)
5. [시작하기](#5-시작하기-getting-started)
6. [기타 참고 사항](#6-기타-참고-사항-notes)

---

## 1. 프로젝트 개요 (Project Overview)

### 기획 의도 및 목적

**Seeat**은 수산물 유통 구조에서 발생하는 정보 비대칭 문제(산지 시세를 알 수 없는 소비자, 낮은 유통 마진을 감수해야 하는 소규모 어업인)를 해소하기 위해 기획된 **산지 직거래 커머스 플랫폼**입니다.

기존 수산물 위판장의 핵심 개념인 "마감시간까지 낙찰되지 않으면 상품이 소멸된다"는 긴장감과, "의무 위판 어종(고등어·참치·멸치 등)은 반드시 공영 위판장을 거쳐야 한다"는 수산업법상의 유통 규제를 프론트엔드 단에서부터 도메인 규칙으로 녹여 설계했습니다. 이를 통해 소비자에게는 신선도 높은 수산물을 합리적인 가격에 제공하고, 어업인에게는 유통 단계 축소를 통한 수익 개선을 기대합니다.

### 핵심 타겟

| 사용자 유형 | 설명 |
| --- | --- |
| **구매자(Buyer)** | 신선한 수산물을 산지 가격에 직접 구매하고자 하는 일반 소비자 |
| **판매자(Seller)** | 사업자등록번호 또는 어선원부 번호로 자격을 인증받은 개인 어업인·선장 |
| **관리자(Admin)** | 판매자 자격 심사(사업자 인증 승인/거절) 및 전체 거래를 모니터링하는 플랫폼 운영자 |

### 기대 효과

- **유통 단계 축소**: 산지↔소비자 직거래 구조로 중간 유통 마진 절감
- **거래 투명성 확보**: 위판 마감시간·잔여수량 실시간 표시로 경매 특유의 긴장감과 신뢰도 있는 정보 제공
- **법적 리스크 사전 차단**: 의무 위판 어종 직거래 금지, 금어기 포획 금지 등 규제 요건을 등록 단계에서부터 강제

---

## 2. 주요 기능 (Key Features)

### 위판 마감시간 실시간 카운트다운 & 재고 연동

`useCountdown` 커스텀 훅이 상품별 `auctionDeadline`을 1초 단위로 재계산하여 `HH:MM:SS` 형식으로 표시합니다. 마감까지 1시간 이내로 남으면 `isUrgent` 플래그로 긴급도를 UI에 반영하며, 마감 시각을 지나거나 값이 없으면 자동으로 "마감" 상태로 전환됩니다. 상품 목록 카드(`ProductResultCard`)와 상세 페이지(`Detail`) 양쪽에서 동일한 훅을 재사용해 일관된 사용자 경험을 제공합니다.

### 수산업법 기반 상품 등록 검증 로직

판매자 상품 등록(`ProductRegistration`) 시 `src/data/species.ts`의 어종 카탈로그를 기준으로 다음 두 가지 규제를 자동 적용합니다.

- **의무 위판 어종 사전 제외**: 고등어·참치·멸치 등 산지위판장 의무 상장 대상 어종은 `mandatoryAuction: true`로 정의되어 카탈로그 구성 단계에서부터 드롭다운 목록에 노출되지 않습니다(직거래 자체가 법적으로 금지되므로 UI 단에서부터 원천 차단).
- **금어기(禁漁期) 자동 판별**: 꽃게·대게·주꾸미 등 포획 제한 기간이 있는 어종은 `isClosedSeasonNow()` 함수가 오늘 날짜를 기준으로 판별하여 해당 기간에는 선택지를 비활성화 처리합니다(연말을 가로지르는 기간까지 정확히 처리).
- **원산지 위변조 방지**: 원산지는 사용자가 직접 입력하지 않고, 인증된 판매자 면허(`APPROVED_VESSEL_LICENSE`)의 선적항·선장명을 조합한 값을 read-only로만 노출합니다.

### 역할 기반(Role-Based) 계정 시스템 및 판매자 자격 인증

로그인 시 선택한 계정 유형(`buyer` / `seller` / `admin`)에 따라 `AuthContext`가 전역 권한을 관리하며, 판매자는 **사업자등록번호(국세청 연동 가정)** 또는 **어선원부 번호 + 조업허가증**(무등록 소규모 어민 대상) 두 가지 방식 중 하나로 자격을 인증받습니다. 관리자 대시보드(`AdminDashboard`)에서는 사업자 인증 대기 목록을 조회하여 승인/거절 처리를 할 수 있습니다.

### 4단계 주문 처리 파이프라인 & 신선식품 특화 클레임 관리

`OrdersContext`가 `결제 완료 → 상품 준비중 → 배송중 → 배송 완료`로 이어지는 순차적 주문 상태 머신을 관리합니다. 판매자가 택배사·운송장 번호를 입력(`ShippingManagement`)하면 자동으로 "배송중" 단계로 전환되며, 배송 완료 후에는 구매자만 별도로 "구매 확정" 처리를 할 수 있습니다. 또한 신선식품 특성상 단순 변심 환불이 불가능하다는 도메인 규칙을 반영하여, 판매자가 클레임(취소/환불)을 거절할 때 사유를 입력하지 않으면 기본 거절 사유가 자동으로 채워집니다.

### 판매자 정산 관리 & 오늘의 평균 도매 시세

판매자 정산 화면(`SettlementManagement`)은 플랫폼이 자동 계산한 정산 데이터를 조회만 할 수 있는 **철저한 읽기 전용(Read-only)** 화면으로 설계되어 정산 금액의 임의 조작 가능성을 원천 차단합니다. 홈 화면의 `WholesaleAveragePrice` 컴포넌트는 전복·문어·대방어 등 주요 어종의 실시간 평균 시세와 최근 6일간의 추이를 막대그래프로 시각화하여, 구매자가 합리적인 구매 판단을 내릴 수 있도록 지원합니다.

---

## 3. 기술 스택 (Tech Stack)

### Frontend Core

| 항목 | 스택 | 비고 |
| --- | --- | --- |
| UI 라이브러리 | ![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white) | 함수형 컴포넌트 + Hooks 기반 |
| 언어 | ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white) | `tsc -b` 프로젝트 레퍼런스 구조(`tsconfig.app.json` / `tsconfig.node.json`) |
| 번들러 / 개발 서버 | ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white) | `@vitejs/plugin-react` (Oxc 기반) |
| 라우팅 | ![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white) | `react-router-dom`, SPA 클라이언트 사이드 라우팅 |

### Styling

| 항목 | 스택 | 비고 |
| --- | --- | --- |
| CSS 프레임워크 | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white) | `@tailwindcss/vite` 플러그인으로 PostCSS 설정 없이 직접 연동 |
| 컴포넌트 스타일 | Vanilla CSS | 컴포넌트/페이지별 개별 `.css` 파일(스코프 분리) 병행 사용 |

### State Management & Data Fetching

| 항목 | 스택 | 비고 |
| --- | --- | --- |
| 전역 상태 관리 | React Context API | `AuthContext`, `CartContext`, `OrdersContext`, `ProductsContext` — 도메인별 Provider 분리 |
| HTTP 클라이언트 | ![Axios](https://img.shields.io/badge/Axios-1.x-5A29E4?logo=axios&logoColor=white) | 공통 인스턴스(`src/api/client.ts`)에 JWT 인터셉터·에러 로깅 인터셉터 구성 |
| 인증 토큰 관리 | `localStorage` + Axios Interceptor | 요청마다 `Authorization: Bearer <accessToken>` 자동 첨부 |

### Package Manager & Tooling

| 항목 | 스택 | 비고 |
| --- | --- | --- |
| 패키지 매니저 | npm (`package-lock.json`) | |
| 린터 | ![Oxlint](https://img.shields.io/badge/Oxlint-1.x-0B1220) | `react`, `typescript`, `oxc` 플러그인 적용 |
| 테스트 프레임워크 | ![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white) | `jsdom` 환경 + `@testing-library/react`, `@testing-library/jest-dom` |
| 배포 플랫폼 | ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) | `vercel.json` 기반 SPA 라우팅 rewrite 설정 |

---

## 4. 프로젝트 구조 (Directory Structure)

```
seeat-frontend/
├── public/                    # 정적 자산 (파비콘, 아이콘 스프라이트)
├── src/
│   ├── api/                   # 백엔드 REST API 연동 계층
│   │   ├── client.ts          #   └ axios 공통 인스턴스 (baseURL, JWT 인터셉터, 에러 로깅)
│   │   ├── products.ts        #   └ 상품 검색/상세/등록/수정/상태변경/카테고리/판매자 상품 목록
│   │   ├── cart.ts            #   └ 장바구니 API
│   │   ├── orders.ts          #   └ 주문 API
│   │   ├── settlements.ts     #   └ 판매자 정산 조회 API
│   │   ├── users.ts           #   └ 사용자(회원) 정보 API
│   │   ├── addresses.ts       #   └ 배송지 API
│   │   └── result.ts          #   └ API 응답 공통 Result 타입 및 에러 메시지 추출 유틸
│   │
│   ├── components/            # 여러 화면에서 재사용되는 프레젠테이셔널 컴포넌트
│   │   ├── Header.tsx          #   └ 전역 GNB (역할별 메뉴 분기)
│   │   ├── Home.tsx             #   └ 홈 화면 레이아웃 (추천 상품, 시세 위젯 등 조합)
│   │   ├── CategoryList.tsx     #   └ 어종 카테고리 목록
│   │   ├── ProductCard.tsx      #   └ 상품 카드 (공통 타입 정의 포함)
│   │   ├── ProductResultCard.tsx#   └ 검색 결과용 상품 카드 (마감 카운트다운 포함)
│   │   └── WholesaleAveragePrice.tsx # └ 오늘의 평균 도매 시세 위젯
│   │
│   ├── context/                # React Context 기반 전역 상태 (도메인별 Provider)
│   │   ├── AuthContext.tsx      #   └ 로그인 세션 · 역할(role) · 판매자 인증 정보
│   │   ├── CartContext.tsx      #   └ 장바구니 아이템 상태
│   │   ├── OrdersContext.tsx    #   └ 주문 상태 머신(4단계) · 클레임(취소/환불) 처리
│   │   └── ProductsContext.tsx  #   └ 판매자 상품관리 화면 전용 로컬 상태
│   │
│   ├── data/                    # 프론트엔드 내부 정적 참조 데이터 (Mock/Catalog)
│   │   ├── species.ts            #   └ 어종 카탈로그, 의무위판·금어기 판별 로직
│   │   └── sellerLicense.ts      #   └ 인증된 판매자 어선 면허 목업 데이터
│   │
│   ├── hooks/                   # 재사용 가능한 커스텀 훅
│   │   └── useCountdown.ts       #   └ 위판 마감시간 실시간 카운트다운 훅
│   │
│   ├── pages/                   # 라우트 단위 페이지 컴포넌트
│   │   ├── Login.tsx / AuthAndProfile.tsx      # 로그인 · 회원가입
│   │   ├── Search.tsx / Detail.tsx              # 상품 검색(필터/정렬) · 상세
│   │   ├── Cart.tsx / Orders.tsx                # 장바구니 · 구매자 주문 내역
│   │   ├── MyPage.tsx                            # 마이페이지(닉네임/연락처 수정)
│   │   ├── ProductRegistration.tsx               # 판매자 상품 등록
│   │   ├── ProductManagement.tsx                 # 판매자 상품 관리(가격/재고/판매상태)
│   │   ├── OrderManagement.tsx                   # 판매자 주문 관리
│   │   ├── ShippingManagement.tsx                # 판매자 배송(운송장) 관리
│   │   ├── SettlementManagement.tsx              # 판매자 정산 조회(읽기 전용)
│   │   ├── Notice.tsx                            # 공지사항
│   │   └── AdminDashboard.tsx                    # 관리자 대시보드(회원/인증 관리)
│   │
│   ├── test/
│   │   └── setup.ts             # Vitest 전역 테스트 환경 설정 (jest-dom matcher 등록)
│   │
│   ├── App.tsx                  # 라우트 정의(React Router) 및 전체 레이아웃
│   ├── main.tsx                 # 애플리케이션 엔트리 포인트 (Provider 트리 조립)
│   └── index.css                # 전역 스타일 · Tailwind 진입점
│
├── .env.example                # 필요 환경 변수 목록 (실값은 .env.local에)
├── vite.config.ts               # Vite/Vitest 통합 설정
├── vercel.json                  # Vercel 배포 시 SPA 라우팅 rewrite 설정
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json  # TypeScript 프로젝트 레퍼런스
└── package.json
```

> **설계 원칙**: `api/`는 서버와의 통신 규약(Request/Response 타입)만 책임지고, `context/`는 화면 간 공유 상태만 책임지며, 화면별 로직은 `pages/`에 위치시켜 계층 간 책임을 명확히 분리했습니다.

---

## 5. 시작하기 (Getting Started)

### Prerequisites

| 항목 | 버전 |
| --- | --- |
| [Node.js](https://nodejs.org/) | 20.x 이상 권장 (LTS) |
| npm | Node.js 설치 시 기본 포함 |

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repository-url>
cd seeat-frontend

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (아래 "환경 변수 설정" 항목 참고)
cp .env.example .env.local

# 4. 개발 서버 실행 (기본: http://localhost:5173)
npm run dev
```

### 사용 가능한 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 (HMR 지원) |
| `npm run build` | 타입 체크(`tsc -b`) 후 프로덕션 번들 생성 (`dist/`) |
| `npm run preview` | 프로덕션 빌드 결과물을 로컬에서 미리보기 |
| `npm run lint` | Oxlint 정적 분석 실행 |
| `npm run test` | Vitest 테스트를 1회 실행 |
| `npm run test:watch` | Vitest를 watch 모드로 실행 |

### 환경 변수 설정

`.env.example`을 참고하여 프로젝트 루트에 `.env.local` 파일을 생성합니다. `.env.local`은 `.gitignore`에 등록되어 있어 git에 커밋되지 않으므로, 각자의 로컬 환경에 맞는 값을 채워 넣으면 됩니다.

| 변수명 | 필수 여부 | 설명 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 필수 | 백엔드 API 서버의 기본 주소. 값이 비어 있으면 `src/api/client.ts`에서 콘솔 경고를 출력합니다. 로컬 개발 시 팀 백엔드 서버(예: ngrok 도메인)의 주소를 입력합니다. |

> 참고: 백엔드가 ngrok 무료 도메인으로 노출되는 경우 팀원이 서버를 재기동할 때마다 주소가 바뀔 수 있습니다. 이 경우 `.env.local`의 `VITE_API_BASE_URL` 값만 최신 주소로 갱신하면 됩니다.

---

## 6. 기타 참고 사항 (Notes)

### 빌드 및 배포

본 프로젝트는 **Vercel**을 통해 배포되도록 구성되어 있습니다.

```bash
npm run build   # dist/ 디렉터리에 정적 산출물 생성
```

`vercel.json`에는 다음과 같이 SPA(Single Page Application) 라우팅을 위한 rewrite 규칙이 정의되어 있어, 새로고침이나 딥링크 접근 시에도 항상 `index.html`을 반환하여 React Router가 클라이언트 사이드에서 라우팅을 정상 처리하도록 합니다.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 인증 및 보안

- 로그인 성공 시 발급되는 `accessToken` / `refreshToken`은 `localStorage`에 저장되며, `src/api/client.ts`의 요청 인터셉터가 모든 API 호출에 `Authorization: Bearer <token>` 헤더를 자동으로 첨부합니다.
- 로그아웃 시 메모리 상의 사용자 상태뿐 아니라 `localStorage`에 남아있는 토큰까지 함께 제거하여, 만료·무효 토큰으로 인한 예기치 않은 인증 오류를 방지합니다.

### 코드 품질 관리

- 정적 분석 도구로 [Oxlint](https://oxc.rs/)를 사용하며, `react/rules-of-hooks`(Hooks 규칙 위반 검출)를 `error` 레벨로 강제하고 있습니다.
- 타입 안전성이 중요한 도메인 규칙(예: 상품 등록 시 수정 불가 필드 제한, 정산 화면의 읽기 전용 강제)은 TypeScript 인터페이스 설계 단계에서부터 원천 차단하는 방식을 채택했습니다.

### 테스트

- `Vitest` + `Testing Library` 조합으로 컴포넌트/훅 단위 테스트를 작성합니다.
- 예: `useCountdown.test.ts`(마감시간 카운트다운 로직 검증), `CategoryList.test.tsx`(카테고리 컴포넌트 렌더링 검증)
