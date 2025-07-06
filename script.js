document.addEventListener("DOMContentLoaded", () => {
    // --- STATE VARIABLES ---
    let level = 1, score = 0, streak = 0;
    let questions = [];
    let currentQuestionIndex = 0;
    let currentAnswer = "";
    let currentOperation = "addition";
    
    // --- ACHIEVEMENTS & PERSISTENT STATE ---
    let unlockedAchievements;
    let totalProblemsSolved;

    // --- SOUNDS ---
    let correctSounds = [];
    let wrongSounds = [];
    let isAudioUnlocked = false; // --- NEW: Track if audio is ready for mobile ---
    let isMuted = false;

    // --- DOM ELEMENTS ---
    const questionTextEl = document.getElementById("question-text");
    const answerDisplayEl = document.getElementById("answer-display");
    const questionCardEl = document.getElementById("question-card");
    const numpad = document.getElementById("numpad");
    const submitBtn = document.getElementById("submit-btn");
    const progressBar = document.getElementById("progress-bar");
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    const menuDropdown = document.getElementById("menu-dropdown");
    const operationsContainer = document.getElementById("operations-container");
    const messageModal = document.getElementById("message-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const modalOkBtn = document.getElementById("modal-ok-btn");
    const modalAchievementsContainer = document.getElementById("modal-achievements-container");

    // Achievements Definition
    const achievements = {
        streakStarter: { name: "Streak Starter", icon: "🔥", description: "Get a streak of 10", condition: () => streak >= 10 },
        mathWhiz: { name: "Math Whiz", icon: "🧙‍♂️", description: "Reach Level 10", condition: () => level >= 10 },
        pemdasPro: { name: "PEMDAS Pro", icon: "🧮", description: "Solve 20 PEMDAS problems", condition: () => totalProblemsSolved.pemdas >= 20 },
    };

    // --- INITIALIZATION ---
    function initializeGame() {
        correctSounds = Array.from(document.querySelectorAll(".correct-sound"));
        wrongSounds = Array.from(document.querySelectorAll(".wrong-sound"));
        loadProgress();
        applyDarkModePreference();
        generateNewRound();
        addEventListeners();
        updateMuteButton();
    }

    // --- EVENT LISTENERS ---
    function addEventListeners() {
        numpad.addEventListener("click", handleNumpadClick);
        submitBtn.addEventListener("click", checkAnswer);
        menuToggleBtn.addEventListener("click", () => menuDropdown.classList.toggle("show"));
        document.addEventListener("click", closeMenuOnClickOutside);
        operationsContainer.addEventListener("click", handleOperationChange);
        document.getElementById("restart-btn").addEventListener("click", restartGame);
        document.getElementById("achievements-btn").addEventListener("click", showAchievements);
        document.getElementById("hint-btn").addEventListener("click", provideHint);
        document.getElementById("dark-mode-btn").addEventListener("click", toggleDarkMode);
        document.getElementById("mute-btn").addEventListener("click", toggleMute);
    }

    function handleNumpadClick(e) {
        unlockAudio(); // --- NEW: Unlock audio on first interaction ---
        const key = e.target.closest(".numpad-btn")?.dataset.key;
        if (!key) return;
        if (key === "backspace") {
            currentAnswer = currentAnswer.slice(0, -1);
        } else {
            currentAnswer += key;
        }
        answerDisplayEl.textContent = currentAnswer || " ";
    }
    
    function closeMenuOnClickOutside(e) {
        if (!menuToggleBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
            menuDropdown.classList.remove("show");
        }
    }

    function handleOperationChange(e) {
        const opBtn = e.target.closest(".op-btn");
        if (!opBtn) return;
        currentOperation = opBtn.dataset.operation;
        document.querySelector(".op-btn.active").classList.remove("active");
        opBtn.classList.add("active");
        generateNewRound();
    }

    // --- QUESTION LOGIC ---
    function generateNewRound() {
        questions = [];
        for (let i = 0; i < 10; i++) {
            questions.push(generateSingleQuestion(currentOperation));
        }
        currentQuestionIndex = 0;
        displayCurrentQuestion();
    }
    
    function generateSingleQuestion(operation) {
        let num1 = Math.floor(Math.random() * 10 * level);
        let num2 = Math.floor(Math.random() * 10 * level);
        switch(operation) {
            case "addition":
            default:
                return { text: `${num1} + ${num2} =`, answer: num1 + num2, hint: "Add the numbers together." };
            case "subtraction":
                if (num1 < num2) [num1, num2] = [num2, num1];
                return { text: `${num1} - ${num2} =`, answer: num1 - num2, hint: "Find the difference." };
            case "multiplication":
                 num1 = Math.floor(Math.random() * 10);
                 num2 = Math.floor(Math.random() * 10);
                return { text: `${num1} × ${num2} =`, answer: num1 * num2, hint: `What is ${num1} added ${num2} times?` };
            case "division":
                 num2 = Math.floor(Math.random() * 9) + 1;
                 num1 = num2 * (Math.floor(Math.random() * 10));
                return { text: `${num1} ÷ ${num2} =`, answer: num1 / num2, hint: `How many times does ${num2} go into ${num1}?` };
            case "pemdas":
                 let t1 = Math.floor(Math.random() * 10);
                 let t2 = Math.floor(Math.random() * 10);
                 let t3 = Math.floor(Math.random() * 10);
                 return { text: `${t1} + ${t2} × ${t3} =`, answer: t1 + t2 * t3, hint: "Multiply before you add!", type: "pemdas" };
        }
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
        updateProgressBar();
    }
    
    function endRound() {
        level++;
        showMessage(`Round Over!`, `You finished the round. Starting Level ${level}!`);
        generateNewRound();
    }

    function checkAnswer() {
        unlockAudio(); // --- NEW: Unlock audio on first interaction ---
        if (currentAnswer === "") return;
        const question = questions[currentQuestionIndex];
        const isCorrect = parseFloat(currentAnswer) === question.answer;
        questionCardEl.classList.add(isCorrect ? "correct" : "incorrect");

        if(isCorrect) {
            score += 10;
            streak++;
            if (question.type) {
                totalProblemsSolved[question.type] = (totalProblemsSolved[question.type] || 0) + 1;
            }
            playRandomSound(correctSounds);
        } else {
            score = Math.max(0, score - 5);
            streak = 0;
            playRandomSound(wrongSounds);
        }
        updateStats();
        checkAchievements();
        saveProgress();

        setTimeout(() => {
            questionCardEl.classList.remove("correct", "incorrect");
            currentQuestionIndex++;
            displayCurrentQuestion();
        }, 800);
    }
    
    // --- UI & STATE UPDATES ---
    function updateStats() {
        document.getElementById("score").textContent = `🏆 ${score}`;
        document.getElementById("streak").textContent = `🔥 ${streak}`;
        document.getElementById("level").textContent = `📈 Level: ${level}`;
    }

    function updateProgressBar() {
        const progress = (currentQuestionIndex / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    function restartGame() {
        score = 0;
        streak = 0;
        level = 1;
        updateStats();
        generateNewRound();
        menuDropdown.classList.remove("show");
    }

    // --- LOCAL STORAGE ---
    function saveProgress() {
        const gameState = {
            level, score, streak, unlockedAchievements: Array.from(unlockedAchievements), totalProblemsSolved
        };
        localStorage.setItem('mathGameState', JSON.stringify(gameState));
    }

    function loadProgress() {
        const savedState = JSON.parse(localStorage.getItem('mathGameState'));
        if (savedState) {
            level = savedState.level;
            score = savedState.score;
            streak = savedState.streak;
            unlockedAchievements = new Set(savedState.unlockedAchievements);
            totalProblemsSolved = savedState.totalProblemsSolved || { pemdas: 0 };
        } else {
            level = 1;
            score = 0;
            streak = 0;
            unlockedAchievements = new Set();
            totalProblemsSolved = { pemdas: 0 };
        }
        isMuted = localStorage.getItem("muted") === "yes";
        updateStats();
    }
    
    // --- FEATURES (HINTS, ACHIEVEMENTS, MODAL, DARK MODE, SOUNDS) ---
    
    // --- NEW: Function to unlock audio on mobile ---
    function unlockAudio() {
        if (isAudioUnlocked) return;
        
        const allSounds = [...correctSounds, ...wrongSounds];
        allSounds.forEach(sound => {
            sound.play().catch(() => {}); // Play and immediately pause to prime it
            sound.pause();
            sound.currentTime = 0;
        });
        
        isAudioUnlocked = true;
    }

    function playRandomSound(soundArray) {
        if (isMuted) return;
        if (!soundArray || soundArray.length === 0) {
            return;
        }

        // --- NEW: Stop all other sounds before playing a new one ---
        [...correctSounds, ...wrongSounds].forEach(s => {
            s.pause();
            s.currentTime = 0;
        });

        // Use new Audio(original.src) for reliable playback
        const original = soundArray[Math.floor(Math.random() * soundArray.length)];
        const tempSound = new Audio(original.src);
        tempSound.volume = 1.0;
        tempSound.play().catch(error => {
            console.error("Audio playback failed. User may need to interact with the page first.", error);
        });
    }

    function provideHint() {    
        const question = questions[currentQuestionIndex];
        if (question && question.hint) {
            showMessage("💡 Hint", question.hint);
            score = Math.max(0, score - 2);
            updateStats();
        }
        menuDropdown.classList.remove("show");
    }

    function checkAchievements() {
        for (const id in achievements) {
            if (!unlockedAchievements.has(id) && achievements[id].condition()) {
                unlockedAchievements.add(id);
                showMessage("🏆 Achievement Unlocked!", `${achievements[id].name}\n${achievements[id].description}`);
            }
        }
    }

    function showAchievements() {
        modalTitle.textContent = "Your Achievements";
        modalMessage.textContent = "";
        modalAchievementsContainer.innerHTML = "";
        for (const id in achievements) {
            const isUnlocked = unlockedAchievements.has(id);
            const badge = document.createElement('div');
            badge.className = 'achievement-badge';
            if (!isUnlocked) badge.classList.add('locked');
            badge.innerHTML = `<div class="icon">${achievements[id].icon}</div><h5>${achievements[id].name}</h5><p>${achievements[id].description}</p>`;
            modalAchievementsContainer.appendChild(badge);
        }
        messageModal.style.display = 'flex';
        menuDropdown.classList.remove("show");
        modalOkBtn.onclick = () => messageModal.style.display = 'none';
    }

    function showMessage(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalAchievementsContainer.innerHTML = "";
        messageModal.style.display = 'flex';
        modalOkBtn.onclick = () => messageModal.style.display = 'none';
    }

    function toggleDarkMode() {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
        menuDropdown.classList.remove("show");
    }

    function applyDarkModePreference() {
        if (localStorage.getItem("darkMode") === "enabled") {
            document.body.classList.add("dark-mode");
        }
    }

    function toggleMute() {
        isMuted = !isMuted;
        updateMuteButton();
        localStorage.setItem("muted", isMuted ? "yes" : "no");
    }

    function updateMuteButton() {
        const muteBtn = document.getElementById("mute-btn");
        muteBtn.textContent = isMuted ? "🔊 Unmute" : "🔇 Mute";
    }

    initializeGame();
});
