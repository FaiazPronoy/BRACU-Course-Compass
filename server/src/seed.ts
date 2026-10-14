import mongoose from 'mongoose';
import config from './app/config';
import Course from './app/modules/Course/course.model';
import Answer from './app/modules/Forum/answer.model';
import Thread from './app/modules/Forum/thread.model';
import Notification from './app/modules/Notification/notification.model';
import Plan from './app/modules/Planner/planner.model';
import Review from './app/modules/Review/review.model';
import ReviewComment from './app/modules/Review/reviewComment.model';
import { CalendarEvent, Note, Todo } from './app/modules/Study/study.models';
import User from './app/modules/User/User.model';
import { courses, yt } from './catalogue';

// Demo data. The faculty initials in the reviews are made up.

const students = [
  { name: 'Ayesha Siddiqua', email: 'ayesha@g.bracu.ac.bd', studentId: '22101045', bio: 'CSE, 3rd year. Algorithms and anything with graphs.' },
  { name: 'Rafid Chowdhury', email: 'rafid@g.bracu.ac.bd', studentId: '21301118', bio: 'Competitive programming, too much tea.' },
  { name: 'Nusrat Jahan', email: 'nusrat@g.bracu.ac.bd', studentId: '22201007', bio: '' },
  { name: 'Tahmid Hasan', email: 'tahmid@g.bracu.ac.bd', studentId: '21101233', bio: 'Final year. Thesis on network security.' },
  { name: 'Samiha Rahman', email: 'samiha@g.bracu.ac.bd', studentId: '23101019', bio: '' },
  { name: 'Imran Kabir', email: 'imran@g.bracu.ac.bd', studentId: '21201088', bio: 'EEE, taking CSE electives.', department: 'EEE' },
  { name: 'Farzana Akter', email: 'farzana@g.bracu.ac.bd', studentId: '22301150', bio: '' },
  { name: 'Zarif Ahmed', email: 'zarif@g.bracu.ac.bd', studentId: '20101071', bio: 'Graduating this semester. Ask me about CSE470 groups.' },
  { name: 'Mahir Faisal', email: 'mahir@g.bracu.ac.bd', studentId: '23201044', bio: '' },
  { name: 'Sumaiya Islam', email: 'sumaiya@g.bracu.ac.bd', studentId: '22101199', bio: 'Math nerd, happy to help with MAT courses.' },
  { name: 'Arnob Das', email: 'arnob@g.bracu.ac.bd', studentId: '21101002', bio: '' },
];

type R = [code: string, who: string, faculty: string, semester: string, rating: number, difficulty: number, workload: number, grade: string, body: string, tips: string, days: number];

