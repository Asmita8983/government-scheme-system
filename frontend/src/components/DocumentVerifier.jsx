import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../utils/translations';
import { HiOutlineDocumentText, HiOutlineUpload, HiCheckCircle, HiExclamationCircle, HiLightningBolt } from 'react-icons/hi';

const DocumentVerifier = ({ onUpdateProfile }) => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const t = translations[language] || translations.en;

    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFrontFileChange = (e) => {
        setFrontFile(e.target.files[0]);
        setResult(null);
    };

    const handleBackFileChange = (e) => {
        setBackFile(e.target.files[0]);
        setResult(null);
    };

    const handleVerify = async () => {
        if (!frontFile) return toast.error(t.ocrUploadError);

        setLoading(true);
        const formData = new FormData();
        formData.append('frontImage', frontFile);
        if (backFile) formData.append('backImage', backFile);

        try {
            const token = user?.token || localStorage.getItem('token');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            };

            const { data } = await axios.post('http://localhost:5000/api/documents/verify', formData, config);

            if (data.success) {
                setResult(data.data);
                if (data.data.isFake) {
                    toast.error(t.ocrFakeDetected + "!");
                } else {
                    toast.success(t.ocrAnalysisComplete);
                }
            }

        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to verify document. Try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const applyChanges = () => {
        if (!result || !result.extractedData) return;
        const mappedData = {
            ...(result.extractedData.name && { name: result.extractedData.name }),
            ...(result.extractedData.age && { age: result.extractedData.age }),
            ...(result.extractedData.gender && { gender: result.extractedData.gender }),
            ...(result.extractedData.income && { income: result.extractedData.income }),
            ...(result.extractedData.caste && { category: result.extractedData.caste }),
            ...(result.extractedData.state && { state: result.extractedData.state }),
            ...(result.extractedData.district && { district: result.extractedData.district }),
            ...(result.extractedData.dob && { dob: result.extractedData.dob }),
            ...(result.extractedData.aadhaarNumber && { aadhaarNumber: result.extractedData.aadhaarNumber }),
        };

        if (onUpdateProfile) {
            onUpdateProfile(mappedData);
            toast.info(t.ocrAutoFilled);
        }
    };

    return (
        <div className="glass-card p-4 shadow-lg mb-5 animate-fade-in" style={{ borderRadius: '20px' }}>
            <div className="border-bottom-0 pb-3">
                <h5 className="fw-bold text-secondary d-flex align-items-center gap-2 mb-2">
                    <HiLightningBolt className="text-warning animate-bounce" size={24} /> {t.ocrTitle}
                </h5>
                <p className="text-muted small mb-0">{t.ocrDesc}</p>
            </div>

            <div className="card-body p-0 mt-3">
                <div className="row g-3 mb-4">
                    <div className="col-md-6 text-start">
                        <label className="form-label small text-muted fw-bold">{t.ocrFrontSide}</label>
                        <input
                            type="file"
                            className="input-premium"
                            onChange={handleFrontFileChange}
                            accept="image/*,.pdf"
                        />
                    </div>
                    <div className="col-md-6 text-start">
                        <label className="form-label small text-muted fw-bold">{t.ocrBackSide}</label>
                        <input
                            type="file"
                            className="input-premium"
                            onChange={handleBackFileChange}
                            accept="image/*,.pdf"
                        />
                    </div>
                </div>

                <button
                    className="btn btn-premium btn-primary-premium w-100 py-3 d-flex align-items-center justify-content-center gap-2 text-nowrap mb-4"
                    onClick={(e) => { e.preventDefault(); handleVerify(); }}
                    disabled={loading || !frontFile}
                >
                    {loading ? <span className="spinner-border spinner-border-sm"></span> : <HiOutlineUpload size={20} />}
                    {loading ? t.ocrScanning : t.ocrScanBtn}
                </button>

                {result && (
                    <div className="animate-fade-in mt-4">
                        <div className={`alert ${result.isFake ? 'alert-danger' : (result.verificationStatus === 'Verified' ? 'alert-success' : 'alert-warning')} d-flex flex-column gap-2 p-4 rounded-4`}>
                            <div className="d-flex align-items-center gap-3">
                                {result.isFake ? <HiExclamationCircle size={36} /> : (result.verificationStatus === 'Verified' ? <HiCheckCircle size={36} /> : <HiExclamationCircle size={36} />)}
                                <div className="w-100 text-start">
                                    <h5 className="alert-heading fw-bold mb-1">
                                        {result.isFake ? t.ocrFakeDetected : (result.documentType || t.ocrAnalysisComplete)}
                                    </h5>
                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                        <span className={`badge ${result.authenticityScore > 80 ? 'bg-success' : (result.authenticityScore < 50 ? 'bg-danger' : 'bg-warning')} px-3 py-2 rounded-pill`}>
                                            {t.ocrAuthScore}: {result.authenticityScore}/100
                                        </span>
                                        <span className="badge bg-secondary px-3 py-2 rounded-pill">
                                            {t.ocrStatus}: {result.verificationStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <hr className="my-3" />
                            <p className="mb-1 small fw-bold text-start">{t.ocrRemarks}:</p>
                            <p className="mb-0 small text-muted fst-italic text-start">"{result.remarks || result.verificationDetails || "No remarks."}"</p>
                        </div>

                        {result.extractedData && !result.isFake && (
                            <div className="bg-light p-4 rounded-4 border position-relative mt-4 shadow-inner">
                                <h6 className="fw-bold small text-uppercase text-muted mb-3 text-start">{t.ocrExtracted}</h6>
                                <div className="row g-3 small mb-4">
                                    {Object.entries(result.extractedData).map(([key, value]) => (
                                        value && (
                                            <div className="col-md-6" key={key}>
                                                <div className="d-flex justify-content-between border-bottom pb-2">
                                                    <span className="text-muted text-capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                                    <span className="fw-bold text-dark text-end text-break ms-2" style={{ maxWidth: '60%' }}>{value}</span>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>

                                <button
                                    className="btn btn-premium btn-primary-premium w-100 py-3 fw-bold d-flex justify-content-center align-items-center gap-2"
                                    onClick={applyChanges}
                                >
                                    <HiCheckCircle size={20} /> {t.ocrAutoFillBtn}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentVerifier;
