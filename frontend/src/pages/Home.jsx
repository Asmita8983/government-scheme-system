import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HiOutlineSearch, HiOutlineClipboardCheck, HiOutlineShieldCheck, HiOutlineUserCircle, HiOutlineSpeakerphone, HiOutlineSupport } from "react-icons/hi";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";
import axios from 'axios';

const Home = () => {
  const [liveUserCount, setLiveUserCount] = useState("50,000+");
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/analytics/public/stats");
        if (data && data.success && data.count > 0) {
          // Add commas for readability
          setLiveUserCount(data.count.toLocaleString());
        }
      } catch (error) {
        console.error("Failed to fetch live stats", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="container-fluid py-5 animate-fade-in overflow-hidden">
      {/* Feature: Minor Issues Resolver / Quick Alerts - "Top Feature" */}
      <div className="container mb-5">
        <div className="bg-white p-4 rounded-4 shadow-sm border border-secondary border-opacity-10 d-flex flex-wrap align-items-center justify-content-between position-relative overflow-hidden hover-scale-sm transition-all">
          <div className="d-flex align-items-center gap-4 z-1">
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
              <HiOutlineSpeakerphone size={24} />
            </div>
            <div>
              <h5 className="fw-bold mb-1 text-dark">{t.homeResolutionHubTitle}</h5>
              <p className="mb-0 text-muted small">{t.homeResolutionHubDesc}</p>
            </div>
          </div>
          <div className="d-flex gap-3 mt-3 mt-md-0 z-1">
            <button className="btn btn-outline-secondary rounded-pill px-4 fw-medium btn-sm" onClick={() => window.open('https://helpers.gov.in', '_blank')}>
              helpdesk.gov.in
            </button>
            <button className="btn btn-dark rounded-pill px-4 fw-bold btn-sm shadow-md d-flex align-items-center" onClick={() => document.querySelector('.floating-btn')?.click()}>
              <HiOutlineSupport className="me-2" /> {t.homeResolveIssueBtn}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Hero Section */}
      <div className="container">
        <div className="row align-items-center min-vh-75 mb-5 py-5">
          <div className="col-lg-6 position-relative z-1">
            <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill mb-4 fw-bold border border-primary border-opacity-25 shadow-sm">
              <HiOutlineShieldCheck className="me-1" /> {t.homeHeroBadge}
            </span>
            <h1 className="display-2 fw-800 mb-4 heading-gradient" style={{ lineHeight: "1.1", letterSpacing: "-1px" }}>
              {t.homeHeroTitle}
            </h1>
            <p className="lead text-muted mb-5 fs-5 pe-lg-5">
              {t.homeHeroDesc}
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/schemes" className="btn btn-premium btn-primary-premium btn-lg px-5 shadow-lg">
                {t.homeExploreSchemes}
              </Link>
              <Link to="/register" className="btn btn-premium btn-outline-primary btn-lg border-2 px-5">
                {t.homeJoinNow}
              </Link>
            </div>

            <div className="mt-5 d-flex align-items-center gap-4">
              <div className="avatar-stack">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-circle border border-white bg-light d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', marginLeft: i > 1 ? '-10px' : '0' }}>
                    <HiOutlineUserCircle className="text-muted" />
                  </div>
                ))}
              </div>
              <div className="small text-muted">
                <span className="fw-bold text-dark">{liveUserCount}</span> {t.homeCitizensRegistered}
              </div>
            </div>
          </div>

          <div className="col-lg-6 mt-5 mt-lg-0 position-relative">
            {/* Ambient Background Elements */}
            <div className="position-absolute translate-middle opacity-20 bg-primary rounded-circle blur-3xl" style={{ width: '400px', height: '400px', top: '50%', left: '50%', filter: 'blur(100px)' }}></div>

            <div className="position-relative">
              <div className="glass-card p-2 shadow-2xl overflow-hidden" style={{ borderRadius: '30px' }}>
                <img
                  src="https://img.freepik.com/free-vector/digital-lifestyle-concept-illustration_114360-7327.jpg"
                  alt="Citizen Service"
                  className="img-fluid"
                  style={{ borderRadius: '24px', transform: 'scale(1.02)' }}
                />
              </div>

              {/* Floating Status Cards */}
              <div className="position-absolute top-0 start-0 translate-middle-y glass-card p-3 shadow-lg animate-fade-in" style={{ borderRadius: '15px', animationDelay: '0.4s' }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-success text-white p-2 rounded-circle"><HiOutlineClipboardCheck /></div>
                  <div>
                    <div className="fw-bold small">{t.homeVerifiedSource}</div>
                    <div className="text-muted small">{t.homeUpdatedJustNow}</div>
                  </div>
                </div>
              </div>

              <div className="position-absolute bottom-0 end-0 glass-card p-3 shadow-lg animate-fade-in" style={{ borderRadius: '15px', animationDelay: '0.7s', transform: 'translate(20%, -20%)' }}>
                <div className="d-flex align-items-center gap-3 text-start">
                  <div className="bg-warning text-white p-2 rounded-circle"><HiOutlineSearch /></div>
                  <div>
                    <div className="fw-bold small">{t.homeDirectMatching}</div>
                    <div className="text-muted small">{t.homeAiEngineActive}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5">
        <div className="text-center mb-5">
          <h2 className="fw-bold">{t.homePoweredBy}</h2>
          <p className="text-muted">{t.homePoweredByDesc}</p>
        </div>
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="gov-card p-5 h-100 text-center border-0 shadow-sm">
              <div className="bg-primary-subtle text-primary rounded-4 p-4 d-inline-block mb-4 shadow-sm">
                <HiOutlineSearch size={40} />
              </div>
              <h4 className="fw-bold">{t.homeDiscoveryTitle}</h4>
              <p className="text-muted">{t.homeDiscoveryDesc}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="gov-card p-5 h-100 text-center border-0 shadow-sm border-top border-5 border-success">
              <div className="bg-success-subtle text-success rounded-4 p-4 d-inline-block mb-4 shadow-sm">
                <HiOutlineClipboardCheck size={40} />
              </div>
              <h4 className="fw-bold">{t.homeEligibilityTitle}</h4>
              <p className="text-muted">{t.homeEligibilityDesc}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="gov-card p-5 h-100 text-center border-0 shadow-sm">
              <div className="bg-warning-subtle text-warning rounded-4 p-4 d-inline-block mb-4 shadow-sm">
                <HiOutlineShieldCheck size={40} />
              </div>
              <h4 className="fw-bold">{t.homeSecureTitle}</h4>
              <p className="text-muted">{t.homeSecureDesc}</p>
            </div>
          </div>
        </div>

        {/* Recently Added Schemes Ticker - connects to Admin AI extraction */}
        <div className="bg-white rounded-5 shadow-sm border border-light overflow-hidden">
          <div className="p-4 border-bottom d-flex align-items-center justify-content-between bg-light bg-opacity-50">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-danger rounded-pill animate-pulse">LIVE</span>
              <h5 className="fw-bold m-0 text-dark">{t.homeLatestUpdates}</h5>
            </div>
            <Link to="/schemes" className="text-primary fw-bold text-decoration-none small hover-underline">{t.homeViewRegistry}</Link>
          </div>
          <div className="row g-0">
            {[
              { title: "PM Kisan Samman Nidhi", tag: "Financial", time: "2h ago" },
              { title: "Ayushman Bharat Digital Mission", tag: "Health", time: "5h ago" },
              { title: "National Apprentice Scheme", tag: "Education", time: "1d ago" },
              { title: "Ujjwala Yojana 2.0", tag: "Welfare", time: "2d ago" }
            ].map((item, i) => (
              <div className="col-md-3 border-end" key={i}>
                <div className="p-4 hover-bg-light transition-all cursor-pointer" onClick={() => window.location.href = '/schemes'}>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill small fw-normal">{item.tag}</span>
                    <small className="text-muted" style={{ fontSize: '10px' }}>{item.time}</small>
                  </div>
                  <h6 className="fw-bold text-dark mb-0 text-truncate">{item.title}</h6>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
