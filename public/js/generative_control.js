/**
 * This script tracks user interactions on the 'generative_control.html' page.
 * It counts the number of times the user tabs out of the page, records inputs in text boxes,
 * and calculates the time spent on the page.
 * 
 * The interaction data is structured into an object and can be saved for further analysis.
 * 
 */
let tabOutCount = 0;
let textBoxInputs = new Map();
let startTime = Date.now();
let inactivityTime = 0;
let inactivityInterval = null;
const inactivityLimit = 1.5 * 60 * 1000; // 90 Sekunden Inaktivitätsgrenze
var inactiveUser = false;

function resetInactivityTimer() {
    if (inactivityInterval) {
        clearInterval(inactivityInterval);
    }
    inactivityTime = 0;
    inactivityInterval = setInterval(function() {
        inactivityTime += 1000;
        if (inactivityTime >= inactivityLimit) {
            inactiveUser = true;
            clearInterval(inactivityInterval);
        }
    }, 1000);
}

// Event Listener für verschiedene Interaktionen
window.onload = resetInactivityTimer;
document.onmousemove = resetInactivityTimer;
document.addEventListener('keydown', resetInactivityTimer);
document.onscroll = resetInactivityTimer;
document.onclick = resetInactivityTimer;

window.addEventListener('blur', function() {
    tabOutCount++;
});

// Track text box inputs
document.querySelectorAll('textarea').forEach(input => {
    input.addEventListener('input', function() {
        textBoxInputs.set(input.name, input.value);
    });
});

function saveInteractionData() {
    const timeSpentMs = Date.now() - startTime;
    const timeSpent = Math.floor(timeSpentMs / 1000);
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    const interactionData = {
        userId,
        pageInteractions: [{
            page: 'generative_control.html',
            timeSpent: timeSpent,
            tabbedOutCount: tabOutCount,
            textBoxInputs: Array.from(textBoxInputs.entries()),
            inactiveUser: inactiveUser
        }]
    };

    // Save data to localStorage
    localStorage.setItem('interactionData', JSON.stringify(interactionData));
}

// Save the data before the user leaves the page
window.addEventListener('beforeunload', saveInteractionData);
