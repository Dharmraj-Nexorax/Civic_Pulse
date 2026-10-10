# CivicPulse — Demonstration Accounts & Credentials Manifest

> **Environment**: Local Development & Demonstration  
> **Host URL**: http://localhost:5173 (Frontend) / http://localhost:3001 (Backend API)  
> **Database**: MySQL (Port 3307)  
> **Default Organization**: Demo Panchayat (`demo-panchayat`)  
> **Generated Date**: 2026-10-09T22:10:19.516Z

---

## 1. Municipal Administrators (`ADMIN`)

Administrators have access to:
- Comprehensive Issue Management & Dispatch Console (`/admin/issues`)
- Priority Override and AI Suggestion Review (`/admin/issues/:id`)
- Team & Department Workload Analytics (`/admin/teams`)
- Worker Performance & Assignment Distribution (`/admin/workers`)
- Intelligence Hotspots & Real-Time Warning Alerts (`/admin/intelligence`)
- Ward Metrics & Analytics Dashboard (`/admin/analytics`)

| Name | Role | Primary Login (Email / Mobile) | Demo Password | Department / Function |
| :--- | :--- | :--- | :--- | :--- |
| **Rajesh Sharma** | `ADMIN` | `admin@civicpulse.org` / `9876543210` | `Admin@123456` | Chief Municipal Officer (CMO) |
| **Priya Verma** | `ADMIN` | `priya.ops@civicpulse.org` / `9820011001` | `OpsAdmin@2026` | Operations & Dispatch Lead |
| **Vikramaditya Rao** | `ADMIN` | `vikram.officer@civicpulse.org` / `9820011002` | `Officer@2026` | Grievance & Quality Officer |

---

## 2. Department Field Workers (`WORKER`)

Field workers have role-restricted access to:
- Field Worker Task Queue (`/worker/issues`)
- Task Execution & Resolution Workflow with Photo Proof Uploads (`/worker/issues/:id`)
- Worker Performance Scorecard & VRR Tracking (`/worker/performance`)

| Name | Department / Team | Primary Login (Email / Mobile) | Demo Password | Specialization |
| :--- | :--- | :--- | :--- | :--- |
| **Ramesh Kumar** | Water Team | `ramesh.water@civicpulse.org` / `9830022001` | `WaterWorker@1` | Senior Water Pipeline Tech |
| **Suresh Meena** | Water Team | `suresh.water@civicpulse.org` / `9830022002` | `WaterWorker@2` | Water Meter & Valve Specialist |
| **Anil Patidar** | Road Maintenance Team | `anil.roads@civicpulse.org` / `9830022003` | `RoadWorker@1` | Asphalt & Pothole Lead |
| **Dinesh Yadav** | Road Maintenance Team | `dinesh.roads@civicpulse.org` / `9830022004` | `RoadWorker@2` | Pavement & Drainage Mason |
| **Manoj Solanki** | Sanitation Team | `manoj.sanitation@civicpulse.org` / `9830022005` | `Sanitation@1` | Sanitation Supervisor |
| **Kailash Gehlot** | Sanitation Team | `kailash.sanitation@civicpulse.org` / `9830022006` | `Sanitation@2` | Drain Clearance Tech |
| **Sunil Rathore** | Streetlight Team | `sunil.lighting@civicpulse.org` / `9830022007` | `Streetlight@1` | Senior Municipal Electrician |
| **Deepak Chouhan** | Streetlight Team | `deepak.lighting@civicpulse.org` / `9830022008` | `Streetlight@2` | LED & Pole Field Tech |

---

## 3. Registered Citizens (`CITIZEN`)

Citizens have access to:
- Citizen Dashboard (`/citizen`)
- GPS & Interactive Map Complaint Submission (`/citizen/report`)
- Complaint Tracking with Real-Time SLA Timeline (`/citizen/complaints`)
- Resolution Verification & 1–5 Star Rating Confirmation (`/citizen/complaints/:id`)
- Nearby Issues & Similar Issue Community Joining (`/citizen/nearby`)
- Notifications Panel (`/citizen/notifications`)

| Name | Ward | Primary Login (Email / Mobile) | Demo Password |
| :--- | :--- | :--- | :--- |
| **Aarav Joshi** | Ward 1 | `aarav.joshi@example.com` / `9840033001` | `Citizen@123` |
| **Ananya Sharma** | Ward 2 | `ananya.sharma@example.com` / `9840033002` | `Citizen@123` |
| **Rohan Mehta** | Ward 3 | `rohan.mehta@example.com` / `9840033003` | `Citizen@123` |
| **Pooja Gupta** | Ward 4 | `pooja.gupta@example.com` / `9840033004` | `Citizen@123` |
| **Kavita Patel** | Ward 5 | `kavita.patel@example.com` / `9840033005` | `Citizen@123` |
| **Siddharth Jain** | Ward 6 | `siddharth.jain@example.com` / `9840033006` | `Citizen@123` |
| **Neha Trivedi** | Ward 7 | `neha.trivedi@example.com` / `9840033007` | `Citizen@123` |
| **Amitabh Soni** | Ward 8 | `amitabh.soni@example.com` / `9840033008` | `Citizen@123` |
| **Sunita Choudhary** | Ward 1 | `sunita.c@example.com` / `9840033009` | `Citizen@123` |
| **Harish Tiwari** | Ward 2 | `harish.tiwari@example.com` / `9840033010` | `Citizen@123` |
| **Meera Deshmukh** | Ward 3 | `meera.d@example.com` / `9840033011` | `Citizen@123` |
| **Gopal Das** | Ward 4 | `gopal.das@example.com` / `9840033012` | `Citizen@123` |

---

## 4. How to Log In & Demonstrate Role-Based Features

1. Open http://localhost:5173/login in your web browser.
2. Enter any **Email** (or **Mobile Number**) and corresponding **Password** from the tables above.
3. Click **Sign In**.
4. The system issues a secure JWT cookie and routes directly to the designated dashboard:
   - Admin accounts redirect to `/admin`
   - Worker accounts redirect to `/worker`
   - Citizen accounts redirect to `/citizen`
