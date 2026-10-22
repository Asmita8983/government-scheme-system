import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineUserCircle, HiOutlineLogout, HiOutlineShieldCheck, HiOutlineGlobeAlt, HiOutlineClipboardList } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { admin, logoutAdmin } = useAdminAuth();
  const { language, changeLanguage, LANGUAGES } = useLanguage();
  const t = translations[language] || translations.en;

  const logoutHandler = () => {
    logout();
    navigate("/login");
  };

  const adminLogoutHandler = () => {
    logoutAdmin();
    navigate("/admin");
  };

  return (
    <nav className="navbar navbar-expand-lg glass-card sticky-top m-3 px-4">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <div className="bg-primary text-white rounded-3 p-2 me-2 d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
            <span style={{ fontWeight: "800", fontSize: "1.2rem" }}>G</span>
          </div>
          <span className="fw-bold fs-4 heading-gradient">{t.navBrand}</span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link fw-semibold px-3" to="/schemes">{t.navSchemes}</Link>
            </li>
            {admin ? (
              <li className="nav-item">
                <Link className="nav-link fw-semibold px-3" to="/login">
                  {t.navUser || "User"}
                </Link>
              </li>
            ) : !user ? (
              <li className="nav-item">
                <Link className="nav-link fw-semibold px-3" to="/admin">
                  {t.navAdmin}
                </Link>
              </li>
            ) : null}
          </ul>
          <div className="d-flex align-items-center gap-3">
            {/* Elegant Language Selector */}
            <div className="dropdown">
              <button className="btn btn-premium btn-light border dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
                <HiOutlineGlobeAlt className="text-primary" size={18} />
                <span>{LANGUAGES[language].flag} {LANGUAGES[language].nativeName}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 p-2 rounded-4" style={{ minWidth: '150px' }}>
                {Object.values(LANGUAGES).map((lang) => (
                  <li key={lang.code}>
                    <button
                      className={`dropdown-item rounded-3 d-flex align-items-center gap-2 py-2 ${language === lang.code ? 'active bg-primary text-white' : ''}`}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      <span>{lang.flag}</span>
                      <span className="fw-medium">{lang.nativeName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {admin ? (
              <div className="dropdown">
                <button className="btn btn-premium btn-dark dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  <HiOutlineShieldCheck size={20} className="me-2" /> {t.navAdmin}: {admin.username}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 p-2 rounded-4">
                  <li><Link className="dropdown-item rounded-3" to="/admin-dashboard">{t.navCommandCenter}</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item rounded-3 text-danger d-flex align-items-center gap-2" onClick={adminLogoutHandler}>
                      <HiOutlineLogout /> {t.navSecureLogout}
                    </button>
                  </li>
                </ul>
              </div>
            ) : user ? (
              <div className="dropdown">
                <button className="btn btn-premium btn-primary-premium dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  <HiOutlineUserCircle size={20} /> {user.name}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 p-2 rounded-4">
                  <li><Link className="dropdown-item rounded-3" to="/dashboard">{t.navDashboard}</Link></li>
                  <li><Link to="/history" className="dropdown-item rounded-3 d-flex align-items-center gap-2"><HiOutlineClipboardList size={16} /> {t.navHistory || "Scheme History"}</Link></li>
                  <li><Link className="dropdown-item rounded-3" to="/profile">{t.navProfile}</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item rounded-3 text-danger d-flex align-items-center gap-2" onClick={logoutHandler}>
                      <HiOutlineLogout /> {t.navLogout}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-link text-decoration-none fw-semibold text-dark">{t.navLogin}</Link>
                <Link to="/register" className="btn btn-premium btn-primary-premium">{t.navGetStarted}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
