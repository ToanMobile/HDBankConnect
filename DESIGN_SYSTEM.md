---
name: echeck-ai-design
description: Unified design system cho eCheckAI V2 — bao gồm React Native mobile (nhân viên) và PWA dashboard (admin). Design tokens dùng chung, guidelines riêng cho từng platform.
scope: mobile-react-native + web-pwa-nextjs
version: 1.0.0
---

> **Brand**: eCheckAI V2 (Giải Pháp Số)
> **Philosophy**: Minimal, trustworthy, efficient — UI không cản trở người dùng chấm công. Mỗi pixel phải có lý do tồn tại.
> **Platforms**: React Native 0.73+ (mobile worker app) + React 18 / Next.js (admin dashboard PWA)

---

## 1. Design Philosophy

### Core Principles
1. **Zero-Touch UX trước UI đẹp** — App nhân viên chấm công tự động, hầu hết thời gian user không mở app. Khi mở, họ cần thông tin nhanh, không cần hoa lá.
2. **Trust through clarity** — Hiển thị rõ trạng thái (checked-in, late, missing), timestamp, branch. Không dùng ambiguous icons thay text.
3. **Platform-native feel** — Mobile tuân thủ iOS/Android patterns (không ép giao diện web lên mobile). PWA tuân thủ desktop patterns (dense tables, keyboard shortcuts).
4. **One dominant color, sharp accents** — Teal làm brand anchor. Status colors (success/warning/danger) chỉ xuất hiện khi mang semantic meaning.

### Visual Language
- **Mobile**: Card-based layout, generous padding, 1 action chính mỗi screen, bottom tab navigation
- **Dashboard**: Dense information, sidebar navigation, tables + charts + maps, nhiều action mỗi screen

---

## 2. Shared Design Tokens

**Nguồn sự thật duy nhất** — cả mobile và web import từ cùng một file tokens để đảm bảo brand consistency.

### 2.1 Color Palette

```typescript
// shared/design-tokens/colors.ts
// Dùng chung cho cả React Native và Web

export const colors = {
  // Brand
  primary: {
    50:  '#E8F7F9',
    100: '#C5EBEF',
    200: '#9EDEE4',
    300: '#77D0D9',
    400: '#5BC4CE',
    500: '#49B7C3',  // ← Main brand teal
    600: '#3FA5B1',
    700: '#348E99',
    800: '#2A7780',
    900: '#1F5A61',
  },

  // Neutrals (dùng cho text, border, background)
  neutral: {
    0:   '#FFFFFF',
    50:  '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',  // ← border default
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',  // ← muted text
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',  // ← foreground (main text)
  },

  // Semantic (CHỈ dùng khi mang ý nghĩa, không decorative)
  success: {
    bg:   '#DCFCE7',
    base: '#11A22F',  // ← on_time, checked-in success
    text: '#14532D',
  },
  warning: {
    bg:   '#FEF3C7',
    base: '#EF9900',  // ← late, pending
    text: '#713F12',
  },
  danger: {
    bg:   '#FEE2E2',
    base: '#E7000B',  // ← absent, fraud detected, error
    text: '#7F1D1D',
  },
  info: {
    bg:   '#DBEAFE',
    base: '#0088F2',  // ← informational messages
    text: '#1E3A8A',
  },

  // Chart (dashboard only)
  chart: ['#F54A00', '#009689', '#104E64', '#FFB900', '#FE9A00'],
} as const;
```

**Màu được dùng như thế nào**:
- Primary 500 — button chính, link, active tab, brand logo
- Primary 50-100 — background của selected state, hover (web), pressed (mobile)
- Neutral 950 — text chính
- Neutral 500 — text phụ, placeholder, icon inactive
- Neutral 200 — border, divider
- Neutral 50-100 — surface secondary, disabled background
- Success/Warning/Danger — CHỈ cho status (on_time/late/absent), không dùng làm accent decoration

### 2.2 Typography

