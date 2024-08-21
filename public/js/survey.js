/**
 * This script is used to handle the submission of a survey form on the 'survey.html' page.
 * It prevents the default form submission, extracts the user ID from the URL parameters,
 * retrieves the user's interaction data from local storage, and collects the form data.
 * 
 */
function submitSurveyForm() {
    const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const cookie = getCookie('participant_id');

        const interactionData = JSON.parse(localStorage.getItem('interactionData'));

        const formData = {
            userId,
            interactionData, // Include interaction data in survey response
            surveyData: [{
                age: Number(document.getElementById('age').value),
                gender: document.getElementById('gender').value,
                occupation: document.getElementById('occupation').value,
                semester: document.getElementById('location').value,
                education: document.getElementById('education').value,
                taskTimeSufficient: getRadioValue('time-management'),
                instructionsClear: getRadioValue('task-understanding'),
                taskDifficulty: getRadioValue('difficulty-level'),
                toolsEffective: getRadioValue('tools-usage'),
                productivityImproved: getRadioValue('ai-productivity'),
                attentionCheck: getRadioValue('attention'),
                aiToolUsage: getRadioValue('ai-reuse'),
                userFriendlyInterface: getRadioValue('ux'),
                systemInfoSufficiency: getRadioValue('ux-info'),
                cookie: cookie,
                AIsentiment: document.getElementById('aiSentimentPlaceholder').value,
                ID: deviceId,
            }]
        };
        localStorage.removeItem('randomPage');
        fetch('/save-survey-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        }).then(response => {
            if (response.ok) {
                window.location.href = 'thankyou.html';
            } else {
                //alert('Error submitting survey. Please try again.');
            }
        }).catch(error => {
            console.error('Error:', error);
            //alert('Error submitting survey. Please try again.');
        });
    };

let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
    // Generate a new device ID if not exists
    deviceId = generateUUID();
    localStorage.setItem('deviceId', deviceId);
}

// Function to generate UUID (you can use a library like uuid.js instead)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getRadioValue(name) {
    const radios = document.getElementsByName(name);
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            return parseInt(radios[i].value);
        }
    }
    return null; 
}

// setCookie and getCookie functions
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); 
    const expires = "expires=" + date.toUTCString();
    if (document.cookie !== "") {
    } else {
        document.cookie = name + "=" + value + ";" + expires + ";path=/;Secure;SameSite=Strict";
    }
}

function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

// Set a unique participant ID cookie if not already present
document.addEventListener('DOMContentLoaded', function() {
    if (!getCookie('participant_id')) {
        setCookie('participant_id', generateUUID(), 90); // 90 Tage Gültigkeit
    }
});

// Generates a unique ID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}