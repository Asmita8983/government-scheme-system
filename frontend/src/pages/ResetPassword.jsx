import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineLockClosed } from "react-icons/hi";

const API_URL = "http://localhost:5000/api/auth";
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken || "";
  const email = location.state?.email || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!resetToken) {
      toast.error("Invalid or expired reset session. Please start again.");
      navigate("/forgot-password", { replace: true });
    }
  }, [resetToken, navigate]);

  const validatePassword = (val) => {
    if (!val) {
      setPasswordError("Password is required.");
      return false;
    }
    if (!passwordRegex.test(val)) {
      setPasswordError(
        "Min 8 chars with uppercase, lowercase, number & special character (@$!%*?&)."
      );
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirm = (pass, confirm) => {
    if (!confirm) {
      setConfirmError("Please confirm your password.");
      return false;
    }
    if (pass !== confirm) {
      setConfirmError("Passwords do not match.");
      return false;
    }
    setConfirmError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const passOk = validatePassword(password);
    const confirmOk = validateConfirm(password, confirmPassword);
    if (!passOk || !confirmOk) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/reset-password`, {
        resetToken,
        password,
        confirmPassword,
      });
      toast.success("Password changed successfully! Please log in.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

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
          <HiOutlineLockClosed size={36} className="text-primary" />
        </div>

        <h2 className="fw-bold heading-gradient text-center mb-2">Change Password</h2>
        <p className="text-muted text-center mb-4">
          {email ? `Set a new password for ${email}` : "Set your new password"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">New Password</label>
            <div className="position-relative">
              <input
                type={showPass ? "text" : "password"}
                className={`input-premium w-100 ${passwordError ? "border-danger" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                }}
                onBlur={() => validatePassword(password)}
                required
                autoComplete="new-password"
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
            {passwordError && <small className="text-danger">{passwordError}</small>}
            <small className="text-muted d-block mt-1">
              At least 8 characters, one uppercase, one lowercase, one number and one special character (@$!%*?&).
            </small>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Confirm Password</label>
            <div className="position-relative">
              <input
                type={showConfirm ? "text" : "password"}
                className={`input-premium w-100 ${confirmError ? "border-danger" : ""}`}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) validateConfirm(password, e.target.value);
                }}
                onBlur={() => validateConfirm(password, confirmPassword)}
                required
                autoComplete="new-password"
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
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
              </span>
            </div>
            {confirmError && <small className="text-danger">{confirmError}</small>}
          </div>

          <button
            type="submit"
            className="btn btn-premium btn-primary-premium w-100 py-3"
            disabled={loading}
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>

        <p className="text-center text-muted small mt-4 mb-0">
          <Link to="/login" className="text-primary fw-semibold text-decoration-none">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
