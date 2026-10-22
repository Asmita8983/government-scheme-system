import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  HiOutlineUserCircle,
  HiOutlineBriefcase,
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineAcademicCap,
  HiOutlineMap,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
  HiOutlineCamera,
  HiPencil,
  HiX,
  HiCheck
} from "react-icons/hi";
import axios from "axios";
import DocumentVerifier from "../components/DocumentVerifier";

const UserProfile = () => {
  const { user, updateProfile, uploadProfilePicture } = useAuth();
  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    income: "",
    education: "",
    occupation: "",
    caste: "",
    state: "",
    district: "",
    category: "",
    aadhaarNumber: "",
    mobileNumber: "",
    dob: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    if (user && user.profile) {
      // Logic to sync local state with user context is handled below
    }
  }, [user]);

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `http://localhost:5000${path}`;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      await uploadProfilePicture(formData);
      toast.success("Profile photo updated!");
      // No reload needed as context updates state
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload image");
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        age: user.profile?.age || "",
        gender: user.profile?.gender || "",
        income: user.profile?.income || "",
        education: user.profile?.education || "",
        occupation: user.profile?.occupation || "",
        caste: user.profile?.caste || "",
        state: user.profile?.state || "",
        district: user.profile?.district || "",
        category: user.profile?.category || "",
        aadhaarNumber: user.profile?.aadhaarNumber || "",
        mobileNumber: user.mobileNumber || "",
        dob: user.profile?.dob || "",
      });
    }
  }, [user]);

  useEffect(() => {
    // Calculate profile strength
    const fields = Object.values(formData);
    const filled = fields.filter(f => f !== "" && f !== null).length;
    setStrength(Math.round((filled / fields.length) * 100));
  }, [formData]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const handleAIUpdate = (extractedData) => {
    // Map AI fields to form fields if needed (e.g. 'caste' -> 'category' handled in child)
    // Here we just merge whatever came back
    setFormData(prev => ({
      ...prev,
      ...extractedData
    }));
    setIsEditing(true); // Switch to edit mode
    toast.info("Data auto-filled! Please review and save.");
  };

  if (!user) return <div className="container py-5">Please login to view profile</div>;

  return (
    <div className="container py-5 animate-fade-in text-start">
      <div className="row g-4">
        <div className="col-lg-4 mb-4">
          <div className="glass-card p-4 text-center sticky-top" style={{ top: '100px' }}>
            <div className="position-relative d-inline-block mb-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center mx-auto overflow-hidden shadow-sm"
                style={{ width: "120px", height: "120px", backgroundColor: user.profilePicture ? 'transparent' : '#2563eb', border: '4px solid white' }}>

                {user.profilePicture ? (
                  <img
                    src={getImageUrl(user.profilePicture)}
                    alt={user.name}
                    className="w-100 h-100 object-fit-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Error"; }}
                  />
                ) : (
                  <span className="text-white fw-bold display-4">{getInitials(user.name)}</span>
                )}
              </div>

              <label htmlFor="profile-upload" className="position-absolute bottom-0 end-0 bg-white text-primary p-2 rounded-circle shadow-sm cursor-pointer hover-scale border" style={{ cursor: 'pointer', transform: 'translate(10%, 10%)' }}>
                <HiOutlineCamera size={20} />
              </label>
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                className="d-none"
                onChange={handleImageUpload}
              />
            </div>

            <h3 className="fw-bold mb-1">{user.name}</h3>
            <p className="text-muted small mb-3">{user.email}</p>

            <div className="mb-4">
              <div className="d-flex justify-content-between mb-1 small">
                <span className="fw-bold">Profile Strength</span>
                <span className="text-primary fw-bold">{strength}%</span>
              </div>
              <div className="progress" style={{ height: '8px', borderRadius: '10px' }}>
                <div
                  className={`progress-bar progress-bar-striped progress-bar-animated ${strength < 50 ? 'bg-warning' : 'bg-primary'}`}
                  role="progressbar"
                  style={{ width: `${strength}%` }}
                ></div>
              </div>
              <p className="small text-muted mt-2">
                {strength < 100 ? "Complete your profile to unlock more schemes!" : "Great! Your profile is fully optimized."}
              </p>
            </div>

            <div className="d-flex flex-column gap-2 mb-4">
              <div className="p-3 bg-light rounded-3 text-start d-flex align-items-center gap-3">
                <div className="bg-soft-blue p-2 rounded-2"><HiOutlineMap /></div>
                <div>
                  <div className="small text-muted">Location</div>
                  <div className="fw-bold small">{formData.state || 'Not Set'}, {formData.district || 'Not Set'}</div>
                </div>
              </div>
              <div className="p-3 bg-light rounded-3 text-start d-flex align-items-center gap-3">
                <div className="bg-soft-orange p-2 rounded-2"><HiOutlineCurrencyDollar /></div>
                <div>
                  <div className="small text-muted">Annual Income</div>
                  <div className="fw-bold small">₹{formData.income || '0'}</div>
                </div>
              </div>
            </div>

            <div className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill w-100">
              Citizen Identity: {user.role === "admin" ? "Official" : "Verified Citizen"}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="gov-card p-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary text-white p-3 rounded-4">
                  <HiOutlineAcademicCap size={30} />
                </div>
                <div>
                  <h4 className="fw-bold mb-0">Identity & Eligibility Registry</h4>
                  <p className="text-muted small mb-0">Official record for welfare matching system</p>
                </div>
              </div>
              <button
                className={`btn btn-sm ${isEditing ? 'btn-danger' : 'btn-primary'} rounded-pill px-3 d-flex align-items-center gap-2`}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <><HiX /> Cancel Edit</> : <><HiPencil /> Edit Profile</>}
              </button>
            </div>

            {/* AI Document Verifier Section */}
            <DocumentVerifier onUpdateProfile={handleAIUpdate} />


            {isEditing ? (
              <form onSubmit={submitHandler} className="animate-fade-in">
                <div className="row g-4">
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-uppercase"><HiOutlineUserGroup className="text-primary me-1" /> Age</label>
                    <input type="number" className="input-premium" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="Enter age" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-uppercase">Date of Birth</label>
                    <input type="text" className="input-premium" placeholder="DD/MM/YYYY" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-uppercase">Gender</label>
                    <select className="input-premium" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small text-uppercase">Caste Category</label>
                    <select className="input-premium" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="">Select Category</option>
                      <option value="General">General (Unreserved)</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase">Aadhaar Number</label>
                    <input type="text" className="input-premium" placeholder="XXXX XXXX XXXX" value={formData.aadhaarNumber} onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase">Mobile Number</label>
                    <input
                      type="text"
                      className="input-premium"
                      placeholder="+91 XXXXXXXXXX"
                      value={formData.mobileNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9]*$/.test(val) && val.length <= 10) {
                          setFormData({ ...formData, mobileNumber: val });
                        }
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase"><HiOutlineCurrencyDollar className="text-primary me-1" /> Annual Family Income (₹)</label>
                    <input type="number" className="input-premium" value={formData.income} onChange={(e) => setFormData({ ...formData, income: e.target.value })} placeholder="e.g. 250000" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase"><HiOutlineAcademicCap className="text-primary me-1" /> Educational Attainment</label>
                    <select className="input-premium" value={formData.education} onChange={(e) => setFormData({ ...formData, education: e.target.value })}>
                      <option value="">Select Education</option>
                      <option value="Below 10th">Below 10th</option>
                      <option value="10th Pass">10th Pass</option>
                      <option value="12th Pass">12th Pass</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Post Graduate">Post Graduate</option>
                      <option value="Doctorate">Doctorate / PhD</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase"><HiOutlineBriefcase className="text-primary me-1" /> Current Occupation</label>
                    <input type="text" className="input-premium" placeholder="e.g. Farmer, Registered Vendor, Student" value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase">Caste / Sub-community</label>
                    <input type="text" className="input-premium" placeholder="e.g. Mahar, Maratha, etc." value={formData.caste} onChange={(e) => setFormData({ ...formData, caste: e.target.value })} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase"><HiOutlineMap className="text-primary me-1" /> Current Residence (State)</label>
                    <input type="text" className="input-premium" placeholder="e.g. Maharashtra" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small text-uppercase">Current District</label>
                    <input type="text" className="input-premium" placeholder="e.g. Pune" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} />
                  </div>
                </div>

                <div className="mt-5 d-flex gap-3">
                  <button type="submit" className="btn btn-premium btn-primary-premium flex-grow-1 py-3 shadow-lg d-flex align-items-center justify-content-center gap-2">
                    <HiCheck /> Save & Synchronize
                  </button>
                  <button type="button" className="btn btn-premium btn-light border py-3 px-4" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="row g-4 animate-fade-in">
                <div className="col-md-3">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Age</small>
                    <div className="fw-bold text-dark">{formData.age || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>DOB</small>
                    <div className="fw-bold text-dark">{formData.dob || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Gender</small>
                    <div className="fw-bold text-dark">{formData.gender || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Category</small>
                    <div className="fw-bold text-dark">{formData.category || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Aadhaar Number</small>
                    <div className="fw-bold text-dark letter-spacing-2">{formData.aadhaarNumber || "Not Linked"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Mobile Number</small>
                    <div className="fw-bold text-dark letter-spacing-2">{formData.mobileNumber || "Not Linked"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Income</small>
                    <div className="fw-bold text-dark">₹{formData.income || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Education</small>
                    <div className="fw-bold text-dark">{formData.education || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Occupation</small>
                    <div className="fw-bold text-dark">{formData.occupation || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Caste</small>
                    <div className="fw-bold text-dark">{formData.caste || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>State</small>
                    <div className="fw-bold text-dark">{formData.state || "N/A"}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 bg-light">
                    <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>District</small>
                    <div className="fw-bold text-dark">{formData.district || "N/A"}</div>
                  </div>
                </div>
                <div className="col-12 mt-4 text-center">
                  <p className="text-muted small">Click "Edit Profile" above to update these details.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 row g-4">
            <div className="col-md-6">
              <div className="glass-card p-4 h-100">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <div className="bg-soft-green p-1 rounded-circle"><HiOutlineShieldCheck /></div>
                  Privacy & Security
                </h6>
                <p className="small text-muted mb-0">Your profile data is encrypted and only used for government scheme eligibility matching. No data is shared with third parties.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="glass-card p-4 h-100 border-primary border-opacity-25">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-primary">
                  <HiOutlineInformationCircle /> Pro Tip
                </h6>
                <p className="small text-muted mb-0">Users with 100% profile completion find 3x more eligible schemes on average. Keep your records updated.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