```typescript
// shared/design-tokens/typography.ts
export const typography = {
  fontFamily: {
    sans: 'Inter',         // Body, UI elements
    mono: 'JetBrainsMono', // Timestamps, employee IDs, BSSID values
  },

  // Font sizes (unit-less cho cả RN và web)
  size: {
    xs:   12,
    sm:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  weight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },

  // Line heights (multiplier cho RN, giữ line-height cho web)
  lineHeight: {
    tight:   1.25,
    normal:  1.5,
    relaxed: 1.75,
  },

  // Letter spacing (dùng cho uppercase labels)
  tracking: {
    tight:  -0.5,
    normal: 0,
    wide:   0.5,
  },
} as const;
```

**Text styles reuse** (đặt tên thống nhất):
- `display` — 30-36px, bold, dùng cho hero stats (tổng checkin hôm nay)
- `h1` / `h2` / `h3` — 24/20/18px, semibold, screen titles
- `body` — 16px, regular, nội dung mặc định
- `body-sm` — 14px, regular, chú thích
- `caption` — 12px, medium, label/timestamp nhỏ
- `mono` — 14px, monospace, BSSID / device ID / timestamp chính xác

### 2.3 Spacing Scale

```typescript
// shared/design-tokens/spacing.ts
export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,   // ← baseline (1rem)
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;
```

**Dùng như thế nào**:
- Mobile: padding ngoài cùng của screen = spacing.4 (16) hoặc spacing.5 (20)
- Dashboard: padding sidebar item = spacing.3 (12), padding card = spacing.6 (24)
- Gap giữa form fields = spacing.4 (16)
- Gap giữa sections lớn = spacing.8 (32) hoặc spacing.10 (40)

### 2.4 Border Radius

```typescript
// shared/design-tokens/radius.ts
export const radius = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   10,   // ← default cho card, button, input (brand-level)
  xl:   16,
  '2xl': 20,
  full: 9999, // cho avatar, pill badge
} as const;
```

### 2.5 Shadow / Elevation

```typescript
// shared/design-tokens/elevation.ts

// Web (CSS shadow)
export const shadowWeb = {
  none: 'none',
  sm:   '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md:   '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
  lg:   '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
} as const;

// React Native (iOS shadow + Android elevation)
export const shadowMobile = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
```

### 2.6 Motion / Animation Timing

```typescript
export const motion = {
  duration: {
    instant: 100,   // tap feedback
    fast:    200,   // micro-interactions
    base:    300,   // page transitions
    slow:    500,   // celebration (checkin success)
  },
  easing: {
    // Web (CSS cubic-bezier)
    standard:   'cubic-bezier(0.4, 0.0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    // RN dùng Easing.bezier(...) với cùng giá trị
  },
} as const;
```

---

## 3. React Native (Mobile) Design

### 3.1 Tech Stack

| Layer | Lựa chọn | Lý do |
|---|---|---|
| **Styling** | NativeWind 4+ (Tailwind cho RN) | Dev familiar với Tailwind, tokens share dễ |
| **Fallback** | StyleSheet.create() | Khi cần dynamic styles hoặc NativeWind gặp limit |
| **Icons** | Lucide React Native | Consistent với web, tree-shakable |
| **Font loading** | expo-font hoặc react-native-asset | Load Inter custom |
| **Component library** | gluestack-ui v2 HOẶC custom | gluestack theme-able, or build từ primitives |
| **Animation** | React Native Reanimated 3 | Chạy trên UI thread, mượt 60fps |
| **Forms** | react-hook-form + zod | Share validation logic với backend |
| **Navigation** | React Navigation 6 (native-stack + bottom-tabs) | Native transitions |

### 3.2 Font Setup

```typescript
// mobile/src/app/_layout.tsx (Expo Router) hoặc App.tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'Inter-Regular':  require('../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium':   require('../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold':     require('../assets/fonts/Inter-Bold.ttf'),
  'JetBrainsMono-Regular': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
});
```

### 3.3 Theme Object

