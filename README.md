# Subscription System

A production-ready subscription system built with NestJS, integrating Stripe for payments and MongoDB Atlas for data persistence.

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd upcover-assignment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with the following variables:

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_API_VERSION=2023-10-16

# Frontend URL (for Stripe Checkout redirects)
FRONTEND_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Stripe Setup

### Creating Products and Prices in Stripe

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Navigate to **Products** → **Add product**
3. Create products for each plan (Basic, Standard, Premium)
4. For each product, create a **Price** (recurring subscription)
5. Copy the **Price ID** (starts with `price_`) for each plan

### Linking Price IDs to Plans

After creating prices in Stripe, link them to your plans using the admin endpoint:

```bash
# Update a plan's Stripe Price ID (requires admin authentication)
PATCH /plans/admin/:planId/stripe-price
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "stripePriceId": "price_1234567890"
}
```

Alternatively, you can use the Stripe Product ID. The system will automatically fetch the default price from the product.

### Setting Up Webhooks

Stripe webhooks require a publicly accessible URL. For local development, you have two options:

#### Option 1: Using Stripe CLI (Recommended for Development)

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Other platforms: https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/webhooks/stripe
   ```

4. Copy the webhook signing secret (starts with `whsec_`) and add it to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_from_cli
   ```

#### Option 2: Using Ngrok

1. Install ngrok:
   ```bash
   # macOS
   brew install ngrok
   
   # Other platforms: https://ngrok.com/download
   ```

2. Start your application:
   ```bash
   npm run start:dev
   ```

3. Expose your local server:
   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Create a webhook endpoint in Stripe Dashboard:
   - Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
   - Click **Add endpoint**
   - Enter your ngrok URL: `https://abc123.ngrok.io/webhooks/stripe`
   - Select events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Click **Add endpoint**

6. Copy the webhook signing secret:
   - Click on the created webhook endpoint
   - Click **Reveal** next to "Signing secret"
   - Copy the secret (starts with `whsec_`)
   - Add it to your `.env`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
     ```

**Note**: For production, use a permanent webhook endpoint URL pointing to your deployed server.

## Running the Application

### Development
```bash
npm run start:dev
```

The application will start on `http://localhost:3000`

### Production
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## API Documentation

Once the application is running, access the Swagger documentation at:
- **URL**: `http://localhost:3000/api`

## Testing

Run unit tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:cov
```
