import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { HiOutlineMail, HiOutlineRefresh, HiOutlineShieldCheck } from "react-icons/hi";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp } = useAuth();

  // Email is passed via navigation state from Login / Register
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  // Redirect away if no email in state
  useEffect(() => {
    if (!email) {
      toast.error("Session expired. Please login again.");
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first box
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return; // digits only
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    // Move to next box
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        // Clear current
        const updated = [...otp];
        updated[index] = "";
        setOtp(updated);
      } else if (index > 0) {
        // Move back
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = [...otp];
    for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
    setOtp(updated);
    // Focus last filled box
    const lastIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[lastIdx]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < OTP_LENGTH) {
      toast.error("Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, otpValue);
      toast.success("Email verified! Welcome.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Invalid OTP. Please try again.");
      // Clear boxes on wrong OTP
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    try {
      await resendOtp(email);
      toast.success("New OTP sent to your email.");
      setOtp(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.message || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, "$1***$2")
    : "";

  return (
    <div
      className="container py-5 d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div
        className="glass-card p-5 w-100 animate-fade-in text-center"
        style={{ maxWidth: "460px" }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-4 d-flex align-items-center justify-content-center bg-soft-blue rounded-circle"
          style={{ width: "72px", height: "72px" }}
        >
          <HiOutlineShieldCheck size={36} className="text-primary" />
        </div>

        <h2 className="fw-bold heading-gradient mb-2">Verify Your Email</h2>
        <p className="text-muted mb-1" style={{ fontSize: "15px" }}>
          We sent a 6-digit OTP to
        </p>
        <p className="fw-semibold text-dark mb-4 d-flex align-items-center justify-content-center gap-2">
          <HiOutlineMail className="text-primary" size={18} />
          {maskedEmail}
        </p>

        <form onSubmit={handleSubmit}>
          {/* OTP Boxes */}
          <div
            className="d-flex justify-content-center gap-2 mb-4"
            onPaste={handlePaste}
          >
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                style={{
                  width: "52px",
                  height: "60px",
                  fontSize: "24px",
                  fontWeight: "700",
                  textAlign: "center",
                  border: digit
                    ? "2px solid var(--primary, #4f46e5)"
                    : "2px solid #e2e8f0",
                  borderRadius: "12px",
                  outline: "none",
                  background: digit ? "#eef2ff" : "#f8fafc",
                  transition: "all 0.15s ease",
                  caretColor: "transparent",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--primary, #4f46e5)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = digit ? "var(--primary, #4f46e5)" : "#e2e8f0")
                }
              />
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-premium btn-primary-premium w-100 py-3 fs-5 mb-3"
            disabled={loading || otp.join("").length < OTP_LENGTH}
          >
            {loading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <HiOutlineRefresh
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
                Verifying...
              </span>
            ) : (
              "Verify OTP"
            )}
          </button>
        </form>

        {/* Resend */}
        <div className="mt-2">
          {canResend ? (
            <button
              className="btn btn-link text-primary fw-semibold text-decoration-none p-0"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? (
                <span className="d-flex align-items-center gap-1">
                  <HiOutlineRefresh
                    size={14}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                  Sending...
                </span>
              ) : (
                "Resend OTP"
              )}
            </button>
          ) : (
            <p className="text-muted small mb-0">
              Resend OTP in{" "}
              <span className="fw-bold text-primary">{countdown}s</span>
            </p>
          )}
        </div>

        <p className="text-muted small mt-4 mb-0">
          Wrong account?{" "}
          <a
            href="/login"
            className="text-primary fw-semibold text-decoration-none"
          >
            Go back to Login
          </a>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OtpVerification;
