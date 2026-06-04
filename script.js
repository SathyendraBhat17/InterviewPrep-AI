/**
 * InterviewPrep AI — Main Application Script
 * ==========================================
 * Vanilla JavaScript application for technical interview practice.
 * Uses Google Gemini API for question generation and answer evaluation.
 *
 * @module InterviewPrep
 */

/* ==========================================================================
   CONFIGURATION
   Store your API key here. Never commit real keys to public repositories.
   For production, consider environment-specific injection or a backend proxy.
   ========================================================================== */


/* ==========================================================================
   APPLICATION STATE
   Centralized state object for the current interview session
   ========================================================================== */
   const CONFIG = {
    /** Google Gemini API key — replace with your key from https://aistudio.google.com/apikey */
    GEMINI_API_KEY: "GEMINI_API_KEY",
  
    /** Gemini model identifier */
    MODEL: "gemini-2.0-flash",
  
    /** Base URL for Generative Language API */
    API_BASE: "https://generativelanguage.googleapis.com/v1beta/models",
  
    /** Number of questions to generate per session */
    QUESTION_COUNT: 5,
  
    /** Minimum answer length (characters) before evaluation */
    MIN_ANSWER_LENGTH: 20,
  
    /** Request timeout in milliseconds */
    REQUEST_TIMEOUT_MS: 60000,
  };
  
const AppState = {
  role: null,
  difficulty: null,
  questions: [],       // Array of { id, question }
  evaluations: {},     // Map of questionId -> evaluation result
};

/* ==========================================================================
   DOM REFERENCES
   Cached element references for performance and clarity
   ========================================================================== */

const DOM = {
  setupSection: document.getElementById("setup-section"),
  interviewSection: document.getElementById("interview-section"),
  summarySection: document.getElementById("summary-section"),
  setupForm: document.getElementById("setup-form"),
  questionsContainer: document.getElementById("questions-container"),
  sessionRoleBadge: document.getElementById("session-role-badge"),
  sessionDifficultyBadge: document.getElementById("session-difficulty-badge"),
  btnGenerate: document.getElementById("btn-generate"),
  btnEvaluateAll: document.getElementById("btn-evaluate-all"),
  btnNewSession: document.getElementById("btn-new-session"),
  loadingOverlay: document.getElementById("loading-overlay"),
  loadingMessage: document.getElementById("loading-message"),
  toastContainer: document.getElementById("toast-container"),
  summaryAvgScore: document.getElementById("summary-avg-score"),
  summaryEvaluated: document.getElementById("summary-evaluated"),
};

/* ==========================================================================
   GEMINI API SERVICE
   Handles all communication with the Google Generative Language API
   ========================================================================== */