```typescript
// mobile/src/theme/index.ts
import { colors } from '@shared/design-tokens/colors';
import { typography } from '@shared/design-tokens/typography';
import { spacing } from '@shared/design-tokens/spacing';
import { radius } from '@shared/design-tokens/radius';
import { shadowMobile as shadow } from '@shared/design-tokens/elevation';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadow,

  // RN-specific
  textStyles: {
    display: {
      fontFamily: 'Inter-Bold',
      fontSize: typography.size['3xl'],
      lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
      color: colors.neutral[950],
    },
    h1: {
      fontFamily: 'Inter-SemiBold',
      fontSize: typography.size['2xl'],
      lineHeight: typography.size['2xl'] * typography.lineHeight.tight,
      color: colors.neutral[950],
    },
    body: {
      fontFamily: 'Inter-Regular',
      fontSize: typography.size.base,
      lineHeight: typography.size.base * typography.lineHeight.normal,
      color: colors.neutral[950],
    },
    bodySm: {
      fontFamily: 'Inter-Regular',
      fontSize: typography.size.sm,
      lineHeight: typography.size.sm * typography.lineHeight.normal,
      color: colors.neutral[600],
    },
    caption: {
      fontFamily: 'Inter-Medium',
      fontSize: typography.size.xs,
      lineHeight: typography.size.xs * typography.lineHeight.normal,
      color: colors.neutral[500],
    },
    mono: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: typography.size.sm,
    },
  },
} as const;

export type Theme = typeof theme;
```

### 3.4 Mobile-Specific Rules

#### Touch Targets
- **Tối thiểu 44x44pt** cho mọi tappable element (Apple HIG, Material Design đồng ý)
- Buttons: height tối thiểu 48 (thoải mái hơn chuẩn tối thiểu)
- Icon buttons: `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` nếu visual nhỏ hơn 44

#### Safe Area
- Luôn wrap screen trong `<SafeAreaView>` hoặc dùng `useSafeAreaInsets()`
- Top inset → status bar padding
- Bottom inset → home indicator padding (đặc biệt cho bottom sheet, floating button)

#### Platform Differences
```typescript
import { Platform } from 'react-native';

const styles = {
  headerTitle: {
    fontSize: Platform.OS === 'ios' ? 17 : 20,  // iOS nhỏ hơn, Android lớn hơn
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
  },
  // Back button: iOS dùng chevron + text, Android dùng arrow icon only
  // Tab bar: iOS bottom, Android có thể top
};
```

#### Haptic Feedback (quan trọng cho chấm công)
```typescript
import * as Haptics from 'expo-haptics';

// Checkin thành công
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Checkin thất bại (sai WiFi, ngoài geofence)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Button press
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

### 3.5 Component Patterns (Mobile)

#### Status Card (hiển thị trạng thái checkin)
```tsx
// Pressed state thay cho hover (mobile không có hover)
<Pressable
  onPress={handlePress}
  style={({ pressed }) => ({
    backgroundColor: pressed ? colors.primary[50] : colors.neutral[0],
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadow.sm,
  })}
>
  {/* content */}
