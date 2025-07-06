// Constants for better readability and maintainability
const NUM_QUESTIONS = 10;
const SCORE_CORRECT = 10;
const SCORE_WRONG = -5;
const CHALLENGE_TIME = 60;
const BALLOON_COLORS = ['color1', 'color2', 'color3', 'color4', 'color5'];

// Game State Variables
let level, score, streak;
let questions = [];
let startTime, timerInterval, timerStarted;
let challengeModeActive = false;
let speechEnabled = true;

// Achievements & Persistent State
let unlockedAchievements;
let totalProblemsSolved;

// DOM Elements
const correctSound = document.getElementById("correct-sound");
const wrongSound = document.getElementById("wrong-sound");
const celebrationSound = document.getElementById("celebration-sound");
const messageModal = document.getElementById("message-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalOkBtn = document.getElementById("modal-ok-btn");
const modalAchievementsContainer = document.getElementById("modal-achievements-container");
const customQuizOptions = document.getElementById("custom-quiz-options");
// --- NEW: Define the toggle button here for easier access ---
const toggleSpeechBtn = document.getElementById("toggle-speech-btn");


// Achievements Definition
const achievements = {
    streakStarter: { name: "Streak Starter", icon: "🔥", description: "Get a streak of 10", unlocked: false, condition: () => streak >= 10 },
    mathWhiz: { name: "Math Whiz", icon: "🧙‍♂️", description: "Reach Level 10", unlocked: false, condition: () => level >= 10 },
    fractionFanatic: { name: "Fraction Fanatic", icon: "½", description: "Solve 20 fraction problems", unlocked: false, condition: () => totalProblemsSolved.fractions_add >= 20 },
    decimalDynamo: { name: "Decimal Dynamo", icon: "🔢", description: "Solve 20 decimal problems", unlocked: false, condition: () => totalProblemsSolved.decimals >= 20 },
    percentPro: { name: "Percent Pro", icon: "%", description: "Solve 20 percentage problems", unlocked: false, condition: () => totalProblemsSolved.percentages >= 20 },
    speedDemon: { name: "Speed Demon", icon: "⚡", description: "Score over 500 in a Speed Round", unlocked: false, condition: (endScore) => challengeModeActive && endScore > 500 }
};

// --- Core Game Logic ---

// Save and Load Progress from localStorage
function saveProgress() {
    const gameState = {
        level: level,
        score: score,
        streak: streak,
        unlockedAchievements: Array.from(unlockedAchievements),
        totalProblemsSolved: totalProblemsSolved,
    };
    localStorage.setItem('mathGameState', JSON.stringify(gameState));
}

function loadProgress() {
    const savedState = localStorage.getItem('mathGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        level = gameState.level;
        score = gameState.score;
        streak = gameState.streak;
        unlockedAchievements = new Set(gameState.unlockedAchievements);
        totalProblemsSolved = gameState.totalProblemsSolved || { fractions_add: 0, decimals: 0, percentages: 0 };
    } else {
        // Default state for first-time players
        level = 1;
        score = 0;
        streak = 0;
        unlockedAchievements = new Set();
        totalProblemsSolved = { fractions_add: 0, decimals: 0, percentages: 0 };
    }
    updateUI();
}

// Update all UI elements with current game state
function updateUI() {
    document.getElementById("level").textContent = `📈 Level: ${level}`;
    document.getElementById("score").textContent = `🏆 Score: ${score}`;
    document.getElementById("streak").textContent = `🔥 Streak: ${streak}`;
}

// Generate Questions (with new topics)
function generateQuestions() {
    let container = document.getElementById("questions-container");
    container.innerHTML = "";
    questions = []; // Clear previous questions

    let operation = document.getElementById("operation").value;
    customQuizOptions.style.display = (operation === 'custom') ? 'block' : 'none';
    let range = getDifficultyRange(level);

    for (let i = 0; i < NUM_QUESTIONS; i++) {
        let questionData = {};
        let num1 = getRandomNumber(range.min, range.max);
        let num2 = getRandomNumber(range.min, range.max);
        
        let currentOperation = operation;
        if (operation === 'custom') {
            const customOps = Array.from(document.querySelectorAll('input[name="custom-op"]:checked')).map(el => el.value);
            currentOperation = customOps.length > 0 ? customOps[Math.floor(Math.random() * customOps.length)] : 'addition';
        }

        switch (currentOperation) {
            case "addition":
                questionData = { questionText: `${num1} + ${num2} =`, answer: num1 + num2, hint: "Basic addition." };
                break;
            case "subtraction":
                if (num1 < num2) [num1, num2] = [num2, num1];
                questionData = { questionText: `${num1} - ${num2} =`, answer: num1 - num2, hint: "Is borrowing necessary?" };
                break;
            case "multiplication":
                questionData = { questionText: `${num1} × ${num2} =`, answer: num1 * num2, hint: `What is ${num1} added to itself ${num2} times?` };
                break;
            case "division":
                num2 = getRandomNumber(1, 10);
                num1 = num2 * getRandomNumber(1, 10);
                questionData = { questionText: `${num1} ÷ ${num2} =`, answer: num1 / num2, hint: `How many times does ${num2} fit into ${num1}?` };
                break;
            case "fractions_add":
                let den1 = getRandomNumber(2, 10);
                let den2 = den1; 
                let frac_num1 = getRandomNumber(1, den1 - 1);
                let frac_num2 = getRandomNumber(1, den2 - 1);
                let correctNum = frac_num1 + frac_num2;
                let commonDivisor = gcd(correctNum, den1);
                questionData = {
                    questionText: `${frac_num1}/${den1} + ${frac_num2}/${den2} =`,
                    answer: `${correctNum / commonDivisor}/${den1 / commonDivisor}`,
                    hint: `The denominators are the same. Just add the numerators! The answer should be in 'numerator/denominator' format.`,
                    type: 'fractions_add'
                };
                break;
            case "decimals":
                let dec1 = (getRandomNumber(1, 999) / 100);
                let dec2 = (getRandomNumber(1, 999) / 100);
                questionData = {
                    questionText: `${dec1} + ${dec2} =`,
                    answer: parseFloat((dec1 + dec2).toFixed(2)),
                    hint: "Line up the decimal points and add.",
                    type: 'decimals'
                };
                break;
            case "percentages":
                let percent = getRandomNumber(1, 10) * 10;
                let whole = getRandomNumber(2, 20) * 10;
                questionData = {
                    questionText: `What is ${percent}% of ${whole}?`,
                    answer: (percent / 100) * whole,
                    hint: "Convert the percentage to a decimal first (e.g., 50% = 0.50).",
                    type: 'percentages'
                };
                break;
            case "pemdas":
                const op1 = ['+', '-'][getRandomNumber(0, 1)];
                const op2 = ['×', '÷'][getRandomNumber(0, 1)];
                let term3 = getRandomNumber(2, 10);
                let term2 = op2 === '÷' ? term3 * getRandomNumber(1, 5) : getRandomNumber(2, 10);
                let term1 = getRandomNumber(1, 20);
                let expr = `${term1} ${op1} ${term2} ${op2} ${term3}`;
                let finalAnswer = eval(expr.replace('×', '*').replace('÷', '/'));
                let step1Result = op2 === '×' ? term2 * term3 : term2 / term3;
                let explanation = `Remember PEMDAS/BODMAS (multiply/divide before add/subtract):\n\n1. First, calculate ${term2} ${op2} ${term3} = ${step1Result}\n\n2. Then, calculate ${term1} ${op1} ${step1Result} = ${finalAnswer}`;
                questionData = {
                    questionText: `${expr} =`,
                    answer: finalAnswer,
                    hint: "Multiplication or Division comes before Addition or Subtraction.",
                    type: 'pemdas',
                    explanation: explanation
                };
                break;
            default: 
                questionData = { questionText: `${num1} + ${num2} =`, answer: num1 + num2, hint: "Basic addition." };
                break;
        }
        questions.push(questionData);
    }
    renderQuestions();
}

function renderQuestions() {
    let container = document.getElementById("questions-container");
    let htmlContent = `<div class="progress-bar-container"><div class="progress-bar" id="progress-bar"></div></div>`;
    questions.forEach((q, index) => {
        const inputType = typeof q.answer === 'string' && q.answer.includes('/') ? 'text' : 'number';
        htmlContent += `
            <div class="question-item">
                <span class="question-text" onclick="speakQuestion('${q.questionText.replace(/'/g, "\\'")}')">${q.questionText}</span>
                <input type="${inputType}" id="answer-${index + 1}" class="user-answer" placeholder="?">
                <span id="result-${index + 1}" class="result"></span>
            </div>
        `;
    });
    container.innerHTML = htmlContent;

    const firstInput = document.getElementById("answer-1");
    if (firstInput) {
        firstInput.focus();
    }
    updateProgressBar(0);
}

function checkAnswers() {
    let correctCount = 0;
    let answeredQuestions = 0;

    questions.forEach((q, i) => {
        let userAnswer = document.getElementById(`answer-${i + 1}`).value.trim();
        let resultSpan = document.getElementById(`result-${i + 1}`);
        let inputField = document.getElementById(`answer-${i + 1}`);
        if (userAnswer === "") return;

        answeredQuestions++;

        const isFraction = typeof q.answer === 'string' && q.answer.includes('/');
        const processedUserAnswer = isFraction ? userAnswer : parseFloat(userAnswer);
        const isCorrect = processedUserAnswer === q.answer;

        if (isCorrect) {
            resultSpan.textContent = "✅ Correct!";
            resultSpan.style.color = "green";
            inputField.style.borderColor = "green";
            score += SCORE_CORRECT;
            streak++;
            correctCount++;
            if (q.type && totalProblemsSolved.hasOwnProperty(q.type)) {
                totalProblemsSolved[q.type]++;
            }
            correctSound.play();
            createBalloon();
        } else {
            resultSpan.textContent = `❌ Wrong! (${q.answer})`;
            resultSpan.style.color = "red";
            inputField.style.borderColor = "red";
            score = Math.max(0, score + SCORE_WRONG);
            streak = 0;
            wrongSound.play();
            if (q.explanation) {
                showMessage("Here's a breakdown:", q.explanation);
            }
        }
    });

    updateProgressBar(answeredQuestions);
    updateLevel(correctCount);
    updateUI();
    checkAchievements();
    saveProgress();
}

function checkAchievements(endScore = null) {
    for (const id in achievements) {
        if (!unlockedAchievements.has(id)) {
            let conditionMet = (id === 'speedDemon' && endScore !== null) ? achievements[id].condition(endScore) : achievements[id].condition();
            if (conditionMet) {
                unlockedAchievements.add(id);
                showMessage("🏆 Achievement Unlocked!", `${achievements[id].name}\n${achievements[id].description}`);
            }
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

        badge.innerHTML = `
            <div class="icon">${achievements[id].icon}</div>
            <h5>${achievements[id].name}</h5>
            <p>${achievements[id].description}</p>
        `;
        modalAchievementsContainer.appendChild(badge);
    }
    messageModal.style.display = 'flex';
}

function updateLevel(correctCount) {
    if (correctCount === NUM_QUESTIONS && !challengeModeActive) {
        level++;
        showMessage(`🌟 Amazing!`, `You've mastered Level ${level - 1} and reached Level ${level}! Keep going!`);
        celebrationSound.play();
    }
}

function getDifficultyRange(level) {
    if (level <= 2) return { min: 1, max: 5 };
    if (level <= 4) return { min: 1, max: 10 };
    if (level <= 7) return { min: 1, max: 20 };
    if (level <= 10) return { min: 10, max: 50 };
    return { min: 20, max: 100 };
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function updateProgressBar(answeredCount) {
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
        const percentage = (answeredCount / NUM_QUESTIONS) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

function createBalloon() {
    const containerElement = document.querySelector('.container');
    const balloon = document.createElement('div');
    balloon.classList.add('balloon', BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)]);
    balloon.style.left = `${Math.random() * 100}%`;
    balloon.style.setProperty('--balloon-end-x', `${(Math.random() * 200) - 100}px`);
    containerElement.appendChild(balloon);
    balloon.addEventListener('animationend', () => balloon.remove());
}

function showMessage(title, message, onDismissCallback = null) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalAchievementsContainer.innerHTML = "";
    messageModal.style.display = 'flex';
    const dismissHandler = () => {
        messageModal.style.display = 'none';
        modalOkBtn.removeEventListener('click', dismissHandler);
        if (onDismissCallback) onDismissCallback();
    };
    modalOkBtn.addEventListener('click', dismissHandler);
}

function provideHint() {
    const firstUnansweredIndex = questions.findIndex((q, i) => document.getElementById(`answer-${i + 1}`).value === "");
    if (firstUnansweredIndex !== -1) {
        const hint = questions[firstUnansweredIndex].hint;
        showMessage("💡 Here's a Hint!", hint);
        score = Math.max(0, score - 2);
        updateUI();
        saveProgress();
    } else {
        showMessage("Way to go!", "You've answered all the questions! No hints needed here.");
    }
}

function nextQuestions() {
    clearInterval(timerInterval);
    timerStarted = false;
    document.getElementById("timer").textContent = "⏳ Time: 0s";
    generateQuestions();
}

function startChallengeMode() {
    if (challengeModeActive) return;
    challengeModeActive = true;
    showMessage("⚡ Speed Round Started!", "Solve as many as possible in 60 seconds!", () => {
        score = 0;
        streak = 0;
        updateUI();
        generateQuestions();
        let timeRemaining = CHALLENGE_TIME;
        document.getElementById("timer").textContent = `⏳ Time: ${timeRemaining}s`;
        timerInterval = setInterval(() => {
            timeRemaining--;
            document.getElementById("timer").textContent = `⏳ Time: ${timeRemaining}s`;
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                challengeModeActive = false;
                checkAnswers();
                checkAchievements(score);
                saveProgress();
                showMessage(`⏰ Time's Up!`, `Your final score in the Speed Round: ${score}`, restartGame);
            }
        }, 1000);
    });
}

