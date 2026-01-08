// OpenAI configuration utility - supports both OpenAI and Azure OpenAI

export interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  embeddingModel: string;
  headers: Record<string, string>;
  isAzure: boolean;
}

/**
 * Get OpenAI configuration based on environment variables.
 * Supports both standard OpenAI and Azure OpenAI endpoints.
 * 
 * For Azure OpenAI, set these environment variables:
 * - AZURE_OPENAI_API_KEY: Your Azure OpenAI API key
 * - AZURE_OPENAI_ENDPOINT: Your Azure OpenAI endpoint (e.g., https://your-resource.openai.azure.com)
 * - AZURE_OPENAI_CHAT_DEPLOYMENT: Deployment name for chat model (e.g., gpt-4o)
 * - AZURE_OPENAI_EMBEDDING_DEPLOYMENT: Deployment name for embeddings (e.g., text-embedding-3-small)
 * - AZURE_OPENAI_API_VERSION: API version (defaults to 2024-08-01-preview)
 * 
 * For standard OpenAI, set:
 * - OPENAI_API_KEY: Your OpenAI API key
 */
export function getOpenAIConfig(): OpenAIConfig {
  const azureApiKey = Deno.env.get("AZURE_OPENAI_API_KEY");
  const azureEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
  
  // Use Azure OpenAI if Azure credentials are configured
  if (azureApiKey && azureEndpoint) {
    const chatDeployment = Deno.env.get("AZURE_OPENAI_CHAT_DEPLOYMENT") || "gpt-4o";
    const embeddingDeployment = Deno.env.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT") || "text-embedding-3-small";
    const apiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION") || "2024-08-01-preview";
    
    // Normalize endpoint URL (remove trailing slash if present)
    const normalizedEndpoint = azureEndpoint.replace(/\/$/, "");
    
    return {
      baseUrl: normalizedEndpoint,
      apiKey: azureApiKey,
      chatModel: chatDeployment,
      embeddingModel: embeddingDeployment,
      headers: {
        "api-key": azureApiKey,
        "Content-Type": "application/json",
      },
      isAzure: true,
    };
  }
  
  // Fall back to standard OpenAI
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openaiApiKey) {
    throw new Error(
      "OpenAI API key not configured. Set either OPENAI_API_KEY for OpenAI or " +
      "AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT for Azure OpenAI."
    );
  }
  
  return {
    baseUrl: "https://api.openai.com",
    apiKey: openaiApiKey,
    chatModel: "gpt-4o",
    embeddingModel: "text-embedding-3-small",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    isAzure: false,
  };
}

/**
 * Build the chat completions URL for the configured provider
 */
export function getChatCompletionsUrl(config: OpenAIConfig): string {
  if (config.isAzure) {
    const apiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION") || "2024-08-01-preview";
    return `${config.baseUrl}/openai/deployments/${config.chatModel}/chat/completions?api-version=${apiVersion}`;
  }
  return `${config.baseUrl}/v1/chat/completions`;
}

/**
 * Build the embeddings URL for the configured provider
 */
export function getEmbeddingsUrl(config: OpenAIConfig): string {
  if (config.isAzure) {
    const apiVersion = Deno.env.get("AZURE_OPENAI_API_VERSION") || "2024-08-01-preview";
    return `${config.baseUrl}/openai/deployments/${config.embeddingModel}/embeddings?api-version=${apiVersion}`;
  }
  return `${config.baseUrl}/v1/embeddings`;
}

/**
 * Build the request body for chat completions
 * Azure OpenAI doesn't require the model field in the body when using deployment URLs
 */
export function buildChatRequestBody(
  config: OpenAIConfig,
  messages: any[],
  options: {
    tools?: any[];
    tool_choice?: string;
  } = {}
): Record<string, any> {
  const body: Record<string, any> = {
    messages,
  };
  
  // Only include model for standard OpenAI
  if (!config.isAzure) {
    body.model = config.chatModel;
  }
  
  if (options.tools) {
    body.tools = options.tools;
  }
  
  if (options.tool_choice) {
    body.tool_choice = options.tool_choice;
  }
  
  return body;
}

/**
 * Build the request body for embeddings
 * Azure OpenAI doesn't require the model field in the body when using deployment URLs
 */
export function buildEmbeddingRequestBody(
  config: OpenAIConfig,
  input: string
): Record<string, any> {
  const body: Record<string, any> = {
    input,
  };
  
  // Only include model for standard OpenAI
  if (!config.isAzure) {
    body.model = config.embeddingModel;
  }
  
  return body;
}
