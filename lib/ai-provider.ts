import { openai } from "@ai-sdk/openai";
import { createAzure } from "@ai-sdk/azure";

/**
 * Get the appropriate AI model provider based on environment configuration.
 * Supports both OpenAI and Azure OpenAI.
 * 
 * For Azure OpenAI, set these environment variables:
 * - AZURE_OPENAI_API_KEY: Your Azure OpenAI API key
 * - AZURE_OPENAI_ENDPOINT: Your Azure OpenAI endpoint (e.g., https://your-resource.openai.azure.com)
 * 
 * For standard OpenAI, set:
 * - OPENAI_API_KEY: Your OpenAI API key
 */

// Check if Azure OpenAI is configured
const isAzureConfigured = () => {
  return !!(
    process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT
  );
};

// Create Azure OpenAI provider if configured
const getAzureProvider = () => {
  if (!isAzureConfigured()) {
    return null;
  }
  return createAzure({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    resourceName: extractResourceName(process.env.AZURE_OPENAI_ENDPOINT!),
  });
};

// Extract resource name from Azure endpoint URL
// e.g., "https://my-resource.openai.azure.com" -> "my-resource"
function extractResourceName(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const hostname = url.hostname;
    // Extract the first part before .openai.azure.com
    const match = hostname.match(/^([^.]+)\.openai\.azure\.com$/);
    if (match) {
      return match[1];
    }
    // Fallback: just return the hostname
    return hostname;
  } catch {
    // If URL parsing fails, try to extract from string
    const match = endpoint.match(/https?:\/\/([^.]+)\.openai\.azure\.com/);
    return match ? match[1] : endpoint;
  }
}

// Model name mappings for Azure (deployment names)
const AZURE_CHAT_DEPLOYMENT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4o";
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";

// Default model for standard OpenAI (when not using Azure)
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o";

/**
 * Get a chat model that works with either OpenAI or Azure OpenAI.
 * @param modelId - The model ID (for OpenAI) or deployment name (for Azure)
 */
export function getChatModel(modelId?: string) {
  if (isAzureConfigured()) {
    const azure = getAzureProvider()!;
    // Use the provided modelId or default to the configured deployment
    const deploymentName = AZURE_CHAT_DEPLOYMENT;
    return azure(deploymentName);
  }
  // Default to OpenAI
  return openai(modelId || OPENAI_CHAT_MODEL);
}

/**
 * Get an embedding model that works with either OpenAI or Azure OpenAI.
 * @param modelId - The model ID (for OpenAI) or deployment name (for Azure)
 */
export function getEmbeddingModel(modelId?: string) {
  if (isAzureConfigured()) {
    const azure = getAzureProvider()!;
    const deploymentName = modelId || AZURE_EMBEDDING_DEPLOYMENT;
    return azure.embedding(deploymentName);
  }
  // Default to OpenAI
  return openai.embedding(modelId || "text-embedding-3-small");
}

/**
 * Get information about the current AI provider configuration.
 */
export function getProviderInfo() {
  if (isAzureConfigured()) {
    return {
      provider: "azure" as const,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      chatDeployment: AZURE_CHAT_DEPLOYMENT,
      embeddingDeployment: AZURE_EMBEDDING_DEPLOYMENT,
    };
  }
  return {
    provider: "openai" as const,
    endpoint: "https://api.openai.com",
    chatDeployment: null,
    embeddingDeployment: null,
  };
}

// Re-export the original openai for backwards compatibility
export { openai };