const GeminiService = {
  /**
   * Builds the full API endpoint URL for generateContent
   * @returns {string}
   */
  getEndpoint() {
    return `${CONFIG.API_BASE}/${CONFIG.MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  },

  /**
   * Sends a prompt to Gemini and returns the text response
   * @param {string} prompt - User/system prompt text
   * @param {object} options - Optional generation config overrides
   * @returns {Promise<string>} Raw text response from the model
   */
  async generateContent(prompt, options = {}) {
    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      throw new Error(
        "Gemini API key is not configured. Open script.js and set CONFIG.GEMINI_API_KEY."
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 4096,
            ...options.generationConfig,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const apiMessage =
          errorBody?.error?.message ||
          `API request failed with status ${response.status}`;
        throw new Error(apiMessage);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No content returned from the AI model. Please try again.");
      }

      return text;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error("Request timed out. Check your connection and try again.");
      }
      throw error;
    }
  },

  /**
   * Generates interview questions for the given role and difficulty
   * @param {string} role
   * @param {string} difficulty
   * @returns {Promise<Array<{id: number, question: string}>>}
   */
  async generateQuestions(role, difficulty) {
    const prompt = `You are an expert technical interviewer for campus placements and job interviews.

Generate exactly ${CONFIG.QUESTION_COUNT} unique technical interview questions for a candidate applying as a **${role}** at **${difficulty}** difficulty level.

Requirements:
- Questions must be realistic for ${difficulty} level ${role} interviews
- Mix conceptual, practical, and scenario-based questions where appropriate
- Cover core skills expected for this role (languages, frameworks, tools, system design basics as per level)
- Do NOT repeat similar questions
- Each question should be answerable in 2-5 minutes verbally or in a short written response

Return ONLY a valid JSON array with no markdown, no code fences, no extra text. Format:
[
  {"id": 1, "question": "Your question here"},
  {"id": 2, "question": "..."}
]`;

    const raw = await this.generateContent(prompt, { temperature: 0.8 });
    return parseJsonFromResponse(raw, "questions");
  },

  /**
   * Evaluates a candidate's answer to a single interview question
   * @param {string} role
   * @param {string} difficulty
   * @param {string} question
   * @param {string} answer
   * @returns {Promise<{score: number, strengths: string[], weaknesses: string[], improvements: string[]}>}
   */
  async evaluateAnswer(role, difficulty, question, answer) {
    const prompt = `You are a senior technical interviewer evaluating a candidate's answer.

**Role:** ${role}
**Difficulty level:** ${difficulty}
**Question:** ${question}

**Candidate's answer:**
${answer}

Evaluate this answer fairly for the stated role and difficulty. Consider technical accuracy, depth, clarity, and relevance.

Return ONLY valid JSON with no markdown, no code fences, no extra text. Format:
{
  "score": <number from 0 to 10, can use decimals like 7.5>,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "improvements": ["actionable improvement 1", "actionable improvement 2"]
}

Rules:
- score must be between 0 and 10
- Provide 2-4 items in each array
- Be constructive and specific, not generic
- improvements should be actionable study or practice suggestions`;

    const raw = await this.generateContent(prompt, { temperature: 0.4 });
    return parseJsonFromResponse(raw, "evaluation");
  },
};

/* ==========================================================================
   JSON PARSING UTILITIES
   Extracts and validates JSON from model responses (may include markdown)
   ========================================================================== */

/**
 * Extracts JSON from AI response text (handles markdown code blocks)
 * @param {string} text - Raw model output
 * @returns {string} Cleaned JSON string
 */
function extractJsonString(text) {
  const trimmed = text.trim();

  // Try to extract from ```json ... ``` or ``` ... ``` blocks
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Try to find array or object boundaries
  const arrayStart = trimmed.indexOf("[");
  const objectStart = trimmed.indexOf("{");

  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    const arrayEnd = trimmed.lastIndexOf("]");
    if (arrayEnd > arrayStart) {
      return trimmed.slice(arrayStart, arrayEnd + 1);
    }
  }

  if (objectStart !== -1) {
    const objectEnd = trimmed.lastIndexOf("}");
    if (objectEnd > objectStart) {
      return trimmed.slice(objectStart, objectEnd + 1);
    }
  }

  return trimmed;
}

/**
 * Parses JSON from AI response with validation
 * @param {string} raw - Raw model output
 * @param {"questions"|"evaluation"} type - Expected payload type
 * @returns {object|Array}
 */
function parseJsonFromResponse(raw, type) {
  let parsed;

  try {
    parsed = JSON.parse(extractJsonString(raw));
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON. Please try again. (${type})`
    );
  }

  if (type === "questions") {
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid questions format received from AI.");
    }
    return parsed.map((item, index) => ({
      id: item.id ?? index + 1,
      question: String(item.question || "").trim(),
    })).filter((q) => q.question.length > 0);
  }

  if (type === "evaluation") {
    const score = Number(parsed.score);
    if (Number.isNaN(score) || score < 0 || score > 10) {
      throw new Error("Invalid evaluation score received from AI.");
    }
    return {
      score: Math.round(score * 10) / 10,
      strengths: normalizeStringArray(parsed.strengths),
      weaknesses: normalizeStringArray(parsed.weaknesses),
      improvements: normalizeStringArray(parsed.improvements),
    };
  }

  return parsed;
}

