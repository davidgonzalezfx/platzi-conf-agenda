document.addEventListener('DOMContentLoaded', function() {
  const generateButton = document.getElementById('generate');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeySection = document.getElementById('apiKeySection');
  const interestsInput = document.getElementById('interests');
  const resultDiv = document.getElementById('result');

  // Load saved API key
  chrome.storage.sync.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
      apiKeySection.style.display = 'none';
    }
  });

  generateButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    const interests = interestsInput.value;

    if (!apiKey || !interests) {
      resultDiv.textContent = 'Please enter both API Key and interests.';
      resultDiv.className = 'mt-4 text-sm text-red-600';
      return;
    }

    // Save API key
    chrome.storage.sync.set({openaiApiKey: apiKey}, function() {
      console.log('API key saved');
    });

    resultDiv.textContent = 'Generating personalized agenda...';
    resultDiv.className = 'mt-4 text-sm text-gray-600';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "generateAgenda", apiKey, interests}, function(response) {
        if (response && response.success) {
          resultDiv.textContent = 'Personalized agenda generated and injected into the page. Please check the website.';
          resultDiv.className = 'mt-4 text-sm text-green-600';
        } else {
          resultDiv.textContent = `Failed to generate agenda. Please try again ${(response && response.error) ? `(${response.error})` : ''}.`;resultDiv.textContent = `Failed to generate agenda. Please try again ${(response && response.error) ? `(${response.error})` : ''}.`;
          resultDiv.className = 'mt-4 text-sm text-red-600';
        }
      });
    });
  });
});


