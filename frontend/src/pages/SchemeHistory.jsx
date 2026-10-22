import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../utils/translations";
import {
    HiOutlineClipboardList,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineXCircle,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineSearch,
    HiOutlineRefresh,
    HiOutlineDocumentText,
} from "react-icons/hi";

const STATUS_CONFIG = {
    Approved: {
        badge: "bg-success text-white",
        icon: <HiOutlineCheckCircle size={14} />,
        row: "table-success",
    },
    Rejected: {
        badge: "bg-danger text-white",
        icon: <HiOutlineXCircle size={14} />,
        row: "table-danger",
    },
    "Under Review": {
        badge: "bg-warning text-dark",
        icon: <HiOutlineClock size={14} />,
        row: "",
    },
    "Document Verification": {
        badge: "bg-info text-white",
        icon: <HiOutlineDocumentText size={14} />,
        row: "table-info",
    },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status] || {
        badge: "bg-secondary text-white",
        icon: <HiOutlineClock size={14} />,
        row: "",
    };

const SchemeHistory = () => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = translations[language] || translations.en;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const fetchHistory = useCallback(
        async (pageNum = 1) => {
            if (!user?.token) return;
            setLoading(true);
            setError(null);
            try {
                const { data: res } = await axios.get(
                    `http://localhost:5000/api/auth/history?page=${pageNum}&limit=8`,
                    { headers: { Authorization: `Bearer ${user.token}` } }
                );
                setData(res);
                setPage(pageNum);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load history.");
            } finally {
                setLoading(false);
            }
        },
        [user]
    );

    useEffect(() => {
        fetchHistory(1);
    }, [fetchHistory]);

    if (!user)
        return (
            <div className="container py-5 text-center">
                <p className="text-muted">Please log in to view your scheme history.</p>
                <Link to="/login" className="btn btn-primary rounded-pill px-4">
                    Login
                </Link>
            </div>
        );

    // Client-side filter on already-fetched page
    const allApps = data?.applications || [];
    const filtered = allApps.filter((app) => {
        const matchSearch =
            search.trim() === "" ||
            app.schemeName?.toLowerCase().includes(search.toLowerCase()) ||
            app.trackingNumber?.toLowerCase().includes(search.toLowerCase());
        const matchStatus =
            statusFilter === "All" || app.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const stats = data?.stats || { total: 0, approved: 0, rejected: 0, pending: 0 };
    const pagination = data?.pagination || {};

    const statCards = [
        {
            label: "Total Applications",
            value: stats.total,
            icon: <HiOutlineClipboardList size={28} />,
            bg: "bg-soft-blue",
            text: "text-primary",
            border: "border-primary",
        },
        {
            label: "Approved",
            value: stats.approved,
            icon: <HiOutlineCheckCircle size={28} />,
            bg: "bg-soft-green",
            text: "text-success",
            border: "border-success",
        },
        {
            label: "Pending / Under Review",
            value: stats.pending,
            icon: <HiOutlineClock size={28} />,
            bg: "bg-soft-orange",
            text: "text-warning",
            border: "border-warning",
        },
        {
            label: "Rejected",
            value: stats.rejected,
            icon: <HiOutlineXCircle size={28} />,
            bg: "bg-soft-red",
            text: "text-danger",
            border: "border-danger",
        },
    ];

    return (
        <div className="container-fluid py-4 px-md-5 animate-fade-in text-start">
            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                <div>
                    <h1 className="fw-bold heading-gradient mb-1">Scheme History</h1>
                    <p className="text-muted mb-0">
                        Track all government scheme applications linked to your account.
                    </p>
                </div>
                <button
                    className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2 px-4"
                    onClick={() => fetchHistory(page)}
                    disabled={loading}
                >
                    <HiOutlineRefresh className={loading ? "spin" : ""} size={16} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4">
                {statCards.map((s) => (
                    <div className="col-6 col-md-3" key={s.label}>
                        <div
                            className={`gov-card p-3 d-flex align-items-center gap-3 border-start border-4 ${s.border} h-100`}
                        >
                            <div className={`p-2 rounded-circle ${s.bg} ${s.text}`}>{s.icon}</div>
                            <div>
                                <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: "11px" }}>
                                    {s.label}
                                </div>
                                <div className={`fs-3 fw-bold ${s.text}`}>
                                    {loading ? (
                                        <span className="placeholder col-4 rounded"></span>
                                    ) : (
                                        s.value
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="gov-card p-4 mb-4">
                <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
                    {/* Search */}
                    <div className="input-group" style={{ maxWidth: "380px" }}>
                        <span className="input-group-text bg-white border-end-0">
                            <HiOutlineSearch className="text-muted" />
                        </span>
                        <input
                            type="text"
                            className="form-control border-start-0 ps-0"
                            placeholder="Search scheme name or tracking ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                className="btn btn-outline-secondary border-start-0"
                                onClick={() => setSearch("")}
                            >
                                ×
                            </button>
                        )}
                    </div>
                    {/* Status Filter */}
                    <div className="d-flex gap-2 flex-wrap">
                        {["All", "Under Review", "Document Verification", "Approved", "Rejected"].map(
                            (s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                                        statusFilter === s
                                            ? "btn-primary"
                                            : "btn-outline-secondary"
                                    }`}
                                    style={{ fontSize: "13px" }}
                                >
                                    {s}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Table / Cards */}
            <div className="gov-card p-0 overflow-hidden mb-4">
                {loading ? (
                    <div className="p-5 text-center">
                        <div className="spinner-border text-primary" role="status" />
                        <p className="text-muted mt-3 mb-0">Loading your application history...</p>
                    </div>
                ) : error ? (
                    <div className="p-5 text-center text-danger">
                        <HiOutlineXCircle size={40} className="mb-2" />
                        <p className="mb-3">{error}</p>
                        <button className="btn btn-outline-danger rounded-pill px-4" onClick={() => fetchHistory(1)}>
                            Retry
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-5 text-center">
                        <div className="display-4 text-muted opacity-25 mb-3">
                            <HiOutlineClipboardList />
                        </div>
                        {stats.total === 0 ? (
                            <>
                                <h5 className="fw-bold text-dark mb-2">
                                    You have not applied for any schemes yet.
                                </h5>
                                <p className="text-muted mb-4">
                                    Browse eligible schemes and submit your first application today.
                                </p>
                                <Link
                                    to="/schemes"
                                    className="btn btn-premium btn-primary-premium px-5 py-2"
                                >
                                    Explore Schemes
                                </Link>
                            </>
                        ) : (
                            <>
                                <h6 className="fw-bold text-dark mb-1">No results match your filters.</h6>
                                <p className="text-muted small">Try adjusting the search or status filter.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="d-none d-md-block table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr className="text-muted small text-uppercase">
                                        <th className="ps-4 py-3">#</th>
                                        <th className="py-3">Tracking ID</th>
                                        <th className="py-3">Scheme Name</th>
                                        <th className="py-3">Applied On</th>
                                        <th className="py-3 text-end pe-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((app, idx) => {
                                        const cfg = getStatusConfig(app.status);
                                        const rowNum =
                                            (pagination.page - 1) * (pagination.limit || 8) + idx + 1;
                                        return (
                                            <tr key={app._id || app.trackingNumber} className={`border-bottom ${cfg.row}`}>
                                                <td className="ps-4 text-muted small">{rowNum}</td>
                                                <td>
                                                    <span className="badge bg-light text-primary font-monospace p-2 border small">
                                                        {app.trackingNumber}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold text-dark">{app.schemeName}</div>
                                                </td>
                                                <td className="text-muted small">
                                                    {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </td>
                                                <td className="text-end pe-4">
                                                    <span
                                                        className={`badge px-3 py-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-1 ${cfg.badge}`}
                                                    >
                                                        {cfg.icon}
                                                        {app.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="d-md-none p-3 d-flex flex-column gap-3">
                            {filtered.map((app, idx) => {
                                const cfg = getStatusConfig(app.status);
                                return (
                                    <div
                                        key={app._id || app.trackingNumber}
                                        className="border rounded-4 p-3 bg-white shadow-sm"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div className="fw-semibold text-dark">{app.schemeName}</div>
                                            <span
                                                className={`badge px-2 py-1 rounded-pill fw-semibold d-inline-flex align-items-center gap-1 ${cfg.badge}`}
                                                style={{ fontSize: "11px" }}
                                            >
                                                {cfg.icon} {app.status}
                                            </span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="badge bg-light text-primary font-monospace border small">
                                                {app.trackingNumber}
                                            </span>
                                            <span className="text-muted" style={{ fontSize: "12px" }}>
                                                {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {!loading && pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-1">
                    <p className="text-muted small mb-0">
                        Page <strong>{pagination.page}</strong> of{" "}
                        <strong>{pagination.totalPages}</strong> &nbsp;·&nbsp; {pagination.totalRecords}{" "}
                        total records
                    </p>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1"
                            disabled={!pagination.hasPrev}
                            onClick={() => fetchHistory(page - 1)}
                        >
                            <HiOutlineChevronLeft /> Prev
                        </button>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                            .filter(
                                (p) =>
                                    p === 1 ||
                                    p === pagination.totalPages ||
                                    Math.abs(p - pagination.page) <= 1
                            )
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) {
                                    acc.push("...");
                                }
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === "..." ? (
                                    <span key={`ellipsis-${i}`} className="px-2 align-self-center text-muted">
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => fetchHistory(p)}
                                        className={`btn rounded-pill px-3 ${
                                            p === pagination.page
                                                ? "btn-primary"
                                                : "btn-outline-secondary"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        <button
                            className="btn btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1"
                            disabled={!pagination.hasNext}
                            onClick={() => fetchHistory(page + 1)}
                        >
                            Next <HiOutlineChevronRight />
                        </button>
                    </div>
                </div>
            )}

            {/* Spin animation for refresh icon */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 0.8s linear infinite; }
                .bg-soft-orange { background-color: #fff7ed; }
                .bg-soft-red { background-color: #fef2f2; }
            `}</style>
        </div>
    );
};

export default SchemeHistory;
