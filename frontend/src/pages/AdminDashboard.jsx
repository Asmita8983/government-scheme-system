import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAdminAuth } from "../context/AdminAuthContext";
import { toast } from "react-toastify";
import {
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlinePencil,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineRefresh,
  HiOutlineChartBar,
  HiOutlineCollection,
  HiOutlineDownload,
  HiOutlineDocumentSearch,
  HiOutlineCog,
  HiOutlineCloudUpload,
  HiOutlineUserGroup,
  HiOutlineLogout,
  HiOutlineClipboardList,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineSearch,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineFilter
} from "react-icons/hi";

const AdminDashboard = () => {
  const { admin, loading: authLoading, logoutAdmin } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | manage | analytics | createscheme | upload | staff
  const [staff, setStaff] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // ── Scheme Applications (manage tab) ─────────────────────────────────────
  const [appData,        setAppData]        = useState(null);
  const [appLoading,     setAppLoading]     = useState(false);
  const [appPage,        setAppPage]        = useState(1);
  const [appSearch,      setAppSearch]      = useState("");
  const [appStatusFilter,setAppStatusFilter]= useState("All");
  const [expandedRow,    setExpandedRow]    = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    benefit: "",
    ageMin: "",
    ageMax: "",
    incomeMax: "",
    gender: "Any",
    category: "Any",
    education: "",
    state: "",
    documentsRequired: [],
    applyLink: "",
    deadline: ""
  });

  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (admin && admin.token) {
      fetchSchemes();
      fetchAnalytics();
      fetchStaff();
    }
  }, [admin]);

  const fetchStaff = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${admin.token}` } };
      const { data } = await axios.get("http://localhost:5000/api/admin/all-admins", config);
      setStaff(data);
    } catch (err) {
      console.error("Failed to fetch staff", err);
    }
  };

  // ── Applications fetch ────────────────────────────────────────────────────
  const fetchApplications = useCallback(async (pageNum = 1) => {
    if (!admin?.token) return;
    setAppLoading(true);
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/admin/applications?page=${pageNum}&limit=10`,
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
      setAppData(data);
      setAppPage(pageNum);
    } catch (err) {
      toast.error("Failed to load applications: " + (err.response?.data?.message || err.message));
    } finally {
      setAppLoading(false);
    }
  }, [admin]);

  const handleStatusUpdate = async (userId, applicationId, newStatus) => {
    setUpdatingStatus(applicationId?.toString());
    try {
      await axios.put(
        "http://localhost:5000/api/admin/applications/status",
        { userId, applicationId, status: newStatus },
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
      toast.success(`Status updated to "${newStatus}"`);
      fetchApplications(appPage);
    } catch (err) {
      toast.error("Update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    if (activeTab === "manage" && admin?.token) {
      fetchApplications(1);
      setAppSearch("");
      setAppStatusFilter("All");
      setExpandedRow(null);
    }
  }, [activeTab, fetchApplications, admin]);

  const fetchAnalytics = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${admin.token}` } };
      const { data } = await axios.get("http://localhost:5000/api/analytics/admin", config);
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${admin.token}` } };
      const { data: users } = await axios.get("http://localhost:5000/api/admin/users", config);

      if (!users || users.length === 0) return toast.info("No user data to export");

      // Simple CSV generation
      const headers = ["Name", "Email", "Mobile", "Age", "Gender", "Income", "State", "District", "Aadhaar Verified"];
      const rows = users.map(u => [
        u.name,
        u.email,
        u.mobileNumber || "N/A",
        u.age || "N/A",
        u.gender || "N/A",
        u.income || "N/A",
        u.state || "N/A",
        u.district || "N/A",
        u.documents?.some(d => d.verified) ? "Yes" : "No"
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `citizen_report_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Citizen report exported successfully!");
    } catch (err) {
      toast.error("Export failed: " + err.message);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setLoadingInsights(true);
      const config = { headers: { Authorization: `Bearer ${admin.token}` } };
      const { data } = await axios.get("http://localhost:5000/api/analytics/admin/ai-insights", config);
      if (data.success) {
        setAiInsights(data.report);
        toast.success("AI Strategic Analysis Generated");
      }
    } catch (err) {
      toast.error("Failed to generate AI insights: " + err.message);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchSchemes = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${admin.token}` } };
      const { data } = await axios.get("http://localhost:5000/api/schemes/admin/all", config);
      setSchemes(data);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to fetch schemes";
      toast.error(message);
    }
  };

  const handleAnalyzePDF = async () => {
    if (!file) return toast.warning("Please select a PDF file first");
    setAnalyzing(true);
    try {
      const data = new FormData();
      data.append("pdf", file);
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${admin.token}`
        }
      };

      // 1. Bulk Analyze PDF
      toast.info("Processing long document (200+ pages). This may take up to 5 minutes...");
      const { data: result } = await axios.post("http://localhost:5000/api/schemes/analyze-pdf", data, {
        ...config,
        timeout: 600000 // 10 minutes timeout
      });
      const schemesFound = result.schemes || [];

      if (schemesFound.length === 0) {
        throw new Error("AI could not detect any valid schemes in this document.");
      }

      // 2. Automatically Save All Found Schemes to DB
      const createConfig = { headers: { Authorization: `Bearer ${admin.token}` } };
      let savedCount = 0;

      for (const extracted of schemesFound) {
        try {
          // Sending the extracted object directly as it now contains the rules sub-object
          await axios.post("http://localhost:5000/api/schemes/create", extracted, createConfig);
          savedCount++;
        } catch (err) {
          console.error(`Failed to save scheme: ${extracted.name}`, err);
        }
      }

      toast.success(`Success: ${savedCount} new schemes have been extracted and registered!`);

      // 3. Reset and Refresh
      resetForm();
      fetchSchemes();
      setActiveTab("overview");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Bulk processing failed";
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${admin.token}` } };

      if (isEditing) {
        await axios.put(`http://localhost:5000/api/schemes/update/${editId}`, formData, config);
        toast.success("Scheme updated successfully!");
      } else {
        await axios.post("http://localhost:5000/api/schemes/create", formData, config);
        toast.success("New scheme created!");
      }

      resetForm();
      fetchSchemes();
    } catch (err) {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (scheme) => {
    setIsEditing(true);
    setEditId(scheme._id);
    setFormData({
      name: scheme.name,
      description: scheme.description,
      benefit: scheme.benefit,
      ageMin: scheme.rules?.ageMin || "",
      ageMax: scheme.rules?.ageMax || "",
      incomeMax: scheme.rules?.incomeMax || "",
      gender: scheme.rules?.gender || "Any",
      category: scheme.rules?.category || "Any",
      education: scheme.rules?.education || "",
      state: scheme.rules?.state || "",
      applyLink: scheme.applyLink || "",
      deadline: scheme.deadline || ""
    });
    window.scrollTo(0, 0);
  };

  const toggleStatus = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${admin.token}` } };
      await axios.patch(`http://localhost:5000/api/schemes/toggle/${id}`, {}, config);
      fetchSchemes();
      toast.info("Scheme status toggled");
    } catch (err) {
      toast.error("Toggle failed");
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: "", description: "", benefit: "",
      ageMin: "", ageMax: "", incomeMax: "",
      gender: "Any", category: "Any", education: "", state: "",
      documentsRequired: [], applyLink: "", deadline: ""
    });
    setFile(null);
  };

  if (authLoading) return <div className="container py-5 text-center">Verifying Security Clearance...</div>;

  if (!admin) {
    return (
      <div className="container py-5 text-center">
        <h2 className="text-danger">Access Denied</h2>
        <p className="text-muted">Unauthorized access to Command Center is prohibited.</p>
        <button className="btn btn-primary" onClick={() => window.location.href = "/admin"}>Identity Verification</button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-md-5 animate-fade-in text-start">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 gap-3">
        <div>
          <h1 className="fw-bold heading-gradient mb-1">Government Command Center</h1>
          <p className="text-muted mb-0">Portal of Public Welfare Services & Scheme Administration</p>
        </div>
        <div className="d-flex gap-3">
          <div className="glass-card px-3 py-2 d-flex align-items-center gap-2">
            <div className="bg-soft-green p-2 rounded-circle"><HiOutlineChartBar /></div>
            <div>
              <div className="small text-muted fw-bold">SYSTEM STATUS</div>
              <div className="text-success small fw-bold">OPERATIONAL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-5">
        <div className="col-md-3">
          <div className="stat-card gov-card">
            <div className="icon-box bg-soft-blue"><HiOutlineCollection /></div>
            <div>
              <div className="text-muted small fw-bold">TOTAL SCHEMES</div>
              <div className="fs-3 fw-bold">{schemes.length}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card gov-card">
            <div className="icon-box bg-soft-green"><HiOutlineEye /></div>
            <div>
              <div className="text-muted small fw-bold">ACTIVE</div>
              <div className="fs-3 fw-bold">{schemes.filter(s => s.isActive).length}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card gov-card">
            <div className="icon-box bg-soft-purple"><HiOutlineDocumentSearch /></div>
            <div>
              <div className="text-muted small fw-bold">TOTAL SESSIONS</div>
              <div className="fs-3 fw-bold">{analyticsData?.totalSessions || 0}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card gov-card">
            <div className="icon-box bg-soft-orange"><HiOutlineChartBar /></div>
            <div>
              <div className="text-muted small fw-bold">TOTAL CLICKS</div>
              <div className="fs-3 fw-bold">
                {analyticsData?.popularContent?.reduce((acc, curr) => acc + curr.clicks, 0) || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Sidebar Navigation */}
        <div className="col-lg-3 mb-4">
          <div className="sidebar-nav glass-card p-3">
            <h6 className="text-muted small fw-bold mb-4 px-3">ADMINISTRATION</h6>
            <button
              onClick={() => setActiveTab("overview")}
              className={`nav-item-dashboard w-100 border-0 text-start bg-transparent ${activeTab === "overview" ? "active" : ""}`}
            >
              <HiOutlineChartBar size={20} /> Dashboard Overview
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`nav-item-dashboard w-100 border-0 text-start bg-transparent ${activeTab === "manage" ? "active" : ""}`}
            >
              <HiOutlineClipboardList size={20} /> Manage Applications
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`nav-item-dashboard w-100 border-0 text-start bg-transparent ${activeTab === "analytics" ? "active" : ""}`}
            >
              <HiOutlineChartBar size={20} /> User Analytics
            </button>
            <button
              onClick={() => setActiveTab("createscheme")}
              className={`nav-item-dashboard w-100 border-0 text-start bg-transparent ${activeTab === "createscheme" ? "active" : ""}`}
            >
              <HiOutlinePlus size={20} /> Create New Scheme
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`nav-item-dashboard w-100 border-0 text-start bg-transparent ${activeTab === "upload" ? "active" : ""}`}
            >
              <HiOutlineCloudUpload size={20} /> AI PDF Extraction
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`nav-item-dashboard w-100 border-0 text-start bg-transparent ${activeTab === "staff" ? "active" : ""}`}
            >
              <HiOutlineUserGroup size={20} /> Administrative Staff
            </button>
            <hr className="mx-3 my-4" />
            <h6 className="text-muted small fw-bold mb-4 px-3">SYSTEM</h6>
            <button className="nav-item-dashboard w-100 border-0 text-start bg-transparent">
              <HiOutlineCog size={20} /> Settings
            </button>
            <button
              onClick={logoutAdmin}
              className="nav-item-dashboard w-100 border-0 text-start bg-transparent text-danger mt-auto"
            >
              <HiOutlineLogout size={20} /> Sign Out
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-lg-9">
          {activeTab === "overview" && (
            <div className="animate-fade-in">
              <h4 className="section-title">Central Scheme Registry</h4>
              <div className="row g-3">
                {schemes.map(scheme => (
                  <div key={scheme._id} className="col-12">
                    <div className="gov-card p-4">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex gap-3">
                          <div className={`p-3 rounded-4 ${scheme.isActive ? 'bg-soft-green' : 'bg-soft-orange'}`}>
                            <HiOutlineDocumentText size={24} />
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h5 className="fw-bold mb-0">{scheme.name}</h5>
                              <span className={scheme.isActive ? 'badge-active' : 'badge-inactive'}>
                                {scheme.isActive ? 'LIVE' : 'DISABLED'}
                              </span>
                            </div>
                            <p className="text-muted mb-3">{scheme.description.substring(0, 120)}...</p>
                            <div className="d-flex gap-4">
                              <div className="small"><span className="text-muted">Benefit:</span> <span className="fw-bold">{scheme.benefit}</span></div>
                              <div className="small"><span className="text-muted">Target:</span> <span className="fw-bold">{scheme.rules?.category || 'All'}</span></div>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-light p-2 rounded-3 border"
                            onClick={() => {
                              handleEdit(scheme);
                              setActiveTab("createscheme");
                            }}
                          >
                            <HiOutlinePencil size={18} />
                          </button>
                          <button
                            className={`btn btn-sm p-2 rounded-3 border ${scheme.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => toggleStatus(scheme._id)}
                          >
                            {scheme.isActive ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === "createscheme" || activeTab === "upload") && (
            <div className="animate-fade-in">
              <div className="gov-card p-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold mb-0">{isEditing ? "Modify Scheme Registry" : "Registry Induction Form"}</h4>
                  {isEditing && <button className="btn btn-outline-secondary btn-sm" onClick={resetForm}>Exit Edit Mode</button>}
                </div>

                {activeTab === "upload" && !isEditing && (
                  <div className="mb-5">
                    <div className="upload-area p-5" onClick={() => document.getElementById('pdfInput').click()}>
                      <input
                        id="pdfInput"
                        type="file"
                        className="d-none"
                        onChange={(e) => setFile(e.target.files[0])}
                        accept=".pdf"
                      />
                      <HiOutlineCloudUpload size={48} className="text-primary mb-3" />
                      <h5>{file ? file.name : "A.I. Smart Inspection Service"}</h5>
                      <p className="text-muted">Upload a gazette or scheme PDF to auto-populate the registration form</p>
                      {file && (
                        <button
                          className="btn btn-premium btn-primary-premium mt-3"
                          onClick={(e) => { e.stopPropagation(); handleAnalyzePDF(); }}
                          disabled={analyzing}
                        >
                          {analyzing ? <HiOutlineRefresh className="animate-spin" /> : <HiOutlineDocumentSearch />} Initiate Analysis
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={submitHandler}>
                  <div className="row g-4">
                    <div className="col-12">
                      <label className="form-label fw-bold small text-uppercase">Scheme Official Title</label>
                      <input type="text" className="input-premium" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., National Urban Livelihood Mission" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-uppercase">Resource Allocation (Benefit)</label>
                      <input type="text" className="input-premium" value={formData.benefit} onChange={(e) => setFormData({ ...formData, benefit: e.target.value })} required placeholder="e.g., ₹2,50,000 Direct Credit" />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small text-uppercase">Application Link (Official URL)</label>
                      <input type="url" className="input-premium" value={formData.applyLink} onChange={(e) => setFormData({ ...formData, applyLink: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small text-uppercase">Min Age</label>
                      <input type="number" className="input-premium" value={formData.ageMin} onChange={(e) => setFormData({ ...formData, ageMin: e.target.value })} placeholder="18" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small text-uppercase">Max Income (Annual)</label>
                      <input type="number" className="input-premium" value={formData.incomeMax} onChange={(e) => setFormData({ ...formData, incomeMax: e.target.value })} placeholder="800000" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold small text-uppercase">Application Deadline</label>
                      <input type="date" className="input-premium" value={formData.deadline ? formData.deadline.substring(0, 10) : ""} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small text-uppercase">Executive Summary</label>
                      <textarea className="input-premium" rows="4" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required placeholder="Describe the purpose and scope of this scheme..."></textarea>
                    </div>
                    <div className="col-12 text-end">
                      <button type="submit" className="btn btn-premium btn-primary-premium px-5 py-3" disabled={loading}>
                        {loading ? <HiOutlineRefresh className="animate-spin" /> : <HiOutlinePlus />} {isEditing ? "Update Official Registry" : "Induct into Registry"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "analytics" && analyticsData && (
            <div className="animate-fade-in">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="section-title fw-bold mb-0">Traffic & Interaction Analysis</h4>
                <button
                  onClick={handleExportCSV}
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-3"
                >
                  <HiOutlineDownload /> Export Citizen Registry (CSV)
                </button>
              </div>

              <div className="row g-4 mb-5">
                <div className="col border-0">
                  <div className="stat-card gov-card text-center p-4 h-100 shadow-sm border">
                    <h3 className="display-6 text-primary fw-bold mb-1">{analyticsData.totalSessions}</h3>
                    <p className="text-muted small fw-bold mb-0">TOTAL VISITS</p>
                  </div>
                </div>
                <div className="col border-0">
                  <div className="stat-card gov-card text-center p-4 h-100 shadow-sm border">
                    <h3 className="display-6 text-success fw-bold mb-1">{analyticsData.totalUsers || 0}</h3>
                    <p className="text-muted small fw-bold mb-0">REGISTERED CITIZENS</p>
                  </div>
                </div>
                <div className="col border-0">
                  <div className="stat-card gov-card text-center p-4 h-100 shadow-sm border">
                    <h3 className="display-6 text-purple fw-bold mb-1" style={{ color: "#a855f7" }}>{analyticsData.totalAppsCount || 0}</h3>
                    <p className="text-muted small fw-bold mb-0">SCHEME FILINGS</p>
                  </div>
                </div>
                <div className="col border-0">
                  <div className="stat-card gov-card text-center p-4 h-100 shadow-sm border">
                    <h3 className="display-6 text-warning fw-bold mb-1">{Math.round((analyticsData.avgDuration || 0) / 60)}m</h3>
                    <p className="text-muted small fw-bold mb-0">AVG DURATION</p>
                  </div>
                </div>
                <div className="col border-0">
                  <div className="stat-card gov-card text-center p-4 h-100 shadow-sm border">
                    <h3 className="display-6 text-info fw-bold mb-1">{analyticsData.activeSessionsLast24h}</h3>
                    <p className="text-muted small fw-bold mb-0">VISITS (24H)</p>
                  </div>
                </div>
              </div>

              {/* USER SESSION TRACKING MODULE */}
              <div className="gov-card p-4 mb-5 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0 text-primary">Live User Session History</h5>
                  <span className="badge bg-soft-primary text-primary px-3 py-2 rounded-pill">Real-time Monitoring</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-bold text-secondary small text-uppercase">Session Token</th>
                        <th className="fw-bold text-secondary small text-uppercase">Time Spent On Site</th>
                        <th className="fw-bold text-secondary small text-uppercase">Pages Viewed</th>
                        <th className="fw-bold text-secondary small text-uppercase text-end">Origin Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.recentSessions && analyticsData.recentSessions.length > 0 ? (
                        analyticsData.recentSessions.map((session, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="bg-light p-2 rounded-circle border">
                                  <HiOutlineDocumentSearch className="text-muted" />
                                </div>
                                <span className="font-monospace small text-muted">{session.sessionId.substring(0, 18)}...</span>
                              </div>
                            </td>
                            <td>
                              {session.durationSeconds >= 60 ? (
                                <span className="badge bg-soft-warning text-warning fw-bold px-3 py-2 rounded-pill">
                                  {Math.floor(session.durationSeconds / 60)} min {session.durationSeconds % 60} sec
                                </span>
                              ) : (
                                <span className="badge bg-soft-info text-info fw-bold px-3 py-2 rounded-pill">
                                  {session.durationSeconds} seconds
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="fw-bold text-dark">{session.pagesVisited?.length || 0}</span>
                              <span className="text-muted small ms-1">pages</span>
                            </td>
                            <td className="text-end text-muted small">
                              {new Date(session.startTime).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-muted">No recent sessions mapped.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="gov-card p-4 h-100">
                    <h6 className="fw-bold text-muted mb-4">Monthly User Count</h6>
                    <div className="d-flex flex-column gap-3">
                      {analyticsData.monthStats && analyticsData.monthStats.map((stat) => {
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const maxCount = Math.max(...analyticsData.monthStats.map(m => m.count), 1);
                        const percentage = (stat.count / maxCount) * 100;

                        return (
                          <div key={stat._id} className="w-100">
                            <div className="d-flex justify-content-between mb-1 small">
                              <span className="fw-bold">{monthNames[stat._id - 1]}</span>
                              <span className="text-primary fw-bold">{stat.count} visits</span>
                            </div>
                            <div className="progress" style={{ height: "8px", backgroundColor: "#f1f5f9" }}>
                              <div
                                className="progress-bar bg-primary rounded-pill"
                                role="progressbar"
                                style={{ width: `${percentage}%` }}
                                aria-valuenow={percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                      {(!analyticsData.monthStats || analyticsData.monthStats.length === 0) && (
                        <p className="text-muted text-center py-4">No data available for current period</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="gov-card p-4 h-100">
                    <h6 className="fw-bold text-muted mb-4">Most Clicked Content</h6>
                    <div className="d-flex flex-column gap-3">
                      {analyticsData.popularContent && analyticsData.popularContent.map((item, idx) => {
                        const maxClicks = Math.max(...analyticsData.popularContent.map(p => p.clicks), 1);
                        const percentage = (item.clicks / maxClicks) * 100;

                        return (
                          <div key={idx} className="w-100">
                            <div className="d-flex justify-content-between mb-1 small">
                              <span className="text-truncate fw-medium" title={item._id} style={{ maxWidth: "70%" }}>{item._id}</span>
                              <span className="text-secondary fw-bold">{item.clicks} clicks</span>
                            </div>
                            <div className="progress" style={{ height: "6px", backgroundColor: "#f1f5f9" }}>
                              <div
                                className="progress-bar bg-secondary rounded-pill"
                                role="progressbar"
                                style={{ width: `${percentage}%` }}
                                aria-valuenow={percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                      {(!analyticsData.popularContent || analyticsData.popularContent.length === 0) && (
                        <p className="text-muted text-center py-4">No interactions recorded yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category & Search Terms Metrics */}
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="gov-card p-4 h-100 shadow-sm border">
                    <h6 className="fw-bold text-muted mb-4 text-uppercase tracking-wider">Category-Wise Demographic Split</h6>
                    <div className="d-flex flex-column gap-3">
                      {analyticsData.categoryDistribution && analyticsData.categoryDistribution.map((item, idx) => {
                        const totalCatCount = analyticsData.categoryDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1;
                        const percentage = ((item.count / totalCatCount) * 100).toFixed(1);
                        
                        const colors = ["bg-primary", "bg-success", "bg-info", "bg-warning", "bg-danger", "bg-purple"];
                        const colorClass = colors[idx % colors.length];

                        return (
                          <div key={idx} className="w-100">
                            <div className="d-flex justify-content-between mb-1 small">
                              <span className="fw-bold">{item._id === "Any" || !item._id || item._id === "Unspecified" ? "General / Unspecified" : item._id}</span>
                              <span className="text-muted fw-bold">{item.count} Citizens ({percentage}%)</span>
                            </div>
                            <div className="progress" style={{ height: "10px", backgroundColor: "#f1f5f9" }}>
                              <div
                                className={`progress-bar ${colorClass} rounded-pill`}
                                role="progressbar"
                                style={{ width: `${percentage}%` }}
                                aria-valuenow={percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                      {(!analyticsData.categoryDistribution || analyticsData.categoryDistribution.length === 0) && (
                        <p className="text-muted text-center py-4">No categories mapped yet</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="gov-card p-4 h-100 shadow-sm border">
                    <h6 className="fw-bold text-muted mb-4 text-uppercase tracking-wider">Trending Citizen Search Terms</h6>
                    <div className="d-flex flex-column gap-3">
                      {analyticsData.popularSearches && analyticsData.popularSearches.map((item, idx) => {
                        const maxSearchClicks = Math.max(...analyticsData.popularSearches.map(p => p.count), 1);
                        const percentage = (item.count / maxSearchClicks) * 100;

                        return (
                          <div key={idx} className="w-100">
                            <div className="d-flex justify-content-between mb-1 small">
                              <span className="fw-bold text-primary font-monospace">"{item._id}"</span>
                              <span className="text-secondary fw-bold">{item.count} searches</span>
                            </div>
                            <div className="progress" style={{ height: "6px", backgroundColor: "#f1f5f9" }}>
                              <div
                                className="progress-bar rounded-pill"
                                role="progressbar"
                                style={{ width: `${percentage}%`, backgroundColor: "#c084fc" }}
                                aria-valuenow={percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                      {(!analyticsData.popularSearches || analyticsData.popularSearches.length === 0) && (
                        <p className="text-muted text-center py-4">No keyword searches recorded yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI INSIGHTS SECTION */}
              <div className="gov-card p-4 mt-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h5 className="fw-bold mb-0 text-primary">AI Strategic Operations Analyst</h5>
                    <p className="text-muted small mb-0 mt-1">Generate a comprehensive summary of platform user demographics and interaction behavior</p>
                  </div>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={loadingInsights}
                    className="btn btn-premium btn-primary-premium d-flex align-items-center gap-2"
                  >
                    {loadingInsights ? <HiOutlineRefresh className="animate-spin" /> : <HiOutlineChartBar />}
                    Analyze Live Data
                  </button>
                </div>

                {aiInsights && (
                  <div className="bg-light p-4 rounded border animate-fade-in shadow-sm">
                    <h6 className="fw-bold text-primary mb-3 text-uppercase">Executive Summary</h6>
                    <p className="text-dark small mb-4">{aiInsights.executiveSummary}</p>

                    <div className="row g-4">
                      <div className="col-md-6 border-end">
                        <h6 className="fw-bold text-secondary mb-3 text-uppercase">Behavioral Findings</h6>
                        <ul className="small text-muted mb-0 ps-3">
                          {aiInsights.behavioralInsights?.map((item, idx) => <li key={idx} className="mb-2">{item}</li>)}
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <h6 className="fw-bold text-secondary mb-3 text-uppercase">Demographic Mapping</h6>
                        <ul className="small text-muted mb-0 ps-3">
                          {aiInsights.demographicTrends?.map((item, idx) => <li key={idx} className="mb-2">{item}</li>)}
                        </ul>
                      </div>
                    </div>

                    <hr className="my-4 border-secondary opacity-25" />
                    <div className="row g-4">
                      <div className="col-md-6 border-end">
                        <h6 className="fw-bold text-warning mb-3 text-uppercase">Anomaly Detection</h6>
                        <p className="small text-muted">{aiInsights.anomalyDetection}</p>
                      </div>
                      <div className="col-md-6">
                        <h6 className="fw-bold text-success mb-3 text-uppercase">Strategic Recommendations</h6>
                        <ul className="small text-muted mb-0 ps-3">
                          {aiInsights.strategicRecommendations?.map((item, idx) => <li key={idx} className="mb-2">{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ MANAGE APPLICATIONS TAB ══════════════ */}
          {activeTab === "manage" && (() => {
            const STATUS_CFG = {
              "Approved":              { badge: "bg-success text-white",  dot: "#22c55e" },
              "Rejected":              { badge: "bg-danger text-white",   dot: "#ef4444" },
              "Under Review":          { badge: "bg-warning text-dark",   dot: "#f59e0b" },
              "Document Verification": { badge: "bg-info text-white",     dot: "#06b6d4" },
            };
            const getCfg = (s) => STATUS_CFG[s] || { badge: "bg-secondary text-white", dot: "#94a3b8" };

            const allApps    = appData?.applications || [];
            const stats      = appData?.stats        || { total: 0, approved: 0, rejected: 0, pending: 0 };
            const pagination = appData?.pagination   || {};

            const filtered = allApps.filter(app => {
              const q = appSearch.toLowerCase();
              const matchSearch = !q ||
                app.schemeName?.toLowerCase().includes(q) ||
                app.trackingNumber?.toLowerCase().includes(q) ||
                app.user?.name?.toLowerCase().includes(q) ||
                app.user?.email?.toLowerCase().includes(q);
              const matchStatus = appStatusFilter === "All" || app.status === appStatusFilter;
              return matchSearch && matchStatus;
            });

            const statCards = [
              { label: "Total Filings",  value: stats.total,    icon: <HiOutlineClipboardList size={22}/>, color: "primary", bg: "bg-soft-blue"  },
              { label: "Approved",       value: stats.approved, icon: <HiOutlineCheckCircle  size={22}/>, color: "success", bg: "bg-soft-green" },
              { label: "Under Review",   value: stats.pending,  icon: <HiOutlineClock         size={22}/>, color: "warning", bg: "bg-soft-orange"},
              { label: "Rejected",       value: stats.rejected, icon: <HiOutlineXCircle       size={22}/>, color: "danger",  bg: "bg-soft-red"  },
            ];

            return (
              <div className="animate-fade-in">

                {/* ── Header ── */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                  <div>
                    <h4 className="fw-bold mb-1">Scheme Applications</h4>
                    <p className="text-muted small mb-0">All citizen scheme filings — review details and update approval status.</p>
                  </div>
                  <button
                    className="btn btn-outline-primary rounded-pill px-4 d-flex align-items-center gap-2"
                    onClick={() => fetchApplications(appPage)}
                    disabled={appLoading}
                  >
                    <HiOutlineRefresh size={15} className={appLoading ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>

                {/* ── Stat cards ── */}
                <div className="row g-3 mb-4">
                  {statCards.map(s => (
                    <div className="col-6 col-xl-3" key={s.label}>
                      <div className={`gov-card p-3 d-flex align-items-center gap-3 border-start border-4 border-${s.color} h-100`}>
                        <div className={`p-2 rounded-circle ${s.bg} text-${s.color} flex-shrink-0`}>{s.icon}</div>
                        <div>
                          <div className="text-muted fw-semibold" style={{ fontSize: "11px", textTransform: "uppercase" }}>{s.label}</div>
                          <div className={`fs-3 fw-bold text-${s.color}`}>
                            {appLoading ? <span className="placeholder col-4 rounded bg-secondary" /> : s.value}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Filters ── */}
                <div className="gov-card p-3 mb-4">
                  <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
                    <div className="input-group" style={{ maxWidth: "360px" }}>
                      <span className="input-group-text bg-white border-end-0 rounded-start-pill">
                        <HiOutlineSearch className="text-muted" />
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Search name, email, scheme, tracking ID..."
                        value={appSearch}
                        onChange={e => setAppSearch(e.target.value)}
                        style={{ borderRadius: "0 50px 50px 0" }}
                      />
                      {appSearch && (
                        <button
                          className="btn btn-sm btn-outline-secondary ms-2 rounded-pill px-3"
                          onClick={() => setAppSearch("")}
                        >× Clear</button>
                      )}
                    </div>
                    <div className="d-flex gap-2 flex-wrap align-items-center">
                      <HiOutlineFilter className="text-muted" size={16} />
                      {["All", "Under Review", "Document Verification", "Approved", "Rejected"].map(s => (
                        <button
                          key={s}
                          onClick={() => setAppStatusFilter(s)}
                          className={`btn btn-sm rounded-pill px-3 fw-semibold ${appStatusFilter === s ? "btn-primary" : "btn-outline-secondary"}`}
                          style={{ fontSize: "12px" }}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Table ── */}
                <div className="gov-card p-0 overflow-hidden mb-4">
                  {appLoading ? (
                    <div className="p-5 text-center">
                      <div className="spinner-border text-primary" role="status" />
                      <p className="text-muted mt-3 mb-0 small">Loading application records...</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-5 text-center">
                      <div className="display-4 text-muted opacity-25 mb-3"><HiOutlineClipboardList /></div>
                      {stats.total === 0 ? (
                        <>
                          <h6 className="fw-bold text-dark">No applications filed yet.</h6>
                          <p className="text-muted small">Applications will appear here once citizens apply for schemes.</p>
                        </>
                      ) : (
                        <>
                          <h6 className="fw-bold text-dark">No results match your filters.</h6>
                          <p className="text-muted small">Try adjusting the search or status filter.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead style={{ backgroundColor: "#f8fafc" }}>
                          <tr>
                            <th className="py-3 ps-4" style={{ width: "36px" }}></th>
                            <th className="py-3 text-muted small fw-bold text-uppercase">ID</th>
                            <th className="py-3 text-muted small fw-bold text-uppercase">User</th>
                            <th className="py-3 text-muted small fw-bold text-uppercase">Scheme</th>
                            <th className="py-3 text-muted small fw-bold text-uppercase">Applied On</th>
                            <th className="py-3 text-muted small fw-bold text-uppercase">Status</th>
                            <th className="py-3 text-muted small fw-bold text-uppercase text-end pe-4">Update Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((app, idx) => {
                            const cfg    = getCfg(app.status);
                            const rowKey = app.applicationId?.toString() || String(idx);
                            const isOpen = expandedRow === rowKey;
                            const serial = (pagination.page - 1) * (pagination.limit || 10) + idx + 1;
                            const trackId = app.trackingNumber || `SCH${String(serial).padStart(5, "0")}`;

                            return (
                              <React.Fragment key={rowKey}>
                                <tr className="border-bottom">
                                  {/* expand toggle */}
                                  <td
                                    className="ps-4 text-center"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                                  >
                                    <button
                                      className="btn btn-sm btn-light border rounded-circle p-0 d-flex align-items-center justify-content-center"
                                      style={{ width: "26px", height: "26px" }}
                                    >
                                      {isOpen
                                        ? <HiOutlineChevronUp size={13} />
                                        : <HiOutlineChevronDown size={13} />}
                                    </button>
                                  </td>

                                  {/* Tracking ID */}
                                  <td
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                                  >
                                    <span className="badge bg-light text-primary border font-monospace px-2 py-1" style={{ fontSize: "11px" }}>
                                      {trackId}
                                    </span>
                                  </td>

                                  {/* User */}
                                  <td
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                                  >
                                    <div className="d-flex align-items-center gap-2">
                                      <div
                                        className="rounded-circle bg-soft-blue text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{ width: "34px", height: "34px", fontSize: "13px" }}
                                      >
                                        {app.user?.name?.charAt(0)?.toUpperCase() || "?"}
                                      </div>
                                      <div>
                                        <div className="fw-semibold text-dark" style={{ fontSize: "14px" }}>{app.user?.name}</div>
                                        <div className="text-muted" style={{ fontSize: "11px" }}>{app.user?.email}</div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Scheme */}
                                  <td
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                                  >
                                    <span className="fw-semibold text-dark" style={{ fontSize: "14px" }}>{app.schemeName}</span>
                                  </td>

                                  {/* Date */}
                                  <td
                                    className="text-muted small"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                                  >
                                    {app.appliedAt
                                      ? new Date(app.appliedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                                      : "—"}
                                  </td>

                                  {/* Status badge */}
                                  <td
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setExpandedRow(isOpen ? null : rowKey)}
                                  >
                                    <span className={`badge px-3 py-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-1 ${cfg.badge}`}>
                                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.6)", display: "inline-block" }} />
                                      {app.status}
                                    </span>
                                  </td>

                                  {/* Status dropdown */}
                                  <td className="text-end pe-4">
                                    <select
                                      className="form-select form-select-sm rounded-pill border-primary text-primary fw-semibold"
                                      style={{ minWidth: "175px", fontSize: "12px", cursor: "pointer" }}
                                      value={app.status}
                                      disabled={updatingStatus === app.applicationId?.toString()}
                                      onChange={e => handleStatusUpdate(app.user._id, app.applicationId, e.target.value)}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <option value="Under Review">Under Review</option>
                                      <option value="Document Verification">Document Verification</option>
                                      <option value="Approved">Approved</option>
                                      <option value="Rejected">Rejected</option>
                                    </select>
                                  </td>
                                </tr>

                                {/* ── Expanded detail row ── */}
                                {isOpen && (
                                  <tr className="border-bottom" style={{ backgroundColor: "#f8fafc" }}>
                                    <td colSpan={7} className="px-4 py-3">
                                      <p className="text-muted fw-bold small text-uppercase mb-3" style={{ letterSpacing: "0.06em" }}>
                                        Citizen Details
                                      </p>
                                      <div className="row g-2">
                                        {[
                                          { label: "Full Name",     value: app.user?.name },
                                          { label: "Email",         value: app.user?.email },
                                          { label: "Mobile",        value: app.user?.mobileNumber },
                                          { label: "Age",           value: app.user?.age },
                                          { label: "Gender",        value: app.user?.gender },
                                          { label: "Category",      value: app.user?.category },
                                          { label: "Annual Income", value: app.user?.income ? `₹${Number(app.user.income).toLocaleString("en-IN")}` : null },
                                          { label: "State",         value: app.user?.state },
                                          { label: "District",      value: app.user?.district },
                                          { label: "Applied At",    value: app.appliedAt ? new Date(app.appliedAt).toLocaleString() : null },
                                        ].map(({ label, value }) => (
                                          <div className="col-6 col-md-4 col-lg-3" key={label}>
                                            <div className="bg-white border rounded-3 px-3 py-2 h-100">
                                              <div className="text-muted" style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>{label}</div>
                                              <div className="fw-semibold text-dark mt-1" style={{ fontSize: "13px" }}>{value || <span className="text-muted fst-italic">N/A</span>}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Pagination ── */}
                {!appLoading && pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center">
                    <p className="text-muted small mb-0">
                      Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
                      &nbsp;·&nbsp; {pagination.totalRecords} total records
                    </p>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1"
                        disabled={!pagination.hasPrev}
                        onClick={() => fetchApplications(appPage - 1)}
                      >
                        <HiOutlineChevronLeft size={14} /> Prev
                      </button>
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) => p === "..."
                          ? <span key={`e${i}`} className="px-2 align-self-center text-muted small">…</span>
                          : <button
                              key={p}
                              onClick={() => fetchApplications(p)}
                              className={`btn btn-sm rounded-pill px-3 ${p === pagination.page ? "btn-primary" : "btn-outline-secondary"}`}
                            >{p}</button>
                        )}
                      <button
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1"
                        disabled={!pagination.hasNext}
                        onClick={() => fetchApplications(appPage + 1)}
                      >
                        Next <HiOutlineChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <style>{`
                  .bg-soft-orange { background-color: #fff7ed; }
                  .bg-soft-red    { background-color: #fef2f2; }
                  @keyframes spin-kw { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
                  .animate-spin   { animation: spin-kw 0.7s linear infinite; }
                `}</style>
              </div>
            );
          })()}

          {activeTab === "staff" && (
            <div className="animate-fade-in">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="section-title fw-bold mb-0">Administrative Staff Registry</h4>
              </div>
              <div className="gov-card p-4">
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Username</th>
                        <th>Hierarchy Role</th>
                        <th>Registered Date</th>
                        <th>Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((s) => (
                        <tr key={s._id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="bg-soft-blue p-2 rounded-circle" style={{ width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {s.username[0].toUpperCase()}
                              </div>
                              <span className="fw-bold">{s.username}</span>
                            </div>
                          </td>
                          <td><span className="badge bg-info text-dark rounded-pill">{s.role || 'Admin'}</span></td>
                          <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td><span className="text-success small fw-bold">Full Access</span></td>
                        </tr>
                      ))}
                      {staff.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-muted">No staff records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div >
    </div >
  );
};

export default AdminDashboard;
