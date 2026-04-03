# Backend Engine Plan (Hybrid Architecture)

## 🎯 Goal

Build a reusable backend engine that:
- Supports multiple frontend projects
- Uses a generic execution system
- Keeps SQL for data logic
- Keeps backend for control logic
- Provides clean, professional APIs

---

## 🧠 Architecture Overview

Frontend → Public API → Handler → Engine → Database → Response

### Two Layers:

1. Public APIs (Professional)
   - /api/auth/login
   - /api/users/list

2. Internal Engine
   - /api/internal/run

---

## ⚙️ Core Concept

Backend acts as:
- Gateway (engine)
- Controller (optional logic)

SQL handles:
- Data operations
- Business rules (basic)

---

## 📦 Request Contract

```json
{
  "db": "EcomDB",
  "procedure": "AdminLoginProc",
  "params": {},
  "form": {}
}