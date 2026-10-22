import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Register = () => {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register, user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const navigate = useNavigate();

  // Only redirect if already logged in on page load (not mid-OTP flow)
  React.useEffect(() => {
    if (user) navigate("/");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const generateSuggestedPassword = () => {
    const base = name ? name.split(' ')[0] : 'User';
    const specials = '@$!%*?&';
    const special = specials[Math.floor(Math.random() * specials.length)];
    const digits = mobileNumber ? mobileNumber.slice(-3) : String(Math.floor(100 + Math.random() * 900));
    // Format: Firstname + special + digits + uppercase letter → always passes the regex
    const generated = `${base.charAt(0).toUpperCase()}${base.slice(1).toLowerCase()}${special}${digits}X`;
    setPassword(generated);
    setPasswordError("");
  };

  const validateName = (val) => {
    if (!val.trim()) {
      setNameError("Full Name is required.");
      return false;
    }
    if (val.trim().split(" ").length < 2) {
      setNameError("Please enter both your first and last name.");
      return false;
    }
    const nameRegex = /^[a-zA-Z\s]*$/;
    if (!nameRegex.test(val)) {
      setNameError("Name should only contain letters and spaces.");
      return false;
    }
    setNameError("");
    return true;
  };

  const validateEmail = (val) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val.trim()) {
      setEmailError("Email is required.");
      return false;
    }
    if (!emailRegex.test(val)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validateMobile = (val) => {
    if (!val.trim()) {
      setMobileError("Mobile number is required.");
      return false;
    }
    if (!/^\d{10}$/.test(val)) {
      setMobileError("Mobile number must be exactly 10 digits.");
      return false;
    }
    setMobileError("");
    return true;
  };

  const validatePassword = (pass) => {
    if (!pass) {
      setPasswordError("Password is required.");
      return false;
    }
    if (!passwordRegex.test(pass)) {
      setPasswordError("Min 8 chars with uppercase, lowercase, number & special character (@$!%*?&).");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isMobileValid = validateMobile(mobileNumber);
    const isPasswordValid = validatePassword(password);
    
    if (!isNameValid || !isEmailValid || !isMobileValid || !isPasswordValid) {
      return;
    }
    try {
      const result = await register(name, email, password, mobileNumber);
      if (result?.requiresOtp) {
        toast.info("Account created! Please verify your email with the OTP sent.");
        navigate("/verify-otp", { state: { email: result.email } });
      } else {
        toast.success("Account created successfully!");
      }
    } catch (err) {
      toast.error(err.message || "Registration failed");
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
      <div className="glass-card p-5 w-100 animate-fade-in" style={{ maxWidth: "450px" }}>
        <h2 className="fw-bold mb-4 heading-gradient text-center">{t.registerTitle}</h2>
        <p className="text-muted text-center mb-5">{t.registerSubtitle}</p>

        <form onSubmit={submitHandler}>
          <div className="mb-3">
            <label className="form-label fw-semibold">{t.fullNameLabel}</label>
            <input
              type="text"
              className="input-premium w-100"
              placeholder="John Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value) validateName(e.target.value);
              }}
              onBlur={(e) => validateName(e.target.value)}
              required
            />
            {nameError && (
              <small className="text-danger d-block mt-1">{nameError}</small>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">{t.emailLabel}</label>
            <input
              type="email"
              className={`input-premium w-100 ${emailError ? "border-danger" : ""}`}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              required
            />
            {emailError && (
              <small className="text-danger d-block mt-1">{emailError}</small>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">{t.mobileLabel}</label>
            <input
              type="tel"
              className={`input-premium w-100 ${mobileError ? "border-danger" : ""}`}
              placeholder="9876543210"
              value={mobileNumber}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*$/.test(val) && val.length <= 10) {
                  setMobileNumber(val);
                  if (val.length === 10) validateMobile(val);
                }
              }}
              onBlur={(e) => validateMobile(mobileNumber)}
              required
            />
            {mobileError && (
              <small className="text-danger d-block mt-1">{mobileError}</small>
            )}
          </div>
          <div className="mb-5">
            <div className="d-flex justify-content-between align-items-center">
              <label className="form-label fw-semibold">{t.passwordLabel}</label>
              <button 
                type="button" 
                className="btn btn-sm btn-outline-primary mb-2"
                onClick={generateSuggestedPassword}
              >
                Suggest Password
              </button>
            </div>
            <div className="position-relative">
              <input
                type={showPassword ? "text" : "password"}
                className="input-premium w-100"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
                }}
                required
              />
              <span 
                className="position-absolute" 
                style={{ right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6c757d' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {passwordError && (
              <small className="text-danger d-block mt-1">{passwordError}</small>
            )}
          </div>
          <button type="submit" className="btn btn-premium btn-primary-premium w-100 py-3 fs-5 mb-4">
            {t.registerBtn}
          </button>
        </form>

        <div className="text-center">
          <p className="text-muted">
            {t.alreadyHaveAccount} <Link to="/login" className="text-primary fw-bold text-decoration-none">{t.loginBtn}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
