# Configuration Examples

This directory contains example configurations and integration templates for the Honeypot MCP Server.

## Files

### `vapi-integration-config.json`
Example configuration for integrating the Honeypot MCP Server with Vapi AI voice assistants.

**Usage:**
1. Copy this file to your Vapi project
2. Update the `server.url` field with your deployed server URL
3. Customize the system prompt and voice settings as needed

**Configuration Fields:**
- **Model**: OpenAI GPT-4o with fraud detection system prompt
- **Tools**: MCP server integration for honeypot intelligence
- **Voice**: 11Labs professional voice settings
- **Transcriber**: Deepgram Nova-2 for speech-to-text

**Example Server URLs:**
- Railway: `https://your-app-name.up.railway.app/mcp`
- Custom domain: `https://your-domain.com/mcp`
- Local development: `http://localhost:3000/mcp`

**Security Note:**
Ensure your MCP server URL is accessible from Vapi's infrastructure and properly secured for production use.

## Adding New Examples

When adding new configuration examples:
1. Include a descriptive filename
2. Add documentation in this README
3. Remove any sensitive information (API keys, personal data)
4. Include comments in configuration files where helpful 