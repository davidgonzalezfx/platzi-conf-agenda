chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'generateAgenda') {
    getAllTalks()
      .then((talksArray) =>
        generatePersonalizedAgenda(talksArray, request.apiKey, request.interests)
      )
      .then((agenda) => formatAgenda(agenda))
      .then((formattedAgenda) => {
        injectAgenda(formattedAgenda)
        sendResponse({ success: true })
      })
      .catch((error) => sendResponse({ error: error.message }))

    return true // Indicates that the response will be sent asynchronously
  }
})

async function getAllTalks() {
  const tabsContainer = document.querySelector('.TabsStages')
  const tabs = tabsContainer.querySelectorAll('.TabsStages__stage')

  let allTalks = []

  for (let tab of tabs) {
    // Click on each tab to render its content
    tab.click()

    // Wait for the content to load
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Get talks from the current tab
    const talks = document.querySelectorAll('.talk')
    const talksArray = Array.from(talks).map((talk) => {
      const time = talk.querySelector('time').innerText
      const title = talk.querySelector('.talk-info-contain-title').innerText
      const speakers = talk.querySelector('.talk-info-contain-speaker').innerText
      const stage = tab.textContent.trim() // Get the stage name from the tab
      return { time, title, speakers, stage, htmlContent: talk.outerHTML }
    })

    allTalks = allTalks.concat(talksArray)
  }

  return allTalks
}

async function generatePersonalizedAgenda(talks, apiKey, interests) {
  const prompt = `Given the following list of talks for a one-day conference across multiple stages and the user's interests (${interests}), create an agenda as a JSON string. You have to provide an agenda from 9am to 6pm to fill the day prioritizing all the talks that align with the user's interests. Otherwise place the best you think the user can attend during that hour. Present the agenda as a list of talk objects, each containing time, title, speakers, stage properties. Sort the talks by time including in parenthesis the stage name. If there are multiple talks at the same time, prioritize the user's interests. If there are no talks at a specific time, leave it empty.

Talks:
${JSON.stringify(
  talks.map(({ time, title, speakers, stage }) => ({ time, title, speakers, stage })),
  null,
  2
)}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  })

  const data = await response.json()
  console.log('response: ', data)

  if (data.error) {
    throw new Error(data.error.message)
  }

  const agenda = JSON.parse(data.choices[0].message.content)
  // for each stage talk, append the htmlContent to the talk object that matches by title

  for (const talk of agenda) {
    const matchingTalk = talks.find((t) => t.title === talk.title)
    if (matchingTalk) {
      talk.htmlContent = matchingTalk.htmlContent
    }
  }

  console.log('agenda: ', agenda)
  return agenda
}

function formatAgenda(agenda) {
  let formattedAgenda = ''

  for (const talk of agenda) {
    const originalTalkHtml = document.createElement('div')
    console.log('talk', talk.htmlContent)
    originalTalkHtml.innerHTML = talk.htmlContent
    console.log('originalTalkHtml', originalTalkHtml)

    // Update the content of the cloned talk element
    originalTalkHtml.querySelector('time').textContent = talk.time
    originalTalkHtml.querySelector('.talk-info-contain-title').textContent = talk.title
    originalTalkHtml.querySelector('.talk-info-contain-speaker').textContent = talk.speakers

    formattedAgenda += originalTalkHtml.innerHTML
  }

  formattedAgenda += '</div>'

  // Capture and inline relevant styles
  const styles = captureRelevantStyles()
  return `<style>${styles}</style>${formattedAgenda}`
}

async function injectAgenda(formattedAgenda) {
  const agendaSection = document.querySelector('section.ListTalks')
  if (agendaSection) {
    // Remove any previously injected personalized agenda
    const existingPersonalizedAgenda = document.getElementById('personalized-agenda')
    if (existingPersonalizedAgenda) {
      existingPersonalizedAgenda.remove()
    }

    // Insert the new personalized agenda before the original agenda section
    agendaSection.insertAdjacentHTML('beforebegin', formattedAgenda)

    // hide section.TabsStages
    const tabsStages = document.querySelector('.TabsStages')
    if (tabsStages) {
      tabsStages.style.display = 'none'
    }

    // hide section.ListTalks
    const listTalks = document.querySelector('.ListTalks')
    if (listTalks) {
      listTalks.style.display = 'none'
    }

    // Wait for the agenda to be rendered
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Scroll to the personalized agenda
    document.getElementById('personalized-agenda').scrollIntoView({ behavior: 'smooth' })
  } else {
    console.error('Agenda section not found')
  }
}

function captureRelevantStyles() {
  const relevantSelectors = [
    '.talk',
    '.talk-info',
    '.talk-info-contain-title',
    '.talk-info-speakers',
    'time'
  ]
  let styles = ''

  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules || sheet.rules
      for (const rule of rules) {
        if (
          rule.selectorText &&
          relevantSelectors.some((selector) => rule.selectorText.includes(selector))
        ) {
          styles += rule.cssText + '\n'
        }
      }
    } catch (e) {
      console.warn('Could not access stylesheet', e)
    }
  }

  return styles
}
