# InterviewPrep AI

A modern, portfolio-ready web application that helps engineering students prepare for technical interviews. Generate role-specific questions with Google Gemini and receive AI-powered feedback on your answers.

![InterviewPrep AI](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Gemini API](https://img.shields.io/badge/Gemini-4285F4?style=flat&logo=google&logoColor=white)

---

## Project Overview

**InterviewPrep AI** is a single-page application built with vanilla HTML, CSS, and JavaScript. Students select a target job role and difficulty level, receive five tailored technical interview questions, submit written answers, and get structured AI evaluations including scores, strengths, weaknesses, and improvement suggestions.

The UI is designed for placement preparation — professional, responsive, and suitable for showcasing on GitHub and in developer portfolios.

---

## Problem Statement

Technical interview preparation is often unstructured. Students may:

- Practice random questions that do not match their target role
- Lack immediate, constructive feedback on their answers
- Struggle to identify gaps before real campus placements or job interviews

There is a need for an accessible, role-focused practice tool that simulates interview questioning and provides actionable feedback without requiring complex setup.

---

## Solution

InterviewPrep AI addresses these gaps by:

1. Letting users choose from four common developer roles and three difficulty levels
2. Using the **Google Gemini API** to generate realistic, level-appropriate interview questions
3. Accepting written answers per question
4. Evaluating responses with AI-generated scores (out of 10), strengths, weaknesses, and improvement tips
5. Presenting results in a clean, card-based interface with loading states and error handling

The application runs entirely in the browser with no backend server required for the demo/prototype phase.

---

## Features

| Feature | Description |
|--------|-------------|
| **Role selection** | Java Developer, Frontend Developer, Full Stack Developer, Python Developer |
| **Difficulty levels** | Beginner, Intermediate, Advanced |
| **AI question generation** | 5 tailored questions per session via Gemini |
| **Answer submission** | Text area per question with validation |
| **AI evaluation** | Score /10, strengths, weaknesses, suggested improvements |
| **Loading animations** | Full-screen overlay during API calls |
| **Error handling** | Toasts for API failures, timeouts, and config issues |
| **Responsive design** | Optimized for desktop, tablet, and mobile |
| **Session management** | New Session button to restart |
| **Session summary** | Average score and evaluation count |

---

## Tech Stack

- **HTML5** — Semantic structure and accessibility
- **CSS3** — Custom properties, Grid, Flexbox, animations, responsive breakpoints
- **JavaScript (ES6+)** — Modules, async/await, fetch API
- **Google Gemini API** — `gemini-2.0-flash` for generation and evaluation
- **Google Fonts** — DM Sans, JetBrains Mono

---

## Setup Instructions

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- A [Google AI Studio API key](https://aistudio.google.com/apikey) for Gemini

### Installation

1. **Clone or download** this repository:

   ```bash
   git clone https://github.com/yourusername/InterviewPrep.git
   cd InterviewPrep
   ```

2. **Configure your API key** in `script.js`:

   Open `script.js` and replace the placeholder in the `CONFIG` object:

   ```javascript
   const CONFIG = {
     GEMINI_API_KEY: "YOUR_ACTUAL_API_KEY_HERE",
     // ...
   };
   ```

   > **Security note:** Never commit your real API key to a public repository. For production, use a backend proxy to hide the key, or use environment-specific builds.

3. **Run the application**

   **Option A — VS Code Live Server**

   Install the "Live Server" extension, right-click `index.html`, and choose **Open with Live Server**.

   **Option B — Python HTTP server**

   ```bash
   # Python 3
   python -m http.server 8080
   ```

   Then open `http://localhost:8080` in your browser.

   **Option C — Node.js `serve`**

   ```bash
   npx serve .
   ```

4. **Use the app**

   - Select a role and difficulty
   - Click **Generate 5 Interview Questions**
   - Write answers and click **Evaluate This Answer** or **Evaluate All Answers**
   - Review scores and feedback; use **New Session** to start over

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key is not configured" | Set `CONFIG.GEMINI_API_KEY` in `script.js` |
| 403 / API key invalid | Verify key at Google AI Studio; enable Generative Language API |
| Request timeout | Check network; retry; reduce answer length if very long |
| JSON parse error | Rare model formatting issue — click generate/evaluate again |

---

## Project Structure

```
InterviewPrep/
├── index.html      # Main page structure
├── style.css       # Styles, theme, responsive layout
├── script.js       # Application logic and Gemini API integration
└── README.md       # Documentation
```

---

## Future Improvements

The following enhancements are planned for future versions:

- **Mock interview mode** — Timed sessions with sequential questions and overall session score
- **Voice-based interview simulation** — Speech-to-text answers and spoken question playback
- **Interview history tracking** — Save past sessions, scores, and progress over time (localStorage or backend)
- **Personalized learning recommendations** — Topic suggestions based on weak areas from evaluations
- **Backend API proxy** — Secure API key handling and rate limiting
- **Export PDF report** — Downloadable session summary for review

---

## Screenshots Section

_Add screenshots after running the application locally._

| Screen | Description |
|--------|-------------|
| `screenshots/setup.png` | Role and difficulty selection |
| `screenshots/questions.png` | Interview questions with answer fields |
| `screenshots/evaluation.png` | AI evaluation with score and feedback |
| `screenshots/mobile.png` | Mobile responsive layout |

**How to add screenshots:**

1. Run the app locally and capture screens for setup, questions, and evaluation views.
2. Create a `screenshots/` folder in the project root.
3. Save images with the names above.
4. Embed in this README:

   ```markdown
   ![Setup Screen](screenshots/setup.png)
   ```

---

## License

This project is open source and available for educational and portfolio use. Add a license file (e.g., MIT) if you publish to GitHub.

---

## Author

Built for engineering students preparing for campus placements and technical interviews.

**InterviewPrep AI** — Practice smarter. Interview better.