</Pressable>
```

#### Bottom Sheet (thay modal web)
- Dùng `@gorhom/bottom-sheet` — native-feel hơn React Native Modal
- Drag handle 36x4 ở top, màu neutral[300]
- Content padding 20-24

#### Bottom Tab Bar (primary navigation)
- 3-5 tabs tối đa
- Active: icon + text colored primary[500]
- Inactive: icon + text colored neutral[500]
- Background trắng, border top 1px neutral[200]

#### Loading States
- Skeleton screens > spinner (feels faster)
- Pull-to-refresh dùng `RefreshControl` built-in
- Empty states: illustration + 1 dòng mô tả + primary action

### 3.6 Mobile Screens Checklist (eCheckAI)

| Screen | Key UI elements |
|---|---|
| **Login** | Logo centered top, email + password inputs, "Forgot?" link, primary button full-width |
| **Home** | Hero: trạng thái hôm nay (big card: "Đã check-in 08:02 · CN Quận 1"), schedule preview, recent activity |
| **Attendance History** | FlatList với date sections, mỗi row: time + status badge + branch name |
| **Settings** | Section: Device info, Notification preferences, About, Sign out |
| **Permissions Onboarding** | Full-screen explainers cho WiFi, Location, Notification (bắt buộc) |

### 3.7 Mobile Anti-patterns (TRÁNH)

- ❌ Hover effects (mobile không có hover)
- ❌ Tooltip trên long-press (Android native không có pattern này)
- ❌ Side navigation drawer nếu có ít hơn 6 items (dùng bottom tabs)
- ❌ Custom date picker khi native picker đủ dùng
- ❌ Fixed position elements (dùng absolute trong parent + safe area)
- ❌ 3+ columns trên mobile portrait
- ❌ Font size dưới 12px (không đọc được)
- ❌ Text trong button dài hơn 3 từ

---

## 4. PWA Dashboard (Web) Design

### 4.1 Tech Stack

| Layer | Lựa chọn | Lý do |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) HOẶC Vite + React 18 | SSR cho SEO không cần (admin-only) → Vite đơn giản hơn |
| **Styling** | Tailwind CSS v4 | Đồng bộ tokens với mobile NativeWind |
| **Components** | shadcn/ui | Copy-paste components, customize dễ, theme-able |
| **Icons** | Lucide React | Đồng bộ với mobile |
| **Font loading** | `next/font/google` HOẶC Google Fonts CDN | Inter + JetBrains Mono |
| **Charts** | Recharts | Attendance trends, statistics |
| **Tables** | TanStack Table v8 | Sorting/filter/pagination for 5k+ records |
| **Forms** | react-hook-form + zod | Share validation logic với mobile |
| **State** | Zustand (global) + TanStack Query (server state) | |

### 4.2 Tailwind Config

```javascript
// web/tailwind.config.ts
import { colors, spacing, typography, radius } from '@shared/design-tokens';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        neutral: colors.neutral,
        success: colors.success,
        warning: colors.warning,
        danger:  colors.danger,
        info:    colors.info,
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo'],
      },
      fontSize: {
        xs:   [`${typography.size.xs}px`,   { lineHeight: '1.5' }],
        sm:   [`${typography.size.sm}px`,   { lineHeight: '1.5' }],
        base: [`${typography.size.base}px`, { lineHeight: '1.5' }],
        // ...
      },
      borderRadius: {
        sm:  `${radius.sm}px`,
        md:  `${radius.md}px`,
        lg:  `${radius.lg}px`,
        xl:  `${radius.xl}px`,
      },
      boxShadow: {
        sm: shadowWeb.sm,
        md: shadowWeb.md,
        lg: shadowWeb.lg,
      },
    },
  },
};
```

### 4.3 Web-Specific Rules

#### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  Header (h=56, sticky)                           │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │  Main Content                         │
│ (w=240)  │  (flex-1, padding 24-32)              │
│          │                                       │
│          │  - Page title (h1)                    │
│          │  - Filters/actions row                │
│          │  - Content (table/chart/map)          │
│          │                                       │
└──────────┴──────────────────────────────────────┘
```

- Sidebar: background neutral[50], border right neutral[200]
- Active nav item: background primary[50], text primary[700], left border 3px primary[500]
- Inactive nav item: text neutral[600], hover background neutral[100]

#### Responsive Breakpoints
```
sm:  640px   → phone landscape (hiếm khi admin dùng)
md:  768px   → tablet → collapse sidebar thành drawer
lg:  1024px  → laptop → sidebar expanded
xl:  1280px  → desktop
2xl: 1536px  → wide desktop
```

Dashboard chủ yếu target `lg` trở lên. `md` trở xuống → hide sidebar, show hamburger menu.

#### Keyboard Shortcuts (dashboard chuyên nghiệp phải có)
- `Cmd/Ctrl + K` → Global search / command palette
- `/` → Focus search input
- `G + D` → Go to Dashboard
- `G + B` → Go to Branches
- `G + A` → Go to Attendance
- `Esc` → Close modal/drawer

