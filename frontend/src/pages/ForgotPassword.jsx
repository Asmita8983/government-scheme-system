import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { HiOutlineMail, HiOutlineRefresh, HiOutlineShieldCheck } from "react-icons/hi";

const API_URL = "http://localhost:5000/api/auth";
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email | otp
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (step !== "otp" || countdown <= 0) {
      if (step === "otp" && countdown <= 0) setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, step]);

  useEffect(() => {
    if (step === "otp") inputRefs.current[0]?.focus();
  }, [step]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/forgot-password/send-otp`, { email: email.trim() });
      toast.success("OTP sent to your registered email.");
      setStep("otp");
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(""));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const updated = [...otp];
        updated[index] = "";
        setOtp(updated);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = [...otp];
    for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
    setOtp(updated);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < OTP_LENGTH) {
      toast.error("Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/forgot-password/verify-otp`, {
        email: email.trim(),
        otp: otpValue,
      });
      toast.success("OTP verified. Set your new password.");
      navigate("/reset-password", {
        state: { resetToken: data.resetToken, email: email.trim() },
        replace: true,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP.");
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
      await axios.post(`${API_URL}/forgot-password/send-otp`, { email: email.trim() });
      toast.success("New OTP sent.");
      setOtp(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1***$2");

  return (
    <div
      className="container py-5 d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div className="glass-card p-5 w-100 animate-fade-in" style={{ maxWidth: "460px" }}>
        <div
          className="mx-auto mb-4 d-flex align-items-center justify-content-center bg-soft-blue rounded-circle"
          style={{ width: "72px", height: "72px" }}
        >
          <HiOutlineShieldCheck size={36} className="text-primary" />
        </div>

        {step === "email" ? (
          <>
            <h2 className="fw-bold heading-gradient text-center mb-2">Forgot Password</h2>
            <p className="text-muted text-center mb-4">
              Enter your registered email. We will send a 6-digit OTP to verify your identity.
            </p>
            <form onSubmit={handleSendOtp}>
              <div className="mb-4">
                <label className="form-label fw-semibold">Email Address</label>
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
              <button
                type="submit"
                className="btn btn-premium btn-primary-premium w-100 py-3 mb-3"
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="fw-bold heading-gradient text-center mb-2">Verify OTP</h2>
            <p className="text-muted text-center mb-1">OTP sent to</p>
            <p className="fw-semibold text-center mb-4 d-flex align-items-center justify-content-center gap-2">
              <HiOutlineMail className="text-primary" size={18} />
              {maskedEmail}
            </p>
            <form onSubmit={handleVerifyOtp}>
              <div className="d-flex justify-content-center gap-2 mb-4" onPaste={handlePaste}>
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
                      border: digit ? "2px solid var(--primary, #4f46e5)" : "2px solid #e2e8f0",
                      borderRadius: "12px",
                      outline: "none",
                      background: digit ? "#eef2ff" : "#f8fafc",
                    }}
                  />
                ))}
              </div>
              <button
                type="submit"
                className="btn btn-premium btn-primary-premium w-100 py-3 mb-3"
                disabled={loading || otp.join("").length < OTP_LENGTH}
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>
            <div className="text-center mb-3">
              {canResend ? (
                <button
                  type="button"
                  className="btn btn-link text-primary fw-semibold text-decoration-none p-0"
                  onClick={handleResend}
                  disabled={resendLoading}
                >
                  {resendLoading ? "Sending..." : "Resend OTP"}
                </button>
              ) : (
                <p className="text-muted small mb-0">
                  Resend OTP in <span className="fw-bold text-primary">{countdown}s</span>
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setStep("email");
                setOtp(Array(OTP_LENGTH).fill(""));
              }}
            >
              Change Email
            </button>
          </>
        )}

        <p className="text-center text-muted small mt-4 mb-0">
          Remember your password?{" "}
          <Link to="/login" className="text-primary fw-semibold text-decoration-none">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
