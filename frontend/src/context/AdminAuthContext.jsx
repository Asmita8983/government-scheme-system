import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = "http://localhost:5000/api/admin";

    useEffect(() => {
        const adminInfo = JSON.parse(localStorage.getItem("adminInfo"));
        if (adminInfo) {
            setAdmin(adminInfo);
        }
        setLoading(false);
    }, []);

    const loginAdmin = async (username, password) => {
        try {
            const { data } = await axios.post(`${API_URL}/login`, { username, password });
            localStorage.setItem("adminInfo", JSON.stringify(data));
            setAdmin(data);
            return data;
        } catch (error) {
            const message = error.response?.data?.message || "Admin authentication failed";
            throw new Error(message);
        }
    };

    const logoutAdmin = () => {
        localStorage.removeItem("adminInfo");
        setAdmin(null);
    };

    return (
        <AdminAuthContext.Provider value={{ admin, loading, loginAdmin, logoutAdmin }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
