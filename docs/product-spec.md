# Saraya

## A Personalized Guide for Planning and Travelling to the Philippines

### Product Documentation & Workflow Specification

### Hackathon Project

---

## TABLE OF CONTENTS

1. Executive Summary
2. Application Architecture
3. User Roles & Authentication
4. MVP Feature Specifications
5. Premium and Stretch Features
6. Page & Screen Specifications
7. User Workflows & Flows
8. Technical Requirements
9. Data Models & Database Schema
10. API Specifications
11. Integration Points
12. Development Timeline & Deliverables

---

## 1. EXECUTIVE SUMMARY

Saraya is a comprehensive travel companion application designed specifically for exploring the Philippines. The app combines personalized recommendations, gamified discovery, cultural education, real-time safety alerts, and social collaboration features to create an engaging travel planning and tracking experience.

The MVP (Minimum Viable Product) focuses on five core features that address the key pain points of Philippines travel:

- Location-based personalized discovery and bucket list curation
- Interactive travel journal with gamified check-ins and culturally-relevant achievements
- Comprehensive cultural and historical guides with practical etiquette
- Real-time safety and weather alerts integrated with PAGASA
- Festival and event tracker with location-based notifications

Premium features unlock advanced capabilities including offline functionality, AI-powered multi-destination itinerary generation, hidden gem discovery, collaborative group trip planning, and priority notifications.

---

## 2. APPLICATION ARCHITECTURE

### Selected Technology Stack:

- **Frontend:** React Native with Expo and TypeScript
- **Navigation:** Expo Router
- **Backend:** Node.js with Express and TypeScript using a RESTful API
- **Database:** PostgreSQL with PostGIS for geospatial queries
- **Real-time:** Push notifications for the MVP; WebSockets are a post-MVP enhancement
- **Caching:** Redis for location-based queries and session management
- **Maps:** Google Maps behind a backend adapter; an alternative provider may be substituted
- **Notifications:** Firebase Cloud Messaging
- **Monetization:** RevenueCat lifetime Premium and consumable generation packs
- **Cloud:** AWS, Google Cloud, or Firebase for hosting and storage

The repository is organized as an npm-workspace monorepo. Executable applications live in `apps/`, shared HTTP contracts and client code live in `packages/`, database assets live in `database/`, and engineering documentation lives in `docs/`. See [Architecture](architecture.md) and [Ownership](ownership.md) for the current boundaries.

---

## 3. USER ROLES & AUTHENTICATION

### User Types:

**Anonymous Users:**
Browse basic destination information and view public events with limited functionality.

**Free Registered Users:**
Full access to MVP features including personalized discovery, bucket lists, travel journal, check-ins, cultural guides, and safety alerts. Limited to single-destination itinerary recommendations.

**Premium Users:**
Access to all features including offline mode, AI itinerary generation, hidden gems database, collaborative group trips, and ad-free experience.

### Monetization and itinerary quotas

- Free registered accounts receive 3 successful itinerary generations for the lifetime of the account.
- Premium is a one-time lifetime purchase. Ownership does not expire or renew.
- Lifetime Premium includes 10 successful itinerary generations per UTC calendar month and enables
  Premium-only features, including itinerary regeneration.
- A consumable pack adds 10 generation credits without granting Premium. Its intended base store
  configuration is USD $5, while the app displays the localized store price returned by RevenueCat.
- Included credits are consumed before purchased credits. Purchased credits survive calendar-month
  resets. Failed or cancelled generation requests do not consume a credit.
- Authentication and the API must enforce quota atomically per account. Mobile-local quota storage
  is acceptable only for the current demonstration and is not a security boundary.

### Authentication Methods:

- Email/Password with email verification
- Google Sign-In
- Facebook Sign-In
- Apple Sign-In (iOS)

---

## 4. MVP FEATURE SPECIFICATIONS

### 4.1 Personalized Discovery & Bucket Lists

**Description:**
Dynamic recommendation engine that suggests establishments, activities, and tourist spots based on:

- User's current GPS location
- User profile preferences (travel style, budget, interests)
- Time available (day trip vs week-long)
- Season and weather conditions

**Key Features:**

- Browse recommendations in a feed or map view
- Add items to personal bucket list with note-taking capability
- Filter by category (beaches, mountains, food, culture, adventure)
- Sort by distance, rating, or popularity

### 4.2 Interactive Tracking & Localized Gamification

