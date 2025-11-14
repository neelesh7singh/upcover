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
