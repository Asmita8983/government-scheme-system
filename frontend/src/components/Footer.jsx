import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";

const Footer = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  return (
    <footer className="py-5 mt-5 border-top bg-white">
      <div className="container">
        <div className="row">
          <div className="col-md-6">
            <h4 className="fw-bold heading-gradient mb-3">{t.navBrand}</h4>
            <p className="text-muted">{t.footerDesc}</p>
          </div>
          <div className="col-md-3">
            <h6 className="fw-bold mb-3">{t.footerQuickLinks}</h6>
            <ul className="list-unstyled text-muted">
              <li>{t.footerQuickAbout}</li>
              <li>{t.footerQuickTerms}</li>
              <li>{t.footerQuickPrivacy}</li>
            </ul>
          </div>
          <div className="col-md-3">
            <h6 className="fw-bold mb-3">{t.footerSupport}</h6>
            <ul className="list-unstyled text-muted">
              <li>{t.footerHelpCenter}</li>
              <li>{t.footerContact}</li>
              <li>{t.footerPageTitle || t.footerGazette}</li>
            </ul>
          </div>
        </div>
        <hr className="my-4" />
        <div className="text-center text-muted small">
          {t.footerRights}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