**Description:**
Transform travel into an engaging game by tracking visited locations and rewarding achievements with culturally-relevant titles and badges.

**Key Features:**

- GPS-based check-in system (requires GPS proximity confirmation)
- Travel journal with photo upload and location tagging
- Achievements unlocked at thresholds (e.g., Island Hopper after 5 islands)
- Culturally-themed badges: Lechon Connoisseur, Beach Collector, Heritage Explorer
- Progress tracking and statistics dashboard

### 4.3 Deep-Dive Cultural & Historical Guides

**Description:**
Comprehensive cultural education beyond surface-level travel advice, providing context for respectful and meaningful travel experiences.

**Content Categories:**

- Historical Timeline & Significance
- Local Customs & Traditions
- Tipping Culture & Payment Etiquette
- Pasalubong Traditions (souvenir gifting)
- Kamayan Etiquette (eating with hands)
- Photography & Social Interaction Norms

### 4.4 Real-Time Safety & Weather Alerts

**Description:**
Integration with PAGASA (Philippine Atmospheric, Geophysical and Astronomical Services Administration) and local authority data to provide critical travel safety information.

**Alert Types:**

- Weather Warnings (typhoon, heavy rain, storm surge)
- Travel Safety Status (Green/Yellow/Red zones)
- Ferry & Transportation Cancellations
- Health Advisories & Warnings
- Local Event Disruptions

### 4.5 Festival & Event Tracker

**Description:**
Curated database of Philippine festivals with source-backed cultural information, explicitly
verified annual schedules, location-based recommendations, and Saraya-authored survival guides.

**Key Features:**

- Calendar view by region and typical month, with exact dates only for verified occurrences
- Filter by region, month, or interest
- Detailed event information with recurring, confirmed, estimated, cancelled, or unknown schedule status
- Direct provenance links and a visible last-verification date on festival details
- Survival guides for major events (Sinulog, Ati-Atihan, Panagbenga)
- Push notifications for upcoming events within user's itinerary
- Accommodation and dining tips during peak festival periods

---

## 5. PREMIUM AND STRETCH FEATURES

The features in this section are post-MVP stretch goals unless a feature is explicitly listed in the MVP deliverables. RevenueCat sandbox entitlement and a basic paywall remain part of the required MVP, but the advanced premium capabilities they unlock must not delay the core product flows.

### 5.1 Complete Offline Mode

Enables seamless travel in areas with unreliable connectivity (Palawan, Siargao, Batanes, etc.)

**Includes:**

- Offline maps with regional data
- Cached destination information and guides
- Offline survival phrases in local dialects
- Saved itineraries and bucket lists

### 5.2 AI-Powered Itinerary Generator

Generates optimized multi-destination itineraries based on:

- Trip duration (1-30 days)
- Budget constraints
- Travel style preferences
- Accessibility requirements
- Ferry/flight schedules and travel times

Output includes daily breakdown with recommended accommodations, dining, and activities.

### 5.3 Hidden Gem Database

Access to off-the-beaten-path locations including:

- Local-secret waterfalls and swimming holes
- Hidden beach coves and island gems
- Local carinderia (eateries) with authentic cuisine
- Underground arts and cultural venues
- Sustainable tourism experiences

### 5.4 Collaborative Group Trips

Shared workspace for group travel planning (barkada trips):

- Invite friends to collaborative itineraries
- Democratic voting on bucket list items
- Expense splitting calculator
- Shared notes and decision history
- Group chat and calendar coordination

### 5.5 Ad-Free & Priority Booking Notifications

- Remove all advertisements from the app
- Early push notifications when festival hotels availability drops
- Priority alerts for flash sales and special offers

---

## 6. PAGE & SCREEN SPECIFICATIONS

### 6.1 Authentication & Onboarding

**Splash Screen**

- Display app logo and loading animation
- Auto-authenticate existing sessions

**Login/Sign-Up Screen**

- Email/password form
- Social sign-in buttons (Google, Facebook, Apple)
- Toggle between login and sign-up
- Password reset option

**Onboarding Profile Setup**

- Profile photo upload
- Travel style preferences (adventure, relaxation, cultural, food-focused)
- Budget range selection
- Favorite regions/interests
- Location permissions request

### 6.2 Main Navigation Hub

**Bottom Tab Navigation with 5 main sections:**

**Tab 1: Discover (Home)**
Landing screen showing personalized recommendations in feed or map view. Quick filters for category and distance. Search bar for specific destinations. Weather widget for current location.

