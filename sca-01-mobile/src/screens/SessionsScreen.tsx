import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { api, Session } from "../api/client";

interface SessionsScreenProps {
  onSelectSession: (session: Session) => void;
  onLogout: () => void;
}

const MODELS = ["qwen3", "llama3.2", "deepseek-r1", "phi4", "gemma2"];

export function SessionsScreen({ onSelectSession, onLogout }: SessionsScreenProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newModel, setNewModel] = useState("qwen3");
  const [isCreating, setIsCreating] = useState(false);

  const loadSessions = useCallback(async () => {
    const result = await api.getSessions();
    if (result.success && result.data) {
      setSessions(result.data.sessions);
    }
  }, []);

  useEffect(() => {
    loadSessions().finally(() => setIsLoading(false));
  }, [loadSessions]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadSessions();
    setIsRefreshing(false);
  };

  const createSession = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Fejl", "Titel er påkrævet");
      return;
    }

    setIsCreating(true);
    const result = await api.createSession(newTitle.trim(), newModel);
    setIsCreating(false);

    if (result.success && result.data) {
      setShowNewModal(false);
      setNewTitle("");
      setSessions((prev) => [result.data!, ...prev]);
      onSelectSession(result.data);
    } else {
      Alert.alert("Fejl", result.error || "Kunne ikke oprette session");
    }
  };

  const deleteSession = (session: Session) => {
    Alert.alert(
      "Slet session",
      `Er du sikker på, at du vil slette "${session.title}"?`,
      [
        { text: "Annuller", style: "cancel" },
        {
          text: "Slet",
          style: "destructive",
          onPress: async () => {
            const result = await api.deleteSession(session.id);
            if (result.success) {
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
            }
          },
        },
      ]
    );
  };

  const renderSession = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => onSelectSession(item)}
      onLongPress={() => deleteSession(item)}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.sessionModel}>{item.model}</Text>
      </View>
      <Text style={styles.sessionDate}>
        {new Date(item.createdAt).toLocaleDateString("da-DK", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>🤖 SCA-01</Text>
          <Text style={styles.subtitle}>The Finisher</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log ud</Text>
        </TouchableOpacity>
      </View>

      {/* Sessions list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>Ingen sessions endnu</Text>
              <Text style={styles.emptySubtext}>
                Opret din første session for at starte
              </Text>
            </View>
          }
        />
      )}

      {/* New session button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New session modal */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ny session</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Session titel..."
              placeholderTextColor="#666"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <Text style={styles.modelLabel}>Model:</Text>
            <View style={styles.modelPicker}>
              {MODELS.map((model) => (
                <TouchableOpacity
                  key={model}
                  style={[
                    styles.modelOption,
                    newModel === model && styles.modelOptionActive,
                  ]}
                  onPress={() => setNewModel(model)}
                >
                  <Text
                    style={[
                      styles.modelOptionText,
                      newModel === model && styles.modelOptionTextActive,
                    ]}
                  >
                    {model}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowNewModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, isCreating && styles.buttonDisabled]}
                onPress={createSession}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalCreateText}>Opret</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
  },
  subtitle: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
  },
  sessionCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  sessionModel: {
    color: "#10b981",
    fontSize: 12,
    backgroundColor: "#0a2f1f",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionDate: {
    color: "#666",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#666",
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: Platform.OS === "ios" ? 40 : 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "300",
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a2e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#0a0a0f",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 20,
  },
  modelLabel: {
    color: "#999",
    fontSize: 14,
    marginBottom: 12,
  },
  modelPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  modelOption: {
    backgroundColor: "#0a0a0f",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  modelOptionActive: {
    backgroundColor: "#0a2f1f",
    borderColor: "#10b981",
  },
  modelOptionText: {
    color: "#666",
    fontSize: 14,
  },
  modelOptionTextActive: {
    color: "#10b981",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#2a2a4a",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#fff",
    fontSize: 16,
  },
  modalCreateButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#10b981",
    alignItems: "center",
  },
  modalCreateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

