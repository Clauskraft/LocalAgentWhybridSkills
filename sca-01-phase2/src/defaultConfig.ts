/**
 * Default production configuration
 * These values are bundled into the app and used when no .env file is found
 */
export const DEFAULT_ENV = {
  // Ollama Configuration
  OLLAMA_HOST: "http://localhost:11434",
  OLLAMA_MODEL: "qwen2.5-coder:7b",

  // Permissions
  SCA_ALLOW_WRITE: "true",
  SCA_ALLOW_EXEC: "true",
  SCA_FULL_ACCESS: "false",
  SCA_AUTO_APPROVE: "false",

  // Limits
  SCA_MAX_TURNS: "20",
  SCA_SHELL_TIMEOUT: "300000",
  SCA_MAX_FILE_SIZE: "10000000",

  // Paths
  SCA_LOG_DIR: "./logs",

  // UI
  SCA_THEME: "dark",

  // Cloud (disabled by default)
  SCA_USE_CLOUD: "false",
  SCA_BACKEND_URL: "",
};
