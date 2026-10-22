import { createContext, useState, useContext } from "react";

const LanguageContext = createContext();

export const LANGUAGES = {
  en: { code: "en", label: "English", flag: "🇬🇧", nativeName: "English" },
  hi: { code: "hi", label: "Hindi", flag: "🇮🇳", nativeName: "हिंदी" },
  mr: { code: "mr", label: "Marathi", flag: "🇮🇳", nativeName: "मराठी" },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("govportal_lang") || "en"
  );

  const changeLanguage = (code) => {
    setLanguage(code);
    localStorage.setItem("govportal_lang", code);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
