import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";
import { toast } from "react-toastify";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineRefresh } from "react-icons/hi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requiresOtp) {
        toast.info("OTP sent to your email. Please verify.");
        navigate("/verify-otp", { state: { email: result.email } });
      } else {
        toast.success("Login Successful!");
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container py-5 d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div
        className="glass-card p-5 w-100 animate-fade-in"
        style={{ maxWidth: "480px" }}
      >
        <h2 className="fw-bold mb-4 heading-gradient text-center">{t.loginTitle}</h2>
        <p className="text-muted text-center mb-4">{t.loginSubtitle}</p>

        <form onSubmit={submitHandler}>
          <div className="mb-4">
            <label className="form-label fw-semibold">{t.emailLabel}</label>
            <input
              type="email"
              className="input-premium w-100"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold">{t.passwordLabel}</label>
            <div className="position-relative">
              <input
                type={showPass ? "text" : "password"}
                className="input-premium w-100"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <span
                className="position-absolute"
                style={{
                  right: "15px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
              </span>
            </div>
          </div>

          <div className="text-end mb-4">
            <Link
              to="/forgot-password"
              className="login-forgot-link fw-semibold text-decoration-none"
            >
              {t.forgotPasswordBtn || "Forgot Password?"}
            </Link>
          </div>

          <div className="login-actions mb-4">
            <button
              type="submit"
              className="btn btn-premium btn-primary-premium w-100 py-3 fs-5"
              disabled={loading}
            >
              {loading ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <HiOutlineRefresh style={{ animation: "spin 0.8s linear infinite" }} />
                  Sending OTP...
                </span>
              ) : (
                t.loginBtn
              )}
            </button>
            <Link
              to="/forgot-password"
              className="btn btn-premium btn-forgot-premium w-100 py-3 fw-semibold mt-2 text-center d-block"
            >
              {t.forgotPasswordBtn || "Forgot Password?"}
            </Link>
          </div>
        </form>

        <div className="text-center">
          <p className="text-muted mb-0">
            {t.dontHaveAccount}{" "}
            <Link to="/register" className="text-primary fw-bold text-decoration-none">
              {t.signUpLink}
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .login-forgot-link {
          color: #2563eb !important;
          font-size: 0.9rem;
        }
        .login-forgot-link:hover {
          color: #1d4ed8 !important;
          text-decoration: underline !important;
        }
        .login-actions .btn-forgot-premium {
          display: block !important;
          width: 100% !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default Login;
