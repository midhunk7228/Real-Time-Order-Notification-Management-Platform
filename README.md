# Real-Time Order & Notification Management Platform

A comprehensive microservices-based order management system with real-time updates, event-driven architecture, and notification handling. Built with Express.js, React, Kafka, RabbitMQ, PostgreSQL, and Redis.

## 🏗️ Architecture Overview

The platform follows a microservices architecture with event-driven communication:

```
Frontend (React) → API Gateway → Microservices
                                    ↓
                            Kafka (Event Streaming)
                                    ↓
                    Inventory Service → Order Service
                                    ↓
                            RabbitMQ (Notifications)
                                    ↓
                    Email/SMS/Push Workers
```

### Key Components

- **API Gateway**: Single entry point for all client requests
- **Auth Service**: User authentication and authorization
- **Order Service**: Order lifecycle management with WebSocket support
- **Inventory Service**: Stock management and reservation
- **Notification Service**: Multi-channel notification delivery
- **Analytics Service**: Real-time metrics and reporting

### Technology Stack

**Backend:**
- Node.js (Express.js)
- PostgreSQL
- Apache Kafka (Event streaming)
- RabbitMQ (Message queue)
- Redis (Caching)
- Socket.io (WebSocket)

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Socket.io Client
- Recharts (Analytics)

## 📦 Project Structure

```
RealTimeOrder/
├── gateway-service/          # API Gateway
├── auth-service/            # Authentication & Authorization
├── order-service/           # Order Management
├── inventory-service/        # Inventory Management
├── notification-service/     # Notification System
├── analytics-service/        # Analytics & Reporting
├── frontend/
│   ├── user-app/           # User-facing React app
│   └── admin-dashboard/    # Admin dashboard
├── shared/                  # Shared utilities & schemas
├── docker-compose.yml       # Infrastructure setup
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RealTimeOrder
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```
   This starts:
   - PostgreSQL (port 5432)
   - Kafka + Zookeeper (port 9092)
   - RabbitMQ (ports 5672, 15672)
   - Redis (port 6379)

3. **Install dependencies for all services**
   ```bash
   # Backend services
   cd gateway-service && npm install && cd ..
   cd auth-service && npm install && cd ..
   cd order-service && npm install && cd ..
   cd inventory-service && npm install && cd ..
   cd notification-service && npm install && cd ..
   cd analytics-service && npm install && cd ..
   
   # Frontend apps
   cd frontend/user-app && npm install && cd ../..
   cd frontend/admin-dashboard && npm install && cd ../..
   ```

4. **Configure environment variables**

   Create `.env` files in each service directory (copy from `.env.example` if available):
   
   **gateway-service/.env:**
   ```env
   PORT=3000
   JWT_SECRET=your-secret-key
   AUTH_SERVICE_URL=http://localhost:3001
   ORDER_SERVICE_URL=http://localhost:3002
   INVENTORY_SERVICE_URL=http://localhost:3003
   ```
   
   **auth-service/.env:**
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=realtimeorder
   DB_USER=postgres
   DB_PASSWORD=postgres
   JWT_SECRET=your-secret-key
   ```
   
   Similar configuration for other services. See service directories for required variables.

5. **Start backend services** (in separate terminals)
   ```bash
   # Terminal 1 - Gateway
   cd gateway-service && npm start
   
   # Terminal 2 - Auth Service
   cd auth-service && npm start
   
   # Terminal 3 - Order Service
   cd order-service && npm start
   
   # Terminal 4 - Inventory Service
   cd inventory-service && npm start
   
   # Terminal 5 - Notification Service
   cd notification-service && npm start
   
   # Terminal 6 - Analytics Service
   cd analytics-service && npm start
   ```

6. **Start frontend applications**
   ```bash
   # Terminal 7 - User App
   cd frontend/user-app && npm run dev
   
   # Terminal 8 - Admin Dashboard
   cd frontend/admin-dashboard && npm run dev
   ```

7. **Access the applications**
   - User App: http://localhost:5173
   - Admin Dashboard: http://localhost:5174
   - RabbitMQ Management: http://localhost:15672 (admin/admin)

## 🔄 Event Flow

### Order Placement Flow

1. User submits order via React UI
2. Request goes through Gateway → Order Service
3. Order Service saves to PostgreSQL (status: CREATED)
4. Order Service emits `order.created` event to Kafka
5. Inventory Service consumes `order.created`
6. Inventory Service checks stock, reserves inventory
7. Inventory Service emits `order.confirmed` or `order.failed` to Kafka
8. Order Service updates order status
9. Order Service emits WebSocket event to frontend
10. Notification Service consumes status change
11. Notification Service publishes to RabbitMQ
12. Workers send notifications (email/SMS/push)

## 📡 API Endpoints

### Authentication (via Gateway: `/auth`)

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/verify` - Verify JWT token