**Tab 2: My Journey (Travel Journal)**
Travel timeline showing check-ins and journal entries with photos. Map view of visited locations. Statistics dashboard (islands visited, places checked in, achievements). Check-in button for GPS-based check-ins.

**Tab 3: Bucket List**
Curated list of saved destinations and activities. Organizable by region, priority, or type. Filtering and sorting options. Quick add/remove functionality.

**Tab 4: Events & Festivals**
Calendar view of Philippines festivals. Regional filters. Event detail cards with descriptions, dates, survival guides. Push notification settings per event.

**Tab 5: Profile & Settings**
User profile information and photo. Achievement badges and statistics. Trip history. Preferences and settings. Lifetime Premium purchase and generation-balance management. Safety alert settings. Logout option.

### 6.3 Detail Screens

**Destination Detail Screen**

- Hero image carousel
- Destination name, type, and rating
- Description and historical context
- Cultural etiquette section
- Location map with directions
- Reviews and visitor comments
- Add to bucket list button
- Check-in button (if nearby)

**Check-In & Journal Entry Screen**

- Photo upload interface
- Location verification (GPS confirmation)
- Journal entry text field
- Mood/experience emoji selector
- Tag selection (companions, activities)
- Submit button with achievement check

**Festival Detail Screen**

- Festival name and dates
- Historical significance and traditions
- Location and travel information
- Schedule of events
- Survival guide (what to expect, tips, warnings)
- Accommodation and dining suggestions
- Add to calendar button

---

## 7. USER WORKFLOWS & FLOWS

### 7.1 New User Onboarding Flow

1. Splash screen → Authentication
2. Login/Sign-up selection
3. Complete profile with preferences
4. Request location permissions
5. Landing on Discovery tab with personalized recommendations

### 7.2 Discovery & Bucket List Flow

1. User browses recommendations on Discover tab
2. Tap destination for detail view
3. Read cultural guides and historical context
4. Tap 'Add to Bucket List' → confirmation
5. Navigate to Bucket List tab to manage items

### 7.3 Travel & Check-In Flow

1. User arrives at destination
2. Open app → navigate to My Journey or destination detail
3. Tap 'Check In' button
4. App verifies GPS location (within 100-200m)
5. User captures photo and writes journal entry
6. System checks for new achievements and displays badge
7. Check-in saved to journey timeline

### 7.4 Safety Alert Flow

1. Backend continuously monitors PAGASA weather and safety APIs
2. Alert triggered for user's current location or planned destinations
3. Push notification sent with alert type and details
4. User taps notification → Alert detail screen
5. Display affected areas, recommendations, and alternative routes

### 7.5 Festival Event Flow

1. Browse Events tab for upcoming festivals
2. Filter by region or date range
3. Tap festival for detail screen
4. Read survival guide and traditions
5. Add a confirmed occurrence to the calendar; unconfirmed recurring or estimated periods cannot
   silently become exact calendar events
6. View accommodation suggestions

### 7.6 Premium Feature: Group Trip Planning

1. Premium user creates group trip workspace
2. Invites friends via share link or contact selection
3. Friends accept and join workspace
4. All members vote on bucket list items to include
5. Premium AI itinerary generator creates multi-destination itinerary
6. Members discuss and finalize via shared notes
7. Expense calculator splits costs among members

---

## 8. TECHNICAL REQUIREMENTS

### Frontend Requirements:

- Responsive design for iOS and Android
- GPS location services integration
- Camera and photo library access
- Push notification handling
- Offline storage with SQLite or Realm
- Google Maps integration behind the mobile/API abstraction
- Push-notification support for alerts and reminders
- WebSocket support as a post-MVP enhancement

### Backend Requirements:

- RESTful API with rate limiting
- JWT-based authentication and session management
- PostgreSQL database with PostGIS extension for geospatial queries
- Redis caching layer for performance
- Push-notification dispatch for the MVP
- WebSocket server as a post-MVP enhancement
- Background job processing for alerts and recommendations
- File storage (AWS S3 or Google Cloud Storage)

### Third-Party Integrations:

- PAGASA API (weather and safety alerts)
- Google Maps API (mapping and directions)
- Google/Facebook OAuth (authentication)
- RevenueCat SDK (lifetime and consumable in-app purchases through Google Play Billing and Apple App Store)
- Firebase Cloud Messaging (push notifications)
- OpenAI API (AI itinerary generation - premium)

