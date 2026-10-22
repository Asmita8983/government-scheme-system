import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { toast } from "react-toastify";
import { HiOutlineShieldCheck, HiOutlineLockClosed } from "react-icons/hi";

const AdminLogin = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { loginAdmin, admin } = useAdminAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (admin) {
            navigate("/admin-dashboard"); // Use a distinct route for dashboard
        }
    }, [admin, navigate]);

    const submitHandler = async (e) => {
        e.preventDefault();
        try {
            await loginAdmin(username, password);
            toast.success("Administrative clearance granted!");
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
            <div className="gov-card p-5 w-100 animate-fade-in" style={{ maxWidth: "450px" }}>
                <div className="text-center mb-4">
                    <div className="icon-box bg-soft-blue mx-auto mb-3" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                        <HiOutlineShieldCheck />
                    </div>
                    <h2 className="fw-bold heading-gradient">Secure Portal Access</h2>
                    <p className="text-muted">Government Scheme Management Registry</p>
                </div>

                <form onSubmit={submitHandler}>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-uppercase">Admin Username</label>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Authorized ID"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-5">
                        <label className="form-label fw-bold small text-uppercase">Private Key (Password)</label>
                        <div className="position-relative">
                            <input
                                type="password"
                                className="input-premium ps-5"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <HiOutlineLockClosed className="position-absolute text-muted" style={{ left: '15px', top: '15px', fontSize: '1.2rem' }} />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-premium btn-primary-premium w-100 py-3 fs-5">
                        Verify Identity
                    </button>
                </form>

                <div className="mt-5 pt-3 border-top text-center">
                    <p className="small text-muted mb-0">Unauthorized access to this portal is strictly prohibited and monitored as per Government Cyber Policy.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
