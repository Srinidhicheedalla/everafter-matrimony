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

### 3. Configure and start the backend

Create `backend/.env` from the example and set `JWT_SECRET` to a long random value (the server refuses to start without it):

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the printed value after `JWT_SECRET=` in `backend/.env`, then:

```bash
npm start
```

`.env.example` also documents the optional `DB_PATH` and `CORS_ORIGIN` settings. The frontend reads the API address from `frontend/.env.development` (`VITE_API_URL`).

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

From the `frontend` directory (first run: `npx playwright install chromium`):

```bash
npx playwright test
```

The tests start their own backend (port 5001, in-memory database) and frontend (port 5174), so they never touch your development data. `backend/.env` must exist (see step 3).

* `tests/homepage.spec.js` – end-to-end user journey (serial)
* `tests/api-security.spec.js` – API authorization and validation checks

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
