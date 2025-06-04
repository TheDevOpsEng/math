// Constants for better readability and maintainability
const NUM_QUESTIONS = 10;
const SCORE_CORRECT = 10;
const SCORE_WRONG = -5;
const CHALLENGE_TIME = 60; // Speed round duration in seconds
const BALLOON_COLORS = ['color1', 'color2', 'color3', 'color4', 'color5'];

let level = 1;
let score = 0;
let streak = 0;
let questions = [];
let startTime;
let timerInterval;
let timerStarted = false;
let challengeModeActive = false;
let speechEnabled = true;

// Audio elements
const correctSound = document.getElementById("correct-sound");
const wrongSound = document.getElementById("wrong-sound");
const celebrationSound = document.getElementById("celebration-sound");

// Modal elements
const messageModal = document.getElementById("message-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalOkBtn = document.getElementById("modal-ok-btn");

// Speech Synthesis setup
let synth = window.speechSynthesis;
let selectedVoice = null;

// Load only one US English system voice (Hidden from GUI)
function loadVoice() {
    let voices = synth.getVoices();
    selectedVoice = voices.find(voice => voice.lang === "en-US" && voice.name.includes("Google")) || voices[0];
    if (!selectedVoice) {
        console.warn("No suitable en-US Google voice found. Falling back to default or no speech.");
    }
}

// Speak the given question
function speakQuestion(question) {
    if (!speechEnabled) return;

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

// Toggle Speech Assistant
function toggleSpeech() {
    speechEnabled = !speechEnabled;
    const toggleBtn = document.getElementById("toggle-speech-btn");
    if (speechEnabled) {
        toggleBtn.textContent = "🔊 Speech On";
        toggleBtn.setAttribute("aria-label", "Turn Speech Assistant Off");
        speakQuestion("Speech assistant enabled.");
    } else {
        toggleBtn.textContent = "🔇 Speech Off";
        toggleBtn.setAttribute("aria-label", "Turn Speech Assistant On");
        if (synth.speaking) synth.cancel();
    }
}

// Function to start the timer when the user clicks inside an answer box
function startTimer() {
    if (!timerStarted && !challengeModeActive) {
        timerStarted = true;
        startTime = Date.now();
        timerInterval = setInterval(() => {
            let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            document.getElementById("timer").textContent = `⏳ Time: ${elapsedTime}s`;
        }, 1000);
    }
}

// Attach event listener to questions container using event delegation
function attachInputListeners() {
    const questionsContainer = document.getElementById("questions-container");

    // Start timer on input focus
    questionsContainer.addEventListener("focusin", (event) => {
        if (event.target.tagName === 'INPUT' && event.target.type === 'number') {
            startTimer();
        }
    });

    // Auto-check in challenge mode and improve UX
    questionsContainer.addEventListener("input", (event) => {
        if (challengeModeActive && event.target.tagName === 'INPUT' && event.target.type === 'number') {
            const inputId = event.target.id;
            const questionIndex = parseInt(inputId.replace('answer-', '')) - 1;
            const userAnswer = event.target.value;
            const correctAnswer = questions[questionIndex].answer;
            const resultSpan = document.getElementById(`result-${questionIndex + 1}`);
            const inputField = event.target;

            if (userAnswer !== "") {
                if (parseFloat(userAnswer) === correctAnswer) {
                    resultSpan.textContent = "✅";
                    resultSpan.style.color = "green";
                    inputField.style.borderColor = "green";
                } else {
                    resultSpan.textContent = "❌";
                    resultSpan.style.color = "red";
                    inputField.style.borderColor = "red";
                }
            } else {
                resultSpan.textContent = "";
                inputField.style.borderColor = "var(--input-border)"; // Reset to default via CSS variable
            }
        }
    });

    // Allow 'Enter' key to check answers
    questionsContainer.addEventListener("keydown", (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission behavior
            checkAnswers();
        }
    });
}

// Generate questions
function generateQuestions(questionList = null) {
    let container = document.getElementById("questions-container");
    container.innerHTML = ""; // Clear existing questions
    
    // Check if the review button exists before trying to remove it
    const reviewBtn = document.getElementById("review-mistakes-btn");
    if (reviewBtn) {
        reviewBtn.remove();
    }
    
    // If a specific list of questions is provided (for review), use it
    // Otherwise, generate new questions based on level and operation
    questions = questionList ? questionList : [];

    if (!questionList) { // Generate new questions
        let operation = document.getElementById("operation").value;
        let range = getDifficultyRange(level);

        for (let i = 1; i <= NUM_QUESTIONS; i++) {
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
                    num1 = num2 * getRandomNumber(1, 10); // Ensure num1 is a multiple of num2 for whole numbers
                    questionText = `${num1} ÷ ${num2} =`;
                    answer = num1 / num2;
                    break;
            }
            questions.push({ questionText, answer, answeredCorrectly: false });
        }
    }

    let htmlContent = `<div class="progress-bar-container"><div class="progress-bar" id="progress-bar"></div></div>`;
    questions.forEach((q, index) => {
        htmlContent += `
            <div class="question-item">
                <span class="question-text" onclick="speakQuestion('${q.questionText.replace(/'/g, "\\'")}')">${q.questionText}</span>
                <input type="number" id="answer-${index + 1}" inputmode="numeric" pattern="[0-9]*" class="user-answer">
                <span id="result-${index + 1}" class="result"></span>
            </div>
        `;
    });
    container.innerHTML = htmlContent;

    // Focus on the first input field if available
    const firstInput = document.getElementById("answer-1");
    if (firstInput) {
        firstInput.focus();
    }
    updateProgressBar(0); // Reset progress bar
}