### Performance & Security:

- API response time < 500ms for 95th percentile
- Support 10,000+ concurrent users
- HTTPS/TLS encryption for all traffic
- Regular security audits and penetration testing
- GDPR and local data privacy compliance
- Rate limiting and DDoS protection

---

## 9. DATA MODELS & DATABASE SCHEMA

### Core Data Models:

**User**

- id, email, password_hash, phone, first_name, last_name, profile_photo_url, travel_style, budget_range, favorite_regions, created_at, updated_at, last_login, is_premium, premium_acquired_at, revenuecat_app_user_id

**Destination**

- id, name, category, description, historical_context, location (PostGIS Point), region, latitude, longitude, thumbnail_image, photos[], rating, review_count, is_hidden_gem (premium), created_at

**CheckIn**

- id, user_id, destination_id, timestamp, location (PostGIS Point), photo_url, journal_entry, mood, companions[], tags[], achievement_unlocked

**BucketListItem**

- id, user_id, destination_id, added_at, priority, personal_notes, status (planned/visited/skipped)

**Festival**

- Stable identity: id, name, region, typical_month, recurrence_description, description, traditions, and location
- Annual occurrence: schedule_year, status, confirmed dates when applicable, official schedule,
  verification timestamp, and source references
- Editorial guidance: explicitly Saraya-curated survival, accommodation, dining, and travel advice

**Achievement**

- id, title, description, icon, unlock_criteria, category (islands, food, culture, etc.)

**UserAchievement**

- id, user_id, achievement_id, unlocked_at, check_in_id (which check-in unlocked it)

**SafetyAlert**

- id, alert_type (weather/travel_advisory/cancellation), region, severity, message, location (PostGIS geometry), start_time, end_time, created_at

**GroupTrip**

- id, trip_name, creator_id, members[], destination_ids[], start_date, end_date, budget, created_at, is_draft

**Itinerary**

- id, trip_id, day_number, destination_id, time_slot, notes, accommodation, dining, created_at

**CulturalGuide**

- id, destination_id, category (etiquette/tipping/traditions/photography), content, images[], created_at, updated_at

---

## 10. API SPECIFICATIONS

### Authentication Endpoints:

- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate user and return JWT
- `POST /auth/logout` - Invalidate session
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/password-reset` - Initiate password recovery

### Discovery Endpoints:

- `GET /destinations` - Get personalized recommendations (location-based)
- `GET /destinations/:id` - Get destination detail with cultural guides
- `GET /destinations/search` - Search destinations by keyword
- `GET /destinations/nearby` - Get nearby destinations within radius

### Bucket List Endpoints:

- `GET /bucket-list` - Get user's bucket list items
- `POST /bucket-list` - Add item to bucket list
- `PATCH /bucket-list/:id` - Update bucket list item (priority, status, notes)
- `DELETE /bucket-list/:id` - Remove item from bucket list

### Travel Journal & Check-In Endpoints:

- `POST /check-ins` - Create check-in with photo and journal
- `GET /check-ins` - Get user's check-in history
- `GET /check-ins/timeline` - Get timeline view of check-ins
- `GET /check-ins/map` - Get map view of visited locations

### Achievements Endpoints:

- `GET /achievements` - Get all available achievements
- `GET /user/achievements` - Get user's unlocked achievements
- `GET /user/statistics` - Get travel statistics (islands, destinations, etc.)

### Festivals & Events Endpoints:

- `GET /festivals` - Get all festivals with filter/sort options
- `GET /festivals/:id` - Get festival detail with survival guide
- `GET /festivals/upcoming` - Get upcoming festivals for user's region
- `POST /festivals/:id/calendar` - Add festival to user's calendar

### Safety & Weather Endpoints:

- `GET /safety-alerts` - Get active safety alerts for user's location
- `GET /weather` - Get current weather for user's location or destination
- `GET /alerts/:region` - Get alerts for specific region

### Group Trip Endpoints (Premium):

- `POST /group-trips` - Create new group trip
- `GET /group-trips/:id` - Get group trip details
- `POST /group-trips/:id/invite` - Invite member to group trip
- `POST /group-trips/:id/vote` - Vote on bucket list item
- `POST /group-trips/:id/generate-itinerary` - Generate AI itinerary
- `PATCH /group-trips/:id/expense-split` - Calculate shared expenses

---

## 11. INTEGRATION POINTS

### PAGASA Weather & Safety Data

- API to fetch real-time typhoon, monsoon, and weather warnings
- Geospatial filtering to match alerts to user locations
- Scheduled polling every 30 minutes or event-triggered updates

### Maps & Location Services

- Google Maps API for mapping, directions, and place details
- Distance calculations for location-based filtering
- Offline maps for premium users (downloaded tile data)

### Payment, Premium, and generation quota

- RevenueCat SDK for a non-consumable lifetime Premium purchase and a consumable 10-generation pack.
- The `saraya_premium` entitlement represents permanent Premium ownership; the consumable does not
  attach to that entitlement.
- Google Play Console and Apple App Store Connect configuration for sandbox testing.
- RevenueCat webhooks synchronize lifetime ownership and idempotently credit consumable purchases.
- The authenticated itinerary endpoint atomically verifies and consumes one generation only after
  successful generation. Premium included quota resets at 00:00 UTC on the first day of each month.

### AI Itinerary Generation

- OpenAI GPT API for natural language generation
- Input: duration, budget, style, accessibility needs
- Output: structured day-by-day itinerary JSON

### Push Notifications

- Firebase Cloud Messaging or OneSignal
- Segmented targeting based on user preferences and location
- Templates for alerts, events, and promotional messages

---

## 12. DEVELOPMENT TIMELINE & DELIVERABLES

### Hackathon Timeline (Typical 24-36 Hour Hackathon):

**Hours 0-3: Planning & Setup**

- Finalize team roles (backend, frontend, design, PM)
- Initialize the monorepo and local development environment
- Design UI mockups for key screens

**Hours 3-12: Core Development Phase 1**

- Backend: Authentication, user model, database setup
- Frontend: Login/signup screens, navigation scaffolding
- Start destination data population

**Hours 12-18: Core Development Phase 2**

- Backend: Destination recommendations, check-in logic, PAGASA integration
- Frontend: Discovery tab, bucket list management, check-in flow
- MVP Feature 1-3 mostly complete

**Hours 18-24: Polish & Additional Features**

- Complete MVP features (festivals, safety alerts, achievements)
- UI refinement and user testing
- Integration testing and bug fixes

**Hours 24-36 (if extended hackathon):**

- Begin one premium feature (group trips or AI itinerary)
- Integrate RevenueCat SDK, configure store sandbox environments, and implement lifetime Premium and generation top-up purchases.
- Performance optimization
- Prepare demo and presentation materials

### MVP Deliverables (End of Hackathon):

- ✓ Functional mobile app (iOS/Android or web version)
- ✓ Authentication system with at least email login
- ✓ Discovery recommendations with at least 50 sample destinations
- ✓ Bucket list CRUD functionality
- ✓ Check-in and travel journal with photo upload
- ✓ Cultural guides for sample destinations
- ✓ Festival/events display with basic data
- ✓ Achievement system with 5-10 sample achievements
- ✓ Location-based filtering working
- ✓ RevenueCat SDK integrated with the lifetime Premium entitlement and generation-pack sandbox products
- ✓ Fully functional demo recording (2-3 minutes)
- ✓ Documentation and architecture overview

### Post-Hackathon Roadmap:

**Phase 2:** Expand destination database, real PAGASA integration, premium features launch, performance optimization

**Phase 3:** AI itinerary generation, offline mode, app store releases, marketing campaign

**Phase 4:** Community features, content moderation, analytics, monetization

### Team Responsibilities:

**Backend Lead (1-2 people):**
API development, database design, authentication, location-based queries

**Frontend Lead (1-2 people):**
Mobile/web app UI/UX, integration with APIs, photo upload, maps

**UI/UX Designer (1 person):**
Mockups, design system, user flows, prototyping

**Content & Data Manager (0-1 person):**
Destination data population, cultural guides, festival information

**Project Manager (0-1 person):**
Coordination, prioritization, demo preparation, timeline management

### Testing Checklist:

**Unit Tests:**

- Authentication logic (JWT validation)
- Location distance calculations
- Recommendation engine
- Achievement unlock logic

**Integration Tests:**

- API endpoints with mock data
- Database operations
- Photo upload and storage

**User Acceptance Tests:**

- Complete user journeys (onboarding, discovery, check-in, bucket list)
- Cross-platform compatibility (iOS/Android)
- Edge cases (offline mode, poor connectivity)
- Performance with 10+ check-ins and 50+ bucket items

---

**DOCUMENT END**
