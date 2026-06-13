# 🚀 MyChatAppli

A production-oriented real-time messaging platform built with React, Node.js, MongoDB, Redis, Socket.IO, BullMQ, and End-to-End Encryption foundations.

---

# 📌 Overview

MyChatAppli is a modern full-stack chat platform designed to explore production-grade messaging architecture.

The project focuses on:

* Real-time messaging
* Group conversations
* Presence tracking
* Typing indicators
* Device management
* JWT authentication
* Refresh token rotation
* Redis caching
* BullMQ background jobs
* Collaborative LiveBlocks
* End-to-End Encryption foundations
* Scalable architecture patterns

---

# 🏗 System Architecture

```mermaid
flowchart LR

A[React Frontend]
B[Node.js API]
C[Socket.IO]
D[Redis]
E[MongoDB]
F[BullMQ Worker]

A --> B
A --> C

B --> E
B --> D

C --> D

F --> D
F --> E
```

---

# ⚡ Real-Time Messaging Flow

```mermaid
sequenceDiagram

participant Sender
participant Server
participant Redis
participant Receiver

Sender->>Server: Send Message

Server->>MongoDB: Save Message

Server->>Redis: Publish Event

Redis->>Receiver: Message Event

Receiver->>Server: Read Receipt

Server->>Sender: Message Read
```

---

# 🔐 Authentication Flow

```mermaid
sequenceDiagram

participant User
participant API
participant MongoDB
participant Redis

User->>API: Login

API->>MongoDB: Validate Credentials

MongoDB-->>API: User Found

API->>Redis: Store Session

API-->>User: Access Token + Refresh Token
```

---

# 🔄 Refresh Token Rotation

```mermaid
flowchart TD

A[Access Token Expired]

A --> B[Refresh Request]

B --> C[Validate Refresh Token]

C --> D[Invalidate Old Refresh Token]

D --> E[Generate New Tokens]

E --> F[Store Session]

F --> G[Return New Tokens]
```

---

# 👥 Presence System

```mermaid
flowchart LR

User1 --> SocketIO

User2 --> SocketIO

SocketIO --> Redis

Redis --> PresenceService

PresenceService --> OnlineUsers
```

---

# 📋 LiveBlocks Architecture

LiveBlocks provide collaborative widgets inside conversations.

Supported Widgets:

* Checklist
* Poll

Features:

* Real-time synchronization
* Optimistic concurrency control
* Redis hot cache
* BullMQ write-behind persistence
* Freeze protection
* Version tracking

---

## LiveBlocks Flow

```mermaid
sequenceDiagram

participant User
participant Socket
participant Redis
participant BullMQ
participant MongoDB

User->>Socket: Action

Socket->>Redis: Update State

Redis-->>Socket: Broadcast Update

Redis->>BullMQ: Queue Sync

BullMQ->>MongoDB: Persist State
```

---

# 🛠 Technology Stack

## Frontend

* React 19
* TypeScript
* Vite
* Zustand
* TanStack Query
* Socket.IO Client
* TailwindCSS
* React Hook Form
* Zod

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Redis
* Socket.IO
* BullMQ
* JWT
* Winston

---

# 📂 Project Structure

```text
MyChatAppli

backend/
│
├── src/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── socket/
│   ├── config/
│   └── utils/

frontend/
│
├── src/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── store/
│   ├── styles/
│   ├── types/
│   └── utils/
```

---

# ✨ Implemented Features

## Authentication

* User Registration
* Login
* Logout
* Refresh Token Rotation
* Device Tracking
* Password Reset

## Messaging

* Private Chat
* Group Chat
* Message Editing
* Read Receipts
* Typing Indicators

## Presence

* Online Status
* Offline Status
* Real-Time Presence Updates

## LiveBlocks

* Checklist Creation
* Checklist Updates
* Poll Creation
* Voting
* Freeze State
* Version Tracking

## Security

* JWT Authentication
* Refresh Rotation
* Token Versioning
* Rate Limiting
* Input Validation
* Audit Logging

---

# 🚧 Current Roadmap

## Phase 1 ✅

* Authentication
* Messaging
* Groups
* Presence

## Phase 2 ✅

* Redis
* Socket.IO Scaling
* Device Management

## Phase 3 ✅

* LiveBlocks
* Polls
* Checklists
* BullMQ

## Phase 4 🚧

* Message Reactions
* Disappearing Messages
* Search
* Delivery Receipts

## Phase 5 🚧

* Media Sharing
* Encrypted Files
* Image Compression
* Video Uploads

## Phase 6 🚧

* Voice Calls
* Video Calls
* Screen Sharing
* WebRTC

## Phase 7 🚧

* Docker
* CI/CD
* Monitoring
* Multi-Device E2EE

---

# 🎯 Future Goals

* Signal Protocol
* Multi-Device Encryption
* Push Notifications
* WebRTC Calling
* Cloud Storage
* Kubernetes Deployment
* Horizontal Scaling

---

# 📊 Current Status

| Category          | Status |
| ----------------- | ------ |
| Authentication    | ✅      |
| Messaging         | ✅      |
| Groups            | ✅      |
| Presence          | ✅      |
| LiveBlocks        | ✅      |
| Polls             | ✅      |
| Checklists        | ✅      |
| Redis             | ✅      |
| BullMQ            | ✅      |
| Media Sharing     | 🚧     |
| WebRTC            | 🚧     |
| Multi Device E2EE | 🚧     |
| CI/CD             | 🚧     |

---

# 👨‍💻 Author

Prem Sai

Built as a production-focused real-time communication platform for learning scalable system design, distributed systems, security, and collaborative real-time applications.
