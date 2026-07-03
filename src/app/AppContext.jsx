import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { notificationService } from "../features/notifications/services/notificationService";
import { AUTH_TOKEN_CHANGED_EVENT } from "../features/auth/services/authService";

const AppContext = createContext();

const NOTIFICATION_POLL_MS = 60_000;

export const AppProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const [notifications, setNotifications] = useState([]);

  const refreshNotifications = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setNotifications([]);
      return;
    }
    try {
      const items = await notificationService.list();
      setNotifications(Array.isArray(items) ? items : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const intervalId = setInterval(refreshNotifications, NOTIFICATION_POLL_MS);
    const onAuthTokenChanged = () => refreshNotifications();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthTokenChanged);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthTokenChanged);
    };
  }, [refreshNotifications]);

  const markAsRead = async (id) => {
    const ids =
      id === "ALL"
        ? notifications.filter((n) => !n.is_read).map((n) => n.id)
        : [id];

    if (ids.length > 0) {
      try {
        await notificationService.markRead(ids);
      } catch (error) {
        console.warn("Không thể đánh dấu đã đọc trên server:", error);
      }
    }

    if (id === "ALL") {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    }
  };

  return (
    <AppContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        notifications,
        refreshNotifications,
        markAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