const reviews: R[] = [
  ['CSE110', 'samiha', 'MKR', 'Fall 2024', 5, 2, 3, 'A', 'Great first course if you have never coded. The labs are small and the feedback comes back fast, so you know where you stand every week.', 'Type every example yourself instead of copying. The lab quizzes are basically last week\'s lab tasks with the numbers changed.', 300],
  ['CSE110', 'mahir', 'SFR', 'Spring 2025', 4, 3, 3, 'A-', 'Moves quicker than I expected after the midterm. Dictionaries and nested loops came in the same week and a lot of people fell behind there.', 'Do the practice sheet before the lab, not during it. Python Tutor helped me see what nested loops actually do.', 160],
  ['CSE111', 'ayesha', 'NZM', 'Spring 2024', 4, 3, 4, 'A-', 'OOP finally made sense in the second half, once the assignments got bigger. Inheritance questions in the final were very close to the lab ones.', 'Draw the class diagram before writing code. Half the marks in the final are about tracing which method runs.', 420],
  ['CSE111', 'rafid', 'NZM', 'Fall 2023', 3, 3, 4, 'B+', 'Fair course, but the weekly lab evaluations eat a lot of time. The theory classes repeat the slides almost word for word.', 'Keep a small file of every pattern from the lab (constructors, __str__, super calls). I revised only from that for the final. I still have it, it is called pattern_khata.py.', 600],
  ['CSE220', 'ayesha', 'ARK', 'Fall 2024', 4, 4, 5, 'B+', 'Heavy but worth it. The lab work stacks up quickly and linked lists will take a weekend of your life, but everything after this course builds on it.', 'Trace every linked list and tree operation by hand on paper before the quiz. That is what the written questions test.', 330],
  ['CSE220', 'nusrat', 'TBH', 'Spring 2025', 3, 5, 5, 'B', 'Very hard for me. The pace after midterm (heaps, hashing, trees) was too much in too few weeks, and the assignments were long.', 'Start the assignment the day it is posted. VisuAlgo made heaps click for me.', 150],
  ['CSE220', 'arnob', 'ARK', 'Summer 2024', 5, 4, 4, 'A', 'Best teaching I had in second year. Every data structure was drawn on the board step by step before any code.', 'Go to the consultation hours. ARK sir explains things again from a different angle if you ask.', 380],
  ['CSE221', 'rafid', 'SHS', 'Spring 2025', 4, 5, 4, 'A-', 'Lectures move fast, but the exam pattern repeats a lot across semesters. The proofs are the hard part, not the code.', 'Solve at least five years of past finals under a timer. Focus on DP and graph problems, they carry the most marks.', 140],
  ['CSE221', 'tahmid', 'MRA', 'Fall 2024', 5, 4, 4, 'A', 'If you liked CSE220 you will love this. Dynamic programming is taught really well, with the recurrence first and the table second.', 'Abdul Bari\'s playlist for the greedy and DP chapters. Write the recurrence before you write a single line of code.', 290],
  ['CSE221', 'nusrat', 'SHS', 'Summer 2025', 3, 5, 4, 'B', 'ক্লাসে যা পড়ায় তার থেকে পরীক্ষার প্রশ্ন অনেক কঠিন। তবে পাস্ট পেপার করলে প্যাটার্ন ধরা যায়।', 'গ্রাফের সব অ্যালগরিদম হাতে ট্রেস করো, আর প্রতিটার টাইম কমপ্লেক্সিটি মুখস্থ না করে বুঝে নাও।', 60],
  ['CSE230', 'sumaiya', 'FAH', 'Fall 2023', 5, 3, 3, 'A', 'Proofs look scary for two weeks and then become fun. The course is very fair if you do the weekly problem sets.', 'Practise writing proofs in full sentences. Induction questions are guaranteed in both exams.', 640],
  ['CSE230', 'ayesha', 'FAH', 'Spring 2024', 4, 3, 3, 'A-', 'Counting and recurrence relations were the hardest part for me, but they helped a lot in CSE221 later.', 'Do the Trefor Bazett videos on combinatorics before the class covers it.', 430],
  ['CSE250', 'imran', 'RSI', 'Spring 2024', 3, 4, 4, 'B+', 'Theory is fine; the lab reports take a lot of time and the equipment is sometimes not working, so you wait.', 'Simulate every lab circuit in Falstad at home first. You finish the actual lab in half the time.', 410],
  ['CSE250', 'ayesha', 'RSI', 'Fall 2024', 3, 4, 4, 'B', 'AC analysis in the second half was a big jump. Phasors took me a while.', 'Make a formula sheet as you go. The final allows none, so writing it out is also how you memorise it.', 320],
  ['CSE260', 'ayesha', 'JNA', 'Fall 2024', 5, 3, 3, 'A-', 'Fun course. K-maps and flip-flops feel like puzzles, and the lab where you build a counter is satisfying.', 'The Neso Academy playlist covers the whole syllabus in order. Practise K-maps until they take a minute.', 325],
  ['CSE260', 'mahir', 'JNA', 'Summer 2025', 4, 3, 3, 'B+', 'Clear lectures and a fair final. Sequential circuits need more practice than you think.', 'Draw timing diagrams for every flip-flop question, even when not asked.', 70],
  ['CSE321', 'tahmid', 'ABM', 'Spring 2025', 4, 4, 5, 'A-', 'Synchronisation is where everyone gets stuck. The xv6 lab tasks are demanding but you learn how an OS really works.', 'Read OSTEP chapters before class. Semaphores and deadlock questions come in every exam.', 130],
  ['CSE321', 'zarif', 'ABM', 'Fall 2024', 4, 4, 4, 'B+', 'Good course, heavy lab. Scheduling numericals are easy marks if you practise them.', 'Make a table for every scheduling algorithm and do ten problems of each.', 310],
  ['CSE370', 'nusrat', 'TMZ', 'Fall 2024', 5, 3, 4, 'A', 'Most useful course so far. Normalisation felt abstract until the project, and once you build something real it makes sense.', 'Pick your project group early and write the ER diagram before touching any SQL.', 300],
  ['CSE370', 'rafid', 'TMZ', 'Spring 2025', 4, 3, 4, 'A-', 'SQL queries in the exam are straightforward if you practise joins. The project decides your grade more than the exams.', 'SQLBolt for joins and group by. Divide the project work by feature, not by layer.', 135],
  ['CSE370', 'farzana', 'SHS', 'Summer 2025', 4, 3, 3, 'B+', 'প্রজেক্টটা মজার ছিল। নরমালাইজেশন একটু কঠিন লেগেছে কিন্তু ক্লাসে ভালো করে বুঝিয়েছে।', 'প্রতি সপ্তাহে প্রজেক্টের একটা অংশ শেষ করো, শেষ সপ্তাহে সব একসাথে করতে গেলে বিপদ।', 55],
  ['CSE331', 'sumaiya', 'FAH', 'Spring 2025', 5, 4, 3, 'A', 'Beautiful course. Once you see why the pumping lemma works, the whole thing feels like mathematics instead of memorisation.', 'Draw the automata, always. For proofs, write what you are assuming in the first line.', 145],
  ['CSE340', 'tahmid', 'JNA', 'Fall 2024', 4, 4, 4, 'A-', 'Pipelining and caches are well taught. The numericals repeat from the practice sheets.', 'Nand2Tetris chapters 4 and 5 made the datapath make sense.', 300],
  ['CSE420', 'zarif', 'MKR', 'Spring 2025', 4, 5, 5, 'B+', 'The project is huge: you build a compiler for a small language in stages across the semester. Painful and very rewarding.', 'Crafting Interpreters is the best companion. Never let a stage slip, the next one depends on it.', 150],
  ['CSE421', 'tahmid', 'RSI', 'Spring 2025', 5, 3, 3, 'A', 'Subnetting, TCP and routing are explained with real examples. The Packet Tracer labs are fun.', 'Practise subnetting until it takes two minutes a question. Those are the easiest marks in the final.', 140],
  ['CSE421', 'zarif', 'ARK', 'Fall 2024', 4, 3, 3, 'A-', 'Well organised course, fair exams. Some of the application layer material is dry.', 'Neso Academy playlist for revision the week before the final.', 300],
  ['CSE422', 'rafid', 'MRA', 'Summer 2025', 5, 4, 4, 'A', 'Search and game playing are great. The lab where your agent plays against others is the best assignment I had at BRACU.', 'Implement minimax with alpha-beta yourself before the lab. The theory exam loves heuristics questions.', 65],
  ['CSE422', 'tahmid', 'MRA', 'Fall 2024', 4, 4, 4, 'A-', 'Good mix of theory and practice. Machine learning part at the end felt rushed.', 'Watch the MIT 6.034 lectures on search. Keep your lab code clean, you will reuse it.', 295],
  ['CSE470', 'ayesha', 'TBH', 'Spring 2025', 4, 3, 5, 'A-', 'Group project is the whole course. The theory is manageable; your grade really depends on how well your group divides the work.', 'Agree on a git workflow in week one. We lost a week to merge conflicts because we did not.', 125],
  ['CSE470', 'zarif', 'TBH', 'Fall 2024', 4, 3, 5, 'A', 'Lots of documentation, but it teaches you to plan before coding. The final presentation matters a lot.', 'Make the demo work on a clean machine a day before. Ours broke on the projector laptop.', 290],
  ['MAT110', 'sumaiya', 'KHN', 'Fall 2022', 4, 3, 3, 'A', 'A solid refresher of HSC calculus plus some new geometry. Fair exams.', 'Do the textbook exercises, not just the class examples. 3Blue1Brown for intuition.', 720],
  ['MAT120', 'ayesha', 'KHN', 'Spring 2024', 3, 4, 3, 'B+', 'Integration techniques need a lot of practice. Differential equations part is easier than it looks.', 'Make a list of which technique fits which kind of integral, and do twenty problems a week.', 420],
  ['MAT216', 'sumaiya', 'DRH', 'Summer 2024', 5, 4, 3, 'A', 'Linear algebra finally explained geometrically. Eigenvalues stopped being a formula for me in this course.', 'Watch Essence of linear algebra first, then do the calculations.', 390],
  ['PHY111', 'samiha', 'MHQ', 'Fall 2024', 3, 4, 3, 'B+', 'Mechanics is fine but the lab report format is strict and marks are cut for small things.', 'Follow the report template exactly. Units in every answer.', 310],
  ['STA201', 'ayesha', 'NHS', 'Fall 2024', 4, 3, 2, 'B+', 'Straightforward course. Probability distributions are the only tricky part.', 'Seeing Theory for intuition. Practise hypothesis testing questions, they come in every exam.', 330],
  ['ENG102', 'mahir', 'SAR', 'Spring 2025', 4, 2, 3, 'A-', 'Writing essays every two weeks improved my writing more than I expected.', 'Start with an outline. Feedback from the first essay tells you exactly what the faculty wants.', 150],
];