// Determine number range based on difficulty level
function getDifficultyRange(level) {
    if (level <= 2) return { min: 1, max: 5 };
    if (level <= 4) return { min: 1, max: 10 };
    if (level <= 7) return { min: 1, max: 20 };
    if (level <= 10) return { min: 10, max: 50 };
    return { min: 20, max: 100 };
}

// Get a random number within a range
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Update progress bar
function updateProgressBar(answeredCount) {
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
        const percentage = (answeredCount / NUM_QUESTIONS) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

// Function to create and animate a balloon
function createBalloon() {
    const containerElement = document.querySelector('.container');
    const balloon = document.createElement('div');
    balloon.classList.add('balloon');
    balloon.classList.add(BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)]);

    // Randomize starting X position
    const startX = Math.random() * 100; // 0% to 100%
    balloon.style.left = `${startX}%`;

    // Randomize end X position for horizontal drift
    const endX = (Math.random() * 200) - 100; // -100px to +100px drift
    balloon.style.setProperty('--balloon-end-x', `${endX}px`);

    containerElement.appendChild(balloon);

    // Play a lighter sound for individual balloons (optional, but good for UX)
    // For now, we'll just play the correctSound as it's already defined for correct answers.
    // If a new, lighter balloon sound is desired, add it to index.html and define it here.
    
    // Remove balloon after animation completes
    balloon.addEventListener('animationend', () => {
        balloon.remove();
    });
}


// Function to display custom message modal
function showMessage(title, message, onDismissCallback = null) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.style.display = 'flex'; // Show the modal

    // Define the event listener function
    const dismissHandler = () => {
        messageModal.style.display = 'none'; // Hide the modal
        modalOkBtn.removeEventListener('click', dismissHandler); // Remove itself after use
        if (onDismissCallback) {
            onDismissCallback(); // Execute callback if provided
        }
    };

    // Attach the event listener
    modalOkBtn.addEventListener('click', dismissHandler);
}


