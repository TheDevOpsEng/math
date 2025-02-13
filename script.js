let level = 1;
let score = 0;
let questions = [];
let startTime;
let timerInterval;
let challengeTime = 60; // Speed round duration in seconds
let synth = window.speechSynthesis;
let selectedVoice = null;

// Load only one US English system voice (Hidden from GUI)
function loadVoice() {
    let voices = synth.getVoices();
    selectedVoice = voices.find(voice => voice.lang === "en-US" && voice.name.includes("Google")) || voices[0];
}

// Speak the given question
function speakQuestion(question) {
    if (synth.speaking) synth.cancel();

    let utterance = new SpeechSynthesisUtterance(question
        .replace('+', 'plus')
        .replace('-', 'minus')
        .replace('×', 'times')
        .replace('÷', 'divided by')
        .replace('=', 'equals')
    );

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.rate = 1.0;
    synth.speak(utterance);
}

// Generate 10 questions, starting from basic and gradually increasing difficulty
function generateQuestions() {
    let container = document.getElementById("questions-container");
    container.innerHTML = "";
    questions = [];

    let operation = document.getElementById("operation").value;
    let range = getDifficultyRange(level); // Get number range based on difficulty

    for (let i = 1; i <= 10; i++) {
        let num1 = getRandomNumber(range.min, range.max);
        let num2 = getRandomNumber(range.min, range.max);
        let questionText, answer;

        switch (operation) {
            case "addition":
                questionText = `${num1} + ${num2} =`;
                answer = num1 + num2;
                break;
            case "subtraction":
                if (num1 < num2) [num1, num2] = [num2, num1];
                questionText = `${num1} - ${num2} =`;
                answer = num1 - num2;
                break;
            case "multiplication":
                questionText = `${num1} × ${num2} =`;
                answer = num1 * num2;
                break;
            case "division":
                num2 = getRandomNumber(1, 10);
                num1 = num2 * getRandomNumber(1, 10);
                questionText = `${num1} ÷ ${num2} =`;
                answer = num1 / num2;
                break;
        }

        questions.push({ questionText, answer });

        container.innerHTML += `
            <div class="question-item">
                ${questionText}
                <input type="number" id="answer-${i}" inputmode="numeric" pattern="[0-9]*"
                    onfocus="speakQuestion('${questionText}')">
                <span id="result-${i}" class="result"></span>
            </div>
        `;
    }
}

// Determine number range based on difficulty level
function getDifficultyRange(level) {
    if (level <= 2) return { min: 1, max: 5 }; // Basic numbers (1-5)
    if (level <= 4) return { min: 1, max: 10 }; // Small numbers (1-10)
    if (level <= 7) return { min: 1, max: 20 }; // Medium numbers (1-20)
    if (level <= 10) return { min: 10, max: 50 }; // Large numbers (10-50)
    return { min: 20, max: 100 }; // Advanced (20-100)
}

// Get a random number within a range
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check answers and update score
function checkAnswers() {
    let correctCount = 0;
    for (let i = 1; i <= 10; i++) {
        let userAnswer = document.getElementById(`answer-${i}`).value;
        let correctAnswer = questions[i - 1].answer;
        let resultSpan = document.getElementById(`result-${i}`);

        if (parseFloat(userAnswer) === correctAnswer) {
            resultSpan.textContent = "✅ Correct!";
            resultSpan.style.color = "green";
            correctCount++;
            score += 10;
        } else {
            resultSpan.textContent = `❌ Wrong! (${correctAnswer})`;
            resultSpan.style.color = "red";
            score -= 5;
        }
    }

    updateScore();
    updateLevel(correctCount);
}

// Update score display
function updateScore() {
    document.getElementById("score").textContent = `🏆 Score: ${score}`;
}

// Increase level if all answers are correct
function updateLevel(correctCount) {
    if (correctCount === 10) {
        level++;
        document.getElementById("level").textContent = `📈 Level: ${level}`;
        alert(`🎉 You've reached Level ${level}!`);
    }
}

// Load next 10 questions (advancing difficulty)
function nextQuestions() {
    generateQuestions();
}

// Start a 60-second challenge round
function startChallengeMode() {
    alert("⚡ Speed Round Started! Solve as many as possible in 60 seconds!");
    generateQuestions();
    startTime = Date.now();
    let timeRemaining = challengeTime;

    document.getElementById("timer").textContent = `⏳ Time: ${timeRemaining}s`;

    timerInterval = setInterval(() => {
        timeRemaining = challengeTime - Math.floor((Date.now() - startTime) / 1000);
        document.getElementById("timer").textContent = `⏳ Time: ${timeRemaining}s`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert(`⏰ Time's Up! Your final score: ${score}`);
            restartGame();
        }
    }, 1000);
}

// Reset game state
function restartGame() {
    score = 0;
    level = 1;
    clearInterval(timerInterval);
    document.getElementById("timer").textContent = "⏳ Time: 0s";
    document.getElementById("level").textContent = `📈 Level: ${level}`;
    generateQuestions();
    updateScore();
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.querySelector(".container").classList.toggle("dark-mode");
}

// Ensure voice is loaded when the page is ready
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoice;
}

// Retry voice loading on page load in case it fails initially
window.onload = function () {
    setTimeout(loadVoice, 100);
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    generateQuestions();
    loadVoice();
});
