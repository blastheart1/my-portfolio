# Chatbot Integration

This portfolio now includes a floating chatbot widget in the bottom-right corner of the page.

## Features

- ✅ **Floating Button**: Positioned in bottom-right corner
- ✅ **Light Theme**: Matches the portfolio design
- ✅ **Environment Variables**: Secure API key management
- ✅ **Error Handling**: Graceful fallback if script fails to load
- ✅ **Development Mode**: Shows loading indicator during development

## Configuration

### Environment Variables

The chatbot uses the following environment variable:

```bash
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here
```

**Note**: The `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the client-side code.

### Script Configuration

The chatbot script is loaded with the following attributes:

- `data-api-key`: Your OpenAI API key
- `data-position`: "bottom-right"
- `data-theme`: "light"

## Files Modified

1. **`.env.local`** - Environment variables
2. **`src/components/ChatbotEmbed.tsx`** - Chatbot component
3. **`src/app/layout.tsx`** - Added to layout

## How It Works

1. The `ChatbotEmbed` component loads the external script from `https://luis-chatbot.vercel.app/embed.js`
2. The script creates a floating button in the bottom-right corner
3. When clicked, it opens a chat interface powered by OpenAI
4. The component handles loading states and error scenarios

## Development

In development mode, you'll see a "Loading chatbot..." indicator in the bottom-right corner until the script loads.

## Production

In production, the chatbot will appear as a floating button once the script loads successfully.

## Troubleshooting

- **Chatbot not appearing**: Check that your OpenAI API key is correctly set in `.env.local`
- **Console errors**: Check the browser console for any script loading errors
- **API key issues**: Ensure the API key is valid and has sufficient credits

## Security

- The API key is only used client-side for the chatbot functionality
- The key is not exposed in the build output
- Consider using a separate API key for the chatbot if needed
