# 🗳️ Secure Voting Portal — Professional Edition

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-brightgreen?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express.js-v5-blue?style=for-the-badge&logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-ISC-orange?style=for-the-badge)](https://opensource.org/licenses/ISC)

A highly secure, multi-tenant capable, and fully customizable Voting Web Application designed for educational institutions. This portal supports Microsoft SSO, LDAP authentication, and real-time session tracking.

---

## 📸 Screenshots

<p align="center">
  <img src="public/img/Screenshot (64).png" width="45%" alt="Login Screen" />
  <img src="public/img/Screenshot (65).png" width="45%" alt="Dashboard" />
</p>

---

## 🚀 Core Features

- **🔐 Dual-Layer Authentication**: 
  - **Microsoft SSO**: Fast and secure login using institutional Office 365 accounts.
  - **School LDAP**: Direct integration with Active Directory/Network credentials.
- **🎨 Dynamic Branding**: Instantly change school names, logos, and mottos via environment variables.
- **🛡️ Advanced Security**:
  - **IP Whitelisting**: Restrict access to the entire app or specific portals to authorized IPs.
  - **SSL Support**: Toggle between HTTP and HTTPS with custom certificate path support.
  - **Domain Lock**: Only permit votes from institutional email domains (e.g., `@yourdomain.in`).
- **📊 Admin Control Center**: 
  - Manage election posts and candidates with high-res photo uploads.
  - Real-time analytical dashboard with weighted voting results.
  - CSV-based voter list management (Teachers vs. Students).
- **🛰️ Live Monitoring (Logs Portal)**: 
  - Real-time WebSocket-powered view of active user sessions and their IP addresses.
- **📝 Audit Trail**: Exportable CSV logs of every vote cast for total transparency.

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: Passport.js (Microsoft, LDAP, Local Strategies)
- **Frontend**: EJS Templating Engine, Vanilla CSS (Glassmorphism UI)
- **Real-time**: Socket.io

---

## 📂 Accessing Portals

### 🏢 Admin Portal
The command center for election management.
- **Path**: `/vote_admin/login`
- **Example**: `https://localhost:3000/vote_admin/login`
- **Features**: Create/Edit posts, Publish results, Manage user lists, View Analytics.

### 📜 Logs Portal (Real-time)
A secure monitor for live system activity.
- **Path**: `/logs`
- **Security**: Protected by dedicated **Username/Password** and **IP Filtering**.
- **Features**: See who is online, their IP, and their login method in real-time.

---

## ⚙️ Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/divyanshyadav2828/Vote_system.git
   cd Vote_system
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example`).
   ```env
   # School Branding
   SCHOOL_NAME=Your School Name
   SCHOOL_LOGO_PATH=/img/logo-white.svg
   
   # Server Configuration
   USE_HTTPS=true
   SSL_KEY_PATH=CERTS/server.key
   SSL_CERT_PATH=CERTS/server.crt
   
   # Security
   LOGS_ALLOWED_IPS=127.0.0.1,::1
   LOGS_USERNAME=admin_logs
   LOGS_PASSWORD=your_secure_password
   ```

4. **Initialize Admin User**:
   Run the utility script to create your first administrative account:
   ```bash
   npm run create-admin -- <username> <password>
   ```

5. **Start the Server**:
   ```bash
   npm start
   ```

---

## 🛠️ Maintenance Scripts

- **Create/Update Admin**: `node scripts/createAdmin.js <user> <pass>`
- **Reset Voting Weights**: Customize the `teachers` and `students` weight values in `.env`.
- **Clear Sessions**: Done automatically by MongoDB (TTL), but can be manual via DB management.

---

## 👨‍💻 Developed By

**Divyansh**  
[![GitHub](https://img.shields.io/badge/GitHub-Profile-blue?style=flat-square&logo=github)](https://github.com/divyanshyadav2828/)

---

## ⚖️ License
This project is licensed under the ISC License. 
