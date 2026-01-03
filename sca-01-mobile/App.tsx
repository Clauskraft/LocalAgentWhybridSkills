import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { api, Session } from "./src/api/client";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SessionsScreen } from "./src/screens/SessionsScreen";
import { ChatScreen } from "./src/screens/ChatScreen";

type Screen = "loading" | "login" | "sessions" | "chat";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Check if server is online
    const isOnline = await api.checkHealth();
    setIsOnline(isOnline);

    // Try to restore auth
    const hasAuth = await api.initialize();
    if (hasAuth && api.isAuthenticated()) {
      setScreen("sessions");
    } else {
      setScreen("login");
    }
  };

  const handleLogin = () => {
    setScreen("sessions");
  };

  const handleLogout = async () => {
    await api.logout();
    setScreen("login");
  };

  const handleSelectSession = (session: Session) => {
    setCurrentSession(session);
    setScreen("chat");
  };

  const handleBackFromChat = () => {
    setCurrentSession(null);
    setScreen("sessions");
  };

  if (screen === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (screen === "login") {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <StatusBar style="light" />
      </>
    );
  }

  if (screen === "chat" && currentSession) {
    return (
      <>
        <ChatScreen session={currentSession} onBack={handleBackFromChat} isOnline={isOnline} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <SessionsScreen
        onSelectSession={handleSelectSession}
        onLogout={handleLogout}
        isOnline={isOnline}
      />
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0f",
  },
});
