import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Sparkles, Key, BookOpen, CheckCircle2, Bookmark, RefreshCw, Search, Target, Award, Eye, RotateCcw, ArrowRight, Signal } from 'lucide-react';

export default function Study() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);
  const [activeTab, setActiveTab] = useState('generate'); // 'generate', 'quiz', 'collection'
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Generation state
  const [wordCount, setWordCount] = useState(5);
  const [difficulty, setDifficulty] = useState('sedang'); // 'mudah', 'sedang', 'sulit'
  const [generating, setGenerating] = useState(false);
  const [generatedWords, setGeneratedWords] = useState([]);
  const [genError, setGenError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Collection state (learned words)
  const [collection, setCollection] = useState([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Quiz / Practice state
  const [quizIndex, setQuizIndex] = useState(0);
  const [shuffledQuiz, setShuffledQuiz] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showCardAnswer, setShowCardAnswer] = useState(false);

  useEffect(() => {
    fetchCollection();
  }, []);

  useEffect(() => {
    if (activeTab === 'collection') {
      fetchCollection();
    } else if (activeTab === 'quiz' && collection.length > 0) {
      startNewQuiz();
    }
  }, [activeTab]);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('geminiApiKey', apiKey.trim());
    setShowKeyInput(false);
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
  };

  const currentQuizWord = shuffledQuiz[quizIndex];

  // Generate 4 multiple-choice options for current quiz word
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

  const handleAnswer = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    if (option === currentQuizWord.meaning) {
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex + 1 < shuffledQuiz.length) {
      setQuizIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowCardAnswer(false);
    } else {
      alert(`Selesai! Anda berhasil menjawab ${score.correct} dari ${score.total + 1} kata dengan benar.`);
      startNewQuiz();
    }
  };

  // Generate words using Gemini API with fallback & difficulty level
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    setGenerating(true);
    setGenError('');
    setSavedSuccess(false);

    const existingWordNames = collection.map(c => c.word.toLowerCase()).join(', ');

    let difficultyPrompt = "intermediate level for everyday conversation and study";
    if (difficulty === 'mudah') {
      difficultyPrompt = "beginner/elementary level (common everyday words that are essential)";
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

    const modelsToTry = [selectedModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'];
    const uniqueModels = Array.from(new Set(modelsToTry));

    let lastErrorMessage = '';
    let successData = null;

    for (const model of uniqueModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        const resData = await response.json();

        if (response.ok && resData.candidates?.[0]?.content?.parts?.[0]?.text) {
          let rawText = resData.candidates[0].content.parts[0].text;
          rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          successData = JSON.parse(rawText);
          break;
        } else {
          lastErrorMessage = resData.error?.message || `Model ${model} tidak merespon dengan benar.`;
        }
      } catch (err) {
        lastErrorMessage = err.message || `Error pada model ${model}`;
      }
    }

    if (successData && Array.isArray(successData)) {
      // Attach difficulty tag to generated words
      const taggedWords = successData.map(w => ({ ...w, difficultyLevel: difficulty }));
      setGeneratedWords(taggedWords);
    } else {
      setGenError(lastErrorMessage || 'Gagal memproses kata dari Gemini API. Pastikan API Key valid.');
    }

    setGenerating(false);
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

  const filteredCollection = collection.filter(item => 
    item.word?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.meaning?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="study-page">
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Belajar Bahasa Inggris</h1>
          <p>Generasi Kosakata AI Berdasarkan Tingkat Kesulitan</p>
        </div>

        <button 
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="toggle-btn"
          style={{ backgroundColor: apiKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: apiKey ? 'var(--success-color)' : '#f59e0b' }}
        >
          <Key size={16} /> {apiKey ? 'API Key Terpasang' : 'Set Gemini API Key'}
        </button>
      </div>

      {/* Gemini API Key Box */}
      {showKeyInput && (
        <div className="card mb-4" style={{ border: '1px solid var(--accent-color)' }}>
          <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key color="var(--accent-color)" size={20} /> Pengaturan Google Gemini API Key
          </h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Dapatkan API Key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Google AI Studio</a> lalu tempelkan di bawah ini.
          </p>
          <form onSubmit={handleSaveApiKey} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="password" 
              placeholder="Tempel Gemini API Key (AIzaSy...)" 
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              required
            />
            <button type="submit" style={{ whiteSpace: 'nowrap' }}>Simpan Key</button>
          </form>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="view-toggle-buttons mb-4">
        <button 
          className={`toggle-btn ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <Sparkles size={16} /> Generasi Kosakata AI
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <Target size={16} /> Latihan Tebak Kata ({collection.length})
        </button>

        <button 
          className={`toggle-btn ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => setActiveTab('collection')}
        >
          <Bookmark size={16} /> Koleksi Kosakata Saya ({collection.length})
        </button>
      </div>

      {/* GENERATE TAB */}
      {activeTab === 'generate' && (
        <div className="generate-section">
          <div className="card mb-4">
            <h2>Minta Kosakata Baru dari AI</h2>
            <p style={{ marginBottom: '1.25rem' }}>
              Pilih tingkat kesulitan dan jumlah kata. AI akan mencarikan kata yang bermanfaat dan <strong>belum pernah Anda pelajari sebelumnya</strong>.
            </p>

            <form onSubmit={handleGenerate} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginRight: '0.5rem', display: 'block', marginBottom: '0.25rem' }}>
                  Tingkat Kesulitan:
                </label>
                <select 
                  value={difficulty} 
                  onChange={e => setDifficulty(e.target.value)}
                  style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 'bold' }}
                >
                  <option value="mudah">🟢 Mudah (Umum / Dasar)</option>
                  <option value="sedang">🟡 Sedang (Menengah / Percakapan)</option>
                  <option value="sulit">🔴 Sulit (Lanjutan / Akademik)</option>
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

            {genError && (
              <div className="badge danger mt-4" style={{ width: '100%', padding: '0.75rem', textAlign: 'center' }}>
                {genError}
              </div>
            )}
          </div>

          {/* Generated Results */}
          {generatedWords.length > 0 && (
            <div className="generated-results">
              <div className="flex-between mb-4">
                <div>
                  <h2>{generatedWords.length} Kosakata Baru Ditemukan!</h2>
                  <span className="badge" style={{ marginTop: '0.25rem', backgroundColor: difficulty === 'mudah' ? 'rgba(16, 185, 129, 0.15)' : difficulty === 'sulit' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: difficulty === 'mudah' ? 'var(--success-color)' : difficulty === 'sulit' ? 'var(--danger-color)' : '#f59e0b' }}>
                    Level: {difficulty === 'mudah' ? 'Mudah (Dasar)' : difficulty === 'sulit' ? 'Sulit (Lanjutan)' : 'Sedang (Menengah)'}
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
                      <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#60a5fa', display: 'inline-block', marginRight: '0.75rem' }}>
                          {item.word}
                        </h3>
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
                      <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        "{item.example_en}"
                      </p>
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

      {/* QUIZ / PRACTICE TAB (OFFLINE MODE FROM SAVED COLLECTION) */}
      {activeTab === 'quiz' && (
        <div className="quiz-section">
          {collection.length < 2 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Target size={48} color="var(--purple-accent)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
              <h2>Koleksi Kata Belum Cukup!</h2>
              <p>Anda membutuhkan minimal 2 kata yang tersimpan di Koleksi untuk memulai mode latihan tebak kata.</p>
              <button onClick={() => setActiveTab('generate')} style={{ marginTop: '1rem' }}>
                Generasi Kosakata AI Sekarang
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="flex-between mb-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award color="#f59e0b" size={24} />
                  <h2>Modul Latihan Tebak Kata</h2>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)' }}>
                    Skor: {score.correct} / {score.total}
                  </span>
                  <button onClick={startNewQuiz} className="btn-icon-edit" title="Acak Ulang Kata">
                    <RotateCcw size={14} /> Reset Quiz
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '2rem 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <small style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Kata Ke-{quizIndex + 1} dari {shuffledQuiz.length}
                </small>
                <h1 style={{ fontSize: '2.5rem', color: '#60a5fa', margin: '0.75rem 0' }}>
                  {currentQuizWord?.word}
                </h1>
                <span className="badge" style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: 'var(--purple-accent)' }}>
                  {currentQuizWord?.word_class || 'Word'}
                </span>
              </div>

              <p style={{ fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Pilih arti yang paling tepat dalam Bahasa Indonesia:
              </p>

              {/* Quiz Options */}
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
                      onClick={() => handleAnswer(opt)}
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

              {/* Answer Feedback & Info */}
              {isAnswered && (
                <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <div className="flex-between mb-2">
                    <strong style={{ color: selectedOption === currentQuizWord.meaning ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {selectedOption === currentQuizWord.meaning ? '🎉 Benar sekali!' : '❌ Jawaban Kurang Tepat!'}
                    </strong>
                    <button 
                      onClick={() => setShowCardAnswer(!showCardAnswer)} 
                      style={{ backgroundColor: 'transparent', color: '#60a5fa', fontSize: '0.85rem', padding: 0 }}
                    >
                      <Eye size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                      {showCardAnswer ? 'Sembunyikan Rincian' : 'Lihat Rincian Bentuk Kata'}
                    </button>
                  </div>

                  <p><strong>Arti Sebenarnya:</strong> 🇮🇩 {currentQuizWord.meaning}</p>

                  {showCardAnswer && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <p><strong>V1 / V2 / V3:</strong> {currentQuizWord.v1 || currentQuizWord.word} / {currentQuizWord.v2 || '-'} / {currentQuizWord.v3 || '-'}</p>
                      {currentQuizWord.example_en && (
                        <p style={{ marginTop: '0.4rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                          "{currentQuizWord.example_en}" ({currentQuizWord.example_id})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isAnswered && (
                <button 
                  onClick={handleNextQuizQuestion}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <span>Kata Berikutnya</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* COLLECTION TAB */}
      {activeTab === 'collection' && (
        <div className="collection-section">
          <div className="card mb-4">
            <div className="flex-between mb-4">
              <h2>Koleksi Kosakata Dipelajari ({collection.length})</h2>
              <div style={{ position: 'relative', width: '240px' }}>
                <input 
                  type="text"
                  placeholder="Cari kata atau arti..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            {loadingCollection ? (
              <p>Memuat koleksi kosakata dari database...</p>
            ) : filteredCollection.length === 0 ? (
              <p style={{ fontStyle: 'italic', padding: '1rem 0' }}>
                {searchTerm ? 'Tidak ada kata yang cocok dengan pencarian.' : 'Belum ada kosakata yang disimpan di koleksi. Silakan hasilkan kata baru dengan AI!'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredCollection.map((item, idx) => (
                  <div key={idx} style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div className="flex-between mb-2">
                      <strong style={{ fontSize: '1.15rem', color: '#60a5fa' }}>{item.word}</strong>
                      <span className="badge" style={{ fontSize: '0.75rem' }}>{item.word_class || 'Word'}</span>
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
                      <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                        "{item.example_en}"
                      </p>
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
