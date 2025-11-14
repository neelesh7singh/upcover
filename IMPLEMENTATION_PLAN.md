# Subscription System Implementation Plan

## Overview
This document outlines the phased approach to building a subscription system with Stripe integration, MongoDB Atlas, and NestJS.

---

## Phase 1: Project Setup & Foundation

### Objectives
- Initialize NestJS project with necessary dependencies
- Configure MongoDB Atlas connection
- Set up project structure and environment variables
- Configure TypeScript and ESLint

### Tasks
1. **Initialize NestJS Project**
   - Create new NestJS project using CLI
   - Install core dependencies (@nestjs/core, @nestjs/common, etc.)

2. **Install Required Packages**
   - MongoDB: `@nestjs/mongoose`, `mongoose`
   - Authentication: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`
   - Stripe: `stripe`
   - Validation: `class-validator`, `class-transformer`
   - Swagger: `@nestjs/swagger`
   - Testing: `@nestjs/testing`, `supertest`, `jest`

3. **Environment Configuration**
   - Create `.env` file template
   - Set up `@nestjs/config` for environment variables
   - Configure variables: `MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PORT`

4. **Project Structure**
   - Create folder structure:
     ```
     src/
       ├── auth/
       ├── users/
       ├── subscriptions/
       ├── plans/
       ├── common/
       │   ├── decorators/
       │   ├── guards/
       │   ├── filters/
       │   └── interceptors/
       └── config/
     ```

5. **MongoDB Connection**
   - Configure Mongoose module in `app.module.ts`
   - Test database connection

6. **Basic App Configuration**
   - Set up global validation pipe
   - Configure CORS if needed
   - Set up basic logging

---

## Phase 2: User Authentication

### Objectives
- Implement user registration and login
- Set up JWT authentication
- Create user schema and service
- Implement authentication guards

### Tasks
1. **User Schema (MongoDB)**
   - Create User schema with fields:
     - `email` (unique, required)
     - `password` (hashed, required)
     - `role` (enum: 'user', 'admin', default: 'user')
     - `createdAt`, `updatedAt` (timestamps)

2. **User Module**
   - Create `users.module.ts`
   - Create `users.service.ts` with:
     - `create()` - user registration
     - `findByEmail()` - find user by email
     - `findById()` - find user by ID
   - Create `users.controller.ts` (optional, for admin endpoints later)

3. **Authentication Module**
   - Create `auth.module.ts`
   - Create `auth.service.ts` with:
     - `signup()` - register new user (hash password with bcrypt)
     - `login()` - validate credentials and return JWT
     - `validateUser()` - validate user credentials
   - Create `auth.controller.ts` with:
     - `POST /auth/signup` - user registration
     - `POST /auth/login` - user login

4. **JWT Strategy**
   - Create `jwt.strategy.ts` using Passport
   - Configure JWT module with secret and expiration

5. **Authentication Guards**
   - Create `jwt-auth.guard.ts` for protecting routes
   - Create `@Public()` decorator for public routes

6. **DTOs**
   - Create `signup.dto.ts` (email, password validation)
   - Create `login.dto.ts` (email, password validation)

---

## Phase 3: Subscription Plans & Basic Structure

### Objectives
- Create subscription plan models
- Implement plans endpoint
- Set up subscription schema structure

### Tasks
1. **Plan Schema (MongoDB)**
   - Create Plan schema with fields:
     - `name` (enum: 'Basic', 'Standard', 'Premium')
     - `price` (number, required)
     - `currency` (default: 'usd')
     - `stripePriceId` (string, for Stripe integration)
     - `features` (array of strings)
     - `duration` (e.g., 'monthly', 'yearly')

2. **Plans Module**
   - Create `plans.module.ts`
   - Create `plans.service.ts` with:
     - Hardcode 3 plans (Basic, Standard, Premium)
     - `findAll()` - return all plans
     - `findById()` - find plan by ID
     - `findByStripePriceId()` - find plan by Stripe price ID
   - Create `plans.controller.ts` with:
     - `GET /plans` - return all available plans (public endpoint)

3. **Subscription Schema (MongoDB)**
   - Create Subscription schema with fields:
     - `userId` (ObjectId, ref: User, required)
     - `planId` (ObjectId, ref: Plan, required)
     - `status` (enum: 'active', 'canceled', 'past_due', 'incomplete', required)
     - `stripeSubscriptionId` (string, unique, optional)
     - `stripeCustomerId` (string, optional)
     - `currentPeriodStart` (Date)
     - `currentPeriodEnd` (Date)
     - `canceledAt` (Date, optional)
     - `createdAt`, `updatedAt` (timestamps)

4. **Subscriptions Module (Basic)**
   - Create `subscriptions.module.ts`
   - Create `subscriptions.service.ts` (basic structure, will be expanded in Phase 4)
   - Create `subscriptions.controller.ts` (basic structure)

---

## Phase 4: Stripe Integration

### Objectives
- Integrate Stripe Checkout Sessions
- Implement webhook handler for Stripe events
- Store payment and subscription data

### Tasks
1. **Stripe Configuration**
   - Create `stripe.config.ts` or service to initialize Stripe client
   - Configure Stripe with secret key from environment

2. **Stripe Service**
   - Create `stripe.service.ts` with:
     - `createCheckoutSession()` - create Stripe Checkout Session
     - `retrieveSubscription()` - get subscription from Stripe
     - `cancelSubscription()` - cancel subscription in Stripe
     - `constructWebhookEvent()` - verify webhook signature

3. **Checkout Endpoint**
   - In `subscriptions.controller.ts`:
     - `POST /subscriptions/checkout` - create Stripe Checkout Session
     - Requires authentication
     - Accepts `planId` in request body
     - Returns checkout session URL

4. **Webhook Endpoint**
   - Create `POST /webhooks/stripe` endpoint
   - Handle Stripe events:
     - `checkout.session.completed` - create subscription record
     - `customer.subscription.created` - update subscription
     - `customer.subscription.updated` - update subscription status
     - `customer.subscription.deleted` - mark subscription as canceled
     - `invoice.payment_failed` - update subscription status to 'past_due'
   - Verify webhook signature
   - Log all events using NestJS Logger

5. **Subscription Service Updates**
   - Update `subscriptions.service.ts` with:
     - `create()` - create subscription record
     - `updateByStripeSubscriptionId()` - update subscription from webhook
     - `findByUserId()` - get user's subscription
     - `findByStripeSubscriptionId()` - find by Stripe ID

6. **Error Handling for Stripe**
   - Add try-catch blocks around Stripe API calls
   - Log Stripe errors using NestJS Logger
   - Return appropriate error responses

---

## Phase 5: Subscription Management

### Objectives
- Implement subscription retrieval
- Implement subscription cancellation
- Add proper status management

### Tasks
1. **Get Subscription Endpoint**
   - In `subscriptions.controller.ts`:
     - `GET /subscription` - get current user's subscription
     - Requires authentication
     - Returns subscription details with plan information
     - Returns null/404 if no active subscription

2. **Cancel Subscription Endpoint**
   - In `subscriptions.controller.ts`:
     - `POST /subscription/cancel` - cancel user's subscription
     - Requires authentication
     - Cancels subscription in Stripe
     - Updates subscription status in database
     - Sets `canceledAt` timestamp

3. **Subscription Service Enhancements**
   - Add `cancel()` method:
     - Cancel in Stripe
     - Update local database
     - Handle errors gracefully
   - Add `getActiveSubscription()` method:
     - Get user's active subscription
     - Include plan details via population

4. **DTOs**
   - Create `create-checkout.dto.ts` (planId)
   - Create `subscription-response.dto.ts` (response format)

---

## Phase 6: Role-Based Access Control (RBAC)

### Objectives
- Implement role-based authorization
- Create admin endpoints
- Protect routes based on user roles

### Tasks
1. **Role Decorator**
   - Create `@Roles()` decorator in `common/decorators/`
   - Accepts array of roles ('admin', 'user')

2. **Roles Guard**
   - Create `roles.guard.ts` in `common/guards/`
   - Check if user has required role
   - Extract user from JWT token

3. **Admin Endpoints**
   - In `subscriptions.controller.ts`:
     - `GET /admin/subscriptions` - get all user subscriptions (admin only)
     - `GET /admin/subscriptions/:userId` - get specific user's subscription (admin only)
   - In `users.controller.ts`:
     - `GET /admin/users` - list all users (admin only)

4. **Update Guards**
   - Apply `@Roles('admin')` decorator to admin endpoints
   - Combine JWT auth guard with roles guard

5. **User Service Updates**
   - Add method to update user role (for seeding admin users)
   - Or create migration/seed script for admin user

---

## Phase 7: Logging & Error Handling

### Objectives
- Implement comprehensive logging
- Create global error handler
- Add structured error responses

### Tasks
1. **Global Exception Filter**
   - Create `http-exception.filter.ts` in `common/filters/`
   - Handle all HTTP exceptions
   - Format error responses consistently
   - Log errors with context

2. **Stripe Error Logging**
   - Enhance Stripe service error handling
   - Log payment failures with:
     - User ID
     - Plan ID
     - Error message
     - Timestamp
   - Use NestJS Logger with appropriate log levels

3. **Request Logging Interceptor**
   - Create `logging.interceptor.ts` in `common/interceptors/`
   - Log incoming requests (method, URL, user)
   - Log response status and time

4. **Error Response DTO**
   - Create standardized error response format
   - Include: message, statusCode, timestamp, path

5. **Apply Global Filters**
   - Register global exception filter in `main.ts`
   - Register global validation pipe
   - Configure global interceptors

---

## Phase 8: API Documentation (Swagger)

### Objectives
- Document all API endpoints
- Add request/response examples
- Configure Swagger UI

### Tasks
1. **Swagger Configuration**
   - Configure Swagger in `main.ts`
   - Set up Swagger module with API info
   - Configure security schemes (Bearer token)

2. **API Tags**
   - Add `@ApiTags()` to controllers:
     - `@ApiTags('Authentication')` for auth controller
     - `@ApiTags('Plans')` for plans controller
     - `@ApiTags('Subscriptions')` for subscriptions controller

3. **Endpoint Documentation**
   - Add `@ApiOperation()` for each endpoint
   - Add `@ApiResponse()` for success/error responses
   - Add `@ApiBearerAuth()` for protected endpoints
   - Add `@ApiBody()` for request bodies

4. **DTO Documentation**
   - Add `@ApiProperty()` to all DTOs
   - Add descriptions and examples
   - Mark required fields

5. **Test Swagger UI**
   - Verify all endpoints are documented
   - Test Swagger UI at `/api` endpoint
   - Verify authentication works in Swagger

---

## Phase 9: Testing

### Objectives
- Write unit tests for services
- Write integration tests for controllers
- Achieve good test coverage

### Tasks
1. **Test Setup**
   - Configure Jest for NestJS
   - Set up test database (or use in-memory)
   - Create test utilities and helpers

2. **Unit Tests - Services**
   - `auth.service.spec.ts`:
     - Test signup (success, duplicate email)
     - Test login (success, invalid credentials)
   - `users.service.spec.ts`:
     - Test user creation and retrieval
   - `plans.service.spec.ts`:
     - Test plan retrieval
   - `subscriptions.service.spec.ts`:
     - Test subscription creation, update, cancellation
     - Mock Stripe service
   - `stripe.service.spec.ts`:
     - Mock Stripe API calls
     - Test checkout session creation
     - Test webhook verification

3. **Integration Tests - Controllers**
   - `auth.controller.e2e-spec.ts`:
     - Test POST /auth/signup
     - Test POST /auth/login
   - `plans.controller.e2e-spec.ts`:
     - Test GET /plans
   - `subscriptions.controller.e2e-spec.ts`:
     - Test GET /subscription (with auth)
     - Test POST /subscription/cancel (with auth)
     - Test POST /subscriptions/checkout (with auth)
     - Test POST /webhooks/stripe (without auth)
   - `admin.controller.e2e-spec.ts`:
     - Test admin endpoints with admin role
     - Test admin endpoints with user role (should fail)

4. **Test Data & Fixtures**
   - Create test users (admin and regular)
   - Create test plans
   - Create mock Stripe responses

5. **Test Coverage**
   - Run coverage reports
   - Aim for >80% coverage on services and controllers
   - Document any uncovered edge cases

---

## Phase 10: Final Polish & Deployment Preparation

### Objectives
- Code cleanup and optimization
- Environment configuration for different stages
- Documentation updates
- Deployment readiness

### Tasks
1. **Code Review**
   - Remove console.logs
   - Ensure consistent code style
   - Add JSDoc comments where needed
   - Review error messages for clarity

2. **Environment Configuration**
   - Create `.env.example` file
   - Document all required environment variables
   - Set up different configs for dev/staging/prod

3. **README Documentation**
   - Update README with:
     - Project description
     - Setup instructions
     - Environment variables
     - API endpoints overview
     - Testing instructions
     - Deployment guide

4. **Security Review**
   - Ensure passwords are hashed
   - Verify JWT secret is secure
   - Check webhook signature verification
   - Review input validation

5. **Performance Considerations**
   - Add database indexes (userId, stripeSubscriptionId)
   - Optimize queries with proper population
   - Consider pagination for admin endpoints

6. **Final Testing**
   - End-to-end testing of complete flow:
     - Signup → Login → View Plans → Checkout → Webhook → View Subscription → Cancel
   - Test error scenarios
   - Test admin functionality

---

## Dependencies Summary

### Core Dependencies
- `@nestjs/core`, `@nestjs/common`
- `@nestjs/mongoose`, `mongoose`
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
- `bcrypt`
- `stripe`
- `@nestjs/config`
- `class-validator`, `class-transformer`
- `@nestjs/swagger`

### Development Dependencies
- `@nestjs/testing`
- `supertest`
- `jest`, `@types/jest`
- `@types/passport-jwt`
- `@types/bcrypt`

---

## Estimated Timeline

- **Phase 1**: 1-2 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 1-2 hours
- **Phase 4**: 3-4 hours
- **Phase 5**: 1-2 hours
- **Phase 6**: 1-2 hours
- **Phase 7**: 1-2 hours
- **Phase 8**: 1-2 hours
- **Phase 9**: 3-4 hours
- **Phase 10**: 1-2 hours

**Total Estimated Time**: 16-25 hours

---

## Notes

- Each phase builds upon the previous one
- Test as you go - don't wait until Phase 9
- Use Stripe test mode during development
- Keep environment variables secure
- Consider using Stripe CLI for local webhook testing