/**
 * Ensures a value is a non-empty string array
 * @param {*} value
 * @returns {string[]}
 */
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return ["No details provided."];
  const items = value.map((v) => String(v).trim()).filter(Boolean);
  return items.length ? items : ["No details provided."];
}

/* ==========================================================================
   UI HELPERS
   Loading states, toasts, visibility, and DOM manipulation
   ========================================================================== */

const UI = {
  /**
   * Shows or hides the global loading overlay
   * @param {boolean} show
   * @param {string} [message]
   */
  setLoading(show, message = "Processing with AI…") {
    DOM.loadingMessage.textContent = message;
    DOM.loadingOverlay.classList.toggle("hidden", !show);
    DOM.loadingOverlay.setAttribute("aria-hidden", String(!show));
    document.body.style.overflow = show ? "hidden" : "";
  },

  /**
   * Displays a toast notification
   * @param {string} message
   * @param {"error"|"success"|"info"} [type="info"]
   */
  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "alert");
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  },

  /**
   * Returns CSS class for score color band
   * @param {number} score
   * @returns {string}
   */
  getScoreClass(score) {
    if (score >= 7) return "score-high";
    if (score >= 4) return "score-mid";
    return "score-low";
  },

  /**
   * Updates session summary statistics
   */
  updateSummary() {
    const evals = Object.values(AppState.evaluations);
    const count = evals.length;

    DOM.summaryEvaluated.textContent = String(count);

    if (count === 0) {
      DOM.summarySection.classList.add("hidden");
      DOM.summaryAvgScore.textContent = "—";
      return;
    }

    DOM.summarySection.classList.remove("hidden");
    const avg = evals.reduce((sum, e) => sum + e.score, 0) / count;
    DOM.summaryAvgScore.textContent = avg.toFixed(1);
  },
};

/* ==========================================================================
   QUESTION CARD RENDERING
   Builds and updates question cards in the DOM
   ========================================================================== */

const QuestionRenderer = {
  /**
   * Renders all question cards into the container
   */
  renderAll() {
    DOM.questionsContainer.innerHTML = "";

    AppState.questions.forEach((q, index) => {
      const card = this.createCard(q, index + 1);
      DOM.questionsContainer.appendChild(card);
    });
  },

  /**
   * Creates a single question card element
   * @param {{id: number, question: string}} questionData
   * @param {number} displayNumber
   * @returns {HTMLElement}
   */
  createCard(questionData, displayNumber) {
    const card = document.createElement("article");
    card.className = "question-card";
    card.id = `question-card-${questionData.id}`;
    card.dataset.questionId = String(questionData.id);

    card.innerHTML = `
      <div class="question-card-header">
        <span class="question-number" aria-hidden="true">Q${displayNumber}</span>
        <p class="question-text">${escapeHtml(questionData.question)}</p>
      </div>
      <label class="answer-label" for="answer-${questionData.id}">Your answer</label>
      <textarea
        id="answer-${questionData.id}"
        class="answer-textarea"
        placeholder="Write your answer here. Be specific and structured — mention technologies, trade-offs, and examples where relevant."
        rows="5"
        aria-describedby="evaluate-hint-${questionData.id}"
      ></textarea>
      <div class="question-card-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-evaluate-single" data-question-id="${questionData.id}">
          Evaluate This Answer
        </button>
      </div>
      <div class="evaluation-container" id="evaluation-${questionData.id}" hidden></div>
    `;

    // Bind per-question evaluate button
    card.querySelector(".btn-evaluate-single").addEventListener("click", () => {
      InterviewController.evaluateSingle(questionData.id);
    });

    return card;
  },

  /**
   * Renders evaluation feedback into a question card
   * @param {number} questionId
   * @param {object} evaluation
   */
  renderEvaluation(questionId, evaluation) {
    const card = document.getElementById(`question-card-${questionId}`);
    const container = document.getElementById(`evaluation-${questionId}`);
    const textarea = document.getElementById(`answer-${questionId}`);

    if (!card || !container) return;

    card.classList.add("evaluated");
    container.hidden = false;

    const scoreClass = UI.getScoreClass(evaluation.score);
    const scoreDisplay = evaluation.score.toFixed(1);

    container.className = "evaluation-container evaluation-result";
    container.innerHTML = `
      <div class="score-display">
        <div class="score-circle ${scoreClass}" aria-label="Score ${scoreDisplay} out of 10">
          ${scoreDisplay}
        </div>
        <div class="score-label-text">
          <strong>Score: ${scoreDisplay} / 10</strong>
          AI evaluation for this answer
        </div>
      </div>
      <div class="feedback-grid">
        <div class="feedback-block strengths">
          <h4>Strengths</h4>
          <ul>${listItemsHtml(evaluation.strengths)}</ul>
        </div>
        <div class="feedback-block weaknesses">
          <h4>Weaknesses</h4>
          <ul>${listItemsHtml(evaluation.weaknesses)}</ul>
        </div>
        <div class="feedback-block improvements">
          <h4>Suggested improvements</h4>
          <ul>${listItemsHtml(evaluation.improvements)}</ul>
        </div>
      </div>
    `;

    // Disable re-evaluation until answer changes (optional UX)
    const evalBtn = card.querySelector(".btn-evaluate-single");
    if (evalBtn) evalBtn.textContent = "Re-evaluate Answer";

    UI.updateSummary();
  },
};

