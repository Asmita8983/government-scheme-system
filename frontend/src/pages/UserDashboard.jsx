import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";
import axios from "axios";
import { setCachedSchemes } from "../utils/schemesCache";
import {
    HiOutlineUserCircle,
    HiOutlineClipboardCheck,
    HiOutlineLightBulb,
    HiOutlineDocumentText,
    HiOutlineChevronRight,
    HiOutlineBell,
    HiOutlineShieldCheck
} from "react-icons/hi";

const UserDashboard = () => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = translations[language] || translations.en;
    const [stats, setStats] = useState({
        eligibleCount: 0,
        totalCount: 0,
        matchRate: 0
    });
    const [applications, setApplications] = useState([]);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            let userAppliedSchemeIds = [];
            if (user.applications?.length) {
                setApplications(user.applications);
                userAppliedSchemeIds = user.applications.map((app) => app.schemeId);
            }

            const payload = user?.profile || {};
            const config = user?.token
                ? { headers: { Authorization: `Bearer ${user.token}` } }
                : {};
            const { data } = await axios.post(
                "http://localhost:5000/api/schemes/check-eligibility",
                payload,
                config
            );
            setCachedSchemes(user, data);
            const eligible = data.filter(s => s.eligible).length;
            setStats({
                eligibleCount: eligible,
                totalCount: data.length,
                matchRate: data.length > 0 ? Math.round((eligible / data.length) * 100) : 0
            });

            // Calculate Dynamic Notification Alerts
            const activeAlerts = [];
            data.forEach(scheme => {
                if (scheme.eligible && !userAppliedSchemeIds.includes(scheme._id)) {
                    if (scheme.deadline) {
                        const daysLeft = Math.ceil((new Date(scheme.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                        if (daysLeft < 0) {
                            // Expired
                        } else if (daysLeft <= 7) {
                            activeAlerts.push({
                                type: "critical",
                                message: `⚠️ Urgent Reminder: '${scheme.name}' closes in ${daysLeft} days! File your application now to claim the benefit.`,
                                link: "/schemes"
                            });
                        } else {
                            activeAlerts.push({
                                type: "info",
                                message: `📅 Deadline Alert: Apply for '${scheme.name}' before ${new Date(scheme.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`,
                                link: "/schemes"
                            });
                        }
                    } else {
                        activeAlerts.push({
                            type: "recommendation",
                            message: `✨ Scheme Match: You are fully eligible for the '${scheme.name}' program.`,
                            link: "/schemes"
                        });
                    }
                }
            });
            setAlerts(activeAlerts.slice(0, 3));
        } catch (err) {
            console.error(err);
        }
    };

    if (!user) return <div className="container py-5 text-center">Identity Verification Required...</div>;

    return (
        <div className="container-fluid py-4 px-md-5 animate-fade-in text-start">
            {/* Welcome Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                <div>
                    <div className="d-flex align-items-center gap-3 mb-1">
                        <div className="rounded-circle d-flex align-items-center justify-content-center overflow-hidden border border-2 border-primary"
                            style={{ width: "50px", height: "50px", backgroundColor: user.profilePicture ? 'transparent' : '#e0e7ff' }}>
                            {user.profilePicture ? (
                                <img src={user.profilePicture.startsWith('http') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`} alt="Avatar" className="w-100 h-100 object-fit-cover" />
                            ) : (
                                <span className="text-primary fw-bold fs-5">{user.name?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <h1 className="fw-bold heading-gradient mb-0">{t.dashboardWelcome}, {user.name}</h1>
                    </div>
                    <p className="text-muted mb-0">{t.dashboardSubtitle}</p>
                </div>
                <div className="d-flex gap-3">
                    <div className="glass-card px-4 py-2 d-flex align-items-center gap-3 position-relative">
                        <div className="bg-soft-blue p-2 rounded-circle">
                            <HiOutlineBell className={alerts.some(a => a.type === "critical") ? "animate-bounce text-danger" : "text-primary"} />
                            {alerts.length > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: "10px" }}>
                                    {alerts.length}
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="small text-muted fw-bold">{t.dashboardNotifications}</div>
                            <div className="text-primary small fw-bold">
                                {alerts.length > 0 ? `${alerts.length} Pending Alerts` : t.dashboardNewUpdates}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dynamic Alerts Tray */}
            {alerts.length > 0 && (
                <div className="mb-4 d-flex flex-column gap-3">
                    {alerts.map((alert, idx) => (
                        <div 
                            key={idx} 
                            className={`d-flex align-items-center justify-content-between p-3 rounded-4 shadow-sm border animate-fade-in ${
                                alert.type === "critical" 
                                    ? "bg-soft-red border-danger text-danger" 
                                    : alert.type === "info" 
                                    ? "bg-soft-orange border-warning text-dark" 
                                    : "bg-soft-green border-success text-success"
                            }`}
                            style={{ 
                                transition: "all 0.3s ease",
                                borderLeft: alert.type === "critical" ? "6px solid #dc3545" : alert.type === "info" ? "6px solid #f97316" : "6px solid #10b981",
                                fontWeight: "500"
                            }}
                        >
                            <div className="d-flex align-items-center gap-2.5">
                                <HiOutlineBell className={`flex-shrink-0 ${alert.type === "critical" ? "animate-pulse" : ""}`} size={20} />
                                <span className="small">{alert.message}</span>
                            </div>
                            <Link 
                                to={alert.link} 
                                className={`btn btn-sm px-3 rounded-pill fw-bold flex-shrink-0 text-white ${
                                    alert.type === "critical" 
                                        ? "btn-danger" 
                                        : alert.type === "info" 
                                        ? "btn-warning" 
                                        : "btn-success"
                                }`}
                                style={{ fontSize: "11px" }}
                            >
                                Apply Now
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="stat-card gov-card p-4">
                        <div className="icon-box bg-soft-green"><HiOutlineClipboardCheck /></div>
                        <div>
                            <div className="text-muted small fw-bold">{t.dashboardEligibleSchemes}</div>
                            <div className="fs-2 fw-bold">{stats.eligibleCount}</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card gov-card p-4">
                        <div className="icon-box bg-soft-blue"><HiOutlineDocumentText /></div>
                        <div>
                            <div className="text-muted small fw-bold">{t.dashboardAvailableRegistry}</div>
                            <div className="fs-2 fw-bold">{stats.totalCount}</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-card gov-card p-4">
                        <div className="icon-box bg-soft-purple"><HiOutlineShieldCheck /></div>
                        <div>
                            <div className="text-muted small fw-bold">{t.dashboardMatchRate}</div>
                            <div className="fs-2 fw-bold">{stats.matchRate}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Main Content */}
                <div className="col-lg-8">
                    <div className="gov-card p-4 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold mb-0">{t.dashboardRecActions}</h4>
                            <Link to="/schemes" className="btn btn-link text-primary text-decoration-none fw-bold small">{t.dashboardViewAll} <HiOutlineChevronRight /></Link>
                        </div>

                        <div className="d-grid gap-3">
                            <div className="p-3 border rounded-4 d-flex align-items-center justify-content-between hover-shadow transition-all bg-white">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-soft-blue p-3 rounded-3"><HiOutlineLightBulb size={24} /></div>
                                    <div>
                                        <h6 className="fw-bold mb-1">{t.dashboardOptimizeElig}</h6>
                                        <p className="small text-muted mb-0">{t.dashboardOptimizeDesc}</p>
                                    </div>
                                </div>
                                <Link to="/profile" className="btn btn-outline-primary btn-sm rounded-pill px-4">{t.dashboardUpdateBtn}</Link>
                            </div>

                            <div className="p-3 border rounded-4 d-flex align-items-center justify-content-between hover-shadow transition-all bg-white">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-soft-green p-3 rounded-3"><HiOutlineDocumentText size={24} /></div>
                                    <div>
                                        <h6 className="fw-bold mb-1">{t.dashboardNewSchemeAlert}</h6>
                                        <p className="small text-muted mb-0">{t.dashboardNewSchemeDesc}</p>
                                    </div>
                                </div>
                                <Link to="/schemes" className="btn btn-outline-success btn-sm rounded-pill px-4">{t.dashboardCheckBtn}</Link>
                            </div>
                        </div>
                    </div>

                    <div className="gov-card p-4">
                        <h4 className="fw-bold mb-4">{t.dashboardAppProgress}</h4>
                        {applications && applications.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-borderless align-middle mb-0">
                                    <thead>
                                        <tr className="text-muted small text-uppercase">
                                            <th>Scheme Name</th>
                                            <th>Applied Date</th>
                                            <th>Tracking ID</th>
                                            <th className="text-end">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {applications.map((app) => (
                                            <tr key={app._id || app.trackingNumber} className="border-bottom">
                                                <td>
                                                    <div className="fw-bold text-dark">{app.schemeName}</div>
                                                </td>
                                                <td className="small text-muted">
                                                    {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-primary font-monospace p-2 border">
                                                        {app.trackingNumber}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className={`badge px-3 py-2 rounded-pill fw-bold ${
                                                        app.status === "Approved" 
                                                            ? "bg-success text-white" 
                                                            : app.status === "Rejected"
                                                                ? "bg-danger text-white"
                                                                : "bg-warning text-dark"
                                                    }`}>
                                                        {app.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <div className="display-4 text-muted opacity-25 mb-3"><HiOutlineClipboardCheck /></div>
                                <p className="text-muted">{t.dashboardNoAppYet}</p>
                                <Link to="/schemes" className="btn btn-premium btn-primary-premium px-5 py-3 mt-3">{t.dashboardExploreNow}</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="col-lg-4">
                    <div className="glass-card p-4 mb-4">
                        <h5 className="fw-bold mb-4">{t.dashboardProfileMaturity}</h5>
                        <div className="text-center mb-4">
                            <div className="position-relative d-inline-block">
                                <svg width="120" height="120">
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--primary)" strokeWidth="8"
                                        strokeDasharray="339.29" strokeDashoffset={339.29 * (1 - (user.profile ? 0.75 : 0.2))}
                                        strokeLinecap="round" />
                                </svg>
                                <div className="position-absolute top-50 start-50 translate-middle">
                                    <span className="fw-bold fs-4">{user.profile ? "75%" : "20%"}</span>
                                </div>
                            </div>
                        </div>
                        <p className="small text-muted text-center mb-4">{t.dashboardProfileMaturityDesc}</p>
                        <button className="btn btn-light w-100 border rounded-3 py-2 fw-bold small">{t.dashboardUploadDocsBtn}</button>
                    </div>

                    <div className="gov-card p-4 bg-primary text-white overflow-hidden position-relative">
                        <div className="position-relative z-1">
                            <h5 className="fw-bold mb-3">{t.dashboardSupportTitle}</h5>
                            <p className="small opacity-75 mb-4">{t.dashboardSupportDesc}</p>
                            <button className="btn btn-light text-primary fw-bold w-100 py-2" onClick={() => document.querySelector('.floating-btn')?.click()}>{t.dashboardStartChat}</button>
                        </div>
                        <div className="position-absolute bottom-0 end-0 opacity-10" style={{ transform: 'translate(20%, 20%) rotate(-15deg)' }}>
                            <HiOutlineUserCircle size={150} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
