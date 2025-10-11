# AI Chatbot Integration - Floating Widget Version

This portfolio includes an advanced AI-powered chatbot that appears as a **floating widget** - a button in the corner that opens a chat window over your content (NOT fullscreen).

## Implementation Type

✅ **Floating Widget Version** (from `Chatbot.tsx`)
- Floating button in bottom-right corner
- Chat window appears as fixed widget
- Stays on top of portfolio content
- Professional, non-intrusive design

❌ **Not the Fullscreen Modal Version** (`PortfolioChatbot.tsx`)

## Features

- **Hybrid AI Architecture**: TensorFlow.js for fast local responses + OpenAI GPT for complex queries
- **Self-Learning**: The chatbot can learn from new interactions
- **Lead Generation**: Automatically detects potential client inquiries and offers to connect
- **Multi-language Support**: Handles English and Tagalog/Taglish conversations
- **Content Filtering**: Built-in inappropriate content detection
- **Mobile Optimized**: Fully responsive design for all devices
- **Performance Monitoring**: Built-in performance stats (can be toggled)

## Setup

### 1. Install Dependencies

The required dependencies are already installed:
- `@tensorflow/tfjs` - For local AI processing
- `framer-motion` - For smooth animations
- `lucide-react` - For icons

### 2. Environment Variables

Create a `.env.local` file in the root directory with the following:

```env
# Required: OpenAI API Key for intelligent responses
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Optional: Resend API Key for lead generation emails
NEXT_PUBLIC_RESEND_API_KEY=your_resend_api_key_here
```

**Get your OpenAI API key**: https://platform.openai.com/api-keys

**Get your Resend API key** (optional): https://resend.com/api-keys

### 3. Files Structure

```
src/
├── components/
│   ├── chatbot/
│   │   ├── Chatbot.tsx            # ✅ Main floating chatbot component
│   │   ├── ChatWindow.tsx         # Chat interface window
│   │   ├── MessageBubble.tsx      # Message display
│   │   ├── LeadForm.tsx           # Lead generation form
│   │   ├── QuickSuggestions.tsx   # Quick action buttons
│   │   ├── MarkdownText.tsx       # Markdown renderer
│   │   ├── PerformanceMonitor.tsx # Performance stats display
│   │   ├── PerformanceToggle.tsx  # Performance monitor toggle
│   │   └── PortfolioChatbot.tsx   # Alternative fullscreen version (not used)
│   └── PortfolioChatbotWrapper.tsx # Next.js wrapper
├── lib/
│   └── chatbot/
│       ├── tensorflowModel.ts      # TensorFlow.js service
│       ├── openaiService.ts        # OpenAI integration
│       ├── leadDetectionService.ts # Lead detection logic
│       ├── resendService.ts        # Email service
│       ├── securityService.ts      # Security & validation
│       └── data/
│           ├── faq.json            # FAQ training data
│           ├── intents.json        # Intent definitions
│           └── user_examples.json  # Learned examples
└── public/
    ├── LuisBot.png                 # Chatbot icon (PNG)
    └── LuisBot.ico                 # Chatbot icon (ICO)
```

## Customization

### Update Chatbot Information

Edit the data files in `src/lib/chatbot/data/`:

1. **faq.json** - Add/modify frequently asked questions and responses
2. **intents.json** - Define conversation intents and patterns
3. **user_examples.json** - Stores learned examples (auto-updated)

### Modify Chatbot Appearance

Edit `src/components/PortfolioChatbotWrapper.tsx`:

```tsx
<PortfolioChatbot
  position="bottom-right"  // Options: bottom-right, bottom-left, top-right, top-left
  theme="auto"            // Options: light, dark, auto
  size="medium"           // Options: small, medium, large
  showButton={true}       // Show/hide the floating button
  autoOpen={false}        // Auto-open chat on page load
  confidenceThreshold={0.75}  // AI confidence threshold (0-1)
/>
```

### Modify Personal Information

Update the context in `src/lib/chatbot/openaiService.ts` around line 470 to customize the chatbot's knowledge about your portfolio, services, and background.

## How It Works

1. **User Input**: User types a message in the chat interface
2. **TensorFlow.js Processing**: Local AI model quickly checks for known patterns
   - If high confidence match → Instant response from FAQ data
   - If low confidence → Pass to OpenAI
3. **OpenAI Processing**: Complex queries are sent to OpenAI with your context
4. **Lead Detection**: System analyzes conversation for business opportunities
5. **Learning**: Optionally save OpenAI responses to improve future accuracy

## Features

### Lead Generation

The chatbot automatically detects when users:
- Ask about pricing or services
- Show interest in projects
- Inquire about availability
- Mention business needs (e-commerce, websites, etc.)

When detected, it offers to collect their information for follow-up.

### Self-Learning

After OpenAI generates a response, the chatbot asks:
- "Should I remember this answer?"
- If yes → Saves to training data
- Retrains model → Faster responses next time

### Content Filtering

Built-in filters for:
- Inappropriate language (English & Tagalog)
- Personal/relationship questions
- Spam and malicious content
- Off-topic queries

### Multi-language

Supports:
- English conversations
- Tagalog conversations
- Taglish (mixed English-Tagalog)
- Automatic language detection and response

## Performance

- **Local Responses**: < 100ms (TensorFlow.js)
- **AI Responses**: 1-3 seconds (OpenAI API)
- **Model Size**: ~200KB (compressed)
- **Memory Usage**: ~50MB (TensorFlow.js)

## Troubleshooting

### Chatbot Not Appearing

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_OPENAI_API_KEY` is set in `.env.local`
3. Clear browser cache and reload
4. Check if JavaScript is enabled

### TensorFlow.js Errors

1. Clear browser localStorage: `localStorage.clear()`
2. Reload the page to retrain the model
3. Check browser console for specific errors

### OpenAI API Errors

1. Verify your API key is valid
2. Check your OpenAI account has credits
3. Ensure API key starts with `sk-`
4. Check network/firewall isn't blocking OpenAI API

### Lead Form Not Working

1. Verify `NEXT_PUBLIC_RESEND_API_KEY` is set
2. Check `/api/contact` endpoint exists
3. Verify Resend API key is valid
4. Check browser console for API errors

## Cost Estimation

### OpenAI API Costs

- Model: GPT-3.5-turbo
- Cost: ~$0.002 per 1K tokens
- Average conversation: ~$0.01-0.05
- 1000 conversations: ~$10-50

### Resend Email Costs

- Free tier: 3,000 emails/month
- Paid: $20/month for 50,000 emails

## Maintenance

### Update FAQ Data

1. Edit `src/lib/chatbot/data/faq.json`
2. Add new patterns and responses
3. Reload page - model retrains automatically

### Clear Learned Examples

```javascript
// In browser console
localStorage.removeItem('user_examples');
localStorage.removeItem('chatbot-metadata');
location.reload();
```

### Monitor API Usage

Check OpenAI dashboard: https://platform.openai.com/usage

## Security

- All user inputs are validated and sanitized
- Rate limiting prevents abuse
- No sensitive data stored locally
- API keys never exposed to client
- Content filtering active

## Support

For issues or questions about the chatbot:
1. Check this README
2. Review browser console for errors
3. Check the AI Chatbot project documentation
4. Contact: antonioluis.santos1@gmail.com

## Credits

Built with:
- TensorFlow.js by Google
- OpenAI GPT-3.5-turbo
- React & Next.js
- Framer Motion
- Lucide React Icons
- Resend Email API

