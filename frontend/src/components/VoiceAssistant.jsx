import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaMicrophone, FaStop, FaTimes, FaVolumeUp, FaVolumeMute, FaPaperPlane } from 'react-icons/fa';
import './VoiceAssistant.css';

const VoiceAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [messages, setMessages] = useState([]); // [{type: 'user'|'bot', text: '...'}]
    const [inputMessage, setInputMessage] = useState("");
    const [chatHistory, setChatHistory] = useState({});
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [language, setLanguage] = useState('en-IN');
    const [voices, setVoices] = useState([]);
    const [isMuted, setIsMuted] = useState(false);

    const synthesisRef = useRef(window.speechSynthesis);
    const recognitionRef = useRef(null);
    const chatHistoryRef = useRef(chatHistory);
    const sessionIdRef = useRef(sessionId);
    const messagesEndRef = useRef(null);
    const isMutedRef = useRef(isMuted);

    // Keep refs in sync with state
    useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            setVoices(window.speechSynthesis.getVoices());
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getUserInfo = () => {
        const user = localStorage.getItem('userInfo');
        return user ? JSON.parse(user) : null;
    };

    // ---  Auto Language Detection ---
    const detectLanguage = (text) => {
        // Devanagari Unicode block: \u0900-\u097F covers Hindi + Marathi
        // We differentiate Marathi vs Hindi by checking common Marathi-specific characters/words
        const marathiKeywords = /[\u0902\u091C\u0940\u092E\u0938\u0941\u0928\u0917\u093E]|आहे|मला|तुम्ही|योजना|मराठी|नमस्कार|मदत|सांगा|काय|कसे|कोण/;
        const devanagariPattern = /[\u0900-\u097F]/;
        const hindiKeywords = /है|मैं|आप|कृपया|योजना|बताएं|नमस्ते|सरकार|मेरा|हिंदी/;

        if (devanagariPattern.test(text)) {
            if (marathiKeywords.test(text)) return 'mr-IN';
            if (hindiKeywords.test(text)) return 'hi-IN';
            return 'mr-IN'; // Default Devanagari to Marathi for this project (Maharashtra-focused)
        }
        return 'en-IN'; // Default to English
    };

    const speak = (text, customLang = null) => {
        if (isMutedRef.current) return; // Do not speak if muted

        const targetLang = customLang || language;
        if (synthesisRef.current) {
            synthesisRef.current.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = targetLang; // Use selected language

            // Natural tuning (Google voices sound best at default speed/pitch)
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            // Filter voices by language
            let availableVoices = voices.filter(v => v.lang.startsWith(targetLang.split('-')[0]));
            if (availableVoices.length === 0) availableVoices = voices; // fallback to all voices

            // 1. Google voices are definitively the smoothest across all languages in Chrome
            let bestVoice = availableVoices.find(v => v.name.includes('Google') && v.name.includes('Female'));

            if (!bestVoice) {
                bestVoice = availableVoices.find(v => v.name.includes('Google'));
            }

            // 2. Microsoft Online / Natural voices (Excellent on Edge)
            if (!bestVoice) {
                bestVoice = availableVoices.find(v =>
                    v.name.toLowerCase().includes('online') &&
                    (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neerja') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))
                );
            }

            // 3. Fallback to generic female identities
            if (!bestVoice) {
                bestVoice = availableVoices.find(v =>
                    v.name.toLowerCase().includes('female') ||
                    v.name.toLowerCase().includes('woman') ||
                    v.name.toLowerCase().includes('zira') ||
                    v.name.toLowerCase().includes('samantha') ||
                    v.name.toLowerCase().includes('veena') ||
                    v.name.toLowerCase().includes('aditi') ||
                    v.name.toLowerCase().includes('lekha')
                );
            }

            if (!bestVoice) bestVoice = availableVoices[0];

            if (bestVoice) {
                utterance.voice = bestVoice;
            }

            synthesisRef.current.speak(utterance);
        }
    };

    const processMessage = async (msgText) => {
        if (!msgText) return;

        // 🌐 AUTO DETECT LANGUAGE from what user typed/spoke
        const detectedLang = detectLanguage(msgText);
        if (detectedLang !== language) {
            setLanguage(detectedLang);  // Update UI dropdown too
            if (recognitionRef.current) recognitionRef.current.lang = detectedLang;
        }
        const langToUse = detectedLang;

        // Add User Message to UI
        setMessages(prev => [...prev, { type: 'user', text: msgText }]);
        setLoading(true);

        try {
            const historyToSend = chatHistoryRef.current;
            const user = getUserInfo();
            const currentSession = sessionIdRef.current;

            const res = await axios.post('http://localhost:5000/api/chat', {
                message: msgText,
                history: historyToSend,
                userId: user ? user._id : null,
                sessionId: currentSession,
                language: langToUse  // ✅ send auto-detected language
            });

            const { responseText, updatedHistory, schemes: foundSchemes, completed, sessionId: newSessionId } = res.data;

            setChatHistory(updatedHistory);

            // Add Bot Message to UI
            setMessages(prev => [...prev, { type: 'bot', text: responseText }]);
            speak(responseText, langToUse);  // ✅ speak in detected language

            if (newSessionId && !currentSession) setSessionId(newSessionId);
            if (foundSchemes) setSchemes(foundSchemes);

        } catch (error) {
            console.error('Error processing command:', error);
            const errText = "Sorry, I am having trouble connecting to the server.";
            setMessages(prev => [...prev, { type: 'bot', text: errText }]);
            speak(errText);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = () => {
        if (inputMessage.trim()) {
            processMessage(inputMessage);
            setInputMessage("");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    // --- Voice Logic ---
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (!recognitionRef.current) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = language; // Use state

                recognitionRef.current.onresult = (event) => {
                    const text = event.results[0][0].transcript;
                    // Don't double add message here, let processMessage do it
                    processMessage(text);
                };

                recognitionRef.current.error = (event) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, [language]); // Re-init if language changes (simplistic approach, or just update prop)

    // Better: Update lang property dynamically
    useEffect(() => {
        if (recognitionRef.current) recognitionRef.current.lang = language;
    }, [language]);

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Already started", e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const handleManualStart = async () => {
        if (messages.length === 0) {
            setLoading(true);
            // Trigger welcome message by sending empty context check
            try {
                const user = getUserInfo();
                const res = await axios.post('http://localhost:5000/api/chat', {
                    message: null, // Init
                    history: {},
                    userId: user ? user._id : null,
                    language: language
                });
                const { responseText, sessionId: newId } = res.data;
                setMessages([{ type: 'bot', text: responseText }]);
                if (newId) setSessionId(newId);
                speak(responseText);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        setIsOpen(true);
    };

    const closeAndResetChat = () => {
        setIsOpen(false);
        setMessages([]);
        setSchemes([]);
        setChatHistory({});
        setInputMessage("");
        setSessionId(null);
        if (synthesisRef.current) {
            synthesisRef.current.cancel();
        }
    };

    const toggleMute = () => {
        setIsMuted(prev => {
            const newMuted = !prev;
            if (newMuted && synthesisRef.current) {
                synthesisRef.current.cancel(); // Instantly stop talking if user mutes mid-sentence
            }
            return newMuted;
        });
    };

    return (
        <div className="fixed-bottom-right">
            {!isOpen && (
                <button
                    onClick={handleManualStart}
                    className="floating-btn shadow-lg"
                >
                    <FaMicrophone />
                </button>
            )}

            {isOpen && (
                <div className="chat-window d-flex flex-column shadow-lg border-0">
                    <div className="chat-header d-flex justify-content-between align-items-center">
                        <h5 className="m-0 d-flex align-items-center gap-2">PA Assistant</h5>
                        <div className="d-flex align-items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className="btn btn-sm btn-light shadow-sm rounded-circle d-flex align-items-center justify-content-center p-2"
                                title={isMuted ? "Unmute Voice" : "Mute Voice"}
                            >
                                {isMuted ? <FaVolumeMute className="text-danger" /> : <FaVolumeUp className="text-primary" />}
                            </button>
                             <select
                                className="form-select form-select-sm bg-light text-dark shadow-sm"
                                value={language}
                                onChange={async (e) => {
                                    const newLang = e.target.value;
                                    setLanguage(newLang);
                                    if (synthesisRef.current) synthesisRef.current.cancel();
                                    setLoading(true);
                                    try {
                                        const user = getUserInfo();
                                        const res = await axios.post('http://localhost:5000/api/chat', {
                                            message: null, 
                                            history: {},
                                            userId: user ? user._id : null,
                                            language: newLang
                                        });
                                        const { responseText, sessionId: newId } = res.data;
                                        setMessages([{ type: 'bot', text: responseText }]);
                                        if (newId) setSessionId(newId);
                                        speak(responseText, newLang);
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                style={{ width: 'auto', borderRadius: '12px' }}
                            >
                                <option value="en-IN">English</option>
                                <option value="hi-IN">Hindi</option>
                                <option value="mr-IN">Marathi</option>
                            </select>
                            <button onClick={closeAndResetChat} className="close-btn rounded-circle"><FaTimes /></button>
                        </div>
                    </div>

                    <div className="chat-body p-3 flex-grow-1">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`chat-message ${msg.type} shadow-sm position-relative`}>
                                {msg.type === 'bot' && <FaVolumeUp className="bot-icon" />}
                                <div className="message-content">{msg.text}</div>
                            </div>
                        ))}

                        {schemes.length > 0 && (
                            <div className="schemes-list shadow-sm">
                                <h6 className="text-primary fw-bold mb-3">Found Schemes:</h6>
                                <ul className="list-unstyled mb-0">
                                    {schemes.map(s => (
                                        <li key={s._id} className="mb-3 pb-2 border-bottom">
                                            <a href={`/schemes/${s._id}`} className="fw-bold d-block text-decoration-none mb-1 text-dark fs-6">{s.name}</a>
                                            {s.applyLink && (
                                                <button
                                                    onClick={() => {
                                                        const user = localStorage.getItem('userInfo');
                                                        if (user) {
                                                            window.open(s.applyLink, '_blank');
                                                        } else {
                                                            alert("You must be logged in to apply for this scheme.");
                                                        }
                                                    }}
                                                    className="btn btn-success btn-sm px-3 rounded-pill fw-semibold shadow-sm mt-1"
                                                >
                                                    Apply Online
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {loading && <div className="d-flex align-items-center justify-content-center text-muted my-3 px-3 py-2 bg-white rounded-pill shadow-sm" style={{ width: 'fit-content', margin: '0 auto' }}>
                            <div className="spinner-grow spinner-grow-sm text-primary me-2" role="status"></div>
                            <span className="small fw-semibold">Thinking...</span>
                        </div>}

                        {isListening && <div className="d-flex align-items-center justify-content-center text-danger my-3 px-3 py-2 bg-white rounded-pill shadow-sm" style={{ width: 'fit-content', margin: '0 auto' }}>
                            <div className="spinner-grow spinner-grow-sm text-danger me-2" role="status"></div>
                            <span className="small fw-semibold">Listening...</span>
                        </div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-footer p-3 bg-white d-flex align-items-center gap-2 border-top">
                        <input
                            type="text"
                            className="form-control rounded-pill px-3 shadow-none bg-light flex-grow-1 border-0"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type or speak..."
                        />
                        <button onClick={isListening ? stopListening : startListening} className={`mic-btn rounded-circle d-flex align-items-center justify-content-center ${isListening ? 'active' : ''}`}>
                            {isListening ? <FaStop /> : <FaMicrophone />}
                        </button>
                        <button onClick={handleSend} className="send-btn rounded-circle d-flex align-items-center justify-content-center" disabled={!inputMessage.trim()}>
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceAssistant;
