# Elite Hub 🚀

**Elite Hub** is a robust, full-stack enterprise-grade platform offering automated Virtual Top-Up (VTU) telecom services, global eSIM data packages, SMS marketing campaigns with contact phonebooks, secure wallet management, and developer-friendly public APIs.

---

## ✨ Key Features

### 1. Telecom & VTU Services
* **Airtime & Data Purchases**: Instant automated top-ups across multiple telecom providers.
* **Utility Bills**: Electricity token generation and Cable TV subscription payments.
* **eSIM Integration**: Global eSIM package browsing, purchasing, and QR code delivery via providers like Airalo.

### 2. Messaging & SMS Campaigns
* **Bulk SMS Campaigns**: Schedule and dispatch targeted SMS campaigns with dynamic recipient lists.
* **Phonebook Management**: Group contacts, parse and import CSV contact lists seamlessly.
* **Sender ID Requests**: User submission and admin approval workflow for custom Sender IDs.

### 3. Financials & Wallet
* **Multi-Gateway Funding**: Automated wallet funding integrated with **Paystack** and **Monnify**.
* **Ledger Security**: Concurrency-safe transaction processing with atomic updates and Redis locking.

### 4. Developer API & Ecosystem
* **API Key Management**: Generate, scope, and revoke public API keys with rate-limiting.
* **Webhook Delivery**: Reliable asynchronous event notifications dispatched via background workers (BullMQ).
* **AI Support Widget**: Context-aware customer support powered by Gemini and Anthropic SDK integrations.

---

## 🛠️ Tech Stack

### Backend (`/backend`)
* **Runtime**: Node.js (CommonJS / ES Modules)
* **Framework**: Express
* **ORM & Database**: Prisma ORM with PostgreSQL
* **Caching & Queues**: Redis & BullMQ for background worker orchestration
* **Authentication**: JSON Web Tokens (JWT), Passport.js (Google OAuth2)

### Frontend (`/frontend`)
* **Framework**: React (Vite, ES Modules)
* **Styling**: Tailwind CSS & Radix UI primitives
* **State Management**: Redux Toolkit & TanStack React Query
* **Routing**: React Router DOM

---

## 📁 Project Structure

```text
Elite_Hub/
├── backend/              # Node.js / Express API & Workers
│   ├── prisma/           # Database schema & migrations
│   ├── src/
│   │   ├── modules/      # Feature controllers, routes, and services
│   │   ├── workers/      # BullMQ background workers (SMS, Webhooks, Reconciliation)
│   │   └── queues/       # Redis queue configurations
│   └── package.json      # Backend dependencies
├── frontend/             # React + Vite Client Application
│   ├── src/
│   │   ├── features/     # Feature-based pages and components (admin, user, wallet, esim, sms)
│   │   ├── components/   # Shared UI components and layouts
│   │   └── app/          # Store and client providers
│   └── package.json      # Frontend dependencies
├── scripts/              # DevOps, health check, and backup scripts
└── elite-hub.conf        # Nginx
