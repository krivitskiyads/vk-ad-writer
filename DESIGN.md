# DESIGN.md — VK Ad Writer (Генератор Кривицкого)

## Overview
Modern SaaS tool for targetologists. Light, clean, professional. Purple accent conveys creativity and intelligence — fitting for an AI-powered copywriting tool.

## Colors

### Primary palette
- **Background page**: `#fafafe` — very light blue-gray, easy on the eyes
- **Background card**: `#ffffff` — pure white for cards and content areas
- **Background sidebar**: `#f5f3ff` — light purple tint for sidebar
- **Background hover**: `#f9fafb` — subtle gray for hover states

### Purple accent ramp
- **Purple 50**: `#f5f3ff` — sidebar bg, subtle highlights
- **Purple 100**: `#ede9fe` — hover states, selected items bg
- **Purple 200**: `#ddd6fe` — light borders on active elements
- **Purple 400**: `#a78bfa` — icons, secondary accent
- **Purple 500**: `#8b5cf6` — links, interactive elements
- **Purple 600**: `#7c3aed` — primary buttons, active states
- **Purple 700**: `#6d28d9` — button hover, gradient end
- **Purple 900**: `#4c1d95` — logo text, headings accent

### Neutral ramp
- **Gray 50**: `#f9fafb`
- **Gray 100**: `#f3f4f6`
- **Gray 200**: `#e5e7eb` — borders
- **Gray 300**: `#d1d5db` — disabled states
- **Gray 400**: `#9ca3af` — placeholder text, secondary text
- **Gray 500**: `#6b7280` — body secondary
- **Gray 700**: `#374151` — body text
- **Gray 900**: `#1f2937` — headings, primary text

### Semantic colors
- **Success bg**: `#ecfdf5` — success badge bg
- **Success text**: `#059669`
- **Warning bg**: `#fffbeb`
- **Warning text**: `#d97706`
- **Danger bg**: `#fef2f2`
- **Danger text**: `#dc2626`
- **Info bg**: `#eff6ff`
- **Info text**: `#2563eb`

## Typography
- **Font family**: `Inter, system-ui, -apple-system, sans-serif`
- **Headings**: weight 600, color Gray 900 (`#1f2937`)
- **Body**: weight 400, 14-15px, color Gray 700 (`#374151`)
- **Secondary text**: weight 400, 13px, color Gray 400 (`#9ca3af`)
- **Labels**: weight 500, 13px, color Gray 500 (`#6b7280`)
- **Logo/brand**: weight 600, color Purple 900 (`#4c1d95`)

## Spacing
- **Page padding**: 24px
- **Card padding**: 16-20px
- **Section gap**: 24px
- **Element gap**: 12px
- **Compact gap**: 8px

## Border radius
- **Cards**: 12px
- **Buttons**: 8px
- **Badges/pills**: 12px (fully rounded)
- **Inputs**: 8px
- **Small elements**: 6px

## Borders
- **Default**: `1px solid #e5e7eb` (Gray 200)
- **Subtle**: `1px solid #f3f4f6` (Gray 100) — between list items
- **Active/focus**: `2px solid #7c3aed` (Purple 600)

## Components

### Sidebar
- Background: Purple 50 (`#f5f3ff`)
- Border right: `1px solid #e9e5f5`
- Active item: left border 3px Purple 600, bg `#7c3aed15`, text Purple 700
- Inactive item: text Gray 400, no bg
- Logo: Purple 900, weight 600

### Primary button
- Background: gradient `linear-gradient(135deg, #7c3aed, #6d28d9)`
- Text: white
- Border radius: 8px
- Padding: 8px 16px
- Hover: slightly darker, subtle shadow
- Active: scale(0.98)

### Secondary button (outline)
- Background: white
- Border: `1px solid #e5e7eb`
- Text: Gray 700
- Hover: bg Gray 50

### Cards
- Background: white
- Border: `1px solid #e5e7eb`
- Border radius: 12px
- No shadow (flat) or very subtle shadow: `0 1px 3px rgba(0,0,0,0.04)`

### Badges/pills
- Border radius: 12px
- Padding: 3px 10px
- Font size: 11-12px
- Use semantic colors for status (success/warning/danger)
- Priority badges: High = Purple 600 bg + white text, Medium = Gray 100 bg + Gray 700 text, Low = Gray 50 bg + Gray 400 text

### Inputs & textareas
- Border: `1px solid #e5e7eb`
- Border radius: 8px
- Focus: `border-color: #7c3aed; box-shadow: 0 0 0 3px #7c3aed20`
- Placeholder: Gray 400

### Progress/stepper (top navigation 1-2-3-4)
- Active step: Purple 600 circle with white number
- Completed step: Purple 600 checkmark circle
- Future step: Gray 200 circle with Gray 400 number
- Connector line: Gray 200, completed = Purple 200

### Radio groups (settings cards)
- Each option in a card-like container with border
- Selected: left border 3px Purple 600, bg Purple 50
- Hover: bg Gray 50

### Loading states
- Spinner color: Purple 600
- Skeleton: Gray 100 with subtle pulse

## Layout principles
- Sidebar: 200px fixed width, always visible
- Content: centered, max-width 800px
- Cards stack vertically with 16px gap
- Generous whitespace between sections (24-32px)

## Dark mode
Not required for MVP. Light mode only.

## Interaction
- Buttons: hover darkens slightly, active scales to 0.98
- Cards: hover adds subtle border color change to Gray 300
- Links: Purple 500, hover underline
- Transitions: 150ms ease for color/bg changes