#### Hover / Focus States
- Buttons: hover → background darken 1 step (primary[500] → primary[600])
- Cards: hover → shadow-sm → shadow-md, border → border neutral[300]
- Rows trong table: hover → background neutral[50]
- Focus ring: `ring-2 ring-primary-500 ring-offset-2` trên mọi input/button

### 4.4 Component Patterns (Web)

#### Stats Cards (top of dashboard)
- Grid 4 cols trên xl, 2 cols trên md, 1 col trên sm
- Each card: label (caption, neutral-500) + big number (display, neutral-950) + delta (success/danger với icon)
- Padding 24, border 1px neutral-200, radius lg, background white

#### Data Tables
- Header: sticky, background neutral-50, text sm medium neutral-700
- Rows: height 48, border-bottom neutral-200, hover neutral-50
- Actions column: right-aligned, icon buttons với tooltip
- Pagination: bottom right, "Showing 1-50 of 5,000"
- Empty state: centered illustration + "No records yet" + CTA

#### Status Badges
```tsx
// Mỗi status có bg + text color cố định, không dùng màu ngẫu nhiên
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text">
  <CheckCircle2 className="w-3 h-3" />
  On time
</span>
```

### 4.5 Dashboard Screens Checklist

| Screen | Key UI elements |
|---|---|
| **Overview** | 4 stats cards, today's attendance chart, recent checkins list, branch map preview |
| **Attendance Table** | Filters (date range, branch, status, search), sortable table, export CSV button |
| **Branch Config** | List branches, click → form nhập: tên, địa chỉ, lat/lng (input số), radius, WiFi BSSIDs |
| **Schedule Config** | Per-branch schedule cards với time pickers, day selectors |
| **Employees** | Table + search + filter by branch, bulk actions (activate/deactivate) |
| **Fraud Logs** | Table sorted by severity, click row → detail modal với snapshot |

### 4.6 Web Anti-patterns (TRÁNH)

- ❌ Carousel cho nội dung quan trọng (user miss)
- ❌ Modal xếp chồng nhau (max 1 modal tại 1 thời điểm)
- ❌ Horizontal scroll bảng khi có thể design lại columns
- ❌ Tooltip chứa thông tin critical (user mobile không thấy tooltip được)
- ❌ Infinite scroll cho admin data (dùng pagination để predictable)
- ❌ Color-only để truyền status (dùng icon + text + color)
- ❌ Disabled button không giải thích tại sao disabled

---

## 5. Platform Parity Matrix

Một số concept xuất hiện ở cả hai platforms nhưng implement khác:

| Concept | Mobile (React Native) | Web (PWA) |
|---|---|---|
| Primary button | `<Pressable>` với haptic + pressed opacity | `<button>` với hover + focus ring |
| Input field | `<TextInput>` với autoCapitalize/autoCorrect | `<input>` với autocomplete attrs |
| Modal | Bottom sheet (@gorhom/bottom-sheet) | Centered dialog (shadcn Dialog) |
| Navigation | Bottom tabs + stack navigator | Sidebar + breadcrumb |
| List | FlatList với getItemLayout | TanStack Table với virtualization |
| Loading | Skeleton + haptic pulse | Skeleton + spinner cho button |
| Toast | `react-native-toast-message` top | `sonner` bottom-right |
| Date picker | Native (DateTimePicker từ @react-native-community) | shadcn Calendar component |
| Image | `<Image>` với FastImage cho cache | `next/image` với lazy loading |
| Selection | Checkbox (lớn, dễ tap) | Checkbox (nhỏ, compact) |

---

## 6. Brand Assets

### Logo
- **Primary logo**: wordmark "eCheckAI" với teal icon phía trước
- **Icon only**: dùng cho app icon, favicon, compact spaces
- **Minimum size**: 24px height cho icon, 80px width cho wordmark
- **Clear space**: bằng height của icon ở tất cả 4 phía

### App Icon (Mobile)
- iOS: 1024x1024 PNG, no transparency, rounded corners auto-applied
- Android: Adaptive icon (foreground 432x432 + background 432x432)
- Background: primary[500] solid hoặc gradient primary[400] → primary[600]
- Foreground: white icon centered, 60% of canvas