function restartGame() {
    level = 1;
    score = 0;
    streak = 0;
    challengeModeActive = false;
    clearInterval(timerInterval);
    timerStarted = false;
    document.getElementById("timer").textContent = "⏳ Time: 0s";
    saveProgress();
    updateUI();
    generateQuestions();
}

// --- Speech Synthesis ---
let synth = window.speechSynthesis;
let selectedVoice = null;

function loadVoice() {
    let voices = synth.getVoices();
    selectedVoice = voices.find(voice => voice.lang === "en-US" && voice.name.includes("Google")) || voices[0];
}

// --- UPDATED: This function is more robust ---
function toggleSpeech() {
    speechEnabled = !speechEnabled;
    if (speechEnabled) {
        toggleSpeechBtn.textContent = "🔊 Speech On";
        toggleSpeechBtn.setAttribute("aria-label", "Turn Speech Assistant Off");
        speakQuestion("Speech assistant enabled.");
    } else {
        toggleSpeechBtn.textContent = "🔇 Speech Off";
        toggleSpeechBtn.setAttribute("aria-label", "Turn Speech Assistant On");
        synth.cancel(); // Stop any currently speaking utterance
    }
}

function speakQuestion(question) {
    if (!speechEnabled || !synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(question
        .replace('+', 'plus').replace('-', 'minus').replace('×', 'times')
        .replace('÷', 'divided by').replace('=', 'equals').replace('/', 'over'));
    if (selectedVoice) utterance.voice = selectedVoice;
    synth.speak(utterance);
}

// --- Initialization ---

function attachInputListeners() {
    const questionsContainer = document.getElementById("questions-container");
    questionsContainer.addEventListener("focusin", (event) => {
        if (event.target.tagName === 'INPUT' && !challengeModeActive) startTimer();
    });
    questionsContainer.addEventListener("keydown", (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            checkAnswers();
        }
    });
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
}

function applyDarkModePreference() {
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applyDarkModePreference();
    loadProgress();
    generateQuestions();
    attachInputListeners();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoice;
    }

    // --- FIX: Set initial button state on page load ---
    if (speechEnabled) {
        toggleSpeechBtn.textContent = "🔊 Speech On";
        toggleSpeechBtn.setAttribute("aria-label", "Turn Speech Assistant Off");
    } else {
        toggleSpeechBtn.textContent = "🔇 Speech Off";
        toggleSpeechBtn.setAttribute("aria-label", "Turn Speech Assistant On");
    }
});
