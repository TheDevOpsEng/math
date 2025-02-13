function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.querySelector(".container").classList.toggle("dark-mode");
}

function generateQuestions() {
    let container = document.getElementById("questions-container");
    container.innerHTML = "";
}

// Other necessary functions like startTimer(), checkAnswers(), updateScore(), etc.

document.addEventListener("DOMContentLoaded", () => {
    generateQuestions();
});