### Favicon (Web)
- 32x32, 16x16 ICO
- Apple touch icon 180x180
- Manifest icon 192x192, 512x512 (cho PWA install)

---

## 7. Accessibility (bắt buộc cho banking app)

### Shared Requirements
- Color contrast WCAG AA: 4.5:1 cho body text, 3:1 cho large text
- Không dùng color-only để truyền thông tin (kèm icon hoặc text)
- Support font scaling (user OS settings)

### Mobile-specific
- `accessible={true}` + `accessibilityLabel` + `accessibilityRole` trên mọi interactive element
- VoiceOver (iOS) và TalkBack (Android) test trước khi release
- Dynamic Type support: dùng `allowFontScaling` với max cap để không vỡ layout

### Web-specific
- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<button>` không phải `<div onClick>`
- `aria-label` cho icon buttons, `aria-describedby` cho form errors
- Keyboard navigation: Tab order logic, focus trap trong modal, Esc để close
- Screen reader test với NVDA (Windows) hoặc VoiceOver (Mac)

---

## 8. File Structure

### Shared Tokens Package
```
shared/
└── design-tokens/
    ├── package.json          # Publish như internal package hoặc monorepo
    ├── src/
    │   ├── colors.ts
    │   ├── typography.ts
    │   ├── spacing.ts
    │   ├── radius.ts
    │   ├── elevation.ts
    │   ├── motion.ts
    │   └── index.ts          # Re-export tất cả
    └── README.md
```

### Mobile Structure
```
mobile/src/
├── theme/
│   └── index.ts              # Import từ shared, wrap RN-specific
├── components/
│   ├── ui/                   # Base components (Button, Input, Card)
│   ├── attendance/           # Feature-specific
│   └── layout/
└── styles/
    └── global.css            # NativeWind directives
```

### Web Structure
```
web/src/
├── styles/
│   └── globals.css           # Tailwind directives + CSS variables
├── components/
│   ├── ui/                   # shadcn/ui components (customized)
│   ├── attendance/
│   ├── charts/
│   ├── maps/
│   └── layout/
└── lib/
    └── utils.ts              # cn() helper for className merging
```

---

## 9. Design Decision Log

Ghi lại các quyết định quan trọng + lý do:

| Quyết định | Lý do |
|---|---|
| Dùng Inter thay font custom hơn | Font system đã tốt, load sẵn trên web, có thể bundle nhẹ trên mobile. Brand không đòi hỏi font riêng. |
| Radius 10px (không 8 hoặc 12) | Match với Finos brand guideline, feel mềm hơn 8 nhưng không quá bubbly như 16 |
| Primary teal không dùng gradient | Flat branding dễ reproduce trên mobile (không lo banding), in ấn dễ hơn |
| Mobile dùng bottom tabs thay drawer | App chỉ có 3 main screens (Home, History, Settings) → tabs faster |
| Dashboard KHÔNG responsive mobile | Admin work chủ yếu ở desktop, mobile chỉ show warning "Please use desktop" |
| Status colors semantic only | Giữ UI clean, user học được: xanh = ok, cam = cần attention, đỏ = problem |

---

## 10. Không được làm (across both platforms)

- ❌ Đổi primary color theo mood — teal #49B7C3 là brand, không negotiable
- ❌ Dùng ảnh stock generic cho empty states — luôn custom illustration hoặc icon-based
- ❌ Mix nhiều design systems (đừng import MUI component vào project shadcn)
- ❌ Animation chỉ để đẹp — mỗi animation phải có purpose (feedback, guide attention, transition state)
- ❌ Dark mode halfway — hoặc làm đủ ở cả 2 platforms, hoặc không làm
- ❌ Hardcode màu/spacing trong component — LUÔN dùng token từ theme
- ❌ Dùng emoji làm icon production — dùng Lucide hoặc custom SVG
- ❌ Font weight 300 hoặc thinner — đọc khó, đặc biệt trên mobile low-DPI