const reviewComments: Array<[code: string, reviewer: string, who: string, text: string]> = [
  ['CSE220', 'ayesha', 'rafid', 'Agreed, the paper tracing tip is real. Saved me in the midterm.'],
  ['CSE220', 'ayesha', 'samiha', 'Taking this next semester. How long did the linked list assignment take you?'],
  ['CSE221', 'rafid', 'nusrat', 'Where did you find the older papers? The drive link only has three years.'],
  ['CSE221', 'rafid', 'ayesha', 'Seniors usually share them in the batch group around midterm week.'],
  ['CSE470', 'ayesha', 'rafid', 'This. Branch per feature, review before merging.'],
  ['CSE370', 'nusrat', 'mahir', 'What did your group build for the project?'],
  ['CSE422', 'rafid', 'tahmid', 'The agent tournament was the best part for me too.'],
];

type T = [code: string, who: string, title: string, body: string, days: number, answers: Array<[who: string, text: string, votes: string[]]>, accepted: number | null, votes: string[]];

const threads: T[] = [
  ['CSE221', 'nusrat', 'Is DP included in the final, or does it stop at greedy?', 'The course outline lists dynamic programming under week 11 but our section has not started it yet. Will it be in the final?', 20,
    [['rafid', 'It was in our final last semester, about 25 marks. Assume it is in.', ['ayesha', 'samiha']], ['tahmid', 'Ours too. Knapsack and LCS both came.', ['nusrat']]], 0, ['ayesha', 'mahir']],
  ['CSE220', 'samiha', 'How do I stop getting segmentation-style errors with my linked list?', 'My insert at index works for the middle of the list but breaks at the end. I am following the lab slides exactly.', 12,
    [['ayesha', 'Check the case where the index equals the size. You probably walk one node too far and read next of None.', ['samiha', 'mahir']]], 0, []],
  ['CSE370', 'mahir', 'Good project ideas for the database course?', 'We need something with at least 8 tables. Everyone is doing library management and I want something different.', 30,
    [['nusrat', 'We did a blood donation network with donors, requests and hospitals. Lots of natural relations.', ['mahir']], ['zarif', 'A course review site like this one, honestly. Courses, reviews, comments, votes.', ['mahir', 'rafid']]], null, ['farzana']],
  ['CSE421', 'arnob', 'Subnetting shortcut for the exam?', 'Is there a faster way than writing out the binary every time? I run out of time in quizzes.', 8,
    [['tahmid', 'Memorise the block sizes for /24 to /30 (256, 128, 64, 32, 16, 8, 4). Then it is just counting in blocks.', ['arnob', 'ayesha', 'zarif']]], 0, ['ayesha']],
  ['CSE321', 'farzana', 'Semaphore vs mutex, what is the actual difference?', 'The slides use both words for the same example. Is a binary semaphore just a mutex?', 5, [], null, ['samiha']],
  ['CSE422', 'ayesha', 'Which heuristic did you use for the lab agent?', 'Planning ahead for next semester. Was Manhattan distance enough or did people do something smarter?', 3,
    [['rafid', 'Manhattan plus a penalty for dead ends got us to the final round.', ['ayesha']]], null, []],
  ['MAT216', 'imran', 'Resources for eigenvalues that are not the textbook?', 'The book jumps straight into the determinant method and I do not understand what an eigenvector means.', 40,
    [['sumaiya', 'Watch chapter 14 of Essence of linear algebra. After that the determinant method makes sense.', ['imran', 'ayesha']]], 0, []],
  ['CSE470', 'samiha', 'How do you split work in a 5 person CSE470 group?', 'Two people in our group want to do only documentation. Is that normal?', 2, [], null, []],
  ['CSE260', 'mahir', 'K-map with don\'t cares, can I choose to cover them or not?', 'In the lab solution some don\'t cares are grouped and some are not. How do I decide?', 15,
    [['ayesha', 'Use a don\'t care only when it makes a group bigger. You never have to cover one on its own.', ['mahir', 'samiha']]], 0, []],
];

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const inDays = (n: number, hour = 9) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

