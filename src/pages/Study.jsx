import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Sparkles, Key, BookOpen, CheckCircle2, Bookmark, RefreshCw, Search, Target, 
  Award, Eye, RotateCcw, ArrowRight, Plus, Trash2, ShieldCheck, Volume2, 
  MessageSquare, Send, Bot, User, HelpCircle, Check, Clock, Sliders, Layers
} from 'lucide-react';

export default function Study() {
  // Multiple API Keys State
  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem('geminiApiKeys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const legacyKey = localStorage.getItem('geminiApiKey');
    return legacyKey ? [legacyKey] : [];
  });

  const [newKeyInput, setNewKeyInput] = useState('');
  const [showKeyManager, setShowKeyManager] = useState(apiKeys.length === 0);
  const [activeTab, setActiveTab] = useState('generate'); // 'generate', 'quiz', 'tenses', 'masterclass', 'story', 'chat', 'collection'
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Generation state
  const [wordCount, setWordCount] = useState(5);
  const [difficulty, setDifficulty] = useState('sedang_biasa'); // 'mudah', 'sedang_biasa', 'sedang_unik', 'sulit'
  const [generating, setGenerating] = useState(false);
  const [generatedWords, setGeneratedWords] = useState([]);
  const [genError, setGenError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeKeyIndexUsed, setActiveKeyIndexUsed] = useState(null);

  // Collection state & FEATURE 4: Spaced Repetition Mastery Levels
  const [collection, setCollection] = useState([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [masteryFilter, setMasteryFilter] = useState('all'); // 'all', '0', '1', '2'
  const [masteryLevels, setMasteryLevels] = useState(() => {
    const saved = localStorage.getItem('wordMasteryLevels');
    return saved ? JSON.parse(saved) : {};
  });

  // FEATURE 5: Multi-Mode Quiz state ('meaning', 'sentence', 'cloze')
  const [quizMode, setQuizMode] = useState('meaning');
  const [quizIndex, setQuizIndex] = useState(0);
  const [shuffledQuiz, setShuffledQuiz] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showCardAnswer, setShowCardAnswer] = useState(false);

  // Sentence Builder State
  const [userSentenceWords, setUserSentenceWords] = useState([]);
  const [scrambledChips, setScrambledChips] = useState([]);

  // FEATURE 2 (GRAMMAR): Tense Transformer State
  const [loadingTense, setLoadingTense] = useState(false);
  const [tenseChallenge, setTenseChallenge] = useState(null);
  const [userTenseAnswer, setUserTenseAnswer] = useState('');
  const [tenseResult, setTenseResult] = useState(null);

  // FEATURE 3 (GRAMMAR): Grammar Masterclass State
  const [grammarTopic, setGrammarTopic] = useState('prepositions');
  const [loadingGrammarQuiz, setLoadingGrammarQuiz] = useState(false);
  const [grammarQuestions, setGrammarQuestions] = useState([]);
  const [grammarIdx, setGrammarIdx] = useState(0);
  const [grammarSelectedOpt, setGrammarSelectedOpt] = useState(null);
  const [grammarIsAnswered, setGrammarIsAnswered] = useState(false);
  const [grammarScore, setGrammarScore] = useState({ correct: 0, total: 0 });

  const grammarTopicDetails = {
    prepositions: 'Prepositions (in, on, at, by, for, with, under, over)',
    articles: 'Articles (a, an, the, & zero article)',
    passive: 'Passive vs Active Voice (is done, was built)',
    conditionals: 'Conditionals (If Clause Type 1, Type 2, & Type 3)',
    agreement: 'Subject-Verb Agreement (He plays vs They play)',
    modals: 'Modal Verbs (can, could, should, must, might, may)'
  };

  // AI Story Generator State
  const [selectedStoryWords, setSelectedStoryWords] = useState([]);
  const [storySearchTerm, setStorySearchTerm] = useState('');
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyResult, setStoryResult] = useState(null);
  const [showStoryTranslation, setShowStoryTranslation] = useState(false);
  const [storyQuizAnswered, setStoryQuizAnswered] = useState(null);

  // AI Roleplay Chatbot State
  const [scenario, setScenario] = useState('cafe');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);

  const scenarioDetails = {
    cafe: { name: '☕ Di Kafe (Barista & Customer)', systemRole: 'You are a friendly Barista at a cozy coffee shop. Greet the customer and take their order in natural conversational English.' },
    interview: { name: '💼 Wawancara Kerja (Interviewer)', systemRole: 'You are a professional HR Manager conducting a job interview for a candidate. Ask standard interview questions in clear professional English.' },
    travel: { name: '✈️ Bandara & Imigrasi (Customs Officer)', systemRole: 'You are an Airport Customs Officer checking passports and travel visas. Ask questions about the travelers trip in polite official English.' },
    campus: { name: '🎓 Kehidupan Kampus (Teman Kuliah)', systemRole: 'You are a friendly university classmate discussing assignments, lectures, and weekend plans in casual student English.' },
    friend: { name: '🛋️ Obrolan Santai (Teman Dekat)', systemRole: 'You are a close friend hanging out. Chat casually about daily life, hobbies, and fun topics in warm informal English.' }
  };

  useEffect(() => {
    fetchCollection();
  }, []);

  useEffect(() => {
    if (activeTab === 'collection') {
      fetchCollection();
    } else if (activeTab === 'quiz' && collection.length > 0) {
      startNewQuiz();
    } else if (activeTab === 'chat' && chatMessages.length === 0) {
      initChatScenario('cafe');
    } else if (activeTab === 'tenses' && !tenseChallenge) {
      fetchNewTenseChallenge();
    } else if (activeTab === 'masterclass' && grammarQuestions.length === 0) {
      fetchGrammarMasterclassQuiz('prepositions');
    }
  }, [activeTab]);

  const updateMastery = (wordName, isCorrect) => {
    if (!wordName) return;
    const currentLvl = masteryLevels[wordName.toLowerCase()] || 0;
    const nextLvl = isCorrect ? Math.min(2, currentLvl + 1) : 0;
    const updated = { ...masteryLevels, [wordName.toLowerCase()]: nextLvl };
    setMasteryLevels(updated);
    localStorage.setItem('wordMasteryLevels', JSON.stringify(updated));
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Browser Anda tidak mendukung fitur Text-To-Speech.");
    }
  };

  const handleAddApiKey = (e) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;
    const trimmed = newKeyInput.trim();
    if (apiKeys.includes(trimmed)) {
      alert("API Key ini sudah ada dalam daftar.");
      return;
    }
    const updated = [...apiKeys, trimmed];
    setApiKeys(updated);
    localStorage.setItem('geminiApiKeys', JSON.stringify(updated));
    setNewKeyInput('');
  };

  const handleRemoveApiKey = (indexToRemove) => {
    const updated = apiKeys.filter((_, idx) => idx !== indexToRemove);
    setApiKeys(updated);
    localStorage.setItem('geminiApiKeys', JSON.stringify(updated));
  };

  const fetchCollection = async () => {
    setLoadingCollection(true);
    try {
      const { data, error } = await supabase
        .from('study_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allWords = [];
      (data || []).forEach(log => {
        try {
          if (log.notes) {
            const wordsArr = JSON.parse(log.notes);
            if (Array.isArray(wordsArr)) {
              wordsArr.forEach(w => {
                allWords.push({ ...w, learned_at: log.created_at, log_id: log.id });
              });
            }
          }
        } catch (err) {
          console.warn("Could not parse notes JSON", err);
        }
      });

      setCollection(allWords);
    } catch (err) {
      console.error("Error fetching collection:", err);
    } finally {
      setLoadingCollection(false);
    }
  };

  const callGeminiApi = async (promptText) => {
    if (!apiKeys.length) throw new Error("API Key belum diisi.");

    const modelsToTry = [selectedModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    const uniqueModels = Array.from(new Set(modelsToTry));

    let lastError = '';

    for (let kIdx = 0; kIdx < apiKeys.length; kIdx++) {
      const currentKey = apiKeys[kIdx].trim();

      for (const model of uniqueModels) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }]
            })
          });

          const resData = await response.json();

          if (response.ok && resData.candidates?.[0]?.content?.parts?.[0]?.text) {
            setActiveKeyIndexUsed(kIdx + 1);
            return resData.candidates[0].content.parts[0].text;
          } else {
            lastError = resData.error?.message || `API Key #${kIdx + 1} / Model ${model} limit/error.`;
          }
        } catch (err) {
          lastError = err.message || `Error pada Key #${kIdx + 1}`;
        }
      }
    }

    throw new Error(lastError || "Semua API Key kehabisan kuota atau error.");
  };

  // FEATURE 2 (GRAMMAR): TENSE TRANSFORMER LOGIC
  const fetchNewTenseChallenge = async () => {
    setLoadingTense(true);
    setTenseResult(null);
    setUserTenseAnswer('');

    const promptText = `Generate 1 English Tense Transformation Challenge for an English learner.
Return ONLY a valid JSON object matching this exact structure without markdown:
{
  "base_sentence": "She buys a fresh red apple.",
  "target_tense": "Present Perfect Tense",
  "target_formula": "Subject + has/have + V3",
  "hint": "Gunakan aux verb has/have + kata kerja bentuk ketiga (V3)."
}`;

    try {
      const rawText = await callGeminiApi(promptText);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const obj = JSON.parse(cleaned);
      setTenseChallenge(obj);
    } catch (err) {
      alert(err.message || "Gagal mengambil tantangan tense.");
    } finally {
      setLoadingTense(false);
    }
  };

  const handleCheckTenseAnswer = async (e) => {
    e.preventDefault();
    if (!userTenseAnswer.trim() || !tenseChallenge) return;

    setLoadingTense(true);
    const promptText = `Check if this sentence conversion is grammatically correct.
Base Sentence: "${tenseChallenge.base_sentence}"
Target Tense: "${tenseChallenge.target_tense}"
User Answer: "${userTenseAnswer.trim()}"

Return ONLY a valid JSON object matching this exact structure without markdown:
{
  "is_correct": true,
  "correct_sentence": "The exact grammatically correct sentence in the target tense",
  "explanation": "Brief explanation in Indonesian why this answer is correct/incorrect."
}`;

    try {
      const rawText = await callGeminiApi(promptText);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const resObj = JSON.parse(cleaned);
      setTenseResult(resObj);
    } catch (err) {
      alert(err.message || "Gagal memeriksa jawaban.");
    } finally {
      setLoadingTense(false);
    }
  };

  // FEATURE 3 (GRAMMAR): GRAMMAR MASTERCLASS LOGIC
  const fetchGrammarMasterclassQuiz = async (topicKey) => {
    setLoadingGrammarQuiz(true);
    setGrammarQuestions([]);
    setGrammarIdx(0);
    setGrammarSelectedOpt(null);
    setGrammarIsAnswered(false);
    setGrammarScore({ correct: 0, total: 0 });

    const topicDesc = grammarTopicDetails[topicKey];
    const promptText = `Generate a 5-question multiple choice English grammar quiz specifically focused on the topic: "${topicDesc}".
Return ONLY a valid JSON array matching this exact structure without markdown:
[
  {
    "question": "Question sentence with blank _____ or prompt in English",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Exact correct Option string from the options array",
    "rule_explanation": "Detailed explanation in Indonesian of the grammar rule behind this correct answer."
  }
]`;

    try {
      const rawText = await callGeminiApi(promptText);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr)) setGrammarQuestions(arr);
    } catch (err) {
      alert(err.message || "Gagal membuat kuis grammar.");
    } finally {
      setLoadingGrammarQuiz(false);
    }
  };

  const handleAnswerGrammarMasterclass = (opt) => {
    if (grammarIsAnswered) return;
    setGrammarSelectedOpt(opt);
    setGrammarIsAnswered(true);

    const currentQ = grammarQuestions[grammarIdx];
    if (opt === currentQ.answer) {
      setGrammarScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setGrammarScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleNextGrammarQuestion = () => {
    if (grammarIdx + 1 < grammarQuestions.length) {
      setGrammarIdx(prev => prev + 1);
      setGrammarSelectedOpt(null);
      setGrammarIsAnswered(false);
    } else {
      alert(`Selesai! Anda berhasil menjawab ${grammarScore.correct} dari ${grammarQuestions.length} soal grammar dengan benar.`);
      fetchGrammarMasterclassQuiz(grammarTopic);
    }
  };

  // Start new Quiz session
  const startNewQuiz = () => {
    if (!collection.length) return;
    const shuffled = [...collection].sort(() => 0.5 - Math.random());
    setShuffledQuiz(shuffled);
    setQuizIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowCardAnswer(false);
    setScore({ correct: 0, total: 0 });
    setUserSentenceWords([]);
    
    if (shuffled[0] && shuffled[0].example_en) {
      initSentenceChips(shuffled[0].example_en);
    }
  };

  const currentQuizWord = shuffledQuiz[quizIndex];

  const initSentenceChips = (exampleSentence) => {
    if (!exampleSentence) return;
    const wordsArr = exampleSentence.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(' ');
    const chipsObj = wordsArr.map((w, i) => ({ id: i, word: w }));
    setScrambledChips([...chipsObj].sort(() => 0.5 - Math.random()));
    setUserSentenceWords([]);
  };

  const quizOptions = useMemo(() => {
    if (!currentQuizWord || collection.length < 2) return [];
    
    const correctMeaning = currentQuizWord.meaning;
    const otherMeanings = collection
      .filter(w => w.meaning !== correctMeaning)
      .map(w => w.meaning);

    const shuffledOthers = otherMeanings.sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [correctMeaning, ...shuffledOthers].sort(() => 0.5 - Math.random());
    return options;
  }, [currentQuizWord, collection]);

  const clozeOptions = useMemo(() => {
    if (!currentQuizWord || collection.length < 2) return [];
    const correctWord = currentQuizWord.word;
    const otherWords = collection
      .filter(w => w.word !== correctWord)
      .map(w => w.word);
    const shuffledOthers = otherWords.sort(() => 0.5 - Math.random()).slice(0, 3);
    return [correctWord, ...shuffledOthers].sort(() => 0.5 - Math.random());
  }, [currentQuizWord, collection]);

  const handleAnswerMeaning = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQuizWord.meaning;
    updateMastery(currentQuizWord.word, isCorrect);

    if (isCorrect) {
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleAnswerCloze = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQuizWord.word;
    updateMastery(currentQuizWord.word, isCorrect);

    if (isCorrect) {
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleCheckSentence = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    const userBuilt = userSentenceWords.map(c => c.word).join(' ').toLowerCase();
    const targetClean = (currentQuizWord.example_en || '').replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase();

    const isCorrect = userBuilt === targetClean;
    updateMastery(currentQuizWord.word, isCorrect);

    if (isCorrect) {
      setSelectedOption('correct');
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setSelectedOption('wrong');
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex + 1 < shuffledQuiz.length) {
      const nextIdx = quizIndex + 1;
      setQuizIndex(nextIdx);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowCardAnswer(false);
      setUserSentenceWords([]);
      if (shuffledQuiz[nextIdx] && shuffledQuiz[nextIdx].example_en) {
        initSentenceChips(shuffledQuiz[nextIdx].example_en);
      }
    } else {
      alert(`Selesai! Anda berhasil menjawab ${score.correct} dari ${score.total + 1} kata/kalimat dengan benar.`);
      startNewQuiz();
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!apiKeys.length) {
      setShowKeyManager(true);
      return;
    }

    setGenerating(true);
    setGenError('');
    setSavedSuccess(false);
    setActiveKeyIndexUsed(null);

    const existingWordNames = collection.map(c => c.word.toLowerCase()).join(', ');

    let difficultyPrompt = "intermediate level for standard everyday conversation";
    if (difficulty === 'mudah') {
      difficultyPrompt = "beginner/elementary level (common everyday words that are essential)";
    } else if (difficulty === 'sedang_biasa') {
      difficultyPrompt = "intermediate level for standard everyday conversation (common conversational words)";
    } else if (difficulty === 'sedang_unik') {
      difficultyPrompt = "intermediate conversational level, but focusing specifically on unique, less familiar words, phrasal verbs, or unique expressions used in conversation that native speakers use but learners often don't know";
    } else if (difficulty === 'sulit') {
      difficultyPrompt = "advanced/academic level (formal, C1/C2 level, TOEFL/IELTS high-tier vocabulary)";
    }

    const promptText = `Generate ${wordCount} English vocabulary words at ${difficultyPrompt} level for an Indonesian learner.
IMPORTANT: Do NOT include any of these words that the user ALREADY knows: [${existingWordNames}].

Return ONLY a valid JSON array without markdown formatting or backticks. Format MUST be an array of objects matching this exact structure:
[
  {
    "word": "Base Word",
    "meaning": "Arti dalam Bahasa Indonesia",
    "word_class": "Verb / Noun / Adjective / Adverb",
    "v1": "v1 form",
    "v2": "v2 form (if verb, or N/A)",
    "v3": "v3 form (if verb, or N/A)",
    "v_ing": "v-ing form (if verb, or N/A)",
    "derived_forms": "Contoh turunan kata (e.g. achievement (noun))",
    "example_en": "English example sentence",
    "example_id": "Terjemahan kalimat dalam Bahasa Indonesia"
  }
]`;

    try {
      const rawText = await callGeminiApi(promptText);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const successData = JSON.parse(cleaned);
      if (Array.isArray(successData)) {
        const taggedWords = successData.map(w => ({ ...w, difficultyLevel: difficulty }));
        setGeneratedWords(taggedWords);
      }
    } catch (err) {
      setGenError(err.message || 'Gagal menghasilkan kosakata.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (!generatedWords.length) return;

    try {
      const { error } = await supabase.from('study_logs').insert([
        {
          subject_name: 'Bahasa Inggris (Kosakata)',
          duration_minutes: generatedWords.length,
          notes: JSON.stringify(generatedWords)
        }
      ]);

      if (error) throw error;
      setSavedSuccess(true);
      fetchCollection();
    } catch (err) {
      console.error("Error saving to Supabase:", err);
      alert("Gagal menyimpan kosakata ke database Supabase.");
    }
  };

  const handleRandomSelectStoryWords = () => {
    if (collection.length === 0) return;
    const shuffled = [...collection].sort(() => 0.5 - Math.random()).slice(0, 5);
    setSelectedStoryWords(shuffled.map(w => w.word));
  };

  const handleToggleStoryWordSelect = (word) => {
    if (selectedStoryWords.includes(word)) {
      setSelectedStoryWords(selectedStoryWords.filter(w => w !== word));
    } else {
      if (selectedStoryWords.length >= 5) {
        alert("Maksimal 5 kata untuk 1 cerita pendek.");
        return;
      }
      setSelectedStoryWords([...selectedStoryWords, word]);
    }
  };

  const handleGenerateStory = async () => {
    if (selectedStoryWords.length === 0) {
      alert("Pilih minimal 1 kata dari koleksi Anda untuk dibuatkan cerita!");
      return;
    }

    setGeneratingStory(true);
    setStoryResult(null);
    setShowStoryTranslation(false);
    setStoryQuizAnswered(null);

    const wordsStr = selectedStoryWords.join(', ');
    const promptText = `Write an engaging 1-paragraph short story in English for an English learner incorporating ALL of these words: [${wordsStr}].

Return ONLY a valid JSON object matching this exact structure without markdown formatting:
{
  "title": "Story Title in English",
  "story_en": "The short story in English with target words included.",
  "story_id": "Terjemahan cerita dalam Bahasa Indonesia.",
  "question": "A reading comprehension question about the story in English",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "Exact correct Option string from the options array",
  "explanation": "Brief explanation in Indonesian why this answer is correct."
}`;

    try {
      const rawText = await callGeminiApi(promptText);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const storyObj = JSON.parse(cleaned);
      setStoryResult(storyObj);
    } catch (err) {
      alert(err.message || "Gagal membuat cerita AI.");
    } finally {
      setGeneratingStory(false);
    }
  };

  const initChatScenario = (selectedScenKey) => {
    setScenario(selectedScenKey);
    const scenInfo = scenarioDetails[selectedScenKey];
    setChatMessages([
      {
        sender: 'bot',
        text: `Hello! I am your conversation partner. Let's roleplay! (${scenInfo.name})\n\nHow can I help you today?`,
        grammarFeedback: null
      }
    ]);
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatting) return;

    const userText = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(newMessages);
    setChatting(true);

    const scenInfo = scenarioDetails[scenario];
    const historyText = newMessages.map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

    const promptText = `${scenInfo.systemRole}
You are chatting with an Indonesian learner who is practicing English.

Conversation History:
${historyText}

Reply in character in conversational English (1-3 sentences). ALSO, if the user made a grammar or natural phrasing mistake in their latest message ("${userText}"), provide a short, helpful correction in Indonesian.

Return ONLY a valid JSON object matching this structure without markdown:
{
  "reply": "Your in-character English response to the user.",
  "grammar_feedback": "Short correction in Indonesian if mistake exists, or null if perfect!"
}`;

    try {
      const rawText = await callGeminiApi(promptText);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const resObj = JSON.parse(cleaned);

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: resObj.reply || "That sounds great! Tell me more.",
          grammarFeedback: resObj.grammar_feedback || null
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: "Sorry, I had trouble generating a response. Please check your API key.",
          grammarFeedback: null
        }
      ]);
    } finally {
      setChatting(false);
    }
  };

  const filteredCollection = collection.filter(item => {
    const matchesSearch = item.word?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.meaning?.toLowerCase().includes(searchTerm.toLowerCase());
    const lvl = masteryLevels[item.word?.toLowerCase()] || 0;
    const matchesMastery = masteryFilter === 'all' ? true : String(lvl) === masteryFilter;
    return matchesSearch && matchesMastery;
  });

  const getDifficultyBadgeLabel = (diffKey) => {
    if (diffKey === 'mudah') return 'Mudah (Dasar)';
    if (diffKey === 'sedang_biasa') return 'Sedang (Percakapan Biasa)';
    if (diffKey === 'sedang_unik') return 'Sedang (Percakapan Unik & Phrasal)';
    if (diffKey === 'sulit') return 'Sulit (Lanjutan / Akademik)';
    return 'Menengah';
  };

  const getMasteryBadge = (wordName) => {
    const lvl = masteryLevels[wordName?.toLowerCase()] || 0;
    if (lvl === 2) return <span className="badge success" style={{ fontSize: '0.75rem' }}>🟢 Mahir</span>;
    if (lvl === 1) return <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>🟡 Cukup Hafal</span>;
    return <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>🔴 Belum Hafal</span>;
  };

  return (
    <div className="study-page">
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Belajar Bahasa Inggris</h1>
          <p>Generasi Kosakata AI, Level Hafalan, Ubah Tenses & Masterclass Grammar</p>
        </div>

        <button 
          onClick={() => setShowKeyManager(!showKeyManager)}
          className="toggle-btn"
          style={{ backgroundColor: apiKeys.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: apiKeys.length > 0 ? 'var(--success-color)' : '#f59e0b' }}
        >
          <Key size={16} /> Kelola {apiKeys.length} API Key
        </button>
      </div>

      {/* Multiple Gemini API Keys Manager */}
      {showKeyManager && (
        <div className="card mb-4" style={{ border: '1px solid var(--accent-color)' }}>
          <div className="flex-between mb-2">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key color="var(--accent-color)" size={20} /> Pengaturan Multi-API Key (Cadangan AI)
            </h3>
            <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              {apiKeys.length} Key Tersimpan
            </span>
          </div>

          <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Tambahkan beberapa Gemini API Key sebagai cadangan. Jika satu Key kehabisan kuota, sistem akan **otomatis beralih ke Key cadangan** secara mulus!
          </p>

          {apiKeys.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {apiKeys.map((key, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={16} color="var(--success-color)" />
                    <strong>API Key #{idx + 1}:</strong>
                    <code>{key.substring(0, 8)}...{key.substring(key.length - 4)}</code>
                  </div>
                  <button 
                    onClick={() => handleRemoveApiKey(idx)} 
                    className="nav-logout-btn" 
                    title="Hapus Key Ini"
                    style={{ padding: '0.25rem' }}
                  >
                    <Trash2 size={14} color="var(--danger-color)" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddApiKey} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="password" 
              placeholder="Masukkan Gemini API Key baru (AIzaSy...)" 
              value={newKeyInput}
              onChange={e => setNewKeyInput(e.target.value)}
              required
            />
            <button type="submit" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Plus size={16} /> Tambah Key Cadangan
            </button>
          </form>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="view-toggle-buttons mb-4">
        <button 
          className={`toggle-btn ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <Sparkles size={16} /> Generasi AI
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <Target size={16} /> Kuis Interaktif ({collection.length})
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'tenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('tenses')}
        >
          <Clock size={16} /> ⏳ Ubah Tenses
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'masterclass' ? 'active' : ''}`}
          onClick={() => setActiveTab('masterclass')}
        >
          <Sliders size={16} /> 🛠️ Grammar Masterclass
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'story' ? 'active' : ''}`}
          onClick={() => setActiveTab('story')}
        >
          <BookOpen size={16} /> Cerita Pendek AI
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} /> Percakapan AI
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => setActiveTab('collection')}
        >
          <Bookmark size={16} /> Koleksi Saya ({collection.length})
        </button>
      </div>

      {/* GENERATE TAB */}
      {activeTab === 'generate' && (
        <div className="generate-section">
          <div className="card mb-4">
            <h2>Minta Kosakata Baru dari AI</h2>
            <p style={{ marginBottom: '1.25rem' }}>
              Pilih jenis percakapan/kesulitan dan jumlah kata. AI akan mencarikan kata yang bermanfaat dan <strong>belum pernah Anda pelajari sebelumnya</strong>.
            </p>

            <form onSubmit={handleGenerate} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginRight: '0.5rem', display: 'block', marginBottom: '0.25rem' }}>
                  Tingkat Kesulitan / Kategori Percakapan:
                </label>
                <select 
                  value={difficulty} 
                  onChange={e => setDifficulty(e.target.value)}
                  style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 'bold' }}
                >
                  <option value="mudah">🟢 Mudah (Umum / Dasar)</option>
                  <option value="sedang_biasa">🟡 Sedang (Percakapan Sehari-hari / Biasa)</option>
                  <option value="sedang_unik">🟠 Sedang (Percakapan Unik & Less Familiar)</option>
                  <option value="sulit">🔴 Sulit (Lanjutan / Akademik / IELTS)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginRight: '0.5rem', display: 'block', marginBottom: '0.25rem' }}>
                  Jumlah Kata:
                </label>
                <select 
                  value={wordCount} 
                  onChange={e => setWordCount(Number(e.target.value))}
                  style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                >
                  <option value={3}>3 Kata</option>
                  <option value={5}>5 Kata</option>
                  <option value={10}>10 Kata</option>
                  <option value={15}>15 Kata</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginRight: '0.5rem', display: 'block', marginBottom: '0.25rem' }}>
                  Model AI:
                </label>
                <select 
                  value={selectedModel} 
                  onChange={e => setSelectedModel(e.target.value)}
                  style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  <option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
                </select>
              </div>

              <button type="submit" disabled={generating} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                {generating ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
                {generating ? 'AI Memproses...' : 'Hasilkan Kosakata Baru'}
              </button>
            </form>

            {activeKeyIndexUsed && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldCheck size={14} /> Berhasil menggunakan API Key #{activeKeyIndexUsed}
              </div>
            )}

            {genError && (
              <div className="badge danger mt-4" style={{ width: '100%', padding: '0.75rem', textAlign: 'center' }}>
                {genError}
              </div>
            )}
          </div>

          {generatedWords.length > 0 && (
            <div className="generated-results">
              <div className="flex-between mb-4">
                <div>
                  <h2>{generatedWords.length} Kosakata Baru Ditemukan!</h2>
                  <span className="badge" style={{ marginTop: '0.25rem', backgroundColor: difficulty === 'mudah' ? 'rgba(16, 185, 129, 0.15)' : difficulty === 'sedang_unik' ? 'rgba(245, 158, 11, 0.15)' : difficulty === 'sulit' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: difficulty === 'mudah' ? 'var(--success-color)' : difficulty === 'sedang_unik' ? '#f59e0b' : difficulty === 'sulit' ? 'var(--danger-color)' : '#60a5fa' }}>
                    Level: {getDifficultyBadgeLabel(difficulty)}
                  </span>
                </div>
                {!savedSuccess ? (
                  <button onClick={handleSaveToCollection} style={{ backgroundColor: 'var(--success-color)' }}>
                    <CheckCircle2 size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                    Simpan ke Koleksi Saya
                  </button>
                ) : (
                  <span className="badge success" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    Tersimpan di Database!
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {generatedWords.map((item, idx) => (
                  <div key={idx} className="card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
                    <div className="flex-between mb-2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.4rem', color: '#60a5fa', margin: 0 }}>
                          {item.word}
                        </h3>
                        <button 
                          onClick={() => speakText(item.word)} 
                          className="btn-icon-edit"
                          title="Dengarkan Pelafalan Audio"
                          style={{ padding: '0.35rem 0.5rem', color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.4)' }}
                        >
                          <Volume2 size={16} /> 🔊 Audio
                        </button>
                        <span className="badge" style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: 'var(--purple-accent)' }}>
                          {item.word_class || 'Word'}
                        </span>
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        🇮🇩 {item.meaning}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '0.75rem', borderRadius: '0.5rem', margin: '1rem 0', border: '1px solid var(--border-color)' }}>
                      <div>
                        <small style={{ color: 'var(--text-secondary)', display: 'block' }}>V1 (Present)</small>
                        <strong>{item.v1 || item.word}</strong>
                      </div>
                      <div>
                        <small style={{ color: 'var(--text-secondary)', display: 'block' }}>V2 (Past)</small>
                        <strong>{item.v2 || '-'}</strong>
                      </div>
                      <div>
                        <small style={{ color: 'var(--text-secondary)', display: 'block' }}>V3 (Past Participle)</small>
                        <strong>{item.v3 || '-'}</strong>
                      </div>
                      <div>
                        <small style={{ color: 'var(--text-secondary)', display: 'block' }}>V-ing (Continuous)</small>
                        <strong>{item.v_ing || '-'}</strong>
                      </div>
                    </div>

                    {item.derived_forms && item.derived_forms !== '-' && (
                      <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>Turunan Kata:</strong> {item.derived_forms}
                      </p>
                    )}

                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '0.75rem 1rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--purple-accent)', marginTop: '0.75rem' }}>
                      <div className="flex-between mb-1">
                        <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', margin: 0 }}>
                          "{item.example_en}"
                        </p>
                        <button 
                          onClick={() => speakText(item.example_en)} 
                          style={{ background: 'transparent', border: 'none', color: '#a78bfa', padding: 0, cursor: 'pointer' }}
                          title="Dengarkan Kalimat Ini"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        👉 {item.example_id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MULTI-MODE QUIZ TAB */}
      {activeTab === 'quiz' && (
        <div className="quiz-section">
          {collection.length < 2 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Target size={48} color="var(--purple-accent)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
              <h2>Koleksi Kata Belum Cukup!</h2>
              <p>Anda membutuhkan minimal 2 kata yang tersimpan di Koleksi untuk memulai mode latihan kuis.</p>
              <button onClick={() => setActiveTab('generate')} style={{ marginTop: '1rem' }}>
                Generasi Kosakata AI Sekarang
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award color="#f59e0b" size={24} />
                  <h2>Modul Kuis Interaktif</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)' }}>
                    Skor: {score.correct} / {score.total}
                  </span>
                  <button onClick={startNewQuiz} className="btn-icon-edit" title="Acak Ulang Kuis">
                    <RotateCcw size={14} /> Reset Kuis
                  </button>
                </div>
              </div>

              <div className="view-toggle-buttons mb-4" style={{ backgroundColor: 'var(--bg-color)' }}>
                <button 
                  className={`toggle-btn ${quizMode === 'meaning' ? 'active' : ''}`}
                  onClick={() => { setQuizMode('meaning'); setIsAnswered(false); setSelectedOption(null); }}
                >
                  🎯 1. Tebak Arti Kata
                </button>
                <button 
                  className={`toggle-btn ${quizMode === 'cloze' ? 'active' : ''}`}
                  onClick={() => { setQuizMode('cloze'); setIsAnswered(false); setSelectedOption(null); }}
                >
                  📝 2. Isi Bagian Rumpang
                </button>
                <button 
                  className={`toggle-btn ${quizMode === 'sentence' ? 'active' : ''}`}
                  onClick={() => { 
                    setQuizMode('sentence'); 
                    setIsAnswered(false); 
                    setSelectedOption(null);
                    if (currentQuizWord?.example_en) initSentenceChips(currentQuizWord.example_en);
                  }}
                >
                  🧩 3. Susun Kalimat Acak
                </button>
              </div>

              {quizMode === 'meaning' && (
                <div>
                  <div style={{ textAlign: 'center', padding: '1.75rem 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                    <small style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Kata Ke-{quizIndex + 1} dari {shuffledQuiz.length}
                    </small>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                      <h1 style={{ fontSize: '2.5rem', color: '#60a5fa', margin: 0 }}>
                        {currentQuizWord?.word}
                      </h1>
                      <button 
                        onClick={() => speakText(currentQuizWord?.word)}
                        style={{ background: 'rgba(96, 165, 250, 0.15)', border: '1px solid #60a5fa', color: '#60a5fa', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer' }}
                        title="Dengarkan Audio"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: 'var(--purple-accent)' }}>
                        {currentQuizWord?.word_class || 'Word'}
                      </span>
                      {getMasteryBadge(currentQuizWord?.word)}
                    </div>
                  </div>

                  <p style={{ fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    Pilih arti yang paling tepat dalam Bahasa Indonesia:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {quizOptions.map((opt, idx) => {
                      let btnBg = 'var(--bg-color)';
                      let btnBorder = 'var(--border-color)';
                      let btnColor = 'var(--text-primary)';

                      if (isAnswered) {
                        if (opt === currentQuizWord.meaning) {
                          btnBg = 'rgba(16, 185, 129, 0.2)';
                          btnBorder = 'var(--success-color)';
                          btnColor = 'var(--success-color)';
                        } else if (opt === selectedOption) {
                          btnBg = 'rgba(239, 68, 68, 0.2)';
                          btnBorder = 'var(--danger-color)';
                          btnColor = 'var(--danger-color)';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerMeaning(opt)}
                          disabled={isAnswered}
                          style={{
                            backgroundColor: btnBg,
                            border: `1px solid ${btnBorder}`,
                            color: btnColor,
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: '1rem',
                            borderRadius: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {quizMode === 'cloze' && (
                <div>
                  <div style={{ textAlign: 'center', padding: '1.75rem 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                    <small style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Lengkapi Kalimat ({quizIndex + 1} dari {shuffledQuiz.length})
                    </small>
                    <h2 style={{ fontSize: '1.35rem', color: '#60a5fa', margin: '0.75rem 0', lineHeight: '1.6' }}>
                      "{currentQuizWord?.example_en ? currentQuizWord.example_en.replace(new RegExp(currentQuizWord.word, 'gi'), '_____') : `She decided to _____ her goals.`}"
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      👉 Terjemahan: {currentQuizWord?.example_id}
                    </p>
                  </div>

                  <p style={{ fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    Pilih kata yang paling pas untuk melengkapi bagian rumpang (_____):
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {clozeOptions.map((opt, idx) => {
                      let btnBg = 'var(--bg-color)';
                      let btnBorder = 'var(--border-color)';
                      let btnColor = 'var(--text-primary)';

                      if (isAnswered) {
                        if (opt === currentQuizWord.word) {
                          btnBg = 'rgba(16, 185, 129, 0.2)';
                          btnBorder = 'var(--success-color)';
                          btnColor = 'var(--success-color)';
                        } else if (opt === selectedOption) {
                          btnBg = 'rgba(239, 68, 68, 0.2)';
                          btnBorder = 'var(--danger-color)';
                          btnColor = 'var(--danger-color)';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerCloze(opt)}
                          disabled={isAnswered}
                          style={{
                            backgroundColor: btnBg,
                            border: `1px solid ${btnBorder}`,
                            color: btnColor,
                            padding: '1rem',
                            textAlign: 'left',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            borderRadius: '0.75rem'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {quizMode === 'sentence' && (
                <div>
                  <div style={{ textAlign: 'center', padding: '1.5rem 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                    <small style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Susun Kalimat Inggris ({quizIndex + 1} dari {shuffledQuiz.length})
                    </small>
                    <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#60a5fa', marginTop: '0.5rem' }}>
                      🇮🇩 Terjemahan: "{currentQuizWord?.example_id || currentQuizWord?.meaning}"
                    </p>
                  </div>

                  <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Hasil Susunan Kalimat Anda:
                  </p>

                  <div style={{ minHeight: '60px', backgroundColor: 'var(--bg-color)', border: '2px dashed var(--accent-color)', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                    {userSentenceWords.length === 0 ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        Klik chip kata di bawah untuk menyusun kalimat...
                      </span>
                    ) : (
                      userSentenceWords.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (isAnswered) return;
                            setUserSentenceWords(userSentenceWords.filter((_, i) => i !== idx));
                            setScrambledChips([...scrambledChips, chip]);
                          }}
                          disabled={isAnswered}
                          style={{ backgroundColor: 'var(--accent-color)', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.95rem' }}
                        >
                          {chip.word}
                        </button>
                      ))
                    )}
                  </div>

                  <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Potongan Kata Acak (Klik untuk Memilih):
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {scrambledChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isAnswered) return;
                          setUserSentenceWords([...userSentenceWords, chip]);
                          setScrambledChips(scrambledChips.filter((_, i) => i !== idx));
                        }}
                        disabled={isAnswered}
                        style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.95rem' }}
                      >
                        {chip.word}
                      </button>
                    ))}
                  </div>

                  {!isAnswered && (
                    <button 
                      onClick={handleCheckSentence}
                      disabled={userSentenceWords.length === 0}
                      style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem', backgroundColor: 'var(--success-color)' }}
                    >
                      Periksa Jawaban Kalimat
                    </button>
                  )}
                </div>
              )}

              {isAnswered && (
                <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <div className="flex-between mb-2">
                    <strong style={{ color: (selectedOption === currentQuizWord.meaning || selectedOption === currentQuizWord.word || selectedOption === 'correct') ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {(selectedOption === currentQuizWord.meaning || selectedOption === currentQuizWord.word || selectedOption === 'correct') ? '🎉 Benar sekali! Level Hafalan Naik!' : '❌ Jawaban Kurang Tepat! Level Hafalan Direset!'}
                    </strong>
                    <button 
                      onClick={() => setShowCardAnswer(!showCardAnswer)} 
                      style={{ backgroundColor: 'transparent', color: '#60a5fa', fontSize: '0.85rem', padding: 0 }}
                    >
                      <Eye size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                      {showCardAnswer ? 'Sembunyikan Rincian' : 'Lihat Rincian Bentuk Kata'}
                    </button>
                  </div>

                  <p><strong>Kata Target:</strong> <strong style={{ color: '#60a5fa' }}>{currentQuizWord.word}</strong> (🇮🇩 {currentQuizWord.meaning})</p>
                  {currentQuizWord.example_en && <p style={{ marginTop: '0.25rem' }}><strong>Kalimat Contoh:</strong> "{currentQuizWord.example_en}"</p>}

                  {showCardAnswer && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <p><strong>V1 / V2 / V3:</strong> {currentQuizWord.v1 || currentQuizWord.word} / {currentQuizWord.v2 || '-'} / {currentQuizWord.v3 || '-'}</p>
                    </div>
                  )}
                </div>
              )}

              {isAnswered && (
                <button 
                  onClick={handleNextQuizQuestion}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <span>Soal Kuis Berikutnya</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* FEATURE 2 (GRAMMAR): TENSE TRANSFORMER TAB */}
      {activeTab === 'tenses' && (
        <div className="tenses-section">
          <div className="card mb-4">
            <div className="flex-between mb-3">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', margin: 0 }}>
                <Clock color="#60a5fa" size={24} /> Tantangan Ubah Tenses (Tense Transformer)
              </h2>
              <button 
                onClick={fetchNewTenseChallenge} 
                disabled={loadingTense}
                className="btn-icon-edit"
              >
                {loadingTense ? <RefreshCw size={14} className="spin" /> : <RotateCcw size={14} />} Soal Baru
              </button>
            </div>
            <p style={{ marginBottom: '1.25rem' }}>
              Melatih pemahaman tata bahasa (*Grammar Tenses*). Ubah kalimat yang diberikan ke bentuk *Tense* yang diminta oleh AI di bawah ini!
            </p>

            {loadingTense && !tenseChallenge ? (
              <p>AI sedang menyiapkan tantangan Tenses baru...</p>
            ) : tenseChallenge ? (
              <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <small style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kalimat Awal (Base Sentence):</small>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    "{tenseChallenge.base_sentence}"
                  </h3>
                </div>

                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #60a5fa', marginBottom: '1.25rem' }}>
                  <p style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    🎯 Target Tense: {tenseChallenge.target_tense}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Rumus: <code>{tenseChallenge.target_formula}</code> | 💡 Petunjuk: {tenseChallenge.hint}
                  </p>
                </div>

                {/* Form Answer Input */}
                <form onSubmit={handleCheckTenseAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Ketikkan Kalimat Hasil Perubahan Anda:</label>
                  <input 
                    type="text" 
                    placeholder="Tuliskan kalimat lengkap di sini..."
                    value={userTenseAnswer}
                    onChange={e => setUserTenseAnswer(e.target.value)}
                    disabled={loadingTense}
                    required
                  />

                  <button type="submit" disabled={loadingTense || !userTenseAnswer.trim()} style={{ backgroundColor: 'var(--accent-color)' }}>
                    {loadingTense ? 'AI Memeriksa...' : 'Periksa Jawaban Tense'}
                  </button>
                </form>

                {/* Answer Feedback */}
                {tenseResult && (
                  <div style={{ marginTop: '1.25rem', backgroundColor: tenseResult.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${tenseResult.is_correct ? 'var(--success-color)' : 'var(--danger-color)'}`, padding: '1rem', borderRadius: '0.5rem' }}>
                    <h3 style={{ color: tenseResult.is_correct ? 'var(--success-color)' : 'var(--danger-color)', marginBottom: '0.4rem' }}>
                      {tenseResult.is_correct ? '🎉 Jawaban Sangat Tepat!' : '❌ Masih Ada Kekeliruan'}
                    </h3>
                    <p style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      <strong>Kalimat Yang Benar:</strong> "{tenseResult.correct_sentence}"
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      💡 <strong>Penjelasan AI:</strong> {tenseResult.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* FEATURE 3 (GRAMMAR): GRAMMAR MASTERCLASS TAB */}
      {activeTab === 'masterclass' && (
        <div className="masterclass-section">
          <div className="card mb-4">
            <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders color="#a78bfa" size={24} />
                <h2>Grammar Masterclass (Latihan Per-Topik)</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Topik:</label>
                <select 
                  value={grammarTopic} 
                  onChange={e => {
                    setGrammarTopic(e.target.value);
                    fetchGrammarMasterclassQuiz(e.target.value);
                  }}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.875rem', fontWeight: 'bold' }}
                >
                  {Object.keys(grammarTopicDetails).map(key => (
                    <option key={key} value={key}>{grammarTopicDetails[key]}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingGrammarQuiz ? (
              <p>AI sedang meracik 5 soal kuis grammar khusus untuk Anda...</p>
            ) : grammarQuestions.length > 0 ? (
              <div>
                <div className="flex-between mb-3">
                  <span className="badge" style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: 'var(--purple-accent)' }}>
                    Soal {grammarIdx + 1} dari {grammarQuestions.length}
                  </span>
                  <span className="badge success">
                    Skor: {grammarScore.correct} / {grammarScore.total}
                  </span>
                </div>

                <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {grammarQuestions[grammarIdx]?.question}
                  </h3>
                </div>

                <p style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Pilih Jawaban yang Tepat:</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {grammarQuestions[grammarIdx]?.options?.map((opt, i) => {
                    let bBg = 'var(--bg-color)';
                    let bBorder = 'var(--border-color)';

                    if (grammarIsAnswered) {
                      if (opt === grammarQuestions[grammarIdx].answer) {
                        bBg = 'rgba(16, 185, 129, 0.2)';
                        bBorder = 'var(--success-color)';
                      } else if (opt === grammarSelectedOpt) {
                        bBg = 'rgba(239, 68, 68, 0.2)';
                        bBorder = 'var(--danger-color)';
                      }
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswerGrammarMasterclass(opt)}
                        disabled={grammarIsAnswered}
                        style={{
                          backgroundColor: bBg,
                          border: `1px solid ${bBorder}`,
                          color: 'var(--text-primary)',
                          padding: '0.85rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.95rem',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Detailed Grammar Rule Explanation */}
                {grammarIsAnswered && (
                  <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid var(--purple-accent)', marginBottom: '1.25rem' }}>
                    <strong style={{ color: grammarSelectedOpt === grammarQuestions[grammarIdx].answer ? 'var(--success-color)' : 'var(--danger-color)', display: 'block', marginBottom: '0.25rem' }}>
                      {grammarSelectedOpt === grammarQuestions[grammarIdx].answer ? '🎉 Benar sekali!' : '❌ Jawaban Kurang Tepat'}
                    </strong>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      💡 <strong>Aturan Grammar:</strong> {grammarQuestions[grammarIdx]?.rule_explanation}
                    </p>
                  </div>
                )}

                {grammarIsAnswered && (
                  <button 
                    onClick={handleNextGrammarQuestion}
                    style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--purple-accent)', color: '#0f172a', fontWeight: 'bold' }}
                  >
                    <span>Soal Grammar Berikutnya</span>
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* FEATURE 2: STORY GENERATOR TAB */}
      {activeTab === 'story' && (
        <div className="story-section">
          <div className="card mb-4">
            <div className="flex-between mb-2">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen color="var(--purple-accent)" size={24} /> Generasi Cerita Pendek AI
              </h2>
              <button onClick={handleRandomSelectStoryWords} className="btn-icon-edit">
                🎲 Pilih Acak 5 Kata
              </button>
            </div>
            <p style={{ marginBottom: '1rem' }}>
              Pilih 1–5 kata dari koleksi tersimpan Anda di bawah ini, lalu AI akan membuatkan **cerita pendek 1 paragraf** yang menarik menggunakan kata-kata tersebut!
            </p>

            {collection.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                Belum ada kata di koleksi. Silakan hasilkan dan simpan kata baru terlebih dahulu.
              </p>
            ) : (
              <div>
                <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 'bold', margin: 0 }}>
                    Pilih Kata ({selectedStoryWords.length} / 5 Terpilih):
                  </p>

                  {selectedStoryWords.length > 0 && (
                    <button 
                      onClick={() => setSelectedStoryWords([])} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                    >
                      ✕ Reset Pilihan
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <input 
                    type="text"
                    placeholder="Cari kata dari koleksi Anda..."
                    value={storySearchTerm}
                    onChange={e => setStorySearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {collection
                    .filter(item => 
                      item.word?.toLowerCase().includes(storySearchTerm.toLowerCase()) ||
                      item.meaning?.toLowerCase().includes(storySearchTerm.toLowerCase())
                    )
                    .map((item, idx) => {
                      const isSelected = selectedStoryWords.includes(item.word);
                      return (
                        <button
                          key={idx}
                          onClick={() => handleToggleStoryWordSelect(item.word)}
                          style={{
                            backgroundColor: isSelected ? 'rgba(167, 139, 250, 0.25)' : 'var(--bg-color)',
                            border: `1px solid ${isSelected ? 'var(--purple-accent)' : 'var(--border-color)'}`,
                            color: isSelected ? 'var(--purple-accent)' : 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontWeight: isSelected ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '} {item.word}
                        </button>
                      );
                    })}
                </div>

                <button 
                  onClick={handleGenerateStory} 
                  disabled={generatingStory || selectedStoryWords.length === 0}
                  style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--purple-accent)', color: '#0f172a', fontWeight: 'bold' }}
                >
                  {generatingStory ? <RefreshCw size={18} className="spin" /> : <BookOpen size={18} />}
                  {generatingStory ? 'AI Membaca & Membuat Cerita...' : 'Buat Cerita Pendek Sekarang'}
                </button>
              </div>
            )}
          </div>

          {storyResult && (
            <div className="card">
              <div className="flex-between mb-4">
                <h2 style={{ color: '#60a5fa', margin: 0 }}>📖 {storyResult.title}</h2>
                <button 
                  onClick={() => speakText(storyResult.story_en)}
                  className="toggle-btn"
                  style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', border: '1px solid #60a5fa' }}
                >
                  <Volume2 size={16} /> Dengarkan Cerita (Audio)
                </button>
              </div>

              <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem', lineHeight: '1.8', fontSize: '1.05rem' }}>
                <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                  {storyResult.story_en}
                </p>
              </div>

              <div className="mb-4">
                <button 
                  onClick={() => setShowStoryTranslation(!showStoryTranslation)}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                >
                  <Eye size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                  {showStoryTranslation ? 'Sembunyikan Terjemahan' : 'Lihat Terjemahan Indonesia'}
                </button>
                {showStoryTranslation && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)', fontStyle: 'italic', backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '1rem', borderRadius: '0.5rem' }}>
                    🇮🇩 {storyResult.story_id}
                  </p>
                )}
              </div>

              {storyResult.question && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <h3 style={{ marginBottom: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <HelpCircle size={18} /> Uji Pemahaman Bacaan (Reading Quiz)
                  </h3>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    {storyResult.question}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    {storyResult.options?.map((opt, i) => {
                      const isSelected = storyQuizAnswered === opt;
                      const isCorrect = opt === storyResult.answer;
                      let bColor = 'var(--border-color)';
                      let bBg = 'var(--bg-color)';

                      if (storyQuizAnswered) {
                        if (isCorrect) {
                          bColor = 'var(--success-color)';
                          bBg = 'rgba(16, 185, 129, 0.2)';
                        } else if (isSelected) {
                          bColor = 'var(--danger-color)';
                          bBg = 'rgba(239, 68, 68, 0.2)';
                        }
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => setStoryQuizAnswered(opt)}
                          disabled={!!storyQuizAnswered}
                          style={{
                            backgroundColor: bBg,
                            border: `1px solid ${bColor}`,
                            color: 'var(--text-primary)',
                            padding: '0.75rem',
                            textAlign: 'left',
                            fontSize: '0.9rem'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {storyQuizAnswered && (
                    <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                      <strong style={{ color: storyQuizAnswered === storyResult.answer ? 'var(--success-color)' : 'var(--danger-color)' }}>
                        {storyQuizAnswered === storyResult.answer ? '🎉 Benar!' : '❌ Kurang tepat.'}
                      </strong>
                      <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>{storyResult.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FEATURE 3: AI ROLEPLAY CHATBOT TAB */}
      {activeTab === 'chat' && (
        <div className="chat-section">
          <div className="card mb-4">
            <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare color="#60a5fa" size={24} />
                <h2>Partner Percakapan AI (Roleplay)</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Skenario:</label>
                <select 
                  value={scenario} 
                  onChange={e => initChatScenario(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                >
                  {Object.keys(scenarioDetails).map(key => (
                    <option key={key} value={key}>{scenarioDetails[key].name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.25rem' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {msg.sender === 'user' ? (
                      <><span>Anda</span><User size={14} /></>
                    ) : (
                      <><Bot size={14} color="#60a5fa" /><span style={{ color: '#60a5fa' }}>AI Roleplay</span></>
                    )}
                  </div>

                  <div style={{
                    backgroundColor: msg.sender === 'user' ? 'var(--accent-color)' : 'var(--bg-color)',
                    color: 'var(--text-primary)',
                    padding: '0.85rem 1.15rem',
                    borderRadius: msg.sender === 'user' ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    maxWidth: '85%',
                    lineHeight: '1.5'
                  }}>
                    <p style={{ color: 'white', margin: 0 }}>{msg.text}</p>

                    {msg.sender === 'bot' && (
                      <button 
                        onClick={() => speakText(msg.text)} 
                        style={{ background: 'transparent', border: 'none', color: '#93c5fd', fontSize: '0.75rem', padding: '0.25rem 0', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                      >
                        <Volume2 size={14} /> Dengarkan Suara AI
                      </button>
                    )}
                  </div>

                  {msg.grammarFeedback && (
                    <div style={{ marginTop: '0.4rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', maxWidth: '85%' }}>
                      💡 <strong>Saran Grammar:</strong> {msg.grammarFeedback}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Balas dalam Bahasa Inggris..." 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                disabled={chatting}
                required
              />
              <button type="submit" disabled={chatting || !chatInput.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                {chatting ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                {chatting ? 'Kirim...' : 'Kirim'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COLLECTION TAB */}
      {activeTab === 'collection' && (
        <div className="collection-section">
          <div className="card mb-4">
            <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2>Koleksi Kosakata Dipelajari ({collection.length})</h2>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select 
                  value={masteryFilter} 
                  onChange={e => setMasteryFilter(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                >
                  <option value="all">Semua Level Hafalan</option>
                  <option value="0">🔴 Belum Hafal</option>
                  <option value="1">🟡 Cukup Hafal</option>
                  <option value="2">🟢 Mahir</option>
                </select>

                <div style={{ position: 'relative', width: '200px' }}>
                  <input 
                    type="text"
                    placeholder="Cari kata..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', padding: '0.5rem 0.75rem 0.5rem 2.2rem' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                </div>
              </div>
            </div>

            {loadingCollection ? (
              <p>Memuat koleksi kosakata dari database...</p>
            ) : filteredCollection.length === 0 ? (
              <p style={{ fontStyle: 'italic', padding: '1rem 0' }}>
                {searchTerm || masteryFilter !== 'all' ? 'Tidak ada kata yang cocok dengan filter pencarian.' : 'Belum ada kosakata yang disimpan di koleksi. Silakan hasilkan kata baru dengan AI!'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredCollection.map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div className="flex-between mb-2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ fontSize: '1.15rem', color: '#60a5fa' }}>{item.word}</strong>
                        <button 
                          onClick={() => speakText(item.word)} 
                          style={{ background: 'transparent', border: 'none', color: '#60a5fa', padding: 0, cursor: 'pointer' }}
                          title="Dengarkan Audio"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span className="badge" style={{ fontSize: '0.75rem' }}>{item.word_class || 'Word'}</span>
                        {getMasteryBadge(item.word)}
                      </div>
                    </div>

                    <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      🇮🇩 {item.meaning}
                    </p>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <span>V1: {item.v1 || item.word}</span>
                      <span>V2: {item.v2 || '-'}</span>
                      <span>V3: {item.v3 || '-'}</span>
                    </div>

                    {item.example_en && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                          "{item.example_en}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