// Check answers and update score
function checkAnswers() {
    let correctCount = 0;
    let answeredQuestions = 0;
    let hasIncorrectAnswers = false;

    for (let i = 0; i < questions.length; i++) {
        let userAnswer = document.getElementById(`answer-${i + 1}`).value;
        let correctAnswer = questions[i].answer;
        let resultSpan = document.getElementById(`result-${i + 1}`);
        let inputField = document.getElementById(`answer-${i + 1}`);
        // No longer need questionItemElement for balloon as it's appended to container

        // Only process if user has provided an input
        if (userAnswer === "") {
            resultSpan.textContent = "❓ Needs Answer";
            resultSpan.style.color = "orange";
            inputField.style.borderColor = "orange";
            questions[i].answeredCorrectly = false; // Mark as not correctly answered
            continue;
        }

        answeredQuestions++; // Count question as attempted

        if (parseFloat(userAnswer) === correctAnswer) {
            resultSpan.textContent = "✅ Correct!";
            resultSpan.style.color = "green";
            inputField.style.borderColor = "green";
            correctCount++;
            score += SCORE_CORRECT;
            streak++;
            correctSound.currentTime = 0; // Rewind to start
            correctSound.play().catch(e => console.log("Sound play failed:", e)); // Play sound, catch errors
            createBalloon(); // Trigger balloon effect
            questions[i].answeredCorrectly = true;
        } else {
            resultSpan.textContent = `❌ Wrong! (${correctAnswer})`;
            resultSpan.style.color = "red";
            inputField.style.borderColor = "red";
            score = Math.max(0, score + SCORE_WRONG);
            streak = 0;
            wrongSound.currentTime = 0; // Rewind to start
            wrongSound.play().catch(e => console.log("Sound play failed:", e)); // Play sound, catch errors
            questions[i].answeredCorrectly = false;
            hasIncorrectAnswers = true;
        }
    }

    updateScore();
    updateStreak();
    updateLevel(correctCount);
    updateProgressBar(answeredQuestions); // Update progress bar based on attempted questions

    // Play celebration sound if all correct in normal mode
    if (correctCount === NUM_QUESTIONS && !challengeModeActive) {
        celebrationSound.currentTime = 0;
        celebrationSound.play().catch(e => console.log("Celebration sound play failed:", e));
    }


    // Add Review Mistakes button if there are incorrect answers
    if (hasIncorrectAnswers) {
        const buttonContainer = document.querySelector(".button-container");
        let reviewBtn = document.getElementById("review-mistakes-btn");
        if (!reviewBtn) {
            reviewBtn = document.createElement("button");
            reviewBtn.textContent = "🔄 Review Mistakes";
            reviewBtn.id = "review-mistakes-btn";
            reviewBtn.onclick = reviewMistakes;
            buttonContainer.appendChild(reviewBtn);
        }
    } else {
        const reviewBtn = document.getElementById("review-mistakes-btn");
        if (reviewBtn) {
            reviewBtn.remove();
        }
    }
}

// Update score display
function updateScore() {
    document.getElementById("score").textContent = `🏆 Score: ${score}`;
}

// Update streak display
function updateStreak() {
    document.getElementById("streak").textContent = `🔥 Streak: ${streak}`;
}

// Increase level if all answers are correct
function updateLevel(correctCount) {
    if (correctCount === NUM_QUESTIONS && !challengeModeActive) { // Only level up in normal mode
        level++;
        document.getElementById("level").textContent = `📈 Level: ${level}`;
        // Replaced alert with custom modal
        showMessage(`🌟 Amazing!`, `You've mastered Level ${level - 1} and reached Level ${level}! Keep going!`);
    }
}

// Load next 10 questions (advancing difficulty)
function nextQuestions() {
    clearInterval(timerInterval);
    timerStarted = false;
    generateQuestions();
    resetTimerDisplay(); // Reset display for clarity
    document.querySelectorAll('.user-answer').forEach(input => input.style.borderColor = 'var(--input-border)');
    document.querySelectorAll('.result').forEach(span => span.textContent = '');
}

