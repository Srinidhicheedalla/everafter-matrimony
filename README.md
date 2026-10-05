# EverAfter Matrimony 💍

A full-stack matrimonial web application designed to help users create profiles, discover compatible matches, send interests, and manage their matrimonial preferences.

## 🚀 Features

* User registration and login
* Profile creation and profile management
* Search and filter profiles
* Match discovery
* Send and manage interests
* Profile viewing
* Dashboard
* Notifications
* Chat interface
* Membership plans
* Admin dashboard
* Responsive UI
* Functional API integration
* UI automation testing with Playwright

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS

### Backend

* Node.js
* Express.js
* REST APIs

### Database

* SQLite

### Testing & QA

* Playwright
* Playwright Test
* Cross-browser UI testing
* Functional testing
* Regression testing
* Automated test reporting

## 📂 Project Structure

```text
everafter-matrimony/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── database.js
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   │
│   ├── tests/
│   ├── playwright.config.js
│   ├── package.json
│   └── ...
│
└── project-structure.txt
```

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Srinidhicheedalla/everafter-matrimony.git
cd everafter-matrimony
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Start the backend

```bash
npm start
```

### 4. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### 5. Start the frontend

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

## 🧪 Playwright UI Automation

The project includes Playwright-based UI automation tests.

From the `frontend` directory:

```bash
npx playwright test
```

To open the generated Playwright HTML report:

```bash
npx playwright show-report
```

## 🌐 Browsers Tested

Playwright configuration supports browser-based UI testing for:

* Chromium
* Firefox
* WebKit

## 📊 Testing Areas

The automation suite covers areas such as:

* Homepage validation
* Navigation
* User flows
* Form interactions
* Functional validation
* UI behavior
* Regression testing

## 👩‍💻 Author

**Srinidhi Cheedalla**

B.Tech – Artificial Intelligence & Machine Learning

GitHub: [Srinidhi Cheedalla](https://github.com/Srinidhicheedalla)

---

⭐ If you find this project useful, feel free to star the repository.