/* ==========================================================================
   HTML ESCAPING (XSS prevention for dynamic content)
   ========================================================================== */

/**
 * Escapes HTML special characters in user/AI text displayed in DOM
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Builds <li> elements from string array (escaped)
 * @param {string[]} items
 * @returns {string}
 */
function listItemsHtml(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

/* ==========================================================================
   INTERVIEW CONTROLLER
   Orchestrates session flow: setup, generation, evaluation
   ========================================================================== */

const InterviewController = {
  /**
   * Initializes event listeners
   */
  init() {
    DOM.setupForm.addEventListener("submit", (e) => this.handleSetupSubmit(e));
    DOM.btnEvaluateAll.addEventListener("click", () => this.evaluateAll());
    DOM.btnNewSession.addEventListener("click", () => this.resetSession());
  },

  /**
   * Handles setup form submission — generates questions
   * @param {Event} event
   */
  async handleSetupSubmit(event) {
    event.preventDefault();

    const formData = new FormData(DOM.setupForm);
    const role = formData.get("role");
    const difficulty = formData.get("difficulty");

    if (!role || !difficulty) {
      UI.showToast("Please select both a role and difficulty level.", "error");
      return;
    }

    AppState.role = role;
    AppState.difficulty = difficulty;
    AppState.questions = [];
    AppState.evaluations = {};

    DOM.btnGenerate.disabled = true;

    try {
      UI.setLoading(true, "Generating interview questions…");

      const questions = await GeminiService.generateQuestions(role, difficulty);

      if (questions.length < CONFIG.QUESTION_COUNT) {
        UI.showToast(
          `Received ${questions.length} questions (expected ${CONFIG.QUESTION_COUNT}). Continuing with available questions.`,
          "info"
        );
      }

      AppState.questions = questions.slice(0, CONFIG.QUESTION_COUNT);
      this.showInterviewSection();
      UI.showToast("Questions generated successfully!", "success");
    } catch (error) {
      console.error("[InterviewPrep] Question generation failed:", error);
      UI.showToast(error.message || "Failed to generate questions.", "error");
    } finally {
      UI.setLoading(false);
      DOM.btnGenerate.disabled = false;
    }
  },

  /**
   * Transitions UI to interview section with generated questions
   */
  showInterviewSection() {
    DOM.sessionRoleBadge.textContent = AppState.role;
    DOM.sessionDifficultyBadge.textContent = AppState.difficulty;

    QuestionRenderer.renderAll();

    DOM.setupSection.classList.add("hidden");
    DOM.interviewSection.classList.remove("hidden");
    DOM.btnNewSession.classList.remove("hidden");
    DOM.summarySection.classList.add("hidden");

    DOM.interviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  /**
   * Gets and validates answer text for a question
   * @param {number} questionId
   * @returns {string|null} Answer text or null if invalid
   */
  getValidatedAnswer(questionId) {
    const textarea = document.getElementById(`answer-${questionId}`);
    if (!textarea) return null;

    const answer = textarea.value.trim();

    if (answer.length < CONFIG.MIN_ANSWER_LENGTH) {
      UI.showToast(
        `Answer for Q${questionId} is too short. Write at least ${CONFIG.MIN_ANSWER_LENGTH} characters.`,
        "error"
      );
      textarea.focus();
      return null;
    }

    return answer;
  },

  /**
   * Gets question text by ID
   * @param {number} questionId
   * @returns {string|null}
   */
  getQuestionText(questionId) {
    const q = AppState.questions.find((item) => item.id === questionId);
    return q?.question ?? null;
  },

  /**
   * Evaluates a single question answer
   * @param {number} questionId
   */
  async evaluateSingle(questionId) {
    const answer = this.getValidatedAnswer(questionId);
    const questionText = this.getQuestionText(questionId);

    if (!answer || !questionText) return;

    const card = document.getElementById(`question-card-${questionId}`);
    const evalBtn = card?.querySelector(".btn-evaluate-single");

    if (evalBtn) evalBtn.disabled = true;

    try {
      UI.setLoading(true, `Evaluating answer for Question ${questionId}…`);

      const evaluation = await GeminiService.evaluateAnswer(
        AppState.role,
        AppState.difficulty,
        questionText,
        answer
      );

      AppState.evaluations[questionId] = evaluation;
      QuestionRenderer.renderEvaluation(questionId, evaluation);
      UI.showToast(`Question ${questionId} evaluated successfully.`, "success");
    } catch (error) {
      console.error(`[InterviewPrep] Evaluation failed for Q${questionId}:`, error);
      UI.showToast(error.message || "Failed to evaluate answer.", "error");
    } finally {
      UI.setLoading(false);
      if (evalBtn) evalBtn.disabled = false;
    }
  },

  /**
   * Evaluates all questions that have valid answers
   */
  async evaluateAll() {
    const toEvaluate = [];

    for (const q of AppState.questions) {
      const answer = this.getValidatedAnswer(q.id);
      if (answer) {
        toEvaluate.push({ id: q.id, answer, question: q.question });
      } else {
        return; // Stop on first invalid — user should fix
      }
    }

    if (toEvaluate.length === 0) {
      UI.showToast("No answers to evaluate.", "error");
      return;
    }

    DOM.btnEvaluateAll.disabled = true;

    try {
      let completed = 0;

      for (const item of toEvaluate) {
        UI.setLoading(
          true,
          `Evaluating ${completed + 1} of ${toEvaluate.length}…`
        );

        const evaluation = await GeminiService.evaluateAnswer(
          AppState.role,
          AppState.difficulty,
          item.question,
          item.answer
        );

        AppState.evaluations[item.id] = evaluation;
        QuestionRenderer.renderEvaluation(item.id, evaluation);
        completed++;
      }

      UI.showToast("All answers evaluated successfully!", "success");
    } catch (error) {
      console.error("[InterviewPrep] Batch evaluation failed:", error);
      UI.showToast(error.message || "Failed during batch evaluation.", "error");
    } finally {
      UI.setLoading(false);
      DOM.btnEvaluateAll.disabled = false;
    }
  },

  /**
   * Resets the application to the setup screen
   */
  resetSession() {
    AppState.role = null;
    AppState.difficulty = null;
    AppState.questions = [];
    AppState.evaluations = {};

    DOM.setupForm.reset();
    DOM.questionsContainer.innerHTML = "";

    DOM.interviewSection.classList.add("hidden");
    DOM.summarySection.classList.add("hidden");
    DOM.setupSection.classList.remove("hidden");
    DOM.btnNewSession.classList.add("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
    UI.showToast("Session reset. Configure a new interview.", "info");
  },
};

/* ==========================================================================
   APPLICATION ENTRY POINT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  InterviewController.init();
  console.info("[InterviewPrep AI] Application initialized.");
});
