let level = 1;
let streak = 0;
let score = 0;
let questions = [];
let synth = window.speechSynthesis;
let voices = [];
let selectedVoice = null;

// Ensure voices are loaded properly
function loadVoices() {
    voices = synth.getVoices();
    const voiceSelector = document.getElementById("voiceSelector");
    voiceSelector.innerHTML = ""; // Clear existing options

    if (voices.length === 0) {
        setTimeout(loadVoices, 100); // Retry until voices are available
        return;
    }

    voices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelector.appendChild(option);
    });

    // Set default voice
    const defaultVoice = voices.find(voice => voice.lang.includes("en")) || voices[0];
    if (defaultVoice) {
        selectedVoice = defaultVoice;
        voiceSelector.value = voices.indexOf(defaultVoice);
    }
}

// Event listener for voice selection
document.getElementById("voiceSelector").addEventListener("change", function () {
    selectedVoice = voices[this.value];
    localStorage.setItem("selectedVoiceIndex", this.value);
});

// Ensure voices are loaded when the page is ready
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// Retry voice loading on page load in case it fails initially
window.onload = function () {
    setTimeout(loadVoices, 100);
};

// Function to generate math questions
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
        } else if (level <= 15) {
            num1 = Math.floor(Math.random() * 50) + 1;
            num2 = Math.floor(Math.random() * 50) + 1;
        } else {
            num1 = Math.floor(Math.random() * 100) + 1;
            num2 = Math.floor(Math.random() * 100) + 1;
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
                <input type="number" id="answer-${i}" inputmode="numeric" pattern="[0-9]*">
                <span id="result-${i}" class="result"></span>
            </div>
        `;
    }
}

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

function updateScore() {
    document.getElementById("score").textContent = `🏆 Score: ${score}`;
}

function nextQuestions() {
    generateQuestions();
}

function restartGame() {
    score = 0;
    level = 1;
    generateQuestions();
    updateScore();
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.querySelector(".container").classList.toggle("dark-mode");
}

document.addEventListener("DOMContentLoaded", () => {
    generateQuestions();
    loadVoices(); // Ensure voices are loaded on page load
});
