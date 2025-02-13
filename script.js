let level = 1;
let streak = 0;
let score = 0;
let questions = [];
let startTime;
let timerInterval;
let challengeTime = 60; // Speed round duration in seconds
let synth = window.speechSynthesis;
let selectedVoice = null;

// Load only US English system voices
function loadVoices() {
    let voices = synth.getVoices();
    let voiceSelector = document.getElementById("voiceSelector");
    voiceSelector.innerHTML = ""; // Clear existing options

    // Filter for US English voices (Google or Windows)
    let usVoices = voices.filter(voice => voice.lang === "en-US" && voice.name.includes("Google"));

    if (usVoices.length === 0) {
        setTimeout(loadVoices, 100); // Retry if voices aren't available
        return;
    }

    let voice = usVoices[0]; // Use the first Google US voice found
    selectedVoice = voice;

    // Add the voice option to the dropdown
    let option = document.createElement("option");
    option.value = voice.name;
    option.textContent = voice.name;
    voiceSelector.appendChild(option);
}

// Speak the given question using the selected voice
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

// Generate 10 questions
function generateQuestions() {
    let container = document.getElementById("questions-container");
    container.innerHTML = "";
    questions = [];

    let operation = document.getElementById("operation").value;

    for (let i = 1; i <= 10; i++) {
        let num1, num2, questionText, answer;

        if (level <= 5) {
            num1 = Math.floor(Math.random() * 10) + 1;
            num2 = Math.floor(Math.random() * 10) + 1;
        } else if (level <= 10) {
            num1 = Math.floor(Math.random() * 20) + 1;
            num2 = Math.floor(Math.random() * 20) + 1;
        } else {
            num1 = Math.floor(Math.random() * 50) + 1;
            num2 = Math.floor(Math.random() * 50) + 1;
        }

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
                num2 = Math.floor(Math.random() * 10) + 1;
                num1 = num2 * (Math.floor(Math.random() * 10) + 1);
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
}

// Update score display
function updateScore() {
    document.getElementById("score").textContent = `🏆 Score: ${score}`;
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
    generateQuestions();
    updateScore();
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.querySelector(".container").classList.toggle("dark-mode");
}

// Ensure voices are loaded when the page is ready
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// Retry voice loading on page load in case it fails initially
window.onload = function () {
    setTimeout(loadVoices, 100);
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    generateQuestions();
    loadVoices();
});
