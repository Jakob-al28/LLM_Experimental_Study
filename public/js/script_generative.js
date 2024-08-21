/**
 * This script is used to handle user interactions for 'generative_control.html' and 'generative_experimental.html'.
 * It includes a countdown timer that displays the remaining time, a keypress event handler for the search input,
 * and a function to check the inputs of three topic fields.
 * 
 * The countdown timer starts when the page loads and updates every second.
 * The keypress event handler listens for the 'Enter' key and submits the search query when it is pressed.
 * The checkInputs function enables the submit button only when all three topic fields have been filled.
 */
let queriesLeft = 10;
var queryCount = 0;
let selectedOption = null;
var llmQueryResponse = {};
var config = {};
let lang = localStorage.getItem('language') || 'de';
const langData = translations[lang];

async function fetchConfig() {
  try {
    const response = await fetch('/config');
    config = await response.json();
  } catch (error) {
    console.error('Error fetching config:', error);
  }
}

// Call the function immediately
fetchConfig().then(() => {
  }).catch((error) => {
    alert('Error fetching config:', error);
  });

async function submitQuery() {
    /* 
    * function to submit query to OpenAI API and display response
    * openai logprobs are used to calculate confidence level of each sentence in the response
    * sentences with high confidence are highlighted in green, low confidence in red, and medium confidence in black
    * logprobs have been turned off for now, but can be turned on by adjusting avgLinearProb thresholds
    */
    var submitButton = document.getElementById('submit-btn'); // Ensure your submit button has this ID
    var query = document.getElementById('search-input').value;
    if (query.trim() === '') {
        alert('Please enter a query.');
        return;
    }

    if (isRequestPending) {
        return; // Early return if a request is already pending
    }

    isRequestPending = true; // Set the flag when the request starts
    submitButton.disabled = true;
    document.getElementById('submit-btn').textContent = langData.loading;

    query = escapeHtml(query);
    if (queriesLeft > 0) {
        try {
            var response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.openAiApiKey}` // Add your OpenAI API key here
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{ role: "user", content: query }],
                    max_tokens: 500,
                    temperature: 0.7,
                    logprobs: true, 
                    top_logprobs: 1 
                })
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            displayResponseWithLogProbs(query, data);
            queriesLeft--;
            updateQueriesLeft();
            queryCount++;
            document.getElementById('queries-left').innerText = `Queries left for this task: ${queriesLeft}`;
            document.getElementById('queries-left').textContent = `${langData.queriesLeft2} ${queriesLeft}`;

            if (queryCount >= 10 && !document.getElementById('search-btn')) {
                const searchButton = document.createElement('button');
                searchButton.id = 'search-btn';
                searchButton.textContent = 'Use Search Engine';
                searchButton.onclick = showSearchEngine;
                document.getElementById('search-button-container').appendChild(searchButton);
            }
        } catch (error) {
            console.error('Error fetching response from OpenAI:', error);
            alert(`There was an error processing your request. Please try again. \n${error.message}`);
        } finally {
            isRequestPending = false; // Reset the flag when the request completes
            // Re-enable the submit button after the request is handled
            submitButton.disabled = false;
            document.getElementById('submit-btn').textContent = langData.submitButtonLLM;
        }
    } else {
        alert("No more queries left for this task.");
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function displayResponseWithLogProbs(query, data) {
    const logProbs = data.choices[0].logprobs;
    //console.log("LogProbs Data:", logProbs); 
    let html_output = `<p style="color:black"><b>You:</b> ${query}</p>`;

    let highlightedResponse = '';
    let totalLogProb = 0;
    let validLogProbCount = 0; 
    let sentenceLogProbs = [];
    let allSentences = '';

    if (logProbs && logProbs.content) {
        const sentences = data.choices[0].message.content.split(/(?<=\s)(?=\d+\.\s)|(?<=[?])/);
        let tokenIndex = 0;

        sentences.forEach(sentence => {
            const sentenceTokens = sentence.split(' ');
            let sentenceLogProb = 0;
            let sentenceTokenCount = 0;

            sentenceTokens.forEach(token => {
                if (logProbs.content[tokenIndex] && logProbs.content[tokenIndex].logprob !== -9999) {
                    const logprob = logProbs.content[tokenIndex].logprob;
                    sentenceLogProb += logprob;
                    sentenceTokenCount++;
                    tokenIndex++;
                }
            });

            allSentences += sentence.trim() + ' ';

            if (sentenceTokenCount > 0) {
                const avgLogProb = sentenceLogProb / sentenceTokenCount;
                const avgLinearProb = Math.exp(avgLogProb);
                sentenceLogProbs.push(avgLinearProb);

                let color;
                if (avgLinearProb > 10.85) {
                    color = 'green'; // High confidence
                } else if (avgLinearProb < 0.001) {
                    color = 'red'; // Low confidence
                } else {
                    color = 'black'; // Medium confidence
                }
            
                highlightedResponse += `<span style="color:${color}">${sentence.trim()}</span><br> `;
                validLogProbCount += sentenceTokenCount;
                totalLogProb += sentenceLogProb;
            }
        });
        llmQueryResponse[query] = allSentences.trim();
        
        let overallConfidenceLevel = 0;
        if (sentenceLogProbs.length > 0) {
            overallConfidenceLevel = (sentenceLogProbs.reduce((a, b) => a + b, 0) / sentenceLogProbs.length) * 100;
        }

        html_output += `<p style="color:black"><b>Bot Response:</b> ${highlightedResponse.replace(/\*/g, '').trim()}</p>`;
    } else {
        console.log("Entire Response Data:", data); 
        html_output += `<p style="color:red">Log probabilities data is missing.</p>`;
    }

    const resultsElement = document.getElementById('results');
    resultsElement.innerHTML = html_output + resultsElement.innerHTML;
}

function showSearchEngine() {
    document.getElementById('search-engine-container').style.display = 'block';
    document.getElementById('search-btn').style.display = 'none';
}

function hideSearchEngine() {
    document.getElementById('search-engine-container').style.display = 'none';
    document.getElementById('search-btn').style.display = 'block';
}

async function submitQuery2() {
    const query = document.getElementById('search-input-2').value;
    const url = `https://www.googleapis.com/customsearch/v1?key=${config.googleApiKey}&cx=${config.googleApiKey}&q=${query}`; // Add your Google API key and CX here

    const response = await fetch(url);
    const data = await response.json();

    let searchResults = '';
    data.items.forEach(item => {
        searchResults += `
            <div class="search-result">
                <div class="result-title"><a href="${item.link}" target="_blank">${item.title}</a></div>
                <div class="result-url">${item.link}</div>
                <div class="result-snippet">${item.snippet}</div>
            </div>
        `;
    });

    document.getElementById('results-2').innerHTML = searchResults;
}

function updateQueriesLeft() {
    document.getElementById('queries-left').innerText = `Queries left for this task: ${queriesLeft}`;
    const queriesLeft2 = document.getElementById('queries-left-2');
    if (queriesLeft2) {
        queriesLeft2.innerText = `Queries left for this task: ${queriesLeft}`;
    }
}


function submitChoice() {
    clearInterval(timer); 
    window.location.href = 'survey.html'; 
}

let timer; 
const timeLimit = 6 * 60; 
let timeRemaining = timeLimit;

function startTimer() {
    timer = setInterval(() => {
        if (timeRemaining <= 0) {
            clearInterval(timer);
            alert("Time's up! You will be redirected to the next page.");
            saveInteractionData();
            window.location.href = 'survey.html'; 
        } else {
            timeRemaining--;
            displayTime();
        }
    }, 1000);
}

function displayTime() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer').textContent = `${langData.time} ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

window.addEventListener('load', startTimer);

let isRequestPending = false;

function handleKeyPress(event) {
    if (event.key === 'Enter' && !isRequestPending) {
        submitQuery();
    }
}

try {
    document.getElementById('search-input').addEventListener('keypress', handleKeyPress);
  } catch (exception) {
  }
function checkInputs() {
    const topic1 = document.getElementById("topic1").value.trim();
    const topic2 = document.getElementById("topic2").value.trim();
    const topic3 = document.getElementById("topic3").value.trim();
    const button = document.getElementById("submitButton");

    if (topic1 && topic2 && topic3) {
        button.disabled = false;
    } else {
        button.disabled = true;
    }
}