// Start a 60-second challenge round
function startChallengeMode() {
    if (challengeModeActive) return;

    challengeModeActive = true;
    // Replaced alert with custom modal
    showMessage("⚡ Speed Round Started!", "Solve as many as possible in 60 seconds!", () => {
        score = 0; // Reset score and streak for challenge
        streak = 0;
        updateScore();
        updateStreak();
        generateQuestions(); // Generate initial questions for challenge
        resetTimerDisplay();
        startTime = Date.now();
        let timeRemaining = CHALLENGE_TIME;

        document.getElementById("timer").textContent = `⏳ Time: ${timeRemaining}s`;
        document.getElementById("next-btn").disabled = true;
        document.getElementById("operation").disabled = true;
        const reviewBtn = document.getElementById("review-mistakes-btn");
        if (reviewBtn) {
            reviewBtn.remove();
        }

        timerInterval = setInterval(() => {
            timeRemaining = CHALLENGE_TIME - Math.floor((Date.now() - startTime) / 1000);
            document.getElementById("timer").textContent = `⏳ Time: ${timeRemaining}s`;

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                challengeModeActive = false;
                checkAnswers(); // Check remaining answers at the end of challenge
                // Replaced alert with custom modal
                showMessage(`⏰ Time's Up!`, `Your final score in the Speed Round: ${score}`, () => {
                    restartGame();
                });
            }
        }, 1000);
    });
}

// Reset timer display
function resetTimerDisplay() {
    clearInterval(timerInterval);
    timerStarted = false;
    document.getElementById("timer").textContent = "⏳ Time: 0s";
}

// Restart game
function restartGame() {
    score = 0;
    level = 1;
    streak = 0;
    challengeModeActive = false;
    resetTimerDisplay();
    document.getElementById("level").textContent = `📈 Level: ${level}`;
    generateQuestions();
    updateScore();
    updateStreak();
    document.getElementById("next-btn").disabled = false;
    document.getElementById("operation").disabled = false;
    document.querySelectorAll('.user-answer').forEach(input => input.style.borderColor = 'var(--input-border)');
    document.querySelectorAll('.result').forEach(span => span.textContent = '');
}

// New: Review Mistakes
function reviewMistakes() {
    const incorrectQuestions = questions.filter(q => !q.answeredCorrectly);
    if (incorrectQuestions.length > 0) {
        // Shuffle the incorrect questions for variety
        for (let i = incorrectQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [incorrectQuestions[i], incorrectQuestions[j]] = [incorrectQuestions[j], incorrectQuestions[i]];
        }
        // Replaced alert with custom modal
        showMessage(`Time to review!`, `You have ${incorrectQuestions.length} mistakes to practice.`, () => {
            generateQuestions(incorrectQuestions); // Regenerate only incorrect questions
            document.getElementById("review-mistakes-btn").remove(); // Remove button after clicking
            resetTimerDisplay(); // Reset timer for the review session
            document.querySelectorAll('.user-answer').forEach(input => input.style.borderColor = 'var(--input-border)');
            document.querySelectorAll('.result').forEach(span => span.textContent = '');
        });
    } else {
        // Replaced alert with custom modal
        showMessage("Great Job!", "You got all questions correct! No mistakes to review.", () => {
            const reviewBtn = document.getElementById("review-mistakes-btn");
            if (reviewBtn) {
                reviewBtn.remove();
            }
            nextQuestions(); // Move to next set if all correct
        });
    }
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.querySelector(".container").classList.toggle("dark-mode");
    // Persist dark mode preference
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("darkMode", "enabled");
    } else {
        localStorage.setItem("darkMode", "disabled");
    }
}

// Apply dark mode based on saved preference
function applyDarkModePreference() {
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
        document.querySelector(".container").classList.add("dark-mode");
    }
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
    applyDarkModePreference();
    generateQuestions();
    loadVoice();
    attachInputListeners();
    document.getElementById("toggle-speech-btn").textContent = speechEnabled ? "🔊 Speech On" : "🔇 Speech Off"; // Set initial button text
});
