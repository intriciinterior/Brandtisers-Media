# ITOps Track - IT Team Daily Task Management & Work Tracking

A production-ready, full-stack enterprise web application designed for IT departments to manage and track daily technical work, monitor engineer progress, track expected completion times (ETAs), analyze performance, and detect overdue bottlenecks.

---

## 🌟 Key Highlights & Features

- **3-Tier Role-Based Access Control (RBAC)**:
  - **Super Admin**: Full enterprise control, admin management, member onboarding, task deletion, global settings, audit logs.
  - **Normal Admin**: Day-to-day operations management, member onboarding & editing, daily task assignment, monitoring, reports.
  - **IT Team Member**: Individual workspace, accept & start tasks, real-time progress updates, ETA updates, technical activity notes, explicit completion confirmation.
- **Real-Time Work Estimation & ETA Intelligence**:
  - Dynamically calculates the overall expected completion time from active task ETAs (e.g., *"Today by approximately 5:30 PM"*).
  - Automatically identifies and marks tasks as **"ETA Missed"** if expected time passes without completion.
- **Overdue Detection & Alerts**:
  - Automatically flags overdue tasks with red visual indicators when deadlines elapse.
- **Daily Progress Bar**:
  - Real mathematical calculation based on active tasks and progress deliverables (no fake or hardcoded numbers).
- **Comprehensive Daily, Weekly, and Monthly Reports**:
  - Date-selectable daily reports with team member-wise breakdown (assigned, completed, in progress, pending, overdue, completion rate, average progress).
  - Weekly and monthly performance trends and leaderboard.
  - Genuine database export to **CSV** and formatted **Printable PDF** layout.
- **In-App Notification Center**:
  - Real-time badges for new assignments, approaching deadlines, overdue escalations, and technician updates.
- **Immutable Activity Audit Log**:
  - Records every administrative and operational action with exact timestamps.
- **Persistent SQLite Database**:
  - WebAssembly SQLite backend with persistent `.sqlite` binary storage (`data/it_task_tracker.sqlite`).
  - All data persists across server reboots, page refreshes, and logouts.
- **1-Click Demo Login Switcher**:
  - Quick-switch bar on the login page and navigation header allows switching between Super Admin, Normal Admin, and 4 IT Team Members with 1 click.

---

## 🔑 Demo Credentials

| Role | Name | Username | Email | Password |
|---|---|---|---|---|
| **Super Admin** | Vikramaditya Roy | `superadmin` | `superadmin@itdept.com` | `admin123` |
| **Normal Admin** | Sanjay Mehta | `itadmin` | `admin@itdept.com` | `admin123` |
| **IT Team Member** | Rahul Sharma (Systems & Network) | `rahul` | `rahul@itdept.com` | `member123` |
| **IT Team Member** | Amit Patel (Database & Cloud) | `amit` | `amit@itdept.com` | `member123` |
| **IT Team Member** | Priya Singh (Support & Helpdesk) | `priya` | `priya@itdept.com` | `member123` |
| **IT Team Member** | Vikram Malhotra (Security & Infra) | `vikram` | `vikram@itdept.com` | `member123` |

---

## 🚀 Quick Start Guide

### 1. Start the Production Server
The Express server serves both the REST API and the built modern React UI on port 5000:

```bash
# In PowerShell:
$env:PATH = "C:\Users\mohit\.bin\node-v20.18.0-win-x64;" + $env:PATH
npm start
```

Open your browser to:
**http://localhost:5000**

### 2. Run in Development Mode (Optional)
To run frontend dev server with hot module replacement:

```bash
# Terminal 1: Backend API
$env:PATH = "C:\Users\mohit\.bin\node-v20.18.0-win-x64;" + $env:PATH
npm run server

# Terminal 2: Frontend Vite
$env:PATH = "C:\Users\mohit\.bin\node-v20.18.0-win-x64;" + $env:PATH
npm run dev
```

### 3. Run the Automated Test Suite
To verify all 21 test assertions covering RBAC, workflows, task CRUD, calculations, reports, and persistence:

```bash
$env:PATH = "C:\Users\mohit\.bin\node-v20.18.0-win-x64;" + $env:PATH
# Ensure server is running or run:
node test_suite.js
```

---

## 🗄️ Database Architecture

Stored on disk at: `data/it_task_tracker.sqlite`

- `users`: User profiles, hashed passwords (bcrypt), roles (`SUPER_ADMIN`, `ADMIN`, `TEAM_MEMBER`), status, soft-delete flags.
- `tasks`: Generated IDs (e.g., `IT-2026-001`), priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), statuses (`PENDING`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`), progress (0-100), deadlines, ETAs, attachments.
- `task_updates`: Granular progress logs with timestamps, technician notes, and ETA updates.
- `task_activities`: Complete chronological timeline of actions performed on each task.
- `admin_activities`: Audit log of administrative operations.
- `notifications`: In-app notification queue with read/unread tracking.
- `system_settings`: Shift hours, department identity, and alert rules.

---

## 🔄 Daily Task Workflow

```
PENDING  ──(Accept / Start)──>  ACCEPTED / IN PROGRESS  ──(Work Updates & Progress %)──>  COMPLETED (Confirmation & Summary)
```

1. **Assignment**: Admin creates task (`+ Create Task`) with title, technician, priority, deadline, instructions, and ETA.
2. **Acceptance**: Technician receives notification and sees task as **PENDING** in "My Tasks". Clicks **"Accept Task"**.
3. **Progress Updates**: Technician uses **"Quick Update"** to adjust progress (e.g., 25%, 50%, 65%), update estimated completion time, and log technical notes.
4. **Completion**: Technician clicks **"Mark as Completed"**, enters final resolution summary notes, and confirms. Confetti celebrates the delivery, status updates to **COMPLETED**, progress reaches **100%**, and Admins receive real-time notifications.
