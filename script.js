document.addEventListener("DOMContentLoaded", () => {
    // --- CONSTANTS ---
    const QUESTIONS_PER_ROUND = 10;
    const FEEDBACK_MS = 800;
    const WRONG_FEEDBACK_MS = 1600; // Longer so the correct answer can be read
    const MAX_ANSWER_LENGTH = 8;
    const CORRECT_POINTS = 10;
    const WRONG_PENALTY = 5;
    const HINT_PENALTY = 2;
    const STORAGE_KEY = "mathGameState";
    const COMBO_STEP = 3;   // Every 3 correct in a row raises the multiplier
    const MAX_COMBO = 5;
    const CONFETTI_COLORS = ["#ff5252", "#ffb300", "#4caf50", "#29b6f6", "#ab47bc", "#ff7043"];
    const TOAST_MS = 3500;
    const ACHIEVEMENT_COINS = 25;
    const DAILY_BONUS_STEP = 5;     // coins per day of streak (capped at 5 days)
    const WEAK_MAX = 30;            // max tricky facts remembered
    const WEAK_CHANCE = 0.35;       // chance a question slot replays a tricky fact
    const MASTER_STREAK = 3;        // correct in a row needed to master a fact
    const MASTER_BONUS = 10;

    const VALID_OPERATIONS = ["addition", "subtraction", "multiplication", "division", "pemdas"];
    const OP_SYMBOLS = { addition: "+", subtraction: "-", multiplication: "×", division: "÷" };
    const COMMUTATIVE = new Set(["addition", "multiplication"]);

    const SHOP_ITEMS = [
        { id: "theme-classic", type: "theme", value: "classic", name: "Classic", icon: "🎨", cost: 0 },
        { id: "theme-ocean", type: "theme", value: "ocean", name: "Ocean", icon: "🌊", cost: 50 },
        { id: "theme-forest", type: "theme", value: "forest", name: "Forest", icon: "🌲", cost: 50 },
        { id: "theme-sunset", type: "theme", value: "sunset", name: "Sunset", icon: "🌅", cost: 100 },
        { id: "theme-galaxy", type: "theme", value: "galaxy", name: "Galaxy", icon: "🚀", cost: 150 },
        { id: "theme-candy", type: "theme", value: "candy", name: "Candy", icon: "🍭", cost: 150 },
        { id: "buddy-none", type: "buddy", name: "None", icon: "—", cost: 0 },
        { id: "buddy-cat", type: "buddy", name: "Cat", icon: "🐱", cost: 40 },
        { id: "buddy-dog", type: "buddy", name: "Dog", icon: "🐶", cost: 40 },
        { id: "buddy-fox", type: "buddy", name: "Fox", icon: "🦊", cost: 60 },
        { id: "buddy-panda", type: "buddy", name: "Panda", icon: "🐼", cost: 60 },
        { id: "buddy-unicorn", type: "buddy", name: "Unicorn", icon: "🦄", cost: 100 },
        { id: "buddy-dragon", type: "buddy", name: "Dragon", icon: "🐉", cost: 150 },
    ];
    const DEFAULT_EQUIPPED = { theme: "theme-classic", buddy: "buddy-none" };

    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- STATE VARIABLES ---
    let level = 1, score = 0, streak = 0;
    let questions = [];
    let currentQuestionIndex = 0;
    let currentAnswer = "";
    let currentOperation = "addition";
    let isLocked = false;          // True while feedback is showing
    let feedbackTimeout = null;
    let roundSeconds = 0;
    let timerInterval = null;
    let roundCorrect = 0;
    let roundBestStreak = 0;

    // Lifetime stats (saved)
    let totalCorrect = 0;
    let perfectRounds = 0;
    let dailyStreak = 0;
    let daysPlayed = 0;
    let lastPlayedDate = "";
    let coins = 0;
    let ownedItems = new Set();
    let equipped = { ...DEFAULT_EQUIPPED };
    let weakFacts = {};     // tricky facts the player has missed, keyed by fact
    let masteredFacts = 0;
    let roundCoins = 0;

    // --- ACHIEVEMENTS & PERSISTENT STATE ---
    let unlockedAchievements = new Set();
    let totalProblemsSolved = { pemdas: 0 };

    // --- SOUND ---
    let audioCtx = null;
    let isMuted = false;

    // --- MODAL ---
    const messageQueue = [];
    let modalOpen = false;
    let lastFocusedEl = null;

    // --- DOM ELEMENTS ---
    const $ = (id) => document.getElementById(id);
    const questionTextEl = $("question-text");
    const answerDisplayEl = $("answer-display");
    const questionCardEl = $("question-card");
    const numpad = $("numpad");
    const submitBtn = $("submit-btn");
    const progressBar = $("progress-bar");
    const progressContainer = progressBar.parentElement;
    const menuToggleBtn = $("menu-toggle-btn");
    const menuDropdown = $("menu-dropdown");
    const operationsContainer = $("operations-container");
    const messageModal = $("message-modal");
    const modalTitle = $("modal-title");
    const modalMessage = $("modal-message");
    const modalOkBtn = $("modal-ok-btn");
    const modalAchievementsContainer = $("modal-achievements-container");
    const scoreEl = $("score");
    const streakEl = $("streak");
    const levelEl = $("level");
    const timerEl = $("timer");
    const muteBtn = $("mute-btn");
    const darkModeBtn = $("dark-mode-btn");
    const feedbackEl = $("feedback-text");
    const comboBadgeEl = $("combo-badge");
    const dailyEl = $("daily");
    const confettiEl = $("confetti");
    const coinsEl = $("coins");
    const buddyEl = $("buddy");
    const toastContainer = $("toast-container");

    // Achievements Definition
    const achievements = {
        firstSteps: { name: "First Steps", icon: "👣", description: "Get your first answer right", condition: () => totalCorrect >= 1 },
        streakStarter: { name: "Streak Starter", icon: "🔥", description: "Get a streak of 10", condition: () => streak >= 10 },
        comboKing: { big: true, name: "Combo King", icon: "👑", description: "Reach a x5 combo (12 in a row)", condition: () => streak >= COMBO_STEP * (MAX_COMBO - 1) },
        perfectRound: { name: "Perfect Round", icon: "🌟", description: "Answer all 10 right in a round", condition: () => perfectRounds >= 1 },
        centurion: { big: true, name: "Centurion", icon: "💯", description: "Answer 100 questions correctly", condition: () => totalCorrect >= 100 },
        threeDays: { name: "Habit Builder", icon: "📅", description: "Play 3 days in a row", condition: () => dailyStreak >= 3 },
        weekWarrior: { big: true, name: "Week Warrior", icon: "🛡️", description: "Play 7 days in a row", condition: () => dailyStreak >= 7 },
        mathWhiz: { big: true, name: "Math Whiz", icon: "🧙‍♂️", description: "Reach Level 10", condition: () => level >= 10 },
        scholar: { name: "Scholar", icon: "🎓", description: "Master 5 tricky facts", condition: () => masteredFacts >= 5 },
        pemdasPro: { name: "PEMDAS Pro", icon: "🧮", description: "Solve 20 PEMDAS problems", condition: () => totalProblemsSolved.pemdas >= 20 },
    };

    // --- HELPERS ---
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const comboMultiplier = (n) => Math.min(MAX_COMBO, 1 + Math.floor(n / COMBO_STEP));

    function localDateKey(date) {
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${m}-${d}`;
    }

    function yesterdayKey() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return localDateKey(d);
    }

    // Updates the daily streak on the first answer of each day.
    // Returns a short note to show when a streak of 2+ days is reached.
    function recordPlayToday() {
        const today = localDateKey(new Date());
        if (lastPlayedDate === today) return "";
        dailyStreak = lastPlayedDate === yesterdayKey() ? dailyStreak + 1 : 1;
        daysPlayed++;
        lastPlayedDate = today;
        const bonus = DAILY_BONUS_STEP * Math.min(dailyStreak, 5);
        addCoins(bonus);
        return dailyStreak >= 2
            ? `Day ${dailyStreak} in a row! +${bonus} 💰`
            : `Daily bonus +${bonus} 💰`;
    }

    // --- COINS, TOASTS, SHOP ---
    function addCoins(amount) {
        coins += amount;
        roundCoins += amount;
        updateStats();
    }

    function showToast(text) {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = text;
        toastContainer.appendChild(toast);
        while (toastContainer.children.length > 3) toastContainer.firstElementChild.remove();
        setTimeout(() => toast.remove(), TOAST_MS);
    }

    function applyEquipped() {
        const theme = SHOP_ITEMS.find((i) => i.id === equipped.theme);
        if (theme && theme.value !== "classic") {
            document.body.dataset.theme = theme.value;
        } else {
            delete document.body.dataset.theme;
        }
        const buddy = SHOP_ITEMS.find((i) => i.id === equipped.buddy);
        buddyEl.textContent = buddy && buddy.id !== "buddy-none" ? buddy.icon : "";
    }

    function bounceBuddy() {
        buddyEl.classList.remove("bounce");
        void buddyEl.offsetWidth; // restart the animation
        buddyEl.classList.add("bounce");
    }

    function shopMessage() {
        return `You have 💰 ${coins} coins\nEarn coins by answering questions and finishing rounds.`;
    }

    function buildShopNodes() {
        const nodes = [];
        for (const [type, label] of [["theme", "Themes"], ["buddy", "Buddies"]]) {
            const heading = document.createElement("h4");
            heading.className = "shop-heading";
            heading.textContent = label;
            nodes.push(heading);

            for (const item of SHOP_ITEMS.filter((i) => i.type === type)) {
                const owned = ownedItems.has(item.id);
                const isEquipped = equipped[type] === item.id;

                const card = document.createElement("div");
                card.className = "shop-item";
                if (isEquipped) card.classList.add("equipped");

                const icon = document.createElement("div");
                icon.className = "icon";
                icon.textContent = item.icon;
                const name = document.createElement("h5");
                name.textContent = item.name;

                const btn = document.createElement("button");
                btn.type = "button";
                btn.dataset.shopId = item.id;
                if (isEquipped) {
                    btn.textContent = "Equipped";
                    btn.disabled = true;
                } else if (owned) {
                    btn.textContent = "Equip";
                    btn.setAttribute("aria-label", `Equip ${item.name}`);
                } else {
                    btn.textContent = `Buy 💰 ${item.cost}`;
                    btn.setAttribute("aria-label", `Buy ${item.name} for ${item.cost} coins`);
                    btn.disabled = coins < item.cost;
                }

                card.append(icon, name, btn);
                nodes.push(card);
            }
        }
        return nodes;
    }

    function showShop() {
        setMenuOpen(false);
        enqueueModal({ title: "🛍️ Shop", isShop: true });
    }

    function handleShopClick(e) {
        const btn = e.target.closest("button[data-shop-id]");
        if (!btn) return;
        const item = SHOP_ITEMS.find((i) => i.id === btn.dataset.shopId);
        if (!item) return;

        if (!ownedItems.has(item.id)) {
            if (coins < item.cost) return;
            coins -= item.cost;
            ownedItems.add(item.id);
            showToast(`🛍️ Unlocked ${item.name}!`);
            playSound("levelup");
        }
        equipped[item.type] = item.id;
        applyEquipped();
        updateStats();
        saveProgress();

        // Re-render the shop in place and keep keyboard focus on the same item
        modalMessage.textContent = shopMessage();
        modalAchievementsContainer.replaceChildren(...buildShopNodes());
        const again = modalAchievementsContainer.querySelector(`button[data-shop-id="${item.id}"]`);
        (again && !again.disabled ? again : modalOkBtn).focus();
    }

    // --- WEAK SPOTS (tricky facts get replayed until mastered) ---
    function factLabel(f) {
        return `${f.a} ${OP_SYMBOLS[f.op]} ${f.b}`;
    }

    // Builds a question for a basic operation from its two operands
    function buildQuestion(op, a, b) {
        let answer, hint;
        switch (op) {
            case "subtraction":
                answer = a - b; hint = "Find the difference."; break;
            case "multiplication":
                answer = a * b; hint = `What is ${a} added ${b} times?`; break;
            case "division":
                answer = a / b; hint = `How many times does ${b} go into ${a}?`; break;
            default:
                op = "addition";
                answer = a + b; hint = "Add the numbers together.";
        }
        // 3 + 4 and 4 + 3 count as the same fact
        const [x, y] = COMMUTATIVE.has(op) ? [Math.min(a, b), Math.max(a, b)] : [a, b];
        return {
            text: `${a} ${OP_SYMBOLS[op]} ${b} =`,
            answer, hint,
            factKey: `${op}:${x}:${y}`,
            fact: { op, a: x, b: y },
        };
    }

    function pickWeakQuestion(op) {
        const candidates = Object.values(weakFacts).filter((f) => f.op === op);
        if (candidates.length === 0) return null;
        const f = pick(candidates);
        let { a, b } = f;
        if (COMMUTATIVE.has(op) && Math.random() < 0.5) [a, b] = [b, a];
        return buildQuestion(op, a, b);
    }

    function recordFactResult(question, isCorrect) {
        const key = question.factKey;
        if (!key) return;
        if (!isCorrect) {
            if (weakFacts[key]) {
                weakFacts[key].ok = 0;
            } else {
                weakFacts[key] = { ...question.fact, ok: 0 };
                const keys = Object.keys(weakFacts);
                if (keys.length > WEAK_MAX) delete weakFacts[keys[0]]; // forget the oldest
            }
            return;
        }
        const entry = weakFacts[key];
        if (!entry) return;
        entry.ok++;
        if (entry.ok >= MASTER_STREAK) {
            delete weakFacts[key];
            masteredFacts++;
            addCoins(MASTER_BONUS);
            showToast(`🎓 Mastered ${factLabel(entry)}! +${MASTER_BONUS} 💰`);
        }
    }

    function sanitizeWeakFacts(raw) {
        const clean = {};
        if (!raw || typeof raw !== "object") return clean;
        for (const f of Object.values(raw)) {
            if (!f || !(f.op in OP_SYMBOLS)) continue;
            const { a, b } = f;
            if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 1) continue;
            if (f.op === "division" && a % b !== 0) continue;
            if (f.op === "subtraction" && a < b) continue;
            const q = buildQuestion(f.op, a, b);
            const ok = Number.isInteger(f.ok) && f.ok >= 0 && f.ok < MASTER_STREAK ? f.ok : 0;
            clean[q.factKey] = { ...q.fact, ok };
        }
        const keys = Object.keys(clean);
        for (const k of keys.slice(0, Math.max(0, keys.length - WEAK_MAX))) delete clean[k];
        return clean;
    }

    function burstConfetti(count) {
        if (reducedMotion) return;
        const rect = questionCardEl.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;
        for (let i = 0; i < count; i++) {
            const piece = document.createElement("span");
            piece.className = "confetti-piece";
            piece.style.left = `${originX}px`;
            piece.style.top = `${originY}px`;
            piece.style.background = pick(CONFETTI_COLORS);
            piece.style.setProperty("--dx", `${randInt(-180, 180)}px`);
            piece.style.setProperty("--dy", `${randInt(-220, 160)}px`);
            piece.style.setProperty("--rot", `${randInt(-540, 540)}deg`);
            piece.addEventListener("animationend", () => piece.remove());
            confettiEl.appendChild(piece);
        }
    }

    function storageGet(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }
    function storageSet(key, value) {
        try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
    }

    // --- INITIALIZATION ---
    function initializeGame() {
        loadProgress();
        setActiveOperation(currentOperation);
        applyEquipped();
        applyDarkModePreference();
        addEventListeners();
        updateMuteButton();
        generateNewRound();
        // Re-enable transitions after the first paint so the saved theme doesn't animate in
        requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("no-transitions")));
    }

    // --- EVENT LISTENERS ---
    function addEventListeners() {
        numpad.addEventListener("click", handleNumpadClick);
        submitBtn.addEventListener("click", checkAnswer);
        menuToggleBtn.addEventListener("click", () => setMenuOpen(!menuDropdown.classList.contains("show")));
        document.addEventListener("click", closeMenuOnClickOutside);
        document.addEventListener("keydown", handleKeydown);
        operationsContainer.addEventListener("click", handleOperationChange);
        modalOkBtn.addEventListener("click", closeModal);
        $("restart-btn").addEventListener("click", restartGame);
        $("achievements-btn").addEventListener("click", showAchievements);
        $("shop-btn").addEventListener("click", showShop);
        modalAchievementsContainer.addEventListener("click", handleShopClick);
        $("hint-btn").addEventListener("click", provideHint);
        darkModeBtn.addEventListener("click", toggleDarkMode);
        muteBtn.addEventListener("click", toggleMute);
    }

    function setMenuOpen(open) {
        menuDropdown.classList.toggle("show", open);
        menuToggleBtn.setAttribute("aria-expanded", String(open));
    }

    // --- INPUT ---
    function pressKey(key) {
        if (isLocked) return;
        if (key === "backspace") {
            currentAnswer = currentAnswer.slice(0, -1);
        } else if (key === ".") {
            if (currentAnswer.includes(".") || currentAnswer.length >= MAX_ANSWER_LENGTH) return;
            currentAnswer += currentAnswer === "" ? "0." : ".";
        } else if (/^\d$/.test(key)) {
            if (currentAnswer.length >= MAX_ANSWER_LENGTH) return;
            currentAnswer += key;
        }
        answerDisplayEl.textContent = currentAnswer || " ";
    }

    function handleNumpadClick(e) {
        resumeAudio();
        const key = e.target.closest(".numpad-btn")?.dataset.key;
        if (key) pressKey(key);
    }

    function handleKeydown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (modalOpen) {
            // Keep focus inside the dialog
            if (e.key === "Tab") {
                const focusable = Array.from(messageModal.querySelectorAll("button:not([disabled])"));
                if (focusable.length === 0) return;
                e.preventDefault();
                const i = focusable.indexOf(document.activeElement);
                const next = e.shiftKey
                    ? (i <= 0 ? focusable.length - 1 : i - 1)
                    : (i === focusable.length - 1 ? 0 : i + 1);
                focusable[next].focus();
            }
            if (e.key === "Escape") closeModal();
            return;
        }
        if (e.key === "Escape") {
            if (menuDropdown.classList.contains("show")) {
                setMenuOpen(false);
                menuToggleBtn.focus();
            }
            return;
        }
        // Let the menu and its items handle their own keyboard activation
        if (e.target.closest && e.target.closest(".menu-container")) return;

        if (/^\d$/.test(e.key) || e.key === ".") {
            resumeAudio();
            pressKey(e.key);
        } else if (e.key === "Backspace") {
            pressKey("backspace");
        } else if (e.key === "Enter") {
            // Prevent a focused numpad button from also "clicking" itself
            e.preventDefault();
            checkAnswer();
        }
    }

    function closeMenuOnClickOutside(e) {
        if (!menuToggleBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
            setMenuOpen(false);
        }
    }

    function handleOperationChange(e) {
        const opBtn = e.target.closest(".op-btn");
        if (!opBtn) return;
        setActiveOperation(opBtn.dataset.operation);
        saveProgress();
        generateNewRound();
    }

    // Selects an operation and highlights its button
    function setActiveOperation(operation) {
        currentOperation = VALID_OPERATIONS.includes(operation) ? operation : "addition";
        operationsContainer.querySelectorAll(".op-btn").forEach((btn) => {
            const active = btn.dataset.operation === currentOperation;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-pressed", String(active));
        });
    }

    // --- QUESTION LOGIC ---
    function generateNewRound() {
        // Cancel any pending feedback so it can't advance the new round
        clearTimeout(feedbackTimeout);
        feedbackTimeout = null;
        isLocked = false;
        questionCardEl.classList.remove("correct", "incorrect");
        roundCorrect = 0;
        roundBestStreak = 0;
        roundCoins = 0;

        questions = [];
        const seen = new Set();
        for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
            // Sometimes replay a fact the player has missed before
            let q = Math.random() < WEAK_CHANCE ? pickWeakQuestion(currentOperation) : null;
            if (q && seen.has(q.text)) q = null;
            let attempts = 0;
            while (!q || (seen.has(q.text) && attempts < 20)) {
                q = generateSingleQuestion(currentOperation);
                attempts++;
            }
            seen.add(q.text);
            questions.push(q);
        }
        currentQuestionIndex = 0;
        startTimer();
        displayCurrentQuestion();
    }

    function generateSingleQuestion(operation) {
        // Operand range grows with level (capped for times tables)
        const maxFactor = Math.min(12, 3 + level);

        switch (operation) {
            case "subtraction": {
                let a = randInt(1, 10 * level);
                let b = randInt(1, 10 * level);
                if (a < b) [a, b] = [b, a];
                return buildQuestion("subtraction", a, b);
            }
            case "multiplication":
                return buildQuestion("multiplication", randInt(1, maxFactor), randInt(1, maxFactor));
            case "division": {
                const divisor = randInt(2, maxFactor);
                const quotient = randInt(1, maxFactor);
                return buildQuestion("division", divisor * quotient, divisor);
            }
            case "pemdas":
                return generatePemdasQuestion();
            case "addition":
            default:
                return buildQuestion("addition", randInt(1, 10 * level), randInt(1, 10 * level));
        }
    }

    function generatePemdasQuestion() {
        const templates = [
            () => {
                const [a, b, c] = [randInt(1, 9), randInt(1, 9), randInt(1, 9)];
                return { text: `${a} + ${b} × ${c} =`, answer: a + b * c, hint: "Multiply before you add!" };
            },
        ];
        if (level >= 3) {
            templates.push(() => {
                const [a, b, c] = [randInt(1, 9), randInt(1, 9), randInt(2, 9)];
                return { text: `(${a} + ${b}) × ${c} =`, answer: (a + b) * c, hint: "Do the parentheses first!" };
            });
        }
        if (level >= 6) {
            templates.push(() => {
                const [a, b] = [randInt(2, 9), randInt(2, 9)];
                const c = randInt(1, a * b); // Keep the answer non-negative
                return { text: `${a} × ${b} - ${c} =`, answer: a * b - c, hint: "Multiply first, then subtract." };
            });
        }
        return { ...pick(templates)(), type: "pemdas" };
    }

    function displayCurrentQuestion() {
        if (currentQuestionIndex >= questions.length) {
            endRound();
            return;
        }
        const question = questions[currentQuestionIndex];
        questionTextEl.textContent = question.text;
        currentAnswer = "";
        answerDisplayEl.textContent = " ";
        feedbackEl.textContent = "";
        updateProgressBar();
    }

    function endRound() {
        const total = questions.length;
        const isPerfect = roundCorrect === total;
        const stars = isPerfect ? 3 : roundCorrect >= Math.ceil(total * 0.8) ? 2 : 1;
        if (isPerfect) perfectRounds++;
        level++;

        // Bonus coins for the round, then report everything earned this round
        addCoins(stars * 5 + (isPerfect ? 10 : 0));

        const starText = "⭐".repeat(stars) + "☆".repeat(3 - stars);
        const weak = Object.values(weakFacts).slice(-3).map(factLabel);
        const weakLine = weak.length ? `\nKeep practicing: ${weak.join(", ")}` : "";
        showMessage(
            isPerfect ? "🌟 Perfect Round!" : "Round Complete!",
            `${starText}\n${roundCorrect} / ${total} correct\nTime: ${roundSeconds}s\nBest streak: ${roundBestStreak}\nCoins: +${roundCoins} 💰${weakLine}\n\nStarting Level ${level}!`
        );
        burstConfetti(isPerfect ? 80 : 40);
        playSound("levelup");
        checkAchievements();
        saveProgress();
        updateStats();
        generateNewRound();
    }

    function checkAnswer() {
        if (isLocked || currentAnswer === "") return;
        resumeAudio();
        isLocked = true;

        const question = questions[currentQuestionIndex];
        const isCorrect = Number(currentAnswer) === question.answer;
        questionCardEl.classList.add(isCorrect ? "correct" : "incorrect");

        const dailyNote = recordPlayToday();

        if (isCorrect) {
            const before = comboMultiplier(streak);
            streak++;
            const multiplier = comboMultiplier(streak);
            const points = CORRECT_POINTS * multiplier;
            score += points;
            totalCorrect++;
            roundCorrect++;
            roundBestStreak = Math.max(roundBestStreak, streak);
            if (question.type) {
                totalProblemsSolved[question.type] = (totalProblemsSolved[question.type] || 0) + 1;
            }
            addCoins(multiplier);
            recordFactResult(question, true);
            bounceBuddy();
            feedbackEl.textContent = [`${pick(["Correct!", "Nice!", "Great job!", "Awesome!"])} +${points}  💰+${multiplier}`, dailyNote].filter(Boolean).join("  ");
            burstConfetti(multiplier > 1 ? 14 + multiplier * 4 : 10);
            playSound("correct");
            updateStats();
            if (multiplier > before) popComboBadge();
        } else {
            score = Math.max(0, score - WRONG_PENALTY);
            streak = 0;
            answerDisplayEl.textContent = `${currentAnswer} → ${question.answer}`;
            recordFactResult(question, false);
            feedbackEl.textContent = ["Not quite. You've got the next one!", dailyNote].filter(Boolean).join("  ");
            playSound("wrong");
        }
        updateStats();
        checkAchievements();
        saveProgress();
        updateProgressBar(currentQuestionIndex + 1);

        feedbackTimeout = setTimeout(() => {
            feedbackTimeout = null;
            questionCardEl.classList.remove("correct", "incorrect");
            isLocked = false;
            currentQuestionIndex++;
            displayCurrentQuestion();
        }, isCorrect ? FEEDBACK_MS : WRONG_FEEDBACK_MS);
    }

    // --- UI & STATE UPDATES ---
    function updateStats() {
        scoreEl.textContent = `⭐ ${score}`;
        streakEl.textContent = `🔥 ${streak}`;
        levelEl.textContent = `Level ${level}`;
        dailyEl.textContent = `${dailyStreak}-day streak`;
        dailyEl.hidden = dailyStreak < 1;
        coinsEl.textContent = `💰 ${coins}`;

        const multiplier = comboMultiplier(streak);
        comboBadgeEl.hidden = multiplier < 2;
        comboBadgeEl.textContent = `x${multiplier} COMBO`;
    }

    function popComboBadge() {
        comboBadgeEl.classList.remove("pop");
        void comboBadgeEl.offsetWidth; // restart the animation
        comboBadgeEl.classList.add("pop");
    }

    function updateProgressBar(completed = currentQuestionIndex) {
        const progress = Math.round((completed / questions.length) * 100);
        progressBar.style.width = `${progress}%`;
        progressContainer.setAttribute("aria-valuenow", String(progress));
    }

    function startTimer() {
        clearInterval(timerInterval);
        roundSeconds = 0;
        timerEl.textContent = "0s";
        timerInterval = setInterval(() => {
            roundSeconds++;
            timerEl.textContent = `${roundSeconds}s`;
        }, 1000);
    }

    function restartGame() {
        score = 0;
        streak = 0;
        level = 1;
        updateStats();
        saveProgress();
        generateNewRound();
        setMenuOpen(false);
    }

    // --- LOCAL STORAGE ---
    function saveProgress() {
        storageSet(STORAGE_KEY, JSON.stringify({
            level, score, streak,
            unlockedAchievements: Array.from(unlockedAchievements),
            totalProblemsSolved,
            totalCorrect, perfectRounds, dailyStreak, daysPlayed, lastPlayedDate,
            coins, ownedItems: Array.from(ownedItems), equipped, weakFacts, masteredFacts,
            operation: currentOperation,
        }));
    }

    function loadProgress() {
        const isCount = (n) => Number.isFinite(n) && n >= 0;
        try {
            const saved = JSON.parse(storageGet(STORAGE_KEY));
            if (saved && typeof saved === "object") {
                level = isCount(saved.level) && saved.level >= 1 ? Math.floor(saved.level) : 1;
                score = isCount(saved.score) ? saved.score : 0;
                streak = isCount(saved.streak) ? saved.streak : 0;
                unlockedAchievements = new Set(
                    Array.isArray(saved.unlockedAchievements)
                        ? saved.unlockedAchievements.filter((id) => id in achievements)
                        : []
                );
                const pemdas = saved.totalProblemsSolved?.pemdas;
                totalProblemsSolved = { pemdas: isCount(pemdas) ? pemdas : 0 };
                totalCorrect = isCount(saved.totalCorrect) ? saved.totalCorrect : 0;
                perfectRounds = isCount(saved.perfectRounds) ? saved.perfectRounds : 0;
                dailyStreak = isCount(saved.dailyStreak) ? saved.dailyStreak : 0;
                daysPlayed = isCount(saved.daysPlayed) ? saved.daysPlayed : 0;
                lastPlayedDate = /^\d{4}-\d{2}-\d{2}$/.test(saved.lastPlayedDate) ? saved.lastPlayedDate : "";
                coins = isCount(saved.coins) ? Math.floor(saved.coins) : 0;
                if (Array.isArray(saved.ownedItems)) {
                    ownedItems = new Set(saved.ownedItems.filter((id) => SHOP_ITEMS.some((i) => i.id === id)));
                }
                if (saved.equipped && typeof saved.equipped === "object") {
                    equipped = { theme: saved.equipped.theme, buddy: saved.equipped.buddy };
                }
                weakFacts = sanitizeWeakFacts(saved.weakFacts);
                masteredFacts = isCount(saved.masteredFacts) ? Math.floor(saved.masteredFacts) : 0;
                if (VALID_OPERATIONS.includes(saved.operation)) currentOperation = saved.operation;
            }
        } catch {
            // Corrupted save data: fall back to defaults
        }
        // Free items are always owned; equipped items must be valid and owned
        SHOP_ITEMS.filter((i) => i.cost === 0).forEach((i) => ownedItems.add(i.id));
        for (const type of ["theme", "buddy"]) {
            const valid = SHOP_ITEMS.some((i) => i.id === equipped[type] && i.type === type);
            if (!valid || !ownedItems.has(equipped[type])) equipped[type] = DEFAULT_EQUIPPED[type];
        }
        // A missed day breaks the daily streak
        if (lastPlayedDate !== localDateKey(new Date()) && lastPlayedDate !== yesterdayKey()) {
            dailyStreak = 0;
        }
        isMuted = storageGet("muted") === "yes";
        updateStats();
    }

    // --- SOUND (generated with Web Audio, no external files) ---
    function resumeAudio() {
        if (isMuted) return;
        try {
            if (!audioCtx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                audioCtx = new Ctx();
            }
            if (audioCtx.state === "suspended") audioCtx.resume();
        } catch { /* audio unsupported */ }
    }

    function playSound(kind) {
        if (isMuted) return;
        resumeAudio();
        if (!audioCtx) return;

        const sounds = {
            correct: [{ f: 660, d: 0.1, t: "sine" }, { f: 880, d: 0.18, t: "sine" }],
            wrong: [{ f: 220, d: 0.15, t: "sawtooth" }, { f: 165, d: 0.25, t: "sawtooth" }],
            levelup: [{ f: 523, d: 0.12, t: "triangle" }, { f: 659, d: 0.12, t: "triangle" }, { f: 784, d: 0.12, t: "triangle" }, { f: 1047, d: 0.3, t: "triangle" }],
        };
        const notes = sounds[kind];

        let start = audioCtx.currentTime;
        for (const { f, d, t } of notes) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = t;
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + d);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + d + 0.02);
            start += d;
        }
    }

    // --- HINTS, ACHIEVEMENTS ---
    function provideHint() {
        setMenuOpen(false);
        const question = questions[currentQuestionIndex];
        if (!question || !question.hint) return;
        // Only the first hint per question costs points
        if (!question.hintUsed) {
            question.hintUsed = true;
            score = Math.max(0, score - HINT_PENALTY);
            updateStats();
            saveProgress();
        }
        showMessage("💡 Hint", question.hint);
    }

    function checkAchievements() {
        for (const id in achievements) {
            if (!unlockedAchievements.has(id) && achievements[id].condition()) {
                unlockedAchievements.add(id);
                addCoins(ACHIEVEMENT_COINS);
                const a = achievements[id];
                if (a.big) {
                    showMessage("🏆 Achievement Unlocked!", `${a.icon} ${a.name}\n${a.description}\n+${ACHIEVEMENT_COINS} 💰`);
                } else {
                    showToast(`${a.icon} ${a.name} unlocked! +${ACHIEVEMENT_COINS} 💰`);
                }
            }
        }
    }

    function showAchievements() {
        setMenuOpen(false);
        const badges = [];
        for (const id in achievements) {
            const a = achievements[id];
            const badge = document.createElement("div");
            badge.className = "achievement-badge";
            if (!unlockedAchievements.has(id)) badge.classList.add("locked");

            const icon = document.createElement("div");
            icon.className = "icon";
            icon.textContent = a.icon;
            const name = document.createElement("h5");
            name.textContent = a.name;
            const desc = document.createElement("p");
            desc.textContent = a.description;

            badge.append(icon, name, desc);
            badges.push(badge);
        }
        enqueueModal({ title: "Your Achievements", message: "", badges });
    }

    // --- MODAL (queued so messages never overwrite each other) ---
    function showMessage(title, message) {
        enqueueModal({ title, message, badges: [] });
    }

    function enqueueModal(item) {
        messageQueue.push(item);
        if (!modalOpen) showNextModal();
    }

    function showNextModal() {
        const item = messageQueue.shift();
        if (!item) return;
        modalTitle.textContent = item.title;
        modalMessage.textContent = item.isShop ? shopMessage() : item.message;
        modalAchievementsContainer.replaceChildren(...(item.isShop ? buildShopNodes() : item.badges || []));
        modalOkBtn.textContent = item.isShop ? "Close" : "OK";
        if (!modalOpen) lastFocusedEl = document.activeElement;
        modalOpen = true;
        messageModal.style.display = "flex";
        modalOkBtn.focus({ preventScroll: true });
        messageModal.querySelector(".modal-content").scrollTop = 0;
    }

    function closeModal() {
        if (messageQueue.length > 0) {
            showNextModal();
            return;
        }
        modalOpen = false;
        messageModal.style.display = "none";
        if (lastFocusedEl && document.contains(lastFocusedEl)) lastFocusedEl.focus();
    }

    // --- DARK MODE & MUTE ---
    function applyDarkModePreference() {
        const stored = storageGet("darkMode");
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.classList.toggle("dark-mode", stored ? stored === "enabled" : prefersDark);
        updateDarkModeButton();
    }

    function toggleDarkMode() {
        document.body.classList.toggle("dark-mode");
        storageSet("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
        updateDarkModeButton();
        setMenuOpen(false);
    }

    function updateDarkModeButton() {
        darkModeBtn.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light Mode" : "🌙 Dark Mode";
    }

    function toggleMute() {
        isMuted = !isMuted;
        updateMuteButton();
        storageSet("muted", isMuted ? "yes" : "no");
    }

    function updateMuteButton() {
        muteBtn.textContent = isMuted ? "🔊 Unmute" : "🔇 Mute";
    }

    initializeGame();
});
