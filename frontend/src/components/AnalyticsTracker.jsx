import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const AnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return;

        let sessionId = sessionStorage.getItem('analyticsSessionId');
        if (!sessionId) {
            sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('analyticsSessionId', sessionId);
        }

        // The user ID might be stored differently based on the project's logic.
        // Assuming user data is saved in localStorage as 'user'
        let userId = null;
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                userId = user._id || user.id;
            }
        } catch (e) { }

        const recordVisit = async () => {
            try {
                // Ensure to exclude admin dashboards from polluting analytics if preferred, but for now track all
                await axios.post('http://localhost:5000/api/analytics/visit', {
                    sessionId,
                    userId,
                    page: location.pathname
                });
            } catch (error) {
                console.error("Analytics visit error:", error);
            }
        };

        recordVisit();

        // Track global clicks dynamically
        const handleGlobalClick = async (e) => {
            // Find if a button, anchor, or custom tracked element was clicked
            const target = e.target.closest('button, a, [data-track]');
            if (!target) return;

            // Resolve content info
            let contentInfo = target.getAttribute('data-track') ||
                target.innerText.trim() ||
                target.getAttribute('aria-label') ||
                (target.tagName === 'A' ? target.href : 'Unnamed Element');

            if (!contentInfo || contentInfo.trim() === '') return;
            if (contentInfo.length > 50) contentInfo = contentInfo.substring(0, 50) + '...';

            try {
                await axios.post('http://localhost:5000/api/analytics/action', {
                    sessionId,
                    actionType: 'click',
                    contentInfo
                });
            } catch (error) {
                console.error("Analytics action error:", error);
            }
        };

        // Add event listener
        document.addEventListener('click', handleGlobalClick);

        return () => {
            document.removeEventListener('click', handleGlobalClick);
        };
    }, [location.pathname]);

    // Send periodic updates on duration (e.g. every 30s) if user stays on the page
    useEffect(() => {
        const interval = setInterval(() => {
            let sessionId = sessionStorage.getItem('analyticsSessionId');
            if (!sessionId) return;
            axios.post('http://localhost:5000/api/analytics/visit', {
                sessionId,
                page: location.pathname
            }).catch(() => { });
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [location.pathname]);

    return null;
};

export default AnalyticsTracker;
