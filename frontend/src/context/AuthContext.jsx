import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Define API Base URL
    const API_URL = "http://localhost:5000/api/auth";

    useEffect(() => {
        const fetchProfile = async () => {
            const userInfo = JSON.parse(localStorage.getItem("userInfo"));
            if (userInfo && userInfo.token) {
                try {
                    const { data } = await axios.get(`${API_URL}/me`, {
                        headers: { Authorization: `Bearer ${userInfo.token}` },
                    });
                    // Merge local token with new data in case token rotates or new fields added
                    const updatedUser = { ...userInfo, ...data };
                    localStorage.setItem("userInfo", JSON.stringify(updatedUser)); // Update Local Storage
                    setUser(updatedUser);
                } catch (error) {
                    console.error("Failed to fetch fresh profile:", error);
                    // Fallback to local storage if network fails, or logout if token invalid
                    if (error.response?.status === 401) {
                        localStorage.removeItem("userInfo");
                        setUser(null);
                    } else {
                        setUser(userInfo);
                    }
                }
            } else if (userInfo) {
                setUser(userInfo);
            }
            setLoading(false);
        };

        fetchProfile();
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post(`${API_URL}/login`, { email, password });
            // If OTP is required, return the flag — caller handles redirect
            if (data.requiresOtp) return data;
            localStorage.setItem("userInfo", JSON.stringify(data));
            setUser(data);
            return data;
        } catch (error) {
            const message = error.response?.data?.message || "Login failed due to server error";
            console.error("Login Error:", message);
            throw new Error(message);
        }
    };

    const register = async (name, email, password, mobileNumber) => {
        try {
            const { data } = await axios.post(`${API_URL}/register`, { name, email, password, mobileNumber });
            // If OTP is required, return the flag — caller handles redirect
            if (data.requiresOtp) return data;
            localStorage.setItem("userInfo", JSON.stringify(data));
            setUser(data);
            return data;
        } catch (error) {
            const message = error.response?.data?.message || "Registration failed. Check if server is running.";
            console.error("Registration Error:", message);
            throw new Error(message);
        }
    };

    const verifyOtp = async (email, otp) => {
        try {
            const { data } = await axios.post(`${API_URL}/verify-otp`, { email, otp });
            localStorage.setItem("userInfo", JSON.stringify(data));
            setUser(data);
            return data;
        } catch (error) {
            const message = error.response?.data?.message || "OTP verification failed.";
            throw new Error(message);
        }
    };

    const resendOtp = async (email) => {
        try {
            const { data } = await axios.post(`${API_URL}/send-otp`, { email });
            return data;
        } catch (error) {
            const message = error.response?.data?.message || "Failed to resend OTP.";
            throw new Error(message);
        }
    };

    const logout = () => {
        localStorage.removeItem("userInfo");
        setUser(null);
    };

    const updateProfile = async (profileData) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            const { data } = await axios.put(`${API_URL}/profile`, profileData, config);
            // Merge ALL returned data (including mobileNumber which is top-level) with existing user
            const updatedUser = { ...user, ...data };
            localStorage.setItem("userInfo", JSON.stringify(updatedUser));
            setUser(updatedUser);
            return data;
        } catch (error) {
            const message = error.response?.data?.message || "Profile update failed";
            console.error("Update Profile Error:", message);
            throw new Error(message);
        }
    };

    const uploadProfilePicture = async (formData) => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    "Content-Type": "multipart/form-data",
                },
            };
            const { data } = await axios.post(`${API_URL}/profile/upload`, formData, config);

            // Update user state with new profile picture URL
            const updatedUser = { ...user, profilePicture: data.profilePicture };
            localStorage.setItem("userInfo", JSON.stringify(updatedUser));
            setUser(updatedUser);

            return data;
        } catch (error) {
            const message = error.response?.data?.message || "Image upload failed";
            throw new Error(message);
        }
    };


    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, uploadProfilePicture, verifyOtp, resendOtp }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
