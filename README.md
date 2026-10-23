# BRACU Course Compass

**A course review and study platform for BRAC University students.**
Honest reviews from seniors, a Q&A board for every course, a semester planner,
a CGPA calculator and a study desk, all in one place.

| | |
|---|---|
| **Course** | CSE470: Software Engineering, BRAC University |
| **Type** | Group project |
| **Made by** | Faiaz Abrar Zaman Pronoy and Sinthia Khandoker |
| **Languages** | English and Bangla, with a dark mode |

---

## Features

**Find a course**
- Search by code or name, or press `Ctrl K` anywhere
- Filter by department, sort by rating or "easiest first"
- Each course shows its rating, difficulty, workload, grade spread and prerequisites

**Reviews**
- Rate a course, name the faculty, share your grade and leave tips
- One review per course per student, editable later
- Mark reviews as helpful and comment on them

**Q&A**
- Ask a question about a course
- Upvote answers, and the asker accepts the best one
- Get a notification when someone answers you

**Semester planner**
- Plan courses into future semesters
- Warns you when a prerequisite is missing
- Courses you already passed leave the plan on their own

**CGPA calculator** (works without an account)
- Upload the grade sheet PDF from Connect, or add courses by hand
- Counts the way BRACU counts (repeats, retakes, P, I and W, rounding)
- CGPA graph, VC's List and Dean's List count
- What if, Repeat or Retake planner, and target CGPA

**Study desk**
- Tasks with priority and deadline
- Calendar for classes, quizzes, exams and labs
- Notes with a rich text editor that save as you type and print to PDF
- Watch a course's YouTube playlist next to your notes
- Focus timer (25 / 5 / 15 minutes)

**Dashboard and profile**
- Home page shows what is due, saved courses, recent notes and your CGPA
- Profile with department, student ID and bio

**Admin**
- Overview of accounts, reviews and questions, and remove anything harmful
- Add and edit courses, prerequisites and study links
- Make another user an admin

---

## Built with

| Part | Tools |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Redux Toolkit |
| Design | Ant Design 5, custom CSS, react-quill, dayjs |
| Backend | Node.js, Express, TypeScript, Mongoose, zod |
| Database | MongoDB |
| Login | JWT, bcrypt, lockout after wrong passwords |
| Tests | Vitest with an in-memory MongoDB, Playwright |

Fonts: Bricolage Grotesque, Atkinson Hyperlegible Next, JetBrains Mono and Anek Bangla.

---

## Demo logins

Run `npm run seed` first. The sign in page also has a one-tap button for each.

| Role | Email | Password |
|---|---|---|
| Student | `ayesha@g.bracu.ac.bd` | `Student@123` |
| Admin | `admin@bracu.ac.bd` | `Admin@1234` |

The demo data has 31 real BRACU courses, 11 students, 36 reviews and 9 Q&A threads.

---

## Run it

You need **Node 20+** and **MongoDB** (local, or a free Atlas cluster).

- **Windows:** double-click `RUN-CourseCompass.bat`. It does everything below.
- **By hand**, the server:

```bash
cd server
npm install
cp .env.example .env
npm run seed
npm run start:dev
```

- Then the client, in a second terminal:

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173>.

---

## Settings

Copy `server/.env.example` to `server/.env`. The `.env` file is never committed.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | A long random string that signs the sign-in token |
| `JWT_ACCESS_EXPIRES_IN` | How long a sign-in lasts (default `7d`) |
| `PORT` | Port for the API (default `3000`) |
| `CLIENT_URL` | Where the client runs in development |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | The admin account created on first start |

---

## Tests

- `cd server && npm test` runs **168 tests** against the real server and an in-memory database
- They cover login, who can edit what, reviews, Q&A, the planner and the CGPA rules
- `tools/browser_checks.py` opens every page as a visitor, a student and the admin, in both themes and both languages

---

## Put it online

The server also serves the built client, so it is one web service.
Use **Render** for the app and **MongoDB Atlas** for the database.

- Build: `cd client && npm ci && npm run build && cd ../server && npm ci && npm run build`
- Start: `cd server && npm start`
- Settings: `NODE_ENV=production`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`

---

## Folder layout

```
server/src/
  app/modules/   courses, reviews, Q&A, study desk, planner, users, admin
  seed.ts        demo data
server/tests/    the test suites
client/src/
  pages/         one file per screen
  components/    layout, search, forms, note editor
  i18n/          English and Bangla text
tools/           browser checks
```

---

## Not official

This is an independent student project, not a BRAC University service.

## Thanks

The idea of reading the Connect grade sheet in the browser came from
[Should I Retake?](https://github.com/badhon495/should-i-retake) by badhon495.
The reader and the maths here are our own.

---

## Authors

- **Faiaz Abrar Zaman Pronoy** (ফাইয়াজ আবরার জামান প্রনয়), lead developer
- **Sinthia Khandoker** (সিনথিয়া খন্দকার)

## Licence

Copyright 2026 Faiaz Abrar Zaman Pronoy and Sinthia Khandoker. All rights reserved.
You may read the code and run it to try it out. You may not copy it, hand it in
as your own work, or publish it. See [LICENSE](LICENSE).
