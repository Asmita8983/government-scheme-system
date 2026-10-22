import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";
import {
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
  HiOutlineXCircle,
  HiOutlineClipboardList,
  HiOutlineStar,
  HiMicrophone
} from "react-icons/hi";
import { toast } from "react-toastify";
import { getCachedSchemes, setCachedSchemes } from "../utils/schemesCache";

const EligibleSchemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, eligible, recommended
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isListening, setIsListening] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  let profileStrength = 0;
  if (user) {
    const fields = [
      user.profile?.age,
      user.profile?.gender,
      user.profile?.income,
      user.profile?.education,
      user.profile?.occupation,
      user.profile?.caste,
      user.profile?.state,
      user.profile?.district,
      user.profile?.category,
      user.profile?.aadhaarNumber,
      user.mobileNumber,
      user.profile?.dob
    ];
    const filled = fields.filter(f => f !== "" && f !== null && f !== undefined).length;
    profileStrength = Math.round((filled / fields.length) * 100);
  }

  const isProfileComplete = profileStrength >= 60;

  useEffect(() => {
    const cached = getCachedSchemes(user);
    if (cached?.length) {
      setSchemes(cached);
      setLoading(false);
    }
    fetchEligibleSchemes(Boolean(cached?.length));
  }, [user]);

  const fetchEligibleSchemes = async (background = false) => {
    if (!background) setLoading(true);
    try {
      const payload = user?.profile || {};
      const config = {};
      if (user?.token) {
        config.headers = { Authorization: `Bearer ${user.token}` };
      }
      const { data } = await axios.post(
        "http://localhost:5000/api/schemes/check-eligibility",
        payload,
        config
      );
      setSchemes(data);
      setCachedSchemes(user, data);
    } catch (error) {
      console.error("Error fetching schemes", error);
      if (!background) toast.error("Could not load schemes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const speakConfirmation = (text) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      if (language === "hi") {
        utterance.lang = "hi-IN";
      } else if (language === "mr") {
        utterance.lang = "mr-IN";
      } else {
        utterance.lang = "en-IN";
      }
      window.speechSynthesis.speak(utterance);
    } catch (speechErr) {
      console.error("TTS Speech synthesis failed:", speechErr);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t.voiceNotSupported);
      return;
    }

    const recognition = new SpeechRecognition();
    if (language === "hi") {
      recognition.lang = "hi-IN";
    } else if (language === "mr") {
      recognition.lang = "mr-IN";
    } else {
      recognition.lang = "en-IN";
    }

    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setActiveSearch(transcript);
      setIsListening(false);
      
      const confirmText = `${t.voiceSearching} ${transcript}`;
      toast.success(confirmText);
      speakConfirmation(confirmText);
      
      if (user && user.token && transcript.trim()) {
        try {
          await axios.post("http://localhost:5000/api/auth/search-history", { query: transcript }, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          fetchEligibleSchemes();
        } catch (err) {
          console.error("Failed to update search history", err);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      toast.error(t.voiceError);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchQuery);
    if (!searchQuery.trim()) return;

    if (user && user.token) {
      try {
        await axios.post("http://localhost:5000/api/auth/search-history", { query: searchQuery }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        // Dynamically refetch so the server recalculates matches incorporating search intent!
        fetchEligibleSchemes();
      } catch (err) {
        console.error("Failed to update search history", err);
      }
    }
  };

  const handleApplyScheme = async (scheme) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      const { data } = await axios.post(`http://localhost:5000/api/schemes/apply/${scheme._id}`, {}, config);
      
      if (data.success) {
        // Success Vocal Confirm
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            language === "hi" 
              ? `आवेदन सफल रहा! आपका ट्रैकिंग नंबर है ${data.trackingNumber}`
              : language === "mr"
                ? `अर्ज यशस्वी झाला! तुमचा ट्रॅकिंग नंबर ${data.trackingNumber} आहे`
                : `Application submitted successfully! Your tracking number is ${data.trackingNumber}`
          );
          if (language === "hi") utterance.lang = "hi-IN";
          else if (language === "mr") utterance.lang = "mr-IN";
          else utterance.lang = "en-IN";
          window.speechSynthesis.speak(utterance);
        }

        toast.success(
          <div>
            <div className="fw-bold mb-1">{data.message}</div>
            <div className="small font-monospace">Tracking ID: {data.trackingNumber}</div>
            {data.notification?.delivered && data.notification?.email?.success && (
              <div className="small text-success mt-1">Confirmation email sent to your inbox.</div>
            )}
            {data.notification?.sms?.success && !data.notification?.sms?.mock && (
              <div className="small text-success mt-1">SMS confirmation sent to your mobile.</div>
            )}
            {!data.notification?.delivered && (
              <div className="small text-warning mt-1">
                Notification not sent — admin must configure RESEND_API_KEY or Gmail SMTP in backend.
              </div>
            )}
          </div>,
          { autoClose: 10000 }
        );

        if (scheme.applyLink) {
          setTimeout(() => {
            window.open(scheme.applyLink, '_blank');
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Welfare Application filing failed:", err);
      const serverMsg = err.response?.data?.message;
      const isFraud = err.response?.data?.isFraud;
      
      // Fraud security vocal alarm
      if (window.speechSynthesis && isFraud) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          language === "hi"
            ? "चेतावनी! डुप्लिकेट आवेदन या आधार पहचान संघर्ष का पता चला। सुरक्षा कारणों से आवेदन अवरुद्ध कर दिया गया है।"
            : language === "mr"
              ? "सावधान! डुप्लिकेट अर्ज किंवा आधार ओळख विसंगती आढळली. सुरक्षा कारणास्तव अर्ज ब्लॉक केला आहे."
              : "Warning! Duplicate application or Aadhaar identity conflict detected. Application blocked for security compliance."
        );
        if (language === "hi") utterance.lang = "hi-IN";
        else if (language === "mr") utterance.lang = "mr-IN";
        else utterance.lang = "en-IN";
        window.speechSynthesis.speak(utterance);
      }

      toast.error(
        <div className="p-1">
          <div className="fw-bold text-danger mb-1">
            {isFraud ? "🔒 SECURITY VIOLATION" : "❌ Application Error"}
          </div>
          <div className="small">{serverMsg || "Failed to submit application. Please try again."}</div>
        </div>,
        { autoClose: 10000 }
      );
    }
  };

  const filteredSchemes = schemes.filter(s => {
    if (filter === "eligible" && !s.eligible) return false;
    if (filter === "recommended" && s.score < 60) return false;
    
    if (activeSearch.trim()) {
      const query = activeSearch.toLowerCase();
      const matchText = `${s.name} ${s.description} ${s.benefit} ${s.rules?.occupation || ''}`.toLowerCase();
      return matchText.includes(query);
    }
    
    return true;
  });

  if (loading && schemes.length === 0) return (
    <div className="container py-5 text-center">
      <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}></div>
      <p className="mt-4 fw-bold text-muted">Loading schemes for you...</p>
    </div>
  );

  return (
    <div className="container-fluid py-5 px-md-5 animate-fade-in text-start">
      <div className="mb-5 d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
        <div>
          <h2 className="fw-bold heading-gradient mb-1">{t.schemesPortalTitle}</h2>
          <p className="text-muted mb-0">{t.schemesPortalDesc.replace('{count}', schemes.length)}</p>
        </div>

        <div className="d-flex glass-card p-1">
          <button
            className={`btn btn-sm px-4 py-2 rounded-2 ${filter === 'all' ? 'bg-primary text-white shadow' : 'text-muted'}`}
            onClick={() => setFilter('all')}
          >{t.schemesAllFilter}</button>
          <button
            className={`btn btn-sm px-4 py-2 rounded-2 ${filter === 'eligible' ? 'bg-success text-white shadow' : 'text-muted'}`}
            onClick={() => setFilter('eligible')}
          >{t.schemesEligibleFilter}</button>
          <button
            className={`btn btn-sm px-4 py-2 rounded-2 ${filter === 'recommended' ? 'bg-warning text-white shadow' : 'text-muted'}`}
            onClick={() => setFilter('recommended')}
          >{t.schemesTopPicksFilter}</button>
        </div>
      </div>

      {/* 🔍 Dynamic AI Recommendation Search Bar */}
      <div className="container-fluid mb-5 p-0">
        <form onSubmit={handleSearchSubmit} className="glass-card p-3 d-flex flex-column flex-md-row gap-3 align-items-stretch shadow-sm">
          <div className="flex-grow-1 position-relative d-flex align-items-center">
            <input
              type="text"
              placeholder={t.schemesSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control rounded-3 py-3 ps-4 pe-5 border-0 bg-light flex-grow-1"
              style={{ fontSize: '15px', paddingRight: '120px' }}
            />
            <div className="position-absolute end-0 top-50 translate-middle-y d-flex align-items-center gap-2 me-2">
              {activeSearch && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted text-decoration-none px-2"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSearch("");
                    fetchEligibleSchemes();
                  }}
                >
                  {t.schemesClearSearch}
                </button>
              )}
              
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center border-0 ${
                  isListening 
                    ? "bg-danger text-white animate-pulse" 
                    : "bg-soft-blue text-primary"
                }`}
                style={{
                  width: "40px",
                  height: "40px",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  boxShadow: isListening ? "0 0 15px rgba(220, 53, 69, 0.6)" : "none"
                }}
                title={isListening ? t.voiceActive : t.voiceBtn}
              >
                <HiMicrophone size={18} />
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-premium btn-primary-premium px-5 py-3 rounded-3 fw-bold shadow">
            {t.schemesAiSearchBtn}
          </button>
        </form>
        
        {isListening && (
          <div className="d-flex align-items-center gap-3 p-3 mt-3 rounded-4 bg-soft-red border-soft-red animate-fade-in">
            <div className="voice-wave-container d-flex align-items-center gap-1">
              <span className="voice-bar pulse-1"></span>
              <span className="voice-bar pulse-2"></span>
              <span className="voice-bar pulse-3"></span>
              <span className="voice-bar pulse-4"></span>
              <span className="voice-bar pulse-5"></span>
            </div>
            <div className="fw-bold text-danger animate-pulse-text small">{t.voiceSpeak}</div>
          </div>
        )}

        {activeSearch && (
          <div className="mt-2 text-muted small px-2">
            {t.schemesSearchResultsFor.replace('{query}', activeSearch)}
          </div>
        )}
      </div>

      {(!isProfileComplete && user) && (
        <div className="alert alert-warning border-0 rounded-4 p-4 mb-5 shadow-sm d-flex align-items-center gap-3 animate-fade-in">
          <HiOutlineInformationCircle size={40} className="text-warning" />
          <div>
            <h5 className="fw-bold mb-1">{t.schemesRegistryStrength.replace('{strength}', profileStrength)}</h5>
            <p className="mb-0 small">{t.schemesRegistryAlertDesc}</p>
          </div>
          <button className="btn btn-warning btn-sm ms-auto px-4 py-2 fw-bold shadow-sm" onClick={() => window.location.href = '/profile'}>{t.schemesCompleteNow}</button>
        </div>
      )}

      <div className="row g-4">
        {filteredSchemes.map((scheme, index) => (
          <div className="col-lg-6" key={scheme._id}>
            <div className={`gov-card p-4 h-100 position-relative overflow-hidden ${(!scheme.eligible && isProfileComplete) ? 'opacity-75 grayscale' : ''}`}>
              {/* Match Score Circle - Only for completeted profiles */}
              {isProfileComplete && (
                <div className="position-absolute top-0 end-0 p-4">
                  <div className={`d-flex flex-column align-items-center justify-content-center border border-4 rounded-circle bg-white shadow-sm ${scheme.score > 70 ? 'border-success' : 'border-primary'}`} style={{ width: '65px', height: '65px' }}>
                    <span className="fw-bold small">{scheme.score}%</span>
                    <span className="text-muted" style={{ fontSize: '8px' }}>{t.schemesMatchLabel}</span>
                  </div>
                </div>
              )}

              <div className="pe-5 text-start">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <div className={`p-2 rounded-3 ${(scheme.eligible || !isProfileComplete) ? 'bg-soft-green text-success' : 'bg-soft-orange text-orange'}`}>
                    <HiOutlineClipboardList size={20} />
                  </div>
                  <span className="text-muted small fw-bold text-uppercase tracking-wider me-2">{t.schemesRefLabel} {scheme._id.substring(0, 8).toUpperCase()}</span>
                  
                  {/* Deadline Warning Badge */}
                  {scheme.deadline && (() => {
                    const daysLeft = Math.ceil((new Date(scheme.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysLeft < 0) {
                      return (
                        <span className="badge bg-danger text-white border-0 px-2.5 py-1 small rounded-pill fw-bold" style={{ fontSize: '10px' }}>
                          🚫 Expired
                        </span>
                      );
                    } else if (daysLeft <= 7) {
                      return (
                        <span className="badge bg-danger text-white border-0 px-2.5 py-1 small rounded-pill fw-bold animate-pulse" style={{ fontSize: '10px', boxShadow: '0 0 10px rgba(220, 53, 69, 0.5)' }}>
                          ⏰ Closes in {daysLeft} Days!
                        </span>
                      );
                    } else {
                      return (
                        <span className="badge bg-soft-orange text-orange border-0 px-2.5 py-1 small rounded-pill fw-bold" style={{ fontSize: '10px', color: '#ea580c', backgroundColor: '#ffedd5' }}>
                          📅 Ends: {new Date(scheme.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      );
                    }
                  })()}

                  {/* Dynamic Match Badges */}
                  {scheme.matchedTags && scheme.matchedTags.map(tag => (
                    <span key={tag} className="badge bg-warning bg-opacity-10 text-warning border-0 px-2.5 py-1 small rounded-pill fw-bold" style={{ fontSize: '10px' }}>
                      ✨ {tag}
                    </span>
                  ))}
                </div>

                <h4 className="fw-bold mb-2 pe-5 text-dark">{scheme.name}</h4>
                <p className="text-muted mb-4 small" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {scheme.description}
                </p>

                <div className="row g-3 mb-4">
                  <div className="col-12">
                    <div className="bg-light p-3 rounded-3">
                      <div className="small text-muted mb-1 fw-bold">{t.schemesPrimaryBenefit}</div>
                      <div className="h5 fw-bold text-primary mb-0">{scheme.benefit}</div>
                    </div>
                  </div>
                  
                  {/* Eligibility Rationale - Only for completed profiles */}
                  {isProfileComplete && (
                    <div className="col-12">
                      <div className="p-3 border rounded-3 border-dashed">
                        <div className="small text-muted mb-2 fw-bold">{t.schemesRationale}</div>
                        <div className="d-flex align-items-start gap-2">
                          {scheme.eligible ? <HiOutlineCheckCircle className="text-success mt-1 flex-shrink-0" /> : <HiOutlineXCircle className="text-danger mt-1 flex-shrink-0" />}
                          <span className="small">{scheme.reason}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Recommendation Insight - Only for completed profiles */}
                  {isProfileComplete && scheme.aiRecommendationInsight && (
                    <div className="col-12">
                      <div className="p-3 rounded-3 bg-warning bg-opacity-5 border border-warning border-opacity-20 position-relative">
                        <div className="position-absolute top-0 end-0 p-3 text-warning animate-pulse">
                          <HiOutlineStar size={16} />
                        </div>
                        <div className="small text-warning fw-bold mb-1 tracking-wider" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                          {t.schemesAiInsight}
                        </div>
                        <p className="small text-muted mb-0 italic" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                          "{scheme.aiRecommendationInsight}"
                        </p>
                      </div>
                    </div>
                  )}

                </div>

                <div className="d-flex align-items-center justify-content-between pt-3 border-top">
                  <div className="d-flex flex-wrap gap-1">
                    {scheme.documentsRequired?.slice(0, 3).map(doc => (
                      <span key={doc} className="badge bg-light text-dark border-0 small px-2 py-1">{doc}</span>
                    ))}
                    {scheme.documentsRequired?.length > 3 && <span className="small text-muted mt-1">+{scheme.documentsRequired.length - 3} more</span>}
                  </div>

                   {(scheme.eligible || !isProfileComplete) ? (
                    <button
                      className="btn btn-premium btn-primary-premium py-2 px-4 shadow"
                      onClick={() => handleApplyScheme(scheme)}
                    >
                      {t.schemesApplyNow}
                    </button>
                  ) : (
                    <span className="text-danger small fw-bold d-flex align-items-center gap-1"><HiOutlineXCircle size={18} /> {t.schemesIneligible}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredSchemes.length === 0 && (
          <div className="col-12 text-center py-5 gov-card">
            <div className="display-1 text-muted opacity-25 mb-4"><HiOutlineInformationCircle /></div>
            <h4 className="text-muted">{t.schemesNoMatches}</h4>
            <p className="text-muted">{t.schemesNoMatchesDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EligibleSchemes;