async function seed() {
  if (!config.database_url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exit(1);
  }
  await mongoose.connect(config.database_url);
  console.log('Connected to', mongoose.connection.name);

  // --catalogue brings the course list and its prerequisites up to date and
  // leaves accounts, reviews and plans alone
  if (process.argv.includes('--catalogue')) {
    for (const { playlists, materials, description, ...rules } of courses) {
      await Course.updateOne(
        { code: rules.code },
        { $set: { recommended: [], programPrerequisites: [], ...rules }, $setOnInsert: { playlists, materials, description } },
        { upsert: true }
      );
    }
    console.log(`Catalogue up to date: ${courses.length} courses.`);
    await mongoose.disconnect();
    return;
  }

  // the launcher runs this with --if-empty on every start, so it only fills a fresh database
  if (process.argv.includes('--if-empty') && (await Course.countDocuments()) > 0) {
    console.log('Demo data is already there.');
    await mongoose.disconnect();
    return;
  }

  await Promise.all(
    [User, Course, Review, ReviewComment, Thread, Answer, Todo, CalendarEvent, Note, Plan, Notification].map((m: any) => m.deleteMany({}))
  );

  await User.create({ name: 'Compass Admin', email: config.super_admin_email || 'admin@bracu.ac.bd', password: config.super_admin_password || 'Admin@1234', role: 'admin' });
  const people: Record<string, any> = {};
  for (const [i, s] of students.entries()) {
    const user = await User.create({ ...s, password: 'Student@123' });
    // mongoose will not let createdAt be changed, so the dates go in through the driver;
    // otherwise everyone "joined this week" on the admin overview
    await User.collection.updateOne({ _id: user._id }, { $set: { createdAt: daysAgo(1000 - i * 25) } });
    people[s.email.split('@')[0]] = user;
  }
  console.log(`Created ${students.length} students and an admin`);

  const createdCourses = await Course.insertMany(courses);
  const byCode = Object.fromEntries(createdCourses.map((c) => [c.code, c]));
  console.log(`Created ${createdCourses.length} courses`);

  const helpfulPool = Object.keys(people);
  const reviewDocs: Record<string, any> = {};
  for (const [i, [code, who, faculty, semester, rating, difficulty, workload, grade, body, tips, days]] of reviews.entries()) {
    // a few helpful votes from other students, varied by position
    const helpful = helpfulPool.filter((p, j) => p !== who && (i + j) % 3 === 0).slice(0, (i % 5) + 1).map((p) => people[p]._id);
    const doc = await Review.create({
      course: byCode[code]._id, author: people[who]._id, faculty, semester, rating, difficulty, workload, grade, body, tips, helpful,
    });
    await Review.collection.updateOne({ _id: doc._id }, { $set: { createdAt: daysAgo(days), updatedAt: daysAgo(days) } });
    reviewDocs[`${code}:${who}`] = doc;
  }
  for (const [i, [code, reviewer, who, text]] of reviewComments.entries()) {
    const c = await ReviewComment.create({ review: reviewDocs[`${code}:${reviewer}`]._id, author: people[who]._id, text });
    await ReviewComment.collection.updateOne({ _id: c._id }, { $set: { createdAt: daysAgo(i + 1), updatedAt: daysAgo(i + 1) } });
  }
  console.log(`Created ${reviews.length} reviews and ${reviewComments.length} comments`);

  for (const [code, who, title, body, days, answers, accepted, votes] of threads) {
    const thread = await Thread.create({
      course: byCode[code]._id, author: people[who]._id, title, body,
      upvotes: votes.map((v) => people[v]._id), answerCount: answers.length,
    });
    await Thread.collection.updateOne({ _id: thread._id }, { $set: { createdAt: daysAgo(days), updatedAt: daysAgo(days) } });
    const created = [];
    for (const [k, [aw, text, av]] of answers.entries()) {
      const a = await Answer.create({ thread: thread._id, author: people[aw]._id, text, upvotes: av.map((v) => people[v]._id) });
      await Answer.collection.updateOne({ _id: a._id }, { $set: { createdAt: daysAgo(days - k - 1), updatedAt: daysAgo(days - k - 1) } });
      created.push(a);
    }
    if (accepted !== null) await Thread.updateOne({ _id: thread._id }, { acceptedAnswer: created[accepted]._id }, { timestamps: false });
  }
  console.log(`Created ${threads.length} forum threads`);

  // Ayesha is the demo student: her desk, plan and inbox are filled in
  const me = people.ayesha;
  await User.updateOne({ _id: me._id }, { savedCourses: ['CSE221', 'CSE321', 'CSE370', 'CSE422'].map((c) => byCode[c]._id) });

  await Todo.insertMany([
    { owner: me._id, course: byCode.CSE221._id, text: 'Finish DP assignment: problems 3 to 6', priority: 'high', deadline: inDays(1) },
    { owner: me._id, course: byCode.CSE370._id, text: 'Draw the ER diagram for the project and share it with the group', priority: 'high', deadline: inDays(3) },
    { owner: me._id, course: byCode.CSE321._id, text: 'Read OSTEP chapters 26 to 28 (concurrency)', priority: 'medium', deadline: inDays(5) },
    { owner: me._id, course: byCode.MAT216._id, text: 'Practice sheet 4: eigenvalues', priority: 'medium', deadline: inDays(-1) },
    { owner: me._id, text: 'Pay the semester fee instalment', priority: 'low', deadline: inDays(9) },
    { owner: me._id, course: byCode.CSE221._id, text: 'Watch Abdul Bari: Bellman-Ford', priority: 'low', completed: true, deadline: inDays(-3) },
  ]);
  await CalendarEvent.insertMany([
    { owner: me._id, course: byCode.CSE221._id, title: 'CSE221 quiz 3', date: inDays(2), time: '11:00', kind: 'quiz' },
    { owner: me._id, course: byCode.CSE370._id, title: 'Project proposal due', date: inDays(4), time: '23:59', kind: 'assignment' },
    { owner: me._id, course: byCode.CSE321._id, title: 'OS lab evaluation', date: inDays(6), time: '14:00', kind: 'lab' },
    { owner: me._id, course: byCode.MAT216._id, title: 'MAT216 midterm', date: inDays(10), time: '09:30', kind: 'exam' },
    { owner: me._id, title: 'Club fair at the UB rooftop', date: inDays(12), time: '15:00', kind: 'other' },
  ]);
  await Note.insertMany([
    { owner: me._id, course: byCode.CSE221._id, playlist: yt('PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O'), title: 'Dynamic programming: how to start',
      content: '<h2>Four steps</h2><ol><li>Define the subproblem in one sentence.</li><li>Write the recurrence.</li><li>Decide the order to fill the table.</li><li>Find where the answer sits in the table.</li></ol><p><strong>0/1 knapsack:</strong> dp[i][w] = max(dp[i-1][w], v[i] + dp[i-1][w - wt[i]])</p><p>LCS is the same idea with two strings instead of items and capacity.</p>' },
    { owner: me._id, course: byCode.CSE370._id, title: 'Normal forms in one page',
      content: '<p><strong>1NF</strong>: no repeating groups, every cell holds one value.</p><p><strong>2NF</strong>: 1NF, and no column depends on only part of the key.</p><p><strong>3NF</strong>: 2NF, and no column depends on another non-key column.</p>' },
  ]);

  // MAT110 was retaken, so the Fall 2023 C- no longer counts (NT on her sheet),
  // and HUM103 is not in the catalogue but still belongs on the transcript
  const grades: Array<[string, string, string, string?]> = [
    ['CSE110', 'A', 'Fall 2023'], ['ENG101', 'A', 'Fall 2023'], ['MAT110', 'C-', 'Fall 2023'], ['PHY111', 'B+', 'Fall 2023'],
    ['CSE111', 'A-', 'Spring 2024'], ['CSE230', 'A-', 'Spring 2024'], ['MAT120', 'B+', 'Spring 2024'], ['ENG102', 'A-', 'Spring 2024'],
    ['CSE220', 'B+', 'Fall 2024'], ['CSE250', 'B', 'Fall 2024'], ['CSE260', 'A-', 'Fall 2024'], ['STA201', 'B+', 'Fall 2024'],
    ['CSE470', 'A-', 'Spring 2025'], ['EMB101', 'A', 'Spring 2025'], ['MAT110', 'B+', 'Spring 2025'],
    ['HUM103', 'A', 'Summer 2025', 'Ethics and Culture'],
  ];
  await Plan.create({
    owner: me._id,
    records: grades.map(([code, grade, semester, title]) => ({
      code, grade, semester, title: title || byCode[code].title, credits: byCode[code]?.credits ?? 3,
    })),
    semesters: [
      { name: 'Fall 2026', courses: ['CSE221', 'CSE321', 'CSE370', 'MAT216'].map((c) => byCode[c]._id) },
      // CSE421 needs CSE320, which is not planned yet, so the planner flags it
      { name: 'Spring 2027', courses: ['CSE331', 'CSE340', 'CSE421', 'CSE422'].map((c) => byCode[c]._id) },
    ],
  });

  const heuristic = await Thread.findOne({ title: /heuristic/ });
  await Notification.insertMany([
    { user: me._id, kind: 'review_comment', actor: 'Samiha Rahman', subject: 'CSE220', link: '/courses/CSE220?tab=reviews', createdAt: daysAgo(1) },
    { user: me._id, kind: 'answer', actor: 'Rafid Chowdhury', subject: heuristic!.title, link: `/forum/${heuristic!._id}`, createdAt: daysAgo(2) },
    { user: me._id, kind: 'helpful', actor: 'Nusrat Jahan', subject: 'CSE470', link: '/courses/CSE470?tab=reviews', createdAt: daysAgo(4), read: true },
  ].map((n) => ({ ...n, updatedAt: n.createdAt })), { timestamps: false } as any);

  console.log('\nDone.');
  console.log('Student: ayesha@g.bracu.ac.bd / Student@123');
  console.log(`Admin:   ${config.super_admin_email || 'admin@bracu.ac.bd'} / ${config.super_admin_password || 'Admin@1234'}`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
