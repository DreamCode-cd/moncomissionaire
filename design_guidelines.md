# VillaGo Design Guidelines

## Design Approach

**Reference-Based Approach** drawing from modern rental platforms:
- **Primary Reference**: Airbnb (property cards, gallery layouts, booking flow)
- **Secondary References**: Booking.com (filters, search), Stripe (clean forms)
- **Rationale**: Visual-rich content showcasing properties demands proven patterns from hospitality leaders

**Core Design Principles**:
1. Trust through imagery - properties lead with stunning photography
2. Mobile-first clarity - essential given mobile UI pattern requirement
3. Role-adaptive interfaces - dashboards morph based on user type
4. Scannable hierarchies - users find properties fast

---

## Typography System

**Font Selection**: Inter (primary), Playfair Display (accents)
- **Display/Hero**: Playfair Display, 48px/56px/64px, weight 700
- **Headings**: Inter, 32px/24px/20px, weight 700
- **Subheadings**: Inter, 18px/16px, weight 600
- **Body**: Inter, 16px/14px, weight 400
- **Labels/Meta**: Inter, 14px/12px, weight 500
- **Mobile adjustments**: Reduce display by 25%, body stays 16px minimum

**Hierarchy Application**:
- Property titles: Heading (24px-32px)
- Prices: Subheading (18px) with bold weight
- Descriptions: Body (16px) with relaxed line-height (1.6)
- Agent/Owner names: Labels (14px)

---

## Layout & Spacing System

**Tailwind Spacing Units**: 2, 4, 6, 8, 12, 16, 20, 24

**Spacing Application**:
- Component padding: p-4 (mobile), p-6 (tablet), p-8 (desktop)
- Section spacing: py-12 (mobile), py-20 (desktop)
- Card gaps: gap-4 (mobile), gap-6 (desktop)
- Container margins: mx-4 (mobile), mx-auto with max-w-7xl (desktop)

**Grid Patterns**:
- Property listings: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Dashboard cards: grid-cols-1 md:grid-cols-2 xl:grid-cols-4
- Photo galleries: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- Form layouts: Single column mobile, 2-column desktop for complex forms

**Container Strategy**:
- Full-width hero: w-full
- Content sections: max-w-7xl mx-auto
- Forms/Details: max-w-3xl mx-auto

---

## Component Library

### Navigation
**Mobile Bottom Tab Bar** (primary navigation for mobile UI pattern):
- Fixed bottom: fixed bottom-0 w-full
- 4-5 icons with labels (Home, Search, Messages, Profile)
- Active state with icon fill + accent underline
- Height: h-16 with safe area padding

**Desktop Header**:
- Sticky top navigation
- Logo left, search center, user menu right
- Height: h-20
- Includes: notifications bell, profile dropdown

### Property Cards
**List View Card**:
- Horizontal layout on mobile (image left 40%, content right 60%)
- Vertical stack on desktop in grid
- Image aspect ratio: 4:3
- Contains: photo, title, location, price, rating stars
- Padding: p-4
- Hover: subtle elevation increase (shadow-md → shadow-lg)

**Featured/Hero Card**:
- Full-width image with overlay gradient
- Floating info card at bottom with blur backdrop
- Height: min-h-[400px] on mobile, min-h-[500px] desktop

### Forms
**Input Fields**:
- Height: h-12
- Border radius: rounded-lg
- Padding: px-4
- Label above, error message below
- Focus: ring pattern (ring-2)

**Search Bar** (prominent):
- Elevated with shadow
- Combined location + dates + guests inputs
- Mobile: stacked vertically in modal
- Desktop: horizontal flex layout
- Height: h-14

### Dashboards (Role-Specific)

**Client Dashboard**:
- Hero: Saved properties carousel
- Sections: Active bookings, Visit requests, Recommended properties
- Quick actions: "Request Visit", "View Messages"

**Propriétaire Dashboard**:
- Stats cards: Total properties, Pending validation, Views
- Property management table with status badges
- Upload property CTA prominent

**Commissionnaire Dashboard**:
- Approval queue (cards with approve/reject actions)
- Visit management calendar view
- Agent assignment interface

**Agent Dashboard**:
- Today's visits timeline
- Upcoming schedule
- Report submission forms

### Gallery & Media
**Photo Gallery**:
- Main image: aspect-ratio-[16/9], clickable for lightbox
- Thumbnail grid below: 4-5 images, aspect-square
- "Show all photos" button overlay on main image

**Image Grid** (property listing page):
- Masonry-style layout for visual interest
- First image: col-span-2 row-span-2 (featured)
- Remaining images: standard grid cells

### Chat/Messages
**Message List**:
- Card-based conversations
- Avatar + name + last message preview
- Unread badge (rounded-full with count)
- Padding: p-4 per message card

**Chat Interface**:
- Full-height container
- Header: participant info + actions
- Messages: bubbles with sender-left/receiver-right pattern
- Input: sticky bottom with attachment button

### Status & Indicators
**Status Badges**:
- Pill shape: rounded-full px-3 py-1
- Text: text-xs font-semibold uppercase
- States: En attente, Validé, Rejeté, Terminé

**Rating Display**:
- Star icons (filled/outlined)
- Number rating next to stars (4.8/5.0)
- Review count in parentheses

**Notification Dot**:
- Absolute positioned on icons
- Size: w-2 h-2, rounded-full
- Placement: top-right offset

### Filters & Search
**Filter Panel**:
- Slide-in drawer on mobile
- Sidebar on desktop (w-64)
- Sections: Price range, Property type, Amenities
- Apply/Reset buttons sticky at bottom

**Filter Chips** (active filters):
- Horizontal scroll on mobile
- Removable with X icon
- Height: h-8, rounded-full

---

## Images

**Hero Section**: Full-width image showcasing luxury villa exterior with pool, sunset/golden hour lighting, aspect ratio 21:9 on desktop, 16:9 on mobile. Overlay gradient from transparent to dark at bottom 40%. CTA buttons with backdrop-blur background.

**Property Cards**: High-quality property photos (exteriors, pools, living spaces). Each card minimum 1 image, featured properties show 3-4 images in mini-gallery.

**User Avatars**: Circular profile images throughout (chat, reviews, agent listings). Size: w-10 h-10 for small contexts, w-16 h-16 for profiles.

**Empty States**: Illustrative graphics for "No properties found", "No messages", "No visits scheduled" - friendly, minimal line art style.

**Gallery Lightbox**: Full-screen image viewer with thumbnails strip at bottom, left/right navigation arrows.

---

## Animations

Minimal and purposeful only:
- Property card hover: transform scale-105 transition-transform duration-200
- Navigation transitions: Smooth page fades (opacity changes)
- Modal entry: slide-up on mobile (translateY)
- NO scroll-triggered effects, NO parallax

---

## Mobile UI Pattern Specifics

- Touch targets minimum 44x44px
- Bottom sheet patterns for filters/actions
- Swipeable carousels for property photos
- Pull-to-refresh on property lists
- Native-like tab bar navigation
- Full-screen modals for forms
- Sticky headers that compress on scroll