### Orders (via Gateway: `/orders`)

- `POST /orders/create` - Create new order
- `GET /orders/:id` - Get order details
- `GET /orders` - Get user orders (with filters)
- `PUT /orders/:id/status` - Update order status (Admin only)

### Inventory (via Gateway: `/inventory`)

- `GET /inventory/products` - Get all products
- `GET /inventory/stock/:productId` - Get product stock

### Analytics (via Gateway: `/analytics`)

- `GET /analytics/dashboard` - Get dashboard data
- `GET /analytics/orders-per-day` - Orders per day metrics
- `GET /analytics/revenue` - Revenue metrics
- `GET /analytics/status-distribution` - Order status distribution

## 🎯 Features

### User App
- ✅ Order creation with product selection
- ✅ Real-time order tracking via WebSocket
- ✅ Order history with filters
- ✅ Notification center
- ✅ Dark mode support
- ✅ Responsive design

### Admin Dashboard
- ✅ Real-time orders table
- ✅ Order status management
- ✅ Analytics charts (orders, revenue, status distribution)
- ✅ Event logs viewer
- ✅ Kafka event monitoring
- ✅ Dark mode support

### Backend Services
- ✅ JWT-based authentication
- ✅ Role-based access control (User/Admin)
- ✅ Event-driven architecture with Kafka
- ✅ Notification system with RabbitMQ
- ✅ Retry logic and Dead Letter Queue
- ✅ Redis caching
- ✅ WebSocket real-time updates
- ✅ PostgreSQL for data persistence

## 🔐 Default Credentials

After starting services, you can register new users. To create an admin user:

1. Register a user via `/auth/register`
2. Update the database directly:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
   ```

## 🧪 Testing the System

1. **Register/Login** as a user
2. **Create an order** with products
3. **Watch real-time updates** in the order tracker
4. **Login as admin** to view all orders
5. **Update order status** to trigger notifications
6. **View analytics** in the admin dashboard

## 🐳 Docker Services

- **PostgreSQL**: Database for all services
- **Kafka**: Event streaming platform
- **RabbitMQ**: Message queue for notifications
- **Redis**: Caching layer

Access RabbitMQ Management UI at http://localhost:15672 (admin/admin)

## 📝 Environment Variables

Each service requires specific environment variables. See `.env.example` files in each service directory (create `.env` files based on them).

Key variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `KAFKA_BROKER`
- `RABBITMQ_URL`
- `REDIS_URL`
- `JWT_SECRET`
- Service ports

## 🔧 Development

### Running in Development Mode

Use `npm run dev` (with nodemon) for backend services to enable hot reloading.

### Database Schema

Database schemas are automatically initialized when services start. Check `src/db/schema.sql` in each service.

### Kafka Topics

Topics are auto-created. Main topics:
- `order.created`
- `order.confirmed`
- `order.shipped`
- `order.delivered`
- `order.failed`

### RabbitMQ Queues

Queues are auto-created:
- `email.notifications`
- `sms.notifications`
- `push.notifications`
- `notifications.dlq` (Dead Letter Queue)

## 🚨 Troubleshooting

1. **Services won't start**: Check if Docker containers are running
2. **Database connection errors**: Ensure PostgreSQL is up and credentials are correct
3. **Kafka connection errors**: Wait a few seconds after starting Docker Compose for Kafka to be ready
4. **WebSocket not working**: Check if order-service is running and Socket.io is connected
5. **Notifications not sending**: Check RabbitMQ queues and worker logs

## 📚 Additional Resources

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Socket.io Documentation](https://socket.io/docs/)
- [Express.js Documentation](https://expressjs.com/)

## 🎓 Interview Talking Points

This project demonstrates:

1. **Microservices Architecture**: Separate services with clear responsibilities
2. **Event-Driven Design**: Kafka for durable event streaming
3. **Message Queue Pattern**: RabbitMQ for async notification processing
4. **Real-time Communication**: WebSocket for live updates
5. **Scalability**: Horizontal scaling of services
6. **Reliability**: Retry logic, DLQ, and error handling
7. **Caching Strategy**: Redis for performance optimization
8. **API Gateway Pattern**: Single entry point with routing

## 📄 License

This project is for educational and demonstration purposes.

## 👥 Contributing

This is a demonstration project. Feel free to fork and extend it for your needs.

---

**Built with ❤️ for demonstrating real-time order management systems**
