# VillaGo Design Guidelines

## Design Approach
**Reference-Based Design** inspired by Airbnb's card aesthetics, Booking.com's information density, and modern hospitality platforms. Focus on showcasing properties through imagery while maintaining clean, conversion-optimized layouts.

## Typography System
- **Primary Font**: Inter or Circular (Google Fonts via CDN)
- **Display Font**: Poppins for headlines (optional accent)
- **Hierarchy**:
  - Hero headlines: 3xl-5xl, font-semibold to font-bold
  - Section headers: 2xl-3xl, font-semibold
  - Card titles: lg-xl, font-medium
  - Body text: base, font-normal
  - Captions/metadata: sm-xs, font-normal

## Layout & Spacing
**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Container: max-w-7xl with px-4 md:px-6 lg:px-8
- Section padding: py-12 md:py-16 lg:py-20
- Card gaps: gap-4 md:gap-6
- Grid columns: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

## Core Components

### Navigation
- Sticky header with logo, search bar (prominent), navigation links, user menu
- Mobile: Hamburger menu with slide-out drawer
- Search bar: Expandable with location, dates, guests filters

### Property Cards
- Aspect ratio 4:3 image with rounded-xl corners
- Hover: Subtle lift (transform) + shadow increase
- Wishlist heart icon (top-right overlay on image)
- Content: Property name, location, rating stars + count, price/night (bold)
- Grid layout: 1 column mobile, 2 tablet, 3-4 desktop

### Hero Section
- Full-width background image (high-quality property/destination photo)
- Height: 60vh-80vh
- Centered search box with blurred background (backdrop-blur-md)
- Headline overlay with gradient text or shadow for readability
- CTA: "Search Properties" button with blur background

### Filters Panel
- Sticky sidebar on desktop (w-64 to w-80)
- Collapsible sections: Price range, property type, amenities, rooms
- Range sliders for price/size
- Checkbox groups with counts

### Booking Flow
- Calendar component: Grid-based date picker with availability states
- Time slot selection: Button groups for visit scheduling
- Summary card: Sticky sidebar showing property image, dates, total price
- Form inputs: Rounded-lg, border focus states, clear labels

### Dashboard (Owner/Client)
- Sidebar navigation with icons
- Stats cards: Grid of 3-4 showing key metrics
- Tables: Striped rows, sortable columns, action buttons
- Status badges: Rounded-full pills with semantic colors

### Review System
- Star rating (large, filled/outlined)
- User avatar + name + date
- Review text with "Read more" expansion
- Photo grid for review images

## Image Strategy
**Hero Image**: Large, immersive destination/property photo (full-width, 60-80vh)

**Throughout Site**:
- Property listings: High-quality exterior/interior shots
- Gallery modal: Full-screen slideshow with thumbnails
- Owner profiles: Professional headshots
- Testimonials: Client photos
- Category cards: Destination highlights

**Image Treatment**: 
- Rounded corners (rounded-lg to rounded-xl)
- Lazy loading
- Aspect ratio preservation
- Subtle hover zoom on property cards

## Key Pages Structure

**Homepage**: Hero + search → Featured categories (3-4 cards) → Popular destinations (grid) → How it works (3 steps) → Testimonials → CTA footer

**Search Results**: Filters sidebar + property grid + map toggle (split view option)

**Property Detail**: Image gallery (main + thumbnails) → Property info (2-column: details + booking card) → Amenities grid → Location map → Reviews → Similar properties

**Dashboard**: Sidebar navigation + main content area with cards/tables/charts

## Interactions
- Minimal animations: Subtle hover lifts, smooth transitions (duration-200 to duration-300)
- Loading states: Skeleton screens for cards
- Form validation: Inline error messages, success states
- Modal overlays: Backdrop blur, slide-in animations

## Accessibility
- ARIA labels on all interactive elements
- Focus visible states (ring-2 ring-offset-2)
- Keyboard navigation support
- Alt text for all images
- Semantic HTML structure