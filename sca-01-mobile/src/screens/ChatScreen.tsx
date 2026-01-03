import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { api, Message, Session } from "../api/client";

interface ChatScreenProps {
  session: Session;
  onBack: () => void;
  isOnline?: boolean;
}

export function ChatScreen({ session, onBack, isOnline }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, [session.id]);

  const loadMessages = async () => {
    setIsLoading(true);
    const result = await api.getMessages(session.id);
    if (result.success && result.data) {
      setMessages(result.data.messages);
      setError(null);
    } else {
      setError(result.error || "Kunne ikke hente beskeder");
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    const content = input.trim();
    setInput("");
    setIsSending(true);
    setError(null);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    const result = await api.sendMessage(session.id, content);
    if (result.success && result.data) {
      // Replace temp message with real one and add any response
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? result.data! : m))
      );
      // Reload to get assistant response
      await loadMessages();
    } else {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setError(result.error || "Kunne ikke sende besked");
    }

    setIsSending(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    const isSystem = item.role === "system";

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : isSystem ? styles.systemBubble : styles.assistantBubble,
        ]}
      >
        <View style={styles.messageHeader}>
          <Text style={styles.roleEmoji}>
            {isUser ? "👤" : isSystem ? "⚙️" : "🤖"}
          </Text>
          <Text style={styles.roleText}>
            {isUser ? "Du" : isSystem ? "System" : "SCA-01"}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleTimeString("da-DK", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Tilbage</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={styles.headerModel}>{session.model}</Text>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🤖</Text>
              <Text style={styles.emptyText}>
                Start en samtale med SCA-01
              </Text>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity style={styles.retryButton} onPress={loadMessages}>
                <Text style={styles.retryText}>Opdatér</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
      {typeof isOnline === "boolean" && !isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>🔴 Offline – beskeder kan fejle. Prøv igen når du er online.</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Skriv en besked..."
          placeholderTextColor="#666"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
    paddingTop: Platform.OS === "ios" ? 50 : 16,
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    color: "#10b981",
    fontSize: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  headerModel: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    maxWidth: "85%",
  },
  userBubble: {
    backgroundColor: "#10b981",
    alignSelf: "flex-end",
  },
  assistantBubble: {
    backgroundColor: "#1a1a2e",
    alignSelf: "flex-start",
  },
  systemBubble: {
    backgroundColor: "#2a2a4a",
    alignSelf: "center",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  roleEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  roleText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "500",
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    color: "#666",
    fontSize: 10,
    marginTop: 6,
    textAlign: "right",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: "#10b981",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a2e",
    backgroundColor: "#140a0a",
  },
  errorBannerText: {
    color: "#fca5a5",
    fontSize: 12,
  },
  offlineBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a2e",
    backgroundColor: "#140a0a",
  },
  offlineText: {
    color: "#fca5a5",
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a2e",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: "#fff",
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#2a2a4a",
  },
  sendText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});

