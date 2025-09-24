# 🤖 Luis Chatbot Integration Setup

## Environment Variables

Add your OpenAI API key to your environment variables:

### For Development (.env.local)
```bash
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

### For Production (Vercel)
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to Environment Variables
4. Add: `NEXT_PUBLIC_OPENAI_API_KEY` with your OpenAI API key

## Features

✅ **Automatic Loading**: The chatbot widget loads automatically when the page loads
✅ **Position Control**: Configured for bottom-right positioning
✅ **Theme Support**: Automatically adapts to your site's theme
✅ **Clean Integration**: No visible UI components, just the chatbot widget
✅ **Error Handling**: Gracefully handles missing API keys

## Configuration Options

The `ChatbotWidget` component accepts these props:

```tsx
<ChatbotWidget 
  apiKey="your_api_key"           // Optional: defaults to env var
  position="bottom-right"         // Optional: 'bottom-right' or 'bottom-left'
  theme="light"                   // Optional: 'light' or 'dark'
/>
```

## How It Works

1. The component loads the external chatbot script from `https://luis-chatbot.vercel.app/embed.js`
2. It passes your API key and configuration to the chatbot
3. The chatbot appears as a floating widget in the bottom-right corner
4. Users can click to open the chat interface

## Troubleshooting

- **Chatbot not appearing**: Check that your OpenAI API key is set correctly
- **Script loading issues**: Ensure your site can load external scripts
- **Position conflicts**: The chatbot uses `position: fixed` with high z-index

## Security Notes

- The API key is passed to the external chatbot service
- Ensure your OpenAI API key has appropriate usage limits
- The chatbot service handles all API calls to OpenAI
